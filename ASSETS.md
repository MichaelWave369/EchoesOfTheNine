# Assets

All pictures in `public/game/art` are original work made for Echoes of the Nine by Φ369 Labs. They are not ripped from another game, and they are not loaded from a remote image host.

| File | What it is |
|---|---|
| `wanderer.png`, `mira.png`, `kael.png`, `nessa.png`, `sera.png` | Four-direction walk sheets. Rows: toward you, west, east, away. |
| `villagers.png` | Nine standing Vale and road people. |
| `foes.png` | Nine battle creatures, including the larger guardians. |
| `tiles.png` | Sixteen ground materials: cobble, dirt, grass, wood, shrine stone, ridge stone, water, roof, garden. |
| `house.png`, `clock.png`, `stall.png`, `well.png`, `lantern.png`, `pine.png` | Vale and roadside stamps. |
| `skiff.png` | The First Stay. |
| `vale-night.jpg` | Title painting of the festival, cropped so the HTML title stays the headline. |
| `battle-vale.jpg`, `battle-woods.jpg`, `battle-shrine.jpg`, `battle-mist.jpg`, `battle-ridge.jpg`, `battle-ascent.jpg`, `battle-margin.jpg` | Battle plates. One painted field per region family, plus the ascent ring and the Margin. Display only. |

Type on the page is Fraunces and Source Sans 3, already loaded as web fonts. No other third-party type or sprite set is used.

The packer that cut the sheets lives at `scripts/pack-living-canvas.py`. It only keys and aligns. It does not invent the pictures. If a frame is missing at runtime, the map falls back to the drawn figures in `art.ts`.

License for this original art: the same terms as the game repository. Do not replace these files with franchise sprites.
