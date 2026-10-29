import type { ChronicleBranch, QuestNode, SaveGame } from "../contracts.ts";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../contracts.ts";
import { INITIAL_QUESTS } from "../content/world.ts";
import { makeCombatant } from "../content/characters.ts";

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
  };
}

export function flag(save: SaveGame, id: string): boolean {
  return Boolean(save.flags[id]);
}

export function setFlag(save: SaveGame, id: string, value: boolean | string | number = true): SaveGame {
  const next = structuredClone(save);
  if (next.flags[id] === value) return next;
  next.flags[id] = value;
  next.journal.push(journalLine(id));
  refreshQuests(next);
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
    "flag.temporal_sight": "Temporal Sight stirs — a short preview, not a prophecy.",
    "flag.ascension_unlocked": "Ascension is awake. The same fight can be stepped into.",
    "flag.warden_defeated": "The Crystal Warden fell.",
    "flag.warden_spared": "The Crystal Warden sleeps under a pact.",
    "flag.chapter_complete": "The Crystal Awakening is complete.",
  };
  return lines[id] ?? `Noted: ${id.replace("flag.", "").replaceAll("_", " ")}`;
}

export function refreshQuests(save: SaveGame) {
  const done = (q: QuestNode) => {
    if (q.id === "quest.festival") return flag(save, "flag.clock_anomaly") && flag(save, "flag.saw_sketch");
    if (q.id === "quest.party") return flag(save, "flag.mira_joined") && flag(save, "flag.kael_joined");
    if (q.id === "quest.prism") return flag(save, "flag.runes_decoded") && flag(save, "flag.conduits_aligned");
    if (q.id === "quest.warden") return flag(save, "flag.chapter_complete");
    return false;
  };
  const visible = (q: QuestNode) => {
    if (q.id === "quest.festival") return true;
    if (q.id === "quest.party") return flag(save, "flag.clock_anomaly");
    if (q.id === "quest.prism") return flag(save, "flag.woods_cleared");
    if (q.id === "quest.warden") return flag(save, "flag.conduits_aligned") || flag(save, "flag.chapter_complete");
    return false;
  };
  for (const q of save.quests) {
    if (done(q)) q.status = "complete";
    else if (visible(q)) q.status = q.status === "complete" ? "complete" : "active";
    else q.status = "hidden";
  }
}

export function recruit(save: SaveGame, id: "mira" | "kael"): SaveGame {
  if (save.party.includes(id)) return save;
  const next = structuredClone(save);
  const positions = { mira: { x: 0, z: 1.6 }, kael: { x: 1.2, z: 1.5 } };
  next.roster[id] = {
    ...makeCombatant(id, { position: positions[id] }),
  };
  next.party.push(id);
  return next;
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
  if (reward.flags.includes("flag.warden_spared")) next.wardenOutcome = "spared";
  if (reward.flags.includes("flag.warden_defeated")) next.wardenOutcome = "defeated";
  return next;
}

export function serialize(save: SaveGame): string {
  return JSON.stringify(save);
}

export function deserialize(raw: string): SaveGame {
  const parsed = JSON.parse(raw) as SaveGame;
  if (!parsed || parsed.version !== 1 || parsed.schema !== 1) {
    throw new Error("This chronicle is from another telling and cannot be opened yet.");
  }
  if (!parsed.playerName || !parsed.mapId || !parsed.roster) throw new Error("Chronicle is missing its bones.");
  parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
  parsed.quests = parsed.quests?.length ? parsed.quests : structuredClone(INITIAL_QUESTS);
  parsed.chronicle = parsed.chronicle?.length
    ? parsed.chronicle
    : [
        {
          id: "branch.root",
          parentId: null,
          label: "The Crystal Awakening",
          gate: "public",
          createdAtTick: 0,
          flags: {},
        },
      ];
  refreshQuests(parsed);
  return parsed;
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
