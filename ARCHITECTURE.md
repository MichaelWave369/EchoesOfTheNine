# Architecture

One authoritative rules core. Two views. Renderers do not invent damage.

```
proposeAction → validate → resolveDeterministically → emitEvents → render
```

## Modules

| Path | Role |
|---|---|
| `src/game/contracts.ts` | Versioned types: Ability, CombatAction, EncounterState, QuestNode, WorldFlag, Character, ChronicleBranch, ReturnAnchor, PleromaAspect, SaveGame. Spoiler gates included. |
| `src/game/core/combat.ts` | Turn queue, validation, damage, statuses, mercy, mode switch, unique rewards, seeded RNG. |
| `src/game/core/formulas.ts` | The shared damage formula. Deterministic floor. |
| `src/game/core/rng.ts` | Mulberry32 step function. State is a number on the encounter, not a closure. |
| `src/game/core/playthrough.ts` | Scripted button-only chapter used by tests. |
| `src/game/content/` | Abilities, companions, enemies, maps, dialogue, future-gated content that is not playable. |
| `src/game/chronicle/save.ts` | Save schema v1, flags, quest refresh, import/export, idempotent rewards. `localStorage` only. |
| `src/game/ui/GameApp.tsx` | Title, exploration, Legacy menu, Ascension arena, ending, settings. |
| `src/game/audio.ts` | Procedural Web Audio. Unlocks on the first gesture. |
| `src/game/xr/adapter.ts` | Capability detection and a reference session request. Not a headset-tested renderer. |

## What is deliberately not in the canonical state

Camera objects, AudioContext, DOM nodes, XR session handles, `aimEvidence`. Aim is accepted on the action and ignored by the damage formula.

## Mode switch

Accepted on the acting ally's turn. Costs that turn (`switch` kind). Copies no new reward id. Does not reroll enemy intent, phase, cooldowns, or `rngState`. A one-tick settle follows. Live switching in the middle of a hit animation is not a separate clock; the safe point is the turn boundary. That limitation is intentional for this slice.

## Spoiler gates

`public`, `midgame`, `future-reveal`, `clone-reveal`, `door-reveal`, `post-door`. Future echoes, return anchors, endings, and hub aspects exist in `FUTURE_CONTENT` with `playable: false`. Public dialogue is tested against a ban list. Do not surface those records in UI.

## Action identity

Legacy "Attack" and Ascension "Cast" both build a `CombatAction` `{ version: 1, actorId, abilityId, kind, targetIds, modeOrigin, timeOrTurn }`. The core does not branch on `modeOrigin` for numbers.
