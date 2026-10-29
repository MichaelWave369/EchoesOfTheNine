import type { QuestNode, SpoilerGate } from "../contracts.ts";

export interface MapHotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: "npc" | "exit" | "sign" | "item" | "puzzle" | "battle" | "save";
}

export interface MapDef {
  id: string;
  name: string;
  blurb: string;
  width: number;
  height: number;
  spawns: Record<string, { x: number; y: number; facing: "n" | "s" | "e" | "w" }>;
  hotspots: MapHotspot[];
  exits: { id: string; to: string; spawn: string; requires?: string }[];
}

export const MAPS: Record<string, MapDef> = {
  "map.vale": {
    id: "map.vale",
    name: "Lantern Vale",
    blurb: "A festival village under nine quiet stars. The clock has opinions.",
    width: 20,
    height: 14,
    spawns: {
      square: { x: 10, y: 8, facing: "n" },
      from_woods: { x: 18, y: 6, facing: "w" },
      inn: { x: 4, y: 10, facing: "e" },
    },
    hotspots: [
      { id: "npc.lira", x: 6, y: 6, w: 1, h: 1, label: "Lira", kind: "npc" },
      { id: "npc.child", x: 12, y: 5, w: 1, h: 1, label: "Nim", kind: "npc" },
      { id: "npc.clock", x: 10, y: 3, w: 2, h: 1, label: "The Nine-Nine Clock", kind: "sign" },
      { id: "npc.baker", x: 4, y: 7, w: 1, h: 1, label: "Oven-Aunt Pim", kind: "npc" },
      { id: "npc.mira", x: 14, y: 7, w: 1, h: 1, label: "Mira", kind: "npc" },
      { id: "item.salve", x: 7, y: 10, w: 1, h: 1, label: "Festival crate", kind: "item" },
      { id: "exit.woods", x: 19, y: 6, w: 1, h: 1, label: "East woods", kind: "exit" },
      { id: "sign.well", x: 8, y: 8, w: 1, h: 1, label: "Festival well", kind: "sign" },
    ],
    exits: [{ id: "exit.woods", to: "map.woods", spawn: "vale_gate" }],
  },
  "map.woods": {
    id: "map.woods",
    name: "Glasspine Path",
    blurb: "A familiar woodland that has started answering in the wrong tense.",
    width: 22,
    height: 12,
    spawns: {
      vale_gate: { x: 1, y: 6, facing: "e" },
      shrine_gate: { x: 20, y: 5, facing: "w" },
      after_fight: { x: 11, y: 6, facing: "e" },
    },
    hotspots: [
      { id: "npc.kael", x: 8, y: 5, w: 1, h: 1, label: "Kael", kind: "npc" },
      { id: "battle.woods", x: 12, y: 6, w: 1, h: 1, label: "Flicker in the pines", kind: "battle" },
      { id: "sign.pulse", x: 15, y: 4, w: 1, h: 1, label: "Echo pulse", kind: "sign" },
      { id: "exit.vale", x: 0, y: 6, w: 1, h: 1, label: "Back to the Vale", kind: "exit" },
      { id: "exit.shrine", x: 21, y: 5, w: 1, h: 1, label: "Crystal shrine", kind: "exit" },
    ],
    exits: [
      { id: "exit.vale", to: "map.vale", spawn: "from_woods" },
      { id: "exit.shrine", to: "map.shrine", spawn: "door", requires: "flag.woods_cleared" },
    ],
  },
  "map.shrine": {
    id: "map.shrine",
    name: "Shrine of the First Prism",
    blurb: "Nine runes, three conduits, and a guardian that has not been spoken to kindly in a long while.",
    width: 16,
    height: 14,
    spawns: {
      door: { x: 8, y: 12, facing: "n" },
      arena: { x: 8, y: 6, facing: "n" },
    },
    hotspots: [
      { id: "puzzle.runes", x: 3, y: 4, w: 2, h: 2, label: "Rune wall", kind: "puzzle" },
      { id: "puzzle.conduits", x: 11, y: 4, w: 2, h: 2, label: "Conduit ring", kind: "puzzle" },
      { id: "battle.warden", x: 8, y: 3, w: 2, h: 2, label: "Crystal Warden", kind: "battle" },
      { id: "sign.inscription", x: 8, y: 8, w: 2, h: 1, label: "Floor inscription", kind: "sign" },
      { id: "exit.woods", x: 8, y: 13, w: 1, h: 1, label: "Leave the shrine", kind: "exit" },
      { id: "save.prism", x: 2, y: 11, w: 1, h: 1, label: "Prayer niche", kind: "save" },
    ],
    exits: [{ id: "exit.woods", to: "map.woods", spawn: "shrine_gate" }],
  },
};

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices?: { label: string; next: string; flag?: string }[];
  next?: string;
  grant?: string;
}

