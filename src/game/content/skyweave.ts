import type { SaveGame } from "../contracts.ts";
import { bumpBond, refreshQuests, setFlag } from "../chronicle/save.ts";
import { makeCombatant } from "./characters.ts";
import { syncLevels } from "./gear.ts";

/**
 * Skyweave Ridge. Optional after the high road gate.
 * Nothing here names the late chronicle. Sight clues do not press the lens.
 */

export const ACTIVE_CAP = 4;

export const BENCH_MAPS = ["map.vale", "map.inn", "map.smith", "map.ferry", "map.highroad", "map.ridge", "map.berth", "map.margin", "map.deck", "map.cinder"] as const;

export const SKIFF_DOCKS = [
  { id: "dock.vale", name: "Lantern Vale", mapId: "map.vale", spawn: "sky_pad", blurb: "The north roof of the square." },
  { id: "dock.berth", name: "Skyweave berth", mapId: "map.berth", spawn: "pad", blurb: "The pad above the mist." },
] as const;

export const MARGIN_DOCK = {
  id: "dock.margin",
  name: "The Margin",
  mapId: "map.margin",
  spawn: "pad",
  blurb: "A stair under an hour that left before you did.",
} as const;

export type SkiffDockId = (typeof SKIFF_DOCKS)[number]["id"] | typeof MARGIN_DOCK.id;

/** Two pads, plus the Margin only after its flag. Open sky is never in this list. */
export function routeDocks(save: SaveGame) {
  if (save.flags["flag.margin_dock"]) return [...SKIFF_DOCKS, MARGIN_DOCK];
  return [...SKIFF_DOCKS];
}

