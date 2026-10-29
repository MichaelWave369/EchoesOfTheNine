import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { ENEMY_TEMPLATES, makeCombatant } from "../content/characters.ts";
import { applyReward, deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { learnElementalist, prepareForBattle, useSight } from "../content/gear.ts";
import { ATLAS, canTravel, learnSolarFrom, markPlace } from "../content/expanses.ts";
import {
  CROSSING_COPY,
  HOLD_OLD,
  HOLD_SEAL,
  companionInstinct,
  dismissSight,
  recordDepartures,
  switchJob,
  takePierCache,
  talkHale,
  talkTamsin,
  tickSight,
  tryHold,
  tryLearnWake,
} from "../content/crossing.ts";
import type { CombatAction, EncounterState, SaveGame } from "../contracts.ts";

function act(partial: Partial<CombatAction> & Pick<CombatAction, "actorId" | "abilityId" | "kind">): CombatAction {
  return { version: 1, targetIds: [], modeOrigin: "legacy", timeOrTurn: 1, ...partial };
}

function quiet(name = "Ash"): SaveGame {
  const save = freshSave(name);
  save.mapId = "map.ferry";
  return save;
}

function ferrymanAt(hp: number): EncounterState {
  const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 0.4 } });
  const state = createEncounter({
    encounterId: "enc.ferryman",
    seed: 4,
    party: [hero],
    enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ferryman), id: "ferryman", position: { x: 0, z: -1.2 } }],
  });
  const foe = state.combatants.find((c) => c.id === "ferryman")!;
  foe.hp = hp;
  state.activeActorId = "wanderer";
  state.phase = "player";
  return state;
}

