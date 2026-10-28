"""Maloka motion and props (doc 24): generic Mixamo takes already in the project (copied to
SourceArt/Maloka/mocap) retargeted to the Lunia rig (clips.bake_mixamo), the clips without a take
authored with clips.py keys, and the razor and the poison flask modelled on references/props.png on
their own bones under the right hand.

Clip names belong to the Maloka controller (web/src/maloka-asset.js); timed clips take their duration
and hit time from MALOKA in web/src/config.js. Props show/hide by the scale of their bone, keyed in
every clip so the visibility travels inside the GLB. The right hand grips (the razor, or the flask in
the throw) in every captured clip.
"""
import bpy, math, re
import numpy as np
from mathutils import Vector, Matrix, Quaternion
import clips
import cangaceiro_weapons as W   # sheet helpers: load_sheet, component, texture
import vaqueiro_motion as V      # tame / untwist / reground: generic fits of a take to a measured body

# props.png: razor 1143 px long (~25 cm at the sheet's 4600 px/m); drawn a little larger so it reads at
# the game camera (Cangaceiro: scale = visibility).
RAZOR = dict(box=(56, 1199, 301, 504), grip=(200, 455), ppm=3900, blade_x=735,   # handle | tang/blade
             thick=(.009, .0025),                                                # handle, blade
             angle=60, ahead=.012, below=.026)   # knife grip in the fist (see build_props)
FLASK = dict(box=(896, 1134, 627, 1010), ppm=3000)                                # 383 px -> 12.8 cm
HIDDEN = 1e-3
GRIP = .9           # finger curl of the gripping hand (PoseTest's full fist stretched the back of the hand 2.03x; .75 held the razor loosely)
CURL = -1           # this rig's finger bones curl into the palm about local -X (clips.Pose.fist bends them back)
T_POSE_HIPS = 1.043  # Mixamo T-Pose hips height (vaqueiro_motion)
RUN_TRAVEL = 3.77    # mixamo-run.fbx (the Cangaceiro's sprint take): hips travel per 0.633 s cycle


def config_js(p):
    """MALOKA numbers from web/src/config.js (single source of the combat times)."""
    src = (p.ROOT / 'web/src/config.js').read_text(encoding='utf-8')
    block = src[src.index('export const MALOKA'):]; block = block[:block.index('\n};')]
    get = lambda key, field: float(re.search(rf'\b{key}:\s*\{{[^}}]*\b{field}:\s*([\d.]+)', block).group(1))
    return dict(speed=float(re.search(r'\bspeed:\s*([\d.]+)', block).group(1)),
                navalha=(get('navalha', 'dur'), get('navalha', 'hit')), veneno=(get('veneno', 'dur'), get('veneno', 'hit')),
                fumaca=(get('fumaca', 'dur'), get('fumaca', 'hit')), dodge=get('dodge', 'dur'))


# ----------------------------------------------------------------------------- props
def runs(col):
    out = []; r = 0
    while r < len(col):
        if col[r]:
            a = r
            while r < len(col) and col[r]: r += 1
            out.append((a, r - 1))
        r += 1
    return [u for u in out if u[1] - u[0] >= 2]


def razor_mesh(p, m):
    """Flat lofted card along the sheet columns: boxy section, thick handle, thin blade. Each column keeps
    the run nearest to the previous centre (drops the tang hook over the handle)."""
    x0, x1 = RAZOR['box'][:2]; gx, gy = RAZOR['grip']; ppm = RAZOR['ppm']
    rings, prev = [], gy
    for c in list(range(x0 + 2, x1, 14)) + [x1 - 1]:
        rr = runs(m[:, c])
        if not rr:
            continue
        a, b = min(rr, key=lambda u: abs((u[0] + u[1]) / 2 - prev)); prev = (a + b) / 2
        t = RAZOR['thick'][0 if c < RAZOR['blade_x'] else 1] / 2
        rings.append(p.ring_x((c - gx) / ppm, 0, (gy - (a + b) / 2) / ppm, t, (b - a + 1) / 2 / ppm, 6.0, 8))
    return p.loft('razor', rings)


