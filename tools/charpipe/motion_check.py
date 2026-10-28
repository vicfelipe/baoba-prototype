"""Validation step, motion half: what the character does in every clip, every 2nd frame.
  blender -b SourceArt/<Char>/build/stage-look.blend --python tools/charpipe/motion_check.py -- <out.json> [character.json]
Run by validate.py (with the static reference review, the GLB checks and the video).

| check          | measure                                                                  | limit   |
| twist          | joint_twist.py: local twist per joint (reference pose untwisted)         | per joint |
| arm_clearance  | arm axis (upper arm past the shoulder, forearm, hand) inside the torso,   | 2.5 cm  |
|                | in the rest space of the torso bone at its height (rest cross-sections)   |         |
| ground         | lowest skinned vertex below the floor                                    | 2 cm    |
| flaps_thighs   | Skirt*-weighted vertices inside the posed thigh capsules                 | 2.5 cm  |
| stretch        | edge length posed/rest per deforming mesh, edges >= 3 mm (0.5/99.5 pct) | 0.3-2.0 |
Silhouette lines (Solidify) are switched off while measuring; rigid meshes (one bone) are skipped by stretch.
build.validation.stretch_ignore in the sheet lists boxes left out of stretch, each with its reason (reported).
"""
import bpy, sys, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import joint_twist

LIM = {'arm_clearance_cm': 2.5, 'ground_cm': 2.0, 'flaps_thighs_cm': 2.5, 'stretch': [.3, 2.0]}   # .3: inner knee/finger creases
TORSO = ('Waist', 'Chest1', 'Chest2')
ARM_R = {'UpperArm': .045, 'ForeArm': .04, 'Hand': .03}
sc = bpy.context.scene
rig = next(o for o in sc.objects if o.type == 'ARMATURE' and 'L_Hand' in o.pose.bones)
meshes = [o for o in sc.objects if o.type == 'MESH' and o.parent == rig]
for o in meshes:
    for m in o.modifiers:
        if m.type == 'SOLIDIFY': m.show_viewport = False
bones = set(rig.data.bones.keys())


def dominant(o):
    names = {g.index: g.name for g in o.vertex_groups}
    out = []
    for v in o.data.vertices:
        g = max((g for g in v.groups if names[g.group] in bones), key=lambda g: g.weight, default=None)
        out.append(names[g.group] if g else '')
    return out


# Rest torso cross-sections (2 cm slices, 36 angular radii) from the torso-weighted body vertices.
body = next(o for o in meshes if o.name.endswith('_Body_000') or o.name.endswith('_Full_000'))
dom_b = dominant(body)
T = np.array([body.matrix_world @ v.co for v, d in zip(body.data.vertices, dom_b) if d in TORSO])
NA = 36; SEC = {}
for z in np.arange(T[:, 2].min(), T[:, 2].max(), .02):
    s = T[(T[:, 2] >= z) & (T[:, 2] < z + .02)]
    if len(s) < 8: continue
    c = s[:, :2].mean(0); ang = np.arctan2(s[:, 1] - c[1], s[:, 0] - c[0]); r = np.hypot(s[:, 0] - c[0], s[:, 1] - c[1])
    tab = np.array([r[np.abs((ang - (k * 2 * math.pi / NA - math.pi) + math.pi) % (2 * math.pi) - math.pi) < math.pi / NA * 1.5].max(initial=0) for k in range(NA)])
    SEC[round(float(z), 2)] = (c, tab)
KEYS = np.array(sorted(SEC))
TZ = {b: (rig.data.bones[b].head_local.z, rig.data.bones[b].tail_local.z) for b in TORSO if b in bones}


def inside_torso(p):
    k = KEYS[np.argmin(abs(KEYS - p.z))]
    if abs(k - p.z) > .03: return -1
    c, tab = SEC[k]; ang = math.atan2(p.y - c[1], p.x - c[0])
    return tab[int((ang + math.pi) / (2 * math.pi) * NA) % NA] - math.hypot(p.x - c[0], p.y - c[1])


def arm_clearance():
    worst = (0., '', 0)
    for S in 'LR':
        for b, rad in ARM_R.items():
            pb = rig.pose.bones[f'{S}_{b}']
            for t in np.linspace(0, 1, 6):
                if b == 'UpperArm' and t < .45: continue      # the shoulder joint itself
                q = pb.head + (pb.tail - pb.head) * t
                for tb, (z0, z1) in TZ.items():                 # seen from the torso bone spanning its height
                    rest = rig.data.bones[tb].matrix_local @ rig.pose.bones[tb].matrix.inverted() @ q
                    if z0 - .02 <= rest.z <= z1 + .02:
                        d = inside_torso(rest) + rad
                        if d > worst[0]: worst = (d, f'{S}_{b}', 0)
    return worst


# Flap vertices and thigh capsule radii (rest leg mesh around the thigh bone).
sup = [(o, [i for i, d in enumerate(dominant(o)) if d.startswith('Skirt')]) for o in meshes]
sup = [(o, ix) for o, ix in sup if ix]
leg = next((o for o in meshes if o.name.endswith('_Leg_000')), None)


def seg(q, a, b):
    ab = b - a; t = max(0, min(1, (q - a).dot(ab) / max(1e-9, ab.length_squared))); return (q - (a + ab * t)).length


