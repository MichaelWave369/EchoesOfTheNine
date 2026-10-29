import type { SaveGame } from "../contracts.ts";

export type WardenMemory = "none" | "spared" | "defeated";

export function wardenMemory(save: Pick<SaveGame, "wardenOutcome" | "flags">): WardenMemory {
  if (save.wardenOutcome === "spared" || save.flags["flag.warden_spared"]) return "spared";
  if (save.wardenOutcome === "defeated" || save.flags["flag.warden_defeated"]) return "defeated";
  return "none";
}

/** Companion lines keep the Warden's fate even after the bond deepens. */
export function companionAside(
  id: "mira" | "kael" | "nessa",
  bond: number,
  outcome: WardenMemory,
  flags: Record<string, boolean | string | number> = {},
): string {
  const close = bond >= 2;
  if (id === "mira") {
    if (outcome === "spared") {
      return close
        ? "The pact is still in the margin. A closer bond does not move it to the victory column. I like the margin. It has room."
        : "The pact is in the margin, not the victory column. I like the margin. It has room.";
    }
    if (outcome === "defeated") {
      return close
        ? "I still have the blank line where a name might have gone. Knowing you better does not fill it in. I am not angry. I am keeping the line."
        : "I left a blank line where a name might have gone. I am not angry. I am keeping the line.";
    }
    return close
      ? "I keep a blank page for the date on the floor. I will not guess it. If you ever read it, tell me only whether we were kind."
      : "I'm with you. If the shrine starts editing our names, I want it in the book.";
  }
  if (id === "kael") {
    if (outcome === "spared") {
      return close
        ? "You asked the guardian to sleep, and that oath did not expire when we started trusting each other. I can still walk beside it."
        : "You asked it to sleep. That is an oath I can keep walking beside.";
    }
    if (outcome === "defeated") {
      return close
        ? "The guardian is finished. Friendship does not rename that into glory. I will still discuss blood before anyone spends it."
        : "It is done. I will not call it glory. I will call it finished, and I will still discuss blood before anyone spends it.";
    }
    return close
      ? "The oath was to the living on the path. If a song asks me to choose it over a person, I already know which way the sword points. Away."
      : "Still here. If it asks for blood, we discuss it. That part did not expire.";
  }
  if (outcome === "spared") {
    return close
      ? "You stopped once, at the prism. The Reach still prefers that. Stay the sort of person who can stop."
      : "Your archivist writes pacts. Good. The Reach prefers people who can stop.";
  }
  if (outcome === "defeated") {
    return close
      ? "You ended a guardian before we met. I have not forgotten, and I will not preach. Don't end the next song only because your hands are already warm."
      : "You ended a guardian. I will not preach. Just don't end the next song only because your hands are already warm.";
  }
  return close
    ? "My mother said the moss used to rhyme with spring. It doesn't. I want the new verse, not a sermon about why the wood feels early."
    : "The thicket bites if you walk through it like a tourist. Wind cuts it cleaner than pride.";
}

export function choiceCoda(id: "mira" | "kael" | "nessa", flags: Record<string, boolean | string | number>): string {
  const bits: string[] = [];
  if (id === "mira" && flags["flag.mira_record"]) bits.push("The tenth strike is in the book. I will not sand it out.");
  if (id === "mira" && flags["flag.mira_blank"]) bits.push("The page is blank on purpose. That was a kindness, not a story I am proud of telling halfway.");
  if (id === "kael" && flags["flag.kael_law"]) bits.push("Pell walks toward the square. The gate held. I hope the children still have light.");
  if (id === "kael" && flags["flag.kael_people"]) bits.push("Pell finished the walk. The oath bent. I can live with the bend.");
  if (id === "nessa" && flags["flag.nessa_spring"]) bits.push("I taught the moss my mother's spring. It did not thank me. I still wanted her rhyme somewhere in the world.");
  if (id === "nessa" && flags["flag.nessa_verse"]) bits.push("The new verse stands. My mother can keep spring. The Reach is allowed to be early.");
  if (id === "nessa" && flags["flag.cantor_spared"]) bits.push("The Cantor is still in the vine, not on a shelf.");
  if (id === "nessa" && flags["flag.cantor_defeated"]) bits.push("The Cantor is quiet. I keep checking that the quiet is not a breath.");
  return bits.length ? ` ${bits.join(" ")}` : "";
}

export function reachClose(playerName: string, outcome: WardenMemory, cantorSpared: boolean): string {
  const warden =
    outcome === "spared"
      ? "The Warden is still sleeping under the pact you made. That choice walked here with you."
      : outcome === "defeated"
        ? "The Warden is still fallen. The Reach does not undo the shrine, and it does not pretend the square forgot."
        : "The shrine's choice is still unwritten, which is its own kind of weight.";
  const cantor = cantorSpared
    ? `${playerName}, the Cantor lets the vine go. Nessa ties the leftover note into a loop and does not call it a trophy.`
    : `${playerName}, the barrow goes quiet. Nessa does not congratulate you. She listens, once, to be sure the thicket is not learning the ending by heart.`;
  return `${cantor} ${warden}`;
}
