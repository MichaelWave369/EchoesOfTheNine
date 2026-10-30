import type { SaveGame } from "../contracts.ts";
import { refreshQuests, setFlag } from "../chronicle/save.ts";
import { JOB_KITS } from "./expanses.ts";

/**
 * The first open sky. A bounded chart, not the walked atlas.
 * map.sky stays locked. Nothing here names the late chronicle.
 * Sight clues. It does not pin a bearing, open a stair, or pay a cache.
 */

export const SKY_W = 18;
export const SKY_H = 12;

export const CINDER_ANSWER = ["ash", "salt", "ember"] as const;

export type SkyFacing = "n" | "s" | "e" | "w";

export const OPEN_COPY = {
  needFly: "The heading waits on a route. Cast off between two pads first.",
  needShadow: "The heading waits on the shadow under the hull. Note it, then come back.",
  needGlass: "The heading waits on both readings of the glass. The chart, and the sky that has not happened yet.",
  needHour: "The heading waits on the Unwritten Hour. Ask it to sit, or finish the page. Either one is enough.",
  needBearings: "Pin the roads from the walk, and the gap from inside the step. Neither pin presses itself.",
  landNeed: "The roads are a walk reading. Step back to Legacy, then pin them.",
  cloudNeed: "The gap is the other view. Step inside, then pin it.",
  landPin: "From the walk, the needle sits on the roads you already know. That half is written.",
  cloudPin: "From inside the step, the needle sits in the gap between those roads. That half is written.",
  landAgain: "The walked roads are already pinned.",
  cloudAgain: "The gap is already pinned.",
  roads:
    "You take the roads you already know and lift them into the air. The needle points along what you have walked. It does not say the other heading was lesser.",
  gap:
    "You take the gap between the roads. The needle points into the unmarked air. It does not say the walked heading was lesser.",
  skyKept: "The first heading is already written. The needle does not flip.",
  spared: "A guardian was asked to sleep. The heading does not pick that story over the other.",
  fallen: "A guardian fell. The heading does not pretend a direction undoes that.",
  hourSat: "An hour was asked to sit. The blank page stays blank. The sky is a different question.",
  hourFell: "An hour was finished. The sky does not reopen that page.",
  oathHeld: "Kael's words stayed put. They do not choose a heading.",
  oathServed: "Kael put a person inside the promise. That promise does not choose a heading.",
  springCarry: "Nessa let the older water work. It does not choose a heading.",
  springGive: "Nessa gave the channel a verse. It does not choose a heading.",
  iriWalk: "Iri is with the company. From a heading, the seam looks like a crease. She will not name what is under it.",
  iriVeil: "A thread from the veil is noted. It does not put Iri in the four, and it does not open what she kept.",
  notOpen: "The sky past the route is not yours yet. The first heading is still unwritten.",
  notPad: "The First Stay leaves a pad: the Vale roof, the Skyweave berth, the Margin if you earned it, or a watch you have already noted.",
  notAboard: "The First Stay is already on the ground.",
  edge: "The first sky has an edge. The First Stay will not cross it.",
  launch: "The First Stay leaves the route. The chart under the hull is a country with edges. It is not every sky.",
  landNo: "There is no pad under the hull. Noting a light is not the same as landing on it.",
  landYes: "The hull sets down.",
  home: "The First Stay returns to the last dock it earned. The chart keeps your place in the air.",
  noteEmpty: "Open air. The chart has nothing new under the hull.",
  noteAgain: "That mark is already on the chart.",
  noteCinder: "Ash and a cold blue under the hull. A watch that is not on any walked road. The pad will take you now.",
  notePad: "A pad you already earned. The hull can set down.",
  noteLater: "A light sits where a later road might be. The hull will not land on a mark that has not agreed to be a place.",
  cacheNeed: "Something keeps a shine under that cloud. A route marker, or a second look, has to admit it before a hand does.",
  cacheTake: "A thread of cloud, pocketed. It keeps a shine. It does not name a later road.",
  cacheGone: "The shine is already in the pack.",
  sightSky: "The air is a step ahead of the hull. Nothing hidden keeps, and nothing lands itself.",
  sightEcho: "A fold in the cloud repeats a minute you have not flown yet. Sight shows it. Writing it down is a separate note.",
  sightCache: "A shine sits under one cloud and will not climb into a hand.",
  sightShear: "The wind here is cut against itself. The shear is weather, not a door.",
  sightDeck: "The chart lists what you already wrote. The ink does not fly.",
  sightCinder: "Ash falls upward for one breath. The stair does not open itself.",
  sightStair: "The order is cut in the cold. Sight can show the nick. It does not press ash, salt, or ember.",
  deckWait: "The wheel waits. Sera is not on this hull.",
  deckSera:
    "Sera has one hand on the wheel and the other on a stay that still remembers which way she lashed it. I can hold a heading. I cannot make the edge of this chart into a second world.",
  deckMira: "Mira is not walking with you.",
  deckKael: "Kael is not walking with you.",
  deckNessa: "Nessa is not walking with you.",
  deckIri: "Iri is not on this hull.",
  miraLine: "From up here the Vale's clock is a bright mistake and the roads are honest. I am not going to correct either one.",
  kaelLine: "The roads still go where people go. Altitude does not make a gate into a better promise.",
  nessaLine: "The river is a dark thread. The moss is still lying. I like it better when I can see the lie from above.",
  iriLine: "The seam is a crease in the land from here. I am not going to name what is under it. The heading did not open it.",
  veilLine: "The thread through the veil is thinner in open air. You can hear it. You cannot hire it. Iri stays where she chose to stay.",
  veilHeard: "You heard the veil from the deck. Iri was not recruited by it.",
  brant:
    "Brant keeps Cinderwatch the way other people keep hours. He counts ash. He does not count you. The light on the post can be banked, or sent along a scratch in the sky. I will not tell you which is kinder.",
  pemma:
    "Pemma bottles the cold that comes off the stair. She says the kite downstairs drafts on people who press the wrong order, and on people who press the right one. Leaving is still allowed.",
  signalAsk: "The post will keep one answer. Bank the light for the watch, or send it along the scratch. Neither one burns the other choice you already made.",
  signalBank: "You bank the light. Cinderwatch keeps it. The scratch in the sky stays scratched. A pane of signal glass comes loose.",
  signalSend: "You send the light along the scratch. The watch keeps its ash. The pane that held the light comes loose anyway.",
  signalKept: "The post already has its answer. It does not take a second one.",
  stairNeed: "The cold stair wants ash, then salt, then ember. Buttons are enough. A look is not a press.",
  stairWrong: "The cold does not take that order.",
  stairOpen: "Ash, salt, ember. The stair decides to be a stair. Something below is already drafting.",
  stairKept: "The stair is already open.",
  kiteShut: "The draft is behind the order. The stair is still a wall.",
  kiteDone: "The kite is weather now. The stair remembers it.",
  kiteWait: "You can leave the draft for later. The rail home does not wait on it.",
  watchLater: "The watch is quieter. Come back when the next weather arrives. It will not be today.",
  chartEmpty: "The chart is a blank country with edges. Nothing extra is written yet.",
  spark: "A spark in the ash. It is not a coat, and Dragoon stays shut.",
} as const;

