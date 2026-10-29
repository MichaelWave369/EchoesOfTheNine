import type { SaveGame } from "../contracts.ts";
import { refreshQuests, setFlag } from "../chronicle/save.ts";

/**
 * Optional Vale expanses: companion choices, spell evolutions, Lowbell, the split bell.
 * Nothing here is required to finish the Crystal Awakening. Nothing here names the late chronicle.
 */

export const BRAZIER_ANSWER = ["flame", "stone", "flame"] as const;

export interface AtlasPlace {
  id: string;
  name: string;
  blurb: string;
  x: number;
  y: number;
  /** Flag required before the road is even a rumor you can walk. */
  requires?: string;
  /** Shown on the atlas and never enterable in this chapter. */
  locked?: boolean;
  spawn: string;
}

export const ATLAS: AtlasPlace[] = [
  { id: "map.vale", name: "Lantern Vale", blurb: "The festival, the clock, the people who count to nine.", x: 70, y: 150, spawn: "square" },
  { id: "map.woods", name: "Glasspine", blurb: "The path oath and the flicker.", x: 170, y: 110, spawn: "vale_gate" },
  { id: "map.shrine", name: "First Prism", blurb: "Runes, conduits, and the Warden's question.", x: 270, y: 70, requires: "flag.woods_cleared", spawn: "door" },
  { id: "map.reach", name: "Hollowwood", blurb: "A second season, and Nessa.", x: 380, y: 55, requires: "flag.chapter_complete", spawn: "shrine_side" },
  { id: "map.barrow", name: "Cantor's Barrow", blurb: "The song under the hill.", x: 490, y: 40, requires: "flag.moss_hymn", spawn: "mouth" },
  { id: "map.lowbell", name: "Lowbell Landing", blurb: "A river market whose bell does not agree with itself.", x: 400, y: 160, requires: "flag.nessa_joined", spawn: "reach_stair" },
  { id: "map.ferry", name: "Far ferry", blurb: "The water goes on. The boat does not, yet.", x: 520, y: 190, locked: true, spawn: "" },
  { id: "map.highroad", name: "High road", blurb: "A road above the pines. Not open.", x: 250, y: 24, locked: true, spawn: "" },
];

export const ATLAS_ROADS: { from: string; to: string; future?: boolean }[] = [
  { from: "map.vale", to: "map.woods" },
  { from: "map.woods", to: "map.shrine" },
  { from: "map.shrine", to: "map.reach" },
  { from: "map.reach", to: "map.barrow" },
  { from: "map.reach", to: "map.lowbell" },
  { from: "map.lowbell", to: "map.ferry", future: true },
  { from: "map.shrine", to: "map.highroad", future: true },
];

export const JOB_KITS: {
  id: string;
  name: string;
  who: string;
  bearer: "wanderer" | "mira" | "kael" | "nessa" | null;
  requires: string;
  arts: string[];
  kit: string[];
  synergy: string;
  playable: boolean;
}[] = [
  {
    id: "job.wanderer",
    name: "Wayfinder",
    who: "You, before the conduits",
    bearer: "wanderer",
    requires: "You begin as this.",
    arts: ["atk.strike", "spell.ember", "act.defend", "act.dodge"],
    kit: ["Strike", "Ember", "Defend", "Sidestep"],
    synergy: "The festival knife is the Wayfinder's first honest edge.",
    playable: true,
  },
  {
    id: "job.elementalist",
    name: "Elementalist",
    who: "You, after the conduits",
    bearer: "wanderer",
    requires: "Align the shrine conduits. Flare comes with the trade. Solar Flare is earned later.",
    arts: ["spell.ember", "spell.flare", "spell.solar"],
    kit: ["Ember", "Flare", "Solar Flare, once earned"],
    synergy: "A glass needle in an Elementalist's hand adds a little more bite in battle.",
    playable: true,
  },
  {
    id: "job.archivist",
    name: "Archivist",
    who: "Mira",
    bearer: "mira",
    requires: "She joins at the lanterns. Memory Tide is earned, not given.",
    arts: ["atk.strike", "spell.mend", "spell.tide", "spell.memory_tide"],
    kit: ["Strike", "Mend", "Tide Whisper", "Memory Tide, once earned"],
    synergy: "The margin clasp, if she wrote the strike, deepens her breath.",
    playable: true,
  },
  {
    id: "job.oathkeeper",
    name: "Oathkeeper",
    who: "Kael",
    bearer: "kael",
    requires: "He joins on the Glasspine path.",
    arts: ["atk.oathcut", "spell.stoneguard", "act.defend", "act.dodge"],
    kit: ["Oathcut", "Stoneguard", "Defend", "Sidestep"],
    synergy: "The oath blade hits harder when Kael is the one holding it.",
    playable: true,
  },
  {
    id: "job.spellblade",
    name: "Spellblade",
    who: "Nessa",
    bearer: "nessa",
    requires: "She joins in the Reach. Shear is hers from the first step.",
    arts: ["atk.strike", "spell.shear", "act.defend", "act.dodge"],
    kit: ["Strike", "Shear", "Defend", "Sidestep"],
    synergy: "A spared Cantor's reed loop sits one step quicker on a spellblade.",
    playable: true,
  },
  {
    id: "job.dragoon",
    name: "Dragoon",
    who: "Not yet",
    bearer: null,
    requires: "A later chapter. No button will pretend otherwise.",
    arts: [],
    kit: [],
    synergy: "Unwritten.",
    playable: false,
  },
  {
    id: "job.healer",
    name: "Healer",
    who: "Not yet",
    bearer: null,
    requires: "A later chapter. Mira's mend is not this job.",
    arts: [],
    kit: [],
    synergy: "Unwritten.",
    playable: false,
  },
  {
    id: "job.chronomancer",
    name: "Chronomancer",
    who: "Not yet",
    bearer: null,
    requires: "A later chapter. The sight is not this job.",
    arts: [],
    kit: [],
    synergy: "Unwritten.",
    playable: false,
  },
];

