"""Zoomed crop of a reference with a labelled pixel grid, for measuring details by eye.
  blender -b --python tools/charpipe/crop.py -- <image> <x0> <y0> <x1> <y1> <scale> <out.png>  (y from the top)"""
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
src, x0, y0, x1, y1, k, out = a[0], *map(int, a[1:6]), a[6]
im = bpy.data.images.load(src); w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
img = px.reshape(h, w, 4)[::-1][y0:y1, x0:x1]
big = img.repeat(k, 0).repeat(k, 1).copy()
for y in range(y0, y1):
    if y % 10 == 0: big[(y - y0) * k, :, :3] = [0, .8, 1] if y % 50 else [1, 0, 0]
for x in range(x0, x1):
    if x % 10 == 0: big[:, (x - x0) * k, :3] = [0, .8, 1] if x % 50 else [1, 0, 0]
o = bpy.data.images.new('crop', big.shape[1], big.shape[0]); o.pixels.foreach_set(big[::-1].ravel())
o.filepath_raw = out; o.file_format = 'PNG'; o.save()
