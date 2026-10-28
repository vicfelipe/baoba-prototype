"""Step 2 - build a Lunia-style modular character from character.json + build/measure.json.

  blender -b --python tools/charpipe/build.py -- SourceArt/<Char>/character.json [--stages geo,bake,rig,look,export]

Stages save build/stage-<name>.blend; starting from a later stage reloads the previous one.
Frame: metres, Z up, soles at z=0, character faces -Y, character's left is +X.
"""
import bpy, bmesh, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version = 0  # no .blend1 clutter
argv = sys.argv[sys.argv.index('--') + 1:]
CFG_PATH = ROOT / argv[0]
CFG = json.loads(CFG_PATH.read_text(encoding='utf-8'))
B = CFG['build']
CDIR = CFG_PATH.parent
OUT = CDIR / 'build'
M = json.loads((OUT / 'measure.json').read_text(encoding='utf-8'))
NAME = CFG['name']
ALL_STAGES = ['geo', 'fit', 'bake', 'rig', 'anim', 'look', 'export']
STAGES = [s for s in argv[argv.index('--stages') + 1].split(',') if s] if '--stages' in argv else ALL_STAGES
H = CFG['height_m']
AN = B['anatomy']; CL = B['clothing']; AC = B['accessories']


def part_name(slot):
    return f'{NAME}_{slot}_000'  # Lunia naming: <Class>_<Slot>_<item code>


# ----------------------------------------------------------------------------- profiles
def arr(rows):
    a = np.array([[np.nan if v is None else v for v in r] for r in rows], float)
    return a[np.argsort(a[:, 0])]


