"""Game clip library (v2) for the pipeline's Lunia-style rig (Base/Chest1/L_UpperArm/...).

Clip names and lengths follow web/src/capoeirista-asset.js: timed attacks are driven by
gameplay progress, so their length equals the combat duration and the contact pose sits at
the combat hit time (web/src/config.js).

v2 authoring model
- A clip is a list of parametric keys (time in seconds -> body parameters): hips offset and
  yaw/pitch/roll, chest bends, arm directions, foot TARGETS (body frame, or 'world' for a
  planted support foot), knee hint, foot mode (flat / pitch / pointed), head, fists.
- Keys inherit from the previous key; parameters are interpolated with a monotone cubic
  (no overshoot) and the pose is solved every SAMPLE seconds: two-bone IK per sample keeps
  planted feet fixed and makes a kicking foot follow its authored path.
- The hanging cordão is a damped spring driven by hip motion (lags, flares in spins) and is
  pushed forward by the left thigh so it does not cut through the leg.

Body frame: +X = character's left, -Y = forward, +Z = up.
"""
import math
import bpy
import numpy as np
from mathutils import Vector, Matrix, Quaternion

FPS = 100       # 0.42 s, 0.55 s, 0.62 s ... land on whole frames
SAMPLE = .02    # solve the pose every 20 ms (2 frames)


def mx(v, S):
    """Mirror a left-side direction/offset to side S."""
    return Vector((v[0] if S == 'L' else -v[0], v[1], v[2]))


class Pose:
    def __init__(self, rig, rest_ankles):
        self.rig = rig; self.ankle0 = rest_ankles; self.yaw = 0.0
        for pb in rig.pose.bones:
            pb.rotation_mode = 'QUATERNION'; pb.matrix_basis = Matrix.Identity(4)
        self.upd()

    def upd(self):
        bpy.context.view_layer.update()

    def pb(self, n):
        return self.rig.pose.bones[n]

    def body(self, v):
        return Matrix.Rotation(math.radians(self.yaw), 3, 'Z') @ Vector(v)

    def rot(self, n, axis, deg, body=True):
        pb = self.pb(n); m = pb.matrix.copy(); h = m.translation.copy()
        ax = Vector({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis]) if isinstance(axis, str) else Vector(axis)
        if body:
            ax = self.body(ax)
        pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, ax) @ Matrix.Translation(-h) @ m
        self.upd()

    def hips(self, move=(0, 0, 0), yaw=0, pitch=0, roll=0):
        self.yaw = yaw; pb = self.pb('Base'); m = pb.matrix.copy(); h = m.translation.copy()
        r = Matrix.Rotation(math.radians(yaw), 4, 'Z') @ Matrix.Rotation(math.radians(pitch), 4, 'X') @ Matrix.Rotation(math.radians(roll), 4, 'Y')
        pb.matrix = Matrix.Translation(h + self.body(move)) @ r @ Matrix.Translation(-h) @ m
        self.upd()

    def aim(self, n, d):
        pb = self.pb(n); h = pb.head.copy()
        q = (pb.tail - pb.head).rotation_difference(self.body(Vector(d).normalized()))
        pb.matrix = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
        self.upd()

    def arm(self, S, upper, fore):
        self.aim(f'{S}_UpperArm', mx(upper, S)); self.aim(f'{S}_ForeArm', mx(fore, S))

    def ankle_target(self, S, offset, space='body'):
        a0 = self.ankle0[S]; off = mx(offset, S)
        if space == 'world':  # planted: rest ankle + offset, not turned by the body yaw
            return Vector((a0.x, a0.y, a0.z)) + off
        return self.body(Vector((a0.x, a0.y, 0))) + Vector((0, 0, a0.z)) + self.body(off)

    def leg(self, S, target, hint=(0, -1, 0), foot=('flat', 0), foot_yaw=None):
        """Two-bone IK to a world-space ankle target; knee bends toward the body-frame hint."""
        th, ca = self.pb(f'{S}_Thigh'), self.pb(f'{S}_Calf')
        hip = th.head.copy(); L1 = th.bone.length; L2 = ca.bone.length
        d = target - hip; dist = max(.05, min(d.length, (L1 + L2) * .999)); dn = d.normalized()
        a = math.acos(max(-1, min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))))
        hv = self.body(mx(hint, S)); n = hv - dn * hv.dot(dn)
        n = n.normalized() if n.length > 1e-6 else self.body(Vector((0, -1, 0)))
        knee = hip + L1 * (math.cos(a) * dn + math.sin(a) * n)
        self._point(th, knee - hip); self._point(ca, hip + dn * dist - knee)
        mode, ang = foot
        ft = self.pb(f'{S}_Foot')
        if mode == 'pointed':  # instep in line with the shin (kicks)
            shin = (ca.tail - ca.head).normalized()
            q = (ft.tail - ft.head).rotation_difference((shin + self.body(Vector((0, -1, 0))) * math.tan(math.radians(ang))).normalized())
            ft.matrix = Matrix.Translation(ft.head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-ft.head) @ ft.matrix; self.upd()
        else:
            yaw = self.yaw if foot_yaw is None else foot_yaw
            r = Matrix.Rotation(math.radians(yaw), 4, 'Z') @ Matrix.Rotation(math.radians(ang), 4, 'X')
            ft.matrix = Matrix.Translation(ft.head) @ r @ ft.bone.matrix_local.to_3x3().to_4x4(); self.upd()

    def _point(self, pb, d):
        h = pb.head.copy(); q = (pb.tail - pb.head).rotation_difference(d)
        pb.matrix = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix; self.upd()

    def head(self, pitch=0, turn=0):
        pb = self.pb('Head')
        r = Matrix.Rotation(math.radians(self.yaw + turn), 4, 'Z') @ Matrix.Rotation(math.radians(pitch), 4, 'X')
        pb.matrix = Matrix.Translation(pb.head) @ r @ pb.bone.matrix_local.to_3x3().to_4x4(); self.upd()

    def fist(self, S, amount=1):
        for n, a in ((f'{S}_Finger1', 65), (f'{S}_Finger2', 70), (f'{S}_Thumb2', 30)):
            self.pb(n).rotation_quaternion = Quaternion((1, 0, 0), math.radians(a * amount))
        self.upd()

    def cord(self, back, out):
        """Cordão chain: back (+X rot, degrees) and outward (away from the left thigh)."""
        if 'Cord01' not in self.rig.pose.bones:   # characters without a cordão (Vaqueiro)
            return
        for n, k in (('Cord01', 1), ('Cord02', .7), ('Cord03', .5)):
            self.rot(n, 'X', back * k); self.rot(n, 'Y', -out * k)


