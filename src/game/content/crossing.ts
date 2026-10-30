import type { CombatAction, EncounterState, SaveGame } from "../contracts.ts";
import { ability } from "./abilities.ts";
import { refreshQuests, setFlag } from "../chronicle/save.ts";

/**
 * Mistwater Crossing. Optional after the split bell.
 * Nothing here names the late chronicle. Sight clues do not press puzzle buttons.
 */

export const HOLD_OLD = ["flame", "tide", "stone"] as const;
export const HOLD_SEAL = ["stone", "stone", "flame"] as const;

export const JOB_SPELLS: Record<string, { base: string[]; earned: string[] }> = {
  "job.wanderer": { base: ["spell.ember"], earned: ["spell.solar", "atk.sky_lance", "spell.dragoon_leap", "spell.falling_star"] },
  "job.elementalist": { base: ["spell.ember", "spell.flare"], earned: ["spell.solar", "atk.sky_lance", "spell.dragoon_leap", "spell.falling_star"] },
  "job.riverward": { base: ["spell.stillwater", "spell.echo_lash"], earned: ["spell.double_wake", "atk.sky_lance", "spell.dragoon_leap", "spell.falling_star"] },
};

export const SAFE_JOB_MAPS = ["map.inn", "map.smith", "map.ferry", "map.highroad", "map.ridge", "map.berth", "map.deck", "map.cinder"] as const;

export const MIST_SHOP = ["armor.mist_cloak", "item.lantern_salve", "item.dew_vial"] as const;

const SIGHT_STEPS = 8;

