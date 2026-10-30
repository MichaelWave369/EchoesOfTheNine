import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, proposeAction } from "./combat.ts";
import type { CombatAction, SaveGame } from "../contracts.ts";
import { deserialize, freshSave, recruit, serialize, setFlag } from "../chronicle/save.ts";
import { chooseCompanion } from "../content/expanses.ts";
import { makeCombatant } from "../content/characters.ts";
import { switchJob, companionInstinct } from "../content/crossing.ts";
import {
  HOURS_COPY,
  beginHoursSight,
  chooseOath,
  chooseSpring,
  chooseThread,
  hoursObjective,
  meetLark,
  noteLowbellSpring,
  noteMotherStone,
  noteOathPath,
  noteOathVale,
  readSeam,
  setSeam,
  setSpringOrder,
} from "../content/hours.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { useSight } from "../content/gear.ts";

function act(partial: Omit<CombatAction, "version" | "modeOrigin" | "timeOrTurn">): CombatAction {
  return { version: 1, modeOrigin: "legacy", timeOrTurn: 0, ...partial };
}

function withFlight(save: SaveGame, who: "kael" | "nessa", value: "law" | "people" | "spring" | "verse"): SaveGame {
  const joined = save.party.includes(who) ? save : recruit(save, who);
  const chosen = chooseCompanion(joined, who, value);
  if (!chosen) throw new Error("choice");
  return setFlag(chosen, "flag.flown");
}

function bothOrders(save: SaveGame): SaveGame {
  const path = noteOathPath(save);
  if (!path.ok) throw new Error(path.reason);
  const vale = noteOathVale(path.save);
  if (!vale.ok) throw new Error(vale.reason);
  return vale.save;
}

function springReady(save: SaveGame): SaveGame {
  const stone = noteMotherStone(save);
  if (!stone.ok) throw new Error(stone.reason);
  const low = noteLowbellSpring(stone.save);
  if (!low.ok) throw new Error(low.reason);
  const lark = meetLark(low.save);
  if (!lark.ok) throw new Error(lark.reason);
  let next = lark.save;
  next.mode = "legacy";
  const dry = setSpringOrder(next, "dry");
  if (!dry.ok) throw new Error(dry.reason);
  dry.save.mode = "ascension";
  const wet = setSpringOrder(dry.save, "wet");
  if (!wet.ok) throw new Error(wet.reason);
  return wet.save;
}

