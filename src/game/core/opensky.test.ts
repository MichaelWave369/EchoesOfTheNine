import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyReward, deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";
import { ABILITIES } from "../content/abilities.ts";
import { ENEMY_TEMPLATES, makeCombatant } from "../content/characters.ts";
import { switchJob } from "../content/crossing.ts";
import { ATLAS, canTravel, JOB_KITS } from "../content/expanses.ts";
import { restOnDeck, useSight } from "../content/gear.ts";
import {
  OPEN_COPY,
  SKY_DOCKS,
  beginOpenSkySight,
  canLand,
  chooseHeading,
  chooseSignal,
  countAsh,
  dragoonStillShut,
  enterBeacon,
  headingBlock,
  headingObjective,
  landAt,
  launchSky,
  leaveBeacon,
  noteSky,
  pinBearing,
  readBeaconLog,
  returnDock,
  setCinderOrder,
  setDropOrder,
  skyCell,
  stepSky,
  swearBeacon,
  takeCache,
  talkCrew,
  teachPerchDrill,
} from "../content/opensky.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import type { CombatAction } from "../contracts.ts";

function ready(name = "Ash") {
  let save = freshSave(name);
  save = setFlag(save, "flag.flown");
  save = setFlag(save, "flag.hull_shadow");
  save = setFlag(save, "flag.sky_split");
  save = setFlag(save, "flag.hour_complete");
  save = setFlag(save, "flag.skiff_ready");
  save.ascensionUnlocked = true;
  save.mapId = "map.berth";
  save.spawnId = "pad";
  save.mode = "legacy";
  return save;
}

function bothPins(save: ReturnType<typeof ready>) {
  const land = pinBearing(save, "land");
  assert.equal(land.ok, true);
  if (!land.ok) throw new Error("land");
  const flipped = { ...land.save, mode: "ascension" as const };
  const cloud = pinBearing(flipped, "cloud");
  assert.equal(cloud.ok, true);
  if (!cloud.ok) throw new Error("cloud");
  return cloud.save;
}

function act(partial: Omit<CombatAction, "version" | "modeOrigin" | "timeOrTurn">): CombatAction {
  return { version: 1, modeOrigin: "legacy", timeOrTurn: 1, ...partial };
}

