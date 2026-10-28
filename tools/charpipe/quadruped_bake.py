"""Paint a generated quadruped (TRELLIS mesh with its own UVs) with the user's references.

  blender -b <model.blend> --python tools/charpipe/quadruped_bake.py -- <character.json> <out.blend> [--sharp 4]

Every texel is placed in 3D (barycentric raster of the UV triangles) and coloured from the views that see it:
side_left on the left flank, the same picture mirrored on the right flank (the animal is symmetric), front on
the chest and the front of the flame. A view counts only where the texel is the nearest surface (depth buffer
of that view) and lands inside the eroded reference mask; weight = (normal . view)^sharp. Surfaces no picture
shows (rump, top, belly, inner legs) keep the generator's texture with its colour moved to the references'
palette by mean and deviation per region (flame / body). Masks come from quadruped_compare.py.
Side mapping: model box -> reference box (same aspect). Front mapping: scale from height, centred on the hooves
(the front picture is slightly turned, so its box includes the tail).
"""
import bpy, sys, json, colorsys
import numpy as np
from pathlib import Path

a = sys.argv[sys.argv.index('--') + 1:]
cfg_path, out = Path(a[0]).resolve(), Path(a[1]).resolve()
SHARP = float(a[a.index('--sharp') + 1]) if '--sharp' in a else 4.0
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); base = cfg_path.parent
out.parent.mkdir(parents=True, exist_ok=True)

o = next(x for x in bpy.context.scene.objects if x.type == 'MESH'); me = o.data; me.calc_loop_triangles()
Mw = np.array(o.matrix_world); R = Mw[:3, :3]
co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3) @ R.T + Mw[:3, 3]
vn = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('normal', vn); vn = vn.reshape(-1, 3) @ np.linalg.inv(R)
vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
tv = np.array([t.vertices[:] for t in me.loop_triangles]); tl = np.array([t.loops[:] for t in me.loop_triangles])
uv = np.zeros(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
mat = o.data.materials[0]; tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE'); img = tex.image
TW, TH = img.size; orig = np.array(img.pixels[:]).reshape(TH, TW, 4)[:, :, :3]   # rows bottom-up, raw sRGB


def raster(P, W, H, pad=0.0):
    """Pixels covered by each 2D triangle P[t] (pixel units): returns tri index, barycentrics, pixel x, y."""
    T, B, X, Y = [], [], [], []
    for t, p in enumerate(P):
        x0, y0 = np.maximum(np.floor(p.min(0) - pad).astype(int), 0); x1, y1 = np.minimum(np.ceil(p.max(0) + pad).astype(int), (W - 1, H - 1))
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); xs, ys = xs.ravel(), ys.ravel()
        q0, q1 = xs + .5 - p[0, 0], ys + .5 - p[0, 1]; e1, e2 = p[1] - p[0], p[2] - p[0]
        d = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(d) < 1e-12:
            continue
        l1 = (q0 * e2[1] - q1 * e2[0]) / d; l2 = (e1[0] * q1 - e1[1] * q0) / d; l0 = 1 - l1 - l2
        tol = pad / max(np.sqrt(abs(d)), 1e-6)
        k = (l0 >= -tol) & (l1 >= -tol) & (l2 >= -tol)
        if k.any():
            T.append(np.full(k.sum(), t)); B.append(np.stack([l0[k], l1[k], l2[k]], 1)); X.append(xs[k]); Y.append(ys[k])
    return np.concatenate(T), np.concatenate(B), np.concatenate(X), np.concatenate(Y)


