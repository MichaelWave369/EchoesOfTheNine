import type {
  CombatAction,
  CombatEvent,
  CombatMode,
  CombatantState,
  EncounterState,
  Intent,
  RewardGrant,
  StatusInstance,
} from "../contracts.ts";
import { ability } from "../content/abilities.ts";
import { computeDamage, computeHeal } from "./formulas.ts";
import { rollCrit } from "./rng.ts";

export interface ActionResult {
  ok: boolean;
  reason?: string;
  state: EncounterState;
}

const SWITCH_COST_TICKS = 1;

function clone<T>(v: T): T {
  return structuredClone(v);
}

function push(state: EncounterState, ev: Omit<CombatEvent, "tick">) {
  state.events.push({ tick: state.tick, ...ev });
  state.log.push(ev.text);
  if (state.log.length > 24) state.log.shift();
}

function actorOf(state: EncounterState, id: string): CombatantState | undefined {
  return state.combatants.find((c) => c.id === id);
}

function living(state: EncounterState, side: "party" | "enemy"): CombatantState[] {
  return state.combatants.filter((c) => c.side === side && c.alive && c.hp > 0);
}

function tickCooldowns(c: CombatantState) {
  for (const k of Object.keys(c.cooldowns)) {
    c.cooldowns[k] = Math.max(0, (c.cooldowns[k] ?? 0) - 1);
    if (c.cooldowns[k] === 0) delete c.cooldowns[k];
  }
  c.statuses = c.statuses
    .map((s) => ({ ...s, remaining: s.remaining - 1 }))
    .filter((s) => s.remaining > 0);
}

function hasStatus(c: CombatantState, id: string) {
  return c.statuses.some((s) => s.id === id);
}

function addStatus(c: CombatantState, id: CombatantState["statuses"][number]["id"], duration: number, potency = 1) {
  const existing = c.statuses.find((s) => s.id === id);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.potency = Math.max(existing.potency, potency);
  } else {
    c.statuses.push({ id, remaining: duration, potency });
  }
}

export function buildQueue(state: EncounterState): string[] {
  const livingAll = state.combatants.filter((c) => c.alive && c.hp > 0);
  return [...livingAll]
    .sort((a, b) => {
      const da = a.initiativeDebt - a.speed;
      const db = b.initiativeDebt - b.speed;
      if (da !== db) return da - db;
      return a.id < b.id ? -1 : 1;
    })
    .map((c) => c.id);
}

function checkOutcome(state: EncounterState) {
  const party = living(state, "party");
  const foes = living(state, "enemy");
  if (party.length === 0) {
    state.outcome = "defeat";
    state.phase = "defeat";
    state.activeActorId = null;
    push(state, { kind: "defeat", text: "The party falls. The Vale's light flickers, but does not go out." });
    return;
  }
  if (foes.length === 0 && state.outcome === "ongoing") {
    state.outcome = "victory";
    state.phase = "victory";
    state.activeActorId = null;
    grantReward(state, false);
  }
}

function rewardFor(state: EncounterState, mercy: boolean): RewardGrant {
  if (state.encounterId === "enc.warden") {
    return {
      id: mercy ? "reward.warden.mercy" : "reward.warden.defeat",
      gold: mercy ? 40 : 80,
      xp: mercy ? 60 : 90,
      items: mercy
        ? [{ itemId: "item.warden_shard", qty: 1 }]
        : [
            { itemId: "item.warden_core", qty: 1 },
            { itemId: "item.lantern_salve", qty: 1 },
          ],
      flags: mercy ? ["flag.warden_spared"] : ["flag.warden_defeated"],
      unique: true,
    };
  }
  if (state.encounterId === "enc.festival") {
    return {
      id: "reward.festival",
      gold: 12,
      xp: 18,
      items: [{ itemId: "item.lantern_salve", qty: 1 }],
      flags: ["flag.festival_fought"],
      unique: true,
    };
  }
  return {
    id: `reward.${state.encounterId}`,
    gold: 20,
    xp: 28,
    items: [],
    flags: [`flag.cleared.${state.encounterId}`],
    unique: true,
  };
}