# ------------------------------------------------------------------ parameters
RELAX = ((.22, .02, -.97), (.12, -.2, -.97))
GUARD = ((.35, -.55, -.75), (-.3, -.45, .84))       # hand in front of the face
LOW = ((.45, -.35, -.82), (.15, -.75, -.64))         # forearm forward, low
BALANCE = ((.55, .45, -.7), (.2, .3, -.93))          # arm thrown back for balance
FLOOR = ((.2, -.45, -.87), (.05, -.2, -.98))         # hand reaching the floor

# A key is a dict of overrides; missing entries inherit from the previous key.
BASE = dict(hips=(0, .05, -.12), yaw=0, pitch=0, roll=0, chest=(12, 0, 0), chest2=(4, 0, 0),
            armL=LOW, armR=GUARD, fistL=.3, fistR=.6, head=(0, 0),
            footL=((.03, -.05, 0), 'world'), footR=((0, .40, 0), 'world'),
            hintL=(0, -1, 0), hintR=(0, -1, 0), modeL=('flat', 0), modeR=('flat', 12))
GINGA_R = dict(BASE)
GINGA_L = dict(BASE, armL=GUARD, armR=LOW, fistL=.6, fistR=.3, yaw=-0, footL=((0, .40, 0), 'world'), footR=((.03, -.05, 0), 'world'),
               modeL=('flat', 12), modeR=('flat', 0))
OPEN = dict(BASE, hips=(0, 0, -.16), footL=((.08, -.05, 0), 'world'), footR=((.08, -.05, 0), 'world'), modeL=('flat', 0), modeR=('flat', 0))


def K(t, base=None, **kw):
    """Key at t seconds: optional preset, then overrides."""
    return (t, dict(base or {}, **kw))


