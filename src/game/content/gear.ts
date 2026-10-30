import type { CombatantState, EquipLoadout, SaveGame } from "../contracts.ts";
import { CHARACTERS } from "./characters.ts";
import { beginSight, spellsForJob } from "./crossing.ts";
import { beginSkySight } from "./skyweave.ts";
import { beginHourSight } from "./unwritten.ts";

export interface GearDef {
  id: string;
  name: string;
  blurb: string;
  slot: "weapon" | "armor" | "accessory";
  attack?: number;
  defense?: number;
  speed?: number;
  mp?: number;
  price: number;
}

export const GEAR: Record<string, GearDef> = {
  "weapon.festival_knife": {
    id: "weapon.festival_knife",
    name: "Festival Knife",
    blurb: "A bread knife that has seen exactly one heroic moment, and is ready for another.",
    slot: "weapon",
    attack: 3,
    price: 0,
  },
  "weapon.glass_needle": {
    id: "weapon.glass_needle",
    name: "Glass Needle",
    blurb: "Bram swears it was a pine needle yesterday. It pokes like it remembers being a sword.",
    slot: "weapon",
    attack: 6,
    price: 36,
  },
  "weapon.oath_blade": {
    id: "weapon.oath_blade",
    name: "Oath Blade",
    blurb: "Heavy, plain, and unwilling to be decorative.",
    slot: "weapon",
    attack: 7,
    price: 48,
  },
  "armor.lantern_coat": {
    id: "armor.lantern_coat",
    name: "Lantern Coat",
    blurb: "Quilted against festival sparks. Also, slightly, against teeth.",
    slot: "armor",
    defense: 3,
    price: 28,
  },
  "armor.pine_mail": {
    id: "armor.pine_mail",
    name: "Pine Mail",
    blurb: "Bark plates and stubbornness.",
    slot: "armor",
    defense: 5,
    price: 40,
  },
  "accessory.clock_charm": {
    id: "accessory.clock_charm",
    name: "Loose Minute",
    blurb: "A warm pebble from under the clock. It does not tell time. It keeps up.",
    slot: "accessory",
    speed: 3,
    price: 0,
  },
  "accessory.reed_loop": {
    id: "accessory.reed_loop",
    name: "Reed Loop",
    blurb: "The Cantor's leftover note, tied in a circle. Quiet, if you were kind.",
    slot: "accessory",
    defense: 2,
    speed: 1,
    price: 0,
  },
  "accessory.margin_clasp": {
    id: "accessory.margin_clasp",
    name: "Margin Clasp",
    blurb: "A brass clip from the parish book. It keeps a written thing from being sanded down.",
    slot: "accessory",
    defense: 1,
    mp: 4,
    price: 0,
  },
  "accessory.path_cord": {
    id: "accessory.path_cord",
    name: "Path Cord",
    blurb: "Pell's knot. The oath bent toward a person, and the cord remembers the bend.",
    slot: "accessory",
    speed: 2,
    price: 0,
  },
  "accessory.bell_shard": {
    id: "accessory.bell_shard",
    name: "Clapper Shard",
    blurb: "Warm bronze from a bell that could not agree with itself. It keeps pace, not time.",
    slot: "accessory",
    defense: 2,
    speed: 1,
    price: 0,
  },
  "armor.mist_cloak": {
    id: "armor.mist_cloak",
    name: "Mist Cloak",
    blurb: "Tamsin swears it was fog this morning. It keeps a little of the river off your ribs.",
    slot: "armor",
    defense: 4,
    price: 34,
  },
  "weapon.river_hook": {
    id: "weapon.river_hook",
    name: "River Hook",
    blurb: "A boathook that decided to be a weapon. It likes a Riverward's hand.",
    slot: "weapon",
    attack: 8,
    price: 0,
  },
  "accessory.departure_thread": {
    id: "accessory.departure_thread",
    name: "Departure Thread",
    blurb: "A cord from a ferryman who sat down. It keeps two hours without choosing one.",
    slot: "accessory",
    speed: 2,
    defense: 1,
    price: 0,
  },
  "accessory.risk_splice": {
    id: "accessory.risk_splice",
    name: "Hot Splice",
    blurb: "A bit of Sera's risky line. It makes a step quicker. It does not make the noon kinder.",
    slot: "accessory",
    speed: 2,
    price: 0,
  },
  "accessory.stay_pin": {
    id: "accessory.stay_pin",
    name: "Stay Pin",
    blurb: "From the safer lash. It keeps a rib a little quieter. It does not pick a noon.",
    slot: "accessory",
    defense: 2,
    price: 0,
  },
  "weapon.gale_hook": {
    id: "weapon.gale_hook",
    name: "Gale Hook",
    blurb: "A skywright's hook that decided to be a weapon. It likes Sera's hand.",
    slot: "weapon",
    attack: 7,
    price: 0,
  },
  "accessory.early_thread": {
    id: "accessory.early_thread",
    name: "Early Thread",
    blurb: "A cord from a gale that sat down. It keeps two noons without choosing one.",
    slot: "accessory",
    speed: 2,
    defense: 1,
    price: 0,
  },
  "accessory.beside_clasp": {
    id: "accessory.beside_clasp",
    name: "Beside Clasp",
    blurb: "Mira set the early strike next to the tenth. The first line was not sanded down.",
    slot: "accessory",
    defense: 1,
    mp: 3,
    price: 0,
  },
  "accessory.closed_page": {
    id: "accessory.closed_page",
    name: "Closed Page",
    blurb: "The book shut. The tenth stayed the one you wrote. The early line did not get a chair.",
    slot: "accessory",
    defense: 1,
    speed: 1,
    price: 0,
  },
  "accessory.quiet_clasp": {
    id: "accessory.quiet_clasp",
    name: "Quiet Clasp",
    blurb: "Mira left the early line unwritten too. The blank was a choice, made twice.",
    slot: "accessory",
    mp: 5,
    price: 0,
  },
  "accessory.late_ink": {
    id: "accessory.late_ink",
    name: "Late Ink",
    blurb: "Written now, not then. The blank was for the tenth. This hour is a different rudeness.",
    slot: "accessory",
    speed: 2,
    mp: 2,
    price: 0,
  },
  "accessory.early_lash": {
    id: "accessory.early_lash",
    name: "Early Lash",
    blurb: "The knot that predates the morning, cut out and kept where Sera can see the honesty.",
    slot: "accessory",
    speed: 2,
    price: 0,
  },
  "accessory.second_stay": {
    id: "accessory.second_stay",
    name: "Second Stay",
    blurb: "A slower lash over a line that was already finished. Careful, and not a denial.",
    slot: "accessory",
    defense: 2,
    price: 0,
  },
  "accessory.blank_thread": {
    id: "accessory.blank_thread",
    name: "Blank Thread",
    blurb: "From an hour that was asked to stay unwritten. It keeps a page blank on purpose.",
    slot: "accessory",
    defense: 2,
    mp: 3,
    price: 0,
  },
  "accessory.hour_thread": {
    id: "accessory.hour_thread",
    name: "Hour Thread",
    blurb: "From a page that was finished. It is quicker. It does not explain the shadow.",
    slot: "accessory",
    attack: 2,
    speed: 1,
    price: 0,
  },
};