def flask_mesh(p, m):
    """Lathe around the bottle's vertical axis: one ring per sheet row, radius = half the row width."""
    x0, x1, y0, y1 = FLASK['box']; ppm = FLASK['ppm']
    cx = (x0 + x1) / 2; rings = []
    for r in list(range(y0 + 2, y1, 12)) + [y1 - 1]:
        rr = runs(m[r, :])
        if not rr:
            continue
        a, b = rr[0][0], rr[-1][1]; rad = (b - a + 1) / 2 / ppm; z = (y1 - r) / ppm; mid = ((a + b) / 2 - cx) / ppm
        rings.append([(mid + rad * math.cos(t), rad * math.sin(t), z) for t in np.linspace(0, 2 * math.pi, 16, endpoint=False)])
    return p.loft('flask', rings[::-1])   # bottom -> top


def build_props(p, rig):
    rgb = W.load_sheet(p.CDIR / p.CFG['props_reference']); tex_dir = p.OUT / 'textures'
    bones = rig.data.bones
    h = bones['R_Hand']; palm = h.head_local + (h.tail_local - h.head_local) * .55 + Vector((0, 0, -.022))
    head, tail = h.head_local.copy(), h.tail_local.copy()   # the Bone reference dies in the edit-mode switch below
    p.select_only([rig]); bpy.ops.object.mode_set(mode='EDIT'); eb = rig.data.edit_bones
    for name in ('Navalha', 'Frasco'):
        e = eb.new(name); e.head = palm; e.tail = palm + Vector((-.08, 0, 0)); e.parent = eb['R_Hand']
    bpy.ops.object.mode_set(mode='OBJECT')
    made = {}
    # Razor in a knife grip: held near the butt (3.6 cm of handle behind the grip, inside the fist), the
    # handle runs through the hole of the curled fist (1.2 cm past the knuckles, 2.6 cm under the hand bone)
    # and leaves between the thumb and the index turned 60 deg from the thumb side toward the fingers, edge
    # down, so it points ahead in the stab. Along the fingers and held mid-handle (the first mount) the
    # handle ran under the palm to the wrist and the blade came out over the fingers ("leaking"); straight
    # out of the thumb side it pointed across the stab.
    m = W.component(rgb, RAZOR['box']); o = razor_mesh(p, m)
    _, (r0, r1, c0, c1) = W.texture(p, rgb, m, dict(box=RAZOR['box']), f'{p.NAME}_Navalha_tex', tex_dir / f'{p.NAME}_Navalha.png')
    img = bpy.data.images.load(str(tex_dir / f'{p.NAME}_Navalha.png'))   # the generated image is not saved in the .blend (black)
    uv = o.data.uv_layers.new(name='UVMap'); gx, gy = RAZOR['grip']
    for lp in o.data.loops:
        co = o.data.vertices[lp.vertex_index].co
        col = gx + co.x * RAZOR['ppm']; row = gy - co.z * RAZOR['ppm']
        uv.data[lp.index].uv = ((col - c0) / (c1 - c0), 1 - (row - r0) / (r1 - r0))
    d = (tail - head).normalized(); a = math.radians(RAZOR['angle'])
    x = (Vector((0, -1, 0)) * math.cos(a) + d * math.sin(a)).normalized(); z = Vector((0, 0, 1)); y = z.cross(x)
    R = Matrix((x, y, z)).transposed().to_4x4()   # columns: sheet x -> blade direction, sheet up -> +Z
    fist = tail + d * RAZOR['ahead'] + Vector((0, 0, -RAZOR['below']))
    o.data.transform(Matrix.Translation(fist) @ R); made['Navalha'] = (o, img)
    # Flask: in the fist, bottle across the palm with the cork out of the thumb side (forward).
    m = W.component(rgb, FLASK['box']); o = flask_mesh(p, m)
    _, (r0, r1, c0, c1) = W.texture(p, rgb, m, dict(box=FLASK['box']), f'{p.NAME}_Frasco_tex', tex_dir / f'{p.NAME}_Frasco.png')
    img = bpy.data.images.load(str(tex_dir / f'{p.NAME}_Frasco.png'))
    uv = o.data.uv_layers.new(name='UVMap'); cx = (FLASK['box'][0] + FLASK['box'][1]) / 2; y1 = FLASK['box'][3]
    for lp in o.data.loops:
        co = o.data.vertices[lp.vertex_index].co
        col = cx + co.x * FLASK['ppm']; row = y1 - co.z * FLASK['ppm']
        uv.data[lp.index].uv = ((col - c0) / (c1 - c0), 1 - (row - r0) / (r1 - r0))
    mid = (FLASK['box'][3] - FLASK['box'][1]) / 2 / FLASK['ppm']
    Rf = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0))).to_4x4()   # bottle up (z) -> forward (-Y)
    o.data.transform(Matrix.Translation(palm + Vector((0, 0, -.02))) @ Rf @ Matrix.Translation((0, 0, -mid))); made['Frasco'] = (o, img)
    objs = {}
    for slot, (o, img) in made.items():
        o.name = f'{p.NAME}_{slot}_000'; o.data.name = o.name
        for f in o.data.polygons:
            f.use_smooth = slot == 'Frasco'
        g = o.vertex_groups.new(name=slot); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        mat = bpy.data.materials.new(o.name); mat.use_nodes = True
        t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.name = 'Image Texture'; t.image = img
        mat.node_tree.links.new(t.outputs[0], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat)
        sil = o.vertex_groups.new(name='silhouette'); sil.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        attr = o.data.color_attributes.new('silhouette', 'FLOAT_COLOR', 'POINT')
        for d in attr.data:
            d.color = (1, 1, 0, 1)   # outline on, no toon band (thin painted props)
        o.data.color_attributes.active_color = attr
        for cl in list(o.users_collection):
            cl.objects.unlink(o)
        bpy.data.collections[p.NAME].objects.link(o)
        o.parent = rig; o.modifiers.new('Armature', 'ARMATURE').object = rig
        objs[slot] = o
    print('PROPS', {k: (len(o.data.polygons), [round(v, 3) for v in o.dimensions]) for k, o in objs.items()})
    return objs


