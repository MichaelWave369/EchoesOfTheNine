/**
 * Presentation only. No damage, no flags, no saves.
 * Future chapters: add a RegionLook and a landmark painter. Do not invent tiles
 * that change which squares can be walked. Collision stays in GameApp.
 * Living Canvas frames live in sprites.ts. If a sheet has not loaded, the
 * geometric fallback still draws.
 */

import {
  battleArt,
  blit,
  elementOf,
  foeFrame,
  frameFor,
  groundKind,
  hotspotActor,
  imageReady,
  type Pose,
} from "./sprites.ts";
import { festivalBreath } from "./breath.ts";

export const TILE = 48;

export type RegionLook = {
  skyTop: string;
  skyBottom: string;
  ground: [string, string];
  path: string;
  wall: string;
  wallCap: string;
  accent: string;
  water: string | null;
  /** Short public note for the art bible. No late-chronicle words. */
  note: string;
};

const LOOKS: Record<string, RegionLook> = {
  "map.vale": {
    skyTop: "#241838",
    skyBottom: "#120c14",
    ground: ["#4a3424", "#3c2a1e"],
    path: "#6a5040",
    wall: "#1a120e",
    wallCap: "#3a2a22",
    accent: "#e8b15a",
    water: null,
    note: "Night festival. Lanterns, clock, warm windows.",
  },
  "map.woods": {
    skyTop: "#142018",
    skyBottom: "#0c140e",
    ground: ["#243222", "#1c2a1a"],
    path: "#3a4a30",
    wall: "#101810",
    wallCap: "#2a3824",
    accent: "#7ec8c0",
    water: null,
    note: "Glasspine. Dark trees, crystal tips.",
  },
  "map.shrine": {
    skyTop: "#241830",
    skyBottom: "#120e16",
    ground: ["#3a3044", "#322838"],
    path: "#4a4060",
    wall: "#16121c",
    wallCap: "#3a3048",
    accent: "#8b6bb8",
    water: null,
    note: "Sacred stone and a teal ring.",
  },
  "map.inn": {
    skyTop: "#2a1a16",
    skyBottom: "#140e0c",
    ground: ["#4a3024", "#3a261c"],
    path: "#5a4034",
    wall: "#1a120e",
    wallCap: "#4a3028",
    accent: "#e8b15a",
    water: null,
    note: "The Wick. Lamps and wood.",
  },
  "map.smith": {
    skyTop: "#2a1a16",
    skyBottom: "#140e0c",
    ground: ["#3e2a22", "#322218"],
    path: "#4a3428",
    wall: "#1a120e",
    wallCap: "#3a2820",
    accent: "#e06a5c",
    water: null,
    note: "Bram's forge. Heat, not glare.",
  },
  "map.reach": {
    skyTop: "#1a2414",
    skyBottom: "#0c140e",
    ground: ["#243018", "#1a2814"],
    path: "#3a4a28",
    wall: "#101810",
    wallCap: "#2a381c",
    accent: "#7d9a62",
    water: null,
    note: "Old growth and moss.",
  },
  "map.barrow": {
    skyTop: "#1a140e",
    skyBottom: "#0c0a08",
    ground: ["#2a2218", "#221c14"],
    path: "#3a3024",
    wall: "#100e0c",
    wallCap: "#2a2218",
    accent: "#6a8f4a",
    water: null,
    note: "A mound and a shut song.",
  },
  "map.lowbell": {
    skyTop: "#1a2428",
    skyBottom: "#121816",
    ground: ["#3e3830", "#343028"],
    path: "#5a5044",
    wall: "#161410",
    wallCap: "#3a342c",
    accent: "#c9a36a",
    water: "#16343c",
    note: "River trade, a bell, worn docks.",
  },
  "map.ferry": {
    skyTop: "#1c2428",
    skyBottom: "#12181c",
    ground: ["#3a4038", "#2e3834"],
    path: "#4a5048",
    wall: "#141816",
    wallCap: "#2e3834",
    accent: "#8fb8b0",
    water: "#102830",
    note: "Fog and still water.",
  },
  "map.hold": {
    skyTop: "#101820",
    skyBottom: "#0c1014",
    ground: ["#1c2428", "#141c20"],
    path: "#243038",
    wall: "#0c1014",
    wallCap: "#1c2830",
    accent: "#4ec8c0",
    water: "#0c1c24",
    note: "Flooded stair, lanterns.",
  },
  "map.highroad": {
    skyTop: "#2a3340",
    skyBottom: "#1a2018",
    ground: ["#4a463c", "#3e3a32"],
    path: "#6a6458",
    wall: "#1a1814",
    wallCap: "#3a3830",
    accent: "#d7c4a3",
    water: null,
    note: "The stair above the mist.",
  },
  "map.ridge": {
    skyTop: "#3a4a62",
    skyBottom: "#243040",
    ground: ["#5a5044", "#463e34"],
    path: "#7a6e60",
    wall: "#1c1814",
    wallCap: "#4a4034",
    accent: "#e8b15a",
    water: null,
    note: "Height, mill, rope, open stone.",
  },
  "map.glass": {
    skyTop: "#2a2450",
    skyBottom: "#161428",
    ground: ["#3a3450", "#2c2840"],
    path: "#4a4468",
    wall: "#12101c",
    wallCap: "#2a2844",
    accent: "#8b6bb8",
    water: null,
    note: "Observatory violet.",
  },
  "map.cave": {
    skyTop: "#14110e",
    skyBottom: "#0c0a08",
    ground: ["#241e18", "#16120e"],
    path: "#322820",
    wall: "#0c0a08",
    wallCap: "#2a2218",
    accent: "#e8b15a",
    water: null,
    note: "A pocket that keeps a shine.",
  },
  "map.berth": {
    skyTop: "#3a4a58",
    skyBottom: "#1e2830",
    ground: ["#4a4844", "#3a3834"],
    path: "#6a6860",
    wall: "#161614",
    wallCap: "#3a3834",
    accent: "#c8bba8",
    water: null,
    note: "A pad and a hull.",
  },
  "map.margin": {
    skyTop: "#2a1840",
    skyBottom: "#140e18",
    ground: ["#3a2c38", "#2a2030"],
    path: "#5a4838",
    wall: "#120c14",
    wallCap: "#3a2848",
    accent: "#c8b8e8",
    water: "#1a2830",
    note: "Paper, ink, and a well under a dock.",
  },
  "map.deck": {
    skyTop: "#243044",
    skyBottom: "#141820",
    ground: ["#6a5040", "#4a382c"],
    path: "#8a6848",
    wall: "#1a140e",
    wallCap: "#5a4030",
    accent: "#e8b15a",
    water: null,
    note: "A wooden deck, a wheel, a bunk, and a chart.",
  },
  "map.cinder": {
    skyTop: "#1c3048",
    skyBottom: "#101820",
    ground: ["#5a4038", "#2e2428"],
    path: "#7a5848",
    wall: "#140e10",
    wallCap: "#3a2a30",
    accent: "#7eb6d6",
    water: null,
    note: "Ash under a cold blue. A watch, a perch, and a stair that is not the way home.",
  },
  "map.ashvault": {
    skyTop: "#100e14",
    skyBottom: "#0c0a10",
    ground: ["#2a2228", "#161216"],
    path: "#3a3034",
    wall: "#0a080c",
    wallCap: "#3a2830",
    accent: "#c45a32",
    water: null,
    note: "A short stair and a cold nick.",
  },
};

export function regionLook(mapId: string): RegionLook {
  return LOOKS[mapId] ?? LOOKS["map.vale"]!;
}

export const PUBLIC_ART_NOTES = Object.values(LOOKS).map((look) => look.note);

type Hotspot = { id: string; x: number; y: number; label: string; kind: string };

