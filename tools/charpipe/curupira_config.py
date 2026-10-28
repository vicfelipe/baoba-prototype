"""Create fresh character sheets; never imports another character's build data."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
for name, height in [('Curupira', 2.1), ('CurupiraCorrompido', 3.0)]:
    cfg = dict(name=name, height_m=height,
        notes='Original references preserved. Fresh geometry, UVs, weights and boss clips; no cached character assets.',
        references={v: 'references/'+v.replace('_','-')+'.png' for v in ['front','back','side_left','side_right']},
        view_faces={'side_left':'left','side_right':'right'},
        segmentation=dict(line_lum_max=100, sat_min=22, gap_px=2, open_px=1),
        build=dict(depth_view='side_right', limb_mirror_from='R', view_sharpness=8,
            parts={s:dict(texture=1024 if s in ['Head','Body','Leg','Support'] else 512) for s in ['Head','Body','Hand','Leg','Foot','Support']},
            anatomy=dict(head_joint_z=height*.84, arm_y=0), clothing=dict(wrist_cover_x=[99,100]), accessories={},
            look=dict(band=[.62,1], band_threshold=.45, outline_color=[.137]*3, outline_ratio=.0019)))
    (ROOT/'SourceArt'/name/'character.json').write_text(json.dumps(cfg,indent=2),encoding='utf-8')
