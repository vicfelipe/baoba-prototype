"""Quadruped rig and boss clips for the Mula sem Cabeça; exports the web GLB.

  blender -b SourceArt/MulaSemCabeca/build/look/stage-look.blend --python tools/charpipe/mula_rig.py -- SourceArt/MulaSemCabeca/character.json [--renders]

Frame: the painted mesh (head end +X) is turned to face -Y (glTF +Z, the game's forward). Authoring happens in the
mule frame (x forward, y the animal's left, z up); R maps it to Blender (+X = the animal's left).
Skeleton: Root, Hips, Spine1, Spine2, Chest, Neck1, Neck2, Flame (the fire's anchor), Tail1-4 and per side (L_/R_)
Scapula, FUpper, FFore, FCannon, FHoof, Thigh, Gaskin, HCannon, HHoof. Weights: heat on a closed voxel proxy, transferred; nearest bone where heat
fails, flame rigid on Flame, no weight from the other side's legs, at most 2 influences (Lunia contract).
Motion: each frame = body transform + FK chains (spine, neck, flame, tail, each lagging the body) + analytic leg IK:
the upper bone follows the leg swing, two-bone IK from elbow/stifle to the fetlock, the hoof flat in stance. Feet
are planted: in locomotion the ground slides back at the clip's speed and the game moves the root.
Timings come only from web/src/config.js (MULA, CINEMATIC). Clips are keyed at 100 fps.
"""
import bpy, sys, json, math, re
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
a = sys.argv[sys.argv.index('--') + 1:]
cfg_path = (ROOT / a[0]).resolve(); CDIR = cfg_path.parent
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); NAME = cfg['name']
RENDERS = '--renders' in a
FPS = 100
OUT = CDIR / 'build' / 'rig'; OUT.mkdir(parents=True, exist_ok=True)
D = math.radians

# ----------------------------------------------------------------------------- timings (config.js only)
src = (ROOT / 'web/src/config.js').read_text(encoding='utf-8')
mtxt = src.split('export const MULA =')[1].split('\n};')[0]; ctxt = src.split('export const CINEMATIC =')[1]
num = lambda pat, s=mtxt: float(re.search(pat, s, re.S | re.M).group(1))
TM = {'speed': num(r'^\s*speed: ([\d.]+)'), 'kick': num(r'\bkick: \{[^}]*?\bwarn: ([\d.]+)'),
      'charge': num(r'\bcharge: \{[^}]*?\bwarn: ([\d.]+)'), 'charge_speed': num(r'\bcharge: \{[^}]*?\bspeed: ([\d.]+)'),
      'stomp': num(r'\bstomp: \{[^}]*?\bwarn: ([\d.]+)'), 'awaken': num(r'\bawaken: ([\d.]+)', ctxt),
      'basic': num(r'\bbasic: \{[^}]*?\bwindup: ([\d.]+)'), 'basic_hit': num(r'\bbasic: \{[^}]*?\bhit: ([\d.]+)')}
print('MULA_TIMINGS', json.dumps(TM))

# ----------------------------------------------------------------------------- mesh and landmarks
sc = bpy.context.scene; sc.render.fps = FPS
o = bpy.data.objects[f'{NAME}_Full_000']; me = o.data
assert o.matrix_world == Matrix.Identity(4)
co = np.array([v.co[:] for v in me.vertices])          # mule frame (head +X)
ca = me.color_attributes['silhouette']; g = np.zeros(len(me.loops) * 4); ca.data.foreach_get('color', g)
lv = np.zeros(len(me.loops), int); me.loops.foreach_get('vertex_index', lv)
flame_col = np.zeros(len(co), bool); flame_col[lv[g.reshape(-1, 4)[:, 1] < .5]] = True
flame = flame_col & (co[:, 0] > .9) & (co[:, 2] > 1.55)

hooves = {}
low = co[co[:, 2] < .08]; cx = co[:, 0].mean()
for leg, fx, s in (('LF', 1, 1), ('RF', 1, -1), ('LH', -1, 1), ('RH', -1, -1)):
    q = low[(np.sign(low[:, 0] - cx) == fx) & (np.sign(low[:, 1]) == s)]; hooves[leg] = q.mean(0)


def leg_center(x0, s, z, win=.3):
    q = co[(np.abs(co[:, 2] - z) < .04) & (np.sign(co[:, 1]) == s) & (np.abs(co[:, 1]) > .08) & (np.abs(co[:, 0] - x0) < win)]
    return Vector((q[:, 0].mean(), q[:, 1].mean(), z))