export const CROSSING_COPY = {
  hale: "Hale Reed taps a stamp that says nine. The last ferry left at nine. I watched it. The tea woman is wrong, and the river is not a debate.",
  haleSpared: "You asked a guardian to sleep. The river prefers people who can stop. If the ferryman under the hold is still boarding, you may ask him which hour he is.",
  haleFell: "You ended a guardian. The river does not clap. If the old plate will not turn, the scorched seal on the hold answers stone, stone, flame. That path opened because the prism fell.",
  haleRecord: "Your archivist writes what happened. This window happened twice. I will not sand either stamp to make the dock comfortable.",
  haleBlank: "She left a page blank to be kind. Kindness will not mend a timetable. Look at the glass, or hear us both.",
  haleLaw: "The gate held for Pell. Then hear the clerk's copy: the rust is a liar. The older cut is flame, then tide, then stone.",
  halePeople: "You let Pell finish the walk. A rope-man told me the same order, drunk and sorry: flame, then tide, then stone. I was not supposed to repeat it.",
  haleCantorSoft: "A song was let go, I hear. The mist is less interested in throats today.",
  haleCantorHard: "The barrow went quiet. The mist has been practicing that quiet. Do not feed it a second ending it did not earn.",
  tamsin: "Tamsin Coil pours something that is mostly steam. The last ferry left at ten. Hale's nine is a story he tells so the dock can sleep. I sell cloaks. I do not sell agreement.",
  tamsinSpared: "A pact walked in with you. The mist keeps those. It does not keep a single hour.",
  tamsinFell: "Something fell upstream of us. The water went warm for a minute and pretended it hadn't.",
  tamsinVerse: "Nessa let a new verse stand. The timetable is doing something ruder than moss. It is telling two truths.",
  tamsinSpring: "She taught the moss an old spring. The river will not take an old hour just because it was loved.",
  twice: "Both stamps are warm. The ferry left at nine and at ten. The contradiction is recorded. It is not explained.",
  twiceAlready: "The two departures are already in the book. The dock is still arguing.",
  twiceNeed: "One story is not a contradiction. Hear Hale and Tamsin, or look twice at the window and then record it yourself.",
  timetableBlind: "The window shows a departure. The ink will not sit still, and then it does. You do not have both hours yet.",
  timetableSeen: "For as long as the other hour holds, two stamps share the glass. Nine. Ten. Neither crosses the other out.",
  pierEmpty: "The old pier is empty. Aggressively empty.",
  pierTake: "A crate that was not here a minute ago gives up a shard of river glass. It remembers a place. It does not say which hour.",
  pierGone: "Splinters. The glass is already in your pocket.",
  holdNeed: "The rust says nothing useful. The older cut is flame, tide, stone. If the prism fell, the seal will also take stone, stone, flame.",
  holdOld: "The plate takes the older cut. The inner door decides to be a door. A quieter trade waits in your hands when you are somewhere safe: Riverward.",
  holdSeal: "The scorched seal drinks the order. This door opened because a guardian fell. The older cut would have opened it too.",
  holdShut: "The plate stays rust. That order is not the one it is keeping.",
  faded: "A chalk shadow on the stone. Flame. Something wet. Stone. The middle word is worn through. Sight, or the dock, can finish it. The plate will not turn itself.",
  nedda: "Nedda keeps the station kettle. Eight gold. A bed, and enough quiet to change a trade if the road has offered you one.",
  wren: "Wren stands where the mist thins. The high road is a gate, not a country. I will not invent what is above the weather.",
  wrenTwice: "You recorded two departures. I have stood on this stair and watched a shadow arrive before the boots. I will not tell you which departure it belongs to.",
  wrenSpared: "You know how to ask a thing to stop. The stair does not need stopping. It needs not being named too early.",
  wakeLearned: "Echo Lash repeats until the second wave is the spell. Double Wake. It remembers the crossing. It does not explain it.",
  wakeNeed: "Double Wake wants Echo Lash practiced twice, and the crossing finished. The river does not tutor strangers.",
  wakeAlready: "Double Wake is already yours.",
  sightFerry:
    "Reflections on the water finish a step the people have not taken. The timetable glass holds two stamps at once: nine, and ten. A crate sits on the old pier the dock swears is empty. Nothing presses itself.",
  sightHold:
    "A little earlier, the lock plate is not this rust. The older order is cut faint: flame, tide, stone. The plate does not turn while you look.",
  sightStair:
    "On the stair, a shadow arrives before the boots. It climbs an extra step that the stone does not have yet. The hour feels rehearsed, and unfinished.",
  sightLowbell:
    "The clapper's shadow finishes a strike the bronze never starts. For a blink a second bell hangs on an empty rope. The hour feels rehearsed, and unfinished.",
  jobLocked: "That trade is not open.",
  jobFight: "Not while a fight is open. A trade does not refresh a breath or a cooldown.",
  jobPlace: "The trade will only change where the road is quiet: the Wick, Bram's stall, the station, or the high gate.",
  jobSame: "You are already keeping that trade.",
  jobRiver: "The river has not offered that trade. Open the hold's plate first.",
  jobFlame: "The conduits have not left the Elementalist's trade in your hands.",
  jobDone: "The trade changes. Your breath, your purse, and your pack do not.",
} as const;

function wardenSpared(save: SaveGame): boolean {
  return save.wardenOutcome === "spared" || Boolean(save.flags["flag.warden_spared"]);
}

function wardenFell(save: SaveGame): boolean {
  return save.wardenOutcome === "defeated" || Boolean(save.flags["flag.warden_defeated"]);
}

export function spellsForJob(jobId: string, earned: string[]): string[] {
  const row = JOB_SPELLS[jobId];
  if (!row) return ["spell.ember"];
  const out = [...row.base];
  for (const id of row.earned) if (earned.includes(id)) out.push(id);
  return out;
}

export function grantEarned(save: SaveGame, spellId: string): SaveGame {
  const next = structuredClone(save);
  const earned = [...(next.earnedSpells ?? [])];
  if (!earned.includes(spellId)) earned.push(spellId);
  next.earnedSpells = earned;
  const job = next.roster.wanderer?.jobId ?? "job.wanderer";
  next.knownSpells.wanderer = spellsForJob(job, earned);
  return next;
}

