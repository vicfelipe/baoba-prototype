"""Cangaceiro weapons (Lunia 'Weapon' slot) modelled on the user's weapon sheet.

Every weapon is lofted column by column along its length from its silhouette on the sheet
(side view), with a per-segment thickness, and textured by projecting the same sheet from
the side. Each weapon hangs on its own bone under a hand (grip in the fist, barrel along
the fingers, top of the weapon on the thumb side); clips show/hide a weapon by scaling that
bone, so visibility travels inside the GLB. Muzzle_* bones mark where shots leave.
"""
import bpy, math, collections
import numpy as np
from mathutils import Vector, Matrix

PPM = 1160.0   # sheet pixels per metre: bacamarte 0.92 m, pistol 0.39 m, peixeira 0.42 m (one scale)
# Sheet components (x0, x1, y0, y1 in sheet px, y from the top), measured by segmentation.
SHEET = {
    'Bacamarte': dict(box=(45, 1115, 50, 275), grip=(350, 165), axis_y=100, muzzle=(1112, 112),
                      segs=[(0, 'flat', .021), (470, 'round', .95), (960, 'round', 1.0)], tex=1024),
    'Pistola': dict(box=(245, 699, 303, 506), grip=(287, 438), axis_y=351, muzzle=(699, 351),
                    segs=[(0, 'flat', .017), (520, 'round', .95)], tex=512),
    'Peixeira': dict(box=(58, 547, 553, 669), grip=(150, 611), axis_y=611, muzzle=(547, 607),
                     segs=[(0, 'round', .9), (245, 'flat', .011), (276, 'flat', .0035)], tex=512),
}
# Weapon bones: (bone, hand, sheet weapon, muzzle bone). Mesh names follow <Class>_<Slot>_<item>.
MOUNTS = [('R_Bacamarte', 'R_Hand', 'Bacamarte', 'Muzzle_Bacamarte'), ('R_Pistol', 'R_Hand', 'Pistola', 'Muzzle_Pistol_R'),
          ('L_Pistol', 'L_Hand', 'Pistola', 'Muzzle_Pistol_L'), ('R_Peixeira', 'R_Hand', 'Peixeira', 'Muzzle_Peixeira')]
MESH = {'Bacamarte': ['R_Bacamarte'], 'Pistolas': ['R_Pistol', 'L_Pistol'], 'Peixeira': ['R_Peixeira']}
HIDDEN = 1e-3


def load_sheet(path):
    im = bpy.data.images.load(str(path)); w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1, :, :3].copy()   # row 0 = top, 0..1


def component(rgb, box):
    """Mask of the weapon inside its box (dark or saturated pixels connected to the centre)."""
    x0, x1, y0, y1 = box; sub = rgb[y0 - 4:y1 + 5, x0 - 4:x1 + 5] * 255
    fg = (sub.mean(2) < 175) | (sub.max(2) - sub.min(2) > 28)
    lab = np.zeros(fg.shape, bool); ys, xs = np.nonzero(fg)
    k = np.argmin((ys - fg.shape[0] / 2) ** 2 + (xs - fg.shape[1] / 2) ** 2)
    q = collections.deque([(ys[k], xs[k])]); lab[ys[k], xs[k]] = True
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = cy + dy, cx + dx
            if 0 <= yy < fg.shape[0] and 0 <= xx < fg.shape[1] and fg[yy, xx] and not lab[yy, xx]:
                lab[yy, xx] = True; q.append((yy, xx))
    full = np.zeros(rgb.shape[:2], bool); full[y0 - 4:y1 + 5, x0 - 4:x1 + 5] = lab
    return full


def loft_weapon(p, name, m, spec):
    """Rings along the length; each column keeps the run nearest to the previous centre
    (drops the sling hanging under the stock)."""
    x0, x1 = spec['box'][:2]; gx, gy = spec['grip']; cy = spec['axis_y']
    rings, prev = [], cy
    for c in list(range(x0, x1 + 1, 10)) + [x1]:
        runs = []; col = m[:, c]; r = 0
        while r < len(col):
            if col[r]:
                a = r
                while r < len(col) and col[r]: r += 1
                runs.append((a, r - 1))
            r += 1
        runs = [u for u in runs if u[1] - u[0] >= 2]
        if not runs:
            continue
        a, b = min(runs, key=lambda u: abs((u[0] + u[1]) / 2 - prev))
        prev = (a + b) / 2
        az = (b - a + 1) / 2 / PPM; zc = (gy - (a + b) / 2) / PPM; x = (c - gx) / PPM
        mode, k = next((md, kk) for s0, md, kk in reversed(spec['segs']) if c - x0 >= s0)
        ay = az * k if mode == 'round' else min(az, k)
        rings.append(p.ring_x(x, 0, zc, max(ay, .002), max(az, .002), 2.2, 12))
    return p.loft(name, rings)


def texture(p, rgb, m, spec, name, path):
    """Crop of the sheet around the weapon, colour bled past the silhouette."""
    x0, x1, y0, y1 = spec['box']; pad = 8
    r0, r1, c0, c1 = y0 - pad, y1 + pad, x0 - pad, x1 + pad
    crop = rgb[r0:r1, c0:c1]; mk = m[r0:r1, c0:c1]
    tex = p.bleed(crop[::-1].copy(), mk[::-1].copy(), erode=1, steps=30)   # bottom-up for Blender
    img = p.np_img(name, tex.astype(np.float32), path)
    return img, (r0, r1, c0, c1)


