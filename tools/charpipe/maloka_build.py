"""Maloka (urban DPS Stealth) from its own turnaround; shared pipeline fit/bake/rig/export code.
blender -b --python tools/charpipe/maloka_build.py -- SourceArt/Maloka/character.json [--from fit|bake|rig|anim|look|export] [--to <stage>]

Everything is measured on this character's masks (build/masks, build/measure.json) and crops of its
references (doc 24); nothing comes from another character's build. Metres, Z up, faces -Y, character's
left = +X. Slots: Head (face, hair, bucket hat), Body (jersey, neck, bare arms), Hand (hands with the
bangles and rings), Leg (shorts, knees, calves with the socks), Foot (sneakers). Chain, glasses, earrings,
tattoos, trims and the print are painted (the silhouette carries their volume).

Hands (the Vaqueiro's fused into a smeared wedge): authored shells with a gap between the fingers, no voxel
remesh, no contour fit, and a painted texture instead of the projection (no view sees the back of a T-pose
hand). Every hand shell carries 'hpart' (0 palm, 1-4 fingers index..little, 5 thumb, 6 bangle, 7 ring) and
'hu' (0 at the base, 1 at the tip) for the paint and the weights.
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

# Landmarks measured on the references (crop.py grids, measure.json). See doc 24.
HEAD_TOP = 1.74      # head under the hat (eyes 1.638 halfway to the chin give ~1.75; 1 cm lower keeps it inside the crown)
CHIN = 1.525         # skin chin; the goatee hangs to 1.512 (painted on the chin front)
NECK_Z = 1.495       # jersey neckline / shoulder top
BRIM = dict(z=1.64, y=-.017, rx=.136, ry=.145, rxi=.094, ryi=.105, drop=.028, tilt=math.radians(13), t=.008)  # side: front edge 1.674 at y -.161, back 1.605 at .128
CROWN_Z = 1.70
HEM_Z = .80          # jersey hem (front y 690, side step between .78 and .82)
SHORTS_HEM = .52     # shorts hem (front .504, side .515)
SOCK_TOP = .42
HIP_Z, KNEE_Z, ANKLE_Z = .87, .49, .095
SHOULDER_X, ELBOW_X = .19, .45
WRIST_X = .655       # bangle at .645, hand .655 -> reach
REACH = (M['arm_reach_x']['L'] + M['arm_reach_x']['R']) / 2
ARM_Y = .02          # side view: the end-on hand sits 2-3 cm behind the chest centre
SHOE_TOP = .20
HEEL_Y, TOE_Y = .134, -.186
FOOT_X0, FOOT_X1 = .20, .25   # heel and toe centre (the feet splay out ~9 degrees, front view)
HAND = dict(lengths=(.078, .085, .080, .064), dy=(-.0295, -.0098, .0098, .0290), r=(.0094, .0097, .0092, .0082),
            palm_w=(.060, .084), palm_t=(.0215, .0155))   # wrist thickness = the arm's (it covers the arm end)


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
    """Remesh leaves small inner shells where pieces overlap; the contour fit then drags them across the
    body. Keep islands with >= keep x the largest one's vertices."""
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


def mark(o, name, value, kind='INT'):
    a = o.data.attributes.new(name, kind, 'POINT')
    for d in a.data:
        d.value = value
    return a


# ----------------------------------------------------------------------------- geometry
def hat():
    """Bucket hat: crown rings from the front width and side depth of the mask above the brim, and a
    sloped brim (a cone ring, inner edge 2.8 cm above the outer) tilted front-up 13 degrees."""
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    rings = []
    for z in np.arange(1.62, H - .004, .006):
        zz = max(z, CROWN_Z + .008)   # below, the brim covers the crown in every view
        hw = min(front_span(zz, fm, fc), .1); s = side_span(zz, sm, sc, -.2, .2)
        if hw < .01 or not s:
            break
        yf, yb = max(s[0], -.105), min(s[1], .11)
        rings.append(p.ring_z(0, z, hw, yf, yb, 2.2, 40))
    b = BRIM; ca, sa = math.cos(b['tilt']), math.sin(b['tilt'])
    # The crown ends on the tilted brim (front higher): below it, it stood off the head at the temples.
    plane = lambda y: b['z'] + b['drop'] * .8 - (y - b['y']) * sa / ca - .004
    rings = [[(x, y, max(z, plane(y))) for x, y, z in rg] for rg in rings]
    crown = p.loft('crown', rings)
    rings = []
    for k, r in enumerate((0, .35, .7, 1.0)):
        ring = []
        for j in range(56):
            a = 2 * math.pi * j / 56
            rx = b['rxi'] + (b['rx'] - b['rxi']) * r; ry = b['ryi'] + (b['ry'] - b['ryi']) * r
            x = rx * math.sin(a); dy = -ry * math.cos(a)
            dz = b['drop'] * (1 - r) ** 1.0 - b['drop'] * .2 * (1 - r) ** 2   # gentle downward curve
            ring.append((x, b['y'] + dy * ca, b['z'] - dy * sa + dz))
        rings.append(ring)
    top = [[(x, y, z + b['t'] / 2) for x, y, z in rg] for rg in rings]
    bot = [[(x, y, z - b['t'] / 2) for x, y, z in rg] for rg in rings[::-1]]
    brim = p.loft('brim', top + bot, caps=False)
    return [crown, brim]


