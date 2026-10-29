import type { CombatantState, Element } from "../contracts.ts";

/**
 * Damage = floor(max(1, (Power × AttackFactor − DefenseFactor)
 *   × ElementMultiplier × StatusMultiplier × CritMultiplier))
 * Clamped multipliers. Deterministic rounding.
 */
export function elementMultiplier(element: Element, target: CombatantState): number {
  const resist = target.resistances[element] ?? 0;
  const raw = 1 - resist;
  return Math.min(2, Math.max(0.25, raw));
}

export function statusMultiplier(actor: CombatantState, target: CombatantState): number {
  let m = 1;
  if (actor.statuses.some((s) => s.id === "exposed")) m *= 0.85;
  if (target.statuses.some((s) => s.id === "exposed")) m *= 1.35;
  if (target.statuses.some((s) => s.id === "guard" || s.id === "stoneguard")) m *= 0.55;
  if (target.statuses.some((s) => s.id === "tideveil") && actor.jobId.includes("warden")) m *= 0.7;
  return Math.min(2, Math.max(0.2, m));
}

export function computeDamage(opts: {
  power: number;
  actor: CombatantState;
  target: CombatantState;
  element: Element;
  crit: boolean;
}): number {
  const attackFactor = 1 + opts.actor.attack / 40;
  const defenseFactor = opts.target.defense * 0.35;
  const elem = elementMultiplier(opts.element, opts.target);
  const status = statusMultiplier(opts.actor, opts.target);
  const crit = opts.crit ? 1.5 : 1;
  const raw = (opts.power * attackFactor - defenseFactor) * elem * status * crit;
  return Math.floor(Math.max(1, raw));
}

export function computeHeal(power: number, actor: CombatantState): number {
  return Math.floor(Math.max(1, power * (1 + actor.attack / 80)));
}
