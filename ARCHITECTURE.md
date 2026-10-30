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
| `src/game/content/expanses.ts` | Companion choices, Solar Flare, Memory Tide, Lowbell atlas, split bell. Optional. |
| `src/game/content/crossing.ts` | Mistwater rules: job change, Sight overlay, hold plate, Double Wake, companion instinct. Instincts are not actions. |
| `src/game/content/skyweave.ts` | Ridge rules: Sera's choice, the four-person line, formations, the lens, Stayline, Crosswind, the skiff. Two pads, plus the Margin when `routeDocks` says the hour earned it. |
| `src/game/content/unwritten.ts` | The Unwritten Hour: four clues, the Margin readings, Sight compare and trace, Mira's and Sera's later pages, Iri's walk or veil. No damage math. |
| `src/game/content/hours.ts` | Optional after the flight: Kael's second oath, Nessa's spring, the hearth and the veil thread, and the Lowbell mouth. No damage math. |
| `src/game/content/opensky.ts` | The first heading and the bounded sky chart. Coordinates live in flags. `map.sky` stays locked. The perch, the tally, and the drop live here. No damage math. `job.dragoon` stays shut. |
| `src/game/chronicle/save.ts` | Save version 1, schema 4, migration from schema 1, 2, and 3, flags, quest refresh, bonds, import/export, idempotent rewards, level sync. `localStorage` only. |
| `src/game/content/gear.ts` | Equipment, shop buy, rest, level curve, spell ranks copied in at battle start, Temporal Sight charges, Elementalist unlock. |
| `src/game/ui/art.ts` | Presentation only: region colors, landmarks, sprites, Sight wash, battle plates and staging. No rules. |
| `src/game/ui/sprites.ts` | Frame sheets, cloak dyes, tile jitter, battle plate names, and the follow-camera origin. No rules. |
| `src/game/ui/breath.ts` | Glide, festival loops, and footfall kind. No rules and nothing saved. |
| `src/game/ui/GameApp.tsx` | Title, exploration, shops, inn, Legacy menu, Ascension arena, Sight, ending, settings. |
| `src/game/audio.ts` | Procedural Web Audio. Unlocks on the first gesture. |
| `src/game/xr/adapter.ts` | Capability detection, reference session, and an empty `XR_PRESENTATION` hook. Not a headset-tested renderer. |

## What is deliberately not in the canonical state

Camera objects, AudioContext, DOM nodes, XR session handles, `aimEvidence`. Aim is accepted on the action and ignored by the damage formula.

## Mode switch

Accepted only from the living ally whose turn it is, and only while the phase is `player`. An enemy, a bystander, or a telegraph cannot fold the view. The switch costs that turn. It copies no new reward id and does not reroll enemy intent, phase, cooldowns, or `rngState`. A one-tick settle follows.

## Mercy and items

`tryMercy` is the rule, not the button. Warden mercy still needs the exposed seam. Cantor mercy also requires `wardenSpared` from the chronicle; omitting it fails closed. Ferryman mercy needs him under two fifths, and either `wardenSpared` or `doubleDeparture`. Galekeeper mercy needs the gale under a little less than half, and `skyAsked` (both readings, the glass, or the safer stay). Hourkeeper mercy needs the hour under half and a little more, and either `hourAsked` (both Vale hours) or `wardenSpared`. A fallen Warden with a single Vale hour cannot ask, and can still end the fight. A boss pays mercy or defeat, never both. The ferryman's second phase adds two reflections in the same resolution; the gale's second phase adds two ahead-gusts; the hour's second phase is one note on everyone and no added bodies. None of them mints a second reward. Item abilities read `encounter.pack`, decrement it, and do nothing if the count is missing or zero. The battle UI copies the local pack in and writes the returned counts back. It does not keep a second consumption path. Damage text may append a resist note. The number still comes from `formulas.ts`.

## Sovereign boundary

The playable game does not import accounts, the database client, multiplayer, or any API secret. Chronicles stay in `localStorage` plus JSON export. Schema 1, 2, and 3 saves migrate to schema 4 and keep `wardenOutcome`, including into the Reach, the ferry, and the ridge. A party longer than four overflows into `reserve`. Formation defaults to `line`.

Grok Build preview files (`src/lib/auth`, `src/lib/db`, `src/lib/multiplayer`, `server/`, `public/__grok/`, the PWA scripts) stay in the tree because the live preview and the TanStack Start shell need them. Nothing in `src/game` calls them. `npm run build` still runs `scripts/migrate.mjs`, which exits without touching a database when `DATABASE_URL` is absent. That is the CI path.

GitHub Pages is a separate static bundle of the same `src/game` rules (`pages/`, `vite.pages.config.ts`). Chronicles do not cross origins. The TanStack Start shell stays so the live preview can boot. Do not delete it.

## Spoiler gates

`public`, `midgame`, `future-reveal`, `clone-reveal`, `door-reveal`, `post-door`. Future echoes, return anchors, endings, and hub aspects exist in `FUTURE_CONTENT` with `playable: false`. Public dialogue is tested against a ban list. Do not surface those records in UI.

## Action identity

Legacy "Attack" and Ascension "Cast" both build a `CombatAction` `{ version: 1, actorId, abilityId, kind, targetIds, modeOrigin, timeOrTurn }`. The core does not branch on `modeOrigin` for numbers. Distance is read from both combatants' positions in both modes: under 1.35 tiles the hit is 15% stronger, past 3.4 it is 15% weaker, then clamped to at least 1. Evading is a status. The next damaging effect deals 0 and removes it. Spell rank is `spellRanks` copied onto the combatant by `prepareForBattle` before the encounter exists. The UI must not invent rank mid-hit.
