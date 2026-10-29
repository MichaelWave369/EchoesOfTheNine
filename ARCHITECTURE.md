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
| `src/game/chronicle/save.ts` | Save version 1, schema 2, migration from schema 1, flags, quest refresh, bonds, import/export, idempotent rewards, level sync. `localStorage` only. |
| `src/game/content/gear.ts` | Equipment, shop buy, rest, level curve, spell ranks copied in at battle start, Temporal Sight charges, Elementalist unlock. |
| `src/game/ui/GameApp.tsx` | Title, exploration, shops, inn, Legacy menu, Ascension arena, Sight, ending, settings. |
| `src/game/audio.ts` | Procedural Web Audio. Unlocks on the first gesture. |
| `src/game/xr/adapter.ts` | Capability detection, reference session, and an empty `XR_PRESENTATION` hook. Not a headset-tested renderer. |

## What is deliberately not in the canonical state

Camera objects, AudioContext, DOM nodes, XR session handles, `aimEvidence`. Aim is accepted on the action and ignored by the damage formula.

## Mode switch

Accepted only from the living ally whose turn it is, and only while the phase is `player`. An enemy, a bystander, or a telegraph cannot fold the view. The switch costs that turn. It copies no new reward id and does not reroll enemy intent, phase, cooldowns, or `rngState`. A one-tick settle follows.

## Mercy and items

`tryMercy` is the rule, not the button. Warden mercy still needs the exposed seam. Cantor mercy also requires `wardenSpared` from the chronicle; omitting it fails closed. A boss pays mercy or defeat, never both. Item abilities read `encounter.pack`, decrement it, and do nothing if the count is missing or zero. The battle UI copies the local pack in and writes the returned counts back. It does not keep a second consumption path.

## Sovereign boundary

The playable game does not import accounts, the database client, multiplayer, or any API secret. Chronicles stay in `localStorage` plus JSON export. Schema 1 saves migrate to schema 2 and keep `wardenOutcome`, including into the Reach quest and companion lines.

Grok Build preview files (`src/lib/auth`, `src/lib/db`, `src/lib/multiplayer`, `server/`, `public/__grok/`, the PWA scripts) stay in the tree because the live preview and the TanStack Start shell need them. Nothing in `src/game` calls them. `npm run build` still runs `scripts/migrate.mjs`, which exits without touching a database when `DATABASE_URL` is absent. That is the CI path.

This is not yet a GitHub Pages bundle. The host is TanStack Start with a Nitro server so the preview can boot. A later static export can wrap the same `src/game` rules without accounts. Do not delete the preview shell to force that early.

## Spoiler gates

`public`, `midgame`, `future-reveal`, `clone-reveal`, `door-reveal`, `post-door`. Future echoes, return anchors, endings, and hub aspects exist in `FUTURE_CONTENT` with `playable: false`. Public dialogue is tested against a ban list. Do not surface those records in UI.

## Action identity

Legacy "Attack" and Ascension "Cast" both build a `CombatAction` `{ version: 1, actorId, abilityId, kind, targetIds, modeOrigin, timeOrTurn }`. The core does not branch on `modeOrigin` for numbers. Distance is read from both combatants' positions in both modes: under 1.35 tiles the hit is 15% stronger, past 3.4 it is 15% weaker, then clamped to at least 1. Evading is a status. The next damaging effect deals 0 and removes it. Spell rank is `spellRanks` copied onto the combatant by `prepareForBattle` before the encounter exists. The UI must not invent rank mid-hit.
