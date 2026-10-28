"""Curupira boss motion: key poses on a fresh Mixamo control rig, baked to Lunia.

No imported capture, skeleton or other character's action. Why it is built this way (doc 20):
- Pose to pose: every clip is a list of key poses (holds, anticipation, strike, follow
  through) joined by monotone cubic curves (ease only at real extremes); loops add
  periodic layers (breath, weight shift, looking around).
- Overlap: each channel group samples the clip a little later than its parent
  (pelvis -> spine -> neck -> head; clavicle -> arm -> forearm -> hand -> fingers).
- The add-on's controls are posed in a rest-aligned frame: FK torso/arms/fingers, IK feet
  with heel/toe pivots and knee poles. They are keyed in mocap/authored-rig.blend for
  hand editing; the evaluated deform skeleton is copied to the Lunia bones as rotations.
- Mane (Hair01-02) and leaf skirt (Skirt<dir>01-02) are damped springs driven by the baked
  body and kept out of thighs and back. Warning + impact run as one take, so the impact
  frame has no pop; loops are simulated until periodic.
"""
import bpy, math, re, bisect, addon_utils
from mathutils import Vector, Matrix

D = math.radians
SIDES = (('L', 'Left', 1), ('R', 'Right', -1))
FINGERS = [('Index', (.8, .85, .7)), ('Middle', (1, 1, .8)), ('Ring', (1.1, 1.05, .85)), ('Pinky', (1.2, 1.1, .9))]
ARM = ['shrug', 'prot', 'abd', 'swing', 'h', 'twist', 'elbow', 'pron', 'wrist', 'dev', 'curl', 'thumb']
CH = [g + '.' + k for g in ('root', 'pelvis', 'spine', 'neck', 'head') for k in ('pitch', 'yaw', 'roll')] + ['root.x', 'root.y', 'root.z']
CH += [S + '.' + k for S in 'LR' for k in ARM] + [S + 'f.' + k for S in 'LR' for k in ('x', 'y', 'z', 'yaw', 'pitch')]
DELAY = {'spine': .03, 'neck': .06, 'head': .09, 'shrug': .04, 'prot': .04, 'abd': .06, 'swing': .06, 'h': .06, 'twist': .06,
         'elbow': .10, 'pron': .11, 'wrist': .13, 'dev': .13, 'curl': .16, 'thumb': .16}
HEEL, TOE = -.033, .095      # ground pivots of the reversed foot, H units from the ankle (heel is in front)


def rot(pitch=0, yaw=0, roll=0):
    """pitch + bends forward (-Y), yaw + turns to the character's left (+X), roll + tilts left."""
    return Matrix.Rotation(D(yaw), 3, 'Z') @ Matrix.Rotation(D(roll), 3, 'Y') @ Matrix.Rotation(D(pitch), 3, 'X')


def arm_dir(s, abd, swing, h):
    """Arm direction in the chest frame: abd out from hanging, swing forward, h sweeps horizontally to the front."""
    d = Matrix.Rotation(D(-s * abd), 3, 'Y') @ Vector((0, 0, -1))
    return Matrix.Rotation(D(-s * h), 3, 'Z') @ (Matrix.Rotation(D(-swing), 3, 'X') @ d)


def delay(ch):
    g, k = ch.split('.')
    if g in ('root', 'pelvis') or g.endswith('f'):
        return 0
    return DELAY[g] if g in DELAY else DELAY[k]


