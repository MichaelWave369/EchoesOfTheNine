import type { ChronicleBranch, QuestNode, SaveGame } from "../contracts.ts";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../contracts.ts";
import { INITIAL_QUESTS } from "../content/world.ts";
import { makeCombatant } from "../content/characters.ts";
import { syncLevels } from "../content/gear.ts";

export const SAVE_KEY = "eotn.save.v1";

export function freshSave(playerName: string): SaveGame {
  const name = playerName.trim().slice(0, 16) || "Wanderer";
  const hero = makeCombatant("wanderer", { name, position: { x: -1.2, z: 1.4 } });
  const root: ChronicleBranch = {
    id: "branch.root",
    parentId: null,
    label: "The Crystal Awakening",
    gate: "public",
    createdAtTick: 0,
    flags: {},
  };
  return {
    version: 1,
    schema: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    slot: "auto",
    playerName: name,
    mapId: "map.vale",
    spawnId: "square",
    mode: "legacy",
    ascensionUnlocked: false,
    party: ["wanderer"],
    roster: { wanderer: hero },
    inventory: [
      { itemId: "item.lantern_salve", qty: 2 },
      { itemId: "item.dew_vial", qty: 1 },
    ],
    gold: 15,
    xp: 0,
    flags: {},
    quests: structuredClone(INITIAL_QUESTS),
    journal: ["The festival is lit. Lira is waiting by the square."],
    chronicle: [root],
    settings: { ...DEFAULT_SETTINGS },
    encounter: null,
    chapterComplete: false,
    wardenOutcome: "none",
    runeOrder: [],
    conduitsAligned: false,
    equipment: { wanderer: { weapon: "weapon.festival_knife" } },
    bonds: {},
    spellMastery: {},
    sightCharges: 0,
    knownSpells: { wanderer: ["spell.ember"] },
    jobsUnlocked: ["job.wanderer"],
    discoveries: [],
    choiceLog: [],
    echoMemory: [],
    gnosis: 0,
  };
}

export function flag(save: SaveGame, id: string): boolean {
  return Boolean(save.flags[id]);
}

export function setFlag(save: SaveGame, id: string, value: boolean | string | number = true): SaveGame {
  const next = structuredClone(save);
  if (next.flags[id] === value) return next;
  next.flags[id] = value;
  const line = journalLine(id);
  if (!next.journal.includes(line)) next.journal.push(line);
  if (!next.discoveries.includes(id)) next.discoveries.push(id);
  refreshQuests(next);
  return next;
}

export function bumpBond(save: SaveGame, id: string): SaveGame {
  const next = structuredClone(save);
  const value = Math.min(5, (next.bonds[id] ?? 0) + 1);
  next.bonds[id] = value;
  const mark = `bond.${id}.${value}`;
  if (!next.discoveries.includes(mark)) next.discoveries.push(mark);
  return next;
}

function journalLine(id: string): string {
  const lines: Record<string, string> = {
    "flag.spoke_lira": "Lira is glad you came back for the ninth lantern.",
    "flag.saw_sketch": "Nim sketched an ordinary wooden door that isn't anywhere.",
    "flag.clock_anomaly": "The clock read 9:09 and struck ten.",
    "flag.spoke_baker": "Oven-Aunt Pim does not bake for moths.",
    "flag.mira_joined": "Mira joined. She will remember what the clock would rather forget.",
    "flag.kael_joined": "Kael joined. The oath follows the people, not the gate.",
    "flag.kael_oath": "You asked Kael to keep the oath honest.",
    "flag.festival_fought": "A shardling crashed the lantern dance. It lost.",
    "flag.woods_cleared": "The Glasspine flicker broke. The shrine path is open.",
    "flag.saw_pulse": "For a blink the pines were conduits.",
    "flag.read_inscription": "The shrine floor knows your name and a date the Vale does not.",
    "flag.got_salve": "A festival crate held another jar of lantern salve.",
    "flag.runes_decoded": "Rune order: Flame, Stone, Tide.",
    "flag.conduits_aligned": "The conduits match the runes. Something in the prism answered.",
    "flag.temporal_sight": "Temporal Sight stirs. It is short, and it spends itself.",
    "flag.ascension_unlocked": "Ascension is awake. The same fight can be stepped into.",
    "flag.warden_defeated": "The Crystal Warden fell.",
    "flag.warden_spared": "The Crystal Warden sleeps under a pact.",
    "flag.chapter_complete": "The Crystal Awakening is complete. A trail waits past the prism.",
    "flag.spoke_salla": "Salla keeps the Ninth Wick, and she counts who comes back.",
    "flag.spoke_bram": "Bram prices anything that cuts or covers.",
    "flag.spoke_voss": "Elder Voss counted the square and got nine.",
    "flag.bought_gear": "Bram took your gold and did not apologize.",
    "flag.rested": "You slept at the Ninth Wick. The sight, if you have it, is willing again.",
    "flag.nessa_joined": "Nessa Quill joined. She knows which moss is lying.",
    "flag.moss_hymn": "Moss hymn: Wind, Flame, Stone. The barrow answered.",
    "flag.thicket_cleared": "The briar thicket is only thicket.",
    "flag.cantor_spared": "The Thorn Cantor let the last note go.",
    "flag.cantor_defeated": "The Thorn Cantor is silent.",
    "flag.got_charm": "A warm pebble came loose under the clock. It keeps pace.",
    "flag.got_cache": "Under the lying moss: a vial the Reach had forgotten.",
    "flag.got_root": "The left root was a cache. Amber sap, and no sermon.",
    "flag.sight_clock": "Sight: a stone under the clock is warm, and it is not a door.",
    "flag.sight_cache": "Sight: west of the hymn stone, the moss is lying.",
    "flag.sight_barrow": "Sight: the left root was not always a root.",
    "flag.sight_shrine": "Sight: the floor date will not finish forming.",
    "flag.cleared.enc.thicket": "The briars remember losing.",
  };
  return lines[id] ?? `Noted: ${id.replace("flag.", "").replaceAll("_", " ")}`;
}

