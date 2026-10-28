"""Robust Weight Transfer, headless: body skin weights -> clothing/accessory vertices.

Add-on by sentfromspacevr (GPL-3, github.com/sentfromspacevr/robust-weight-transfer), algorithm of
"Robust Skin Weights Transfer via Weight Inpainting" (Abdrashitov et al., SIGGRAPH Asia 2023).
A production tool like the Mixamo Rig add-on: nothing of it ships in the game.

Setup (once, ~50 MB of wheels, 207 MB unpacked, all on D:): release zip unpacked in RWT_DIR, then
  set PYTHONUSERBASE=%RWT_DIR%/deps & <blender>/5.2/python/bin/python.exe -m pip install --user
      --break-system-packages -c constraints.txt scipy libigl==2.6.1 robust_laplacian==1.0.0
(constraints.txt pins numpy to Blender's). available() is False without it; callers keep their old method.

Each target vertex takes the weights of the closest source surface point when it is near enough
and the normals agree (either side: pads face the skin with their inner shell); the rest is
inpainted by a smooth (bi-Laplacian) solve over the target points. Lunia limits: <= `limit` bones.
"""
import os, site, sysconfig, importlib.util
import numpy as np
from pathlib import Path

DIR = Path(os.environ.get('RWT_DIR', 'D:/Tools/rwt-src/robust-weight-transfer-libigl26'))
_mod = None


def _load():
    global _mod
    if _mod is None:
        site.addsitedir(sysconfig.get_paths(sysconfig.get_preferred_scheme('user'), vars={'userbase': str(DIR / 'deps')})['purelib'])
        spec = importlib.util.spec_from_file_location('rwt_weighttransfer', DIR / 'weighttransfer.py')
        _mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(_mod)
    return _mod


def available():
    try:
        _load(); return True
    except Exception as e:   # missing add-on or wheels
        print('RWT unavailable:', e)
        return False


def _arrays(o, idx=None):
    me = o.data; me.calc_loop_triangles(); mw = np.array(o.matrix_world)
    v = np.empty((len(me.vertices), 3)); me.vertices.foreach_get('co', v.ravel())
    n = np.empty((len(me.vertices), 3)); me.vertices.foreach_get('normal', n.ravel())
    t = np.empty((len(me.loop_triangles), 3), np.int64); me.loop_triangles.foreach_get('vertices', t.ravel())
    v = v @ mw[:3, :3].T + mw[:3, 3]; n = n @ np.linalg.inv(mw[:3, :3])
    if idx is not None:
        idx = np.asarray(sorted(idx)); remap = -np.ones(len(v), np.int64); remap[idx] = np.arange(len(idx))
        t = remap[t]; t = t[(t >= 0).all(1)]; v, n = v[idx], n[idx]
    return np.ascontiguousarray(v), np.ascontiguousarray(t), np.ascontiguousarray(n, np.float32)


def transfer(src, dst, idx, bones, max_dist=.05, max_angle=35, limit=2):
    """Weights for dst vertices `idx` from src's groups `bones`: {vertex index: [(bone, w), ...]}, stats."""
    m = _load(); idx = sorted(idx)
    bones = [b for b in bones if b in src.vertex_groups]
    gi = {src.vertex_groups[b].index: k for k, b in enumerate(bones)}
    W1 = np.zeros((len(src.data.vertices), len(bones)))
    for v in src.data.vertices:
        for g in v.groups:
            if g.group in gi: W1[v.index, gi[g.group]] = g.weight
    V1, F1, N1 = _arrays(src); V2, F2, N2 = _arrays(dst, idx)
    matched, W2 = m.find_matches_closest_surface(V1, F1, N1, V2, N2, W1, max_dist ** 2, max_angle, True)
    W2 = m.inpaint(V2, F2, W2, matched, True)
    W2 = np.clip(np.asarray(W2, np.float64), 0, None)
    out = {}
    for i, row in zip(idx, W2):
        top = np.argsort(-row)[:limit]; w = row[top]; s = w.sum()
        out[i] = [(bones[k], x / s) for k, x in zip(top, w) if s > 0 and x / s > 1e-4] if s > 0 else []
    return out, {'vertices': len(idx), 'matched': round(float(matched.mean()), 3)}
