import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { ENEMY_TEMPLATES, makeCombatant } from "../content/characters.ts";
import { applyReward, deserialize, freshSave, recruit, serialize, setFlag } from "../chronicle/save.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { useSight } from "../content/gear.ts";
import { ATLAS, ATLAS_ROADS, JOB_KITS } from "../content/expanses.ts";
import { companionInstinct, switchJob } from "../content/crossing.ts";
import {
  SKY_COPY,
  benchToggle,
  chooseSera,
  flyTo,
  formationSlot,
  noteHullShadow,
  readGlass,
  setFormation,
  talkAda,
  talkOrrin,
  talkSera,
  takeCloudSalt,
  tryDome,
  tryLearnCrosswind,
  tryLearnStayline,
} from "../content/skyweave.ts";
import type { CombatAction, EncounterState, SaveGame } from "../contracts.ts";

function act(partial: Partial<CombatAction> & Pick<CombatAction, "actorId" | "abilityId" | "kind">): CombatAction {
  return { version: 1, targetIds: [], modeOrigin: "legacy", timeOrTurn: 1, ...partial };
}

function skyAsked(save: SaveGame): boolean {
  return Boolean(save.flags["flag.sky_split"] || save.flags["flag.sight_glass"] || save.flags["flag.sera_stay"]);
}

function fullCompany(name = "Ash"): SaveGame {
  let save = freshSave(name);
  save = recruit(save, "mira");
  save = recruit(save, "kael");
  save = recruit(save, "nessa");
  save.mapId = "map.ridge";
  return save;
}

function galeAt(hp: number): EncounterState {
  const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 0.4 } });
  const state = createEncounter({
    encounterId: "enc.galekeeper",
    seed: 7,
    party: [hero],
    enemies: [{ ...structuredClone(ENEMY_TEMPLATES.galekeeper), id: "gale", position: { x: 0, z: -1.4 } }],
  });
  const foe = state.combatants.find((c) => c.id === "gale")!;
  foe.hp = hp;
  state.activeActorId = "wanderer";
  state.phase = "player";
  return state;
}