V = lambda *p: Vector(p)
J = {'Root': (V(0, 0, 0), V(.5, 0, 0)),
     'Hips': (V(-.95, 0, 1.78), V(-.35, 0, 1.84)), 'Spine1': (V(-.35, 0, 1.84), V(.15, 0, 1.88)),
     'Spine2': (V(.15, 0, 1.88), V(.42, 0, 1.94)), 'Chest': (V(.42, 0, 1.94), V(.62, 0, 1.98)),
     'Neck1': (V(.62, 0, 1.98), V(.82, 0, 2.12)), 'Neck2': (V(.82, 0, 2.12), V(1.0, 0, 2.32)),
     'Flame': (V(1.0, 0, 2.32), V(1.32, 0, 2.9))}
tail = [V(-1.58, 0, 1.86), V(-1.71, 0, 1.52), V(-1.76, 0, 1.22), V(-1.78, 0, .96), V(-1.8, 0, .66)]
for i in range(4):
    J[f'Tail{i + 1}'] = (tail[i], tail[i + 1])
LEGS = {}
for side, s in (('L', 1), ('R', -1)):
    h = hooves[side + 'F']; toe = V(h[0] + .12, h[1], 0)
    F = leg_center(h[0], s, .26); K = leg_center(h[0], s, .62); c = leg_center(h[0], s, .98)
    E = V(c.x - .06, c.y, 1.12); S = V(E.x + .24, c.y, 1.5); top = V(E.x - .16, c.y * .6, 1.96)
    J[side + '_Scapula'] = (top, S); J[side + '_FUpper'] = (S, E); J[side + '_FFore'] = (E, K)
    J[side + '_FCannon'] = (K, F); J[side + '_FHoof'] = (F, toe)
    LEGS[side + 'F'] = dict(chain=[side + '_FUpper', side + '_FFore', side + '_FCannon', side + '_FHoof'], root=side + '_Scapula', toe=toe)
    h = hooves[side + 'H']; toe = V(h[0] + .12, h[1], 0)
    F = leg_center(h[0], s, .26); Hk = leg_center(h[0], s, .68); c = leg_center(h[0], s, .98)
    St = V(c.x + .14, c.y, 1.15); Hp = V(c.x - .12, c.y * .85, 1.6)
    J[side + '_Thigh'] = (Hp, St); J[side + '_Gaskin'] = (St, Hk); J[side + '_HCannon'] = (Hk, F); J[side + '_HHoof'] = (F, toe)
    LEGS[side + 'H'] = dict(chain=[side + '_Thigh', side + '_Gaskin', side + '_HCannon', side + '_HHoof'], root='Hips', toe=toe)
PARENT = {'Root': None, 'Hips': 'Root', 'Spine1': 'Hips', 'Spine2': 'Spine1', 'Chest': 'Spine2', 'Neck1': 'Chest',
          'Neck2': 'Neck1', 'Flame': 'Neck2', 'Tail1': 'Hips', 'Tail2': 'Tail1', 'Tail3': 'Tail2', 'Tail4': 'Tail3'}
for side in 'LR':
    PARENT.update({side + '_Scapula': 'Chest', side + '_FUpper': side + '_Scapula', side + '_FFore': side + '_FUpper',
                   side + '_FCannon': side + '_FFore', side + '_FHoof': side + '_FCannon', side + '_Thigh': 'Hips',
                   side + '_Gaskin': side + '_Thigh', side + '_HCannon': side + '_Gaskin', side + '_HHoof': side + '_HCannon'})
ORDER = []
while len(ORDER) < len(PARENT):
    for n, p in PARENT.items():
        if n not in ORDER and (p is None or p in ORDER): ORDER.append(n)

# ----------------------------------------------------------------------------- turn to the game's forward, build the armature
R3 = Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1))); R4 = R3.to_4x4()   # mule frame -> Blender
me.transform(R4); me.update()
ad = bpy.data.armatures.new(f'{NAME}_Rig'); rig = bpy.data.objects.new(f'{NAME}_Rig', ad); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
LAT = R3 @ V(0, 1, 0)
for n in ORDER:
    eb = ad.edit_bones.new(n); eb.head, eb.tail = R3 @ J[n][0], R3 @ J[n][1]; eb.align_roll(LAT)
    if PARENT[n]: eb.parent = ad.edit_bones[PARENT[n]]
    eb.use_deform = n != 'Root'
bpy.ops.object.mode_set(mode='OBJECT')
LB = {n: R4.inverted() @ ad.bones[n].matrix_local for n in ORDER}   # rest, mule frame
length = {n: ad.bones[n].length for n in ORDER}

# ----------------------------------------------------------------------------- weights
sol = o.modifiers.get('Silhouette')   # outline hull must be built after the armature deformation
keep = {k: getattr(sol, k) for k in ('thickness', 'offset', 'use_flip_normals', 'material_offset', 'use_rim')} if sol else None
if sol: o.modifiers.remove(sol)


def select(objs, active):
    for x in sc.objects: x.select_set(x in objs)
    bpy.context.view_layer.objects.active = active


