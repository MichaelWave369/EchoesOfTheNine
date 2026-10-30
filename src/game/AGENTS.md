# Agents — Echoes of the Nine

Read the repo root `GAMEPLAY_STATUS.md` before claiming a feature works. The master spec is narrative law; this file is how not to break the slice.

## Rules that are easy to violate

1. **One core.** If you are about to compute damage, MP, a crit, or a drop in a component, stop. Call `proposeAction` in `src/game/core/combat.ts`.
2. **Do not spoil.** Public UI, map names, item names, and toasts must stay on `gate: "public"`. The ban list lives in `PUBLIC_STRING_BAN`. A test fails if dialogue or maps contain it.
3. **Unique rewards.** New payouts need a stable id. `rewardsGranted` and `flag.rewarded.<id>` both exist so a reload cannot double them. Keep both.
4. **Mercy is a real ending**, not a weaker kill. Do not delete `tryMercy` or make it grant the defeat item.
5. **Button path.** Every new mandatory puzzle needs a click or key that does not require a pointer gesture or a headset.
6. **Saves.** `SaveGame.version` is 1. `schema` is 4. Schema 1, 2, and 3 chronicles migrate in `deserialize` — do not reject them. New fields need a default in `migrateSave` and a round-trip test. Renderer objects never go into the save. Do not render `echoMemory` or `gnosis`. `earnedSpells` survives a job change. `sightScene` and `sightSteps` are the overlay, not a puzzle solution. `reserve` keeps benched companions. `formation` is `line` or `wide`. The wanderer is never benched. Party management must not duplicate items.
7. **Future content** in `FUTURE_CONTENT` stays `playable: false` until a rung actually ships it. Do not wire those ids to buttons "so the menu looks full."
8. **XR copy.** Never write that Quest 3 was tested unless a person wore one. `src/game/xr/adapter.ts` is the boundary.

## Where to extend

- New spell: `src/game/content/abilities.ts`, then teach it through `knownSpells` in `content/expanses.ts` or `content/crossing.ts` if it is earned. Add a combat test. Job kits live in `JOB_SPELLS` (`crossing.ts`). `switchJob` is the only way the wanderer changes trades, and only on a quiet map with no encounter open.
- New map: `MAPS` in `content/world.ts`, and a row on `ATLAS` if the player should see it. Exits use `requires` flags. Locked atlas rows stay `locked: true`. Open sky (`map.sky`) stays locked. The first flyable chart is not that row: `content/opensky.ts` keeps coordinates in flags and a separate sky screen. Skyweave is the ridge, the glass, the salt cave, and the berth. The First Stay still flies the Vale roof and the berth, and the Margin only after `flag.margin_dock`. The sky chart opens only after the heading. Give the place a `RegionLook` in `src/game/ui/art.ts`. The picture is not allowed to change which squares can be walked. See `ART_DIRECTION.md`.
- New chapter flag: add the journal line in `chronicle/save.ts` and the objective sentence in `currentObjective`. Optional post-flight stories live in `content/hours.ts`. They may not set `flag.margin_dock`, `flag.chapter_complete`, or open the sky. Sight in that file is an overlay only. `opensky.ts` may set `flag.sky_open`. It may not unlock `map.sky` or set `job.dragoon` playable. Wings drills may be taught through `grantEarned`. The coat stays shut.

## Checks

```bash
node --experimental-strip-types --test src/game/core/combat.test.ts src/game/core/expanses.test.ts src/game/core/crossing.test.ts src/game/core/skyweave.test.ts src/game/core/unwritten.test.ts src/game/core/hours.test.ts src/game/core/opensky.test.ts src/game/ui/art.test.ts src/game/ui/sprites.test.ts
npm run typecheck
```

Relative imports inside `src/game` use `.ts` suffixes so the Node test runner can load them.

## Tone

Warm, a little funny, never cruel. The Vale's people are not props for a later twist. Write them as if the festival is the whole world, because for the player, today, it is.
