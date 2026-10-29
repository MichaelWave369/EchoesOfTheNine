# Gameplay status

Honest labels. Updated after the living Vale and Hollowwood Reach.

## Working

- Title: New Journey, Continue (returns you to the map, not a locked ending), Settings, Enter VR (reports capability; does not pretend a headset battle).
- Name entry, Lantern Vale, Ninth Wick inn (8 gold, full heal, three Sight charges), Bram's stall (buy), bag equip for weapon, armor, and accessory.
- Named townspeople: Lira, Nim, Oven-Aunt Pim, Elder Voss, Salla, Bram, Mira, Kael. Voss speaks differently if the Warden was spared or defeated. Neither line calls the other path wrong.
- Clock anomaly at 9:09 / strike ten, Nim's sketch, festival crate.
- Party: Wanderer, Mira, Kael, and — after the first chapter — Nessa Quill. Distinct HP/MP, jobs, voices, actions.
- Levels from shared XP (circle 3 through 8), stat growth, festival knife already equipped. Gear bonuses apply when a fight starts, not permanently baked into the roster.
- Elementalist unlocks when the shrine conduits align. Adds Flare. Not available at the title.
- Spell mastery: each successful cast increments a counter. Every three casts of a spell raises its rank inside the next battle only.
- Bonds: talking to a companion again deepens a short personal line. Not a full relationship sim.
- Inventory, journal, quests (festival, party, hearth, prism, warden, reach), gold, XP, local auto-save, manual niche save, export/import JSON, reset.
- Schema 2 saves. Schema 1 chronicles from the first chapter migrate and keep the Warden outcome.
- Encounters: festival shardling, Glasspine shardling + glowmoth, Crystal Warden, Hollowwood briarlings, Thorn Cantor.
- Legacy combat: turn queue, Attack / Magic / Defend / Sidestep / Item, targeting, MP costs, telegraphs, boss introduction card, victory and defeat, rewards.
- Sidestep applies Evading. The next damaging hit misses and consumes it. Same rule in both modes.
- Ascension: same encounter, WASD inside a bounded ring, button cast, button dodge, on-screen pad. Standing close adds damage; standing far reduces it. The bonus is computed in the core from positions, in both modes.
- Mode switch on your turn. Preserves HP, phase, cooldowns, RNG, rewards. Costs the turn.
- Cross-mode 1: rune order on the wall, conduit ring by buttons. Shared flags. Unlocks Ascension, Temporal Sight (3 charges), and Elementalist.
- Temporal Sight: a button. Costs one charge. Inn refills to three. Reveals the clock pebble, lying moss, the barrow root, or a shrine flicker. No headset required.
- Cross-mode 2: moss hymn (wind, flame, stone) opens the barrow. Sight reveals the cache the hymn does not.
- Two Warden outcomes and two Cantor outcomes. Cantor mercy is refused by `tryMercy` unless the Warden was spared, even if a caller shows the button. Defeat remains available either way. Mercy and defeat payouts cannot both be collected. Companion lines and the Reach close keep the Warden's fate after the bond deepens.
- Mode switch only on the active ally's player turn. Wrong targets, unknown arts, and missing items are rejected by the core. Items decrement `encounter.pack`.
- Schema 2 saves. Schema 1 chronicles migrate, keep the Warden outcome, and reopen the Reach quest when the chapter was already complete.
- Settings: text size, captions, mute, volume, reduced motion, contrast, camera comfort label.
- Button-only path for every mandatory beat, including both puzzles. Scripted chapter-1 playthrough still passes.
- Procedural music for Vale, woods, shrine, inn, Reach, barrow, and battle. Mute works.
- Gamepad: map d-pad moves, A confirms once, B closes a talk or bag. Battle A strikes, B braces, X sidesteps, Y changes view when Ascension is awake. D-pad moves inside the Ascension ring.

## Partial

- Ascension is still a real-time presentation of the same turn clock. You move freely; strikes resolve on the active actor's turn. Companions do not path on their own.
- Positioning changes damage. It is not a separate action timer, windup bar, or iframe system.
- Jobs that exist in play: Wayfinder, then Elementalist for the lead; Archivist, Oathkeeper, Spellblade for companions. No job-change menu, no Dragoon, Healer, or Chronomancer.
- Spell ranks add power. Spells do not yet evolve into different spells from story choices.
- Map art is original canvas scenery, portraits are painted glyphs, not a sprite sheet.
- Bonds stop at a handful of lines. There is no affinity meter screen.
- WebXR: detection plus an optional reference session that opens and closes. `XR_PRESENTATION` is an empty hook for a later adapter. No in-headset battle renderer. Not tested on Quest 3.
- Switch during an enemy telegraph keeps the committed intent. Resolution itself is instant.

## Scaffolded

- Sera, Iri, nine Echo records, four endings, return anchors, hub aspects. Data only. `playable: false`.
- Chronicle branch object, `choiceLog`, `discoveries`, `echoMemory`, `gnosis`. The last two are stored and never labeled in the chapter UI.
- Future XR mount, haptic, and spatial hooks. Empty. Desktop does not call them.

## Not built

- Regions beyond Vale, Glasspine, the shrine, and Hollowwood Reach.
- Airship, a full job tree, spell evolution paths, shops that buy back, day-night NPC schedules.
- White room, Custodian, Door sequence, Pleroma hub, Great Return, New Game Plus loop.
- Hand-tracked casting, haptics, spatial audio, snap-turn comfort locomotion in a headset.
- Multiplayer, accounts, cloud saves, telemetry.

## Tests that ran

`node --experimental-strip-types --test src/game/core/combat.test.ts` — 22 passed, 0 failed.

- Seeded Ember from Legacy and Ascension: identical HP, MP, cooldown, RNG.
- Insufficient MP: no damage.
- Mode switch: enemy HP, phase, cooldown, RNG, reward ids held.
- Unique reward not paid twice. Reward apply is idempotent.
- Mercy refused before the seam; mercy flag differs from defeat.
- Save round-trip keeps rune order and conduit flag.
- Public dialogue/map JSON does not contain the late-game ban list.
- Scripted chapter reaches `chapterComplete` with three party members.
- Evading consumes and deals 0.
- Close range damage exceeds far range on the same seed.
- Festival knife raises attack. 45 XP grows max HP.
- Cantor mercy refused above half HP, pays the reed loop once, writes a choice.
- Temporal Sight persists a Reach clue and spends a charge across save/load.
- A schema 1 chronicle migrates to schema 2 without dropping a spared Warden.
- Elementalist learns Flare. Reach and barrow exits stay flag-gated.
