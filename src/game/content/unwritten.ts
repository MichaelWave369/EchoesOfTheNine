import type { SaveGame } from "../contracts.ts";
import { bumpBond, refreshQuests, setFlag } from "../chronicle/save.ts";
import { makeCombatant } from "./characters.ts";
import { syncLevels } from "./gear.ts";
import { ACTIVE_CAP } from "./skyweave.ts";

/**
 * The Unwritten Hour. After the first flight, four places disagree about a
 * departure. Sight can show the trouble. It does not write the page.
 * Nothing here names the late chronicle.
 */

export const HOUR_COPY = {
  ledgerEarly: "The berth ledger is a list of routes you have not flown. It will not argue with you yet.",
  ledgerOpen:
    "The ledger has a departure in a hand you have not used yet. It leaves before the hull. The shadow under the craft is the start of the argument, not the end of it. Vale, Lowbell, Mistwater, and this berth each remember a different hour. Write what you keep. Do not let a look press the pen.",
  ledgerAgain: "The ledger is already open. The hour is not finished until you write the places down.",
  ledgerClue:
    "You write the berth as it is: a second shadow left before the craft. The page does not say who walked it. It is recorded. It is not explained.",
  ledgerKept: "The berth's hour is already in the book.",
  valeEarly: "The clock is still only a clock. Fly once, and read the berth ledger, before you ask it about a trip you have not taken.",
  valeNeed: "The clock has not struck for you yet. Hear it before you write a margin beside it.",
  valeAsk:
    "A thinner set of hands has already left ten. The face still says nine and nine. Hale would keep one hour. The clock would keep the other. You can keep both, and live with the argument.",
  valeBoth: "You keep both hours. The clock does not thank you. The contradiction stays written.",
  valeNine: "You keep nine and nine. The thinner hands do not vanish. You simply chose not to give them the page.",
  valeTen: "You keep the thinner ten. The face is still nine and nine. You have picked a side the clock will not confess.",
  valeKept: "The Vale's hour is already in the book.",
  bellEarly: "Lowbell's margin is blank until the Unwritten Hour is open.",
  bellNeed: "The split bell has not been recorded. Finish that argument before you write a margin beside it.",
  bellWrite:
    "Beside the clapper, a margin in ink that has not dried. It describes a strike that finished before you reached the stair. You write that it was there. You do not ring it.",
  bellKept: "Lowbell's margin is already in the book.",
  mistEarly: "Mistwater's window is only weather until the hour is open.",
  mistNeed: "The crossing has not kept a window you can write. Settle the ferry, or record both departures, first.",
  mistSpared:
    "The hold remembers a courtesy. The window still has two stamps, and the guardian you asked to sleep is not in either of them. You write both stamps. You do not pick a kinder boat.",
  mistFallen:
    "The seal remembers heat. The window still has two stamps. Neither one pretends the fight was a kindness. You write both, because the river did not become one hour when the guardian fell.",
  mistKept: "Mistwater's window is already in the book.",
  dockOpen:
    "Four hours are written, and they do not agree. The First Stay has a third pad: the Margin, under an hour that left before you did. It is a line, not a country. The sky stays shut.",
  stairInk: "Ink is still walking the landing. It will not become a door while it is wet.",
  stairOpen: "The arch decides to be a stair. The ink stays behind you.",
  pageNeed: "The written page is a walk reading. Step back to Legacy, then read it.",
  echoNeed: "The echo page is the other view. Step inside, then read it.",
  pageRead: "From the walk, the page says you departed before you cast off. That half is written. It does not open the well by itself.",
  echoRead: "From inside the step, the page is blank and the departure is already drawn. That half is written. It does not open the well by itself.",
  pageAgain: "The written page is already in the book.",
  echoAgain: "The echo page is already in the book.",
  bothRead: "Both readings are kept. The well can be a door. Sight did not press it. You did.",
  doorShut: "The well wants the page from the walk and the echo from the other view. A look is not a reading.",
  doorOpen: "The well gives. The chamber past it has been waiting longer than the flight.",
  glintHidden: "The shine is not ready to be picked up. Trace the echo while the other hour is up. Looking is not taking.",
  glintTake: "A loose hour, small enough for a pocket. It keeps a shine. It does not keep which noon was first.",
  glintGone: "The shine is already pocketed.",
  sightVale:
    "Two sets of hands share the clock. One rests at nine and nine. One has already left ten. Neither set moves the real hands, and neither writes the margin for you.",
  sightMargin:
    "Two pages occupy one desk. One is written in a hand you have not used. One is blank and already finished. Neither page turns itself. A shine sits on the later one and does not jump.",
  compareNeed: "Compare wants the other hour up. Spend a look, then press this. The press still does not solve a page.",
  compareVale: "You hold the two clocks next to each other. They do not become one hour. The book beside them stays unwritten until you choose.",
  compareBell: "You hold the clapper next to a margin that has not dried. The bell does not ring. The margin does not write itself.",
  compareMist: "You hold two piers in one dock. A figure walks the earlier one and does not turn around. The timetable does not stamp itself.",
  compareBerth: "You hold the hull next to the shadow that left early. The pad does not explain it, and this look does not record it.",
  compareMargin: "You hold the written page against the blank one. They disagree on purpose. Neither reading is pressed.",
  compareElse: "You hold two versions of the room. They disagree, and then the room is only itself. Nothing is solved.",
  traceNeed: "Tracing wants the other hour up. The echo will not walk itself into a solution.",
  traceMargin: "You follow the echo along the desk, not through the well. A shine admits it can be taken. The pages do not turn.",
  traceElse: "You follow a thinner set of steps to the edge of the room and back. They do not press anything for you.",
  miraEarly: "Mira's book is not ready for an hour that left early. Open the ledger on the berth first.",
  miraNeed: "The parish page still has its first argument. Finish that with Mira before this one.",
  miraAskRecord:
    "The tenth strike is already written. This morning a second line arrived dated before the flight. I can set it beside the tenth, or close the book and let the tenth be enough. I will not pretend those are the same kindness.",
  miraAskBlank:
    "I left the tenth blank, and I meant it. A line has arrived anyway, dated before we flew. I can leave this one unwritten too, or write it now and admit the blank was for the tenth, not for every hour after.",
  miraBeside: "Then it sits beside the tenth. Two strikes, neither one sanded down. The book is heavier. I can live with that.",
  miraClose: "Then the book closes. The tenth stays the one we wrote. The early line can knock. It does not get a chair.",
  miraQuiet: "Then this one stays unwritten too. The blank was a choice. I am making it again, with my eyes open.",
  miraLate: "Then I write it now. The blank was for the tenth. This hour is a different rudeness, and it does not get to hide.",
  miraKept: "Mira has already answered the early line. She has not sanded the first choice into a better story.",
  miraSpared: " You asked a guardian to sleep. I am trying to be that careful with a page.",
  miraFallen: " A guardian fell. I am not going to pretend a page can undo that. I can still choose what the book holds.",
  seraEarly: "Sera's rig is still only a rig. The early line can wait until the hour is open.",
  seraNeed: "Sera is not with the company yet. The early splice can wait for her hands.",
  seraAskSplice:
    "The hot splice is the one we kept. Someone finished a second splice before I started this morning. I can cut the early line out, or lash it so it has to admit it is a stay. I will not call those the same job.",
  seraAskStay:
    "The safer stay is the one we kept. Someone finished a splice on it before I woke. I can cut that early line out, or lash a second stay over it. Careful is still careful. It is not the same as pretending the line was mine.",
  seraCut: "Then the early line comes out. The rig is honest about the cut. It does not tell me who tied the first knot.",
  seraLash: "Then it gets a second stay. Slower, and less likely to teach the ridge a new word for falling. The early knot stays where I can see it.",
  seraKept: "Sera has already answered the early line. The rig remembers which knot she trusted.",
  iriMeet:
    "Iri stands where the two pages overlap, and does not step on either. I am Iri. I walk the seam between the hour people remember and the hour the page records. I did not take the shadow's walk. I will not name what is behind it. Finish the hour, by asking or by ending. Then I will answer you.",
  iriMeetSpared: " You asked a guardian to sleep. I noticed. I do not lend that kind of asking to strangers.",
  iriMeetFallen: " A guardian fell on your road. I will not scold you for it. I will also not pretend the seam is gentle.",
  iriMeetBoth: " You kept both hours in the Vale. That is the only reason I am still in the room.",
  iriMeetOne: " You picked one hour in the Vale. The other is still here. I am not going to tidy it.",
  iriMeetSera: " Your skywright already put her hands on an early line. The rig and I are not the same kind of careful.",
  iriMeetMira: " Your archivist already answered a page that arrived too soon. I like her for not sanding it.",
  iriMeetKaelLaw: " The oathkeeper turned a person back, once. The seam is not a gate. Do not use me as one.",
  iriMeetKaelPeople: " The oathkeeper let a person finish a walk. I respect the bend. This seam is not that path.",
  iriEarly: "Iri will not answer a company that has not settled the hour.",
  iriAsk:
    "The hour is kept. I can walk with you, in the four or on the rig if the line is full. Or I can keep the veil, and stay a witness. Either way I am in the chronicle. I will not become a trade you can put on.",
  iriWalk: "Then I walk with you. Veilwalker is my work, not a coat you can borrow. Four is the line. If the road is full, I wait until you make a place. My secrets stay sheathed.",
  iriVeil: "Then the veil stays. I am not lost. I am not yours. The chronicle will remember that I was here, and that you did not ask me to be less careful.",
  iriReserved: "Iri is with the company, and not in the four. The rig will hold her until the line has a place.",
  iriKeptWalk: "Iri is walking with you. She has not started explaining the seam.",
  iriKeptVeil: "Iri kept the veil. She is still a person in the chronicle, not a rumor you can recruit later by accident.",
  fightInk: "The ink is only a stain now.",
  fightHour: "The hour is already kept. The chamber does not restart it.",
  mercySit: "You ask the hour to stay unwritten. It sits. The page stays blank on purpose.",
  mercySpared: "You ask it to leave the hour unwritten, the way you once asked a guardian to sleep. It sits.",
  mercyBoth: "You kept both hours, even after a guardian fell. You ask this one to sit. It does. The contradiction stays.",
} as const;

