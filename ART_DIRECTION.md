# Art direction

Echoes of the Nine is an original science-fantasy JRPG. The picture is 16-bit in spirit and modern in the frame: readable shapes, warm lanternlight, twilight skies, and a little cosmic quiet. It is not photoreal, and it is not a set of unrelated mockups.

## Palette

- Ink and violet night: `#140e18`, `#241830`
- Amber lanterns: `#e8b15a`, `#f3d7a1`
- Teal sight and water: `#4ec8c0`
- Deep violet crystal: `#8b6bb8`
- Parchment text: `#f3e6c8`
- Moss, when the wood is the subject: `#7d9a62`

Type stays Fraunces for titles and Source Sans 3 for the road. Buttons stay large enough to tap. High contrast and reduced motion already exist in Settings; motion in the picture must honor both.

## What a region should feel like

| Place | Picture |
|---|---|
| Lantern Vale | Night festival. Clock, warm windows, bunting, lantern posts. |
| Glasspine | Dark trees with crystal tips. |
| First Prism | Violet stone, a teal ring, a standing crystal. |
| Hollowwood | Moss, old growth, dim air. |
| Cantor's Barrow | A mound and a shut song. |
| Lowbell | Worn stone, a bell, a river, dock posts. |
| Mistwater | Fog, still water, a station roof. |
| Twice-Kept Hold | Flood and a few honest lanterns. |
| High road | Pale stair above the mist. |
| Skyweave Ridge | Height, a mill, a rope span, wind. |
| Early Glass | Observatory violet and a dome. |
| Wind Pocket | Dark stone, a shine only after Sight. |
| Skyweave berth | A pad and a small hull. |

Open sky stays a locked mark. Do not paint it as a place you can walk.

## How to extend it

Presentation lives in [src/game/ui/art.ts](src/game/ui/art.ts). Add a `RegionLook` and, if the place needs a silhouette, a branch in `paintLandmarks`. Do not move collision, exits, or rewards into that file. Sprites are drawn figures, not image files, so GitHub Pages does not need an asset pipeline.

Labels on the map appear when you stand next to a thing, point at it, or it is a way out. Do not put a permanent caption on every tile.

Temporal Sight is a teal wash, a slow scan, and a small clock. It shows. It does not solve.

The First Stay is a route between two pads. Draw the hull. Do not draw an open skybox.

Future chapters should reuse the same palette, the same figure language, and the same rule: the picture may glow, and the chronicle still decides what happened.