export function switchJob(
  save: SaveGame,
  jobId: string,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.encounter) return { ok: false, reason: CROSSING_COPY.jobFight };
  if (!SAFE_JOB_MAPS.includes(save.mapId as (typeof SAFE_JOB_MAPS)[number])) {
    return { ok: false, reason: CROSSING_COPY.jobPlace };
  }
  if (jobId === "job.dragoon" || jobId === "job.healer" || jobId === "job.chronomancer" || jobId === "job.skywright") {
    return { ok: false, reason: CROSSING_COPY.jobLocked };
  }
  if (jobId !== "job.wanderer" && jobId !== "job.elementalist" && jobId !== "job.riverward") {
    return { ok: false, reason: CROSSING_COPY.jobLocked };
  }
  if (jobId === "job.elementalist" && !save.jobsUnlocked.includes("job.elementalist")) {
    return { ok: false, reason: CROSSING_COPY.jobFlame };
  }
  if (jobId === "job.riverward" && !save.jobsUnlocked.includes("job.riverward")) {
    return { ok: false, reason: CROSSING_COPY.jobRiver };
  }
  if (save.roster.wanderer?.jobId === jobId) return { ok: false, reason: CROSSING_COPY.jobSame };
  const next = structuredClone(save);
  const hero = next.roster.wanderer;
  if (!hero) return { ok: false, reason: CROSSING_COPY.jobLocked };
  hero.jobId = jobId;
  next.knownSpells.wanderer = spellsForJob(jobId, next.earnedSpells ?? []);
  const row = next.choiceLog.find((c) => c.id === "job.active");
  if (row) row.value = jobId;
  else next.choiceLog.push({ id: "job.active", value: jobId });
  return { ok: true, save: next, text: CROSSING_COPY.jobDone };
}

function give(save: SaveGame, itemId: string) {
  const slot = save.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += 1;
  else save.inventory.push({ itemId, qty: 1 });
}

export function talkHale(save: SaveGame): { save: SaveGame; text: string } {
  let next = save;
  if (!save.flags["flag.spoke_hale"]) next = setFlag(next, "flag.spoke_hale");
  if (!next.flags["flag.heard_nine"]) next = setFlag(next, "flag.heard_nine");
  if (next.flags["flag.heard_ten"] && !next.flags["flag.twice_departed"]) next = setFlag(next, "flag.twice_departed");
  const bits: string[] = [CROSSING_COPY.hale];
  if (wardenSpared(save)) bits.push(CROSSING_COPY.haleSpared);
  if (wardenFell(save)) bits.push(CROSSING_COPY.haleFell);
  if (save.flags["flag.mira_record"]) bits.push(CROSSING_COPY.haleRecord);
  if (save.flags["flag.mira_blank"]) bits.push(CROSSING_COPY.haleBlank);
  if (save.flags["flag.kael_law"]) bits.push(CROSSING_COPY.haleLaw);
  if (save.flags["flag.kael_people"]) bits.push(CROSSING_COPY.halePeople);
  if (save.flags["flag.cantor_spared"]) bits.push(CROSSING_COPY.haleCantorSoft);
  if (save.flags["flag.cantor_defeated"]) bits.push(CROSSING_COPY.haleCantorHard);
  if (next.flags["flag.twice_departed"]) bits.push(CROSSING_COPY.twice);
  return { save: next, text: bits.join(" ") };
}

export function talkTamsin(save: SaveGame): { save: SaveGame; text: string } {
  let next = save;
  if (!save.flags["flag.spoke_tamsin"]) next = setFlag(next, "flag.spoke_tamsin");
  if (!next.flags["flag.heard_ten"]) next = setFlag(next, "flag.heard_ten");
  if (next.flags["flag.heard_nine"] && !next.flags["flag.twice_departed"]) next = setFlag(next, "flag.twice_departed");
  const bits: string[] = [CROSSING_COPY.tamsin];
  if (wardenSpared(save)) bits.push(CROSSING_COPY.tamsinSpared);
  if (wardenFell(save)) bits.push(CROSSING_COPY.tamsinFell);
  if (save.flags["flag.nessa_verse"]) bits.push(CROSSING_COPY.tamsinVerse);
  if (save.flags["flag.nessa_spring"]) bits.push(CROSSING_COPY.tamsinSpring);
  if (next.flags["flag.twice_departed"]) bits.push(CROSSING_COPY.twice);
  return { save: next, text: bits.join(" ") };
}