function give(save: SaveGame, itemId: string) {
  const slot = save.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else save.inventory.push({ itemId, qty: 1 });
}

function sparedWarden(save: SaveGame): boolean {
  return Boolean(save.flags["flag.warden_spared"] || save.wardenOutcome === "spared");
}

function remember(save: SaveGame, id: string, value: string) {
  if (!save.choiceLog.some((c) => c.id === id)) save.choiceLog.push({ id, value });
}

function maybeDock(save: SaveGame): SaveGame {
  if (save.flags["flag.margin_dock"]) return save;
  if (!save.flags["flag.clue_vale"] || !save.flags["flag.clue_lowbell"] || !save.flags["flag.clue_mist"] || !save.flags["flag.clue_ridge"]) {
    return save;
  }
  const next = setFlag(save, "flag.margin_dock");
  if (!next.journal.includes(HOUR_COPY.dockOpen)) next.journal.push(HOUR_COPY.dockOpen);
  if (!next.discoveries.includes("disc.margin_dock")) next.discoveries.push("disc.margin_dock");
  return next;
}

export function openUnwritten(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.flown"]) return { ok: false, reason: HOUR_COPY.ledgerEarly };
  if (save.flags["flag.unwritten_open"]) {
    return recordHullPage(save);
  }
  let next = save.flags["flag.hull_shadow"] ? save : setFlag(save, "flag.hull_shadow");
  next = setFlag(next, "flag.unwritten_open");
  if (!next.journal.includes(HOUR_COPY.ledgerOpen)) next.journal.push(HOUR_COPY.ledgerOpen);
  if (!next.discoveries.includes("disc.unwritten")) next.discoveries.push("disc.unwritten");
  refreshQuests(next);
  return { ok: true, save: next, text: HOUR_COPY.ledgerOpen };
}