export const EXPANSE_COPY = {
  shelfAsk:
    "Mira touches the parish book. The clock struck ten. I can write the strike as it happened, or leave the page blank so the square does not have to be afraid of its own evening.",
  shelfRecord: "Then it is written. A tenth strike, in the margin, where I keep things that should not be sanded down to make a village comfortable.",
  shelfBlank: "Then the page stays kind, and blank. I will remember it anyway. The book does not have to.",
  pellAsk:
    "Pell is soot-smudged and not sorry. I walked the glowmoths off the path. They were eating the children's lanterns. The oath says turn me around. The children say otherwise, if anyone asked them.",
  pellLaw: "Kael nods, once, like a gate. Pell goes back toward the square. The moths will have to find another dark.",
  pellPeople: "Kael looks at the path, then at Pell, then at you. The oath was to the living. Pell finishes the walk. A cord from the path changes hands.",
  motherAsk:
    "Nessa sets her palm on a stone worn smooth by an older rhyme. My mother rhymed this moss with spring. The moss has a different verse now. I can teach it hers, or let the new one stand.",
  motherSpring: "She speaks the old rhyme anyway. The moss does not thank her. A little dew gathers, as if spring were trying to be polite.",
  motherVerse: "The new verse stands. Nessa is quiet in the way of someone who has put a parent's season down without breaking it.",
  ivo: "Ivo Bellwright wipes bronze off his wrists. Lowbell rings one count late and calls it tradition. I keep the face honest. The rope is another matter, and I do not discuss it before supper.",
  ivoSeen:
    "You saw it too. The shadow of the clapper finished a strike the bronze never started. It touched my palm before the rope moved. I laughed, once. I have not laughed at it since. Do not ask me what hour it is practicing. I do not know, and I will not invent one.",
  ivoVerse: "Nessa let a new verse stand in the Reach. Ivo squints at the river. Then the air is the verse, not the face. Count what is still ringing.",
  sightLowbell:
    "The clapper's shadow finishes a strike the bronze never starts. For a blink a second bell hangs on an empty rope. It does not explain itself. The hour feels rehearsed, and unfinished.",
  solarLearned: "Ember goes to noon in your hands. Solar Flare. It does not ask the target to agree.",
  solarNeedPractice: "The fire is only being polite. Cast Ember three times. Then come back.",
  solarNeedCause: "Ember is practiced. Nothing has asked it to become noon. The kiln at Lowbell will, or a fallen guardian already did.",
  solarScorchShut: "The vein is warm, not wounded. This path did not open on a sleeping guardian. Lowbell's kiln still will, once Ember is no longer shy.",
  solarAlready: "Solar Flare is already yours. The noon does not need a second invitation.",
  tideLearned: "Mira cups the whisper until it keeps a person instead of only unmaking a pattern. Memory Tide.",
  tideNeedMercy: "Memory Tide, from Mira, wants a guardian that was asked to sleep. A fallen prism does not owe this lesson. The bell at Lowbell keeps another way.",
  tideNeedRecord: "She left the page blank. This tide wants a strike that was written down. The bell can still teach it.",
  tideNeedCast: "Tide Whisper has to be spoken once before it can remember anyone.",
  tideAlready: "Memory Tide is already in Mira's book.",
  bellFace: "The bronze admits nine and nine. That is only half of the argument.",
  bellGhost: "The air still holds a tenth strike. The bell has both of its truths.",
  bellWrong: "That reading slides off the bronze. Look from the view you are actually standing in.",
  bellNeedOther: "One view is not the bell. Fold the other, and read what that one insists on.",
  bellDone: "The split hour is recorded. A shard of the clapper comes away, warm as a kept secret.",
  bellLesson: "You have spoken Tide. The bell's withheld lesson fits: Memory Tide.",
  kilnNeed: "Three mouths, in an order the kiln respects. Flame, stone, flame. Buttons are enough.",
  kilnHot: "The kiln takes the order and stays hot.",
  atlasLocked: "That road is drawn so you know it exists. It does not open.",
  atlasUnwalked: "The road is open. It still wants to be walked once before the atlas will carry you.",
} as const;

