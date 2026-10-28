"""Validation step of the character pipeline: is what was built as close as possible to the references,
standing and in motion? Run after the export; fix what fails at its source and run again.

  python tools/charpipe/validate.py SourceArt/<Char>/character.json [--glb <file>] [--no-video]

Gates (each PASS/FAIL, with the gap to the pipeline goal):
  1. reference   review.py on stage-bake (no weapons, T-pose): silhouette IoU and % of divergent colour per
                 view against the user's pictures. Limit = the references' own agreement minus 0.03 (they
                 cannot be matched better than they match each other), goal 0.96 / 5 %.
  2. motion      motion_check.py on stage-look: joint twist, arm inside torso, ground, flaps in thighs,
                 mesh stretch, in every clip and every 2nd frame.
  3. glb         check_glb.py (skeleton, skin, 2 influences, height) and validate-glb.mjs (Khronos spec).
  4. video       motion_video.py: every clip in turn, orbiting camera -> Evidence/<char>-movimentos.mp4
                 and its frames, for the visual pass (look at them; numbers do not see everything).
Writes build/review/validation.json and prints VALIDATION PASS/FAIL. Limits can be tightened per
character in build.validation of the sheet."""
import sys, json, subprocess, re, argparse, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BLENDER = os.environ.get('BLENDER', 'D:/Tools/blender-5.2.3-windows-x64/blender.exe')
ap = argparse.ArgumentParser(); ap.add_argument('sheet'); ap.add_argument('--glb'); ap.add_argument('--no-video', action='store_true')
A = ap.parse_args()
sheet = (ROOT / A.sheet).resolve(); cfg = json.loads(sheet.read_text(encoding='utf-8')); cdir = sheet.parent
out, rv = cdir / 'build', cdir / 'build' / 'review'; name = cfg['name']
V = cfg.get('build', {}).get('validation', {})
glb = Path(A.glb) if A.glb else cdir / 'export' / f'{name}.glb'
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')


def blender(blend, script, *args):
    r = subprocess.run([BLENDER, '-b', *([str(blend)] if blend else []), '--python', str(ROOT / 'tools/charpipe' / script), '--', *map(str, args)],
                       capture_output=True, text=True, env=env, cwd=ROOT)
    return r.stdout + r.stderr


gates = {}
# 1. Fidelity to the references (standing).
blender(out / 'stage-bake.blend', 'review.py', sheet.relative_to(ROOT).as_posix(), 'gate', '--look')
rep = json.loads((rv / 'gate.json').read_text(encoding='utf-8'))
cons = json.loads((rv / 'ref-consistency.json').read_text()) if (rv / 'ref-consistency.json').exists() else {}
ceil = {'front': cons.get('front_vs_back_mirrored', .96), 'back': cons.get('front_vs_back_mirrored', .96),
        'side_left': cons.get('side_left_vs_side_right', .96), 'side_right': cons.get('side_left_vs_side_right', .96)}
col_lim = {'front': 8, 'back': 8, 'side_left': 15, 'side_right': 15, **V.get('colour_bad_pct', {})}
views, ok = {}, True
for v, r in rep.items():
    iou_lim = min(.96, ceil.get(v, .96) - .03); iou_lim = V.get('iou', {}).get(v, iou_lim)
    good = r['iou'] >= iou_lim and r.get('color_bad_pct', 0) <= col_lim[v]; ok &= good
    worst = min(r['regions'].items(), key=lambda kv: kv[1]['iou'])
    views[v] = {'pass': good, 'iou': r['iou'], 'iou_limit': round(iou_lim, 3), 'iou_goal': .96, 'colour_bad_pct': r.get('color_bad_pct'),
                'colour_limit': col_lim[v], 'colour_goal': 5, 'weakest_region': f'{worst[0]} {worst[1]["iou"]}'}
gates['reference'] = {'pass': ok, 'views': views, 'panels': f'{rv.relative_to(ROOT).as_posix()}/gate-<view>.png'}

# 2. Motion.
log = blender(out / 'stage-look.blend', 'motion_check.py', rv / 'motion.json', sheet)
mo = json.loads((rv / 'motion.json').read_text())
gates['motion'] = {'pass': mo['pass'], 'fails': mo['fails'], 'stretch_ignore': mo.get('stretch_ignore', [])}

# 3. GLB.
log = blender(None, 'check_glb.py', glb, cfg.get('height_m', 1.8)) if glb.exists() else 'missing'
g1 = 'GLB_CHECK PASS' in log
r = subprocess.run(['node', str(ROOT / 'tools/validate-glb.mjs'), str(glb)], capture_output=True, text=True, cwd=ROOT)
g2 = 'GLB_VALIDATION PASS' in r.stdout
gates['glb'] = {'pass': g1 and g2, 'check_glb': g1, 'khronos': g2, 'glb': str(glb)}

# 4. Video for the visual pass.
if not A.no_video:
    mp4 = ROOT / 'Evidence' / f'{name.lower()}-movimentos.mp4'
    log = blender(out / 'stage-look.blend', 'motion_video.py', mp4)
    m = re.search(r'MOTION_VIDEO .* (\d+) frames ([\d.]+) s', log)
    gates['video'] = {'pass': bool(m), 'file': str(mp4), 'seconds': float(m.group(2)) if m else None,
                      'note': 'visual pass: watch it / read the frames; not a numeric gate'}

result = {'pass': all(g['pass'] for g in gates.values()), 'gates': gates}
(rv / 'validation.json').write_text(json.dumps(result, indent=1), encoding='utf-8')
for gname, g in gates.items():
    print(f'{gname:10s} {"PASS" if g["pass"] else "FAIL"}')
    if gname == 'reference':
        for v, x in g['views'].items():
            print(f'   {v:10s} {"ok  " if x["pass"] else "FAIL"} IoU {x["iou"]:.3f} (limit {x["iou_limit"]}, goal .96)  colour {x["colour_bad_pct"]}% '
                  f'(limit {x["colour_limit"]}, goal 5)  weakest {x["weakest_region"]}')
    elif gname == 'motion':
        for f in g['fails'][:12]: print('   ', f)
print('VALIDATION', 'PASS' if result['pass'] else 'FAIL')
sys.exit(0 if result['pass'] else 1)
