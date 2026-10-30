import type { ChronicleBranch, QuestNode, SaveGame, WandererAppearance } from "../contracts.ts";
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
    appearance: "lantern",
    mapId: "map.vale",
    spawnId: "square",
    mode: "legacy",
    ascensionUnlocked: false,
    party: ["wanderer"],
    reserve: [],
    formation: "line",
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
    earnedSpells: [],
    sightScene: null,
    sightSteps: 0,
    echoMemory: [],
    gnosis: 0,
  };
}

export function setAppearance(save: SaveGame, appearance: WandererAppearance): SaveGame {
  const next = structuredClone(save);
  next.appearance = appearance;
  return next;
}

const APPEARANCE_IDS: WandererAppearance[] = ["lantern", "festival", "river", "ridge"];

export function normalizeAppearance(value: unknown): WandererAppearance {
  return APPEARANCE_IDS.includes(value as WandererAppearance) ? (value as WandererAppearance) : "lantern";
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
    "flag.sight_lowbell": "Sight: a second bell hangs on an empty rope. The hour feels rehearsed, and unfinished.",
    "flag.sight_ferry": "Sight: two stamps in one window, and a crate on an empty pier.",
    "flag.sight_hold": "Sight: the lock's older cut reads flame, tide, stone. It does not turn itself.",
    "flag.sight_stair": "Sight: a shadow climbs the high stair before the boots.",
    "flag.spoke_hale": "Hale Reed says the ferry left at nine.",
    "flag.heard_nine": "One witness keeps nine.",
    "flag.spoke_tamsin": "Tamsin Coil says the ferry left at ten.",
    "flag.heard_ten": "One witness keeps ten.",
    "flag.twice_departed": "The ferry left at nine and at ten. Both stamps are warm. Neither explains the other.",
    "flag.got_river_glass": "River glass from a crate the dock swore was empty.",
    "flag.hold_open": "The Twice-Kept Hold took an order and opened.",
    "flag.hold_seal": "A scorched seal opened the hold. The prism had already fallen.",
    "flag.ferry_complete": "Mistwater's ferryman is settled. The high road gate is a place, not a rumor.",
    "flag.ferryman_spared": "The ferryman sat down. He was asked which departure he was keeping.",
    "flag.ferryman_defeated": "The ferryman's reflection was ended.",
    "flag.spoke_wren": "Wren keeps the high gate and will not name the weather.",
    "flag.spoke_ada": "Ada Vane keeps the mill and does not correct the glass.",
    "flag.spoke_orrin": "Orrin Glass records a noon the sky has not started.",
    "flag.sera_joined": "Sera Vane joined. She builds things that should stay in the air.",
    "flag.sera_splice": "Sera finished the hot splice.",
    "flag.sera_stay": "Sera lashed the safer stay.",
    "flag.sky_chart": "From the walk, the chart says the eclipse already stood at noon.",
    "flag.sky_ahead": "From the other view, the eclipse is drawn ahead of the sun.",
    "flag.sky_split": "Two noons are kept. The chart and the sky do not agree, and neither explains the other.",
    "flag.sight_ridge": "Sight: a bridge span finishes before the boots.",
    "flag.sight_glass": "Sight: an eclipse sits ahead of the sun. The lens does not turn.",
    "flag.sight_cave": "Sight: a pocket in the rock arrives late, or early.",
    "flag.sight_berth": "Sight: a second shadow leaves the hull before the craft.",
    "flag.got_cloud_salt": "Cloud salt from a pocket that was not there until it was.",
    "flag.cleared.enc.gust": "The west gust on the ridge is only wind.",
    "flag.gale_spared": "The Galekeeper was asked which noon it was keeping.",
    "flag.gale_defeated": "The Galekeeper's wind was ended.",
    "flag.ridge_complete": "Skyweave's gale is settled. The berth is a place.",
    "flag.skiff_ready": "The First Stay can take the route between two pads.",
    "flag.flown": "The First Stay flew a route. It did not open the sky.",
    "flag.hull_shadow": "A second shadow left the hull before the craft. It is not explained.",
    "flag.unwritten_open": "The berth ledger disagrees with the departure. The hour is open.",
    "flag.clue_vale": "The Vale's hour is written. Both, or one. The other is not erased.",
    "flag.hour_both": "You kept both hours at the clock.",
    "flag.hour_nine": "You kept nine and nine. The thinner ten is still in the room.",
    "flag.hour_ten": "You kept the thinner ten. The face is still nine and nine.",
    "flag.clue_lowbell": "Lowbell's margin finished before you reached the stair.",
    "flag.clue_mist": "Mistwater's window has two stamps. You wrote them without picking a kinder boat.",
    "flag.clue_ridge": "The berth's early shadow is written. It is not explained.",
    "flag.margin_dock": "The First Stay has a third pad. The sky stays shut.",
    "flag.margin_page": "From the walk, the Margin's page says you departed before you cast off.",
    "flag.margin_echo": "From the other view, the Margin's page is blank and already finished.",
    "flag.sight_hour_vale": "Sight: two sets of hands share the clock. Neither writes the margin.",
    "flag.sight_margin": "Sight: two pages occupy one desk. Neither turns itself.",
    "flag.hour_glint": "An echo along the Margin desk admitted a shine. It did not jump into a hand.",
    "flag.got_hour_glint": "A loose hour, pocketed. It keeps a shine, not a noon.",
    "flag.hour_compared": "You compared two versions of a room. The comparison did not press a page.",
    "flag.echo_traced": "You followed an echo. It did not solve anything.",
    "flag.mira_hour_done": "Mira answered the line that arrived before the flight. The first choice stays.",
    "flag.sera_hour_done": "Sera answered the knot that predates her morning. The splice or the stay stays.",
    "flag.iri_met": "Iri, the Veilwalker, is keeping the seam. She has not explained it.",
    "flag.iri_joined": "Iri walks with you. Veilwalker is her work, not a coat.",
    "flag.iri_veil": "Iri kept the veil. She is in the chronicle, and not in the four.",
    "flag.hour_spared": "The Hourkeeper sat. The page stays blank on purpose.",
    "flag.hour_ended": "The Hourkeeper's page was finished.",
    "flag.hour_complete": "The Unwritten Hour is kept.",
    "flag.cleared.enc.thicket": "The briars remember losing.",
    "flag.mira_record": "Mira wrote the tenth strike in the margin.",
    "flag.mira_blank": "Mira left the parish page blank, and will remember it anyway.",
    "flag.kael_law": "Pell was turned back. The gate held.",
    "flag.kael_people": "Pell finished the walk. The oath bent toward a person.",
    "flag.nessa_spring": "Nessa taught the moss her mother's spring. It did not thank her.",
    "flag.nessa_verse": "The Reach's new verse stands. Spring can stay with Nessa's mother.",
    "flag.braziers": "The river kiln took flame, stone, flame.",
    "flag.bell_face": "The bell's face says nine and nine. That is half.",
    "flag.bell_ghost": "A tenth strike is still in the air over Lowbell.",
    "flag.bell_solved": "The split bell is recorded. It is not explained.",
    "flag.bell_lesson": "The bell is holding a lesson until Tide Whisper has been spoken.",
    "flag.got_bell_shard": "A warm shard of the clapper came away.",
    "flag.solar_kiln": "The kiln asked Ember to become noon. Solar Flare answered.",
    "flag.solar_scorch": "A fallen guardian left a vein hot enough for Solar Flare.",
    "flag.memory_from_mira": "Mira taught Memory Tide from a written strike and a sleeping guardian.",
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
    if (q.id === "quest.mira") return flag(save, "flag.mira_record") || flag(save, "flag.mira_blank");
    if (q.id === "quest.kael") return flag(save, "flag.kael_law") || flag(save, "flag.kael_people");
    if (q.id === "quest.nessa") return flag(save, "flag.nessa_spring") || flag(save, "flag.nessa_verse");
    if (q.id === "quest.lowbell") return flag(save, "flag.bell_solved");
    if (q.id === "quest.evolutions") return (save.knownSpells.wanderer?.includes("spell.solar") ?? false) && (save.knownSpells.mira?.includes("spell.memory_tide") ?? false);
    if (q.id === "quest.crossing") return flag(save, "flag.ferry_complete");
    if (q.id === "quest.timetable") return flag(save, "flag.twice_departed");
    if (q.id === "quest.hold") return flag(save, "flag.hold_open");
    if (q.id === "quest.ridge") return flag(save, "flag.sera_joined");
    if (q.id === "quest.glass") return flag(save, "flag.sky_split");
    if (q.id === "quest.skiff") return flag(save, "flag.flown");
    if (q.id === "quest.unwritten") return flag(save, "flag.hour_complete");
    if (q.id === "quest.mira_hour") return flag(save, "flag.mira_hour_done");
    if (q.id === "quest.sera_hour") return flag(save, "flag.sera_hour_done");
    if (q.id === "quest.iri") return flag(save, "flag.iri_joined") || flag(save, "flag.iri_veil");
    return false;
  };
  const visible = (q: QuestNode) => {
    if (q.id === "quest.festival") return true;
    if (q.id === "quest.party") return flag(save, "flag.clock_anomaly");
    if (q.id === "quest.hearth") return flag(save, "flag.spoke_lira") || flag(save, "flag.clock_anomaly");
    if (q.id === "quest.prism") return flag(save, "flag.woods_cleared");
    if (q.id === "quest.warden") return flag(save, "flag.conduits_aligned") || flag(save, "flag.chapter_complete");
    if (q.id === "quest.reach") return flag(save, "flag.chapter_complete");
    if (q.id === "quest.mira") return flag(save, "flag.mira_joined");
    if (q.id === "quest.kael") return flag(save, "flag.kael_joined");
    if (q.id === "quest.nessa") return flag(save, "flag.nessa_joined");
    if (q.id === "quest.lowbell") return flag(save, "flag.nessa_joined");
    if (q.id === "quest.evolutions") return flag(save, "flag.conduits_aligned") || flag(save, "flag.chapter_complete");
    if (q.id === "quest.crossing") return flag(save, "flag.bell_solved");
    if (q.id === "quest.timetable") return flag(save, "flag.spoke_hale") || flag(save, "flag.sight_ferry");
    if (q.id === "quest.hold") return flag(save, "flag.spoke_hale") || flag(save, "flag.sight_hold");
    if (q.id === "quest.ridge") return flag(save, "flag.ferry_complete");
    if (q.id === "quest.glass") return flag(save, "flag.sera_joined");
    if (q.id === "quest.skiff") return flag(save, "flag.ridge_complete");
    if (q.id === "quest.unwritten") return flag(save, "flag.flown");
    if (q.id === "quest.mira_hour") return flag(save, "flag.unwritten_open") && flag(save, "flag.mira_joined");
    if (q.id === "quest.sera_hour") return flag(save, "flag.unwritten_open") && flag(save, "flag.sera_joined");
    if (q.id === "quest.iri") return flag(save, "flag.iri_met") || flag(save, "flag.margin_dock");
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
  if (reward.flags.includes("flag.gale_spared")) rememberChoice(next, "gale", "spared");
  if (reward.flags.includes("flag.gale_defeated")) rememberChoice(next, "gale", "defeated");
  if (reward.flags.includes("flag.hour_spared")) rememberChoice(next, "hour", "spared");
  if (reward.flags.includes("flag.hour_ended")) rememberChoice(next, "hour", "ended");
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
  next.playerName = next.playerName || "Wanderer";
  next.appearance = normalizeAppearance(next.appearance);
  next.schema = SCHEMA_VERSION;
  next.equipment = next.equipment ?? {};
  if (!next.equipment.wanderer) next.equipment.wanderer = { weapon: "weapon.festival_knife" };
  next.bonds = next.bonds ?? {};
  next.spellMastery = next.spellMastery ?? {};
  next.sightCharges = typeof next.sightCharges === "number" ? next.sightCharges : 0;
  next.knownSpells = next.knownSpells ?? { wanderer: ["spell.ember"] };
  next.earnedSpells = Array.isArray(next.earnedSpells) ? next.earnedSpells : [];
  for (const id of next.knownSpells.wanderer ?? []) {
    if ((id === "spell.solar" || id === "spell.double_wake") && !next.earnedSpells.includes(id)) next.earnedSpells.push(id);
  }
  next.jobsUnlocked = next.jobsUnlocked ?? ["job.wanderer"];
  next.discoveries = next.discoveries ?? [];
  next.choiceLog = next.choiceLog ?? [];
  next.sightScene = typeof next.sightScene === "string" ? next.sightScene : null;
  next.sightSteps = typeof next.sightSteps === "number" ? next.sightSteps : 0;
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
  next.reserve = Array.isArray(next.reserve) ? next.reserve.filter((id) => id && id !== "wanderer") : [];
  if (!next.party.includes("wanderer")) next.party.unshift("wanderer");
  next.party = [...new Set(next.party)];
  while (next.party.length > 4) {
    const overflow = next.party.pop();
    if (overflow && overflow !== "wanderer" && !next.reserve.includes(overflow)) next.reserve.push(overflow);
  }
  next.reserve = next.reserve.filter((id) => !next.party.includes(id));
  next.formation = next.formation === "wide" ? "wide" : "line";
  if (next.flags["flag.iri_joined"]) {
    if (!next.roster.iri) next.roster.iri = makeCombatant("iri", { position: { x: 1.4, z: 2.2 } });
    next.knownSpells.iri = next.knownSpells.iri?.length ? next.knownSpells.iri : ["spell.seam"];
    if (!next.equipment.iri) next.equipment.iri = {};
    next.bonds.iri = next.bonds.iri ?? 1;
    const seated = next.party.includes("iri") || next.reserve.includes("iri");
    if (!seated) {
      if (next.party.length < 4) next.party.push("iri");
      else next.reserve.push("iri");
    }
  }
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
  if (next.settings.motionDetail !== "quiet") next.settings.motionDetail = "full";
  refreshQuests(next);
  return next;
}

export function deserialize(raw: string): SaveGame {
  const parsed = JSON.parse(raw) as SaveGame;
  const schema = (parsed as { schema?: number }).schema;
  if (!parsed || parsed.version !== 1 || (schema !== 1 && schema !== 2 && schema !== 3 && schema !== 4)) {
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
