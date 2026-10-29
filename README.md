# Echoes of the Nine

A browser science-fantasy JRPG from Φ369 Labs. Playable now: **The Crystal Awakening** and the road beyond it, **Hollowwood Reach**. The late chronicle is not on the title screen, and it should stay that way.

Public pitch: an old-school fantasy RPG you can step inside. Command a classic battle, or move inside the same fight.

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
9. Settings holds mute, text size, captions, reduced motion, contrast, export, import, and reset.

**Move:** WASD or arrows, or the on-screen pad. A gamepad d-pad steps; the south button acts. **Act:** E, Enter, or Act. **Battle:** Attack, Magic, Defend, Sidestep, Item. **Ascension** (after the conduits): WASD inside the ring, F or Cast, Q to dodge. Standing close hits harder. **Switch** spends the turn and keeps HP, intent, and the dice. Tab switches on your turn. **Sight:** the sidebar button, after the conduits.

Saves from the first chapter still open. They gain the new fields without losing the Warden choice.

## Develop

```bash
npm ci
npm run dev        # http://127.0.0.1:8080 when run locally
npm run typecheck
node --experimental-strip-types --test src/game/core/combat.test.ts
npm run build      # skips the database step when DATABASE_URL is unset
```

`npm test` also runs the app platform checks. The game contract is the combat test file above.

GitHub Actions (`.github/workflows/ci.yml`) installs, typechecks, runs those tests, and builds. No database URL is required.

Saves live in `localStorage` under `eotn.save.v1`. No account, no server, no API key.

## Deploy

This app builds with `npm run build`. The migrator exits cleanly when `DATABASE_URL` is absent, which is the intended configuration: nothing in the game is stored on a server. Publish the build output with the host you already use for this workspace. Do not add accounts to make saves "cloud." Export and import from Settings is the portable chronicle.

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md), [GAMEPLAY_STATUS.md](GAMEPLAY_STATUS.md), [ROADMAP.md](ROADMAP.md), and [src/game/AGENTS.md](src/game/AGENTS.md).

Canonical remote: `https://github.com/MichaelWave369/EchoesOfTheNine`.

## License of this prototype

Original characters, names, and prose. Procedural art and synthesized audio only — no third-party sprites, no franchise likenesses. Code in this slice is the prototype source for Φ369 Labs.