export const SKY_COPY = {
  seraAsk:
    "Sera Vane has grease on her cheek and a rig that is only half a hull. I am Sera. I build things that should stay in the air. This splice is either brilliant or a very loud mistake. I can finish it hot, or lash the safer stay. I will not pretend those are the same idea.",
  seraSplice:
    "Then it is the hot splice. If it holds, the First Stay will. If it doesn't, we will be honest about the noise. Four is the line. If your road is already full, I wait at the rig until you make a place.",
  seraStay:
    "Then the stay is the safer lash. Slower, and less likely to teach the ridge a new word for falling. I can live with careful. Four is the line. If your road is already full, I wait at the rig until you make a place.",
  seraBack:
    "The rig remembers which choice you made. I have not sanded it into a better story.",
  seraReserved: "Sera is with the company, and not in the four. The rig will hold her until the line has a place.",
  seraActive: "Sera steps into the four. Her tools stay hers.",
  ada: "Ada Vane keeps the mill. The ridge is a path, not a country. The glass to the east writes noon down before the sun agrees. I do not correct Orrin. He does not correct the wind.",
  adaAfter:
    "The gale sat or it didn't. Either way the berth is a place. Stayline is a cut that asks the air to hold still for one beat. It is yours if you want the work. It does not explain the noon.",
  adaTaught: "Stayline is already in the kit.",
  orrin:
    "Orrin Glass taps a chart that has already finished a noon the sky has not started. I record what the glass insists. I do not record what I wish. Read it from the walk. Read the sky from the other view. I will not press either for you.",
  chartNeed: "The chart is a walk reading. Step back to Legacy, then read it.",
  skyNeed: "The early sky is the other view. Step inside, then read it.",
  chartRead: "From the walk, the chart says the eclipse already stood at noon. That half is written.",
  skyRead: "From inside the step, the sky is clear and the eclipse is drawn ahead of the sun. That half is written.",
  chartAgain: "The chart's noon is already in the book.",
  skyAgain: "The early sky is already in the book.",
  split: "Both readings are kept. The chart is late to its own page, or the sky is early. The lens does not say which. A shard comes loose. It remembers a light. It does not remember an hour.",
  splitAlready: "The two noons are already recorded.",
  domeShut: "The inner arch wants both readings. The chart, and the sky that has not happened yet.",
  domeGust: "A gust is still occupying the west room.",
  domeOpen: "The arch decides to be a door.",
  caveEmpty: "The pocket is empty. Aggressively empty.",
  caveTake: "A pinch of cloud salt, from a pocket that was not here until you looked twice. It seasons nothing. It keeps a shine.",
  caveGone: "Salt already pocketed.",
  bridge: "Half a span. The other half is drawn in the wind, and then it isn't. Do not trust a step the stone has not agreed to.",
  wrenUp: "The stair does not end at me. Skyweave is the ridge. Someone up there is arguing with a hull.",
  wrenSera: "Sera has opinions about stays and splices. I have opinions about not falling. We are both still employed.",
  wrenNoon: "You wrote two noons. I watched a shadow leave the berth before the hull. I will not tell you which noon it belongs to.",
  haleDown: "You came down on a route, not a rumor. My nine and her ten are still both warm. The sky did not pick for us.",
  ivoNoon: "A bell that finishes late, and a glass that finishes early. I will not pretend those are the same unfinished thing.",
  liraRoof: "The roof is a dock now. I counted the lanterns. I still get nine. The sky was less cooperative.",
  wakeNeed: "Crosswind wants Gust practiced twice, and the ridge finished. The air does not tutor strangers.",
  wakeLearned: "Gust repeats until the second cut is the spell. Crosswind. It remembers the ridge. It does not explain the noon.",
  wakeAlready: "Crosswind is already hers.",
  stayNeed: "Stayline waits until the gale is settled, by asking or by ending.",
  stayLearned: "Stayline. One beat where the air holds still. It is a technique, not an answer.",
  skiffShut: "The First Stay is a hull with opinions. It will not cast off until the berth is truly open.",
  skiffHere: "You are already on that pad.",
  skiffAway: "The skiff only leaves from a pad: the Vale roof, the Skyweave berth, or a third pad you have earned.",
  skiffFly: "The First Stay takes the route. It is a line between two pads, not a country, and not an open sky.",
  skiffMargin: "The Margin is not a pad yet. Four written hours open it. The sky stays shut.",
  skiffThird: "The First Stay takes the third pad. It is still a line, not a country, and the sky stays shut.",
  hullEarly: "The shadow under the hull is not ready to be noticed. Fly once.",
  hullNote: "A second shadow leaves before the craft does. It is recorded. It is not explained.",
  hullAgain: "The early shadow is already in the book.",
  benchFight: "Not while a fight is open. A bench does not copy a pack or a breath.",
  benchPlace: "The line changes where the road is quiet: the Vale, the Wick, Bram's, the station, the high gate, the ridge, the berth, the First Stay's deck, or Cinderwatch.",
  benchYou: "You are the road. You do not wait on the rig.",
  benchWho: "They are not walking with you.",
  benchFull: "Four is the line. Send someone to the rig first.",
  benchOut: "They wait at the rig. Their kit, their bond, and their pack stay theirs.",
  benchIn: "They step back into the four. Nothing in the pack doubled.",
  formSame: "The line is already held that way.",
  formFight: "Not while a fight is open.",
  formLine: "Close line. You stand near enough that a true hit lands harder.",
  formWide: "Loose line. You stand far enough that a hit lands softer, and a wide note has more air between you.",
  sightRidge: "A bridge span completes itself a step before the boots. The wind is rehearsing a crossing. Nothing walks it for you.",
  sightGlass:
    "An eclipse sits ahead of the sun. The chart on the wall has already given that noon away. Neither one crosses the other out. The lens does not turn.",
  sightCave: "A pocket in the rock was not here, and then it is. Something small keeps a shine. It does not jump into a hand.",
  sightBerth: "The hull throws a second shadow that leaves before the craft does. The pad does not explain it.",
} as const;

function give(save: SaveGame, itemId: string) {
  const slot = save.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else save.inventory.push({ itemId, qty: 1 });
}

