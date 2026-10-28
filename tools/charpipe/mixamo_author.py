"""Author game clips on a Mixamo control rig (Blender extension "Mixamo Rig") and export them as
Mixamo FBX takes, which then go through the same retarget as motion capture (build.mocap).

  blender -b --python tools/charpipe/mixamo_author.py -- <skeleton.fbx> <out_dir> [clip,clip,...]

The skeleton comes from any Mixamo take (its T-pose rest is used). `mr.make_rig` builds IK legs
(feet pinned to the authored targets, knees aimed by the pole controls) and FK arms. Keys are
written on the controls in the character frame (faces -Y, left = +X, metres, degrees):
  hips   offset from rest + rotation (pitch X, roll Y, yaw Z)
  footL/R  IK foot target offset from the rest ankle, + pitch (toe up > 0) / yaw
  poleL/R  knee pole offset from its rest position
  spine/chest/neck/head  FK rotations (forward bend = +X, twist = Z, side = Y)
  armL/R   (upper arm direction, forearm direction) for the FK arm chain
  fistL/R  finger curl 0..1
Blender's Bezier interpolation between keys; the actions are saved in authored-rig.blend and the
retarget evaluates the rig there, so the IK result is what the game receives.
"""
import bpy, sys, math, addon_utils
from pathlib import Path
from mathutils import Vector, Matrix, Euler

a = sys.argv[sys.argv.index('--') + 1:]
SKEL, OUT = a[0], Path(a[1]); OUT.mkdir(parents=True, exist_ok=True)
ONLY = a[2].split(',') if len(a) > 2 else None
FPS = 60

# ------------------------------------------------------------------ clip definitions
GUARD_ARM_L = ((.35, -.55, -.75), (-.25, -.5, .83))   # left hand guarding the face
LOW_ARM_R = ((-.4, -.4, -.82), (-.15, -.8, -.58))     # right forearm forward, low
GUARD = dict(hips=((0, .03, -.09), (8, 0, 10)), footL=((.07, -.13, 0), (0, -10)), footR=((-.07, .2, 0), (10, 15)),
             spine=(6, 0, -6), chest=(4, 0, -4), neck=(-4, 0, 0), head=(-6, 0, 8),
             armL=GUARD_ARM_L, armR=LOW_ARM_R, fistL=.6, fistR=.4, poleL=(0, 0, 0), poleR=(0, 0, 0))


def run_arm(x, y):
    """Upper arm swinging in the sagittal plane; elbow held at ~90 deg, so the forearm is the
    upper arm rotated 90 deg forward (it never folds behind the head on the back swing)."""
    z = -math.sqrt(max(.05, 1 - x * x - y * y)); return ((x, y, z), (x * .4, z, -y + .15))


def run_cycle(dur=.48, n=16):
    """Run in place: stance foot slides back on the ground (heel strike -> toe off), swing foot
    lifts and reaches forward; hips lowest just after contact; opposite arm swing; torso twist."""
    keys = []
    for i in range(n + 1):
        u = i / n; k = {}
        for S, ph in (('L', 0.0), ('R', .5)):
            p = (u + ph) % 1
            if p < .42:  # stance
                q = p / .42; y = -.36 + .72 * q; z = 0; pitch = 14 * (1 - q) ** 3 - 28 * q ** 4  # heel strike -> toe off
            else:        # swing
                q = (p - .42) / .58; y = .36 - .72 * (.5 - .5 * math.cos(math.pi * q)); z = .28 * math.sin(math.pi * q) ** 1.3
                pitch = -28 + 40 * q
            k['foot' + S] = ((.0, y, z), (pitch, 0))
        s = math.sin(2 * math.pi * u); c = math.cos(4 * math.pi * u)
        k.update(hips=((0, 0, -.07 + .03 * c), (12, 0, 9 * s)), spine=(4, 0, -6 * s), chest=(3, 0, -5 * s), neck=(-6, 0, 3 * s), head=(-4, 0, 3 * s),
                 armL=run_arm(.2, -.62 * s), armR=run_arm(-.2, .62 * s),
                 fistL=.7, fistR=.7, poleL=(0, -.2, 0), poleR=(0, -.2, 0))
        keys.append((u * dur, k))
    return keys


