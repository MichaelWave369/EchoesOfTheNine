# Gameplay status

Honest labels. Updated for the Vale expanses (Lowbell, companion choices, two spell evolutions).

## Working

- Everything in the Crystal Awakening and the living Vale / Hollowwood Reach still plays, including schema 1 and schema 2 saves.
- Companion choices, each once, stored on the chronicle:
  - Mira, at the parish shelf: write the tenth strike, or leave the page blank. The clasp is the written path.
  - Pell, on the Glasspine path with Kael: turn them back, or let them finish the walk.
  - Nessa, at her mother's stone: teach the old spring rhyme, or let the new verse stand.
- Later lines still remember the Warden and, for Nessa, the Cantor. A second choice is refused.
- Solar Flare (Ember's offensive evolution) after Ember has been cast three times, then either the scorched vein (only if the Warden fell) or the Lowbell kiln (open either way).
- Memory Tide (Tide Whisper's keeping evolution) if the Warden sleeps, the strike was written, and Tide has been spoken once. If the Warden fell, the split bell can teach it instead, once Tide has been spoken. Neither ending closes every path.
- Both spells resolve in the shared combat core and appear in Legacy and Ascension.
- Jobs screen: Wayfinder, Elementalist, Archivist, Oathkeeper, Spellblade, each with the real art name, cost, wait, and blurb. Dragoon, Healer, and Chronomancer are listed as not open. No job tree. Solar Flare and Memory Tide show as not earned until the chronicle has them.
- Glass needle hits a little harder on an Elementalist. The oath blade hits a little harder for Kael. A spared Cantor's reed loop is a step quicker on Nessa. The margin clasp deepens breath. Bonuses apply when the fight starts.
- Lowbell Landing, past the Reach, after Nessa joins. Ivo Bellwright. River kiln. Empty rope. Split bell.
- Atlas of walked places, open roads, and two locked names (far ferry, high road) drawn as dashed future roads, not as the next stop. Travel only to places already walked. First visits are on foot.
- Third cross-mode secret: the split bell. The walk reads nine and nine. The inside of the step reads the tenth strike still in the air. A button folds the view. No headset. Reward: a clapper shard, and Memory Tide when Tide has been spoken.
- Temporal Sight at Lowbell records an unfinished hour: a second bell on an empty rope, a shadow that strikes before the bronze. Ivo will say he saw it too, and he will not invent the hour. The chronicle keeps the discovery. It does not explain it.
- Warden and Cantor windups name the art and the answer (Sidestep, Stoneguard then Tide, a dirge that hits everyone). Boss turns wait a beat longer so the card can be read. Sidestep is still the previous action, not a reaction minigame. Party members stand in a readable arc. The core still decides the hit.

## Partial

- Ascension is still a presentation of the turn clock. Companions do not path on their own.
- Bonds are scenes and one consequential choice each, not a relationship sim with a meter.
- Spell ranks still add a little power. Only Ember and Tide Whisper have an evolution, and only those two.
- Job kits are readable. You do not change jobs except the existing Elementalist unlock.
- Map art is still painted in the page, not a sprite sheet.
- WebXR detects a headset and can open a reference session. It does not render the battle. It was not tested on Quest 3.

## Scaffolded

- Sera, Iri, Dragoon, Healer, Chronomancer, nine Echo records, four endings, return anchors, hub aspects. Not playable.
- `echoMemory` and `gnosis` stay stored and unlabeled.
- Far ferry and high road are atlas marks only.

## Not built

- A third region beyond Lowbell, an airship, a full job tree, more than two evolutions, day-night schedules.
- White room, Custodian, Door, Pleroma, Great Return, New Game Plus.
- Hand tracking, haptics, a headset battle.
- Accounts, cloud saves, multiplayer.

## Tests that ran

`node --experimental-strip-types --test src/game/core/combat.test.ts src/game/core/expanses.test.ts` — 30 passed, 0 failed.

New coverage: Solar Flare practice gate and kiln path when the Warden sleeps; Memory Tide from mercy or from both bell views; Mira, Kael, and Nessa choices through a reload, with a second answer refused; Lowbell and atlas gates, including a future road that cannot be walked; the unfinished hour across save and load; both new spells through `proposeAction`; Elementalist needle synergy; every open job names a real art. The scripted chapter still completes. Public copy still fails the late-chronicle ban list.
