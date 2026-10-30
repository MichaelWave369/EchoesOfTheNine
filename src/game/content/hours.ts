import type { SaveGame } from "../contracts.ts";
import { bumpBond, refreshQuests, setFlag } from "../chronicle/save.ts";

/**
 * The Hours We Keep. Optional, after the first flight.
 * Kael's oath, Nessa's spring, and Iri's seam. Sight can show the trouble.
 * It does not press a page, a channel, or a promise.
 * Nothing here names the late chronicle.
 */

export const HOURS_COPY = {
  oathEarly: "The path is only a path. Fly once, and settle Pell's first walk, before you ask the oath about a second order.",
  oathNeed: "Kael is not with the company. The oath will not argue with an empty gate.",
  oathPathLaw:
    "Pell's boots are still on the Glasspine path, going on, dated after you turned them back. In the other order they already finished. Kael looks at the prints and does not call either of them a lie.",
  oathPathPeople:
    "A pause in the air is still turning Pell back, even though they finished the walk. The refusal is late, or the walk is early. Kael will not pick a kinder tense.",
  oathValeLaw:
    "At the Vale well, Pell is already home. They say you let them finish yesterday. The path you closed is still wet. The promise happened twice, and not in one direction.",
  oathValePeople:
    "At the Vale well, Pell says the gate closed after they got home. You let them finish, and a later oath is still shutting. The walk and the refusal traded places.",
  oathAskLaw:
    "Kael sets a hand on the cord. I turned Pell back. The other hour let them through. I can keep the words as they were sworn, or put the living person inside the promise. I will not call one of those a cleaner oath.",
  oathAskPeople:
    "Kael sets a hand on the cord. I let Pell finish. The other hour is still turning them around. I can keep the words as they were sworn, or put the living person inside the promise. I will not pretend the bend was always the point.",
  oathHoldLaw: "Then the words stay as they were sworn. Pell's other walk remains written. The gate does not apologize, and it does not pretend the person was never outside it.",
  oathHoldPeople: "Then the finished walk stays the oath you kept. The later refusal remains written. Kael does not unsay the bend, and he does not sand the other order out.",
  oathServeLaw: "Then the person goes inside the promise. The gate moves. The words that turned Pell back stay in the book, and they do not get the last say.",
  oathServePeople: "Then the person stays inside the promise, even where a later gate is still closing. Kael keeps the bend, and he keeps the other order where he can see it.",
  oathKept: "Kael has already answered the second order. The first choice about Pell is still the one you made.",
  oathSightWoods: "Two sets of prints share the path. One stops. One does not. Neither set chooses for you.",
  oathSightVale: "Pell is at the well and also still on the path. The well does not decide which hour poured it.",
  springEarly: "The stone is only a stone. Fly once, and settle your mother's rhyme, before you ask the spring which verse arrived first.",
  springNeed: "Nessa is not with the company. The spring will not take a lesson from an empty hand.",
  springStoneSpring:
    "The mother's stone is wet in a season that is not raining. The old rhyme is beaded on it, and a newer line is already running off the back. Nessa does not thank the moss. She does not scold it either.",
  springStoneVerse:
    "The mother's stone is dry where the new verse stands, and wet along a line her mother never finished. The water is early. The verse she let stand is not erased.",
  springLowSpring:
    "Lowbell's channel is running uphill, toward the Reach. It is trying to obey the old rhyme. Lark's bottles on the bank are dated tomorrow.",
  springLowVerse:
    "Lowbell's channel is running uphill, carrying a line Nessa's mother did not finish. The new verse is already in the water. The old rhyme is still in Nessa's mouth.",
  springKeptNote: "That half of the spring is already written down.",
  larkEarly: "A reed-cutter is stacking bottles. She will not talk about tomorrow until the stone has been seen.",
  larkMeet:
    "I am Lark. I cut reeds and I bottle what arrives before the rain. These are dated tomorrow, which is rude of them. Dry stones start with what grows. Water starts with what has already settled. I will not press either order. That is your spellblade's argument, not mine.",
  larkKept: "Lark is still dating bottles for a day that has not agreed to happen. She has not pressed the channel.",
  springDryNeed: "The dry order wants the walk. Step back to Legacy, then set it. A look is not a setting.",
  springWetNeed: "The wet order wants the other view. Step inside, then set it. A look is not a setting.",
  springDrySet: "From the walk, the dry stones take moss, then stone, then still water. That half is set. It does not choose the verse.",
  springWetSet: "From inside the step, the water is already still, then moss, then stone. That half is set. It does not choose the verse.",
  springOrderKept: "That order is already set.",
  springAskEarly: "The channel is not ready for a verse. See the stone, the uphill water, and Lark. Set both orders. Sight will not do it.",
  springAskSpring:
    "Nessa kneels in water that wants her mother's rhyme and is already leaving. I taught the old spring once. I can let that rhyme water what it still can, or give the channel the verse the moss is already singing and keep her line in my mouth. Neither one throws the other out.",
  springAskVerse:
    "Nessa kneels in water that arrived before her mother finished the line. The new verse stands. I can give it the channel, or carry her unfinished line into the water without erasing what I let stand. I will not call either of those a correction.",
  springCarrySpring: "Then the old rhyme waters what it still can. The new verse stays in the moss, untaught and unkilled. Nessa keeps both.",
  springCarryVerse: "Then her mother's unfinished line goes into the water with the verse she let stand. Nothing is sanded back into a single spring.",
  springChannelSpring: "Then the channel takes the verse the moss is already singing. The old rhyme stays in Nessa's mouth, where she wanted her mother to remain.",
  springChannelVerse: "Then the new verse gets the channel. Her mother's line stays spoken, not installed. The Reach is allowed to be early.",
  springKept: "Nessa has already answered the spring. The first rhyme is still the one you chose.",
  springSightReach: "Water beads on the stone and runs off the wrong edge. It does not pick a verse, and it does not press the channel.",
  springSightLow: "The channel runs uphill. Bottles on the bank are dated ahead of the rain. The stones do not turn themselves.",
  seamEarly: "The spring mouth is only water until the oath and the spring have both been answered.",
  seamLegacyNeed: "The walk reading wants Legacy. Step back, then read the oath's order. A look is not a reading.",
  seamAscentNeed: "The other reading wants the step. Step inside, then read the spring's order. A look is not a reading.",
  seamLegacyHeld: "From the walk, the mouth shows the oath as words that stayed put. Pell's first path is still in the water beside them. You do not get to unsee either.",
  seamLegacyServed: "From the walk, the mouth shows the oath moved to fit a person. Pell's first path is still beside that bend. The water does not rank them.",
  seamAscentCarry: "From inside the step, the mouth shows a rhyme still watering an older line, and a verse that was not thrown out. The spring did not become one hour.",
  seamAscentChannel: "From inside the step, the mouth shows the channel given to the verse that was already arriving. The older line is still in a mouth, not deleted.",
  seamKept: "That reading of the mouth is already kept.",
  seamSetNeed: "The mouth wants the oath from the walk and the spring from the other view. Sight does not set it.",
  seamSetPlain: "You set the two orders in the same mouth. They do not become one story. No one had to be recruited for the water to hold still.",
  seamSetIri: " Iri is in the company. She says the two orders were never a secret. They were a seam. She does not name what is behind it.",
  seamSetVeil: " A thread from the veil says the same thing, and does not step into the four. Hearing it is not a recruitment.",
  seamKeptSet: "The mouth is already set. The bead is already pocketed.",
  seamSight: "The mouth holds two orders at once. One is a gate. One is a verse. Neither jumps into a hand, and neither presses itself.",
  hearthQuiet: "The hearth is warm and uninterested. Nobody in the company is holding an unsaid hour.",
  hearthVeil: "Iri kept the veil. If you want her voice, the Margin chamber still has a thread. She will not be walked into the four by being overheard.",
  threadBook: "Mira lets the book hold the gate. The strike and the oath sit on one page and do not become the same kindness.",
  threadGate: "Mira leaves the gate off the page. The book stays a book. Kael can live with a promise that is not also a record.",
  threadLeave: "Sera asks the wind to leave the water alone. The stay she trusts and the spring Nessa trusts do not have to share a knot.",
  threadDrink: "Sera lets the stay drink. The rig takes a little of the spring and does not claim to have invented it.",
  threadHeard: "Kael and Nessa say the oath and the spring out loud, once. They do not agree which arrived first. They agree it mattered.",
  iriMira: "Iri, beside Mira: the tenth strike and the line that came early are not the same blank. I will not sand either. The seam between them is where I walk. That does not open anything behind the page.",
  iriKaelHeld: "Iri, beside Kael: you kept the words. Pell's other order is still walking. I am not going to pick which one was first, and I am not a gate you can borrow.",
  iriKaelServed: "Iri, beside Kael: you moved the promise to fit a person. The other order is still closing. I respect the bend. This seam is not that path.",
  iriNessa: "Iri, beside Nessa: your mother's rhyme and the newer verse are both wet. The spring did not choose a winner. I will not choose one for it.",
  iriSera: "Iri, beside Sera: the early knot on the rig and the shadow under the hull are the same kind of early. I will not name who tied either.",
  iriYou: "Iri, to you: I can walk beside this. I still will not name what left before the hull. That is not a refusal of you. It is the work.",
  veilMira: "Through the veil, Iri: the tenth strike and the early line are not the same blank. I am not coming out to sand them. You can hear that and leave me where I am.",
  veilKaelHeld: "Through the veil, Iri: the words stayed. Pell's other walk did not. I will not pick a first hour for you, and I will not be recruited by the listening.",
  veilKaelServed: "Through the veil, Iri: the promise moved to fit a person. I can respect that from this side. Do not reach through.",
  veilNessa: "Through the veil, Iri: both verses are wet. I am not the one who chooses a spring. Hearing me is not a joining.",
  veilSera: "Through the veil, Iri: an early knot and an early shadow are cousins. I will not name the hand. I will not cross.",
  veilYou: "Through the veil, Iri: I am still here. I still will not name what left before the hull. The veil was the answer. It remains the answer.",
  veilstepLearned: "Iri shows you Veilstep, and does not hand it over. She walks an ally off the telegraph. Veilwalker stays her work.",
  veilstepSheathed: "Iri keeps Veilstep on her side of the seam. It is not a coat, and it is not yours.",
  veilEarly: "The veil has nothing new to say until Iri has chosen to keep it.",
  veilQuiet: "The thread is quiet. What she was willing to say has been said.",
  spared: " A guardian was asked to sleep. That asking is still in the room. It does not pick this answer.",
  fallen: " A guardian fell. Nobody here is going to pretend a promise undoes that.",
} as const;