# Heat weighting fails on the generator's open, self-intersecting surface: solve it on a closed voxel
# proxy and transfer the weights to the painted mesh (nearest face, interpolated).
proxy = bpy.data.objects.new('WeightProxy', o.data.copy()); sc.collection.objects.link(proxy)
rm = proxy.modifiers.new('Remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .035
dc = proxy.modifiers.new('Decimate', 'DECIMATE'); dc.ratio = .25
select([proxy], proxy); bpy.ops.object.modifier_apply(modifier='Remesh'); bpy.ops.object.modifier_apply(modifier='Decimate')
select([proxy, rig], rig); bpy.ops.object.parent_set(type='ARMATURE_AUTO')
proxy_groups = {vg.name for vg in proxy.vertex_groups}
dt = o.modifiers.new('Weights', 'DATA_TRANSFER'); dt.object = proxy; dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
select([o], o); bpy.ops.object.datalayout_transfer(modifier='Weights'); bpy.ops.object.modifier_apply(modifier='Weights')
select([o, rig], rig); bpy.ops.object.parent_set(type='ARMATURE')
bpy.data.objects.remove(proxy, do_unlink=True)
if keep:
    sol = o.modifiers.new('Silhouette', 'SOLIDIFY')
    for k, v in keep.items(): setattr(sol, k, v)
names = [n for n in ORDER if n != 'Root']; idx = {n: i for i, n in enumerate(names)}
W = np.zeros((len(co), len(names)))
gid = {vg.index: vg.name for vg in o.vertex_groups}
for v in me.vertices:
    for ge in v.groups:
        n = gid.get(ge.group)
        if n in idx: W[v.index, idx[n]] = ge.weight
heat_failed = int((W.sum(1) < 1e-6).sum())
segs = [(J[n][0], J[n][1]) for n in names]
for i in np.nonzero(W.sum(1) < 1e-6)[0]:
    p = Vector(co[i]); best = None
    for k, (h, t) in enumerate(segs):
        ab = t - h; u = max(0, min(1, (p - h).dot(ab) / ab.length_squared)); d = (p - (h + ab * u)).length
        if best is None or d < best[0]: best = (d, k)
    W[i, best[1]] = 1
for n in names:   # no weight from the other side's legs
    if n[:2] in ('L_', 'R_'):
        W[(co[:, 1] * (1 if n[0] == 'L' else -1)) < -.06, idx[n]] = 0
W[flame] = 0; W[flame, idx['Flame']] = 1   # the flame is rigid (like the Lunia head)
top2 = np.argsort(-W, axis=1)[:, :2]; W2 = np.zeros_like(W)
np.put_along_axis(W2, top2, np.take_along_axis(W, top2, axis=1), axis=1)
W2[W2 < .02] = 0
for i in np.nonzero(W2.sum(1) < 1e-6)[0]: W2[i, np.argmax(W[i])] = 1
W2 /= W2.sum(1, keepdims=True)
for vg in list(o.vertex_groups):
    if vg.name in idx: o.vertex_groups.remove(vg)
for n in names:
    vg = o.vertex_groups.new(name=n); col = W2[:, idx[n]]
    for i in np.nonzero(col > 0)[0]: vg.add([int(i)], float(col[i]), 'REPLACE')
print('MULA_WEIGHTS', json.dumps({'proxy_bones_weighted': len(proxy_groups), 'heat_failed_vertices': heat_failed, 'flame_vertices': int(flame.sum()), 'max_influences': int((W2 > 0).sum(1).max())}))

# ----------------------------------------------------------------------------- posing


def rot(axis, ang): return Matrix.Rotation(ang, 4, axis)


def aim(head, tail_, lat):
    y = (tail_ - head).normalized(); z = (lat - y * lat.dot(y)).normalized(); x = y.cross(z)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = head; return M


def fk(pose_par, n, bend=0.0, side=0.0):
    """Child pose from its parent's pose; bend about the bone's lateral Z (+ = tip toward its X), side about X."""
    return pose_par @ LB[PARENT[n]].inverted() @ LB[n] @ rot('Z', D(bend)) @ rot('X', D(side))


def solve_leg(leg, H, G, phi, Rb, follow):
    """Joints of one leg: H = shoulder/hip joint, G = toe target on the ground (mule frame), phi = hoof tilt (deg,
    + toe up / folding back), Rb = body rotation. Returns pose matrices and the toe reach error."""
    up_, fore, can, hoof = LEGS[leg]['chain']
    P = {n: J[n] for n in LEGS[leg]['chain']}
    a_, b_, c_ = (P[up_][1] - P[up_][0]).length, (P[fore][1] - P[fore][0]).length, (P[can][1] - P[can][0]).length
    lat = (Rb @ V(0, 1, 0)).normalized()
    hv = Matrix.Rotation(D(phi), 3, V(0, 1, 0)) @ (P[hoof][1] - P[hoof][0])
    F = G - hv
    restF = Rb @ (P[can][1] - P[up_][0]); cur = F - H
    sw = math.atan2(restF.cross(cur).dot(lat), restF.dot(cur))
    uA = Matrix.Rotation(sw * follow, 3, lat) @ (Rb @ (P[up_][1] - P[up_][0]).normalized())
    for _ in range(30):   # unreachable: swing the upper bone toward the target
        E = H + uA * a_
        if (F - E).length <= (b_ + c_) * .995: break
        uA = uA.lerp((F - H).normalized(), .2).normalized()
    E = H + uA * a_; d_vec = F - E; d = max(abs(b_ - c_) + 1e-3, min(b_ + c_ - 1e-4, d_vec.length)); dn = d_vec.normalized()
    restK = P[fore][1] - P[fore][0]; restEF = P[can][1] - P[fore][0]
    hint = Rb @ (restK - restEF.normalized() * restK.dot(restEF.normalized()))
    hint = (hint - dn * hint.dot(dn)).normalized()
    ak = (b_ * b_ - c_ * c_ + d * d) / (2 * d); hk = math.sqrt(max(0, b_ * b_ - ak * ak))
    K = E + dn * ak + hint * hk; Fp = E + dn * d
    out = {up_: aim(H, E, lat), fore: aim(E, K, lat), can: aim(K, Fp, lat), hoof: aim(Fp, Fp + hv, lat)}
    return out, (Fp + hv - G).length


def body_matrix(b):
    pv = V(*b.get('pivot', (-.2, 0, 1.6)))
    R = rot('Z', D(b.get('yaw', 0))) @ rot('X', D(b.get('roll', 0))) @ rot('Y', -D(b.get('pitch', 0)))
    return Matrix.Translation(pv + V(b.get('dx', 0), b.get('dy', 0), b.get('dz', 0))) @ R @ Matrix.Translation(-pv)


def pose_of(P):
    """Pose matrices (mule frame) for a parameter set."""
    B = body_matrix(P['body']); Rb = B.to_3x3()
    out = {'Root': LB['Root'].copy()}
    out['Hips'] = B @ LB['Hips'] @ rot('Z', D(P.get('hips', 0)))
    for n, k in (('Spine1', 0), ('Spine2', 1), ('Chest', 2)):
        out[n] = fk(out[PARENT[n]], n, *P['spine'][k])
    for n, k in (('Neck1', 0), ('Neck2', 1), ('Flame', 2)):
        out[n] = fk(out[PARENT[n]], n, *P['neck'][k])
    for i in range(4):
        n = f'Tail{i + 1}'; out[n] = fk(out[PARENT[n]], n, *P['tail'][i])
    err = {}
    for leg in LEGS:
        rt = LEGS[leg]['root']; first = LEGS[leg]['chain'][0]
        G, phi = P['feet'][leg]
        Rleg = (out['Chest'] if rt != 'Hips' else out['Hips']).to_3x3() @ (LB['Chest'] if rt != 'Hips' else LB['Hips']).to_3x3().inverted()
        if rt != 'Hips':
            # the rest front leg is almost straight: the scapula swings (smallest angle that reaches) for extra reach
            best = None
            for k in [0] + [s_ * i * 2.5 for i in range(1, 9) for s_ in (1, -1)]:
                scap = fk(out['Chest'], rt, P.get('scap', {}).get(leg, 0) + k); H = scap @ V(0, length[rt], 0)
                legs, e = solve_leg(leg, H, G, phi, Rleg, .55)
                if best is None or e < best[1] - 1e-3: best = (scap, e, legs)
                if e < .003: break
            out[rt], e, legs = best
        else:
            H = out['Hips'] @ LB['Hips'].inverted() @ J[first][0]
            legs, e = solve_leg(leg, H, G, phi, Rleg, .45)
        out.update(legs)
        if G.z < .01 and abs(phi) < 1e-6: err[leg] = max(err.get(leg, 0.0), e)   # slip of a planted hoof
    return out, err


# ----------------------------------------------------------------------------- clips
TOE = {leg: LEGS[leg]['toe'] for leg in LEGS}
# gait centre under the joints (the art's rest stance is open: one hind hoof forward), toe ahead of the fetlock
CEN = {leg: J[LEGS[leg]['chain'][0]][0].x + (-.05 if leg[1] == 'F' else .15) for leg in LEGS}


def ss(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def ramp(t, t0, t1): return ss((t - t0) / (t1 - t0)) if t1 > t0 else float(t >= t0)


def bump(t, t0, t1, t2, t3): return ramp(t, t0, t1) * (1 - ramp(t, t2, t3))


def lerp(a_, b_, k): return a_ + (b_ - a_) * k


def neutral():
    return {'body': {}, 'spine': [(0, 0)] * 3, 'neck': [(0, 0)] * 3, 'tail': [(0, 0)] * 4,
            'feet': {leg: (TOE[leg].copy(), 0.0) for leg in LEGS}, 'scap': {}}


def gait(t, T, v, order, duty, lift, flip):
    """In-place gait: toe targets slide back at v in stance and arc forward in swing."""
    feet = {}
    for leg, off in order.items():
        ph = ((t / T) - off) % 1.0; stance = v * duty * T
        x0 = V(CEN[leg], TOE[leg].y, 0)
        if ph < duty:
            G = x0 + V(stance / 2 - stance * ph / duty, 0, 0); phi = 0.0
        else:
            u = (ph - duty) / (1 - duty)
            G = x0 + V(-stance / 2 + stance * ss(u), 0, lift[leg[1]] * math.sin(math.pi * u) ** .8); phi = flip[leg[1]] * math.sin(math.pi * min(1, u * 1.15))
        feet[leg] = (G, phi)
    return feet


def sway(t, T, amp, ph=0.0): return amp * math.sin(2 * math.pi * t / T + ph)


def idle(t):
    P = neutral(); T = 2.4
    P['body'] = {'dz': sway(t, T, .012), 'dy': sway(t, 2 * T, .015), 'roll': sway(t, 2 * T, .8)}
    P['spine'] = [(sway(t, T, .5), 0)] * 3
    P['neck'] = [(sway(t, T, 2.5, .6), sway(t, 2 * T, 4)), (sway(t, T, 1.5, .9), sway(t, 2 * T, 3)), (0, 0)]
    P['tail'] = [(-4, sway(t, T, 7, -.4 * i)) for i in range(4)]
    return P


def walk(t):
    T = 1.0; v = TM['speed']; P = neutral()
    P['feet'] = gait(t, T, v, {'LH': 0, 'LF': .25, 'RH': .5, 'RF': .75}, .58, {'F': .26, 'H': .2}, {'F': 75, 'H': 55})
    P['body'] = {'dz': -.09 + .025 * math.cos(4 * math.pi * t / T), 'pitch': sway(t, T / 2, 1.2), 'roll': sway(t, T, 1.8), 'yaw': sway(t, T, 1.5)}
    P['spine'] = [(0, sway(t, T, 1.5)), (0, sway(t, T, 1.5, .3)), (0, 0)]
    P['neck'] = [(sway(t, T / 2, 4, .7), sway(t, T, 3)), (sway(t, T / 2, 2.5, 1.0), 0), (0, 0)]
    P['tail'] = [(-6, sway(t, T, 9, -.5 * i)) for i in range(4)]
    return P


def gallop(t):
    T = .45; v = TM['charge_speed']; P = neutral()
    P['feet'] = gait(t, T, v, {'RH': 0, 'LH': .1, 'RF': .38, 'LF': .5}, .22, {'F': .5, 'H': .42}, {'F': 110, 'H': 80})
    P['body'] = {'dz': -.15 + .07 * math.sin(2 * math.pi * t / T - 1.2), 'pitch': -4 + 6 * math.sin(2 * math.pi * t / T + .3), 'pivot': (-.2, 0, 1.5)}
    P['spine'] = [(sway(t, T, 3, .8), 0), (sway(t, T, 2.5, 1.0), 0), (0, 0)]
    P['neck'] = [(-14 + sway(t, T, 7, 1.4), 0), (-6 + sway(t, T, 4, 1.7), 0), (8, 0)]
    P['tail'] = [(-38 + sway(t, T, 8, -.6 * i), sway(t, T / 2, 6, i)) for i in range(4)]
    return P


def kick(t):
    w = TM['kick']; P = idle(t); P['feet'] = neutral()['feet']
    g_ = ramp(t, 0, w * .75)                      # gather
    k_ = ramp(t, w - .18, w)                      # strike, fully out at the impact frame
    back = 1 - ramp(t, w + .12, w + .6)           # return
    P['body'] = {'pitch': lerp(-5 * g_, -20, k_) * back, 'dz': -.06 * g_ * back, 'pivot': (.7, 0, 1.4)}
    P['neck'] = [((-16 * g_ - 6 * k_) * back, 0), (-6 * g_ * back, 0), (0, 0)]
    P['spine'] = [(-3 * k_ * back, 0)] * 3
    P['tail'] = [((-10 - 30 * k_) * back, sway(t, .5, 6, i)) for i in range(4)]
    for leg in ('LH', 'RH'):
        tuck = TOE[leg] + V(.25, 0, .18) * g_ * (1 - k_)
        out = TOE[leg] + V(-1.55, 0, .85)
        G = lerp(tuck, out, k_)
        G = lerp(TOE[leg], G, back)
        P['feet'][leg] = (G, lerp(0, -60, k_) * back + 40 * g_ * (1 - k_) * back)
    return P


def rear(t, up_t, hold_t, down_t, pitch=38, slam=True):
    """Rearing on the hind legs: rise until up_t, paw while holding, front hooves down at down_t."""
    P = idle(t)
    rise = ramp(t, 0, up_t) * (1 - ramp(t, hold_t, down_t))
    settle = ramp(t, down_t, down_t + .45)
    P['body'] = {'pitch': pitch * rise - (3 * (1 - settle) * ramp(t, down_t - .05, down_t) if slam else 0),
                 'dz': -.04 * rise - (.07 * (1 - settle) * ramp(t, down_t - .08, down_t) if slam else 0), 'pivot': (-.95, 0, 1.45)}
    P['neck'] = [(10 * rise, sway(t, .9, 6 * rise)), (8 * rise, 0), (-6 * rise, 0)]
    P['tail'] = [(-6 - 12 * rise, sway(t, .7, 8, -.5 * i)) for i in range(4)]
    B = body_matrix(P['body'])
    for leg in ('LF', 'RF'):
        paw = .12 * math.sin(2 * math.pi * (t - (0 if leg == 'LF' else .22)) / .7) * rise
        fold = B @ (TOE[leg] + V(.42 + paw, 0, .62 + paw))           # knees folded, hooves pawing in the air
        land = TOE[leg] + V(.3 if slam else 0, 0, 0)
        k = ramp(t, hold_t, down_t)
        G = lerp(fold, land, k)
        G = lerp(TOE[leg], G, ramp(t, 0, up_t * .6))
        if t > down_t: G = lerp(land, TOE[leg], settle)
        P['feet'][leg] = (G, lerp(70 * rise, 0, k))
    for leg in ('LH', 'RH'):
        P['feet'][leg] = (TOE[leg] + V(.18 * rise, 0, 0), 0.0)
    return P


def stomp(t):
    w = TM['stomp']; return rear(t, w * .55, w * .78, w)


def basic(t):
    """Basic attack (patada): weight back on the hind legs, right front hoof raised, struck forward onto the
    ground at the end of the warning, then set back. A short, low version of the rear, so it reads apart from the stomp."""
    w, h = TM['basic'], TM['basic_hit']; P = idle(t)
    up = ramp(t, 0, w * .7); hit = ramp(t, w - .14, w); back = ramp(t, w + .12, w + h)
    lift = up * (1 - hit)
    P['body'] = {'pitch': 9 * lift - 3 * hit * (1 - back), 'dz': -.03 * up * (1 - back), 'pivot': (-.95, 0, 1.45)}
    P['neck'] = [((6 * lift - 10 * hit) * (1 - back), 0), (4 * lift * (1 - back), 0), (0, 0)]
    P['tail'] = [(-6 - 8 * lift, sway(t, .6, 7, -.5 * i)) for i in range(4)]
    raised = TOE['RF'] + V(.22, 0, .48); struck = TOE['RF'] + V(.55, 0, 0)
    G = lerp(lerp(TOE['RF'], raised, up), struck, hit); G = lerp(G, TOE['RF'], back)
    P['feet']['RF'] = (G, (55 * lift) * (1 - back))
    return P


def awaken(t):
    w = TM['awaken']; return rear(t, .9, w * .62, w * .8, pitch=42)


def charge_warn(t):
    w = TM['charge']; P = idle(t); P['feet'] = neutral()['feet']
    low_ = ramp(t, 0, .5)
    P['body'] = {'pitch': -3 * low_, 'dz': -.07 * low_, 'pivot': (-.95, 0, 1.4), 'dx': -.06 * low_}
    P['neck'] = [(-22 * low_, 0), (-8 * low_, 0), (6 * low_, 0)]
    P['tail'] = [(-12 * low_ + sway(t, .35, 10 * ramp(t, w - .5, w)), sway(t, .6, 8, i)) for i in range(4)]
    for t0 in (.15, .7):   # paws the ground twice with the right front hoof
        u = (t - t0) / .45
        if 0 <= u <= 1:
            P['feet']['RF'] = (TOE['RF'] + V(.3 - .65 * ss(u), 0, .28 * math.sin(math.pi * u)), 60 * math.sin(math.pi * u))
    if t > w - .4:   # tension before the run
        P['body']['dz'] -= .01 * math.sin(2 * math.pi * t / .08)
    return P


def charge_end(t):
    P = idle(t); P['feet'] = neutral()['feet']
    brake = bump(t, 0, .15, .35, .7)
    P['body'] = {'pitch': 9 * brake, 'dz': -.1 * brake, 'pivot': (-.9, 0, 1.4)}
    P['neck'] = [(12 * brake, 0), (4 * brake, 0), (0, 0)]
    for leg in ('LH', 'RH'): P['feet'][leg] = (TOE[leg] + V(.35 * brake, 0, 0), 0.0)
    for leg in ('LF', 'RF'): P['feet'][leg] = (TOE[leg] + V(.25 * brake, 0, 0), -15 * brake)
    return P


def cast(t):
    T = 1.6; P = idle(t)
    for leg, off in (('LF', 0), ('RF', .5)):   # stamping in place
        u = ((t / T - off) % 1.0) / .35
        if u < 1: P['feet'][leg] = (TOE[leg] + V(.05, 0, .32 * math.sin(math.pi * u)), 55 * math.sin(math.pi * u))
    P['body'] = {'pitch': 4 + sway(t, T / 2, 1.5), 'dz': sway(t, T / 2, .02), 'pivot': (.75, 0, 1.45)}
    P['neck'] = [(14 + sway(t, T, 4), sway(t, T, 5)), (8, 0), (sway(t, T / 2, 4), 0)]
    return P


def stagger(t):
    T = 1.0; P = idle(t)
    P['body'] = {'roll': sway(t, T, 5), 'dz': -.05 + sway(t, T / 2, .015), 'yaw': sway(t, T, 3)}
    P['neck'] = [(-8, sway(t, T / 2, 12)), (-4, sway(t, T / 2, 8, .4)), (0, 0)]
    P['tail'] = [(-2, sway(t, T, 14, -.5 * i)) for i in range(4)]
    return P


def recover(t):
    T = 2.0; P = idle(t)
    P['body'] = {'dz': -.04 + sway(t, T / 2, .03), 'pitch': -2}
    P['neck'] = [(-18 + sway(t, T / 2, 2), sway(t, T, 3)), (-8, 0), (0, 0)]
    P['tail'] = [(4, sway(t, T, 4, -.4 * i)) for i in range(4)]
    return P


def dormant(t):
    T = 2.0; P = idle(t)
    P['body'] = {'dz': -.05 + sway(t, T, .008), 'pitch': -2}
    P['neck'] = [(-26, 0), (-12, 0), (0, 0)]
    P['tail'] = [(6, sway(t, T, 3, -.4 * i)) for i in range(4)]
    return P


def dead(t):
    P = idle(0)
    kneel = ramp(t, 0, .7); lie = ramp(t, .8, 1.7)
    P['body'] = {'pitch': -10 * kneel * (1 - lie), 'roll': 84 * lie, 'dz': -.7 * kneel + .0 * lie, 'pivot': (-.2, 0, 1.25)}
    B = body_matrix(P['body'])
    for leg in LEGS:   # front knees buckle, then the body rolls onto its flank with the legs limp
        knelt = lerp(TOE[leg], B @ (TOE[leg] + V(.35, 0, .55)), kneel) if leg[1] == 'F' else TOE[leg]
        limp = B @ (TOE[leg] + V(.15 if leg[1] == 'F' else -.15, 0, .15))
        G = lerp(knelt, limp, lie); G.z = max(G.z, .05 * lie)
        P['feet'][leg] = (G, 50 * kneel * (1 - lie) if leg[1] == 'F' else 0.0)
    P['neck'] = [(-10 * kneel + 6 * lie, -14 * lie), (-6 * lie, -10 * lie), (0, 0)]
    P['tail'] = [(10 * lie, 0) for _ in range(4)]
    return P


DELAY = {'spine': .03, 'neck': [.06, .09, .12], 'tail': [.08, .14, .2, .26]}


def lagged(fn, T, loop):
    def sample(t):
        at = lambda dt: fn((t - dt) % T if loop else max(0.0, t - dt))
        P = fn(t); P['spine'] = at(DELAY['spine'])['spine']
        P['neck'] = [at(d)['neck'][k] for k, d in enumerate(DELAY['neck'])]
        P['tail'] = [at(d)['tail'][k] for k, d in enumerate(DELAY['tail'])]
        return P
    return sample


CLIPS = [('idle', idle, 2.4, True), ('walk', walk, 1.0, True), ('gallop', gallop, .45, True), ('dormant', dormant, 2.0, True),
         ('cast', cast, 1.6, True), ('stagger', stagger, 1.0, True), ('recover', recover, 2.0, True),
         ('chargeWarn', charge_warn, TM['charge'], False), ('chargeEnd', charge_end, .7, False),
         ('dead', dead, 2.4, False), ('awaken', awaken, TM['awaken'], False)]
TAKES = [(('kickWarn', 0, TM['kick']), ('kickHit', TM['kick'], TM['kick'] + .6), kick),
         (('stompWarn', 0, TM['stomp']), ('stompHit', TM['stomp'], TM['stomp'] + .7), stomp),
         (('basicWarn', 0, TM['basic']), ('basicHit', TM['basic'], TM['basic'] + TM['basic_hit']), basic)]

for b in rig.pose.bones: b.rotation_mode = 'QUATERNION'
rig.animation_data_create()
report = {'timings': TM, 'clips': {}}


def key_clip(name, sample, t0, t1, loop):
    act = bpy.data.actions.new(name); act.use_fake_user = True; act['fps'] = FPS
    rig.animation_data.action = act; prev = {}; err = {}; minz = 9.0
    n = round((t1 - t0) * FPS)
    for f in range(0, n + 1):
        t = t0 + f / FPS
        if loop and f == n: t = t0          # loops close exactly
        pose, e = pose_of(sample(t))
        for k_, v_ in e.items(): err[k_] = max(err.get(k_, 0.0), v_)
        for nme in ORDER:
            Pb = R4 @ pose[nme]; Lb = R4 @ LB[nme]
            par = PARENT[nme]
            m = Lb.inverted() @ Pb if par is None else Lb.inverted() @ (R4 @ LB[par]) @ (R4 @ pose[par]).inverted() @ Pb
            q = m.to_quaternion()
            if nme in prev and prev[nme].dot(q) < 0: q = -q
            prev[nme] = q.copy(); pb = rig.pose.bones[nme]; pb.location = m.to_translation(); pb.rotation_quaternion = q
            pb.keyframe_insert('location', frame=f); pb.keyframe_insert('rotation_quaternion', frame=f)
        minz = min(minz, min((pose[LEGS[l]['chain'][3]] @ V(0, length[LEGS[l]['chain'][3]], 0)).z for l in LEGS))
    act.use_frame_range = True; act.frame_start = 0; act.frame_end = n
    rig.animation_data.action = None
    report['clips'][name] = {'duration': round(t1 - t0, 3), 'loop': loop, 'planted_slip_m': {k_: round(v_, 3) for k_, v_ in err.items() if v_ > .005}, 'min_toe_z': round(minz, 3)}
    print('MULA_CLIP', name, json.dumps(report['clips'][name]), flush=True)
    return act


for name, fn, T, loop in CLIPS:
    key_clip(name, lagged(fn, T, loop), 0, T, loop)
for c1, c2, fn in TAKES:
    s = lagged(fn, c2[2], False)
    key_clip(c1[0], s, c1[1], c1[2], False); key_clip(c2[0], s, c2[1], c2[2], False)
key_clip('apose', lambda t: neutral(), 0, .1, False)
for b in rig.pose.bones: b.matrix_basis = Matrix.Identity(4)
sc.frame_set(1); sc.frame_set(0)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'stage-rig.blend'))

