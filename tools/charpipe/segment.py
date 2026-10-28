"""Step 1 - segment the turnaround references and measure silhouettes.

Run inside Blender (needs numpy + image IO):
  blender -b --python tools/charpipe/segment.py -- SourceArt/<Char>/character.json

Writes <char dir>/build/masks/*.png (debug overlays) and build/measure.json.
All lengths in measure.json are metres in the character frame:
  Z up, soles at z=0, character faces -Y, character's left is +X.
"""
import bpy, sys, json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(path):
    im = bpy.data.images.load(str(path))
    w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1, :, :3] * 255  # row 0 = top of the picture


def save(path, rgb):
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(path.stem, w, h, alpha=True)
    px = np.ones((h, w, 4), np.float32); px[..., :3] = rgb[::-1] / 255
    im.pixels.foreach_set(px.ravel()); im.filepath_raw = str(path); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)


def flood(allowed, seed_mask):
    """Grow seed_mask inside allowed with 4-neighbour steps until stable."""
    m = seed_mask & allowed
    while True:
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        g &= allowed
        if (g == m).all():
            return m
        m = g


def dilate(m, r):
    for _ in range(r):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; m = g
    return m


def segment(rgb, cfg):
    """Light clothing can match the backdrop, so the drawn outline is the separator:
    dark or saturated pixels form a barrier, closed by `gap_px`, and the backdrop is
    flood-filled from the picture border around it."""
    lum = rgb.mean(2); sat = rgb.max(2) - rgb.min(2)
    r = cfg.get('gap_px', 2)
    barrier = dilate((lum < cfg.get('line_lum_max', 170)) | (sat > cfg.get('sat_min', 18)), r)
    border = np.zeros_like(barrier); border[0] = border[-1] = True; border[:, 0] = border[:, -1] = True
    bg = dilate(flood(~barrier, border), r)
    # Opening drops hairline floor shadows and grid lines touching the soles.
    o = cfg.get('open_px', 2)
    fg = dilate(~dilate(bg, o), o)
    # Keep only the component that holds the character (drops watermark, specks).
    h, w = fg.shape
    ys, xs = np.nonzero(fg)
    k = np.argmin((ys - h * .5) ** 2 + (xs - w * .5) ** 2)
    seed = np.zeros_like(fg); seed[ys[k], xs[k]] = True
    return flood(fg, seed)


def spans(row):
    """[(start, end_exclusive), ...] runs of True in a 1-D bool array."""
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]))