export function recordHullPage(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.ledgerEarly };
  if (!save.flags["flag.hull_shadow"]) return { ok: false, reason: HOUR_COPY.ledgerAgain };
  if (save.flags["flag.clue_ridge"]) return { ok: true, save, text: HOUR_COPY.ledgerKept };
  let next = setFlag(save, "flag.clue_ridge");
  next = maybeDock(next);
  if (!next.journal.includes(HOUR_COPY.ledgerClue)) next.journal.push(HOUR_COPY.ledgerClue);
  return { ok: true, save: next, text: next.flags["flag.margin_dock"] && !save.flags["flag.margin_dock"] ? `${HOUR_COPY.ledgerClue} ${HOUR_COPY.dockOpen}` : HOUR_COPY.ledgerClue };
}

export function valeHourOffer(save: SaveGame):
  | { ok: false; reason: string }
  | { ok: true; ask: true; text: string }
  | { ok: true; ask: false; text: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.valeEarly };
  if (!save.flags["flag.clock_anomaly"]) return { ok: false, reason: HOUR_COPY.valeNeed };
  if (save.flags["flag.clue_vale"]) return { ok: true, ask: false, text: HOUR_COPY.valeKept };
  const tone = sparedWarden(save) ? HOUR_COPY.miraSpared : HOUR_COPY.miraFallen;
  return { ok: true, ask: true, text: HOUR_COPY.valeAsk + tone };
}