def head():
    fm, fc = mask('front'); sm, sc = mask(p.B['depth_view'])
    zs = np.arange(CHIN - .015, HEAD_TOP + 1e-6, .005)
    hw, yF = [], []
    for z in zs:
        hw.append(min(.082, front_span(min(max(z, CHIN + .01), 1.615), fm, fc)))   # above 1.615 the brim widens the row
        s = side_span(min(max(z, CHIN), 1.655), sm, sc, -.2, .05)
        yF.append(max(s[0], -.14))
    hw, yF = medfilt(np.array(hw)), np.array(yF)
    yB = np.interp(zs, [1.51, 1.55, 1.60, 1.66, 1.72, HEAD_TOP], [.035, .062, .085, .095, .072, .03])   # skull behind the brim (fade seen to 1.57)
    base = np.array([yF[max(0, i - 4):i + 5].max() for i in range(len(zs))])   # face plane without the nose
    base = np.convolve(np.pad(base, 3, mode='edge'), np.ones(7) / 7, 'valid')
    resid = np.minimum(0, yF - base)
    rings = []
    for i, z in enumerate(zs):
        t = np.clip((z - zs[0]) / .03, 0, 1)                    # jaw underside
        dome = math.sqrt(max(0, 1 - ((z - 1.66) / (HEAD_TOP - 1.66 + .004)) ** 2)) if z > 1.66 else 1
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
    """Arm centre and half height. Inside ARM_X0 the front column is torso: the shoulder cap is measured
    on the front crop (top 1.50 at x .10 to the deltoid 1.477 at .238; underside from the armpit)."""
    if x < p.ARM_X0:
        zt = float(np.interp(x, [.10, .17, p.ARM_X0], [1.50, 1.495, 1.477]))
        zb = float(np.interp(x, [.10, .17, p.ARM_X0], [1.30, 1.33, p.arm_at(p.ARM_X0)[0]]))
        return (zb + zt) / 2, (zt - zb) / 2
    zb, zt = p.arm_at(x)
    return (zb + zt) / 2, (zt - zb) / 2


def torso_and_arms():
    """Jersey from the hem to the shoulders (front width, side depth; the side mask above the armpit
    holds the end-on arm), and bare arms from inside the shoulder to the wrist."""
    armpit = p.LM['armpit']
    upper = ([armpit, 1.33, 1.40, 1.46, 1.49, NECK_Z + .012], [.218, .192, .186, .172, .135, .07])
    rings = []
    for z in np.arange(HEM_Z, NECK_Z + .012, .02):
        hw = p.front_hw(z) if z <= armpit else float(np.interp(z, *upper))
        yf, yb = p.side_at(z)
        yb = min(yb, float(np.interp(z, [1.25, 1.40, 1.50], [.142, .12, .06])))
        yf = max(yf, float(np.interp(z, [1.25, 1.40, 1.50], [-.126, -.10, -.05])))
        rings.append(p.ring_z(0, z, hw, yf, yb, 2.3, 40))
    torso = p.loft('torso', rings)
    neck = p.loft('neck', [p.ring_z(0, z, w, yf, yb, 2.1, 24) for z, w, yf, yb in
                           ((1.45, .062, -.05, .06), (1.50, .054, -.044, .054), (1.56, .052, -.04, .05))])
    arms = [neck]
    for s in (1, -1):
        rs = []
        for x in list(np.arange(.10, WRIST_X - .01, .02)) + [WRIST_X - .006]:   # ends inside the palm, under the bangle
            zc, az = arm_z(x)
            ay = az * (1.25 if x < .22 else 1.0)   # deltoid: rounder in depth than tall
            rs.append(p.ring_x(s * x, ARM_Y * min(1, x / .2), zc, ay, az, 2.2, 20))
        arms.append(p.loft('arm', rs[::s]))
    return [torso] + arms


def legs():
    """Shorts (pelvis under the jersey + two wide leg tubes) and the bare knees/calves with the socks,
    which go up inside the shorts so the remesh closes the hem around them."""
    sm, sc = mask(p.B['depth_view']); L = p.LEGS
    pel = []
    for z, hw in ((.655, .232), (.70, .243), (.78, .232), (.84, .215), (.88, .19)):
        yf, yb = p.side_at(min(z, .78))
        pel.append(p.ring_z(0, z, hw, yf * .97, yb * .97, 2.3, 36))
    out = [p.loft('pelvis', pel)]
    for s in (1, -1):
        rs = []
        for z in np.arange(SHORTS_HEM, .71, .03):
            xo = float(np.interp(max(z, .54), L[:, 0], L[:, 3])); xi = min(float(np.interp(max(z, .54), L[:, 0], L[:, 4])), -.014)
            cx, hw = -(xo + xi) / 2, (xi - xo) / 2   # inner edge >= 1.4 cm off the centre: touching tubes fused into a bridge that tore
            ss = side_span(max(z, .54), sm, sc, -.3, .3); yc = (ss[0] + ss[1]) / 2; d = (ss[1] - ss[0]) / 2
            rs.append(p.ring_z(s * cx, z, hw, yc - d, yc + d, 2.4, 32))
        out.append(p.loft('shorts', rs))
        rs = []
        for z in np.arange(SHOE_TOP - .02, SHORTS_HEM + .05, .02):
            zz = min(z, .48)
            xo = float(np.interp(zz, L[:, 0], L[:, 3])); xi = float(np.interp(zz, L[:, 0], L[:, 4]))
            cx, hw = -(xo + xi) / 2, (xi - xo) / 2
            ss = side_span(max(zz, .23), sm, sc, -.15, .2); yc = (ss[0] + ss[1]) / 2; d = (ss[1] - ss[0]) / 2
            rs.append(p.ring_z(s * cx, z, hw, yc - d, yc + d, 2.2, 24))
        out.append(p.loft('leg', rs))
    return out


def shoe():
    """Left sneaker: collar ring around the ankle, then a chunky body lofted heel -> toe along the
    splayed foot axis, its top line read on the side mask column by column."""
    sm, sc = mask(p.B['depth_view'])
    ys = np.linspace(HEEL_Y, TOE_Y, 17); tops = []
    for y in ys:
        r0, c = px_side(y, 0, sc); best = .02
        for z in np.arange(.24, 0, -.004):
            r, _ = px_side(y, z, sc)
            if sm[r, c]:
                best = z; break
        tops.append(min(best, SHOE_TOP))
    rings = []
    for i, (y, top) in enumerate(zip(ys, tops)):
        u = i / (len(ys) - 1)
        w = .062 * float(np.interp(u, [0, .15, .55, .85, 1], [.78, .9, 1, .9, .55]))
        x = FOOT_X0 + (FOOT_X1 - FOOT_X0) * u
        r = []
        for j in range(24):
            sx, sz = p.se(2 * math.pi * j / 24, 2.8)
            r.append((x + w * sx, y, max(.0, top / 2 + top / 2 * sz)))
        rings.append(r)
    return [p.loft('shoe', rings)]