def medfilt(v, k=5):
    p = np.pad(v, k // 2, mode='edge')
    return np.array([np.median(p[i:i + k]) for i in range(len(v))])


FRONT = arr(M['front_profile'])                       # z, xR, xL (centre span)
SIDE = arr(M['side_profiles'][B['depth_view']])       # z, yFront, yBack
LEGS = arr(M['leg_profile'])                          # z, L outer.., R ..
LM = M['landmarks_z']
for c in (1, 2):
    SIDE[:, c] = medfilt(SIDE[:, c], 5)


def side_at(z):
    return float(np.interp(z, SIDE[:, 0], SIDE[:, 1])), float(np.interp(z, SIDE[:, 0], SIDE[:, 2]))


def front_hw(z):
    """Half width of the centre span; mirrored from the clean side (cordão hangs on the other)."""
    ok = ~np.isnan(FRONT[:, 1])
    xr = np.interp(z, FRONT[ok, 0], FRONT[ok, 1]); xl = np.interp(z, FRONT[ok, 0], FRONT[ok, 2])
    return float(-xr if B.get('limb_mirror_from', 'R') == 'R' else xl)


def arm_table():
    rows = {}
    for side in ('L', 'R'):
        for x, zb, zt in M['arm_profile'][side]:
            rows.setdefault(round(x, 3), []).append((zb, zt))
    xs = np.array(sorted(rows)); zb = np.array([np.mean([r[0] for r in rows[x]]) for x in xs]); zt = np.array([np.mean([r[1] for r in rows[x]]) for x in xs])
    return xs, medfilt(zb, 7), medfilt(zt, 7)


ARM_X, ARM_ZB, ARM_ZT = arm_table()
# Inside this x the front-view column is still the lat/armpit curve, not the arm.
ARM_X0 = float(ARM_X[np.argmax((ARM_X > .1) & (ARM_ZB >= LM['armpit'] - .005))])


def arm_at(x):
    lo, hi = CL['wrist_cover_x']
    if lo < x < hi:  # bracelets inflate the silhouette: bridge across them
        t = (x - lo) / (hi - lo)
        return tuple((1 - t) * np.array(arm_at(lo)) + t * np.array(arm_at(hi)))
    return float(np.interp(x, ARM_X, ARM_ZB)), float(np.interp(x, ARM_X, ARM_ZT))


def shoulder_top_hw(z):
    """Torso half width above the armpit, from the trapezius contour seen in the front view."""
    sel = (ARM_X > .05) & (ARM_X < .30)
    xs, zt = ARM_X[sel], ARM_ZT[sel]
    zt = np.minimum.accumulate(zt)  # make monotone decreasing outward
    return float(np.interp(z, zt[::-1], xs[::-1]))


# ----------------------------------------------------------------------------- mesh helpers
def se(t, n):
    c, s = math.cos(t), math.sin(t)
    return math.copysign(abs(c) ** (2 / n), c), math.copysign(abs(s) ** (2 / n), s)


def loft(name, rings, caps=True):
    """rings: list of lists of xyz with equal length. Quads between rings, fan caps."""
    n = len(rings[0]); vs = [v for r in rings for v in r]; fs = []
    for k in range(len(rings) - 1):
        for j in range(n):
            fs.append((k * n + j, k * n + (j + 1) % n, (k + 1) * n + (j + 1) % n, (k + 1) * n + j))
    if caps:
        for k, rev in ((0, True), (len(rings) - 1, False)):
            c = Vector(np.mean(rings[k], axis=0)); vs.append(tuple(c)); ci = len(vs) - 1
            for j in range(n):
                a, b = k * n + j, k * n + (j + 1) % n
                fs.append((b, a, ci) if rev else (a, b, ci))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    # Consistent outward normals regardless of ring winding.
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    return o


def ring_z(cx, z, hw, yf, yb, n=2.4, N=28):
    out = []
    for j in range(N):
        sx, sy = se(2 * math.pi * j / N, n)
        out.append((cx + hw * sx, (yf + yb) / 2 + (yb - yf) / 2 * sy, z))
    return out


def ring_x(x, yc, zc, ay, az, n=2.2, N=20):
    out = []
    for j in range(N):
        sy, sz = se(2 * math.pi * j / N, n)
        out.append((x, yc + ay * sy, zc + az * sz))
    return out


def ellipsoid(name, loc, size, seg=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o


def select_only(objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


def fuse(objs, name, voxel, tris, smooth=4):
    """Union overlapping volumes (voxel remesh), relax, reduce to the Lunia triangle budget."""
    select_only(objs); bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if voxel is None:  # thin accessories: keep the authored low-poly shells, just join them
        m = o.modifiers.new('tri', 'TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=m.name)
        for p in o.data.polygons:
            p.use_smooth = True
        o['reduce_method'] = 'none'
        return o
    m = o.modifiers.new('fuse', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.adaptivity = 0
    bpy.ops.object.modifier_apply(modifier=m.name)
    m = o.modifiers.new('relax', 'SMOOTH'); m.factor = .5; m.iterations = smooth; bpy.ops.object.modifier_apply(modifier=m.name)
    reduce_to(o, tris)
    return o


def reduce_to(o, tris):
    """QuadriFlow keeps clean quad flow but misses its target on small parts: retry with a
    corrected target, fall back to Decimate."""
    select_only([o])
    src = o.data.copy(); method = 'decimate'; target = max(8, tris // 2)
    for _ in range(4):
        try:
            bpy.ops.object.quadriflow_remesh(target_faces=target, use_mesh_symmetry=False, use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=False, seed=1)
        except Exception as e:  # QuadriFlow can refuse non-manifold input
            print('quadriflow failed', o.name, e); break
        got = 2 * len(o.data.polygons)
        if .85 * tris <= got <= 1.15 * tris:
            method = 'quadriflow'; break
        old = o.data; o.data = src.copy(); bpy.data.meshes.remove(old)
        target = int(target * tris / max(got, 1))
    cur = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if method == 'decimate' or cur > tris * 1.15:
        m = o.modifiers.new('budget', 'DECIMATE'); m.ratio = min(1, tris / cur); bpy.ops.object.modifier_apply(modifier=m.name)
    m = o.modifiers.new('tri', 'TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons:
        p.use_smooth = True
    o['reduce_method'] = method


def cord_centre(z):
    """Hanging cordão centre line, measured on the front (x) and side (y) references."""
    ct = AC['cord_tail']; path = np.array(sorted(ct['path']))
    return float(np.interp(z, path[:, 0], path[:, 1])), ct['y']


# ----------------------------------------------------------------------------- hands and feet
def tube_along(name, pts, radii, n=12):
    """Loft rings along a polyline; radii = [(ry, rz)] per point (ellipse, local frame)."""
    rings = []
    for i, (p, (ra, rb)) in enumerate(zip(pts, radii)):
        p = Vector(p); t = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)); a = t.cross(up); a = a.normalized() if a.length > 1e-6 else Vector((0, 1, 0)); b = a.cross(t).normalized()
        rings.append([tuple(p + ra * math.cos(2 * math.pi * j / n) * a + rb * math.sin(2 * math.pi * j / n) * b) for j in range(n)])
    return loft(name, rings)


def build_hand(x0, reach, hb, yA):
    """Left hand, palm down, fingers together (as drawn), thumb forward. Sizes from the measured
    reach and the anatomy ratios; fingers keep a small gap so they read when the fist closes."""
    hl = AN['hand_length']; xk = reach - hl * .5          # knuckle line
    zc = lambda x: sum(arm_at(min(x, reach - .02))) / 2
    rs = []
    for x, w, th in ((x0, .78, .021), (x0 + .03, .86, .02), (xk - .03, 1.0, .017), (xk, 1.0, .015)):
        rs.append(ring_x(x, yA - .004, zc(x) - .002, hb * w, th, 2.6, 18))
    palm = loft('palm', rs)
    out = [palm]
    # index (thumb side, -Y) ... pinky (+Y)
    for k, (dy, ln, r) in enumerate([(-.034, .090, .0098), (-.0115, .099, .0102), (.0115, .093, .0096), (.034, .074, .0086)]):
        y = yA - .004 + dy; z0 = zc(xk) - .002
        pts = [(xk - .02 + ln * f, y, z0 - .006 * f * f) for f in (0, .35, .62, .86, .97)]
        rad = [(r, r * .85), (r * .95, r * .8), (r * .88, r * .74), (r * .82, r * .68), (r * .62, r * .52)]
        out.append(tube_along(f'finger{k}', pts, rad, 12))
        tip = pts[-1]  # rounded finger pad instead of a cone
        out.append(ellipsoid(f'pad{k}', (tip[0] + r * .2, tip[1], tip[2]), (r * .85, r * .8, r * .66), 10, 8))
    # thumb: from the palm edge near the wrist, forward and slightly down
    tb = Vector((x0 + .05, yA - hb * .72, zc(x0 + .05) - .005)); d = Vector((.78, -.55, -.18)).normalized()
    pts = [tuple(tb + d * l) for l in (0, .024, .046, .062)]
    out.append(tube_along('thumb', pts, [(.0145, .0125), (.0125, .011), (.0108, .0094), (.0085, .0075)], 12))
    out.append(ellipsoid('thumb_pad', tuple(tb + d * .066), (.009, .0085, .0075), 10, 8))
    return out


def build_foot(fx, fhw, heel_y, toe_y, foot_top):
    """Left foot: heel-to-ball body following the measured instep, then five toes."""
    ball = heel_y + (toe_y - heel_y) * .74
    rs = []
    for u in np.linspace(0, 1, 9):
        y = heel_y + (ball - heel_y) * u
        top = max(.02, foot_top(y)); w = fhw * float(np.interp(u, [0, .25, .7, 1], [.56, .72, .95, 1]))
        r = []
        for j in range(18):
            sx, sz = se(2 * math.pi * j / 18, 2.6)
            arch = .006 * math.exp(-((u - .55) / .2) ** 2) if (sz < 0 and sx < 0) else 0   # medial arch lifts the sole
            r.append((fx + w * sx, y, max(.002, top / 2 + top / 2 * sz + arch)))
        rs.append(r)
    out = [loft('foot', rs)]
    # toes from medial (big toe, toward the body centre = -X for the left foot) to lateral
    for k, (fr, ln, r) in enumerate([(-.72, .062, .0135), (-.33, .05, .0095), (0, .045, .0088), (.32, .04, .0082), (.62, .032, .0075)]):
        x = fx + fr * fhw  # fr < 0 = medial side (toward the body centre for the left foot)
        y0 = ball + .012; zt = max(.02, foot_top(ball)) * .5
        pts = [(x, y0 - ln * f, zt * (1 - .45 * f) + .002) for f in (0, .5, .85, 1.0)]
        out.append(tube_along(f'toe{k}', pts, [(r, r * .9), (r * .95, r * .85), (r * .85, r * .75), (r * .5, r * .45)], 10))
    return out


# ----------------------------------------------------------------------------- geometry
def build_body_parts():
    zc_arm = lambda x: sum(arm_at(x)) / 2
    yA = AN['arm_y']
    kx = np.array(AN['arm_depth_ratio'])
    parts = {}

    # Torso (bare skin) from inside the trousers up to the neck base.
    rings = []
    z0, z1, zp = CL['torso_bottom_z'], AN['neck_base_z'] + .04, LM['armpit'] - .005
    for z in np.arange(z0, z1 + 1e-6, .02):
        hw = front_hw(min(z, zp)) if z <= zp else min(front_hw(zp), shoulder_top_hw(z))
        yf, yb = side_at(z)
        rings.append(ring_z(0, z, hw, yf, yb, 2.3, 32))
    torso = loft('torso', rings)
    # Neck: front width at the narrowest row; depth from the throat/nape line under the chin.
    nz = LM['neck_narrowest']; nhw = front_hw(nz)
    yf, yb = side_at(AN['neck_base_z'] + .02)
    neck = loft('neck', [ring_z(0, z, nhw * s, yf * .6 + .01, yb - .01, 2.0, 20) for z, s in ((AN['neck_base_z'] - .04, 1.2), (AN['neck_base_z'] + .03, 1.0), (AN['head_joint_z'] + .02, .95))])
    # Arms to just under the bracelets (hands are their own slot, as in Lunia).
    arms = []
    for s in (1, -1):
        rs = []
        x_end = CL['wrist_cover_x'][1] - .005
        for x in list(np.arange(.10, x_end, .025)) + [x_end]:
            zb, zt = arm_at(max(x, ARM_X0))
            az = (zt - zb) / 2 * (.9 if x < ARM_X0 else 1)
            ay = az * float(np.interp(x, kx[:, 0], kx[:, 1]))
            rs.append(ring_x(s * x, yA, (zb + zt) / 2, ay, az, 2.2, 20))
        arms.append(loft('arm', rs[::s]))
    parts['Body'] = fuse([torso, neck] + arms, part_name('Body'), B['parts']['Body']['voxel'], B['parts']['Body']['tris'])

    # Head: width from front, depth from side; nose/lips/chin from the side profile residual.
    hz0, hz1 = AN['chin_z'] - .01, H
    zs = np.arange(hz0, hz1 + 1e-6, .01)
    hw_raw = np.array([front_hw(z) for z in zs])
    ez = AN['ear']['z']; ear = (zs > ez - .045) & (zs < ez + .05)
    lo_i, hi_i = np.nonzero(ear)[0][[0, -1]]
    hw = hw_raw.copy(); hw[ear] = np.minimum(hw_raw[ear], np.interp(zs[ear], [zs[lo_i], zs[hi_i]], [hw_raw[lo_i], hw_raw[hi_i]]))
    yF = np.array([side_at(z)[0] for z in zs]); yB = np.array([side_at(z)[1] for z in zs])
    base = np.array([yF[max(0, i - 3):i + 4].max() for i in range(len(zs))])  # recessed envelope = face plane
    base = np.convolve(np.pad(base, 2, mode='edge'), np.ones(5) / 5, 'valid')
    resid = np.minimum(0, yF - base)
    jz = AN['head_joint_z']
    rings = []
    for i, z in enumerate(zs):
        t = np.clip((z - hz0) / (jz + .03 - hz0), 0, 1)
        w = hw[i] * (.35 + .65 * t ** .7)                      # chin narrows to a point
        yb = yB[i] if z > jz + .03 else base[i] + (yB[i] - base[i]) * (.45 + .55 * t)  # jaw tucks in front of the neck
        r = []
        for j in range(36):
            sx, sy = se(2 * math.pi * j / 36, 2.2)
            x = w * sx; y = (base[i] + yb) / 2 + (yb - base[i]) / 2 * sy
            if sy < 0:
                y += resid[i] * math.exp(-(x / .02) ** 2) * min(1, -sy * 1.5)
            r.append((x, y, z))
        rings.append(r)
    rings[-1] = [(x * .2, y * .2 + (yF[-1] + yB[-1]) * .4, z) for x, y, z in rings[-1]]
    head = loft('head', rings)
    ears = [ellipsoid('ear', (s * (float(np.interp(ez, zs, hw)) + AN['ear']['size'][0] * .6), AN['ear']['y'], ez), AN['ear']['size']) for s in (1, -1)]
    parts['Head'] = fuse([head] + ears, part_name('Head'), B['parts']['Head']['voxel'], B['parts']['Head']['tris'], smooth=2)

    # Trousers: pelvis block plus two legs (right leg mirrored, the cordão hides the left).
    rings = []
    for z in np.arange(LM['crotch'] - .02, CL['pants_top_z'] + 1e-6, .02):
        yf, yb = side_at(z)
        rings.append(ring_z(0, z, front_hw(z) + .004, yf - .004, yb + .004, 2.3, 32))
    pelvis = loft('pelvis', rings)
    legs = []
    for s in (1, -1):
        rs = []
        for z in list(np.arange(CL['pants_hem_z'], LM['crotch'] + .1, .03)):
            zz = min(z, LEGS[-1, 0])
            xo, xi = np.interp(zz, LEGS[:, 0], LEGS[:, 3]), np.interp(zz, LEGS[:, 0], LEGS[:, 4])
            yf, yb = side_at(z)
            rs.append(ring_z(s * -(xo + xi) / 2, z, (xi - xo) / 2, yf, yb, 2.2, 24))
        if 'pants_hem_slope' in CL:  # hem rests on the instep in front and drops over the heel at the back
            zb_, zf_ = CL['pants_hem_slope']; ys = [v[1] for v in rs[0]]; y0, y1 = min(ys), max(ys)
            rs.insert(0, [(x, y, zb_ + (zf_ - zb_) * (y1 - y) / (y1 - y0)) for x, y, _ in rs[0]])
        legs.append(loft('leg', rs))
    parts['Leg'] = fuse([pelvis] + legs, part_name('Leg'), B['parts']['Leg']['voxel'], B['parts']['Leg']['tris'])

    # Left hand only; the right one is a mirrored copy sharing UVs (Lunia convention).
    reach = (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
    x0 = CL['wrist_cover_x'][0] + .01
    hb = AN['hand_breadth'] / 2
    hand_parts = build_hand(x0, reach, hb, yA)
    parts['Hand'] = fuse(hand_parts, part_name('Hand'), B['parts']['Hand']['voxel'], B['parts']['Hand']['tris'] // 2, smooth=1)

    # Left foot (mirrored later): loft heel->toes, plus an ankle column hidden in the trouser leg.
    feet = SIDE[SIDE[:, 0] < .11]
    toe_y, heel_y = feet[:, 1].min() - .005, np.median(feet[:, 2])

    def foot_top(y):  # instep line read off the side silhouette, capped under the trouser hem
        zs = [z for z, a, b in SIDE if z < CL['pants_hem_z'] + .03 and a - .004 <= y <= b + .004]
        return min(max(zs), CL['pants_hem_z'] + .02) if zs else .012
    fl = LEGS[LEGS[:, 0] < .06]
    fx = float(-(fl[:, 3].mean() + fl[:, 4].mean()) / 2); fhw = float((fl[:, 4] - fl[:, 3]).mean() / 2)
    foot_parts = build_foot(fx, fhw, heel_y, toe_y, foot_top)
    foot = foot_parts[0]
    ay_ = heel_y - .055
    ankle = loft('ankle', [ring_z(fx, z, .042, ay_ - .045, ay_ + .045, 2, 16) for z in (.03, AN['ankle_z'], CL['foot_top_z'])])
    parts['Foot'] = fuse(foot_parts + [ankle], part_name('Foot'), B['parts']['Foot']['voxel'], B['parts']['Foot']['tris'] // 2, smooth=1)

    # Support slot: cordão belt, knot and hanging tail, outside the trousers.
    sup = []
    z_lo, z_hi = AC['belt']['z']; th = AC['belt']['thickness']
    rs = []
    for z in (z_lo, (z_lo + z_hi) / 2, z_hi):
        yf, yb = side_at(z)
        bulge = 1 if z == (z_lo + z_hi) / 2 else .6
        rs.append(ring_z(0, z, front_hw(z) + .004 + th * bulge, yf - .004 - th * bulge, yb + .004 + th * bulge, 2.3, 40))
    sup.append(loft('belt', rs))
    k = AC['knot']; sup.append(ellipsoid('knot', k['pos'], k['size'], 12, 8))
    ct = AC['cord_tail']; rs = []; tz, tb = ct['tassel']['z']
    for z in list(np.linspace(ct['start_z'], tz, 8)) + list(np.linspace(tz - .01, tb, 4)):
        k = 0 if z >= tz else (tz - z) / (tz - tb)
        hx = ct['half'][0] + k * (ct['tassel']['half'][0] - ct['half'][0]); hy = ct['half'][1] + k * (ct['tassel']['half'][1] - ct['half'][1])
        cx, cy = cord_centre(z)
        rs.append(ring_z(cx, z, hx, cy - hy, cy + hy, 2.4, 12))
    sup.append(loft('cord', rs))
    tk = ct['tassel']['knot']; sup.append(ellipsoid('tassel_knot', (cord_centre(tz)[0], ct['y'], tz), tk, 10, 6))
    parts['Support'] = fuse(sup, part_name('Support'), B['parts']['Support'].get('voxel'), B['parts']['Support']['tris'])
    return parts


def stage_geo():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.fps = 30
    parts = build_body_parts()
    col = bpy.data.collections.new(NAME); sc.collection.children.link(col)
    for o in parts.values():
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)
    print('GEO', {k: (len(o.data.polygons), o.get('reduce_method')) for k, o in parts.items()})


# ----------------------------------------------------------------------------- fit
def fit_masks():
    """Reference masks used as fitting targets. Front: the left side below the belt is
    replaced by the mirrored right side (the cordão is its own slot, not trouser volume)."""
    out = {}
    for view in ('front', B['depth_view']):
        cal = M['calibration'][view]; m = np.load(OUT / 'masks' / f'{view}.npy').copy()
        if view == 'front':
            c = int(round(cal['centre_px'])); r0 = int(cal['sole_px'] - (CL['pants_top_z'] + .03) * cal['px_per_m'])
            w = min(c, m.shape[1] - c - 1) - 1
            m[r0:, c + 1:c + 1 + w] = m[r0:, c - 1:c - 1 - w:-1]
        out[view] = (m, cal)
    return out


def march(mask, u, v, du, dv, limit):
    """Signed pixel distance from (u,v) to the mask boundary along (du,dv): >0 means the
    boundary lies outward (grow), <0 inward (shrink)."""
    h, w = mask.shape
    inside = lambda uu, vv: 0 <= int(vv) < h and 0 <= int(uu) < w and bool(mask[int(vv), int(uu)])
    start = inside(u, v); sgn = 1 if start else -1
    for k in range(1, limit):
        if inside(u + sgn * du * k * .5, v + sgn * dv * k * .5) != start:
            return sgn * k * .5
    return 0.0


def stage_fit(rounds=6, gain=.8):
    """Snap silhouette vertices of every fused slot onto the reference contours (front and
    depth view), with occlusion tests, then diffuse the move to neighbouring vertices."""
    from mathutils.bvhtree import BVHTree
    parts = {k: o for k, o in parts_by_slot().items() if k != 'Support'}
    masks = fit_masks(); lo, hi = CL['wrist_cover_x']
    log = []
    for it in range(rounds):
        allv, allp = [], []
        for o in parts.values():
            base = len(allv); allv += [o.matrix_world @ v.co for v in o.data.vertices]
            allp += [[base + i for i in p.vertices] for p in o.data.polygons]
        bvh = BVHTree.FromPolygons(allv, allp)
        total = 0
        for slot, o in parts.items():
            me = o.data; me.update(); n = len(me.vertices)
            disp = [Vector() for _ in range(n)]; hit = [0] * n
            for view, (mask, cal) in masks.items():
                ppm, c = cal['px_per_m'], cal['centre_px']
                if view == 'front':
                    d = Vector((0, 1, 0)); a1 = Vector((1, 0, 0)); su = 1
                else:
                    d = Vector((1, 0, 0)); a1 = Vector((0, 1, 0)); su = -1 if cal['faces'] == 'right' else 1
                for v in me.vertices:
                    p = o.matrix_world @ v.co; nn = (o.matrix_world.to_3x3() @ v.normal).normalized()
                    if abs(nn.dot(d)) > .35:
                        continue
                    if view != 'front' and abs(p.x) > ARM_X0:  # arms are seen end-on from the side
                        continue
                    if view == 'front' and lo < abs(p.x) < hi:  # bracelets are not arm volume
                        continue
                    q = p + nn * .002
                    if bvh.ray_cast(q, d, 3)[0] is not None or bvh.ray_cast(q, -d, 3)[0] is not None:
                        continue  # not on the outer contour in this view
                    m2 = Vector((nn.dot(a1), nn.z))
                    if m2.length < 1e-6:
                        continue
                    m2.normalize()
                    s = march(mask, c + su * p.dot(a1) * ppm, cal['sole_px'] - p.z * ppm, su * m2.x, -m2.y, 120)
                    disp[v.index] += (s / ppm) * (m2.x * a1 + m2.y * Vector((0, 0, 1))); hit[v.index] += 1
            for i in range(n):
                if hit[i]:
                    disp[i] /= hit[i]
            # Diffuse onto vertices that had no contour sample, so the surface moves as a whole.
            nb = [[] for _ in range(n)]
            for e in me.edges:
                a, b = e.vertices; nb[a].append(b); nb[b].append(a)
            for _ in range(8):
                disp = [disp[i] if hit[i] or not nb[i] else sum((disp[j] for j in nb[i]), Vector()) / len(nb[i]) * .9 for i in range(n)]
            inv = o.matrix_world.inverted().to_3x3()
            for i, v in enumerate(me.vertices):
                v.co += inv @ (disp[i] * gain)
            total += sum(dd.length for dd in disp)
        log.append(round(total, 3))
    # Light relax keeps the snapped contour from going jagged.
    for o in parts.values():
        select_only([o]); m = o.modifiers.new('relax', 'SMOOTH'); m.factor = .25; m.iterations = 1; bpy.ops.object.modifier_apply(modifier=m.name)
    print('FIT displacement per round', log)
    apply_relief(parts)
    build_accessories()


def apply_relief(parts):
    """Sculpt muscle relief: high-pass luminance of the front/back drawings displaces the
    view-facing skin along its normal (light = bulge, drawn grooves = dips)."""
    rl = B.get('relief', {})
    if not rl:
        return
    imgs = {}
    for view in ('front', 'back'):
        cal = M['calibration'][view]; rgb = img_np(CDIR / CFG.get('references_original', CFG['references'])[view])
        lum = rgb.mean(2); m = np.load(OUT / ('masks-original' if (OUT / 'masks-original').exists() else 'masks') / f'{view}.npy')[::-1]
        r = int(rl.get('radius_px', 10)); hp = lum - box_blur(lum, r)
        inner = m.copy()
        for _ in range(int(rl.get('edge_px', 6))):
            inner = inner & np.roll(inner, 1, 0) & np.roll(inner, -1, 0) & np.roll(inner, 1, 1) & np.roll(inner, -1, 1)
        hp = np.clip(box_blur(hp * inner, 1), -.25, .25)
        imgs[view] = (hp, inner, cal)
    for slot, k in rl.get('slots', {}).items():
        if slot not in parts:
            continue
        o = parts[slot]; me = o.data; me.update(); n = len(me.vertices); disp = np.zeros(n)
        for v in me.vertices:
            p = o.matrix_world @ v.co; nn = (o.matrix_world.to_3x3() @ v.normal).normalized()
            for view, (hp, inner, cal) in imgs.items():
                face = -nn.y if view == 'front' else nn.y
                if face < .35:
                    continue
                c = cal['centre_px'] + (p.x if view == 'front' else -p.x) * cal['px_per_m']
                row = int(hp.shape[0] - 1 - (cal['sole_px'] - p.z * cal['px_per_m'])); col = int(c)
                if 0 <= row < hp.shape[0] and 0 <= col < hp.shape[1] and inner[row, col]:
                    disp[v.index] += hp[row, col] * k * min(1, (face - .35) / .3)
        nb = [[] for _ in range(n)]
        for e in me.edges:
            a, b = e.vertices; nb[a].append(b); nb[b].append(a)
        for _ in range(2):  # soften the relief
            disp = np.array([.5 * disp[i] + .5 * np.mean(disp[nb[i]]) if nb[i] else disp[i] for i in range(n)])
        for v in me.vertices:
            v.co += v.normal * float(disp[v.index])
        print('RELIEF', slot, 'max', round(float(np.abs(disp).max()), 4), 'm')


def tube(name, pts, r, seg=6, closed=True):
    """Polyline tube (bead chain)."""
    vs, fs = [], []; n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]) if closed else (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)])
        t.normalize(); a = t.orthogonal().normalized(); b = t.cross(a)
        vs += [tuple(p + r * (math.cos(2 * math.pi * j / seg) * a + math.sin(2 * math.pi * j / seg) * b)) for j in range(seg)]
    for i in range(n if closed else n - 1):
        for j in range(seg):
            i2 = (i + 1) % n
            fs.append((i * seg + j, i * seg + (j + 1) % seg, i2 * seg + (j + 1) % seg, i2 * seg + j))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    return o


def catmull(ctrl, per=8):
    out = []; n = len(ctrl)
    for i in range(n):
        p0, p1, p2, p3 = ctrl[i - 1], ctrl[i], ctrl[(i + 1) % n], ctrl[(i + 2) % n]
        for k in range(per):
            t = k / per
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def rigid(o, bone):
    g = o.vertex_groups.new(name='rigid_' + bone); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')


def join_into(target, extras):
    for e in extras:
        for p in e.data.polygons:
            p.use_smooth = True
    select_only([target] + extras, target); bpy.ops.object.join()


def build_accessories():
    """Necklace, pendant and bracelets are 3D objects in the reference (they stand off the
    skin in the side views), so they get geometry measured on the pictures."""
    from mathutils.bvhtree import BVHTree
    parts = parts_by_slot(); body = parts['Body']
    bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    nk = AC['necklace']; r = nk['radius']; yc = .02

    def on_skin(x, y, z, off):
        d = Vector((x, y - yc, 0)).normalized()
        hit = bvh.ray_cast(Vector((x, y, z)) + d * .5, -d, 1)[0]
        return (hit + d * off) if hit is not None else Vector((x, y, z))
    ctrl = [on_skin(*c, r + .001) for c in nk['points']]
    chain = tube('necklace', catmull(ctrl, 8), r, 6)
    pd = AC['pendant']; front = on_skin(pd['pos'][0], -.3, pd['pos'][2], pd['size'][1] + r)
    pend = ellipsoid('pendant', tuple(front), pd['size'], 12, 8)
    rigid(chain, 'Chest2'); rigid(pend, 'Chest2')
    n_chain = len(chain.data.polygons)
    join_into(body, [chain, pend])
    br = AC['bracelets']; rings = []
    for x in br['x']:
        zb, zt = arm_at(x)
        bpy.ops.mesh.primitive_torus_add(major_segments=br.get('segments', 10), minor_segments=5, major_radius=br['major'], minor_radius=br['minor'],
                                         location=(x, AN['arm_y'], (zb + zt) / 2), rotation=(0, math.pi / 2, 0))
        t = bpy.context.object; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        rigid(t, 'S_ForeArm'); rings.append(t)
    join_into(parts['Hand'], rings)
    print('ACCESSORIES necklace+pendant -> Body, bracelets', len(br['x']), '-> Hand')


# ----------------------------------------------------------------------------- bake
VIEW_DIR = {'front': Vector((0, 1, 0)), 'back': Vector((0, -1, 0)), 'right': Vector((1, 0, 0)), 'left': Vector((-1, 0, 0))}


def parts_by_slot():
    return {o.name.split('_')[-2]: o for o in bpy.data.collections[NAME].objects if o.type == 'MESH'}


def img_np(path):
    im = bpy.data.images.load(str(path)); w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[..., :3].copy()  # raw sRGB values, row 0 = bottom


def np_img(name, rgb, path=None):
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(name, w, h, alpha=False, float_buffer=True); im.colorspace_settings.name = 'Non-Color'
    px = np.ones((h, w, 4), np.float32); px[..., :3] = rgb; im.pixels.foreach_set(px.ravel())
    if path:
        out = bpy.data.images.new(name + '_png', w, h, alpha=False); out.pixels.foreach_set(px.ravel())
        out.filepath_raw = str(path); out.file_format = 'PNG'; out.save(); bpy.data.images.remove(out)
    return im


def box_blur(a, r, passes=3):
    """Separable box blur (3 passes ~ Gaussian) via cumulative sums."""
    for _ in range(passes):
        for ax in (0, 1):
            pad = [(0, 0)] * a.ndim; pad[ax] = (r + 1, r)
            c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax)
            n = a.shape[ax]
            a = (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=ax) - np.take(c, range(0, n), axis=ax)) / (2 * r + 1)
    return a


def bleed(rgb, mask, erode=3, steps=40):
    """Remove the drawn silhouette line and push interior colour outward, so slight
    model/reference misfit samples the character instead of backdrop or ink."""
    m = mask.copy()
    for _ in range(erode):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    c = rgb * m[..., None]; f = m.copy()
    for _ in range(steps):
        s = np.zeros_like(c); n = np.zeros(f.shape, np.float32)
        for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
            s += np.roll(c * f[..., None], sh, ax); n += np.roll(f, sh, ax)
        new = ~f & (n > 0); c[new] = s[new] / n[new, None]; f |= new
    out = rgb.copy(); out[f] = c[f]
    return out


def register_rows(rgb, mask, cal, faces):
    """Side views drawn with a different lean: stretch each row so the reference span
    lands on the model's (depth view) span. Rows without a single body span are kept."""
    ppm, c0 = cal['px_per_m'], cal['centre_px']
    to_px = (lambda y: c0 - y * ppm) if faces == 'right' else (lambda y: c0 + y * ppm)
    h, w = mask.shape; xs = np.arange(w, dtype=np.float32); out = rgb.copy()
    rows = np.nonzero(mask.any(1))[0]
    a = np.array([np.nonzero(mask[r])[0][0] for r in rows], float); b = np.array([np.nonzero(mask[r])[0][-1] for r in rows], float)
    z = (cal['sole_px'] - (h - 1 - rows)) / ppm  # rows are bottom-up here
    t0 = np.array([min(to_px(side_at(zz)[0]), to_px(side_at(zz)[1])) for zz in z]); t1 = np.array([max(to_px(side_at(zz)[0]), to_px(side_at(zz)[1])) for zz in z])
    a, b, t0, t1 = (medfilt(v, 9) for v in (a, b, t0, t1))
    for i, r in enumerate(rows):
        if t1[i] - t0[i] < 4 or b[i] - a[i] < 4:
            continue
        src = a[i] + (xs - t0[i]) * (b[i] - a[i]) / (t1[i] - t0[i])
        for ch in range(3):
            out[r, :, ch] = np.interp(src, xs, rgb[r, :, ch])
    return out


def side_validity(cal, shape):
    """In a T-pose side view the arm is seen end-on: hand, bracelets and deltoid cover a
    disc in front of the shoulder. Pixels there must not paint the torso behind it."""
    h, w = shape; ppm, c0 = cal['px_per_m'], cal['centre_px']
    reach = (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
    zc = sum(arm_at(ARM_X0)) / 2; r = (arm_at(ARM_X0)[1] - arm_at(ARM_X0)[0]) / 2 + .02  # end-on arm: hand, bracelets, deltoid outline
    ys = (np.arange(w) - c0) / ppm * (-1 if cal['faces'] == 'right' else 1)
    zs = (cal['sole_px'] - (h - 1 - np.arange(h))) / ppm
    return (((ys[None, :] - AN['arm_y']) ** 2 + (zs[:, None] - zc) ** 2) > r * r).astype(np.float32)


def proj_material(view, image, cal):
    """Emission = reference picture projected orthographically with its calibration."""
    W, Hh = cal['size_px']; ppm = cal['px_per_m']; c = cal['centre_px']; faces = cal['faces'] if view.startswith('side') else view
    mat = bpy.data.materials.new(f'proj_{view}'); mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])

    def lin(sock, k, b):  # k*sock + b
        n = nt.nodes.new('ShaderNodeMath'); n.operation = 'MULTIPLY_ADD'; nt.links.new(sock, n.inputs[0]); n.inputs[1].default_value = k; n.inputs[2].default_value = b
        return n.outputs[0]
    axis, sgn = {'front': ('X', 1), 'back': ('X', -1), 'right': ('Y', -1), 'left': ('Y', 1)}[faces]
    u = lin(sep.outputs[axis], sgn * ppm / W, c / W)
    v = lin(sep.outputs['Z'], ppm / Hh, 1 - cal['sole_px'] / Hh)
    comb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(u, comb.inputs[0]); nt.links.new(v, comb.inputs[1])
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.extension = 'EXTEND'; nt.links.new(comb.outputs[0], tex.inputs['Vector'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs[0], em.inputs[0])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs[0])
    return mat