export function formationSlot(formation: "line" | "wide", index: number): { x: number; z: number } {
  const line = [
    { x: -1.7, z: 1.8 },
    { x: -0.5, z: 2.3 },
    { x: 0.7, z: 1.8 },
    { x: 1.7, z: 2.2 },
  ];
  const wide = [
    { x: -2.6, z: 3.7 },
    { x: -0.9, z: 4 },
    { x: 0.9, z: 3.7 },
    { x: 2.6, z: 4 },
  ];
  const row = formation === "wide" ? wide : line;
  return row[index] ?? row[0]!;
}

export function setFormation(
  save: SaveGame,
  formation: "line" | "wide",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.encounter) return { ok: false, reason: SKY_COPY.formFight };
  if ((save.formation ?? "line") === formation) return { ok: false, reason: SKY_COPY.formSame };
  const next = structuredClone(save);
  next.formation = formation;
  return { ok: true, save: next, text: formation === "wide" ? SKY_COPY.formWide : SKY_COPY.formLine };
}

function bringSera(save: SaveGame): SaveGame {
  const next = save;
  if (!next.roster.sera) {
    next.roster.sera = makeCombatant("sera", { position: { x: 1.6, z: 2.2 } });
  }
  next.knownSpells.sera = next.knownSpells.sera?.length ? next.knownSpells.sera : ["spell.gust"];
  if (!next.equipment.sera) next.equipment.sera = {};
  next.bonds.sera = next.bonds.sera ?? 1;
  next.reserve = next.reserve ?? [];
  if (next.party.includes("sera") || next.reserve.includes("sera")) return next;
  if (next.party.length < ACTIVE_CAP) next.party.push("sera");
  else {
    next.reserve.push("sera");
    const line = SKY_COPY.seraReserved;
    if (!next.journal.includes(line)) next.journal.push(line);
  }
  syncLevels(next);
  return next;
}

export function chooseSera(
  save: SaveGame,
  value: "splice" | "stay",
): { save: SaveGame; text: string } | null {
  if (value !== "splice" && value !== "stay") return null;
  if (save.choiceLog.some((c) => c.id === "choice.sera")) return null;
  if (save.flags["flag.sera_joined"]) return null;
  let next = structuredClone(save);
  next.choiceLog.push({ id: "choice.sera", value });
  next = setFlag(next, value === "splice" ? "flag.sera_splice" : "flag.sera_stay");
  next = setFlag(next, "flag.sera_joined");
  next = bringSera(next);
  if (value === "splice") give(next, "accessory.risk_splice");
  else give(next, "accessory.stay_pin");
  const text = value === "splice" ? SKY_COPY.seraSplice : SKY_COPY.seraStay;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { save: next, text };
}

export function benchToggle(
  save: SaveGame,
  id: string,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.encounter) return { ok: false, reason: SKY_COPY.benchFight };
  if (!BENCH_MAPS.includes(save.mapId as (typeof BENCH_MAPS)[number])) return { ok: false, reason: SKY_COPY.benchPlace };
  if (id === "wanderer") return { ok: false, reason: SKY_COPY.benchYou };
  const reserve = save.reserve ?? [];
  const inParty = save.party.includes(id);
  const inReserve = reserve.includes(id);
  if (!inParty && !inReserve) return { ok: false, reason: SKY_COPY.benchWho };
  if (!save.roster[id]) return { ok: false, reason: SKY_COPY.benchWho };
  const next = structuredClone(save);
  next.reserve = [...(next.reserve ?? [])];
  if (inParty) {
    next.party = next.party.filter((x) => x !== id);
    if (!next.party.includes("wanderer")) next.party.unshift("wanderer");
    if (!next.reserve.includes(id)) next.reserve.push(id);
    return { ok: true, save: next, text: SKY_COPY.benchOut };
  }
  if (next.party.length >= ACTIVE_CAP) return { ok: false, reason: SKY_COPY.benchFull };
  next.reserve = next.reserve.filter((x) => x !== id);
  next.party.push(id);
  return { ok: true, save: next, text: SKY_COPY.benchIn };
}