# ----------------------------------------------------------------------------- hands
def hand_line(x):
    """Hand centre z along x: the top contour of the front mask minus half the drawn thickness
    (the lower contour holds the curled fingers and the bangle)."""
    zt = p.arm_at(min(x, REACH - .004))[1]
    u = np.clip((x - WRIST_X) / (REACH - WRIST_X), 0, 1)
    return zt - float(np.interp(u, [0, .5, 1], [.021, .016, .011]))


def hand_shell(o, part, u_of=None, rigid=None):
    mark(o, 'hpart', part)
    a = o.data.attributes.new('hu', 'FLOAT', 'POINT')
    for v, d in zip(o.data.vertices, a.data):
        d.value = u_of(v.co) if u_of else 0.
    if rigid:
        g = o.vertex_groups.new(name='rigid_' + rigid); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
    return o


def torus(name, centre, axis, R, r, maj=28, mnr=8):
    R, r = float(R), float(r)   # numpy scalars turn Vector products into arrays
    axis = Vector(axis).normalized(); a = axis.orthogonal().normalized(); b = axis.cross(a)
    rings = []
    for i in range(maj + 1):
        t = 2 * math.pi * i / maj; c = Vector(centre) + R * (math.cos(t) * a + math.sin(t) * b)
        d = (math.cos(t) * a + math.sin(t) * b)
        rings.append([tuple(c + r * (math.cos(s) * d + math.sin(s) * axis)) for s in np.linspace(0, 2 * math.pi, mnr, endpoint=False)])
    return p.loft(name, rings[:-1] + [rings[0]], caps=False)


def hands():
    """Left hand, palm down, four straight fingers with a 2 mm gap (drawn together, read apart), thumb
    forward and down (front and above views), a loose bangle at the wrist and rings on the index, the
    middle finger and the thumb (above view). Proportions from the measured reach."""
    hl = REACH - WRIST_X; kx = REACH - HAND['lengths'][1]          # knuckle line: the middle finger ends at the reach
    yA = ARM_Y; out = []
    rs = []
    for x in np.linspace(WRIST_X - .016, kx + .007, 10):
        u = (x - WRIST_X) / (kx - WRIST_X)
        w = float(np.interp(u, [0, .35, 1], [HAND['palm_w'][0], HAND['palm_w'][1] * .96, HAND['palm_w'][1]])) / 2
        th = float(np.interp(u, [-.1, .2, 1], [HAND['palm_t'][0], HAND['palm_t'][0] * .9, HAND['palm_t'][1]])) * (1 + .10 * math.sin(math.pi * np.clip(u, 0, 1)))
        e = float(np.interp(x, [kx - .008, kx + .007], [1, 0]))   # knuckle end rounds off under the fingers (a flat cap stepped)
        w *= math.sqrt(1 - (1 - e) ** 2 * .3) if e < 1 else 1; th *= .35 + .65 * math.sqrt(max(e, 0))
        rs.append([(x, yA + w * sy, hand_line(x) + th * sz + (.0025 * -sy if sz > 0 else 0)) for sy, sz in
                   (p.se(2 * math.pi * j / 28, 2.1) for j in range(28))])
    out.append(hand_shell(p.loft('palm', rs), 0))
    for k, (ln, dy, r) in enumerate(zip(HAND['lengths'], HAND['dy'], HAND['r'])):
        x0 = kx - .012; y = yA + dy; z0 = hand_line(kx) + .002
        f = np.concatenate([np.linspace(0, .92, 13), [.97, 1.0]])   # dense rings: the joints bend inside 1 cm
        pts = [(x0 + (ln + .012) * t, y, z0 - .005 * t * t) for t in f]
        prof = ([0, .3, .55, .78, .92, .97, 1], [1.02, 1, .93, .88, .78, .66, .45], [.9, .86, .8, .76, .68, .58, .4])
        rad = [(r * float(np.interp(t, prof[0], prof[1])), r * float(np.interp(t, prof[0], prof[2]))) for t in f]
        fo = p.tube_along(f'finger{k}', pts, rad, 14)
        out.append(hand_shell(fo, 1 + k, lambda c, x0=x0, ln=ln: float(np.clip((c.x - x0) / (ln + .012), 0, 1))))
    tb = Vector((WRIST_X + .036, yA - HAND['palm_w'][1] * .36, hand_line(WRIST_X + .036) - .006))
    d = Vector((.50, -.62, -.60)).normalized(); tl = .068
    ft = np.concatenate([np.linspace(0, .9, 11), [.96, 1.0]])
    pts = [tuple(tb + d * tl * t) for t in ft]
    prof = ([0, .3, .58, .82, .95, 1], [.0118, .0112, .0104, .0096, .0082, .0045], [.0108, .0102, .0094, .0086, .0074, .004])
    to = p.tube_along('thumb', pts, [(float(np.interp(t, prof[0], prof[1])), float(np.interp(t, prof[0], prof[2]))) for t in ft], 14)
    out.append(hand_shell(to, 5, lambda c: float(np.clip((c - tb).dot(d) / tl, 0, 1))))
    zc, az = arm_z(.645)
    out.append(hand_shell(torus('bangle', (.645, yA, zc - .006), (1, 0, 0), az + .013, .0045, 32, 10), 6, rigid='S_ForeArm'))
    for k, u in ((0, .32), (1, .30)):   # index and middle rings, on the first phalanx
        ln, dy, r = HAND['lengths'][k], HAND['dy'][k], HAND['r'][k]
        x = kx - .012 + (ln + .012) * u
        out.append(hand_shell(torus(f'ring{k}', (x, yA + dy, hand_line(kx) + .002 - .005 * u * u), (1, 0, 0), r * .95 + .0014, .0017, 24, 8), 7, rigid='S_Finger1'))
    c = tb + d * tl * .52
    out.append(hand_shell(torus('ring_thumb', tuple(c), tuple(d), .0101 + .0014, .0018, 24, 8), 7, rigid='S_Thumb2'))
    return out


