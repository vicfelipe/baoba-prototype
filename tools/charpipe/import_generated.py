"""Bring a model made by an external generator (Hunyuan3D, TRELLIS, CharacterGen, ...) into the pipeline frame
so review.py can compare it with the references, and render inspection views.

  blender -b --python tools/charpipe/import_generated.py -- <model.glb> <character.json> <out.blend> [--yaw 180]

Frame: metres, Z up, soles at z=0, faces -Y (glTF +Z front), height = character.json height_m,
centred on the bounding box. --yaw turns the model about Z first (TRELLIS faces glTF -Z: --yaw 180; Hunyuan3D 2.1 already faces +Z). Renders <out dir>/renders/{front,back,left,right,threequarter,face}.png.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
a = sys.argv[sys.argv.index('--') + 1:]
src, cfg_path, out = Path(a[0]).resolve(), ROOT / a[1], Path(a[2]).resolve()
yaw = float(a[a.index('--yaw') + 1]) if '--yaw' in a else 0.0
H = json.loads(cfg_path.read_text(encoding='utf-8'))['height_m']
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version = 0
bpy.ops.import_scene.gltf(filepath=str(src))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for x in list(bpy.context.scene.objects):
    if x != o:
        bpy.data.objects.remove(x)
o.data.transform(Matrix.Rotation(math.radians(yaw), 4, 'Z'))
vs = [v.co for v in o.data.vertices]
lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
k = H / (hi.z - lo.z)
o.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))))
o.name = 'Generated'; o.data.update()
info = {'source': str(src), 'yaw_deg': yaw, 'vertices': len(o.data.vertices), 'triangles': sum(len(p.vertices) - 2 for p in o.data.polygons),
        'scale': round(k, 4), 'size_m': [round((hi[i] - lo[i]) * k, 3) for i in range(3)],
        'materials': [m.name for m in o.data.materials if m], 'images': [i.name for i in bpy.data.images if i.size[0]]}
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .8, .84, 1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.2
sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 2.5; sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
rd = out.parent / 'renders'; rd.mkdir(parents=True, exist_ok=True)
for name, d, target, scale in (('front', (0, -1, 0), H / 2, 2.2), ('back', (0, 1, 0), H / 2, 2.2), ('left', (1, 0, 0), H / 2, 2.2),
                               ('right', (-1, 0, 0), H / 2, 2.2), ('threequarter', (.7, -1, .35), H / 2, 2.2), ('face', (.25, -1, .05), H * .9, .55)):
    t = Vector((0, 0, target)); cam.location = t + Vector(d).normalized() * 8
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = (1300, 1000) if name in ('front', 'back') else (900, 1000)
    sc.render.filepath = str(rd / f'{name}.png'); bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
bpy.ops.wm.save_as_mainfile(filepath=str(out))
(out.parent / 'import.json').write_text(json.dumps(info, indent=1))
print('IMPORTED', json.dumps(info))
