import type { SaveGame } from "../contracts.ts";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { ENEMY_TEMPLATES } from "../content/characters.ts";
import { applyReward, freshSave, recruit, setFlag } from "../chronicle/save.ts";
import type { CombatAction } from "../contracts.ts";

/** Drives a full chapter with button-equivalent actions. Used as a regression playthrough. */
export function scriptedCrystalAwakening(name = "Ash"): { save: SaveGame; log: string[] } {
  const log: string[] = [];
  let save = freshSave(name);
  save = setFlag(save, "flag.spoke_lira");
  save = setFlag(save, "flag.saw_sketch");
  save = setFlag(save, "flag.clock_anomaly");
  save = setFlag(save, "flag.mira_joined");
  save = recruit(save, "mira");
  log.push("party:" + save.party.join(","));

  const festival = createEncounter({
    encounterId: "enc.festival",
    seed: 909,
    party: save.party.map((id) => structuredClone(save.roster[id]!)),
    enemies: [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-f", position: { x: 0, z: -1 } }],
  });
  let enc = fightUntilDone(festival, log);
  save = absorb(save, enc);
  if (!save.flags["flag.festival_fought"] && enc.outcome === "victory") save = setFlag(save, "flag.festival_fought");

  save = setFlag(save, "flag.kael_joined");
  save = recruit(save, "kael");
  save.mapId = "map.woods";

  const woods = createEncounter({
    encounterId: "enc.woods",
    seed: 910,
    party: save.party.map((id) => structuredClone(save.roster[id]!)),
    enemies: [
      { ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-w", position: { x: -0.6, z: -1 } },
      { ...structuredClone(ENEMY_TEMPLATES.glowmoth), id: "moth-w", position: { x: 0.7, z: -1 } },
    ],
  });
  enc = fightUntilDone(woods, log);
  save = absorb(save, enc);
  if (enc.outcome === "victory") save = setFlag(save, "flag.woods_cleared");

  save = setFlag(save, "flag.runes_decoded");
  save.runeOrder = ["flame", "stone", "tide"];
  save = setFlag(save, "flag.conduits_aligned");
  save = setFlag(save, "flag.temporal_sight");
  save = setFlag(save, "flag.ascension_unlocked");
  save.conduitsAligned = true;
  save.ascensionUnlocked = true;
  save.mapId = "map.shrine";

  let warden = createEncounter({
    encounterId: "enc.warden",
    seed: 911,
    party: save.party.map((id) => structuredClone(save.roster[id]!)),
    enemies: [{ ...structuredClone(ENEMY_TEMPLATES.warden), id: "warden", position: { x: 0, z: -2 } }],
    switchUnlocked: true,
  });
  const opened = openWarden(warden, log);
  if (!opened.ok) {
    log.push("mercy-not-ready:" + opened.reason);
    warden = fightUntilDone(warden, log);
    save = absorb(save, warden);
  } else {
    warden = opened.state;
    save = absorb(save, warden);
    log.push("outcome:" + warden.outcome);
  }
  if (warden.outcome === "mercy" || warden.outcome === "victory") {
    save = setFlag(save, "flag.chapter_complete");
    save.chapterComplete = true;
  }
  log.push("gold:" + save.gold);
  log.push("complete:" + save.chapterComplete);
  log.push("outcome-flag:" + save.wardenOutcome);
  return { save, log };
}

function absorb(save: SaveGame, enc: ReturnType<typeof createEncounter>): SaveGame {
  let next = save;
  if (enc.pendingReward) next = applyReward(next, enc.pendingReward);
  if (enc.outcome === "defeat") {
    for (const id of next.party) {
      const r = next.roster[id];
      if (r) next.roster[id] = { ...r, hp: r.maxHp, mp: r.maxMp };
    }
  } else {
    for (const id of next.party) {
      const live = enc.combatants.find((c) => c.id === id);
      if (live && next.roster[id]) next.roster[id] = { ...next.roster[id]!, hp: Math.max(1, live.hp), mp: live.mp };
    }
  }
  next.encounter = null;
  return next;
}

function fightUntilDone(enc: ReturnType<typeof createEncounter>, log: string[], cap = 40) {
  let state = enc;
  for (let i = 0; i < cap && state.outcome === "ongoing"; i++) {
    if (state.phase === "enemy") {
      const res = resolveEnemyTurn(state);
      if (!res.ok) break;
      state = res.state;
      continue;
    }
    if (state.phase !== "player" || !state.activeActorId) break;
    const actor = state.combatants.find((c) => c.id === state.activeActorId)!;
    const foe = state.combatants.find((c) => c.side === "enemy" && c.alive);
    if (!foe) break;
    const abilityId = actor.id === "kael" ? "atk.oathcut" : actor.id === "mira" && actor.mp >= 8 ? "spell.mend" : "atk.strike";
    const ally = state.combatants.filter((c) => c.side === "party" && c.alive).sort((a, b) => a.hp - b.hp)[0]!;
    const target = abilityId === "spell.mend" ? ally.id : foe.id;
    const action: CombatAction = {
      version: 1,
      actorId: actor.id,
      abilityId: actor.id === "mira" && ally.hp < ally.maxHp * 0.55 ? "spell.mend" : abilityId === "spell.mend" ? "atk.strike" : abilityId,
      kind: abilityId === "spell.mend" && ally.hp < ally.maxHp * 0.55 ? "cast" : "attack",
      targetIds: [actor.id === "mira" && ally.hp < ally.maxHp * 0.55 ? target : foe.id],
      modeOrigin: "legacy",
      timeOrTurn: state.turnIndex,
    };
    const res = proposeAction(state, action);
    if (!res.ok) {
      const fallback = proposeAction(state, { ...action, abilityId: "atk.strike", kind: "attack", targetIds: [foe.id] });
      if (!fallback.ok) break;
      state = fallback.state;
    } else state = res.state;
  }
  log.push(enc.encounterId + ":" + state.outcome + ":" + state.turnIndex);
  return state;
}

function openWarden(enc: ReturnType<typeof createEncounter>, log: string[]) {
  let state = enc;
  for (let i = 0; i < 24 && state.outcome === "ongoing"; i++) {
    const warden = state.combatants.find((c) => c.id === "warden");
    if (warden?.mercyEligible) break;
    if (state.phase === "enemy") {
      state = resolveEnemyTurn(state).state;
      continue;
    }
    if (state.phase !== "player" || !state.activeActorId) break;
    const id = state.activeActorId;
    let action: CombatAction;
    if (id === "kael") {
      action = { version: 1, actorId: id, abilityId: "spell.stoneguard", kind: "cast", targetIds: [id], modeOrigin: "legacy", timeOrTurn: state.turnIndex };
    } else if (id === "mira") {
      action = { version: 1, actorId: id, abilityId: "spell.tide", kind: "cast", targetIds: ["warden"], modeOrigin: "ascension", timeOrTurn: state.turnIndex };
    } else {
      action = { version: 1, actorId: id, abilityId: "act.defend", kind: "defend", targetIds: [id], modeOrigin: "legacy", timeOrTurn: state.turnIndex };
    }
    const res = proposeAction(state, action);
    if (!res.ok) {
      const foe = state.combatants.find((c) => c.side === "enemy" && c.alive);
      const fb = proposeAction(state, { version: 1, actorId: id, abilityId: "atk.strike", kind: "attack", targetIds: foe ? [foe.id] : [], modeOrigin: "legacy", timeOrTurn: state.turnIndex });
      if (!fb.ok) return fb;
      state = fb.state;
    } else state = res.state;
  }
  const mercy = tryMercy(state);
  log.push("mercy-try:" + (mercy.ok ? "yes" : mercy.reason));
  if (!mercy.ok) return { ok: false, reason: mercy.reason, state };
  return mercy;
}

export function assertPlayable(result: { save: SaveGame; log: string[] }) {
  if (!result.save.chapterComplete) {
    throw new Error("chapter did not complete: " + result.log.join(" | "));
  }
  if (result.save.party.length < 3) throw new Error("party short");
  if (!result.save.flags["flag.conduits_aligned"]) throw new Error("puzzle flag missing");
}
