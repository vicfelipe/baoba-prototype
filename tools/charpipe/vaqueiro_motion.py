"""Vaqueiro motion and props: the user's Mixamo takes retargeted to the Lunia rig (clips.bake_mixamo),
the clips without a take authored with clips.py keys, and the lasso coil and the berrante modelled
on references/props.png on their own bones (doc 23).

Clip names belong to the Vaqueiro controller (web/src/vaqueiro-asset.js); timed clips take their
duration and hit time from VAQUEIRO in web/src/config.js. Props show/hide by the scale of their
bone, keyed in every clip so the visibility travels inside the GLB.
"""
import bpy, math, re
import numpy as np
from mathutils import Vector, Matrix, Quaternion
import clips
import cangaceiro_weapons as W   # sheet helpers: load_sheet, component, texture

PPM = 576.0   # props sheet pixels per metre: the coiled lasso is drawn 259 px across for 0.45 m
COIL = dict(box=(309, 651, 211, 470), centre=(437, 340), r_out=129, r_in=65, thick=.022)
HORN = dict(box=(258, 680, 572, 740), grip=(262, 606))   # mouthpiece (left) -> bell (right)
HIDDEN = 1e-3
HORN_TILT = 0    # degrees up while blowing (the yell already tips the head back; 20 pointed it at the sky). Modelled level so the bind pose stays under the hat (check_glb height)
T_POSE_HIPS = 1.043   # Mixamo T-Pose.fbx hips height (mocap_inspect)
RUN_TRAVEL = 2.16     # Running.fbx: hips travel per 0.817 s cycle (mocap_inspect)


def config_js(p):
    """VAQUEIRO numbers from web/src/config.js (single source of the combat times)."""
    src = (p.ROOT / 'web/src/config.js').read_text(encoding='utf-8')
    block = src[src.index('export const VAQUEIRO'):]; block = block[:block.index('\n};')]
    get = lambda key, field: float(re.search(rf'\b{key}:\s*\{{[^}}]*\b{field}:\s*([\d.]+)', block).group(1))
    return dict(speed=float(re.search(r'\bspeed:\s*([\d.]+)', block).group(1)),
                attack=(get('attack', 'dur'), get('attack', 'hit')), laco=(get('laco', 'dur'), get('laco', 'hit')),
                pull=get('pull', 'dur'), berrante=(get('berrante', 'dur'), get('berrante', 'hit')), dodge=get('dodge', 'dur'))


# ----------------------------------------------------------------------------- props
def horn_mesh(p, m):
    """Berrante lofted column by column on the sheet (round section); each column keeps the run nearest
    to the previous centre, which drops the carrying strap under the horn."""
    x0, x1 = HORN['box'][:2]; gx, gy = HORN['grip']
    rings, prev = [], gy
    for c in list(range(x0 + 2, x1, 6)) + [x1 - 1]:
        col = m[:, c]; runs = []; r = 0
        while r < len(col):
            if col[r]:
                a = r
                while r < len(col) and col[r]: r += 1
                runs.append((a, r - 1))
            r += 1
        runs = [u for u in runs if u[1] - u[0] >= 2]
        if not runs:
            continue
        a, b = min(runs, key=lambda u: abs((u[0] + u[1]) / 2 - prev)); prev = (a + b) / 2
        az = (b - a + 1) / 2 / PPM
        rings.append(p.ring_x((c - gx) / PPM, 0, (gy - (a + b) / 2) / PPM, az, az, 2.0, 14))
    return p.loft('horn', rings)


def coil_mesh(p):
    """Flat ring of rope loops (torus with an oval tube) in the local XZ plane, centre at the origin."""
    R = (COIL['r_out'] + COIL['r_in']) / 2 / PPM; a = (COIL['r_out'] - COIL['r_in']) / 2 / PPM; b = COIL['thick']
    rings = []
    for i in range(48):
        th = 2 * math.pi * i / 48
        rings.append([((R + a * math.cos(f)) * math.cos(th), b * math.sin(f), (R + a * math.cos(f)) * math.sin(th))
                      for f in np.linspace(0, 2 * math.pi, 12, endpoint=False)])
    o = p.loft('coil', rings + [rings[0]], caps=False)
    return o


