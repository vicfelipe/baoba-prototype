"""Retarget Mixamo takes at their native speed onto a built rig and render filmstrips.

  blender -b <stage-look.blend> --python tools/charpipe/mocap_preview.py -- <out_dir> <file.fbx> [...] [--frames 10]

Each strip shows evenly spaced frames with time labels in the file name; prints, per frame,
hips height and both ankles' height and horizontal distance from the hips (to find the hit).
"""
import bpy, sys, json, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import clips
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
out = Path(a[0]); files = [x for x in a[1:] if x.endswith('.fbx') or '.blend#' in x]  # rig.blend#Action
nfr = int(a[a.index('--frames') + 1]) if '--frames' in a else 10
sc = bpy.context.scene
rig = next(o for o in sc.objects if o.type == 'ARMATURE')
ankles = {S: rig.data.bones[f'{S}_Calf'].tail_local.copy() for S in 'LR'}
for f in files:
    f, _, act_name = f.partition('#')
    name = 'prev_' + (act_name.split('|')[-1] if act_name else Path(f).stem.replace('mixamo-', ''))
    info = clips.bake_mixamo(rig, ankles, f, name, sway=1.0, loop=False, action=act_name or None)
    rig.animation_data.action = bpy.data.actions[name]
    dur = info['seconds']; fps = sc.render.fps
    rows = []
    for i in range(0, round(dur * fps) + 1, 5):
        sc.frame_set(i)
        h = rig.pose.bones['Base'].head
        r = {'t': round(i / fps, 2), 'hz': round(h.z, 2)}
        for S in 'LR':
            p = rig.pose.bones[f'{S}_Calf'].tail
            r[S] = (round(p.z, 2), round(math.hypot(p.x - h.x, p.y - h.y), 2))
        rows.append(r)
    print('TRACE', Path(f).stem, json.dumps(rows))
    times = ','.join(str(round(dur * k / (nfr - 1), 2)) for k in range(nfr))
    sys.argv = [sys.argv[0], '--', name, times, str(out / f'{name}.png'), '--cam', '3.6,-4.2,1.6', '--target', '0,0,0.8']
    exec(compile(open(Path(__file__).parent / 'filmstrip.py', encoding='utf-8').read(), 'filmstrip.py', 'exec'), {'__name__': '__main__'})
