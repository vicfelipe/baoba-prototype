"""Vaqueiro (Tanker) from its own turnaround; shared pipeline bake/rig/export code.
blender -b --python tools/charpipe/vaqueiro_build.py -- SourceArt/Vaqueiro/character.json [--from bake|rig|anim|look|export] [--to <stage>]

Everything is measured on this character's masks (build/masks, build/measure.json) and
crops of its references; nothing comes from another character's build. Metres, Z up,
faces -Y, character's left = +X. Slots: Head (face, hair, hat), Body (gibao, collar, arms),
Hand (gloves with their cuffs), Leg (perneiras over the hips), Foot (boots), Support (belt, buckle).
Knee pads, breastplate, laces and tooling are painted (the silhouette carries their volume).
The lasso coil and the berrante (references/props.png) and the clips come from vaqueiro_motion.py.
"""
import bpy, sys, math, json, hashlib, importlib.util
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
args = sys.argv[sys.argv.index('--') + 1:]
resume = args[args.index('--from') + 1] if '--from' in args else 'geo'
last = args[args.index('--to') + 1] if '--to' in args else 'export'
sys.argv = sys.argv[:sys.argv.index('--') + 1] + [args[0], '--stages', '']
spec = importlib.util.spec_from_file_location('charpipe_build', HERE / 'build.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
H, OUT, NAME, M = p.H, p.OUT, p.NAME, p.M
pose_test = p.make_pose_test   # rigging() disables it inside stage_rig

# Landmarks measured on the references (crop.py grids, measure.json). See doc 23.
HEAD_TOP = 1.85      # head under the hat (front: hat top y=9, head top y~22, chin y=139, sole y=912)
CHIN = 1.605
NECK_Z = 1.53
COLLAR = (1.50, 1.65)                # high collar around the beard, half width .094 (front crop)
BRIM = dict(z=1.752, y=.007, rx=.18, ry=.19, tilt=math.radians(7), t=.02, curl=.012)   # front edge 1.776, back 1.728 (both sides)
CROWN_Z = 1.765
BELT = (1.083, 1.145)
HEM_Z = .955         # gibao hem (front .968, flared)
HIP_Z, KNEE_Z, ANKLE_Z = .93, .55, .09
SHOULDER_X, ELBOW_X, WRIST_X, REACH = .20, .48, .745, (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
ARM_Y = .05          # side view: sleeve disc and fist centred 5 cm behind the chest centre
ARM_ZB = 1.393       # sleeve underside at the shoulder (front arm band, x .27-.45)
BOOT_TOP = .17
HEEL_Y, TOE_Y = .125, -.20
FOOT_X = .255


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


def front_span(z, m, cal):
    """Half width of the centre run of the front mask row at height z."""
    r, c0 = px_front(0, z, cal)
    if not m[r, c0]:
        return 0.
    a = b = c0
    while m[r, a - 1]: a -= 1
    while m[r, b + 1]: b += 1
    return (b - a) / 2 / cal['px_per_m']


def medfilt(v, k=5):
    pd = np.pad(v, k // 2, mode='edge')
    return np.array([np.median(pd[i:i + k]) for i in range(len(v))])


def add(slot, obs, voxel=None, tris=None, smooth=2):
    if voxel:
        o = p.fuse(obs, p.part_name(slot), voxel, tris, smooth)
        drop_crumbs(o)
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


def drop_crumbs(o, keep=.1):
    """Remesh leaves small inner shells where pieces overlap (glove cuff inside the sleeve end); the
    contour fit then drags them across the body. Keep islands with >= keep x the largest one's vertices."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data); seen = set(); comps = []
    for v in bm.verts:
        if v in seen:
            continue
        stack = [v]; comp = []; seen.add(v)
        while stack:
            a = stack.pop(); comp.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b not in seen:
                    seen.add(b); stack.append(b)
        comps.append(comp)
    big = max(len(c) for c in comps)
    bmesh.ops.delete(bm, geom=[v for c in comps if len(c) < keep * big for v in c], context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()


def mark_int(o, name, value):
    a = o.data.attributes.new(name, 'INT', 'POINT')
    for d in a.data:
        d.value = value


# ----------------------------------------------------------------------------- geometry
def hat():
    """Round leather hat: crown rings from the front width and side depth of the mask above the
    brim, and a flat oval brim tilted front-up (both side views draw it 4.8 cm higher in front)."""
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    rings = []
    for z in np.arange(CROWN_Z, H - .004, .006):
        zz = max(z, 1.80)   # below 1.80 the brim covers the crown in every view
        hw = front_span(zz, fm, fc); s = side_span(zz, sm, sc, -.25, .25)
        if hw < .01 or not s:
            break
        yc = (s[0] + s[1]) / 2; d = (s[1] - s[0]) / 2
        rings.append(p.ring_z(0, z, hw, yc - d, yc + d, 2.2, 36))
    crown = p.loft('crown', rings)
    b = BRIM; ca, sa = math.cos(b['tilt']), math.sin(b['tilt'])
    rings = []
    for k, r in enumerate((0, .45, .8, 1.0)):
        ring = []
        up = b['curl'] * max(0, (r - .45) / .55) ** 2   # rim turned up (front view: the brim band rises at the ends)
        for j in range(48):
            a = 2 * math.pi * j / 48
            x = b['rx'] * r * math.sin(a); dy = -b['ry'] * r * math.cos(a)
            ring.append((x, b['y'] + dy * ca, b['z'] - dy * sa + up))
        rings.append(ring)
    top = [[(x, y, z + b['t'] / 2) for x, y, z in rg] for rg in rings]
    bot = [[(x, y, z - b['t'] / 2) for x, y, z in rg] for rg in rings[::-1]]
    brim = p.loft('brim', top[1:] + bot[:-1], caps=True)
    return [crown, brim]


def head():
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    zs = np.arange(CHIN - .015, HEAD_TOP + 1e-6, .005)
    hw, yF, yB = [], [], []
    for z in zs:
        zz = min(max(z, CHIN + .01), 1.70)   # above 1.70 the brim widens the front row
        hw.append(min(.092, front_span(zz, fm, fc)))
        s = side_span(min(max(z, CHIN), 1.70), sm, sc, -.2, .2)
        yF.append(s[0]); yB.append(min(s[1], .12))
    hw, yF, yB = medfilt(np.array(hw)), np.array(yF), medfilt(np.array(yB))
    base = np.array([yF[max(0, i - 4):i + 5].max() for i in range(len(zs))])   # face plane without the nose
    base = np.convolve(np.pad(base, 3, mode='edge'), np.ones(7) / 7, 'valid')
    resid = np.minimum(0, yF - base)
    rings = []
    for i, z in enumerate(zs):
        t = np.clip((z - zs[0]) / .03, 0, 1)                    # jaw underside
        dome = math.sqrt(max(0, 1 - ((z - 1.76) / (HEAD_TOP - 1.76 + .004)) ** 2)) if z > 1.76 else 1
        w = hw[i] * (.55 + .45 * t) * dome; yc = (base[i] + yB[i]) / 2; d = (yB[i] - base[i]) / 2 * (.7 + .3 * t) * max(dome, .25)
        r = []
        for j in range(36):
            sx, sy = p.se(2 * math.pi * j / 36, 2.2)
            x = w * sx; y = yc + d * sy
            if sy < 0:
                y += resid[i] * math.exp(-(x / .018) ** 2) * min(1, -sy * 1.5)
            r.append((x, y, z))
        rings.append(r)
    return p.loft('head', rings)


def arm_z(x):
    zb, zt = p.arm_at(max(x, p.ARM_X0))
    return (zb + zt) / 2, (zt - zb) / 2


def torso_and_arms():
    armpit = p.LM['armpit']
    upper = ([armpit, 1.50, 1.55, 1.575, 1.595], [.255, .25, .235, .20, .12])   # shoulder line flat at 1.58 out to x .30
    rings = []
    for z in np.arange(HEM_Z, 1.575, .02):
        hw = p.front_hw(z) if z <= armpit else float(np.interp(z, *upper))
        if z < .99:   # the hem flares over the hips: front .243 at .94
            hw = max(hw, .235)
        yf, yb = p.side_at(z)
        yb = min(yb, float(np.interp(z, [1.25, 1.40, 1.57], [.13, .16, .13])))   # side mask holds the sleeve disc
        rings.append(p.ring_z(0, z, hw, yf, yb, 2.3, 36))
    torso = p.loft('torso', rings)
    neck = p.loft('collar', [p.ring_z(0, z, w, -.07, .10, 2.1, 24) for z, w in ((COLLAR[0], .1), (1.58, .096), (COLLAR[1], .092))])
    arms = []
    for s in (1, -1):
        rs = []
        for x in list(np.arange(.10, WRIST_X, .02)) + [WRIST_X + .01]:
            zc, az = arm_z(x)
            if x < .30:   # shoulder yoke: below, the front band still holds the lat curve; the top is measured
                zt = min(p.arm_at(x)[1], 1.585); zc, az = (zt + ARM_ZB) / 2, (zt - ARM_ZB) / 2
            # Side view: the sleeve disc reaches y .15 behind the shoulder (centre ARM_Y, radius ~ az).
            rs.append(p.ring_x(s * x, ARM_Y * min(1, x / .2), zc, az * (1.0 if x < .45 else .95), az, 2.2, 20))
        arms.append(p.loft('arm', rs[::s]))
    return [torso, neck] + arms


def trousers():
    sm, sc = mask(p.B['depth_view']); L = p.LEGS
    pel = []
    for z, hw in ((.885, .14), (.91, .245), (.95, .25), (1.02, .235)):   # crotch at .897; front .255 at .90
        s = side_span(z, sm, sc, -.3, .3)
        pel.append(p.ring_z(0, z, hw, s[0] * .97, s[1] * .97, 2.3, 32))
    legs = []
    for s in (1, -1):
        rs = []
        for z in np.arange(.13, .96, .03):   # up into the pelvis shell: ending at .85 left slits under the hem
            xo = float(np.interp(z, L[:, 0], L[:, 3])); xi = float(np.interp(z, L[:, 0], L[:, 4]))
            cx, hw = -(xo + xi) / 2, (xi - xo) / 2
            ss = side_span(z, sm, sc, -.3, .3); yc = (ss[0] + ss[1]) / 2; d = (ss[1] - ss[0]) / 2
            rs.append(p.ring_z(s * cx, z, hw, yc - d, yc + d, 2.2, 24))
        legs.append(p.loft('leg', rs))
    return [p.loft('pelvis', pel)] + legs


def boot():
    """Left boot: shaft from the front leg spans and side depth, foot lofted heel->toe with
    the instep height read on the side mask."""
    sm, sc = mask(p.B['depth_view']); L = p.LEGS
    rs = []
    for z in np.arange(.06, BOOT_TOP + .001, .02):
        xo = float(np.interp(z, L[:, 0], L[:, 3])); xi = float(np.interp(z, L[:, 0], L[:, 4]))
        cx, hw = -(xo + xi) / 2, (xi - xo) / 2   # right boot, mirrored
        if z < .12:
            cx, hw = FOOT_X, .07
        ss = side_span(z, sm, sc, -.05, .25); yc = (ss[0] + ss[1]) / 2; d = min(.085, (ss[1] - ss[0]) / 2 * .92)
        rs.append(p.ring_z(cx, z, hw * 1.03, yc - d, yc + d, 2.2, 24))
    shaft = p.loft('shaft', rs)
    # Instep line: highest boot pixel of each side-view column below the shaft.
    ys = np.linspace(HEEL_Y, TOE_Y, 15); tops = []
    for y in ys:
        r0, c = px_side(y, 0, sc); best = .02
        for z in np.arange(.2, 0, -.004):
            r, _ = px_side(y, z, sc)
            if sm[r, c]:
                best = z; break
        tops.append(min(best, .15))
    rings = []
    for i, (y, top) in enumerate(zip(ys, tops)):
        u = i / (len(ys) - 1)
        w = .066 * float(np.interp(u, [0, .2, .7, .9, 1], [.8, .9, 1, .85, .45]))
        x = FOOT_X + .045 * u
        r = []
        for j in range(20):
            sx, sz = p.se(2 * math.pi * j / 20, 2.6)
            r.append((x + w * sx, y, max(.0, top / 2 + top / 2 * sz)))
        rings.append(r)
    return [shaft, p.loft('foot', rings)]


def gloves():
    """Left glove: cuff + palm + fingers from the shared hand builder, stretched to the measured
    reach and to the drawn glove thickness (front: .097 at the palm, the builder makes ~.045)."""
    p.AN['hand_length'] = REACH - WRIST_X
    zc0, _ = arm_z(.85)
    parts = p.build_hand(WRIST_X + .005, REACH, .052, ARM_Y)
    xmax = max((o.matrix_world @ v.co).x for o in parts for v in o.data.vertices)
    sx = (REACH - WRIST_X) / (xmax - WRIST_X)
    for o in parts:
        for v in o.data.vertices:
            v.co.x = WRIST_X + (v.co.x - WRIST_X) * sx; v.co.z = zc0 + (v.co.z - zc0) * 1.5
    zc, az = arm_z(WRIST_X)
    cuff = p.loft('cuff', [p.ring_x(x, ARM_Y, zc, az * 1.02, az * 1.06, 2.4, 20) for x in (WRIST_X - .01, WRIST_X + .03, WRIST_X + .065)])
    return parts + [cuff]


def support():
    sup = []
    rs = [p.ring_z(0, z, p.front_hw(z) + .012, p.side_at(z)[0] - .012, p.side_at(z)[1] + .012, 2.3, 40) for z in (BELT[0], sum(BELT) / 2, BELT[1])]
    belt = p.loft('belt', rs); p.rigid(belt, 'Pelvis'); sup.append(belt)
    yf = p.side_at(sum(BELT) / 2)[0]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, yf - .02, sum(BELT) / 2)); b = bpy.context.object; b.scale = (.094, .012, .066)
    bpy.ops.object.transform_apply(scale=True); p.rigid(b, 'Pelvis'); sup.append(b)
    return sup


def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version = 0
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.fps = 100
    sc.collection.children.link(bpy.data.collections.new(NAME))
    P = p.B['parts']
    add('Body', torso_and_arms(), P['Body'].get('voxel', .006), P['Body'].get('tris', 7000))
    hd = add('Head', [head()], P['Head'].get('voxel', .004), P['Head'].get('tris', 2600), smooth=2)
    h = hat()
    for o in h:
        mark_int(o, 'hat', 1)   # tells the bake fix-ups hat from head (removed before rigging)
    p.join_into(hd, h)
    add('Hand', gloves(), P['Hand'].get('voxel', .002), P['Hand'].get('tris', 2400) // 2, smooth=1)
    add('Leg', trousers(), P['Leg'].get('voxel', .007), P['Leg'].get('tris', 3500))
    add('Foot', boot(), P['Foot'].get('voxel', .004), P['Foot'].get('tris', 1800) // 2, smooth=2)
    add('Support', support())
    manifest = {v: dict(file=f, sha256=hashlib.sha256((p.CDIR / f).read_bytes()).hexdigest())
                for v, f in list(p.CFG['references'].items()) + [('props', p.CFG['props_reference'])]}
    (OUT / 'source-manifest.json').write_text(json.dumps(manifest, indent=2))
    print('GEO', {o.name: len(o.data.polygons) for o in bpy.data.collections[NAME].objects})


# ----------------------------------------------------------------------------- bake fix-ups
def head_undersides():
    """Surfaces facing down on the head are seen by no reference: the front/back views smeared the
    face and hair onto the brim from below, and stretched the face down the jaw. Hat undersides take
    the leather straight above them (nearest in plan), in shade; the jaw underside takes the nearest
    side-facing skin. Writes review/head-undersides.json."""
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
    under = cov & hatm & (nz < -.3)
    # Brim top: seen only edge-on by the four views; it takes the brim rim paint (well seen), not the stretched crown.
    rim = cov & hatm & (vis > .5) & (pos[..., 2] < CROWN_Z + .02) & (np.hypot(pos[..., 0] / BRIM['rx'], (pos[..., 1] - BRIM['y']) / BRIM['ry']) > .85)
    brim_top = cov & hatm & (nz > .6) & (vis < .5) & (pos[..., 2] < CROWN_Z + .03)
    # Nearest-by-angle rim paint drew the gold trim and the band as radial streaks (game camera): use the
    # median teal leather of the well-seen rim per 15-degree sector, a little darker toward the crown.
    ang = np.arctan2(pos[..., 0], pos[..., 1] - BRIM['y']); sector = ((ang + math.pi) / (2 * math.pi) * 24).astype(int) % 24
    teal = rim & (tex[..., 1] > tex[..., 0] * 1.1) & (tex[..., 2] > tex[..., 0] * 1.05)
    glob = np.median(tex[teal], axis=0)
    med = [np.median(tex[teal & (sector == k)], axis=0) if (teal & (sector == k)).sum() > 50 else glob for k in range(24)]
    rad = np.clip(np.hypot(pos[..., 0] / BRIM['rx'], (pos[..., 1] - BRIM['y']) / BRIM['ry']), 0, 1)
    for k in range(24):
        sel = brim_top & (sector == k)
        tex[sel] = med[k] * (.85 + .15 * rad[sel])[:, None]
    top = cov & hatm & (nz > .3)
    tex = fill(under, top | rim, lambda q: (q[0], q[1], 0), .72)
    jaw = cov & ~hatm & (nz < -.35) & (vis < .45) & (pos[..., 2] < CHIN + .04)
    skin = cov & ~hatm & (np.abs(nz) < .25) & (vis > .6) & (pos[..., 2] < 1.70) & (pos[..., 2] > CHIN - .01)
    tex = fill(jaw, skin, lambda q: tuple(q), .9)
    p.np_img(o.name + '_under', tex.astype(np.float32), path)
    o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    o.data.attributes.remove(o.data.attributes['hat'])
    rep = {'hat_underside_texels': int(under.sum()), 'brim_top_texels': int(brim_top.sum()), 'jaw_underside_texels': int(jaw.sum())}
    (OUT / 'review').mkdir(exist_ok=True); (OUT / 'review' / 'head-undersides.json').write_text(json.dumps(rep, indent=1)); print('HEAD_UNDERSIDES', rep)


# ----------------------------------------------------------------------------- rig
def joints():
    yc = lambda z: sum(p.side_at(z)) / 2 + .01
    J = {}

    def bone(n, a, b, par):
        J[n] = (tuple(a), tuple(b), par)
    zs = lambda x: arm_z(x)[0]
    bone('Base', (0, yc(.98), .98), (0, yc(1.06), 1.06), None)
    bone('Waist', (0, yc(1.06), 1.06), (0, yc(1.18), 1.18), 'Base')
    bone('Chest1', (0, yc(1.18), 1.18), (0, yc(1.30), 1.30), 'Waist')
    bone('Chest2', (0, yc(1.30), 1.30), (0, .01, NECK_Z), 'Chest1')
    bone('Neck', (0, .01, NECK_Z), (0, .0, 1.625), 'Chest2')
    bone('Head', (0, .0, 1.625), (0, .0, H - .02), 'Neck')
    bone('Pelvis', (0, yc(.98), .98), (0, yc(.94), HIP_Z - .03), 'Base')
    bone('EffectBaseJoint', (0, 0, 0), (0, 0, .1), 'Base')
    for s, S in ((1, 'L'), (-1, 'R')):
        hx = WRIST_X + .45 * (REACH - WRIST_X); fx = WRIST_X + .72 * (REACH - WRIST_X); tx = WRIST_X + .05
        sh = (s * SHOULDER_X, ARM_Y * .66, zs(SHOULDER_X))
        bone(f'{S}_Shoulder', (s * .04, .02, NECK_Z - .03), sh, 'Chest2')
        bone(f'{S}_UpperArm', sh, (s * ELBOW_X, ARM_Y, zs(ELBOW_X)), f'{S}_Shoulder')
        bone(f'{S}_ForeArm', (s * ELBOW_X, ARM_Y, zs(ELBOW_X)), (s * WRIST_X, ARM_Y, zs(WRIST_X)), f'{S}_UpperArm')
        bone(f'{S}_Hand', (s * WRIST_X, ARM_Y, zs(WRIST_X)), (s * hx, ARM_Y, zs(hx)), f'{S}_ForeArm')
        bone(f'{S}_Finger1', (s * hx, ARM_Y, zs(hx)), (s * fx, ARM_Y, zs(fx)), f'{S}_Hand')
        bone(f'{S}_Finger2', (s * fx, ARM_Y, zs(fx)), (s * REACH, ARM_Y, zs(REACH)), f'{S}_Finger1')
        bone(f'{S}_Thumb1', (s * tx, ARM_Y - .03, zs(tx) - .01), (s * (tx + .04), ARM_Y - .065, zs(tx) - .02), f'{S}_Hand')
        bone(f'{S}_Thumb2', (s * (tx + .04), ARM_Y - .065, zs(tx) - .02), (s * (tx + .075), ARM_Y - .095, zs(tx) - .026), f'{S}_Thumb1')
        kx = .175; ky = sum(side_span(KNEE_Z, *mask(p.B['depth_view']), -.3, .3)) / 2
        bone(f'{S}_Thigh', (s * .10, yc(HIP_Z) - .01, HIP_Z), (s * kx, ky, KNEE_Z), 'Pelvis')
        bone(f'{S}_Calf', (s * kx, ky, KNEE_Z), (s * FOOT_X, .06, ANKLE_Z), f'{S}_Thigh')
        bone(f'{S}_Foot', (s * FOOT_X, .06, ANKLE_Z), (s * (FOOT_X + .02), -.09, .035), f'{S}_Calf')
        bone(f'{S}_Toe1', (s * (FOOT_X + .02), -.09, .035), (s * (FOOT_X + .04), TOE_Y, .025), f'{S}_Foot')
    return J


def rigging():
    p.joints = joints; p.make_pose_test = lambda rig: None; p.sash_vertices = lambda o, slot: set()
    p.AN['head_joint_z'] = 1.625
    p.SLOT_BONES['Head'] = ['Head']
    p.SLOT_BONES['Support'] = ['Base', 'Pelvis']
    p.SLOT_BONES['Leg'] = ['Base', 'Pelvis'] + [f'{S}_{b}' for S in 'LR' for b in ('Thigh', 'Calf')]
    p.stage_rig()
    parts = p.parts_by_slot(); rig = parts['Body'].parent
    # Bone heat leaves hard shoulder/chest borders: smooth the body's deform weights, then back to the
    # Lunia limit of 2 influences.
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
    # Separate left/right shells confuse bone heat: anatomical weights for the perneiras and boots.
    o = parts['Leg']
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; z = v.co.z
        if z > HIP_Z - .15:   # hips: one smooth thigh -> pelvis ramp over 22 cm (14 cm stretched the buttock x2.4 in a high kick)
            k = smooth(max(0, min(1, (z - (HIP_Z - .15)) / .22)))
            if abs(v.co.x) < .08:   # crotch top rides the pelvis, faded in with height (a 5 cm band tore the seam x3, a hard one stepped at .78)
                k = max(k, (1 - abs(v.co.x) / .08) * smooth(max(0, min(1, (z - (HIP_Z - .15)) / .12))))
            w = [(S + '_Thigh', 1 - k), ('Pelvis', k)]
        elif abs(v.co.x) < .05 and z > KNEE_Z + .1:   # crotch seam shared by both thighs
            k = .5 + v.co.x / .1
            w = [('L_Thigh', k), ('R_Thigh', 1 - k)]
        else:   # knee pad rides the knee blend (drawn as a plate over the joint); 16 cm (10 cm: x2.6 in the dive roll)
            k = smooth(max(0, min(1, (z - (KNEE_Z - .08)) / .16)))
            w = [(S + '_Calf', 1 - k), (S + '_Thigh', k)]
        assign(o, v, w)
    o = parts['Foot']
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; z = v.co.z
        # Shaft above the ankle rides the shin behind y -.14 (a 6 cm ramp folded the front of the ankle x4.5 with
        # the foot pointed); the toe cap blends in front of y -.15. The ramps do not overlap (overlapping at
        # -.13 left a Toe1 | Foot edge, x4.9; a hard cut at -.10, x5.7).
        k = smooth(max(0, min(1, (z - .04) / .18))) * smooth(max(0, min(1, (v.co.y + .14) / .14)))
        if k > 0:
            w = [(S + '_Calf', k), (S + '_Foot', 1 - k)]
        else:
            t = smooth(max(0, min(1, (-.15 - v.co.y) / .05)))
            w = [(S + '_Toe1', t), (S + '_Foot', 1 - t)]
        assign(o, v, w)
    # Torso side below the armpit follows the spine: heat gave the shoulder bone 63% at z 1.30 (10 cm under
    # the armpit) and the flank stretched x4-7 whenever a take moved the clavicle (throw, dive, jump).
    o = parts['Body']; armpit = p.LM['armpit']; names = [g.name for g in o.vertex_groups]
    # Clavicles are damped in the takes (vaqueiro_motion.tame): their body weight goes to Chest2 (a Shoulder |
    # Chest2 seam at the collar stretched x3 in the roll). Then the shoulder band: one continuous Chest2 ->
    # UpperArm ramp from x .16 to .38 (heat left 100% arm next to 73% chest at the armpit, x6-12).
    for v in o.data.vertices:
        cur = {names[g.group]: g.weight for g in v.groups if names[g.group] in rig.data.bones}
        if any(n.endswith('_Shoulder') for n in cur):
            sh = sum(w for n, w in cur.items() if n.endswith('_Shoulder')); cur = {n: w for n, w in cur.items() if not n.endswith('_Shoulder')}
            cur['Chest2'] = cur.get('Chest2', 0) + sh; assign(o, v, list(cur.items()))
        x = abs(v.co.x)
        if .12 < x < .42 and v.co.z > 1.30:
            S = 'L' if v.co.x > 0 else 'R'; a = smooth(max(0, min(1, (x - .16) / .22)))
            assign(o, v, [(S + '_UpperArm', a), ('Chest2', 1 - a)])

    def spine(z):
        if z >= 1.24:
            c = smooth(max(0, min(1, (z - 1.24) / .12))); return {'Chest2': c, 'Chest1': 1 - c}
        c = smooth(max(0, min(1, (z - 1.10) / .14))); return {'Chest1': c, 'Waist': 1 - c}
    for v in o.data.vertices:
        f = smooth(max(0, min(1, (armpit + .01 - v.co.z) / .09))) * smooth(max(0, min(1, (.30 - abs(v.co.x)) / .07)))
        if f <= 0:
            continue
        cur = {names[g.group]: g.weight for g in v.groups if names[g.group] in rig.data.bones}
        mix = {n: (1 - f) * cur.get(n, 0) + f * spine(v.co.z).get(n, 0) for n in set(cur) | set(spine(v.co.z))}
        top = sorted(mix.items(), key=lambda kv: -kv[1])[:2]; tot = sum(w for _, w in top)
        assign(o, v, [(n, w / tot) for n, w in top])
    # Glove: bone heat put the top of the palm on the thumb bones (x9 when a take closes the fist).
    # Cuff -> Hand, palm on Hand, fingers Finger1 -> Finger2 along the length, the thumb lobe on Thumb1 -> 2.
    o = parts['Hand']; J = joints(); hx = abs(J['L_Finger1'][0][0]); fx = abs(J['L_Finger2'][0][0])
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; x = abs(v.co.x)
        th = J[f'{S}_Thumb1']; base = Vector(th[0]); tip = Vector(J[f'{S}_Thumb2'][1])
        d = tip - base; u = max(0, min(1, (v.co - base).dot(d) / d.length_squared)); near = (v.co - (base + d * u)).length
        if near < .03 and v.co.y < ARM_Y and u > 0:   # thumb lobe, faded into the palm (a hard edge tore x13)
            sh = (1 - smooth(near / .03)) * smooth(min(1, u / .3)); w = [(S + '_Thumb1', sh), (S + '_Hand', 1 - sh)]
        elif x < WRIST_X + .02:
            t = smooth(max(0, min(1, (x - (WRIST_X - .02)) / .04))); w = [(S + '_ForeArm', 1 - t), (S + '_Hand', t)]
        elif x < fx - .02:
            t = smooth(max(0, min(1, (x - (hx - .02)) / .04))); w = [(S + '_Hand', 1 - t), (S + '_Finger1', t)]
        else:
            t = smooth(max(0, min(1, (x - (fx - .02)) / .04))); w = [(S + '_Finger1', 1 - t), (S + '_Finger2', t)]
        assign(o, v, w)
    print('RIG_VAQUEIRO', {s: p.bone_influences(ob) for s, ob in p.parts_by_slot().items()})


def reference_clip():
    """Only the reference pose for now: the game clips need this class's design (lasso, berrante) and
    Mixamo takes from the user. PoseTest (arms down, crouch, high kick) checks the weights in
    validate.py and the video; it is removed before the export."""
    rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')
    rig.animation_data_create(); act = bpy.data.actions.new('apose'); rig.animation_data.action = act
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
        for f in (0, 100):
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    act['fps'] = 100; act.use_fake_user = True; rig.animation_data.action = None
    pose_test(rig); act = bpy.data.actions['PoseTest']; act['fps'] = 100
    # Ground lock: PoseTest turns the legs without lowering the hips (a toe went 3.7 cm into the floor at f42).
    # Base points up (+Z), so its local Y lifts the whole body by the lowest skinned vertex, every frame.
    feet = [o for o in bpy.data.collections[NAME].objects if o.type == 'MESH']
    sc = bpy.context.scene; base = rig.pose.bones['Base']
    for f in range(int(act.frame_range[0]), int(act.frame_range[1]) + 1):
        sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
        low = min(min((o.matrix_world @ v.co).z for v in o.evaluated_get(dg).to_mesh().vertices) for o in feet)
        if low < 0:
            base.location.y -= low; base.keyframe_insert('location', frame=f)
    rig.animation_data.action = None
    print('ANIM', ['apose', 'PoseTest'])


def look():
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.fps = 100
    sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('VaqueiroStudio'); sc.world.use_nodes = True
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
    rig.animation_data_create(); rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    sc.frame_set(1); sc.frame_set(0)
    shots = [('front', (0, -8, .95), (0, 0, .95), 2.3), ('back', (0, 8, .95), (0, 0, .95), 2.3),
             ('left', (8, 0, .95), (0, 0, .95), 2.3), ('threequarter', (4.4, -6.5, 2.4), (0, 0, .9), 2.2),
             ('face', (.35, -2.0, 1.7), (0, 0, 1.70), .55), ('hat-top', (.8, -1.4, 2.9), (0, 0, 1.72), .7),
             ('hands', (1.0, -1.6, 1.52), (.9, 0, 1.48), .45), ('feet', (.7, -1.2, .25), (.26, 0, .12), .65),
             ('game-camera', (0, -7.5, 7.0), (0, 0, .8), 6.5)]
    for name, loc, target, scale in shots:
        cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale
        sc.render.resolution_x, sc.render.resolution_y = (1280, 720) if name == 'game-camera' else (900, 1000)
        sc.render.resolution_percentage = 100
        sc.render.filepath = str(rd / (name + '.png')); bpy.ops.render.render(write_still=True)


def fit():
    """Shared contour fit (build.stage_fit) on front + depth view; no Capoeirista accessories here."""
    p.CL['pants_top_z'] = BELT[0]   # fit_masks mirrors the front below this height (the outfit is symmetric)
    p.build_accessories = lambda: None
    p.stage_fit()


stages = ['geo', 'fit', 'bake', 'rig', 'anim', 'look', 'export']
start = stages.index(resume)
if start:
    bpy.ops.wm.open_mainfile(filepath=str(OUT / ('stage-' + stages[start - 1] + '.blend')))
for st in stages[start:stages.index(last) + 1]:
    print('VAQUEIRO_STAGE', st, flush=True)
    if st == 'geo':
        geometry()
    elif st == 'fit':
        fit()
    elif st == 'bake':
        p.stage_bake(); head_undersides()
    elif st == 'rig':
        rigging()
    elif st == 'anim':
        reference_clip()
        import vaqueiro_motion
        vaqueiro_motion.build(p)
    elif st == 'look':
        look()
    else:
        if 'PoseTest' in bpy.data.actions:   # inspection clip, not a game clip
            bpy.data.actions.remove(bpy.data.actions['PoseTest'])
        p.stage_export()
    if st != 'export':
        p.save(st)
