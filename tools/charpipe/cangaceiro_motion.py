"""Cangaceiro motion: key poses on a fresh Mixamo control rig (IK arms and legs), baked to Lunia.

No imported capture or other character's action (doc 21). Built on the lessons of doc 20:
- Pose to pose with monotone cubic curves; loops add periodic layers (breath, weight shift).
- Overlap: spine/neck/head sample the take a little later than the pelvis.
- Weapons drive the hands: every frame has a weapon pose (grip point + aim) and the IK hands
  are placed so the weapon bone (rigid under the hand) lands on it; the left hand cups the
  bacamarte forend. Free hands use the same frames with an imaginary object in the fist.
- IK feet with heel/ball pivots; the run slides the stance foot at CANGACEIRO.speed.
- Tunic flaps are damped springs kept out of the thighs. Weapon visibility is a scale key on
  the weapon bone; the peixeira leaves the hand at the release time of config.js.
"""
import bpy, math, re, bisect, addon_utils
from mathutils import Vector, Matrix, Quaternion
from curupira_motion import slopes, hermite
import cangaceiro_weapons as W

D = math.radians
SIDES = (('L', 'Left', 1), ('R', 'Right', -1))
FINGERS = [('Index', (.8, .85, .7)), ('Middle', (1, 1, .8)), ('Ring', (1.1, 1.05, .85)), ('Pinky', (1.2, 1.1, .9))]
OBJS = ('g', 'pR', 'pL', 'k', 'lh', 'rh')
CH = [g + '.' + k for g in ('root', 'pelvis', 'spine', 'neck', 'head') for k in ('pitch', 'yaw', 'roll')] + ['root.x', 'root.y', 'root.z']
CH += [S + 'f.' + k for S in 'LR' for k in ('x', 'y', 'z', 'yaw', 'pitch')]
CH += [S + '.' + k for S in 'LR' for k in ('curl', 'thumb', 'shrug')] + ['L.free']
CH += [o + '.' + k for o in OBJS for k in ('x', 'y', 'z', 'yaw', 'pitch', 'roll')]
# Floor clamp after the IK (captured takes): authoring-skeleton points and our thickness above them.
FLOOR_PTS = [('LeftLeg', .07), ('RightLeg', .07), ('LeftFoot', .08), ('RightFoot', .08), ('LeftToeBase', .03), ('RightToeBase', .03),
             ('LeftHand', .05), ('RightHand', .05), ('Head', .30), ('Spine1', .2), ('Spine2', .2), ('LeftArm', .1), ('RightArm', .1), ('Hips', .16)]
DELAY = {'spine': .03, 'neck': .06, 'head': .08, 'shrug': .04, 'curl': .05, 'thumb': .05}
HEEL, BALL = .07, -.245      # ground pivots from the ankle: heel behind, toe tip in front (a pivot behind the
                             # rigid toe sank the tip 5 cm into the floor on take-off)


def rot(pitch=0, yaw=0, roll=0):
    """pitch + bends forward (-Y), yaw + turns to the character's left (+X), roll + tilts left."""
    return Matrix.Rotation(D(yaw), 3, 'Z') @ Matrix.Rotation(D(roll), 3, 'Y') @ Matrix.Rotation(D(pitch), 3, 'X')


# Weapon aimed straight ahead: length -> forward (-Y), side -> +X, top -> +Z.
AIM0 = Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1)))


def aim(yaw, pitch, roll):
    """Weapon orientation: yaw + to the left, pitch + muzzle up, roll + top toward the left."""
    return Matrix.Rotation(D(yaw), 3, 'Z') @ Matrix.Rotation(D(-pitch), 3, 'X') @ Matrix.Rotation(D(-roll), 3, 'Y') @ AIM0


def delay(ch):
    g, k = ch.split('.')
    if g in ('root', 'pelvis') or g.endswith('f') or g in OBJS:
        return 0
    return DELAY.get(g, DELAY.get(k, 0))


class Take:
    """One continuous performance split into game clips [(name, t0, t1)]; see curupira_motion.Take.
    hands = (right source, left source): 'g' bacamarte, 'pR'/'pL' pistols, 'k' knife, 'lh'/'rh' free fists.
    space = 'world' (objects follow only the root translation) or 'root' (they follow the whole hips)."""

    def __init__(self, clips, dur, base, keys=(), loop=False, layer=None, proc=None, hands=('g', 'g'), space='world', show=None, release=None,
                 capture=None):
        self.clips, self.dur, self.loop, self.layer, self.proc = clips, dur, loop, layer, proc
        self.capture = capture   # build.mocap spec: hips, spine, head and feet come from a Mixamo take (Capture)
        self.hands, self.space, self.show, self.release = hands, space, show, release
        poses, cur = [], dict(base)
        for t, ov in (keys or [(0, {})]):
            cur = dict(cur)
            for k, v in ov.items():
                if k.endswith('+'): cur[k[:-1]] = base[k[:-1]] + v
                else: cur[k] = base[k] if v is None else v
            poses.append((t, cur))
        if loop and len(poses) > 1:
            poses = [(t - dur, p) for t, p in poses[-2:]] + poses + [(t + dur, p) for t, p in poses[:2]]
        self.ts = [t for t, _ in poses]
        self.curves = {c: ([p[c] for _, p in poses], slopes(self.ts, [p[c] for _, p in poses]) if len(poses) > 1 else [0.0]) for c in CH}

    def raw(self, t):
        P = {c: (vs[0] if len(vs) == 1 else hermite(self.ts, vs, ms, t)) for c, (vs, ms) in self.curves.items()}
        if self.layer:
            for k, v in self.layer(t).items(): P[k] += v
        if self.proc:
            self.proc(t, P)
        return P

    def sample(self, t):
        cache, out = {}, {}
        for c in CH:
            tt = t - delay(c); tt = tt % self.dur if self.loop else max(0.0, tt)
            key = round(tt, 6)
            if key not in cache: cache[key] = self.raw(tt)
            out[c] = cache[key][c]
        return out


def obj(o, x, y, z, yaw=0, pitch=0, roll=0):
    return {o + '.x': x, o + '.y': y, o + '.z': z, o + '.yaw': yaw, o + '.pitch': pitch, o + '.roll': roll}