const HOME_DOCKS = ["dock.vale", "dock.berth", "dock.margin"] as const;

export const SKY_DOCKS = [
  { id: "dock.vale", name: "Lantern Vale", mapId: "map.vale", spawn: "sky_pad", x: 3, y: 9, facing: "e" as const },
  { id: "dock.berth", name: "Skyweave berth", mapId: "map.berth", spawn: "pad", x: 15, y: 9, facing: "w" as const },
  { id: "dock.margin", name: "The Margin", mapId: "map.margin", spawn: "pad", x: 9, y: 3, facing: "s" as const, requires: "flag.margin_dock" },
  { id: "dock.cinder", name: "Cinderwatch", mapId: "map.cinder", spawn: "pad", x: 12, y: 9, facing: "e" as const, requires: "flag.found_cinder" },
] as const;

export const SKY_FINDS = [
  { id: "spire", x: 6, y: 5, flag: "flag.sky_spire", text: "A broken spire hangs where no road was drawn. It is a landmark. It is not a pad." },
  { id: "marker", x: 11, y: 6, flag: "flag.sky_marker", text: "An abandoned route marker, still pointing at a road that is not on this chart. The pointer is a clue. It is not a landing." },
  { id: "echo", x: 8, y: 7, flag: "flag.sky_echo", text: "You write down the fold in the cloud. A minute you have not flown yet stays a minute you have not flown." },
  { id: "shear", x: 5, y: 4, flag: "flag.sky_shear", text: "The wind is cut against itself. Unusual weather. The hull does not have to fight it." },
  { id: "bearing", x: 10, y: 8, flag: "flag.sky_bearing", text: "A needle scratch points toward a cold blue that is not on the walked chart. The scratch is not the landing." },
  { id: "later", x: 14, y: 2, flag: "flag.sky_later", text: OPEN_COPY.noteLater },
  { id: "cache", x: 7, y: 6, flag: "flag.sky_cache_seen", text: "A hidden shine under one cloud. It does not jump into a hand from a note." },
] as const;

