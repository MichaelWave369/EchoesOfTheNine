import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { ENEMY_TEMPLATES, makeCombatant } from "../content/characters.ts";
import { ATLAS } from "../content/expanses.ts";
import { HOUR_COPY, beginHourSight, chooseIri, chooseMiraHour, chooseSeraHour, compareHours, keepValeHours, meetIri, openUnwritten, readMargin, recordHullPage, takeHourGlint, traceHourEcho, tryHourDoor, writeLowbellMargin, writeMistWindow } from "../content/unwritten.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import { flyTo } from "../content/skyweave.ts";
import { deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";

function flown(): ReturnType<typeof freshSave> {
  let save = setFlag(freshSave("Ash"), "flag.skiff_ready");
  save = setFlag(save, "flag.flown");
  save = setFlag(save, "flag.clock_anomaly");
  save = setFlag(save, "flag.bell_solved");
  save = setFlag(save, "flag.ferry_complete");
  save = setFlag(save, "flag.twice_departed");
  save.mapId = "map.berth";
  save.gold = 17;
  return save;
}

function hourFoe(hp: number, phase = 1) {
  return {
    ...structuredClone(ENEMY_TEMPLATES.hourkeeper),
    id: "hour",
    hp,
    phase,
    position: { x: 0, z: -1.4 },
  };
}

describe("the unwritten hour", () => {
  it("stays shut until the first flight, then remembers four places", () => {
    const early = openUnwritten(freshSave("Ash"));
    assert.equal(early.ok, false);
    assert.equal(keepValeHours(setFlag(freshSave("Ash"), "flag.clock_anomaly"), "both").ok, false);
    let save = flown();
    const opened = openUnwritten(save);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.save.flags["flag.unwritten_open"], true);
    assert.equal(opened.save.flags["flag.hull_shadow"], true);
    assert.equal(opened.save.flags["flag.clue_ridge"], undefined);
    assert.equal(opened.save.flags["flag.margin_dock"], undefined);
    const again = openUnwritten(opened.save);
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.save.flags["flag.clue_ridge"], true);
    assert.equal(again.save.flags["flag.margin_dock"], undefined);
    const vale = keepValeHours(again.save, "both");
    assert.equal(vale.ok, true);
    if (!vale.ok) return;
    assert.equal(vale.save.flags["flag.hour_both"], true);
    assert.equal(vale.save.flags["flag.clue_vale"], true);
    assert.equal(keepValeHours(vale.save, "nine").ok, true);
    if (keepValeHours(vale.save, "nine").ok) {
      const second = keepValeHours(vale.save, "nine");
      if (second.ok) assert.equal(second.save.flags["flag.hour_nine"], undefined);
    }
    const bell = writeLowbellMargin(vale.save);
    assert.equal(bell.ok, true);
    if (!bell.ok) return;
    const mist = writeMistWindow(bell.save);
    assert.equal(mist.ok, true);
    if (!mist.ok) return;
    assert.equal(mist.save.flags["flag.margin_dock"], true);
    assert.equal(mist.save.flags["flag.warden_spared"], undefined);
    assert.ok(mist.text.includes("third pad") || mist.save.journal.some((line) => line.includes("third pad")));
    assert.equal(flyTo(vale.save, "dock.margin").ok, false);
    const gone = flyTo(mist.save, "dock.margin");
    assert.equal(gone.ok, true);
    if (!gone.ok) return;
    assert.equal(gone.save.mapId, "map.margin");
    assert.equal(gone.save.spawnId, "pad");
    assert.equal(gone.save.gold, 17);
    const back = flyTo(gone.save, "dock.vale");
    assert.equal(back.ok, true);
    if (!back.ok) return;
    assert.equal(back.save.mapId, "map.vale");
    const sky = ATLAS.find((p) => p.id === "map.sky");
    assert.equal(sky?.locked, true);
    assert.equal(MAPS["map.sky"], undefined);
  });

  it("lets a spared warden and a fallen warden change the window without erasing the flight", () => {
    let spared = setFlag(flown(), "flag.warden_spared");
    spared.wardenOutcome = "spared";
    spared = openUnwritten(spared).ok ? openUnwritten(spared).ok ? (openUnwritten(setFlag(flown(), "flag.warden_spared")) as { ok: true; save: typeof spared }).save : spared : spared;
    const opened = openUnwritten(setFlag(flown(), "flag.warden_spared"));
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    opened.save.wardenOutcome = "spared";
    const kind = writeMistWindow(opened.save);
    assert.equal(kind.ok, true);
    if (!kind.ok) return;
    assert.match(kind.text, /courtesy/);
    assert.equal(kind.save.flags["flag.warden_spared"], true);
    const fell = openUnwritten(setFlag(flown(), "flag.warden_defeated"));
    assert.equal(fell.ok, true);
    if (!fell.ok) return;
    fell.save.wardenOutcome = "defeated";
    const hot = writeMistWindow(fell.save);
    assert.equal(hot.ok, true);
    if (!hot.ok) return;
    assert.match(hot.text, /heat/);
    assert.equal(hot.save.flags["flag.ferry_complete"], true);
  });

  it("does not let Sight press the Margin, the bell, or the Vale book", () => {
    let save = openUnwritten(flown());
    assert.equal(save.ok, true);
    if (!save.ok) return;
    save.save.mapId = "map.margin";
    save.save.flags["flag.margin_dock"] = true;
    const seen = beginHourSight(save.save);
    assert.ok(seen);
    if (!seen) return;
    assert.equal(seen.save.flags["flag.sight_margin"], true);
    assert.equal(seen.save.flags["flag.margin_page"], undefined);
    assert.equal(seen.save.flags["flag.margin_echo"], undefined);
    assert.equal(seen.save.flags["flag.clue_vale"], undefined);
    assert.equal(seen.save.flags["flag.bell_solved"], true);
    assert.equal(seen.save.sightSteps, 8);
    const compared = compareHours(seen.save);
    assert.equal(compared.ok, true);
    if (!compared.ok) return;
    assert.equal(compared.save.flags["flag.margin_page"], undefined);
    assert.equal(compared.save.flags["flag.hour_glint"], undefined);
    const traced = traceHourEcho(compared.save);
    assert.equal(traced.ok, true);
    if (!traced.ok) return;
    assert.equal(traced.save.flags["flag.hour_glint"], true);
    assert.equal(traced.save.flags["flag.margin_page"], undefined);
    assert.equal(traced.save.flags["flag.got_hour_glint"], undefined);
    const pocket = takeHourGlint(traced.save);
    assert.equal(pocket.ok, true);
    if (!pocket.ok) return;
    assert.equal(pocket.save.inventory.filter((i) => i.itemId === "item.hour_glint").length, 1);
    assert.equal(takeHourGlint(pocket.save).ok, false);
    assert.equal(compareHours({ ...pocket.save, sightSteps: 0 }).ok, false);
    assert.equal(tryHourDoor(pocket.save).ok, false);
    const wrong = readMargin({ ...pocket.save, mode: "ascension" }, "page");
    assert.equal(wrong.ok, false);
    const legacy = readMargin({ ...pocket.save, mode: "legacy" }, "page");
    assert.equal(legacy.ok, true);
    if (!legacy.ok) return;
    assert.equal(tryHourDoor(legacy.save).ok, false);
    const echo = readMargin({ ...legacy.save, mode: "ascension" }, "echo");
    assert.equal(echo.ok, true);
    if (!echo.ok) return;
    assert.equal(tryHourDoor(echo.save).ok, true);
    const vale = beginHourSight({ ...echo.save, mapId: "map.vale" });
    assert.ok(vale);
    if (!vale) return;
    assert.equal(vale.save.flags["flag.sight_hour_vale"], true);
    assert.equal(vale.save.flags["flag.clue_vale"], undefined);
  });

  it("pays the Hourkeeper once, and mercy remembers the Warden or the kept contradiction", () => {
    const hero = makeCombatant("wanderer", { name: "Ash", position: { x: 0, z: 1.2 } });
    const closed = tryMercy(
      createEncounter({ encounterId: "enc.hourkeeper", seed: 3, party: [hero], enemies: [hourFoe(80)] }),
      {},
    );
    assert.equal(closed.ok, false);
    const spared = tryMercy(
      createEncounter({ encounterId: "enc.hourkeeper", seed: 4, party: [hero], enemies: [hourFoe(80)] }),
      { wardenSpared: true },
    );
    assert.equal(spared.ok, true);
    if (!spared.ok) return;
    assert.equal(spared.state.pendingReward?.id, "reward.hour.mercy");
    assert.equal(spared.state.pendingReward?.items[0]?.itemId, "accessory.blank_thread");
    assert.ok(spared.state.pendingReward?.flags.includes("flag.hour_spared"));
    assert.ok(spared.state.pendingReward?.flags.includes("flag.hour_complete"));
    assert.equal(spared.state.pendingReward?.flags.includes("flag.hour_ended"), false);
    const loud = tryMercy(
      createEncounter({ encounterId: "enc.hourkeeper", seed: 5, party: [hero], enemies: [hourFoe(80)] }),
      { hourAsked: true },
    );
    assert.equal(loud.ok, true);
    const early = tryMercy(
      createEncounter({ encounterId: "enc.hourkeeper", seed: 6, party: [hero], enemies: [hourFoe(200)] }),
      { hourAsked: true, wardenSpared: true },
    );
    assert.equal(early.ok, false);
    const rival = tryMercy(
      createEncounter({
        encounterId: "enc.hourkeeper",
        seed: 7,
        party: [hero],
        enemies: [hourFoe(80)],
        rewardsAlready: ["reward.hour.defeat"],
      }),
      { hourAsked: true },
    );
    assert.equal(rival.ok, true);
    if (!rival.ok) return;
    assert.equal(rival.state.pendingReward, null);
    const brittle = createEncounter({
      encounterId: "enc.hourkeeper",
      seed: 8,
      party: [hero],
      enemies: [{ ...hourFoe(1), speed: 1 }],
    });
    const killed = proposeAction(brittle, {
      version: 1,
      actorId: "wanderer",
      abilityId: "atk.strike",
      kind: "attack",
      targetIds: ["hour"],
      modeOrigin: "legacy",
      timeOrTurn: brittle.turnIndex,
    });
    assert.equal(killed.ok, true);
    if (!killed.ok) return;
    assert.equal(killed.state.outcome === "victory" || killed.state.pendingReward?.id === "reward.hour.defeat", true);
    if (killed.state.pendingReward) {
      assert.equal(killed.state.pendingReward.id, "reward.hour.defeat");
      assert.equal(killed.state.pendingReward.items[0]?.itemId, "accessory.hour_thread");
      assert.equal(killed.state.pendingReward.items.some((i) => i.itemId === "accessory.blank_thread"), false);
    }
    const folded = createEncounter({
      encounterId: "enc.hourkeeper",
      seed: 9,
      party: [hero, makeCombatant("mira", { position: { x: 1, z: 1.2 } })],
      enemies: [{ ...hourFoe(210), phase: 2, speed: 40 }],
    });
    assert.equal(folded.intents[0]?.abilityId, "enemy.folded_hour");
    assert.ok(folded.intents[0]?.targetIds.includes("wanderer"));
    assert.ok(folded.intents[0]?.targetIds.includes("mira"));
    const before = folded.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    const resolved = resolveEnemyTurn(folded);
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    const after = resolved.state.combatants.filter((c) => c.side === "party").map((c) => c.hp);
    assert.ok(after.every((hp, i) => hp < before[i]!));
    const ink = createEncounter({
      encounterId: "enc.ink",
      seed: 2,
      party: [hero],
      enemies: [{ ...structuredClone(ENEMY_TEMPLATES.inkling), id: "ink", position: { x: 0, z: -1 } }],
    });
    assert.equal(ink.intents[0]?.abilityId, "enemy.ink_script");
  });

  it("introduces Iri without copying a pack, and keeps the veil a real ending", () => {
    let save = setFlag(flown(), "flag.hour_complete");
    const early = chooseIri(flown(), "walk");
    assert.equal(early.ok, false);
    const met = meetIri(setFlag(save, "flag.margin_dock"));
    assert.equal(met.ok, true);
    if (!met.ok) return;
    assert.equal(met.save.flags["flag.iri_met"], true);
    assert.equal(met.save.roster.iri, undefined);
    const before = save.inventory.length;
    const walked = chooseIri(save, "walk");
    assert.equal(walked.ok, true);
    if (!walked.ok) return;
    assert.equal(walked.save.flags["flag.iri_joined"], true);
    assert.ok(walked.save.party.includes("iri") || walked.save.reserve.includes("iri"));
    assert.equal(walked.save.inventory.length, before);
    assert.ok(walked.save.knownSpells.iri?.includes("spell.seam"));
    assert.equal(walked.save.knownSpells.wanderer?.includes("spell.seam"), false);
    assert.equal(walked.save.roster.wanderer?.jobId === "job.veilwalker", false);
    const twice = chooseIri(walked.save, "veil");
    assert.equal(twice.ok, true);
    if (!twice.ok) return;
    assert.equal(twice.save.flags["flag.iri_veil"], undefined);
    assert.equal(twice.save.party.filter((id) => id === "iri").length + twice.save.reserve.filter((id) => id === "iri").length, 1);
    let full = setFlag(flown(), "flag.hour_complete");
    full.party = ["wanderer", "mira", "kael", "nessa"];
    full.roster.mira = makeCombatant("mira", { position: { x: 0, z: 1 } });
    full.roster.kael = makeCombatant("kael", { position: { x: 1, z: 1 } });
    full.roster.nessa = makeCombatant("nessa", { position: { x: -1, z: 1 } });
    const benched = chooseIri(full, "walk");
    assert.equal(benched.ok, true);
    if (!benched.ok) return;
    assert.equal(benched.save.party.includes("iri"), false);
    assert.ok(benched.save.reserve.includes("iri"));
    assert.equal(benched.save.party.length, 4);
    const veil = chooseIri(setFlag(flown(), "flag.hour_complete"), "veil");
    assert.equal(veil.ok, true);
    if (!veil.ok) return;
    assert.equal(veil.save.flags["flag.iri_veil"], true);
    assert.equal(veil.save.flags["flag.iri_joined"], undefined);
    assert.equal(veil.save.roster.iri, undefined);
    assert.equal(veil.save.party.includes("iri"), false);
    assert.ok(veil.save.choiceLog.some((c) => c.id === "choice.iri" && c.value === "veil"));
  });

  it("lets Mira and Sera answer without sanding the first choice", () => {
    let save = openUnwritten(flown());
    assert.equal(save.ok, true);
    if (!save.ok) return;
    save.save.party = ["wanderer", "mira", "sera"];
    save.save.roster.mira = makeCombatant("mira", { position: { x: 0, z: 1 } });
    save.save.roster.sera = makeCombatant("sera", { position: { x: 1, z: 1 } });
    save.save.flags["flag.mira_record"] = true;
    save.save.flags["flag.sera_splice"] = true;
    save.save.choiceLog.push({ id: "choice.mira", value: "record" });
    save.save.flags["flag.sera_joined"] = true;
    const beside = chooseMiraHour(save.save, "beside");
    assert.equal(beside.ok, true);
    if (!beside.ok) return;
    assert.equal(beside.save.flags["flag.mira_record"], true);
    assert.equal(beside.save.flags["flag.mira_hour_beside"], true);
    assert.equal(beside.save.inventory.filter((i) => i.itemId === "accessory.beside_clasp").length, 1);
    assert.equal(beside.save.inventory.some((i) => i.itemId === "accessory.margin_clasp"), false);
    const again = chooseMiraHour(beside.save, "close");
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.save.inventory.filter((i) => i.itemId === "accessory.beside_clasp").length, 1);
    assert.equal(again.save.flags["flag.mira_hour_closed"], undefined);
    let blank = structuredClone(save.save);
    blank.flags["flag.mira_record"] = false;
    blank.flags["flag.mira_blank"] = true;
    blank.choiceLog = [{ id: "choice.mira", value: "blank" }];
    const quiet = chooseMiraHour(blank, "quiet");
    assert.equal(quiet.ok, true);
    if (!quiet.ok) return;
    assert.equal(quiet.save.flags["flag.mira_blank"], true);
    assert.equal(quiet.save.inventory.some((i) => i.itemId === "accessory.quiet_clasp"), true);
    const cut = chooseSeraHour(save.save, "cut");
    assert.equal(cut.ok, true);
    if (!cut.ok) return;
    assert.equal(cut.save.flags["flag.sera_splice"], true);
    assert.equal(cut.save.flags["flag.sera_hour_cut"], true);
    assert.equal(cut.save.inventory.filter((i) => i.itemId === "accessory.early_lash").length, 1);
    const stay = structuredClone(save.save);
    stay.flags["flag.sera_splice"] = false;
    stay.flags["flag.sera_stay"] = true;
    const lashed = chooseSeraHour(stay, "lash");
    assert.equal(lashed.ok, true);
    if (!lashed.ok) return;
    assert.equal(lashed.save.flags["flag.sera_stay"], true);
    assert.equal(lashed.save.inventory.some((i) => i.itemId === "accessory.second_stay"), true);
    assert.equal(lashed.save.flags["flag.margin_dock"], undefined);
  });

  it("migrates an older chronicle without dropping the Warden, the rig, or the new quests", () => {
    const raw = JSON.parse(serialize(freshSave("Ash"))) as Record<string, unknown>;
    raw.schema = 3;
    raw.appearance = "festival";
    raw.wardenOutcome = "spared";
    raw.flags = { "flag.warden_spared": true, "flag.skiff_ready": true, "flag.flown": true };
    raw.party = ["wanderer", "mira", "kael", "nessa", "sera"];
    raw.equipment = { wanderer: { weapon: "weapon.festival_knife" } };
    delete raw.reserve;
    delete raw.formation;
    delete (raw as { settings?: unknown }).settings;
    const quests = raw.quests as { id: string }[];
    raw.quests = quests.filter((q) => q.id !== "quest.unwritten");
    const back = deserialize(JSON.stringify(raw));
    assert.equal(back.schema, 4);
    assert.equal(back.appearance, "festival");
    assert.equal(back.wardenOutcome, "spared");
    assert.equal(back.flags["flag.warden_spared"], true);
    assert.equal(back.flags["flag.flown"], true);
    assert.equal(back.equipment.wanderer?.weapon, "weapon.festival_knife");
    assert.equal(back.party.length, 4);
    assert.deepEqual(back.reserve, ["sera"]);
    assert.equal(back.settings.motionDetail, "full");
    assert.equal(back.quests.find((q) => q.id === "quest.unwritten")?.status, "active");
    assert.equal(back.quests.filter((q) => q.id === "quest.unwritten").length, 1);
    assert.equal(back.roster.iri, undefined);
    const joined = JSON.parse(serialize(back)) as Record<string, unknown>;
    const flags = joined.flags as Record<string, boolean>;
    flags["flag.iri_joined"] = true;
    flags["flag.hour_complete"] = true;
    const restored = deserialize(JSON.stringify(joined));
    assert.ok(restored.roster.iri);
    assert.equal(restored.knownSpells.iri?.includes("spell.seam"), true);
    assert.equal(restored.party.filter((id) => id === "iri").length + restored.reserve.filter((id) => id === "iri").length, 1);
    const blob = JSON.stringify({ HOUR_COPY, margin: MAPS["map.margin"] }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
    assert.equal(recordHullPage(freshSave("Ash")).ok, false);
  });
});
