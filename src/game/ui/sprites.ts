/**
 * Living Canvas frames. Presentation only: no damage, flags, or saves.
 * Sheets in public/game/art are original Φ369 Labs art. See ASSETS.md.
 */

import type { WandererAppearance } from "../contracts.ts";

export const ART_FILES = [
  "tiles.png",
  "wanderer.png",
  "mira.png",
  "kael.png",
  "nessa.png",
  "sera.png",
  "villagers.png",
  "foes.png",
  "clock.png",
  "house.png",
  "stall.png",
  "well.png",
  "lantern.png",
  "pine.png",
  "skiff.png",
  "vale-night.jpg",
] as const;

export type Pose = "idle" | "walk" | "attack" | "cast" | "hurt" | "victory";

export type Frame = {
  file: string;
  cols: number;
  rows: number;
  col: number;
  row: number;
  filter: string;
};

const VILLAGER: Record<string, [number, number]> = {
  lira: [0, 0],
  salla: [0, 0],
  nim: [1, 0],
  pim: [2, 0],
  voss: [0, 1],
  bram: [1, 1],
  ivo: [2, 1],
  hale: [0, 2],
  tamsin: [1, 2],
  pell: [2, 2],
  wren: [0, 2],
  ada: [1, 2],
  orrin: [0, 1],
};

const cache = new Map<string, HTMLImageElement>();

export function artUrl(file: string): string {
  let base = "/";
  try {
    const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
    if (env?.BASE_URL) base = env.BASE_URL;
  } catch {
    base = "/";
  }
  if (!base.endsWith("/")) base += "/";
  return `${base}game/art/${file}`;
}

export function warmArt(): void {
  for (const file of ART_FILES) imageReady(file);
}

export function imageReady(file: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = cache.get(file);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = artUrl(file);
    cache.set(file, img);
  }
  return img.complete && img.naturalWidth > 1 ? img : null;
}

export function appearanceFilter(id: string | undefined): string {
  if (id === "festival") return "hue-rotate(-32deg) saturate(1.45)";
  if (id === "river") return "hue-rotate(128deg) saturate(1.2)";
  if (id === "ridge") return "hue-rotate(28deg) saturate(0.55) brightness(1.18)";
  return "none";
}

export function frameFor(
  id: string,
  facing: string,
  tick: number,
  reduced: boolean,
  pose: Pose,
  moving: boolean,
  appearance?: string,
): Frame | null {
  const who = id.toLowerCase();
  let col = 0;
  if (pose === "attack") col = 1;
  else if (pose === "hurt") col = 3;
  else if (pose === "victory" && !reduced) col = (Math.floor(tick / 6) % 2) * 2;
  else if ((pose === "walk" || moving) && !reduced && pose !== "cast") col = Math.floor(tick / 3) % 4;
  const row = facing === "w" ? 1 : facing === "e" ? 2 : facing === "n" ? 3 : 0;
  let filter = "none";
  if (pose === "hurt") filter = "brightness(1.7)";
  if (who.includes("mira")) return { file: "mira.png", cols: 4, rows: 4, col, row, filter };
  if (who.includes("kael")) return { file: "kael.png", cols: 4, rows: 4, col, row, filter };
  if (who.includes("nessa")) return { file: "nessa.png", cols: 4, rows: 4, col, row, filter };
  if (who.includes("sera")) return { file: "sera.png", cols: 4, rows: 4, col, row, filter };
  if (who.includes("wanderer")) {
    const dye = appearanceFilter(appearance);
    const merged = dye === "none" ? filter : filter === "none" ? dye : `${dye} ${filter}`;
    return { file: "wanderer.png", cols: 4, rows: 4, col, row, filter: merged };
  }
  for (const key of Object.keys(VILLAGER)) {
    if (who.includes(key)) {
      const cell = VILLAGER[key]!;
      return { file: "villagers.png", cols: 3, rows: 3, col: cell[0], row: cell[1], filter };
    }
  }
  return null;
}