export function talkAda(save: SaveGame): { save: SaveGame; text: string } {
  let next = save.flags["flag.spoke_ada"] ? save : setFlag(save, "flag.spoke_ada");
  const taught = tryLearnStayline(next);
  if (taught.ok) next = taught.save;
  const bits: string[] = [SKY_COPY.ada];
  if (save.flags["flag.ridge_complete"]) bits.push(taught.ok ? taught.text : SKY_COPY.adaAfter);
  else if ((save.spellMastery["spell.gust"] ?? 0) > 0) bits.push(SKY_COPY.stayNeed);
  return { save: next, text: bits.join(" ") };
}

export function talkOrrin(save: SaveGame): { save: SaveGame; text: string } {
  const next = save.flags["flag.spoke_orrin"] ? save : setFlag(save, "flag.spoke_orrin");
  return { save: next, text: SKY_COPY.orrin };
}

export function talkSera(save: SaveGame): { save: SaveGame; text: string } {
  let next = bumpBond(save, "sera");
  const taught = tryLearnCrosswind(next);
  if (taught.ok) next = taught.save;
  const bits: string[] = [SKY_COPY.seraBack];
  if (save.flags["flag.sera_splice"]) bits.push("The hot splice is still the one we kept.");
  if (save.flags["flag.sera_stay"]) bits.push("The safer stay is still the one we kept.");
  if (taught.ok) bits.push(taught.text);
  else if ((save.spellMastery["spell.gust"] ?? 0) > 0 && !save.knownSpells.sera?.includes("spell.crosswind")) bits.push(SKY_COPY.wakeNeed);
  if (save.flags["flag.sky_split"]) bits.push("Two noons. I will not pick a kinder sun.");
  if (save.flags["flag.hull_shadow"]) bits.push("I saw the shadow leave early. I am not going to name it.");
  return { save: next, text: bits.join(" ") };
}

export function wrenSky(save: SaveGame): string {
  const bits: string[] = [];
  if (save.flags["flag.ferry_complete"]) bits.push(SKY_COPY.wrenUp);
  if (save.flags["flag.sera_joined"]) bits.push(SKY_COPY.wrenSera);
  if (save.flags["flag.sky_split"] || save.flags["flag.hull_shadow"]) bits.push(SKY_COPY.wrenNoon);
  return bits.length ? ` ${bits.join(" ")}` : "";
}

export function revisitLine(who: "hale" | "ivo" | "lira", save: SaveGame): string {
  if (who === "hale" && save.flags["flag.flown"]) return ` ${SKY_COPY.haleDown}`;
  if (who === "ivo" && (save.flags["flag.sky_split"] || save.flags["flag.sight_glass"])) return ` ${SKY_COPY.ivoNoon}`;
  if (who === "lira" && save.flags["flag.flown"]) return ` ${SKY_COPY.liraRoof}`;
  return "";
}

export function skyCoda(id: "mira" | "kael" | "nessa", flags: Record<string, boolean | string | number>): string {
  if (!flags["flag.sera_joined"] && !flags["flag.sky_split"] && !flags["flag.ridge_complete"]) return "";
  const bits: string[] = [];
  if (id === "mira" && flags["flag.sky_split"]) {
    bits.push(
      flags["flag.mira_blank"]
        ? "Two noons. A blank page was a kindness once. This glass does not want one. I will keep both."
        : "Two noons. I will not pick a kinder sun.",
    );
  }
  if (id === "kael" && flags["flag.ridge_complete"]) {
    bits.push(
      flags["flag.kael_law"]
        ? "The gate held, and so did the arch. I can live with a chart that tells the truth it has."
        : "Pell finished a walk. This ridge will finish whichever noon it is keeping. I am still watching which one it loves.",
    );
  }
  if (id === "nessa" && flags["flag.sera_joined"]) {
    bits.push(
      flags["flag.nessa_spring"]
        ? "I taught an old rhyme once. The wind is not moss. I will not make it pretend to be spring."
        : "A new verse stood in the Reach. Sera's splice is doing something ruder, and I like her for not apologizing.",
    );
  }
  return bits.length ? ` ${bits.join(" ")}` : "";
}

