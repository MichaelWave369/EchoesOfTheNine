/**
 * Presentation only. The integer tile in the chronicle is still the one that
 * collides, talks, and starts a fight. Nothing here is saved.
 */

export type StepKind = "cobble" | "grass" | "wood" | "stone" | "water";

export function glide(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = Math.min(1, Math.max(0, t));
  const e = u * u * (3 - 2 * u);
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
}

/** Which footfall to play. Does not change the tile. */
export function stepKind(mapId: string, x: number, y: number): StepKind {
  if (mapId === "map.woods" || mapId === "map.reach" || mapId === "map.barrow") return "grass";
  if (mapId === "map.inn" || mapId === "map.smith") return "wood";
  if (mapId === "map.shrine" || mapId === "map.ridge" || mapId === "map.glass" || mapId === "map.highroad" || mapId === "map.cave" || mapId === "map.berth" || mapId === "map.margin" || mapId === "map.ashvault") return "stone";
  if (mapId === "map.deck") return "wood";
  if (mapId === "map.cinder") return "stone";
  if ((mapId === "map.lowbell" && y >= 8) || (mapId === "map.ferry" && y >= 9) || (mapId === "map.hold" && y >= 6)) return "water";
  if (mapId === "map.vale" && (x <= 2 || y >= 12)) return "grass";
  return "cobble";
}

export function commandReach(width: number): "compact" | "full" {
  return width < 420 ? "compact" : "full";
}

/** How many characters of a line to show. A click may pass the full length. */
export function revealedCount(length: number, step: number, skip: boolean): number {
  if (skip || length <= 0) return Math.max(0, length);
  return Math.max(0, Math.min(length, step));
}

type Loop = { id: string; who: string; tiles: readonly (readonly [number, number])[] };

/** Ortho walks on open Vale tiles. Not hotspots, not the festival trigger, not the spawn. */
export const FESTIVAL_LOOPS: readonly Loop[] = [
  { id: "keeper", who: "salla", tiles: [[6, 8], [5, 8], [5, 9], [6, 9]] },
  { id: "clock", who: "hale", tiles: [[8, 4], [7, 4], [7, 5], [8, 5]] },
  { id: "stall", who: "ivo", tiles: [[15, 11], [14, 11], [14, 12], [15, 12]] },
  { id: "bunting", who: "tamsin", tiles: [[13, 6], [14, 6], [15, 6], [15, 5], [14, 5], [13, 5]] },
];

const RESERVED = new Set([
  "6,6", "12,5", "10,3", "11,3", "4,7", "14,7", "7,10", "19,6", "8,8", "11,9", "9,5", "4,6", "16,10", "11,4", "10,8",
]);

const STEP = 18;

export type Breath = {
  id: string;
  who: string;
  x: number;
  y: number;
  facing: "n" | "s" | "e" | "w";
  moving: boolean;
};

function face(ax: number, ay: number, bx: number, by: number): Breath["facing"] {
  if (bx > ax) return "e";
  if (bx < ax) return "w";
  if (by > ay) return "s";
  return "n";
}

export function festivalBreath(tick: number, reduced: boolean, hero?: { x: number; y: number }): Breath[] {
  return FESTIVAL_LOOPS.map((loop) => {
    const first = loop.tiles[0]!;
    if (reduced) {
      return { id: loop.id, who: loop.who, x: first[0], y: first[1], facing: "s", moving: false };
    }
    const n = loop.tiles.length;
    const span = n * STEP;
    const t = ((Math.floor(tick) % span) + span) % span;
    const i = Math.floor(t / STEP) % n;
    const f = (t % STEP) / STEP;
    const a = loop.tiles[i]!;
    const b = loop.tiles[(i + 1) % n]!;
    let x = a[0] + (b[0] - a[0]) * f;
    let y = a[1] + (b[1] - a[1]) * f;
    let facing = face(a[0], a[1], b[0], b[1]);
    let moving = f > 0.05;
    if (hero && Math.abs(hero.x - x) + Math.abs(hero.y - y) < 1.35) {
      x = a[0];
      y = a[1];
      moving = false;
      facing = face(x, y, hero.x, hero.y);
    }
    return { id: loop.id, who: loop.who, x, y, facing, moving };
  });
}

export function festivalRoutesAreClear(blocked: (x: number, y: number) => boolean): boolean {
  for (const loop of FESTIVAL_LOOPS) {
    for (let i = 0; i < loop.tiles.length; i++) {
      const a = loop.tiles[i]!;
      const b = loop.tiles[(i + 1) % loop.tiles.length]!;
      if (blocked(a[0], a[1])) return false;
      if (RESERVED.has(`${a[0]},${a[1]}`)) return false;
      if (a[0] >= 8 && a[0] <= 12 && a[1] >= 7 && a[1] <= 9) return false;
      const hop = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      if (hop !== 1) return false;
    }
  }
  return FESTIVAL_LOOPS.length > 0;
}
