"""Joint twist check: the local twist (about the bone's own axis, relative to its parent) of every
limb joint in every clip of a rigged stage file. Catches skins wrung at the wrist/ankle that
silhouette reviews cannot see (doc 21: a 180 deg IK roll hid in every Cangaceiro clip).
  blender -b SourceArt/<Char>/build/stage-look.blend --python tools/charpipe/joint_twist.py -- [out.json]
Also used by motion_check.py (measure()).

Limits (deg): the reference pose ('apose', or the rest pose when absent) must be untwisted; in
clips the twist stays within what an arm/leg can turn at that joint."""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector

REST_MAX = 3
LIMIT = {'UpperArm': 120, 'ForeArm': 100, 'Hand': 100, 'Thigh': 100, 'Calf': 30, 'Foot': 60}


def twist(pb):
    q = pb.matrix_basis.to_quaternion(); y = Vector((0, 1, 0))
    t = y.rotation_difference(q @ y).inverted() @ q
    d = math.degrees(t.angle) * (1 if t.axis.y >= 0 else -1)
    return (d + 180) % 360 - 180


def clips():
    return sorted(x.name for x in bpy.data.actions if '|' not in x.name)   # 'Authored|*' are control-rig actions


def measure(rig, step=2):
    """{'pass', 'fails', 'limits', 'clips': {clip: {joint: peak twist}}} over every clip."""
    sc = bpy.context.scene; joints = [f'{S}_{b}' for S in 'LR' for b in LIMIT if f'{S}_{b}' in rig.pose.bones]
    rig.animation_data_create(); report, fails = {}, []
    for clip in clips():
        act = bpy.data.actions[clip]; rig.animation_data.action = act; peak = {j: 0.0 for j in joints}
        f0, f1 = (int(x) for x in act.frame_range)
        for f in range(f0, f1 + 1, step):
            sc.frame_set(f + 1); sc.frame_set(f)
            for j in joints:
                v = twist(rig.pose.bones[j])
                if abs(v) > abs(peak[j]): peak[j] = v
        report[clip] = {j: round(v, 1) for j, v in peak.items()}
        for j, v in peak.items():
            lim = REST_MAX if clip == 'apose' else LIMIT[j[2:]]
            if abs(v) > lim: fails.append(f'{clip}:{j}={v:.0f}>{lim}')
    rig.animation_data.action = None
    return {'pass': not fails, 'fails': fails, 'limits': {'reference': REST_MAX, **LIMIT}, 'clips': report}


if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE' and 'L_Hand' in o.pose.bones)
    out = measure(rig)
    if a:
        Path(a[0]).parent.mkdir(parents=True, exist_ok=True); Path(a[0]).write_text(json.dumps(out, indent=1))
    for clip, r in out['clips'].items():
        print(f'  {clip:10s}', ' '.join(f'{j}:{v:5.0f}' for j, v in r.items()))
    f = out['fails']
    print('JOINT_TWIST', 'PASS' if not f else 'FAIL ' + ', '.join(f[:12]) + (' ...' if len(f) > 12 else ''))