export function refreshQuests(save: SaveGame) {
  const done = (q: QuestNode) => {
    if (q.id === "quest.festival") return flag(save, "flag.clock_anomaly") && flag(save, "flag.saw_sketch");
    if (q.id === "quest.party") return flag(save, "flag.mira_joined") && flag(save, "flag.kael_joined");
    if (q.id === "quest.prism") return flag(save, "flag.runes_decoded") && flag(save, "flag.conduits_aligned");
    if (q.id === "quest.warden") return flag(save, "flag.chapter_complete");
    if (q.id === "quest.hearth") return flag(save, "flag.rested") || flag(save, "flag.bought_gear");
    if (q.id === "quest.reach") return flag(save, "flag.nessa_joined") && flag(save, "flag.moss_hymn") && (flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated"));
    return false;
  };
  const visible = (q: QuestNode) => {
    if (q.id === "quest.festival") return true;
    if (q.id === "quest.party") return flag(save, "flag.clock_anomaly");
    if (q.id === "quest.hearth") return flag(save, "flag.spoke_lira") || flag(save, "flag.clock_anomaly");
    if (q.id === "quest.prism") return flag(save, "flag.woods_cleared");
    if (q.id === "quest.warden") return flag(save, "flag.conduits_aligned") || flag(save, "flag.chapter_complete");
    if (q.id === "quest.reach") return flag(save, "flag.chapter_complete");
    return false;
  };
  for (const q of save.quests) {
    if (done(q)) q.status = "complete";
    else if (visible(q)) q.status = q.status === "complete" ? "complete" : "active";
    else q.status = "hidden";
  }
}

export function recruit(save: SaveGame, id: "mira" | "kael" | "nessa"): SaveGame {
  if (save.party.includes(id)) return save;
  const next = structuredClone(save);
  const positions = {
    mira: { x: 0, z: 1.6 },
    kael: { x: 1.2, z: 1.5 },
    nessa: { x: -0.4, z: 2.1 },
  };
  next.roster[id] = makeCombatant(id, { position: positions[id] });
  next.party.push(id);
  if (!next.equipment[id]) next.equipment[id] = {};
  if (id === "nessa") next.knownSpells[id] = ["spell.shear"];
  next.bonds[id] = next.bonds[id] ?? 1;
  return next;
}

function rememberChoice(save: SaveGame, id: string, value: string) {
  if (save.choiceLog.some((c) => c.id === id)) return;
  save.choiceLog.push({ id, value });
}

export function applyReward(
  save: SaveGame,
  reward: { id: string; gold: number; xp: number; items: { itemId: string; qty: number }[]; flags: string[] },
): SaveGame {
  if (save.flags[`rewarded.${reward.id}`]) return save;
  let next = structuredClone(save);
  next.flags[`rewarded.${reward.id}`] = true;
  next.gold += reward.gold;
  next.xp += reward.xp;
  for (const item of reward.items) {
    const slot = next.inventory.find((s) => s.itemId === item.itemId);
    if (slot) slot.qty += item.qty;
    else next.inventory.push({ itemId: item.itemId, qty: item.qty });
  }
  for (const f of reward.flags) next = setFlag(next, f, true);
  if (reward.flags.includes("flag.warden_spared")) {
    next.wardenOutcome = "spared";
    rememberChoice(next, "warden", "spared");
  }
  if (reward.flags.includes("flag.warden_defeated")) {
    next.wardenOutcome = "defeated";
    rememberChoice(next, "warden", "defeated");
  }
  if (reward.flags.includes("flag.cantor_spared")) rememberChoice(next, "cantor", "spared");
  if (reward.flags.includes("flag.cantor_defeated")) rememberChoice(next, "cantor", "defeated");
  if (reward.flags.includes("flag.cleared.enc.thicket")) next = setFlag(next, "flag.thicket_cleared");
  syncLevels(next);
  return next;
}

export function serialize(save: SaveGame): string {
  return JSON.stringify(save);
}

function blankChronicle(): ChronicleBranch {
  return {
    id: "branch.root",
    parentId: null,
    label: "The Crystal Awakening",
    gate: "public",
    createdAtTick: 0,
    flags: {},
  };
}

/** Accepts schema 1 chronicles from the first chapter and fills the living-world fields. */
export function migrateSave(parsed: SaveGame): SaveGame {
  const next = parsed;
  next.version = 1;
  next.schema = SCHEMA_VERSION;
  next.equipment = next.equipment ?? {};
  if (!next.equipment.wanderer) next.equipment.wanderer = { weapon: "weapon.festival_knife" };
  next.bonds = next.bonds ?? {};
  next.spellMastery = next.spellMastery ?? {};
  next.sightCharges = typeof next.sightCharges === "number" ? next.sightCharges : 0;
  next.knownSpells = next.knownSpells ?? { wanderer: ["spell.ember"] };
  next.jobsUnlocked = next.jobsUnlocked ?? ["job.wanderer"];
  next.discoveries = next.discoveries ?? [];
  next.choiceLog = next.choiceLog ?? [];
  next.echoMemory = Array.isArray(next.echoMemory) ? next.echoMemory : [];
  next.gnosis = typeof next.gnosis === "number" ? next.gnosis : 0;
  next.runeOrder = next.runeOrder ?? [];
  next.journal = next.journal ?? [];
  next.flags = next.flags ?? {};
  if (next.chapterComplete) next.flags["flag.chapter_complete"] = next.flags["flag.chapter_complete"] ?? true;
  if (next.flags["flag.chapter_complete"]) next.chapterComplete = true;
  if (next.flags["flag.cantor_spared"] || next.flags["flag.cantor_defeated"]) {
    next.flags["flag.chapter_complete"] = true;
    next.chapterComplete = true;
  }
  next.inventory = next.inventory ?? [];
  next.party = next.party?.length ? next.party : ["wanderer"];
  next.wardenOutcome = next.wardenOutcome ?? "none";
  if (next.flags["flag.warden_spared"]) next.wardenOutcome = "spared";
  if (next.flags["flag.warden_defeated"]) next.wardenOutcome = "defeated";
  const have = new Set((next.quests ?? []).map((q) => q.id));
  next.quests = next.quests?.length ? next.quests : [];
  for (const q of INITIAL_QUESTS) {
    if (!have.has(q.id)) next.quests.push(structuredClone(q));
  }
  next.chronicle = next.chronicle?.length ? next.chronicle : [blankChronicle()];
  next.settings = { ...DEFAULT_SETTINGS, ...next.settings };
  refreshQuests(next);
  return next;
}

export function deserialize(raw: string): SaveGame {
  const parsed = JSON.parse(raw) as SaveGame;
  const schema = (parsed as { schema?: number }).schema;
  if (!parsed || parsed.version !== 1 || (schema !== 1 && schema !== 2)) {
    throw new Error("This chronicle is from another telling and cannot be opened yet.");
  }
  if (!parsed.playerName || !parsed.mapId || !parsed.roster) throw new Error("Chronicle is missing its bones.");
  return migrateSave(parsed);
}

export function loadLocal(): SaveGame | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return deserialize(raw);
  } catch {
    return null;
  }
}

export function writeLocal(save: SaveGame, slot: "auto" | "manual" = "auto"): SaveGame {
  const next = { ...save, slot, savedAt: new Date().toISOString() };
  if (typeof localStorage !== "undefined") localStorage.setItem(SAVE_KEY, serialize(next));
  return next;
}

export function clearLocal() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(SAVE_KEY);
}

export function publicUiText(parts: string[]): string[] {
  return parts;
}