function seated(save: SaveGame, id: string): boolean {
  return save.party.includes(id) || (save.reserve ?? []).includes(id);
}

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

function teach(save: SaveGame, who: string, spellId: string) {
  const known = save.knownSpells[who] ?? [];
  if (!known.includes(spellId)) save.knownSpells[who] = [...known, spellId];
  const hero = save.knownSpells.wanderer ?? [];
  save.knownSpells.wanderer = hero.filter((id) => id !== spellId);
  save.earnedSpells = (save.earnedSpells ?? []).filter((id) => id !== spellId);
}

function tone(save: SaveGame): string {
  if (save.flags["flag.warden_spared"] || save.wardenOutcome === "spared") return HOURS_COPY.spared;
  if (save.flags["flag.warden_defeated"] || save.wardenOutcome === "defeated") return HOURS_COPY.fallen;
  return "";
}

function flown(save: SaveGame): boolean {
  return Boolean(save.flags["flag.flown"]);
}

function kaelChosen(save: SaveGame): boolean {
  return Boolean(save.flags["flag.kael_law"] || save.flags["flag.kael_people"] || save.choiceLog.some((c) => c.id === "choice.kael"));
}

function nessaChosen(save: SaveGame): boolean {
  return Boolean(save.flags["flag.nessa_spring"] || save.flags["flag.nessa_verse"] || save.choiceLog.some((c) => c.id === "choice.nessa"));
}

