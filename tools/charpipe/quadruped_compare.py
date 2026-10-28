"""Silhouette and colour comparison of quadruped renders (quadruped_render.py) against the user's references.
Both silhouettes are cropped to their bounding boxes and resampled to the reference box, so the framing of
the picture does not count; the box aspect ratio (length / height) is reported apart.

  python -I tools/charpipe/quadruped_compare.py <character.json> <label> <render dir> [<render dir> ...]

Writes <character dir>/build/review/<label>-<view>.png (reference | model | overlay: red = missing,
blue = extra) and <label>-review.json. Reference mask = pixels far from the grey background (closed, not
hole-filled); saved to build/masks/<view>.png.
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

cfg_path = Path(sys.argv[1]).resolve(); label = sys.argv[2]; dirs = [Path(d).resolve() for d in sys.argv[3:]]
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); base = cfg_path.parent
rv = base / 'build' / 'review'; rv.mkdir(parents=True, exist_ok=True)


def ref_mask(img):
    a = np.asarray(img.convert('RGB')).astype(float)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(border, 0)
    m = (np.abs(a - bg).max(2) > 45).astype(np.uint8) * 255
    # closing only: filling holes would also fill the background enclosed by the legs and the contact shadow
    im = Image.fromarray(m).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    return np.asarray(im) > 127


def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fit(m, box, size):
    return np.asarray(Image.fromarray(m[box[1]:box[3], box[0]:box[2]].astype(np.uint8) * 255).resize(size, Image.NEAREST)) > 127


def fit_rgb(img, box, size):
    return np.asarray(img.convert('RGB').crop(box).resize(size, Image.BILINEAR)).astype(float)


md = base / 'build' / 'masks'; md.mkdir(parents=True, exist_ok=True)
for view, rel in cfg['references'].items():   # used by quadruped_bake.py
    Image.fromarray(ref_mask(Image.open(base / rel)).astype(np.uint8) * 255).save(md / f'{view}.png')
report = {'label': label, 'models': {}}
for d in dirs:
    res = {}
    for view, rel in cfg['references'].items():
        if not (d / f'{view}.png').exists():
            continue
        ref = Image.open(base / rel); rm = ref_mask(ref); rb = bbox(rm); size = (rb[2] - rb[0], rb[3] - rb[1])
        mm = np.asarray(Image.open(d / f'{view}-mask.png'))[:, :, 3] > 127; mb = bbox(mm)
        r, m = fit(rm, rb, size), fit(mm, mb, size)
        iou = float((r & m).sum() / (r | m).sum())
        rc, mc = fit_rgb(ref, rb, size), fit_rgb(Image.open(d / f'{view}.png'), mb, size)
        both = r & m; dc = np.abs(rc - mc).max(2)[both]
        aspect_ref = size[0] / size[1]; aspect_model = (mb[2] - mb[0]) / (mb[3] - mb[1])
        res[view] = {'iou': round(iou, 3), 'aspect_ref': round(aspect_ref, 3), 'aspect_model': round(aspect_model, 3),
                     'color_mean_abs': round(float(dc.mean()), 1), 'color_over30_pct': round(float((dc > 30).mean() * 100), 1),
                     'mean_rgb_ref': rc[r].mean(0).round(1).tolist(), 'mean_rgb_model': mc[m].mean(0).round(1).tolist()}
        ov = np.full((size[1], size[0], 3), 235, np.uint8); ov[r & m] = (90, 90, 90); ov[r & ~m] = (220, 40, 40); ov[~r & m] = (40, 80, 220)
        panel = Image.new('RGB', (size[0] * 3 + 20, size[1] + 30), 'white')
        for i, im in enumerate((rc.astype(np.uint8), mc.astype(np.uint8), ov)):
            panel.paste(Image.fromarray(im), (i * (size[0] + 10), 30))
        ImageDraw.Draw(panel).text((5, 8), f'{d.name} {view}: IoU {iou:.3f}  aspect ref {aspect_ref:.2f} / model {aspect_model:.2f}', fill='black')
        panel.save(rv / f'{label}-{d.name}-{view}.png')
    report['models'][d.name] = res
(rv / f'{label}-review.json').write_text(json.dumps(report, indent=1))
print(json.dumps(report['models'], indent=1))