function remember(save: SaveGame, id: string, value: string) {
  if (!save.choiceLog.some((c) => c.id === id)) save.choiceLog.push({ id, value });
}

function giveOnce(save: SaveGame, rewardId: string, itemId: string) {
  if (save.flags[`rewarded.${rewardId}`]) return;
  save.flags[`rewarded.${rewardId}`] = true;
  const slot = save.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else save.inventory.push({ itemId, qty: 1 });
}

function say(save: SaveGame, text: string) {
  if (!save.journal.includes(text)) save.journal.push(text);
}

export function headingBlock(save: SaveGame): string | null {
  if (!save.flags["flag.flown"]) return OPEN_COPY.needFly;
  if (!save.flags["flag.hull_shadow"]) return OPEN_COPY.needShadow;
  if (!save.flags["flag.sky_split"]) return OPEN_COPY.needGlass;
  if (!save.flags["flag.hour_complete"]) return OPEN_COPY.needHour;
  return null;
}

function flavor(save: SaveGame): string {
  const bits: string[] = [];
  if (save.flags["flag.warden_spared"] || save.wardenOutcome === "spared") bits.push(OPEN_COPY.spared);
  else if (save.flags["flag.warden_defeated"] || save.wardenOutcome === "defeated") bits.push(OPEN_COPY.fallen);
  if (save.flags["flag.hour_spared"]) bits.push(OPEN_COPY.hourSat);
  else if (save.flags["flag.hour_ended"]) bits.push(OPEN_COPY.hourFell);
  if (save.flags["flag.oath_held"]) bits.push(OPEN_COPY.oathHeld);
  else if (save.flags["flag.oath_served"]) bits.push(OPEN_COPY.oathServed);
  if (save.flags["flag.spring_carry"]) bits.push(OPEN_COPY.springCarry);
  else if (save.flags["flag.spring_channel"]) bits.push(OPEN_COPY.springGive);
  if (save.flags["flag.iri_joined"]) bits.push(OPEN_COPY.iriWalk);
  else if (save.flags["flag.iri_veil"]) bits.push(OPEN_COPY.iriVeil);
  return bits.length ? ` ${bits.join(" ")}` : "";
}