export function recordDepartures(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.flags["flag.twice_departed"]) return { ok: true, save, text: CROSSING_COPY.twiceAlready };
  const heardBoth = Boolean(save.flags["flag.heard_nine"] && save.flags["flag.heard_ten"]);
  if (!heardBoth && !save.flags["flag.sight_ferry"]) return { ok: false, reason: CROSSING_COPY.twiceNeed };
  return { ok: true, save: setFlag(save, "flag.twice_departed"), text: CROSSING_COPY.twice };
}

export function timetableText(save: SaveGame): string {
  if (save.flags["flag.twice_departed"]) return CROSSING_COPY.twiceAlready;
  if (save.flags["flag.sight_ferry"] && (save.sightScene === "sight.ferry" || save.flags["flag.sight_ferry"])) {
    return CROSSING_COPY.timetableSeen;
  }
  return CROSSING_COPY.timetableBlind;
}

export function takePierCache(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (!save.flags["flag.sight_ferry"]) return { ok: false, reason: CROSSING_COPY.pierEmpty };
  if (save.flags["flag.got_river_glass"]) return { ok: false, reason: CROSSING_COPY.pierGone };
  let next = setFlag(save, "flag.got_river_glass");
  give(next, "item.river_glass");
  return { ok: true, save: next, text: CROSSING_COPY.pierTake };
}

export function tryHold(
  save: SaveGame,
  picks: string[],
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.flags["flag.hold_open"]) return { ok: true, save, text: CROSSING_COPY.holdOld };
  const old = picks.length === 3 && picks.every((p, i) => p === HOLD_OLD[i]);
  const seal = wardenFell(save) && picks.length === 3 && picks.every((p, i) => p === HOLD_SEAL[i]);
  if (!old && !seal) return { ok: false, reason: CROSSING_COPY.holdShut };
  let next = setFlag(save, "flag.hold_open");
  if (seal) next = setFlag(next, "flag.hold_seal");
  if (!next.jobsUnlocked.includes("job.riverward")) next.jobsUnlocked.push("job.riverward");
  if (!next.journal.some((line) => line.includes("Riverward"))) {
    next.journal.push("The hold's plate opened. Riverward is a trade you can take somewhere quiet.");
  }
  return { ok: true, save: next, text: seal ? CROSSING_COPY.holdSeal : CROSSING_COPY.holdOld };
}

export function beginSight(save: SaveGame): { save: SaveGame; text: string } | null {
  const map = save.mapId;
  const scene =
    map === "map.ferry"
      ? { id: "sight.ferry", flag: "flag.sight_ferry", text: CROSSING_COPY.sightFerry }
      : map === "map.hold"
        ? { id: "sight.hold", flag: "flag.sight_hold", text: CROSSING_COPY.sightHold }
        : map === "map.highroad"
          ? { id: "sight.stair", flag: "flag.sight_stair", text: CROSSING_COPY.sightStair }
          : map === "map.lowbell"
            ? { id: "sight.lowbell", flag: "flag.sight_lowbell", text: CROSSING_COPY.sightLowbell }
            : null;
  if (!scene) return null;
  const next = structuredClone(save);
  next.sightScene = scene.id;
  next.sightSteps = SIGHT_STEPS;
  if (!next.flags[scene.flag]) {
    next.flags[scene.flag] = true;
    if (!next.discoveries.includes(scene.flag)) next.discoveries.push(scene.flag);
    if (!next.journal.includes(scene.text)) next.journal.push(scene.text);
  }
  if (scene.id === "sight.lowbell") {
    if (!next.choiceLog.some((c) => c.id === "sight.lowbell")) {
      next.choiceLog.push({ id: "sight.lowbell", value: "unfinished-hour" });
    }
    if (!next.discoveries.includes("disc.unfinished_hour")) next.discoveries.push("disc.unfinished_hour");
  }
  if (scene.id === "sight.ferry" && !next.discoveries.includes("disc.twice_stamp")) {
    next.discoveries.push("disc.twice_stamp");
  }
  if (scene.id === "sight.stair" && !next.choiceLog.some((c) => c.id === "sight.stair")) {
    next.choiceLog.push({ id: "sight.stair", value: "early-step" });
  }
  refreshQuests(next);
  return { save: next, text: scene.text };
}

