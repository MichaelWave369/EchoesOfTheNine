# Gameplay status

Honest labels. Updated with the Crystal Awakening slice.

## Working

- Title: New Journey, Continue when a save exists, Settings, Enter VR (reports capability; does not pretend a headset battle).
- Name entry, Lantern Vale exploration, named NPCs (Lira, Nim, Oven-Aunt Pim, Mira, Kael), clock anomaly at 9:09 / strike ten, Nim's sketch.
- Party: Wanderer, Mira, Kael. Distinct HP/MP, jobs, voices, actions.
- Inventory, journal, quest objectives, gold, XP, local auto-save, manual niche save, export/import JSON, reset.
- Encounters: festival shardling, Glasspine shardling + glowmoth, Crystal Warden.
- Legacy combat: turn queue, Attack / Magic / Defend / Item, targeting, MP costs, telegraphs, victory and defeat, rewards.
- Ascension: same encounter, WASD inside a bounded ring, button cast, button dodge, on-screen pad. Damage comes from the core.
- Mode switch on your turn. Preserves HP, phase, cooldowns, RNG, rewards. Costs the turn.
- Cross-mode puzzle: rune order on the wall, conduit ring by buttons. Shared flags. Temporal Sight line. Ascension unlock.
- Two Warden outcomes: defeat, or mercy after Stoneguard + Tide. Different flags, different items, no double unique payout.
- Chapter-complete screen with a teaser that does not name the late chronicle.
- Settings: text size, captions, mute, volume, reduced motion, contrast, camera comfort label.
- Button-only path for every mandatory beat. Scripted playthrough test covers it.
- Procedural music and hits. Mute works.

## Partial

- Ascension is a real-time *presentation* of the same turn clock, not a separate action timer. You move freely; strikes still resolve on the active actor's turn. Companion AI does not wander the ring on its own.
- Map art is original canvas scenery (houses, clock, pines, prism), not a full tileset or character animation sheet.
- Gamepad reads the d-pad on an interval during exploration. Face buttons are not fully mapped.
- WebXR: detection plus an optional reference session that opens and closes. No in-headset battle renderer. Not tested on Quest 3.
- Switch during an enemy telegraph keeps the committed intent, but you cannot switch mid-resolution because resolution is instant.

## Scaffolded

- Sera, Iri, nine Echo records, four endings, return anchors, hub aspects. Data only. `playable: false`.
- Chronicle branch object on the save (a single root branch). No return UI.
- Spell evolutions beyond Ember / Tide / Mend / Stoneguard are not content yet.
- Jobs exist as ids. No job-change screen.

## Not built

- Regions beyond Vale, Glasspine, and the shrine.
- Airship, Temporal Sight as a usable vision (the line of copy is all you get).
- White room, Custodian, Door sequence, Pleroma hub, Great Return, New Game Plus.
- Hand-tracked casting, haptics, spatial audio, snap-turn comfort locomotion in a headset.
- Multiplayer, accounts, cloud saves, telemetry.

## Tests that ran

`node --experimental-strip-types --test src/game/core/combat.test.ts`

- Seeded Ember from Legacy and Ascension: identical HP, MP, cooldown, RNG.
- Insufficient MP: no damage.
- Mode switch: enemy HP, phase, cooldown, RNG, reward ids held.
- Unique reward not paid twice. Reward apply is idempotent.
- Mercy refused before the seam; mercy flag differs from defeat.
- Save round-trip keeps rune order and conduit flag.
- Public dialogue/map JSON does not contain the late-game ban list.
- Scripted chapter reaches `chapterComplete` with three party members.
