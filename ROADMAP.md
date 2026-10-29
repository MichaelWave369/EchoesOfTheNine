# Roadmap

Mirrors the master spec rungs. This repo has finished a narrow Rung 0 and a playable Rung 1. Later rungs are not claimed.

## Rung 0 — foundation (in this slice)

Action schema v1, save version 1, deterministic combat tests, one chronicle branch record, spoiler gates. Done for the slice. Not a full content pipeline.

## Rung 1 — The Crystal Awakening (playable)

Village, route, shrine, two companions, two regular foes, Warden, Legacy, bounded Ascension, one puzzle, save/load, desktop input. Headset entry is an adapter only.

## Rung 1b — Living Vale and Hollowwood (playable, this branch)

Inn, blacksmith, equipment, levels, one job unlock, spell ranks, usable Temporal Sight, Nessa, moss hymn, Cantor's Barrow, second boss with a mercy that remembers the Warden. Not a nine-region saga.

PR #1 repair: lockfile matches `npm ci` on Node 22 / npm 10.9, combat validation is authoritative, and the Warden's fate survives schema migration into chapter 2 lines.

## Proposed PR #2 — do not start it inside PR #1

Open only after PR #1 is green and reviewed. No new combat clock, no accounts, no WebXR battle renderer. Suggested branch: `feature/vale-expanses`.

1. Companion scenes with a real choice each, still remembering Warden and Cantor outcomes at higher bonds. Not a dating sim.
2. Job identity beyond the Elementalist unlock: a visible kit per job, still one rules core. No full job tree.
3. Two spell evolutions tied to a kept choice (spared Warden leans tide, defeated Warden leans flame). Ranks stay numeric until the evolution fires.
4. One more cross-mode secret in the Reach that both Legacy and Ascension can set, and neither is required to finish the chapter.
5. Cantor and Warden windups that telegraph one beat longer, with the existing Sidestep still the dodge. No iframe system.
6. One new painted region on the road out of the Reach, canvas scenery, no tileset pack.
7. An early temporal mystery that spends Sight and writes a journal line. It must not name the Door, the white room, or anything on the public ban list.
8. A world map of the places already walkable, plus the new region as a locked trail. Not an airship.

Explicitly out of PR #2: multiplayer, cloud saves, headset locomotion, the Pleroma hub, and replacing the preview shell.

## Rung 2 — switching and comfort

Next: switch at finer sync points, readable boss windups with a longer dodge window, trigger-cast once an XR frame loop exists. Do not reset cooldowns. Add the stress test before calling it done. The current Sidestep already changes the hit. It is one attack, not a timing minigame.

## Rung 3 — chronology

Three regions, companion scenes, a real Temporal Sight preview with a time limit, an airship *route* not an open skybox. Keep public UI free of later gates.

## Rung 4 — white room

Only after the first chapter feels worth returning to. Prototype, labeled, behind `clone-reveal`. Never the title screen.

## Rung 5 — Return

Non-destructive branches, three anchors, no farming of the Warden's unique payout. The mercy flag is the first anchor candidate.

## Rung 6–7 — production and release

Nine regions, original score, four endings, localization, Quest compatibility matrix from hardware, not from feature detection alone.

## Open decisions (do not silently close)

World name Aethera is provisional. Wanderer voice stays spare. Whether Ascension time becomes continuous *rules* time, or stays a view over turns, is a playtest call. This build chose turns.