export function tickSight(save: SaveGame): SaveGame {
  if (!save.sightScene || save.sightSteps <= 0) return save;
  const next = structuredClone(save);
  next.sightSteps -= 1;
  if (next.sightSteps <= 0) {
    next.sightScene = null;
    next.sightSteps = 0;
    const line = "The other hour fades. What you saw stays in the journal.";
    if (!next.journal.includes(line)) next.journal.push(line);
  }
  return next;
}

export function dismissSight(save: SaveGame): SaveGame {
  if (!save.sightScene && save.sightSteps <= 0) return save;
  const next = structuredClone(save);
  next.sightScene = null;
  next.sightSteps = 0;
  return next;
}

export function tryLearnWake(
  save: SaveGame,
): { ok: true; save: SaveGame; text: string } | { ok: false; reason: string } {
  if (save.earnedSpells?.includes("spell.double_wake") || save.knownSpells.wanderer?.includes("spell.double_wake")) {
    return { ok: false, reason: CROSSING_COPY.wakeAlready };
  }
  const casts = save.spellMastery["spell.echo_lash"] ?? 0;
  if (casts < 2 || !save.flags["flag.ferry_complete"]) return { ok: false, reason: CROSSING_COPY.wakeNeed };
  let next = grantEarned(save, "spell.double_wake");
  if (!next.choiceLog.some((c) => c.id === "spell.double_wake")) {
    next.choiceLog.push({ id: "spell.double_wake", value: save.flags["flag.twice_departed"] ? "two-hours" : "crossing" });
  }
  if (!next.journal.includes(CROSSING_COPY.wakeLearned)) next.journal.push(CROSSING_COPY.wakeLearned);
  if (!next.discoveries.includes("spell.double_wake")) next.discoveries.push("spell.double_wake");
  return { ok: true, save: next, text: CROSSING_COPY.wakeLearned };
}

export function talkWren(save: SaveGame): { save: SaveGame; text: string } {
  let next = save.flags["flag.spoke_wren"] ? save : setFlag(save, "flag.spoke_wren");
  const learned = tryLearnWake(next);
  if (learned.ok) next = learned.save;
  const bits: string[] = [CROSSING_COPY.wren];
  if (save.flags["flag.twice_departed"]) bits.push(CROSSING_COPY.wrenTwice);
  if (wardenSpared(save)) bits.push(CROSSING_COPY.wrenSpared);
  if (learned.ok) bits.push(learned.text);
  else if ((save.spellMastery["spell.echo_lash"] ?? 0) > 0 && !save.earnedSpells?.includes("spell.double_wake")) {
    bits.push(CROSSING_COPY.wakeNeed);
  }
  return { save: next, text: bits.join(" ") };
}

export function crossingCoda(id: "mira" | "kael" | "nessa", flags: Record<string, boolean | string | number>): string {
  const bits: string[] = [];
  if (!flags["flag.spoke_hale"] && !flags["flag.twice_departed"] && !flags["flag.ferry_complete"]) return "";
  if (id === "mira" && flags["flag.twice_departed"]) {
    bits.push(
      flags["flag.mira_blank"]
        ? "Two departures. The blank page was a kindness. This window does not want one. I will keep both."
        : "Two departures. I will not pick a kinder stamp.",
    );
  }
  if (id === "kael" && flags["flag.ferry_complete"]) {
    bits.push(
      flags["flag.kael_law"]
        ? "The clerk's word held, and so did the hold. I can live with an older cut."
        : "Pell finished a walk. This river will finish whichever hour it is keeping. I am still watching which one it loves.",
    );
  }
  if (id === "nessa" && flags["flag.spoke_tamsin"]) {
    bits.push(
      flags["flag.nessa_spring"]
        ? "I taught an old rhyme once. The mist is not moss. I will not make it pretend to be spring."
        : "A new verse stood in the Reach. The timetable is doing something ruder.",
    );
  }
  return bits.length ? ` ${bits.join(" ")}` : "";
}

export function elementNote(resist: number): string {
  if (resist <= -0.15) return " It bites.";
  if (resist >= 0.2) return " It slides off.";
  return "";
}