def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version = 0
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.fps = 100
    sc.collection.children.link(bpy.data.collections.new(NAME))
    P = p.B['parts']
    add('Body', torso_and_arms(), P['Body'].get('voxel', .006), P['Body'].get('tris', 7000))
    hd = add('Head', [head()], P['Head'].get('voxel', .004), P['Head'].get('tris', 2600), smooth=2)
    h = hat()
    for o in h:
        mark(o, 'hat', 1)   # tells the bake fix-ups hat from head (removed before rigging)
    p.join_into(hd, h)
    add('Hand', hands())   # authored shells, no remesh: the fingers stay apart
    add('Leg', legs(), P['Leg'].get('voxel', .007), P['Leg'].get('tris', 3800))
    add('Foot', shoe(), P['Foot'].get('voxel', .004), P['Foot'].get('tris', 1800) // 2, smooth=2)
    manifest = {v: dict(file=f, sha256=hashlib.sha256((p.CDIR / f).read_bytes()).hexdigest())
                for v, f in list(p.CFG['references'].items()) + [('props', p.CFG['props_reference']), ('above', p.CFG['guide_references']['above'])]}
    (OUT / 'source-manifest.json').write_text(json.dumps(manifest, indent=2))
    print('GEO', {o.name: len(o.data.polygons) for o in bpy.data.collections[NAME].objects})


# ----------------------------------------------------------------------------- bake fix-ups
def emit(build):
    m = bpy.data.materials.new('aux'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(build(nt), e.inputs[0])
    nt.links.new(e.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    return m


def attr_mat(name):
    def b(nt):
        a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_type = 'GEOMETRY'; a.attribute_name = name
        return a.outputs['Fac']
    return emit(b)


def geo_mat(key):
    return emit(lambda nt: nt.nodes.new('ShaderNodeNewGeometry').outputs[key])


def visibility(o, size):
    """Best cosine visibility (with occlusion) over the four reference directions."""
    sc = bpy.context.scene
    white = bpy.data.materials.new('vis'); white.use_nodes = True; nt = white.node_tree; nt.nodes.clear()
    d_ = nt.nodes.new('ShaderNodeBsdfDiffuse'); d_.inputs[0].default_value = (1, 1, 1, 1); nt.links.new(d_.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    sun = bpy.data.objects.new('vis_sun', bpy.data.lights.new('vis_sun', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 1; sun.data.angle = 0
    vis = np.zeros((size, size))
    for d in p.VIEW_DIR.values():
        sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        v = p.bake_into(o, white, size, 'DIFFUSE')[..., 0]; vis = np.maximum(vis, v / max(v.max(), 1e-6))
    bpy.data.objects.remove(sun)
    return vis


def restore(o, mats):
    o.data.materials.clear()
    for m in mats:
        o.data.materials.append(m)


def hat_and_jaw(slot='Head', jaw_fix=True):
    """Surfaces no reference sees on the head: the brim top and the crown top (seen edge-on), the brim
    underside and the jaw underside. Brim/crown tops take the median black of the well-seen hat per
    sector plus the white dot pattern (above view); undersides take the nearest well-seen colour in shade."""
    from mathutils.kdtree import KDTree
    o = p.parts_by_slot()[slot]; size = p.B['parts'][slot]['texture']; mats = list(o.data.materials)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    pos = p.bake_into(o, geo_mat('Position'), size, 'EMIT'); nrm = p.bake_into(o, geo_mat('Normal'), size, 'EMIT')
    hatm = p.bake_into(o, attr_mat('hat'), size, 'EMIT')[..., 0] > .5
    vis = visibility(o, size); restore(o, mats)
    path = OUT / 'textures' / f'{o.name}.png'; tex = p.img_np(path)
    cov = np.abs(pos).sum(2) > 1e-6; nz = nrm[..., 2] / np.maximum(np.linalg.norm(nrm, axis=2), 1e-6)
    lum = tex.mean(2)
    good = cov & hatm & (vis > .55) & (lum < .35)            # well-seen black cloth (dots excluded)
    ang = np.arctan2(pos[..., 0], pos[..., 1] - BRIM['y']); sector = ((ang + math.pi) / (2 * math.pi) * 16).astype(int) % 16
    glob = np.median(tex[good], axis=0)
    med = [np.median(tex[good & (sector == k)], axis=0) if (good & (sector == k)).sum() > 50 else glob for k in range(16)]
    tops = cov & hatm & (nz > .45) & (vis < .55)
    for k in range(16):
        sel = tops & (sector == k); tex[sel] = med[k]
    # Dots: a jittered grid in plan (x, y), ~2.4 cm apart, 3.5 mm radius, like the drawn pattern.
    q = pos[..., :2] / .024; cell = np.floor(q); h = np.sin(cell[..., 0] * 12.9898 + cell[..., 1] * 78.233) * 43758.5453
    jit = np.stack([(h - np.floor(h)), (h * 1.7 - np.floor(h * 1.7))], -1) * .6 + .2
    dot = np.linalg.norm((q - cell - jit) * .024, axis=-1) < .0035
    # Face, ears and the platinum fade projected onto the brim (side views, under the brim edge): on the hat,
    # anything warm and not dark is not the black cloth or a white dot (dots are neutral white).
    warm = cov & hatm & (lum > .28) & (tex[..., 0] - tex[..., 2] > .06)
    tex[warm] = glob
    dots = (tops | warm) & dot & ((h * 3.1 - np.floor(h * 3.1)) < .7)
    tex[dots] = (.93, .93, .9)

    def fill(dst, src, key, shade):
        s = np.argwhere(src); kd = KDTree(len(s))
        for i, (r, c) in enumerate(s):
            kd.insert(key(pos[r, c]), i)
        kd.balance(); out = tex.copy()
        for r, c in np.argwhere(dst):
            out[r, c] = tex[tuple(s[kd.find(key(pos[r, c]))[1]])] * shade
        return out
    under = cov & hatm & (nz < -.3)
    tex = fill(under, cov & hatm & (nz > .3), lambda q_: (q_[0], q_[1], 0), .6)
    jaw = cov & ~hatm & (nz < -.35) & (vis < .45) & (pos[..., 2] < CHIN + .04) & (pos[..., 2] > CHIN - .05) & jaw_fix
    skin = cov & ~hatm & (np.abs(nz) < .25) & (vis > .6) & (pos[..., 2] < 1.60) & (pos[..., 2] > CHIN - .01)
    tex = fill(jaw, skin, lambda q_: tuple(q_), .9)
    # Temples under the brim: the side views drew the brim there; the reference shows the platinum fade.
    hairc = cov & ~hatm & (pos[..., 1] > .04) & (pos[..., 2] > 1.56) & (pos[..., 2] < 1.62) & (lum > .65) & (np.ptp(tex, axis=2) < .1)
    plat = np.median(tex[hairc], axis=0) if hairc.sum() > 50 else np.array([.86, .83, .74])
    lum = tex.mean(2)
    temple = cov & ~hatm & (pos[..., 2] > 1.595) & (pos[..., 2] < 1.66) & (lum < .32) & (np.abs(pos[..., 0]) > .055) & (pos[..., 1] > -.08)
    tex[temple] = plat * .92
    p.np_img(o.name + '_fix', tex.astype(np.float32), path)
    o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    o.data.attributes.remove(o.data.attributes['hat'])
    rep = {'hat_top_texels': int(tops.sum()), 'hat_warm_texels': int(warm.sum()), 'dots': int(dots.sum()), 'hat_underside_texels': int(under.sum()), 'jaw_underside_texels': int(jaw.sum()), 'temple_texels': int(temple.sum()), 'platinum': [round(float(c), 3) for c in plat]}
    (OUT / 'review').mkdir(exist_ok=True); (OUT / 'review' / 'head-fixups.json').write_text(json.dumps(rep, indent=1)); print('HEAD_FIXUPS', rep)


def reference_skin():
    """Skin colour of the back of the hand on the front picture: median of the light, warm pixels between
    the bangle and the knuckles (rings and outline excluded)."""
    rgb = p.img_np(p.CDIR / p.CFG['references']['front']); cal = M['calibration']['front']; h = rgb.shape[0]
    px = []
    for x in np.arange(WRIST_X + .02, REACH - HAND['lengths'][1] - .005, .004):
        for s in (1, -1):
            r, c = px_front(s * x, hand_line(x) + .004, cal)
            for dr in range(-3, 4):
                px.append(rgb[h - 1 - (r + dr), c])   # img_np rows are bottom-up
    px = np.array(px); warm = px[(px[:, 0] > px[:, 2] + .08) & (px.mean(1) > .45)]
    return np.median(warm, axis=0)


def paint_hands(arm_slot='Body'):
    """Hand texture painted from the shape, not projected: skin from the reference with the dorsum light
    and the palm in shade, darker finger sides, knuckle creases, nails, and gold for the bangle and rings
    with their edge lines. Writes review/hand-paint.json."""
    o = p.parts_by_slot()['Hand']; size = p.B['parts']['Hand']['texture']; mats = list(o.data.materials)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    nrm = p.bake_into(o, geo_mat('Normal'), size, 'EMIT'); part = p.bake_into(o, attr_mat('hpart'), size, 'EMIT')[..., 0]
    hu = p.bake_into(o, attr_mat('hu'), size, 'EMIT')[..., 0]; pos = p.bake_into(o, geo_mat('Position'), size, 'EMIT')
    restore(o, mats)
    cov = np.abs(pos).sum(2) > 1e-6
    n = nrm / np.maximum(np.linalg.norm(nrm, axis=2, keepdims=True), 1e-6); nz, ny = n[..., 2], n[..., 1]
    skin = reference_skin(); gold = np.array([.93, .72, .28]); line = np.array([.20, .12, .08])
    ip = np.rint(part).astype(int)
    shade = np.where(nz > 0, 1.0, .86) * (1 - .10 * np.clip(np.abs(ny) - .5, 0, 1) * (ip >= 1) * (ip <= 4))
    tex = skin[None, None] * shade[..., None]
    fing = (ip >= 1) & (ip <= 4); th = ip == 5
    crease = np.zeros_like(hu)
    for c, wdt in ((.16, .018), (.52, .016), (.78, .014)):   # knuckle, middle and end joints (dorsal side)
        crease += np.exp(-((hu - c) / wdt) ** 2)
    crease = np.clip(crease, 0, 1) * (nz > .25) * fing
    crease += np.clip(np.exp(-((hu - .5) / .02) ** 2) * (nz > .2) * th, 0, 1)
    tex = tex * (1 - .32 * crease[..., None]) + line * .32 * crease[..., None]
    nail = ((fing & (hu > .84)) | (th & (hu > .82))) & (nz > .45)
    tex[nail] = np.clip(skin * 1.12 + np.array([.04, .0, .02]), 0, 1)
    ring = (ip == 6) | (ip == 7)
    tex[ring] = gold * np.where(nz[ring] > 0, 1.0, .72)[:, None]
    tex[~cov] = skin
    p.np_img(o.name + '_paint', tex.astype(np.float32), OUT / 'textures' / f'{o.name}.png')
    o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    bo = p.parts_by_slot()[arm_slot]; bs = p.B['parts'][arm_slot]['texture']; bm = list(bo.data.materials)
    bpos = p.bake_into(bo, geo_mat('Position'), bs, 'EMIT'); bn = p.bake_into(bo, geo_mat('Normal'), bs, 'EMIT'); restore(bo, bm)
    bz = bn[..., 2] / np.maximum(np.linalg.norm(bn, axis=2), 1e-6)
    wrist = (np.abs(bpos[..., 0]) > .60) & (bz < -.15) & (np.abs(bpos).sum(2) > 1e-6)
    bpath = OUT / 'textures' / f'{bo.name}.png'; btex = p.img_np(bpath); btex[wrist] = skin * .86
    p.np_img(bo.name + '_wrist', btex.astype(np.float32), bpath); bo.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    rep = {'skin_rgb': [round(float(c), 3) for c in skin], 'forearm_underside_texels': int(wrist.sum()), 'crease_texels': int((crease > .3).sum()), 'nail_texels': int(nail.sum()), 'gold_texels': int(ring.sum())}
    (OUT / 'review' / 'hand-paint.json').write_text(json.dumps(rep, indent=1)); print('HAND_PAINT', rep)


# ----------------------------------------------------------------------------- rig
def hand_bones():
    hl = REACH - WRIST_X; kx = REACH - HAND['lengths'][1]
    tb = Vector((WRIST_X + .036, ARM_Y - HAND['palm_w'][1] * .36, hand_line(WRIST_X + .036) - .006))
    d = Vector((.50, -.62, -.60)).normalized(); tl = .068
    return dict(hand=(WRIST_X, kx - .004), f1=(kx - .004, kx + .036), f2=(kx + .036, REACH),
                thumb=(tb - d * .012, tb + d * tl * .45, tb + d * tl))


def joints():
    yc = lambda z: sum(p.side_at(z)) / 2 + .01
    J = {}

    def bone(n, a, b, par):
        J[n] = (tuple(a), tuple(b), par)
    zs = lambda x: hand_line(x) if x >= WRIST_X else arm_z(x)[0]
    sm = mask(p.B['depth_view'])
    bone('Base', (0, yc(.90), .90), (0, yc(1.00), 1.00), None)
    bone('Waist', (0, yc(1.00), 1.00), (0, yc(1.12), 1.12), 'Base')
    bone('Chest1', (0, yc(1.12), 1.12), (0, yc(1.26), 1.26), 'Waist')
    bone('Chest2', (0, yc(1.26), 1.26), (0, .0, NECK_Z - .01), 'Chest1')
    bone('Neck', (0, .0, NECK_Z - .01), (0, .0, 1.555), 'Chest2')
    bone('Head', (0, .0, 1.555), (0, .0, H - .02), 'Neck')
    bone('Pelvis', (0, yc(.90), .90), (0, yc(.86), HIP_Z - .03), 'Base')
    bone('EffectBaseJoint', (0, 0, 0), (0, 0, .1), 'Base')
    hb = hand_bones()
    for s, S in ((1, 'L'), (-1, 'R')):
        sh = (s * SHOULDER_X, ARM_Y * .9, zs(SHOULDER_X))
        bone(f'{S}_Shoulder', (s * .04, .01, NECK_Z - .035), sh, 'Chest2')
        bone(f'{S}_UpperArm', sh, (s * ELBOW_X, ARM_Y, zs(ELBOW_X)), f'{S}_Shoulder')
        bone(f'{S}_ForeArm', (s * ELBOW_X, ARM_Y, zs(ELBOW_X)), (s * WRIST_X, ARM_Y, zs(WRIST_X)), f'{S}_UpperArm')
        (h0, h1), (a1, b1), (a2, b2) = hb['hand'], hb['f1'], hb['f2']
        bone(f'{S}_Hand', (s * h0, ARM_Y, zs(h0)), (s * h1, ARM_Y, zs(h1)), f'{S}_ForeArm')
        bone(f'{S}_Finger1', (s * a1, ARM_Y, zs(a1)), (s * b1, ARM_Y, zs(b1)), f'{S}_Hand')
        bone(f'{S}_Finger2', (s * a2, ARM_Y, zs(a2)), (s * b2, ARM_Y, zs(b2)), f'{S}_Finger1')
        t0, t1, t2 = (Vector((s * v.x, v.y, v.z)) for v in hb['thumb'])
        bone(f'{S}_Thumb1', t0, t1, f'{S}_Hand')
        bone(f'{S}_Thumb2', t1, t2, f'{S}_Thumb1')
        kx = .157; ky = sum(side_span(KNEE_Z, *sm, -.15, .2)) / 2; ax = FOOT_X0 - .005
        bone(f'{S}_Thigh', (s * .095, yc(HIP_Z) - .01, HIP_Z), (s * kx, ky, KNEE_Z), 'Pelvis')
        bone(f'{S}_Calf', (s * kx, ky, KNEE_Z), (s * ax, .05, ANKLE_Z), f'{S}_Thigh')
        fy = HEEL_Y + .62 * (TOE_Y - HEEL_Y); fx = FOOT_X0 + .62 * (FOOT_X1 - FOOT_X0)
        bone(f'{S}_Foot', (s * ax, .05, ANKLE_Z), (s * fx, fy, .04), f'{S}_Calf')
        bone(f'{S}_Toe1', (s * fx, fy, .04), (s * FOOT_X1, TOE_Y + .015, .03), f'{S}_Foot')
    return J


smooth = lambda k: k * k * (3 - 2 * k)
ramp = lambda a, b, t: smooth(max(0, min(1, (t - a) / (b - a))))
ALL = lambda v: True


def assign(o, rig, v, weights):
    for g in list(v.groups):
        if o.vertex_groups[g.group].name in rig.data.bones:
            o.vertex_groups[g.group].remove([v.index])
    for n, w in weights:
        if w > 1e-4:
            if n not in o.vertex_groups:
                o.vertex_groups.new(name=n)
            o.vertex_groups[n].add([v.index], w, 'REPLACE')


def smooth_deform_weights(o):
    """Bone heat leaves hard shoulder/chest borders: smooth, then back to 2 influences."""
    p.select_only([o]); bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='BONE_DEFORM', factor=.5, repeat=4)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=2)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def weights_legs(o, rig, sel=ALL, side=lambda v: 'L' if v.co.x > 0 else 'R'):
    """Shorts + legs: one 34 cm hip ramp for the loose shorts; the gusset and the inner walls of the shorts
    legs hand over from the pelvis to the thigh; below the hem, the knee blends over 11 cm."""
    for v in o.data.vertices:
        if not sel(v):
            continue
        S = side(v); z = v.co.z
        # The middle of the shorts (hidden crotch) rides the pelvis, faded in from the centre line: a bare
        # L | R cut there tore x12 in the high kick.
        c = max(0, 1 - abs(v.co.x) / .11)
        k = max(ramp(.58, HIP_Z + .05, z) ** 1.3, c ** .7 * ramp(.635, .665, z))
        # The gusset hangs 23 cm under the hip joint: a 85-degree kick carries it 30 cm. The inner walls of the
        # shorts legs hand over from the pelvis to the thigh over 16 cm (.665 -> .50), like the cloth does.
        inner = max(0, 1 - (abs(v.co.x) - .014) / .11)
        if z < .70:
            k = max(k, inner * ramp(.50, .665, z) * .85)
        if k > 0 and z > SHORTS_HEM - .01:
            w = [(S + '_Thigh', 1 - k), ('Pelvis', k)]
        else:
            k = ramp(KNEE_Z - .07, KNEE_Z + .04, z)
            w = [(S + '_Calf', 1 - k), (S + '_Thigh', k)]
        assign(o, rig, v, w)


def weights_feet(o, rig, sel=ALL, top=SHOE_TOP + .01, side=lambda v: 'L' if v.co.x > 0 else 'R'):
    """Sneakers: the collar rides the shin at the back and sides (and everything up to `top` when shoe and
    sock are one surface); the toe box bends at the ball."""
    for v in o.data.vertices:
        if not sel(v):
            continue
        S = side(v); z = v.co.z
        k = ramp(.10, SHOE_TOP + .01, z) * ramp(-.02, .08, v.co.y)
        if top > SHOE_TOP + .01:
            k = max(k, ramp(SHOE_TOP - .01, top, z))
        if k > 0:
            w = [(S + '_Calf', k), (S + '_Foot', 1 - k)]
        else:
            t = ramp(-.05, -.11, v.co.y)   # Toe1 starts at y -.064
            w = [(S + '_Toe1', t), (S + '_Foot', 1 - t)]
        assign(o, rig, v, w)


def weights_torso(o, rig, sel=ALL):
    """Clavicle weight to Chest2, one continuous Chest2 -> UpperArm ramp across the shoulder, and the flank
    under the armpit on the spine (heat gave the shoulder bone the flank: x4-7 in the Vaqueiro)."""
    armpit = p.LM['armpit']; names = [g.name for g in o.vertex_groups]
    for v in o.data.vertices:
        if not sel(v):
            continue
        cur = {names[g.group]: g.weight for g in v.groups if names[g.group] in rig.data.bones}
        if any(n.endswith('_Shoulder') for n in cur):
            sh = sum(w for n, w in cur.items() if n.endswith('_Shoulder')); cur = {n: w for n, w in cur.items() if not n.endswith('_Shoulder')}
            cur['Chest2'] = cur.get('Chest2', 0) + sh; assign(o, rig, v, list(cur.items()))
        x = abs(v.co.x)
        if .11 < x < .36 and v.co.z > armpit + .02:
            S = 'L' if v.co.x > 0 else 'R'; a = ramp(.14, .34, x)
            assign(o, rig, v, [(S + '_UpperArm', a), ('Chest2', 1 - a)])

    def spine(z):
        if z >= 1.22:
            c = ramp(1.22, 1.34, z); return {'Chest2': c, 'Chest1': 1 - c}
        c = ramp(1.06, 1.20, z); return {'Chest1': c, 'Waist': 1 - c}
    for v in o.data.vertices:
        f = ramp(0, 1, (armpit + .01 - v.co.z) / .09) * ramp(0, 1, (.26 - abs(v.co.x)) / .07)
        if f <= 0 or not sel(v):
            continue
        cur = {names[g.group]: g.weight for g in v.groups if names[g.group] in rig.data.bones}
        mix = {n: (1 - f) * cur.get(n, 0) + f * spine(v.co.z).get(n, 0) for n in set(cur) | set(spine(v.co.z))}
        top = sorted(mix.items(), key=lambda kv: -kv[1])[:2]; tot = sum(w for _, w in top)
        assign(o, rig, v, [(n, w / tot) for n, w in top])


def weights_hands(o, rig):
    """From the shell tags: palm ForeArm -> Hand at the wrist; fingers Hand -> Finger1 at the knuckle,
    Finger1 -> Finger2 at the middle joint (continuous, non-overlapping ramps); thumb Hand -> Thumb1 ->
    Thumb2 along its length; the bangle and rings stay rigid (stage_rig)."""
    hp = o.data.attributes['hpart'].data; hu = o.data.attributes['hu'].data; hb = hand_bones()
    for v in o.data.vertices:
        S = 'L' if v.co.x > 0 else 'R'; x = abs(v.co.x); part = hp[v.index].value; u = hu[v.index].value
        if part <= 4:
            a = ramp(WRIST_X - .02, WRIST_X + .02, x); b = ramp(hb['hand'][1] - .018, hb['hand'][1] + .018, x); c = ramp(hb['f2'][0] - .017, hb['f2'][0] + .017, x)
            if c > 0:
                w = [(S + '_Finger1', 1 - c), (S + '_Finger2', c)]
            elif b > 0:
                w = [(S + '_Hand', 1 - b), (S + '_Finger1', b)]
            else:
                w = [(S + '_ForeArm', 1 - a), (S + '_Hand', a)]
        elif part == 5:
            if u < .45:
                t = ramp(0, .25, u); w = [(S + '_Hand', 1 - t), (S + '_Thumb1', t)]
            else:
                t = ramp(.4, .58, u); w = [(S + '_Thumb1', 1 - t), (S + '_Thumb2', t)]
        else:
            continue
        assign(o, rig, v, w)
    for a in ('hpart', 'hu'):
        o.data.attributes.remove(o.data.attributes[a])


def rig_setup():
    p.joints = joints; p.make_pose_test = lambda rig: None; p.sash_vertices = lambda o, slot: set()
    p.AN['head_joint_z'] = 1.555
    p.SLOT_BONES['Head'] = ['Head']
    p.SLOT_BONES['Leg'] = ['Base', 'Pelvis'] + [f'{S}_{b}' for S in 'LR' for b in ('Thigh', 'Calf')]


def rigging():
    rig_setup(); p.stage_rig()
    parts = p.parts_by_slot(); rig = parts['Body'].parent
    smooth_deform_weights(parts['Body'])
    weights_legs(parts['Leg'], rig); weights_feet(parts['Foot'], rig); weights_torso(parts['Body'], rig); weights_hands(parts['Hand'], rig)
    print('RIG_MALOKA', {s: p.bone_influences(ob) for s, ob in p.parts_by_slot().items()})


def reference_clip():
    """Reference pose; the game clips and props come from maloka_motion.build. PoseTest (arms down,
    crouch, high kick, closed fist) checks the weights; it is removed before the export."""
    rig = next(o for o in bpy.data.collections[NAME].objects if o.type == 'ARMATURE')
    rig.animation_data_create(); act = bpy.data.actions.new('apose'); rig.animation_data.action = act
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
        for f in (0, 100):
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    act['fps'] = 100; act.use_fake_user = True; rig.animation_data.action = None
    pose_test(rig); act = bpy.data.actions['PoseTest']; act['fps'] = 100
    meshes = [o for o in bpy.data.collections[NAME].objects if o.type == 'MESH']
    sc = bpy.context.scene; base = rig.pose.bones['Base']
    for f in range(int(act.frame_range[0]), int(act.frame_range[1]) + 1):
        sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
        low = min(min((o.matrix_world @ v.co).z for v in o.evaluated_get(dg).to_mesh().vertices) for o in meshes)
        if low < 0:
            base.location.y -= low; base.keyframe_insert('location', frame=f)
    rig.animation_data.action = None
    print('ANIM', ['apose', 'PoseTest'])


def look():
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.fps = 100
    sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('MalokaStudio'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.26, .29, .31, 1)
    line = bpy.data.materials.new(f'{NAME}_Silhouette'); line.use_nodes = True; nt = line.node_tree; nt.nodes.clear()
    lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in p.B['look']['outline_color']]
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (*lin, 1)
    nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0]); line.use_backface_culling = True
    for o in p.parts_by_slot().values():
        img = o.data.materials[0].node_tree.nodes['Image Texture'].image
        o.data.materials.clear(); o.data.materials.append(p.toon_material(o.name, img)); o.data.materials.append(line)
        sol = o.modifiers.new('Silhouette', 'SOLIDIFY'); sol.thickness = p.B['look']['outline_ratio'] * H * (.5 if o.name.endswith('Hand_000') else 1)
        sol.offset = 1; sol.use_flip_normals = True; sol.material_offset = 1; sol.use_rim = False
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
    hz = hand_line(.75)
    shots = [('front', (0, -8, .92), (0, 0, .92), 2.3), ('back', (0, 8, .92), (0, 0, .92), 2.3),
             ('left', (8, 0, .92), (0, 0, .92), 2.3), ('threequarter', (4.4, -6.5, 2.4), (0, 0, .9), 2.2),
             ('face', (.35, -2.0, 1.66), (0, 0, 1.63), .5), ('hat-top', (.8, -1.4, 2.9), (0, 0, 1.68), .7),
             ('hand-top', (.75, -.35, hz + 1.2), (.75, ARM_Y, hz), .3), ('hand-front', (.75, -1.2, hz), (.75, ARM_Y, hz), .3),
             ('hand-threequarter', (1.35, -.9, hz + .6), (.75, ARM_Y, hz), .32), ('hand-palm', (.75, -.5, hz - 1.0), (.75, ARM_Y, hz), .3),
             ('feet', (.7, -1.2, .25), (.22, 0, .1), .65), ('game-camera', (0, -7.5, 7.0), (0, 0, .8), 6.5)]
    for name, loc, target, scale in shots:
        cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale
        sc.render.resolution_x, sc.render.resolution_y = (1280, 720) if name == 'game-camera' else (900, 1000)
        sc.render.resolution_percentage = 100
        sc.render.filepath = str(rd / (name + '.png')); bpy.ops.render.render(write_still=True)


def fit():
    """Shared contour fit on front + depth view. The hands stay as authored: the front mask holds the
    curled fingers and the bangle below the hand line."""
    p.CL['pants_top_z'] = HEM_Z   # fit_masks mirrors the front below this height (the outfit is symmetric)
    p.build_accessories = lambda: None
    full = p.parts_by_slot
    p.parts_by_slot = lambda: {k: v for k, v in full().items() if k != 'Hand'}
    p.stage_fit()
    p.parts_by_slot = full


if __name__ == '__main__':
    stages = ['geo', 'fit', 'bake', 'rig', 'anim', 'look', 'export']
    start = stages.index(resume)
    if start:
        bpy.ops.wm.open_mainfile(filepath=str(OUT / ('stage-' + stages[start - 1] + '.blend')))
    for st in stages[start:stages.index(last) + 1]:
        print('MALOKA_STAGE', st, flush=True)
        if st == 'geo':
            geometry()
        elif st == 'fit':
            fit()
        elif st == 'bake':
            p.stage_bake(); hat_and_jaw(); paint_hands()
        elif st == 'rig':
            rigging()
        elif st == 'anim':
            reference_clip()
            import maloka_motion
            maloka_motion.build(p)
        elif st == 'look':
            look()
        else:
            if 'PoseTest' in bpy.data.actions:   # inspection clip, not a game clip
                bpy.data.actions.remove(bpy.data.actions['PoseTest'])
            p.stage_export()
        if st != 'export':
            p.save(st)