class Capture:
    """A Mixamo take driving the body controls of one Take: per sample the world-rotation change from the
    take's rest of hips, chest, head and feet, and hips/knee/ankle positions scaled to our hip height.
    In place: the hips' travel start->end is removed from every point (the game moves the root).
    mode 'air': the take's own lift (lowest foot or toe above its first sample) is removed, the game
    supplies the jump arc. Weight w ramps in/out so the take blends with the authored pose."""
    NAMES = ('Hips', 'Spine2', 'Head', 'LeftFoot', 'RightFoot', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
             'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand')
    # Floor clamp: points of the take that can reach the ground, with our skin/hat/boot thickness above them.
    FLOOR = {'Hips': .14, 'Spine2': .16, 'Head': .30, 'LeftHand': .05, 'RightHand': .05, 'LeftFoot': .07, 'RightFoot': .07,
             'LeftToeBase': .04, 'RightToeBase': .04, 'LeftToe_End': .02, 'RightToe_End': .02}

    def __init__(self, path, dur, segment=None, mode='loop', blend_in=0.0, blend_out=0.0, hip_z=1.0, arms=False):
        self.arms = arms   # True: the hands follow the take too (a roll), the weapon rides in the right hand
        sc = bpy.context.scene; fps_keep = sc.render.fps; before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
        new = [o for o in bpy.data.objects if o not in before]
        src = next(o for o in new if o.type == 'ARMATURE'); act = src.animation_data.action
        f0, f1 = (int(x) for x in act.frame_range); fps = sc.render.fps / sc.render.fps_base
        pb = lambda n: src.pose.bones['mixamorig:' + n]
        W = src.matrix_world
        self.rest_q = {n: (W @ pb(n).bone.matrix_local).to_3x3().normalized().to_quaternion() for n in self.NAMES}
        self.rest_p = {n: W @ pb(n).bone.head_local for n in self.NAMES}
        self.k = hip_z / self.rest_p['Hips'].z
        seg = segment or [0, (f1 - f0) / fps]; n = max(2, round(dur / .01)); self.dt = dur / n
        sc.frame_set(f0 + 1); sc.frame_set(f0)   # heading of the take's opening stance (not of the segment start)
        q_start = (W @ pb('Hips').matrix).to_3x3().normalized().to_quaternion() @ self.rest_q['Hips'].inverted()
        raw = []
        for i in range(n + 1):
            fr = f0 + (seg[0] + (seg[1] - seg[0]) * i / n) * fps; tgt = int(fr)
            sc.frame_set(tgt + 1 if tgt < f1 else tgt - 1); sc.frame_set(min(tgt, f1), subframe=fr - tgt)
            q = {nm: (W @ pb(nm).matrix).to_3x3().normalized().to_quaternion() @ self.rest_q[nm].inverted() for nm in self.NAMES}
            p = {nm: W @ pb(nm).head for nm in self.NAMES}
            toes = [(W @ src.pose.bones[b].head).z for b in src.pose.bones.keys() if 'Toe' in b or b.endswith('Foot')]
            floor = {nm: (W @ src.pose.bones['mixamorig:' + nm].head).z for nm in self.FLOOR if 'mixamorig:' + nm in src.pose.bones}
            raw.append((q, p, min(toes), floor))
        # Heading: a take may start turned away from -Y (Dodge_Ranged stands ~60 deg aside); remove the first
        # sample's hips heading from every rotation and position so the move faces the way the game moves.
        f_ = q_start @ Vector((0, -1, 0)); yaw0 = math.atan2(f_.x, -f_.y)
        Rf = Quaternion((0, 0, 1), -yaw0); piv = raw[0][1]['Hips'].copy(); piv.z = 0
        for q_, p_, _, _ in raw:
            for nm in q_: q_[nm] = Rf @ q_[nm]
            for nm in p_: p_[nm] = Rf @ (p_[nm] - piv) + piv
        self.heading_deg = round(math.degrees(yaw0), 1)
        h0, h1 = raw[0][1]['Hips'], raw[-1][1]['Hips']; low0 = raw[0][2]
        self.samples = []
        for i, (q, p, low, floor) in enumerate(raw):
            u = i / n; shift = h0.lerp(h1, u) - self.rest_p['Hips']; shift.z = 0
            if mode == 'air': shift.z = max(0., low - low0)
            # lift the whole body where a point would go through the floor at our size (k)
            shift.z -= max([0.] + [m - (floor[nm] - shift.z) * self.k for nm, m in self.FLOOR.items() if nm in floor]) / self.k
            d = {nm: (p[nm] - shift - self.rest_p[nm]) * self.k for nm in self.NAMES}
            t = i * self.dt
            w = 1.0 if mode == 'loop' else min(1., (t / blend_in) if blend_in else 1., ((dur - t) / blend_out) if blend_out else 1.)
            self.samples.append({'q': q, 'd': d, 'p': {nm: p[nm] - shift for nm in self.NAMES}, 'w': max(0., w)})
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        for a_ in [a_ for a_ in bpy.data.actions if a_ is act or 'mixamo' in a_.name.lower()]:
            bpy.data.actions.remove(a_)
        sc.render.fps = fps_keep

    def at(self, t):
        return self.samples[max(0, min(len(self.samples) - 1, round(t / self.dt)))]