export const DIALOGUE: Record<string, DialogueNode[]> = {
  "npc.lira": [
    {
      id: "lira.1",
      speaker: "Lira",
      text: "You came back for the ninth lantern. I was starting to think the woods had borrowed you.",
      next: "lira.2",
    },
    {
      id: "lira.2",
      speaker: "Lira",
      text: "Stay for the cakes if you can. If the clock starts telling jokes again, come find me. I don't like jokes that count.",
      grant: "flag.spoke_lira",
    },
  ],
  "npc.child": [
    {
      id: "nim.1",
      speaker: "Nim",
      text: "I drew a door. It isn't anywhere. Mama says doors have to be somewhere or they're just rectangles with ambition.",
      next: "nim.2",
    },
    {
      id: "nim.2",
      speaker: "Nim",
      text: "It was wood. Ordinary wood. I don't know why that felt important. Don't tell the clock I said so.",
      grant: "flag.saw_sketch",
    },
  ],
  "npc.clock": [
    {
      id: "clock.1",
      speaker: "The Nine-Nine Clock",
      text: "The hands rest at 9:09. They have rested there since before the baker's mother was born. Tonight, as you look, a bell strikes ten.",
      next: "clock.2",
    },
    {
      id: "clock.2",
      speaker: "You",
      text: "Ten. The face still says nine and nine. The sound is older than the village and younger than your name.",
      grant: "flag.clock_anomaly",
    },
  ],
  "npc.baker": [
    {
      id: "pim.1",
      speaker: "Oven-Aunt Pim",
      text: "Take a bun. If you leave for the pines, take two. The glowmoths have been eating the light off the path and I refuse to bake for moths.",
      grant: "flag.spoke_baker",
    },
  ],
  "npc.mira": [
    {
      id: "mira.1",
      speaker: "Mira",
      text: "The clock hasn't rung in seventeen years. I have the parish book. Seventeen. And yet.",
      choices: [
        { label: "Come with me. The woods are wrong.", next: "mira.join", flag: "flag.mira_joined" },
        { label: "What do you think it means?", next: "mira.ask" },
      ],
    },
    {
      id: "mira.ask",
      speaker: "Mira",
      text: "I think someone wrote our evening twice and smudged the second copy. I also think I am not letting you walk into a smudge alone.",
      next: "mira.join",
    },
    {
      id: "mira.join",
      speaker: "Mira",
      text: "Archivist's oath: I will remember what happens, even if the clock would rather we didn't. Lead on.",
      grant: "flag.mira_joined",
    },
  ],
  "npc.kael": [
    {
      id: "kael.1",
      speaker: "Kael",
      text: "Hold. The path oath says I turn travelers back when the pines flicker. The pines are flickering. Also, you have an archivist, which means this is already a story.",
      choices: [
        { label: "We need a guard, not a gate.", next: "kael.join" },
        { label: "Then walk with us and keep the oath honest.", next: "kael.join", flag: "flag.kael_oath" },
      ],
    },
    {
      id: "kael.join",
      speaker: "Kael",
      text: "Fine. The oath was to the people on the path, not to the idea of a path. If something in the shrine asks for blood, we discuss it first.",
      grant: "flag.kael_joined",
    },
  ],
  "sign.well": [
    {
      id: "well.1",
      speaker: "Festival well",
      text: "Coins glitter under lantern oil. Someone wished for the clock to finish a sentence. Someone else wished for more buns. Both feel reasonable.",
    },
  ],
  "sign.pulse": [
    {
      id: "pulse.1",
      speaker: "Echo pulse",
      text: "The air here is folded. For a blink you see the path as a line of pale conduits under the needles. Then it is only trees again. Something ahead is awake.",
      grant: "flag.saw_pulse",
    },
  ],
  "sign.inscription": [
    {
      id: "insc.1",
      speaker: "Floor inscription",
      text: "A name is cut into the prism floor. It is yours. The date beside it is not a date this village owns. You do not read it aloud.",
      grant: "flag.read_inscription",
    },
  ],
};