export function pinBearing(
  save: SaveGame,
  which: "land" | "cloud",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (which !== "land" && which !== "cloud") return { ok: false, reason: OPEN_COPY.needBearings };
  const blocked = headingBlock(save);
  if (blocked) return { ok: false, reason: blocked };
  if (save.flags["flag.sky_open"]) return { ok: true, save, text: OPEN_COPY.skyKept };
  if (which === "land") {
    if (save.mode !== "legacy") return { ok: false, reason: OPEN_COPY.landNeed };
    if (save.flags["flag.bearing_land"]) return { ok: true, save, text: OPEN_COPY.landAgain };
    const next = setFlag(save, "flag.bearing_land");
    say(next, OPEN_COPY.landPin);
    return { ok: true, save: next, text: OPEN_COPY.landPin };
  }
  if (save.mode !== "ascension") return { ok: false, reason: OPEN_COPY.cloudNeed };
  if (save.flags["flag.bearing_cloud"]) return { ok: true, save, text: OPEN_COPY.cloudAgain };
  const next = setFlag(save, "flag.bearing_cloud");
  say(next, OPEN_COPY.cloudPin);
  return { ok: true, save: next, text: OPEN_COPY.cloudPin };
}

export function chooseHeading(
  save: SaveGame,
  value: "roads" | "gap",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "roads" && value !== "gap") return { ok: false, reason: OPEN_COPY.needBearings };
  const blocked = headingBlock(save);
  if (blocked) return { ok: false, reason: blocked };
  if (save.flags["flag.sky_open"]) return { ok: true, save, text: OPEN_COPY.skyKept };
  if (!save.flags["flag.bearing_land"] || !save.flags["flag.bearing_cloud"]) return { ok: false, reason: OPEN_COPY.needBearings };
  const roads = value === "roads";
  const text = (roads ? OPEN_COPY.roads : OPEN_COPY.gap) + flavor(save);
  let next = setFlag(save, roads ? "flag.heading_roads" : "flag.heading_gap");
  next = setFlag(next, "flag.sky_open");
  remember(next, "choice.heading", value);
  giveOnce(next, roads ? "heading_roads" : "heading_gap", "item.sky_needle");
  say(next, text);
  if (!next.discoveries.includes("disc.heading")) next.discoveries.push("disc.heading");
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function skyCell(save: SaveGame): { x: number; y: number; facing: SkyFacing } {
  const x = Number(save.flags["sky.x"]);
  const y = Number(save.flags["sky.y"]);
  const facing = save.flags["sky.facing"];
  return {
    x: Number.isFinite(x) ? x : 15,
    y: Number.isFinite(y) ? y : 9,
    facing: facing === "n" || facing === "s" || facing === "e" || facing === "w" ? facing : "w",
  };
}

export function skyInside(x: number, y: number): boolean {
  return x >= 1 && y >= 1 && x <= SKY_W - 2 && y <= SKY_H - 2;
}

function putQuiet(save: SaveGame, id: string, value: boolean | string | number): SaveGame {
  return setFlag(save, id, value);
}

export function stepSky(
  save: SaveGame,
  dir: SkyFacing,
): { ok: true; save: SaveGame } | { ok: false; reason: string } {
  if (!save.flags["flag.sky_open"] || !save.flags["sky.aboard"]) return { ok: false, reason: OPEN_COPY.notAboard };
  if (dir !== "n" && dir !== "s" && dir !== "e" && dir !== "w") return { ok: false, reason: OPEN_COPY.edge };
  const cell = skyCell(save);
  const nx = cell.x + (dir === "e" ? 1 : dir === "w" ? -1 : 0);
  const ny = cell.y + (dir === "s" ? 1 : dir === "n" ? -1 : 0);
  if (!skyInside(nx, ny)) return { ok: false, reason: OPEN_COPY.edge };
  let next = putQuiet(save, "sky.x", nx);
  next = putQuiet(next, "sky.y", ny);
  next = putQuiet(next, "sky.facing", dir);
  return { ok: true, save: next };
}

function dockHere(x: number, y: number) {
  return SKY_DOCKS.find((d) => d.x === x && d.y === y);
}

export function canLand(save: SaveGame, x = skyCell(save).x, y = skyCell(save).y): boolean {
  const dock = dockHere(x, y);
  if (!dock) return false;
  if ("requires" in dock && dock.requires && !save.flags[dock.requires]) return false;
  return true;
}

