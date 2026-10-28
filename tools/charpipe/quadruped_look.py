"""Lunia look for a painted quadruped (quadruped_bake.py) and a static GLB for review.

  blender -b <stage-bake.blend> --python tools/charpipe/quadruped_look.py -- <character.json> <out.blend> [--hero web/assets/capoeirista.glb]

Same recipe as build.py's look stage: painted diffuse x 2-tone band (0.62 / 1.0), emission, inverted-hull outline
#232323 (gamma, linearised here) at look.outline_ratio of the height. The 'silhouette' corner colour (glTF COLOR_0)
is R = outline, G = band; the flame (saturated warm texels) gets G = 0: fire is never shaded. Renders the reference
views, three-quarter and the high gameplay camera, with the hero beside it for scale when --hero is given.
Exports <character dir>/export/<name>-static.glb (base-colour material + COLOR_0, no rig yet).
"""
import bpy, sys, json, math, colorsys
import numpy as np
from pathlib import Path
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
ROOT = Path(__file__).resolve().parents[2]
cfg_path, out = Path(a[0]).resolve(), Path(a[1]).resolve()
hero = (ROOT / a[a.index('--hero') + 1]) if '--hero' in a else None
cfg = json.loads(cfg_path.read_text(encoding='utf-8')); base = cfg_path.parent; NAME = cfg['name']
lk = {'band': [0.62, 1.0], 'band_threshold': 0.45, 'outline_color': [0.137, 0.137, 0.137], 'outline_ratio': 0.0035} | cfg.get('look', {})
sc = bpy.context.scene; bpy.context.preferences.filepaths.save_version = 0
o = next(x for x in sc.objects if x.type == 'MESH'); o.name = f'{NAME}_Full_000'; me = o.data
img = next(n for n in o.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE').image
H = max(v.co.z for v in me.vertices) - min(v.co.z for v in me.vertices)

# silhouette mask per corner: flame texels are unbanded
TW, TH = img.size; px = np.array(img.pixels[:]).reshape(TH, TW, 4)
uv = np.zeros(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
c = px[np.clip((uv[:, 1] * TH).astype(int), 0, TH - 1), np.clip((uv[:, 0] * TW).astype(int), 0, TW - 1), :3]
hsv = np.array([colorsys.rgb_to_hsv(*x) for x in c]); flame = (hsv[:, 1] > 0.6) & (hsv[:, 2] > 0.4)
for ca in list(me.color_attributes):
    me.color_attributes.remove(ca)
ca = me.color_attributes.new('silhouette', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = ca
col = np.ones((len(me.loops), 4)); col[flame, 1] = 0; ca.data.foreach_set('color', col.ravel())
gen_mat = o.data.materials[0]


def toon_material(name, image):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image
    dif = nt.nodes.new('ShaderNodeBsdfDiffuse'); s2r = nt.nodes.new('ShaderNodeShaderToRGB'); nt.links.new(dif.outputs[0], s2r.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = (*[lk['band'][0]] * 3, 1); e[1].position = lk['band_threshold']; e[1].color = (*[lk['band'][1]] * 3, 1)
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(s2r.outputs[0], bw.inputs[0]); nt.links.new(bw.outputs[0], ramp.inputs[0])
    attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'silhouette'
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(attr.outputs['Color'], sep.inputs[0])
    gate = nt.nodes.new('ShaderNodeMix'); gate.data_type = 'RGBA'; gate.inputs['A'].default_value = (1, 1, 1, 1)
    nt.links.new(sep.outputs[1], gate.inputs['Factor']); nt.links.new(ramp.outputs[0], gate.inputs['B'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    nt.links.new(tex.outputs[0], mix.inputs['A']); nt.links.new(gate.outputs['Result'], mix.inputs['B'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(mix.outputs['Result'], em.inputs[0])
    nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
    return m


line = bpy.data.materials.new(f'{NAME}_Silhouette'); line.use_nodes = True; nt = line.node_tree; nt.nodes.clear()
lin = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in lk['outline_color']]   # Lunia constants are gamma-space
em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (*lin, 1)
nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0]); line.use_backface_culling = True
me.materials.clear(); me.materials.append(toon_material(o.name, img)); me.materials.append(line)
sol = o.modifiers.new('Silhouette', 'SOLIDIFY'); sol.thickness = lk['outline_ratio'] * H; sol.offset = 1
sol.use_flip_normals = True; sol.material_offset = 1; sol.use_rim = False

# renders
sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3.2
sc.world = bpy.data.worlds.new('Studio'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .8, .84, 1)
sc.render.engine = 'BLENDER_EEVEE'; sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam); sc.camera = cam
rd = out.parent / 'renders'; rd.mkdir(parents=True, exist_ok=True)
co = np.array([v.co[:] for v in me.vertices]); lo, hi = co.min(0), co.max(0); ctr = Vector(((lo + hi) / 2).tolist())
fwd = Vector((1 if co[co[:, 2] > hi[2] - .1 * H][:, 0].mean() > ctr.x else -1, 0, 0)); left = Vector((0, 0, 1)).cross(fwd)


def shot(name, d, ortho=None, lens=50, res=(1168, 784), target=ctr, dist=14):
    cam.location = target + d.normalized() * dist; cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun.rotation_euler = (cam.location - target + Vector((0, 0, 8))).to_track_quat('Z', 'Y').to_euler()
    cam.data.type = 'ORTHO' if ortho else 'PERSP'; cam.data.ortho_scale = ortho or 1; cam.data.lens = lens
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = str(rd / f'{name}.png'); bpy.ops.render.render(write_still=True)


L = float(hi[0] - lo[0]) * 1.25
shot('side_left', left, ortho=L); shot('side_right', -left, ortho=L); shot('front', fwd, ortho=L); shot('back', -fwd, ortho=L)
shot('threequarter', fwd * .8 + left + Vector((0, 0, .45)), lens=60, dist=16)
if hero and hero.exists():   # scale: the hero in the gameplay shot, 1.5 m to the mule's left, facing it
    before = set(sc.objects); bpy.ops.import_scene.gltf(filepath=str(hero)); new = [x for x in sc.objects if x not in before]
    arm = next((x for x in new if x.type == 'ARMATURE'), None)
    root = next(x for x in new if x.parent is None)
    root.location = Vector((ctr.x + fwd.x * (hi[0] - lo[0]) * .9, 0, 0)); root.rotation_euler = (0, 0, math.radians(-90 if fwd.x > 0 else 90))
    if arm and arm.animation_data is not None and 'idle' in bpy.data.actions:
        arm.animation_data.action = bpy.data.actions['idle']; sc.frame_set(1); sc.frame_set(0)
# Lunia gameplay camera: high and fixed (same angle as the pilot's game-camera render, pulled back for the boss)
gt = Vector((ctr.x + fwd.x * .6, 0, 1.0))
shot('game-camera', Vector((0, -7.5, 7.0)), lens=50, res=(1280, 720), target=gt, dist=Vector((0, -7.5, 7.0)).length * 1.45)
if hero and hero.exists():
    for x in new:
        bpy.data.objects.remove(x, do_unlink=True)
bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
bpy.ops.wm.save_as_mainfile(filepath=str(out))

# static GLB: plain base-colour material + COLOR_0 (the toon look lives in the engine)
ed = base / 'export'; ed.mkdir(exist_ok=True)
toon = list(me.materials); m = bpy.data.materials.new(o.name + '_gltf'); m.use_nodes = True
bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 1; bsdf.inputs['Specular IOR Level'].default_value = 0
t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img; m.node_tree.links.new(t.outputs[0], bsdf.inputs['Base Color'])
me.materials.clear(); me.materials.append(m); o.modifiers['Silhouette'].show_viewport = False
for x in sc.objects:
    x.select_set(x == o)
bpy.context.view_layer.objects.active = o
bpy.ops.export_scene.gltf(filepath=str(ed / f'{NAME}-static.glb'), export_format='GLB', use_selection=True, export_apply=True,
                          export_yup=True, export_vertex_color='ACTIVE')
me.materials.clear()
for x in toon:
    me.materials.append(x)
o.modifiers['Silhouette'].show_viewport = True
info = {'height_m': round(H, 3), 'size_m': (hi - lo).round(3).tolist(), 'triangles': sum(len(p.vertices) - 2 for p in me.polygons),
        'texture': list(img.size), 'flame_corner_pct': round(float(flame.mean() * 100), 1), 'outline_m': round(sol.thickness, 4),
        'glb': str(ed / f'{NAME}-static.glb')}
(out.parent / 'look.json').write_text(json.dumps(info, indent=1)); print('QUADRUPED_LOOK', json.dumps(info))