CLIPS = {
    # Ginga: triangle step; the travelling foot lifts at mid-step; the back-leg arm guards.
    'idle': (1.963, True, [
        K(0, GINGA_R, yaw=12),
        K(.25, footR=((.04, .18, .07), 'world')),
        K(.49, OPEN, yaw=0),
        K(.74, footL=((.04, .18, .07), 'world')),
        K(.98, GINGA_L, yaw=-12),
        K(1.22, footL=((.04, .18, .07), 'world')),
        K(1.47, OPEN, yaw=0),
        K(1.72, footR=((.04, .18, .07), 'world')),
        K(1.963, GINGA_R, yaw=12)]),
    # Run: generated (see run_keys) - stance moves back on the ground, swing lifts forward.
    'run': (.48, True, None),
    # Martelo: roundhouse with the back (right) leg. Contact 0.16 s, ankle at chest height.
    'combo0': (.42, False, [
        K(0, GINGA_R),
        K(.05, hips=(.03, 0, -.09), yaw=-18, footR=((-.12, .22, .26), 'body'), hintR=(0, -1, .3), modeR=('pointed', 10), armL=GUARD, fistL=.7),
        K(.11, yaw=-48, roll=0, chest=(6, 10, 0), footR=((-.3, -.06, .62), 'body'), hintR=(-.6, -.6, .6), armR=BALANCE, fistR=.8),
        K(.16, hips=(.05, .03, -.06), yaw=-72, chest=(0, 24, 0), footR=((-.16, -.78, 1.06), 'body'), hintR=(-1, 0, .45), head=(0, 30)),
        K(.22, yaw=-58, chest=(4, 14, 0), footR=((-.3, -.1, .6), 'body'), hintR=(-.6, -.6, .6), head=(0, 15)),
        K(.30, hips=(.02, .02, -.1), yaw=-28, chest=(10, 4, 0), footR=((-.1, .2, .2), 'body'), hintR=(0, -1, .3), armR=GUARD),
        K(.42, GINGA_R)]),
    # Galopante: right open-hand strike, small step in with the right foot.
    'combo1': (.42, False, [
        K(0, GINGA_R),
        K(.07, yaw=22, chest=(10, 0, -22), armR=((.85, .3, .2), (.6, .5, .5)), fistR=0, footR=((0, .3, 0), 'world')),
        K(.16, yaw=-18, hips=(0, -.04, -.11), chest=(10, 0, 30), armR=((.1, -.95, .15), (-.25, -.95, .1)), footR=((0, .12, 0), 'world'), modeR=('flat', 0)),
        K(.28, yaw=-8, chest=(10, 0, 12), armR=((.3, -.6, -.4), (.0, -.8, .3))),
        K(.42, GINGA_R)]),
    # Armada: full turn, the right leg swings straight and high around the body. Contact 0.30 s.
    'combo2': (.62, False, [
        K(0, GINGA_R),
        K(.10, yaw=-75, hips=(.02, .02, -.08), footR=((-.15, .2, .1), 'body'), armL=((.8, .1, -.55), (.7, -.4, -.55)), armR=((.75, .3, -.55), (.6, -.2, -.75))),
        K(.20, yaw=-160, footR=((-.45, .25, .55), 'body'), hintR=(-.3, 0, 1), modeR=('pointed', 0), chest=(4, 14, 0)),
        K(.30, yaw=-245, footR=((-.8, -.15, 1.0), 'body'), chest=(0, 22, 0), head=(0, 20)),
        K(.40, yaw=-305, footR=((-.6, -.45, .75), 'body')),
        K(.50, yaw=-345, footR=((-.15, .1, .18), 'body'), hintR=(0, -1, .3), chest=(10, 4, 0), head=(0, 0)),
        K(.62, GINGA_R, yaw=-360)]),
    # Rasteira: deep squat on the left leg, hand on the floor, right leg sweeps along the ground.
    'rasteira': (.55, False, [
        K(0, GINGA_R),
        K(.10, hips=(0, .05, -.38), yaw=15, chest=(38, 0, 0), chest2=(10, 0, 0), armL=FLOOR, footR=((-.3, .55, .06), 'body'), hintR=(0, -1, .1),
          footL=((.05, -.05, 0), 'world'), hintL=(.15, -1, 0), modeR=('flat', 60), head=(15, 0)),
        K(.22, hips=(0, .05, -.44), yaw=-20, footR=((-.85, -.05, .05), 'body')),
        K(.34, yaw=-50, footR=((-.4, -.72, .05), 'body')),
        K(.45, hips=(0, .05, -.3), yaw=-25, footR=((-.1, .2, .05), 'body'), modeR=('flat', 10)),
        K(.55, GINGA_R)]),
    # Meia-lua de compasso: hands down, torso folded, the right leg circles high. Contact 0.38 s.
    'meialua': (.75, False, [
        K(0, GINGA_R),
        K(.15, yaw=-60, hips=(0, .05, -.22), chest=(55, 0, 0), chest2=(18, 0, 0), armL=FLOOR, armR=FLOOR, head=(20, 0),
          footR=((-.25, .4, .35), 'body'), hintR=(0, .3, 1), footL=((.05, -.05, 0), 'world'), hintL=(0, -1, 0)),
        K(.27, yaw=-130, footR=((-.55, .35, .9), 'body'), modeR=('pointed', 0)),
        K(.38, yaw=-200, footR=((-.75, .05, 1.18), 'body')),
        K(.47, yaw=-270, footR=((-.6, -.35, .85), 'body')),
        K(.58, yaw=-320, footR=((-.2, .25, .15), 'body'), modeR=('flat', 10), hintR=(0, -1, .2)),
        K(.75, GINGA_R, yaw=-360)]),
    # Rolê: low turning evasion around the planted left foot.
    'dodge': (.38, False, [
        K(0, GINGA_R),
        K(.12, yaw=-120, hips=(0, 0, -.36), roll=-12, chest=(40, 0, 0), armL=FLOOR, footR=((-.3, .25, .02), 'body'), head=(10, 0)),
        K(.25, yaw=-240, footR=((-.35, .1, .02), 'body')),
        K(.38, GINGA_R, yaw=-360)]),
    'jump': (.6, False, [
        K(0, hips=(0, 0, 0), chest=(6, 0, 0), chest2=(0, 0, 0), armL=((.6, -.3, .75), (.3, -.5, .8)), armR=((.6, -.3, .75), (.3, -.5, .8)),
          footL=((0, .05, .32), 'body'), footR=((0, .1, .26), 'body'), hintL=(0, -1, .2), hintR=(0, -1, .2), modeL=('flat', 20), modeR=('flat', 20),
          fistL=.5, fistR=.5, head=(0, 0)),
        K(.6)]),
    'hit': (.28, False, [
        K(0, GINGA_R),
        K(.08, hips=(0, .08, -.1), chest=(-18, 0, 0), chest2=(-8, 0, 0), armL=((.8, .3, .2), (.7, .5, .3)), armR=((.8, .3, .1), (.8, .4, .2)), head=(-15, 0)),
        K(.28, GINGA_R)]),
    'dead': (.65, False, [
        K(0, GINGA_R),
        K(.25, hips=(0, .1, -.32), chest=(-25, 0, 0), armL=((.8, .1, -.2), (.8, -.2, -.3)), armR=((.8, .1, -.2), (.8, -.2, -.3)), head=(-20, 0),
          footL=((.05, -.1, 0), 'world'), footR=((0, .1, 0), 'world')),
        K(.65, hips=(0, .45, -.8), pitch=-85, chest=(0, 0, 0), chest2=(0, 0, 0), armL=((.9, .3, 0), (.9, .3, -.1)), armR=((.85, .4, 0), (.8, .5, 0)),
          footL=((.1, -.75, .1), 'body'), footR=((-.05, -.8, .05), 'body'), hintL=(0, 0, 1), hintR=(0, 0, 1), head=(0, 0))]),
    'victory': (1.571, True, [
        K(0, hips=(0, 0, -.02), chest=(-4, 0, 0), chest2=(0, 0, 0), armR=((.3, -.1, .95), (.1, 0, 1)), fistR=1, armL=((.6, .25, -.75), (-.55, -.35, -.3)), fistL=.2,
          footL=((.08, 0, 0), 'world'), footR=((.08, 0, 0), 'world'), modeL=('flat', 0), modeR=('flat', 0), head=(-8, 0)),
        K(.785, hips=(0, 0, -.04), chest=(-6, 0, 0)),
        K(1.571, hips=(0, 0, -.02), chest=(-4, 0, 0))]),
    'apose': (1.0, False, [K(0, apose=True), K(1.0, apose=True)]),
}
LOOPS = {n for n, (d, loop, k) in CLIPS.items() if loop}