export function launchSky(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.encounter) return { ok: false, reason: "Not while a fight is open." };
  if (!save.flags["flag.sky_open"]) return { ok: false, reason: OPEN_COPY.notOpen };
  const dock = SKY_DOCKS.find((d) => d.mapId === save.mapId);
  if (!dock) return { ok: false, reason: OPEN_COPY.notPad };
  if ("requires" in dock && dock.requires && !save.flags[dock.requires]) return { ok: false, reason: OPEN_COPY.notPad };
  let next = putQuiet(save, "sky.aboard", true);
  next = putQuiet(next, "sky.x", dock.x);
  next = putQuiet(next, "sky.y", dock.y);
  next = putQuiet(next, "sky.facing", dock.facing);
  if (HOME_DOCKS.includes(dock.id as (typeof HOME_DOCKS)[number])) next = putQuiet(next, "sky.dock", dock.id);
  else if (!HOME_DOCKS.includes(String(next.flags["sky.dock"]) as (typeof HOME_DOCKS)[number])) next = putQuiet(next, "sky.dock", "dock.berth");
  say(next, OPEN_COPY.launch);
  if (!next.discoveries.includes("disc.sky_atlas")) next.discoveries.push("disc.sky_atlas");
  return { ok: true, save: next, text: OPEN_COPY.launch };
}

export function boardFromDeck(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.mapId !== "map.deck") return { ok: false, reason: OPEN_COPY.notPad };
  if (!save.flags["flag.sky_open"]) return { ok: false, reason: OPEN_COPY.notOpen };
  const next = putQuiet(save, "sky.aboard", true);
  return { ok: true, save: next, text: "Back to the rail. The chart has not moved." };
}

export function castOff(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.mapId === "map.deck") return boardFromDeck(save);
  return launchSky(save);
}

export function returnDock(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["sky.aboard"] && save.mapId !== "map.deck") return { ok: false, reason: OPEN_COPY.notAboard };
  let dockId = String(save.flags["sky.dock"] || "dock.berth");
  if (dockId === "dock.margin" && !save.flags["flag.margin_dock"]) dockId = "dock.berth";
  const dock = SKY_DOCKS.find((d) => d.id === dockId) ?? SKY_DOCKS[1];
  let next = putQuiet(save, "sky.aboard", false);
  next.mapId = dock.mapId;
  next.spawnId = dock.spawn;
  next.encounter = null;
  say(next, OPEN_COPY.home);
  return { ok: true, save: next, text: OPEN_COPY.home };
}

export function landAt(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["sky.aboard"]) return { ok: false, reason: OPEN_COPY.notAboard };
  const cell = skyCell(save);
  if (!canLand(save, cell.x, cell.y)) return { ok: false, reason: OPEN_COPY.landNo };
  const dock = dockHere(cell.x, cell.y)!;
  let next = putQuiet(save, "sky.aboard", false);
  next.mapId = dock.mapId;
  next.spawnId = dock.spawn;
  next.encounter = null;
  const text = `${OPEN_COPY.landYes} ${dock.name}.`;
  say(next, text);
  if (!next.discoveries.includes(`place.${dock.mapId}`)) next.discoveries.push(`place.${dock.mapId}`);
  return { ok: true, save: next, text };
}

export function walkDeck(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["sky.aboard"]) return { ok: false, reason: OPEN_COPY.notAboard };
  let next = putQuiet(save, "sky.aboard", false);
  next.mapId = "map.deck";
  next.spawnId = "chart";
  next.encounter = null;
  return { ok: true, save: next, text: "You step off the rail and onto the deck. The chart is still the chart." };
}

export function noteSky(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["sky.aboard"]) return { ok: false, reason: OPEN_COPY.notAboard };
  const cell = skyCell(save);
  const dock = dockHere(cell.x, cell.y);
  if (dock?.id === "dock.cinder") {
    if (save.flags["flag.found_cinder"]) return { ok: true, save, text: OPEN_COPY.noteAgain };
    const next = setFlag(save, "flag.found_cinder");
    say(next, OPEN_COPY.noteCinder);
    if (!next.discoveries.includes("disc.cinder")) next.discoveries.push("disc.cinder");
    return { ok: true, save: next, text: OPEN_COPY.noteCinder };
  }
  if (dock && canLand(save, cell.x, cell.y)) return { ok: true, save, text: OPEN_COPY.notePad };
  const find = SKY_FINDS.find((f) => f.x === cell.x && f.y === cell.y);
  if (!find) return { ok: true, save, text: OPEN_COPY.noteEmpty };
  if (save.flags[find.flag]) return { ok: true, save, text: OPEN_COPY.noteAgain };
  const next = setFlag(save, find.flag);
  say(next, find.text);
  if (!next.discoveries.includes(`disc.${find.id}`)) next.discoveries.push(`disc.${find.id}`);
  return { ok: true, save: next, text: find.text };
}