CLIPS = {
    'run': (.48, run_cycle()),
    # Airborne for 0.6 s (game: v=6 m/s, g=20): legs tuck, arms rise, legs reach for the landing.
    'jump': (.6, [
        (0, dict(GUARD, hips=((0, 0, 0), (4, 0, 0)), footL=((0, .1, .05), (-30, 0)), footR=((0, .14, .02), (-35, 0)),
                 armL=((.45, -.3, .84), (.3, -.55, .78)), armR=((-.45, -.3, .84), (-.3, -.55, .78)), fistL=.4, fistR=.4)),
        (.15, dict(footL=((0, -.05, .25), (-20, 0)), footR=((0, .02, .2), (-25, 0)))),
        (.30, dict(hips=((0, 0, .02), (10, 0, 0)), footL=((0, -.12, .38), (-10, 0)), footR=((0, -.04, .32), (-15, 0)),
                   armL=((.6, -.45, .66), (.35, -.8, .5)), armR=((-.6, -.45, .66), (-.35, -.8, .5)), chest=(10, 0, 0))),
        (.48, dict(hips=((0, 0, 0), (6, 0, 0)), footL=((.03, -.08, .12), (-5, 0)), footR=((-.03, .06, .1), (-8, 0)),
                   armL=((.7, -.3, .2), (.6, -.6, .1)), armR=((-.7, -.3, .2), (-.6, -.6, .1)), chest=(4, 0, 0))),
        (.6, dict(GUARD, hips=((0, .02, -.14), (12, 0, 6)), footL=((.07, -.1, 0), (0, -10)), footR=((-.07, .14, 0), (0, 15))))]),
    # Hit: chest snaps back, head whips, hips pushed back and up, arms flung, then recover guard.
    'hit': (.28, [
        (0, dict(GUARD)),
        (.07, dict(hips=((0, .08, -.05), (-8, 4, 18)), spine=(-14, 0, 6), chest=(-12, 0, 6), neck=(-10, 0, 0), head=(-18, 0, 10),
                   armL=((.55, .4, -.55), (.35, .6, -.4)), armR=((-.6, .35, -.6), (-.4, .55, -.45)), fistL=.2, fistR=.2,
                   footR=((-.07, .28, 0), (10, 15)))),
        (.16, dict(hips=((0, .06, -.11), (2, 0, 14)), spine=(0, 0, 0), chest=(0, 0, 0), head=(-8, 0, 8))),
        (.28, dict(GUARD))]),
    # Dead: stagger back, knees buckle, fall onto the back, arms spread on the floor.
    'dead': (.65, [
        (0, dict(GUARD)),
        (.12, dict(hips=((0, .1, -.08), (-10, 6, 20)), spine=(-16, 0, 8), chest=(-12, 0, 6), head=(-20, 0, 12),
                   armL=((.8, .3, .1), (.7, .5, .2)), armR=((-.8, .3, .05), (-.7, .5, .2)), fistL=.1, fistR=.1)),
        (.30, dict(hips=((0, .2, -.42), (-25, 4, 15)), footL=((.09, -.18, 0), (20, -10)), footR=((-.06, .05, 0), (30, 15)),
                   spine=(-10, 0, 4), chest=(-10, 0, 4), poleL=(0, -.3, .3), poleR=(0, -.3, .3))),
        (.46, dict(hips=((0, .42, -.74), (-70, 0, 8)), footL=((.12, -.35, .06), (40, -15)), footR=((-.1, -.2, .1), (40, 20)),
                   armL=((.85, .45, .25), (.8, .55, .2)), armR=((-.85, .45, .25), (-.8, .55, .2)), head=(-10, 0, 0),
                   poleL=(.1, 0, .6), poleR=(-.1, 0, .6))),
        (.56, dict(hips=((0, .5, -.84), (-88, 0, 6)), footL=((.16, -.55, .02), (55, -20)), footR=((-.12, -.42, .06), (60, 25)),
                   spine=(-4, 0, 0), chest=(-4, 0, 0), head=(-4, 0, 14))),
        (.65, dict(hips=((0, .5, -.86), (-90, 0, 6)), footL=((.18, -.6, 0), (60, -20)), footR=((-.14, -.47, .03), (62, 25)),
                   armL=((.9, .4, -.05), (.85, .5, -.05)), armR=((-.88, .45, -.05), (-.8, .55, -.05)), fistL=.15, fistR=.15))]),
    # Victory: right fist raised, left hand on the hip, ginga bounce (two dips per loop).
    'victory': (1.571, [
        (t, dict(hips=((0, 0, -.03 - .035 * (1 - math.cos(4 * math.pi * t / 1.571)) / 2), (-3, 0, 6 * math.sin(2 * math.pi * t / 1.571))),
                 footL=((.07, -.04, 0), (0, -12)), footR=((-.07, .06, 0), (0, 12)),
                 spine=(-4, 0, 3 * math.sin(2 * math.pi * t / 1.571)), chest=(-4, 0, 0), neck=(-4, 0, 0), head=(-10, 0, 0),
                 armR=((-.25, -.08, .96), (-.08, .02, 1)), armL=((.62, .3, -.72), (-.55, -.3, -.35)), fistR=1, fistL=.15,
                 poleL=(0, 0, 0), poleR=(0, 0, 0)))
        for t in [i * 1.571 / 8 for i in range(9)]]),
}