# ----------------------------------------------------------------------------- authored clips
K = clips.K
RELAX = ((.3, .02, -.95), (.2, -.12, -.97))
RAZOR_LOW = ((.28, -.05, -.96), (.12, -.75, -.65))   # forearm forward, razor out in front of the hip
MK = dict(clips.BASE, hips=(0, 0, -.03), yaw=0, pitch=0, roll=0, chest=(5, 0, 0), chest2=(0, 0, 0),
          armL=RELAX, armR=RAZOR_LOW, fistL=.3, fistR=GRIP, head=(0, 0),
          footL=((.04, 0, 0), 'world'), footR=((.03, .06, 0), 'world'), hintL=(0, -1, 0), hintR=(0, -1, 0),
          modeL=('flat', 0), modeR=('flat', 0))


def authored(cfg):
    dur, hit = cfg['fumaca']
    return {
        # Street stance: loose bounce on the knees, shoulders rolling, razor low in front.
        'idle': (2.0, True, [
            K(0, MK),
            K(.5, hips=(0, 0, -.06), yaw=4, chest=(8, 0, -3), head=(4, -4)),
            K(1.0, MK, yaw=0),
            K(1.5, hips=(0, 0, -.06), yaw=-4, chest=(8, 0, 3), head=(4, 4)),
            K(2.0, MK)]),
        # Smoke bomb: right hand up and back, then slammed to the floor in front of the feet on the hit time
        # (the cloud bursts there), crouched, and back up.
        'smoke': (dur, False, [
            K(0, MK),
            K(hit * .45, hips=(0, .02, -.08), chest=(-4, 0, 0), armR=((.35, .3, .88), (.15, .25, .96)), head=(-4, 0)),
            K(hit, hips=(0, -.06, -.36), chest=(32, 0, 0), chest2=(10, 0, 0), armR=((.18, -.55, -.82), (.05, -.3, -.95)),
              armL=((.55, .2, -.8), (.4, .1, -.9)), footR=((.03, -.1, 0), 'world'), head=(-18, 0)),
            K(hit + (dur - hit) * .4, hips=(0, -.04, -.3), chest=(24, 0, 0), chest2=(6, 0, 0), head=(-12, 0)),
            K(dur, MK)]),
        'hit': (.3, False, [
            K(0, MK),
            K(.08, hips=(0, .06, -.06), chest=(-14, 0, 0), chest2=(-6, 0, 0), armL=((.75, .3, -.5), (.6, .2, -.6)),
              armR=((.75, .3, -.5), (.6, .2, -.6)), head=(-12, 0)),
            K(.3, MK)]),
        'dead': (1.0, False, [
            K(0, MK),
            K(.35, hips=(0, .1, -.32), chest=(-22, 0, 0), armL=((.8, .1, -.4), (.8, -.2, -.4)), armR=((.8, .1, -.4), (.8, -.2, -.4)),
              head=(-18, 0), footL=((-.02, -.1, 0), 'world'), footR=((-.08, .1, 0), 'world')),
            K(1.0, hips=(0, .45, -.8), pitch=-85, chest=(0, 0, 0), chest2=(0, 0, 0), armL=((.9, .3, 0), (.9, .3, -.1)),
              armR=((.85, .4, 0), (.8, .5, 0)), footL=((.05, -.75, .1), 'body'), footR=((-.1, -.8, .05), 'body'),
              hintL=(0, 0, 1), hintR=(0, 0, 1), modeL=('flat', -55), modeR=('flat', -55), head=(0, 0))]),
        # Razor raised beside the head, weight on one hip, chin up.
        'victory': (1.6, True, [
            K(0, MK, hips=(.03, 0, -.03), roll=-3, chest=(-4, 0, 4), armR=((.45, -.2, .87), (.1, -.35, .93)), head=(-8, -6)),
            K(.8, hips=(.03, 0, -.05), chest=(-6, 0, 5)),
            K(1.6, hips=(.03, 0, -.03), chest=(-4, 0, 4))]),
    }