describe("the first open sky", () => {
  it("keeps the walked atlas locked and refuses map.sky", () => {
    assert.equal(MAPS["map.sky"], undefined);
    assert.equal(ATLAS.find((p) => p.id === "map.sky")?.locked, true);
    assert.equal(canTravel(ready(), "map.sky"), false);
    assert.ok(MAPS["map.deck"]);
    assert.ok(MAPS["map.cinder"]);
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
  });

  it("names the missing prerequisite and does not open from mercy or company alone", () => {
    const base = freshSave("Ash");
    assert.equal(headingBlock(base), OPEN_COPY.needFly);
    assert.equal(pinBearing(setFlag(base, "flag.flown"), "land").ok, false);
    assert.equal(pinBearing(setFlag(setFlag(base, "flag.flown"), "flag.hull_shadow"), "land").ok, false);
    const glass = setFlag(setFlag(setFlag(base, "flag.flown"), "flag.hull_shadow"), "flag.sky_split");
    const early = pinBearing(glass, "land");
    assert.equal(early.ok, false);
    if (!early.ok) assert.match(early.reason, /Unwritten Hour/);
    const spared = setFlag(ready(), "flag.hour_spared");
    const ended = setFlag(setFlag(ready(), "flag.hour_ended"), "flag.warden_defeated");
    assert.equal(headingBlock(spared), null);
    assert.equal(headingBlock(ended), null);
    assert.equal(chooseHeading(ready(), "roads").ok, false);
  });

  it("pins only in the matching view and pays one needle for either heading", () => {
    const save = ready();
    const wrongCloud = pinBearing(save, "cloud");
    assert.equal(wrongCloud.ok, false);
    const wrongLand = pinBearing({ ...save, mode: "ascension" }, "land");
    assert.equal(wrongLand.ok, false);
    assert.equal(save.flags["flag.bearing_land"], undefined);
    assert.equal(save.flags["flag.bearing_cloud"], undefined);

    for (const warden of ["flag.warden_spared", "flag.warden_defeated"] as const) {
      for (const heading of ["roads", "gap"] as const) {
        let next = setFlag(ready(), warden);
        if (warden === "flag.warden_defeated") next.wardenOutcome = "defeated";
        next = bothPins(next);
        const chosen = chooseHeading(next, heading);
        assert.equal(chosen.ok, true);
        if (!chosen.ok) return;
        assert.equal(chosen.save.flags["flag.sky_open"], true);
        assert.equal(chosen.save.choiceLog.some((c) => c.id === "choice.heading" && c.value === heading), true);
        assert.equal(chosen.save.inventory.filter((s) => s.itemId === "item.sky_needle").length, 1);
        const again = chooseHeading(chosen.save, heading === "roads" ? "gap" : "roads");
        assert.equal(again.ok, true);
        if (!again.ok) return;
        assert.equal(again.save.flags[heading === "roads" ? "flag.heading_gap" : "flag.heading_roads"], undefined);
        assert.equal(again.save.inventory.find((s) => s.itemId === "item.sky_needle")?.qty ?? 0, 1);
        assert.equal(again.save.party.includes("iri"), false);
      }
    }
  });

  it("lets Iri walk or keep the veil without blocking the heading", () => {
    const joined = bothPins(setFlag(ready(), "flag.iri_joined"));
    const walked = chooseHeading(joined, "roads");
    assert.equal(walked.ok, true);
    if (!walked.ok) return;
    assert.match(walked.text, /crease/);
    assert.equal(walked.save.party.includes("iri"), false);

    const veiled = bothPins(setFlag(ready(), "flag.iri_veil"));
    const kept = chooseHeading(veiled, "gap");
    assert.equal(kept.ok, true);
    if (!kept.ok) return;
    assert.match(kept.text, /does not put Iri in the four/);
    assert.equal(kept.save.flags["flag.iri_joined"], undefined);
    const heard = talkCrew(kept.save, "veil");
    assert.equal(heard.ok, true);
    if (!heard.ok) return;
    assert.equal(heard.save.party.includes("iri"), false);
    assert.equal(heard.save.flags["flag.sky_veil_heard"], true);
  });

  it("moves one cell at a time, refuses the edge, and lands only on eligible pads", () => {
    const open = chooseHeading(bothPins(ready()), "roads");
    assert.equal(open.ok, true);
    if (!open.ok) return;
    const up = launchSky({ ...open.save, mapId: "map.berth" });
    assert.equal(up.ok, true);
    if (!up.ok) return;
    assert.equal(skyCell(up.save).x, 15);
    assert.equal(skyCell(up.save).facing, "w");
    assert.equal(up.save.flags["sky.dock"], "dock.berth");
    let sky = up.save;
    for (let i = 0; i < 3; i++) {
      const step = stepSky(sky, "w");
      assert.equal(step.ok, true);
      if (!step.ok) return;
      sky = step.save;
    }
    assert.equal(skyCell(sky).x, 12);
    assert.equal(skyCell(sky).y, 9);
    assert.equal(landAt(sky).ok, false);
    const noted = noteSky(sky);
    assert.equal(noted.ok, true);
    if (!noted.ok) return;
    assert.equal(noted.save.flags["flag.found_cinder"], true);
    const down = landAt(noted.save);
    assert.equal(down.ok, true);
    if (!down.ok) return;
    assert.equal(down.save.mapId, "map.cinder");
    assert.equal(down.save.flags["sky.aboard"], false);

    const edge = launchSky({ ...open.save, mapId: "map.vale" });
    assert.equal(edge.ok, true);
    if (!edge.ok) return;
    assert.equal(skyCell(edge.save).x, SKY_DOCKS[0].x);
    let west = edge.save;
    while (skyCell(west).x > 1) {
      const step = stepSky(west, "w");
      assert.equal(step.ok, true);
      if (!step.ok) return;
      west = step.save;
    }
    assert.equal(stepSky(west, "w").ok, false);
    assert.equal(skyCell(west).x, 1);

    let margin = { ...open.save, mapId: "map.margin" };
    assert.equal(launchSky(margin).ok, false);
    margin = setFlag(margin, "flag.margin_dock");
    const fromMargin = launchSky(margin);
    assert.equal(fromMargin.ok, true);
    if (!fromMargin.ok) return;
    assert.equal(skyCell(fromMargin.save).y, 3);
    const stranded = structuredClone(fromMargin.save);
    stranded.flags["flag.margin_dock"] = false;
    stranded.flags["sky.x"] = 9;
    stranded.flags["sky.y"] = 3;
    assert.equal(canLand(stranded, 9, 3), false);
    assert.equal(landAt(stranded).ok, false);
    const home = returnDock(stranded);
    assert.equal(home.ok, true);
    if (!home.ok) return;
    assert.equal(home.save.mapId, "map.berth");
    assert.equal(home.save.flags["sky.aboard"], false);

    const later = structuredClone(fromMargin.save);
    later.flags["sky.x"] = 14;
    later.flags["sky.y"] = 2;
    later.flags["sky.aboard"] = true;
    assert.equal(landAt(later).ok, false);
    assert.equal(later.flags["sky.aboard"], true);
    const marked = noteSky(later);
    assert.equal(marked.ok, true);
    if (!marked.ok) return;
    assert.equal(marked.save.flags["flag.sky_later"], true);
    assert.equal(landAt(marked.save).ok, false);
  });

  it("does not let sight pin, write the echo, or pay the cache", () => {
    let save = chooseHeading(bothPins(ready()), "gap");
    assert.equal(save.ok, true);
    if (!save.ok) return;
    const up = launchSky(save.save);
    assert.equal(up.ok, true);
    if (!up.ok) return;
    let sky = up.save;
    sky.flags["sky.x"] = 8;
    sky.flags["sky.y"] = 7;
    sky.mapId = "map.vale";
    sky.flags["flag.temporal_sight"] = true;
    sky.sightCharges = 2;
    const seen = useSight(sky);
    assert.equal(seen.ok, true);
    if (!seen.ok) return;
    assert.equal(seen.save.flags["flag.sight_sky_echo"], true);
    assert.equal(seen.save.flags["flag.sky_echo"], undefined);
    assert.equal(seen.save.flags["flag.bearing_land"], true);
    assert.equal(seen.save.inventory.some((s) => s.itemId === "item.cloud_thread"), false);
    const direct = beginOpenSkySight(sky);
    assert.ok(direct);
    assert.equal(direct?.save.flags["flag.sky_echo"], undefined);

    sky.flags["sky.x"] = 7;
    sky.flags["sky.y"] = 6;
    assert.equal(takeCache(sky).ok, false);
    const noted = noteSky(sky);
    assert.equal(noted.ok, true);
    if (!noted.ok) return;
    assert.equal(noted.save.inventory.some((s) => s.itemId === "item.cloud_thread"), false);
    const marked = setFlag(noted.save, "flag.sky_marker");
    const taken = takeCache(marked);
    assert.equal(taken.ok, true);
    if (!taken.ok) return;
    assert.equal(taken.save.inventory.find((s) => s.itemId === "item.cloud_thread")?.qty, 1);
    assert.equal(takeCache(taken.save).ok, false);
  });

  it("keeps the company, the pack, and one signal when the chronicle migrates", () => {
    let save = chooseHeading(bothPins(setFlag(ready(), "flag.kael_law")), "roads");
    assert.equal(save.ok, true);
    if (!save.ok) return;
    save.save.party = ["wanderer", "kael"];
    save.save.reserve = ["mira"];
    save.save.equipment.kael = { weapon: "weapon.festival_knife" };
    const before = {
      party: [...save.save.party],
      reserve: [...(save.save.reserve ?? [])],
      weapon: save.save.equipment.kael?.weapon,
    };
    const up = launchSky(save.save);
    assert.equal(up.ok, true);
    if (!up.ok) return;
    let sky = up.save;
    for (let i = 0; i < 3; i++) {
      const step = stepSky(sky, "w");
      if (!step.ok) throw new Error(step.reason);
      sky = step.save;
    }
    const noted = noteSky(sky);
    if (!noted.ok) throw new Error("note");
    const landed = landAt(noted.save);
    if (!landed.ok) throw new Error(landed.reason);
    assert.deepEqual(landed.save.party, before.party);
    assert.deepEqual(landed.save.reserve, before.reserve);
    assert.equal(landed.save.equipment.kael?.weapon, before.weapon);
    const signal = chooseSignal(landed.save, "bank");
    assert.equal(signal.ok, true);
    if (!signal.ok) return;
    assert.equal(signal.save.choiceLog.some((c) => c.id === "choice.heading" && c.value === "roads"), true);
    assert.equal(signal.save.flags["flag.kael_law"], true);
    assert.equal(chooseSignal(signal.save, "send").ok, true);
    assert.equal(signal.save.inventory.filter((s) => s.itemId === "item.signal_glass").length, 1);
    const onStair = structuredClone(signal.save);
    onStair.mapId = "map.ashvault";
    assert.equal(setCinderOrder(signal.save, ["ash", "salt", "ember"]).ok, false);
    const stair = setCinderOrder(onStair, ["salt", "ash", "ember"]);
    assert.equal(stair.ok, false);
    const openStair = setCinderOrder(onStair, ["ash", "salt", "ember"]);
    assert.equal(openStair.ok, true);

    for (const schema of [1, 2, 3, 4]) {
      const raw = JSON.parse(serialize(signal.save)) as Record<string, unknown>;
      raw.schema = schema;
      if (schema < 4) {
        delete raw.reserve;
        delete raw.formation;
        delete raw.appearance;
      }
      const back = deserialize(JSON.stringify(raw));
      assert.equal(back.schema, 4);
      assert.equal(back.flags["sky.x"], signal.save.flags["sky.x"]);
      assert.equal(back.flags["sky.y"], signal.save.flags["sky.y"]);
      assert.equal(back.flags["flag.sky_open"], true);
      assert.equal(back.inventory.filter((s) => s.itemId === "item.sky_needle").length, 1);
      assert.equal(back.quests.filter((q) => q.id === "quest.heading").length, 1);
      assert.equal(back.flags["sky.aboard"], false);
      assert.equal(back.discoveries.includes("sky.x"), false);
    }
  });

  it("telegraphs a party-wide downdraft and pays the ash lance once", () => {
    const party = [makeCombatant("wanderer", { position: { x: 0, z: 2 } })];
    let state = createEncounter({
      encounterId: "enc.ashkite",
      seed: 4,
      party,
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ashkite), id: "kite", position: { x: 0, z: -2 } }],
    });
    const seen: string[] = [];
    for (let i = 0; i < 8 && state.outcome === "ongoing"; i++) {
      if (state.phase === "enemy") {
        const intent = state.intents[0];
        if (intent) seen.push(intent.abilityId);
        const enemy = resolveEnemyTurn(state);
        assert.equal(enemy.ok, true);
        state = enemy.state;
      } else {
        const hero = state.activeActorId ?? "wanderer";
        const defended = proposeAction(state, act({ actorId: hero, abilityId: "act.defend", kind: "defend", targetIds: [hero] }));
        assert.equal(defended.ok, true);
        state = defended.state;
      }
    }
    assert.ok(seen.includes("enemy.downdraft"));
    const draft = state.log.find((line) => line.includes("Downdraft")) ?? seen.join(" ");
    assert.match(String(draft), /downdraft|Downdraft|enemy.downdraft/);

    const dying = createEncounter({
      encounterId: "enc.ashkite",
      seed: 9,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.ashkite), id: "kite", hp: 1, position: { x: 0, z: -1.2 } }],
    });
    dying.phase = "player";
    dying.activeActorId = "wanderer";
    const kill = proposeAction(dying, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["kite"] }));
    assert.equal(kill.ok, true);
    assert.equal(kill.state.outcome, "victory");
    assert.equal(kill.state.pendingReward?.id, "reward.ashkite");
    assert.ok(kill.state.pendingReward?.flags.includes("flag.dragoon_spark"));
    const paid = applyReward(freshSave("Ash"), kill.state.pendingReward!);
    const twice = applyReward(paid, kill.state.pendingReward!);
    assert.equal(twice.inventory.filter((s) => s.itemId === "item.ash_lance").length, 1);
    assert.equal(twice.flags["flag.ashkite_cleared"], true);
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);

    const blob = JSON.stringify({ OPEN_COPY, deck: MAPS["map.deck"], cinder: MAPS["map.cinder"], stair: MAPS["map.ashvault"] }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });

  it("notes the perch and will not land on it", () => {
    const opened = chooseHeading(bothPins(ready()), "gap");
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const up = launchSky(opened.save);
    assert.equal(up.ok, true);
    if (!up.ok) return;
    let sky = setFlag(up.save, "sky.x", 13);
    sky = setFlag(sky, "sky.y", 7);
    const seen = beginOpenSkySight(sky);
    assert.equal(seen?.save.flags["flag.sight_sky_perch"], true);
    assert.equal(seen?.save.flags["flag.sky_perch"], undefined);
    const noted = noteSky(sky);
    assert.equal(noted.ok, true);
    if (!noted.ok) return;
    assert.equal(noted.save.flags["flag.sky_perch"], true);
    assert.equal(landAt(noted.save).ok, false);
    assert.equal(canLand(noted.save, 13, 7), false);
    assert.equal(canLand(noted.save, 14, 2), false);
    assert.equal(dragoonStillShut(), true);
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
  });

  it("counts the upward ash once and does not flip the signal", () => {
    let save = setFlag(ready(), "flag.found_cinder");
    save.mapId = "map.cinder";
    const blind = countAsh(save);
    assert.equal(blind.ok, false);
    save = setFlag(save, "flag.sight_cinder");
    save = setFlag(save, "flag.cinder_bank");
    save = setFlag(save, "flag.cinder_signal");
    const once = countAsh(save);
    assert.equal(once.ok, true);
    if (!once.ok) return;
    assert.equal(once.save.flags["flag.cinder_bank"], true);
    assert.equal(once.save.flags["flag.cinder_send"], undefined);
    assert.equal(once.save.inventory.filter((s) => s.itemId === "item.cold_vial").length, 1);
    const twice = countAsh(once.save);
    assert.equal(twice.ok, true);
    if (!twice.ok) return;
    assert.equal(twice.save.inventory.filter((s) => s.itemId === "item.cold_vial").length, 1);
    assert.equal(twice.save.flags["flag.cinder_bank"], true);
  });

  it("teaches perch drills through the shared core and keeps Dragoon shut", () => {
    let state = createEncounter({
      encounterId: "enc.perch",
      seed: 3,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.perch), id: "perch", position: { x: 0, z: -1.6 } }],
    });
    const seen: string[] = [];
    for (let i = 0; i < 6 && state.outcome === "ongoing"; i++) {
      if (state.phase === "enemy") {
        const intent = state.intents[0];
        if (intent) seen.push(intent.abilityId);
        const enemy = resolveEnemyTurn(state);
        assert.equal(enemy.ok, true);
        state = enemy.state;
      } else {
        const hero = state.activeActorId ?? "wanderer";
        const hit = proposeAction(state, act({ actorId: hero, abilityId: "atk.strike", kind: "attack", targetIds: ["perch"] }));
        assert.equal(hit.ok, true);
        state = hit.state;
      }
    }
    assert.ok(seen.includes("enemy.perch_draft") || seen.includes("enemy.perch_rake"));

    const dying = createEncounter({
      encounterId: "enc.perch",
      seed: 8,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.perch), id: "perch", hp: 1, position: { x: 0, z: -1.2 } }],
    });
    dying.phase = "player";
    dying.activeActorId = "wanderer";
    const kill = proposeAction(dying, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["perch"] }));
    assert.equal(kill.ok, true);
    assert.equal(kill.state.outcome, "victory");
    assert.equal(kill.state.pendingReward?.id, "reward.perch");
    const paid = applyReward(freshSave("Ash"), kill.state.pendingReward!);
    const twice = applyReward(paid, kill.state.pendingReward!);
    assert.equal(twice.inventory.filter((s) => s.itemId === "item.perch_cord").length, 1);
    assert.equal(twice.flags["flag.dragoon_trial"], true);
    assert.equal(teachPerchDrill(freshSave("Ash")).ok, false);
    const taught = teachPerchDrill(paid);
    assert.equal(taught.ok, true);
    if (!taught.ok) return;
    assert.ok(taught.save.earnedSpells.includes("atk.sky_lance"));
    assert.ok(taught.save.earnedSpells.includes("spell.dragoon_leap"));
    assert.equal(taught.save.earnedSpells.includes("spell.falling_star"), false);
    const kept = teachPerchDrill(taught.save);
    assert.equal(kept.ok, true);
    if (!kept.ok) return;
    assert.equal(kept.save.earnedSpells.filter((id) => id === "atk.sky_lance").length, 1);
    assert.equal(switchJob(taught.save, "job.dragoon").ok, false);
    let swappedSave = taught.save;
    swappedSave.mapId = "map.cinder";
    if (!swappedSave.jobsUnlocked.includes("job.elementalist")) swappedSave.jobsUnlocked.push("job.elementalist");
    const swapped = switchJob(swappedSave, "job.elementalist");
    assert.equal(swapped.ok, true);
    if (!swapped.ok) return;
    assert.ok(swapped.save.knownSpells.wanderer?.includes("atk.sky_lance"));
    assert.ok(swapped.save.knownSpells.wanderer?.includes("spell.dragoon_leap"));
    assert.equal(swapped.save.roster.wanderer?.jobId, "job.elementalist");
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);

    assert.equal(setDropOrder(freshSave("Ash"), ["rise", "hold", "drop"]).ok, false);
    assert.equal(setDropOrder(taught.save, ["drop", "hold", "rise"]).ok, false);
    const onWatch = structuredClone(taught.save);
    onWatch.mapId = "map.cinder";
    const dropped = setDropOrder(onWatch, ["rise", "hold", "drop"]);
    assert.equal(dropped.ok, true);
    if (!dropped.ok) return;
    assert.ok(dropped.save.earnedSpells.includes("spell.falling_star"));
    assert.equal(dropped.save.inventory.filter((s) => s.itemId === "item.star_glass").length, 1);
    const again = setDropOrder(dropped.save, ["rise", "hold", "drop"]);
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.save.inventory.filter((s) => s.itemId === "item.star_glass").length, 1);

    const lance = ABILITIES["atk.sky_lance"]?.effects[0];
    const star = ABILITIES["spell.falling_star"]?.effects[0];
    const leap = ABILITIES["spell.dragoon_leap"];
    const side = ABILITIES["act.dodge"];
    assert.equal(lance && "power" in lance ? lance.power : 0, 18);
    assert.equal(star && "power" in star ? star.power : 0, 26);
    assert.ok(ABILITIES["spell.solar"]!.effects.some((e) => "power" in e && (e.power ?? 0) > 26));
    assert.ok(ABILITIES["spell.crosswind"]!.effects.some((e) => "power" in e && (e.power ?? 0) > 26));
    assert.ok((leap?.cost.mp ?? 0) > (side?.cost.mp ?? 0));
    assert.ok((leap?.cost.cooldownTicks ?? 0) > (side?.cost.cooldownTicks ?? 0));

    let bunk = dropped.save;
    bunk.mapId = "map.deck";
    bunk.gold = 10;
    bunk.sightCharges = 1;
    bunk.roster.wanderer!.hp = 4;
    const rested = restOnDeck(bunk);
    assert.equal(rested.ok, true);
    if (!rested.ok) return;
    assert.equal(rested.save.gold, 4);
    assert.equal(rested.save.sightCharges, 1);
    assert.equal(rested.save.roster.wanderer?.hp, rested.save.roster.wanderer?.maxHp);
    const poor = structuredClone(rested.save);
    poor.gold = 2;
    assert.equal(restOnDeck(poor).ok, false);

    for (const schema of [1, 2, 3, 4]) {
      const raw = JSON.parse(serialize(dropped.save)) as Record<string, unknown>;
      raw.schema = schema;
      const back = deserialize(JSON.stringify(raw));
      assert.equal(back.schema, 4);
      assert.equal(back.flags["flag.dragoon_trial"], true);
      assert.equal(back.flags["flag.falling_star"], true);
      assert.ok(back.earnedSpells.includes("spell.falling_star"));
      assert.equal(back.quests.filter((q) => q.id === "quest.perch").length, 1);
      assert.equal(back.quests.filter((q) => q.id === "quest.tally").length, 1);
      assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
    }
  });

  it("refuses Cinderwatch rewards off their tiles and lets both signals finish the beacon", () => {
    let remote = setFlag(ready(), "flag.found_cinder");
    remote = setFlag(remote, "flag.sight_cinder");
    remote.mapId = "map.vale";
    assert.equal(countAsh(remote).ok, false);
    assert.equal(remote.inventory.some((s) => s.itemId === "item.cold_vial"), false);
    assert.equal(chooseSignal(remote, "bank").ok, false);
    assert.equal(remote.flags["flag.cinder_signal"], undefined);

    let drop = setFlag(ready(), "flag.dragoon_trial");
    drop.mapId = "map.berth";
    assert.equal(setDropOrder(drop, ["rise", "hold", "drop"]).ok, false);
    assert.equal(drop.flags["flag.falling_star"], undefined);
    drop.mapId = "map.cinder";
    const fell = setDropOrder(drop, ["rise", "hold", "drop"]);
    assert.equal(fell.ok, true);
    if (!fell.ok) return;
    assert.equal(setDropOrder({ ...fell.save, mapId: "map.vale" }, ["rise", "hold", "drop"]).ok, true);
    assert.equal(fell.save.inventory.filter((s) => s.itemId === "item.star_glass").length, 1);

    let stair = ready();
    stair.mapId = "map.cinder";
    assert.equal(setCinderOrder(stair, ["ash", "salt", "ember"]).ok, false);
    stair.mapId = "map.vale";
    assert.equal(setCinderOrder(stair, ["ash", "salt", "ember"]).ok, false);
    stair.mapId = "map.ashvault";
    assert.equal(setCinderOrder(stair, ["tide", "ash", "salt"]).ok, false);
    const opened = setCinderOrder(stair, ["ash", "salt", "ember"]);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(setCinderOrder({ ...opened.save, mapId: "map.deck" }, ["ash", "salt", "ember"]).ok, true);
    assert.equal(opened.save.flags["flag.cinder_stair"], true);

    const watched = (signal: "bank" | "send") => {
      let save = setFlag(ready(), "flag.found_cinder");
      save = setFlag(save, "flag.sight_cinder");
      save = setFlag(save, "flag.dragoon_trial");
      save = setFlag(save, "flag.falling_star");
      save = setFlag(save, "flag.ashkite_cleared");
      save = setFlag(save, "flag.sky_open");
      save.mapId = "map.cinder";
      const posted = chooseSignal(save, signal);
      if (!posted.ok) throw new Error(posted.reason);
      return posted.save;
    };

    for (const signal of ["bank", "send"] as const) {
      const posted = watched(signal);
      assert.equal(enterBeacon(posted).ok, false);
      assert.equal(enterBeacon({ ...posted, mapId: "map.vale" }).ok, false);
      const up = launchSky(posted);
      assert.equal(up.ok, true);
      if (!up.ok) return;
      let sky = up.save;
      while (skyCell(sky).x > 4) {
        const step = stepSky(sky, "w");
        if (!step.ok) throw new Error(step.reason);
        sky = step.save;
      }
      while (skyCell(sky).y > 2) {
        const step = stepSky(sky, "n");
        if (!step.ok) throw new Error(step.reason);
        sky = step.save;
      }
      assert.deepEqual([skyCell(sky).x, skyCell(sky).y], [4, 2]);
      const looked = beginOpenSkySight(sky);
      assert.equal(looked?.save.flags["flag.sight_sky_beacon"], true);
      assert.equal(looked?.save.flags["flag.sky_beacon"], undefined);
      assert.equal(canLand(sky, 4, 2), false);
      assert.equal(canLand(sky, 14, 2), false);
      assert.equal(landAt(sky).ok, false);
      const noted = noteSky(sky);
      assert.equal(noted.ok, true);
      if (!noted.ok) return;
      assert.equal(noted.save.flags["flag.sky_beacon"], true);
      assert.equal(landAt(noted.save).ok, false);
      const ground = structuredClone(noted.save);
      ground.mapId = "map.cinder";
      ground.flags["sky.aboard"] = false;
      const road = enterBeacon(ground);
      assert.equal(road.ok, true);
      if (!road.ok) return;
      assert.equal(road.save.mapId, "map.beacon");
      assert.equal(readBeaconLog({ ...road.save, mapId: "map.cinder" }).ok, false);
      const record = readBeaconLog(road.save);
      assert.equal(record.ok, true);
      if (!record.ok) return;
      assert.match(record.text, signal === "bank" ? /held/ : /left/);
      assert.equal(record.save.flags[signal === "bank" ? "flag.cinder_bank" : "flag.cinder_send"], true);
      record.save.sightCharges = 2;
      record.save.flags["flag.temporal_sight"] = true;
      const sight = useSight(record.save);
      assert.equal(sight.ok, true);
      if (!sight.ok) return;
      assert.equal(sight.save.flags["flag.sight_beacon"], true);
      assert.equal(sight.save.flags["flag.beacon_oath"], undefined);
      const away = structuredClone(sight.save);
      away.mapId = "map.cinder";
      assert.equal(swearBeacon(away, signal === "bank" ? "return" : "depart").ok, false);
      const sworn = swearBeacon(sight.save, signal === "bank" ? "return" : "depart");
      assert.equal(sworn.ok, true);
      if (!sworn.ok) return;
      assert.equal(sworn.save.flags["flag.beacon_oath"], true);
      assert.equal(sworn.save.flags[signal === "bank" ? "flag.beacon_return" : "flag.beacon_depart"], true);
      assert.equal(sworn.save.flags[signal === "bank" ? "flag.cinder_send" : "flag.cinder_bank"], undefined);
      assert.equal(sworn.save.inventory.filter((s) => s.itemId === "item.beacon_ash").length, 1);
      assert.match(sworn.text, /Dragoon stays shut/);
      assert.match(sworn.text, /Falling Star/);
      const again = swearBeacon(sworn.save, signal === "bank" ? "depart" : "return");
      assert.equal(again.ok, true);
      if (!again.ok) return;
      assert.equal(again.save.inventory.filter((s) => s.itemId === "item.beacon_ash").length, 1);
      assert.equal(again.save.flags[signal === "bank" ? "flag.beacon_depart" : "flag.beacon_return"], undefined);
      const home = leaveBeacon(sworn.save);
      assert.equal(home.ok, true);
      if (!home.ok) return;
      assert.equal(home.save.mapId, "map.cinder");
      const back = returnDock({ ...home.save, flags: { ...home.save.flags, "sky.aboard": true, "sky.dock": "dock.berth" } });
      assert.equal(back.ok, true);
      if (!back.ok) return;
      assert.equal(back.save.mapId, "map.berth");
      const elsewhere = structuredClone(sworn.save);
      elsewhere.mapId = "map.vale";
      elsewhere.flags["flag.hour_complete"] = true;
      elsewhere.flags["flag.cinder_signal"] = true;
      elsewhere.flags["flag.cinder_stair"] = true;
      assert.equal(headingObjective(elsewhere), null);
    }

    const posted = watched("send");
    posted.flags["flag.sky_beacon"] = true;
    posted.mapId = "map.cinder";
    const road = enterBeacon(posted);
    assert.equal(road.ok, true);
    if (!road.ok) return;
    road.save.sightCharges = 1;
    road.save.flags["flag.temporal_sight"] = true;
    const sight = useSight(road.save);
    assert.equal(sight.ok, true);
    if (!sight.ok) return;
    const sworn = swearBeacon(sight.save, "depart");
    assert.equal(sworn.ok, true);
    if (!sworn.ok) return;

    let state = createEncounter({
      encounterId: "enc.oathwing",
      seed: 5,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.oathwing), id: "oathwing", position: { x: 0, z: -2 } }],
    });
    const seen: string[] = [];
    for (let i = 0; i < 4 && state.outcome === "ongoing"; i++) {
      if (state.phase === "enemy") {
        const intent = state.intents[0];
        if (intent) seen.push(intent.abilityId);
        const enemy = resolveEnemyTurn(state);
        assert.equal(enemy.ok, true);
        state = enemy.state;
      } else {
        const hit = proposeAction(state, act({ actorId: "wanderer", abilityId: "act.defend", kind: "defend", targetIds: ["wanderer"] }));
        assert.equal(hit.ok, true);
        state = hit.state;
      }
    }
    assert.ok(seen.includes("enemy.beacon_flare") || seen.includes("enemy.vow_rake"));

    const phased = createEncounter({
      encounterId: "enc.oathwing",
      seed: 6,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.oathwing), id: "oathwing", hp: 50, position: { x: 0, z: -1.2 } }],
    });
    phased.phase = "player";
    phased.activeActorId = "wanderer";
    const crack = proposeAction(phased, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["oathwing"] }));
    assert.equal(crack.ok, true);
    const wing = crack.state.combatants.find((c) => c.id === "oathwing");
    assert.equal(wing && wing.hp > 0 ? wing.phase : 0, 2);
    const loud = crack.state;
    if (loud.phase === "enemy") {
      const intent = loud.intents[0]?.abilityId ?? "";
      assert.ok(intent === "enemy.broken_record" || intent === "enemy.shear_line");
    }

    const dying = createEncounter({
      encounterId: "enc.oathwing",
      seed: 8,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.oathwing), id: "oathwing", hp: 1, position: { x: 0, z: -1.2 } }],
    });
    dying.phase = "player";
    dying.activeActorId = "wanderer";
    const kill = proposeAction(dying, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["oathwing"] }));
    assert.equal(kill.ok, true);
    assert.equal(kill.state.outcome, "victory");
    assert.equal(kill.state.pendingReward?.id, "reward.oathwing.defeat");
    const paid = applyReward(sworn.save, kill.state.pendingReward!);
    const twice = applyReward(paid, kill.state.pendingReward!);
    assert.equal(twice.inventory.filter((s) => s.itemId === "item.vow_glass").length, 1);
    assert.equal(twice.flags["flag.beacon_done"], true);
    assert.equal(twice.flags["flag.dragoon_oath"], true);
    assert.equal(twice.flags["flag.cinder_send"], true);
    assert.equal(twice.party.includes("iri"), false);
    assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
    assert.equal(dragoonStillShut(), true);
    assert.equal(switchJob(twice, "job.dragoon").ok, false);

    const blocked = createEncounter({
      encounterId: "enc.oathwing",
      seed: 9,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.oathwing), id: "oathwing", hp: 1, position: { x: 0, z: -1.2 } }],
      rewardsAlready: ["reward.oathwing.defeat"],
    });
    blocked.phase = "player";
    blocked.activeActorId = "wanderer";
    const second = proposeAction(blocked, act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["oathwing"] }));
    assert.equal(second.ok, true);
    assert.equal(second.state.pendingReward, null);

    const merciful = createEncounter({
      encounterId: "enc.oathwing",
      seed: 3,
      party: [makeCombatant("wanderer", { position: { x: 0, z: 1.2 } })],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.oathwing), id: "oathwing", hp: 20, position: { x: 0, z: -1.2 } }],
    });
    assert.equal(tryMercy(merciful, { beaconRead: false, wardenSpared: false }).ok, false);
    const high = structuredClone(merciful);
    high.combatants.find((c) => c.id === "oathwing")!.hp = 90;
    assert.equal(tryMercy(high, { beaconRead: true }).ok, false);
    const spared = tryMercy(merciful, { beaconRead: true, wardenSpared: false });
    assert.equal(spared.ok, true);
    if (!spared.ok) return;
    assert.equal(spared.state.outcome, "mercy");
    assert.equal(spared.state.pendingReward?.id, "reward.oathwing.mercy");
    const sat = applyReward(freshSave("Ash"), spared.state.pendingReward!);
    const satAgain = applyReward(sat, spared.state.pendingReward!);
    assert.equal(satAgain.inventory.filter((s) => s.itemId === "item.vow_wick").length, 1);
    assert.equal(satAgain.inventory.some((s) => s.itemId === "item.vow_glass"), false);
    assert.equal(satAgain.flags["flag.dragoon_oath"], true);
    assert.equal(satAgain.party.includes("iri"), false);
    assert.equal(satAgain.flags["flag.iri_joined"], undefined);

    let crew = structuredClone(twice);
    crew.flags["flag.sera_joined"] = true;
    crew.flags["flag.sera_splice"] = true;
    crew.flags["flag.kael_people"] = true;
    crew.flags["flag.mira_blank"] = true;
    crew.reserve = ["sera", "kael", "mira"];
    crew.party = ["wanderer"];
    crew.equipment.kael = { weapon: "weapon.festival_knife" };
    const sera = talkCrew(crew, "sera");
    assert.equal(sera.ok, true);
    if (!sera.ok) return;
    assert.match(sera.text, /bearing/);
    assert.match(sera.text, /splice/);
    assert.deepEqual(sera.save.party, ["wanderer"]);
    assert.deepEqual(sera.save.reserve, ["sera", "kael", "mira"]);
    assert.equal(sera.save.equipment.kael?.weapon, "weapon.festival_knife");
    const kael = talkCrew(sera.save, "kael");
    assert.equal(kael.ok, true);
    if (!kael.ok) return;
    assert.match(kael.text, /Pell/);
    assert.equal(kael.save.party.includes("kael"), false);
    const mira = talkCrew(kael.save, "mira");
    assert.equal(mira.ok, true);
    if (!mira.ok) return;
    assert.match(mira.text, /blank/);
    let veiled = structuredClone(crew);
    veiled.flags["flag.iri_veil"] = true;
    delete veiled.flags["flag.iri_joined"];
    const thread = talkCrew(veiled, "veil");
    assert.equal(thread.ok, true);
    if (!thread.ok) return;
    assert.equal(thread.save.flags["flag.beacon_veil_heard"], true);
    assert.equal(thread.save.flags["flag.iri_joined"], undefined);
    assert.equal(thread.save.party.includes("iri"), false);

    for (const schema of [1, 2, 3, 4]) {
      const raw = JSON.parse(serialize(twice)) as Record<string, unknown>;
      raw.schema = schema;
      const back = deserialize(JSON.stringify(raw));
      assert.equal(back.schema, 4);
      assert.equal(back.flags["flag.beacon_done"], true);
      assert.equal(back.flags["flag.dragoon_oath"], true);
      assert.equal(back.flags["flag.cinder_send"], true);
      assert.equal(back.quests.filter((q) => q.id === "quest.beacon").length, 1);
      assert.equal(JOB_KITS.find((j) => j.id === "job.dragoon")?.playable, false);
    }

    assert.equal(MAPS["map.sky"], undefined);
    assert.equal(ATLAS.find((p) => p.id === "map.sky")?.locked, true);
    assert.equal(canTravel(twice, "map.sky"), false);
    assert.equal(canTravel(twice, "map.beacon"), false);
    const blob = JSON.stringify({ OPEN_COPY, beacon: MAPS["map.beacon"], cinder: MAPS["map.cinder"] }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });
});