export const SHOP_IDS = ["weapon.glass_needle", "weapon.oath_blade", "armor.lantern_coat", "armor.pine_mail", "item.lantern_salve", "item.dew_vial"] as const;

export const GROWTH: Record<string, { hp: number; mp: number; attack: number; defense: number }> = {
  wanderer: { hp: 8, mp: 3, attack: 2, defense: 1 },
  mira: { hp: 5, mp: 5, attack: 1, defense: 1 },
  kael: { hp: 10, mp: 2, attack: 2, defense: 2 },
  nessa: { hp: 7, mp: 4, attack: 2, defense: 1 },
  sera: { hp: 6, mp: 4, attack: 2, defense: 1 },
  iri: { hp: 6, mp: 5, attack: 1, defense: 1 },
};

export function levelForXp(xp: number): number {
  return Math.min(8, 3 + Math.floor(Math.max(0, xp) / 45));
}

export function syncLevels(save: SaveGame): SaveGame {
  const target = levelForXp(save.xp);
  for (const id of [...save.party, ...(save.reserve ?? [])]) {
    const c = save.roster[id];
    const g = GROWTH[id];
    if (!c || !g) continue;
    while (c.level < target) {
      c.level += 1;
      c.maxHp += g.hp;
      c.hp += g.hp;
      c.maxMp += g.mp;
      c.mp += g.mp;
      c.attack += g.attack;
      c.defense += g.defense;
    }
  }
  return save;
}

