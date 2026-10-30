# Roadmap

Mirrors the master spec rungs. This repo has finished a narrow Rung 0 and a playable Rung 1. Later rungs are not claimed.

## Rung 0 — foundation (in this slice)

Action schema v1, save version 1, deterministic combat tests, one chronicle branch record, spoiler gates. Done for the slice. Not a full content pipeline.

## Rung 1 — The Crystal Awakening (playable)

Village, route, shrine, two companions, two regular foes, Warden, Legacy, bounded Ascension, one puzzle, save/load, desktop input. Headset entry is an adapter only.

## Rung 1b — Living Vale and Hollowwood (playable, this branch)

Inn, blacksmith, equipment, levels, one job unlock, spell ranks, usable Temporal Sight, Nessa, moss hymn, Cantor's Barrow, second boss with a mercy that remembers the Warden. Not a nine-region saga.

PR #1 repair: lockfile matches `npm ci` on Node 22 / npm 10.9, combat validation is authoritative, and the Warden's fate survives schema migration into chapter 2 lines.

## Rung 1c — Vale expanses (playable)

Companion choices for Mira, Kael, and Nessa. Solar Flare and Memory Tide, earned, with neither Warden ending closing every door. A jobs screen for the kits that exist. Lowbell Landing, an atlas, and the split bell. Boss windups you can read. An early Sight mystery that does not name the late chronicle.

Merged from `feature/vale-expanses`.

## Rung 1d — Mistwater Crossing (playable)

The far dock, a riverside station, the Twice-Kept Hold, and the Late Ferryman. Sight as an eight-step overlay. Wayfinder, Elementalist, and one earned job, Riverward, switched only where it is quiet. Double Wake after the crossing. The high road gate opens. Open water does not.

Merged from `feature/beyond-lowbell`.

## Rung 1e — Skyweave Ascent (playable)

The high road becomes a ridge: mill, half-span, salt cave, Early Glass, and a Galekeeper. Sera joins on a splice or a stay, with a four-person line and a rig for the rest. Stayline and Crosswind. The First Stay flies between the berth and the Vale roof. Open sky does not.

Merged from `feature/skyweave-ascent`.

## Rung 1f — The Unwritten Hour (playable, this branch)

After the first flight, the berth ledger starts an argument the world does not agree on. Vale, Lowbell, Mistwater, and the berth each write an hour. Four writings earn a third pad, the Margin: ink, a cross-view well, a shine Sight can show but not take, and the Hourkeeper. Mercy and defeat both finish the hour and pay different threads. Iri will walk or keep the veil. Mira and Sera each answer one later page without sanding the first choice. The walked open-sky mark stays locked. Dragoon, Healer, and Chronomancer stay shut.

Branch: `feature/unwritten-hour`. Not merged from this workspace.

## Rung 1h — The First Open Sky (playable, this branch)

The walked atlas row `map.sky` stays locked. After a route, the hull shadow, both glass readings, and the Unwritten Hour, a cross-view heading opens a bounded Sky Atlas. The First Stay still flies the old pads. One new pad, Cinderwatch, is noted before it will take the hull. A later light will not. Dragoon stays shut. An ash lance is a note, not a coat.

Branch: `feature/first-open-sky`. Not merged from this workspace.

## Rung 1i — Wings of the First Stay (playable, this branch)

The chart is still a grid, not a skybox. The hull eases between cells, banks, and shows weather under it. The deck has a log and a bunk that does not wake the sight. Cinderwatch remembers bank or send, and a look can be counted once. After the kite, a cold perch teaches Sky Lance and Leap. Rise, hold, drop teaches Falling Star. Dragoon stays shut. The walked atlas stays locked.

Branch: `feature/wings-first-stay`. Not merged from this workspace.

## Still after this

The rest of the sky, the remaining regions, a fuller job tree, and any headset battle. Do not start those inside this PR.

## Rung 2 — switching and comfort

Next: switch at finer sync points, readable boss windups with a longer dodge window, trigger-cast once an XR frame loop exists. Do not reset cooldowns. Add the stress test before calling it done. The current Sidestep already changes the hit. It is one attack, not a timing minigame. Companion suggestions stay suggestions.

## Rung 3 — chronology

Three regions were the sketch. Hollowwood and Mistwater are lived-in, Skyweave is a ridge, and the First Stay has two pads plus the Margin after the hour is written. An open skybox is still later. Keep public UI free of later gates.


## Rung 4 — white room

Only after the first chapter feels worth returning to. Prototype, labeled, behind `clone-reveal`. Never the title screen.

## Rung 5 — Return

Non-destructive branches, three anchors, no farming of the Warden's unique payout. The mercy flag is the first anchor candidate.

## Rung 6–7 — production and release

Nine regions, original score, four endings, localization, Quest compatibility matrix from hardware, not from feature detection alone.

## Open decisions (do not silently close)

World name Aethera is provisional. Wanderer voice stays spare. Whether Ascension time becomes continuous *rules* time, or stays a view over turns, is a playtest call. This build chose turns.
