# Gameplay status

Honest labels. Updated for Mistwater Crossing, after the Vale expanses.

## Working

- Everything in the Crystal Awakening, the living Vale / Hollowwood Reach, and the Vale expanses still plays, including schema 1, 2, and 3 saves.
- Companion choices, each once, stored on the chronicle:
  - Mira, at the parish shelf: write the tenth strike, or leave the page blank. The clasp is the written path.
  - Pell, on the Glasspine path with Kael: turn them back, or let them finish the walk.
  - Nessa, at her mother's stone: teach the old spring rhyme, or let the new verse stand.
- Those choices are heard again at Mistwater. Hale and Tamsin do not agree which hour the ferry left. Neither answer locks the hold: both of Kael's paths can name the older cut. A spared Warden can ask the ferryman to sit. A fallen Warden can open the scorched seal. Killing the ferryman still opens the high road.
- Solar Flare (Ember's offensive evolution) after Ember has been cast three times, then either the scorched vein (only if the Warden fell) or the Lowbell kiln (open either way). It stays earned across a job change. Wayfinder and Elementalist can cast it. Riverward does not. Switching back does not make you learn it again.
- Memory Tide (Tide Whisper's keeping evolution) if the Warden sleeps, the strike was written, and Tide has been spoken once. If the Warden fell, the split bell can teach it instead, once Tide has been spoken. Neither ending closes every path.
- Double Wake, a third evolution: Echo Lash cast twice, and the crossing finished, by mercy or by ending the boarding. The gate wind at the high road, or Wren, can teach it. It does not explain the two departures.
- All three spells resolve in the shared combat core and appear in Legacy and Ascension.
- Jobs you can actually change, at the Wick, Bram's stall, the Mistwater station, or the high gate, and only while no fight is open: Wayfinder, Elementalist (after the conduits), Riverward (after the hold's plate). Changing a trade does not restore HP or MP, does not touch gold or the pack, and does not clear a cooldown. Dragoon, Healer, Chronomancer, and Skywright stay shut. Companion kits are not the wanderer's job switch.
- Gear still matters in the fight it starts: glass needle on an Elementalist, river hook on a Riverward, oath blade for Kael, reed loop for Nessa, margin clasp for breath.
- Lowbell Landing, past the Reach, after Nessa joins. Ivo Bellwright. River kiln. Empty rope. Split bell. After the bell, the far dock opens.
- Mistwater Crossing: Hale Reed, Tamsin Coil's kettle, Nedda's station bed, a trade board, a timetable, and an old pier. Twice-Kept Hold: mistlings, a plate, a vault of lanterns and a mistling, then the Late Ferryman. He boards twice. Under two fifths of his health you may ask which departure, if you spared the Warden or recorded both hours. Otherwise you can still end it. Either way the high road gate opens. Open water stays shut.
- Atlas of walked places. Travel only to places already walked. First visits are on foot. The dashed road past the ferry is not a boat.
- Temporal Sight is an overlay for eight steps: Lowbell's empty rope, the ferry's two stamps and the crate, the hold's older cut, the stair's early shadow. A button spends a charge. Another button puts the hour away. The journal keeps the clue. The plate does not turn itself. The pier crate is only there after you have seen it.
- Warden, Cantor, and Ferryman windups name the art and the answer. A second boarding warns that both hours hit everyone. Driftlanterns say when fire slides off and tide bites. The log says the same. Boss turns wait a beat longer. Sidestep is still the previous action, not a reaction minigame. A companion can suggest a brace, a mend, or a weak spot. You still confirm the action. The core still decides the hit.

## Partial

- Ascension is still a presentation of the turn clock. Companions do not path on their own, and they do not take a turn without you.
- Bonds are scenes, one consequential choice each, and a later line. Not a relationship sim.
- Spell ranks still add a little power. Ember, Tide Whisper, and Echo Lash have one evolution each.
- Job kits you can switch are three. There is no full tree, and no day-night schedule of who is at the stall.
- Map art is still painted in the page, not a sprite sheet. The other hour is a tint and a few ghost shapes, not a second rendered level.
- The high road is a gate and a person, not a new region.
- WebXR detects a headset and can open a reference session. It does not render the battle. It was not tested on Quest 3.

## Scaffolded

- Sera, Iri, Dragoon, Healer, Chronomancer, Skywright, nine Echo records, four endings, return anchors, hub aspects. Not playable.
- `echoMemory` and `gnosis` stay stored and unlabeled.
- Open water is an atlas mark only.

## Not built

- An airship, an open skybox, the remaining regions, a full job tree, more evolutions than the three above.
- White room, Custodian, Door, Pleroma, Great Return, New Game Plus.
- Hand tracking, haptics, a headset battle.
- Accounts, cloud saves, multiplayer.

## Tests that ran

`node --experimental-strip-types --test src/game/core/combat.test.ts src/game/core/expanses.test.ts src/game/core/crossing.test.ts`

New coverage: the dock stays shut until the bell; Sight spends a charge, keeps a clue, and does not open the plate or write both departures by itself; the older cut works for either Warden ending and the seal only if the prism fell; job changes preserve breath, purse, pack, and cooldown, and refuse a fight, a loud map, and a locked trade; Stillwater, Echo Lash, and Double Wake go through `proposeAction`; tide bites a lantern harder than flame; ferryman mercy from a spared Warden or from both hours, defeat pays a different unique item, and a second payout is refused; phase two adds reflections without ending the fight; a companion instinct does not deal damage; a schema 2 chronicle gains the new fields and keeps a fallen Warden. Public copy still fails the late-chronicle ban list.
