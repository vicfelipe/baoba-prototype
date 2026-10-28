"""Step 3 - compare a build stage with the references at identical framing.

  blender -b <build/stage-X.blend> --python tools/charpipe/review.py -- SourceArt/<Char>/character.json <label> [--look]

For each reference view: renders the model silhouette with the reference's own
calibration, writes build/review/<label>-<view>.png (reference | overlay | model) and
build/review/<label>.json with silhouette IoU per view. --look renders the
current materials instead of flat silhouettes for the right-hand panel.
"""
import bpy, sys, json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:]
CFG_PATH = ROOT / argv[0]; LABEL = argv[1]; LOOK = '--look' in argv
CFG = json.loads(CFG_PATH.read_text(encoding='utf-8'))
CDIR = CFG_PATH.parent; OUT = CDIR / 'build'; RV = OUT / 'review'; RV.mkdir(parents=True, exist_ok=True)
# --original: validate against the user's untouched pictures (measure/masks saved before any derived view).
ORIGINAL = '--original' in argv
M = json.loads((OUT / ('measure-original.json' if ORIGINAL else 'measure.json')).read_text(encoding='utf-8'))
MASKS = OUT / ('masks-original' if ORIGINAL else 'masks')
REFS = CFG.get('references_original', CFG['references']) if ORIGINAL else CFG['references']
sc = bpy.context.scene


def load_png(path):
    im = bpy.data.images.load(str(path)); w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1]


def save_png(path, rgb):
    h, w = rgb.shape[:2]; im = bpy.data.images.new(path.stem, w, h)
    px = np.ones((h, w, 4), np.float32); px[..., :3] = np.clip(rgb[::-1], 0, 1)
    im.pixels.foreach_set(px.ravel()); im.filepath_raw = str(path); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)


cam = bpy.data.objects.new('review_cam', bpy.data.cameras.new('review_cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.sensor_fit = 'HORIZONTAL'
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'FLAT'; sc.display.shading.show_object_outline = False
sc.display.shading.color_type = 'TEXTURE' if LOOK else 'SINGLE'; sc.display.shading.single_color = (1, 1, 1)
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'
for o in sc.objects:
    if o.type == 'ARMATURE':
        o.hide_render = True
report = {}
for view, cal in M['calibration'].items():
    W, Hh = cal['size_px']; ppm = cal['px_per_m']; c = cal['centre_px']; zc = (cal['sole_px'] - Hh / 2) / ppm
    off = (W / 2 - c) / ppm
    pos, look = {
        'front': (Vector((off, -10, zc)), Vector((0, 1, 0))),
        'back': (Vector((-off, 10, zc)), Vector((0, -1, 0))),
        'right': (Vector((-10, -off, zc)), Vector((1, 0, 0))),
        'left': (Vector((10, off, zc)), Vector((-1, 0, 0))),
    }[cal['faces'] if view.startswith('side') else view]
    cam.location = pos; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = W / ppm
    sc.render.resolution_x, sc.render.resolution_y = W, Hh; sc.render.resolution_percentage = 100
    tmp = RV / f'_tmp_{view}.png'; sc.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    r = load_png(tmp); tmp.unlink()
    model = r[..., 3] > .5
    ref_m = np.load(MASKS / f'{view}.npy')
    ref = load_png(CDIR / REFS[view])[..., :3]
    iou = float((model & ref_m).sum() / max(1, (model | ref_m).sum()))
    report[view] = {'iou': round(iou, 4), 'ref_only_px': int((ref_m & ~model).sum()), 'model_only_px': int((model & ~ref_m).sum())}
    # Body regions in world units: z from the row, h = horizontal axis of this view.
    rows = np.arange(Hh)[:, None]; cols = np.arange(W)[None, :]
    z = (cal['sole_px'] - rows) / ppm + 0 * cols; h = np.abs((cols - c) / ppm) + 0 * rows
    regions = {'head': z > 1.555, 'torso': (z > 1.0) & (z <= 1.555) & (h < .24), 'arms': (z > 1.25) & (h >= .24),
               'legs': (z > .11) & (z <= 1.0), 'feet': z <= .11}
    report[view]['regions'] = {}
    both = model & ref_m
    inner = both.copy()
    for _ in range(3):  # drop the drawn silhouette ink and edge AA from the colour score
        inner &= np.roll(inner, 1, 0) & np.roll(inner, -1, 0) & np.roll(inner, 1, 1) & np.roll(inner, -1, 1)
    err = np.abs(r[..., :3] - ref).mean(2) * 255
    for name, reg in regions.items():
        u = (model | ref_m) & reg
        entry = {'iou': round(float((both & reg).sum() / max(1, u.sum())), 4)}
        if LOOK and (inner & reg).sum() > 50:
            e = err[inner & reg]
            entry.update(color_mae=round(float(e.mean()), 1), color_p90=round(float(np.percentile(e, 90)), 1), color_bad_pct=round(float((e > 30).mean() * 100), 1))
        report[view]['regions'][name] = entry
    if LOOK:
        e = err[inner]
        report[view].update(color_mae=round(float(e.mean()), 1), color_p90=round(float(np.percentile(e, 90)), 1), color_bad_pct=round(float((e > 30).mean() * 100), 1))
    ov = ref * .55 + .45
    ov[ref_m & ~model] = [1, .15, .15]; ov[model & ~ref_m] = [.15, .35, 1]
    edge = model ^ np.roll(model, 1, 0) | model ^ np.roll(model, 1, 1); ov[edge] = [0, .8, .8]
    right = r[..., :3] * r[..., 3:] + (1 - r[..., 3:]) * .85
    heat = np.full_like(ref, .85)
    t = np.clip(err / 60, 0, 1)[..., None]
    heat[inner] = (np.array([.1, .55, .2]) * (1 - t) + np.array([1, .1, .1]) * t)[inner]
    ys, xs = np.nonzero(ref_m | model); pad = 12
    crop = np.s_[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
    panels = [ref[crop], ov[crop], right[crop]] + ([heat[crop]] if LOOK else [])
    save_png(RV / f'{LABEL}-{view}.png', np.concatenate(panels, 1))
(RV / f'{LABEL}.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
print('REVIEW', json.dumps(report))
