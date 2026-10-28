"""Re-import the exported GLB in an empty scene and assert the Lunia-style contract.
  blender -b --python tools/charpipe/check_glb.py -- SourceArt/<Char>/export/<Char>.glb"""
import bpy, sys, json
args = sys.argv[sys.argv.index('--') + 1:]
path = args[0]
height = float(args[1]) if len(args) > 1 else 1.8
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is not None]  # importer adds an unparented bone-shape Icosphere
rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
res = {
    'meshes': sorted(o.name for o in meshes), 'armatures': len(rigs), 'bones': len(rigs[0].data.bones) if rigs else 0,
    'skinned': all(any(m.type == 'ARMATURE' for m in o.modifiers) for o in meshes),
    'textures': sorted({i.name for i in bpy.data.images if i.size[0]}), 'actions': [a.name for a in bpy.data.actions],
    'max_influences': max(len([g for g in v.groups if g.weight > 1e-4]) for o in meshes for v in o.data.vertices),
    'height': round(max((o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices), 3),
}
ok = res['armatures'] == 1 and res['skinned'] and res['max_influences'] <= 2 and len(res['textures']) == len(meshes) and abs(res['height'] - height) < .04
print('GLB_CHECK', 'PASS' if ok else 'FAIL', json.dumps(res))
if not ok:
    raise RuntimeError('GLB contract failed')