export function withGear(base: CombatantState, load?: EquipLoadout): CombatantState {
  const next = structuredClone(base);
  for (const id of [load?.weapon, load?.armor, load?.accessory]) {
    if (!id) continue;
    const g = GEAR[id];
    if (!g) continue;
    next.attack += g.attack ?? 0;
    next.defense += g.defense ?? 0;
    next.speed += g.speed ?? 0;
    next.maxMp += g.mp ?? 0;
    next.mp += g.mp ?? 0;
  }
  return next;
}

/** Person-specific gear. Applied to the battle copy only, never baked into the roster. */
export function applySynergy(save: SaveGame, id: string, attack: number, speed: number, maxMp: number, mp: number, jobId: string) {
  const load = save.equipment?.[id];
  let a = attack;
  let s = speed;
  if (id === "wanderer" && jobId === "job.elementalist" && load?.weapon === "weapon.glass_needle") a += 2;
  if (id === "wanderer" && jobId === "job.riverward" && load?.weapon === "weapon.river_hook") a += 3;
  if (id === "kael" && load?.weapon === "weapon.oath_blade") a += 2;
  if (id === "nessa" && load?.accessory === "accessory.reed_loop") s += 1;
  if (id === "sera" && load?.weapon === "weapon.gale_hook") a += 3;
  return { attack: a, speed: s, maxMp, mp: Math.min(mp, maxMp) };
}

export function prepareForBattle(save: SaveGame, id: string): CombatantState {
  const raw = save.roster[id];
  if (!raw) throw new Error(`No such ally ${id}`);
  const geared = withGear(raw, save.equipment[id]);
  const tuned = applySynergy(save, id, geared.attack, geared.speed, geared.maxMp, geared.mp, geared.jobId);
  geared.attack = tuned.attack;
  geared.speed = tuned.speed;
  geared.maxMp = tuned.maxMp;
  geared.mp = tuned.mp;
  const ranks: Record<string, number> = {};
  const known = new Set([...(save.knownSpells[id] ?? [])]);
  for (const [abilityId, casts] of Object.entries(save.spellMastery)) {
    if (!known.size || known.has(abilityId) || casts > 0) {
      const rank = Math.floor(casts / 3);
      if (rank > 0) ranks[abilityId] = rank;
    }
  }
  geared.spellRanks = ranks;
  geared.knownAbilities = [
    ...new Set([...(CHARACTERS[id]?.abilities ?? []), ...(save.knownSpells[id] ?? []), "atk.strike", "act.defend", "act.dodge"]),
  ];
  return geared;
}

export function buyItem(save: SaveGame, itemId: string): { ok: true; save: SaveGame } | { ok: false; reason: string } {
  const gear = GEAR[itemId];
  const price = gear?.price ?? (itemId === "item.lantern_salve" ? 12 : itemId === "item.dew_vial" ? 15 : 0);
  if (!price) return { ok: false, reason: "Bram will not sell that." };
  if (save.gold < price) return { ok: false, reason: "That is more gold than the purse admits." };
  const next = structuredClone(save);
  next.gold -= price;
  const slot = next.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else next.inventory.push({ itemId, qty: 1 });
  return { ok: true, save: next };
}

