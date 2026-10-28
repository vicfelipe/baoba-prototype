"""Maloka from the Hunyuan3D 2.1 model, corrected with the Maloka references (doc 24). PROTOTYPE ONLY: the
Hunyuan3D licence does not apply in the EU, the UK or South Korea, outputs included (doc 18 section 15), so
this build never replaces the shipped Maloka without a new decision from the user.
blender -b --python tools/charpipe/maloka_hunyuan_build.py -- SourceArt/MalokaHunyuan/character.json [--from fit|bake|rig|anim|look|export] [--to <stage>]

What the generated mesh got wrong, and the fix (doc 24):
- 448 islands split at UV seams, inverted patches -> welded, normals recomputed (as adopt.py);
- wider than the drawings, arms drooping (front IoU .87, arms .66) -> the shared contour fit on the masks;
- mitten hands with smeared tattoo lines, no rings -> cut at the wrist, replaced by the authored hands;
- realistic baked lighting, an invented back print, a noisy face -> repainted from the user's four pictures;
  its own colour stays only where no picture sees the surface (arm and shoulder tops, under the brim),
  matched to the projection by mean/deviation per 10 cm band;
- one triangle soup with no rig -> the Maloka joints and weight rules on one 'Full' slot (Lunia: adopted
  model = single slot), the hands in their own slot.
"""
import bpy, sys, math, json, bmesh
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import maloka_build as mb   # loads build.py with the same sheet (argv)
p = mb.p; H, OUT, NAME, M = p.H, p.OUT, p.NAME, p.M
AD = p.CFG['adopt']