function grantReward(state: EncounterState, mercy: boolean) {
  const reward = rewardFor(state, mercy);
  if (state.rewardsGranted.includes(reward.id)) {
    state.pendingReward = null;
    push(state, { kind: "reward_skipped", text: "This outcome was already recorded. No second payout." });
    return;
  }
  state.rewardsGranted.push(reward.id);
  state.pendingReward = reward;
  push(state, {
    kind: "reward",
    text: mercy
      ? `The Warden stills. Pact recorded. ${reward.xp} XP, ${reward.gold} gold.`
      : `Victory. ${reward.xp} XP, ${reward.gold} gold.`,
  });
}

export function createEncounter(opts: {
  encounterId: string;
  seed: number;
  party: CombatantState[];
  enemies: CombatantState[];
  mode?: CombatMode;
  switchUnlocked?: boolean;
  rewardsAlready?: string[];
}): EncounterState {
  const state: EncounterState = {
    version: 1,
    encounterId: opts.encounterId,
    seed: opts.seed >>> 0,
    rngState: opts.seed >>> 0 || 1,
    mode: opts.mode ?? "legacy",
    tick: 0,
    phase: "player",
    turnIndex: 0,
    activeActorId: null,
    queue: [],
    combatants: [...opts.party, ...opts.enemies].map((c) => clone(c)),
    intents: [],
    log: [],
    rewardsGranted: [...(opts.rewardsAlready ?? [])],
    pendingReward: null,
    switchLock: 0,
    switchUnlocked: opts.switchUnlocked ?? false,
    outcome: "ongoing",
    events: [],
  };
  openTurn(state);
  return state;
}

function openTurn(state: EncounterState) {
  if (state.outcome !== "ongoing") return;
  if (state.switchLock > 0) {
    state.switchLock -= 1;
    state.phase = "switch_lock";
    push(state, { kind: "switch_lock", text: "The two views settle into one." });
    if (state.switchLock > 0) return;
  }
  state.queue = buildQueue(state);
  const next = state.queue[0];
  if (!next) {
    checkOutcome(state);
    return;
  }
  const actor = actorOf(state, next);
  if (!actor) return;
  actor.initiativeDebt += 10;
  state.activeActorId = actor.id;
  state.turnIndex += 1;
  state.tick += 1;
  tickCooldowns(actor);
  if (actor.side === "enemy") {
    const intent = chooseEnemyIntent(state, actor);
    state.intents = [intent];
    state.phase = "enemy";
    push(state, {
      kind: "telegraph",
      actorId: actor.id,
      abilityId: intent.abilityId,
      text: `${actor.name} readies ${ability(intent.abilityId).name}. ${intent.telegraph}`,
    });
  } else {
    state.phase = "player";
    state.intents = state.intents.filter((i) => i.actorId !== actor.id);
  }
}

function wardenShielded(state: EncounterState, warden: CombatantState): boolean {
  return state.encounterId === "enc.warden" && (warden.phase ?? 1) < 2 && !hasStatus(warden, "exposed");
}

