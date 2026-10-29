"""Pack original Living Canvas sheets into transparent runtime PNGs.

Source frames are workspace generations (magenta JPEG). Output is original
game art under public/game/art. No third-party sprites.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
SRC = ROOT / "artifacts" / "imagine_images"
OUT = ROOT / "public" / "game" / "art"

SHEETS = {
    "wanderer.png": ("6c8e37d6-e954-4df0-9150-d9a3eb023f92.jpg", 4, 4),
    "mira.png": ("2a8a008c-59a8-4f4e-b43c-8830cee4a784.jpg", 4, 4),
    "kael.png": ("1661ebba-419d-4e07-8e1b-f700dd90e600.jpg", 4, 4),
    "nessa.png": ("e8cf028e-b2cf-4bb0-b801-0f4830e40d4b.jpg", 4, 4),
    "sera.png": ("0ca1c4b2-1cb1-4828-a1c1-baadada2bf20.jpg", 4, 4),
    "villagers.png": ("e6eb5761-f558-4628-aaa1-148998d1157f.jpg", 3, 3),
    "foes.png": ("df93eecf-2a5a-404e-bf9f-bc013983651b.jpg", 3, 3),
}

PROPS = {
    "clock.png": "12925b7c-f8e0-448c-af18-4231ccfc6a20.jpg",
    "house.png": "8995a744-7d05-4f10-8a7a-1565269fe10a.jpg",
    "stall.png": "a343c900-a151-466a-b960-74650886dd48.jpg",
    "well.png": "76f6e405-6e7c-41a2-8502-14fe118115fd.jpg",
    "lantern.png": "3fcd0e7d-dc93-4ed9-b130-7d539b6f8de1.jpg",
    "pine.png": "6e0aa6ca-37e4-465b-aba9-a9444a2246b3.jpg",
    "skiff.png": "9179048e-3561-4a91-9bd2-0e8bb1b18b60.jpg",
}

CELL = (96, 128)


def is_magenta(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    # JPEG magenta lands near (220, 8, 140), not pure #FF00FF.
    return (r > 145) & (b > 70) & (g < 110) & (r > g + 50) & (b > g + 30) & ((r + b) > (g * 3 + 80))


def key_array(im: Image.Image) -> np.ndarray:
    rgba = np.array(im.convert("RGBA"))
    rgb = rgba[:, :, :3]
    kill = is_magenta(rgb)
    # Eat one pixel of JPEG magenta fringe without a second library.
    grown = kill.copy()
    grown[1:] |= kill[:-1]
    grown[:-1] |= kill[1:]
    grown[:, 1:] |= kill[:, :-1]
    grown[:, :-1] |= kill[:, 1:]
    rgba[grown, 3] = 0
    return rgba


def bbox(alpha: np.ndarray, thresh: int = 24) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(alpha > thresh)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def slices(n: int, parts: int) -> list[tuple[int, int]]:
    edges = [round(i * n / parts) for i in range(parts + 1)]
    return list(zip(edges, edges[1:]))


def pack_sheet(src: Path, cols: int, rows: int, dest: Path) -> None:
    raw = key_array(Image.open(src))
    h, w = raw.shape[:2]
    cells: list[np.ndarray] = []
    heights: list[int] = []
    for r0, r1 in slices(h, rows):
        for c0, c1 in slices(w, cols):
            cell = raw[r0:r1, c0:c1]
            box = bbox(cell[:, :, 3])
            if not box:
                cells.append(cell[:1, :1])
                heights.append(1)
                continue
            x0, y0, x1, y1 = box
            crop = cell[y0:y1, x0:x1]
            cells.append(crop)
            heights.append(max(1, y1 - y0))
    usable = [n for n in heights if n > 8]
    target = int(np.median(usable)) if usable else 100
    cw, ch = CELL
    sheet = np.zeros((rows * ch, cols * cw, 4), dtype=np.uint8)
    for i, crop in enumerate(cells):
        col = i % cols
        row = i // cols
        chh, cww = crop.shape[:2]
        if chh < 2 or cww < 2:
            continue
        scale = min((ch - 16) / chh, (cw - 12) / cww, target / chh)
        scale = max(0.05, min(scale, 3))
        nw = max(1, int(cww * scale))
        nh = max(1, int(chh * scale))
        sprite = Image.fromarray(crop, "RGBA").resize((nw, nh), Image.Resampling.BOX)
        px = col * cw + (cw - nw) // 2
        py = row * ch + (ch - 8 - nh)
        sheet[py : py + nh, px : px + nw] = np.array(sprite)
    Image.fromarray(sheet, "RGBA").save(dest)
    print(dest.name, sheet.shape[1], sheet.shape[0])


def pack_prop(src: Path, dest: Path, max_side: int = 512) -> None:
    rgba = key_array(Image.open(src))
    box = bbox(rgba[:, :, 3], 16)
    if not box:
        raise SystemExit(f"empty prop {src}")
    x0, y0, x1, y1 = box
    crop = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")
    scale = min(1, max_side / max(crop.size))
    if scale < 1:
        crop = crop.resize((max(1, int(crop.width * scale)), max(1, int(crop.height * scale))), Image.Resampling.BOX)
    crop.save(dest)
    print(dest.name, crop.size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = Image.open(SRC / "553665c4-c046-4d79-8471-3397007644c3.jpg").convert("RGB")
    tiles = tiles.resize((512, 512), Image.Resampling.BOX)
    tiles.save(OUT / "tiles.png", optimize=True)
    print("tiles.png", tiles.size)
    night = Image.open(SRC / "46b3caec-34fe-4153-b22d-974dc9c6d597.jpg").convert("RGB")
    # The painting baked a headline into the sky. Keep the village, not the letters.
    cut = int(night.height * 0.36)
    night.crop((0, cut, night.width, night.height)).save(OUT / "vale-night.jpg", quality=84, optimize=True)
    print("vale-night.jpg", night.size)
    for name, (file, cols, rows) in SHEETS.items():
        pack_sheet(SRC / file, cols, rows, OUT / name)
    for name, file in PROPS.items():
        pack_prop(SRC / file, OUT / name)


if __name__ == "__main__":
    main()
