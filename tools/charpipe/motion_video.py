"""Validation step, visual half: every clip played in turn, camera orbiting the character, clip
name on screen, rendered with the game look to an MP4 (H.264, 50 fps, real time).
  blender -b SourceArt/<Char>/build/stage-look.blend --python tools/charpipe/motion_video.py -- <out.mp4> [orbit_s=8] [--assemble]
(--assemble: only rebuild the MP4 from the frames already rendered)
Loops play twice, the rest once with a short hold. Frames are written next to the video (frames/)
so single moments can be inspected; the video is assembled with Blender's sequencer."""
import bpy, sys, math, shutil
from pathlib import Path
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]; ONLY_ASSEMBLE = '--assemble' in a; a = [x for x in a if x != '--assemble']
out = Path(a[0]).resolve(); orbit = float(a[1]) if len(a) > 1 else 8.0
FPS, SRC = 50, 100                       # video rate; clips are keyed at 100 fps
ORDER = ['apose', 'idle', 'run', 'shoot', 'pistols', 'throw', 'dodge', 'jump', 'hit', 'dead', 'victory']
LOOPS = {'idle', 'run', 'victory'}
sc = bpy.context.scene; rig = next(o for o in sc.objects if o.type == 'ARMATURE' and 'L_Hand' in o.pose.bones)
clips = [c for c in ORDER if c in bpy.data.actions] + sorted(c.name for c in bpy.data.actions if '|' not in c.name and c.name not in ORDER)
cam = sc.camera; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.6
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 720, 720, 100
sc.render.image_settings.file_format = 'PNG'
# On-screen label: a text object riding with the camera.
txt = bpy.data.objects.new('ClipLabel', bpy.data.curves.new('ClipLabel', 'FONT')); sc.collection.objects.link(txt)
txt.data.size = .11; txt.parent = cam; txt.location = (-1.22, -1.2, -1); txt.rotation_euler = (0, 0, 0)
lab = bpy.data.materials.new('label'); lab.use_nodes = True; nt = lab.node_tree; nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (1, .93, .75, 1); nt.links.new(em.outputs[0], nt.nodes.new('ShaderNodeOutputMaterial').inputs[0])
txt.data.materials.append(lab)
frames = out.parent / (out.stem + '-frames')
if not ONLY_ASSEMBLE:
    shutil.rmtree(frames, ignore_errors=True); frames.mkdir(parents=True)
plan = []
for c in clips:
    act = bpy.data.actions[c]; f1 = int(act.frame_range[1])
    reps = 2 if c in LOOPS else 1
    ts = [f for _ in range(reps) for f in range(0, f1 + (0 if c in LOOPS else 1), SRC // FPS)]
    ts += [f1] * (0 if c in LOOPS else FPS // 2)          # half-second hold on the last pose
    plan += [(c, f) for f in ts]
for i, (c, f) in enumerate([] if ONLY_ASSEMBLE else plan):
    rig.animation_data.action = bpy.data.actions[c]; sc.frame_set(f + 1); sc.frame_set(f)
    ang = 2 * math.pi * i / (orbit * FPS) - math.radians(30)
    d = Vector((math.sin(ang), -math.cos(ang), .32)).normalized()
    cam.location = Vector((0, 0, .95)) + 7 * d; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    txt.data.body = f'{c}   {f / SRC:4.2f}s'
    sc.render.filepath = str(frames / f'{i:05d}.png'); bpy.ops.render.render(write_still=True)
# Assemble with the sequencer.
vs = bpy.data.scenes.new('video'); vs.render.fps = FPS; vs.render.resolution_x, vs.render.resolution_y = 720, 720
vs.render.resolution_percentage = 100
se = vs.sequence_editor_create(); files = sorted(frames.glob('*.png'))
strips = se.strips if hasattr(se, 'strips') else se.sequences
st = strips.new_image('frames', str(files[0]), 1, 1)
for f in files[1:]: st.elements.append(f.name)
vs.frame_start, vs.frame_end = 1, len(files)
if hasattr(vs.render.image_settings, 'media_type'): vs.render.image_settings.media_type = 'VIDEO'   # Blender 5
vs.render.image_settings.file_format = 'FFMPEG'; vs.render.ffmpeg.format = 'MPEG4'; vs.render.ffmpeg.codec = 'H264'
vs.render.ffmpeg.constant_rate_factor = 'HIGH'; vs.render.filepath = str(out); vs.render.use_file_extension = False
bpy.ops.render.render(animation=True, scene=vs.name)
print('MOTION_VIDEO', out, len(files), 'frames', round(len(files) / FPS, 1), 's')