# texels in 3D; padded pass first so exact coverage wins on overlaps
P = uv[tl] * np.array([TW, TH])
T, Bc, X, Y = raster(P, TW, TH, pad=1.5)
inside = (Bc >= -1e-6).all(1); order = np.argsort(inside, kind='stable'); T, Bc, X, Y = T[order], Bc[order], X[order], Y[order]
pos = np.einsum('nk,nkd->nd', Bc.clip(0), co[tv[T]]) / Bc.clip(0).sum(1, keepdims=True)
nrm = np.einsum('nk,nkd->nd', Bc.clip(0), vn[tv[T]]); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
_, last = np.unique((Y * TW + X)[::-1], return_index=True); keep = len(X) - 1 - last   # one sample per texel (last wins)
T, X, Y, pos, nrm = T[keep], X[keep], Y[keep], pos[keep], nrm[keep]

lo, hi = co.min(0), co.max(0); ctr = (lo + hi) / 2; Hm = hi[2] - lo[2]
top = co[co[:, 2] > hi[2] - 0.1 * Hm]
fwd = np.array([1.0 if top[:, 0].mean() > ctr[0] else -1.0, 0, 0]); up = np.array([0, 0, 1.0]); left = np.cross(up, fwd)


def load_ref(view):
    im = bpy.data.images.load(str(base / cfg['references'][view])); w, h = im.size
    px = np.array(im.pixels[:]).reshape(h, w, 4)[::-1, :, :3]; bpy.data.images.remove(im)   # rows top-down
    mk = bpy.data.images.load(str(base / 'build' / 'masks' / f'{view}.png'))
    m = np.array(mk.pixels[:]).reshape(h, w, 4)[::-1, :, 0] > .5; bpy.data.images.remove(mk)
    border = np.concatenate([px[:8].reshape(-1, 3), px[-8:].reshape(-1, 3)]); bg = np.median(border, 0)
    e = m & (np.abs(px - bg).max(2) > 45 / 255)   # never sample background-coloured pixels
    for _ in range(3):   # erode: keep the drawn line and the background out of the samples
        e[1:-1, 1:-1] &= e[:-2, 1:-1] & e[2:, 1:-1] & e[1:-1, :-2] & e[1:-1, 2:]
    ys, xs = np.nonzero(m)
    return px, e, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), m


def view_axes(d):
    f = -d; r = np.cross(f, up); return r


def depth_ok(d, hcoord, vcoord, W, H, ppos):
    """True where the texel is the nearest surface seen along d (depth buffer of the mesh in that view)."""
    dep = co @ d; tri_px = np.stack([hcoord(co), vcoord(co)], -1)[tv]
    t_, b_, x_, y_ = raster(tri_px, W, H)
    zb = np.full(W * H, -np.inf); np.maximum.at(zb, y_ * W + x_, np.einsum('nk,nk->n', b_, dep[tv[t_]]))
    u, v = hcoord(ppos), vcoord(ppos); iu, iv = np.clip(u.astype(int), 0, W - 1), np.clip(v.astype(int), 0, H - 1)
    return (ppos @ d) >= zb[iv * W + iu] - 0.01 * Hm, iu, iv


samples = []   # (weight, rgb, valid)
# side views: left flank from side_left, right flank from the same picture (mirror)
px, er, box, _ = load_ref('side_left'); h_, w_ = er.shape
rl = view_axes(left); hp = co @ rl
sx = (box[2] - box[0]) / (hp.max() - hp.min()); sz = (box[3] - box[1]) / Hm
hcoord = lambda p: box[0] + (p @ rl - hp.min()) * sx
vcoord = lambda p: box[1] + (hi[2] - p[:, 2]) * sz
for d in (left, -left):
    vis, iu, iv = depth_ok(d, hcoord if d is left else (lambda p, f=hcoord: (box[0] + box[2]) - f(p)), vcoord, w_, h_, pos)
    if d is not left:   # the right camera sees the mirror image; read the left picture at the unmirrored spot
        iu = np.clip(hcoord(pos).astype(int), 0, w_ - 1)
    ok = vis & er[iv, iu]; w = np.clip(nrm @ d, 0, 1) ** SHARP * ok
    samples.append((w, px[iv, iu], 'side_left' if d is left else 'side_right_mirror'))