function maybeSplit(save: SaveGame): SaveGame {
  if (!save.flags["flag.sky_chart"] || !save.flags["flag.sky_ahead"] || save.flags["flag.sky_split"]) return save;
  let next = setFlag(save, "flag.sky_split");
  if (!next.inventory.some((i) => i.itemId === "item.lens_shard")) give(next, "item.lens_shard");
  if (!next.journal.includes(SKY_COPY.split)) next.journal.push(SKY_COPY.split);
  if (!next.discoveries.includes("disc.two_noons")) next.discoveries.push("disc.two_noons");
  refreshQuests(next);
  return next;
}

export function readGlass(
  save: SaveGame,
  view: "chart" | "sky",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (view === "chart") {
    if (save.mode !== "legacy") return { ok: false, reason: SKY_COPY.chartNeed };
    if (save.flags["flag.sky_chart"]) return { ok: true, save, text: SKY_COPY.chartAgain };
    return { ok: true, save: maybeSplit(setFlag(save, "flag.sky_chart")), text: save.flags["flag.sky_ahead"] ? SKY_COPY.split : SKY_COPY.chartRead };
  }
  if (save.mode !== "ascension") return { ok: false, reason: SKY_COPY.skyNeed };
  if (save.flags["flag.sky_ahead"]) return { ok: true, save, text: SKY_COPY.skyAgain };
  return { ok: true, save: maybeSplit(setFlag(save, "flag.sky_ahead")), text: save.flags["flag.sky_chart"] ? SKY_COPY.split : SKY_COPY.skyRead };
}

export function tryDome(save: SaveGame): { ok: true; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.sky_split"]) return { ok: false, reason: SKY_COPY.domeShut };
  if (!save.flags["flag.cleared.enc.gust"]) return { ok: false, reason: SKY_COPY.domeGust };
  return { ok: true, text: SKY_COPY.domeOpen };
}

export function takeCloudSalt(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.sight_cave"]) return { ok: false, reason: SKY_COPY.caveEmpty };
  if (save.flags["flag.got_cloud_salt"]) return { ok: false, reason: SKY_COPY.caveGone };
  const next = setFlag(save, "flag.got_cloud_salt");
  give(next, "item.cloud_salt");
  return { ok: true, save: next, text: SKY_COPY.caveTake };
}

export function tryLearnStayline(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.knownSpells.sera?.includes("atk.stayline")) return { ok: false, reason: SKY_COPY.adaTaught };
  if (!save.flags["flag.ridge_complete"] || !save.roster.sera) return { ok: false, reason: SKY_COPY.stayNeed };
  const next = structuredClone(save);
  next.knownSpells.sera = [...new Set([...(next.knownSpells.sera ?? ["spell.gust"]), "atk.stayline"])];
  if (!next.discoveries.includes("atk.stayline")) next.discoveries.push("atk.stayline");
  if (!next.journal.includes(SKY_COPY.stayLearned)) next.journal.push(SKY_COPY.stayLearned);
  return { ok: true, save: next, text: SKY_COPY.stayLearned };
}

export function tryLearnCrosswind(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.knownSpells.sera?.includes("spell.crosswind")) return { ok: false, reason: SKY_COPY.wakeAlready };
  if (!save.roster.sera) return { ok: false, reason: SKY_COPY.wakeNeed };
  if ((save.spellMastery["spell.gust"] ?? 0) < 2 || !save.flags["flag.ridge_complete"]) return { ok: false, reason: SKY_COPY.wakeNeed };
  const next = structuredClone(save);
  next.knownSpells.sera = [...new Set([...(next.knownSpells.sera ?? []), "spell.crosswind"])];
  if (!next.choiceLog.some((c) => c.id === "spell.crosswind")) {
    next.choiceLog.push({ id: "spell.crosswind", value: save.flags["flag.sera_stay"] ? "stay" : "splice" });
  }
  if (!next.discoveries.includes("spell.crosswind")) next.discoveries.push("spell.crosswind");
  if (!next.journal.includes(SKY_COPY.wakeLearned)) next.journal.push(SKY_COPY.wakeLearned);
  return { ok: true, save: next, text: SKY_COPY.wakeLearned };
}