export const INITIAL_QUESTS: QuestNode[] = [
  {
    id: "quest.festival",
    title: "The ninth lantern",
    gate: "public",
    summary: "Walk the Vale. Speak with Lira, Nim, and the clock that strikes the wrong hour.",
    factsRequired: [],
    alternatives: ["Speak to the clock", "Look at Nim's sketch"],
    worldEffects: ["flag.clock_anomaly"],
    discoveryId: "disc.festival",
    status: "active",
  },
  {
    id: "quest.party",
    title: "Two who will remember",
    gate: "public",
    summary: "Mira keeps the books. Kael keeps the path. Neither should go into the pines alone, and neither should you.",
    factsRequired: ["flag.clock_anomaly"],
    alternatives: [],
    worldEffects: ["flag.mira_joined", "flag.kael_joined"],
    discoveryId: "disc.party",
    status: "hidden",
  },
  {
    id: "quest.prism",
    title: "The rune and the ring",
    gate: "public",
    summary: "Read the rune order on the shrine wall. In the other view, turn the conduits to match. The Warden listens to both.",
    factsRequired: ["flag.woods_cleared"],
    alternatives: ["Keyboard conduit turn after the rune is known"],
    worldEffects: ["flag.runes_decoded", "flag.conduits_aligned", "flag.temporal_sight"],
    discoveryId: "disc.prism_puzzle",
    status: "hidden",
  },
  {
    id: "quest.warden",
    title: "The Crystal Warden",
    gate: "public",
    summary: "Meet the guardian. Break it, or learn the seam and ask it to sleep.",
    factsRequired: ["flag.conduits_aligned"],
    alternatives: ["Defeat", "Mercy after Stoneguard and Tide"],
    worldEffects: ["flag.chapter_complete"],
    discoveryId: "disc.warden",
    status: "hidden",
  },
];

/** Future systems. Present in data, never offered on the public critical path. */
export const FUTURE_CONTENT: {
  id: string;
  gate: SpoilerGate;
  kind: string;
  note: string;
  playable: false;
}[] = [
  { id: "echo.flame", gate: "public", kind: "echo", note: "Surface domain: change. Public myth only.", playable: false },
  { id: "echo.tide", gate: "public", kind: "echo", note: "Surface domain: memory.", playable: false },
  { id: "echo.stone", gate: "public", kind: "echo", note: "Surface domain: form.", playable: false },
  { id: "echo.wind", gate: "public", kind: "echo", note: "Surface domain: motion.", playable: false },
  { id: "echo.life", gate: "public", kind: "echo", note: "Surface domain: care.", playable: false },
  { id: "echo.shadow", gate: "public", kind: "echo", note: "Surface domain: ambiguity.", playable: false },
  { id: "echo.time", gate: "midgame", kind: "echo", note: "Surface domain: causality.", playable: false },
  { id: "echo.mind", gate: "midgame", kind: "echo", note: "Surface domain: relation.", playable: false },
  { id: "echo.origin", gate: "future-reveal", kind: "echo", note: "Held for a later act.", playable: false },
  { id: "echo.tenth", gate: "door-reveal", kind: "echo", note: "Not a crystal. Not shown in chapter one UI.", playable: false },
  { id: "anchor.festival", gate: "post-door", kind: "return-anchor", note: "Earliest branch. Scaffold only.", playable: false },
  { id: "anchor.warden", gate: "post-door", kind: "return-anchor", note: "Mercy can be revisited later. Not this build.", playable: false },
  { id: "aspect.chronicle", gate: "post-door", kind: "aspect", note: "Hub concept.", playable: false },
  { id: "aspect.loom", gate: "post-door", kind: "aspect", note: "Hub concept.", playable: false },
  { id: "aspect.hearth", gate: "post-door", kind: "aspect", note: "Hub concept.", playable: false },
  { id: "aspect.threshold", gate: "post-door", kind: "aspect", note: "Hub concept.", playable: false },
  { id: "aspect.constellation", gate: "post-door", kind: "aspect", note: "Hub concept.", playable: false },
  { id: "ending.preservation", gate: "post-door", kind: "ending", note: "Not selectable in this chapter.", playable: false },
  { id: "ending.awakening", gate: "post-door", kind: "ending", note: "Not selectable in this chapter.", playable: false },
  { id: "ending.convergence", gate: "post-door", kind: "ending", note: "Not selectable in this chapter.", playable: false },
  { id: "ending.creation", gate: "post-door", kind: "ending", note: "Not selectable in this chapter.", playable: false },
];

export const RUNE_ANSWER = ["flame", "stone", "tide"] as const;

export const ITEMS: Record<string, { id: string; name: string; blurb: string; useAbility?: string }> = {
  "item.lantern_salve": {
    id: "item.lantern_salve",
    name: "Lantern Salve",
    blurb: "Festival honey and glowmoss. Restores a solid measure of HP.",
    useAbility: "item.lantern_salve",
  },
  "item.dew_vial": {
    id: "item.dew_vial",
    name: "Dew Vial",
    blurb: "Shrine-spring water. Restores 18 MP.",
    useAbility: "item.dew_vial",
  },
  "item.warden_shard": {
    id: "item.warden_shard",
    name: "Sleeping Shard",
    blurb: "Warm, and not quite finished being a weapon. A pact, not a trophy.",
  },
  "item.warden_core": {
    id: "item.warden_core",
    name: "Dim Core",
    blurb: "The Warden's heart, quiet now. The shrine feels smaller.",
  },
};

export const PUBLIC_STRING_BAN = [
  "pleroma",
  "custodian",
  "clone",
  "white room",
  "year 12,486",
  "12486",
  "the tenth echo",
  "great return",
];
