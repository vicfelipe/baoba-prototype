"""Cangaceiro (DPS Ranged) from its own turnaround; shared pipeline bake/rig/export code.
blender -b --python tools/charpipe/cangaceiro_build.py -- SourceArt/Cangaceiro/character.json [--from bake|rig|anim|look|export] [--to <stage>]

Everything is measured on this character's masks (build/masks, build/measure.json) and
crops of its references; nothing comes from another character's build. Metres, Z up,
faces -Y, character's left = +X. Slots: Head (face, hair, hat), Body (torso, arms),
Hand, Leg (trousers), Foot (boots), Support (belt, pouch, shoulder pads, tunic flaps)
and three Weapon meshes modelled on the weapon sheet (cangaceiro_weapons.py).
"""
import bpy, bmesh, sys, math, json, hashlib, importlib.util
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
args = sys.argv[sys.argv.index('--') + 1:]
resume = args[args.index('--from') + 1] if '--from' in args else 'geo'
last = args[args.index('--to') + 1] if '--to' in args else 'export'
sys.argv = sys.argv[:sys.argv.index('--') + 1] + [args[0], '--stages', '']
spec = importlib.util.spec_from_file_location('charpipe_build', HERE / 'build.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
H, OUT, NAME, M = p.H, p.OUT, p.NAME, p.M
sys.path.insert(0, str(HERE))
import cangaceiro_weapons as weapons

# Landmarks measured on the references (crop.py grids, measure.json). See doc 21.
HEAD_TOP = 1.80      # head under the hat (front: chin y=130, eyes y=84 -> top y~38)
CHIN = 1.575
NECK_Z = 1.50
BELT = (1.05, 1.11)
HIP_Z, KNEE_Z, ANKLE_Z = .92, .50, .085
SHOULDER_X, ELBOW_X, WRIST_X, REACH = .19, .465, .715, (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
ARM_Z = 1.41
BOOT_TOP = .47
HEEL_Y, TOE_Y = .135, -.18
FOOT_X = .175
# Tunic flaps: azimuth k*45 deg from the front (left = +X); tip heights read on the views.
SKIRT = ['F', 'FL', 'L', 'BL', 'B', 'BR', 'R', 'FR']
SKIRT_TIP = [.79, .64, .63, .64, .635, .64, .63, .64]


def mask(view):
    cal = M['calibration'][view]; m = np.load(OUT / 'masks' / f'{view}.npy')
    return m, cal


def px_front(x, z, cal):
    return int(round(cal['sole_px'] - z * cal['px_per_m'])), int(round(cal['centre_px'] + x * cal['px_per_m']))


def px_side(y, z, cal):
    sgn = -1 if cal['faces'] == 'right' else 1
    return int(round(cal['sole_px'] - z * cal['px_per_m'])), int(round(cal['centre_px'] + sgn * y * cal['px_per_m']))


def side_span(z, m, cal, ylo=-.4, yhi=.4):
    """[yFront, yBack] of the side mask row at height z, inside a y window."""
    ys = np.arange(ylo, yhi, .002); r, _ = px_side(0, z, cal)
    if not 0 <= r < m.shape[0]:
        return None
    cols = [px_side(y, z, cal)[1] for y in ys]
    hit = [y for y, c in zip(ys, cols) if 0 <= c < m.shape[1] and m[r, c]]
    return (min(hit), max(hit)) if hit else None


def medfilt(v, k=5):
    pd = np.pad(v, k // 2, mode='edge')
    return np.array([np.median(pd[i:i + k]) for i in range(len(v))])


def add(slot, obs, voxel=None, tris=None, smooth=2):
    if voxel:
        o = p.fuse(obs, p.part_name(slot), voxel, tris, smooth)
    else:
        p.select_only(obs); bpy.ops.object.join(); o = bpy.context.object
        o.name = p.part_name(slot); o.data.name = o.name
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for f in o.data.polygons:
            f.use_smooth = True
    for c in list(o.users_collection):
        c.objects.unlink(o)
    bpy.data.collections[NAME].objects.link(o)
    return o


def solidify(o, t):
    p.select_only([o]); m = o.modifiers.new('thick', 'SOLIDIFY'); m.thickness = t; m.offset = 0
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def open_loft(name, rings):
    """Like p.loft but open (no caps, rings not closed): sheets for flaps and pads."""
    n = len(rings[0]); vs = [v for r in rings for v in r]; fs = []
    for k in range(len(rings) - 1):
        for j in range(n - 1):
            fs.append((k * n + j, k * n + j + 1, (k + 1) * n + j + 1, (k + 1) * n + j))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def mark_int(o, name, value):
    a = o.data.attributes.new(name, 'INT', 'POINT')
    for d in a.data:
        d.value = value


# ----------------------------------------------------------------------------- geometry
def hat():
    """Half-moon leather hat as a lens-shaped solid: every front-view column of the hat
    (top/bottom from the front mask) gets the side-view hat depth, narrowed toward the
    horns where front and back brim meet."""
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    # Brim lower edge read on the front crop: 1.742 at the centre, 1.686 at x=.21 (horns lower).
    zb_c = lambda x: 1.742 - .056 * (x / .21) ** 2
    cols = []
    for x in np.arange(-.30, .30, .002):
        r0, c = px_front(x, 1.62, fc)
        if not 0 <= c < fm.shape[1]:
            continue
        rows = [r for r in range(0, r0) if fm[r, c]]
        if not rows:
            continue
        top = (fc['sole_px'] - rows[0]) / fc['px_per_m']
        run = rows[0]
        while run + 1 < r0 and fm[run + 1, c]:
            run += 1
        bot = max((fc['sole_px'] - run) / fc['px_per_m'], zb_c(x) if abs(x) < .16 else 1.62)
        if top - bot > .004:
            cols.append((x, top, bot))
    cols = np.array(cols); X = float(np.abs(cols[:, 0]).max())
    # Side-view hat extents per height (above the brim edge; below it the face shows).
    zs = np.arange(1.62, H + .001, .005); ext = []
    for z in zs:
        s = side_span(max(z, 1.725), sm, sc, -.3, .3)
        if s and z < 1.725:   # below the front brim only the back brim shows behind the hair
            s = (s[0], max(s[1], (side_span(z, sm, sc, -.3, .3) or s)[1]))
        ext.append(s if s else (-.01, .01))
    ext = np.array(ext); yF = medfilt(ext[:, 0], 5); yB = medfilt(ext[:, 1], 5)
    yc = float(np.median((yF + yB) / 2))
    rings = []; N = 14
    xs = X * np.sin(np.linspace(-math.pi / 2, math.pi / 2, 45))
    # Horns swept back over the ears: in both side views the brim clears the eyes and the ear and hair show
    # under it; centred on the face depth, the horns (low in the front view) covered the temple and eye in profile.
    ear_y = float(np.median((ext[:, 0] + ext[:, 1]) / 2)) + .06
    for x in xs:
        top = float(np.interp(x, cols[:, 0], cols[:, 1])); bot = float(np.interp(x, cols[:, 0], cols[:, 2]))
        s = max(.07, math.sqrt(max(0, 1 - (x / X) ** 2))) ** .7
        lv = np.linspace(bot, top, N); lb = np.linspace(min(bot, 1.665 + .03 * (x / .21) ** 2), top, N)
        yh = yc + (ear_y - yc) * max(0., (abs(x) - .12) / (X - .12)) ** 1.5
        f = [(x, yh + (float(np.interp(z, zs, yF)) - yc) * s, z) for z in lv]
        b = [(x, yh + (float(np.interp(z, zs, yB)) - yc) * s, z) for z in lb[::-1]]
        rings.append(f + b)
    return p.loft('hat', rings)


def head():
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    zs = np.arange(CHIN - .015, HEAD_TOP + 1e-6, .005)
    hw, yF, yB = [], [], []
    for z in zs:
        zz = min(max(z, CHIN + .01), 1.70)
        r, c0 = px_front(0, zz, fc)
        a = c0; b = c0
        while fm[r, a - 1]: a -= 1
        while fm[r, b + 1]: b += 1
        hw.append(min(.112, (b - a) / 2 / fc['px_per_m']))
        s = side_span(min(max(z, CHIN), 1.685), sm, sc, -.2, .2)
        yF.append(s[0]); yB.append(min(s[1], .17))
    hw, yF, yB = medfilt(np.array(hw)), np.array(yF), medfilt(np.array(yB))
    base = np.array([yF[max(0, i - 4):i + 5].max() for i in range(len(zs))])   # face plane without the nose
    base = np.convolve(np.pad(base, 3, mode='edge'), np.ones(7) / 7, 'valid')
    resid = np.minimum(0, yF - base)
    rings = []
    for i, z in enumerate(zs):
        t = np.clip((z - zs[0]) / .03, 0, 1)                    # jaw underside
        dome = math.sqrt(max(0, 1 - ((z - 1.70) / (HEAD_TOP - 1.70 + .004)) ** 2)) if z > 1.70 else 1
        w = hw[i] * (.55 + .45 * t) * dome; yc = (base[i] + yB[i]) / 2; d = (yB[i] - base[i]) / 2 * (.7 + .3 * t) * max(dome, .25)
        r = []
        for j in range(36):
            sx, sy = p.se(2 * math.pi * j / 36, 2.2)
            x = w * sx; y = yc + d * sy
            if sy < 0:
                y += resid[i] * math.exp(-(x / .018) ** 2) * min(1, -sy * 1.5)
            r.append((x, y, z))
        rings.append(r)
    o = p.loft('head', rings)
    return o


def torso_and_arms():
    sm, sc = mask(p.B['depth_view'])
    armpit = p.LM['armpit']
    upper = ([armpit, 1.40, 1.46, 1.50, 1.53, 1.56], [.205, .2, .18, .15, .125, .11])
    rings = []
    for z in np.arange(.96, 1.565, .02):
        hw = p.front_hw(z) if z <= armpit else float(np.interp(z, *upper))
        yf, yb = p.side_at(z)
        yb = min(yb, float(np.interp(z, [1.25, 1.42, 1.56], [.17, .165, .12])))
        rings.append(p.ring_z(0, z, hw, yf, yb, 2.3, 36))
    torso = p.loft('torso', rings)
    neck = p.loft('neck', [p.ring_z(0, z, w, -.065 + .01 * k, .07, 2.1, 20) for k, (z, w) in enumerate(((1.50, .075), (1.55, .062), (1.60, .058)))])
    arms = []
    for s in (1, -1):
        rs = []
        for x in list(np.arange(.10, WRIST_X, .02)) + [WRIST_X + .005]:
            zb, zt = p.arm_at(max(x, p.ARM_X0))
            az = (zt - zb) / 2; zc = (zb + zt) / 2
            if x < .38:   # the shoulder pads inflate the front band: upper arm is ~.047 thick
                az = min(az, .05); zc = ARM_Z
            az = max(az, .03)
            rs.append(p.ring_x(s * x, 0, zc, az * .95, az, 2.2, 20))
        arms.append(p.loft('arm', rs[::s]))
    return [torso, neck] + arms


def trousers():
    pelvis = p.loft('pelvis', [p.ring_z(0, z, w, -.125, .13, 2.3, 32) for z, w in ((.74, .19), (.86, .19), (1.0, .18))])
    sm, sc = mask(p.B['depth_view']); L = p.LEGS
    legs = []
    for s in (1, -1):
        rs = []
        for z in np.arange(.40, .90, .03):
            if z <= .62:
                xo = float(np.interp(z, L[:, 0], L[:, 3])); xi = float(np.interp(z, L[:, 0], L[:, 4]))
                cx, hw = -(xo + xi) / 2, (xi - xo) / 2
            else:
                k = (z - .62) / (.90 - .62); cx = .135 * (1 - k) + .095 * k; hw = .088 * (1 - k) + .105 * k
            ss = side_span(min(z, .60), sm, sc, -.3, .3); yc = (ss[0] + ss[1]) / 2; d = (ss[1] - ss[0]) / 2 * .85
            rs.append(p.ring_z(s * cx, z, hw, yc - d, yc + d, 2.2, 24))
        legs.append(p.loft('leg', rs))
    return [pelvis] + legs


def boot():
    """Left boot: shaft from the front leg spans and side depth, foot lofted heel->toe with
    the instep height read on the side mask."""
    sm, sc = mask(p.B['depth_view']); L = p.LEGS
    rs = []
    for z in np.arange(.10, BOOT_TOP + .001, .025):
        xo = float(np.interp(z, L[:, 0], L[:, 3])); xi = float(np.interp(z, L[:, 0], L[:, 4]))
        cx, hw = -(xo + xi) / 2, (xi - xo) / 2   # right boot, mirrored
        if z < .2:
            cx, hw = FOOT_X, .062
        ss = side_span(z, sm, sc, -.12, .25); yc = (ss[0] + ss[1]) / 2; d = min(.085, (ss[1] - ss[0]) / 2 * .92)
        rs.append(p.ring_z(cx, z, hw * 1.04, yc - d, yc + d, 2.2, 24))
    shaft = p.loft('shaft', rs)
    # Instep line: highest boot pixel of each side-view column below the shaft.
    ys = np.linspace(HEEL_Y, TOE_Y, 15); tops = []
    for y in ys:
        r0, c = px_side(y, 0, sc); best = .02
        for z in np.arange(.2, 0, -.004):
            r, _ = px_side(y, z, sc)
            if sm[r, c]:
                best = z; break
        tops.append(min(best, .16))
    rings = []
    for i, (y, top) in enumerate(zip(ys, tops)):
        u = i / (len(ys) - 1)
        w = .057 * float(np.interp(u, [0, .2, .7, .9, 1], [.78, .9, 1, .8, .4]))
        x = FOOT_X + .06 * u
        r = []
        for j in range(20):
            sx, sz = p.se(2 * math.pi * j / 20, 2.6)
            r.append((x + w * sx, y, max(.0, top / 2 + top / 2 * sz)))
        rings.append(r)
    foot = p.loft('foot', rings)
    return [shaft, foot]


def skirt_panels():
    """Eight pointed leather flaps hanging from the belt. Width from the front mask, depth
    from the side mask; every panel belongs whole to one skirt chain (skirt_k)."""
    sm, sc = mask(p.B['depth_view'])
    zs = np.arange(.60, BELT[1] + .001, .02)
    rx = {z: max(-p.FRONT[np.argmin(abs(p.FRONT[:, 0] - max(z, .70))), 1], p.front_hw(1.0)) + .006 for z in zs}
    sd = {z: side_span(max(z, .70), sm, sc, -.3, .3) for z in zs}
    out = []
    for k, d in enumerate(SKIRT):
        a0 = k * math.pi / 4; half = math.radians(26); tip = SKIRT_TIP[k]; edge = tip + (.05 if k == 0 else .085)
        off = .006 if k % 2 else 0
        rings = []
        for i in range(9):
            u = i / 8; a = a0 - half + 2 * half * u
            zt = BELT[1] - .01; zh = edge + (tip - edge) * (1 - abs(2 * u - 1))
            col = []
            for z in np.linspace(zt, zh, 10):
                zz = min(zs, key=lambda q: abs(q - z))
                yf, yb = sd[zz]; yc = (yf + yb) / 2; ry = (yb - yf) / 2 + .006
                sx, sy = p.se(a - math.pi / 2, 2.3)
                flare = 1 + off
                col.append((rx[zz] * sx * flare, yc + ry * sy * flare, z))
            rings.append(col)
        o = open_loft('flap', rings); solidify(o, .007); mark_int(o, 'skirt_k', k + 1)
        out.append(o)
    return out


def shoulder_pad(s):
    """Two stacked leather plates over the shoulder (front: x .15-.37, top z 1.53)."""
    out = []
    for layer, (x0, x1, r0, zc) in enumerate(((.14, .36, .09, 1.445), (.20, .375, .08, 1.43))):
        rings = []
        for x in np.linspace(x0, x1, 9):
            u = (x - x0) / (x1 - x0); r = r0 * (1 - .25 * u) + .012 * layer
            rings.append([(s * x, .01 + r * 1.05 * math.sin(t), zc + r * math.cos(t) - .02 * u)
                          for t in np.linspace(-math.radians(105), math.radians(105), 13)])
        o = open_loft('pad', rings if s > 0 else rings[::-1]); solidify(o, .008)
        out.append(o)
    return out


def support():
    sup = []
    rs = [p.ring_z(0, z, p.front_hw(z) + .012, p.side_at(z)[0] - .012, p.side_at(z)[1] + .012, 2.3, 40) for z in (BELT[0], sum(BELT) / 2, BELT[1])]
    belt = p.loft('belt', rs); p.rigid(belt, 'Pelvis'); sup.append(belt)
    yf = p.side_at(1.08)[0]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, yf - .018, 1.08)); b = bpy.context.object; b.scale = (.075, .012, .05)
    bpy.ops.object.transform_apply(scale=True); p.rigid(b, 'Pelvis'); sup.append(b)
    # Pouch on the left hip (front and back views agree on the side).
    bpy.ops.mesh.primitive_cube_add(size=1, location=(.205, .0, .98)); b = bpy.context.object; b.scale = (.045, .085, .11)
    bpy.ops.object.transform_apply(scale=True); bev = b.modifiers.new('bev', 'BEVEL'); bev.width = .012; bev.segments = 2
    p.select_only([b]); bpy.ops.object.modifier_apply(modifier=bev.name); p.rigid(b, 'Pelvis'); sup.append(b)
    for s in (1, -1):
        sup += shoulder_pad(s)
    sup += skirt_panels()
    return sup


def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version = 0
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.fps = 100
    sc.collection.children.link(bpy.data.collections.new(NAME))
    P = p.B['parts']
    add('Body', torso_and_arms(), P['Body'].get('voxel', .006), P['Body'].get('tris', 7000))
    hd = add('Head', [head()], P['Head'].get('voxel', .004), P['Head'].get('tris', 2600), smooth=2)
    h = hat(); mark_int(h, 'hat', 1)   # tells the bake fix-ups hat from head (removed before rigging)
    p.join_into(hd, [h])
    p.AN['hand_length'] = REACH - WRIST_X
    hand = p.build_hand(WRIST_X + .005, REACH, .042, 0)
    add('Hand', hand, P['Hand'].get('voxel', .002), P['Hand'].get('tris', 2400) // 2, smooth=1)
    add('Leg', trousers(), P['Leg'].get('voxel', .007), P['Leg'].get('tris', 3000))
    add('Foot', boot(), P['Foot'].get('voxel', .004), P['Foot'].get('tris', 1800) // 2, smooth=2)
    add('Support', support())
    manifest = {v: dict(file=f, sha256=hashlib.sha256((p.CDIR / f).read_bytes()).hexdigest())
                for v, f in list(p.CFG['references'].items()) + [('weapons', p.CFG['weapons_reference'])]}
    (OUT / 'source-manifest.json').write_text(json.dumps(manifest, indent=2))
    print('GEO', {o.name: len(o.data.polygons) for o in bpy.data.collections[NAME].objects})


# ----------------------------------------------------------------------------- texture completion
def complete_textures():
    """Paint the surfaces no reference view sees (hat top, shoulder tops, under the arms) from a
    full 3D model generated from the same front picture (build.completion: TRELLIS, doc 21).

    The model is brought into this frame (yaw, height, bbox centre, then ICP translation). Per
    slot: bake texel positions and the best view visibility; fit a per-channel linear map from the
    model's colours to the reference paint on well-seen texels; blend the mapped model colour in
    where visibility is low. Mirrored slots share UVs between sides and are left as they are."""
    from mathutils.bvhtree import BVHTree
    C = p.B.get('completion')
    if not C:
        return
    bpy.ops.import_scene.gltf(filepath=str((p.CDIR / C['model']).resolve()))
    new = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    p.select_only(new); bpy.ops.object.join() if len(new) > 1 else None; T = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o)
    T.data.transform(Matrix.Rotation(math.radians(C.get('yaw', 0)), 4, 'Z'))
    vs = np.array([v.co[:] for v in T.data.vertices]); lo, hi = vs.min(0), vs.max(0)
    T.data.transform(Matrix.Scale(H / (hi[2] - lo[2]), 4) @ Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))))
    parts = p.parts_by_slot()
    ours = np.concatenate([np.array([v.co[:] for v in o.data.vertices]) for o in parts.values()])[::7]
    bm = __import__('bmesh').new(); bm.from_mesh(T.data); __import__('bmesh').ops.triangulate(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.active; tris = [[l.vert.co.copy() for l in f.loops] for f in bm.faces]
    tuv = [[l[uvl].uv.copy() for l in f.loops] for f in bm.faces]
    shift = Vector()
    for _ in range(6):   # translation-only ICP onto our surface
        bvh = BVHTree.FromPolygons([c + shift for t in tris for c in t], [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))])
        d = [Vector(q) - bvh.find_nearest(Vector(q))[0] for q in ours]
        d = [x for x in d if x.length < .05]
        shift += sum(d, Vector()) / max(1, len(d))
    bvh = BVHTree.FromPolygons([c + shift for t in tris for c in t], [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))])
    img = next(n.image for m in T.data.materials if m and m.node_tree for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
    tw, th = img.size; tpx = np.empty(tw * th * 4, np.float32); img.pixels.foreach_get(tpx); tpx = tpx.reshape(th, tw, 4)[..., :3]
    bm.free(); bpy.data.objects.remove(T)

    def model_colour(points):
        out = np.zeros((len(points), 3), np.float32)
        for i, q in enumerate(points):
            loc, _, fi, _ = bvh.find_nearest(Vector(q))
            a, b, c = (x + shift for x in tris[fi]); u = __import__('mathutils').geometry.barycentric_transform
            w = u(loc, a, b, c, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
            uv = tuv[fi][0] * w.x + tuv[fi][1] * w.y + tuv[fi][2] * w.z
            out[i] = tpx[int(np.clip(uv.y * th, 0, th - 1)), int(np.clip(uv.x * tw, 0, tw - 1))]
        return out   # both textures are 8-bit images read as stored values
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
    posm = bpy.data.materials.new('pos'); posm.use_nodes = True; nt = posm.node_tree; nt.nodes.clear()
    g = nt.nodes.new('ShaderNodeNewGeometry'); e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(g.outputs['Position'], e.inputs[0])
    nt.links.new(e.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    white = bpy.data.materials.new('vis'); white.use_nodes = True; nt = white.node_tree; nt.nodes.clear()
    d_ = nt.nodes.new('ShaderNodeBsdfDiffuse'); d_.inputs[0].default_value = (1, 1, 1, 1); nt.links.new(d_.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    sun = bpy.data.objects.new('cmp_sun', bpy.data.lights.new('cmp_sun', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 1; sun.data.angle = 0
    lo_v, hi_v = C.get('visibility', [.2, .45]); report = {}
    for slot, o in parts.items():
        if p.B['parts'][slot].get('mirrored') or slot not in C.get('slots', parts):
            continue
        size = p.B['parts'][slot]['texture']; mats = list(o.data.materials)
        pos = p.bake_into(o, posm, size, 'EMIT')
        cov = np.abs(pos).sum(2) > 1e-6
        vis = np.zeros((size, size))
        for d in p.VIEW_DIR.values():
            sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            v = p.bake_into(o, white, size, 'DIFFUSE')[..., 0]; vis = np.maximum(vis, v / max(v.max(), 1e-6))
        o.data.materials.clear()
        for m in mats:
            o.data.materials.append(m)
        path = OUT / 'textures' / f'{o.name}.png'; tex = p.img_np(path)
        w = np.clip((vis - lo_v) / (hi_v - lo_v), 0, 1)
        for reg in C.get('regions', []):   # stricter limits where projections are badly stretched (hat top)
            if reg['slot'] == slot:
                a_, b_ = reg['visibility']; inz = pos[..., 2] > reg.get('z_min', -9)
                w = np.where(inz, np.minimum(w, np.clip((vis - a_) / (b_ - a_), 0, 1)), w)
        fill = cov & (w < 1)
        well = np.argwhere(cov & (vis > .75)); well = well[np.random.default_rng(0).choice(len(well), min(3000, len(well)), replace=False)]
        mc = model_colour(pos[well[:, 0], well[:, 1]]); oc = tex[well[:, 0], well[:, 1]]
        # Mean/std transfer per channel (texel-to-texel correlation is weak, a regression would flatten detail).
        # Gain capped: on the trousers the model was so dark that x3.9 turned its shadows pale grey.
        g_lo, g_hi = C.get('gain_range', [.67, 1.5])
        fit = [(min(g_hi, max(g_lo, oc[:, k].std() / max(mc[:, k].std(), 1e-4))), 0) for k in range(3)]
        fit = [(g, oc[:, k].mean() - g * mc[:, k].mean()) for k, (g, _) in enumerate(fit)]
        idx = np.argwhere(fill); col = model_colour(pos[idx[:, 0], idx[:, 1]])
        col = np.clip(np.stack([fit[k][0] * col[:, k] + fit[k][1] for k in range(3)], 1), 0, 1)
        ww = w[idx[:, 0], idx[:, 1]][:, None]
        tex[idx[:, 0], idx[:, 1]] = ww * tex[idx[:, 0], idx[:, 1]] + (1 - ww) * col
        p.np_img(o.name + '_done', tex.astype(np.float32), path)
        o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
        report[slot] = {'filled_texels': int(len(idx)), 'coverage': int(cov.sum()), 'gain': [round(float(f[0]), 2) for f in fit]}
    bpy.data.objects.remove(sun)
    report['icp_shift_m'] = [round(x, 4) for x in shift]
    (OUT / 'review').mkdir(exist_ok=True); (OUT / 'review' / 'completion.json').write_text(json.dumps(report, indent=1))
    print('COMPLETION', json.dumps(report))


def head_undersides():
    """Surfaces facing down on the head are seen by no reference: the front/back views smeared the
    face and hair onto the hat brim and horns from below, and stretched the face down the jaw.
    Hat undersides take the leather of the hat top straight above them (nearest in plan), in shade;
    the jaw and chin underside take the nearest side-facing skin. Writes review/head-undersides.json."""
    from mathutils.kdtree import KDTree
    o = p.parts_by_slot()['Head']; size = p.B['parts']['Head']['texture']; mats = list(o.data.materials)

    def emit(build):
        m = bpy.data.materials.new('aux'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(build(nt), e.inputs[0])
        nt.links.new(e.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
        return m
    geo = lambda key: emit(lambda nt: nt.nodes.new('ShaderNodeNewGeometry').outputs[key])

    def attr(nt):
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_type = 'GEOMETRY'; a.attribute_name = 'hat'
        return a.outputs['Fac']
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    pos = p.bake_into(o, geo('Position'), size, 'EMIT'); nrm = p.bake_into(o, geo('Normal'), size, 'EMIT')
    hatm = p.bake_into(o, emit(attr), size, 'EMIT')[..., 0] > .5
    # Best visibility over the four views (cosine, with occlusion): only badly seen texels change.
    white = bpy.data.materials.new('vis'); white.use_nodes = True; nt = white.node_tree; nt.nodes.clear()
    d_ = nt.nodes.new('ShaderNodeBsdfDiffuse'); d_.inputs[0].default_value = (1, 1, 1, 1); nt.links.new(d_.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    sun = bpy.data.objects.new('und_sun', bpy.data.lights.new('und_sun', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 1; sun.data.angle = 0
    vis = np.zeros((size, size))
    for d in p.VIEW_DIR.values():
        sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        v = p.bake_into(o, white, size, 'DIFFUSE')[..., 0]; vis = np.maximum(vis, v / max(v.max(), 1e-6))
    bpy.data.objects.remove(sun)
    o.data.materials.clear()
    for m in mats:
        o.data.materials.append(m)
    path = OUT / 'textures' / f'{o.name}.png'; tex = p.img_np(path)
    cov = np.abs(pos).sum(2) > 1e-6; nz = nrm[..., 2] / np.maximum(np.linalg.norm(nrm, axis=2), 1e-6)

    def fill(dst, src, key, shade):
        s = np.argwhere(src); kd = KDTree(len(s))
        for i, (r, c) in enumerate(s):
            kd.insert(key(pos[r, c]), i)
        kd.balance(); out = tex.copy()
        for r, c in np.argwhere(dst):
            out[r, c] = tex[tuple(s[kd.find(key(pos[r, c]))[1]])] * shade
        return out
    under = cov & hatm & (nz < .3) & (vis < .4); top = cov & hatm & (nz > .3) & (vis > .5)   # undersides and inner horn faces
    tex = fill(under, top, lambda q: (q[0], q[1], 0), .72)
    jaw = cov & ~hatm & (nz < -.35) & (vis < .45) & (pos[..., 2] < CHIN + .04)
    skin = cov & ~hatm & (np.abs(nz) < .25) & (vis > .6) & (pos[..., 2] < 1.70) & (pos[..., 2] > CHIN - .01)
    tex = fill(jaw, skin, lambda q: tuple(q), .9)
    p.np_img(o.name + '_under', tex.astype(np.float32), path)
    o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    o.data.attributes.remove(o.data.attributes['hat'])
    rep = {'hat_underside_texels': int(under.sum()), 'jaw_underside_texels': int(jaw.sum())}
    (OUT / 'review' / 'head-undersides.json').write_text(json.dumps(rep, indent=1)); print('HEAD_UNDERSIDES', rep)


# ----------------------------------------------------------------------------- rig
def joints():
    yc = lambda z: sum(p.side_at(z)) / 2 + .01
    J = {}

    def bone(n, a, b, par):
        J[n] = (tuple(a), tuple(b), par)
    bone('Base', (0, yc(.98), .98), (0, yc(1.06), 1.06), None)
    bone('Waist', (0, yc(1.06), 1.06), (0, yc(1.18), 1.18), 'Base')
    bone('Chest1', (0, yc(1.18), 1.18), (0, yc(1.30), 1.30), 'Waist')
    bone('Chest2', (0, yc(1.30), 1.30), (0, .0, NECK_Z), 'Chest1')
    bone('Neck', (0, .0, NECK_Z), (0, -.005, 1.595), 'Chest2')
    bone('Head', (0, -.005, 1.595), (0, -.005, H - .02), 'Neck')
    bone('Pelvis', (0, yc(.98), .98), (0, yc(.94), HIP_Z - .03), 'Base')
    bone('EffectBaseJoint', (0, 0, 0), (0, 0, .1), 'Base')
    for s, S in ((1, 'L'), (-1, 'R')):
        zc = lambda x: ARM_Z - .02 * (x - SHOULDER_X)
        hx = WRIST_X + .45 * (REACH - WRIST_X); fx = WRIST_X + .72 * (REACH - WRIST_X); tx = WRIST_X + .03
        bone(f'{S}_Shoulder', (s * .04, 0, ARM_Z + .03), (s * SHOULDER_X, 0, zc(SHOULDER_X)), 'Chest2')
        bone(f'{S}_UpperArm', (s * SHOULDER_X, 0, zc(SHOULDER_X)), (s * ELBOW_X, 0, zc(ELBOW_X)), f'{S}_Shoulder')
        bone(f'{S}_ForeArm', (s * ELBOW_X, 0, zc(ELBOW_X)), (s * WRIST_X, 0, zc(WRIST_X)), f'{S}_UpperArm')
        bone(f'{S}_Hand', (s * WRIST_X, 0, zc(WRIST_X)), (s * hx, 0, zc(hx)), f'{S}_ForeArm')
        bone(f'{S}_Finger1', (s * hx, 0, zc(hx)), (s * fx, 0, zc(fx)), f'{S}_Hand')
        bone(f'{S}_Finger2', (s * fx, 0, zc(fx)), (s * REACH, 0, zc(REACH)), f'{S}_Finger1')
        bone(f'{S}_Thumb1', (s * tx, -.021, zc(tx) - .006), (s * (tx + .03), -.049, zc(tx) - .012), f'{S}_Hand')
        bone(f'{S}_Thumb2', (s * (tx + .03), -.049, zc(tx) - .012), (s * (tx + .055), -.071, zc(tx) - .016), f'{S}_Thumb1')
        bone(f'{S}_Thigh', (s * .095, yc(HIP_Z) - .01, HIP_Z), (s * .145, .01, KNEE_Z), 'Pelvis')
        bone(f'{S}_Calf', (s * .145, .01, KNEE_Z), (s * FOOT_X, .065, ANKLE_Z), f'{S}_Thigh')
        bone(f'{S}_Foot', (s * FOOT_X, .065, ANKLE_Z), (s * (FOOT_X + .012), -.075, .03), f'{S}_Calf')
        bone(f'{S}_Toe1', (s * (FOOT_X + .012), -.075, .03), (s * (FOOT_X + .02), TOE_Y, .02), f'{S}_Foot')
    for k, d in enumerate(SKIRT):
        a = k * math.pi / 4; sx, sy = math.sin(a), -math.cos(a)
        r = lambda z: (p.front_hw(min(z, 1.0)) * .95, (p.side_at(z)[1] - p.side_at(z)[0]) / 2 * .95)
        pt = lambda z: (sx * r(z)[0], sum(p.side_at(z)) / 2 + sy * r(z)[1], z)
        bone(f'Skirt{d}01', pt(1.05), pt(.86), 'Pelvis')
        bone(f'Skirt{d}02', pt(.86), pt(.66), f'Skirt{d}01')
    return J


def rigging():
    p.joints = joints; p.make_pose_test = lambda rig: None; p.sash_vertices = lambda o, slot: set()
    p.AN['head_joint_z'] = 1.595
    p.SLOT_BONES['Head'] = ['Head']
    p.SLOT_BONES['Support'] = ['Base', 'Pelvis', 'Chest2'] + [f'{S}_{b}' for S in 'LR' for b in ('Shoulder', 'UpperArm')]
    p.SLOT_BONES['Leg'] = ['Base', 'Pelvis'] + [f'{S}_{b}' for S in 'LR' for b in ('Thigh', 'Calf')]
    p.stage_rig()
    parts = p.parts_by_slot(); rig = parts['Body'].parent
    # Bone heat leaves hard shoulder/chest borders (armpit stretched x4 with the fist on the hip): smooth the
    # body's deform weights, then back to the Lunia limit of 2 influences.
    body = parts['Body']; p.select_only([body]); bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='BONE_DEFORM', factor=.5, repeat=4)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=2)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    def assign(o, v, weights):
        for g in list(v.groups):
            if o.vertex_groups[g.group].name in rig.data.bones:
                o.vertex_groups[g.group].remove([v.index])
        for n, w in weights:
            if w > 1e-4:
                if n not in o.vertex_groups:
                    o.vertex_groups.new(name=n)
                o.vertex_groups[n].add([v.index], w, 'REPLACE')
    smooth = lambda k: k * k * (3 - 2 * k)
    # Separate left/right shells confuse bone heat: anatomical weights for trousers and boots.
    o = parts['Leg']
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; z = v.co.z
        if z > HIP_Z - .1:   # waistband: one smooth thigh -> pelvis ramp (a 2 cm step stretched it x4 in the run)
            k = smooth(max(0, min(1, (z - (HIP_Z - .1)) / .14)))
            if abs(v.co.x) < .05:   # crotch top rides the pelvis: one thigh per side tore the seam open (x8.6, run)
                k = max(k, 1 - abs(v.co.x) / .05)
            w = [(S + '_Thigh', 1 - k), ('Pelvis', k)]
        elif abs(v.co.x) < .05 and z > KNEE_Z + .1:   # crotch seam shared by both thighs
            k = .5 + v.co.x / .1
            w = [('L_Thigh', k), ('R_Thigh', 1 - k)]
        else:
            k = smooth(max(0, min(1, (z - (KNEE_Z - .05)) / .1)))
            w = [(S + '_Calf', 1 - k), (S + '_Thigh', k)]
        assign(o, v, w)
    o = parts['Foot']
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; z = v.co.z
        # Calf share above the ankle, fading out in front of the shin: the instep near the toes went 65% to the
        # calf and stretched x5 whenever the foot pitched.
        k = smooth(max(0, min(1, (z - .07) / .1))) * smooth(max(0, min(1, (v.co.y + .13) / .12)))
        lo = (S + '_Toe1', 1) if v.co.y < -.09 and z < .07 else (S + '_Foot', 1)
        assign(o, v, [lo] if k <= 0 else [(S + '_Calf', k), (lo[0], 1 - k)])
    # Flaps hang on their chain. Shoulder pads are stiff plates: a smooth shoulder -> upper arm blend across
    # their width (copying the skin under them split each plate at the joint and folded it, x6 when aiming).
    # (Robust Weight Transfer, rwt.py, was measured here on 27/10: no gain for pads standing 1-3 cm off the skin.)
    o = parts['Support']; sk = o.data.attributes['skirt_k'].data
    for v in o.data.vertices:
        k = sk[v.index].value
        if k:
            # The pelvis holds only the strip under the belt: a raised thigh (tucked jump, roll) went through a flap
            # whose upper half stayed on the pelvis; the rest swings on the flap's hinge (Skirt01).
            d = SKIRT[k - 1]; t = max(0, min(1, (BELT[0] - v.co.z) / (BELT[0] - .64)))
            w = [('Pelvis', 1 - smooth(min(1, t / .15))), (f'Skirt{d}01', smooth(min(1, t / .15)))] if t < .5 else [(f'Skirt{d}01', 2 - 2 * t), (f'Skirt{d}02', 2 * t - 1)]
            assign(o, v, w)
        elif v.co.z > 1.3:
            S = 'L' if v.co.x > 0 else 'R'; t = smooth(max(0, min(1, (abs(v.co.x) - .15) / (.37 - .15))))
            assign(o, v, [(S + '_Shoulder', 1 - .7 * t), (S + '_UpperArm', .7 * t)])
    for ob in parts.values():
        if 'skirt_k' in ob.data.attributes:
            ob.data.attributes.remove(ob.data.attributes['skirt_k'])
    weapons.build(p, rig)
    print('RIG_CANGACEIRO', {s: p.bone_influences(ob) for s, ob in p.parts_by_slot().items()})


def look():
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.fps = 100
    sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('CangaceiroStudio'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.26, .29, .31, 1)
    line = bpy.data.materials.new(f'{NAME}_Silhouette'); line.use_nodes = True; nt = line.node_tree; nt.nodes.clear()
    lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in p.B['look']['outline_color']]
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (*lin, 1)
    nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0]); line.use_backface_culling = True
    for o in p.parts_by_slot().values():
        img = o.data.materials[0].node_tree.nodes['Image Texture'].image
        o.data.materials.clear(); o.data.materials.append(p.toon_material(o.name, img)); o.data.materials.append(line)
        sol = o.modifiers.new('Silhouette', 'SOLIDIFY'); sol.thickness = p.B['look']['outline_ratio'] * H; sol.offset = 1
        sol.use_flip_normals = True; sol.material_offset = 1; sol.use_rim = False
        if 'silhouette' in o.vertex_groups:
            sol.vertex_group = 'silhouette'; sol.thickness_vertex_group = 0.0
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3; sun.rotation_euler = (.5, -.5, -.4)
    cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam); sc.camera = cam
    rd = OUT / 'renders'; rd.mkdir(exist_ok=True)
    rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')
    rig.animation_data_create()
    shots = [('front', (0, -8, .95), (0, 0, .95), 2.3, None, 0), ('back', (0, 8, .95), (0, 0, .95), 2.3, None, 0),
             ('left', (8, 0, .95), (0, 0, .95), 2.3, None, 0), ('threequarter', (4.4, -6.5, 2.4), (0, 0, .9), 2.2, None, 0),
             ('face', (.35, -2.0, 1.7), (0, 0, 1.68), .55, None, 0), ('hands', (.85, -1.6, 1.42), (.82, 0, 1.39), .42, None, 0),
             ('feet', (.6, -1.2, .25), (.17, 0, .12), .65, None, 0), ('game-camera', (0, -7.5, 7.0), (0, 0, .8), 6.5, 'idle', 0)]
    acts = bpy.data.actions
    for clip, t in (('idle', 0), ('run', .1), ('shoot', .3), ('pistols', .2), ('throw', .35), ('dodge', .15), ('jump', 0),
                    ('hit', .1), ('dead', 1.0), ('victory', .5), ('draw', .3)):
        if clip in acts:
            shots.append((f'clip-{clip}-{int(t * 100):03d}', (2.6, -4.4, 1.9), (0, 0, .85), 2.6, clip, t))
    for name, loc, target, scale, act, t in shots:
        rig.animation_data.action = acts.get(act) if act else None
        if not act:
            for pb in rig.pose.bones:
                pb.matrix_basis = Matrix.Identity(4)
        f = round(t * 100); sc.frame_set(f + 1); sc.frame_set(f)
        cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale
        sc.render.resolution_x, sc.render.resolution_y = (1280, 720) if name == 'game-camera' else (900, 1000)
        sc.render.resolution_percentage = 100
        sc.render.filepath = str(rd / (name + '.png')); bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    sc.frame_set(1); sc.frame_set(0)


stages = ['geo', 'bake', 'rig', 'anim', 'look', 'export']
start = stages.index(resume)
if start:
    bpy.ops.wm.open_mainfile(filepath=str(OUT / ('stage-' + stages[start - 1] + '.blend')))
for st in stages[start:stages.index(last) + 1]:
    print('CANGACEIRO_STAGE', st, flush=True)
    if st == 'geo':
        geometry()
    elif st == 'bake':
        p.stage_bake(); complete_textures(); head_undersides()
    elif st == 'rig':
        rigging()
    elif st == 'anim':
        import cangaceiro_motion
        cangaceiro_motion.build(p, joints())
    elif st == 'look':
        look()
    else:
        p.stage_export()
    if st != 'export':
        p.save(st)