export function flyTo(
  save: SaveGame,
  dockId: SkiffDockId,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.encounter) return { ok: false, reason: SKY_COPY.benchFight };
  if (!save.flags["flag.skiff_ready"]) return { ok: false, reason: SKY_COPY.skiffShut };
  const pads = [...SKIFF_DOCKS, MARGIN_DOCK];
  if (!pads.some((d) => d.mapId === save.mapId)) return { ok: false, reason: SKY_COPY.skiffAway };
  if (dockId === "dock.margin" && !save.flags["flag.margin_dock"]) return { ok: false, reason: SKY_COPY.skiffMargin };
  const dock = routeDocks(save).find((d) => d.id === dockId);
  if (!dock) return { ok: false, reason: SKY_COPY.skiffAway };
  if (save.mapId === dock.mapId) return { ok: false, reason: SKY_COPY.skiffHere };
  let next = setFlag(save, "flag.flown");
  next.mapId = dock.mapId;
  next.spawnId = dock.spawn;
  next.encounter = null;
  const text = dock.id === "dock.margin" || save.mapId === "map.margin" ? SKY_COPY.skiffThird : SKY_COPY.skiffFly;
  if (!next.discoveries.includes("disc.skiff")) next.discoveries.push("disc.skiff");
  if (!next.discoveries.includes(`place.${dock.mapId}`)) next.discoveries.push(`place.${dock.mapId}`);
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function noteHullShadow(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.flown"]) return { ok: false, reason: SKY_COPY.hullEarly };
  if (save.flags["flag.hull_shadow"]) return { ok: false, reason: SKY_COPY.hullAgain };
  const next = setFlag(save, "flag.hull_shadow");
  if (!next.discoveries.includes("disc.hull_shadow")) next.discoveries.push("disc.hull_shadow");
  return { ok: true, save: next, text: SKY_COPY.hullNote };
}

const SKY_SCENES: Record<string, { id: string; flag: string; text: string }> = {
  "map.ridge": { id: "sight.ridge", flag: "flag.sight_ridge", text: SKY_COPY.sightRidge },
  "map.glass": { id: "sight.glass", flag: "flag.sight_glass", text: SKY_COPY.sightGlass },
  "map.cave": { id: "sight.cave", flag: "flag.sight_cave", text: SKY_COPY.sightCave },
  "map.berth": { id: "sight.berth", flag: "flag.sight_berth", text: SKY_COPY.sightBerth },
};

/** Overlay only. Does not set the chart, the early sky, or the lens. */
export function beginSkySight(save: SaveGame): { save: SaveGame; text: string } | null {
  const scene = SKY_SCENES[save.mapId];
  if (!scene) return null;
  const next = structuredClone(save);
  next.sightScene = scene.id;
  next.sightSteps = 8;
  if (!next.flags[scene.flag]) {
    next.flags[scene.flag] = true;
    if (!next.discoveries.includes(scene.flag)) next.discoveries.push(scene.flag);
    if (!next.journal.includes(scene.text)) next.journal.push(scene.text);
  }
  if (scene.id === "sight.glass" && !next.choiceLog.some((c) => c.id === "sight.glass")) {
    next.choiceLog.push({ id: "sight.glass", value: "early-noon" });
  }
  if (scene.id === "sight.berth" && !next.choiceLog.some((c) => c.id === "sight.berth")) {
    next.choiceLog.push({ id: "sight.berth", value: "early-shadow" });
  }
  refreshQuests(next);
  return { save: next, text: scene.text };
}