RAD = {}
if leg:
    for S in 'LR':
        bn = rig.data.bones[f'{S}_Thigh']; ds = sorted(seg(leg.matrix_world @ v.co, bn.head_local, bn.tail_local) for v in leg.data.vertices
                                                     if (v.co.x > 0) == (S == 'L') and bn.tail_local.z + .05 < v.co.z < bn.head_local.z - .08)
        RAD[S] = ds[int(len(ds) * .5)] if ds else .08
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VCFG = json.loads(Path(ARGS[1]).read_text(encoding='utf-8')).get('build', {}).get('validation', {}) if len(ARGS) > 1 else {}
IGNORE = VCFG.get('stretch_ignore', [])
rest_edges = {}
for o in meshes:
    e = np.array([ed.vertices[:] for ed in o.data.edges]); v = np.array([x.co for x in o.data.vertices])
    rigid = sum(1 for x in o.data.vertices if sum(1 for g in x.groups if o.vertex_groups[g.group].name in bones and g.weight > .01) > 1) < .1 * len(o.data.vertices)
    l0 = np.linalg.norm(v[e[:, 0]] - v[e[:, 1]], axis=1); keep = l0 > .003   # remesh slivers: tiny edges, huge ratios
    for box in IGNORE:
        if o.name.split('_')[-2] == box['mesh']:
            m = (v[:, 0] >= box['x'][0]) & (v[:, 0] <= box['x'][1]) & (v[:, 2] >= box['z'][0]) & (v[:, 2] <= box['z'][1])
            keep &= ~(m[e[:, 0]] & m[e[:, 1]])
    if not rigid: rest_edges[o.name] = (e[keep], l0[keep])

res = {}
for clip in joint_twist.clips():
    act = bpy.data.actions[clip]; rig.animation_data.action = act; f0, f1 = (int(x) for x in act.frame_range)
    r = {'arm_clearance_cm': [0, '', 0], 'ground_cm': [0, '', 0], 'flaps_thighs_cm': [0, '', 0], 'stretch': {}}
    for f in range(f0, f1 + 1, 2):
        sc.frame_set(f + 1); sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
        d, b, _ = arm_clearance()
        if d * 100 > r['arm_clearance_cm'][0]: r['arm_clearance_cm'] = [round(d * 100, 1), b, f]
        caps = {S: (rig.pose.bones[f'{S}_Thigh'].head, rig.pose.bones[f'{S}_Thigh'].tail) for S in RAD}
        for o in meshes:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); V = np.empty((len(me.vertices), 3)); me.vertices.foreach_get('co', V.ravel())
            assert len(V) == len(o.data.vertices), f'{o.name}: modifiers change the vertex count'
            Vw = V @ np.array(o.matrix_world)[:3, :3].T + np.array(o.matrix_world)[:3, 3]
            low = -Vw[:, 2].min() * 100
            if low > r['ground_cm'][0]: r['ground_cm'] = [round(low, 1), o.name, f]
            if o.name in rest_edges:
                e, l0 = rest_edges[o.name]; k = np.linalg.norm(V[e[:, 0]] - V[e[:, 1]], axis=1) / np.maximum(l0, 1e-6)
                lo, hi = np.percentile(k, .5), np.percentile(k, 99.5)
                w = r['stretch'].setdefault(o.name, [1., 1., f])
                if lo < w[0]: w[0], w[2] = round(float(lo), 2), f
                if hi > w[1]: w[1], w[2] = round(float(hi), 2), f
            for so, ix in sup:
                if so is not o: continue
                for i in ix[::3]:
                    q = Vector(Vw[i])
                    for S, (a, b_) in caps.items():
                        dd = (RAD[S] - seg(q, a, b_)) * 100
                        if dd > r['flaps_thighs_cm'][0]: r['flaps_thighs_cm'] = [round(dd, 1), f'{S}_Thigh', f]
            ev.to_mesh_clear()
    res[clip] = r
    print(f'MOTION {clip:9s} arm {r["arm_clearance_cm"][0]:5.1f}cm  ground {r["ground_cm"][0]:4.1f}cm {r["ground_cm"][1]}  flaps {r["flaps_thighs_cm"][0]:4.1f}cm  '
          'stretch ' + ' '.join(f'{n.split("_")[-2]} {w[0]:.2f}-{w[1]:.2f}' for n, w in r['stretch'].items()), flush=True)
rig.animation_data.action = None
tw = joint_twist.measure(rig)
fails = list(tw['fails'])
for clip, r in res.items():
    if clip == 'apose': continue
    if r['arm_clearance_cm'][0] > LIM['arm_clearance_cm']: fails.append(f'{clip}:arm {r["arm_clearance_cm"][0]}cm {r["arm_clearance_cm"][1]} f{r["arm_clearance_cm"][2]}')
    if r['ground_cm'][0] > LIM['ground_cm']: fails.append(f'{clip}:ground {r["ground_cm"][0]}cm {r["ground_cm"][1]} f{r["ground_cm"][2]}')
    if r['flaps_thighs_cm'][0] > LIM['flaps_thighs_cm']: fails.append(f'{clip}:flaps {r["flaps_thighs_cm"][0]}cm f{r["flaps_thighs_cm"][2]}')
    for n, (lo, hi, f) in r['stretch'].items():
        if lo < LIM['stretch'][0] or hi > LIM['stretch'][1]: fails.append(f'{clip}:stretch {n} {lo}-{hi} f{f}')
out = {'pass': not fails, 'fails': fails, 'limits': LIM, 'stretch_ignore': IGNORE, 'clips': res, 'twist': tw}
a = ARGS
if a:
    Path(a[0]).parent.mkdir(parents=True, exist_ok=True); Path(a[0]).write_text(json.dumps(out, indent=1, default=float))
print('MOTION_CHECK', 'PASS' if not fails else 'FAIL ' + '; '.join(fails[:14]) + (' ...' if len(fails) > 14 else ''))