# ------------------------------------------------------------------ rig helpers
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable('bl_ext.blender_org.mixamo_rig', default_set=True)
    bpy.ops.import_scene.fbx(filepath=SKEL, automatic_bone_orientation=False)
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    bpy.ops.mr.make_rig(bake_anim=False, ik_arms=False, ik_legs=True)
    arm = bpy.context.view_layer.objects.active
    if arm.animation_data:
        arm.animation_data.action = None
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
    for a_ in list(bpy.data.actions):
        bpy.data.actions.remove(a_)
    bpy.context.scene.render.fps = FPS
    for pb in arm.pose.bones:
        if pb.name.startswith('Ctrl_'):
            pb.rotation_mode = 'QUATERNION'
    return arm


class Poser:
    def __init__(self, arm):
        self.arm = arm; self.mw = arm.matrix_world.copy(); self.mwi = self.mw.inverted()
        self.ctrl = [pb for pb in arm.pose.bones if pb.name.startswith('Ctrl_')]
        self.order = [b.name for b in arm.data.bones]

    def upd(self):
        bpy.context.view_layer.update()

    def reset(self):
        for pb in self.ctrl:
            pb.matrix_basis = Matrix.Identity(4)
        self.upd()

    def world(self, pb):
        return self.mw @ pb.matrix

    def set_world(self, pb, M):
        A = self.mwi @ M  # remove the armature scale from the bone matrix
        pb.matrix = Matrix.Translation(A.to_translation()) @ A.to_quaternion().to_matrix().to_4x4(); self.upd()

    def move(self, name, offset=(0, 0, 0), euler=(0, 0, 0), pivot=None):
        """Translate (world metres) and rotate (world degrees, about the bone head) from rest."""
        pb = self.arm.pose.bones[name]; W = self.world(pb); h = W.to_translation()
        R = Euler([math.radians(x) for x in euler], 'XYZ').to_matrix().to_4x4()
        M = Matrix.Translation(h + Vector(offset)) @ R @ Matrix.Translation(-h) @ W
        self.set_world(pb, M)

    def rot(self, name, euler):
        self.move(name, (0, 0, 0), euler)

    def aim(self, name, d):
        pb = self.arm.pose.bones[name]; W = self.world(pb); h = W.to_translation()
        tail = self.mw @ pb.tail
        q = (tail - h).rotation_difference(Vector(d).normalized())
        self.set_world(pb, Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ W)

    def foot(self, S, offset, pitch_yaw):
        side = 'Left' if S == 'L' else 'Right'; pitch, yaw = pitch_yaw
        self.move(f'Ctrl_Foot_IK_{side}', offset, (0, 0, 0))
        self.rot(f'Ctrl_Foot_IK_{side}', (-pitch, 0, yaw if S == 'L' else -yaw))  # +X tips the toe down

    def fist(self, S, amount):
        side = 'Left' if S == 'L' else 'Right'
        for f in ('Index', 'Middle', 'Ring', 'Pinky'):
            for j, ang in ((1, 70), (2, 85), (3, 60)):
                pb = self.arm.pose.bones.get(f'Ctrl_{f}{j}_{side}')
                if pb:
                    pb.rotation_quaternion = Euler((math.radians(ang * amount), 0, 0)).to_quaternion()
        for j, ang in ((2, 30), (3, 30)):
            pb = self.arm.pose.bones.get(f'Ctrl_Thumb{j}_{side}')
            if pb:
                pb.rotation_quaternion = Euler((math.radians(ang * amount), 0, 0)).to_quaternion()
        self.upd()

    def pose(self, p):
        self.reset()
        off, e = p['hips']; self.move('Ctrl_Hips', off, e)
        for n, k in (('Ctrl_Spine', 'spine'), ('Ctrl_Spine1', 'chest'), ('Ctrl_Spine2', 'chest'), ('Ctrl_Neck', 'neck'), ('Ctrl_Head', 'head')):
            ex, ey, ez = p[k]; self.rot(n, (ex, ey, ez) if k != 'chest' else (ex / 2, ey / 2, ez / 2))
        for S, side in (('L', 'Left'), ('R', 'Right')):
            up, fo = p['arm' + S]
            self.aim(f'Ctrl_Arm_FK_{side}', up); self.aim(f'Ctrl_ForeArm_FK_{side}', fo)
            self.foot(S, *p['foot' + S])
            self.move(f'Ctrl_LegPole_IK_{side}', p['pole' + S])
            self.fist(S, p['fist' + S])

    def key(self, frame):
        for pb in self.ctrl:
            pb.keyframe_insert('location', frame=frame); pb.keyframe_insert('rotation_quaternion', frame=frame)


