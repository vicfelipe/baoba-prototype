"""How much do the reference views agree with each other? Upper bound for any single 3D model.
  blender -b --python tools/charpipe/ref_consistency.py -- SourceArt/<Char>/character.json"""
import sys, json, numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; cfg = ROOT / sys.argv[sys.argv.index('--') + 1]
M = json.loads((cfg.parent / 'build/measure.json').read_text()); C = M['calibration']; OUT = cfg.parent / 'build/masks'


def metric(view, mirror=False, step=.0025):
    """Resample a mask onto a (z, h) metre grid; h = horizontal body axis of that view."""
    c = C[view]; m = np.load(OUT / f'{view}.npy'); height = M['height_m']; zs = np.arange(0, height * 1.01, step); hs = np.arange(-height, height, step)
    sgn = {'front': 1, 'back': -1, 'right': -1, 'left': 1}[c['faces']]
    if mirror:
        sgn = -sgn
    rows = np.clip((c['sole_px'] - zs * c['px_per_m']).astype(int), 0, m.shape[0] - 1)
    cols = np.clip((c['centre_px'] + sgn * hs * c['px_per_m']).astype(int), 0, m.shape[1] - 1)
    return m[rows][:, cols]


def iou(a, b):
    return round(float((a & b).sum() / (a | b).sum()), 4)


res = {'side_left_vs_side_right': iou(metric('side_left'), metric('side_right')),
       'front_vs_back_mirrored': iou(metric('front'), metric('back'))}
print('REF_CONSISTENCY', json.dumps(res))
(cfg.parent / 'build/review').mkdir(exist_ok=True)
(cfg.parent / 'build/review/ref-consistency.json').write_text(json.dumps(res, indent=1))