# ----------------------------------------------------------------------------- captured clips
def captured(p, cfg, rig):
    k = rig.data.bones['Base'].head_local.z / T_POSE_HIPS
    run = RUN_TRAVEL * k / cfg['speed']   # the stance foot slides at MALOKA.speed
    return {
        'run': dict(file='mixamo-run.fbx', loop=True, duration=run, sway=0, blend_s=0),
        'jump': dict(file='mixamo-jump.fbx', loop=False, segment=[.66, 1.34], duration=.6, airborne=True),
        'dodge': dict(file='mixamo-dodge.fbx', loop=False, segment=[.1, 1.25], duration=cfg['dodge']),
        # The user's Stabbing.fbx (28/10/2026) stabs with the LEFT hand: wind-up (hand pulled back) peaks at
        # 0.35 s, the thrust is furthest forward (0.68 m from the hips) at 0.85-0.95 s and back by 1.4 s.
        # Mirrored onto the razor hand after the retarget (mirror=True).
        'slash': dict(file='mixamo-stab.fbx', loop=False, segment=[.35, 1.4], duration=cfg['navalha'][0], contact=cfg['navalha'][1],
                      source_contact=.85, mirror=True, clear=False, spine=True),
        # Overhand throw: wind-up from 0.2 s, release at 0.86 s, settled by 1.3 s.
        'throw': dict(file='mixamo-throw.fbx', loop=False, segment=[.2, 1.3], duration=cfg['veneno'][0], contact=cfg['veneno'][1], source_contact=.86),
    }


