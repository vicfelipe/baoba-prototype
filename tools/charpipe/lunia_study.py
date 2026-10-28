"""Lunia character study: imports one player class with its DDS textures and measures conventions.
Read-only on the game client. Output: Evidence/lunia-study/<Char>/.
Usage: blender -b --python tools/charpipe/lunia_study.py -- Fighter
"""
import bpy, sys, json, zipfile, collections
from pathlib import Path
from mathutils import Vector, Matrix
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/cbb-skinned-addon'))
CLIENT = Path(r'D:\Jogos\source\Client')
CHAR = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'Fighter'
PARTS = ['Head', 'Body', 'Hand', 'Leg', 'Foot', 'Support', 'Weapon']
OUT = ROOT / 'Evidence/lunia-study' / CHAR
SRC = OUT / 'src'
SRC.mkdir(parents=True, exist_ok=True)

# Extract only what the study needs.
z = zipfile.ZipFile(CLIENT / 'Animation/Player.zip')
wanted = [f'{CHAR}/{CHAR}.Skeleton', f'{CHAR}/{CHAR}_Stand.SkinnedAnim', f'{CHAR}/{CHAR}_Run.SkinnedAnim'] + [f'{CHAR}/{CHAR}_{p}_000.SkinnedMesh' for p in PARTS]
for n in wanted:
    if n in z.namelist():
        (SRC / Path(n).name).write_bytes(z.read(n, pwd=b'JuhaniHonkala'))

class R:
    def report(self, level, msg): pass