describe("Mistwater crossing", () => {
  it("keeps the far dock shut until the split bell, and will not atlas-travel a place that was only a rumor", () => {
    const dock = MAPS["map.lowbell"]?.exits.find((e) => e.to === "map.ferry");
    assert.equal(dock?.requires, "flag.bell_solved");
    assert.equal(MAPS["map.ferry"]?.exits.find((e) => e.to === "map.highroad")?.requires, "flag.ferry_complete");
    let save = markPlace(setFlag(freshSave("Ash"), "flag.nessa_joined"));
    assert.equal(canTravel(save, "map.ferry"), false);
    save = markPlace(setFlag(save, "flag.bell_solved"));
    save.mapId = "map.lowbell";
    assert.equal(canTravel(save, "map.ferry"), false);
    save.discoveries.push("place.map.ferry");
    assert.equal(canTravel(save, "map.ferry"), true);
    assert.equal(canTravel(save, "map.sky"), false);
    assert.equal(ATLAS.find((p) => p.id === "map.sky")?.locked, true);
  });

  it("spends a Sight charge on an overlay that clues and does not solve", () => {
    let save = setFlag(quiet(), "flag.temporal_sight");
    save.sightCharges = 2;
    const seen = useSight(save);
    assert.equal(seen.ok, true);
    if (!seen.ok) return;
    assert.equal(seen.save.sightCharges, 1);
    assert.equal(seen.save.sightScene, "sight.ferry");
    assert.equal(seen.save.sightSteps, 8);
    assert.equal(seen.save.flags["flag.sight_ferry"], true);
    assert.equal(seen.save.flags["flag.hold_open"], undefined);
    assert.equal(seen.save.flags["flag.twice_departed"], undefined);
    const recorded = recordDepartures(seen.save);
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    assert.equal(recorded.save.flags["flag.twice_departed"], true);
    let faded = seen.save;
    for (let i = 0; i < 8; i++) faded = tickSight(faded);
    assert.equal(faded.sightScene, null);
    assert.equal(faded.sightSteps, 0);
    assert.equal(faded.flags["flag.sight_ferry"], true);
    const held = dismissSight(seen.save);
    assert.equal(held.sightScene, null);
    assert.equal(held.flags["flag.sight_ferry"], true);
    const back = deserialize(serialize(recorded.save));
    assert.equal(back.flags["flag.twice_departed"], true);
    assert.equal(back.flags["flag.sight_ferry"], true);
    save.mapId = "map.hold";
    save.sightCharges = 1;
    const hold = useSight(save);
    assert.equal(hold.ok, true);
    if (hold.ok) {
      assert.equal(hold.save.sightScene, "sight.hold");
      assert.equal(hold.save.flags["flag.hold_open"], undefined);
      assert.equal(tryHold(hold.save, ["flame", "tide", "stone"]).ok, true);
    }
    const pier = takePierCache(seen.save);
    assert.equal(pier.ok, true);
    if (pier.ok) {
      assert.equal(takePierCache(pier.save).ok, false);
      assert.equal(pier.save.inventory.filter((i) => i.itemId === "item.river_glass").length, 1);
    }
    assert.equal(takePierCache(quiet()).ok, false);
  });

  it("opens the hold on the older cut for either Warden ending, and the seal only if the prism fell", () => {
    const spared = setFlag(quiet(), "flag.warden_spared");
    spared.wardenOutcome = "spared";
    assert.equal(tryHold(spared, [...HOLD_SEAL]).ok, false);
    const old = tryHold(spared, [...HOLD_OLD]);
    assert.equal(old.ok, true);
    if (!old.ok) return;
    assert.equal(old.save.flags["flag.hold_open"], true);
    assert.equal(old.save.flags["flag.hold_seal"], undefined);
    assert.ok(old.save.jobsUnlocked.includes("job.riverward"));
    assert.equal(old.save.roster.wanderer?.jobId, "job.wanderer");
    assert.equal(tryHold(old.save, ["wind", "wind", "wind"]).ok, true);

    const fell = setFlag(quiet(), "flag.warden_defeated");
    fell.wardenOutcome = "defeated";
    const sealed = tryHold(fell, [...HOLD_SEAL]);
    assert.equal(sealed.ok, true);
    if (sealed.ok) assert.equal(sealed.save.flags["flag.hold_seal"], true);
    const also = tryHold(setFlag(quiet(), "flag.warden_defeated"), [...HOLD_OLD]);
    assert.equal(also.ok, true);
    assert.match(talkHale(setFlag(quiet(), "flag.kael_law")).text, /flame, then tide, then stone/);
    assert.match(talkHale(setFlag(quiet(), "flag.kael_people")).text, /flame, then tide, then stone/);
  });

  it("changes jobs without refreshing a breath, a purse, a pack, or a cooldown", () => {
    let save = learnElementalist(quiet());
    save.spellMastery["spell.ember"] = 3;
    save.flags["flag.braziers"] = true;
    const solar = learnSolarFrom(save, "kiln");
    assert.equal(solar.ok, true);
    if (!solar.ok) return;
    save = solar.save;
    assert.ok(save.earnedSpells.includes("spell.solar"));
    assert.ok(save.knownSpells.wanderer?.includes("spell.flare"));
    const hero = save.roster.wanderer!;
    hero.hp = 11;
    hero.mp = 3;
    hero.cooldowns = { "spell.flare": 2 };
    save.gold = 9;
    save.inventory = [{ itemId: "item.dew_vial", qty: 1 }];
    save.encounter = ferrymanAt(200);
    const fighting = switchJob(save, "job.wanderer");
    assert.equal(fighting.ok, false);
    assert.equal(save.roster.wanderer?.mp, 3);
    assert.equal(save.encounter?.combatants.find((c) => c.id === "wanderer")?.cooldowns["spell.ember"], undefined);
    save.encounter = null;
    save.mapId = "map.vale";
    assert.equal(switchJob(save, "job.wanderer").ok, false);
    save.mapId = "map.ferry";
    const back = switchJob(save, "job.wanderer");
    assert.equal(back.ok, true);
    if (!back.ok) return;
    assert.equal(back.save.roster.wanderer?.hp, 11);
    assert.equal(back.save.roster.wanderer?.mp, 3);
    assert.equal(back.save.roster.wanderer?.cooldowns["spell.flare"], 2);
    assert.equal(back.save.gold, 9);
    assert.equal(back.save.inventory.find((i) => i.itemId === "item.dew_vial")?.qty, 1);
    assert.equal(back.save.knownSpells.wanderer?.includes("spell.flare"), false);
    assert.ok(back.save.knownSpells.wanderer?.includes("spell.solar"));
    assert.equal(prepareForBattle(back.save, "wanderer").knownAbilities?.includes("spell.flare"), false);
    const again = switchJob(back.save, "job.elementalist");
    assert.equal(again.ok, true);
    if (again.ok) {
      assert.ok(again.save.knownSpells.wanderer?.includes("spell.flare"));
      assert.ok(again.save.knownSpells.wanderer?.includes("spell.solar"));
      assert.equal(again.save.roster.wanderer?.mp, 3);
    }
    assert.equal(switchJob(save, "job.riverward").ok, false);
    assert.equal(switchJob(save, "job.dragoon").ok, false);
    assert.equal(switchJob(save, "job.chronomancer").ok, false);
    const opened = tryHold(save, [...HOLD_OLD]);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const river = switchJob(opened.save, "job.riverward");
    assert.equal(river.ok, true);
    if (!river.ok) return;
    assert.ok(river.save.knownSpells.wanderer?.includes("spell.stillwater"));
    assert.ok(river.save.knownSpells.wanderer?.includes("spell.echo_lash"));
    assert.equal(river.save.knownSpells.wanderer?.includes("spell.double_wake"), false);
    assert.ok(river.save.earnedSpells.includes("spell.solar"));
    assert.equal(river.save.knownSpells.wanderer?.includes("spell.solar"), false);
    assert.equal(river.save.knownSpells.wanderer?.includes("spell.flare"), false);
    assert.equal(river.save.roster.wanderer?.hp, 11);
    const home = switchJob(river.save, "job.wanderer");
    assert.equal(home.ok, true);
    if (home.ok) assert.ok(home.save.knownSpells.wanderer?.includes("spell.solar"));
  });

  it("resolves the new river arts in the combat core, and keeps Double Wake behind practice", () => {
    const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 0.2 } });
    hero.knownAbilities = ["atk.strike", "spell.stillwater", "spell.echo_lash", "spell.double_wake"];
    hero.hp = 20;
    hero.mp = 40;
    let still = createEncounter({
      encounterId: "enc.crossing",
      seed: 5,
      party: [structuredClone(hero)],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.mistling), id: "mist", position: { x: 0, z: -1.2 } }],
    });
    still.activeActorId = "wanderer";
    still.phase = "player";
    const mended = proposeAction(still, act({ actorId: "wanderer", abilityId: "spell.stillwater", kind: "cast", targetIds: ["wanderer"] }));
    assert.equal(mended.ok, true);
    assert.ok(mended.state.combatants.find((c) => c.id === "wanderer")!.hp > 20);

    const bite = (abilityId: "spell.ember" | "spell.echo_lash") => {
      const caster = structuredClone(hero);
      caster.knownAbilities = ["spell.ember", "spell.echo_lash", "atk.strike"];
      let enc = createEncounter({
        encounterId: "enc.vault",
        seed: 11,
        party: [caster],
        enemies: [{ ...structuredClone(ENEMY_TEMPLATES.driftlantern), id: "lantern", position: { x: 0, z: -1.2 } }],
      });
      enc.activeActorId = "wanderer";
      enc.phase = "player";
      const res = proposeAction(enc, act({ actorId: "wanderer", abilityId, kind: "cast", targetIds: ["lantern"] }));
      assert.equal(res.ok, true);
      const event = res.state.events.find((e) => e.kind === "damage");
      return event;
    };
    const flame = bite("spell.ember");
    const tide = bite("spell.echo_lash");
    assert.ok((tide?.amount ?? 0) > (flame?.amount ?? 0));
    assert.match(tide?.text ?? "", /bites/);
    assert.match(flame?.text ?? "", /slides off/);

    let save = setFlag(quiet(), "flag.ferry_complete");
    save.spellMastery["spell.echo_lash"] = 1;
    assert.equal(tryLearnWake(save).ok, false);
    save.spellMastery["spell.echo_lash"] = 2;
    save.flags["flag.ferry_complete"] = false;
    assert.equal(tryLearnWake(save).ok, false);
    save.flags["flag.ferry_complete"] = true;
    const learned = tryLearnWake(save);
    assert.equal(learned.ok, true);
    if (!learned.ok) return;
    assert.ok(learned.save.earnedSpells.includes("spell.double_wake"));
    assert.equal(tryLearnWake(learned.save).ok, false);
    const wake = proposeAction(
      (() => {
        const caster = structuredClone(hero);
        let enc = createEncounter({
          encounterId: "enc.vault",
          seed: 9,
          party: [caster],
          enemies: [{ ...structuredClone(ENEMY_TEMPLATES.driftlantern), id: "lantern", position: { x: 0, z: -1.2 } }],
        });
        enc.activeActorId = "wanderer";
        enc.phase = "player";
        return enc;
      })(),
      act({ actorId: "wanderer", abilityId: "spell.double_wake", kind: "cast", targetIds: ["lantern"] }),
    );
    assert.equal(wake.ok, true);
    assert.ok((wake.state.events.find((e) => e.kind === "damage")?.amount ?? 0) > (tide?.amount ?? 0));
    const locked = makeCombatant("wanderer", { name: "Ash" });
    let denied = createEncounter({
      encounterId: "enc.vault",
      seed: 3,
      party: [locked],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.driftlantern), id: "lantern", position: { x: 0, z: -1 } }],
    });
    denied.activeActorId = "wanderer";
    denied.phase = "player";
    assert.equal(proposeAction(denied, act({ actorId: "wanderer", abilityId: "spell.double_wake", kind: "cast", targetIds: ["lantern"] })).ok, false);
  });

  it("lets either Warden ending finish the ferryman, and pays mercy and defeat only once", () => {
    const low = Math.floor(210 * 0.4);
    const spared = tryMercy(ferrymanAt(low), { wardenSpared: true });
    assert.equal(spared.ok, true);
    assert.equal(spared.state.outcome, "mercy");
    assert.equal(spared.state.combatants.filter((c) => c.side === "enemy" && c.alive).length, 0);
    assert.equal(spared.state.pendingReward?.id, "reward.ferryman.mercy");
    assert.ok(spared.state.pendingReward?.flags.includes("flag.ferry_complete"));
    let kept = applyReward(freshSave("Ash"), spared.state.pendingReward!);
    assert.ok(kept.inventory.some((i) => i.itemId === "accessory.departure_thread"));
    assert.equal(kept.inventory.some((i) => i.itemId === "weapon.river_hook"), false);
    const qty = kept.inventory.find((i) => i.itemId === "accessory.departure_thread")?.qty;
    kept = applyReward(kept, spared.state.pendingReward!);
    assert.equal(kept.inventory.find((i) => i.itemId === "accessory.departure_thread")?.qty, qty);

    const heard = talkTamsin(talkHale(quiet()).save);
    assert.equal(heard.save.flags["flag.twice_departed"], true);
    const byHours = tryMercy(ferrymanAt(low), { doubleDeparture: true });
    assert.equal(byHours.ok, true);
    assert.equal(tryMercy(ferrymanAt(low), {}).ok, false);
    assert.equal(tryMercy(ferrymanAt(low + 8), { wardenSpared: true }).ok, false);

    let killed = ferrymanAt(6);
    const fell = proposeAction(killed, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["ferryman"] }));
    assert.equal(fell.ok, true);
    assert.equal(fell.state.outcome, "victory");
    assert.equal(fell.state.pendingReward?.id, "reward.ferryman.defeat");
    assert.equal(fell.state.pendingReward?.items[0]?.itemId, "weapon.river_hook");
    const already = createEncounter({
      encounterId: "enc.ferryman",
      seed: 8,
      party: [makeCombatant("wanderer", { name: "Ash" })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ferryman), id: "ferryman", hp: 4, position: { x: 0, z: -1 } }],
      rewardsAlready: ["reward.ferryman.mercy"],
    });
    already.combatants.find((c) => c.id === "ferryman")!.hp = 4;
    already.activeActorId = "wanderer";
    already.phase = "player";
    const second = proposeAction(already, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["ferryman"] }));
    assert.equal(second.ok, true);
    assert.equal(second.state.pendingReward, null);
  });

  it("starts a second boarding without ending the fight, and a companion instinct does not swing by itself", () => {
    const hero = makeCombatant("wanderer", { name: "Ash", position: { x: -0.4, z: 1.6 } });
    const mira = makeCombatant("mira", { position: { x: 0.6, z: 1.8 } });
    let state = createEncounter({
      encounterId: "enc.ferryman",
      seed: 6,
      party: [hero],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ferryman), id: "ferryman", position: { x: 0, z: -1.4 } }],
    });
    state.combatants.find((c) => c.id === "ferryman")!.hp = 106;
    state.activeActorId = "wanderer";
    state.phase = "player";
    const hit = proposeAction(state, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["ferryman"] }));
    assert.equal(hit.ok, true);
    const boss = hit.state.combatants.find((c) => c.id === "ferryman")!;
    assert.equal(boss.phase, 2);
    assert.equal(boss.alive, true);
    assert.equal(hit.state.outcome, "ongoing");
    assert.ok(hit.state.combatants.some((c) => c.id === "reflection-1"));
    assert.ok(hit.state.combatants.some((c) => c.id === "reflection-2"));

    const late = createEncounter({
      encounterId: "enc.ferryman",
      seed: 2,
      party: [hero, mira],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ferryman), id: "ferryman", phase: 2, speed: 40, position: { x: 0, z: -1.5 } }],
    });
    assert.equal(late.phase, "enemy");
    assert.equal(late.intents[0]?.abilityId, "enemy.double_departure");
    assert.ok(late.intents[0]?.targetIds.includes("wanderer"));
    assert.ok(late.intents[0]?.targetIds.includes("mira"));
    const before = late.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    const resolved = resolveEnemyTurn(late);
    assert.equal(resolved.ok, true);
    const after = resolved.state.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    assert.ok(after.every((hp, i) => hp < before[i]!));

    const suggestion = companionInstinct(late, "mira");
    assert.ok(suggestion);
    assert.equal(late.combatants.find((c) => c.id === "ferryman")!.hp, 210);
    assert.equal(companionInstinct(late, "wanderer"), null);
  });

  it("migrates a schema 2 chronicle onto the crossing fields and keeps the public door shut", () => {
    const raw = JSON.parse(serialize(freshSave("Ash"))) as Record<string, unknown>;
    raw.schema = 2;
    raw.wardenOutcome = "defeated";
    raw.flags = { "flag.warden_defeated": true };
    raw.knownSpells = { wanderer: ["spell.ember", "spell.solar"] };
    delete raw.earnedSpells;
    delete raw.sightScene;
    delete raw.sightSteps;
    raw.quests = (raw.quests as { id: string }[]).filter((q) => q.id !== "quest.crossing");
    const back = deserialize(JSON.stringify(raw));
    assert.equal(back.schema, 4);
    assert.equal(back.wardenOutcome, "defeated");
    assert.ok(back.earnedSpells.includes("spell.solar"));
    assert.equal(back.sightScene, null);
    assert.equal(back.sightSteps, 0);
    assert.ok(back.quests.some((q) => q.id === "quest.crossing"));
    assert.equal(back.quests.find((q) => q.id === "quest.crossing")?.status, "hidden");
    const blob = JSON.stringify({ CROSSING_COPY, MAPS }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });
});
