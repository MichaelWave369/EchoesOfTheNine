/**
 * Presentation only. No damage, no flags, no saves.
 * Future chapters: add a RegionLook and a landmark painter. Do not invent tiles
 * that change which squares can be walked. Collision stays in GameApp.
 */

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
};

export function regionLook(mapId: string): RegionLook {
  return LOOKS[mapId] ?? LOOKS["map.vale"]!;
}

export const PUBLIC_ART_NOTES = Object.values(LOOKS).map((look) => look.note);

type Hotspot = { x: number; y: number; label: string; kind: string };

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
  },
) {
  const { mapId, width: w, height: h, sight, tick, reduced, pos, facing, party, hotspots, hover, blocked } = opts;
  const look = regionLook(mapId);
  const sky = ctx.createLinearGradient(0, 0, 0, h * TILE);
  sky.addColorStop(0, sight ? shift(look.skyTop, 18) : look.skyTop);
  sky.addColorStop(1, look.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w * TILE, h * TILE);
  paintStars(ctx, w, h, mapId, tick, reduced);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (blocked(x, y)) paintWall(ctx, look, x, y);
      else paintFloor(ctx, look, mapId, x, y, w, h);
    }
  }
  paintWater(ctx, mapId, w, h, tick, reduced);
  paintLandmarks(ctx, mapId, tick, reduced, sight);
  paintAmbience(ctx, mapId, w, h, tick, reduced);
  if (sight) paintSightWash(ctx, w * TILE, h * TILE, tick, reduced);

  for (const spot of hotspots) {
    const near = Math.max(Math.abs(spot.x - pos.x), Math.abs(spot.y - pos.y)) <= 1;
    const aimed = hover?.x === spot.x && hover?.y === spot.y;
    paintMarker(ctx, spot, near || aimed || spot.kind === "exit", tick, reduced);
  }

  const trail = party.filter((id) => id !== "wanderer");
  const back = facing === "n" ? [0, 1] : facing === "s" ? [0, -1] : facing === "e" ? [-1, 0] : [1, 0];
  trail.forEach((id, i) => {
    const tx = pos.x + (back[0] ?? 0) * (i + 1);
    const ty = pos.y + (back[1] ?? 0);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || blocked(tx, ty)) return;
    paintPerson(ctx, id, tx * TILE + 24, ty * TILE + 30, facing, tick, reduced, 1);
  });
  paintPerson(ctx, "wanderer", pos.x * TILE + 24, pos.y * TILE + 30, facing, tick, reduced, 1.05);

  const vignette = ctx.createRadialGradient((w * TILE) / 2, (h * TILE) / 2, TILE * 2, (w * TILE) / 2, (h * TILE) / 2, w * TILE);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(8,4,10,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w * TILE, h * TILE);
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

function paintFloor(ctx: CanvasRenderingContext2D, look: RegionLook, mapId: string, x: number, y: number, w: number, h: number) {
  const alt = (x + y) % 2 === 0;
  const speck = (x * 7 + y * 13) % 5;
  ctx.fillStyle = alt ? look.ground[0] : look.ground[1];
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  if (isPath(mapId, x, y, w, h)) {
    ctx.fillStyle = look.path;
    ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x * TILE + 4 + speck, y * TILE + 8 + speck * 2, 3, 2);
  if (mapId === "map.reach" || mapId === "map.woods") {
    ctx.fillStyle = "rgba(125,154,98,0.35)";
    ctx.fillRect(x * TILE + 10, y * TILE + 30, 6, 3);
  }
  if (mapId === "map.ridge" || mapId === "map.highroad") {
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.strokeRect(x * TILE + 2.5, y * TILE + 2.5, TILE - 5, TILE - 5);
  }
}

function isPath(mapId: string, x: number, y: number, w: number, h: number): boolean {
  if (mapId === "map.vale") return x === 9 || x === 10 || y === 8 || y === 7;
  if (mapId === "map.woods" || mapId === "map.shrine") return y === Math.floor(h / 2) || x === Math.floor(w / 2);
  if (mapId === "map.lowbell" || mapId === "map.ferry") return y === 6 || y === 7;
  if (mapId === "map.ridge" || mapId === "map.highroad") return y === 4 || y === 5 || y === 6;
  return x === Math.floor(w / 2);
}

function paintWall(ctx: CanvasRenderingContext2D, look: RegionLook, x: number, y: number) {
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
}