def build_props(p, rig):
    rgb = W.load_sheet(p.CDIR / p.CFG['props_reference']); tex_dir = p.OUT / 'textures'
    bones = rig.data.bones
    # Mouth: front of the face at the lips (side mask, z 1.665); fist: under the palm, like the weapons.
    mouth = Vector((0, -.095, 1.665))
    h = bones['R_Hand']; fist = h.head_local + (h.tail_local - h.head_local) * .55 + Vector((0, 0, -.03))
    p.select_only([rig]); bpy.ops.object.mode_set(mode='EDIT'); eb = rig.data.edit_bones
    e = eb.new('Berrante'); e.head = mouth; e.tail = mouth + Vector((0, -.08, 0)); e.parent = eb['Head']
    e = eb.new('R_Laco'); e.head = fist; e.tail = fist + Vector((-.08, 0, 0)); e.parent = eb['R_Hand']
    bpy.ops.object.mode_set(mode='OBJECT')
    made = {}
    # Berrante: length forward (-Y), sheet top -> up, mouthpiece at the lips; the taunt clip tilts it up.
    m = W.component(rgb, HORN['box']); o = horn_mesh(p, m)
    _, (r0, r1, c0, c1) = W.texture(p, rgb, m, dict(box=HORN['box']), f'{p.NAME}_Berrante_tex', tex_dir / f'{p.NAME}_Berrante.png')
    img = bpy.data.images.load(str(tex_dir / f'{p.NAME}_Berrante.png'))   # the generated image is not saved in the .blend (black)
    uv = o.data.uv_layers.new(name='UVMap')
    for lp in o.data.loops:
        co = o.data.vertices[lp.vertex_index].co
        col = HORN['grip'][0] + co.x * PPM; row = HORN['grip'][1] - co.z * PPM
        uv.data[lp.index].uv = ((col - c0) / (c1 - c0), 1 - (row - r0) / (r1 - r0))
    R = Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1))).to_4x4()   # columns: x -> -Y (forward), y -> +X, z -> +Z
    o.data.transform(Matrix.Translation(mouth) @ R); made['Berrante'] = (o, img, 'Berrante')
    # Lasso coil: hangs from the fist in the arm's vertical plane; the sheet is the coil seen face-on.
    m = W.component(rgb, COIL['box']); o = coil_mesh(p)
    _, (r0, r1, c0, c1) = W.texture(p, rgb, m, dict(box=COIL['box']), f'{p.NAME}_Laco_tex', tex_dir / f'{p.NAME}_Laco.png')
    img = bpy.data.images.load(str(tex_dir / f'{p.NAME}_Laco.png'))
    uv = o.data.uv_layers.new(name='UVMap')
    for lp in o.data.loops:
        co = o.data.vertices[lp.vertex_index].co
        col = COIL['centre'][0] + co.x * PPM; row = COIL['centre'][1] - co.z * PPM
        uv.data[lp.index].uv = ((col - c0) / (c1 - c0), 1 - (row - r0) / (r1 - r0))
    ctr = fist + Vector((0, 0, -(COIL['r_out'] / PPM) + .015))
    o.data.transform(Matrix.Translation(ctr)); made['Laco'] = (o, img, 'R_Laco')
    objs = {}
    for slot, (o, img, bone) in made.items():
        o.name = f'{p.NAME}_{slot}_000'; o.data.name = o.name
        for f in o.data.polygons:
            f.use_smooth = True
        g = o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        mat = bpy.data.materials.new(o.name); mat.use_nodes = True
        t = mat.node_tree.nodes.new('ShaderNodeTexImage'); t.name = 'Image Texture'; t.image = img
        mat.node_tree.links.new(t.outputs[0], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat)
        sil = o.vertex_groups.new(name='silhouette'); sil.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        attr = o.data.color_attributes.new('silhouette', 'FLOAT_COLOR', 'POINT')
        for d in attr.data:
            d.color = (1, 1, 0, 1)
        o.data.color_attributes.active_color = attr
        for cl in list(o.users_collection):
            cl.objects.unlink(o)
        bpy.data.collections[p.NAME].objects.link(o)
        o.parent = rig; o.modifiers.new('Armature', 'ARMATURE').object = rig
        objs[slot] = o
    print('PROPS', {k: len(o.data.polygons) for k, o in objs.items()})
    return objs