def takes(cfg):
    sin, cos, tau = math.sin, math.cos, 2 * math.pi
    base = {c: 0.0 for c in CH}
    base.update({'root.z': -.025, 'spine.pitch': 3, 'head.pitch': -3, 'Lf.x': .17, 'Rf.x': .17, 'Lf.y': -.03, 'Rf.y': .04,
                 'Lf.yaw': 8, 'Rf.yaw': 10, 'R.curl': .9, 'L.curl': .8, 'R.thumb': .6, 'L.thumb': .4})
    # Port arms: bacamarte across the chest, muzzle up to the left; reachable by both hands.
    PORT = obj('g', -.14, -.2, 1.02, 50, 25, -12)
    base.update(PORT)
    base.update(obj('lh', .24, -.06, 1.0, 0, -70, 0)); base.update(obj('rh', -.24, -.06, 1.0, 0, -70, 0))
    base.update(obj('pR', -.24, .0, .98, 0, -80, 0)); base.update(obj('pL', .24, .0, .98, 0, -80, 0))
    base.update(obj('k', -.24, -.04, 1.0, 0, -70, 0))
    T = []

    def idle(t):
        w = tau * t / 2.4; b = sin(w)
        return {'spine.pitch': -1.4 * b, 'root.z': -.003 * b, 'head.pitch': .8 * b, 'g.z': .006 * b, 'g.pitch': 1.5 * b,
                'root.x': .007 * sin(w + .6), 'pelvis.roll': -2.5 * sin(w + .6), 'spine.roll': 2 * sin(w + .2), 'head.roll': -sin(w - .2),
                'head.yaw': 7 * sin(w + 1.3) + 2 * sin(2 * w), 'spine.yaw': 2 * sin(w + 1), 'g.yaw': 2 * sin(w + 1.1),
                'L.curl': .05 * sin(w + 2), 'R.shrug': 1.5 * b, 'L.shrug': 1.5 * b}
    T.append(Take([('idle', 0, 2.4)], 2.4, base, loop=True, layer=idle))

    # Run in place at the hero speed: stance foot slides back exactly at body speed.
    dw = .64; duty = .4; stride = cfg['speed'] * duty * dw; lift = .13

    def run(t, P):
        u = (t / dw) % 1; w = tau * u
        P['root.z'] += -.05 - .035 * cos(2 * w - .4); P['root.x'] += .012 * sin(w)
        P['pelvis.yaw'] += -9 * cos(w); P['pelvis.roll'] += -3 * sin(w)
        P['spine.yaw'] += 7 * cos(w); P['spine.pitch'] += 10 + 2 * cos(2 * w - .4)
        P['head.yaw'] += -4 * cos(w); P['head.pitch'] += -7 + 2 * cos(2 * w - .4)
        P['g.z'] += .025 * cos(2 * w - .2); P['g.yaw'] += 6 * cos(w); P['g.x'] += .015 * cos(w)
        for S, ph in (('L', 0), ('R', .5)):
            q = (u - ph) % 1
            if q < duty:
                s = q / duty; y = -stride / 2 + stride * s; zz = 0
                pitch = -10 * max(0, 1 - s / .2) ** 2 + 30 * max(0, (s - .65) / .35) ** 2
            else:
                s = (q - duty) / (1 - duty); y = stride / 2 - stride * (.5 - .5 * cos(math.pi * s))
                zz = lift * sin(math.pi * s ** .9); pitch = 30 * (1 - s) ** 2 - 10 * s * s
            P[S + 'f.x'] = .14; P[S + 'f.y'] = y; P[S + 'f.z'] = zz; P[S + 'f.pitch'] = pitch; P[S + 'f.yaw'] = 4
    T.append(Take([('run', 0, dw)], dw, {**base, 'g.y': -.3, 'g.z': 1.06}, loop=True, proc=run))

    # Bacamarte: bladed stance (left foot forward), shoulder, fire on the config hit, recoil, recover.
    d0, h0 = cfg['shot_dur'], cfg['shot_hit']
    # Stock in the right shoulder pocket: the grip sits in front of the right shoulder and the torso turns
    # only ~30 deg (with -56 deg the shoulder went behind the chest and the arm crossed through the ribs).
    AIMED = {**obj('g', -.12, -.27, 1.41, 0, 0, 0), 'root.yaw': -22, 'spine.yaw': -9, 'head.yaw': 30, 'neck.yaw': 0,
             'head.pitch': 4, 'head.roll': 10, 'spine.pitch': 6, 'root.z': -.06,
             'Lf.y': -.16, 'Lf.x': .16, 'Lf.yaw': -20, 'Rf.y': .14, 'Rf.x': .2, 'Rf.yaw': 40}
    shot = [(0, {}), (.4 * h0, {**{k: v for k, v in AIMED.items() if not k.startswith('g.')}, **obj('g', -.12, -.2, 1.3, 30, 15, -8)}),
            (.8 * h0, AIMED), (h0, {**AIMED, 'g.z': 1.405}),
            (h0 + .05, {**AIMED, **obj('g', -.11, -.18, 1.46, 0, 22, 4), 'spine.pitch': -4, 'root.y': .025, 'head.pitch': -4, 'R.shrug': 6}),
            (h0 + .2, {**AIMED, **obj('g', -.12, -.24, 1.42, 0, 6, 0), 'spine.pitch': 3, 'root.y': .01}),
            (d0 - .1, {'root.yaw': -12, 'spine.yaw': -6, 'head.yaw': 10, 'head.roll': 0, **obj('g', -.11, -.24, 1.16, 45, 32, -12),
                       'Lf.y': -.06, 'Rf.y': .07, 'Lf.yaw': 0, 'Rf.yaw': 18, 'root.z': -.035}),
            (d0, {})]
    T.append(Take([('shoot', 0, d0)], d0, base, shot))

    # Pistols: draw from the hips, both arms forward, alternate shots on the config times.
    d1, hits = cfg['pistol_dur'], cfg['pistol_hits']
    AR = obj('pR', -.13, -.45, 1.42, 4, 0, 0); AL = obj('pL', .13, -.45, 1.42, -4, 0, 0)
    pk = [(0, {'Lf.y': -.06, 'Rf.y': .06}), (.6 * hits[0], {**AR, **AL, 'root.z': -.07, 'spine.pitch': 8, 'head.pitch': -4})]
    for i, h in enumerate(hits):
        S = 'R' if i % 2 == 0 else 'L'; A = AR if S == 'R' else AL; o = 'p' + S; sg = -1 if S == 'R' else 1
        pk.append((h, {**A, **(AL if S == 'R' else AR)}))
        pk.append((h + .045, {o + '.pitch': 28, o + '.z': A[o + '.z'] + .05, o + '.y': A[o + '.y'] + .08, 'spine.yaw': sg * -6,
                              S + '.shrug': 8, 'spine.pitch': 4}))
        pk.append((min(d1 - .12, h + .16), {**A, 'spine.yaw': 0, S + '.shrug': 0, 'spine.pitch': 8}))
    pk.append((d1, {'root.z': None, 'spine.pitch': None, 'head.pitch': None, 'Lf.y': None, 'Rf.y': None,
                    **obj('pR', -.24, -.02, 1.02, 0, -60, 0), **obj('pL', .24, -.02, 1.02, 0, -60, 0)}))
    T.append(Take([('pistols', 0, d1)], d1, base, sorted(pk, key=lambda k: k[0]), hands=('pR', 'pL'), show={'R_Pistol', 'L_Pistol'}))

    # Peixeira throw: left arm points, knife cocked behind the head, whip forward, release.
    d2, h2 = cfg['knife_dur'], cfg['knife_hit']
    throw = [(0, {'L.curl': .3}),
             (.55 * h2, {**obj('k', -.22, .1, 1.72, 0, 70, 0), **obj('lh', .22, -.42, 1.45, 0, 10, -90), 'root.yaw': -30, 'spine.yaw': -25,
                         'spine.pitch': -8, 'head.yaw': 45, 'Lf.y': -.14, 'Rf.y': .12, 'Rf.yaw': 35, 'root.z': -.05, 'L.curl': .2}),
             (.85 * h2, {**obj('k', -.24, .14, 1.74, 0, 85, 0), 'spine.yaw': -32, 'root.yaw': -34}),
             (h2, {**obj('k', -.1, -.48, 1.46, 8, -10, 0), **obj('lh', .2, -.05, 1.15, 0, -40, -90), 'root.yaw': 10, 'spine.yaw': 22,
                   'spine.pitch': 16, 'head.yaw': -20, 'head.pitch': -6, 'R.curl': .2, 'root.z': -.08, 'Rf.z': 0}),
             (h2 + .12, {**obj('k', -.02, -.42, 1.2, 15, -45, 0), 'spine.pitch': 20, 'root.yaw': 14, 'spine.yaw': 26}),
             (d2, {'root.yaw': None, 'spine.yaw': None, 'spine.pitch': None, 'head.yaw': None, 'head.pitch': None, 'Lf.y': None,
                   'Rf.y': None, 'Rf.yaw': None, 'root.z': None, 'R.curl': .5, 'L.curl': .5,
                   **obj('k', -.24, -.04, 1.0, 0, -70, 0), **obj('lh', .24, -.06, 1.0, 0, -70, 0)})]
    T.append(Take([('throw', 0, d2)], d2, base, throw, hands=('k', 'lh'), show={'R_Peixeira'}, release=('R_Peixeira', h2)))

    # Dodge: drop low and dash, bacamarte tucked to the chest, recover.
    d3 = cfg['dodge_dur']
    T.append(Take([('dodge', 0, d3)], d3, base, [
        (0, {}), (.12, {'root.z': -.26, 'spine.pitch': 34, 'head.pitch': -24, 'Lf.y': -.12, 'Rf.y': .2, 'Rf.z': .05, 'Rf.pitch': 25,
                        **obj('g', -.1, -.3, .98, 45, 20, -15)}),
        (.28, {'root.z': -.22, 'spine.pitch': 30, 'Rf.y': .08, 'Rf.z': 0, 'Rf.pitch': 0, 'Lf.y': -.05}),
        (d3, {})]))

    # Jump: crouch, launch with tucked legs, land (the game moves the root; time = air time).
    jt = cfg['air']
    T.append(Take([('jump', 0, jt)], jt, base, [
        (0, {'root.z': -.03}), (.08, {'root.z': .02, 'spine.pitch': -4, 'Lf.z': .02, 'Rf.z': .02, 'Lf.pitch': 30, 'Rf.pitch': 30}),
        (.3, {'root.z': .05, 'Lf.z': .3, 'Rf.z': .22, 'Lf.y': -.08, 'Rf.y': .1, 'Lf.pitch': -10, 'Rf.pitch': 20, 'spine.pitch': 8,
              **obj('g', -.12, -.26, 1.22, 52, 45, -15)}),
        (.5, {'root.z': .0, 'Lf.z': .06, 'Rf.z': .05, 'Lf.y': -.04, 'Rf.y': .05, 'Lf.pitch': 0, 'Rf.pitch': 0}),
        (jt, {'root.z': -.07, 'spine.pitch': 9, 'Lf.z': 0, 'Rf.z': 0})]))

    # Hit reaction and death (falls on the back; the weapon follows the body).
    T.append(Take([('hit', 0, .4)], .4, base, [
        (0, {}), (.07, {'spine.pitch': -14, 'head.pitch': -18, 'root.y': .05, 'root.z': -.04, 'spine.roll': 6, **obj('g', -.12, -.25, 1.06, 58, 32, -18)}),
        (.22, {'spine.pitch': 6, 'head.pitch': 4, 'root.y': .02, 'root.z': -.06, 'spine.roll': -2}), (.4, {})]))
    DEAD = {'root.pitch': -88, 'root.z': -.765, 'root.y': .32, 'spine.pitch': -6, 'head.pitch': 30,   # chin in: the hat brim clears the floor 'head.yaw': 25,
            'Lf.y': -.82, 'Rf.y': -.74, 'Lf.x': .22, 'Rf.x': .26, 'Lf.z': .085, 'Rf.z': .085, 'Lf.pitch': -75, 'Rf.pitch': -70,
            'Lf.yaw': 25, 'Rf.yaw': 35, **obj('g', -.5, -.04, 1.22, -10, -84, 90), **obj('lh', .45, -.05, 1.2, 0, 70, -90),
            'R.curl': .4, 'L.curl': .2, 'L.free': 1}
    T.append(Take([('dead', 0, 1.4)], 1.4, base, [
        (0, {}), (.18, {'root.z': -.12, 'spine.pitch': 20, 'head.pitch': 20, 'root.y': .04, 'L.free': .6, **obj('g', -.15, -.25, 1.0, 40, -20, -15)}),
        (.5, {'root.pitch': -35, 'root.z': -.42, 'root.y': .2, 'spine.pitch': 5, 'head.pitch': 5, 'Lf.y': -.3, 'Rf.y': -.15,
              'Lf.pitch': -20, 'L.free': 1, **obj('g', -.35, -.15, 1.1, 0, -40, 45), **obj('lh', .35, -.15, 1.25, 0, 40, -90)}),
        (.82, {**DEAD, 'root.z': -.66, 'head.pitch': 15}), (.95, {**DEAD, 'root.z': -.78}), (1.4, DEAD)],
        hands=('g', 'g'), space='root'))

    # Victory: bacamarte raised overhead in the right hand, left fist on the hip.
    VIC = {**obj('g', -.24, -.08, 1.95, 0, 82, 0), **obj('lh', .27, .02, 1.08, 90, -20, -90), 'L.free': 1, 'spine.pitch': -8,
           'head.pitch': -14, 'head.yaw': -8, 'root.z': -.02, 'Lf.y': -.08, 'Rf.y': .06, 'L.curl': 1}

    def vic(t):
        w = tau * t / 2.0
        return {'g.z': .02 * sin(w), 'g.yaw': 8 * sin(w), 'spine.pitch': -1.5 * sin(w), 'head.yaw': 6 * sin(w + 1)}
    T.append(Take([('victory', 0, 2.0)], 2.0, base, [(0, VIC)], loop=True, layer=vic))
    return T


