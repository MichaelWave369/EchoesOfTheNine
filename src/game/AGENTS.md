# Agents — Echoes of the Nine

Read the repo root `GAMEPLAY_STATUS.md` before claiming a feature works. The master spec is narrative law; this file is how not to break the slice.

## Rules that are easy to violate

1. **One core.** If you are about to compute damage, MP, a crit, or a drop in a component, stop. Call `proposeAction` in `src/game/core/combat.ts`.
2. **Do not spoil.** Public UI, map names, item names, and toasts must stay on `gate: "public"`. The ban list lives in `PUBLIC_STRING_BAN`. A test fails if dialogue or maps contain it.
3. **Unique rewards.** New payouts need a stable id. `rewardsGranted` and `flag.rewarded.<id>` both exist so a reload cannot double them. Keep both.
4. **Mercy is a real ending**, not a weaker kill. Do not delete `tryMercy` or make it grant the defeat item.
5. **Button path.** Every new mandatory puzzle needs a click or key that does not require a pointer gesture or a headset.
6. **Saves.** `SaveGame.version` is 1. `schema` is 2. Schema 1 chronicles migrate in `deserialize` — do not reject them. New fields need a default in `migrateSave` and a round-trip test. Renderer objects never go into the save. Do not render `echoMemory` or `gnosis`.
7. **Future content** in `FUTURE_CONTENT` stays `playable: false` until a rung actually ships it. Do not wire those ids to buttons "so the menu looks full."
8. **XR copy.** Never write that Quest 3 was tested unless a person wore one. `src/game/xr/adapter.ts` is the boundary.

## Where to extend

- New spell: `src/game/content/abilities.ts`, then teach it through `knownSpells` in `content/expanses.ts` if it is earned. Add a combat test.
- New map: `MAPS` in `content/world.ts`, and a row on `ATLAS` if the player should see it. Exits use `requires` flags. Locked atlas rows stay `locked: true`.
- New chapter flag: add the journal line in `chronicle/save.ts` and the objective sentence in `currentObjective`.

## Checks

```bash
node --experimental-strip-types --test src/game/core/combat.test.ts
npm run typecheck
```

Relative imports inside `src/game` use `.ts` suffixes so the Node test runner can load them.

## Tone

Warm, a little funny, never cruel. The Vale's people are not props for a later twist. Write them as if the festival is the whole world, because for the player, today, it is.
