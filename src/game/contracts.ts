export const SCHEMA_VERSION = 1 as const;

export type SpoilerGate =
  | "public"
  | "midgame"
  | "future-reveal"
  | "clone-reveal"
  | "door-reveal"
  | "post-door";

export type Element = "flame" | "tide" | "stone" | "wind" | "life" | "shadow" | "neutral";
export type CombatMode = "legacy" | "ascension";

export interface CombatAction {
  version: 1;
  actorId: string;
  abilityId: string;
  kind: "attack" | "cast" | "defend" | "item" | "dodge" | "switch" | "interact" | "wait";
  targetIds: string[];
  modeOrigin: CombatMode;
  timeOrTurn: number;
  aimEvidence?: { x: number; y: number; confidence: number };
}

export interface SaveGame {
  version: 1;
  schema: typeof SCHEMA_VERSION;
  playerName: string;
  mapId: string;
  flags: Record<string, boolean | string | number>;
}