export function paintExploration(
  ctx: CanvasRenderingContext2D,
  opts: {
    mapId: string;
    width: number;
    height: number;
    sight: boolean;
    tick: number;
    reduced: boolean;
    pos: { x: number; y: number };
    facing: string;
    party: string[];
    hotspots: Hotspot[];
    hover: { x: number; y: number } | null;
    blocked: (x: number, y: number) => boolean;
    appearance?: string;
    moving?: boolean;
    sightSteps?: number;
    body?: { x: number; y: number };
    life?: boolean;
  },
) {
  const { mapId, width: w, height: h, sight, tick, reduced, pos, facing, party, hotspots, hover, blocked } = opts;
  const appearance = opts.appearance ?? "lantern";
  const moving = opts.moving ?? false;
  const look = regionLook(mapId);
  const sky = ctx.createLinearGradient(0, 0, 0, h * TILE);
  sky.addColorStop(0, sight ? shift(look.skyTop, 18) : look.skyTop);
  sky.addColorStop(1, look.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w * TILE, h * TILE);
  paintStars(ctx, w, h, mapId, tick, reduced);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (blocked(x, y)) paintWall(ctx, look, mapId, x, y);
      else paintFloor(ctx, look, mapId, x, y, w, h, tick, reduced);
    }
  }
  paintWater(ctx, mapId, w, h, tick, reduced);
  const living = imageReady("wanderer.png");
  if (!living || !stampReplaces(mapId)) paintLandmarks(ctx, mapId, tick, reduced, sight);
  if (living) {
    paintLiving(ctx, {
      mapId,
      tick,
      reduced,
      sight,
      pos,
      facing,
      party,
      hotspots,
      appearance,
      moving,
      blocked,
      width: w,
      height: h,
      body: opts.body,
      life: opts.life !== false,
    });
  } else {
    const trail = party.filter((id) => id !== "wanderer");
    const back = facing === "n" ? [0, 1] : facing === "s" ? [0, -1] : facing === "e" ? [-1, 0] : [1, 0];
    trail.forEach((id, i) => {
      const tx = pos.x + (back[0] ?? 0) * (i + 1);
      const ty = pos.y + (back[1] ?? 0);
      if (tx < 0 || ty < 0 || tx >= w || ty >= h || blocked(tx, ty)) return;
      paintPerson(ctx, id, tx * TILE + 24, ty * TILE + 36, facing, tick, reduced, 1);
    });
    paintPerson(ctx, "wanderer", pos.x * TILE + 24, pos.y * TILE + 36, facing, tick, reduced, 1.05, appearance, "idle", moving);
  }
  paintAmbience(ctx, mapId, w, h, tick, reduced);
  if (sight) paintSightWash(ctx, w * TILE, h * TILE, tick, reduced);
  if (sight && typeof opts.sightSteps === "number") paintSightCount(ctx, opts.sightSteps);

  for (const spot of hotspots) {
    const near = Math.max(Math.abs(spot.x - pos.x), Math.abs(spot.y - pos.y)) <= 1;
    const aimed = hover?.x === spot.x && hover?.y === spot.y;
    paintMarker(ctx, spot, near || aimed || spot.kind === "exit", tick, reduced);
  }

  const vignette = ctx.createRadialGradient((w * TILE) / 2, (h * TILE) / 2, TILE * 2, (w * TILE) / 2, (h * TILE) / 2, w * TILE);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(8,4,10,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w * TILE, h * TILE);
}

function paintSightCount(ctx: CanvasRenderingContext2D, steps: number) {
  ctx.save();
  ctx.font = "12px Source Sans 3, sans-serif";
  const label = `${steps} steps`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(8,20,22,0.82)";
  roundRect(ctx, 8, 8, tw + 16, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#4ec8c0";
  ctx.fillText(label, 16, 22);
  ctx.restore();
}

function stampReplaces(mapId: string): boolean {
  return (
    mapId === "map.vale" ||
    mapId === "map.woods" ||
    mapId === "map.reach" ||
    mapId === "map.inn" ||
    mapId === "map.smith" ||
    mapId === "map.hold" ||
    mapId === "map.berth"
  );
}

type Stamp = { file: string; x: number; y: number; w: number; h: number; col?: number; row?: number; cols?: number; rows?: number };

function stampsFor(mapId: string): Stamp[] {
  if (mapId === "map.vale") {
    return [
      { file: "house.png", x: 4, y: 5.2, w: 170, h: 156 },
      { file: "house.png", x: 16.5, y: 3.15, w: 136, h: 126 },
      { file: "clock.png", x: 11, y: 4.2, w: 96, h: 172 },
      { file: "stall.png", x: 13.7, y: 10.35, w: 110, h: 98 },
      { file: "well.png", x: 8.45, y: 8.25, w: 58, h: 68 },
      { file: "lantern.png", x: 6.15, y: 7.75, w: 34, h: 62 },
      { file: "lantern.png", x: 14.3, y: 7.75, w: 34, h: 62 },
      { file: "lantern.png", x: 10.1, y: 11.15, w: 32, h: 58 },
      { file: "pine.png", x: 1.25, y: 7.4, w: 80, h: 116 },
      { file: "pine.png", x: 18.7, y: 4.3, w: 74, h: 108 },
    ];
  }
  if (mapId === "map.woods") {
    return [
      { file: "pine.png", x: 4, y: 3.4, w: 86, h: 120 },
      { file: "pine.png", x: 6.2, y: 8.4, w: 78, h: 110 },
      { file: "pine.png", x: 15, y: 3.2, w: 90, h: 124 },
      { file: "pine.png", x: 17.2, y: 8.2, w: 80, h: 112 },
      { file: "pine.png", x: 10, y: 2.4, w: 70, h: 100 },
    ];
  }
  if (mapId === "map.shrine") {
    return [
      { file: "foes.png", x: 8.5, y: 3.6, w: 84, h: 110, col: 2, row: 0, cols: 3, rows: 3 },
      { file: "pine.png", x: 3.2, y: 6, w: 70, h: 100 },
      { file: "pine.png", x: 13, y: 6.2, w: 70, h: 100 },
    ];
  }
  if (mapId === "map.reach") {
    return [
      { file: "pine.png", x: 3, y: 3.4, w: 84, h: 118 },
      { file: "pine.png", x: 7, y: 2.6, w: 76, h: 108 },
      { file: "pine.png", x: 12.2, y: 8.4, w: 80, h: 112 },
      { file: "pine.png", x: 15, y: 3.3, w: 78, h: 110 },
      { file: "pine.png", x: 5, y: 9.2, w: 70, h: 100 },
    ];
  }
  if (mapId === "map.barrow") return [{ file: "pine.png", x: 4, y: 4.2, w: 90, h: 120 }];
  if (mapId === "map.inn") {
    return [
      { file: "lantern.png", x: 2.2, y: 2.4, w: 32, h: 56 },
      { file: "lantern.png", x: 7.2, y: 2.4, w: 32, h: 56 },
      { file: "stall.png", x: 2.4, y: 3.3, w: 78, h: 70 },
    ];
  }
  if (mapId === "map.smith") {
    return [
      { file: "stall.png", x: 3.2, y: 2.6, w: 96, h: 84 },
      { file: "lantern.png", x: 6.2, y: 2.3, w: 30, h: 54 },
    ];
  }
  if (mapId === "map.lowbell") {
    return [
      { file: "stall.png", x: 4, y: 5.2, w: 100, h: 88 },
      { file: "well.png", x: 12.4, y: 6.4, w: 54, h: 62 },
      { file: "lantern.png", x: 6, y: 5.1, w: 30, h: 54 },
      { file: "clock.png", x: 9, y: 2.4, w: 54, h: 96 },
    ];
  }
  if (mapId === "map.ferry") {
    return [
      { file: "house.png", x: 3.6, y: 3.5, w: 140, h: 120 },
      { file: "lantern.png", x: 7.2, y: 5.2, w: 30, h: 54 },
    ];
  }
  if (mapId === "map.hold") {
    return [
      { file: "lantern.png", x: 4, y: 3.2, w: 30, h: 54 },
      { file: "lantern.png", x: 8, y: 3.1, w: 30, h: 54 },
      { file: "lantern.png", x: 12, y: 3.2, w: 30, h: 54 },
    ];
  }
  if (mapId === "map.highroad") return [{ file: "lantern.png", x: 10.4, y: 3.2, w: 32, h: 58 }];
  if (mapId === "map.ridge") {
    return [
      { file: "pine.png", x: 3.4, y: 4.2, w: 80, h: 112 },
      { file: "house.png", x: 4.2, y: 3.6, w: 110, h: 96 },
      { file: "lantern.png", x: 8, y: 5.4, w: 30, h: 54 },
    ];
  }
  if (mapId === "map.glass") {
    return [{ file: "foes.png", x: 8.5, y: 2.8, w: 72, h: 96, col: 2, row: 0, cols: 3, rows: 3 }];
  }
  if (mapId === "map.cave") return [{ file: "lantern.png", x: 8.4, y: 4.4, w: 28, h: 50 }];
  if (mapId === "map.berth") return [{ file: "skiff.png", x: 7.2, y: 4.6, w: 150, h: 90 }];
  if (mapId === "map.margin") {
    return [
      { file: "skiff.png", x: 2.2, y: 3.2, w: 120, h: 72 },
      { file: "lantern.png", x: 9, y: 3.2, w: 28, h: 50 },
      { file: "lantern.png", x: 11.2, y: 4.4, w: 28, h: 50 },
    ];
  }
  if (mapId === "map.deck") {
    return [
      { file: "skiff.png", x: 5.2, y: 1.2, w: 120, h: 70 },
      { file: "lantern.png", x: 4.2, y: 3.2, w: 26, h: 46 },
      { file: "lantern.png", x: 7.4, y: 3.1, w: 24, h: 42 },
    ];
  }
  if (mapId === "map.cinder") {
    return [
      { file: "lantern.png", x: 7.1, y: 3.4, w: 28, h: 50 },
      { file: "house.png", x: 5.4, y: 2.8, w: 100, h: 84 },
      { file: "lantern.png", x: 11.2, y: 3.2, w: 24, h: 44 },
    ];
  }
  if (mapId === "map.ashvault") return [{ file: "lantern.png", x: 4.2, y: 3.2, w: 26, h: 48 }];
  return [];
}

function paintLiving(
  ctx: CanvasRenderingContext2D,
  opts: {
    mapId: string;
    tick: number;
    reduced: boolean;
    sight: boolean;
    pos: { x: number; y: number };
    facing: string;
    party: string[];
    hotspots: Hotspot[];
    appearance: string;
    moving: boolean;
    blocked: (x: number, y: number) => boolean;
    width: number;
    height: number;
    body?: { x: number; y: number };
    life?: boolean;
  },
) {
  const layers: { y: number; draw: () => void }[] = [];
  for (const stamp of stampsFor(opts.mapId)) {
    const foot = stamp.y * TILE;
    const cols = stamp.cols ?? 1;
    const rows = stamp.rows ?? 1;
    layers.push({
      y: foot,
      draw: () => {
        blit(ctx, stamp.file, stamp.col ?? 0, stamp.row ?? 0, cols, rows, stamp.x * TILE - stamp.w / 2, foot - stamp.h, stamp.w, stamp.h);
      },
    });
  }
  for (const spot of opts.hotspots) {
    const actor = hotspotActor(spot.id);
    if (!actor || opts.party.includes(actor)) continue;
    const foot = spot.y * TILE + 40;
    layers.push({
      y: foot,
      draw: () => paintPerson(ctx, actor, spot.x * TILE + 24, foot, "s", opts.tick, opts.reduced, 1),
    });
  }
  const body = opts.body ?? opts.pos;
  if (opts.mapId === "map.vale") {
    for (const extra of festivalBreath(opts.tick, opts.reduced || opts.life === false, opts.pos)) {
      const foot = extra.y * TILE + 40;
      layers.push({
        y: foot,
        draw: () => paintPerson(ctx, extra.who, extra.x * TILE + 24, foot, extra.facing, opts.tick, opts.reduced, 1, "lantern", "idle", extra.moving),
      });
    }
  }
  const back = opts.facing === "n" ? [0, 1] : opts.facing === "s" ? [0, -1] : opts.facing === "e" ? [-1, 0] : [1, 0];
  opts.party
    .filter((id) => id !== "wanderer")
    .forEach((id, i) => {
      const tx = opts.pos.x + (back[0] ?? 0) * (i + 1);
      const ty = opts.pos.y + (back[1] ?? 0);
      if (tx < 0 || ty < 0 || tx >= opts.width || ty >= opts.height || opts.blocked(tx, ty)) return;
      const foot = ty * TILE + 40;
      layers.push({
        y: foot,
        draw: () => paintPerson(ctx, id, tx * TILE + 24, foot, opts.facing, opts.tick, opts.reduced, 1, "lantern", "idle", opts.moving),
      });
    });
  const heroFoot = body.y * TILE + 40;
  layers.push({
    y: heroFoot + 0.1,
    draw: () => {
      if (opts.sight) {
        ctx.save();
        ctx.globalAlpha = 0.38;
        paintPerson(ctx, "wanderer", body.x * TILE + 36, heroFoot - 4, opts.facing, opts.tick, true, 1.05, opts.appearance, "idle", false);
        ctx.restore();
      }
      paintPerson(ctx, "wanderer", body.x * TILE + 24, heroFoot, opts.facing, opts.tick, opts.reduced, 1.05, opts.appearance, "idle", opts.moving);
    },
  });
  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) layer.draw();
  if (opts.mapId === "map.vale") bunting(ctx, 5, 6, 8, opts.tick, opts.reduced);
}

