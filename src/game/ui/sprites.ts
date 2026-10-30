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
  "battle-vale.jpg",
  "battle-woods.jpg",
  "battle-shrine.jpg",
  "battle-mist.jpg",
  "battle-ridge.jpg",
  "battle-margin.jpg",
  "battle-ascent.jpg",
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
  if (who.includes("iri")) {
    const veil = "hue-rotate(250deg) saturate(1.35) brightness(1.05)";
    const merged = filter === "none" ? veil : `${veil} ${filter}`;
    return { file: "wanderer.png", cols: 4, rows: 4, col, row, filter: merged };
  }
  if (who.includes("lark")) {
    return { file: "villagers.png", cols: 3, rows: 3, col: 2, row: 1, filter: "hue-rotate(78deg) saturate(1.2)" };
  }
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
  if (jobId === "enemy.hourkeeper") return { col: 2, row: 1, big: true };
  if (jobId === "enemy.inkling") return { col: 1, row: 0, big: false };
  if (jobId === "enemy.gustling" || jobId === "enemy.ashkite") return { col: 1, row: 2, big: false };
  if (jobId === "enemy.perch") return { col: 1, row: 2, big: true };
  if (jobId === "enemy.oathwing") return { col: 2, row: 1, big: true };
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
  if (id.includes("lark")) return "lark";
  if (id.includes("wren")) return "wren";
  if (id.includes("ada")) return "ada";
  if (id.includes("orrin")) return "orrin";
  if (id.includes("iri")) return "iri";
  if (id.includes("brant")) return "bram";
  if (id.includes("pemma")) return "lira";
  return null;
}

export function groundKind(mapId: string, x: number, y: number, path: boolean, tick: number, reduced: boolean): number {
  const j = tileJitter(x, y);
  const n = j > 0.58 ? 1 : 0;
  const water = !reduced && Math.floor(tick / 8) % 2 === 1 ? 9 : 8;
  if (mapId === "map.lowbell" && y >= 8) return water;
  if (mapId === "map.ferry" && y >= 9) return water;
  if (mapId === "map.hold" && y >= 6) return water;
  if (mapId === "map.vale") {
    if (!path && j > 0.84) return 11;
    if (!path && j < 0.07) return 2;
    if (x <= 2 || y >= 12) return j > 0.5 ? 4 : 3;
    if (path && j > 0.82) return 2;
    return n;
  }
  if (mapId === "map.inn" || mapId === "map.smith") return j > 0.72 ? 2 : 5;
  if (mapId === "map.woods" || mapId === "map.reach") return path ? (j > 0.66 ? 1 : 2) : j > 0.55 ? 4 : 3;
  if (mapId === "map.barrow" || mapId === "map.cave") return j > 0.7 ? 7 : 2;
  if (mapId === "map.shrine" || mapId === "map.glass") return j > 0.78 ? 7 : 6;
  if (mapId === "map.ridge" || mapId === "map.highroad" || mapId === "map.berth" || mapId === "map.margin") return j > 0.74 ? 1 : 7;
  if (mapId === "map.deck") return j > 0.55 ? 5 : 2;
  if (mapId === "map.cinder" || mapId === "map.ashvault" || mapId === "map.beacon") return j > 0.62 ? 7 : 2;
  if (mapId === "map.lowbell" || mapId === "map.ferry" || mapId === "map.hold") return path ? (j > 0.6 ? 1 : 7) : j > 0.5 ? 2 : 7;
  return path ? (j > 0.5 ? 1 : 2) : j > 0.5 ? 4 : 3;
}

/** Deterministic 0..1 break-up so neighboring tiles are not a checker. */
export function tileJitter(x: number, y: number): number {
  const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
  return n - Math.floor(n);
}

export function battleArt(encounterId: string, ascension: boolean): string {
  if (ascension) return "battle-ascent.jpg";
  if (encounterId === "enc.woods" || encounterId === "enc.thicket" || encounterId === "enc.cantor") return "battle-woods.jpg";
  if (encounterId === "enc.warden") return "battle-shrine.jpg";
  if (encounterId === "enc.ferryman" || encounterId === "enc.crossing" || encounterId === "enc.vault") return "battle-mist.jpg";
  if (encounterId === "enc.galekeeper" || encounterId === "enc.gust") return "battle-ridge.jpg";
  if (encounterId === "enc.hourkeeper" || encounterId === "enc.ink") return "battle-margin.jpg";
  if (encounterId === "enc.ashkite" || encounterId === "enc.perch") return "battle-ridge.jpg";
  if (encounterId === "enc.oathwing") return "battle-ascent.jpg";
  return "battle-vale.jpg";
}

export type ElementTone = "fire" | "water" | "wind" | "life" | "steel" | "arcane";

/** Display tint only. The combat core still decides the numbers. */
export function elementOf(abilityId?: string): { tone: ElementTone; color: string } {
  const id = abilityId ?? "";
  if (/ember|solar|fire/.test(id)) return { tone: "fire", color: "#e07a3a" };
  if (/tide|wake|river|mist|dew|spring/.test(id)) return { tone: "water", color: "#4ec8c0" };
  if (/vow_rake|beacon_flare|oathwing/.test(id)) return { tone: "fire", color: "#e07a3a" };
  if (/broken_record/.test(id)) return { tone: "steel", color: "#c8bba8" };
  if (/shear_line|gust|gale|crosswind|wind|bell_hour|sky_lance|dragoon|falling_star|perch/.test(id)) return { tone: "wind", color: "#d7e4f2" };
  if (/ink|seam|folded|shadow|veil/.test(id)) return { tone: "arcane", color: "#8b6bb8" };
  if (/mend|heal|salve|resin|hymn/.test(id)) return { tone: "life", color: "#8fce6a" };
  if (/strike|oath|namedguard|knife|lash|cut/.test(id)) return { tone: "steel", color: "#f3e6c8" };
  return { tone: "arcane", color: "#c8b0e8" };
}

export function portraitMood(text: string): string {
  const t = text.toLowerCase();
  if (/sorry|afraid|wrong|hurt|fall|wait|smudge|flicker|quiet/.test(t)) return "brightness(0.82) saturate(0.75)";
  if (/glad|oath|lead|laugh|festival|remember|kind|yes/.test(t)) return "saturate(1.3) brightness(1.06)";
  return "none";
}

/** Where a follow camera looks. Does not move the walker or the collision grid. */
export function cameraOrigin(tileX: number, tileY: number, width: number, height: number): { x: number; y: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return {
    x: Math.min(1, Math.max(0, (tileX + 0.5) / w)),
    y: Math.min(1, Math.max(0, (tileY + 0.5) / h)),
  };
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
