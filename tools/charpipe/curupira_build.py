"""Fresh Curupira meshes from its own turnaround; shared pipeline UV bake/export.
blender -b --python tools/charpipe/curupira_build.py -- SourceArt/Curupira/character.json
Optional --from bake|rig|anim|look|export resumes this character's current build.
"""
import bpy, sys, math, json, hashlib, importlib.util
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
args = sys.argv[sys.argv.index('--')+1:]
resume = args[args.index('--from')+1] if '--from' in args else 'geo'
sys.argv = sys.argv[:sys.argv.index('--')+1] + [args[0], '--stages', '']
spec = importlib.util.spec_from_file_location('charpipe_build', HERE/'build.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
H, OUT, NAME = p.H, p.OUT, p.NAME
evil = 'Corrompido' in NAME
F = p.M['calibration']['front']; ppm=F['px_per_m']; cx=F['centre_px']; sole=F['sole_px']
parts = {}

def z(px): return (sole-px)/ppm
def x(px): return (px-cx)/ppm
def add(slot, obs):
    p.select_only(obs); bpy.ops.object.join(); o=bpy.context.object
    o.name=p.part_name(slot); o.data.name=o.name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for f in o.data.polygons: f.use_smooth=True
    for c in list(o.users_collection): c.objects.unlink(o)
    bpy.data.collections[NAME].objects.link(o); parts[slot]=o
    return o

def rings(name, rows, N=32):
    return p.loft(name,[p.ring_z(c*H, zz*H, w*H, (y-d)*H,(y+d)*H,2.3,N) for zz,c,w,y,d in rows])

def tube(name, points, widths, n=10):
    if name in ['crown','mane']:
        # Curved sculpted locks need more longitudinal rings than twigs/fingers.
        old=np.linspace(0,1,len(points)); ctrl=[Vector(v) for v in points]; points=[]
        for i in range(len(ctrl)-1):
            a,b,c,d=ctrl[max(0,i-1)],ctrl[i],ctrl[i+1],ctrl[min(len(ctrl)-1,i+2)]
            for t in np.linspace(0,1,5,endpoint=False):
                points.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3))
        points.append(ctrl[-1])
        widths=np.interp(np.linspace(0,1,len(points)),old,widths)
    return p.tube_along(name,[tuple(float(H*v) for v in pt) for pt in points],[(float(H*r),float(H*r*.7)) for r in widths],n)

def leaf(name, start, end, width, angle):
    # A closed, curved leaf with a raised central vein and toothed perimeter.
    a,b=Vector(start)*H,Vector(end)*H; tang=Vector((math.cos(angle),math.sin(angle),0))
    normal=Vector((math.sin(angle),-math.cos(angle),.12)).normalized()
    rr=[]
    for i in range(11):
        t=i/10; c=a.lerp(b,t)+normal*(.012*H*math.sin(math.pi*t))
        w=H*width*(math.sin(math.pi*t)**.8)*(.82 if i%2 else 1)+.0003
        rr.append([tuple(c+tang*w),tuple(c+normal*.008*H),tuple(c-tang*w),tuple(c-normal*.002*H)])
    return p.loft(name,rr)

# Body silhouette manually measured in the current front; foliage and mane are separate.
if evil:
    TORSO=[(440,780,891),(410,782,891),(370,774,897),(330,758,914),(295,728,942),(263,701,970),(237,740,935),(219,791,880),(193,809,861)]
    HEAD=[(194,823,851),(184,811,860),(166,801,870),(148,798,875),(128,800,871),(110,808,866),(99,819,852)]
else:
    TORSO=[(447,795,878),(413,785,886),(370,779,892),(326,760,912),(293,733,941),(269,722,951),(249,765,909),(232,808,864),(212,817,854)]
    HEAD=[(222,830,844),(212,817,857),(195,806,864),(180,801,871),(163,806,869),(149,813,862),(141,825,850)]