def run_keys(dur=.48, n=12):
    """Running cycle: each foot spends ~55% on the ground moving back, then swings forward lifted."""
    keys = []
    for i in range(n + 1):
        u = i / n; t = u * dur; k = {}
        for S, ph in (('L', 0), ('R', .5)):
            p = (u + ph) % 1
            if p < .55:  # stance: forward -> back on the ground
                y = -.30 + .60 * p / .55; z = 0; pitch = -8 + 30 * p / .55
            else:        # swing: back -> forward, lifted
                q = (p - .55) / .45; y = .30 - .60 * q; z = .22 * math.sin(math.pi * q); pitch = 20 - 28 * q
            k[f'foot{S}'] = ((0, y, z), 'body'); k[f'mode{S}'] = ('flat', pitch); k[f'hint{S}'] = (0, -1, 0)
        sw = math.sin(2 * math.pi * u)
        k.update(hips=(0, 0, -.06 + .025 * math.cos(4 * math.pi * u)), yaw=0, pitch=0, roll=0, chest=(14, 0, 8 * sw), chest2=(2, 0, 0),
                 armL=((.15, -.55 * sw, -.82), (.05, -.85, .5 if sw > 0 else -.3)), armR=((.15, .55 * sw, -.82), (.05, -.85, -.3 if sw > 0 else .5)),
                 fistL=.7, fistR=.7, head=(4, 0))
        keys.append((t, k))
    return keys


# ------------------------------------------------------------------ interpolation and solving
def _flat(v):
    if isinstance(v, (int, float)):
        return [float(v)]
    if isinstance(v, str):
        return []
    out = []
    for x in v:
        out += _flat(x)
    return out


def _unflat(tmpl, it):
    if isinstance(tmpl, (int, float)):
        return next(it)
    if isinstance(tmpl, str):
        return tmpl
    return tuple(_unflat(x, it) for x in tmpl)


def resolve(keys):
    """Fill inheritance: every key carries every parameter."""
    out = []; cur = dict(BASE)
    for t, kw in keys:
        cur = dict(cur, **kw); out.append((t, dict(cur)))
    return out