export function takeCache(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["sky.aboard"]) return { ok: false, reason: OPEN_COPY.notAboard };
  const cell = skyCell(save);
  const cache = SKY_FINDS.find((f) => f.id === "cache");
  if (!cache || cell.x !== cache.x || cell.y !== cache.y) return { ok: false, reason: OPEN_COPY.cacheNeed };
  if (save.flags["flag.sky_cache"]) return { ok: false, reason: OPEN_COPY.cacheGone };
  if (!save.flags["flag.sight_sky_cache"] && !save.flags["flag.sky_marker"]) return { ok: false, reason: OPEN_COPY.cacheNeed };
  let next = setFlag(save, "flag.sky_cache");
  giveOnce(next, "sky_cache", "item.cloud_thread");
  say(next, OPEN_COPY.cacheTake);
  return { ok: true, save: next, text: OPEN_COPY.cacheTake };
}

/** Overlay only. Does not pin, land, open the stair, or pay the cache. */
export function beginOpenSkySight(save: SaveGame): { save: SaveGame; text: string } | null {
  const aboard = Boolean(save.flags["sky.aboard"]);
  const grounded = save.mapId === "map.deck" || save.mapId === "map.cinder" || save.mapId === "map.ashvault";
  if (!aboard && !grounded) return null;
  let flagId = "flag.sight_sky";
  let text: string = OPEN_COPY.sightSky;
  if (save.mapId === "map.deck" && !aboard) {
    flagId = "flag.sight_deck";
    text = OPEN_COPY.sightDeck;
  } else if (save.mapId === "map.cinder" && !aboard) {
    flagId = "flag.sight_cinder";
    text = OPEN_COPY.sightCinder;
  } else if (save.mapId === "map.ashvault" && !aboard) {
    flagId = "flag.sight_ashvault";
    text = OPEN_COPY.sightStair;
  } else if (aboard) {
    const cell = skyCell(save);
    const echo = SKY_FINDS.find((f) => f.id === "echo")!;
    const cache = SKY_FINDS.find((f) => f.id === "cache")!;
    const shear = SKY_FINDS.find((f) => f.id === "shear")!;
    if (cell.x === echo.x && cell.y === echo.y) {
      flagId = "flag.sight_sky_echo";
      text = OPEN_COPY.sightEcho;
    } else if (cell.x === cache.x && cell.y === cache.y) {
      flagId = "flag.sight_sky_cache";
      text = OPEN_COPY.sightCache;
    } else if (cell.x === shear.x && cell.y === shear.y) {
      flagId = "flag.sight_sky_shear";
      text = OPEN_COPY.sightShear;
    }
  }
  const next = save.flags[flagId] ? structuredClone(save) : setFlag(save, flagId);
  next.sightScene = flagId;
  next.sightSteps = 8;
  say(next, text);
  return { save: next, text };
}

export function lookFromSky(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.temporal_sight"]) return { ok: false, reason: "The sight is not awake." };
  if (save.sightCharges <= 0) return { ok: false, reason: "The sight is tired. Sleep at the Ninth Wick." };
  const spent = structuredClone(save);
  spent.sightCharges -= 1;
  const scene = beginOpenSkySight(spent);
  if (!scene) return { ok: false, reason: OPEN_COPY.sightSky };
  return { ok: true, save: scene.save, text: scene.text };
}