export function keepValeHours(
  save: SaveGame,
  which: "both" | "nine" | "ten",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (which !== "both" && which !== "nine" && which !== "ten") return { ok: false, reason: HOUR_COPY.valeNeed };
  const offer = valeHourOffer(save);
  if (!offer.ok) return offer;
  if (!offer.ask) return { ok: true, save, text: offer.text };
  const flagId = which === "both" ? "flag.hour_both" : which === "nine" ? "flag.hour_nine" : "flag.hour_ten";
  let next = setFlag(save, flagId);
  next = setFlag(next, "flag.clue_vale");
  remember(next, "choice.hour_vale", which);
  next = maybeDock(next);
  const text = which === "both" ? HOUR_COPY.valeBoth : which === "nine" ? HOUR_COPY.valeNine : HOUR_COPY.valeTen;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text: next.flags["flag.margin_dock"] && !save.flags["flag.margin_dock"] ? `${text} ${HOUR_COPY.dockOpen}` : text };
}

export function writeLowbellMargin(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.bellEarly };
  if (!save.flags["flag.bell_solved"]) return { ok: false, reason: HOUR_COPY.bellNeed };
  if (save.flags["flag.clue_lowbell"]) return { ok: true, save, text: HOUR_COPY.bellKept };
  let next = setFlag(save, "flag.clue_lowbell");
  next = maybeDock(next);
  const text = HOUR_COPY.bellWrite;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text: next.flags["flag.margin_dock"] && !save.flags["flag.margin_dock"] ? `${text} ${HOUR_COPY.dockOpen}` : text };
}

export function writeMistWindow(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.mistEarly };
  if (!save.flags["flag.ferry_complete"] && !save.flags["flag.twice_departed"]) return { ok: false, reason: HOUR_COPY.mistNeed };
  if (save.flags["flag.clue_mist"]) return { ok: true, save, text: HOUR_COPY.mistKept };
  let next = setFlag(save, "flag.clue_mist");
  next = maybeDock(next);
  const text = sparedWarden(save) ? HOUR_COPY.mistSpared : HOUR_COPY.mistFallen;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text: next.flags["flag.margin_dock"] && !save.flags["flag.margin_dock"] ? `${text} ${HOUR_COPY.dockOpen}` : text };
}