# Mane measured on the liberto side/front masks (H units, head top at .935): it rises
# from the hairline to the top of the image and sweeps back to y=.17 at z=.72. The
# corrupted mane is the same shape, 15% deeper (its side mask reaches y=.19-.20).
HAIR_SCALE=1.15 if evil else 1.0
def hair_point(x,y,zz):
    return (x*HAIR_SCALE, y*HAIR_SCALE, z(HEAD[-1][0])/H+(zz-.935)*HAIR_SCALE)

def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
    bpy.context.scene.collection.children.link(bpy.data.collections.new(NAME))
    torso, head = TORSO, HEAD
    if evil: shoulder=.155; wrist=.49; reach=.625; az=.739; hips=.52; legtop=.54
    else: shoulder=.132; wrist=.45; reach=.555; az=.748; hips=.53; legtop=.55
    p.B['anatomy']['arm_y']=0
    body=[]
    rows=[]
    for py,l,r in torso:
        zz=z(py)/H; w=(r-l)/2/ppm/H
        depth=float(np.interp(zz,[.52,.62,.74,.81,.87],[.043,.045,.063,.035,.025]))
        rows.append((zz,(x(l)+x(r))/2/H,w,0,depth))
    body.append(rings('torso',rows))
    # Arms follow the actual horizontal contours, avoiding decorative spikes above the skin.
    armZ=az*H; arm_end=reach*H; wristX=wrist*H
    for S in [-1,1]:
        rr=[]
        for u in np.linspace(shoulder,wrist,24):
            lo,hi=p.arm_at(u*H)
            mid=(lo+hi)/2; rad=min((hi-lo)/2,H*(.034 if evil else .035))
            if u>wrist-.04: rad=min(rad,H*.018)
            rr.append(p.ring_x(S*u*H,0,mid,rad*.9,rad,2.2,18))
        body.append(p.loft('arm',rr))
    add('Body',body)
    # Face rings preserve the painted eye/nose/mouth placement, with actual nose projection.
    hr=[]
    for py,l,r in head:
        zz=z(py)/H; w=(r-l)/2/ppm/H
        hr.append((zz,(x(l)+x(r))/2/H,w,-.018,.029 if py!=head[0][0] else .014))
    skull=rings('face',hr,40)
    for v in skull.data.vertices:
        a=v.co/H
        if a.y<-.02:
            nose=math.exp(-(a.x/.009)**2-((a.z-(.852 if evil else .862))/.022)**2)
            v.co.y-=H*.014*nose
    heads=[skull]
    for S in [-1,1]:
        heads.append(tube('ear',[(S*.031,-.008,.865),(S*.052,.003,.885),(S*.041,.009,.862)],[.011,.002,.007]))
    # Mane: solid flame locks swept up and back from the hairline (no crown ring, no
    # transparent cards). 'hair_u' (0 at the root, 1 at the tip) drives Hair01-02 weights;
    # the crest stays rigid on the head.
    def lock(pts, w, flex):
        o=tube('mane',[hair_point(*q) for q in pts],[r*HAIR_SCALE for r in w],10)
        n=10; rings=(len(o.data.vertices)-2)//n
        a=o.data.attributes.new('hair_u','FLOAT','POINT')
        for v in o.data.vertices:
            u=(v.index//n)/(rings-1) if v.index<rings*n else float(v.index-rings*n)
            a.data[v.index].value=flex*u
        heads.append(o)
    heads.append(p.ellipsoid('scalp',(0,.015*H,(z(head[-1][0])/H-.02)*H),(.048*H,.05*H,.035*H*HAIR_SCALE)))
    for q in np.linspace(-1,1,7):     # crest: hairline -> up -> flame tips pointing back
        x0=q*.035
        lock([(x0*.6,-.03,.925),(x0,-.028,.962),(x0*1.15,.0,.99-.01*q*q),(x0*1.3,.045,1.0-.02*q*q),(x0*1.4,.085,.975-.03*q*q)],[.016,.022,.022,.015,.0008],0)
    for q in np.linspace(-1,1,7):     # upper mane down the back
        x0=q*.055
        lock([(x0*.5,0,.945),(x0*.9,.05,.955-.01*abs(q)),(x0*1.1,.095,.925),(x0*1.2,.13,.86),(x0*1.15,.16,.78),(x0*.95,.165,.71+.02*abs(q))],[.02,.026,.028,.024,.016,.0008],1)
    for S in [-1,1]:                  # sides frame the face above the ears
        # The front reference parts the hair: it reaches x=.12 on the right but stops at
        # x=.07 on the left; wider locks there would take the shoulder leaves' paint.
        w=.78 if S>0 else 1.12
        for j in range(3):
            lock([(S*.045,.02,.93-j*.015),(S*(.07+.006*j)*w,.035,.905-j*.025),(S*(.085+.01*j)*w,.07+.02*(S>0),.86-j*.03),(S*(.09+.008*j)*w,.11+.02*(S>0),.79-j*.035),(S*(.075+.006*j)*w,.13,.72-j*.03)],[.016,.02,.02,.015,.0008],1)
    for q in np.linspace(-1,1,5):     # nape layer closes the back of the neck
        x0=q*.045
        lock([(x0,.025,.89),(x0*1.1,.07,.84),(x0*1.15,.105,.76),(x0*1.05,.115,.69),(x0*.9,.105,.635)],[.02,.024,.022,.015,.0008],1)
    if evil:
        for S in [-1,1]:
            for j in range(2):
                pts=[(S*.05,.035,.90),(S*.105,.06,.918+j*.025),(S*.125,.08,.962+j*.015),(S*.13,.09,.997-j*.018)]
                heads.append(tube('antler',pts,[.014,.013,.008,.0005],8))
                heads.append(tube('twig',[pts[1],(S*.15,.07,.935+j*.023),(S*.167,.08,.952+j*.022)],[.008,.005,.0005],7))
    add('Head',heads)
    hands=[]
    for S in [-1,1]:
        handZ=sum(p.arm_at(wrist*H))/2/H
        hands.append(tube('palm',[(S*wrist,0,handZ),(S*(wrist+.026),0,handZ),(S*(reach-.048),0,handZ)],[.018,.022,.018],12))
        for j in range(4):
            yy=(j-1.5)*.010; end=reach-[.007,0,.006,.018][j]
            hands.append(tube('finger',[(S*(reach-.055),yy,handZ),(S*(end-.015),yy,handZ-.002),(S*end,yy,handZ-.004)],[.006,.005,.0027],8))
        hands.append(tube('thumb',[(S*(wrist+.013),-.012,handZ),(S*(wrist+.032),-.035,handZ-.008),(S*(wrist+.053),-.039,handZ-.008)],[.009,.007,.0035],8))
    add('Hand',hands)
    # Bare legs use the measured lower-leg contours; thigh continues beneath separate leaves.
    legs=[]; feet=[]
    for S in [-1,1]:
        rows=[]
        for zz in np.linspace(.045,legtop,36):
            c=float(np.interp(zz,[.045,.17,.30,.40,legtop],[.133,.128,.105,.084,.065]))
            w=float(np.interp(zz,[.045,.09,.17,.24,.30,.38,legtop],[.020,.019,.030,.034,.024,.040,.043]))
            if zz<.32:
                clean=p.LEGS[(p.LEGS[:,1]>.05*H)&((p.LEGS[:,2]-p.LEGS[:,1])<.09*H)]
                inner=float(np.interp(zz*H,clean[:,0],clean[:,1]))/H
                outer=float(np.interp(zz*H,clean[:,0],clean[:,2]))/H
                blend=max(0,min(1,(.32-zz)/.08))
                c=c*(1-blend)+(inner+outer)/2*blend
                w=w*(1-blend)+(outer-inner)/2*blend
            rows.append((zz,S*c,w,.005,w*.95))
        legs.append(rings('leg',rows,20))
        # Heels are at -Y, five toes at +Y: backwards feet with forward knees.
        feet.append(rings('heel',[(.003,S*.133,.019,-.006,.020),(.014,S*.133,.024,-.006,.026),(.037,S*.133,.021,.001,.025),(.062,S*.133,.016,.007,.016)],20))
        feet.append(tube('instep',[(S*.133,.005,.022),(S*.133,.045,.018),(S*.133,.083,.012)],[.024,.029,.025],16))
        for j in range(5):
            xx=S*(.133+(j-2)*.011); end=.108-j*.004
            feet.append(tube('toe',[(xx,.068,.013),(xx,end-.006,.011),(xx,end,.009)],[.007-j*.0007,.006-j*.0005,.0035],8))
    add('Leg',legs); add('Foot',feet)
    leaves=[]
    for tier in range(3):
        for i in range(16):
            a=2*math.pi*(i/16+.025*(tier%2)); rx=.075+tier*.018; ry=.047+tier*.012
            zz=.565-tier*.07
            o=leaf('skirt', (math.sin(a)*rx,-math.cos(a)*ry,zz),
                (math.sin(a)*(rx+.035),-math.cos(a)*(ry+.025),zz-.16-(.035 if abs(math.sin(a))<.3 else 0)),.032,a)
            # Whole leaf on one skirt chain (SKIRT order), so it never tears between chains.
            k=o.data.attributes.new('skirt_k','INT','POINT')
            for d in k.data: d.value=1+round(a/(math.pi/4))%8
            leaves.append(o)
    for S in [-1,1]:
        for j in range(7):
            a=(j-3)*.35
            leaves.append(leaf('shoulder',(S*.115,.01,.79),(S*(.165+.015*math.cos(a)),.055*math.sin(a),.754),.019,a))
        if evil:
            for j in range(4):
                xx=S*(.15+j*.018)
                leaves.append(tube('bark',[(xx,.025,.77),(xx+S*.03,.03,.81+j*.008),(xx+S*.04,.04,.84+j*.01)],[.013,.01,.0005],8))
            for j in range(3):
                xx=S*(.36+j*.033)
                leaves.append(tube('forearm_bark',[(xx,.01,.74),(xx+S*.045,.015,.785),(xx+S*.065,.02,.81)],[.012,.009,.0005],8))
    add('Support',leaves)
    # Every stage has a fresh source manifest; original images are never modified.
    manifest={v:dict(file=f,sha256=hashlib.sha256((p.CDIR/f).read_bytes()).hexdigest()) for v,f in p.CFG['references'].items()}
    (OUT/'source-manifest.json').write_text(json.dumps(manifest,indent=2))

def joints():
    az=.739 if evil else .748; sx=.155 if evil else .132; wrist=.49 if evil else .45; reach=.625 if evil else .555
    J={}
    def bone(n,a,b,par): J[n]=(tuple(H*v for v in a),tuple(H*v for v in b),par)
    bone('Base',(0,0,.52),(0,0,.56),None)
    bone('Waist',(0,0,.56),(0,0,.62),'Base')
    bone('Chest1',(0,0,.62),(0,0,.69),'Waist')
    bone('Chest2',(0,0,.69),(0,0,.78),'Chest1')
    bone('Neck',(0,0,.78),(0,0,.84),'Chest2')
    bone('Head',(0,0,.84),(0,0,.94),'Neck')
    bone('Pelvis',(0,0,.52),(0,0,.49),'Base')
    bone('EffectBaseJoint',(0,0,0),(0,0,.04),'Base')
    for S,side in [(1,'L'),(-1,'R')]:
        ex=(sx+wrist)/2
        bone(side+'_Shoulder',(S*.03,0,az),(S*sx,0,az),'Chest2')
        bone(side+'_UpperArm',(S*sx,0,az),(S*ex,0,az),side+'_Shoulder')
        bone(side+'_ForeArm',(S*ex,0,az),(S*wrist,0,az),side+'_UpperArm')
        bone(side+'_Hand',(S*wrist,0,az),(S*(reach-.04),0,az),side+'_ForeArm')
        bone(side+'_Finger1',(S*(reach-.04),0,az),(S*(reach-.02),0,az),side+'_Hand')
        bone(side+'_Finger2',(S*(reach-.02),0,az),(S*reach,0,az),side+'_Finger1')
        bone(side+'_Thumb1',(S*(wrist+.01),-.01,az),(S*(wrist+.035),-.03,az),side+'_Hand')
        bone(side+'_Thumb2',(S*(wrist+.035),-.03,az),(S*(wrist+.055),-.04,az),side+'_Thumb1')
        bone(side+'_Thigh',(S*.065,0,.52),(S*.105,-.012,.29),'Pelvis')
        bone(side+'_Calf',(S*.105,-.012,.29),(S*.133,.006,.05),side+'_Thigh')
        bone(side+'_Foot',(S*.133,.006,.05),(S*.133,.078,.012),side+'_Calf')
        bone(side+'_Toe1',(S*.133,.078,.012),(S*.133,.106,.009),side+'_Foot')
    # Secondary chains (sprung in curupira_motion): mane behind the head, leaf skirt
    # around the pelvis in eight directions.
    a,b,c=hair_point(0,.03,.905),hair_point(0,.115,.83),hair_point(0,.16,.70)
    J['Hair01']=(tuple(H*v for v in a),tuple(H*v for v in b),'Head')
    J['Hair02']=(tuple(H*v for v in b),tuple(H*v for v in c),'Hair01')
    for k,d in enumerate(SKIRT):
        ang=k*math.pi/4; s,c=math.sin(ang),-math.cos(ang)
        bone('Skirt'+d+'01',(s*.072,c*.046,.56),(s*.098,c*.064,.42),'Pelvis')
        bone('Skirt'+d+'02',(s*.098,c*.064,.42),(s*.122,c*.083,.28),'Skirt'+d+'01')
    return J

SKIRT=['F','FL','L','BL','B','BR','R','FR']   # azimuth k*45 deg from the front, left = +X

def rigging():
    p.joints=joints; p.make_pose_test=lambda rig:None; p.sash_vertices=lambda o,slot:set()
    p.SLOT_BONES['Support']=['Pelvis','Base','Chest2','L_UpperArm','R_UpperArm','L_ForeArm','R_ForeArm']
    p.stage_rig()
    # Disconnected left/right shells confuse bone heat. Use anatomical weights
    # for the legs and rigid feet, preserving the shared ankle seam in motion.
    for slot in ['Leg','Foot']:
        o=p.parts_by_slot()[slot]; rig=o.parent
        for v in o.data.vertices:
            S='L' if v.co.x>0 else 'R'; zz=v.co.z/H
            for g in list(v.groups):
                if o.vertex_groups[g.group].name in rig.data.bones: o.vertex_groups[g.group].remove([v.index])
            if slot=='Foot': weights=[(S+'_Foot',1)]
            else:
                # Knee blend spans ~.09H around the joint: a .05H band folded like a hinge.
                k=max(0,min(1,(zz-.245)/.09)); k=k*k*(3-2*k); weights=[(S+'_Calf',1-k),(S+'_Thigh',k)]
            for n,w in weights:
                if w: o.vertex_groups[n].add([v.index],w,'REPLACE')
    def assign(o,v,weights):
        rig=o.parent
        for g in list(v.groups):
            if o.vertex_groups[g.group].name in rig.data.bones: o.vertex_groups[g.group].remove([v.index])
        for n,w in weights:
            if w>1e-4:
                if n not in o.vertex_groups: o.vertex_groups.new(name=n)
                o.vertex_groups[n].add([v.index],w,'REPLACE')
    # Mane: root on the head, then Hair01, tip on Hair02 (two influences at most).
    o=p.parts_by_slot()['Head']; hu=o.data.attributes['hair_u'].data
    line=o.data.color_attributes.active_color.data; sil=o.vertex_groups['silhouette']
    for v in o.data.vertices:
        u=hu[v.index].value
        if u>0:   # the mane hangs below the neck line, but it is not the tucked head base
            c=line[v.index].color; line[v.index].color=(1,c[1],c[2],c[3]); sil.add([v.index],1,'REPLACE')
        if u<=.35: continue
        if u<.7: k=(u-.35)/.35; assign(o,v,[('Head',1-k),('Hair01',k)])
        else: k=(u-.7)/.3; assign(o,v,[('Hair01',1-k),('Hair02',k)])
    # Skirt leaves hang from the pelvis on their chain; shoulder leaves and bark copy the
    # skin under them (nearest Body vertex), so they fold with the deltoid and forearm.
    body=p.parts_by_slot()['Body']; kd=__import__('mathutils').kdtree.KDTree(len(body.data.vertices))
    for v in body.data.vertices: kd.insert(v.co,v.index)
    kd.balance(); bnames={g.index:g.name for g in body.vertex_groups}
    o=p.parts_by_slot()['Support']; rig=o.parent; sk=o.data.attributes['skirt_k'].data
    for v in o.data.vertices:
        k=sk[v.index].value
        if k:
            d=SKIRT[k-1]; t=max(0,min(1,(.56-v.co.z/H)/.28))
            w=[('Pelvis',1-2*t),('Skirt'+d+'01',2*t)] if t<.5 else [('Skirt'+d+'01',2-2*t),('Skirt'+d+'02',2*t-1)]
        else:
            _,i,_=kd.find(v.co); src=body.data.vertices[i]
            w=sorted(((bnames[g.group],g.weight) for g in src.groups if bnames[g.group] in rig.data.bones),key=lambda x:-x[1])[:2]
            tot=sum(x for _,x in w) or 1; w=[(n,x/tot) for n,x in w]
        assign(o,v,w)
    for o in p.parts_by_slot().values():
        for n in ('hair_u','skirt_k'):
            if n in o.data.attributes: o.data.attributes.remove(o.data.attributes[n])

def look():
    sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.fps=100
    sc.view_settings.view_transform='Standard'; sc.render.film_transparent=False
    sc.world=bpy.data.worlds.new('CurupiraStudio'); sc.world.use_nodes=True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.26,.29,.31,1)
    for o in p.parts_by_slot().values():
        img=bpy.data.images.load(str(OUT/'textures'/f'{o.name}.png'))
        o.data.materials.clear(); o.data.materials.append(p.toon_material(o.name,img))
    sun=bpy.data.objects.new('Key',bpy.data.lights.new('Key','SUN')); sc.collection.objects.link(sun)
    sun.data.energy=3; sun.rotation_euler=(.5,-.5,-.4)
    cam=bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam); sc.camera=cam
    rd=OUT/'renders'; rd.mkdir(exist_ok=True)
    rig=next(o for o in bpy.data.collections[NAME].objects if o.type=='ARMATURE')
    for name,loc,target,scale,act in [
        ('front',(0,-4*H,.5*H),(0,0,.5*H),1.45*H,None),
        ('threequarter',(2*H,-3*H,.65*H),(0,0,.5*H),1.25*H,'idle'),
        ('back',(0,4*H,.5*H),(0,0,.5*H),1.45*H,None),
        ('feet',(.5*H,-.8*H,.22*H),(0,.02*H,.08*H),.42*H,None),
        ('face',(.10*H,-1*H,.88*H),(0,0,.86*H),.32*H,None)]:
        rig.animation_data.action=bpy.data.actions.get(act) if act else None
        for pb in rig.pose.bones: pb.matrix_basis=Matrix.Identity(4)
        sc.frame_set(1); sc.frame_set(0)
        cam.location=loc; cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO'; cam.data.ortho_scale=scale
        sc.render.resolution_x=1100; sc.render.resolution_y=1000; sc.render.resolution_percentage=100
        sc.render.filepath=str(rd/(name+'.png')); bpy.ops.render.render(write_still=True)
    rig.animation_data.action=None
    for pb in rig.pose.bones: pb.matrix_basis=Matrix.Identity(4)
    sc.frame_set(1);sc.frame_set(0)

stages=['geo','bake','rig','anim','look','export']
start=stages.index(resume)
if start: bpy.ops.wm.open_mainfile(filepath=str(OUT/('stage-'+stages[start-1]+'.blend')))
for st in stages[start:]:
    print('CURUPIRA_STAGE',NAME,st,flush=True)
    if st=='geo': geometry()
    elif st=='bake': p.stage_bake()
    elif st=='rig': rigging()
    elif st=='anim':
        sys.path.insert(0,str(HERE)); import curupira_motion
        curupira_motion.build(p,joints())
    elif st=='look': look()
    else: p.stage_export()
    if st!='export': p.save(st)