# ----------------------------------------------------------------------------- renders (side view strips)
if RENDERS:
    fd = OUT / 'frames'; fd.mkdir(exist_ok=True)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3.2
    sun.rotation_euler = (D(50), 0, D(-30))
    sc.world = bpy.data.worlds.new('Studio'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .8, .84, 1)
    sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.resolution_x, sc.render.resolution_y = 560, 420
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 5.4
    cam.location = (12, -.2, 1.6); cam.rotation_euler = (V(0, -.2, 1.6) - V(12, -.2, 1.6)).to_track_quat('-Z', 'Y').to_euler()   # the left flank
    for act in [x for x in bpy.data.actions if x.name in report['clips']]:
        rig.animation_data.action = act; n = int(act.frame_end)
        for i in range(6):
            f = round(n * i / 5); sc.frame_set(f + 1); sc.frame_set(f)
            sc.render.filepath = str(fd / f'{act.name}-{i}.png'); bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None
    bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)

# ----------------------------------------------------------------------------- export
web = ROOT / 'web' / 'assets'; ed = CDIR / 'export'; ed.mkdir(exist_ok=True)
toon = list(me.materials); img = next(nd for nd in toon[0].node_tree.nodes if nd.type == 'TEX_IMAGE').image
m = bpy.data.materials.new(o.name + '_gltf'); m.use_nodes = True
bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 1; bsdf.inputs['Specular IOR Level'].default_value = 0
t_ = m.node_tree.nodes.new('ShaderNodeTexImage'); t_.image = img; m.node_tree.links.new(t_.outputs[0], bsdf.inputs['Base Color'])
me.materials.clear(); me.materials.append(m)
sol = o.modifiers.get('Silhouette'); sol_vis = (sol.show_viewport, sol.show_render) if sol else None
if sol: sol.show_viewport = sol.show_render = False
for x in sc.objects: x.select_set(x in (o, rig))
bpy.context.view_layer.objects.active = rig
glb = ed / f'{NAME}.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                          export_animations=True, export_animation_mode='ACTIONS', export_vertex_color='ACTIVE', export_skins=True)
me.materials.clear()
for x in toon: me.materials.append(x)
if sol: sol.show_viewport, sol.show_render = sol_vis
report.update({'glb': str(glb), 'bones': len(ORDER), 'triangles': sum(len(p.vertices) - 2 for p in me.polygons), 'heat_failed_vertices': heat_failed})
(OUT / 'rig-report.json').write_text(json.dumps(report, indent=1))
print('MULA_DONE', json.dumps({k: report[k] for k in ('glb', 'bones', 'triangles')}))