function chooseEnemyIntent(state: EncounterState, actor: CombatantState): Intent {
  const party = living(state, "party");
  const target = [...party].sort((a, b) => a.hp - b.hp || (a.id < b.id ? -1 : 1))[0];
  let abilityId = "enemy.shard_bite";
  let telegraph = "A short lunge.";
  if (actor.jobId === "enemy.glowmoth") {
    abilityId = (actor.cooldowns["enemy.mote_flare"] ?? 0) > 0 ? "enemy.shard_bite" : "enemy.mote_flare";
    telegraph = abilityId === "enemy.mote_flare" ? "Wings brighten — flame incoming." : "A darting bite.";
  } else if (actor.jobId === "enemy.warden") {
    const phase = actor.phase ?? 1;
    if (phase >= 2 && hasStatus(actor, "exposed")) {
      abilityId = "enemy.core_pulse";
      telegraph = "The core flares. This one hurts.";
    } else if ((actor.cooldowns["enemy.prism_rupture"] ?? 0) === 0 && state.turnIndex % 3 === 0) {
      abilityId = "enemy.prism_rupture";
      telegraph = "Prismatic Rupture — brace with Stoneguard, then answer with Tide.";
    } else {
      abilityId = "enemy.shard_rain";
      telegraph = "Shards arc wide. Sidestep or defend.";
    }
  }
  return {
    actorId: actor.id,
    abilityId,
    targetIds: ability(abilityId).targeting === "all_enemies" ? party.map((p) => p.id) : target ? [target.id] : [],
    telegraph,
    committed: true,
  };
}

export function validateAction(state: EncounterState, action: CombatAction): string | null {
  if (state.outcome !== "ongoing") return "Encounter is already resolved.";
  if (state.phase === "switch_lock") return "Views are still settling.";
  const actor = actorOf(state, action.actorId);
  if (!actor || !actor.alive) return "Actor cannot act.";
  if (state.activeActorId !== actor.id && action.kind !== "switch") return "Not this combatant's turn.";
  if (actor.side === "enemy" && action.modeOrigin !== "legacy" && action.kind !== "switch") {
    /* enemies resolve through the same pipeline; callers pass their intent */
  }
  if (action.kind === "switch") {
    if (!state.switchUnlocked) return "Ascension is not yet awake.";
    if (state.switchLock > 0) return "Switch is locked.";
    return null;
  }
  const ab = ABILITIES_SAFE(action.abilityId);
  if (!ab) return "Unknown ability.";
  if ((actor.cooldowns[ab.id] ?? 0) > 0) return `${ab.name} is still cooling.`;
  if (actor.mp < ab.cost.mp) return `Not enough MP for ${ab.name}.`;
  if (ab.kind === "item") {
    /* inventory checked by the world layer via a pre-validated flag on the action id existing */
  }
  if (ab.targeting === "one_enemy" || ab.targeting === "all_enemies") {
    if (action.targetIds.length === 0 && ab.targeting === "one_enemy") return "Choose a target.";
  }
  return null;
}

function ABILITIES_SAFE(id: string) {
  try {
    return ability(id);
  } catch {
    return null;
  }
}