export function chooseSignal(
  save: SaveGame,
  value: "bank" | "send",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "bank" && value !== "send") return { ok: false, reason: OPEN_COPY.signalAsk };
  if (!save.flags["flag.found_cinder"] && save.mapId !== "map.cinder") return { ok: false, reason: OPEN_COPY.signalAsk };
  if (save.flags["flag.cinder_signal"]) return { ok: true, save, text: OPEN_COPY.signalKept };
  const bank = value === "bank";
  const text = bank ? OPEN_COPY.signalBank : OPEN_COPY.signalSend;
  let next = setFlag(save, bank ? "flag.cinder_bank" : "flag.cinder_send");
  next = setFlag(next, "flag.cinder_signal");
  remember(next, "choice.signal", value);
  giveOnce(next, bank ? "signal_bank" : "signal_send", "item.signal_glass");
  say(next, text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function setCinderOrder(
  save: SaveGame,
  picks: readonly string[],
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.flags["flag.cinder_stair"]) return { ok: true, save, text: OPEN_COPY.stairKept };
  const match = picks.length === CINDER_ANSWER.length && picks.every((p, i) => p === CINDER_ANSWER[i]);
  if (!match) return { ok: false, reason: OPEN_COPY.stairWrong };
  const next = setFlag(save, "flag.cinder_stair");
  say(next, OPEN_COPY.stairOpen);
  return { ok: true, save: next, text: OPEN_COPY.stairOpen };
}

function seated(save: SaveGame, id: string): boolean {
  return save.party.includes(id) || (save.reserve ?? []).includes(id);
}

export function talkCrew(
  save: SaveGame,
  who: "sera" | "mira" | "kael" | "nessa" | "iri" | "veil" | "brant" | "pemma" | "watch",
): { ok: true; save: SaveGame; text: string; speaker: string } | { ok: false; reason: string } {
  if (who === "sera") {
    if (!seated(save, "sera") && !save.flags["flag.sera_joined"]) return { ok: true, save, text: OPEN_COPY.deckWait, speaker: "The wheel" };
    const stay = save.flags["flag.sera_stay"] ? " The safer stay is still the one she lashed." : " The hot splice is still the one she finished.";
    const next = save.flags["flag.crew_sera"] ? save : setFlag(save, "flag.crew_sera");
    return { ok: true, save: next, text: OPEN_COPY.deckSera + stay, speaker: "Sera" };
  }
  if (who === "mira") {
    if (!seated(save, "mira")) return { ok: false, reason: OPEN_COPY.deckMira };
    const next = save.flags["flag.crew_mira"] ? save : setFlag(save, "flag.crew_mira");
    return { ok: true, save: next, text: OPEN_COPY.miraLine, speaker: "Mira" };
  }
  if (who === "kael") {
    if (!seated(save, "kael")) return { ok: false, reason: OPEN_COPY.deckKael };
    const next = save.flags["flag.crew_kael"] ? save : setFlag(save, "flag.crew_kael");
    return { ok: true, save: next, text: OPEN_COPY.kaelLine, speaker: "Kael" };
  }
  if (who === "nessa") {
    if (!seated(save, "nessa")) return { ok: false, reason: OPEN_COPY.deckNessa };
    const next = save.flags["flag.crew_nessa"] ? save : setFlag(save, "flag.crew_nessa");
    return { ok: true, save: next, text: OPEN_COPY.nessaLine, speaker: "Nessa" };
  }
  if (who === "iri") {
    if (!save.flags["flag.iri_joined"] || !seated(save, "iri")) return { ok: false, reason: OPEN_COPY.deckIri };
    const next = save.flags["flag.crew_iri"] ? save : setFlag(save, "flag.crew_iri");
    return { ok: true, save: next, text: OPEN_COPY.iriLine, speaker: "Iri" };
  }
  if (who === "veil") {
    if (save.flags["flag.iri_joined"] || !save.flags["flag.iri_veil"]) return { ok: false, reason: OPEN_COPY.deckIri };
    const next = save.flags["flag.sky_veil_heard"] ? save : setFlag(save, "flag.sky_veil_heard");
    say(next, OPEN_COPY.veilHeard);
    return { ok: true, save: next, text: OPEN_COPY.veilLine, speaker: "A thread" };
  }
  if (who === "brant") {
    const next = save.flags["flag.spoke_brant"] ? save : setFlag(save, "flag.spoke_brant");
    return { ok: true, save: next, text: OPEN_COPY.brant, speaker: "Brant" };
  }
  if (who === "pemma") {
    const next = save.flags["flag.spoke_pemma"] ? save : setFlag(save, "flag.spoke_pemma");
    return { ok: true, save: next, text: OPEN_COPY.pemma, speaker: "Pemma" };
  }
  const next = save.flags["flag.cinder_later"] ? save : setFlag(save, "flag.cinder_later");
  return { ok: true, save: next, text: OPEN_COPY.watchLater, speaker: "Cinderwatch" };
}