def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version = 0
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.fps = 100
    bpy.ops.import_scene.gltf(filepath=str((p.CDIR / AD['file']).resolve()))
    o = bpy.data.objects[AD['object']]
    o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4); o.parent = None
    for x in list(sc.objects):
        if x is not o:
            bpy.data.objects.remove(x, do_unlink=True)
    V = np.array([v.co[:] for v in o.data.vertices]); lo, hi = V.min(0), V.max(0); s = H / (hi[2] - lo[2])
    legs = V[V[:, 2] < lo[2] + .35 * (hi[2] - lo[2])]; cy = (legs[:, 1].min() + legs[:, 1].max()) / 2
    o.data.transform(Matrix.Translation((-(lo[0] + hi[0]) / 2 * s, -cy * s, -lo[2] * s)) @ Matrix.Scale(s, 4))
    bm = bmesh.new(); bm.from_mesh(o.data); n0 = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=AD.get('weld', 1e-4)); welded = n0 - len(bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # The generated mitten hands go (everything past the wrist; the authored palm starts 1.6 cm inside it),
    # and the head and hat: its face does not sit where the drawings put eyes and nose, so the projection
    # tore it; the pipeline's measured head and hat replace it (the neck stays, under the jaw).
    def off_arm(v):   # the generated thumb hung down from x .60: a spike under the bangle
        x = abs(v.co.x)
        if x < .58 or x > mb.WRIST_X:
            return False
        zc, az = mb.arm_z(x)
        return ((v.co.z - zc) / max(az, .02)) ** 2 + ((v.co.y - mb.ARM_Y) / .036) ** 2 > 1.45 ** 2
    cut = [v for v in bm.verts if abs(v.co.x) > mb.WRIST_X - .004 or v.co.z > 1.555 or off_arm(v)]
    bmesh.ops.delete(bm, geom=cut, context='VERTS')
    # The legs touch on the centre line below the crotch (.67): faces there joined the left thigh to the right one
    # (x48 in the high kick). Remove the faces that cross the centre and close each leg's inner wall with
    # its own fan.
    cross = [f for f in bm.faces if f.calc_center_median().z < .67 and min(v.co.x for v in f.verts) < 5e-4 and max(v.co.x for v in f.verts) > -5e-4]   # crossing or touching x = 0 (shared seam vertices joined the legs too)
    bmesh.ops.delete(bm, geom=cross, context='FACES')
    fans = 0
    for sgn in (1, -1):
        edges = [e for e in bm.edges if e.is_boundary and all(sgn * v.co.x > 0 and abs(v.co.x) < .05 and v.co.z < .70 for v in e.verts)]
        if not edges:
            continue
        vs = {v for e in edges for v in e.verts}; c = sum((v.co for v in vs), Vector()) / len(vs); c.x = sgn * max(abs(c.x), .004)
        nv = bm.verts.new(c)
        for e in edges:
            bm.faces.new((e.verts[0], e.verts[1], nv)); fans += 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # The inner walls of both legs lie on x = 0: the sign of x put left-leg vertices on the right thigh. Below
    # the crotch the split legs are separate pieces; each piece takes the side of its mean x.
    lay = bm.verts.layers.int.new('side'); band = lambda v: v.co.z < .63   # under the cut: no path across
    seen = set()
    for v0 in bm.verts:
        v0[lay] = 1 if v0.co.x > 0 else -1
    for v0 in bm.verts:
        if v0 in seen or not band(v0):
            continue
        comp, st = [], [v0]; seen.add(v0)
        while st:
            a_ = st.pop(); comp.append(a_)
            for e in a_.link_edges:
                b_ = e.other_vert(a_)
                if b_ not in seen and band(b_):
                    seen.add(b_); st.append(b_)
        sx = 1 if sum(v.co.x for v in comp) > 0 else -1
        for v in comp:
            v[lay] = sx
    # The cut left a jagged wrist rim: flatten it to one plane and tuck it 8% toward the arm axis.
    for v in [v for v in bm.verts if v.is_boundary and abs(v.co.x) > mb.WRIST_X - .04]:
        zc, _ = mb.arm_z(mb.WRIST_X - .006); sx = math.copysign(1, v.co.x)
        v.co.x = sx * (mb.WRIST_X - .006); v.co.y = mb.ARM_Y + (v.co.y - mb.ARM_Y) * .92; v.co.z = zc + (v.co.z - zc) * .92
    bm.to_mesh(o.data); bm.free()
    # Keep the generated UVs and colour for the completion; the projection gets its own active UV map.
    o.data.uv_layers[0].name = 'hy'; img = next(n.image for m in o.data.materials if m and m.node_tree for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.outputs[0].links and n.outputs[0].links[0].to_socket.name == 'Base Color')
    (OUT / 'textures').mkdir(parents=True, exist_ok=True); hy = OUT / 'textures' / 'hunyuan-colour.png'
    img.filepath_raw = str(hy); img.file_format = 'PNG'; img.save()
    o.name = o.data.name = p.part_name('Full')
    sc.collection.children.link(bpy.data.collections.new(NAME))
    for c in list(o.users_collection):
        c.objects.unlink(o)
    bpy.data.collections[NAME].objects.link(o)
    for f in o.data.polygons:
        f.use_smooth = True
    mb.add('Hand', mb.hands())
    hd = mb.add('Head', [mb.head()], p.B['parts']['Head'].get('voxel', .004), p.B['parts']['Head'].get('tris', 2600), smooth=2)
    h = mb.hat()
    for x in h:
        mb.mark(x, 'hat', 1)
    p.join_into(hd, h)
    rep = {'welded_vertices': welded, 'cut_hand_vertices': len(cut), 'crotch_faces_removed': len(cross), 'crotch_fan_faces': fans, 'vertices': len(o.data.vertices), 'triangles': sum(len(f.vertices) - 2 for f in o.data.polygons)}
    (OUT / 'review').mkdir(exist_ok=True); (OUT / 'review' / 'adopt.json').write_text(json.dumps(rep, indent=1)); print('GEO_HUNYUAN', rep)


def mark_hat(o):
    """The bucket hat on the single mesh: above the tilted brim plane, or under it outside the head."""
    b = mb.BRIM; ta = math.tan(b['tilt'])
    a = o.data.attributes.new('hat', 'INT', 'POINT')
    for v, d in zip(o.data.vertices, a.data):
        x, y, z = v.co
        plane = b['z'] + b['drop'] * .8 - (y - b['y']) * ta - .012
        outside = (x / .092) ** 2 + ((y + .012) / .108) ** 2 > 1
        d.value = int(z > plane or (z > 1.585 and outside))


def completion():
    """Texels no picture sees well take the generated colour, matched to the projection by mean and
    deviation per 10 cm band on the well-seen texels (a global match flattened skin against cloth)."""
    o = p.parts_by_slot()['Full']; size = p.B['parts']['Full']['texture']; mats = list(o.data.materials)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    hy = bpy.data.images.load(str(OUT / 'textures' / 'hunyuan-colour.png'))

    gen = p.img_np(OUT / 'textures' / 'hunyuan-colour.png')   # same atlas (keep_uv): no re-bake
    pos = p.bake_into(o, mb.geo_mat('Position'), size, 'EMIT')
    vis = mb.visibility(o, size); mb.restore(o, mats)
    path = OUT / 'textures' / f'{o.name}.png'; tex = p.img_np(path)
    cov = np.abs(pos).sum(2) > 1e-6; z = pos[..., 2]; out = tex.copy()
    good = cov & (vis > .7); weak = cov & (vis < .4)
    for z0 in np.arange(0, H, .1):
        band = (z >= z0 - .05) & (z < z0 + .15)
        g = good & band; w = weak & (z >= z0) & (z < z0 + .1)
        if g.sum() < 200 or not w.any():
            continue
        mp, sp = tex[g].mean(0), tex[g].std(0) + 1e-3; mh, sh = gen[g].mean(0), gen[g].std(0) + 1e-3
        out[w] = np.clip((gen[w] - mh) / sh * sp + mp, 0, 1)
    t = np.clip((vis - .28) / .12, 0, 1)[..., None]   # .28 -> .4: blend into the projection
    out = np.where(weak[..., None], out * (1 - t) + tex * t, tex)
    p.np_img(o.name + '_compl', out.astype(np.float32), path)
    o.data.materials[0].node_tree.nodes['Image Texture'].image.reload()
    rep = {'completed_texels': int(weak.sum()), 'coverage': int(cov.sum())}
    (OUT / 'review' / 'completion.json').write_text(json.dumps(rep, indent=1)); print('COMPLETION', rep)


def rigging():
    mb.rig_setup(); p.stage_rig()
    parts = p.parts_by_slot(); o = parts['Full']; rig = o.parent
    mb.smooth_deform_weights(o)
    sd = o.data.attributes['side'].data; side = lambda v: 'L' if sd[v.index].value > 0 else 'R'
    mb.weights_legs(o, rig, sel=lambda v: mb.SHOE_TOP + .06 < v.co.z < mb.HEM_Z, side=side)
    mb.weights_feet(o, rig, sel=lambda v: v.co.z <= mb.SHOE_TOP + .06, top=mb.SHOE_TOP + .06, side=side)
    mb.weights_torso(o, rig, sel=lambda v: mb.HEM_Z <= v.co.z < 1.50)
    # One surface runs from the jersey hem into the shorts top: heat gave the hem the waist and the shorts
    # just under it the kicking thigh. The shorts top (.66 -> .78) fades onto the pelvis, the hem (.80 -> .92)
    # from the pelvis to the waist.
    names = [g.name for g in o.vertex_groups]
    for v in o.data.vertices:
        z = v.co.z
        if .66 < z < mb.HEM_Z:
            f = mb.ramp(.66, .78, z); cur = {names[g.group]: g.weight for g in v.groups if names[g.group] in rig.data.bones}
            mix = {n: w * (1 - f) for n, w in cur.items()}; mix['Pelvis'] = mix.get('Pelvis', 0) + f
            top = sorted(mix.items(), key=lambda kv: -kv[1])[:2]; tot = sum(w for _, w in top)
            mb.assign(o, rig, v, [(n, w / tot) for n, w in top])
        elif mb.HEM_Z <= z < .92 and abs(v.co.x) < .30:
            k = mb.ramp(mb.HEM_Z, .92, z); mb.assign(o, rig, v, [('Pelvis', 1 - k), ('Waist', k)])
    for v in o.data.vertices:   # Lunia: rigid head (hat included), the neck blends into it
        x, z = abs(v.co.x), v.co.z
        if z > 1.56 or (z > 1.50 and x < .10):
            k = mb.ramp(1.50, 1.555, z); mb.assign(o, rig, v, [('Neck', 1 - k), ('Head', k)])
    p.select_only([o]); bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=2)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
    mb.weights_hands(parts['Hand'], rig)
    o.data.attributes.remove(o.data.attributes['side'])
    print('RIG_HUNYUAN', {s: p.bone_influences(ob) for s, ob in p.parts_by_slot().items()})


stages = ['geo', 'fit', 'bake', 'rig', 'anim', 'look', 'export']
start = stages.index(mb.resume)
if start:
    bpy.ops.wm.open_mainfile(filepath=str(OUT / ('stage-' + stages[start - 1] + '.blend')))
for st in stages[start:stages.index(mb.last) + 1]:
    print('MALOKA_HUNYUAN_STAGE', st, flush=True)
    if st == 'geo':
        geometry()
    elif st == 'fit':
        mb.fit()
    elif st == 'bake':
        p.stage_bake(); completion(); mb.hat_and_jaw(); mb.paint_hands('Full')
    elif st == 'rig':
        rigging()
    elif st == 'anim':
        mb.reference_clip()
    elif st == 'look':
        mb.look()
    else:
        if 'PoseTest' in bpy.data.actions:
            bpy.data.actions.remove(bpy.data.actions['PoseTest'])
        p.stage_export()
    if st != 'export':
        p.save(st)
