"""Adopt an externally made character mesh (artist file, other editor) into the pipeline.

  blender -b --python tools/charpipe/adopt.py -- SourceArt/<New>/character.json

character.json "adopt": {"file": <glb>, "object": <mesh name>, "calibration_from": <measure.json>}
- imports only that object, keeps its geometry, UVs and texture;
- normalises it to the pipeline frame (height_m, soles at z = 0, faces -Y, centred);
- saves the texture as build/textures/<Name>_Full_000.png and the object as slot "Full";
- renders flat silhouettes of the mesh with the reference calibrations into references/,
  so segment.py can measure the mesh itself (joints follow this body, not the drawings);
- saves build/stage-bake.blend: continue with build.py --stages rig,anim,look,export.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
cfg_path = ROOT / sys.argv[sys.argv.index('--') + 1]
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); cdir = cfg_path.parent; NAME = cfg['name']; H = cfg['height_m']
ad = cfg['adopt']; out = cdir / 'build'; (out / 'textures').mkdir(parents=True, exist_ok=True); (cdir / 'references').mkdir(exist_ok=True)
CAL = json.loads((cdir / ad['calibration_from']).read_text(encoding='utf-8'))['calibration']

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str((cdir / ad['file']).resolve()))
src = bpy.data.objects[ad['object']]
for o in list(bpy.context.scene.objects):
    if o is not src:
        bpy.data.objects.remove(o, do_unlink=True)
src.data.transform(src.matrix_world); src.matrix_world = Matrix.Identity(4); src.parent = None
if ad.get('rotz'):
    src.data.transform(Matrix.Rotation(math.radians(ad['rotz']), 4, 'Z'))
pts = [v.co for v in src.data.vertices]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
s = H / (hi.z - lo.z)
legs = [p for p in pts if p.z < lo.z + .35 * (hi.z - lo.z)]
cy = (min(p.y for p in legs) + max(p.y for p in legs)) / 2
src.data.transform(Matrix.Translation((-(lo.x + hi.x) / 2 * s, -cy * s, -lo.z * s)) @ Matrix.Scale(s, 4))
# Exporters split vertices at UV seams; bone-heat needs one connected surface. UVs live on
# loops, so welding coincident vertices keeps them.
import bmesh
bm = bmesh.new(); bm.from_mesh(src.data); n0 = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=ad.get('weld', 1e-4)); welded = n0 - len(bm.verts)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # generated meshes often carry inverted patches (the outline hull shows through)
bm.to_mesh(src.data); bm.free()
name = f'{NAME}_Full_000'; src.name = name; src.data.name = name
col = bpy.data.collections.new(NAME); bpy.context.scene.collection.children.link(col)
for c in src.users_collection:
    c.objects.unlink(src)
col.objects.link(src)
for p in src.data.polygons:
    p.use_smooth = True
# Texture: keep the artist's image, stored where the look/export stages expect it.
img = next(n.image for m in src.data.materials if m and m.node_tree for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
tex = out / 'textures' / f'{name}.png'
img.filepath_raw = str(tex); img.file_format = 'PNG'
try:
    img.save()
except RuntimeError:
    img.save_render(str(tex))
import numpy as np
sc0 = bpy.context.scene; sc0.render.engine = 'CYCLES'; sc0.cycles.samples = 1; sc0.cycles.device = 'CPU'
sc0.render.bake.margin_type = 'EXTEND'
src_img = bpy.data.images.load(str(tex)); src_img.colorspace_settings.name = 'Non-Color'
w_, h_ = src_img.size
bpy.ops.object.select_all(action='DESELECT'); src.select_set(True); bpy.context.view_layer.objects.active = src


def bake(kind, colour=None, margin=0):
    """Bake into a float image: 'COVER' (UV island mask), 'NORMAL' (object space) or 'TEX' (src_img copy)."""
    m = bpy.data.materials.new('bake_' + kind); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out_n = nt.nodes.new('ShaderNodeOutputMaterial')
    if kind == 'NORMAL':
        nt.links.new(nt.nodes.new('ShaderNodeBsdfDiffuse').outputs[0], out_n.inputs[0])
    else:
        em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(em.outputs[0], out_n.inputs[0])
        if kind == 'COVER':
            em.inputs[0].default_value = (1, 1, 1, 1)
        else:
            ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = src_img; ti.interpolation = 'Closest'; nt.links.new(ti.outputs[0], em.inputs[0])
    target = bpy.data.images.new('bake_' + kind, w_, h_, alpha=False, float_buffer=True); target.colorspace_settings.name = 'Non-Color'
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = target; nt.nodes.active = tn
    src.data.materials.clear(); src.data.materials.append(m)
    if kind == 'NORMAL':
        bpy.ops.object.bake(type='NORMAL', normal_space='OBJECT', margin=margin, use_clear=True)
    else:
        bpy.ops.object.bake(type='EMIT', margin=margin, use_clear=True)
    a = np.empty(w_ * h_ * 4, np.float32); target.pixels.foreach_get(a)
    return a.reshape(h_, w_, 4)


# 1) Generated textures leave surfaces the source pictures never showed (palms, undersides of the
#    arms) unpainted/black; they face the camera in capoeira poses. Fill only black texels whose
#    surface points down in the T-pose (dark details facing the views - goatee, pupils - stay).
cover = bake('COVER')[..., 0] > .5
nz = bake('NORMAL')[..., 2] * 2 - 1
T = np.empty(w_ * h_ * 4, np.float32); src_img.pixels.foreach_get(T); T = T.reshape(h_, w_, 4)
holes = cover & (T[..., :3].max(2) < ad.get('hole_value', .09)) & (nz < ad.get('hole_normal_z', -.2))
for _ in range(2):
    g = holes.copy(); g[1:] |= holes[:-1]; g[:-1] |= holes[1:]; g[:, 1:] |= holes[:, :-1]; g[:, :-1] |= holes[:, 1:]; holes = g & cover
filled_px = int(holes.sum())
valid = cover & ~holes; C = T[..., :3] * valid[..., None]
for _ in range(400):
    if not (holes & ~valid).any():
        break
    acc = np.zeros_like(C); n = np.zeros(valid.shape, np.float32)
    for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
        acc += np.roll(C * valid[..., None], sh, ax); n += np.roll(valid, sh, ax)
    new = holes & ~valid & (n > 0); C[new] = acc[new] / n[new, None]; valid |= new
T[..., :3] = np.where(holes[..., None], C, T[..., :3]); src_img.pixels.foreach_set(T.ravel())
# 2) Many exporters leave the atlas background black with no island padding: filtering then pulls
#    black into every UV seam. Re-bake the texture onto itself with a margin (exact copy inside).
padded = bake('TEX', margin=ad.get('pad_px', 24))
outimg = bpy.data.images.new('padded_png', w_, h_, alpha=False); outimg.pixels.foreach_set(padded.ravel())
outimg.filepath_raw = str(tex); outimg.file_format = 'PNG'; outimg.save()
mat = bpy.data.materials.new(name); mat.use_nodes = True
t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(str(tex), check_existing=False)
mat.node_tree.links.new(t.outputs[0], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
src.data.materials.clear(); src.data.materials.append(mat)

# Silhouette renders with the drawings' calibration: the mesh is measured like a reference.
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'FLAT'
sc.display.shading.color_type = 'SINGLE'; sc.display.shading.single_color = (.06, .05, .05); sc.display.shading.show_object_outline = False
sc.world = bpy.data.worlds.new('bg'); sc.world.color = (.66, .66, .66); sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.sensor_fit = 'HORIZONTAL'
refs = {}
for view, cal in CAL.items():
    W, Hh = cal['size_px']; ppm = cal['px_per_m']; c = cal['centre_px']; zc = (cal['sole_px'] - Hh / 2) / ppm; off = (W / 2 - c) / ppm
    faces = cal['faces'] if view.startswith('side') else view
    pos, look = {'front': (Vector((off, -10, zc)), Vector((0, 1, 0))), 'back': (Vector((-off, 10, zc)), Vector((0, -1, 0))),
                 'right': (Vector((-10, -off, zc)), Vector((1, 0, 0))), 'left': (Vector((10, off, zc)), Vector((-1, 0, 0)))}[faces]
    cam.location = pos; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = W / ppm
    sc.render.resolution_x, sc.render.resolution_y = W, Hh; sc.render.resolution_percentage = 100
    f = cdir / 'references' / f'render-{view}.png'; sc.render.filepath = str(f); bpy.ops.render.render(write_still=True)
    refs[view] = f'references/render-{view}.png'
cam_obj = cam; bpy.data.objects.remove(cam_obj)
cfg['references'] = refs
cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding='utf-8')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'stage-bake.blend'))
print('ADOPTED', json.dumps({'object': name, 'welded_verts': welded, 'filled_texels': filled_px, 'tris': sum(len(p.vertices) - 2 for p in src.data.polygons), 'scale': round(s, 4),
                             'size_m': [round((hi[i] - lo[i]) * s, 3) for i in range(3)], 'texture': list(img.size)}))