export function chartText(save: SaveGame): string {
  const lines: string[] = [];
  for (const find of SKY_FINDS) {
    if (save.flags[find.flag]) lines.push(find.text);
  }
  if (save.flags["flag.found_cinder"]) lines.push(OPEN_COPY.noteCinder);
  if (save.flags["flag.sky_cache"]) lines.push(OPEN_COPY.cacheTake);
  if (!lines.length) return OPEN_COPY.chartEmpty;
  return lines.join(" ");
}

export function headingObjective(save: SaveGame): string | null {
  if (!save.flags["flag.hour_complete"]) return null;
  if (!save.flags["flag.sky_open"]) {
    if (headingBlock(save)) return null;
    if (!save.flags["flag.bearing_land"] || !save.flags["flag.bearing_cloud"]) {
      return "The first heading is at the berth, one step east of the pad. Pin the roads from the walk and the gap from inside the step. Sight will not pin them.";
    }
    return "Both bearings are written. Choose the roads you know, or the gap between them. Neither heading is the cleaner one.";
  }
  if (!save.flags["flag.found_cinder"]) return "The sky is open. Leave the route when you want. Note what is under the hull before you ask a new place to take you.";
  if (!save.flags["flag.cinder_signal"]) return "Cinderwatch will take the hull. Brant is counting ash. Bank the light, or send it. Neither answer burns the other.";
  if (!save.flags["flag.cinder_stair"]) return "The cold stair under Cinderwatch wants ash, then salt, then ember. Buttons are enough.";
  if (!save.flags["flag.ashkite_cleared"]) return OPEN_COPY.kiteWait;
  return null;
}

export function skyClues(save: SaveGame): string[] {
  const clues: string[] = [];
  if (save.flags["flag.bearing_land"]) clues.push("Heading: the walked roads are pinned.");
  if (save.flags["flag.bearing_cloud"]) clues.push("Heading: the gap is pinned.");
  if (save.flags["flag.heading_roads"]) clues.push("You took the roads you know. The other heading was not lesser.");
  if (save.flags["flag.heading_gap"]) clues.push("You took the gap. The walked heading was not lesser.");
  if (save.flags["flag.found_cinder"]) clues.push("Cinderwatch is a pad. Ash, and a cold blue.");
  if (save.flags["flag.sky_later"]) clues.push("A later light will not take the hull.");
  if (save.flags["flag.sky_echo"]) clues.push("A cloud fold is written down. It was not solved by looking.");
  if (save.flags["flag.sight_sky_echo"] && !save.flags["flag.sky_echo"]) clues.push("Sight showed a fold in the cloud. It is not written down until you note it.");
  if (save.flags["flag.cinder_bank"]) clues.push("Cinderwatch banked the light.");
  if (save.flags["flag.cinder_send"]) clues.push("Cinderwatch sent the light along the scratch.");
  if (save.flags["flag.dragoon_spark"]) clues.push(OPEN_COPY.spark);
  if (save.flags["flag.sky_veil_heard"]) clues.push(OPEN_COPY.veilHeard);
  return clues;
}

export function dragoonStillShut(): boolean {
  return JOB_KITS.find((j) => j.id === "job.dragoon")?.playable === false;
}