def build(p, rig):
    rgb = load_sheet(p.CDIR / p.CFG['weapons_reference'])
    tex_dir = p.OUT / 'textures'; tex_dir.mkdir(exist_ok=True)
    # Hand pose at rest: fist centre under the palm, knuckle line along Y (thumb -Y).
    palm = {}
    for S, s in (('L', 1), ('R', -1)):
        h = rig.data.bones[f'{S}_Hand']
        palm[S] = h.head_local + (h.tail_local - h.head_local) * .55 + Vector((0, 0, -.022))
    # Bones.
    p.select_only([rig]); bpy.ops.object.mode_set(mode='EDIT'); eb = rig.data.edit_bones
    for bone, hand, w, muzzle in MOUNTS:
        S = hand[0]; s = 1 if S == 'L' else -1
        e = eb.new(bone); e.head = palm[S]; e.tail = palm[S] + Vector((s * .08, 0, 0)); e.parent = eb[hand]
        spec = SHEET[w]; mx = (spec['muzzle'][0] - spec['grip'][0]) / PPM; mz = (spec['grip'][1] - spec['muzzle'][1]) / PPM
        # weapon frame -> world: length along the fingers, weapon top toward the thumb (-Y)
        mu = eb.new(muzzle)
        tip = palm[S] + Vector((s * mx, -mz, 0)); mu.head = tip; mu.tail = tip + Vector((s * .03, 0, 0)); mu.parent = e
    bpy.ops.object.mode_set(mode='OBJECT')
    for b in rig.data.bones:
        if b.name in [m[0] for m in MOUNTS] or b.name.startswith('Muzzle_'):
            b.use_deform = b.name in [m[0] for m in MOUNTS]
    # Meshes.
    made = {}
    for w in ('Bacamarte', 'Pistola', 'Peixeira'):
        spec = SHEET[w]; m = component(rgb, spec['box'])
        src = loft_weapon(p, 'w_' + w, m, spec)
        img, (r0, r1, c0, c1) = texture(p, rgb, m, spec, f'{p.NAME}_{w}_tex', tex_dir / f'{p.NAME}_{w}.png')
        me = src.data; uv = me.uv_layers.new(name='UVMap')
        for loop in me.loops:
            co = me.vertices[loop.vertex_index].co
            col = spec['grip'][0] + co.x * PPM; row = spec['grip'][1] - co.z * PPM
            uv.data[loop.index].uv = ((col - c0) / (c1 - c0), 1 - (row - r0) / (r1 - r0))
        made[w] = (src, img)
    objs = {}
    for slot, bones in MESH.items():
        pieces = []
        for bone in bones:
            hand, w = next((h, ww) for b, h, ww, _ in MOUNTS if b == bone)
            src, img = made[w]; o = src.copy(); o.data = src.data.copy(); bpy.context.scene.collection.objects.link(o)
            S = hand[0]; s = 1 if S == 'L' else -1
            # local x (length) -> s*X, local z (top) -> -Y, local y -> keeps a proper rotation
            # columns: length -> (s,0,0), side -> (0,0,s), top -> (0,-1,0); det = +1 on both hands
            R = Matrix(((s, 0, 0), (0, 0, -1), (0, s, 0))).to_4x4()
            o.data.transform(Matrix.Translation(palm[S]) @ R)
            g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
            pieces.append(o)
        p.select_only(pieces); bpy.ops.object.join(); o = bpy.context.object
        o.name = f'{p.NAME}_{slot}_000'; o.data.name = o.name
        for f in o.data.polygons:
            f.use_smooth = True
        mat = bpy.data.materials.new(o.name); mat.use_nodes = True
        t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.name = 'Image Texture'
        t.image = bpy.data.images.load(str(tex_dir / f'{p.NAME}_{"Pistola" if slot == "Pistolas" else slot}.png'))
        mat.node_tree.links.new(t.outputs[0], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat)
        sil = o.vertex_groups.new(name='silhouette'); sil.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        attr = o.data.color_attributes.new('silhouette', 'FLOAT_COLOR', 'POINT')
        for d in attr.data:
            d.color = (1, 1, 0, 1)
        o.data.color_attributes.active_color = attr
        for c in list(o.users_collection):
            c.objects.unlink(o)
        bpy.data.collections[p.NAME].objects.link(o)
        o.parent = rig; o.modifiers.new('Armature', 'ARMATURE').object = rig
        objs[slot] = o
    for src, img in made.values():
        bpy.data.objects.remove(src)
    print('WEAPONS', {k: len(o.data.polygons) for k, o in objs.items()})
    return objs


def visibility(clip):
    """Which weapon bones are shown (scale 1) in a clip; the others stay at HIDDEN.
    'throw' releases the knife at its impact time (handled by the motion script)."""
    if clip in ('pistols', 'draw'):
        return {'R_Pistol', 'L_Pistol'}
    if clip == 'throw':
        return {'R_Peixeira'}
    if clip in ('apose',):
        return set()
    return {'R_Bacamarte'}