# ----------------------------------------------------------------------------- authored clips
K = clips.K
RELAX = ((.45, .05, -.89), (.3, -.15, -.94))   # arms clear the wide gibao (shoulder joint at x .20, chest .25)
VQ = dict(clips.BASE, hips=(0, 0, -.025), yaw=0, pitch=0, roll=0, chest=(4, 0, 0), chest2=(0, 0, 0),
          armL=RELAX, armR=RELAX, fistL=.5, fistR=.5, head=(0, 0),
          footL=((-.05, 0, 0), 'world'), footR=((-.05, 0, 0), 'world'), hintL=(0, -1, 0), hintR=(0, -1, 0),
          modeL=('flat', 0), modeR=('flat', 0))


def authored(cfg):
    return {
        # Standing guard of a heavy man: slow breath, weight settling, hands loose.
        'idle': (2.4, True, [
            K(0, VQ),
            K(1.2, hips=(0, 0, -.04), chest=(7, 0, 0), chest2=(2, 0, 0), armL=((.47, .07, -.88), (.32, -.12, -.94)),
              armR=((.47, .07, -.88), (.32, -.12, -.94)), head=(3, 0)),
            K(2.4, VQ)]),
        'hit': (.3, False, [
            K(0, VQ),
            K(.08, hips=(0, .06, -.06), chest=(-14, 0, 0), chest2=(-6, 0, 0), armL=((.75, .3, -.5), (.6, .2, -.6)),
              armR=((.75, .3, -.5), (.6, .2, -.6)), head=(-12, 0)),
            K(.3, VQ)]),
        'dead': (1.0, False, [
            K(0, VQ),
            K(.35, hips=(0, .1, -.32), chest=(-22, 0, 0), armL=((.8, .1, -.4), (.8, -.2, -.4)), armR=((.8, .1, -.4), (.8, -.2, -.4)),
              head=(-18, 0), footL=((-.02, -.1, 0), 'world'), footR=((-.08, .1, 0), 'world')),
            K(1.0, hips=(0, .45, -.8), pitch=-85, chest=(0, 0, 0), chest2=(0, 0, 0), armL=((.9, .3, 0), (.9, .3, -.1)),
              armR=((.85, .4, 0), (.8, .5, 0)), footL=((.05, -.75, .1), 'body'), footR=((-.1, -.8, .05), 'body'),
              hintL=(0, 0, 1), hintR=(0, 0, 1), modeL=('flat', -55), modeR=('flat', -55), head=(0, 0))]),   # toes up, relaxed (flat in the world folded the ankle 90 deg, x2.2)
        # Right fist up, chest out.
        # (a hand on the belt went 14 cm into the wide gibao: the left arm hangs relaxed)
        'victory': (1.6, True, [
            K(0, VQ, chest=(-5, 0, 0), armR=((.3, -.1, .95), (.1, 0, 1)), fistR=1, armL=RELAX, fistL=.4, head=(-8, 0)),
            K(.8, hips=(0, 0, -.04), chest=(-7, 0, 0)),
            K(1.6, hips=(0, 0, -.025), chest=(-5, 0, 0))]),
    }


