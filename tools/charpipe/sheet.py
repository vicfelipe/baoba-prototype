"""Tile build/renders/<prefix>*.png into one contact sheet (review aid).
  blender -b --python tools/charpipe/sheet.py -- SourceArt/<Char>/build/renders clip- 5"""
import bpy, sys, numpy as np
from pathlib import Path
a = sys.argv[sys.argv.index('--') + 1:]; d = Path(a[0]).resolve(); prefix = a[1]; cols = int(a[2])
files = sorted(f for f in d.glob(prefix + '*.png'))
ims = []
for f in files:
    im = bpy.data.images.load(str(f)); w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    ims.append(px.reshape(h, w, 4)[::2, ::2]); bpy.data.images.remove(im)
h, w = ims[0].shape[:2]; rows = -(-len(ims) // cols)
sheet = np.ones((rows * h, cols * w, 4), np.float32)
for i, im in enumerate(ims):
    r, c = divmod(i, cols); sheet[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = im
out = bpy.data.images.new('sheet', cols * w, rows * h); out.pixels.foreach_set(sheet.ravel())
out.filepath_raw = str(d / f'sheet-{prefix.strip("-")}.png'); out.file_format = 'PNG'; out.save()
print('SHEET', [f.stem for f in files])