def pchip(ts, ys, t):
    """Monotone cubic Hermite (Fritsch-Carlson), no overshoot between keys."""
    ts = np.asarray(ts, float); ys = np.asarray(ys, float)
    if t <= ts[0]:
        return ys[0]
    if t >= ts[-1]:
        return ys[-1]
    i = int(np.searchsorted(ts, t) - 1); h = np.diff(ts); d = np.diff(ys, axis=0) / h[:, None]
    m = np.zeros_like(ys)
    for k in range(1, len(ts) - 1):
        same = d[k - 1] * d[k] > 0
        w1 = 2 * h[k] + h[k - 1]; w2 = h[k] + 2 * h[k - 1]
        m[k] = np.where(same, (w1 + w2) / (w1 / np.where(same, d[k - 1], 1) + w2 / np.where(same, d[k], 1)), 0)
    s = (t - ts[i]) / h[i]
    h00 = 2 * s ** 3 - 3 * s ** 2 + 1; h10 = s ** 3 - 2 * s ** 2 + s; h01 = -2 * s ** 3 + 3 * s ** 2; h11 = s ** 3 - s ** 2
    return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]


def foot_world(rkeys, t, S, a0, yaw_t):
    """World ankle target. Keys may be planted ('world') or body-relative; every key is
    converted to a body offset with its own yaw so the path stays continuous across a switch,
    and planted->planted intervals use the exact world position (no foot slide)."""
    ts = [k[0] for k in rkeys]; a0 = Vector(a0)

    def world_of(k):
        off, space = k['foot' + S]; off = mx(off, S)
        if space == 'world':
            return a0 + off
        R = Matrix.Rotation(math.radians(k['yaw']), 3, 'Z')
        return R @ Vector((a0.x, a0.y, 0)) + Vector((0, 0, a0.z)) + R @ off

    def body_of(k):
        off, space = k['foot' + S]; off = mx(off, S)
        if space == 'body':
            return off
        R = Matrix.Rotation(-math.radians(k['yaw']), 3, 'Z')
        return R @ (a0 + off - Vector((0, 0, a0.z))) - Vector((a0.x, a0.y, 0))
    i = int(np.clip(np.searchsorted(ts, t, side='right') - 1, 0, len(ts) - 2))
    k0, k1 = rkeys[i][1], rkeys[i + 1][1]
    if k0['foot' + S][1] == 'world' and k1['foot' + S][1] == 'world':
        u = (t - ts[i]) / max(ts[i + 1] - ts[i], 1e-9); u = u * u * (3 - 2 * u)
        return world_of(k0).lerp(world_of(k1), u)
    b = pchip(ts, np.stack([np.array(body_of(k[1])) for k in rkeys]), t)
    R = Matrix.Rotation(math.radians(yaw_t), 3, 'Z')
    return R @ Vector((a0.x, a0.y, 0)) + Vector((0, 0, a0.z)) + R @ Vector(b)


def params_at(rkeys, t, ankles=None):
    tmpl = rkeys[0][1]; names = [k for k in tmpl if k != 'apose']
    ts = [k[0] for k in rkeys]
    vals = [np.array(_flat([k[1][n] for n in names])) for k in rkeys]
    v = pchip(ts, np.stack(vals), t)
    # Discrete fields (spaces, foot modes) switch at the key that introduces them.
    idx = max(0, int(np.searchsorted(ts, t, side='right') - 1))
    p = _unflat([rkeys[idx][1][n] for n in names], iter(v.tolist()))
    p = dict(zip(names, p))
    p['apose'] = rkeys[idx][1].get('apose', False)
    if ankles is not None:
        for S in 'LR':
            p['target' + S] = foot_world(rkeys, t, S, ankles[S], p['yaw'])
    return p


def solve(pose, p, cord_state):
    if p['apose']:
        return
    pose.hips(p['hips'], p['yaw'], p['pitch'], p['roll'])
    pose.rot('Chest1', 'X', p['chest'][0]); pose.rot('Chest1', 'Y', p['chest'][1]); pose.rot('Chest1', 'Z', p['chest'][2])
    pose.rot('Chest2', 'X', p['chest2'][0])
    pose.arm('L', *p['armL']); pose.arm('R', *p['armR'])
    pose.fist('L', p['fistL']); pose.fist('R', p['fistR'])
    for S in 'LR':
        pose.leg(S, p['target' + S], p[f'hint{S}'], p[f'mode{S}'])
    pose.head(*p['head'])
    if cord_state is not None:
        pose.cord(*cord_state)