def author(arm, name, dur, keys):
    P = Poser(arm)
    act = bpy.data.actions.new('Authored|' + name); act.use_fake_user = True; act['fps'] = FPS; arm.animation_data_create(); arm.animation_data.action = act
    cur = dict(GUARD); prev = {}
    for t, kw in keys:
        cur = dict(cur, **kw)
        arm.animation_data.action = None   # an assigned action would overwrite bones while posing
        P.pose(cur)
        vals = {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in P.ctrl}
        arm.animation_data.action = act
        for pb in P.ctrl:
            loc, q = vals[pb.name]
            if pb.name in prev and prev[pb.name].dot(q) < 0:  # shortest-path quaternions between keys
                q.negate()
            prev[pb.name] = q.copy(); pb.location = loc; pb.rotation_quaternion = q
        P.key(round(t * FPS))
    sc = bpy.context.scene; sc.frame_start = 0; sc.frame_end = round(dur * FPS)
    act.use_frame_range = True; act.frame_start = 0; act.frame_end = sc.frame_end
    return act


arm = setup()
for name, (dur, keys) in CLIPS.items():
    if ONLY and name not in ONLY:
        continue
    arm.animation_data_create(); arm.animation_data.action = None
    act = author(arm, name, dur, keys)
    print('AUTHORED', name, dur, len(keys), 'keys -> action', act.name)
arm.animation_data.action = None
for pb in arm.pose.bones:
    if pb.name.startswith('Ctrl_'):
        pb.matrix_basis = Matrix.Identity(4)
bpy.context.preferences.filepaths.save_version = 0
# Retarget reads the actions straight from this file (build.mocap: {"file": ".../authored-rig.blend",
# "action": "Authored|run"}); FBX export of the constrained rig would write the posed state as rest.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'authored-rig.blend'))
