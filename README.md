# Echoes of the Nine

A browser science-fantasy JRPG from Φ369 Labs. Playable now: **The Crystal Awakening**, **Hollowwood Reach**, the optional **Vale expanses**, **Mistwater Crossing**, and the **Skyweave Ascent**. The late chronicle is not on the title screen, and it should stay that way.

Public pitch: an old-school fantasy RPG you can step inside. Command a classic battle, or move inside the same fight. The picture is lanternlight, twilight, and readable figures — see [ART_DIRECTION.md](ART_DIRECTION.md) and [ASSETS.md](ASSETS.md).

## Play

Keyboard and buttons complete every mandatory beat. A headset is optional and is not required. This build has not been tested on Quest 3.

1. **New Journey.** Name yourself. You start with a festival knife.
2. Walk Lantern Vale. Speak to the clock (it strikes ten at 9:09) and to Nim. Elder Voss keeps the square. The Ninth Wick (north-west house) rents a night for 8 gold. Bram's stall sells blades and coats.
3. Recruit Mira at the east lanterns. A shardling interrupts the square.
4. East into Glasspine. Recruit Kael. Clear the flicker.
5. In the shrine, set the rune wall to Flame, Stone, Tide. Turn the conduit ring until it rests on Tide. That wakes Ascension, Temporal Sight, and the Elementalist's Flare.
6. Face the Crystal Warden. **Offer mercy** after Stoneguard and Tide Whisper, or fight it down. Both are kept.
7. North of the prism, Hollowwood opens. Talk to Nessa. Give the moss wind, then flame, then stone. Sight (a button, three charges, refilled at the inn) shows what the moss is hiding.
8. In the barrow, the Thorn Cantor can be ended, or — if you spared the Warden — asked to stop once the song is under half.
9. Optional, and not required to finish either chapter:
   - Parish shelf, with Mira: write the tenth strike, or leave the page blank. A written strike and a sleeping Warden can teach Memory Tide after Tide Whisper has been spoken once.
   - Pell, on the Glasspine path with Kael: turn them back, or let them finish the walk.
   - Nessa's mother's stone: teach the old spring rhyme, or let the new verse stand.
   - Cast Ember three times. The river kiln at Lowbell (flame, stone, flame) or a scorched vein after a fallen Warden teaches Solar Flare. Neither Warden ending closes every road.
   - After Nessa joins, the river stair leads to Lowbell. The split bell wants nine-and-nine from the walk and a tenth strike from inside the step. A button folds the view. The reward is a clapper shard, and Memory Tide if Tide has been spoken.
   - Temporal Sight spends a charge and, for eight steps, shows another hour of the room you are in: a second bell, two stamps, an older cut, a shadow that arrives first. Dismiss puts the picture away. The journal keeps the clue. It does not press the puzzle.
   - After the bell, the far dock opens onto Mistwater Crossing. Hale says the ferry left at nine. Tamsin says ten. Hear them both, or look twice and then record the window. The contradiction is not explained.
   - Under the station, the Twice-Kept Hold wants flame, then tide, then stone. If the Warden fell, stone, stone, flame also opens it. Sight and the chalk show the cut. They do not turn the plate. Past the plate: lanterns, then the Late Ferryman. Ask which departure if you spared the Warden or recorded both hours, once he is under two fifths. Or end the boarding. The high road opens either way. The water beyond it does not.
   - Change a trade at the Wick, Bram's stall, the station, the high gate, the ridge, or the berth, when no fight is open. Wayfinder, Elementalist (after the conduits), Riverward (after the plate). Your breath, gold, and pack stay put. Double Wake wants Echo Lash twice and the crossing finished. Skywright is Sera's kit. You cannot take it.
   - The atlas travels only to places you have already walked. The dashed road into open sky is still not a boat.
   - After the hour is kept, the berth has a first heading one step east of the pad. Pin the roads from the walk and the gap from inside the step. Take the roads you know, or the gap. Neither is cleaner. No companion is required. Then the Sky Atlas is a bounded chart: A or Left is west, D or Right is east. Land only on a pad. Note Cinderwatch before it will take the hull. The deck can hold the company. The cold stair wants ash, salt, ember. The draft at the bottom is one fight. The rail home does not wait on it. Dragoon stays shut.
   - After the ferryman, the high gate opens onto Skyweave Ridge. Ada keeps the mill. Sera asks you to finish a hot splice or lash the safer stay. If four are already walking, she waits at the rig. Party, on a quiet map, can send someone to the rig and call them back. Their kit stays theirs.
   - The Early Glass wants the chart from the walk and the sky from inside the step. Sight shows the eclipse ahead of the sun. It does not press the lens. Ask the Galekeeper which noon, if you kept a reason to ask, or end the wind. The berth opens either way.
   - The First Stay flies from the berth to the Vale roof, and back. Pick the other pad and cast off. It is a route. After one flight you may note a shadow that leaves first. It is not explained.
   - After one flight, if Kael already answered Pell, Glasspine and the Vale well remember the walk in two orders. Keep the words, or put the living person inside the promise. The first choice stays. Neither answer is the cleaner oath.
   - After one flight, if Nessa already answered the stone, the Reach is wet out of season and Lowbell runs uphill. Meet Lark. Set the dry order from the walk and the wet order from inside the step. Let the older water work, or give the channel the verse already arriving. The first rhyme stays. Sight shows the water. It does not press it.
   - The Vale hearth can hear a few pairs once those hours are answered. If Iri walks with you, she can read an earlier hour, and Veilstep stays hers. If she kept the veil, the Margin still has a thread. Hearing it does not recruit her.
   - When both the oath and the spring are answered, Lowbell's spring mouth can hold them. Read the oath from the walk and the verse from the other view, then set the mouth. Nobody has to be recruited for that.
   - Jobs and arts, from the sidebar, lists the kits that exist, with costs. Later jobs cannot be taken. Veilwalker is Iri's, not a coat. A close line and a loose line are chosen from Party, not during a fight.