# ----------------------------------------------------------------------------- captured clips
def captured(p, cfg, rig):
    k = rig.data.bones['Base'].head_local.z / T_POSE_HIPS
    run = RUN_TRAVEL * k / cfg['speed']   # the stance foot slides at VAQUEIRO.speed
    return {
        'run': dict(file='mixamo-run.fbx', loop=True, duration=run, sway=0, blend_s=0),
        'jump': dict(file='mixamo-jump.fbx', loop=False, segment=[.66, 1.34], duration=.6, airborne=True),
        'dodge': dict(file='mixamo-dodge.fbx', loop=False, segment=[.1, 1.25], duration=cfg['dodge']),
        # Right hook; the hand is furthest forward at 0.40 s.
        'attack': dict(file='mixamo-attack.fbx', loop=False, duration=cfg['attack'][0], contact=cfg['attack'][1], source_contact=.40),
        # Overhand throw: wind-up from 0.2 s, release at 0.86 s, settled by 1.3 s.
        'lasso': dict(file='mixamo-lasso.fbx', loop=False, segment=[.2, 1.3], duration=cfg['laco'][0], contact=cfg['laco'][1], source_contact=.86),
        # One stroke of the rope pull (hands from x 0 to -0.79 on the left side): the controller turns the
        # hero so that side faces the lassoed enemy.
        'pull': dict(file='mixamo-pull.fbx', loop=False, segment=[4.3, 5.9], duration=cfg['pull']),
        # Rises from the crouch and yells with both hands at the mouth (1.05-2.0 s): the berrante goes there.
        'taunt': dict(file='mixamo-taunt.fbx', loop=False, segment=[.9, 2.55], duration=cfg['berrante'][0]),
    }


def key_props(rig, cfg):
    """Scale keys of the prop bones in every clip (constant steps): the coil leaves the hand at the
    lasso release, the berrante is at the lips while the hands are."""
    seg = .9, 2.55; dur = cfg['berrante'][0]; to_clip = lambda ts: (ts - seg[0]) * dur / (seg[1] - seg[0])
    show = {'lasso': {'R_Laco': [(0, 1), (cfg['laco'][1], HIDDEN)]},
            'taunt': {'Berrante': [(0, HIDDEN), (to_clip(1.1), 1), (to_clip(2.0), HIDDEN)]}}
    rig.animation_data_create()
    for act in bpy.data.actions:
        if act.name == 'PoseTest':
            continue
        rig.animation_data.action = act
        if act.name == 'taunt':   # tilt the horn up at the lips (rotation about the bone head, rest frame)
            pb = rig.pose.bones['Berrante']; rq = pb.bone.matrix_local.to_quaternion()
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = rq.inverted() @ Quaternion((1, 0, 0), math.radians(-HORN_TILT)) @ rq
            pb.keyframe_insert('rotation_quaternion', frame=0)
        for bone in ('Berrante', 'R_Laco'):
            pb = rig.pose.bones[bone]
            for t, s in show.get(act.name, {}).get(bone, [(0, HIDDEN)]):
                pb.scale = (s, s, s); pb.keyframe_insert('scale', frame=round(t * clips.FPS))
        for fc in clips._fcurves(act):
            if fc.data_path.endswith('scale'):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'CONSTANT'
    rig.animation_data.action = None


def torso_depth(p, q):
    """How far a rest-frame point lies inside the measured torso (front width, side depth; superellipse 2.3)."""
    if not 1.0 < q.z < 1.56:
        return -1
    hw = p.front_hw(q.z); yf, yb = p.side_at(q.z); yc, d = (yf + yb) / 2, (yb - yf) / 2
    r = (abs(q.x) / hw) ** 2.3 + (abs(q.y - yc) / d) ** 2.3
    return (1 - r ** (1 / 2.3)) * min(hw, d)