function give(save: SaveGame, itemId: string) {
  const slot = save.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else save.inventory.push({ itemId, qty: 1 });
}

function teach(save: SaveGame, who: string, spellId: string, journal: string, choiceId: string): SaveGame {
  if (save.knownSpells[who]?.includes(spellId)) return save;
  const next = structuredClone(save);
  next.knownSpells[who] = [...(next.knownSpells[who] ?? []), spellId];
  if (!next.journal.includes(journal)) next.journal.push(journal);
  if (!next.discoveries.includes(spellId)) next.discoveries.push(spellId);
  if (!next.choiceLog.some((c) => c.id === choiceId)) next.choiceLog.push({ id: choiceId, value: spellId });
  refreshQuests(next);
  return next;
}

export function markPlace(save: SaveGame): SaveGame {
  const id = `place.${save.mapId}`;
  if (save.discoveries.includes(id)) return save;
  const next = structuredClone(save);
  next.discoveries.push(id);
  return next;
}

export function placeState(save: SaveGame, place: AtlasPlace): "here" | "walked" | "open" | "shut" | "locked" {
  if (place.locked) return "locked";
  if (save.mapId === place.id) return "here";
  if (place.requires && !save.flags[place.requires]) return "shut";
  if (save.discoveries.includes(`place.${place.id}`)) return "walked";
  return "open";
}

export function canTravel(save: SaveGame, placeId: string): boolean {
  const place = ATLAS.find((p) => p.id === placeId);
  if (!place || place.locked) return false;
  if (place.requires && !save.flags[place.requires]) return false;
  if (save.mapId === place.id) return false;
  return save.discoveries.includes(`place.${place.id}`);
}

export type CompanionChoice = "record" | "blank" | "law" | "people" | "spring" | "verse";

export function chooseCompanion(save: SaveGame, who: "mira" | "kael" | "nessa", value: CompanionChoice): SaveGame | null {
  const allowed: Record<typeof who, CompanionChoice[]> = {
    mira: ["record", "blank"],
    kael: ["law", "people"],
    nessa: ["spring", "verse"],
  };
  if (!allowed[who].includes(value)) return null;
  if (save.choiceLog.some((c) => c.id === `choice.${who}`)) return null;
  let next = structuredClone(save);
  next.choiceLog.push({ id: `choice.${who}`, value });
  next = setFlag(next, `flag.${who}_${value}`);
  if (who === "mira" && value === "record") give(next, "accessory.margin_clasp");
  if (who === "kael" && value === "people") give(next, "accessory.path_cord");
  if (who === "kael" && value === "law") next.gold += 22;
  if (who === "nessa" && value === "spring") give(next, "item.dew_vial");
  if (who === "nessa" && value === "verse") next.gold += 16;
  return next;
}

export function learnSolarFrom(
  save: SaveGame,
  source: "kiln" | "scorch",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.knownSpells.wanderer?.includes("spell.solar")) return { ok: false, reason: EXPANSE_COPY.solarAlready };
  const casts = save.spellMastery["spell.ember"] ?? 0;
  if (casts < 3) return { ok: false, reason: EXPANSE_COPY.solarNeedPractice };
  if (source === "scorch" && !save.flags["flag.warden_defeated"]) return { ok: false, reason: EXPANSE_COPY.solarScorchShut };
  if (source === "kiln" && !save.flags["flag.braziers"]) return { ok: false, reason: EXPANSE_COPY.kilnNeed };
  if (source === "scorch" && !save.flags["flag.warden_defeated"]) return { ok: false, reason: EXPANSE_COPY.solarNeedCause };
  const next = teach(save, "wanderer", "spell.solar", EXPANSE_COPY.solarLearned, "spell.solar");
  const marked = setFlag(next, source === "kiln" ? "flag.solar_kiln" : "flag.solar_scorch");
  return { ok: true, save: marked, text: EXPANSE_COPY.solarLearned };
}