export function readMargin(
  save: SaveGame,
  view: "page" | "echo",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.margin_dock"]) return { ok: false, reason: HOUR_COPY.doorShut };
  if (view === "page") {
    if (save.mode !== "legacy") return { ok: false, reason: HOUR_COPY.pageNeed };
    if (save.flags["flag.margin_page"]) return { ok: true, save, text: HOUR_COPY.pageAgain };
    let next = setFlag(save, "flag.margin_page");
    const both = Boolean(next.flags["flag.margin_echo"]);
    if (both && !next.journal.includes(HOUR_COPY.bothRead)) next.journal.push(HOUR_COPY.bothRead);
    return { ok: true, save: next, text: both ? HOUR_COPY.bothRead : HOUR_COPY.pageRead };
  }
  if (save.mode !== "ascension") return { ok: false, reason: HOUR_COPY.echoNeed };
  if (save.flags["flag.margin_echo"]) return { ok: true, save, text: HOUR_COPY.echoAgain };
  let next = setFlag(save, "flag.margin_echo");
  const both = Boolean(next.flags["flag.margin_page"]);
  if (both && !next.journal.includes(HOUR_COPY.bothRead)) next.journal.push(HOUR_COPY.bothRead);
  return { ok: true, save: next, text: both ? HOUR_COPY.bothRead : HOUR_COPY.echoRead };
}

export function tryMarginStair(save: SaveGame): { ok: true; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.cleared.enc.ink"]) return { ok: false, reason: HOUR_COPY.stairInk };
  return { ok: true, text: HOUR_COPY.stairOpen };
}

export function tryHourDoor(save: SaveGame): { ok: true; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.margin_page"] || !save.flags["flag.margin_echo"]) return { ok: false, reason: HOUR_COPY.doorShut };
  return { ok: true, text: HOUR_COPY.doorOpen };
}

export function takeHourGlint(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.hour_glint"]) return { ok: false, reason: HOUR_COPY.glintHidden };
  if (save.flags["flag.got_hour_glint"]) return { ok: false, reason: HOUR_COPY.glintGone };
  const next = setFlag(save, "flag.got_hour_glint");
  give(next, "item.hour_glint");
  return { ok: true, save: next, text: HOUR_COPY.glintTake };
}

const HOUR_SIGHT: Record<string, { id: string; flag: string; text: string }> = {
  "map.vale": { id: "sight.hour.vale", flag: "flag.sight_hour_vale", text: HOUR_COPY.sightVale },
  "map.margin": { id: "sight.hour.margin", flag: "flag.sight_margin", text: HOUR_COPY.sightMargin },
};

/** Overlay only. Does not write clues, bell, departures, or either Margin reading. */
export function beginHourSight(save: SaveGame): { save: SaveGame; text: string } | null {
  if (!save.flags["flag.unwritten_open"]) return null;
  const scene = HOUR_SIGHT[save.mapId];
  if (!scene) return null;
  const next = structuredClone(save);
  next.sightScene = scene.id;
  next.sightSteps = 8;
  if (!next.flags[scene.flag]) {
    next.flags[scene.flag] = true;
    if (!next.discoveries.includes(scene.flag)) next.discoveries.push(scene.flag);
    if (!next.journal.includes(scene.text)) next.journal.push(scene.text);
  }
  if (scene.id === "sight.hour.vale" && !next.flags["flag.sight_clock"]) {
    next.flags["flag.sight_clock"] = true;
    if (!next.discoveries.includes("flag.sight_clock")) next.discoveries.push("flag.sight_clock");
  }
  refreshQuests(next);
  return { save: next, text: scene.text };
}

