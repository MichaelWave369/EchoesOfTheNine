/**
 * Versioned data contracts for Echoes of the Nine.
 * Public-facing types carry no late-game names in their field labels.
 * Spoiler-gated payloads live behind `gate` and are never rendered in public UI.
 */

export const SCHEMA_VERSION = 3 as const;

export interface ChoiceRecord {
  id: string;
  value: string;
}

export interface EquipLoadout {
  weapon?: string;
  armor?: string;
  accessory?: string;
}

export type SpoilerGate =
  | "public"
  | "midgame"
  | "future-reveal"
  | "clone-reveal"
  | "door-reveal"
  | "post-door";

export type Element = "flame" | "tide" | "stone" | "wind" | "life" | "shadow" | "neutral";

export type CombatMode = "legacy" | "ascension";

export type AbilityTargeting = "one_enemy" | "all_enemies" | "one_ally" | "self" | "none";

export type AbilityKind = "attack" | "spell" | "defend" | "item" | "dodge" | "interact";

export interface AbilityEffect {
  kind: "elemental_damage" | "heal" | "status" | "guard" | "expose" | "interrupt";
  power?: number;
  element?: Element;
  statusId?: string;
  duration?: number;
  potency?: number;
}

export interface Ability {
  id: string;
  version: 1;
  name: string;
  kind: AbilityKind;
  school: Element;
  cost: { mp: number; cooldownTicks: number };
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
  gate: SpoilerGate;
  blurb: string;
}

export type ActionKind =
  | "attack"
  | "cast"
  | "defend"
  | "item"
  | "dodge"
  | "switch"
  | "interact"
  | "wait";

export interface CombatAction {
  version: 1;
  actorId: string;
  abilityId: string;
  kind: ActionKind;
  targetIds: string[];
  modeOrigin: CombatMode;
  timeOrTurn: number;
  /** Optional and untrusted. Core ignores it for damage. */
  aimEvidence?: { x: number; y: number; confidence: number };
}

export type StatusId = "guard" | "exposed" | "stoneguard" | "tideveil" | "stun" | "evading";

export interface StatusInstance {
  id: StatusId;
  remaining: number;
  potency: number;
}

export interface CombatantState {
  id: string;
  name: string;
  side: "party" | "enemy";
  jobId: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  resistances: Partial<Record<Element, number>>;
  statuses: StatusInstance[];
  cooldowns: Record<string, number>;
  initiativeDebt: number;
  alive: boolean;
  /** Ascension position in arena space. Deterministic, not a renderer object. */
  position: { x: number; z: number };
  phase?: number;
  mercyEligible?: boolean;
  /** Ranks copied in at encounter start. The core may read these. UI may not invent them mid-hit. */
  spellRanks?: Record<string, number>;
  /** Arts this ally may actually call. Copied at battle start. The core rejects anything else. */
  knownAbilities?: string[];
}

export interface Intent {
  actorId: string;
  abilityId: string;
  targetIds: string[];
  telegraph: string;
  committed: boolean;
}

export interface RewardGrant {
  id: string;
  gold: number;
  xp: number;
  items: { itemId: string; qty: number }[];
  flags: string[];
  unique: boolean;
}

export interface EncounterState {
  version: 1;
  encounterId: string;
  seed: number;
  rngState: number;
  mode: CombatMode;
  tick: number;
  phase: "player" | "enemy" | "resolve" | "victory" | "defeat" | "mercy" | "switch_lock";
  turnIndex: number;
  activeActorId: string | null;
  queue: string[];
  combatants: CombatantState[];
  intents: Intent[];
  log: string[];
  rewardsGranted: string[];
  pendingReward: RewardGrant | null;
  switchLock: number;
  switchUnlocked: boolean;
  outcome: "ongoing" | "victory" | "defeat" | "mercy";
  events: CombatEvent[];
  /**
   * Item counts bound for this resolution. Item actions fail closed when absent
   * and decrement here when they resolve. Not a second inventory.
   */
  pack?: Record<string, number>;
}

export interface CombatEvent {
  tick: number;
  kind: string;
  text: string;
  actorId?: string;
  targetId?: string;
  amount?: number;
  abilityId?: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  jobId: string;
  voice: string;
  gate: SpoilerGate;
  base: {
    maxHp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  abilities: string[];
  portraitHue: number;
}

export interface WorldFlag {
  id: string;
  value: boolean | string | number;
  gate: SpoilerGate;
}

export interface QuestNode {
  id: string;
  title: string;
  gate: SpoilerGate;
  summary: string;
  factsRequired: string[];
  alternatives: string[];
  worldEffects: string[];
  discoveryId: string;
  status: "hidden" | "active" | "complete";
}

export interface ChronicleBranch {
  id: string;
  parentId: string | null;
  label: string;
  gate: SpoilerGate;
  createdAtTick: number;
  flags: Record<string, boolean | string | number>;
}

export interface ReturnAnchor {
  id: string;
  sceneId: string;
  gate: SpoilerGate;
  inheritedFlags: string[];
  narrativeVariation: string;
  /** Scaffold only — not a playable return in this slice. */
  playable: false;
}

export interface PleromaAspect {
  id: string;
  name: string;
  gate: "post-door";
  blurb: string;
  playable: false;
}

export interface InventorySlot {
  itemId: string;
  qty: number;
}

export interface SaveGame {
  version: 1;
  schema: typeof SCHEMA_VERSION;
  savedAt: string;
  slot: "auto" | "manual";
  playerName: string;
  mapId: string;
  spawnId: string;
  mode: CombatMode;
  ascensionUnlocked: boolean;
  party: string[];
  roster: Record<string, CombatantState>;
  inventory: InventorySlot[];
  gold: number;
  xp: number;
  flags: Record<string, boolean | string | number>;
  quests: QuestNode[];
  journal: string[];
  chronicle: ChronicleBranch[];
  settings: AccessibilitySettings;
  encounter: EncounterState | null;
  chapterComplete: boolean;
  wardenOutcome: "none" | "defeated" | "spared";
  runeOrder: string[];
  conduitsAligned: boolean;
  equipment: Record<string, EquipLoadout>;
  bonds: Record<string, number>;
  spellMastery: Record<string, number>;
  sightCharges: number;
  knownSpells: Record<string, string[]>;
  jobsUnlocked: string[];
  discoveries: string[];
  choiceLog: ChoiceRecord[];
  /** Spells the wanderer has earned. Job changes consult this. They do not delete it. */
  earnedSpells: string[];
  /** Active temporal overlay, if the other hour is still up. Not a renderer object. */
  sightScene: string | null;
  /** Steps left before the overlay fades. The clue remains in the journal. */
  sightSteps: number;
  /** Future-only. Never render this list or its name in chapter UI. */
  echoMemory: string[];
  /** Future-only counter. Never label it in public UI. */
  gnosis: number;
}

export interface AccessibilitySettings {
  textScale: "sm" | "md" | "lg";
  captions: boolean;
  muted: boolean;
  masterVolume: number;
  reducedMotion: boolean;
  highContrast: boolean;
  cameraComfort: "gentle" | "standard";
  buttonOnly: boolean;
  showHelp: boolean;
}

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  textScale: "md",
  captions: true,
  muted: false,
  masterVolume: 0.7,
  reducedMotion: false,
  highContrast: false,
  cameraComfort: "gentle",
  buttonOnly: false,
  showHelp: true,
};