def slopes(ts, vs):
    """Monotone cubic tangents (no overshoot between keys; flat only at extremes)."""
    n = len(ts); h = [ts[i + 1] - ts[i] for i in range(n - 1)]; d = [(vs[i + 1] - vs[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    return m


def hermite(ts, vs, ms, t):
    if t <= ts[0]: return vs[0]
    if t >= ts[-1]: return vs[-1]
    i = bisect.bisect_right(ts, t) - 1; h = ts[i + 1] - ts[i]; x = (t - ts[i]) / h
    return ((2 * x ** 3 - 3 * x * x + 1) * vs[i] + (x ** 3 - 2 * x * x + x) * h * ms[i]
            + (-2 * x ** 3 + 3 * x * x) * vs[i + 1] + (x ** 3 - x * x) * h * ms[i + 1])


class Take:
    """One continuous performance, split into game clips [(name, t0, t1)].
    keys: [(t, {channel: value})]; a value overrides the previous key, None restores the
    stance, 'channel+' adds to the stance. layer(t) adds; proc(t, pose) edits in place."""

    def __init__(self, clips, dur, base, keys=(), loop=False, layer=None, proc=None, lag=1.0):
        self.clips, self.dur, self.loop, self.layer, self.proc, self.lag = clips, dur, loop, layer, proc, lag
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
        self.curves = {}
        for c in CH:
            vs = [p[c] for _, p in poses]
            self.curves[c] = (vs, slopes(self.ts, vs) if len(vs) > 1 else [0.0])

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
            tt = t - delay(c) * self.lag
            tt = tt % self.dur if self.loop else max(0.0, tt)
            key = round(tt, 6)
            if key not in cache: cache[key] = self.raw(tt)
            out[c] = cache[key][c]
        return out


def takes(e, H, cfg):
    """All Curupira clips. e = corrupted form (heavier, hunched, wider)."""
    base = {c: 0.0 for c in CH}
    base.update({'root.z': -.05 if e else -.022, 'pelvis.pitch': 8 if e else 3, 'spine.pitch': 16 if e else 2,
                 'neck.pitch': -2 if e else 2, 'head.pitch': -14 if e else -4})
    for S, y in (('L', -.015), ('R', .02)):
        base.update({S + '.shrug': 6 if e else 0, S + '.abd': 16 if e else 11, S + '.swing': 14 if e else 6,
                     S + '.elbow': 30 if e else 16, S + '.wrist': 12 if e else 6, S + '.curl': .55 if e else .3,
                     S + '.thumb': .4 if e else .25, S + 'f.x': .10 if e else .085, S + 'f.y': y * (2 if e else 1),
                     S + 'f.yaw': 10 if e else 6})
    lag = 1.35 if e else 1.0
    A = 1.6 if e else 1.0
    sin, cos, tau = math.sin, math.cos, 2 * math.pi
    T = []

    def idle(t):
        w = tau * t / 2.4; b = sin(w)
        return {'spine.pitch': -1.6 * A * b, 'L.shrug': 1.5 * A * b, 'R.shrug': 1.5 * A * b, 'L.abd': 1.2 * b, 'R.abd': 1.2 * b,
                'root.z': -.0025 * A * b, 'head.pitch': .8 * b,
                'root.x': .006 * sin(w + .6), 'pelvis.roll': -2.5 * sin(w + .6), 'spine.roll': 2 * sin(w + .2), 'head.roll': -sin(w - .2),
                'head.yaw': (9 if e else 5) * sin(w + 1.3) + 2 * sin(2 * w), 'spine.yaw': (3 if e else 1.5) * sin(w + 1),
                'L.curl': .08 * sin(w + 2), 'R.curl': .08 * sin(w + 2.6) + (.12 * sin(2 * w) if e else 0),
                'L.swing': 2 * sin(w + .9), 'R.swing': 2 * sin(w + 1.4), 'L.elbow': 3 * sin(w + 1.2), 'R.elbow': 3 * sin(w + 1.7)}
    T.append(Take([('idle', 0, 2.4)], 2.4, base, loop=True, layer=idle, lag=lag))

    # Walk in place at the boss speed: stance foot slides back exactly at body speed.
    dw = 1.0 if e else .7; duty = .58 if e else .55
    stride = cfg['speed'] * duty * dw / H; lift = .045 if e else .05
    bob, sway, swing = (.02, .022, 14) if e else (.012, .012, 22)

    def walk(t, P):
        u = (t / dw) % 1; w = tau * u
        P['root.z'] += -.022 - bob * cos(2 * w - .5); P['root.x'] += sway * sin(w)
        P['pelvis.yaw'] += -7 * cos(w); P['pelvis.roll'] += -3 * sin(w)
        P['spine.yaw'] += 5 * cos(w); P['spine.pitch'] += 5 + 1.2 * cos(2 * w - .5)
        P['head.yaw'] += -3 * cos(w); P['head.pitch'] += -2 + 1.5 * cos(2 * w - .5)
        for S, ph, sg in (('L', 0, 1), ('R', .5, -1)):
            fwd = -sg * cos(w)
            P[S + '.swing'] += swing * fwd; P[S + '.elbow'] += 8 + 9 * max(0, fwd); P[S + '.abd'] += 3 if e else 0
            q = (u - ph) % 1
            if q < duty:
                s = q / duty; y = -stride / 2 + stride * s; zz = 0
                pitch = 12 * max(0, 1 - s / .18) ** 2 - 22 * max(0, (s - .72) / .28) ** 2
            else:
                s = (q - duty) / (1 - duty); y = stride / 2 - stride * (.5 - .5 * cos(math.pi * s))
                zz = lift * sin(math.pi * s ** .8); pitch = -22 * (1 - s) ** 2 + 12 * s * s
            P[S + 'f.x'] = .09 if e else .078; P[S + 'f.y'] = y; P[S + 'f.z'] = zz; P[S + 'f.pitch'] = pitch; P[S + 'f.yaw'] = 4
    T.append(Take([('walk', 0, dw)], dw, base, loop=True, proc=walk, lag=lag))

    def tremble(t0, t1, amp):
        def f(t):
            k = amp * max(0, min(1, (t - t0) / max(1e-3, t1 - t0))) * max(0, min(1, 1 - (t - t1) / .1))
            return {'spine.roll': k * sin(tau * 7.1 * t), 'head.yaw': k * 1.3 * sin(tau * 8.7 * t + 1), 'L.curl': .03 * k * sin(tau * 5.3 * t),
                    'R.curl': .03 * k * sin(tau * 6.1 * t + 2), 'R.h': k * .8 * sin(tau * 6.3 * t)}
        return f

    # Sweep: step out, coil right with the vine arm cocked back, hold the coil, whip across
    # (impact = end of the warning), follow through, step back.
    k, w0 = cfg['sweep'] / 1.65, cfg['sweep']
    sweep = [(0, {}),
             (.12 * k, {'Lf.z': .035, 'Lf.y': -.05, 'Lf.x': .11, 'root.x': -.012, 'pelvis.roll': 3, 'spine.roll': -2}),
             (.26 * k, {'Lf.z': 0, 'Lf.y': -.10, 'Lf.x': .13, 'Lf.yaw': 22, 'root.x': .004, 'pelvis.roll': 0, 'spine.roll': 0, 'root.z': -.075,
                        'root.yaw': -10, 'spine.yaw': -14, 'spine.pitch': 18, 'R.abd': 70, 'R.swing': -5, 'R.h': -40, 'R.elbow': 45,
                        'R.wrist': -15, 'R.curl': .85, 'L.abd': 35, 'L.swing': 45, 'L.elbow': 40, 'L.curl': .35, 'head.yaw': 10, 'neck.yaw': 4,
                        'Rf.yaw': 12}),
             (.9 * k, {'root.yaw': -22, 'spine.yaw': -28, 'root.z': -.088, 'R.h': -70, 'R.abd': 80, 'R.elbow': 28, 'R.wrist': -25,
                       'head.yaw': 24, 'neck.yaw': 10, 'L.swing': 55}),
             (1.42 * k, {'root.yaw': -26, 'spine.yaw': -33, 'R.h': -82, 'root.z': -.095, 'head.yaw': 28, 'neck.yaw': 12, 'R.curl': 1}),
             (w0, {'root.yaw': 20, 'spine.yaw': 24, 'R.h': 70, 'R.abd': 86, 'R.elbow': 10, 'R.wrist': 12, 'R.curl': .7, 'L.abd': 28,
                   'L.swing': -15, 'L.elbow': 30, 'head.yaw': -6, 'neck.yaw': -2, 'root.x': .012, 'root.z': -.085, 'Rf.yaw': -18,
                   'Rf.pitch': -14, 'spine.pitch': 14}),
             (w0 + .10, {'root.yaw': 33, 'spine.yaw': 38, 'R.h': 112, 'R.elbow': 32, 'R.abd': 72, 'R.wrist': 0, 'L.swing': -22,
                         'head.yaw': -10, 'Rf.yaw': -24, 'Rf.pitch': -18}),
             (w0 + .24, {'Lf.z': .03, 'Lf.y': -.05, 'Lf.x': .105, 'root.yaw': 24, 'spine.yaw': 22, 'R.h': 80, 'R.abd': 55, 'R.elbow': 35,
                         'root.z': -.07, 'Rf.pitch': -6}),
             (w0 + .38, {'Lf.z': 0, 'Lf.y': None, 'Lf.x': None, 'Lf.yaw': None, 'Rf.yaw': None, 'Rf.pitch': 0, 'root.yaw': 8, 'spine.yaw': 6,
                         'R.h': 25, 'R.abd': 35, 'R.swing': 10, 'R.elbow': 28, 'R.wrist': 5, 'L.abd': None, 'L.swing': None, 'L.elbow': None,
                         'head.yaw': -2, 'neck.yaw': 0, 'root.x': 0, 'root.z+': -.01, 'spine.pitch+': 4}),
             (w0 + .5, {'root.yaw': 4, 'spine.yaw': 2, 'R.h': 10, 'R.abd+': 6, 'R.swing': None, 'R.elbow+': 6, 'R.curl': None,
                        'head.yaw': 0, 'root.z': None, 'spine.pitch+': 2})]
    T.append(Take([('sweepWarn', 0, w0), ('sweepHit', w0, w0 + .5)], w0 + .5, base, sweep,
                  layer=tremble(.3 * k, 1.42 * k, 1.6 if e else .8), lag=lag))

    # Basic attack (claw, left hand; the vine arm is the right): short coil to the left, swipe across with a
    # lunge on the impact frame (end of the warning), follow through, settle. Mirrors the sweep on a short clock.
    w0, h0 = cfg['basic'], cfg['basic_hit']
    claw = [(0, {}),
            (.5 * w0, {'root.yaw': 14, 'spine.yaw': 18, 'spine.pitch': 14, 'root.z': -.06, 'L.abd': 70, 'L.swing': 10, 'L.h': -55,
                       'L.elbow': 55, 'L.wrist': -15, 'L.curl': .9, 'R.swing': 20, 'R.abd': 25, 'head.yaw': -8, 'Rf.yaw': 10}),
            (.85 * w0, {'root.yaw': 18, 'spine.yaw': 22, 'L.h': -72, 'L.abd': 76, 'L.curl': 1, 'root.z': -.07}),
            (w0, {'root.yaw': -14, 'spine.yaw': -18, 'spine.pitch': 20, 'root.z': -.08, 'L.h': 62, 'L.abd': 82, 'L.elbow': 15,
                  'L.wrist': 12, 'L.curl': .8, 'Lf.y': -.09, 'Lf.x': .12, 'head.yaw': 4}),
            (w0 + .12, {'root.yaw': -20, 'spine.yaw': -24, 'L.h': 95, 'L.abd': 70, 'L.elbow': 30}),
            (w0 + h0, {'root.yaw': None, 'spine.yaw': None, 'spine.pitch': None, 'root.z': None, 'L.abd': None, 'L.swing': None,
                       'L.h': None, 'L.elbow': None, 'L.wrist': None, 'L.curl': None, 'R.swing': None, 'R.abd': None,
                       'head.yaw': None, 'Rf.yaw': None, 'Lf.y': None, 'Lf.x': None})]
    T.append(Take([('basicWarn', 0, w0), ('basicHit', w0, w0 + h0)], w0 + h0, base, claw, lag=lag))

    # Roots: widen the stance, raise both fists over the head, arch and charge, slam the
    # ground at the end of the warning, bounce and start to rise.
    k, r0 = cfg['roots'] / 2.0, cfg['roots']
    arms = lambda **v: {S + '.' + a: x for S in 'LR' for a, x in v.items()}
    roots = [(0, {}),
             (.10 * k, {'Lf.z': .03, 'Lf.x': .105, 'root.x': -.01}),
             (.20 * k, {'Lf.z': 0, 'Lf.x': .125, 'Lf.y': -.03, 'Rf.z': .03, 'Rf.x': .105, 'root.x': .008}),
             (.32 * k, {'Rf.z': 0, 'Rf.x': .125, 'Rf.y': .04, 'root.x': 0, **arms(abd=25, swing=140, elbow=35, curl=.9, wrist=-10, shrug=12),
                        'spine.pitch': -12, 'pelvis.pitch': -2, 'neck.pitch': -6, 'head.pitch': -14, 'root.z': -.045}),
             (1.1 * k, {**arms(swing=158, elbow=25), 'spine.pitch': -17, 'root.z': -.03, 'head.pitch': -18}),
             (1.72 * k, {**arms(swing=168, elbow=35, abd=20, curl=1), 'spine.pitch': -20, 'root.z': -.025, 'head.pitch': -20}),
             (r0, {**arms(abd=16, swing=62, elbow=12, wrist=-25, shrug=4), 'spine.pitch': 42, 'pelvis.pitch': 16, 'root.z': -.16,
                   'root.y': -.015, 'neck.pitch': -12, 'head.pitch': -22}),
             (r0 + .07, {'root.z': -.172, 'spine.pitch': 46, **arms(swing=58)}),
             (r0 + .22, {'root.z': -.15, 'spine.pitch': 38}),
             (r0 + .45, {'root.z': -.1, 'spine.pitch': 24, 'pelvis.pitch': 10, **arms(swing=35, elbow=25, abd=14, wrist=0, curl=.6),
                         'head.pitch': -14})]
    T.append(Take([('rootsWarn', 0, r0), ('rootsHit', r0, r0 + .45)], r0 + .45, base, roots,
                  layer=tremble(.4 * k, 1.72 * k, 1.4 if e else .7), lag=lag))

    # Call of Silence: open palms, gather the force in front, then raise it overhead with a
    # growing tremor; the arena pulse follows (callDone plays the roots slam).
    k, c0 = cfg['cast'] / 3.4, cfg['cast']

    def cast_layer(t):
        a = .5 + 3 * (t / c0) ** 2; ph = tau * t / 1.15
        return {'L.h': 14 * sin(ph), 'L.swing': 8 * cos(ph), 'R.h': 14 * sin(ph + math.pi), 'R.swing': 8 * cos(ph + math.pi),
                'spine.roll': a * sin(tau * 6.5 * t), 'head.roll': a * sin(tau * 8.3 * t + 1), 'L.curl': .08 * sin(tau * 4.7 * t),
                'R.curl': .08 * sin(tau * 4.3 * t + 1), 'root.z': -.004 * sin(tau * t / 1.7)}
    cast = [(0, {}), (.12 * k, {'Lf.z': .03, 'Lf.x': .105, 'root.x': -.008}), (.26 * k, {'Lf.z': 0, 'Lf.x': .12, 'root.x': 0}),
            (.45 * k, {**arms(abd=65, swing=35, elbow=55, pron=60, curl=.4), 'spine.pitch': -4, 'head.pitch': -6, 'root.z': -.05}),
            (1.5 * k, {**arms(abd=45, swing=75, elbow=80, curl=.6), 'spine.pitch': 6, 'head.pitch': 8, 'root.z': -.065}),
            (2.5 * k, {**arms(abd=70, swing=105, elbow=45, curl=.2), 'spine.pitch': -10, 'head.pitch': -14, 'root.z': -.04}),
            (3.15 * k, {**arms(abd=35, swing=160, elbow=22, curl=0, shrug=10), 'spine.pitch': -18, 'neck.pitch': -6, 'head.pitch': -20, 'root.z': -.02}),
            (c0, {**arms(swing=166), 'spine.pitch': -20})]
    T.append(Take([('cast', 0, c0)], c0, base, cast, layer=cast_layer, lag=lag))

    # Stagger (interrupted cast): dazed loop, one hand on the brow, the other limp.
    def stagger(t):
        w = tau * t / 1.2
        return {'root.x': .016 * sin(w), 'root.y': .01 * cos(w), 'pelvis.roll': -4 * sin(w), 'spine.roll': 5 * sin(w + .5),
                'head.roll': 8 * sin(w + 1.1), 'head.yaw': 9 * sin(w + .4) + 3 * sin(2 * w), 'root.z': -.008 * cos(2 * w),
                'spine.pitch': 3 * cos(w), 'L.swing': 5 * sin(w + .8), 'R.swing': 6 * sin(w + 1.4), 'R.abd': 3 * sin(w + 2), 'root.yaw': 4 * sin(w)}
    T.append(Take([('stagger', 0, 1.2)], 1.2, base, [(0, {
        'root.z': -.085, 'spine.pitch': 24, 'pelvis.pitch': 8, 'neck.pitch': 6, 'head.pitch': 16,
        'L.abd': 28, 'L.swing': 105, 'L.elbow': 128, 'L.h': 25, 'L.wrist': 25, 'L.curl': .45, 'L.pron': 20,
        'R.abd': 20, 'R.swing': 18, 'R.elbow': 22, 'R.curl': .25, 'R.wrist': 15,
        'Lf.x': .11, 'Rf.x': .115, 'Lf.y': -.05, 'Rf.y': .06})], loop=True, layer=stagger, lag=lag))

    # Recover: bent over, hands on the thighs, panting, eyes on the player.
    def recover(t):
        b = sin(tau * 3 * t / 2.0); w = tau * t / 2.0
        return {'spine.pitch': -3 * b, 'L.shrug': 4 * b, 'R.shrug': 4 * b, 'root.z': .005 * b, 'head.pitch': 2 * b,
                'root.x': .006 * sin(w), 'spine.roll': 2 * sin(w + .4), 'head.yaw': 6 * sin(w + 1)}
    T.append(Take([('recover', 0, 2.0)], 2.0, base, [(0, {
        'root.z': -.11, 'spine.pitch': 32, 'pelvis.pitch': 14, 'neck.pitch': 4, 'head.pitch': -26,
        **arms(abd=20, swing=48, elbow=28, wrist=32, curl=.4, shrug=8), 'Lf.x': .11, 'Rf.x': .11, 'Lf.y': -.03, 'Rf.y': .04})],
        loop=True, layer=recover, lag=lag))

    # Freed: the guardian looks at his own hand, closes it, looks around the forest.
    FREED0 = {'spine.pitch': -3, 'head.pitch': 16, 'head.yaw': 14, 'neck.pitch': 4, 'L.abd': 18, 'L.swing': 55, 'L.elbow': 100,
              'L.pron': 75, 'L.curl': .2, 'L.wrist': -10, 'R.abd': 13}

    def freed(t):
        b = sin(tau * t / 3.0)
        return {'spine.pitch': -1.5 * b, 'L.shrug': 1.5 * b, 'R.shrug': 1.5 * b, 'root.x': .004 * sin(tau * t / 3.0 + 1)}
    T.append(Take([('freed', 0, 3.0)], 3.0, base, [
        (0, FREED0),
        (1.1, {'L.curl': .75, 'head.pitch': 10, 'head.yaw': 8, 'L.elbow': 92}),
        (1.8, {'L.swing': 18, 'L.elbow': 30, 'L.abd': 14, 'L.pron': 10, 'L.curl': .4, 'L.wrist': 6, 'head.yaw': -16, 'head.pitch': -4,
               'spine.yaw': -6, 'neck.yaw': -4}),
        (2.5, {'L.swing': 42, 'L.elbow': 75, 'L.pron': 55, 'L.curl': .3, 'head.yaw': 4, 'head.pitch': 8, 'spine.yaw': 0, 'neck.yaw': 0})],
        loop=True, layer=freed, lag=lag))

    # Cinematics (web/src/config.js CINEMATIC). Dormant: folded over like a dead trunk,
    # arms hanging plumb (forward in the bent chest frame), slow breath.
    DORMANT = {'root.z': -.17, 'spine.pitch': 48, 'pelvis.pitch': 18, 'neck.pitch': 10, 'head.pitch': 25,
               **arms(abd=8, swing=55, elbow=15, wrist=10, curl=.3, shrug=0), 'Lf.x': .1, 'Rf.x': .1}

    def dormant(t):
        b = sin(tau * t / 2.4)
        return {'spine.pitch': -2.5 * b, 'root.z': .006 * b, 'head.roll': 2 * sin(tau * t / 2.4 + 1), 'L.curl': .05 * b, 'R.curl': .05 * b}
    T.append(Take([('dormant', 0, 2.4)], 2.4, base, [(0, DORMANT)], loop=True, layer=dormant, lag=lag))

    def roar_tremble(t0, t1, amp):
        f = tremble(t0, t1, amp)
        return lambda t: {k: 2.5 * v for k, v in f(t).items()}
    # Awaken: claws clench, the head lifts first, he rises with a deep breath, roars with
    # arms thrown wide, then settles into the combat stance.
    a0 = cfg['awaken']; k = a0 / 3.2
    T.append(Take([('awaken', 0, a0)], a0, base, [
        (0, DORMANT),
        (.5 * k, {**arms(curl=.95), 'head.pitch': 22}),
        (1.0 * k, {'head.pitch': -5, 'neck.pitch': 0}),
        (1.9 * k, {'root.z': -.03, 'spine.pitch': -12, 'pelvis.pitch': 0, **arms(abd=45, swing=20, elbow=35, curl=.3, wrist=0), 'head.pitch': -14}),
        (2.3 * k, {'spine.pitch': -18, 'head.pitch': -28, 'neck.pitch': -10, **arms(abd=80, swing=25, elbow=20, curl=0, shrug=14), 'root.z': -.04}),
        (2.75 * k, {'spine.pitch': -16, 'head.pitch': -24}),
        (a0, {c: None for c in ('root.z', 'spine.pitch', 'pelvis.pitch', 'neck.pitch', 'head.pitch', 'Lf.x', 'Rf.x')} |
             {S + '.' + a: None for S in 'LR' for a in ('abd', 'swing', 'elbow', 'curl', 'shrug', 'wrist')})],
        layer=roar_tremble(2.05 * k, 2.6 * k, 1.0), lag=lag))

    # Release (corrupted): the Silence is torn out: recoil, writhing arch, collapse into
    # a crouch with the hands near the ground. Rise (freed) starts from that crouch and
    # ends exactly on the first pose of 'freed'.
    r0 = cfg['release']; k = r0 / 2.2
    CROUCH = {'root.z': -.2, 'spine.pitch': 52, 'pelvis.pitch': 18, 'head.pitch': 28, 'neck.pitch': 10,
              **arms(abd=10, swing=70, elbow=20, wrist=-20, curl=.2, shrug=0, pron=0)}
    T.append(Take([('release', 0, r0)], r0, base, [
        (0, {'spine.pitch': 10, 'root.z': -.06}),
        (.25 * k, {'spine.pitch': -22, 'head.pitch': -30, 'neck.pitch': -10, **arms(abd=70, swing=40, elbow=30, curl=0, shrug=15),
                   'root.z': -.03, 'root.y': .02}),
        (1.1 * k, {'spine.pitch': -26, 'head.pitch': -32, **arms(abd=85, swing=55, elbow=15)}),
        (1.6 * k, {'spine.pitch': 30, 'root.z': -.14, 'head.pitch': 20, 'neck.pitch': 4, 'root.y': 0, **arms(abd=20, swing=40, elbow=25, curl=.2, shrug=4)}),
        (r0, CROUCH)], layer=roar_tremble(.2 * k, 1.3 * k, 1.2), lag=lag))
    s0 = cfg['rise']; k = s0 / 3.0
    T.append(Take([('rise', 0, s0)], s0, base, [
        (0, CROUCH),
        (.5 * k, {'head.pitch': -10, 'neck.pitch': 0}),
        (1.0 * k, {'spine.pitch': 40, 'root.z': -.18}),
        (1.9 * k, {'root.z': None, 'spine.pitch': None, 'pelvis.pitch': None, 'neck.pitch': None, 'head.pitch': 10, 'head.yaw': 10,
                   'L.abd': 18, 'L.swing': 40, 'L.elbow': 70, 'L.pron': 50, 'L.curl': .5, 'L.wrist': None,
                   **{'R.' + a: None for a in ('abd', 'swing', 'elbow', 'curl', 'shrug', 'wrist', 'pron')}, 'L.shrug': None}),
        (2.5 * k, FREED0), (s0, FREED0)], lag=lag))
    return T


def build(p, J):
    H = p.H; sc = bpy.context.scene; sc.render.fps = 100; evil = 'Corrompido' in p.NAME
    rig = next(o for o in bpy.data.collections[p.NAME].objects if o.type == 'ARMATURE')
    names = {'Base': 'Hips', 'Waist': 'Spine', 'Chest1': 'Spine1', 'Chest2': 'Spine2', 'Neck': 'Neck', 'Head': 'Head'}
    for s, side in [('L', 'Left'), ('R', 'Right')]:
        for a, b in [('Shoulder', 'Shoulder'), ('UpperArm', 'Arm'), ('ForeArm', 'ForeArm'), ('Hand', 'Hand'), ('Thigh', 'UpLeg'), ('Calf', 'Leg'), ('Foot', 'Foot'), ('Toe1', 'ToeBase'), ('Finger1', 'HandMiddle1'), ('Finger2', 'HandMiddle2'), ('Thumb1', 'HandThumb1'), ('Thumb2', 'HandThumb2')]:
            names[s + '_' + a] = side + b
    # Fresh Mixamo skeleton with the Curupira proportions, then the add-on control rig.
    arm = bpy.data.objects.new('Curupira_Authoring', bpy.data.armatures.new('FreshMixamoSkeleton'))
    sc.collection.objects.link(arm); p.select_only([arm]); bpy.ops.object.mode_set(mode='EDIT')
    for n, mn in names.items():
        e = arm.data.edit_bones.new('mixamorig:' + mn); e.head = J[n][0]; e.tail = J[n][1]
    for n, mn in names.items():
        parent = J[n][2]
        if parent == 'Pelvis': parent = 'Base'
        if parent in names: arm.data.edit_bones['mixamorig:' + mn].parent = arm.data.edit_bones['mixamorig:' + names[parent]]
    # Mixamo control rig expects a complete finger naming scheme.
    for s, side in [('L', 'Left'), ('R', 'Right')]:
        sign = 1 if s == 'L' else -1
        for finger, dy in [('Index', -.012), ('Middle', 0), ('Ring', .012), ('Pinky', .022), ('Thumb', -.027)]:
            parent = 'mixamorig:' + side + 'Hand'
            for k in range(1, 4):
                n = 'mixamorig:' + side + 'Hand' + finger + str(k)
                if n in arm.data.edit_bones: e = arm.data.edit_bones[n]
                else:
                    e = arm.data.edit_bones.new(n); base = Vector(J[s + '_Finger1'][0])
                    e.head = base + Vector((sign * H * .014 * (k - 1), dy * H, 0)); e.tail = e.head + Vector((sign * H * .014, 0, 0))
                e.parent = arm.data.edit_bones[parent]; parent = n
    bpy.ops.object.mode_set(mode='OBJECT')
    addon_utils.enable('bl_ext.blender_org.mixamo_rig', default_set=True)
    bpy.ops.mr.make_rig(bake_anim=False, ik_arms=False, ik_legs=True)
    arm = bpy.context.view_layer.objects.active
    arm.animation_data_create(); arm.animation_data.action = None
    BR = {b.name: b.matrix_local.copy() for b in arm.data.bones}
    PAR = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
    ALIAS = {'mixamorig:LeftHand': 'Ctrl_Hand_FK_Left', 'mixamorig:RightHand': 'Ctrl_Hand_FK_Right'}
    A0 = BR['Ctrl_Foot_IK_Left'].translation.copy()

    def controls(P):
        """Control pose matrices (armature space) for pose P; rest-aligned FK + IK feet."""
        W, POS = {}, {}

        def put(n, Rw, h):
            W[n] = Rw; POS[n] = Matrix.Translation(h) @ (Rw @ BR[n].to_3x3()).to_4x4()

        def child(n, L, pos_from=None):
            par = ALIAS.get(PAR[n], PAR[n]); src = pos_from or par
            put(n, W[par] @ L, (POS[src] @ BR[src].inverted()) @ BR[n].translation)
        put('Ctrl_Master', Matrix.Identity(3), BR['Ctrl_Master'].translation)
        Rroot = rot(P['root.pitch'], P['root.yaw'], P['root.roll'])
        put('Ctrl_Hips', Rroot, BR['Ctrl_Hips'].translation + Vector((P['root.x'], P['root.y'], P['root.z'])) * H)
        child('Ctrl_Hips_Free', rot(P['pelvis.pitch'], P['pelvis.yaw'], P['pelvis.roll']))
        for n, w in (('Ctrl_Spine', .3), ('Ctrl_Spine1', .35), ('Ctrl_Spine2', .35)):
            child(n, rot(P['spine.pitch'] * w, P['spine.yaw'] * w, P['spine.roll'] * w))
        child('Ctrl_Neck', rot(P['neck.pitch'], P['neck.yaw'], P['neck.roll']))
        child('Ctrl_Head', rot(P['head.pitch'], P['head.yaw'], P['head.roll']))
        for S, side, s in SIDES:
            g = lambda k: P[S + '.' + k]
            child('Ctrl_Shoulder_' + side, Matrix.Rotation(D(-s * g('shrug')), 3, 'Y') @ Matrix.Rotation(D(-s * g('prot')), 3, 'Z'))
            swing = Vector((s, 0, 0)).rotation_difference(arm_dir(s, g('abd'), g('swing'), g('h'))).to_matrix()
            child('Ctrl_Arm_FK_' + side, swing @ Matrix.Rotation(D(-g('twist')), 3, 'X'), pos_from='Ctrl_Shoulder_' + side)
            child('Ctrl_ForeArm_FK_' + side, Matrix.Rotation(D(-s * g('elbow')), 3, 'Z') @ Matrix.Rotation(D(-g('pron')), 3, 'X'))
            child('Ctrl_Hand_FK_' + side, Matrix.Rotation(D(s * g('wrist')), 3, 'Y') @ Matrix.Rotation(D(-s * g('dev')), 3, 'Z'))
            for f, amt in FINGERS:
                for k, deg in zip((1, 2, 3), (amt[0] * 55, amt[1] * 75, amt[2] * 55)):
                    child(f'Ctrl_{f}{k}_{side}', Matrix.Rotation(D(s * deg * g('curl')), 3, 'Y'))
            for k, deg in zip((1, 2, 3), (30, 35, 30)):
                n = f'Ctrl_Thumb{k}_{side}'; d0 = BR[n].to_3x3() @ Vector((0, 1, 0))
                child(n, Matrix.Rotation(D(deg * g('thumb')), 3, Vector((-d0.y, d0.x, 0)).normalized()))
            # IK foot: heel (front) pivot when the toes lift, toe (back) pivot when the heel lifts.
            f = lambda k: P[S + 'f.' + k]
            Rz = Matrix.Rotation(D(s * f('yaw')), 3, 'Z'); F = Rz @ Matrix.Rotation(D(f('pitch')), 3, 'X')
            ground = Vector((s * f('x') * H, f('y') * H + A0.y, f('z') * H))
            piv = Vector((0, (HEEL if f('pitch') >= 0 else TOE) * H, 0)); up = Vector((0, 0, A0.z))
            ankle = ground + Rz @ piv + F @ (up - piv)
            put('Ctrl_Foot_IK_' + side, F, ankle)
            hip = (POS['Ctrl_Hips_Free'] @ BR['Ctrl_Hips_Free'].inverted()) @ BR['Ctrl_UpLeg_FK_' + side].translation
            knee = Matrix.Rotation(D(.5 * (P['root.yaw'] + P['pelvis.yaw']) + .5 * s * f('yaw')), 3, 'Z') @ Vector((0, -.42 * H, 0))
            put('Ctrl_LegPole_IK_' + side, Matrix.Identity(3), (hip + ankle) / 2 + knee)
        basis = {}
        for n, m in POS.items():
            if n == 'Ctrl_Master': continue
            par = PAR[n]
            if par is None: basis[n] = BR[n].inverted() @ m; continue
            a = ALIAS.get(par, par); ppose = POS[a] @ BR[a].inverted() @ BR[par]
            basis[n] = BR[n].inverted() @ BR[par] @ ppose.inverted() @ m
        return basis, POS

    ctrl_names = list(controls(takes(evil, H, cfg_of(p))[0].sample(0))[0])
    for n in ctrl_names: arm.pose.bones[n].rotation_mode = 'QUATERNION'
    # Lunia bake setup.
    LB = {b.name: b.matrix_local.copy() for b in rig.data.bones}
    LP = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
    depth = lambda n: 0 if LP[n] is None else 1 + depth(LP[n])
    order = sorted(LB, key=depth)
    MB = {n: arm.data.bones['mixamorig:' + mn].matrix_local.copy() for n, mn in names.items()}
    chains = [('Pelvis', ['Skirt%s01' % d, 'Skirt%s02' % d], 2.4, .4) for d in ('F', 'FL', 'L', 'BL', 'B', 'BR', 'R', 'FR')]
    chains.append(('Head', ['Hair01', 'Hair02'], 2.0 if evil else 1.5, .45 if evil else .3))
    secondary = {b for _, bs, _, _ in chains for b in bs}

    def lunia_pose():
        """Lunia main-bone poses from the evaluated Mixamo deform skeleton (world rotation deltas)."""
        out = {}
        for n in order:
            if n in secondary: continue
            if n in names:
                m = arm.pose.bones['mixamorig:' + names[n]].matrix
                out[n] = Matrix.Translation(m.translation) @ (m.to_3x3() @ MB[n].to_3x3().inverted() @ LB[n].to_3x3()).to_4x4()
            else:
                par = LP[n]; out[n] = LB[n].copy() if par is None else out[par] @ LB[par].inverted() @ LB[n]
        return out

    def simulate(poses, fr, loop):
        """Damped springs on chain tips, follow the body, stay out of thighs and back.
        Loops drop the duplicated last frame, run three passes and keep the last."""
        n = len(poses) - 1 if loop else len(poses)
        dts = [(fr[i] - fr[i - 1]) / 100 if i else ((fr[-1] - fr[-2]) / 100 if loop else .02) for i in range(n)]
        res = [dict() for _ in poses]
        tail = lambda P, b: P[b] @ Vector((0, rig.data.bones[b].length, 0))
        caps = lambda P: {'thighs': [(P[S + '_Thigh'].translation, P[S + '_Calf'].translation) for S in 'LR'],
                          'back': [(P['Chest1'].translation, tail(P, 'Neck'))]}

        def seg_dist(p, a, b):
            ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); c = a + ab * t
            return (p - c).length, c
        rest_caps = caps({n: LB[n] for n in LB})
        radius = {}
        for par, bones, _, _ in chains:
            kind = 'back' if par == 'Head' else 'thighs'
            for b in bones:
                tip = LB[b] @ Vector((0, rig.data.bones[b].length, 0))
                d = min(seg_dist(tip, a, c)[0] for a, c in rest_caps[kind])
                radius[b] = (kind, min((.07 if kind == 'back' else .055) * H, .9 * d))
        state = {}
        passes = 3 if loop else 1
        for pss in range(passes):
            for i in range(n):
                P = poses[i]; dt = dts[i]; cp = caps(P)
                for par, bones, freq, zeta in chains:
                    w = 2 * math.pi * freq; ppose, prest = P[par], LB[par]
                    for b in bones:
                        M = ppose @ prest.inverted(); head = M @ LB[b].translation
                        target = M @ (LB[b] @ Vector((0, rig.data.bones[b].length, 0)))
                        L = (target - head).length
                        if b not in state:   # starts at rest on the first pose
                            state[b] = [target.copy(), Vector(), target.copy()]
                        p_, v, tprev = state[b]
                        vt = (target - tprev) / dt
                        v = v + (w * w * (target - p_) + 2 * zeta * w * (vt - v)) * dt
                        q = p_ + v * dt
                        q = head + (q - head).normalized() * L
                        kind, r = radius[b]
                        for a, c in cp[kind]:
                            dd, cc = seg_dist(q, a, c)
                            if dd < r: q = cc + (q - cc).normalized() * r
                        q = head + (q - head).normalized() * L
                        f = (target - head).normalized(); dvec = (q - head).normalized()
                        if f.angle(dvec) > D(55):   # never fold through the body
                            q = head + f.lerp(dvec, D(55) / f.angle(dvec)).normalized() * L
                        state[b] = [q, (q - p_) / dt, target]
                        sw = (target - head).rotation_difference(q - head).to_matrix()
                        pose = Matrix.Translation(head) @ (sw @ M.to_3x3() @ LB[b].to_3x3()).to_4x4()
                        res[i][b] = pose; ppose, prest = pose, LB[b]
        if loop: res[-1] = res[0]
        return res

    def key_action(obj, name, frames):
        act = bpy.data.actions.new(name); act.use_fake_user = True; act['fps'] = 100
        obj.animation_data_create(); obj.animation_data.action = act; prev = {}
        for f, vals in frames:
            for n, (loc, q) in vals.items():
                if n in prev and prev[n].dot(q) < 0: q = -q
                prev[n] = q.copy(); b = obj.pose.bones[n]; b.location = loc; b.rotation_quaternion = q
                b.keyframe_insert('location', frame=f); b.keyframe_insert('rotation_quaternion', frame=f)
        act.use_frame_range = True; act.frame_start = 0; act.frame_end = frames[-1][0]
        obj.animation_data.action = None
        return act

    def update(): bpy.context.view_layer.update()
    author_actions, baked = [], []
    for take in takes(evil, H, cfg_of(p)) + [None]:
        if take is None:   # T-pose reference (height check, rest silhouette)
            clips = [('apose', 0, .1)]; samples = lambda t: None
        else:
            clips = take.clips; samples = take.sample
        end = round(clips[-1][2] * 100)
        cuts = {round(c[1] * 100) for c in clips} | {round(c[2] * 100) for c in clips}
        fr = sorted(set(range(0, end + 1, 2)) | cuts)
        poses, ctrl = [], []
        for f in fr:
            P = samples(f / 100)
            for n in ctrl_names: arm.pose.bones[n].matrix_basis = Matrix.Identity(4)
            if P is not None:
                basis, POS = controls(P)
                for n, m in basis.items(): arm.pose.bones[n].matrix_basis = m
            update()
            if P is not None and f == 0:
                err = max((arm.pose.bones[n].matrix.translation - POS[n].translation).length for n in ('Ctrl_Head', 'Ctrl_Hand_FK_Left', 'Ctrl_Foot_IK_Right'))
                print('CURUPIRA_CTRL_CHECK', clips[0][0], round(err, 5), flush=True)
            ctrl.append({n: (arm.pose.bones[n].location.copy(), arm.pose.bones[n].rotation_quaternion.copy()) for n in ctrl_names})
            poses.append(lunia_pose())
        if take is None: sec = [{b: None for b in secondary} for _ in poses]
        else: sec = simulate(poses, fr, take.loop)
        for name, t0, t1 in clips:
            a, b = round(t0 * 100), round(t1 * 100)
            idx = [i for i, f in enumerate(fr) if a <= f <= b]
            author_actions.append(key_action(arm, 'Authored|' + name, [(fr[i] - a, ctrl[i]) for i in idx]))
            lframes = []
            for i in idx:
                full = dict(poses[i])
                for bn in (n for n in order if n in secondary):
                    full[bn] = sec[i][bn] if sec[i][bn] is not None else full[LP[bn]] @ LB[LP[bn]].inverted() @ LB[bn]
                vals = {}
                for n in order:
                    par = LP[n]
                    m = LB[n].inverted() @ full[n] if par is None else LB[n].inverted() @ LB[par] @ full[par].inverted() @ full[n]
                    vals[n] = (m.to_translation(), m.to_quaternion())
                lframes.append((fr[i] - a, vals))
            baked.append((name, lframes))
            print('CURUPIRA_CLIP', name, round(t1 - t0, 3), flush=True)
    for n in ctrl_names: arm.pose.bones[n].matrix_basis = Matrix.Identity(4)
    author_dir = p.CDIR / 'mocap'; author_dir.mkdir(exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(author_dir / 'authored-rig.blend'))
    # Remove only the temporary authoring rig and its widget collections from export.
    keep = set(bpy.data.collections[p.NAME].objects)
    for o in list(bpy.data.objects):
        if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
    for act in author_actions: bpy.data.actions.remove(act)
    for b in rig.pose.bones: b.rotation_mode = 'QUATERNION'
    for name, frames in baked: key_action(rig, name, frames)
    for b in rig.pose.bones: b.matrix_basis = Matrix.Identity(4)
    sc.frame_set(1); sc.frame_set(0)


def cfg_of(p):
    """Combat timings come only from web/src/config.js."""
    src = (p.ROOT / 'web/src/config.js').read_text(encoding='utf-8')
    text, cine = src.split('export const CURUPIRA =')[1], src.split('export const CINEMATIC =')[1]
    num = lambda pat, s=text: float(re.search(pat, s, re.S).group(1))
    return {'sweep': num(r'sweep:.*?warn: ([\d.]+)'), 'roots': num(r'roots:.*?warn: ([\d.]+)'),
            'basic': num(r'basic: \{[^}]*?windup: ([\d.]+)'), 'basic_hit': num(r'basic: \{[^}]*?hit: ([\d.]+)'),
            'cast': num(r'call:.*?cast: ([\d.]+)'), 'speed': num(r'speed: ([\d.]+)'),
            'awaken': num(r'awaken: ([\d.]+)', cine), 'release': num(r'release: ([\d.]+)', cine), 'rise': num(r'rise: ([\d.]+)', cine)}