def cord_dynamics(samples, dt):
    """Damped spring for the cordão driven by hip acceleration and yaw rate; the left thigh
    pushes it forward (it hangs on the outer seam of the left leg)."""
    th = np.zeros(2); vel = np.zeros(2); out = []
    w0 = 2 * math.pi * 1.6; zeta = .35
    for i, s in enumerate(samples):
        prev = samples[max(0, i - 1)]; nxt = samples[min(len(samples) - 1, i + 1)]
        acc = (np.array(nxt['hip_world']) - 2 * np.array(s['hip_world']) + np.array(prev['hip_world'])) / dt ** 2
        yaw_rate = (nxt['yaw'] - prev['yaw']) / (2 * dt)
        drive = np.array([-acc[1] * 1.5, abs(yaw_rate) * .035])  # back/forward from fwd accel, outward from spin
        a = -w0 ** 2 * th - 2 * zeta * w0 * vel + w0 ** 2 * drive
        vel += a * dt; th += vel * dt
        back = float(np.clip(th[0], -30, 30)); outw = float(np.clip(th[1], 0, 35))
        back = min(back, -s['thighL_fwd'] * .8)  # never behind the swinging left thigh
        out.append((back, outw))
    return out


def bake_clips(rig, rest_ankles):
    """Author every clip as its own Action, solved every SAMPLE s, keys kept continuous."""
    bpy.context.scene.render.fps = FPS
    rig.animation_data_create()
    made = []
    for name, (dur, loop, keys) in CLIPS.items():
        rkeys = resolve(run_keys(dur) if keys is None else keys)
        n = max(2, round(dur / SAMPLE)); times = [dur * i / n for i in range(n + 1)]
        # pass 1: body only, record what drives the cordão
        rig.animation_data.action = None
        rec = []
        reps = 2 if loop else 1
        for r in range(reps):
            for t in times:
                p = params_at(rkeys, t, rest_ankles); pose = Pose(rig, rest_ankles); solve(pose, p, None)
                th = rig.pose.bones['L_Thigh']; fwd = -(th.tail - th.head).normalized().y  # >0 when the thigh swings forward
                rec.append(dict(hip_world=tuple(rig.pose.bones['Base'].head), yaw=p['yaw'], thighL_fwd=math.degrees(math.asin(max(-1, min(1, fwd))))))
        cord = cord_dynamics(rec, dur / n)[-len(times):]
        # pass 2: final poses with the cordão
        frames = []
        for t, c in zip(times, cord):
            p = params_at(rkeys, t, rest_ankles); pose = Pose(rig, rest_ankles); solve(pose, p, c)
            frames.append((round(t * FPS), {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}))
        act = bpy.data.actions.new(name); act.use_fake_user = True; rig.animation_data.action = act
        prev = {}
        for f, posed in frames:
            for pb in rig.pose.bones:
                q, loc = posed[pb.name]
                if pb.name in prev and prev[pb.name].dot(q) < 0:
                    q.negate()
                prev[pb.name] = q.copy(); pb.rotation_quaternion = q; pb.location = loc
                pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
        for fc in _fcurves(act):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'  # dense keys: no Bezier overshoot between samples
        act.use_frame_range = True; act.frame_start = 0; act.frame_end = round(dur * FPS)
        made.append(name)
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    return made


# ------------------------------------------------------------------ mocap retarget (Mixamo)
MIXAMO_MAP = {
    'Hips': 'Base', 'Spine': 'Waist', 'Spine1': 'Chest1', 'Spine2': 'Chest2', 'Neck': 'Neck', 'Head': 'Head',
    **{f'{side}{src}': f'{S}_{dst}' for side, S in (('Left', 'L'), ('Right', 'R')) for src, dst in (
        ('Shoulder', 'Shoulder'), ('Arm', 'UpperArm'), ('ForeArm', 'ForeArm'), ('Hand', 'Hand'),
        ('HandMiddle1', 'Finger1'), ('HandMiddle2', 'Finger2'), ('HandThumb1', 'Thumb1'), ('HandThumb2', 'Thumb2'),
        ('UpLeg', 'Thigh'), ('Leg', 'Calf'), ('Foot', 'Foot'), ('ToeBase', 'Toe1'))},
}


