"""Render a clip as a filmstrip (review aid for motion and deformation).

  blender -b <stage-look.blend> --python tools/charpipe/filmstrip.py -- <clip> <t0,t1,...> <out.png> [--cam x,y,z] [--target x,y,z] [--lens 50]

Times are seconds. Also traces the kicking feet: the ankle path of both feet over the whole
clip is drawn as dots on the last frame (red = right, blue = left).
"""
import bpy, sys
import numpy as np
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
clip, times, out = a[0], [float(t) for t in a[1].split(',')], a[2]
out = str(__import__('pathlib').Path(out).resolve())
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
cam_pos = Vector(map(float, opt('--cam', '2.6,-4.0,1.5').split(','))); target = Vector(map(float, opt('--target', '0,0,0.85').split(',')))
sc = bpy.context.scene; fps = sc.render.fps
rig = next(o for o in sc.objects if o.type == 'ARMATURE')
rig.animation_data.action = bpy.data.actions[clip]
cam = sc.camera or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
if cam.name not in sc.collection.objects and not cam.users_collection:
    sc.collection.objects.link(cam)
sc.camera = cam; cam.data.type = 'PERSP'; cam.data.lens = float(opt('--lens', 50))
cam.location = cam_pos; cam.rotation_euler = (target - cam_pos).to_track_quat('-Z', 'Y').to_euler()
sc.render.resolution_x, sc.render.resolution_y = 520, 700; sc.render.film_transparent = False
frames = []
tmp = Path = __import__('pathlib').Path
for i, t in enumerate(times):
    f = round(t * fps); sc.frame_set(f + 1); sc.frame_set(f)
    p = tmp(out).with_name(f'_strip_{i}.png'); sc.render.filepath = str(p); bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(str(p)); w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    frames.append(px.reshape(h, w, 4)); bpy.data.images.remove(im); p.unlink()
# ankle paths
act = bpy.data.actions[clip]; end = round(act.frame_end)
paths = {'R_Foot': [], 'L_Foot': []}
for f in range(0, end + 1, 2):
    sc.frame_set(f)
    for n in paths:
        paths[n].append(rig.matrix_world @ rig.pose.bones[n].head)
strip = np.concatenate(frames, 1)
import bpy_extras.object_utils as ou
last = frames[-1].copy()
for n, col in (('R_Foot', (1, .1, .1, 1)), ('L_Foot', (.1, .3, 1, 1))):
    for p3 in paths[n]:
        co = ou.world_to_camera_view(sc, cam, p3); x = int(co.x * w); y = int(co.y * h)
        if 2 <= x < w - 2 and 2 <= y < h - 2:
            last[y - 2:y + 3, x - 2:x + 3] = col
strip = np.concatenate(frames + [last], 1)
im = bpy.data.images.new('strip', strip.shape[1], strip.shape[0]); im.pixels.foreach_set(strip.ravel())
im.filepath_raw = out; im.file_format = 'PNG'; im.save()
lo = {n: [round(min(p.z for p in v), 3), round(max(p.z for p in v), 3)] for n, v in paths.items()}
print('STRIP', clip, 'ankle z range', lo)