def clear_arms(p, rig, S, s, fwd, margin=.11, step=3, most=15):
    """Move the arm until the elbow, forearm and hand clear the torso: each step opens it (about the chest's
    forward axis) or brings it forward (about its side axis), whichever clears more. Opening alone left the
    pull's hand over the belly."""
    up = rig.pose.bones[f'{S}_UpperArm']; side = (rig.pose.bones['Chest2'].matrix.to_3x3() @ Vector((1, 0, 0))).normalized()

    def worst():
        pts = [up.head.lerp(up.tail, t) for t in (.6, 1)] + [rig.pose.bones[f'{S}_{b}'].head.lerp(rig.pose.bones[f'{S}_{b}'].tail, t)
                                                         for b in ('ForeArm', 'Hand') for t in (0, .5, 1)]
        return max(torso_depth(p, rig.data.bones[tb].matrix_local @ rig.pose.bones[tb].matrix.inverted() @ q) + margin
                   for q in pts for tb in ('Chest1', 'Chest2'))

    def turn(axis, deg):
        h = up.head.copy(); r = Matrix.Rotation(math.radians(deg), 4, axis)
        up.matrix = Matrix.Translation(h) @ r @ Matrix.Translation(-h) @ up.matrix; bpy.context.view_layer.update()
    n = 0
    while n < most and worst() > 0:
        start = up.matrix.copy(); best = None
        for axis, deg in ((fwd, s * step), (side, -step)):
            turn(axis, deg); w = worst()
            if axis is side and rig.pose.bones[f'{S}_Hand'].head.z > up.head.z - .05:   # forward, never up to the face
                w = 9.
            up.matrix = start; bpy.context.view_layer.update()
            if best is None or w < best[0]: best = (w, axis, deg)
        turn(best[1], best[2]); n += 1
    return n


def tame(rig, act, p, clavicle=.3, fingers=.5, toe=.5):
    """Fit the Mixamo takes to this body. Clavicle at 30% (the upper arm keeps its world direction): the take's
    shrugs stretched the armpit. Glove fingers and boot toes at 50%: a mitten and a stiff boot do not bend like
    bare hands and feet. Arms open until they clear the gibao (clear_arms): the Mixamo body is narrower, the
    elbows went 5 cm into it and the pull crossed the left forearm 6.7 cm into the chest."""
    sc = bpy.context.scene; rig.animation_data.action = act; one = Quaternion()
    frames = sorted({round(k.co.x) for fc in clips._fcurves(act) for k in fc.keyframe_points})
    for f in frames:
        sc.frame_set(f + 1); sc.frame_set(f)
        for S, s in (('L', 1), ('R', -1)):
            sh, up = rig.pose.bones[f'{S}_Shoulder'], rig.pose.bones[f'{S}_UpperArm']
            q = sh.rotation_quaternion.copy(); q2 = one.slerp(q, clavicle)
            rel = (sh.bone.matrix_local.inverted() @ up.bone.matrix_local).to_quaternion()
            up.rotation_quaternion = rel.inverted() @ q2.inverted() @ q @ rel @ up.rotation_quaternion
            sh.rotation_quaternion = q2
            for n, k in (('Finger1', fingers), ('Finger2', fingers), ('Thumb1', fingers), ('Thumb2', fingers), ('Toe1', toe)):
                pb = rig.pose.bones[f'{S}_{n}']; pb.rotation_quaternion = one.slerp(pb.rotation_quaternion, k)
            bpy.context.view_layer.update()
            ch = rig.pose.bones['Chest2']; fwd = (ch.matrix.to_3x3() @ (ch.bone.matrix_local.to_3x3().inverted() @ Vector((0, -1, 0)))).normalized()
            clear_arms(p, rig, S, s, fwd)
            for pb in [sh, up] + [rig.pose.bones[f'{S}_{n}'] for n in ('Finger1', 'Finger2', 'Thumb1', 'Thumb2', 'Toe1')]:
                pb.keyframe_insert('rotation_quaternion', frame=f)
    rig.animation_data.action = None