def bake_into(obj, mat, size, kind):
    obj.data.materials.clear(); obj.data.materials.append(mat)
    nt = mat.node_tree
    target = bpy.data.images.new('bake', size, size, alpha=False, float_buffer=True); target.colorspace_settings.name = 'Non-Color'
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = target; nt.nodes.active = n
    select_only([obj])
    if kind == 'EMIT':
        bpy.ops.object.bake(type='EMIT', margin=8, use_clear=True)
    else:
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT'}, margin=8, use_clear=True)
    a = np.empty(size * size * 4, np.float32); target.pixels.foreach_get(a)
    nt.nodes.remove(n); bpy.data.images.remove(target)
    return a.reshape(size, size, 4)[..., :3]


def stage_bake():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4; sc.cycles.use_denoising = False
    sc.render.bake.margin_type = 'EXTEND'
    sc.world = bpy.data.worlds.new('black'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0
    parts = parts_by_slot()
    (OUT / 'textures').mkdir(exist_ok=True); (OUT / 'refs').mkdir(exist_ok=True)

    # Reference pictures: bleed past the silhouette, register drifting side views.
    refs = {}
    tr = CFG.get('texture_references', {})
    for view, cal in M['calibration'].items():
        mask = np.load(OUT / 'masks' / f'{view}.npy')[::-1]
        if view in tr.get('views', {}):
            # Sharper upscaled picture (ComfyUI): same framing, k times the pixels.
            k = int(tr['scale']); rgb = img_np(CDIR / tr['views'][view])
            # Keep the upscaler's crisp edges but the original's colour and shading:
            # rgb += blur(original - rgb) (low frequencies come back from the user's picture).
            o = img_np(CDIR / CFG['references'][view]).repeat(k, 0).repeat(k, 1)[:rgb.shape[0], :rgb.shape[1]]
            rgb = np.clip(rgb + box_blur(o - rgb, int(tr.get('detail_radius', 2 * k))), 0, 1)
            mask = mask.repeat(k, 0).repeat(k, 1)[:rgb.shape[0], :rgb.shape[1]]
            off = (k - 1) / 2
            cal = dict(cal, px_per_m=cal['px_per_m'] * k, centre_px=cal['centre_px'] * k + off, sole_px=cal['sole_px'] * k + off,
                       top_px=cal['top_px'] * k + off, size_px=[rgb.shape[1], rgb.shape[0]])
        else:
            rgb = img_np(CDIR / CFG['references'][view])
        rgb = bleed(rgb, mask, erode=3 * int(tr.get('scale', 1)), steps=40 * int(tr.get('scale', 1)))
        if view.startswith('side') and view != B['depth_view']:
            rgb = register_rows(rgb, mask, cal, cal['faces'])
        valid = side_validity(cal, mask.shape) if view.startswith('side') else np.ones(mask.shape, np.float32)
        refs[view] = (np_img(f'ref_{view}', rgb, OUT / 'refs' / f'{view}.png'), cal, np_img(f'valid_{view}', np.repeat(valid[..., None], 3, 2)))

    for slot, o in parts.items():
        if B['parts'][slot].get('keep_uv'):   # its own packed atlas (generated mesh): smart project wasted 3/4 of it
            continue
        select_only([o]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.02, scale_to_bounds=False)
        bpy.ops.uv.pack_islands(margin=.02); bpy.ops.object.mode_set(mode='OBJECT')

    sun = bpy.data.objects.new('bake_sun', bpy.data.lights.new('bake_sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 1; sun.data.angle = 0
    white = bpy.data.materials.new('vis'); white.use_nodes = True; nt = white.node_tree; nt.nodes.clear()
    d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs[0].default_value = (1, 1, 1, 1); o_ = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(d.outputs[0], o_.inputs[0])
    view_gain = {'front': 1, 'back': 1, 'side_left': .8, 'side_right': .8, **B.get('view_gain', {})}
    stats = {}
    for slot, o in parts.items():
        size = B['parts'][slot]['texture']
        acc = np.zeros((size, size, 3)); wsum = np.zeros((size, size, 1)); cols = []
        for view, (im, cal, valid) in refs.items():
            faces = cal['faces'] if view.startswith('side') else view
            col = bake_into(o, proj_material(view, im, cal), size, 'EMIT')
            # The hand itself is the occluder: it keeps the end-on colours.
            ok = bake_into(o, proj_material(view, valid, cal), size, 'EMIT')[..., :1] if view.startswith('side') and slot != 'Hand' else 1
            sun.rotation_euler = VIEW_DIR[faces].to_track_quat('-Z', 'Y').to_euler()
            vis = bake_into(o, white, size, 'DIFFUSE')[..., :1]
            vis = vis / max(vis.max(), 1e-6)
            w = {**view_gain, **B['parts'][slot].get('view_gain', {})}[view] * vis ** B.get('view_sharpness', 8) * ok  # high power: the most frontal view wins, less blur
            acc += w * col; wsum += w; cols.append(col)
        # Texels no view sees (under the arms, inside folds): plain average of the views.
        fallback = np.mean(cols[:2], 0)  # front/back only: side views hold the end-on arms
        tex = np.where(wsum > 1e-9, acc / np.maximum(wsum, 1e-12), fallback)
        img = np_img(f'{o.name}', tex.astype(np.float32), OUT / 'textures' / f'{o.name}.png')
        stats[slot] = {'texture': size, 'unseen_ratio': round(float((wsum < 1e-9).mean()), 3)}
        mat = bpy.data.materials.new(o.name); mat.use_nodes = True
        t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(str(OUT / 'textures' / f'{o.name}.png'))
        mat.node_tree.links.new(t.outputs[0], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat)
    bpy.data.objects.remove(sun)

    # Mirrored slots: the right side reuses the left side's UV space (Lunia hands/feet).
    for slot, o in parts.items():
        if B['parts'][slot].get('mirrored'):
            r = o.copy(); r.data = o.data.copy(); bpy.data.collections[NAME].objects.link(r)
            r.data.transform(Matrix.Scale(-1, 4, (1, 0, 0))); r.data.flip_normals()
            select_only([o, r], o); bpy.ops.object.join()
    print('BAKE', json.dumps(stats))


# ----------------------------------------------------------------------------- rig
# Lunia-style names (Base/Waist/Chest1/Chest2, L_/R_ limbs, 2-bone finger mitten, thumb,
# EffectBaseJoint on the ground) plus a Cord chain standing in for Lunia's Support chains.
SLOT_BONES = {
    'Head': ['Head'],
    'Body': ['Waist', 'Chest1', 'Chest2', 'Neck', 'Head'] + [f'{s}_{b}' for s in 'LR' for b in ('Shoulder', 'UpperArm', 'ForeArm', 'Hand')],  # + necklace
    'Hand': [f'{s}_{b}' for s in 'LR' for b in ('ForeArm', 'Hand', 'Finger1', 'Finger2', 'Thumb1', 'Thumb2')],
    'Leg': ['Base', 'Pelvis', 'Waist'] + [f'{s}_{b}' for s in 'LR' for b in ('Thigh', 'Calf')],
    'Foot': [f'{s}_{b}' for s in 'LR' for b in ('Calf', 'Foot', 'Toe1')],
    'Support': ['Base', 'Pelvis', 'Cord01', 'Cord02', 'Cord03'],
}
# Adopted single-mesh characters (tools/charpipe/adopt.py): one slot, every deform bone.
SLOT_BONES['Full'] = sorted({b for v in SLOT_BONES.values() for b in v} | {'Base', 'Pelvis'})


def joints():
    """Joint positions from measurements + anatomy ratios in character.json."""
    yc = lambda z: sum(side_at(z)) / 2 + .01  # spine sits slightly behind mid-depth
    hip_z = LM['crotch'] + AN['hip_joint_above_crotch']; ank = AN['ankle_z']
    knee_z = ank + AN['knee_ratio'] * (hip_z - ank)
    reach = (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
    sx = AN['shoulder_joint_x']; wx = reach - AN['hand_length']; ex = sx + AN['elbow_ratio'] * (wx - sx)
    hl = AN['hand_length']; yA = AN['arm_y']; hb = AN['hand_breadth'] / 2
    zc = lambda x: sum(arm_at(max(x, ARM_X0))) / 2  # inside ARM_X0 the column is torso, not arm
    leg_x = lambda z: float(-(np.interp(z, LEGS[:, 0], LEGS[:, 3]) + np.interp(z, LEGS[:, 0], LEGS[:, 4])) / 2)
    feet = SIDE[SIDE[:, 0] < .11]; toe_y = feet[:, 1].min(); heel_y = float(np.median(feet[:, 2]))
    fx = leg_x(.04); ay = heel_y - .055
    neck0, head0 = AN['neck_base_z'], AN['head_joint_z']
    J = {
        'Base': ((0, yc(hip_z + .04), hip_z + .04), (0, yc(1.06), 1.06), None),
        'Waist': ((0, yc(1.06), 1.06), (0, yc(1.2), 1.2), 'Base'),
        'Chest1': ((0, yc(1.2), 1.2), (0, yc(1.32), 1.32), 'Waist'),
        'Chest2': ((0, yc(1.32), 1.32), (0, yc(neck0 - .04), neck0 - .04), 'Chest1'),
        'Neck': ((0, yc(neck0 - .04), neck0 - .04), (0, .02, head0), 'Chest2'),
        'Head': ((0, .02, head0), (0, .02, H - .02), 'Neck'),
        'Pelvis': ((0, yc(hip_z + .04), hip_z + .04), (0, yc(hip_z), hip_z - .03), 'Base'),
        'EffectBaseJoint': ((0, 0, 0), (0, 0, .1), 'Base'),
    }
    cz = [AC['cord_tail']['start_z'], .85, .68, AC['cord_tail']['tassel']['z'][1] + .02]
    for i in range(3):
        a, b = cz[i], cz[i + 1]
        J[f'Cord0{i + 1}'] = ((*cord_centre(a), a), (*cord_centre(b), b), 'Pelvis' if i == 0 else f'Cord0{i}')
    for s, S in ((1, 'L'), (-1, 'R')):
        tx = wx + .03
        J.update({
            f'{S}_Shoulder': ((s * .03, yA, zc(sx) + .03), (s * sx, yA, zc(sx)), 'Chest2'),
            f'{S}_UpperArm': ((s * sx, yA, zc(sx)), (s * ex, yA, zc(ex)), f'{S}_Shoulder'),
            f'{S}_ForeArm': ((s * ex, yA, zc(ex)), (s * wx, yA, zc(wx)), f'{S}_UpperArm'),
            f'{S}_Hand': ((s * wx, yA, zc(wx)), (s * (wx + .45 * hl), yA, zc(wx + .45 * hl)), f'{S}_ForeArm'),
            f'{S}_Finger1': ((s * (wx + .45 * hl), yA, zc(wx + .45 * hl)), (s * (wx + .72 * hl), yA, zc(wx + .72 * hl)), f'{S}_Hand'),
            f'{S}_Finger2': ((s * (wx + .72 * hl), yA, zc(wx + .72 * hl)), (s * reach, yA, zc(reach)), f'{S}_Finger1'),
            f'{S}_Thumb1': ((s * tx, yA - hb * .5, zc(tx) - .006), (s * (tx + .03), yA - hb * .5 - .028, zc(tx) - .012), f'{S}_Hand'),
            f'{S}_Thumb2': ((s * (tx + .03), yA - hb * .5 - .028, zc(tx) - .012), (s * (tx + .055), yA - hb * .5 - .05, zc(tx) - .016), f'{S}_Thumb1'),
            f'{S}_Thigh': ((s * AN['hip_joint_x'], yc(hip_z) - .01, hip_z), (s * leg_x(knee_z), sum(side_at(knee_z)) / 2 - .01, knee_z), 'Pelvis'),
            f'{S}_Calf': ((s * leg_x(knee_z), sum(side_at(knee_z)) / 2 - .01, knee_z), (s * fx, ay, ank), f'{S}_Thigh'),
            f'{S}_Foot': ((s * fx, ay, ank), (s * fx, heel_y + .7 * (toe_y - heel_y), .028), f'{S}_Calf'),
            f'{S}_Toe1': ((s * fx, heel_y + .7 * (toe_y - heel_y), .028), (s * fx, toe_y, .02), f'{S}_Foot'),
        })
    return J


def distance_weights(o, names, J, falloff=.04):
    """Fallback when bone-heat fails: blend the two nearest bone segments."""
    for v in o.data.vertices:
        p = o.matrix_world @ v.co; ds = []
        for n in names:
            a, b = Vector(J[n][0]), Vector(J[n][1]); d = b - a
            t = max(0, min(1, (p - a).dot(d) / d.length_squared)); ds.append(((p - a - t * d).length, n))
        ds.sort(); d0 = ds[0][0]
        ws = [(math.exp(-((d - d0) / falloff) ** 2), n) for d, n in ds[:2]]; tot = sum(w for w, _ in ws)
        for w, n in ws:
            o.vertex_groups[n].add([v.index], w / tot, 'REPLACE')


def fade_thighs_above_hips(o, J, band=.06):
    """Heat weighting lets the thighs pull the waistband; above the hip joint the
    trousers belong to the pelvis."""
    hz = J['L_Thigh'][0][2]; pel = o.vertex_groups['Pelvis']
    thighs = [o.vertex_groups[n].index for n in ('L_Thigh', 'R_Thigh') if n in o.vertex_groups]
    for v in o.data.vertices:
        k = min(1, max(0, (hz + band - v.co.z) / band))
        if k >= 1:
            continue
        moved = 0
        for g in v.groups:
            if g.group in thighs:
                moved += g.weight * (1 - k); o.vertex_groups[g.group].add([v.index], g.weight * k, 'REPLACE')
        if moved:
            cur = next((g.weight for g in v.groups if g.group == pel.index), 0)
            pel.add([v.index], cur + moved, 'REPLACE')


def bone_influences(o):
    """Max bone weights per vertex (non-bone groups such as 'silhouette' excluded)."""
    rig = o.parent; bones = set(rig.data.bones.keys()) if rig and rig.type == 'ARMATURE' else set()
    names = {g.index: g.name for g in o.vertex_groups}
    return max(len([g for g in v.groups if g.weight > 1e-4 and names[g.group] in bones]) for v in o.data.vertices)


def sash_vertices(o, slot):
    """The hanging cordão is a thin strip: when it swings, a 2-tone light band flips it
    light/dark and the inverted hull cuts through it. Those vertices get neither."""
    zs = AC['cord_tail']['start_z']
    if slot == 'Support':
        return {v.index for v in o.data.vertices if (o.matrix_world @ v.co).z < zs}
    if slot != 'Full':
        return set()
    # Adopted single mesh: find the sash by its painted colours below the belt, on the left side.
    img = next((n.image for m in o.data.materials if m and m.node_tree for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
    if img is None:
        return set()
    w, h = img.size; px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    uv = o.data.uv_layers.active.data; vuv = {}
    for l in o.data.loops:
        vuv.setdefault(l.vertex_index, uv[l.index].uv)
    out = set()
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        if not (p.z < zs and p.x > .1) or v.index not in vuv:
            continue
        u, t = vuv[v.index]; c = px[int(np.clip(t * h, 0, h - 1)), int(np.clip(u * w, 0, w - 1)), :3]
        if c.max() - c.min() > .35 and c.max() > .3:
            out.add(v.index)
    return out


def mark_silhouette(o, slot, no_line):
    """Lunia 'NoSilhouette' + no light band. Thin accessories and the head base tucked into the
    neck get no inverted-hull line; the hanging sash gets neither line nor band. Stored as the
    'silhouette' vertex group (Blender Solidify) and as the active colour attribute
    (glTF COLOR_0: R = outline weight, G = light-band weight) for the game shaders."""
    jz = AN['head_joint_z']; sash = sash_vertices(o, slot)
    w, band = [], []
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        hidden_base = slot == 'Head' and p.z < jz and p.y > -.03
        w.append(0.0 if (v.index in no_line or hidden_base or v.index in sash) else 1.0)
        band.append(0.0 if v.index in sash else 1.0)
    g = o.vertex_groups.new(name='silhouette')
    for i, x in enumerate(w):
        g.add([i], x, 'REPLACE')
    attr = o.data.color_attributes.new('silhouette', 'FLOAT_COLOR', 'POINT')
    for i, (x, b) in enumerate(zip(w, band)):
        attr.data[i].color = (x, b, 0, 1)
    o.data.color_attributes.active_color = attr


def arm_length_edit(parts, J, scale):
    """Shorten (scale < 1) the whole arm, shoulder to fingertips, after texturing: upper arm and
    forearm are compressed along X, the hand keeps its size and slides inward. Applied to the
    T-pose meshes (arm band only) and to the arm joints, so weights and clips stay consistent."""
    sx = J['L_UpperArm'][0][0]; wx = J['L_Hand'][0][0]
    reach = (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
    d = (1 - scale) * (reach - sx)                 # total length removed
    k = (wx - sx - d) / (wx - sx)                  # compression of the shoulder->wrist segment

    def fx(x):
        a = abs(x)
        if a <= sx:
            return x
        return math.copysign(sx + (a - sx) * k if a <= wx else a - d, x)
    zmin = CL['pants_top_z'] + .03                 # trousers/belt are never touched
    for o in parts.values():
        for v in o.data.vertices:
            if v.co.z > zmin:
                v.co.x = fx(v.co.x)
        o.data.update()
    for n, (a, b, par) in list(J.items()):
        if n[2:] in ('Shoulder', 'UpperArm', 'ForeArm', 'Hand', 'Finger1', 'Finger2', 'Thumb1', 'Thumb2'):
            J[n] = ((fx(a[0]), a[1], a[2]), (fx(b[0]), b[1], b[2]), par)
    return dict(scale=scale, removed_m=round(d, 3), segment_k=round(k, 3), span_m=round(2 * (reach - d), 3))


def stage_rig():
    parts = parts_by_slot(); J = joints()
    if B.get('arm_scale', 1) != 1:
        print('ARM_EDIT', json.dumps(arm_length_edit(parts, J, B['arm_scale'])))
    arm = bpy.data.armatures.new(f'{NAME}_Skeleton'); rig = bpy.data.objects.new(f'{NAME}_Skeleton', arm)
    bpy.data.collections[NAME].objects.link(rig); select_only([rig]); bpy.ops.object.mode_set(mode='EDIT')
    for n, (a, b, p) in J.items():
        e = arm.edit_bones.new(n); e.head = a; e.tail = b
    for n, (a, b, p) in J.items():
        if p:
            arm.edit_bones[n].parent = arm.edit_bones[p]
            arm.edit_bones[n].use_connect = (Vector(arm.edit_bones[p].tail) - Vector(a)).length < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT'); rig.show_in_front = True
    arm.bones['EffectBaseJoint'].use_deform = False
    report = {}
    # Accessory shells carry rigid_<bone> groups: remember them, weighting rebuilds the groups.
    rigid_sets = {}
    for slot, o in parts.items():
        for g in list(o.vertex_groups):
            if g.name.startswith('rigid_'):
                rigid_sets.setdefault(slot, {})[g.name[6:]] = [v.index for v in o.data.vertices if any(x.group == g.index and x.weight > .5 for x in v.groups)]
                o.vertex_groups.remove(g)
    for slot, o in parts.items():
        allowed = SLOT_BONES[slot]
        for n in J:
            o.vertex_groups.new(name=n) if n in allowed else None
        if slot == 'Head':  # Lunia: the head is rigid on one bone
            o.vertex_groups['Head'].add(list(range(len(o.data.vertices))), 1, 'REPLACE'); method = 'rigid'
        else:
            for b in arm.bones:
                b.use_deform = b.name in allowed
            select_only([o, rig], rig)
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
            rigid_idx = {i for idx in rigid_sets.get(slot, {}).values() for i in idx}  # accessory shells are overridden below
            unweighted = sum(1 for v in o.data.vertices if v.index not in rigid_idx and not any(g.weight > 1e-4 for g in v.groups))
            method = 'heat'
            if unweighted:
                for g in list(o.vertex_groups):
                    o.vertex_groups.remove(g)
                for n in allowed:
                    o.vertex_groups.new(name=n)
                distance_weights(o, allowed, J); method = f'distance (heat left {unweighted} verts)'
        if not o.parent:
            o.parent = rig
        if not any(m.type == 'ARMATURE' for m in o.modifiers):
            o.modifiers.new('Armature', 'ARMATURE').object = rig
        for m in o.modifiers:
            if m.type == 'ARMATURE':
                m.object = rig
        if slot in ('Leg', 'Support', 'Full'):
            fade_thighs_above_hips(o, J)
        for bone_pat, idx in rigid_sets.get(slot, {}).items():
            for i in idx:
                x = (o.matrix_world @ o.data.vertices[i].co).x
                bone = bone_pat.replace('S_', ('L_' if x > 0 else 'R_'))
                for g in list(o.data.vertices[i].groups):
                    o.vertex_groups[g.group].add([i], 0, 'REPLACE')
                o.vertex_groups[bone].add([i], 1, 'REPLACE')
        # Lunia rule: at most two influences, normalised.
        select_only([o]); bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=2)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        mark_silhouette(o, slot, {i for idx in rigid_sets.get(slot, {}).values() for i in idx})
        report[slot] = {'weights': method, 'max_influences': bone_influences(o)}
    for b in arm.bones:
        b.use_deform = b.name != 'EffectBaseJoint'
    make_pose_test(rig)
    print('RIG', json.dumps(report))


POSES = {  # frame: [(bone, world axis, degrees)], parents first. Faces -Y, left = +X.
    0: [],
    15: [('L_UpperArm', 'Y', 60), ('R_UpperArm', 'Y', -60), ('L_ForeArm', 'Z', -25), ('R_ForeArm', 'Z', 25)],
    30: [('Chest1', 'Z', 20), ('L_UpperArm', 'Y', 35), ('R_UpperArm', 'Y', -70), ('L_ForeArm', 'Z', -80), ('R_ForeArm', 'Z', 60),
         ('L_Thigh', 'X', -45), ('L_Calf', 'X', 70), ('R_Thigh', 'X', 25), ('R_Calf', 'X', 35), ('L_Finger1', 'Y', 70), ('L_Finger2', 'Y', 60)],
    45: [('Chest1', 'X', -12), ('L_UpperArm', 'Y', 70), ('R_UpperArm', 'Y', -30), ('R_Thigh', 'X', -85), ('R_Calf', 'X', 15),
         ('L_Calf', 'X', 20), ('Cord01', 'X', 25), ('Cord02', 'X', 15)],
}


def make_pose_test(rig):
    """Deformation check: rest, arms down, ginga-like crouch, high front kick."""
    rig.animation_data_create(); rig.animation_data.action = None  # pose unbound, key afterwards
    order = [b.name for b in rig.data.bones]  # bones are created parents first
    frames = []
    for f, rots in POSES.items():
        for pb in rig.pose.bones:
            pb.rotation_mode = 'QUATERNION'; pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        for name in order:
            for bn, ax, deg in rots:
                if bn != name:
                    continue
                pb = rig.pose.bones[bn]; mtx = pb.matrix.copy(); h = mtx.translation.copy()
                pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, ax) @ Matrix.Translation(-h) @ mtx
                bpy.context.view_layer.update()
        frames.append((f, {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}))
    act = bpy.data.actions.new('PoseTest'); act.use_fake_user = True; rig.animation_data.action = act
    for f, pose in frames:
        for pb in rig.pose.bones:
            pb.rotation_quaternion, pb.location = pose[pb.name]
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 0, max(POSES); sc.frame_set(0)


# ----------------------------------------------------------------------------- anim
def stage_anim():
    sys.path.insert(0, str(Path(__file__).parent))
    import clips
    rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')
    ankles = {S: rig.data.bones[f'{S}_Calf'].tail_local.copy() for S in 'LR'}
    made = clips.bake_clips(rig, ankles)
    # Motion capture replaces authored clips where configured (e.g. Mixamo ginga for idle).
    for name, spec in B.get('mocap', {}).items():
        if name in bpy.data.actions:
            bpy.data.actions.remove(bpy.data.actions[name])
        spec = {'file': spec} if isinstance(spec, str) else spec
        info = clips.bake_mixamo(rig, ankles, CDIR / spec['file'], name, sway=spec.get('sway', B.get('mocap_sway', .15)),
                                 loop=name in clips.LOOPS, duration=spec.get('duration'), contact=spec.get('contact'),
                                 segment=spec.get('segment'), source_contact=spec.get('source_contact'),
                                 contact_mode=spec.get('contact_mode', 'height'), return_blend=spec.get('return_blend', 0.0),
                                 action=spec.get('action'), blend_s=spec.get('blend', .25), airborne=spec.get('airborne', False))
        print('MOCAP', json.dumps(info))
    print('ANIM', made)


# ----------------------------------------------------------------------------- look
def toon_material(name, image):
    """Lunia 'Cartoon': painted diffuse x 2-tone light band (BandTexture), no specular."""
    lk = B['look']
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image
    dif = nt.nodes.new('ShaderNodeBsdfDiffuse'); s2r = nt.nodes.new('ShaderNodeShaderToRGB'); nt.links.new(dif.outputs[0], s2r.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = (*[lk['band'][0]] * 3, 1); e[1].position = lk['band_threshold']; e[1].color = (*[lk['band'][1]] * 3, 1)
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(s2r.outputs[0], bw.inputs[0]); nt.links.new(bw.outputs[0], ramp.inputs[0])
    # G of the 'silhouette' attribute: 1 = banded, 0 = always lit (sash).
    attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'silhouette'
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(attr.outputs['Color'], sep.inputs[0])
    gate = nt.nodes.new('ShaderNodeMix'); gate.data_type = 'RGBA'; gate.inputs['A'].default_value = (1, 1, 1, 1)
    nt.links.new(sep.outputs[1], gate.inputs['Factor']); nt.links.new(ramp.outputs[0], gate.inputs['B'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    nt.links.new(tex.outputs[0], mix.inputs['A']); nt.links.new(gate.outputs['Result'], mix.inputs['B'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(mix.outputs['Result'], em.inputs[0])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs[0])
    return m


def stage_look():
    sc = bpy.context.scene; lk = B['look']; parts = parts_by_slot()
    line = bpy.data.materials.new(f'{NAME}_Silhouette'); line.use_nodes = True; nt = line.node_tree; nt.nodes.clear()
    # Lunia shader constants are gamma-space (D3D9): linearise for Blender.
    lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in lk['outline_color']]
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (*lin, 1)
    nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0]); line.use_backface_culling = True
    for slot, o in parts.items():
        img = bpy.data.images.load(str(OUT / 'textures' / f'{o.name}.png'), check_existing=True)
        o.data.materials.clear(); o.data.materials.append(toon_material(o.name, img)); o.data.materials.append(line)
        # Inverted hull outline (Lunia CharacterSilhouette: dark grey, ~0.5% of height).
        sol = o.modifiers.new('Silhouette', 'SOLIDIFY'); sol.thickness = lk['outline_ratio'] * H; sol.offset = 1
        sol.use_flip_normals = True; sol.material_offset = 1; sol.use_rim = False
        if 'silhouette' in o.vertex_groups:
            sol.vertex_group = 'silhouette'; sol.thickness_vertex_group = 0.0
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    sc.world = bpy.data.worlds.new('Studio'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .8, .84, 1)
    sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
    rd = OUT / 'renders'; rd.mkdir(exist_ok=True)
    cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam); sc.camera = cam
    rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')

    def shot(name, loc, target, ortho=None, lens=50, res=(900, 1000), frame=0):
        sc.frame_set(frame + 1); sc.frame_set(frame)  # same-frame set after an action swap does not re-evaluate
        cam.location = loc; cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.type = 'ORTHO' if ortho else 'PERSP'; cam.data.ortho_scale = ortho or 1; cam.data.lens = lens
        sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = str(rd / f'{name}.png'); bpy.ops.render.render(write_still=True)
    mid = (0, 0, H / 2)
    for n, d in (('front', (0, -1, 0)), ('back', (0, 1, 0)), ('left', (1, 0, 0)), ('threequarter', (.75, -1, .12))):
        shot(n, Vector(mid) + Vector(d).normalized() * 8, mid, ortho=2.1 if n != 'threequarter' else None, lens=85, res=(1300, 1000) if n in ('front', 'back') else (900, 1000))
    shot('face', (.25, -1.6, 1.68), (0, 0, 1.66), lens=85, res=(800, 800))
    acts = bpy.data.actions
    rig.animation_data_create()
    if 'PoseTest' in acts:
        rig.animation_data.action = acts['PoseTest']
        for f in (15, 30, 45):
            shot(f'pose-{f}', (2.4, -4.2, 1.6), (0, 0, .95), lens=50, frame=f)
    # Game clips at their key/contact frames (contact = config.js hit time).
    fps = sc.render.fps
    for clip, t in (('idle', 0), ('idle', .98), ('run', 0), ('run', .12), ('combo0', .16), ('combo1', .16), ('combo2', .3),
                    ('rasteira', .22), ('meialua', .38), ('dodge', .12), ('jump', 0), ('hit', .08), ('dead', .65), ('victory', 0)):
        if clip in acts:
            rig.animation_data.action = acts[clip]
            shot(f'clip-{clip}-{int(t * 100):03d}', (2.6, -4.6, 1.9), (0, 0, .8), lens=45, res=(800, 900), frame=round(t * fps))
    # Lunia-like gameplay camera: high, fixed, character small on screen.
    if 'idle' in acts:
        rig.animation_data.action = acts['idle']
    shot('game-camera', (0, -7.5, 7.0), (0, 0, .8), lens=50, res=(1280, 720), frame=0)
    rig.animation_data.action = None; sc.frame_set(0)
    print('LOOK done')


# ----------------------------------------------------------------------------- export
def stage_export():
    parts = parts_by_slot(); rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')
    ed = CDIR / 'export'; ed.mkdir(exist_ok=True)
    saved = {}
    for slot, o in parts.items():  # glTF gets plain base-colour materials; the toon look lives in the engine
        saved[o.name] = list(o.data.materials)
        m = bpy.data.materials.new(o.name + '_gltf'); m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 1; bsdf.inputs['Specular IOR Level'].default_value = 0
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = saved[o.name][0].node_tree.nodes['Image Texture'].image
        m.node_tree.links.new(t.outputs[0], bsdf.inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(m)
    select_only([rig] + list(parts.values()), rig)
    bpy.ops.export_scene.gltf(filepath=str(ed / f'{NAME}.glb'), export_format='GLB', use_selection=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_yup=True, export_vertex_color='ACTIVE')
    for slot, o in parts.items():
        o.data.materials.clear()
        for m in saved[o.name]:
            o.data.materials.append(m)
    tris = {slot: sum(len(p.vertices) - 2 for p in o.data.polygons) for slot, o in parts.items()}
    infl = {slot: bone_influences(o) for slot, o in parts.items()}
    rv = sorted((OUT / 'review').glob('*.json'), key=lambda p: p.stat().st_mtime)
    report = {
        'character': NAME, 'height_m': H, 'slots': list(parts), 'triangles': tris, 'total_triangles': sum(tris.values()),
        'textures': {slot: B['parts'][slot]['texture'] for slot in parts}, 'max_influences': infl,
        'bones': len(rig.data.bones), 'bone_names': [b.name for b in rig.data.bones], 'clips': [a.name for a in bpy.data.actions],
        'look': B['look'], 'silhouette_iou': json.loads(rv[-1].read_text()) if rv else None,
        'glb': str((ed / f'{NAME}.glb').relative_to(ROOT)),
    }
    (ed / f'{NAME}-report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(CDIR / f'{NAME}.blend'))
    print('EXPORT', json.dumps({k: report[k] for k in ('triangles', 'total_triangles', 'bones', 'max_influences', 'clips')}))


# ----------------------------------------------------------------------------- driver
def save(stage):
    bpy.context.preferences.filepaths.save_version = 0  # factory reset in 'geo' restores backups
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'stage-{stage}.blend'))


def load_before(stage):
    i = ALL_STAGES.index(stage)
    if i:
        bpy.ops.wm.open_mainfile(filepath=str(OUT / f'stage-{ALL_STAGES[i - 1]}.blend'))


FUNCS = {'geo': stage_geo, 'fit': stage_fit, 'bake': stage_bake, 'rig': stage_rig, 'anim': stage_anim, 'look': stage_look, 'export': stage_export}
for i, st in enumerate(STAGES):
    if i == 0 and st != 'geo':
        load_before(st)
    if st in FUNCS:
        FUNCS[st]()
        if st != 'export':  # export writes the final <Name>.blend itself
            save(st)
