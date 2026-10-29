# Echoes of the Nine

A browser science-fantasy JRPG from Φ369 Labs. This repository is the playable vertical slice **The Crystal Awakening**, plus the data contracts for the larger saga.

Public pitch: an old-school fantasy RPG you can step inside. Command a classic battle, or move inside the same fight. The late chronicle is not on the title screen, and it should stay that way.

## Play

The preview runs in the browser. Keyboard and buttons complete the whole chapter. A headset is optional and is not required.

1. **New Journey.** Name yourself.
2. Walk Lantern Vale. Speak to the clock (it strikes ten at 9:09) and to Nim.
3. Recruit Mira at the east lanterns. A shardling interrupts the square.
4. East into Glasspine. Recruit Kael. Clear the flicker.
5. In the shrine, set the rune wall to Flame, Stone, Tide. Turn the conduit ring until it rests on Tide.
6. Face the Crystal Warden. **Offer mercy** after Stoneguard and Tide Whisper, or fight it down.
7. Settings holds mute, text size, captions, reduced motion, contrast, export, import, and reset.

**Move:** WASD or arrows, or the on-screen pad. **Act:** E, Enter, or Act. **Battle:** Attack, Magic, Defend, Item. **Ascension** (after the conduits): WASD inside the ring, F or Cast, Q to dodge. **Switch** spends the turn and keeps HP, intent, and the dice. Tab switches on your turn.

## Develop

```bash
npm run dev        # preview
npm run typecheck
npm test           # includes the combat core and a scripted chapter
npm run build
```

Saves live in `localStorage` under `eotn.save.v1`. No account, no server, no API key.

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md), [GAMEPLAY_STATUS.md](GAMEPLAY_STATUS.md), [ROADMAP.md](ROADMAP.md), and [AGENTS.md](AGENTS.md).

Canonical remote, when source has been exported: `https://github.com/MichaelWave369/EchoesOfTheNine`.

## License of this prototype

Original characters, names, and prose. Procedural art and synthesized audio only — no third-party sprites, no franchise likenesses. Code in this slice is the prototype source for Φ369 Labs.