import cbb_skinned_addon  # noqa: F401  (registers utils path)
from cbb_skinned_addon.core.skeleton_core import import_skeleton
from cbb_skinned_addon.core.mesh_core import import_skinnedmesh
from cbb_skinned_addon.core.animation_core import import_animation_from_files

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
import_skeleton(False, f'{CHAR}.Skeleton', str(SRC), R())
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
rig.select_set(True); bpy.context.view_layer.objects.active = rig
meshes = []
for p in PARTS:
    f = SRC / f'{CHAR}_{p}_000.SkinnedMesh'
    if not f.exists():
        continue
    import_skinnedmesh(False, f.name, str(SRC), True, False, skeleton_name=CHAR, texture_directory='unused', texture_file_name='missing', operator=R())
    o = bpy.data.objects[f.stem]
    dds = CLIENT / 'Mapping' / CHAR / f'{f.stem}.dds'
    m = bpy.data.materials.new(f.stem); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(str(dds))
    tex.interpolation = 'Closest'
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(tex.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
    o.data.materials.clear(); o.data.materials.append(m)
    meshes.append((p, o, tex.image))

# Skeleton: names, parents, rest positions.
bones = [{'name': b.name, 'parent': b.parent.name if b.parent else None, 'head': [round(c, 3) for c in b.head_local]} for b in rig.data.bones]
# World bounding box of the assembled character in rest pose.
pts = [o.matrix_world @ Vector(c) for _, o, _ in meshes for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
height = hi.z - lo.z
head_obj = next(o for p, o, _ in meshes if p == 'Head')
hz = [(head_obj.matrix_world @ v.co).z for v in head_obj.data.vertices]

def area3(o):
    return sum(p.area for p in o.data.polygons)

def uv_area(o):
    uv = o.data.uv_layers.active.data; s = 0
    for p in o.data.polygons:
        a = [uv[i].uv for i in p.loop_indices]
        for k in range(1, len(a) - 1):
            s += abs((a[k] - a[0]).cross(a[k + 1] - a[0])) / 2
    return s

def uv_overlap_ratio(o):
    # Rasterise UV triangles onto a 128 grid; >1 hits on a cell indicates mirrored/stacked islands.
    N = 128; grid = collections.Counter(); uv = o.data.uv_layers.active.data
    for p in o.data.polygons:
        a = [uv[i].uv for i in p.loop_indices]
        cells = set()
        for k in range(1, len(a) - 1):
            t = (a[0], a[k], a[k + 1])
            x0, x1 = int(min(q.x for q in t) * N), int(max(q.x for q in t) * N)
            y0, y1 = int(min(q.y for q in t) * N), int(max(q.y for q in t) * N)
            for x in range(x0, x1 + 1):
                for y in range(y0, y1 + 1):
                    c = Vector(((x + .5) / N, (y + .5) / N))
                    d = [(t[(i + 1) % 3] - t[i]).cross(c - t[i]) for i in range(3)]
                    if all(v >= 0 for v in d) or all(v <= 0 for v in d):
                        cells.add((x % N, y % N))
        for c in cells:
            grid[c] += 1
    return round(sum(1 for v in grid.values() if v > 1) / max(1, len(grid)), 3), round(len(grid) / N / N, 3)

parts = []
for p, o, img in meshes:
    vg = {g.index: g.name for g in o.vertex_groups}
    used = collections.Counter()
    infl = collections.Counter()
    for v in o.data.vertices:
        gs = [g for g in v.groups if g.weight > 1e-4]
        infl[len(gs)] += 1
        for g in gs:
            used[vg[g.group]] += 1
    ov, cover = uv_overlap_ratio(o)
    a3 = area3(o); auv = uv_area(o)
    parts.append({
        'part': p, 'tris': len(o.data.polygons), 'verts': len(o.data.vertices),
        'texture': f'{img.size[0]}x{img.size[1]}',
        'influences_histogram': dict(sorted(infl.items())),
        'bones_used': sorted(used, key=used.get, reverse=True),
        'uv_coverage': cover, 'uv_overlap_cells': ov,
        'texels_per_unit': round((auv * img.size[0] * img.size[1] / a3) ** .5, 2) if a3 else 0,
        'z_range': [round(min((o.matrix_world @ v.co).z for v in o.data.vertices), 2), round(max((o.matrix_world @ v.co).z for v in o.data.vertices), 2)],
    })

report = {
    'character': CHAR, 'bone_count': len(bones), 'height_units': round(height, 3),
    'bbox_min': [round(c, 3) for c in lo], 'bbox_max': [round(c, 3) for c in hi],
    'head_height_units': round(max(hz) - min(hz), 3),
    'heads_tall': round(height / (max(hz) - min(hz)), 2),
    'total_tris': sum(x['tris'] for x in parts), 'parts': parts, 'bones': bones,
}
(OUT / 'study.json').write_text(json.dumps(report, indent=1), encoding='utf-8')

# Renders: flat texture colour only (shows what is painted vs. lit), ortho front/side/back/3q.
for o in scene.objects:
    o.hide_render = o.type not in ('MESH',)
scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700; scene.render.resolution_y = 1000
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('w'); scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.82, .82, .84, 1)
scene.view_settings.view_transform = 'Standard'
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = height * 1.12
mid = (lo + hi) / 2
for name, d in [('front', Vector((0, 1, 0))), ('back', Vector((0, -1, 0))), ('left', Vector((-1, 0, 0))), ('right', Vector((1, 0, 0))), ('threequarter', Vector((-.7, 1, .45))), ('face', Vector((0, 1, 0)))]:
    target = Vector((0, 0, (max(hz) + min(hz)) / 2)) if name == 'face' else mid
    cam.data.ortho_scale = (max(hz) - min(hz)) * 1.5 if name == 'face' else height * 1.12
    cam.location = target + d.normalized() * height * 3
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / f'render-{name}.png')
    bpy.ops.render.render(write_still=True)

# Same views with the topology drawn over the texture.
wmat = bpy.data.materials.new('wire'); wmat.use_nodes = True
wmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0, 0, 0, 1)
wmat.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (0.02, 0.02, 0.02, 1)
for _, o, _ in meshes:
    w = o.copy(); w.data = o.data.copy(); scene.collection.objects.link(w)
    w.data.materials.clear(); w.data.materials.append(wmat)
    w.modifiers.new('wf', 'WIREFRAME').thickness = height * 0.0012
    w.modifiers.move(w.modifiers.find('wf'), 0)
for name, d in [('front', Vector((0, 1, 0))), ('left', Vector((-1, 0, 0)))]:
    cam.data.ortho_scale = height * 1.12
    cam.location = mid + d * height * 3
    cam.rotation_euler = (mid - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / f'wire-{name}.png')
    bpy.ops.render.render(write_still=True)

# Textures to PNG with UV wire overlay, so the painting conventions are visible.
for p, o, img in meshes:
    img.save_render(str(OUT / f'tex-{p}.png'), scene=scene)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.uv.export_layout(filepath=str(OUT / f'uv-{p}.png'), size=(512, 512), opacity=0.0, export_all=True)
    except Exception as e:
        print('uv export failed', p, e)
    bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{CHAR}-study.blend'))
print('STUDY', json.dumps({k: v for k, v in report.items() if k != 'bones'}))
