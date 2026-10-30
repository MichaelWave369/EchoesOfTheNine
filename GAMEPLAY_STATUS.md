# Gameplay status

Honest labels. Updated for the breathing world. Skyweave's rules are unchanged. The Vale moves. The math did not.

## Working

- Everything in the Crystal Awakening, the living Vale / Hollowwood Reach, the Vale expanses, and Mistwater Crossing still plays, including schema 1, 2, 3, and 4 saves.
- Companion choices, each once, stored on the chronicle:
  - Mira, at the parish shelf: write the tenth strike, or leave the page blank. The clasp is the written path.
  - Pell, on the Glasspine path with Kael: turn them back, or let them finish the walk.
  - Nessa, at her mother's stone: teach the old spring rhyme, or let the new verse stand.
  - Sera, at the ridge rig: finish the hot splice, or lash the safer stay. Either answer lets her join. A full line of four puts her on the rig, not out of the story.
- Those earlier choices are heard again. Hale and Tamsin do not agree which hour the ferry left. Neither answer locks the hold: both of Kael's paths can name the older cut. A spared Warden can ask the ferryman to sit. A fallen Warden can open the scorched seal. Killing the ferryman still opens the high road. After the ridge, Hale, Ivo, Lira, Wren, Mira, Kael, and Nessa can mention the flight or the two noons. They do not explain them.
- Solar Flare, Memory Tide, and Double Wake still resolve in the shared combat core and stay earned across a job change. Riverward does not cast Solar Flare.
- Skywright is Sera's kit, not a wanderer trade. Gust is hers when she joins. Stayline is taught by Ada after the gale is settled, by asking or by ending it. Crosswind is Gust practiced twice, after the ridge, from Sera or the berth sign. Neither art is locked to mercy or to the splice.
- Jobs you can actually change, at the Wick, Bram's stall, the Mistwater station, the high gate, the ridge, or the berth, and only while no fight is open: Wayfinder, Elementalist (after the conduits), Riverward (after the hold's plate). Dragoon, Healer, and Chronomancer stay shut. You cannot switch into Skywright.
- The active line holds four. Quiet maps (Vale, Wick, Bram's, station, high gate, ridge, berth) can send a companion to the rig and call them back. The wanderer stays. A fight, a loud map, or a fifth active member is refused. Equipment, spells, levels, bonds, HP, and MP stay on the person. The pack is not copied.
- Formations, also only while no fight is open: a close line, or a loose line. Distance still comes from the shared formula. The formation does not heal anyone.
- A companion can suggest a brace, a mend, or a weak spot. You still confirm the action.
- Gear still matters in the fight it starts, including a gale hook on Sera.
- Lowbell, the split bell, Mistwater, and the Late Ferryman are unchanged. Open sky stays shut.
- Skyweave Ridge, after the high gate: Ada at the mill, Sera at the rig, a half-span, a salt cave, and the Early Glass. Gustlings, then a lens that wants the chart from the walk and the sky from inside the step. Sight shows an eclipse ahead of the sun and does not press the lens. Orrin will not press it either. The inner arch opens after both readings and the gusts are quiet. The Galekeeper boards early. Under a little less than half you may ask which noon, if you read both views, saw the glass, or chose the safer stay. Otherwise you can still end it. Either way the berth opens. The second phase hits everyone.
- The First Stay is one hull and two pads: the Skyweave berth and the Vale roof. You pick a destination and cast off. It is a route, not a skybox. After one flight you may note a second shadow that leaves before the hull. It is recorded. It is not explained.
- Atlas of walked places, including the ridge, the glass, the cave, and the berth. Travel only to places already walked. The dashed road into open sky is still not a boat.
- Temporal Sight is an overlay for eight steps, including the ridge's early span, the glass, the cave, and the berth. A button spends a charge. The journal keeps the clue. The picture of that hour is a teal wash and a small clock. It still does not press the puzzle.
- The presentation layer (`src/game/ui/art.ts`, `src/game/ui/sprites.ts`, `src/game/ui/breath.ts`, `ART_DIRECTION.md`) draws region tiles, landmarks, party sprites, the title, the First Stay, and a staged battle. A cloak dye is cosmetic. A follow camera is a local view, not a save field. Walk interpolation, festival loops, weather, and footfalls are cosmetic. Quiet world parks the loops. The picture does not decide damage, doors, jobs, or rewards. Schema stays 4.

## Partial

- Ascension is still a presentation of the turn clock. Companions do not path on their own, and they do not take a turn without you.
- Bonds are scenes, one consequential choice each, and a later line. Not a relationship sim.
- Spell ranks still add a little power. Ember, Tide Whisper, Echo Lash, and Gust have one evolution each.
- Job kits you can switch are three. Sera's Skywright is hers. There is no full tree, and no day-night schedule of who is at the stall.
- Map art is original sprite and tile art in the page. Temporal Sight is still a wash, a ghost of the wanderer, and a step count. It is not a second level, and it still does not press a puzzle.
- The airship is a route between two earned pads. It is not an open sky.
- WebXR detects a headset and can open a reference session. It does not render the battle. It was not tested on Quest 3.

## Scaffolded

- Iri, Dragoon, Healer, Chronomancer, nine Echo records, four endings, return anchors, hub aspects. Not playable.
- `echoMemory` and `gnosis` stay stored and unlabeled.
- Open sky is an atlas mark only.

## Not built

- An open skybox, the remaining regions, a full job tree, more destinations than the two pads.
- White room, Custodian, Door, Pleroma, Great Return, New Game Plus.
- Hand tracking, haptics, a headset battle.
- Accounts, cloud saves, multiplayer.

## Tests that ran

`node --experimental-strip-types --test src/game/core/combat.test.ts src/game/core/expanses.test.ts src/game/core/crossing.test.ts src/game/core/skyweave.test.ts`

Skyweave coverage: the berth stays shut until the gale; open sky stays locked; Sight on the glass spends a charge and does not write either noon; the chart is Legacy and the sky is Ascension; both readings give one lens shard; Orrin does not set the flags; the dome wants the split and a quiet west room; Sera joins once, a full line puts her in reserve, and the bench keeps breath, gold, pack, gear, bonds, and spells; formations do not heal; Stayline and Crosswind go through `proposeAction`; stone bites a gustling harder than wind; gale mercy needs a noon you kept, defeat pays a different unique item, and a second mercy payout is refused; phase two adds ahead-gusts without ending the fight; Early Gale hits the party; a companion instinct does not deal damage; the First Stay flies both ways without minting gold; the hull shadow waits for a flight and does not explain itself; a schema 3 chronicle gains reserve and formation and keeps a spared Warden. Public copy still fails the late-chronicle ban list.

`scripts/game-launch-smoke.mjs` starts a journey and reaches the Vale. It is not on the GitHub Actions job, which does not install a browser.