/** A suggestion only. The core still has to accept the action. */
export function companionInstinct(
  enc: EncounterState,
  actorId: string,
): { abilityId: string; kind: CombatAction["kind"]; targetIds: string[]; text: string } | null {
  const actor = enc.combatants.find((c) => c.id === actorId && c.side === "party" && c.alive);
  if (!actor || actor.id === "wanderer") return null;
  const known = new Set(actor.knownAbilities ?? []);
  const foes = enc.combatants.filter((c) => c.side === "enemy" && c.alive);
  const allies = enc.combatants.filter((c) => c.side === "party" && c.alive);
  if (!foes.length) return null;
  const wind = enc.intents[0];
  const aoe = wind && ability(wind.abilityId).targeting === "all_enemies";
  if (actor.id === "iri" && known.has("spell.veilstep")) {
    const ward = aoe ? (allies.find((a) => a.id !== actor.id) ?? actor) : allies.find((a) => !a.statuses.some((s) => s.id === "evading"));
    if (aoe && ward) {
      return { abilityId: "spell.veilstep", kind: "cast", targetIds: [ward.id], text: `${actor.name} would walk ${ward.name} off the line` };
    }
  }
  if (actor.id === "kael" && known.has("spell.namedguard")) {
    const hurt = [...allies].filter((a) => a.id !== actor.id).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt && hurt.hp / hurt.maxHp < 0.75) {
      const nessa = hurt.id === "nessa" ? " inside the oath" : "";
      return { abilityId: "spell.namedguard", kind: "cast", targetIds: [hurt.id], text: `${actor.name} would put ${hurt.name}${nessa} behind the gate` };
    }
  }
  if (actor.id === "kael" && known.has("spell.oathgate") && aoe) {
    return { abilityId: "spell.oathgate", kind: "cast", targetIds: [actor.id], text: `${actor.name} would keep the words and brace` };
  }
  if (actor.id === "nessa" && known.has("spell.springmemory")) {
    const hurt = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt && hurt.hp / hurt.maxHp < 0.6) {
      const who = hurt.id === "kael" ? "Kael" : hurt.name;
      return { abilityId: "spell.springmemory", kind: "cast", targetIds: [hurt.id], text: `${actor.name} would let the spring remember ${who}` };
    }
  }
  if (aoe && known.has("act.defend")) {
    return { abilityId: "act.defend", kind: "defend", targetIds: [actor.id], text: `${actor.name} would brace the whole note` };
  }
  const lowest = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const healId = known.has("spell.memory_tide") ? "spell.memory_tide" : known.has("spell.mend") ? "spell.mend" : null;
  if (healId && lowest && lowest.hp / lowest.maxHp < 0.45) {
    return { abilityId: healId, kind: "cast", targetIds: [lowest.id], text: `${actor.name} would mend ${lowest.name}` };
  }
  const spells = [...known].filter((id) => {
    try {
      const a = ability(id);
      return a.kind === "spell" && a.targeting === "one_enemy" && a.effects.some((e) => e.kind === "elemental_damage");
    } catch {
      return false;
    }
  });
  let best: { id: string; foeId: string; resist: number } | null = null;
  for (const foe of foes) {
    for (const id of spells) {
      const element = ability(id).effects.find((e) => e.element)?.element;
      if (!element) continue;
      const resist = foe.resistances[element] ?? 0;
      if (resist < (best?.resist ?? 0)) best = { id, foeId: foe.id, resist };
    }
  }
  if (best && best.resist < 0) {
    return {
      abilityId: best.id,
      kind: "cast",
      targetIds: [best.foeId],
      text: `${actor.name} would answer the weakness`,
    };
  }
  const strike = known.has("atk.oathcut") ? "atk.oathcut" : known.has("spell.shear") ? "spell.shear" : "atk.strike";
  const foe = [...foes].sort((a, b) => a.hp - b.hp)[0]!;
  const kind = strike.startsWith("spell.") ? "cast" : "attack";
  return { abilityId: strike, kind, targetIds: [foe.id], text: `${actor.name} would press ${foe.name}` };
}
