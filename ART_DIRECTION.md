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
| The Margin | Paper violet, two pages, a well, a stair that is not a country. |

Open sky stays a locked mark. Do not paint it as a place you can walk.

## How to extend it

Presentation lives in [src/game/ui/art.ts](src/game/ui/art.ts) and [src/game/ui/sprites.ts](src/game/ui/sprites.ts). Add a `RegionLook` and, if the place needs a silhouette, a stamp in `stampsFor` or a branch in `paintLandmarks`. Do not move collision, exits, or rewards into those files.

Characters and tiles are original frames in `public/game/art`. See [ASSETS.md](ASSETS.md). A missing sheet falls back to the drawn figure so a slow load does not blank the road. `imageSmoothingEnabled` stays off while a frame is copied, so the pixels stay crisp.

Walk sheets are four rows: toward you, west, east, away. Columns are stand, left foot, stand, right foot. Battle poses reuse those columns: attack, hurt, cast, and a small victory bob. They read the last combat event. They do not roll damage.

A fight is a painted plate, not a diagram. Vale, woods, shrine, mist, ridge, and the ascent each have their own backdrop. Legacy stages the party on the left and the foes on the right so sprites do not stack. Ascension still projects the real ring. Floating numbers and tints come from the last combat event. They are not a second damage roll. A spared or finished fight can say the light holds. A fall says you wake. Reduced motion skips the streaks, the bob, and the camera glide.

On the road, an optional close view follows the wanderer. Whole map puts the frame back. The follow is not saved. Collision and the tile you stand on do not move. Neighboring ground tiles pick a material from a stable jitter so the road is not a checker. Lanterns, water, mist, and a ring when you can speak are presentation. Reduced motion holds them still.

Dialogue portraits are large, and a few words in the line already spoken can warm or dim the face. That is a filter. It is not new story.

The wanderer's cloak can be lantern, festival, river, or ridge. That is a dye. It is not a job. Old chronicles without the field become lantern. Schema stays 4.

The walk glides between tiles. The integer square is still the one that collides, speaks, and starts a fight. Festival extras walk short loops that do not sit on a required person, the well, or the lantern-crash square. Quiet world, in Settings, parks them. Reduced motion parks them and skips the glide.

Labels on the map appear when you stand next to a thing, point at it, or it is a way out. Do not put a permanent caption on every tile.

Temporal Sight is a teal wash, a ghost a step off the wanderer, a slow scan, and a step count. It shows. It does not solve. Reduced motion holds the wash still and skips the ghost bob.

The First Stay is a route. Two pads until the hour is written, then a third: the Margin. The hull is a drawn skiff. Departure waits a short beat, then the chronicle still calls `flyTo`. Reduced motion casts off at once. Do not draw an open skybox.

The Margin reuses the ridge stone family and the glass music bed. Landmarks are two pages, a well, and a shine that appears only after the echo is traced. Iri on the road uses the wanderer walk sheet turned violet. She is not a new villager stamp. Inklings and the Hourkeeper are drawn in the battle, not borrowed from the galekeeper. Their plate is `battle-margin.jpg`. The picture still does not open the well.

Future chapters should reuse the same palette, the same frame language, and the same rule: the picture may glow, and the chronicle still decides what happened.