def build(p, J):
    sc = bpy.context.scene; sc.render.fps = 100
    rig = next(o for o in bpy.data.collections[p.NAME].objects if o.type == 'ARMATURE')
    names = {'Base': 'Hips', 'Waist': 'Spine', 'Chest1': 'Spine1', 'Chest2': 'Spine2', 'Neck': 'Neck', 'Head': 'Head'}
    for s, side in [('L', 'Left'), ('R', 'Right')]:
        for a, b in [('Shoulder', 'Shoulder'), ('UpperArm', 'Arm'), ('ForeArm', 'ForeArm'), ('Hand', 'Hand'), ('Thigh', 'UpLeg'), ('Calf', 'Leg'),
                     ('Foot', 'Foot'), ('Toe1', 'ToeBase'), ('Finger1', 'HandMiddle1'), ('Finger2', 'HandMiddle2'), ('Thumb1', 'HandThumb1'), ('Thumb2', 'HandThumb2')]:
            names[s + '_' + a] = side + b
    # Fresh Mixamo skeleton with the Cangaceiro proportions, then the add-on control rig.
    arm = bpy.data.objects.new('Cangaceiro_Authoring', bpy.data.armatures.new('FreshMixamoSkeleton'))
    sc.collection.objects.link(arm); p.select_only([arm]); bpy.ops.object.mode_set(mode='EDIT')
    for n, mn in names.items():
        e = arm.data.edit_bones.new('mixamorig:' + mn); e.head = J[n][0]; e.tail = J[n][1]
    for n, mn in names.items():
        par = J[n][2]; par = 'Base' if par == 'Pelvis' else par
        if par in names: arm.data.edit_bones['mixamorig:' + mn].parent = arm.data.edit_bones['mixamorig:' + names[par]]
    for s, side in [('L', 'Left'), ('R', 'Right')]:
        sign = 1 if s == 'L' else -1
        for finger, dy in [('Index', -.022), ('Middle', 0), ('Ring', .02), ('Pinky', .038), ('Thumb', -.05)]:
            parent = 'mixamorig:' + side + 'Hand'
            for k in range(1, 4):
                n = 'mixamorig:' + side + 'Hand' + finger + str(k)
                if n in arm.data.edit_bones: e = arm.data.edit_bones[n]
                else:
                    e = arm.data.edit_bones.new(n); b0 = Vector(J[s + '_Finger1'][0])
                    e.head = b0 + Vector((sign * .026 * (k - 1), dy, 0)); e.tail = e.head + Vector((sign * .026, 0, 0))
                e.parent = arm.data.edit_bones[parent]; parent = n
    bpy.ops.object.mode_set(mode='OBJECT')
    addon_utils.enable('bl_ext.blender_org.mixamo_rig', default_set=True)
    bpy.ops.mr.make_rig(bake_anim=False, ik_arms=True, ik_legs=True)
    arm = bpy.context.view_layer.objects.active
    arm.animation_data_create(); arm.animation_data.action = None
    BR = {b.name: b.matrix_local.copy() for b in arm.data.bones}
    PAR = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
    ALIAS = {'mixamorig:LeftHand': 'Ctrl_Hand_IK_Left', 'mixamorig:RightHand': 'Ctrl_Hand_IK_Right'}
    A0 = {S: BR['Ctrl_Foot_IK_' + side].translation.copy() for S, side, _ in SIDES}
    # Lunia rest data for the hand targets.
    LB = {b.name: b.matrix_local.copy() for b in rig.data.bones}
    wrist = {S: LB[S + '_Hand'].translation.copy() for S in 'LR'}
    palm = {S: rig.data.bones['R_Bacamarte' if S == 'R' else 'L_Pistol'].head_local.copy() for S in 'LR'}
    R0 = {S: Matrix(((s, 0, 0), (0, 0, -1), (0, s, 0))) for S, _, s in SIDES}       # rest weapon frame (cangaceiro_weapons)
    hand_len = (rig.data.bones['L_Hand'].tail_local - rig.data.bones['L_Hand'].head_local).length
    palm_off = {S: Vector((s * hand_len * .55, 0, -.022)) for S, _, s in SIDES}       # wrist -> palm centre, rest axes
    sp = W.SHEET['Bacamarte']; FOREND = Vector(((700 - sp['grip'][0]) / W.PPM, 0, (sp['grip'][1] - 128) / W.PPM))
    # Left hand under the forend: fingers -> weapon right side, thumb -> muzzle, palm up.
    R_LH = Matrix(((0, -1, 0), (-1, 0, 0), (0, 0, -1)))

    def hand_delta(S, src, P, Kobj):
        """Rigid transform taking the Lunia hand from rest to the pose that holds `src`."""
        o = src
        G = aim(P[o + '.yaw'], P[o + '.pitch'], P[o + '.roll']); Pg = Vector((P[o + '.x'], P[o + '.y'], P[o + '.z']))
        if S == 'L' and src == 'g':     # support hand on the bacamarte forend
            Rw = G @ R_LH; F = Pg + G @ FOREND
            wpos = F - Rw @ palm_off['L']
            Dm = Matrix.Translation(wpos) @ Rw.to_4x4() @ Matrix.Translation(-wrist['L'])
        else:                           # object in the fist (weapon or imaginary)
            Dm = Matrix.Translation(Pg) @ (G @ R0[S].inverted()).to_4x4() @ Matrix.Translation(-palm[S])
        return Kobj @ Dm

    def controls(P, take, t=None, lift=0.):
        W_, POS = {}, {}
        cap = take.capture.at(t) if take is not None and take.capture and t is not None else None
        w = cap['w'] if cap else 0.

        def mixR(Ra, qc):   # authored rotation <-> captured, by the take's capture weight
            return Ra if cap is None else Ra.to_quaternion().slerp(qc, w).to_matrix()

        def mixP(pa, pc):
            return pa if cap is None else pa.lerp(pc, w)

        def put(n, Rw, h):
            W_[n] = Rw; POS[n] = Matrix.Translation(h) @ (Rw @ BR[n].to_3x3()).to_4x4()

        def child(n, L, pos_from=None):
            par = ALIAS.get(PAR[n], PAR[n]); src = pos_from or par
            put(n, W_[par] @ L, (POS[src] @ BR[src].inverted()) @ BR[n].translation)
        put('Ctrl_Master', Matrix.Identity(3), BR['Ctrl_Master'].translation)
        Rroot = rot(P['root.pitch'], P['root.yaw'], P['root.roll'])
        hips_at = BR['Ctrl_Hips'].translation + Vector((P['root.x'], P['root.y'], P['root.z']))
        I = Quaternion(); q = cap['q'] if cap else {}
        put('Ctrl_Hips', mixR(Rroot, q.get('Hips')), mixP(hips_at, BR['Ctrl_Hips'].translation + cap['d']['Hips']) if cap else hips_at)
        child('Ctrl_Hips_Free', mixR(rot(P['pelvis.pitch'], P['pelvis.yaw'], P['pelvis.roll']), I))
        # Captured chest = hips x (spine step)^3: the hips->chest turn split evenly over the three spine controls.
        Lsp = I.slerp(q['Hips'].inverted() @ q['Spine2'], 1 / 3) if cap else None
        for n, wt in (('Ctrl_Spine', .3), ('Ctrl_Spine1', .35), ('Ctrl_Spine2', .35)):
            child(n, mixR(rot(P['spine.pitch'] * wt, P['spine.yaw'] * wt, P['spine.roll'] * wt), Lsp))
        child('Ctrl_Neck', mixR(rot(P['neck.pitch'], P['neck.yaw'], P['neck.roll']), I))
        child('Ctrl_Head', mixR(rot(P['head.pitch'], P['head.yaw'], P['head.roll']), q['Spine2'].inverted() @ q['Head'] if cap else None))
        K = POS['Ctrl_Hips'] @ BR['Ctrl_Hips'].inverted()
        # Objects follow the whole hips ('root') or only the root translation ('world').
        Kobj = K if take.space == 'root' else Matrix.Translation(Vector((P['root.x'], P['root.y'], P['root.z'])))
        targets = {}
        for S, side, s in SIDES:
            child('Ctrl_Shoulder_' + side, Matrix.Rotation(D(-s * P[S + '.shrug']), 3, 'Y'))
            src = take.hands[0] if S == 'R' else take.hands[1]
            Dm = hand_delta(S, src, P, Kobj)
            if S == 'L' and P['L.free'] > 0 and src != 'lh':
                Df = hand_delta('L', 'lh', P, Kobj); k = min(1, P['L.free'])
                q = Dm.to_quaternion().slerp(Df.to_quaternion(), k); wpos = (Dm @ wrist['L']).lerp(Df @ wrist['L'], k)
                Dm = Matrix.Translation(wpos) @ q.to_matrix().to_4x4() @ Matrix.Translation(-wrist['L'])
            if cap and take.capture.arms:   # hand = the take's hand change from rest, at our wrist
                wc = wrist[S] + cap['d'][side + 'Hand']
                qa = Dm.to_quaternion().slerp(q[side + 'Hand'], w); wa = (Dm @ wrist[S]).lerp(wc, w)
                Dm = Matrix.Translation(wa) @ qa.to_matrix().to_4x4() @ Matrix.Translation(-wrist[S])
            targets[S] = Dm
            put('Ctrl_Hand_IK_' + side, Dm.to_3x3(), Dm @ BR['Ctrl_Hand_IK_' + side].translation)
            sh = (POS['Ctrl_Shoulder_' + side] @ BR['Ctrl_Shoulder_' + side].inverted()) @ Vector(J[S + '_UpperArm'][0])
            wr = Dm @ wrist[S]; mid = (sh + wr) / 2
            # Elbow pole: behind and down for low hands; swings out to the side as the hand rises in front of
            # the chest (shouldered bacamarte, raised arm), else the IK elbow folds into the ribs.
            ch = POS['Ctrl_Spine2'] @ BR['Ctrl_Spine2'].inverted(); loc = ch.inverted() @ wr
            k = max(0., min(1., (loc.z - 1.15) / .22)) * max(0., min(1., -(loc.y + .05) / .15))
            out = ch.to_3x3() @ Vector((s * (.35 + .1 * k), .25 - .35 * k, -.3 + .15 * k))
            if cap and take.capture.arms:   # the take's elbow direction
                cp_ = cap['p']; ed = cp_[side + 'ForeArm'] - (cp_[side + 'Arm'] + cp_[side + 'Hand']) / 2
                if ed.length > .02: out = out.lerp(ed.normalized() * .5, w)
            put('Ctrl_ArmPole_IK_' + side, Matrix.Identity(3), mid + out)
            for f, amt in FINGERS:
                for k, deg in zip((1, 2, 3), (amt[0] * 55, amt[1] * 75, amt[2] * 55)):
                    child(f'Ctrl_{f}{k}_{side}', Matrix.Rotation(D(s * deg * P[S + '.curl']), 3, 'Y'))
            for k, deg in zip((1, 2, 3), (30, 35, 30)):
                n = f'Ctrl_Thumb{k}_{side}'; d0 = BR[n].to_3x3() @ Vector((0, 1, 0))
                child(n, Matrix.Rotation(D(deg * P[S + '.thumb']), 3, Vector((-d0.y, d0.x, 0)).normalized()))
            f = lambda k: P[S + 'f.' + k]
            Rz = Matrix.Rotation(D(s * f('yaw')), 3, 'Z'); F = Rz @ Matrix.Rotation(D(f('pitch')), 3, 'X')
            ground = Vector((s * f('x'), f('y') + A0[S].y, f('z')))
            piv = Vector((0, BALL if f('pitch') >= 0 else HEEL, 0)); up = Vector((0, 0, A0[S].z))
            ankle = ground + Rz @ piv + F @ (up - piv)
            if cap:
                ankle = mixP(ankle, A0[S] + cap['d'][side + 'Foot']); F = mixR(F, q[side + 'Foot'])
            put('Ctrl_Foot_IK_' + side, F, ankle)
            hip = (POS['Ctrl_Hips_Free'] @ BR['Ctrl_Hips_Free'].inverted()) @ BR['Ctrl_UpLeg_FK_' + side].translation
            knee = Matrix.Rotation(D(.5 * (P['root.yaw'] + P['pelvis.yaw']) + .5 * s * f('yaw')), 3, 'Z') @ Vector((s * .05, -.5, 0))
            pole = (hip + ankle) / 2 + knee
            if cap:   # the take's knee direction (knee away from the hip-ankle midpoint); a straight leg has none: hips forward
                cp_ = cap['p']; kd = cp_[side + 'Leg'] - (cp_[side + 'UpLeg'] + cp_[side + 'Foot']) / 2
                fwd = q['Hips'] @ Vector((0, -1, 0)); a_ = min(1., kd.length / .06)
                kd = (kd.normalized() * a_ + fwd * (1 - a_)).normalized()
                pole = mixP(pole, (hip + ankle) / 2 + kd * .5)
            put('Ctrl_LegPole_IK_' + side, Matrix.Identity(3), pole)
        if lift:   # whole body up (floor clamp of captured takes); the master stays, so nothing lifts twice
            Lm = Matrix.Translation((0, 0, lift))
            for n in POS:
                if n != 'Ctrl_Master': POS[n] = Lm @ POS[n]
            targets = {S: Lm @ m for S, m in targets.items()}
        basis = {}
        for n, m in POS.items():
            if n == 'Ctrl_Master': continue
            par = PAR[n]
            if par is None: basis[n] = BR[n].inverted() @ m; continue
            a = ALIAS.get(par, par); ppose = POS[a] @ BR[a].inverted() @ BR[par]
            basis[n] = BR[n].inverted() @ BR[par] @ ppose.inverted() @ m
        return basis, POS, targets

    cfg = cfg_of(p); TK = takes(cfg)
    # Mixamo takes from the sheet (build.mocap) drive the body of their clip; hands keep holding the weapon,
    # which then follows the hips ('root' space).
    for take in TK:
        name = take.clips[0][0]; spec = p.B.get('mocap', {}).get(name)
        if not spec: continue
        dur = spec.get('duration', take.dur)
        take.capture = Capture(p.CDIR / spec['file'], dur, spec.get('segment'), spec.get('mode', 'loop'), spec.get('blend_in', 0),
                               spec.get('blend_out', 0), BR['Ctrl_Hips'].translation.z, spec.get('arms', False))
        take.dur, take.clips, take.proc, take.space = dur, [(name, 0, dur)], None, 'root'
        print('CANGACEIRO_CAPTURE', name, spec['file'], dur, 'heading removed', take.capture.heading_deg, flush=True)
    ctrl_names = list(controls(TK[0].sample(0), TK[0])[0])
    for n in ctrl_names: arm.pose.bones[n].rotation_mode = 'QUATERNION'
    LP = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    depth = lambda n: 0 if LP[n] is None else 1 + depth(LP[n])
    order = sorted(LB, key=depth)
    # Rest = what the control rig itself gives with every control at rest. The add-on's IK bones are
    # rolled ~180 deg from our fresh Mixamo bones and COPY_TRANSFORMS imposes that roll, so the edit
    # rest (matrix_local) would twist arms and legs half a turn at the wrist and ankle in every clip.
    for n in ctrl_names: arm.pose.bones[n].matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    MB = {n: arm.pose.bones['mixamorig:' + mn].matrix.copy() for n, mn in names.items()}
    chains = [('Pelvis', ['Skirt%s01' % d, 'Skirt%s02' % d], 2.2, .38) for d in ('F', 'FL', 'L', 'BL', 'B', 'BR', 'R', 'FR')]
    secondary = {b for _, bs, _, _ in chains for b in bs}
    weapon_bones = [m[0] for m in W.MOUNTS]

    def lunia_pose():
        out = {}
        for n in order:
            if n in secondary: continue
            if n in names:
                m = arm.pose.bones['mixamorig:' + names[n]].matrix
                out[n] = Matrix.Translation(m.translation) @ (m.to_3x3() @ MB[n].to_3x3().inverted() @ LB[n].to_3x3()).to_4x4()
            else:
                par = LP[n]; out[n] = LB[n].copy() if par is None else out[par] @ LB[par].inverted() @ LB[n]
        # Forearm pronation: the IK forearm is a pure hinge, so the grip's twist would all land on the
        # wrist and wring the skin. The forearm takes half of it about its own axis; the hand (and
        # everything under it) keeps its armature-space pose.
        for S in 'LR':
            fa, h = S + '_ForeArm', S + '_Hand'
            q = (out[fa].to_3x3().inverted() @ out[h].to_3x3() @ (LB[fa].to_3x3().inverted() @ LB[h].to_3x3()).inverted()).to_quaternion()
            sw = Vector((0, 1, 0)).rotation_difference(q @ Vector((0, 1, 0))); t = sw.inverted() @ q
            ang = t.angle if t.axis.y >= 0 else -t.angle
            ang = (ang + math.pi) % (2 * math.pi) - math.pi
            out[fa] = out[fa] @ Matrix.Rotation(.5 * ang, 4, 'Y')
        return out

    # Thigh radius: median distance of the trousers to the thigh bone (mid thigh), for the flap springs.
    leg = p.parts_by_slot()['Leg']; tb = rig.data.bones['L_Thigh']
    def _d(q, a, b):
        ab = b - a; t = max(0, min(1, (q - a).dot(ab) / ab.length_squared)); return (q - (a + ab * t)).length
    ds = sorted(_d(v.co, tb.head_local, tb.tail_local) for v in leg.data.vertices if v.co.x > 0 and tb.tail_local.z + .05 < v.co.z < tb.head_local.z - .08)
    thigh_r = ds[len(ds) // 2] if ds else .085

    # Flap samples: Support vertices led by each flap bone, in that bone's rest frame (<= 40 per bone).
    sup = p.parts_by_slot()['Support']; gname = {g.index: g.name for g in sup.vertex_groups}; flap_pts = {}
    for v in sup.data.vertices:
        g = max((g for g in v.groups if gname[g.group] in secondary), key=lambda g: g.weight, default=None)
        if g is not None and g.weight > .5:
            flap_pts.setdefault(gname[g.group], []).append(v.co.copy())
    for b, pts in flap_pts.items():
        r = LB[b].to_3x3().inverted(); h = LB[b].translation
        flap_pts[b] = [r @ (c - h) for c in pts[::max(1, len(pts) // 40)]]
    for b in secondary: flap_pts.setdefault(b, [])

    # Boot sole corners in the rest pose (heel behind the ankle, toe tip, both edges), for the floor clamp of captured takes.
    SOLE = [(f'mixamorig:{side}' + b, Vector(pt)) for S, side in (('L', 'Left'), ('R', 'Right')) for e in (-.05, 0, .05)
            for b, pt in (('Foot', (J[S + '_Foot'][0][0] + e, J[S + '_Foot'][0][1] + .07, 0)), ('ToeBase', (J[S + '_Toe1'][1][0] + .8 * e, J[S + '_Toe1'][1][1], 0)))]

    def simulate(poses, fr, loop):
        """Damped springs on the flap chains, following the body, kept out of the thighs."""
        n = len(poses) - 1 if loop else len(poses)
        dts = [(fr[i] - fr[i - 1]) / 100 if i else ((fr[-1] - fr[-2]) / 100 if loop else .02) for i in range(n)]
        res = [dict() for _ in poses]
        caps = lambda P: [(P[S + '_Thigh'].translation, P[S + '_Calf'].translation) for S in 'LR']

        def seg_dist(q, a, b):
            ab = b - a; t = max(0, min(1, (q - a).dot(ab) / max(1e-9, ab.length_squared))); c = a + ab * t
            return (q - c).length, c
        rest_caps = caps(LB); radius = {}
        for par, bones, _, _ in chains:
            for b in bones:   # at least the thigh's own radius + a flap half-width margin (the rest gap alone let thighs through)
                tip = LB[b] @ Vector((0, rig.data.bones[b].length, 0))
                radius[b] = max(thigh_r + .035, min(.11, .92 * min(seg_dist(tip, a, c)[0] for a, c in rest_caps)))
        state = {}
        for _ in range(3 if loop else 1):
            for i in range(n):
                P = poses[i]; dt = dts[i]; cp = caps(P)
                for par, bones, freq, zeta in chains:
                    w = 2 * math.pi * freq; ppose, prest = P[par], LB[par]
                    for b in bones:
                        M = ppose @ prest.inverted(); head = M @ LB[b].translation
                        target = M @ (LB[b] @ Vector((0, rig.data.bones[b].length, 0)))
                        L = (target - head).length
                        if b not in state: state[b] = [target.copy(), Vector(), target.copy()]
                        q0, v, tprev = state[b]; vt = (target - tprev) / dt
                        v = v + (w * w * (target - q0) + 2 * zeta * w * (vt - v)) * dt
                        q = head + (q0 + v * dt - head).normalized() * L
                        for a, c in cp:
                            dd, cc = seg_dist(q, a, c)
                            if dd < radius[b]: q = cc + (q - cc).normalized() * radius[b]
                        if q.z < .05:   # flaps rest on the ground (lying pose), never through it
                            q.z = .05; q = head + (q - head).normalized() * L
                        fdir = (target - head).normalized(); dv = (q - head).normalized()
                        if fdir.angle(dv) > D(60): q = head + fdir.lerp(dv, D(60) / fdir.angle(dv)).normalized() * L
                        # Real flap geometry, last: the bone line is the flap's centre, but its corners and edges
                        # (up to 8 cm aside) hit the thighs and the floor first. Swing until every sample is clear.
                        M3 = M.to_3x3() @ LB[b].to_3x3()
                        for _ in range(4):
                            R_ = (target - head).rotation_difference(q - head).to_matrix() @ M3; worst = (0, None, 1)
                            for lp in flap_pts[b]:
                                ps = head + R_ @ lp
                                for a, c in cp:
                                    dd, cc = seg_dist(ps, a, c); pen = thigh_r + .012 - dd
                                    if pen > worst[0]: worst = (pen, (ps - cc).normalized(), (ps - head).length)
                                if .015 - ps.z > worst[0]: worst = (.015 - ps.z, Vector((0, 0, 1)), (ps - head).length)
                            if worst[1] is None: break
                            q = head + (q - head + worst[1] * worst[0] * L / max(worst[2], .05)).normalized() * L
                        state[b] = [q, (q - q0) / dt, target]
                        sw = (target - head).rotation_difference(q - head).to_matrix()
                        pose = Matrix.Translation(head) @ (sw @ M.to_3x3() @ LB[b].to_3x3()).to_4x4()
                        res[i][b] = pose; ppose, prest = pose, LB[b]
        if loop: res[-1] = res[0]
        return res

    def key_action(obj, name, frames, scaled=()):
        act = bpy.data.actions.new(name); act.use_fake_user = True; act['fps'] = 100
        obj.animation_data_create(); obj.animation_data.action = act; prev = {}
        for f, vals in frames:
            for n, v in vals.items():
                loc, q = v[0], v[1]
                if n in prev and prev[n].dot(q) < 0: q = -q
                prev[n] = q.copy(); b = obj.pose.bones[n]; b.location = loc; b.rotation_quaternion = q
                b.keyframe_insert('location', frame=f); b.keyframe_insert('rotation_quaternion', frame=f)
                if n in scaled:
                    b.scale = (v[2],) * 3; b.keyframe_insert('scale', frame=f)
        act.use_frame_range = True; act.frame_start = 0; act.frame_end = frames[-1][0]
        obj.animation_data.action = None
        return act

    def update(): bpy.context.view_layer.update()
    author_actions, baked, reach = [], [], {}
    for take in TK + [None]:
        if take is None:
            clips = [('apose', 0, .1)]; samples = lambda t: None
        else:
            clips = take.clips; samples = take.sample
        end = round(clips[-1][2] * 100)
        cuts = {round(c[1] * 100) for c in clips} | {round(c[2] * 100) for c in clips}
        fr = sorted(set(range(0, end + 1, 2)) | cuts)
        poses, ctrl, err = [], [], 0
        for f in fr:
            P = samples(f / 100)
            for n in ctrl_names: arm.pose.bones[n].matrix_basis = Matrix.Identity(4)
            if P is not None:
                basis, POS, targets = controls(P, take, f / 100)
                for n, m in basis.items(): arm.pose.bones[n].matrix_basis = m
            update()
            if P is not None and take.capture:   # our proportions can still put a knee, toe, hand or the hat in the floor
                low = min(arm.pose.bones['mixamorig:' + b].head.z - m for b, m in FLOOR_PTS if 'mixamorig:' + b in arm.pose.bones)
                for b, pt in SOLE:   # boot heel and toe tip corners, carried by the foot / toe bone
                    pb_ = arm.pose.bones[b]; low = min(low, (pb_.matrix @ pb_.bone.matrix_local.inverted() @ pt).z - .005)
                if low < 0:
                    basis, POS, targets = controls(P, take, f / 100, -low)
                    for n, m in basis.items(): arm.pose.bones[n].matrix_basis = m
                    update()
            if P is not None:   # how far the IK hands are from the weapon grip (reach check)
                for S, side, _ in SIDES:
                    got = arm.pose.bones[f'mixamorig:{side}Hand'].matrix.translation
                    e_ = (got - targets[S] @ wrist[S]).length; err = max(err, e_)
                    if e_ > .03: print('REACH', clips[0][0], f, S, round(e_, 3), flush=True)
            ctrl.append({n: (arm.pose.bones[n].location.copy(), arm.pose.bones[n].rotation_quaternion.copy()) for n in ctrl_names})
            poses.append(lunia_pose())
        sec = [{b: None for b in secondary} for _ in poses] if take is None else simulate(poses, fr, take.loop)
        for name, t0, t1 in clips:
            a, b = round(t0 * 100), round(t1 * 100)
            idx = [i for i, f in enumerate(fr) if a <= f <= b]
            author_actions.append(key_action(arm, 'Authored|' + name, [(fr[i] - a, ctrl[i]) for i in idx]))
            shown = W.visibility(name) if take is None or take.show is None else take.show
            lframes = []
            for i in idx:
                full = dict(poses[i])
                for bn in (n for n in order if n in secondary):
                    full[bn] = sec[i][bn] if sec[i][bn] is not None else full[LP[bn]] @ LB[LP[bn]].inverted() @ LB[bn]
                vals = {}
                for n in order:
                    par = LP[n]
                    m = LB[n].inverted() @ full[n] if par is None else LB[n].inverted() @ LB[par] @ full[par].inverted() @ full[n]
                    sc_ = 1.0
                    if n in weapon_bones:
                        sc_ = 1.0 if n in shown else W.HIDDEN
                        if take is not None and take.release and take.release[0] == n and fr[i] / 100 > take.release[1] + 1e-6:
                            sc_ = W.HIDDEN
                    vals[n] = (m.to_translation(), m.to_quaternion(), sc_)
                lframes.append((fr[i] - a, vals))
            baked.append((name, lframes))
            reach[name] = round(err, 4)
            print('CANGACEIRO_CLIP', name, round(t1 - t0, 3), 'max hand error', round(err, 4), flush=True)
    for n in ctrl_names: arm.pose.bones[n].matrix_basis = Matrix.Identity(4)
    author_dir = p.CDIR / 'mocap'; author_dir.mkdir(exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(author_dir / 'authored-rig.blend'))
    keep = set(bpy.data.collections[p.NAME].objects)
    for o in list(bpy.data.objects):
        if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
    for act in author_actions: bpy.data.actions.remove(act)
    for b in rig.pose.bones: b.rotation_mode = 'QUATERNION'
    for name, frames in baked: key_action(rig, name, frames, set(weapon_bones))
    for b in rig.pose.bones: b.matrix_basis = Matrix.Identity(4)
    sc.frame_set(1); sc.frame_set(0)
    (p.OUT / 'review').mkdir(exist_ok=True)
    (p.OUT / 'review' / 'hand-reach.json').write_text(__import__('json').dumps(reach, indent=1))


def cfg_of(p):
    """Clip timings come only from web/src/config.js (CANGACEIRO and the shared PLAYER jump)."""
    src = (p.ROOT / 'web/src/config.js').read_text(encoding='utf-8')
    c = src.split('export const CANGACEIRO =')[1].split('};')[0]; pl = src.split('export const PLAYER =')[1]
    num = lambda pat, s=c: float(re.search(pat, s, re.S).group(1))
    jv, jg = num(r'jump: \{ v: ([\d.]+)', pl), abs(float(re.search(r'jump: \{ v: [\d.]+, g: (-?[\d.]+)', pl).group(1)))
    return {'speed': num(r'speed: ([\d.]+)'), 'shot_dur': num(r'bacamarte: \{ dur: ([\d.]+)'), 'shot_hit': num(r'bacamarte:.*?hit: ([\d.]+)'),
            'pistol_dur': num(r'pistolas: \{ dur: ([\d.]+)'),
            'pistol_hits': [float(x) for x in re.search(r'hits: \[([^\]]+)\]', c).group(1).split(',')],
            'knife_dur': num(r'peixeira: \{ dur: ([\d.]+)'), 'knife_hit': num(r'peixeira:.*?hit: ([\d.]+)'),
            'dodge_dur': num(r'dodge: \{ dur: ([\d.]+)'), 'air': round(2 * jv / jg, 2)}
