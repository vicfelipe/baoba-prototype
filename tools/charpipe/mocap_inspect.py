"""Inspect Mixamo FBX takes: duration, root travel, per-foot peak height/extension and its time.

  blender -b --python tools/charpipe/mocap_inspect.py -- <file.fbx> [<file.fbx> ...]
"""
import bpy, sys, json

for path in sys.argv[sys.argv.index('--') + 1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    sc = bpy.context.scene; arm = next(o for o in sc.objects if o.type == 'ARMATURE'); act = arm.animation_data.action
    f0, f1 = (int(x) for x in act.frame_range); fps = sc.render.fps / sc.render.fps_base
    pre = 'mixamorig:'
    pb = lambda n: arm.pose.bones[pre + n]
    rows = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        hips = arm.matrix_world @ pb('Hips').head
        feet = {S: arm.matrix_world @ pb(f'{S}Foot').head for S in ('Left', 'Right')}
        hands = {S: arm.matrix_world @ pb(f'{S}Hand').head for S in ('Left', 'Right')}
        rows.append((f, hips, feet, hands))
    info = {'file': path.split('\\')[-1].split('/')[-1], 'frames': [f0, f1], 'fps': fps, 'seconds': round((f1 - f0) / fps, 3),
            'hips_start': [round(x, 2) for x in rows[0][1]], 'hips_end': [round(x, 2) for x in rows[-1][1]],
            'hips_min_z': round(min(r[1].z for r in rows), 3)}
    for S in ('Left', 'Right'):
        best = max(rows, key=lambda r: r[2][S].z)
        info[f'{S}_foot_peak'] = {'z': round(best[2][S].z, 3), 't': round((best[0] - f0) / fps, 3),
                                  'reach_from_hips': round((best[2][S] - best[1]).length, 3)}
    info['hands_min_z'] = round(min(min(r[3]['Left'].z, r[3]['Right'].z) for r in rows), 3)
    yaw = []
    for f in (f0, (f0 + f1) // 2, f1):
        sc.frame_set(f); m = (arm.matrix_world @ pb('Hips').matrix).to_3x3().normalized(); yaw.append([round(x, 2) for x in m.col[2]])
    info['hips_up_axis_start_mid_end'] = yaw
    print('MOCAP_INFO', json.dumps(info))