function applyEffects(
  state: EncounterState,
  actor: CombatantState,
  action: CombatAction,
): void {
  const ab = ability(action.abilityId);
  if (ab.cost.mp > 0) actor.mp = Math.max(0, actor.mp - ab.cost.mp);
  if (ab.cost.cooldownTicks > 0) actor.cooldowns[ab.id] = ab.cost.cooldownTicks;

  const targets = resolveTargets(state, actor, action, ab.targeting);
  for (const effect of ab.effects) {
    if (effect.kind === "elemental_damage") {
      for (const target of targets) {
        if (!target.alive) continue;
        const rolled = rollCrit(state.rngState, 0.08);
        state.rngState = rolled.next;
        let dmg = computeDamage({
          power: effect.power ?? 10,
          actor,
          target,
          element: effect.element ?? "neutral",
          crit: rolled.crit,
        });
        if (state.encounterId === "enc.warden" && target.jobId === "enemy.warden" && wardenShielded(state, target)) {
          dmg = Math.max(1, Math.floor(dmg * 0.35));
          push(state, {
            kind: "shield",
            actorId: actor.id,
            targetId: target.id,
            amount: dmg,
            abilityId: ab.id,
            text: `The prism skin turns most of ${ab.name} aside (${dmg}).`,
          });
        } else {
          push(state, {
            kind: "damage",
            actorId: actor.id,
            targetId: target.id,
            amount: dmg,
            abilityId: ab.id,
            text: `${actor.name} uses ${ab.name} on ${target.name} for ${dmg}${rolled.crit ? " (critical)" : ""}.`,
          });
        }
        target.hp = Math.max(0, target.hp - dmg);
        if (target.hp === 0) {
          target.alive = false;
          push(state, { kind: "down", actorId: target.id, text: `${target.name} falls.` });
        }
      }
    } else if (effect.kind === "heal") {
      for (const target of targets) {
        if (ab.id === "item.dew_vial") {
          const gain = Math.min(18, target.maxMp - target.mp);
          target.mp += gain;
          push(state, {
            kind: "mp",
            actorId: actor.id,
            targetId: target.id,
            amount: gain,
            text: `${target.name} recovers ${gain} MP.`,
          });
        } else {
          const heal = computeHeal(effect.power ?? 10, actor);
          const before = target.hp;
          target.hp = Math.min(target.maxHp, target.hp + heal);
          push(state, {
            kind: "heal",
            actorId: actor.id,
            targetId: target.id,
            amount: target.hp - before,
            abilityId: ab.id,
            text: `${ab.name} restores ${target.hp - before} HP to ${target.name}.`,
          });
        }
      }
    } else if (effect.kind === "status" && effect.statusId) {
      const statusTargets = ab.targeting === "self" ? [actor] : targets;
      for (const target of statusTargets) {
        addStatus(target, effect.statusId as StatusInstance["id"], effect.duration ?? 1, effect.potency ?? 1);
        push(state, {
          kind: "status",
          actorId: actor.id,
          targetId: target.id,
          abilityId: ab.id,
          text: `${target.name} gains ${effect.statusId}.`,
        });
      }
    } else if (effect.kind === "interrupt") {
      for (const target of targets) {
        const intent = state.intents.find((i) => i.actorId === target.id && i.committed);
        if (intent && intent.abilityId === "enemy.prism_rupture") {
          intent.committed = false;
          intent.abilityId = "enemy.shard_rain";
          intent.telegraph = "The rupture collapses into a lesser shard rain.";
          addStatus(target, "exposed", 2, 1);
          if (target.jobId === "enemy.warden") target.phase = Math.max(target.phase ?? 1, 2);
          push(state, {
            kind: "interrupt",
            actorId: actor.id,
            targetId: target.id,
            text: "Tide unravels Prismatic Rupture. The core is exposed.",
          });
        } else {
          push(state, {
            kind: "interrupt_whiff",
            actorId: actor.id,
            targetId: target.id,
            text: `${ab.name} washes over ${target.name}, but no pattern was committed.`,
          });
        }
      }
    }
  }

  if (
    state.encounterId === "enc.warden" &&
    ab.id === "spell.tide"
  ) {
    const warden = state.combatants.find((c) => c.jobId === "enemy.warden");
    const guarded = state.combatants.some(
      (c) => c.side === "party" && (hasStatus(c, "stoneguard") || hasStatus(c, "guard")),
    );
    if (warden && guarded && wardenShielded(state, warden)) {
      addStatus(warden, "exposed", 3, 1);
      warden.phase = 2;
      warden.mercyEligible = true;
      push(state, {
        kind: "expose",
        targetId: warden.id,
        text: "Stoneguard held. Tide found the seam. The Warden's core is open — mercy is possible.",
      });
    }
  }
}

function resolveTargets(
  state: EncounterState,
  actor: CombatantState,
  action: CombatAction,
  targeting: string,
): CombatantState[] {
  if (targeting === "self") return [actor];
  if (targeting === "all_enemies") {
    const side = actor.side === "party" ? "enemy" : "party";
    return living(state, side);
  }
  if (targeting === "one_ally") {
    const ids = action.targetIds.length ? action.targetIds : [actor.id];
    return ids.map((id) => actorOf(state, id)).filter((c): c is CombatantState => !!c && c.alive);
  }
  const ids = action.targetIds;
  const found = ids.map((id) => actorOf(state, id)).filter((c): c is CombatantState => !!c && c.alive);
  if (found.length) return found;
  const fallbackSide = actor.side === "party" ? "enemy" : "party";
  const foe = living(state, fallbackSide)[0];
  return foe ? [foe] : [];
}