function law(save: SaveGame): boolean {
  return Boolean(save.flags["flag.kael_law"] || save.choiceLog.some((c) => c.id === "choice.kael" && c.value === "law"));
}

function springFirst(save: SaveGame): boolean {
  return Boolean(save.flags["flag.nessa_spring"] || save.choiceLog.some((c) => c.id === "choice.nessa" && c.value === "spring"));
}

export function noteOathPath(save: SaveGame): { ok: true; save: SaveGame; text: string; ask: boolean } | { ok: false; reason: string } {
  if (!flown(save) || !kaelChosen(save)) return { ok: false, reason: HOURS_COPY.oathEarly };
  if (!seated(save, "kael")) return { ok: false, reason: HOURS_COPY.oathNeed };
  if (save.flags["flag.oath_done"]) return { ok: true, save, text: HOURS_COPY.oathKept, ask: false };
  const text = (law(save) ? HOURS_COPY.oathPathLaw : HOURS_COPY.oathPathPeople) + tone(save);
  let next = save.flags["flag.oath_path"] ? save : setFlag(save, "flag.oath_path");
  if (!next.journal.includes(text)) next.journal.push(text);
  const ask = Boolean(next.flags["flag.oath_vale"]);
  return { ok: true, save: next, text: ask ? `${text} ${law(save) ? HOURS_COPY.oathAskLaw : HOURS_COPY.oathAskPeople}` : text, ask };
}

export function noteOathVale(save: SaveGame): { ok: true; save: SaveGame; text: string; ask: boolean } | { ok: false; reason: string } {
  if (!flown(save) || !kaelChosen(save)) return { ok: false, reason: HOURS_COPY.oathEarly };
  if (!seated(save, "kael")) return { ok: false, reason: HOURS_COPY.oathNeed };
  if (save.flags["flag.oath_done"]) return { ok: true, save, text: HOURS_COPY.oathKept, ask: false };
  const text = (law(save) ? HOURS_COPY.oathValeLaw : HOURS_COPY.oathValePeople) + tone(save);
  let next = save.flags["flag.oath_vale"] ? save : setFlag(save, "flag.oath_vale");
  if (!next.journal.includes(text)) next.journal.push(text);
  const ask = Boolean(next.flags["flag.oath_path"]);
  return { ok: true, save: next, text: ask ? `${text} ${law(save) ? HOURS_COPY.oathAskLaw : HOURS_COPY.oathAskPeople}` : text, ask };
}