def main():
    cfg_path = ROOT / sys.argv[sys.argv.index('--') + 1]
    cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
    cdir = cfg_path.parent; out = cdir / 'build'; (out / 'masks').mkdir(parents=True, exist_ok=True)
    H = cfg['height_m']
    views = {}
    for view, fname in cfg['references'].items():
        rgb = load(cdir / fname)
        m = segment(rgb, cfg.get('segmentation', {}))
        rows = np.nonzero(m.any(1))[0]
        top, sole = int(rows[0]), int(rows[-1])
        ppm = (sole - top) / H  # pixels per metre
        views[view] = dict(rgb=rgb, mask=m, top=top, sole=sole, ppm=ppm)
        if view in ('front', 'back'):
            # Body centre = middle of the leg gap just below the crotch.
            cr = next(r for r in range(sole - int(.3 * (sole - top)), top, -1) if len([s for s in spans(m[r]) if s[1] - s[0] > 8]) < 2)
            ls = [s for s in spans(m[cr + int(.03 * (sole - top))]) if s[1] - s[0] > 8]
            views[view]['centre_px'] = float((ls[0][1] + ls[-1][0]) / 2)
        else:
            # y = 0 at mid-depth of the thigh (45% height); facing from the nose side.
            r45 = sole - int(.45 * (sole - top)); s45 = spans(m[r45])
            c0 = (s45[0][0] + s45[-1][1]) / 2
            hr = range(top, top + int(.12 * (sole - top)))
            fr = max(spans(m[r])[-1][1] for r in hr) - c0 > c0 - min(spans(m[r])[0][0] for r in hr)
            views[view].update(centre_px=float(c0), faces='right' if fr else 'left')
        ov = rgb.copy(); ov[m] = ov[m] * .45 + np.array([255, 40, 160]) * .55
        save(out / 'masks' / f'{view}.png', ov)
        np.save(out / 'masks' / f'{view}.npy', m)

    # ---- front: horizontal structure --------------------------------------------------
    F = views['front']; m = F['mask']; ppm = F['ppm']
    z_of = lambda r, v=F: (v['sole'] - r) / v['ppm']
    # Centre line from the leg gap / torso midpoint at mid-thigh rows.
    rows = range(F['top'], F['sole'] + 1)
    nspan = {r: spans(m[r]) for r in rows}
    width = {r: (nspan[r][-1][1] - nspan[r][0][0]) if nspan[r] else 0 for r in rows}
    arm_rows = [r for r in rows if width[r] > .6 * (F['sole'] - F['top'])]  # T-pose arm band
    arm_top, arm_bot = min(arm_rows), max(arm_rows)
    # Crotch: highest row below the arms where the lower body splits in two wide spans.
    crotch = next(r for r in range(arm_bot + 1, F['sole']) if len([s for s in nspan[r] if s[1] - s[0] > 8]) >= 2 and r > arm_bot + (F['sole'] - arm_bot) * .3)
    legs = [s for s in nspan[crotch + 10] if s[1] - s[0] > 8]
    cx = (legs[0][1] + legs[-1][0]) / 2  # middle of the leg gap = body centre
    x_of = lambda c: (c - cx) / ppm
    # Torso width below the armpits; armpit = first row under the arm band with 3 spans gone.
    armpit = next(r for r in range(arm_bot, crotch) if len(nspan[r]) == 1 or (nspan[r][0][0] > cx - .25 * ppm))
    # Head and neck: narrowest row between top of head and arm band.
    head_rows = list(range(F['top'], arm_top))
    neck = min(head_rows[len(head_rows) // 2:], key=lambda r: width[r])
    # Chin: below the widest head row, the row where width drops fastest.
    widest = max(head_rows[:len(head_rows) * 3 // 4], key=lambda r: width[r])
    prof = lambda r: ([s for s in nspan[r] if s[0] <= cx <= s[1]] or [None])[0]

    def torso_span(r):
        s = prof(r)
        return (x_of(s[0]), x_of(s[1])) if s else None

    front_profile = []
    for r in range(F['top'], F['sole'] + 1, 2):
        s = prof(r)
        front_profile.append([round(z_of(r), 4)] + ([round(x_of(s[0]), 4), round(x_of(s[1]), 4)] if s else [None, None]))
    leg_profile = []
    for r in range(crotch, F['sole'] + 1, 2):
        ls = [s for s in nspan[r] if s[1] - s[0] > 4]
        L = [s for s in ls if (s[0] + s[1]) / 2 > cx]; R = [s for s in ls if (s[0] + s[1]) / 2 < cx]
        if L and R:
            leg_profile.append([round(z_of(r), 4), round(x_of(L[0][0]), 4), round(x_of(L[0][1]), 4), round(x_of(R[-1][0]), 4), round(x_of(R[-1][1]), 4)])
    # Arms: per column beyond the torso, top/bottom of the arm band.
    arm_profile = {'L': [], 'R': []}
    cols = np.nonzero(m[arm_top:arm_bot + 1].any(0))[0]
    for c in range(cols[0], cols[-1] + 1):
        col = m[F['top']:crotch, c]
        ss = [s for s in spans(col) if s[1] - s[0] > 2]
        if not ss:
            continue
        ss = [(a + F['top'], b + F['top']) for a, b in ss]
        s = max(ss, key=lambda s: s[1] - s[0]) if abs(x_of(c)) < .3 else min(ss, key=lambda s: abs((s[0] + s[1]) / 2 - (arm_top + arm_bot) / 2))
        side = 'L' if c > cx else 'R'   # picture right = character's left in the front view
        arm_profile[side].append([round(abs(x_of(c)), 4), round(z_of(s[1]), 4), round(z_of(s[0]), 4)])
    for s in arm_profile.values():
        s.sort()

    # ---- side views: depth structure ----------------------------------------------------
    side_profiles = {}
    for view in ('side_left', 'side_right'):
        if view not in views:
            continue
        V = views[view]; mm = V['mask']
        # Facing direction in the picture: the nose is the most protruding point of the head band.
        hr = [r for r in range(V['top'], V['top'] + int(.12 * (V['sole'] - V['top'])))]
        lefts = [spans(mm[r])[0][0] for r in hr]; rights = [spans(mm[r])[-1][1] for r in hr]
        prof_rows = list(range(V['top'], V['sole'] + 1, 2))
        # Ankle/heel band centre is stable: use mid-depth at 40% height (thigh) as y=0.
        r40 = V['sole'] - int(.45 * (V['sole'] - V['top']))
        s40 = spans(mm[r40]); c0 = (s40[0][0] + s40[-1][1]) / 2
        faces_right = (max(rights) - c0) > (c0 - min(lefts))
        # Long hair/branches can project farther than the nose. Character sheets may
        # explicitly declare facing instead of relying on a human-head heuristic.
        facing = cfg.get('view_faces', {}).get(view)
        if facing:
            faces_right = facing == 'right'
        V['faces'] = 'right' if faces_right else 'left'
        sgn = -1 if faces_right else 1  # picture x -> character y (front is -Y)
        pr = []
        for r in prof_rows:
            ss = spans(mm[r])
            if not ss:
                continue
            a, b = ss[0][0], ss[-1][1]
            ya, yb = sgn * (a - c0) / V['ppm'], sgn * (b - c0) / V['ppm']
            pr.append([round((V['sole'] - r) / V['ppm'], 4), round(min(ya, yb), 4), round(max(ya, yb), 4)])
        side_profiles[view] = pr

    # Generated turnarounds drift between views: register every side view on the depth view
    # by the median offset of the profile centres (shifts centre_px, re-expresses the profile).
    ref_view = cfg.get('build', {}).get('depth_view', 'side_right')
    if ref_view in side_profiles:
        ref = {round(z, 2): (a + b) / 2 for z, a, b in side_profiles[ref_view]}
        for view, pr in side_profiles.items():
            if view == ref_view:
                continue
            d = float(np.median([(a + b) / 2 - ref[round(z, 2)] for z, a, b in pr if .2 < z < 1.3 and round(z, 2) in ref]))
            V = views[view]; sgn = -1 if V['faces'] == 'right' else 1
            V['centre_px'] += sgn * d * V['ppm']; V['aligned_shift_m'] = round(d, 4)
            side_profiles[view] = [[z, round(a - d, 4), round(b - d, 4)] for z, a, b in pr]

    def zr(r):
        return round(z_of(r), 4)

    measure = {
        'height_m': H,
        'calibration': {k: {'top_px': v['top'], 'sole_px': v['sole'], 'px_per_m': round(v['ppm'], 3), 'centre_px': v['centre_px'], 'faces': v.get('faces', 'front' if k == 'front' else 'back'), 'aligned_shift_m': v.get('aligned_shift_m', 0.0),
                         'size_px': [int(v['rgb'].shape[1]), int(v['rgb'].shape[0])]} for k, v in views.items()},
        'front_centre_px': cx,
        'landmarks_z': {'arm_band_top': zr(arm_top), 'arm_band_bottom': zr(arm_bot), 'armpit': zr(armpit), 'crotch': zr(crotch),
                        'neck_narrowest': zr(neck), 'head_widest': zr(widest)},
        'arm_reach_x': {s: p[-1][0] for s, p in arm_profile.items()},
        'front_profile': front_profile, 'leg_profile': leg_profile, 'arm_profile': arm_profile, 'side_profiles': side_profiles,
    }
    (out / 'measure.json').write_text(json.dumps(measure, indent=1), encoding='utf-8')
    print('MEASURE', json.dumps({k: measure[k] for k in ('calibration', 'landmarks_z', 'arm_reach_x')}))


main()