export function portraitSpec(name: string, appearance?: WandererAppearance | string): Frame {
  if (appearance) {
    return {
      file: "wanderer.png",
      cols: 4,
      rows: 4,
      col: 0,
      row: 0,
      filter: appearanceFilter(appearance),
    };
  }
  return (
    frameFor(name, "s", 0, true, "idle", false) ?? {
      file: "lantern.png",
      cols: 1,
      rows: 1,
      col: 0,
      row: 0,
      filter: "none",
    }
  );
}

export function foeFrame(jobId: string): { col: number; row: number; big: boolean } {
  if (jobId === "enemy.warden") return { col: 2, row: 0, big: true };
  if (jobId === "enemy.cantor") return { col: 0, row: 1, big: true };
  if (jobId === "enemy.briarling") return { col: 1, row: 1, big: false };
  if (jobId === "enemy.galekeeper") return { col: 2, row: 1, big: true };
  if (jobId === "enemy.gustling") return { col: 1, row: 2, big: false };
  if (jobId === "enemy.mistling") return { col: 0, row: 2, big: false };
  if (jobId === "enemy.ferryman") return { col: 2, row: 2, big: true };
  if (jobId === "enemy.glowmoth" || jobId === "enemy.driftlantern") return { col: 0, row: 0, big: false };
  if (jobId === "enemy.shardling") return { col: 2, row: 0, big: false };
  return { col: 1, row: 0, big: false };
}

/** Which villager or companion stands on a hotspot. Null for signs, doors, and fights. */
export function hotspotActor(id: string): string | null {
  if (/shelf|clock|sign|puzzle|battle|item|exit|save|skiff/.test(id)) return null;
  if (id.includes("mira")) return "mira";
  if (id.includes("kael")) return "kael";
  if (id.includes("nessa")) return "nessa";
  if (id.includes("sera")) return "sera";
  if (id.includes("lira")) return "lira";
  if (id.includes("salla")) return "salla";
  if (id.includes("child")) return "nim";
  if (id.includes("baker")) return "pim";
  if (id.includes("voss")) return "voss";
  if (id.includes("bram")) return "bram";
  if (id.includes("ivo")) return "ivo";
  if (id.includes("hale")) return "hale";
  if (id.includes("tamsin")) return "tamsin";
  if (id.includes("pell")) return "pell";
  if (id.includes("wren")) return "wren";
  if (id.includes("ada")) return "ada";
  if (id.includes("orrin")) return "orrin";
  return null;
}

export function groundKind(mapId: string, x: number, y: number, path: boolean, tick: number, reduced: boolean): number {
  const n = (x * 3 + y * 5) % 2;
  const water = !reduced && Math.floor(tick / 8) % 2 === 1 ? 9 : 8;
  if (mapId === "map.lowbell" && y >= 8) return water;
  if (mapId === "map.ferry" && y >= 9) return water;
  if (mapId === "map.hold" && y >= 6) return water;
  if (mapId === "map.vale") {
    if (!path && (x + y) % 11 === 0) return 11;
    if (x <= 2 || y >= 12) return 3 + n;
    return n;
  }
  if (mapId === "map.inn" || mapId === "map.smith") return 5;
  if (mapId === "map.woods" || mapId === "map.reach") return path ? 2 : 3 + n;
  if (mapId === "map.barrow" || mapId === "map.cave") return 2;
  if (mapId === "map.shrine" || mapId === "map.glass") return 6;
  if (mapId === "map.ridge" || mapId === "map.highroad" || mapId === "map.berth") return 7;
  if (mapId === "map.lowbell" || mapId === "map.ferry" || mapId === "map.hold") return path ? 7 : 2;
  return path ? 2 : 3;
}

export function blit(
  ctx: CanvasRenderingContext2D,
  file: string,
  col: number,
  row: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  filter = "none",
): boolean {
  const img = imageReady(file);
  if (!img) return false;
  const sw = img.width / cols;
  const sh = img.height / rows;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (filter && filter !== "none") ctx.filter = filter;
  ctx.drawImage(img, Math.floor(col * sw), Math.floor(row * sh), Math.floor(sw), Math.floor(sh), dx, dy, dw, dh);
  ctx.restore();
  return true;
}