export function chooseOath(
  save: SaveGame,
  value: "hold" | "serve",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "hold" && value !== "serve") return { ok: false, reason: HOURS_COPY.oathEarly };
  if (!flown(save) || !kaelChosen(save)) return { ok: false, reason: HOURS_COPY.oathEarly };
  if (!seated(save, "kael") || !save.roster.kael) return { ok: false, reason: HOURS_COPY.oathNeed };
  if (save.flags["flag.oath_done"]) return { ok: true, save, text: HOURS_COPY.oathKept };
  if (!save.flags["flag.oath_path"] || !save.flags["flag.oath_vale"]) return { ok: false, reason: HOURS_COPY.oathEarly };
  const held = value === "hold";
  const text = held
    ? law(save)
      ? HOURS_COPY.oathHoldLaw
      : HOURS_COPY.oathHoldPeople
    : law(save)
      ? HOURS_COPY.oathServeLaw
      : HOURS_COPY.oathServePeople;
  let next = setFlag(save, held ? "flag.oath_held" : "flag.oath_served");
  next = setFlag(next, "flag.oath_done");
  remember(next, "choice.oath", value);
  giveOnce(next, held ? "oath_hold" : "oath_serve", held ? "item.oath_cord" : "item.walk_token");
  teach(next, "kael", held ? "spell.oathgate" : "spell.namedguard");
  next = bumpBond(next, "kael");
  if (!next.journal.includes(text)) next.journal.push(text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function noteMotherStone(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!flown(save) || !nessaChosen(save)) return { ok: false, reason: HOURS_COPY.springEarly };
  if (!seated(save, "nessa")) return { ok: false, reason: HOURS_COPY.springNeed };
  if (save.flags["flag.spring_stone"]) {
    const text = springFirst(save) ? HOURS_COPY.springStoneSpring : HOURS_COPY.springStoneVerse;
    return { ok: true, save, text: `${HOURS_COPY.springKeptNote} ${text}` };
  }
  const text = springFirst(save) ? HOURS_COPY.springStoneSpring : HOURS_COPY.springStoneVerse;
  let next = setFlag(save, "flag.spring_stone");
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function noteLowbellSpring(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!flown(save) || !nessaChosen(save)) return { ok: false, reason: HOURS_COPY.springEarly };
  if (!seated(save, "nessa")) return { ok: false, reason: HOURS_COPY.springNeed };
  if (!save.flags["flag.spring_stone"]) return { ok: false, reason: HOURS_COPY.springAskEarly };
  if (save.flags["flag.spring_lowbell"]) return { ok: true, save, text: HOURS_COPY.springKeptNote };
  const text = springFirst(save) ? HOURS_COPY.springLowSpring : HOURS_COPY.springLowVerse;
  let next = setFlag(save, "flag.spring_lowbell");
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function meetLark(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.spring_stone"]) return { ok: false, reason: HOURS_COPY.larkEarly };
  if (save.flags["flag.met_lark"]) return { ok: true, save, text: HOURS_COPY.larkKept };
  let next = setFlag(save, "flag.met_lark");
  if (!next.journal.includes(HOURS_COPY.larkMeet)) next.journal.push(HOURS_COPY.larkMeet);
  return { ok: true, save: next, text: HOURS_COPY.larkMeet };
}

export function setSpringOrder(
  save: SaveGame,
  which: "dry" | "wet",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!flown(save) || !nessaChosen(save) || !seated(save, "nessa")) return { ok: false, reason: HOURS_COPY.springNeed };
  if (!save.flags["flag.spring_stone"] || !save.flags["flag.spring_lowbell"] || !save.flags["flag.met_lark"]) {
    return { ok: false, reason: HOURS_COPY.springAskEarly };
  }
  if (which === "dry") {
    if (save.mode !== "legacy") return { ok: false, reason: HOURS_COPY.springDryNeed };
    if (save.flags["flag.spring_dry"]) return { ok: true, save, text: HOURS_COPY.springOrderKept };
    const next = setFlag(save, "flag.spring_dry");
    if (!next.journal.includes(HOURS_COPY.springDrySet)) next.journal.push(HOURS_COPY.springDrySet);
    return { ok: true, save: next, text: HOURS_COPY.springDrySet };
  }
  if (save.mode !== "ascension") return { ok: false, reason: HOURS_COPY.springWetNeed };
  if (save.flags["flag.spring_wet"]) return { ok: true, save, text: HOURS_COPY.springOrderKept };
  const next = setFlag(save, "flag.spring_wet");
  if (!next.journal.includes(HOURS_COPY.springWetSet)) next.journal.push(HOURS_COPY.springWetSet);
  return { ok: true, save: next, text: HOURS_COPY.springWetSet };
}

export function springOffer(save: SaveGame):
  | { ok: false; reason: string }
  | { ok: true; ask: false; text: string }
  | { ok: true; ask: true; text: string } {
  if (!flown(save) || !nessaChosen(save)) return { ok: false, reason: HOURS_COPY.springEarly };
  if (!seated(save, "nessa") || !save.roster.nessa) return { ok: false, reason: HOURS_COPY.springNeed };
  if (save.flags["flag.spring_done"]) return { ok: true, ask: false, text: HOURS_COPY.springKept };
  if (!save.flags["flag.spring_dry"] || !save.flags["flag.spring_wet"] || !save.flags["flag.met_lark"]) {
    return { ok: false, reason: HOURS_COPY.springAskEarly };
  }
  const text = (springFirst(save) ? HOURS_COPY.springAskSpring : HOURS_COPY.springAskVerse) + tone(save);
  return { ok: true, ask: true, text };
}