10. Settings holds mute, text size, captions, reduced motion, contrast, export, import, and reset.

**Move:** WASD or arrows, or the on-screen pad. A gamepad d-pad steps; the south button acts. **Act:** E, Enter, or Act. **Battle:** Attack, Magic, Defend, Sidestep, Item. **Ascension** (after the conduits): WASD inside the ring, F or Cast, Q to dodge. Standing close hits harder. **Switch** spends the turn and keeps HP, intent, and the dice. Tab switches on your turn. **Sight:** the sidebar button, after the conduits.

Saves from the first chapter still open. They gain the new fields without losing the Warden choice.

## Develop

```bash
npm ci
npm run dev        # http://127.0.0.1:8080 when run locally
npm run typecheck
node --experimental-strip-types --test src/game/core/combat.test.ts src/game/core/expanses.test.ts src/game/core/crossing.test.ts src/game/core/skyweave.test.ts src/game/core/unwritten.test.ts src/game/core/hours.test.ts src/game/core/opensky.test.ts
npm run build      # skips the database step when DATABASE_URL is unset
```

`npm test` also runs the app platform checks. The game contract is those test files. `scripts/hours-smoke.mjs` plays the title, a new journey, a step, an interaction, Attack, and one optional oath on the Pages build. `scripts/opensky-smoke.mjs` plays the title and a new journey, then a labeled pre-heading fixture — not a full campaign playthrough — and from there flies, lands, reloads, and returns. GitHub Actions installs Chromium for that smoke and uploads desktop and 390px screenshots. `scripts/game-launch-smoke.mjs` still checks that a new journey reaches the Vale when you run it yourself.

GitHub Actions (`.github/workflows/ci.yml`) installs, typechecks, runs those tests, builds, checks the Pages CSS, and runs the browser smoke. No database URL is required.

Saves live in `localStorage` under `eotn.save.v1`. No account, no server, no API key.


## Play on GitHub Pages (static React)

The public game can be built as a standalone React site at `https://michaelwave369.github.io/EchoesOfTheNine/` using `.github/workflows/deploy-pages.yml`. This is a **separate Vite build**, so the existing Grok/TanStack preview is not replaced.

1. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions** (once per repository).
2. Merge the GitHub Pages deployment PR into `main`. Each future push to `main` automatically builds and deploys the latest playable game.
3. Follow the workflow's deployment link or open `https://michaelwave369.github.io/EchoesOfTheNine/`.

Local commands:

```bash
npm ci
npm run dev:pages           # standalone browser entry, typically http://localhost:5173/EchoesOfTheNine/
npm run build:pages         # writes dist-pages/
npm run preview:pages
```

The Pages build has no server runtime, login, API key, or database. It imports the canonical `GameApp` and shares the existing combat, story and save code with Grok's build. GitHub Pages requires internet access to load the page, but after loading, the game itself is local-first; its saves stay in the browser's `localStorage`.

**Save migration between URLs:** browser storage is separated by origin. Export the chronicle from the previous preview using **Settings → Export**, then open the Pages URL and use **Settings → Import**. Existing schema migrations still apply; the deployment does not automatically transfer another site's saves.

**Custom domain:** the Vite build defaults to `/EchoesOfTheNine/`. If deploying to a root-domain URL later, set `PAGES_BASE_PATH=/` for the Pages build and configure the GitHub Pages custom domain separately. Do not repoint an unrelated Φ369 Labs site by mistake.

## Deploy

This app builds with `npm run build`. The migrator exits cleanly when `DATABASE_URL` is absent, which is the intended configuration: nothing in the game is stored on a server. Publish the build output with the host you already use for this workspace. Do not add accounts to make saves "cloud." Export and import from Settings is the portable chronicle.

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md), [GAMEPLAY_STATUS.md](GAMEPLAY_STATUS.md), [ROADMAP.md](ROADMAP.md), and [src/game/AGENTS.md](src/game/AGENTS.md).

Canonical remote: `https://github.com/MichaelWave369/EchoesOfTheNine`.

## License of this prototype

Original characters, names, and prose. Procedural art and synthesized audio only — no third-party sprites, no franchise likenesses. Code in this slice is the prototype source for Φ369 Labs.