describe("the hours we keep", () => {
  it("lets both of Pell's outcomes answer either way, once, without sanding the first oath", () => {
    for (const first of ["law", "people"] as const) {
      for (const next of ["hold", "serve"] as const) {
        const save = bothOrders(withFlight(freshSave("Ash"), "kael", first));
        const chosen = chooseOath(save, next);
        assert.equal(chosen.ok, true);
        if (!chosen.ok) return;
        assert.equal(chosen.save.flags[first === "law" ? "flag.kael_law" : "flag.kael_people"], true);
        assert.equal(chosen.save.flags["flag.oath_done"], true);
        assert.equal(chosen.save.choiceLog.filter((c) => c.id === "choice.kael").length, 1);
        const spell = next === "hold" ? "spell.oathgate" : "spell.namedguard";
        const other = next === "hold" ? "spell.namedguard" : "spell.oathgate";
        assert.ok(chosen.save.knownSpells.kael?.includes(spell));
        assert.equal(chosen.save.knownSpells.kael?.includes(other), false);
        assert.equal(chosen.save.knownSpells.wanderer?.includes(spell), false);
        assert.equal(chosen.save.earnedSpells.includes(spell), false);
        const item = next === "hold" ? "item.oath_cord" : "item.walk_token";
        assert.equal(chosen.save.inventory.filter((s) => s.itemId === item).length, 1);
        assert.equal(
          chosen.text,
          next === "hold"
            ? first === "law"
              ? HOURS_COPY.oathHoldLaw
              : HOURS_COPY.oathHoldPeople
            : first === "law"
              ? HOURS_COPY.oathServeLaw
              : HOURS_COPY.oathServePeople,
        );
        const again = chooseOath(chosen.save, next === "hold" ? "serve" : "hold");
        assert.equal(again.ok, true);
        if (!again.ok) return;
        assert.equal(again.save.inventory.filter((s) => s.itemId === item).length, 1);
        assert.equal(again.save.flags[next === "hold" ? "flag.oath_served" : "flag.oath_held"], undefined);
      }
    }
    const early = chooseOath(freshSave("Ash"), "hold");
    assert.equal(early.ok, false);
  });

  it("keeps a benched Kael and does not block the road", () => {
    let save = bothOrders(withFlight(freshSave("Ash"), "kael", "people"));
    save.party = save.party.filter((id) => id !== "kael");
    save.reserve = ["kael"];
    const gear = save.equipment.kael?.weapon;
    const chosen = chooseOath(save, "serve");
    assert.equal(chosen.ok, true);
    if (!chosen.ok) return;
    assert.deepEqual(chosen.save.reserve, ["kael"]);
    assert.equal(chosen.save.party.includes("kael"), false);
    assert.equal(chosen.save.equipment.kael?.weapon, gear);
    assert.equal(chosen.save.flags["flag.margin_dock"], undefined);
    assert.equal(chosen.save.flags["flag.chapter_complete"], undefined);
    assert.equal(MAPS["map.sky"], undefined);
  });

  it("lets both rhyme choices finish either spring, and sight does not press the channel", () => {
    for (const first of ["spring", "verse"] as const) {
      for (const next of ["carry", "channel"] as const) {
        let save = springReady(withFlight(freshSave("Ash"), "nessa", first));
        const spared = first === "spring";
        if (spared) save = setFlag(save, "flag.warden_spared");
        else save = setFlag(save, "flag.warden_defeated");
        const chosen = chooseSpring(save, next);
        assert.equal(chosen.ok, true, first + next);
        if (!chosen.ok) return;
        assert.equal(chosen.save.flags[first === "spring" ? "flag.nessa_spring" : "flag.nessa_verse"], true);
        assert.ok(chosen.save.knownSpells.nessa?.includes("spell.springmemory"));
        assert.equal(chosen.save.knownSpells.wanderer?.includes("spell.springmemory"), false);
        const item = next === "carry" ? "item.mother_dew" : "item.verse_pebble";
        assert.equal(chosen.save.inventory.filter((s) => s.itemId === item).length, 1);
        const again = chooseSpring(chosen.save, next === "carry" ? "channel" : "carry");
        assert.equal(again.ok, true);
        if (!again.ok) return;
        assert.equal(again.save.inventory.filter((s) => s.itemId === item).length, 1);
      }
    }
    let looking = withFlight(freshSave("Ash"), "nessa", "verse");
    looking.mapId = "map.lowbell";
    looking.sightCharges = 2;
    looking = setFlag(looking, "flag.temporal_sight");
    const seen = useSight(looking);
    assert.equal(seen.ok, true);
    if (!seen.ok) return;
    assert.equal(seen.save.flags["flag.sight_spring_low"], true);
    assert.equal(seen.save.flags["flag.spring_dry"], undefined);
    assert.equal(seen.save.flags["flag.spring_wet"], undefined);
    assert.equal(seen.save.flags["flag.spring_lowbell"], undefined);
    assert.equal(seen.text.includes("moss, then stone"), false);
    const wrong = setSpringOrder({ ...springReady(withFlight(freshSave("Ash"), "nessa", "spring")), mode: "legacy" }, "wet");
    assert.equal(wrong.ok, false);
  });

  it("sets the mouth from both views and does not require Iri", () => {
    let save = withFlight(freshSave("Ash"), "kael", "law");
    save = recruit(save, "nessa");
    const nessa = chooseCompanion(save, "nessa", "verse");
    if (!nessa) throw new Error("nessa");
    save = springReady(bothOrders(nessa));
    const held = chooseOath(save, "hold");
    if (!held.ok) throw new Error(held.reason);
    const channeled = chooseSpring(held.save, "channel");
    if (!channeled.ok) throw new Error(channeled.reason);
    save = channeled.save;
    save.mode = "legacy";
    const legacy = readSeam(save, "legacy");
    assert.equal(legacy.ok, true);
    if (!legacy.ok) return;
    assert.match(legacy.text, /words that stayed/);
    save = legacy.save;
    save.mode = "ascension";
    const ascent = readSeam(save, "ascension");
    assert.equal(ascent.ok, true);
    if (!ascent.ok) return;
    assert.match(ascent.text, /channel given/);
    const tooSoon = setSeam(legacy.save);
    assert.equal(tooSoon.ok, false);
    const set = setSeam(ascent.save);
    assert.equal(set.ok, true);
    if (!set.ok) return;
    assert.equal(set.save.flags["flag.seam_set"], true);
    assert.equal(set.save.inventory.filter((s) => s.itemId === "item.seam_bead").length, 1);
    assert.equal(set.save.party.includes("iri"), false);
    assert.equal(set.save.flags["flag.iri_joined"], undefined);
    const twice = setSeam(set.save);
    assert.equal(twice.ok, true);
    if (!twice.ok) return;
    assert.equal(twice.save.inventory.filter((s) => s.itemId === "item.seam_bead").length, 1);
    let watched = ascent.save;
    watched.mapId = "map.lowbell";
    watched.flags["flag.sight_seam"] = false;
    const sight = beginHoursSight(watched);
    assert.ok(sight);
    assert.equal(sight?.save.flags["flag.seam_set"], undefined);
    assert.equal(sight?.save.flags["flag.seam_legacy"], true);
    assert.equal(hoursObjective(set.save), null);
  });

  it("teaches Veilstep only to Iri, and the veil does not recruit her", () => {
    let joined = withFlight(freshSave("Ash"), "kael", "people");
    joined = setFlag(joined, "flag.iri_joined");
    joined = setFlag(joined, "flag.hour_complete");
    joined.roster.iri = makeCombatant("iri", { position: { x: 1, z: 1 } });
    joined.knownSpells.iri = ["spell.seam"];
    joined.party = ["wanderer", "kael", "iri"];
    joined = bothOrders(joined);
    const oath = chooseOath(joined, "serve");
    if (!oath.ok) throw new Error(oath.reason);
    const heard = chooseThread(oath.save, "iri_kael", "heard");
    assert.equal(heard.ok, true);
    if (!heard.ok) return;
    assert.ok(heard.save.knownSpells.iri?.includes("spell.veilstep"));
    assert.equal(heard.save.knownSpells.iri?.filter((id) => id === "spell.veilstep").length, 1);
    assert.equal(heard.save.knownSpells.wanderer?.includes("spell.veilstep"), false);
    assert.equal(switchJob(heard.save, "job.veilwalker").ok, false);
    const again = chooseThread(heard.save, "iri_you", "heard");
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.save.knownSpells.iri?.filter((id) => id === "spell.veilstep").length, 1);

    let veiled = freshSave("Ash");
    veiled = setFlag(veiled, "flag.flown");
    veiled = setFlag(veiled, "flag.iri_veil");
    veiled.choiceLog.push({ id: "choice.iri", value: "veil" });
    const listen = chooseThread(veiled, "iri_you", "heard");
    assert.equal(listen.ok, true);
    if (!listen.ok) return;
    assert.equal(listen.save.flags["flag.veilstep_sheathed"], true);
    assert.equal(listen.save.flags["flag.iri_joined"], undefined);
    assert.equal(listen.save.party.includes("iri"), false);
    assert.equal(listen.save.reserve.includes("iri"), false);
    assert.equal(listen.save.roster.iri, undefined);
    assert.equal(listen.save.knownSpells.wanderer?.includes("spell.veilstep"), false);
    assert.match(listen.text, /not yours/);
  });

  it("resolves the new arts in the shared combat core", () => {
    const kael = makeCombatant("kael", { position: { x: -1, z: 1 } });
    const nessa = makeCombatant("nessa", { position: { x: 0, z: 1.2 } });
    const iri = makeCombatant("iri", { position: { x: 1, z: 1 } });
    kael.knownAbilities = ["spell.oathgate", "spell.namedguard", "atk.oathcut"];
    nessa.knownAbilities = ["spell.springmemory", "spell.shear"];
    iri.knownAbilities = ["spell.veilstep", "spell.seam"];
    kael.mp = 40;
    nessa.mp = 40;
    iri.mp = 40;
    const foe = makeCombatant("wanderer", { position: { x: 0, z: -1 } });
    foe.id = "shade";
    foe.side = "enemy";
    foe.name = "Shade";
    foe.hp = 40;
    foe.maxHp = 40;
    let state = createEncounter({ encounterId: "enc.woods", seed: 4, party: [kael, nessa, iri], enemies: [foe] });
    state.activeActorId = "kael";
    state.phase = "player";
    const gate = proposeAction(state, act({ actorId: "kael", abilityId: "spell.oathgate", kind: "cast", targetIds: ["kael"] }));
    assert.equal(gate.ok, true);
    if (!gate.ok) return;
    assert.ok(gate.state.combatants.find((c) => c.id === "kael")?.statuses.some((s) => s.id === "stoneguard"));
    state = gate.state;
    state.activeActorId = "kael";
    state.phase = "player";
    const named = proposeAction(state, act({ actorId: "kael", abilityId: "spell.namedguard", kind: "cast", targetIds: ["nessa"] }));
    assert.equal(named.ok, true);
    if (!named.ok) return;
    const ward = named.state.combatants.find((c) => c.id === "nessa");
    assert.ok(ward?.statuses.some((s) => s.id === "stoneguard"));
    assert.ok((ward?.hp ?? 0) > nessa.hp - 1);
    state = named.state;
    state.activeActorId = "nessa";
    state.phase = "player";
    const beforeHp = state.combatants.find((c) => c.id === "kael")!;
    beforeHp.hp = Math.max(1, Math.floor(beforeHp.maxHp * 0.3));
    const hurtMark = beforeHp.hp;
    const hint = companionInstinct(state, "nessa");
    assert.equal(hint?.abilityId, "spell.springmemory");
    const spring = proposeAction(state, act({ actorId: "nessa", abilityId: "spell.springmemory", kind: "cast", targetIds: ["kael"] }));
    assert.equal(spring.ok, true);
    if (!spring.ok) return;
    const mended = spring.state.combatants.find((c) => c.id === "kael");
    assert.ok((mended?.hp ?? 0) > hurtMark);
    assert.ok(mended?.statuses.some((s) => s.id === "tideveil"));
    state = spring.state;
    state.activeActorId = "iri";
    state.phase = "player";
    const step = proposeAction(state, act({ actorId: "iri", abilityId: "spell.veilstep", kind: "cast", targetIds: ["kael"] }));
    assert.equal(step.ok, true);
    if (!step.ok) return;
    assert.ok(step.state.combatants.find((c) => c.id === "kael")?.statuses.some((s) => s.id === "evading"));
    const hero = step.state.combatants.find((c) => c.id === "wanderer");
    assert.equal(hero, undefined);
    const denied = proposeAction(step.state, act({ actorId: "kael", abilityId: "spell.veilstep", kind: "cast", targetIds: ["kael"] }));
    assert.equal(denied.ok, false);
  });

  it("migrates schema 1 through 4 and keeps the new hours on the chronicle", () => {
    for (const schema of [1, 2, 3, 4]) {
      let base = withFlight(freshSave("Ash"), "kael", "law");
      base = recruit(base, "nessa");
      const nessa = chooseCompanion(base, "nessa", "verse");
      if (!nessa) throw new Error("nessa");
      const raw = JSON.parse(serialize(setFlag(nessa, "flag.warden_defeated"))) as Record<string, unknown>;
      raw.schema = schema;
      if (schema < 4) {
        delete raw.reserve;
        delete raw.formation;
        delete raw.appearance;
      }
      const back = deserialize(JSON.stringify(raw));
      assert.equal(back.schema, 4);
      assert.equal(back.wardenOutcome, "defeated");
      assert.equal(back.quests.find((q) => q.id === "quest.oath")?.status, "active");
      assert.equal(back.quests.find((q) => q.id === "quest.spring")?.status, "active");
      assert.equal(back.quests.filter((q) => q.id === "quest.oath").length, 1);
      const done = chooseOath(bothOrders(back), "hold");
      assert.equal(done.ok, true);
      if (!done.ok) return;
      const round = deserialize(serialize(done.save));
      assert.equal(round.flags["flag.oath_held"], true);
      assert.ok(round.knownSpells.kael?.includes("spell.oathgate"));
      assert.equal(round.inventory.filter((s) => s.itemId === "item.oath_cord").length, 1);
    }
    const blob = JSON.stringify({ HOURS_COPY, woods: MAPS["map.woods"], low: MAPS["map.lowbell"] }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });
});
