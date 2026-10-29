import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, proposeAction } from "./combat.ts";
import { makeCombatant, ENEMY_TEMPLATES } from "../content/characters.ts";
import { applySynergy, prepareForBattle, useSight } from "../content/gear.ts";
import { ability, ABILITIES } from "../content/abilities.ts";
import {
  ATLAS,
  ATLAS_ROADS,
  canTravel,
  chooseCompanion,
  EXPANSE_COPY,
  JOB_KITS,
  learnSolarFrom,
  markPlace,
  noteBell,
  tryLearnMemoryFromMira,
} from "../content/expanses.ts";
import { DIALOGUE, MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { deserialize, freshSave, recruit, serialize, setFlag } from "../chronicle/save.ts";
import type { CombatAction } from "../contracts.ts";

function act(partial: Partial<CombatAction> & Pick<CombatAction, "actorId" | "abilityId" | "kind" | "targetIds">): CombatAction {
  return { version: 1, modeOrigin: "legacy", timeOrTurn: 1, ...partial };
}

describe("vale expanses", () => {
  it("refuses Solar Flare until Ember has been practiced, and a spared Warden does not lock the kiln", () => {
    let save = freshSave("Ash");
    save.wardenOutcome = "defeated";
    save.flags["flag.warden_defeated"] = true;
    save.spellMastery["spell.ember"] = 2;
    assert.equal(learnSolarFrom(save, "scorch").ok, false);
    save.spellMastery["spell.ember"] = 3;
    const burned = learnSolarFrom(save, "scorch");
    assert.equal(burned.ok, true);
    if (burned.ok) assert.ok(burned.save.knownSpells.wanderer?.includes("spell.solar"));

    let spared = freshSave("Ash");
    spared.wardenOutcome = "spared";
    spared.flags["flag.warden_spared"] = true;
    spared.spellMastery["spell.ember"] = 3;
    assert.equal(learnSolarFrom(spared, "scorch").ok, false);
    spared = setFlag(spared, "flag.braziers");
    const kiln = learnSolarFrom(spared, "kiln");
    assert.equal(kiln.ok, true);
  });

  it("teaches Memory Tide from mercy plus a written strike, and from the bell if the prism fell", () => {
    let save = freshSave("Ash");
    save = setFlag(save, "flag.warden_spared");
    save.wardenOutcome = "spared";
    save.spellMastery["spell.tide"] = 1;
    assert.match(tryLearnMemoryFromMira(save).ok ? "" : (tryLearnMemoryFromMira(save) as { reason: string }).reason, /written/);
    save = setFlag(save, "flag.mira_record");
    const taught = tryLearnMemoryFromMira(save);
    assert.equal(taught.ok, true);
    if (taught.ok) assert.ok(taught.save.knownSpells.mira?.includes("spell.memory_tide"));

    let fallen = freshSave("Ash");
    fallen = setFlag(fallen, "flag.warden_defeated");
    fallen.wardenOutcome = "defeated";
    fallen = setFlag(fallen, "flag.mira_record");
    fallen.spellMastery["spell.tide"] = 1;
    assert.equal(tryLearnMemoryFromMira(fallen).ok, false);
    fallen.spellMastery["spell.tide"] = 1;
    const face = noteBell(fallen, "legacy", "nine");
    assert.equal(face.solved, false);
    const both = noteBell(face.save, "ascension", "ten");
    assert.equal(both.solved, true);
    assert.ok(both.save.knownSpells.mira?.includes("spell.memory_tide"));
    assert.equal(both.save.inventory.filter((i) => i.itemId === "accessory.bell_shard").length, 1);
    const again = noteBell(both.save, "legacy", "nine");
    assert.equal(again.save.inventory.filter((i) => i.itemId === "accessory.bell_shard").length, 1);
    assert.equal(noteBell(freshSave("Ash"), "legacy", "ten").save.flags["flag.bell_face"], undefined);
  });

  it("keeps a companion choice through a reload and will not take a second one", () => {
    let save = recruit(freshSave("Ash"), "mira");
    const chosen = chooseCompanion(save, "mira", "record");
    assert.ok(chosen);
    const back = deserialize(serialize(chosen!));
    assert.equal(back.choiceLog.find((c) => c.id === "choice.mira")?.value, "record");
    assert.ok(back.inventory.some((i) => i.itemId === "accessory.margin_clasp"));
    assert.equal(chooseCompanion(back, "mira", "blank"), null);
    assert.equal(back.quests.find((q) => q.id === "quest.mira")?.status, "complete");
  });

  it("gates Lowbell, the atlas, and the unfinished hour without late-chronicle words", () => {
    const reach = MAPS["map.reach"];
    assert.equal(reach?.exits.find((e) => e.to === "map.lowbell")?.requires, "flag.nessa_joined");
    let save = markPlace(freshSave("Ash"));
    assert.equal(canTravel(save, "map.lowbell"), false);
    assert.equal(canTravel(save, "map.ferry"), false);
    assert.equal(ATLAS.find((p) => p.id === "map.ferry")?.locked, true);
    save = setFlag(save, "flag.temporal_sight");
    save.sightCharges = 2;
    save.mapId = "map.lowbell";
    const seen = useSight(save);
    assert.equal(seen.ok, true);
    if (seen.ok) {
      assert.equal(seen.save.flags["flag.sight_lowbell"], true);
      assert.equal(seen.save.choiceLog.find((c) => c.id === "sight.lowbell")?.value, "unfinished-hour");
      assert.ok(seen.save.discoveries.includes("disc.unfinished_hour"));
      const back = deserialize(serialize(seen.save));
      assert.equal(back.flags["flag.sight_lowbell"], true);
    }
    const blob = JSON.stringify({ DIALOGUE, MAPS, EXPANSE_COPY, ATLAS, JOB_KITS }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
    const old = JSON.parse(serialize(freshSave("Ash"))) as { quests: { id: string }[]; schema: number };
    old.quests = old.quests.filter((q) => q.id !== "quest.lowbell");
    old.schema = 2;
    const migrated = deserialize(JSON.stringify(old));
    assert.ok(migrated.quests.some((q) => q.id === "quest.lowbell"));
  });

  it("resolves Solar Flare and Memory Tide through the combat core", () => {
    const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 0.2 } });
    hero.knownAbilities = ["atk.strike", "spell.ember", "spell.solar", "act.defend"];
    let solar = createEncounter({
      encounterId: "enc.festival",
      seed: 12,
      party: [structuredClone(hero)],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "s", position: { x: 0, z: -1 } }],
    });
    solar.activeActorId = "wanderer";
    solar.phase = "player";
    const flare = proposeAction(solar, act({ actorId: "wanderer", abilityId: "spell.solar", kind: "cast", targetIds: ["s"] }));
    assert.equal(flare.ok, true);
    const solarHit = flare.state.events.find((e) => e.kind === "damage")?.amount ?? 0;
    let ember = createEncounter({
      encounterId: "enc.festival",
      seed: 12,
      party: [structuredClone(hero)],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "s", position: { x: 0, z: -1 } }],
    });
    ember.activeActorId = "wanderer";
    ember.phase = "player";
    const small = proposeAction(ember, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["s"] }));
    assert.ok(solarHit > (small.state.events.find((e) => e.kind === "damage")?.amount ?? 0));

    const bare = makeCombatant("wanderer", { name: "Ash" });
    let locked = createEncounter({
      encounterId: "enc.festival",
      seed: 3,
      party: [bare],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "s", position: { x: 0, z: -1 } }],
    });
    locked.activeActorId = "wanderer";
    locked.phase = "player";
    assert.equal(proposeAction(locked, act({ actorId: "wanderer", abilityId: "spell.solar", kind: "cast", targetIds: ["s"] })).ok, false);

    const mira = makeCombatant("mira", { position: { x: 0, z: 1 } });
    mira.hp = 20;
    mira.knownAbilities = ["spell.memory_tide", "atk.strike", "act.defend"];
    let tide = createEncounter({
      encounterId: "enc.woods",
      seed: 4,
      party: [mira],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.glowmoth), id: "m", position: { x: 0, z: -1 } }],
    });
    tide.activeActorId = "mira";
    tide.phase = "player";
    const healed = proposeAction(tide, act({ actorId: "mira", abilityId: "spell.memory_tide", kind: "cast", targetIds: ["mira"] }));
    assert.equal(healed.ok, true);
    assert.ok(healed.state.combatants.find((c) => c.id === "mira")!.hp > 20);
  });

  it("keeps Kael and Nessa choices, and will not take a second answer", () => {
    let kael = recruit(freshSave("Ash"), "kael");
    const people = chooseCompanion(kael, "kael", "people");
    assert.ok(people);
    assert.ok(people!.inventory.some((i) => i.itemId === "accessory.path_cord"));
    assert.equal(chooseCompanion(people!, "kael", "law"), null);
    const back = deserialize(serialize(people!));
    assert.equal(back.choiceLog.find((c) => c.id === "choice.kael")?.value, "people");

    let nessa = recruit(freshSave("Ash"), "nessa");
    const verse = chooseCompanion(nessa, "nessa", "verse");
    assert.ok(verse);
    assert.equal(verse!.gold, 31);
    assert.equal(chooseCompanion(verse!, "nessa", "spring"), null);
    assert.equal(deserialize(serialize(verse!)).flags["flag.nessa_verse"], true);
  });

  it("draws future roads without letting them be walked, and every open kit names a real art", () => {
    assert.ok(ATLAS_ROADS.some((r) => r.to === "map.ferry" && r.future));
    assert.equal(canTravel(markPlace(setFlag(freshSave("Ash"), "flag.nessa_joined")), "map.ferry"), false);
    for (const job of JOB_KITS.filter((j) => j.playable)) {
      assert.ok(job.arts.length > 0, job.id);
      for (const id of job.arts) {
        assert.equal(ABILITIES[id]?.id, id);
        assert.ok(ability(id).blurb.length > 8);
      }
    }
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
  });

  it("gives the glass needle a sharper bite only in an Elementalist's hand", () => {
    const plain = freshSave("Ash");
    plain.equipment.wanderer = { weapon: "weapon.glass_needle" };
    const element = freshSave("Ash");
    element.equipment.wanderer = { weapon: "weapon.glass_needle" };
    element.roster.wanderer!.jobId = "job.elementalist";
    assert.ok(prepareForBattle(element, "wanderer").attack > prepareForBattle(plain, "wanderer").attack);
    assert.equal(applySynergy(element, "wanderer", 20, 12, 32, 32, "job.elementalist").attack, 22);
  });
});