export function proposeAction(state: EncounterState, action: CombatAction): ActionResult {
  const reason = validateAction(state, action);
  if (reason) {
    return { ok: false, reason, state };
  }
  const next = clone(state);
  return { ok: true, state: resolveDeterministically(next, action) };
}

export function resolveDeterministically(state: EncounterState, action: CombatAction): EncounterState {
  state.tick += 1;
  if (action.kind === "switch") {
    const from = state.mode;
    state.mode = state.mode === "legacy" ? "ascension" : "legacy";
    state.switchLock = SWITCH_COST_TICKS;
    state.phase = "switch_lock";
    const actor = actorOf(state, action.actorId);
    if (actor) actor.initiativeDebt += 4;
    push(state, {
      kind: "switch",
      actorId: action.actorId,
      text: `The view folds from ${from} into ${state.mode}. HP, intent, and the dice do not reset.`,
    });
    openTurn(state);
    return state;
  }

  const actor = actorOf(state, action.actorId);
  if (!actor) return state;
  applyEffects(state, actor, action);
  checkOutcome(state);
  if (state.outcome === "ongoing") openTurn(state);
  return state;
}

/** Enemy turn auto-resolves the committed intent through the same pipeline. */
export function resolveEnemyTurn(state: EncounterState): ActionResult {
  if (state.phase !== "enemy" || !state.activeActorId) {
    return { ok: false, reason: "No enemy intent is ready.", state };
  }
  const intent = state.intents.find((i) => i.actorId === state.activeActorId);
  if (!intent) return { ok: false, reason: "Missing telegraph.", state };
  const action: CombatAction = {
    version: 1,
    actorId: intent.actorId,
    abilityId: intent.abilityId,
    kind: intent.abilityId.startsWith("spell") || intent.abilityId.includes("flare") || intent.abilityId.includes("rupture") || intent.abilityId.includes("pulse") ? "cast" : "attack",
    targetIds: intent.targetIds,
    modeOrigin: state.mode,
    timeOrTurn: state.turnIndex,
  };
  return proposeAction(state, action);
}

export function tryMercy(state: EncounterState): ActionResult {
  if (state.encounterId !== "enc.warden") return { ok: false, reason: "Nothing here can be spared.", state };
  const warden = state.combatants.find((c) => c.jobId === "enemy.warden" && c.alive);
  if (!warden) return { ok: false, reason: "The Warden is already gone.", state };
  if (!warden.mercyEligible && !hasStatus(warden, "exposed")) {
    return { ok: false, reason: "The core is still sealed. Stoneguard, then Tide.", state };
  }
  const next = clone(state);
  const w = next.combatants.find((c) => c.id === warden.id)!;
  w.alive = false;
  w.hp = 0;
  next.outcome = "mercy";
  next.phase = "mercy";
  next.activeActorId = null;
  push(next, {
    kind: "mercy",
    targetId: w.id,
    text: "You lower your hand. The Warden bows its prism the way a bell bows after the last note.",
  });
  grantReward(next, true);
  return { ok: true, state: next };
}

export function fingerprint(state: EncounterState): string {
  const parts = state.combatants.map(
    (c) =>
      `${c.id}:${c.hp}:${c.mp}:${c.phase ?? 0}:${c.initiativeDebt}:${Object.entries(c.cooldowns).sort().join(",")}:${c.statuses.map((s) => s.id + s.remaining).join(".")}`,
  );
  return `${state.rngState}|${state.phase}|${parts.join(";")}|${state.rewardsGranted.join(",")}`;
}