function paintStars(ctx: CanvasRenderingContext2D, w: number, h: number, mapId: string, tick: number, reduced: boolean) {
  if (mapId === "map.cave" || mapId === "map.hold" || mapId === "map.inn" || mapId === "map.smith") return;
  ctx.fillStyle = "rgba(243,230,200,0.8)";
  for (let i = 0; i < 18; i++) {
    const x = ((i * 97) % (w * TILE));
    const y = 6 + ((i * 53) % Math.max(20, TILE * 2));
    const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(tick / 10 + i);
    ctx.globalAlpha = tw;
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
}

function paintFloor(
  ctx: CanvasRenderingContext2D,
  look: RegionLook,
  mapId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tick = 0,
  reduced = false,
) {
  const path = isPath(mapId, x, y, w, h);
  const kind = groundKind(mapId, x, y, path, tick, reduced);
  const drew = blit(ctx, "tiles.png", kind % 4, Math.floor(kind / 4), 4, 4, x * TILE, y * TILE, TILE, TILE);
  if (drew) {
    const speck = (x * 13 + y * 7) % 9;
    if (speck === 0) {
      ctx.fillStyle = "rgba(12,8,10,0.22)";
      ctx.fillRect(x * TILE + 10, y * TILE + 28, 6, 2);
    } else if (speck === 4 && !path) {
      ctx.fillStyle = "rgba(125,154,98,0.4)";
      ctx.fillRect(x * TILE + 22, y * TILE + 12, 3, 6);
    }
    return;
  }
  const alt = (x + y) % 2 === 0;
  const speck = (x * 7 + y * 13) % 5;
  ctx.fillStyle = alt ? look.ground[0] : look.ground[1];
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  if (path) {
    ctx.fillStyle = look.path;
    ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x * TILE + 4 + speck, y * TILE + 8 + speck * 2, 3, 2);
}

function isPath(mapId: string, x: number, y: number, w: number, h: number): boolean {
  if (mapId === "map.vale") return x === 9 || x === 10 || y === 8 || y === 7;
  if (mapId === "map.woods" || mapId === "map.shrine") return y === Math.floor(h / 2) || x === Math.floor(w / 2);
  if (mapId === "map.lowbell" || mapId === "map.ferry") return y === 6 || y === 7;
  if (mapId === "map.ridge" || mapId === "map.highroad") return y === 4 || y === 5 || y === 6;
  if (mapId === "map.margin") return y === 5;
  return x === Math.floor(w / 2);
}

function paintWall(ctx: CanvasRenderingContext2D, look: RegionLook, mapId: string, x: number, y: number) {
  const roof = mapId === "map.vale" && x >= 3 && x <= 5 && y >= 3 && y <= 5;
  const kind = roof ? 10 : mapId === "map.woods" || mapId === "map.reach" ? 3 : 7;
  if (blit(ctx, "tiles.png", kind % 4, Math.floor(kind / 4), 4, 4, x * TILE, y * TILE, TILE, TILE)) {
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(x * TILE, y * TILE + TILE * 0.62, TILE, TILE * 0.38);
    return;
  }
  ctx.fillStyle = look.wall;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = look.wallCap;
  ctx.fillRect(x * TILE + 4, y * TILE + 6, TILE - 8, 10);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x * TILE + 4, y * TILE + 28, TILE - 8, 12);
}

function paintWater(ctx: CanvasRenderingContext2D, mapId: string, w: number, h: number, tick: number, reduced: boolean) {
  const band = mapId === "map.lowbell" ? 8 : mapId === "map.ferry" ? 9 : mapId === "map.hold" ? 6 : -1;
  if (band < 0) return;
  if (imageReady("tiles.png")) {
    if (mapId === "map.ferry" && !reduced) {
      ctx.fillStyle = "rgba(210,214,216,0.12)";
      ctx.fillRect(0, TILE, w * TILE, 2.4 * TILE);
    }
    if (!reduced) {
      ctx.strokeStyle = "rgba(220,230,230,0.4)";
      const drift = (tick % 28) - 14;
      ctx.beginPath();
      ctx.moveTo(0, band * TILE + 12);
      ctx.bezierCurveTo(w * TILE * 0.35, band * TILE + drift, w * TILE * 0.7, band * TILE + 20, w * TILE, band * TILE + 8);
      ctx.stroke();
    }
    return;
  }
  const y0 = band * TILE;
  ctx.fillStyle = regionLook(mapId).water ?? "#102830";
  ctx.globalAlpha = mapId === "map.hold" ? 0.72 : 0.88;
  ctx.fillRect(0, y0, w * TILE, (h - band) * TILE);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "rgba(200,220,220,0.45)";
  const drift = reduced ? 0 : (tick % 40) - 20;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, y0 + 16 + i * 14);
    ctx.bezierCurveTo(w * TILE * 0.3, y0 + drift / 4 + i * 12, w * TILE * 0.65, y0 + 24 + i * 10, w * TILE, y0 + 12 + i * 14);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (mapId === "map.ferry") {
    ctx.fillStyle = "rgba(210,214,216,0.14)";
    ctx.fillRect(0, TILE, w * TILE, 3.2 * TILE);
  }
}