export function compareHours(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if ((save.sightSteps ?? 0) <= 0) return { ok: false, reason: HOUR_COPY.compareNeed };
  const place = save.mapId;
  const text =
    place === "map.vale"
      ? HOUR_COPY.compareVale
      : place === "map.lowbell"
        ? HOUR_COPY.compareBell
        : place === "map.ferry"
          ? HOUR_COPY.compareMist
          : place === "map.berth"
            ? HOUR_COPY.compareBerth
            : place === "map.margin"
              ? HOUR_COPY.compareMargin
              : HOUR_COPY.compareElse;
  const next = structuredClone(save);
  const id = `disc.hour_compared.${place}`;
  if (!next.discoveries.includes(id)) next.discoveries.push(id);
  if (!next.flags["flag.hour_compared"]) next.flags["flag.hour_compared"] = true;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function traceHourEcho(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if ((save.sightSteps ?? 0) <= 0) return { ok: false, reason: HOUR_COPY.traceNeed };
  const next = structuredClone(save);
  const id = `disc.echo_traced.${save.mapId}`;
  if (!next.discoveries.includes(id)) next.discoveries.push(id);
  if (!next.flags["flag.echo_traced"]) next.flags["flag.echo_traced"] = true;
  if (save.mapId === "map.margin" && !next.flags["flag.hour_glint"]) next.flags["flag.hour_glint"] = true;
  const text = save.mapId === "map.margin" ? HOUR_COPY.traceMargin : HOUR_COPY.traceElse;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function miraHourOffer(save: SaveGame):
  | { ok: false; reason: string }
  | { ok: true; ask: true; text: string; record: boolean }
  | { ok: true; ask: false; text: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.miraEarly };
  if (!save.party.includes("mira") && !(save.reserve ?? []).includes("mira")) return { ok: false, reason: HOUR_COPY.miraNeed };
  if (!save.choiceLog.some((c) => c.id === "choice.mira")) return { ok: false, reason: HOUR_COPY.miraNeed };
  if (save.flags["flag.mira_hour_done"]) return { ok: true, ask: false, text: HOUR_COPY.miraKept };
  const base = save.flags["flag.mira_blank"] ? HOUR_COPY.miraAskBlank : HOUR_COPY.miraAskRecord;
  const tone = sparedWarden(save) ? HOUR_COPY.miraSpared : HOUR_COPY.miraFallen;
  return { ok: true, ask: true, text: base + tone, record: !save.flags["flag.mira_blank"] };
}

export function chooseMiraHour(
  save: SaveGame,
  value: "beside" | "close" | "quiet" | "late",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  const offer = miraHourOffer(save);
  if (!offer.ok) return offer;
  if (!offer.ask) return { ok: true, save, text: offer.text };
  const record = offer.record;
  if (record && value !== "beside" && value !== "close") return { ok: false, reason: HOUR_COPY.miraNeed };
  if (!record && value !== "quiet" && value !== "late") return { ok: false, reason: HOUR_COPY.miraNeed };
  const flagId =
    value === "beside" ? "flag.mira_hour_beside" : value === "close" ? "flag.mira_hour_closed" : value === "quiet" ? "flag.mira_hour_quiet" : "flag.mira_hour_late";
  const item =
    value === "beside" ? "accessory.beside_clasp" : value === "close" ? "accessory.closed_page" : value === "quiet" ? "accessory.quiet_clasp" : "accessory.late_ink";
  const text = value === "beside" ? HOUR_COPY.miraBeside : value === "close" ? HOUR_COPY.miraClose : value === "quiet" ? HOUR_COPY.miraQuiet : HOUR_COPY.miraLate;
  let next = setFlag(save, flagId);
  next = setFlag(next, "flag.mira_hour_done");
  remember(next, "choice.mira_hour", value);
  give(next, item);
  next = bumpBond(next, "mira");
  if (!next.journal.includes(text)) next.journal.push(text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function seraHourOffer(save: SaveGame):
  | { ok: false; reason: string }
  | { ok: true; ask: true; text: string }
  | { ok: true; ask: false; text: string } {
  if (!save.flags["flag.unwritten_open"]) return { ok: false, reason: HOUR_COPY.seraEarly };
  if (!save.flags["flag.sera_joined"] || !save.roster.sera) return { ok: false, reason: HOUR_COPY.seraNeed };
  if (save.flags["flag.sera_hour_done"]) return { ok: true, ask: false, text: HOUR_COPY.seraKept };
  const text = save.flags["flag.sera_stay"] ? HOUR_COPY.seraAskStay : HOUR_COPY.seraAskSplice;
  return { ok: true, ask: true, text };
}

export function chooseSeraHour(
  save: SaveGame,
  value: "cut" | "lash",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "cut" && value !== "lash") return { ok: false, reason: HOUR_COPY.seraNeed };
  const offer = seraHourOffer(save);
  if (!offer.ok) return offer;
  if (!offer.ask) return { ok: true, save, text: offer.text };
  let next = setFlag(save, value === "cut" ? "flag.sera_hour_cut" : "flag.sera_hour_lashed");
  next = setFlag(next, "flag.sera_hour_done");
  remember(next, "choice.sera_hour", value);
  give(next, value === "cut" ? "accessory.early_lash" : "accessory.second_stay");
  next = bumpBond(next, "sera");
  const text = value === "cut" ? HOUR_COPY.seraCut : HOUR_COPY.seraLash;
  if (!next.journal.includes(text)) next.journal.push(text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

function iriColor(save: SaveGame): string {
  const bits: string[] = [HOUR_COPY.iriMeet];
  bits.push(sparedWarden(save) ? HOUR_COPY.iriMeetSpared : HOUR_COPY.iriMeetFallen);
  if (save.flags["flag.hour_both"]) bits.push(HOUR_COPY.iriMeetBoth);
  else if (save.flags["flag.clue_vale"]) bits.push(HOUR_COPY.iriMeetOne);
  if (save.flags["flag.sera_hour_done"]) bits.push(HOUR_COPY.iriMeetSera);
  if (save.flags["flag.mira_hour_done"]) bits.push(HOUR_COPY.iriMeetMira);
  if (save.flags["flag.kael_law"]) bits.push(HOUR_COPY.iriMeetKaelLaw);
  if (save.flags["flag.kael_people"]) bits.push(HOUR_COPY.iriMeetKaelPeople);
  return bits.join("");
}

export function meetIri(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.margin_dock"]) return { ok: false, reason: HOUR_COPY.iriEarly };
  const next = save.flags["flag.iri_met"] ? save : setFlag(save, "flag.iri_met");
  if (!next.discoveries.includes("disc.iri")) next.discoveries.push("disc.iri");
  const text = iriColor(next);
  if (!next.journal.includes(HOUR_COPY.iriMeet)) next.journal.push(HOUR_COPY.iriMeet);
  return { ok: true, save: next, text };
}

function bringIri(save: SaveGame): SaveGame {
  const next = save;
  if (!next.roster.iri) next.roster.iri = makeCombatant("iri", { position: { x: 1.4, z: 2.2 } });
  next.knownSpells.iri = next.knownSpells.iri?.length ? next.knownSpells.iri : ["spell.seam"];
  if (!next.equipment.iri) next.equipment.iri = {};
  next.bonds.iri = next.bonds.iri ?? 1;
  next.reserve = next.reserve ?? [];
  if (next.party.includes("iri") || next.reserve.includes("iri")) return next;
  if (next.party.length < ACTIVE_CAP) next.party.push("iri");
  else {
    next.reserve.push("iri");
    if (!next.journal.includes(HOUR_COPY.iriReserved)) next.journal.push(HOUR_COPY.iriReserved);
  }
  syncLevels(next);
  return next;
}

export function chooseIri(
  save: SaveGame,
  value: "walk" | "veil",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "walk" && value !== "veil") return { ok: false, reason: HOUR_COPY.iriEarly };
  if (!save.flags["flag.hour_complete"]) return { ok: false, reason: HOUR_COPY.iriEarly };
  if (save.choiceLog.some((c) => c.id === "choice.iri")) {
    return { ok: true, save, text: save.flags["flag.iri_veil"] ? HOUR_COPY.iriKeptVeil : HOUR_COPY.iriKeptWalk };
  }
  let next = structuredClone(save);
  remember(next, "choice.iri", value);
  if (value === "walk") {
    next = setFlag(next, "flag.iri_joined");
    next = bringIri(next);
  } else {
    next = setFlag(next, "flag.iri_veil");
  }
  const text = value === "walk" ? HOUR_COPY.iriWalk : HOUR_COPY.iriVeil;
  if (!next.journal.includes(text)) next.journal.push(text);
  if (!next.discoveries.includes("disc.iri_answer")) next.discoveries.push("disc.iri_answer");
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function hourObjective(save: SaveGame): string | null {
  if (!save.flags["flag.flown"]) return null;
  if (save.flags["flag.iri_joined"] || save.flags["flag.iri_veil"]) {
    return "The Unwritten Hour is kept. The route still has its pads. The sky is still shut.";
  }
  if (save.flags["flag.hour_complete"]) return "The hour is settled. Iri is in the Margin chamber, and she is waiting for an answer.";
  if (save.flags["flag.margin_dock"]) {
    return "The First Stay can reach the Margin. Clear the ink, read the page from the walk and the echo from the other view, then meet what keeps the hour. Sight will not press either reading.";
  }
  if (!save.flags["flag.unwritten_open"]) return "A ledger on the Skyweave berth disagrees with the departure. Read it.";
  const missing: string[] = [];
  if (!save.flags["flag.clue_vale"]) missing.push("the Vale clock");
  if (!save.flags["flag.clue_lowbell"]) missing.push("Lowbell's margin");
  if (!save.flags["flag.clue_mist"]) missing.push("Mistwater's window");
  if (!save.flags["flag.clue_ridge"]) missing.push("the berth ledger");
  if (missing.length) return `The Unwritten Hour is open. Still to write: ${missing.join(", ")}.`;
  return "Four hours are written. The Margin should be a pad.";
}

export function hourClues(save: SaveGame): string[] {
  const clues: string[] = [];
  if (save.flags["flag.hull_shadow"]) clues.push("A second shadow left the hull before the craft.");
  if (save.flags["flag.hour_both"]) clues.push("Vale: both hours kept.");
  else if (save.flags["flag.hour_nine"]) clues.push("Vale: nine and nine kept.");
  else if (save.flags["flag.hour_ten"]) clues.push("Vale: the thinner ten kept.");
  if (save.flags["flag.clue_lowbell"]) clues.push("Lowbell: a margin that finished early.");
  if (save.flags["flag.clue_mist"]) clues.push(sparedWarden(save) ? "Mistwater: two stamps, and a courtesy." : "Mistwater: two stamps, and a seal that remembers heat.");
  if (save.flags["flag.clue_ridge"]) clues.push("Berth: the early shadow is written, not explained.");
  if (save.flags["flag.margin_page"]) clues.push("Margin, from the walk: a departure before you cast off.");
  if (save.flags["flag.margin_echo"]) clues.push("Margin, from the other view: a blank page already finished.");
  if (save.flags["flag.sight_margin"] || save.flags["flag.sight_hour_vale"]) clues.push("Sight showed a disagreement. It did not press a page.");
  return clues;
}

export function journalBrief(save: SaveGame): {
  chapter: string;
  active: { title: string; objective: string }[];
  clues: string[];
  done: string[];
} {
  const active = save.quests
    .filter((q) => q.status === "active")
    .map((q) => ({
      title: q.title,
      objective: q.id === "quest.unwritten" ? (hourObjective(save) ?? q.summary) : q.summary,
    }));
  const done = save.quests.filter((q) => q.status === "complete").map((q) => q.title);
  const chapter = save.flags["flag.hour_complete"]
    ? "After the first flight"
    : save.flags["flag.flown"]
      ? "The route, and the hour under it"
      : save.flags["flag.chapter_complete"]
        ? "Past the shrine"
        : "The Crystal Awakening";
  return { chapter, active, clues: hourClues(save), done };
}