export function chooseSpring(
  save: SaveGame,
  value: "carry" | "channel",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (value !== "carry" && value !== "channel") return { ok: false, reason: HOURS_COPY.springEarly };
  const offer = springOffer(save);
  if (!offer.ok) return offer;
  if (!offer.ask) return { ok: true, save, text: offer.text };
  const carry = value === "carry";
  const text = carry
    ? springFirst(save)
      ? HOURS_COPY.springCarrySpring
      : HOURS_COPY.springCarryVerse
    : springFirst(save)
      ? HOURS_COPY.springChannelSpring
      : HOURS_COPY.springChannelVerse;
  let next = setFlag(save, carry ? "flag.spring_carry" : "flag.spring_channel");
  next = setFlag(next, "flag.spring_done");
  remember(next, "choice.spring_hour", value);
  giveOnce(next, carry ? "spring_carry" : "spring_channel", carry ? "item.mother_dew" : "item.verse_pebble");
  teach(next, "nessa", "spell.springmemory");
  next = bumpBond(next, "nessa");
  if (save.flags["flag.nessa_spring"]) next.flags["flag.nessa_spring"] = true;
  if (save.flags["flag.nessa_verse"]) next.flags["flag.nessa_verse"] = true;
  if (!next.journal.includes(text)) next.journal.push(text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function readSeam(
  save: SaveGame,
  view: "legacy" | "ascension",
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.oath_done"] || !save.flags["flag.spring_done"]) return { ok: false, reason: HOURS_COPY.seamEarly };
  if (view === "legacy") {
    if (save.mode !== "legacy") return { ok: false, reason: HOURS_COPY.seamLegacyNeed };
    if (save.flags["flag.seam_legacy"]) return { ok: true, save, text: HOURS_COPY.seamKept };
    const next = setFlag(save, "flag.seam_legacy");
    const text = save.flags["flag.oath_served"] ? HOURS_COPY.seamLegacyServed : HOURS_COPY.seamLegacyHeld;
    if (!next.journal.includes(text)) next.journal.push(text);
    return { ok: true, save: next, text };
  }
  if (save.mode !== "ascension") return { ok: false, reason: HOURS_COPY.seamAscentNeed };
  if (save.flags["flag.seam_spring"]) return { ok: true, save, text: HOURS_COPY.seamKept };
  const next = setFlag(save, "flag.seam_spring");
  const text = save.flags["flag.spring_channel"] ? HOURS_COPY.seamAscentChannel : HOURS_COPY.seamAscentCarry;
  if (!next.journal.includes(text)) next.journal.push(text);
  return { ok: true, save: next, text };
}

export function setSeam(save: SaveGame): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.oath_done"] || !save.flags["flag.spring_done"]) return { ok: false, reason: HOURS_COPY.seamEarly };
  if (save.flags["flag.seam_set"]) return { ok: true, save, text: HOURS_COPY.seamKeptSet };
  if (!save.flags["flag.seam_legacy"] || !save.flags["flag.seam_spring"]) return { ok: false, reason: HOURS_COPY.seamSetNeed };
  if (save.flags["flag.sight_seam"] && !save.flags["flag.seam_legacy"]) return { ok: false, reason: HOURS_COPY.seamSetNeed };
  let next = setFlag(save, "flag.seam_set");
  giveOnce(next, "seam_bead", "item.seam_bead");
  let text: string = HOURS_COPY.seamSetPlain;
  if (save.flags["flag.iri_joined"]) text += HOURS_COPY.seamSetIri;
  else if (save.flags["flag.iri_veil"] && save.flags["flag.veil_heard"]) text += HOURS_COPY.seamSetVeil;
  if (!next.journal.includes(HOURS_COPY.seamSetPlain)) next.journal.push(HOURS_COPY.seamSetPlain);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

function overlay(save: SaveGame, id: string, flagId: string, text: string) {
  const next = structuredClone(save);
  next.sightScene = id;
  next.sightSteps = 8;
  if (!next.flags[flagId]) {
    next.flags[flagId] = true;
    if (!next.discoveries.includes(flagId)) next.discoveries.push(flagId);
    if (!next.journal.includes(text)) next.journal.push(text);
  }
  refreshQuests(next);
  return { save: next, text };
}

/** Overlay only. Does not write the oath, the channel, or either seam reading. */
export function beginHoursSight(save: SaveGame): { save: SaveGame; text: string } | null {
  if (!flown(save)) return null;
  if (save.mapId === "map.woods" && kaelChosen(save) && seated(save, "kael") && !save.flags["flag.oath_done"]) {
    return overlay(save, "sight.oath.woods", "flag.sight_oath_woods", HOURS_COPY.oathSightWoods);
  }
  if (save.mapId === "map.vale" && kaelChosen(save) && seated(save, "kael") && !save.flags["flag.oath_done"]) {
    if (save.flags["flag.unwritten_open"] && !save.flags["flag.hour_complete"]) return null;
    return overlay(save, "sight.oath.vale", "flag.sight_oath_vale", HOURS_COPY.oathSightVale);
  }
  if (save.mapId === "map.reach" && nessaChosen(save) && seated(save, "nessa") && !save.flags["flag.spring_done"]) {
    return overlay(save, "sight.spring.reach", "flag.sight_spring_reach", HOURS_COPY.springSightReach);
  }
  if (save.mapId === "map.lowbell" && nessaChosen(save) && seated(save, "nessa") && !save.flags["flag.spring_done"]) {
    return overlay(save, "sight.spring.low", "flag.sight_spring_low", HOURS_COPY.springSightLow);
  }
  if (save.mapId === "map.lowbell" && save.flags["flag.oath_done"] && save.flags["flag.spring_done"] && !save.flags["flag.seam_set"]) {
    return overlay(save, "sight.seam", "flag.sight_seam", HOURS_COPY.seamSight);
  }
  return null;
}

export type ThreadChoice = { label: string; flag: string };

export function nextHearth(save: SaveGame): { speaker: string; text: string; choices: ThreadChoice[] } | { quiet: string } {
  if (!flown(save)) return { quiet: HOURS_COPY.hearthQuiet };
  if (save.flags["flag.iri_veil"] && !save.flags["flag.iri_joined"]) {
    /* the hearth does not pull her out of the Margin */
  }
  const scene = hearthQueue(save)[0];
  if (!scene) {
    if (save.flags["flag.iri_veil"]) return { quiet: `${HOURS_COPY.hearthQuiet} ${HOURS_COPY.hearthVeil}` };
    return { quiet: HOURS_COPY.hearthQuiet };
  }
  return scene;
}

function hearthQueue(save: SaveGame): { speaker: string; text: string; choices: ThreadChoice[] }[] {
  const out: { speaker: string; text: string; choices: ThreadChoice[] }[] = [];
  const done = (id: string) => save.choiceLog.some((c) => c.id === `thread.${id}`);
  if (seated(save, "mira") && seated(save, "kael") && save.flags["flag.oath_done"] && save.choiceLog.some((c) => c.id === "choice.mira") && !done("mira_kael")) {
    out.push({
      speaker: "Mira",
      text: "The hearth is loud enough for two records. Kael's promise and my page are in the same room. I can let the book hold the gate, or leave the gate off the page. I will not rank those.",
      choices: [
        { label: "Let the book hold the gate.", flag: "choice.thread.mira_kael.book" },
        { label: "Leave the gate off the page.", flag: "choice.thread.mira_kael.gate" },
      ],
    });
  }
  if (seated(save, "nessa") && seated(save, "sera") && save.flags["flag.spring_done"] && save.flags["flag.sera_joined"] && !done("nessa_sera")) {
    out.push({
      speaker: "Sera",
      text: "Nessa's water and my stay are arguing about who arrived first. I can ask the wind to leave the water, or let the stay drink. Neither one is the splice we already chose.",
      choices: [
        { label: "Ask the wind to leave the water.", flag: "choice.thread.nessa_sera.leave" },
        { label: "Let the stay drink.", flag: "choice.thread.nessa_sera.drink" },
      ],
    });
  }
  if (seated(save, "kael") && seated(save, "nessa") && save.flags["flag.oath_done"] && save.flags["flag.spring_done"] && !done("kael_nessa")) {
    out.push({
      speaker: "Kael",
      text: HOURS_COPY.threadHeard,
      choices: [{ label: "Let them say it once.", flag: "choice.thread.kael_nessa.heard" }],
    });
  }
  if (save.flags["flag.iri_joined"] && seated(save, "iri")) {
    pushIri(out, save, false);
  }
  return out;
}

function pushIri(out: { speaker: string; text: string; choices: ThreadChoice[] }[], save: SaveGame, veil: boolean) {
  const done = (id: string) => save.choiceLog.some((c) => c.id === `thread.${id}`);
  const add = (id: string, speaker: string, text: string) => {
    if (done(id)) return;
    out.push({
      speaker,
      text,
      choices: [{ label: veil ? "Listen, and leave the veil." : "Hear her.", flag: `choice.thread.${id}.heard` }],
    });
  };
  if (seated(save, "mira") || veil) {
    if (save.choiceLog.some((c) => c.id === "choice.mira") || save.flags["flag.mira_hour_done"]) {
      add("iri_mira", "Iri", veil ? HOURS_COPY.veilMira : HOURS_COPY.iriMira);
    }
  }
  if ((seated(save, "kael") || veil) && save.flags["flag.oath_done"]) {
    const text = veil
      ? save.flags["flag.oath_served"]
        ? HOURS_COPY.veilKaelServed
        : HOURS_COPY.veilKaelHeld
      : save.flags["flag.oath_served"]
        ? HOURS_COPY.iriKaelServed
        : HOURS_COPY.iriKaelHeld;
    add("iri_kael", "Iri", text);
  }
  if ((seated(save, "nessa") || veil) && save.flags["flag.spring_done"]) {
    add("iri_nessa", "Iri", veil ? HOURS_COPY.veilNessa : HOURS_COPY.iriNessa);
  }
  if ((seated(save, "sera") || veil) && save.flags["flag.sera_joined"]) {
    add("iri_sera", "Iri", veil ? HOURS_COPY.veilSera : HOURS_COPY.iriSera);
  }
  add("iri_you", "Iri", veil ? HOURS_COPY.veilYou : HOURS_COPY.iriYou);
}

export function nextVeil(save: SaveGame): { speaker: string; text: string; choices: ThreadChoice[] } | { quiet: string } {
  if (!save.flags["flag.iri_veil"] || save.flags["flag.iri_joined"]) return { quiet: HOURS_COPY.veilEarly };
  const out: { speaker: string; text: string; choices: ThreadChoice[] }[] = [];
  pushIri(out, save, true);
  const scene = out[0];
  if (!scene) return { quiet: HOURS_COPY.veilQuiet };
  return scene;
}

const THREAD_TEXT: Record<string, string> = {
  "mira_kael.book": HOURS_COPY.threadBook,
  "mira_kael.gate": HOURS_COPY.threadGate,
  "nessa_sera.leave": HOURS_COPY.threadLeave,
  "nessa_sera.drink": HOURS_COPY.threadDrink,
  "kael_nessa.heard": HOURS_COPY.threadHeard,
  "iri_mira.heard": HOURS_COPY.iriMira,
  "iri_kael.heard": HOURS_COPY.iriKaelHeld,
  "iri_nessa.heard": HOURS_COPY.iriNessa,
  "iri_sera.heard": HOURS_COPY.iriSera,
  "iri_you.heard": HOURS_COPY.iriYou,
};

export function chooseThread(
  save: SaveGame,
  threadId: string,
  value: string,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  const key = `${threadId}.${value}`;
  if (!THREAD_TEXT[key] && !threadId.startsWith("iri_")) return { ok: false, reason: HOURS_COPY.hearthQuiet };
  if (save.choiceLog.some((c) => c.id === `thread.${threadId}`)) {
    return { ok: true, save, text: "That hour between them is already said." };
  }
  const veil = Boolean(save.flags["flag.iri_veil"] && !save.flags["flag.iri_joined"]);
  let text = THREAD_TEXT[key] ?? "That hour between them is already said.";
  if (threadId === "iri_kael" && save.flags["flag.oath_served"]) text = veil ? HOURS_COPY.veilKaelServed : HOURS_COPY.iriKaelServed;
  if (threadId.startsWith("iri_") && veil) {
    if (threadId === "iri_mira") text = HOURS_COPY.veilMira;
    if (threadId === "iri_nessa") text = HOURS_COPY.veilNessa;
    if (threadId === "iri_sera") text = HOURS_COPY.veilSera;
    if (threadId === "iri_you") text = HOURS_COPY.veilYou;
  }
  let next = structuredClone(save);
  remember(next, `thread.${threadId}`, value);
  next = setFlag(next, `flag.thread.${threadId}`);
  if (threadId.startsWith("iri_")) {
    next = setFlag(next, "flag.veil_heard");
    if (save.flags["flag.iri_joined"] && next.roster.iri) {
      if (!next.knownSpells.iri?.includes("spell.veilstep")) {
        teach(next, "iri", "spell.veilstep");
        next = setFlag(next, "flag.veilstep_earned");
        text = `${text} ${HOURS_COPY.veilstepLearned}`;
      }
    } else if (veil && !next.flags["flag.veilstep_sheathed"]) {
      next = setFlag(next, "flag.veilstep_sheathed");
      text = `${text} ${HOURS_COPY.veilstepSheathed}`;
    }
    if (next.party.includes("iri") || (next.reserve ?? []).includes("iri")) {
      /* already seated; listening must not copy the pack or the person */
    } else if (veil) {
      next.party = next.party.filter((id) => id !== "iri");
      next.reserve = (next.reserve ?? []).filter((id) => id !== "iri");
    }
  }
  if (threadId === "mira_kael") next = bumpBond(bumpBond(next, "mira"), "kael");
  if (threadId === "nessa_sera") next = bumpBond(bumpBond(next, "nessa"), "sera");
  if (threadId === "kael_nessa") next = bumpBond(bumpBond(next, "kael"), "nessa");
  if (!next.journal.includes(text)) next.journal.push(text);
  refreshQuests(next);
  return { ok: true, save: next, text };
}

export function hoursCoda(id: "mira" | "kael" | "nessa", save: SaveGame): string {
  if (id === "kael" && save.flags["flag.oath_done"]) {
    return save.flags["flag.oath_held"]
      ? " The second order is written. The words stayed. Pell's first walk is still the one we chose."
      : " The second order is written. The person stayed inside the promise. Pell's first walk is still the one we chose.";
  }
  if (id === "nessa" && save.flags["flag.spring_done"]) {
    return " The spring remembers both verses. The first rhyme is still the one I chose at the stone.";
  }
  if (id === "mira" && save.flags["flag.thread.mira_kael"]) {
    return " Kael's gate and my page have been in the same room. I did not sand either.";
  }
  return "";
}

export function hoursObjective(save: SaveGame): string | null {
  if (!flown(save)) return null;
  const settled = Boolean(save.flags["flag.hour_complete"] || save.flags["flag.iri_joined"] || save.flags["flag.iri_veil"]);
  if (!settled) return null;
  if (seated(save, "kael") && kaelChosen(save) && !save.flags["flag.oath_done"]) {
    if (!save.flags["flag.oath_path"]) return "Kael's oath is out of order. On Glasspine, Pell's walk happens twice. Sight can show the prints. It will not choose.";
    if (!save.flags["flag.oath_vale"]) return "The Vale well remembers the other order of Pell's walk. Read it. Then answer. Neither answer is the cleaner oath.";
    return "Both orders of the oath are written. Answer Kael on the path or at the well. The first choice about Pell stays.";
  }
  if (seated(save, "nessa") && nessaChosen(save) && !save.flags["flag.spring_done"]) {
    if (!save.flags["flag.spring_stone"]) return "Nessa's stone is wet out of season. Look at it in the Reach. Sight shows the water. It does not pick a verse.";
    if (!save.flags["flag.spring_lowbell"] || !save.flags["flag.met_lark"]) return "Lowbell's channel runs uphill. Lark is bottling a day that has not happened. She will not press the stones.";
    if (!save.flags["flag.spring_dry"] || !save.flags["flag.spring_wet"]) return "Set the dry order from the walk and the wet order from inside the step. The buttons do not press themselves.";
    return "Both orders of the spring are set. Nessa can let the old water work, or give the channel the verse already arriving. The first rhyme stays.";
  }
  if (save.flags["flag.oath_done"] && save.flags["flag.spring_done"] && !save.flags["flag.seam_set"]) {
    return "Lowbell's spring mouth can hold the oath and the verse. Read it from the walk and from inside the step. Sight will not set it. Iri is not required.";
  }
  if (save.flags["flag.iri_veil"] && !save.flags["flag.veil_heard"]) {
    return "Iri kept the veil. The Margin still has a thread. Listening does not put her in the four.";
  }
  if (save.flags["flag.iri_joined"] && seated(save, "iri") && !save.flags["flag.veilstep_earned"]) {
    return "The Vale hearth can hear Iri, if you want her reading of an earlier hour. Veilstep stays hers.";
  }
  return null;
}

export function hoursClues(save: SaveGame): string[] {
  const clues: string[] = [];
  if (save.flags["flag.oath_path"]) clues.push(law(save) ? "Glasspine: Pell's boots go on after the turning." : "Glasspine: a later refusal is still turning Pell back.");
  if (save.flags["flag.oath_vale"]) clues.push("Vale well: the other order of the same promise.");
  if (save.flags["flag.oath_held"]) clues.push("Kael kept the words. The first choice about Pell stays.");
  if (save.flags["flag.oath_served"]) clues.push("Kael put the person inside the promise. The first choice about Pell stays.");
  if (save.flags["flag.spring_stone"]) clues.push(springFirst(save) ? "Reach stone: the old rhyme is beaded on newer water." : "Reach stone: an unfinished line is wet beside the new verse.");
  if (save.flags["flag.met_lark"]) clues.push("Lark's bottles are dated tomorrow. She did not press the channel.");
  if (save.flags["flag.spring_dry"]) clues.push("Dry order set from the walk.");
  if (save.flags["flag.spring_wet"]) clues.push("Wet order set from the other view.");
  if (save.flags["flag.spring_carry"]) clues.push("Nessa let the older water keep working.");
  if (save.flags["flag.spring_channel"]) clues.push("Nessa gave the channel to the verse already arriving.");
  if (save.flags["flag.sight_oath_woods"] || save.flags["flag.sight_spring_low"] || save.flags["flag.sight_seam"]) {
    clues.push("Sight showed a doubled hour. It did not press the promise, the channel, or the mouth.");
  }
  if (save.flags["flag.seam_legacy"]) clues.push("Spring mouth, from the walk: the oath's order.");
  if (save.flags["flag.seam_spring"]) clues.push("Spring mouth, from the other view: the verse's order.");
  if (save.flags["flag.seam_set"]) clues.push("The mouth holds both orders. It did not require every companion.");
  if (save.flags["flag.veilstep_sheathed"]) clues.push("Veilstep stays on Iri's side of the veil.");
  if (save.flags["flag.veilstep_earned"]) clues.push("Iri can walk an ally off a telegraph. The art is not a coat.");
  return clues;
}

export function companyNotes(save: SaveGame): string[] {
  return save.choiceLog.filter((c) => c.id.startsWith("thread.")).map((c) => `${c.id.replace("thread.", "").replaceAll("_", " ")}: ${c.value}`);
}