export function equipItem(save: SaveGame, who: string, itemId: string): SaveGame | null {
  const gear = GEAR[itemId];
  if (!gear || !save.roster[who]) return null;
  const slot = save.inventory.find((s) => s.itemId === itemId && s.qty > 0);
  if (!slot) return null;
  const next = structuredClone(save);
  const held = next.inventory.find((s) => s.itemId === itemId);
  if (!held || held.qty <= 0) return null;
  held.qty -= 1;
  const load = next.equipment[who] ?? {};
  const previous = load[gear.slot];
  if (previous) {
    const back = next.inventory.find((s) => s.itemId === previous);
    if (back) back.qty += 1;
    else next.inventory.push({ itemId: previous, qty: 1 });
  }
  load[gear.slot] = itemId;
  next.equipment[who] = load;
  return next;
}

export function restParty(save: SaveGame): { ok: true; save: SaveGame } | { ok: false; reason: string } {
  const cost = 8;
  if (save.gold < cost) return { ok: false, reason: "A night at the Wick is eight gold. The benches outside are free and unpopular." };
  const next = structuredClone(save);
  next.gold -= cost;
  next.sightCharges = 3;
  for (const id of next.party) {
    const c = next.roster[id];
    if (!c) continue;
    c.hp = c.maxHp;
    c.mp = c.maxMp;
    c.alive = true;
  }
  return { ok: true, save: next };
}

export function useSight(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.temporal_sight"]) return { ok: false, reason: "The sight is not awake." };
  if (save.sightCharges <= 0) return { ok: false, reason: "The sight is tired. Sleep at the Ninth Wick." };
  const next = structuredClone(save);
  next.sightCharges -= 1;
  const scene = beginSight(next) ?? beginSkySight(next) ?? beginHourSight(next);
  if (scene) return { ok: true, save: scene.save, text: scene.text };
  let text = "For a breath the room is half a step ahead of itself. Nothing hidden keeps.";
  const note = (id: string, line: string) => {
    if (!next.discoveries.includes(id)) next.discoveries.push(id);
    next.flags[id] = true;
    text = line;
    if (!next.journal.includes(line)) next.journal.push(line);
  };
  if (next.mapId === "map.vale") note("flag.sight_clock", "Under the clock, a stone sits wrong. It is warm, and it is not a door.");
  else if (next.mapId === "map.reach") note("flag.sight_cache", "West of the hymn stone the moss is lying. Something small is underneath.");
  else if (next.mapId === "map.barrow") note("flag.sight_barrow", "The left root was not always a root. A cache waits behind it.");
  else if (next.mapId === "map.shrine") note("flag.sight_shrine", "The floor inscription flickers. Your name stays. The date does not finish forming.");
  return { ok: true, save: next, text };
}

export function learnElementalist(save: SaveGame): SaveGame {
  if (
    save.jobsUnlocked.includes("job.elementalist") &&
    save.knownSpells["wanderer"]?.includes("spell.flare")
  ) {
    return save;
  }
  const next = structuredClone(save);
  if (!next.jobsUnlocked.includes("job.elementalist")) next.jobsUnlocked.push("job.elementalist");
  if (next.roster["wanderer"]) next.roster["wanderer"].jobId = "job.elementalist";
  next.knownSpells["wanderer"] = spellsForJob("job.elementalist", next.earnedSpells ?? []);
  if (!next.choiceLog.some((c) => c.id === "job.wanderer")) {
    next.choiceLog.push({ id: "job.wanderer", value: "elementalist" });
  }
  if (!next.journal.some((line) => line.includes("Elementalist"))) {
    next.journal.push("The conduits left a second trade in your hands: Elementalist. Flare is yours.");
  }
  return next;
}