export function tryLearnMemoryFromMira(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.knownSpells.mira?.includes("spell.memory_tide")) return { ok: false, reason: EXPANSE_COPY.tideAlready };
  if (save.wardenOutcome !== "spared" && !save.flags["flag.warden_spared"]) {
    return { ok: false, reason: EXPANSE_COPY.tideNeedMercy };
  }
  if (!save.flags["flag.mira_record"]) return { ok: false, reason: EXPANSE_COPY.tideNeedRecord };
  if ((save.spellMastery["spell.tide"] ?? 0) < 1) return { ok: false, reason: EXPANSE_COPY.tideNeedCast };
  const next = teach(save, "mira", "spell.memory_tide", EXPANSE_COPY.tideLearned, "spell.memory_tide");
  return { ok: true, save: setFlag(next, "flag.memory_from_mira"), text: EXPANSE_COPY.tideLearned };
}

function maybeTeachTideFromBell(save: SaveGame): SaveGame {
  if (save.knownSpells.mira?.includes("spell.memory_tide")) return save;
  if ((save.spellMastery["spell.tide"] ?? 0) < 1) {
    return save.flags["flag.bell_lesson"] ? save : setFlag(save, "flag.bell_lesson");
  }
  return teach(save, "mira", "spell.memory_tide", EXPANSE_COPY.tideLearned, "spell.memory_tide");
}

export function noteBell(
  save: SaveGame,
  view: "legacy" | "ascension",
  claim: "nine" | "ten",
): { save: SaveGame; text: string; solved: boolean } {
  if (save.flags["flag.bell_solved"]) return { save, text: EXPANSE_COPY.bellDone, solved: true };
  const faceOk = view === "legacy" && claim === "nine";
  const ghostOk = view === "ascension" && claim === "ten";
  if (!faceOk && !ghostOk) return { save, text: EXPANSE_COPY.bellWrong, solved: false };
  let next = setFlag(save, faceOk ? "flag.bell_face" : "flag.bell_ghost");
  if (!next.choiceLog.some((c) => c.id === (faceOk ? "bell.face" : "bell.ghost"))) {
    next.choiceLog.push({ id: faceOk ? "bell.face" : "bell.ghost", value: claim });
  }
  if (!(next.flags["flag.bell_face"] && next.flags["flag.bell_ghost"])) {
    return { save: next, text: faceOk ? EXPANSE_COPY.bellFace : EXPANSE_COPY.bellGhost, solved: false };
  }
  next = setFlag(next, "flag.bell_solved");
  if (!next.inventory.some((s) => s.itemId === "accessory.bell_shard")) give(next, "accessory.bell_shard");
  next = setFlag(next, "flag.got_bell_shard");
  if (!next.choiceLog.some((c) => c.id === "bell")) next.choiceLog.push({ id: "bell", value: "split" });
  next = maybeTeachTideFromBell(next);
  const taught = next.knownSpells.mira?.includes("spell.memory_tide");
  return {
    save: next,
    text: taught ? `${EXPANSE_COPY.bellDone} ${EXPANSE_COPY.tideLearned}` : `${EXPANSE_COPY.bellDone} Tide Whisper has not been spoken, so the lesson waits.`,
    solved: true,
  };
}

export function talkIvo(save: SaveGame): { save: SaveGame; text: string } {
  let next = save;
  let extra = "";
  if (save.flags["flag.bell_lesson"] && (save.spellMastery["spell.tide"] ?? 0) >= 1 && !save.knownSpells.mira?.includes("spell.memory_tide")) {
    next = teach(save, "mira", "spell.memory_tide", EXPANSE_COPY.bellLesson, "spell.memory_tide");
    extra = ` ${EXPANSE_COPY.bellLesson}`;
  }
  const base = save.flags["flag.sight_lowbell"]
    ? EXPANSE_COPY.ivoSeen
    : save.flags["flag.nessa_verse"]
      ? EXPANSE_COPY.ivoVerse
      : EXPANSE_COPY.ivo;
  return { save: next, text: base + extra };
}

export function windupAdvice(abilityId: string): string {
  if (abilityId === "enemy.prism_rupture") return "Stoneguard, then Tide. Sidestep will not open the seam. The rupture hits everyone.";
  if (abilityId === "enemy.core_pulse") return "The core. Sidestep if you are the one it chose. Defend if you cannot.";
  if (abilityId === "enemy.shard_rain") return "A readable arc. Sidestep or Defend.";
  if (abilityId === "enemy.cantor_dirge") return "Hollow Dirge hits the whole party. Defend, or Sidestep the one it would land on.";
  if (abilityId === "enemy.briar_lash") return "One lash, honestly wound. Sidestep.";
  if (abilityId === "enemy.mote_flare") return "Flame on the wing. Sidestep or take it on a guard.";
  return "A short windup. Sidestep, brace, or answer.";
}