describe("Skyweave ascent", () => {
  it("opens the ridge after the ferry and keeps the open sky a rumor", () => {
    assert.equal(MAPS["map.highroad"]?.exits.find((e) => e.to === "map.ridge")?.id, "exit.ridge");
    assert.equal(MAPS["map.ridge"]?.exits.find((e) => e.to === "map.berth")?.requires, "flag.ridge_complete");
    assert.equal(MAPS["map.ridge"]?.exits.find((e) => e.to === "map.glass")?.requires, undefined);
    assert.equal(ATLAS.find((p) => p.id === "map.sky")?.locked, true);
    assert.equal(ATLAS.find((p) => p.id === "map.ridge")?.locked, undefined);
    assert.equal(ATLAS.find((p) => p.id === "map.berth")?.name, "Skyweave berth");
    assert.ok(ATLAS_ROADS.some((r) => r.from === "map.ferry" && r.to === "map.sky" && r.future));
    assert.ok(ATLAS_ROADS.some((r) => r.from === "map.berth" && r.to === "map.sky" && r.future));
    assert.equal(JOB_KITS.find((j) => j.id === "job.skywright")?.playable, true);
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
    assert.equal(switchJob(freshSave("Ash"), "job.skywright").ok, false);
  });

  it("spends Sight on the glass without pressing the lens, and Orrin does not either", () => {
    let save = setFlag(freshSave("Ash"), "flag.temporal_sight");
    save.mapId = "map.glass";
    save.mode = "legacy";
    save.sightCharges = 2;
    const seen = useSight(save);
    assert.equal(seen.ok, true);
    if (!seen.ok) return;
    assert.equal(seen.save.sightCharges, 1);
    assert.equal(seen.save.sightScene, "sight.glass");
    assert.equal(seen.save.sightSteps, 8);
    assert.equal(seen.save.flags["flag.sight_glass"], true);
    assert.equal(seen.save.flags["flag.sky_split"], undefined);
    assert.equal(seen.save.flags["flag.sky_ahead"], undefined);
    assert.equal(seen.save.flags["flag.sky_chart"], undefined);
    const orrin = talkOrrin(seen.save);
    assert.equal(orrin.save.flags["flag.spoke_orrin"], true);
    assert.equal(orrin.save.flags["flag.sky_chart"], undefined);
    assert.equal(orrin.save.flags["flag.sky_ahead"], undefined);

    assert.equal(readGlass(seen.save, "chart").ok, true);
    const wrongSky = readGlass({ ...seen.save, mode: "legacy" }, "sky");
    assert.equal(wrongSky.ok, false);
    const wrongChart = readGlass({ ...seen.save, mode: "ascension" }, "chart");
    assert.equal(wrongChart.ok, false);

    const chart = readGlass(seen.save, "chart");
    assert.equal(chart.ok, true);
    if (!chart.ok) return;
    assert.equal(chart.save.flags["flag.sky_chart"], true);
    assert.equal(chart.save.flags["flag.sky_split"], undefined);
    assert.equal(chart.save.inventory.some((i) => i.itemId === "item.lens_shard"), false);
    const again = readGlass(chart.save, "chart");
    assert.equal(again.ok, true);
    if (again.ok) assert.equal(again.save.inventory.some((i) => i.itemId === "item.lens_shard"), false);

    const lifted = { ...chart.save, mode: "ascension" as const };
    const sky = readGlass(lifted, "sky");
    assert.equal(sky.ok, true);
    if (!sky.ok) return;
    assert.equal(sky.save.flags["flag.sky_ahead"], true);
    assert.equal(sky.save.flags["flag.sky_split"], true);
    assert.equal(sky.save.inventory.filter((i) => i.itemId === "item.lens_shard").length, 1);
    assert.equal(sky.save.inventory.find((i) => i.itemId === "item.lens_shard")?.qty, 1);
    const second = readGlass(sky.save, "sky");
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(second.save.inventory.find((i) => i.itemId === "item.lens_shard")?.qty, 1);

    assert.equal(tryDome(sky.save).ok, false);
    const cleared = setFlag(sky.save, "flag.cleared.enc.gust");
    assert.equal(tryDome(cleared).ok, true);
    assert.equal(tryDome(setFlag(freshSave("Ash"), "flag.cleared.enc.gust")).ok, false);
  });

  it("joins Sera once, on either answer, and benches her without copying a pack", () => {
    const early = chooseSera(freshSave("Ash"), "splice");
    assert.ok(early);
    if (!early) return;
    assert.equal(early.save.flags["flag.sera_joined"], true);
    assert.ok(early.save.party.includes("sera"));
    assert.equal(early.save.inventory.find((i) => i.itemId === "accessory.risk_splice")?.qty, 1);
    assert.equal(chooseSera(early.save, "stay"), null);
    assert.equal(early.save.knownSpells.sera?.includes("spell.gust"), true);
    assert.equal(early.save.knownSpells.sera?.includes("spell.crosswind"), false);

    const crowded = chooseSera(fullCompany(), "stay");
    assert.ok(crowded);
    if (!crowded) return;
    assert.equal(crowded.save.party.includes("sera"), false);
    assert.ok(crowded.save.reserve.includes("sera"));
    assert.equal(crowded.save.party.length, 4);
    assert.equal(crowded.save.inventory.find((i) => i.itemId === "accessory.stay_pin")?.qty, 1);
    assert.equal(crowded.save.inventory.find((i) => i.itemId === "accessory.risk_splice"), undefined);
    assert.equal(skyAsked(crowded.save), true);
    assert.equal(skyAsked(early.save), false);

    const alone = chooseSera(freshSave("Ash"), "stay");
    assert.ok(alone);
    if (!alone) return;
    alone.save.roster.sera!.hp = 11;
    alone.save.roster.sera!.mp = 4;
    alone.save.gold = 40;
    alone.save.inventory.push({ itemId: "item.cloud_salt", qty: 1 });
    alone.save.equipment.sera = { weapon: "weapon.festival_knife" };
    alone.save.bonds.sera = 3;
    alone.save.knownSpells.sera = ["spell.gust"];
    const beforeHp = alone.save.roster.sera!.hp;
    const pack = alone.save.inventory.length;
    const benched = benchToggle(alone.save, "sera");
    assert.equal(benched.ok, true);
    if (!benched.ok) return;
    assert.ok(benched.save.reserve.includes("sera"));
    assert.equal(benched.save.party.includes("sera"), false);
    assert.equal(benched.save.roster.sera!.hp, beforeHp);
    assert.equal(benched.save.roster.sera!.mp, 4);
    assert.equal(benched.save.gold, 40);
    assert.equal(benched.save.inventory.length, pack);
    assert.equal(benched.save.equipment.sera?.weapon, "weapon.festival_knife");
    assert.equal(benched.save.bonds.sera, 3);
    assert.deepEqual(benched.save.knownSpells.sera, ["spell.gust"]);
    const back = benchToggle(benched.save, "sera");
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.ok(back.save.party.includes("sera"));
      assert.equal(back.save.inventory.filter((i) => i.itemId === "accessory.stay_pin").length, 1);
    }

    const fighting = structuredClone(alone.save);
    fighting.encounter = galeAt(200);
    assert.equal(benchToggle(fighting, "sera").ok, false);
    const loud = structuredClone(alone.save);
    loud.mapId = "map.glass";
    assert.equal(benchToggle(loud, "sera").ok, false);
    assert.equal(benchToggle(alone.save, "wanderer").ok, false);
    assert.equal(benchToggle(alone.save, "iri").ok, false);
    const full = fullCompany();
    full.reserve = ["sera"];
    full.roster.sera = makeCombatant("sera");
    assert.equal(benchToggle(full, "sera").ok, false);
    assert.equal(full.party.length, 4);
  });

  it("changes the line without touching breath, and teaches Stayline and Crosswind through the core", () => {
    const save = chooseSera(freshSave("Ash"), "splice")!.save;
    const hp = save.roster.wanderer!.hp;
    assert.equal(setFormation(save, "line").ok, false);
    const wide = setFormation(save, "wide");
    assert.equal(wide.ok, true);
    if (!wide.ok) return;
    assert.equal(wide.save.formation, "wide");
    assert.equal(wide.save.roster.wanderer!.hp, hp);
    assert.ok(formationSlot("wide", 0).z > formationSlot("line", 0).z);
    const open = structuredClone(wide.save);
    open.encounter = galeAt(200);
    assert.equal(setFormation(open, "line").ok, false);

    assert.equal(tryLearnStayline(save).ok, false);
    const ridge = setFlag(save, "flag.ridge_complete");
    const stay = tryLearnStayline(ridge);
    assert.equal(stay.ok, true);
    if (!stay.ok) return;
    assert.ok(stay.save.knownSpells.sera?.includes("atk.stayline"));
    assert.equal(talkAda(stay.save).save.knownSpells.sera?.includes("atk.stayline"), true);
    assert.equal(tryLearnCrosswind(stay.save).ok, false);
    stay.save.spellMastery["spell.gust"] = 2;
    const wind = tryLearnCrosswind(stay.save);
    assert.equal(wind.ok, true);
    if (!wind.ok) return;
    assert.ok(wind.save.knownSpells.sera?.includes("spell.crosswind"));
    assert.equal(talkSera(wind.save).save.knownSpells.sera?.filter((id) => id === "spell.crosswind").length, 1);
    assert.equal(wind.save.earnedSpells.includes("spell.crosswind"), false);

    const sera = makeCombatant("sera", { position: { x: 0, z: 0.2 } });
    sera.knownAbilities = ["atk.strike", "spell.gust", "atk.stayline", "spell.crosswind"];
    sera.mp = 40;
    const encFor = (abilityId: string, kind: "attack" | "cast") => {
      const state = createEncounter({
        encounterId: "enc.gust",
        seed: 3,
        party: [structuredClone(sera)],
        enemies: [{ ...structuredClone(ENEMY_TEMPLATES.gustling), id: "gust", position: { x: 0, z: -1.2 } }],
      });
      state.activeActorId = "sera";
      state.phase = "player";
      return proposeAction(state, act({ actorId: "sera", abilityId, kind, targetIds: ["gust"] }));
    };
    const lineHit = encFor("atk.stayline", "attack");
    const cross = encFor("spell.crosswind", "cast");
    assert.equal(lineHit.ok, true);
    assert.equal(cross.ok, true);
    assert.ok((cross.state.events.find((e) => e.kind === "damage")?.amount ?? 0) > (lineHit.state.events.find((e) => e.kind === "damage")?.amount ?? 0));

    const kael = makeCombatant("kael", { position: { x: 0, z: 0.2 } });
    const bite = (id: string, abilityId: string, kind: "attack" | "cast") => {
      const caster = id === "kael" ? structuredClone(kael) : structuredClone(sera);
      caster.knownAbilities = [abilityId, "atk.strike", "spell.gust"];
      caster.mp = 40;
      const state = createEncounter({
        encounterId: "enc.gust",
        seed: 8,
        party: [caster],
        enemies: [{ ...structuredClone(ENEMY_TEMPLATES.gustling), id: "gust", position: { x: 0, z: -1.2 } }],
      });
      state.activeActorId = id;
      state.phase = "player";
      const res = proposeAction(state, act({ actorId: id, abilityId, kind, targetIds: ["gust"] }));
      assert.equal(res.ok, true);
      return res.state.events.find((e) => e.kind === "damage");
    };
    const stone = bite("kael", "atk.oathcut", "attack");
    const windHit = bite("sera", "spell.gust", "cast");
    assert.ok((stone?.amount ?? 0) > (windHit?.amount ?? 0));
    assert.match(stone?.text ?? "", /bites/);
    assert.match(windHit?.text ?? "", /slides off/);
  });

  it("lets the gale sit only after a noon you actually kept, and pays one unique reward either way", () => {
    const high = galeAt(200);
    assert.equal(tryMercy(high, { skyAsked: true }).ok, false);
    const low = galeAt(90);
    assert.equal(tryMercy(low, { skyAsked: false }).ok, false);
    const splice = chooseSera(freshSave("Ash"), "splice")!.save;
    assert.equal(skyAsked(splice), false);
    const stay = chooseSera(freshSave("Ash"), "stay")!.save;
    assert.equal(skyAsked(stay), true);
    const seen = setFlag(freshSave("Ash"), "flag.sight_glass");
    assert.equal(skyAsked(seen), true);

    const spared = tryMercy(low, { skyAsked: true });
    assert.equal(spared.ok, true);
    assert.equal(spared.state.pendingReward?.id, "reward.gale.mercy");
    assert.ok(spared.state.pendingReward?.flags.includes("flag.ridge_complete"));
    assert.ok(spared.state.pendingReward?.flags.includes("flag.skiff_ready"));
    let mercySave = applyReward(freshSave("Ash"), spared.state.pendingReward!);
    const thread = mercySave.inventory.find((i) => i.itemId === "accessory.early_thread")?.qty ?? 0;
    mercySave = applyReward(mercySave, spared.state.pendingReward!);
    assert.equal(mercySave.inventory.find((i) => i.itemId === "accessory.early_thread")?.qty, thread);
    assert.equal(mercySave.inventory.some((i) => i.itemId === "weapon.gale_hook"), false);
    assert.equal(mercySave.flags["flag.ridge_complete"], true);
    assert.equal(mercySave.flags["flag.skiff_ready"], true);

    const dying = galeAt(8);
    const kill = proposeAction(dying, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["gale"] }));
    assert.equal(kill.ok, true);
    assert.equal(kill.state.outcome, "victory");
    assert.equal(kill.state.pendingReward?.id, "reward.gale.defeat");
    const killed = applyReward(freshSave("Ash"), kill.state.pendingReward!);
    assert.equal(killed.inventory.some((i) => i.itemId === "weapon.gale_hook"), true);
    assert.equal(killed.inventory.some((i) => i.itemId === "accessory.early_thread"), false);
    assert.equal(killed.flags["flag.skiff_ready"], true);
    assert.equal(applyReward(killed, spared.state.pendingReward!).inventory.some((i) => i.itemId === "accessory.early_thread"), true);

    const cracked = galeAt(120);
    const phase = proposeAction(cracked, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["gale"] }));
    assert.equal(phase.ok, true);
    const boss = phase.state.combatants.find((c) => c.id === "gale")!;
    assert.equal(boss.phase, 2);
    assert.equal(boss.alive, true);
    assert.equal(phase.state.outcome, "ongoing");
    assert.ok(phase.state.combatants.some((c) => c.id === "ahead-1"));
    assert.ok(phase.state.combatants.some((c) => c.id === "ahead-2"));

    const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 0.4 } });
    const mira = makeCombatant("mira", { position: { x: 1, z: 0.5 } });
    const late = createEncounter({
      encounterId: "enc.galekeeper",
      seed: 2,
      party: [hero, mira],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.galekeeper), id: "gale", phase: 2, speed: 40, position: { x: 0, z: -1.5 } }],
    });
    assert.equal(late.phase, "enemy");
    assert.equal(late.intents[0]?.abilityId, "enemy.early_gale");
    assert.ok(late.intents[0]?.targetIds.includes("wanderer"));
    assert.ok(late.intents[0]?.targetIds.includes("mira"));
    const before = late.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    const resolved = resolveEnemyTurn(late);
    assert.equal(resolved.ok, true);
    const after = resolved.state.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    assert.ok(after.every((hp, i) => hp < before[i]!));
    const suggestion = companionInstinct(late, "mira");
    assert.ok(suggestion);
    assert.equal(late.combatants.find((c) => c.id === "gale")!.hp, 230);
  });

  it("flies the First Stay between two pads and does not explain the early shadow", () => {
    let save = setFlag(freshSave("Ash"), "flag.skiff_ready");
    save.mapId = "map.ridge";
    save.gold = 17;
    assert.equal(flyTo(save, "dock.vale").ok, false);
    save.mapId = "map.berth";
    assert.equal(flyTo(save, "dock.berth").ok, false);
    const shut = flyTo(freshSave("Ash"), "dock.vale");
    assert.equal(shut.ok, false);
    const gone = flyTo(save, "dock.vale");
    assert.equal(gone.ok, true);
    if (!gone.ok) return;
    assert.equal(gone.save.mapId, "map.vale");
    assert.equal(gone.save.spawnId, "sky_pad");
    assert.equal(gone.save.flags["flag.flown"], true);
    assert.equal(gone.save.gold, 17);
    assert.equal(gone.save.inventory.length, save.inventory.length);
    const back = flyTo(gone.save, "dock.berth");
    assert.equal(back.ok, true);
    if (!back.ok) return;
    assert.equal(back.save.mapId, "map.berth");
    assert.equal(noteHullShadow(setFlag(freshSave("Ash"), "flag.skiff_ready")).ok, false);
    const noted = noteHullShadow(back.save);
    assert.equal(noted.ok, true);
    if (!noted.ok) return;
    assert.equal(noted.save.flags["flag.hull_shadow"], true);
    assert.equal(noteHullShadow(noted.save).ok, false);
    assert.equal(noted.text.includes("not explained") || noted.text.includes("not explain"), true);
    const salt = takeCloudSalt(setFlag(freshSave("Ash"), "flag.sight_cave"));
    assert.equal(salt.ok, true);
    if (salt.ok) assert.equal(takeCloudSalt(salt.save).ok, false);
  });

  it("migrates a schema 3 chronicle onto the rig and keeps the public door shut", () => {
    const raw = JSON.parse(serialize(freshSave("Ash"))) as Record<string, unknown>;
    raw.schema = 3;
    raw.wardenOutcome = "spared";
    raw.flags = { "flag.warden_spared": true };
    raw.party = ["wanderer", "mira", "kael", "nessa", "sera"];
    delete raw.reserve;
    delete raw.formation;
    const back = deserialize(JSON.stringify(raw));
    assert.equal(back.schema, 4);
    assert.equal(back.wardenOutcome, "spared");
    assert.equal(back.formation, "line");
    assert.equal(back.party.length, 4);
    assert.ok(back.party.includes("wanderer"));
    assert.deepEqual(back.reserve, ["sera"]);
    const blob = JSON.stringify({ SKY_COPY, maps: ["map.ridge", "map.glass", "map.cave", "map.berth"].map((id) => MAPS[id]) }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });
});