def mirror(rig, act):
    """Mirror a retargeted clip left <-> right, frame by frame: each bone takes its partner's change from rest
    (armature space) reflected in x, D' = S D S, so bone rolls do not matter (Blender's paste-flipped works in
    bone space and, with this rig's rolls, raised the stabbing arm over the head). Prop bones keep following
    the hand."""
    sc = bpy.context.scene; S = Matrix.Diagonal((-1, 1, 1, 1))
    other = lambda n: 'R_' + n[2:] if n.startswith('L_') else 'L_' + n[2:] if n.startswith('R_') else n
    depth = lambda b: 0 if b.parent is None else 1 + depth(b.parent)
    bones = sorted((pb for pb in rig.pose.bones if pb.name not in ('Navalha', 'Frasco')), key=lambda pb: depth(pb.bone))
    rest = {b.name: b.matrix_local for b in rig.data.bones}
    rig.animation_data.action = act
    frames = sorted({round(k.co.x) for fc in clips._fcurves(act) for k in fc.keyframe_points})
    posed = {}
    for f in frames:
        sc.frame_set(f + 1); sc.frame_set(f)
        posed[f] = {pb.name: pb.matrix.copy() for pb in bones}
    rig.animation_data.action = None
    vals = {}
    for f in frames:   # parents first: pb.matrix needs the parent's pose of the same frame
        for pb in bones:
            src = other(pb.name)
            pb.matrix = S @ (posed[f][src] @ rest[src].inverted()) @ S @ rest[pb.name]
            bpy.context.view_layer.update()
        vals[f] = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in bones}
    rig.animation_data.action = act; prev = {}
    for f in frames:   # keys written with the action assigned and no update in between (it would re-pose)
        for pb in bones:
            q, loc = vals[f][pb.name]
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q.negate()
            prev[pb.name] = q; pb.rotation_quaternion = q; pb.location = loc
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    rig.animation_data.action = None


def share_spine(rig, act):
    """Spread the upper-body bend evenly over Waist, Chest1 and Chest2 (each takes a third of the turn from
    the Base to Chest2), keeping Chest2's orientation: the stab's wind-up and thrust twist the trunk, and
    the hard weight lines under the armpits (Chest1/Chest2) and at the waist (Waist/Chest1) stretched up
    to 3.7x when one joint took most of it. Neck, arms and razor follow Chest2, which keeps its pose."""
    sc = bpy.context.scene; chain = [rig.pose.bones[n] for n in ('Waist', 'Chest1', 'Chest2')]
    base = rig.pose.bones['Base']; rest = {pb.name: pb.bone.matrix_local.to_3x3() for pb in chain + [base]}
    rig.animation_data.action = act
    frames = sorted({round(kp.co.x) for fc in clips._fcurves(act) for kp in fc.keyframe_points})
    turn = {}
    for f in frames:
        sc.frame_set(f + 1); sc.frame_set(f)
        a0 = base.matrix.to_3x3() @ rest['Base'].inverted()
        top = chain[-1].matrix.to_3x3() @ rest['Chest2'].inverted()
        turn[f] = (a0, (top @ a0.inverted()).to_quaternion())
    rig.animation_data.action = None
    vals = {}
    for f, (a0, total) in turn.items():
        # evaluate the take at f (Base and the rest of the body), then detach it and pose the chain on top
        rig.animation_data.action = act; sc.frame_set(f + 1); sc.frame_set(f); rig.animation_data.action = None
        for i, pb in enumerate(chain):
            rot = Quaternion().slerp(total, (i + 1) / len(chain)).to_matrix() @ a0 @ rest[pb.name]
            pb.matrix = Matrix.Translation(pb.matrix.translation) @ rot.to_4x4(); bpy.context.view_layer.update()
        vals[f] = [(pb, pb.rotation_quaternion.copy(), pb.location.copy()) for pb in chain]
    rig.animation_data.action = act
    for f, row in vals.items():
        for pb, q, loc in row:
            pb.rotation_quaternion = q; pb.location = loc
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    rig.animation_data.action = None


