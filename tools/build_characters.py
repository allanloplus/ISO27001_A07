"""從角色設定圖裁出表情包，去白底後輸出成動畫用的 WebP 圖層。
用法：python3 tools/build_characters.py   （需 pip install pillow numpy scipy）
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source")
OUT = os.path.join(ROOT, "assets", "chars")
H = 320  # 輸出高度（px）

# (檔名, 來源圖, 裁切框 left, top, right, bottom)
def allan_box(cx, top):
    return (cx - 182, top, cx + 182, top + 332)

ALLAN = {
    "smile":    allan_box(895, 790),  "laugh":  allan_box(1200, 790),
    "think":    allan_box(1505, 790), "confused": allan_box(1817, 790),
    "wow":      allan_box(895, 1135), "point":  allan_box(1205, 1135),
    "wink":     allan_box(1510, 1135), "talk":  allan_box(1815, 1135),
}
COLS = [(433, 800), (820, 1185), (1207, 1572), (1590, 1957)]
ROWS = [(802, 1118), (1138, 1455)]
def arale_box(c, r, inset=9):
    (l, rr), (t, b) = COLS[c], ROWS[r]
    return (l + inset, t + inset, rr - inset, b - inset)

ARALE = {
    "laugh": arale_box(0, 0), "think": arale_box(1, 0), "wow": arale_box(2, 0), "confused": arale_box(3, 0),
    "talk":  arale_box(0, 1), "cry":   arale_box(1, 1), "wink": arale_box(2, 1), "excited": arale_box(3, 1),
}


def cutout(img, box):
    im = img.crop(box).convert("RGB")
    a = np.asarray(im).astype(int)
    whiteish = (a.min(axis=2) > 222) & ((a.max(axis=2) - a.min(axis=2)) < 35)
    lab, _ = ndimage.label(whiteish)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    sizes = ndimage.sum(whiteish, lab, range(1, lab.max() + 1))
    big = [i + 1 for i, v in enumerate(sizes) if v > 900]  # 手臂與頭之間的大塊空白也去掉，眼白等小區塊保留
    bg |= np.isin(lab, big)
    fg = ~bg
    lab2, n = ndimage.label(fg)
    if n > 1:  # 只留主體，去掉鄰格殘邊
        sizes = ndimage.sum(fg, lab2, range(1, n + 1))
        fg = lab2 == (1 + int(np.argmax(sizes)))
    fg = ndimage.binary_erosion(fg, iterations=1)
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for who, table, sheet in (("allan", ALLAN, "allan_sheet.jpg"), ("arale", ARALE, "arale_sheet.jpg")):
        img = Image.open(os.path.join(SRC, sheet))
        for name, box in table.items():
            im = cutout(img, box)
            w = round(im.width * H / im.height)
            im.resize((w, H), Image.LANCZOS).save(os.path.join(OUT, f"{who}_{name}.webp"), quality=88, method=6)
    print("done", sorted(os.listdir(OUT)))

main()
