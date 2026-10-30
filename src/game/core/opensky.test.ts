import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyReward, deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";
import { ENEMY_TEMPLATES, makeCombatant } from "../content/characters.ts";
import { ATLAS, canTravel, JOB_KITS } from "../content/expanses.ts";
import { useSight } from "../content/gear.ts";
import {
  OPEN_COPY,
  SKY_DOCKS,
  beginOpenSkySight,
  canLand,
  chooseHeading,
  chooseSignal,
  headingBlock,
  landAt,
  launchSky,
  noteSky,
  pinBearing,
  returnDock,
  setCinderOrder,
  skyCell,
  stepSky,
  takeCache,
  talkCrew,
} from "../content/opensky.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { createEncounter, proposeAction, resolveEnemyTurn } from "./combat.ts";
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
    const stair = setCinderOrder(signal.save, ["salt", "ash", "ember"]);
    assert.equal(stair.ok, false);
    const openStair = setCinderOrder(signal.save, ["ash", "salt", "ember"]);
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
});