def bake_mixamo(rig, rest_ankles, fbx, name, sway=.15, blend_s=.25, loop=True, duration=None, contact=None,
                segment=None, source_contact=None, contact_mode='height', return_blend=0.0, action=None, airborne=False, head_margin=.1, ends_extra=()):
    """Retarget a Mixamo clip onto the pipeline rig. Both rigs rest in a T-pose facing -Y, so
    each bone receives the source bone's world-rotation change from its rest pose. The hips keep
    their height and `sway` of the horizontal travel (game idles stay in place); the cordão
    spring runs on top. Loops are cross-faded end->start. Attacks: `duration`/`contact` retime
    the take in two linear pieces so the kicking foot's peak (auto-detected) lands exactly on the
    combat hit time. `segment` = [a, b] source seconds to use; `contact_mode` 'reach' finds the
    low sweep (max horizontal foot distance from the hips); `source_contact` overrides detection;
    `return_blend` = tail fraction cross-faded back to the take's first pose (neutral stance).
    `airborne`: the game supplies the jump arc (root height), so the take's own lift (lowest foot above
    its first-frame height) is removed from the hips: the tucked legs stay, the height is not doubled.
    `head_margin`: skin above the head bone's tail for the floor clamp (a wide hat brim needs more);
    `ends_extra`: more (bone, skin) tails for that clamp (knees of thick leg armour in a roll).
    Non-looping takes are detrended: the net travel start->end is removed, local motion kept."""
    sc = bpy.context.scene
    before = set(bpy.data.objects)
    if str(fbx).lower().endswith('.blend'):
        # Clip authored on a Mixamo control rig (mixamo_author.py): append the rig (its rest is the
        # true T-pose; FBX export of a constrained rig writes the current pose as rest) and the action.
        with bpy.data.libraries.load(str(fbx), link=False) as (src_data, dst):
            dst.objects = [n for n in src_data.objects]; dst.actions = [action]
        new = [o for o in dst.objects if o is not None]
        for o in new:
            bpy.context.scene.collection.objects.link(o)
        src = next(o for o in new if o.type == 'ARMATURE')
        src.animation_data_create(); sact = dst.actions[0]; src.animation_data.action = sact
        bpy.context.view_layer.update()
    else:
        bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False)
        new = [o for o in bpy.data.objects if o not in before]
        src = next(o for o in new if o.type == 'ARMATURE'); sact = src.animation_data.action
    f0, f1 = (int(x) for x in sact.frame_range); src_fps = sact.get('fps') or sc.render.fps / sc.render.fps_base
    pre = next(b.name.split(':')[0] + ':' for b in src.data.bones if ':' in b.name) if any(':' in b.name for b in src.data.bones) else ''
    pairs = [(pre + s, d) for s, d in MIXAMO_MAP.items() if pre + s in src.pose.bones and d in rig.pose.bones]
    order = [b.name for b in rig.data.bones]
    pairs.sort(key=lambda p: order.index(p[1]))
    rest_s = {s: (src.matrix_world @ src.data.bones[s].matrix_local).to_3x3().normalized().to_quaternion() for s, _ in pairs}
    rest_d = {d: rig.data.bones[d].matrix_local.to_quaternion() for _, d in pairs}
    hip0 = src.matrix_world @ src.data.bones[pre + 'Hips'].head_local; base0 = rig.data.bones['Base'].head_local.copy()
    k = base0.z / hip0.z
    seg0 = segment[0] if segment else 0.0
    src_dur = (segment[1] - segment[0]) if segment else (f1 - f0) / src_fps
    src_contact = None if source_contact is None else source_contact - seg0
    if contact is not None and src_contact is None:  # moment of impact in the take
        peaks = []
        for f in range(f0, f1 + 1):
            ts = (f - f0) / src_fps - seg0
            if not (0 <= ts <= src_dur):
                continue
            sc.frame_set(f); hip = src.matrix_world @ src.pose.bones[pre + 'Hips'].head
            feet = [src.matrix_world @ src.pose.bones[pre + n_].head for n_ in ('LeftFoot', 'RightFoot')]
            score = max(p.z for p in feet) if contact_mode == 'height' else max(math.hypot(p.x - hip.x, p.y - hip.y) for p in feet if p.z < .35)
            peaks.append((score, ts))
        src_contact = max(peaks)[1]
    dur = duration or src_dur; n = max(2, round(dur / SAMPLE)); times = [dur * i / n for i in range(n + 1)]

    def src_time(t):
        if src_contact is None:
            return t * src_dur / dur
        return t / contact * src_contact if t <= contact else src_contact + (t - contact) / (dur - contact) * (src_dur - src_contact)
    sc.render.fps = FPS
    rig.animation_data_create(); rig.animation_data.action = None
    raw = []
    for t in times:
        fr = min(f0 + (seg0 + src_time(t)) * src_fps, f1); tgt = int(fr)
        sc.frame_set(tgt + 1 if tgt < f1 else tgt - 1)  # setting the current frame again does not re-evaluate
        sc.frame_set(tgt, subframe=fr - tgt)
        wq = {s: (src.matrix_world @ src.pose.bones[s].matrix).to_3x3().normalized().to_quaternion() for s, _ in pairs}
        hip = src.matrix_world @ src.pose.bones[pre + 'Hips'].head
        if airborne:
            low = min((src.matrix_world @ src.pose.bones[pre + n_].head).z for n_ in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase',
                      'LeftToe_End', 'RightToe_End') if pre + n_ in src.pose.bones)
            if not raw: low0 = low
            hip = hip - Vector((0, 0, max(0., low - low0)))
        raw.append((wq, hip))
    # In place: keep the height, a little of the sideways/forward travel.
    hips = np.array([[h.x, h.y, h.z] for _, h in raw]); mean_xy = hips[:, :2].mean(0)
    # Neutral reference for the return blend: the take's very first pose.
    sc.frame_set(f0)
    first = {s: (src.matrix_world @ src.pose.bones[s].matrix).to_3x3().normalized().to_quaternion() for s, _ in pairs}
    first_hip = src.matrix_world @ src.pose.bones[pre + 'Hips'].head
    if return_blend:
        nb_ = max(1, round(return_blend * len(raw)))
        for j in range(nb_):
            a_ = ((j + 1) / nb_) ** 1.5; i_ = len(raw) - nb_ + j; wq_, hip_ = raw[i_]
            wq2 = {s_: wq_[s_].slerp(first[s_] if wq_[s_].dot(first[s_]) >= 0 else -first[s_], a_) for s_ in wq_}
            raw[i_] = (wq2, hip_.lerp(Vector((hip_.x, hip_.y, first_hip.z)), a_))
            hips[i_, 2] = raw[i_][1].z
    rec, frames = [], []
    pose = None
    for i, (t, (wq, hip)) in enumerate(zip(times, raw)):
        pose = Pose(rig, rest_ankles)
        if loop:
            ref = mean_xy
        else:  # detrend: remove the net travel, keep the local motion
            u_ = i / max(1, len(raw) - 1); ref = hips[0, :2] * (1 - u_) + hips[-1, :2] * u_
        off = Vector(((hip.x - ref[0]) * sway, (hip.y - ref[1]) * sway, hip.z - hip0.z)) * k
        for s, d in pairs:
            pb = rig.pose.bones[d]
            q = (wq[s] @ rest_s[s].inverted()) @ rest_d[d]
            head = base0 + off if d == 'Base' else pb.head.copy()
            pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4(); pose.upd()
        # Ground clamp: different leg proportions can sink a foot; lift the hips by the overlap.
        low = min(rig.pose.bones[f'{S}_Calf'].tail.z - rest_ankles[S].z for S in 'LR')
        # ... and every other end that can reach the floor (toes, finger tips planted in a meia-lua or a
        # flip, the head), each with its skin thickness above its bone point.
        ends = [(f'{S}_{b}', m) for S in 'LR' for b, m in (('Toe1', .03), ('Finger2', .02), ('Thumb2', .02))] + [('Head', head_margin)] + list(ends_extra)
        low = min([low] + [rig.pose.bones[n_].tail.z - m_ for n_, m_ in ends if n_ in rig.pose.bones])
        if low < -.004:
            bb = rig.pose.bones['Base']; bb.matrix = Matrix.Translation((0, 0, -low)) @ bb.matrix; pose.upd()
        th = rig.pose.bones['L_Thigh']; fwd = -(th.tail - th.head).normalized().y
        rec.append(dict(hip_world=tuple(rig.pose.bones['Base'].head), yaw=0.0, thighL_fwd=math.degrees(math.asin(max(-1, min(1, fwd))))))
        frames.append({pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones})
    cord = cord_dynamics((rec + rec) if loop else rec, dur / n)[-len(times):]
    if loop and blend_s:  # cross-fade the tail into the head (authored cycles already loop)
        nb = max(1, round(blend_s / (dur / n)))
        for j in range(nb):
            a = (j + 1) / (nb + 1); i = len(frames) - nb + j
            for bn, (q, loc) in frames[i].items():
                q0, l0 = frames[0][bn]
                frames[i][bn] = (q.slerp(q0 if q.dot(q0) >= 0 else -q0, a), loc.lerp(l0, a))
        frames[-1] = dict(frames[0])
    act = bpy.data.actions.new(name); act.use_fake_user = True
    out = []
    for i, (t, posed) in enumerate(zip(times, frames)):
        pose = Pose(rig, rest_ankles)
        for pb in rig.pose.bones:
            pb.rotation_quaternion, pb.location = posed[pb.name]
        pose.upd(); pose.cord(*cord[i])
        out.append((round(t * FPS), {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}))
    rig.animation_data.action = act; prev = {}
    for f, posed in out:
        for pb in rig.pose.bones:
            q, loc = posed[pb.name]
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q.negate()
            prev[pb.name] = q.copy(); pb.rotation_quaternion = q; pb.location = loc
            pb.keyframe_insert('rotation_quaternion', frame=f); pb.keyframe_insert('location', frame=f)
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    act.use_frame_range = True; act.frame_start = 0; act.frame_end = round(dur * FPS)
    rig.animation_data.action = None
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in [a for a in bpy.data.actions if a is sact or 'mixamo' in a.name.lower()]:
        bpy.data.actions.remove(a)  # the source take must not ship in the GLB
    return dict(name=name, seconds=round(dur, 3), source_seconds=round(src_dur, 3), source_contact=src_contact and round(src_contact, 3), bones=len(pairs), hip_travel_m=[round(float(np.ptp(hips[:, 0])), 3), round(float(np.ptp(hips[:, 1])), 3)])


def _fcurves(act):
    try:
        return [fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    except AttributeError:
        return list(act.fcurves)
