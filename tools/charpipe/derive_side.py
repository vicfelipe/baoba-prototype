"""Derive a side view consistent with the opposite one.

  blender -b --python tools/charpipe/derive_side.py -- SourceArt/<Char>/character.json side_left side_right

Generated turnarounds can disagree between the two side views (lean, proportions). The
target view is rebuilt from the mirrored source view, resampled into the target's own
calibration, and only what exists on the target side alone is transplanted from the
original target picture: pixels of `transplant` regions (saturated accessory colours inside
a z band and, optionally, a y window). Originals stay in references/; the derived picture
goes to references/derived/ and character.json points the view at it (the original path
is kept in "references_original").
"""
import bpy, sys, json, colorsys
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
a = sys.argv[sys.argv.index('--') + 1:]
cfg_path = ROOT / a[0]; target, source = a[1], a[2]
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); cdir = cfg_path.parent
M = json.loads((cdir / 'build/measure.json').read_text(encoding='utf-8'))
orig = cfg.get('references_original', dict(cfg['references']))


def load(path):
    im = bpy.data.images.load(str(path)); w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px); bpy.data.images.remove(im)
    return px.reshape(h, w, 4)[::-1, :, :3].copy()  # row 0 = top


def save(path, rgb):
    h, w = rgb.shape[:2]; im = bpy.data.images.new(path.stem, w, h)
    px = np.ones((h, w, 4), np.float32); px[..., :3] = np.clip(rgb[::-1], 0, 1)
    im.pixels.foreach_set(px.ravel()); im.filepath_raw = str(path); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)


T = load(cdir / orig[target]); S = load(cdir / orig[source])
ct, cs = M['calibration'][target], M['calibration'][source]
# Measured calibrations are those of the originals; undo a previous alignment shift.
c_t = ct['centre_px'] - (-1 if ct['faces'] == 'right' else 1) * ct.get('aligned_shift_m', 0) * ct['px_per_m']
st = -1 if ct['faces'] == 'right' else 1          # picture x = c + st * y * ppm
ss = -1 if cs['faces'] == 'right' else 1
h, w = T.shape[:2]
rows, cols = np.mgrid[0:h, 0:w].astype(np.float32)
z = (ct['sole_px'] - rows) / ct['px_per_m']; y = (cols - c_t) / ct['px_per_m'] * st
# Mirror: the source shows the other side; the same body point (x -> -x) has the same (y, z).
sr = cs['sole_px'] - z * cs['px_per_m']; sc = cs['centre_px'] + ss * y * cs['px_per_m']


def bilinear(img, r, c):
    r = np.clip(r, 0, img.shape[0] - 1.001); c = np.clip(c, 0, img.shape[1] - 1.001)
    r0 = r.astype(int); c0 = c.astype(int); fr = (r - r0)[..., None]; fc = (c - c0)[..., None]
    return (img[r0, c0] * (1 - fr) * (1 - fc) + img[r0 + 1, c0] * fr * (1 - fc) + img[r0, c0 + 1] * (1 - fr) * fc + img[r0 + 1, c0 + 1] * fr * fc)


out = bilinear(S, sr, sc)
# Transplant regions exclusive to the target side.
mx, mn = T.max(2), T.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
colored = (sat > .42) & (mx > .28)
mask = np.zeros((h, w), bool)
for reg in cfg['build'].get('derive', {}).get(target, {}).get('transplant', []):
    band = (z >= reg['z'][0]) & (z <= reg['z'][1])
    if 'y' in reg:
        band &= (y >= reg['y'][0]) & (y <= reg['y'][1])
    mask |= band & colored
for _ in range(cfg['build'].get('derive', {}).get(target, {}).get('grow_px', 2)):  # take the drawn outline too
    g = mask.copy(); g[1:] |= mask[:-1]; g[:-1] |= mask[1:]; g[:, 1:] |= mask[:, :-1]; g[:, :-1] |= mask[:, 1:]; mask = g
out[mask] = T[mask]
dst = cdir / 'references' / 'derived' / f'{target.replace("_", "-")}-consistent.png'; dst.parent.mkdir(parents=True, exist_ok=True)
save(dst, out)
save(dst.with_name(dst.stem + '-mask.png'), np.repeat(mask[..., None].astype(np.float32), 3, 2))
cfg.setdefault('references_original', orig)
cfg['references'][target] = str(dst.relative_to(cdir)).replace('\\', '/')
cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding='utf-8')
print('DERIVED', target, 'from mirrored', source, '| transplanted px', int(mask.sum()), '->', cfg['references'][target])
