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
import { CHARACTERS, ENEMY_TEMPLATES } from "../content/characters.ts";
import { elementNote } from "../content/crossing.ts";
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
  if (state.encounterId === "enc.cantor") {
    return {
      id: mercy ? "reward.cantor.mercy" : "reward.cantor.defeat",
      gold: mercy ? 45 : 70,
      xp: mercy ? 64 : 84,
      items: mercy ? [{ itemId: "accessory.reed_loop", qty: 1 }] : [{ itemId: "weapon.glass_needle", qty: 1 }],
      flags: mercy ? ["flag.cantor_spared"] : ["flag.cantor_defeated"],
      unique: true,
    };
  }
  if (state.encounterId === "enc.ferryman") {
    return {
      id: mercy ? "reward.ferryman.mercy" : "reward.ferryman.defeat",
      gold: mercy ? 48 : 66,
      xp: mercy ? 72 : 84,
      items: mercy ? [{ itemId: "accessory.departure_thread", qty: 1 }] : [{ itemId: "weapon.river_hook", qty: 1 }],
      flags: mercy
        ? ["flag.ferryman_spared", "flag.ferry_complete"]
        : ["flag.ferryman_defeated", "flag.ferry_complete"],
      unique: true,
    };
  }
  if (state.encounterId === "enc.galekeeper") {
    return {
      id: mercy ? "reward.gale.mercy" : "reward.gale.defeat",
      gold: mercy ? 52 : 74,
      xp: mercy ? 80 : 96,
      items: mercy ? [{ itemId: "accessory.early_thread", qty: 1 }] : [{ itemId: "weapon.gale_hook", qty: 1 }],
      flags: mercy
        ? ["flag.gale_spared", "flag.ridge_complete", "flag.skiff_ready"]
        : ["flag.gale_defeated", "flag.ridge_complete", "flag.skiff_ready"],
      unique: true,
    };
  }
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
  if (state.encounterId === "enc.hourkeeper") {
    return {
      id: mercy ? "reward.hour.mercy" : "reward.hour.defeat",
      gold: mercy ? 54 : 76,
      xp: mercy ? 84 : 98,
      items: mercy ? [{ itemId: "accessory.blank_thread", qty: 1 }] : [{ itemId: "accessory.hour_thread", qty: 1 }],
      flags: mercy
        ? ["flag.hour_spared", "flag.hour_complete"]
        : ["flag.hour_ended", "flag.hour_complete"],
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
  if (state.encounterId === "enc.ashkite") {
    return {
      id: "reward.ashkite",
      gold: 58,
      xp: 86,
      items: [{ itemId: "item.ash_lance", qty: 1 }],
      flags: ["flag.ashkite_cleared", "flag.dragoon_spark"],
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
  const rival = reward.id.endsWith(".mercy")
    ? reward.id.replace(/\.mercy$/, ".defeat")
    : reward.id.endsWith(".defeat")
      ? reward.id.replace(/\.defeat$/, ".mercy")
      : null;
  if (state.rewardsGranted.includes(reward.id) || (rival && state.rewardsGranted.includes(rival))) {
    state.pendingReward = null;
    push(state, { kind: "reward_skipped", text: "This outcome was already recorded. No second payout." });
    return;
  }
  state.rewardsGranted.push(reward.id);
  state.pendingReward = reward;
  push(state, {
    kind: "reward",
    text: mercy
      ? `A gentler ending is kept. ${reward.xp} XP, ${reward.gold} gold.`
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

function raiseReflections(state: EncounterState) {
  if (state.combatants.some((c) => c.id === "reflection-1")) return;
  const spots = [
    ["reflection-1", -1.15],
    ["reflection-2", 1.15],
  ] as const;
  for (const [id, x] of spots) {
    const mist = structuredClone(ENEMY_TEMPLATES.mistling);
    state.combatants.push({
      ...mist,
      id,
      name: "Reflection",
      hp: 36,
      maxHp: 36,
      position: { x, z: -1.15 },
    });
  }
  push(state, {
    kind: "status",
    text: "Two reflections step off a boat that has not arrived. The second boarding has started.",
  });
}

function raiseAheadGusts(state: EncounterState) {
  if (state.combatants.some((c) => c.id === "ahead-1")) return;
  const spots = [
    ["ahead-1", -1.2],
    ["ahead-2", 1.2],
  ] as const;
  for (const [id, x] of spots) {
    const gust = structuredClone(ENEMY_TEMPLATES.gustling);
    state.combatants.push({
      ...gust,
      id,
      name: "Ahead-gust",
      hp: 36,
      maxHp: 36,
      position: { x, z: -1.2 },
    });
  }
  push(state, {
    kind: "status",
    text: "Two gusts step in from a noon that has not happened. The early gale has started.",
  });
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
  } else if (actor.jobId === "enemy.briarling") {
    abilityId = "enemy.briar_lash";
    telegraph = "The briar draws back. A lash is coming — sidestep or brace.";
  } else if (actor.jobId === "enemy.cantor") {
    if ((actor.cooldowns["enemy.cantor_dirge"] ?? 0) === 0 && state.turnIndex % 3 === 0) {
      abilityId = "enemy.cantor_dirge";
      telegraph = "Hollow Dirge — the note will reach everyone. Defend, or be elsewhere.";
    } else {
      abilityId = "enemy.briar_lash";
      telegraph = "A thorned hand. The windup is honest.";
    }
  } else if (actor.jobId === "enemy.galekeeper") {
    if ((actor.phase ?? 1) >= 2 && (actor.cooldowns["enemy.early_gale"] ?? 0) === 0) {
      abilityId = "enemy.early_gale";
      telegraph = "Early Gale — the noon hits everyone. Defend. Sidestep will not cover the party.";
    } else {
      abilityId = "enemy.gust_lash";
      telegraph = "Gust Lash — one line of wind. Sidestep the one it chose. Stone bites this.";
    }
  } else if (actor.jobId === "enemy.gustling") {
    abilityId = "enemy.gust_lash";
    telegraph = "Gust Lash — wind, with a wrist. Sidestep or brace.";
  } else if (actor.jobId === "enemy.ferryman") {
    if ((actor.phase ?? 1) >= 2 && (actor.cooldowns["enemy.double_departure"] ?? 0) === 0) {
      abilityId = "enemy.double_departure";
      telegraph = "Double Departure — both hours hit everyone. Defend. Sidestep will not cover the party.";
    } else {
      abilityId = "enemy.gangplank";
      telegraph = "Gangplank — one line, honest. Sidestep the one it chose.";
    }
  } else if (actor.jobId === "enemy.mistling") {
    abilityId = "enemy.mist_lash";
    telegraph = "Mist Lash — tide, with a wrist. Sidestep or brace.";
  } else if (actor.jobId === "enemy.driftlantern") {
    abilityId = (actor.cooldowns["enemy.lantern_wisp"] ?? 0) > 0 ? "enemy.spark_tap" : "enemy.lantern_wisp";
    telegraph =
      abilityId === "enemy.lantern_wisp"
        ? "Lantern Wisp — flame. Tide bites this one. Fire slides off."
        : "A smaller spark. Still flame.";
  } else if (actor.jobId === "enemy.hourkeeper") {
    if ((actor.phase ?? 1) >= 2 && (actor.cooldowns["enemy.folded_hour"] ?? 0) === 0) {
      abilityId = "enemy.folded_hour";
      telegraph = "Folded Hour — both pages hit everyone. Defend. Tide bites the ink. Stone bites the bell.";
    } else if (state.turnIndex % 2 === 0) {
      abilityId = "enemy.ink_script";
      telegraph = "Ink Script — shadow on one of you. Tide bites it. Sidestep or brace.";
    } else {
      abilityId = "enemy.bell_hour";
      telegraph = "Bell Hour — wind on one of you. Stone bites it. Sidestep or brace.";
    }
  } else if (actor.jobId === "enemy.inkling") {
    abilityId = "enemy.ink_script";
    telegraph = "A short line of ink. Tide bites it. Sidestep or brace.";
  } else if (actor.jobId === "enemy.ashkite") {
    if (state.turnIndex % 3 === 0 && (actor.cooldowns["enemy.downdraft"] ?? 0) === 0) {
      abilityId = "enemy.downdraft";
      telegraph = "Downdraft — the whole party. Defend. A sidestep will not cover everyone. Stone bites this wind.";
    } else {
      abilityId = "enemy.cinder_rake";
      telegraph = "Cinder Rake — ash on one of you. Tide bites it. Sidestep or brace.";
    }
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

const KIND_FOR_ABILITY: Record<string, CombatAction["kind"]> = {
  attack: "attack",
  spell: "cast",
  defend: "defend",
  item: "item",
  dodge: "dodge",
  interact: "interact",
};

const PARTY_BASICS = ["atk.strike", "act.defend", "act.dodge"];

function partyMayUse(actor: CombatantState, abilityId: string): boolean {
  const ab = ABILITIES_SAFE(abilityId);
  if (ab?.kind === "item") return true;
  if (actor.knownAbilities && actor.knownAbilities.length > 0) return actor.knownAbilities.includes(abilityId);
  const listed = CHARACTERS[actor.id]?.abilities ?? [];
  return new Set([...listed, ...PARTY_BASICS]).has(abilityId);
}

export function validateAction(state: EncounterState, action: CombatAction): string | null {
  if (state.outcome !== "ongoing") return "Encounter is already resolved.";
  if (state.phase === "switch_lock" || state.phase === "resolve") return "Views are still settling.";
  if (state.phase === "victory" || state.phase === "defeat" || state.phase === "mercy") {
    return "Encounter is already resolved.";
  }
  const actor = actorOf(state, action.actorId);
  if (!actor || !actor.alive || actor.hp <= 0) return "Actor cannot act.";

  if (action.kind === "switch") {
    if (state.phase !== "player") return "You can only change view on your turn.";
    if (actor.side !== "party") return "Only an ally may change the view.";
    if (state.activeActorId !== actor.id) return "Only the actor whose turn it is may change the view.";
    if (!state.switchUnlocked) return "Ascension is not yet awake.";
    if (state.switchLock > 0) return "Switch is locked.";
    return null;
  }

  if (actor.side === "party" && state.phase !== "player") return "It is not a party turn.";
  if (actor.side === "enemy" && state.phase !== "enemy") return "It is not an enemy turn.";
  if (state.activeActorId !== actor.id) return "Not this combatant's turn.";

  const ab = ABILITIES_SAFE(action.abilityId);
  if (!ab) return "Unknown ability.";
  if (KIND_FOR_ABILITY[ab.kind] !== action.kind) return `${ab.name} is not that kind of action.`;
  if (actor.side === "enemy" && !ab.id.startsWith("enemy.")) return "Enemies cannot borrow ally arts.";
  if (actor.side === "party" && !partyMayUse(actor, ab.id)) return `${actor.name} does not know ${ab.name}.`;
  if ((actor.cooldowns[ab.id] ?? 0) > 0) return `${ab.name} is still cooling.`;
  if (actor.mp < ab.cost.mp) return `Not enough MP for ${ab.name}.`;
  if (ab.kind === "item") {
    const have = state.pack?.[ab.id] ?? 0;
    if (have <= 0) return `${ab.name} is not in the pack.`;
  }
  if (ab.targeting === "one_enemy") {
    const foeIds = action.targetIds.filter((id) => {
      const target = actorOf(state, id);
      return !!target && target.alive && target.hp > 0 && target.side !== actor.side;
    });
    if (action.targetIds.some((id) => actorOf(state, id)?.side === actor.side)) return "That is not a foe.";
    if (actor.side === "party" && foeIds.length === 0) return "Choose a living foe.";
  }
  if (ab.targeting === "one_ally") {
    if (action.targetIds.length === 0) return "Choose an ally.";
    const bad = action.targetIds.some((id) => {
      const target = actorOf(state, id);
      return !target || !target.alive || target.hp <= 0 || target.side !== actor.side;
    });
    if (bad) return "Choose a living ally.";
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
        const rank = actor.spellRanks?.[ab.id] ?? 0;
        const elem = effect.element ?? "neutral";
        let dmg = computeDamage({
          power: (effect.power ?? 10) + rank,
          actor,
          target,
          element: elem,
          crit: rolled.crit,
        });
        const dist = Math.hypot(actor.position.x - target.position.x, actor.position.z - target.position.z);
        if (dist < 1.35) dmg = Math.floor(dmg * 1.15);
        else if (dist > 3.4) dmg = Math.floor(dmg * 0.85);
        dmg = Math.max(1, dmg);
        const bite = elementNote(target.resistances[elem] ?? 0);
        if (hasStatus(target, "evading")) {
          target.statuses = target.statuses.filter((s) => s.id !== "evading");
          push(state, {
            kind: "miss",
            actorId: actor.id,
            targetId: target.id,
            amount: 0,
            abilityId: ab.id,
            text: `${target.name} is off the line. ${ab.name} finds air.`,
          });
          continue;
        }
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
            text: `${actor.name} uses ${ab.name} on ${target.name} for ${dmg}${rolled.crit ? " (critical)" : ""}.${bite}`,
          });
        }
        target.hp = Math.max(0, target.hp - dmg);
        if (target.hp > 0 && target.jobId === "enemy.ferryman" && target.hp <= target.maxHp * 0.5 && (target.phase ?? 1) < 2) {
          target.phase = 2;
          raiseReflections(state);
        }
        if (target.hp > 0 && target.jobId === "enemy.galekeeper" && target.hp <= target.maxHp * 0.5 && (target.phase ?? 1) < 2) {
          target.phase = 2;
          raiseAheadGusts(state);
        }
        if (target.hp > 0 && target.jobId === "enemy.hourkeeper" && target.hp <= target.maxHp * 0.5 && (target.phase ?? 1) < 2) {
          target.phase = 2;
          push(state, { kind: "status", text: "The hour folds. Both pages are in the room." });
        }
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
    return ids
      .map((id) => actorOf(state, id))
      .filter((c): c is CombatantState => !!c && c.alive && c.side === actor.side);
  }
  const found = action.targetIds
    .map((id) => actorOf(state, id))
    .filter((c): c is CombatantState => !!c && c.alive && c.side !== actor.side);
  if (found.length) return found;
  if (actor.side === "enemy") {
    const foe = living(state, "party")[0];
    return foe ? [foe] : [];
  }
  return [];
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
  const ab = ABILITIES_SAFE(action.abilityId);
  if (ab?.kind === "item") {
    const have = state.pack?.[ab.id] ?? 0;
    if (have <= 0) {
      push(state, { kind: "item_empty", actorId: actor.id, abilityId: ab.id, text: `${ab.name} is not in the pack.` });
      return state;
    }
    state.pack = { ...(state.pack ?? {}), [ab.id]: have - 1 };
  }
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
  const intent = state.intents.find((i) => i.actorId === state.activeActorId && i.committed);
  if (!intent) return { ok: false, reason: "Missing telegraph.", state };
  const ab = ABILITIES_SAFE(intent.abilityId);
  if (!ab) return { ok: false, reason: "Unknown enemy art.", state };
  const action: CombatAction = {
    version: 1,
    actorId: intent.actorId,
    abilityId: intent.abilityId,
    kind: KIND_FOR_ABILITY[ab.kind] ?? "attack",
    targetIds: intent.targetIds,
    modeOrigin: state.mode,
    timeOrTurn: state.turnIndex,
  };
  return proposeAction(state, action);
}

export interface MercyRules {
  /** Cantor mercy is legal only after the Warden was spared. Hiding a button is not the rule. */
  wardenSpared?: boolean;
  /** Ferryman mercy also opens if both departures were recorded. */
  doubleDeparture?: boolean;
  /** Galekeeper mercy opens if the two noons were read, the glass was seen, or Sera lashed the safer stay. */
  skyAsked?: boolean;
  /** Hourkeeper mercy opens if the Vale contradiction was kept, or the Warden was spared. */
  hourAsked?: boolean;
}

export function tryMercy(state: EncounterState, rules?: MercyRules): ActionResult {
  if (state.outcome !== "ongoing") return { ok: false, reason: "Encounter is already resolved.", state };
  const warden = state.combatants.find((c) => c.jobId === "enemy.warden" && c.alive);
  const cantor = state.combatants.find((c) => c.jobId === "enemy.cantor" && c.alive);
  if (state.encounterId === "enc.cantor") {
    if (!rules?.wardenSpared) {
      return {
        ok: false,
        reason: "The Cantor will not take mercy from hands that ended the Warden. The song can still be finished.",
        state,
      };
    }
    if (!cantor) return { ok: false, reason: "The song has already ended.", state };
    if (cantor.hp > cantor.maxHp * 0.5) {
      return { ok: false, reason: "The dirge is still too loud. Bring it under half, or finish it.", state };
    }
    const next = clone(state);
    const foe = next.combatants.find((c) => c.id === cantor.id)!;
    foe.alive = false;
    foe.hp = 0;
    next.outcome = "mercy";
    next.phase = "mercy";
    next.activeActorId = null;
    push(next, {
      kind: "mercy",
      targetId: foe.id,
      text: "You do not cut the last note. The Cantor lets the vine go, and the Reach exhales.",
    });
    grantReward(next, true);
    return { ok: true, state: next };
  }
  if (state.encounterId === "enc.ferryman") {
    const ferryman = state.combatants.find((c) => c.jobId === "enemy.ferryman" && c.alive);
    if (!ferryman) return { ok: false, reason: "The boat is already empty.", state };
    if (ferryman.hp > ferryman.maxHp * 0.4) {
      return { ok: false, reason: "He is still boarding. Bring him under two fifths, or finish it.", state };
    }
    if (!rules?.wardenSpared && !rules?.doubleDeparture) {
      return {
        ok: false,
        reason: "He will not sit for a stranger who has not heard both departures, and who did not already learn how to ask. You can still end it.",
        state,
      };
    }
    const next = clone(state);
    for (const foe of next.combatants) {
      if (foe.side === "enemy" && foe.alive) {
        foe.alive = false;
        foe.hp = 0;
      }
    }
    next.outcome = "mercy";
    next.phase = "mercy";
    next.activeActorId = null;
    push(next, {
      kind: "mercy",
      targetId: ferryman.id,
      text: "You ask which departure he is keeping. He sits on the gunwale. The second boarding does not finish.",
    });
    grantReward(next, true);
    return { ok: true, state: next };
  }
  if (state.encounterId === "enc.galekeeper") {
    const gale = state.combatants.find((c) => c.jobId === "enemy.galekeeper" && c.alive);
    if (!gale) return { ok: false, reason: "The wind is already quiet.", state };
    if (gale.hp > gale.maxHp * 0.45) {
      return { ok: false, reason: "The gale is still early. Bring it under half and a little more, or finish it.", state };
    }
    if (!rules?.skyAsked) {
      return {
        ok: false,
        reason: "It will not sit for a stranger who has not seen the early noon, and who did not already choose the safer stay. You can still end it.",
        state,
      };
    }
    const next = clone(state);
    for (const foe of next.combatants) {
      if (foe.side === "enemy" && foe.alive) {
        foe.alive = false;
        foe.hp = 0;
      }
    }
    next.outcome = "mercy";
    next.phase = "mercy";
    next.activeActorId = null;
    push(next, {
      kind: "mercy",
      targetId: gale.id,
      text: "You ask which noon it is keeping. The gale sits on the half-span. The early wind does not finish.",
    });
    grantReward(next, true);
    return { ok: true, state: next };
  }
  if (state.encounterId === "enc.hourkeeper") {
    const keeper = state.combatants.find((c) => c.jobId === "enemy.hourkeeper" && c.alive);
    if (!keeper) return { ok: false, reason: "The hour is already quiet.", state };
    if (keeper.hp > keeper.maxHp * 0.42) {
      return { ok: false, reason: "The hour is still too loud. Bring it under half and a little more, or finish the page.", state };
    }
    if (!rules?.hourAsked && !rules?.wardenSpared) {
      return {
        ok: false,
        reason: "It will not sit for a single hour from hands that ended a guardian. You can still finish the page.",
        state,
      };
    }
    const next = clone(state);
    for (const foe of next.combatants) {
      if (foe.side === "enemy" && foe.alive) {
        foe.alive = false;
        foe.hp = 0;
      }
    }
    next.outcome = "mercy";
    next.phase = "mercy";
    next.activeActorId = null;
    const text = rules?.wardenSpared
      ? "You ask it to leave the hour unwritten, the way you once asked a guardian to sleep. It sits."
      : "You kept both hours, even after a guardian fell. You ask this one to sit. It does. The contradiction stays.";
    push(next, { kind: "mercy", targetId: keeper.id, text });
    grantReward(next, true);
    return { ok: true, state: next };
  }
  if (state.encounterId !== "enc.warden") return { ok: false, reason: "Nothing here can be spared.", state };
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