function paintLandmarks(ctx: CanvasRenderingContext2D, mapId: string, tick: number, reduced: boolean, sight: boolean) {
  const glow = reduced ? 1 : 0.75 + 0.25 * Math.sin(tick / 6);
  if (mapId === "map.vale") {
    paintHouse(ctx, 3, 3, 3, 2, "#6a4030");
    paintHouse(ctx, 14, 3, 3, 2, "#4a3428");
    paintClock(ctx, 10, 2, tick, reduced);
    bunting(ctx, 5, 7, 10);
    for (const [lx, ly] of [[6, 8], [14, 8], [8, 11], [12, 11]] as const) paintLantern(ctx, lx, ly, glow);
    paintStall(ctx, 7, 9);
  }
  if (mapId === "map.woods") {
    for (const [tx, ty] of [[4, 3], [6, 8], [15, 3], [17, 8], [10, 2]] as const) paintPine(ctx, tx, ty, true);
  }
  if (mapId === "map.shrine") {
    ctx.strokeStyle = "#4ec8c0";
    ctx.lineWidth = 2;
    ctx.strokeRect(6 * TILE + 6, 2 * TILE + 6, 4 * TILE - 12, 3 * TILE - 12);
    ctx.globalAlpha = 0.4 + (reduced ? 0 : 0.15 * Math.sin(tick / 8));
    ctx.fillStyle = "#8b6bb8";
    ctx.beginPath();
    ctx.arc(8 * TILE + 24, 3 * TILE + 20, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    crystal(ctx, 8 * TILE + 24, 3 * TILE + 18, 10);
  }
  if (mapId === "map.reach") {
    for (const [tx, ty] of [[3, 3], [7, 2], [12, 8], [15, 3], [5, 9]] as const) paintPine(ctx, tx, ty, false);
  }
  if (mapId === "map.barrow") {
    ctx.fillStyle = "#3a2a18";
    ctx.beginPath();
    ctx.moveTo(2 * TILE, 4 * TILE);
    ctx.quadraticCurveTo(4 * TILE, 1 * TILE, 6 * TILE, 4 * TILE);
    ctx.fill();
    ctx.fillStyle = "#2a2016";
    ctx.fillRect(6 * TILE, 2 * TILE, 3 * TILE, 2 * TILE);
    ctx.strokeStyle = "#6a8f4a";
    ctx.beginPath();
    ctx.moveTo(3 * TILE, 4 * TILE);
    ctx.quadraticCurveTo(4 * TILE, 3 * TILE, 5 * TILE, 4 * TILE);
    ctx.stroke();
  }
  if (mapId === "map.inn") {
    for (const [lx, ly] of [[2, 2], [7, 2], [3, 4]] as const) paintLantern(ctx, lx, ly, glow);
    ctx.fillStyle = "#5a3028";
    ctx.fillRect(1 * TILE + 8, 2 * TILE + 16, 28, 16);
  }
  if (mapId === "map.smith") {
    ctx.fillStyle = "#6a4030";
    ctx.fillRect(2 * TILE, 2 * TILE, TILE * 2, 20);
    ctx.fillStyle = `rgba(224,106,92,${0.7 * glow})`;
    ctx.fillRect(3 * TILE, 2 * TILE + 6, 10, 8);
  }
  if (mapId === "map.lowbell") {
    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(8 * TILE + 18, TILE + 8, 8, 70);
    ctx.strokeStyle = "#e8b15a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8 * TILE + 22, TILE + 22, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#4a3024";
    ctx.fillRect(3 * TILE, 4 * TILE, 46, 22);
    ctx.fillStyle = "#e8b15a";
    ctx.fillRect(3 * TILE + 8, 4 * TILE + 8, 10, 8);
    ctx.fillStyle = "#6a3030";
    ctx.fillRect(12 * TILE, 6 * TILE, 46, 28);
    ctx.fillStyle = "#e06a5c";
    ctx.beginPath();
    ctx.arc(12 * TILE + 16, 6 * TILE + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2018";
    for (const px of [2, 6, 10, 14]) ctx.fillRect(px * TILE + 8, 8 * TILE - 16, 6, 22);
    if (sight) {
      ctx.strokeStyle = "rgba(78,200,192,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(5 * TILE + 22, 5 * TILE + 8, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  if (mapId === "map.ferry") {
    ctx.fillStyle = "#3e3428";
    ctx.fillRect(2 * TILE, 2 * TILE, 3 * TILE, 2 * TILE);
    ctx.fillStyle = "#6a5840";
    ctx.beginPath();
    ctx.moveTo(2 * TILE - 6, 2 * TILE);
    ctx.lineTo(3.5 * TILE, 2 * TILE - 16);
    ctx.lineTo(5 * TILE + 6, 2 * TILE);
    ctx.fill();
    ctx.fillStyle = "#d7c4a3";
    ctx.fillRect(6 * TILE + 6, 7 * TILE, 30, 24);
    ctx.fillStyle = "#1a3038";
    ctx.fillRect(8 * TILE + 18, 9 * TILE, 10, 2 * TILE);
    if (sight) {
      ctx.strokeStyle = "rgba(78,200,192,0.85)";
      ctx.strokeRect(8 * TILE + 8, 8 * TILE, 26, 18);
      ctx.fillStyle = "#e8b15a";
      ctx.font = "12px Source Sans 3, sans-serif";
      ctx.fillText("9  10", 6 * TILE + 8, 7 * TILE + 16);
    }
  }
  if (mapId === "map.hold") {
    ctx.fillStyle = "#2c261c";
    ctx.fillRect(5 * TILE + 4, 4 * TILE, 36, 46);
    ctx.fillStyle = "#3a2418";
    ctx.fillRect(14 * TILE, 3 * TILE, 2 * TILE, 3 * TILE);
    ctx.fillStyle = `rgba(232,177,90,${glow})`;
    for (let i = 0; i < 4; i++) ctx.fillRect(8 * TILE + i * 18, 3 * TILE, 8, 10);
    if (sight) {
      ctx.fillStyle = "rgba(78,200,192,0.95)";
      ctx.font = "12px Source Sans 3, sans-serif";
      ctx.fillText("flame", 3 * TILE, 3 * TILE + 12);
      ctx.fillText("tide", 3 * TILE, 3 * TILE + 26);
      ctx.fillText("stone", 3 * TILE, 3 * TILE + 40);
    }
  }
  if (mapId === "map.highroad") {
    ctx.strokeStyle = "#c8bba8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TILE, 4 * TILE + 8);
    ctx.lineTo(8 * TILE, 2 * TILE + 6);
    ctx.lineTo(12 * TILE, 3 * TILE);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#4a4034";
    ctx.fillRect(10 * TILE, 2 * TILE, 18, 42);
    ctx.fillStyle = "#e8b15a";
    ctx.fillRect(10 * TILE + 6, 2 * TILE + 10, 6, 8);
    if (sight) {
      ctx.strokeStyle = "rgba(232,177,90,0.85)";
      ctx.beginPath();
      ctx.arc(7 * TILE, 2 * TILE + 4, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (mapId === "map.ridge") {
    ctx.strokeStyle = "#c8bba8";
    ctx.beginPath();
    ctx.moveTo(2 * TILE, 8 * TILE);
    ctx.lineTo(8 * TILE, 5 * TILE);
    ctx.lineTo(14 * TILE, 6 * TILE);
    ctx.stroke();
    ctx.fillStyle = "#6a5a48";
    ctx.beginPath();
    ctx.moveTo(3 * TILE, 4 * TILE);
    ctx.lineTo(4 * TILE + 10, 2 * TILE);
    ctx.lineTo(5 * TILE + 16, 4 * TILE);
    ctx.fill();
    ctx.strokeStyle = "#e8b15a";
    ctx.beginPath();
    ctx.arc(4 * TILE + 8, 3 * TILE, 14, 0, Math.PI * 2);
    ctx.stroke();
    rope(ctx, 9, 6, 13, 5, tick, reduced);
    if (sight) {
      ctx.strokeStyle = "rgba(78,200,192,0.8)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(10 * TILE, 6 * TILE);
      ctx.lineTo(13 * TILE, 5 * TILE);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (mapId === "map.glass") {
    ctx.strokeStyle = "#c8b8e8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(9 * TILE, 2 * TILE + 10, 36, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#2a241c";
    ctx.fillRect(4 * TILE, 5 * TILE, 28, 36);
    ctx.strokeStyle = "#8b6bb8";
    ctx.strokeRect(4 * TILE, 5 * TILE, 28, 36);
    if (sight) {
      ctx.fillStyle = "rgba(232,177,90,0.9)";
      ctx.beginPath();
      ctx.arc(8 * TILE, 2 * TILE + 8, 10, 0.2, Math.PI - 0.2);
      ctx.fill();
      ctx.fillStyle = "#f3e6c8";
      ctx.beginPath();
      ctx.arc(10 * TILE, 2 * TILE + 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mapId === "map.cave") {
    ctx.fillStyle = "#0e0c0a";
    ctx.fillRect(3 * TILE, 2 * TILE, 6 * TILE, 4 * TILE);
    ctx.strokeStyle = "#3a3028";
    ctx.strokeRect(3 * TILE, 2 * TILE, 6 * TILE, 4 * TILE);
    if (sight) {
      ctx.fillStyle = `rgba(232,177,90,${glow})`;
      ctx.fillRect(8 * TILE + 16, 4 * TILE + 12, 8, 8);
    }
  }
  if (mapId === "map.berth") {
    ctx.strokeStyle = "#c8bba8";
    ctx.strokeRect(5 * TILE, 3 * TILE, 4 * TILE, 2 * TILE);
    ctx.fillStyle = "#8a8070";
    ctx.beginPath();
    ctx.moveTo(5 * TILE + 8, 4 * TILE + 8);
    ctx.lineTo(7 * TILE, 3 * TILE - 6);
    ctx.lineTo(9 * TILE - 8, 4 * TILE + 8);
    ctx.fill();
    ctx.fillStyle = "#e8b15a";
    ctx.fillRect(7 * TILE - 2, 3 * TILE + 10, 4, 10);
    if (sight) {
      ctx.strokeStyle = "rgba(232,177,90,0.75)";
      ctx.beginPath();
      ctx.moveTo(6 * TILE, 5 * TILE + 8);
      ctx.lineTo(9 * TILE, 6 * TILE);
      ctx.stroke();
    }
  }
  if (mapId === "map.margin") {
    ctx.strokeStyle = "#3a2848";
    ctx.lineWidth = 3;
    ctx.strokeRect(7 * TILE, 3 * TILE, 5 * TILE, 3 * TILE);
    ctx.lineWidth = 1;
    ctx.fillStyle = sight ? "rgba(232,177,90,0.35)" : "#e7d7c2";
    ctx.fillRect(8 * TILE + 8, 4 * TILE, 28, 36);
    ctx.strokeStyle = sight ? "#4ec8c0" : "#c8b8e8";
    ctx.setLineDash(sight ? [4, 3] : []);
    ctx.strokeRect(10 * TILE + 4, 4 * TILE + 6, 28, 36);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#8b6bb8";
    ctx.beginPath();
    ctx.arc(12 * TILE + 8, 6 * TILE, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#1a2830";
    ctx.beginPath();
    ctx.arc(12 * TILE + 8, 6 * TILE, 8, 0, Math.PI * 2);
    ctx.fill();
    if (sight) {
      ctx.strokeStyle = "rgba(78,200,192,0.8)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(3 * TILE, 5 * TILE);
      ctx.lineTo(8 * TILE, 4 * TILE);
      ctx.lineTo(11 * TILE, 5 * TILE);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(232,177,90,${glow})`;
      ctx.fillRect(11 * TILE + 18, 5 * TILE + 8, 7, 7);
    }
  }
  if (mapId === "map.deck") {
    ctx.strokeStyle = "#8a6848";
    ctx.strokeRect(3 * TILE, 2 * TILE, 6 * TILE, 3 * TILE);
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(4 * TILE + 6, 5 * TILE + 4, 34, 16);
    ctx.fillStyle = "#c8bba8";
    ctx.fillRect(4 * TILE + 4, 3 * TILE + 6, 28, 20);
    ctx.strokeStyle = "#e8b15a";
    ctx.beginPath();
    ctx.arc(6 * TILE + 16, 3 * TILE + 8, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 * TILE + 16, 3 * TILE - 2);
    ctx.lineTo(6 * TILE + 16, 3 * TILE + 18);
    ctx.moveTo(6 * TILE + 4, 3 * TILE + 8);
    ctx.lineTo(6 * TILE + 28, 3 * TILE + 8);
    ctx.stroke();
    ctx.fillStyle = "#3a2a22";
    ctx.fillRect(5 * TILE + 6, 3 * TILE + 2, 18, 10);
  }
  if (mapId === "map.cinder") {
    const drift = reduced ? 0 : Math.sin(tick / 7) * 3;
    ctx.fillStyle = "#2a2428";
    ctx.beginPath();
    ctx.moveTo(4 * TILE, 7 * TILE);
    ctx.lineTo(6 * TILE, 3 * TILE);
    ctx.lineTo(9 * TILE, 7 * TILE);
    ctx.fill();
    ctx.fillStyle = "#7eb6d6";
    ctx.fillRect(7 * TILE + 8, 4 * TILE, 6, 22);
    ctx.fillStyle = `rgba(196,90,50,${0.35 + (reduced ? 0 : 0.15 * Math.sin(tick / 5))})`;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(6 * TILE + i * 10, 2 * TILE + ((i * 7 + drift) % 18), 3, 8);
    }
    ctx.strokeStyle = "#d7e4f2";
    ctx.strokeRect(11 * TILE + 6, 4 * TILE + 4, 22, 18);
    ctx.beginPath();
    ctx.moveTo(11 * TILE + 17, 4 * TILE - 6);
    ctx.lineTo(11 * TILE + 17, 4 * TILE + 8);
    ctx.stroke();
    ctx.fillStyle = "#c45a32";
    ctx.beginPath();
    ctx.arc(13 * TILE, 4 * TILE, 18, Math.PI, 0);
    ctx.fill();
    if (sight) {
      ctx.fillStyle = "rgba(126,182,214,0.45)";
      ctx.fillRect(6 * TILE, 2 * TILE, 3 * TILE, TILE);
    }
  }
  if (mapId === "map.ashvault") {
    ctx.strokeStyle = "#c45a32";
    ctx.strokeRect(3 * TILE, 3 * TILE, 4 * TILE, 2 * TILE);
    ctx.fillStyle = "#1a1214";
    ctx.fillRect(6 * TILE, 2 * TILE, 2 * TILE, 4 * TILE);
    if (sight) {
      ctx.fillStyle = "rgba(196,90,50,0.8)";
      ctx.fillRect(4 * TILE + 10, 4 * TILE + 8, 8, 8);
    }
  }
}

function paintAmbience(ctx: CanvasRenderingContext2D, mapId: string, w: number, h: number, tick: number, reduced: boolean) {
  if (reduced) return;
  if (mapId === "map.ridge" || mapId === "map.highroad" || mapId === "map.berth" || mapId === "map.margin" || mapId === "map.cinder" || mapId === "map.deck") {
    ctx.strokeStyle = "rgba(232,220,200,0.25)";
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 28 + ((tick * 2 + i * 10) % 18);
      ctx.beginPath();
      ctx.moveTo(-20 + ((tick * 3 + i * 40) % (w * TILE)), y);
      ctx.lineTo(30 + ((tick * 3 + i * 40) % (w * TILE)), y - 4);
      ctx.stroke();
    }
  }
  if (mapId === "map.vale" && !reduced) {
    const halos: [number, number][] = [[6.2, 7.6], [11, 3.5], [14.3, 7.3], [8.5, 8.1]];
    for (let i = 0; i < halos.length; i++) {
      const [lx, ly] = halos[i]!;
      const pulse = 0.16 + 0.08 * Math.sin(tick / 5 + i);
      const g = ctx.createRadialGradient(lx * TILE, ly * TILE, 2, lx * TILE, ly * TILE, 36);
      g.addColorStop(0, `rgba(232,177,90,${pulse + 0.2})`);
      g.addColorStop(1, "rgba(232,177,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx * TILE, ly * TILE, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(232,177,90,0.28)";
    for (let i = 0; i < 10; i++) {
      const x = (i * 90 + tick * 2) % (w * TILE);
      const y = 30 + ((i * 37 + tick) % Math.max(40, h * TILE - 50));
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(tick / 5 + i);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  if ((mapId === "map.woods" || mapId === "map.reach") && !reduced) {
    ctx.fillStyle = "rgba(125,154,98,0.45)";
    for (let i = 0; i < 6; i++) {
      const x = (i * 70 + tick) % (w * TILE);
      const y = ((i * 50 + tick * 1.4) % (h * TILE));
      ctx.fillRect(x, y, 3, 2);
    }
  }
  if (mapId === "map.woods") {
    ctx.strokeStyle = "rgba(232,220,200,0.35)";
    ctx.beginPath();
    ctx.moveTo(9 * TILE + 8, 8 * TILE + 20);
    ctx.lineTo(9 * TILE + 22, 8 * TILE + 8);
    ctx.moveTo(9 * TILE + 18, 8 * TILE + 22);
    ctx.lineTo(9 * TILE + 32, 8 * TILE + 6);
    ctx.stroke();
  }
  if (mapId === "map.lowbell") {
    ctx.strokeStyle = "rgba(78,200,192,0.45)";
    ctx.beginPath();
    ctx.moveTo(12 * TILE + 8, 8 * TILE);
    ctx.lineTo(11 * TILE + 10, 6 * TILE + 8);
    ctx.lineTo(10 * TILE + 16, 5 * TILE + 6);
    ctx.stroke();
  }
  if ((mapId === "map.ferry" || mapId === "map.hold" || mapId === "map.lowbell") && !reduced) {
    ctx.strokeStyle = "rgba(200,214,216,0.28)";
    for (let i = 0; i < 14; i++) {
      const x = (i * 67 + tick * 7) % (w * TILE);
      const y = (i * 41 + tick * 9) % (h * TILE);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 9);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(210,220,220,0.14)";
    for (let i = 0; i < 3; i++) {
      const x = ((tick * 1.4 + i * 90) % (w * TILE + 80)) - 40;
      const y = TILE * 2 + i * 36;
      ctx.beginPath();
      ctx.ellipse(x, y, 70, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mapId === "map.smith" && !reduced) {
    ctx.fillStyle = "rgba(180,180,180,0.35)";
    for (let i = 0; i < 4; i++) {
      const rise = (tick * 2 + i * 14) % 48;
      ctx.beginPath();
      ctx.arc(3 * TILE + 8 + i * 6, 2 * TILE - rise, 3 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintSightWash(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number, reduced: boolean) {
  ctx.fillStyle = "rgba(40, 90, 96, 0.22)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(78,200,192,0.35)";
  const step = reduced ? 16 : 12;
  const shiftY = reduced ? 0 : tick % step;
  for (let y = shiftY; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(243,230,200,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w - 36, 28, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - 36, 28);
  ctx.lineTo(w - 36, 20);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function paintMarker(ctx: CanvasRenderingContext2D, spot: Hotspot, showName: boolean, tick: number, reduced: boolean) {
  const x = spot.x * TILE + 24;
  const y = spot.y * TILE + 16;
  const color = spot.kind === "battle" ? "#e06a5c" : spot.kind === "puzzle" ? "#8b6bb8" : spot.kind === "exit" ? "#4ec8c0" : "#e8b15a";
  ctx.fillStyle = color;
  ctx.globalAlpha = reduced ? 0.95 : 0.8 + 0.2 * Math.sin(tick / 7 + spot.x);
  ctx.beginPath();
  if (spot.kind === "exit") {
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 7, y + 4);
    ctx.lineTo(x - 7, y + 4);
  } else if (spot.kind === "battle") {
    ctx.arc(x, y, 5, 0, Math.PI * 2);
  } else {
    ctx.arc(x, y, 4, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  if (showName && !reduced) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(tick / 5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, spot.y * TILE + 34, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
  }
  if (!showName) return;
  const label = spot.label.slice(0, 18);
  ctx.font = "12px Source Sans 3, sans-serif";
  const tw = ctx.measureText(label).width;
  const plateX = x - tw / 2 - 6;
  const plateY = spot.y * TILE + 28;
  ctx.fillStyle = "rgba(12,8,14,0.88)";
  roundRect(ctx, plateX, plateY, tw + 12, 16, 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = "#f3e6c8";
  ctx.textAlign = "center";
  ctx.fillText(label, x, plateY + 12);
  ctx.textAlign = "left";
}

export function paintPerson(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  facing: string,
  tick: number,
  reduced: boolean,
  scale = 1,
  appearance = "lantern",
  pose: Pose = "idle",
  moving = false,
) {
  const bob = reduced || pose === "hurt" ? 0 : Math.sin(tick / 5 + cx) * 1.4;
  const frame = frameFor(id, facing, tick, reduced, pose, moving, appearance);
  const h = 58 * scale * (pose === "victory" && !reduced ? 1 + Math.sin(tick / 4) * 0.03 : 1);
  const w = 44 * scale;
  if (frame && imageReady(frame.file)) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 10 * scale, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (moving && !reduced && pose !== "hurt") {
      ctx.fillStyle = "rgba(70,52,36,0.45)";
      ctx.fillRect(cx - 6, cy + 1, 3, 2);
      ctx.fillRect(cx + 3, cy + 2, 2, 2);
    }
    blit(ctx, frame.file, frame.col, frame.row, frame.cols, frame.rows, cx - w / 2, cy - h + bob, w, h, frame.filter);
    if (pose === "cast") {
      ctx.save();
      ctx.strokeStyle = "#4ec8c0";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy - h * 0.55, 16 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const who = id.toLowerCase();
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(facing === "w" ? -scale : scale, scale);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const palette = personPalette(who);
  ctx.fillStyle = palette.cloak;
  ctx.fillRect(-7, -20, 14, 18);
  ctx.fillStyle = palette.trim;
  ctx.fillRect(-7, -8, 14, 3);
  ctx.fillStyle = palette.hood;
  ctx.beginPath();
  ctx.arc(0, -22, 6.5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-6, -22, 12, 5);
  ctx.fillStyle = "#e6c2a0";
  if (facing !== "n") ctx.fillRect(-3, -23, 6, 5);
  if (palette.prop === "lantern" && facing !== "n") {
    ctx.fillStyle = "#e8b15a";
    ctx.fillRect(7, -12, 4, 5);
    ctx.fillStyle = "rgba(232,177,90,0.28)";
    ctx.beginPath();
    ctx.arc(9, -10, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (palette.prop === "book") {
    ctx.fillStyle = "#f3e6c8";
    ctx.fillRect(6, -12, 6, 7);
    ctx.fillStyle = "#4ec8c0";
    ctx.fillRect(6, -9, 6, 1);
  } else if (palette.prop === "blade") {
    ctx.fillStyle = "#d7c4a3";
    ctx.fillRect(7, -18, 2, 14);
  } else if (palette.prop === "leaf") {
    ctx.fillStyle = "#7d9a62";
    ctx.beginPath();
    ctx.ellipse(8, -12, 4, 2.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (palette.prop === "goggles") {
    ctx.strokeStyle = "#e8b15a";
    ctx.strokeRect(-4, -24, 8, 3);
    ctx.fillStyle = "#4ec8c0";
    ctx.fillRect(8, -14, 3, 8);
  }
  ctx.restore();
}

function personPalette(who: string): { cloak: string; hood: string; trim: string; prop: string } {
  if (who.includes("mira")) return { cloak: "#1d4e52", hood: "#14383c", trim: "#7ec8c0", prop: "book" };
  if (who.includes("kael")) return { cloak: "#3a342c", hood: "#2a241c", trim: "#d7c4a3", prop: "blade" };
  if (who.includes("nessa")) return { cloak: "#2a4024", hood: "#1c3018", trim: "#b7d48a", prop: "leaf" };
  if (who.includes("sera")) return { cloak: "#4a3820", hood: "#2e2414", trim: "#e8b15a", prop: "goggles" };
  return { cloak: "#3a2418", hood: "#24160f", trim: "#e8b15a", prop: "lantern" };
}

function paintHouse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: string) {
  ctx.fillStyle = "#3a2418";
  ctx.fillRect(x * TILE, y * TILE + 14, w * TILE, h * TILE - 8);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x * TILE - 6, y * TILE + 18);
  ctx.lineTo(x * TILE + (w * TILE) / 2, y * TILE - 6);
  ctx.lineTo((x + w) * TILE + 6, y * TILE + 18);
  ctx.fill();
  ctx.fillStyle = "#f3d7a1";
  ctx.fillRect(x * TILE + 14, y * TILE + 28, 10, 12);
  ctx.fillRect(x * TILE + w * TILE - 28, y * TILE + 28, 10, 12);
  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(x * TILE + (w * TILE) / 2 - 6, y * TILE + 32, 12, 18);
}

function paintClock(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number, reduced: boolean) {
  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(x * TILE + 8, y * TILE, 32, 52);
  ctx.fillStyle = "#e8b15a";
  ctx.fillRect(x * TILE + 20, y * TILE - 10, 6, 12);
  ctx.strokeStyle = "#e8b15a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x * TILE + 24, y * TILE + 18, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#1a120e";
  ctx.beginPath();
  ctx.arc(x * TILE + 24, y * TILE + 18, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f3e6c8";
  ctx.beginPath();
  ctx.moveTo(x * TILE + 24, y * TILE + 18);
  ctx.lineTo(x * TILE + 24, y * TILE + 11);
  ctx.moveTo(x * TILE + 24, y * TILE + 18);
  ctx.lineTo(x * TILE + 30, y * TILE + 21);
  ctx.stroke();
  ctx.lineWidth = 1;
  if (!reduced && Math.floor(tick / 8) % 2 === 0) {
    ctx.fillStyle = "rgba(232,177,90,0.9)";
    ctx.fillRect(x * TILE + 14, y * TILE + 36, 6, 8);
  }
}

function paintLantern(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number) {
  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(x * TILE + 22, y * TILE + 4, 2, 14);
  ctx.fillStyle = "#e8b15a";
  ctx.fillRect(x * TILE + 18, y * TILE + 16, 10, 8);
  ctx.fillStyle = `rgba(232,177,90,${0.25 * glow})`;
  ctx.beginPath();
  ctx.arc(x * TILE + 23, y * TILE + 20, 12, 0, Math.PI * 2);
  ctx.fill();
}

function paintPine(ctx: CanvasRenderingContext2D, x: number, y: number, crystal: boolean) {
  ctx.fillStyle = "#1a2a18";
  ctx.beginPath();
  ctx.moveTo(x * TILE + 24, y * TILE);
  ctx.lineTo(x * TILE + 44, y * TILE + 40);
  ctx.lineTo(x * TILE + 4, y * TILE + 40);
  ctx.fill();
  ctx.fillStyle = "#243018";
  ctx.beginPath();
  ctx.moveTo(x * TILE + 24, y * TILE + 12);
  ctx.lineTo(x * TILE + 40, y * TILE + 36);
  ctx.lineTo(x * TILE + 8, y * TILE + 36);
  ctx.fill();
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(x * TILE + 21, y * TILE + 36, 6, 8);
  if (crystal) {
    ctx.fillStyle = "#7ec8c0";
    ctx.beginPath();
    ctx.moveTo(x * TILE + 24, y * TILE - 4);
    ctx.lineTo(x * TILE + 28, y * TILE + 6);
    ctx.lineTo(x * TILE + 20, y * TILE + 6);
    ctx.fill();
  } else {
    ctx.fillStyle = "#6a8f4a";
    ctx.fillRect(x * TILE + 18, y * TILE + 34, 12, 4);
  }
}

function paintStall(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6a3030";
  ctx.fillRect(x * TILE, y * TILE + 16, 36, 8);
  ctx.fillStyle = "#e8b15a";
  ctx.fillRect(x * TILE + 4, y * TILE + 8, 6, 6);
  ctx.fillRect(x * TILE + 16, y * TILE + 8, 6, 6);
}

function bunting(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, tick = 0, reduced = false) {
  const sway = reduced ? 0 : Math.sin(tick / 8) * 3;
  ctx.strokeStyle = "#e8b15a";
  ctx.beginPath();
  ctx.moveTo(x * TILE, y * TILE);
  ctx.lineTo((x + count) * TILE, y * TILE + 10 + sway);
  ctx.stroke();
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i % 2 ? "#4ec8c0" : "#e06a5c";
    const ox = reduced ? 0 : Math.sin(tick / 7 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x * TILE + i * TILE + ox, y * TILE + i);
    ctx.lineTo(x * TILE + i * TILE + 8 + ox, y * TILE + 12);
    ctx.lineTo(x * TILE + i * TILE - 8 + ox, y * TILE + 12);
    ctx.fill();
  }
}

function rope(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, tick: number, reduced: boolean) {
  const sag = reduced ? 10 : 8 + Math.sin(tick / 8) * 3;
  ctx.strokeStyle = "#c8bba8";
  ctx.beginPath();
  ctx.moveTo(x1 * TILE, y1 * TILE);
  ctx.quadraticCurveTo(((x1 + x2) / 2) * TILE, ((y1 + y2) / 2) * TILE + sag, x2 * TILE, y2 * TILE);
  ctx.stroke();
}

function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#d7c4f0";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.7, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.7, y);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shift(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amount);
  const g = Math.min(255, ((n >> 8) & 255) + amount);
  const b = Math.min(255, (n & 255) + amount + 12);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

type CombatantLike = {
  id: string;
  name: string;
  side: string;
  jobId: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  position: { x: number; z: number };
  statuses: { id: string }[];
};

type EncounterLike = {
  encounterId: string;
  mode: string;
  activeActorId: string | null;
  combatants: CombatantLike[];
  intents: { actorId: string; abilityId: string }[];
  events: { kind: string; targetId?: string; abilityId?: string; actorId?: string; tick?: number; amount?: number }[];
  tick?: number;
};

export function paintArena(
  canvas: HTMLCanvasElement,
  enc: EncounterLike,
  hero: { x: number; z: number },
  reduced: boolean,
  now = 0,
  appearance = "lantern",
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 640;
  const h = canvas.clientHeight || 360;
  if (canvas.width !== Math.floor(w * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tick = reduced ? 0 : now / 90;
  const asc = enc.mode === "ascension";
  const art = battleArt(enc.encounterId, asc);
  const plate = imageReady(art);
  if (plate) {
    ctx.drawImage(plate, 0, 0, w, h);
    const scrim = ctx.createLinearGradient(0, h * 0.35, 0, h);
    scrim.addColorStop(0, "rgba(8,4,10,0)");
    scrim.addColorStop(1, "rgba(8,4,10,0.5)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    const backdrop = battleBackdrop(enc.encounterId, asc);
    sky.addColorStop(0, backdrop.top);
    sky.addColorStop(1, backdrop.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = backdrop.ground;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.72, w * 0.42, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!reduced) {
    ctx.fillStyle = "rgba(243,230,200,0.65)";
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(tick / 8 + i);
      ctx.fillRect((i * 73 + tick) % w, (i * 19) % (h * 0.35), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  if (asc) {
    ctx.strokeStyle = "rgba(78,200,192,0.45)";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.68, w * 0.12 * i, h * 0.07 * i, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const party = enc.combatants.filter((c) => c.side === "party");
  const foes = enc.combatants.filter((c) => c.side === "enemy" && c.alive);
  type Slot = { c: CombatantLike; px: number; py: number };
  const slots: Slot[] = [];
  if (!asc) {
    party.forEach((c, i) => {
      if (w < 560) {
        slots.push({ c, px: w * (0.26 + (i % 2) * 0.12), py: h * (0.46 + i * 0.22) });
      } else {
        slots.push({ c, px: w * (0.2 + (i % 2) * 0.07), py: h * (0.62 + i * 0.09) });
      }
    });
    foes.forEach((c, i) => {
      const big = foeFrame(c.jobId).big;
      slots.push({
        c,
        px: w * (big ? 0.7 : 0.64 + (i % 2) * 0.1),
        py: h * (big ? 0.74 : 0.56 + i * 0.11),
      });
    });
  } else {
    for (const c of enc.combatants) {
      if (!c.alive && c.side === "enemy") continue;
      const pos = c.side === "party" && c.id === enc.activeActorId ? hero : c.position;
      const z = pos.z;
      const p = project(w, h, pos.x, z);
      slots.push({ c, px: p.px, py: p.py });
    }
  }
  slots.sort((a, b) => a.py - b.py);

  const last = enc.events[enc.events.length - 1];
  const fresh = !!last && (last.tick == null || enc.tick == null || enc.tick - last.tick <= 1);
  const actorSlot = last?.actorId ? slots.find((s) => s.c.id === last.actorId) : undefined;
  const targetSlot = last?.targetId ? slots.find((s) => s.c.id === last.targetId) : undefined;
  if (fresh && last && actorSlot && targetSlot && !reduced) {
    const tone = elementOf(last.abilityId);
    paintElement(ctx, actorSlot.px, actorSlot.py - 30, targetSlot.px, targetSlot.py - 36, tone.color, tick, last.kind === "heal");
  }

  for (const slot of slots) {
    const { c, px, py } = slot;
    const pose = battlePose(enc, c, reduced, tick);
    const lunge = pose === "attack" ? (c.side === "party" ? 22 : -22) : pose === "hurt" ? (c.side === "party" ? -12 : 12) : 0;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(px + lunge, py + 4, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (c.side === "party") {
      const battleScale = w < 560 ? 1.55 : 2.15;
      paintPerson(ctx, c.id, px + lunge, py, "s", tick, reduced, battleScale, c.id === "wanderer" ? appearance : "lantern", pose, false);
    } else {
      paintFoe(ctx, c, px + lunge, py, tick, reduced, pose);
    }
    if (c.id === enc.activeActorId) {
      ctx.strokeStyle = "#e8b15a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, py + 6, 26, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const intent = enc.intents.find((i) => i.actorId === c.id);
    if (intent) {
      const hot = /dirge|rupture|pulse|departure|gale/.test(intent.abilityId);
      ctx.strokeStyle = hot ? "#e06a5c" : "#e8b15a";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(px, py - 46, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (fresh && last?.targetId === c.id && typeof last.amount === "number" && (last.kind === "damage" || last.kind === "heal" || last.kind === "shield")) {
      const rise = reduced ? 0 : ((now % 700) / 700) * 22;
      const tone = elementOf(last.abilityId);
      ctx.save();
      ctx.font = "700 22px Fraunces, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = last.kind === "heal" ? "#8fce6a" : tone.color;
      ctx.strokeStyle = "#140e18";
      ctx.lineWidth = 3;
      const label = last.kind === "heal" ? `+${last.amount}` : String(last.amount);
      ctx.strokeText(label, px, py - 62 - rise);
      ctx.fillText(label, px, py - 62 - rise);
      ctx.restore();
    }
    const words = c.statuses
      .map((s) => (s.id === "exposed" ? "open" : s.id === "evading" ? "aside" : s.id === "guard" || s.id === "bracing" ? "brace" : ""))
      .filter(Boolean);
    if (words.length) {
      ctx.save();
      ctx.font = "11px Source Sans 3, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#4ec8c0";
      ctx.fillText(words.join(" · "), px, py - 78);
      ctx.restore();
    }
    ctx.save();
    ctx.font = "12px Source Sans 3, sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(c.name).width;
    ctx.fillStyle = "rgba(12,8,14,0.82)";
    roundRect(ctx, px - tw / 2 - 6, py + 14, tw + 12, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#f3e6c8";
    ctx.fillText(c.name, px, py + 26);
    ctx.fillStyle = "#2a1414";
    ctx.fillRect(px - 26, py - 8, 52, 5);
    ctx.fillStyle = c.side === "party" ? "#e06a5c" : "#c98b4a";
    ctx.fillRect(px - 26, py - 8, 52 * (c.hp / Math.max(1, c.maxHp)), 5);
    ctx.restore();
  }

  const foesUp = enc.combatants.some((c) => c.side === "enemy" && c.alive);
  const partyUp = enc.combatants.some((c) => c.side === "party" && c.alive);
  if (!foesUp && partyUp) {
    ctx.save();
    ctx.font = "22px Fraunces, serif";
    ctx.textAlign = "center";
    const banner = "The light holds";
    const tw = ctx.measureText(banner).width;
    ctx.fillStyle = "rgba(12,8,14,0.82)";
    roundRect(ctx, w / 2 - tw / 2 - 16, 16, tw + 32, 34, 6);
    ctx.fill();
    ctx.fillStyle = "#f3e6c8";
    ctx.fillText(banner, w / 2, 40);
    ctx.restore();
  } else if (!partyUp) {
    ctx.save();
    ctx.fillStyle = "rgba(8,4,10,0.45)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "22px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3e6c8";
    ctx.fillText("You fall, and wake.", w / 2, 40);
    ctx.restore();
  }
}

function paintElement(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  tick: number,
  heal: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const t = (tick / 8 + i / 6) % 1;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, heal ? 5 : 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function project(w: number, h: number, x: number, z: number) {
  return { px: w / 2 + x * (w * 0.09), py: h * 0.62 + z * (h * 0.08) };
}

function battleBackdrop(id: string, asc: boolean): { top: string; bottom: string; ground: string } {
  if (asc) return { top: "#1a1030", bottom: "#0c0814", ground: "rgba(78,200,192,0.16)" };
  if (id === "enc.warden") return { top: "#241830", bottom: "#120c16", ground: "rgba(139,107,184,0.25)" };
  if (id === "enc.cantor") return { top: "#1a2414", bottom: "#0c100c", ground: "rgba(106,143,74,0.28)" };
  if (id === "enc.ferryman" || id === "enc.crossing" || id === "enc.vault") return { top: "#142028", bottom: "#0c1418", ground: "rgba(16,40,48,0.45)" };
  if (id === "enc.galekeeper" || id === "enc.gust") return { top: "#2a3a52", bottom: "#141820", ground: "rgba(90,80,68,0.4)" };
  if (id === "enc.hourkeeper" || id === "enc.ink") return { top: "#24182e", bottom: "#120e16", ground: "rgba(70,50,60,0.45)" };
  if (id === "enc.woods" || id === "enc.thicket") return { top: "#142018", bottom: "#0c140e", ground: "rgba(36,50,34,0.55)" };
  return { top: "#2a1c28", bottom: "#140e14", ground: "rgba(74,52,40,0.5)" };
}

function battlePose(enc: EncounterLike, c: CombatantLike, reduced: boolean, tick: number): Pose {
  const foesUp = enc.combatants.some((f) => f.side === "enemy" && f.alive);
  if (!foesUp && c.side === "party" && c.alive) return reduced ? "idle" : "victory";
  const last = enc.events[enc.events.length - 1];
  if (!last) return "idle";
  const fresh = last.tick == null || enc.tick == null || enc.tick - last.tick <= 1;
  if (!fresh) return "idle";
  if (last.targetId === c.id && (last.kind === "damage" || last.kind === "down" || last.kind === "shield")) return "hurt";
  if (last.actorId === c.id && (last.kind === "damage" || last.kind === "miss" || last.kind === "heal" || last.kind === "shield")) {
    const spell = (last.abilityId ?? "").startsWith("spell.") || last.kind === "heal";
    return spell ? "cast" : "attack";
  }
  void tick;
  return "idle";
}

const foeBorn = new Map<string, number>();

function paintFoe(ctx: CanvasRenderingContext2D, c: CombatantLike, x: number, y: number, tick: number, reduced: boolean, pose: Pose = "idle") {
  if (c.jobId === "enemy.hourkeeper" || c.jobId === "enemy.inkling") {
    const bob = reduced ? 0 : Math.sin(tick / 6 + x) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    if (c.jobId === "enemy.hourkeeper") {
      ctx.fillStyle = "rgba(42,24,64,0.9)";
      ctx.fillRect(-14, -48, 22, 46);
      ctx.fillStyle = "rgba(232,177,90,0.55)";
      ctx.fillRect(-6, -56, 22, 46);
      ctx.strokeStyle = "#c8b8e8";
      ctx.strokeRect(-14, -48, 22, 46);
      ctx.strokeRect(-6, -56, 22, 46);
      ctx.fillStyle = "#4ec8c0";
      ctx.fillRect(-4, -30, 4, 10);
      ctx.fillStyle = "#e8b15a";
      ctx.fillRect(6, -36, 4, 10);
    } else {
      ctx.fillStyle = "#1a1028";
      ctx.beginPath();
      ctx.ellipse(0, -10, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8b6bb8";
      ctx.beginPath();
      ctx.moveTo(8, -14);
      ctx.lineTo(16, -28);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const spec = foeFrame(c.jobId);
  if (!foeBorn.has(c.id)) foeBorn.set(c.id, tick);
  const age = tick - (foeBorn.get(c.id) ?? tick);
  const intro = reduced || !spec.big ? 1 : Math.min(1, 0.4 + Math.max(0, age) / 5);
  const bob = reduced ? 0 : Math.sin(tick / 6 + x) * 2;
  const h = (spec.big ? 156 : 108) * intro;
  const w = h * 0.72;
  if (blit(ctx, "foes.png", spec.col, spec.row, 3, 3, x - w / 2, y - h + bob, w, h, pose === "hurt" ? "brightness(1.8)" : "none")) {
    if (pose === "attack" || pose === "cast") {
      ctx.save();
      ctx.strokeStyle = pose === "cast" ? "#8b6bb8" : "#f3e6c8";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y - h * 0.45, 14 + (reduced ? 0 : (tick % 5)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.translate(x, y + bob);
  const job = c.jobId;
  if (job === "enemy.warden") {
    crystal(ctx, 0, -8, 22);
    ctx.strokeStyle = c.statuses.some((s) => s.id === "exposed") ? "#e06a5c" : "#f3e6c8";
    ctx.strokeRect(-16, -30, 32, 36);
  } else if (job === "enemy.cantor") {
    ctx.fillStyle = "#243018";
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(16, 8);
    ctx.lineTo(-16, 8);
    ctx.fill();
    ctx.strokeStyle = "#6a8f4a";
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-20, -16);
    ctx.moveTo(12, -6);
    ctx.lineTo(20, -16);
    ctx.stroke();
  } else if (job === "enemy.ferryman") {
    ctx.fillStyle = "#2a3038";
    ctx.fillRect(-8, -28, 16, 26);
    ctx.fillStyle = "#8fb8b0";
    ctx.fillRect(8, -26, 3, 30);
  } else if (job === "enemy.galekeeper") {
    ctx.fillStyle = "#3a4458";
    ctx.beginPath();
    ctx.arc(0, -8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e8b15a";
    ctx.beginPath();
    ctx.arc(0, -8, 22 + (reduced ? 0 : Math.sin(tick / 4) * 2), 0, Math.PI * 1.4);
    ctx.stroke();
  } else if (job === "enemy.glowmoth" || job === "enemy.driftlantern") {
    ctx.fillStyle = "#e8b15a";
    ctx.beginPath();
    ctx.ellipse(-8, -8, 8, 4, -0.6, 0, Math.PI * 2);
    ctx.ellipse(8, -8, 8, 4, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3e6c8";
    ctx.beginPath();
    ctx.arc(0, -6, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (job === "enemy.briarling" || job === "enemy.cantor") {
    ctx.fillStyle = "#3d6b32";
    ctx.fillRect(-8, -16, 16, 16);
  } else if (job === "enemy.gustling") {
    ctx.strokeStyle = "#c8d0dc";
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 1.6);
    ctx.stroke();
  } else if (job === "enemy.mistling") {
    ctx.fillStyle = "rgba(143,184,176,0.75)";
    ctx.beginPath();
    ctx.ellipse(0, -8, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    crystal(ctx, 0, -6, 12);
  }
  ctx.restore();
}