def untwist(rig, act, limits=(('Calf', 0), ('Hand', 80))):
    """Captured takes put up to 66 deg of twist in the shin (a knee is a hinge) and 139 deg in the wrist
    (joint_twist limits 30/100). Keep the swing; the shin twist moves into the foot (planted feet keep
    their heading), the wrist twist is clamped. Twist as in joint_twist: q = swing * twist(Y)."""
    sc = bpy.context.scene; y = Vector((0, 1, 0)); rig.animation_data.action = act
    frames = sorted({round(k.co.x) for fc in clips._fcurves(act) for k in fc.keyframe_points})
    for f in frames:
        sc.frame_set(f + 1); sc.frame_set(f)
        for S in 'LR':
            for b, lim in limits:
                pb = rig.pose.bones[f'{S}_{b}']; q = pb.rotation_quaternion.copy()
                sw = y.rotation_difference(q @ y); tw = sw.inverted() @ q
                ang = tw.angle * (1 if tw.axis.y >= 0 else -1); ang = (ang + math.pi) % (2 * math.pi) - math.pi
                keep = max(-math.radians(lim), min(math.radians(lim), ang))
                if abs(ang - keep) < 1e-4:
                    continue
                pb.rotation_quaternion = sw @ Quaternion(y, keep); pb.keyframe_insert('rotation_quaternion', frame=f)
                if b == 'Calf':
                    ch = rig.pose.bones[f'{S}_Foot']; rel = (pb.bone.matrix_local.inverted() @ ch.bone.matrix_local).to_quaternion()
                    ch.rotation_quaternion = rel.inverted() @ Quaternion(y, ang - keep) @ rel @ ch.rotation_quaternion
                    ch.keyframe_insert('rotation_quaternion', frame=f)
    rig.animation_data.action = None


def reground(rig, act, meshes):
    """Floor clamp again after tame/untwist (they lower shoulders and toes): lift Base by the lowest vertex of
    the deformed body. Bone ends with a margin missed the boot rolling onto its outer edge (3.7 cm)."""
    sc = bpy.context.scene; rig.animation_data.action = act; base = rig.pose.bones['Base']
    frames = sorted({round(k.co.x) for fc in clips._fcurves(act) for k in fc.keyframe_points})

    def lowest():
        dg = bpy.context.evaluated_depsgraph_get(); out = 9.
        for o in meshes:
            me = o.evaluated_get(dg).to_mesh(); co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co)
            out = min(out, float((np.array(o.matrix_world) @ np.c_[co.reshape(-1, 3), np.ones(len(me.vertices))].T)[2].min()))
            o.evaluated_get(dg).to_mesh_clear()
        return out
    for f in frames:
        sc.frame_set(f + 1); sc.frame_set(f)
        low = lowest()
        if low < -.004:
            base.matrix = Matrix.Translation((0, 0, -low)) @ base.matrix; bpy.context.view_layer.update()
            base.keyframe_insert('location', frame=f)
    rig.animation_data.action = None


def build(p):
    rig = next(o for o in bpy.data.collections[p.NAME].objects if o.type == 'ARMATURE')
    cfg = config_js(p)
    build_props(p, rig)
    ankles = {S: rig.data.bones[f'{S}_Calf'].tail_local.copy() for S in 'LR'}
    saved = clips.CLIPS; clips.CLIPS = authored(cfg)
    try:
        made = clips.bake_clips(rig, ankles)
    finally:
        clips.CLIPS = saved
    info = []; body = [o for s, o in p.parts_by_slot().items() if s in ('Body', 'Head', 'Hand', 'Leg', 'Foot', 'Support')]
    for name, spec in captured(p, cfg, rig).items():
        spec = dict(spec); f = p.CDIR / 'mocap' / spec.pop('file')
        # head_margin: the hat brim (radius .19) went 8.5 cm into the floor in the dive roll with the default .1
        # knees: the perneiras with their pads (~.13 from the bone) went 5 cm into the floor in the roll
        # ... the shoulders and upper back (10.7 cm under the floor in the roll) and the side of the hips (5 cm)
        ends = [(f'{S}_{b}', m) for S in 'LR' for b, m in (('Thigh', .13), ('Shoulder', .13), ('UpperArm', .08))] + [('Chest2', .2), ('Chest1', .17), ('Pelvis', .21)]
        info.append(clips.bake_mixamo(rig, ankles, f, name, head_margin=.2, ends_extra=ends, **spec))
        tame(rig, bpy.data.actions[name], p)
        untwist(rig, bpy.data.actions[name])
        reground(rig, bpy.data.actions[name], body)
    for a in bpy.data.actions:
        a['fps'] = clips.FPS
    key_props(rig, cfg)
    print('VAQUEIRO_CLIPS', made, info)
