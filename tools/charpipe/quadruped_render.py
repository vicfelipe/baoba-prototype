"""Render a quadruped in the views of its references (side_left, front, ...) framed on its bounding box,
plus a matching alpha mask for silhouette comparison (quadruped_compare.py).

  blender -b <model.blend> --python tools/charpipe/quadruped_render.py -- <out dir> [--size 1168x784] [--toon]

Frame from import_generated.py: Z up, soles at z=0, body along X. The head end is the end that holds the
highest vertices (the flame of the Mula); side_left looks at the animal's left flank with the head on the
image left, as in the user's side picture. Writes <view>.png (lit) and <view>-mask.png (alpha) per view.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
out = Path(a[0]).resolve(); out.mkdir(parents=True, exist_ok=True)
W, Hh = (int(v) for v in (a[a.index('--size') + 1] if '--size' in a else '1168x784').split('x'))
o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
co = np.array([v.co[:] for v in o.data.vertices]); co = co @ np.array(o.matrix_world.to_3x3()).T + np.array(o.matrix_world.translation)
lo, hi = co.min(0), co.max(0); ctr = (lo + hi) / 2
top = co[co[:, 2] > hi[2] - 0.1 * (hi[2] - lo[2])]
fwd = Vector((1 if top[:, 0].mean() > ctr[0] else -1, 0, 0))
up = Vector((0, 0, 1)); left = up.cross(fwd)
views = {'side_left': left, 'side_right': -left, 'front': fwd, 'back': -fwd,
         'threequarter': (fwd * .8 + left + up * .45), 'game': (left * .25 + fwd * .1 + up * 1.0)}

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .8, .84, 1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.2
sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 2.5
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'
sc.render.resolution_x, sc.render.resolution_y = W, Hh
t = Vector(ctr.tolist())
info = {'forward': list(fwd), 'size_m': (hi - lo).round(3).tolist(), 'views': {}}
for name, d in views.items():
    d = d.normalized(); cam.location = t + d * 12
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun.rotation_euler = (cam.location - t + Vector((0, 0, 6))).to_track_quat('Z', 'Y').to_euler()
    # ortho scale covers the projected box with a 10% margin, on the limiting image axis
    R = np.array(cam.rotation_euler.to_matrix())
    p = (co - ctr) @ R; ext = np.ptp(p[:, :2], axis=0)
    cam.data.ortho_scale = 1.2 * max(ext[0], ext[1] * W / Hh)
    sc.render.film_transparent = False; sc.render.filepath = str(out / f'{name}.png'); bpy.ops.render.render(write_still=True)
    sc.render.film_transparent = True; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = str(out / f'{name}-mask.png'); bpy.ops.render.render(write_still=True)
    sc.render.image_settings.color_mode = 'RGB'
    info['views'][name] = {'ortho_scale': round(cam.data.ortho_scale, 3)}
bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
(out / 'render.json').write_text(json.dumps(info, indent=1))
print('QUADRUPED_RENDER', json.dumps(info))