# front
px, er, box, m = load_ref('front'); h_, w_ = er.shape
rf = view_axes(fwd); s = (box[3] - box[1]) / Hm
foot = co[co[:, 2] < lo[2] + 0.08 * Hm] @ rf; hc = (foot.min() + foot.max()) / 2
rows = np.nonzero(m[int(box[3] - 0.08 * (box[3] - box[1])):box[3]].any(0))[0]; cu = (rows.min() + rows.max() + 1) / 2
hcoord = lambda p: cu + (p @ rf - hc) * s
vcoord = lambda p: box[1] + (hi[2] - p[:, 2]) * s
vis, iu, iv = depth_ok(fwd, hcoord, vcoord, w_, h_, pos)
ok = vis & er[iv, iu]; w = np.clip(nrm @ fwd, 0, 1) ** SHARP * ok
samples.append((w, px[iv, iu], 'front'))

# fallback: generator texture moved to the references' palette, per region
gen = orig[Y, X]


def region(c, smin, vmin):
    hsv = np.array([colorsys.rgb_to_hsv(*x) for x in c]); return (hsv[:, 1] > smin) & (hsv[:, 2] > vmin)


seen = np.zeros(len(X), bool); refc = []
for w, c, _ in samples:
    k = w > 0.5; seen |= k; refc.append(c[k])
refc = np.concatenate(refc)
ref_flame = region(refc, 0.6, 0.4); gen_flame = region(gen, 0.6, 0.3)
fb = gen.copy(); stats = {}
for name, rk, gk in (('flame', ref_flame, gen_flame), ('body', ~ref_flame, ~gen_flame)):
    mr, sr = refc[rk].mean(0), refc[rk].std(0) + 1e-4
    g = gen[gk & seen] if (gk & seen).sum() > 100 else gen[gk]
    # the generator paints specular glints (tail, hooves) the painted look does not have: clip its extremes first
    g_lo, g_hi = np.percentile(g, 2, axis=0), np.percentile(g, 97, axis=0); g = g.clip(g_lo, g_hi)
    mg, sg = g.mean(0), g.std(0) + 1e-4
    fb[gk] = ((gen[gk].clip(g_lo, g_hi) - mg) / sg * sr + mr).clip(0, 1)
    lum = lambda x: x @ np.array([.299, .587, .114])
    cap = np.percentile(lum(refc[rk]), 95); lf = lum(fb[gk])   # no generated texel brighter than the painting
    fb[gk] *= np.minimum(1, cap / np.maximum(lf, 1e-4))[:, None]
    stats[name] = {'ref_mean': (mr * 255).round(1).tolist(), 'gen_mean': (mg * 255).round(1).tolist(), 'texels': int(gk.sum())}

WF = 0.02
num = fb * WF; den = np.full(len(X), WF)
for w, c, _ in samples:
    num += w[:, None] * c; den += w
col = num / den[:, None]
res = orig.copy(); res[Y, X] = col
img.pixels[:] = np.concatenate([res, np.ones((TH, TW, 1))], 2).ravel()
img.filepath_raw = str(out.parent / 'mula-diffuse.png'); img.file_format = 'PNG'; img.save()
# the generator's image is packed and would be reloaded as it was: swap in the painted file, packed
new = bpy.data.images.load(str(out.parent / 'mula-diffuse.png')); new.name = 'Diffuse'; new.pack()
tex.image = new; bpy.data.images.remove(img)

wsum = sum(w for w, _, _ in samples)
info = {'sharp': SHARP, 'texels': int(len(X)), 'forward': fwd.tolist(), 'palette': stats,
        'share_pct': {name: round(float((w / (wsum + WF)).mean() * 100), 1) for w, _, name in samples} | {'generator': round(float((WF / (wsum + WF)).mean() * 100), 1)}}
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(out))
(out.parent / 'bake.json').write_text(json.dumps(info, indent=1))
print('QUADRUPED_BAKE', json.dumps(info))