def grip(rig, act):
    """Right fingers curled around the prop on every key (the takes open the hand)."""
    rig.animation_data.action = act
    frames = sorted({round(k.co.x) for fc in clips._fcurves(act) for k in fc.keyframe_points})
    for f in frames:
        for n, a in (('R_Finger1', 65), ('R_Finger2', 70), ('R_Thumb2', 30)):
            pb = rig.pose.bones[n]; pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = Quaternion((1, 0, 0), math.radians(a * GRIP * CURL)); pb.keyframe_insert('rotation_quaternion', frame=f)
    rig.animation_data.action = None


def key_props(rig, cfg):
    """Scale keys of the prop bones in every clip (constant steps): the razor is put away during the throw,
    the flask is in the hand until the release."""
    dur, hit = cfg['veneno']
    show = {'throw': {'Navalha': [(0, HIDDEN), (dur * .92, 1)], 'Frasco': [(0, 1), (hit, HIDDEN)]},
            'apose': {'Navalha': [(0, HIDDEN)]}, 'PoseTest': {'Navalha': [(0, HIDDEN)]}}
    rig.animation_data_create()
    for act in bpy.data.actions:
        rig.animation_data.action = act
        for bone, default in (('Navalha', 1), ('Frasco', HIDDEN)):
            pb = rig.pose.bones[bone]
            for t, s in show.get(act.name, {}).get(bone, [(0, default)]):
                pb.scale = (s, s, s); pb.keyframe_insert('scale', frame=round(t * clips.FPS))
        for fc in clips._fcurves(act):
            if fc.data_path.endswith('scale'):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'CONSTANT'
    rig.animation_data.action = None


def build(p):
    rig = next(o for o in bpy.data.collections[p.NAME].objects if o.type == 'ARMATURE')
    cfg = config_js(p)
    build_props(p, rig)
    ankles = {S: rig.data.bones[f'{S}_Calf'].tail_local.copy() for S in 'LR'}
    saved, fist = clips.CLIPS, clips.Pose.fist
    clips.CLIPS = authored(cfg); clips.Pose.fist = lambda pose, S, amount=1: fist(pose, S, amount * CURL)
    try:
        made = clips.bake_clips(rig, ankles)
    finally:
        clips.CLIPS, clips.Pose.fist = saved, fist
    info = []; body = [o for s, o in p.parts_by_slot().items() if s in ('Body', 'Head', 'Hand', 'Leg', 'Foot')]
    for name in made:   # the authored fall ended with the shoulder blades 5 cm under the floor
        V.reground(rig, bpy.data.actions[name], body)
    for name, spec in captured(p, cfg, rig).items():
        spec = dict(spec); f = p.CDIR / 'mocap' / spec.pop('file'); flip = spec.pop('mirror', False); clear = spec.pop('clear', True); spine = spec.pop('spine', False)
        # head_margin: the bucket-hat brim (radius ~.15) in the dive roll
        ends = [(f'{S}_{b}', m) for S in 'LR' for b, m in (('Thigh', .1), ('Shoulder', .1), ('UpperArm', .06))] + [('Chest2', .16), ('Chest1', .14), ('Pelvis', .17)]
        info.append(clips.bake_mixamo(rig, ankles, f, name, head_margin=.17, ends_extra=ends, **spec))
        if flip:
            mirror(rig, bpy.data.actions[name])
        # clear=False: the stab thrusts the razor arm across the chest at shoulder height, and opening it until
        # it clears the torso by 11 cm (tame) lifted the hand 32 cm, over the face. The free arm still clears.
        keep = V.clear_arms
        if not clear:
            V.clear_arms = lambda p_, rig_, S, *a, **k: 0 if S == 'R' else keep(p_, rig_, S, *a, **k)
        try:
            V.tame(rig, bpy.data.actions[name], p, fingers=1)
        finally:
            V.clear_arms = keep
        V.untwist(rig, bpy.data.actions[name])
        if spine:
            share_spine(rig, bpy.data.actions[name])
        grip(rig, bpy.data.actions[name])
        V.reground(rig, bpy.data.actions[name], body)
    for a in bpy.data.actions:
        a['fps'] = clips.FPS
    key_props(rig, cfg)
    print('MALOKA_CLIPS', made, info)