function paintAmbience(ctx: CanvasRenderingContext2D, mapId: string, w: number, h: number, tick: number, reduced: boolean) {
  if (reduced) return;
  if (mapId === "map.ridge" || mapId === "map.highroad" || mapId === "map.berth") {
    ctx.strokeStyle = "rgba(232,220,200,0.25)";
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 28 + ((tick * 2 + i * 10) % 18);
      ctx.beginPath();
      ctx.moveTo(-20 + ((tick * 3 + i * 40) % (w * TILE)), y);
      ctx.lineTo(30 + ((tick * 3 + i * 40) % (w * TILE)), y - 4);
      ctx.stroke();
    }
  }
  if (mapId === "map.vale") {
    ctx.fillStyle = "rgba(232,177,90,0.35)";
    for (let i = 0; i < 8; i++) {
      const x = (i * 90 + tick * 2) % (w * TILE);
      const y = 40 + ((i * 37 + tick) % (h * TILE - 60));
      ctx.fillRect(x, y, 2, 2);
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
) {
  const bob = reduced ? 0 : Math.sin(tick / 5 + cx) * 1.2;
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

function bunting(ctx: CanvasRenderingContext2D, x: number, y: number, count: number) {
  ctx.strokeStyle = "#e8b15a";
  ctx.beginPath();
  ctx.moveTo(x * TILE, y * TILE);
  ctx.lineTo((x + count) * TILE, y * TILE + 10);
  ctx.stroke();
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i % 2 ? "#4ec8c0" : "#e06a5c";
    ctx.beginPath();
    ctx.moveTo(x * TILE + i * TILE, y * TILE + i);
    ctx.lineTo(x * TILE + i * TILE + 8, y * TILE + 12);
    ctx.lineTo(x * TILE + i * TILE - 8, y * TILE + 12);
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
  events: { kind: string; targetId?: string; abilityId?: string }[];
};

export function paintArena(
  canvas: HTMLCanvasElement,
  enc: EncounterLike,
  hero: { x: number; z: number },
  reduced: boolean,
  now = 0,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 640;
  const h = canvas.clientHeight || 320;
  if (canvas.width !== Math.floor(w * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tick = reduced ? 0 : now / 90;
  const asc = enc.mode === "ascension";
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  const backdrop = battleBackdrop(enc.encounterId, asc);
  sky.addColorStop(0, backdrop.top);
  sky.addColorStop(1, backdrop.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (!reduced) {
    ctx.fillStyle = "rgba(243,230,200,0.7)";
    for (let i = 0; i < 16; i++) {
      ctx.globalAlpha = 0.3 + 0.4 * Math.sin(tick / 8 + i);
      ctx.fillRect((i * 73) % w, (i * 29) % (h * 0.4), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = backdrop.ground;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.7, w * 0.42, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = asc ? "rgba(78,200,192,0.55)" : "rgba(232,177,90,0.4)";
  ctx.stroke();
  if (asc) {
    ctx.strokeStyle = "rgba(78,200,192,0.2)";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.62, w * 0.12 * i, h * 0.07 * i, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const fence = [
      [-3.2, -0.2],
      [3.2, -0.2],
      [3.2, 3.4],
      [-3.2, 3.4],
    ].map(([x, z]) => project(w, h, x ?? 0, z ?? 0));
    ctx.strokeStyle = "rgba(243,230,200,0.35)";
    ctx.beginPath();
    fence.forEach((p, i) => (i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py)));
    ctx.closePath();
    ctx.stroke();
  }
  const projectOf = (x: number, z: number) => project(w, h, x, z);
  for (const c of enc.combatants) {
    if (!c.alive && c.side === "enemy") continue;
    const pos = c.side === "party" && asc && c.id === enc.activeActorId ? hero : c.position;
    const z = c.side === "party" && !asc ? 1.6 : pos.z;
    const p = projectOf(pos.x, z);
    if (c.side === "party") {
      paintPerson(ctx, c.id, p.px, p.py, "n", tick, reduced, 1.35);
    } else {
      paintFoe(ctx, c, p.px, p.py, tick, reduced);
    }
    const intent = enc.intents.find((i) => i.actorId === c.id);
    if (intent) {
      const hot = /dirge|rupture|pulse|departure|gale/.test(intent.abilityId);
      ctx.strokeStyle = hot ? "#e06a5c" : "#e8b15a";
      ctx.lineWidth = hot ? 4 : 3;
      ctx.beginPath();
      ctx.arc(p.px, p.py - 10, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const last = enc.events[enc.events.length - 1];
    if (last?.kind === "damage" && last.targetId === c.id) {
      ctx.strokeStyle = "#f3e6c8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.px - 16, p.py - 18);
      ctx.lineTo(p.px + 14, p.py + 4);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const label = c.name;
    ctx.font = "12px Source Sans 3, sans-serif";
    ctx.textAlign = "center";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(12,8,14,0.82)";
    roundRect(ctx, p.px - tw / 2 - 6, p.py + 16, tw + 12, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#f3e6c8";
    ctx.fillText(label, p.px, p.py + 28);
    ctx.fillStyle = "#2a1414";
    ctx.fillRect(p.px - 22, p.py - 36, 44, 5);
    ctx.fillStyle = "#e06a5c";
    ctx.fillRect(p.px - 22, p.py - 36, 44 * (c.hp / Math.max(1, c.maxHp)), 5);
    if (c.id === enc.activeActorId) {
      ctx.strokeStyle = "#e8b15a";
      ctx.strokeRect(p.px - 18, p.py - 40, 36, 64);
    }
    ctx.textAlign = "left";
  }
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
  if (id === "enc.woods" || id === "enc.thicket") return { top: "#142018", bottom: "#0c140e", ground: "rgba(36,50,34,0.55)" };
  return { top: "#2a1c28", bottom: "#140e14", ground: "rgba(74,52,40,0.5)" };
}

function paintFoe(ctx: CanvasRenderingContext2D, c: CombatantLike, x: number, y: number, tick: number, reduced: boolean) {
  const bob = reduced ? 0 : Math.sin(tick / 6) * 2;
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
