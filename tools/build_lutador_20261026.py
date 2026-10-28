"""New independent character from this conversation's references. Blender background build.
No old meshes, rigs or animations are read. Lunia samples are measurement-only.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
from math import sin,cos,pi,exp
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'SourceArt/Lutador-20261026';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.fps=30
skinparts=[];clothparts=[];accessories=[]
def mesh_obj(name,verts,faces,collection):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);collection.append(o)
    for p in m.polygons:p.use_smooth=True
    return o
def loft(name,rows,n=32,axis='Z',collection=skinparts):
    # rows: center xyz, two elliptical radii, optional surface shaping
    vs=[];fs=[]
    for row in rows:
        x,y,z,a,b=row[:5]
        for j in range(n):
            t=2*pi*j/n
            if axis=='Z':v=(x+a*cos(t),y+b*sin(t),z)
            else:v=(x,y+a*cos(t),z+b*sin(t))
            vs.append(v)
    for k in range(len(rows)-1):
        for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    fs.extend([tuple(reversed(range(n))),tuple((len(rows)-1)*n+j for j in range(n))])
    o=mesh_obj(name,vs,fs,collection)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    mod=o.modifiers.new('Surface','SUBSURF');mod.levels=2
    bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
    return o
def ellipsoid(name,loc,scale,collection=skinparts,segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    collection.append(o);o.select_set(False);return o
def merge_remesh(parts,name,voxel,ratio):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    mod=o.modifiers.new('Weld surface','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Relax','SMOOTH');mod.factor=.55;mod.iterations=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Game surface','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    o.select_set(False);return o
# Z up, face toward -Y, anatomical left is +X. 1.80 m tall.
torso=loft('Torso',[(0,0,1.035,.158,.084),(0,0,1.09,.166,.088),(0,0,1.16,.172,.096),(0,0,1.23,.193,.108),(0,0,1.31,.222,.12),(0,0,1.385,.232,.116),(0,0,1.43,.205,.10),(0,0,1.48,.106,.067),(0,0,1.54,.062,.061),(0,0,1.58,.061,.06)])
# Build pectoral and abdominal relief into one torso surface, not separate spheres.
for v in torso.data.vertices:
    x,y,z=v.co
    if y<0:
        side=abs(x)
        relief=.013*exp(-((side-.105)/.075)**2-((z-1.35)/.055)**2)
        for az in [1.145,1.215,1.275]:relief+=.007*exp(-((side-.047)/.036)**2-((z-az)/.023)**2)
        v.co.y-=relief*min(1,abs(y)/.06)
head=loft('Head',[(0,-.012,1.535,.032,.034),(0,-.023,1.55,.048,.047),(0,-.013,1.575,.067,.064),(0,0,1.62,.078,.078),(0,0,1.67,.081,.083),(0,.001,1.72,.079,.08),(0,.003,1.765,.065,.067),(0,.003,1.793,.035,.042),(0,.003,1.802,.003,.006)],n=40)
# Facial silhouette: chin, cheek planes, nose, brow and lips are actual geometry.
for v in head.data.vertices:
    x,y,z=v.co
    if y<0:
        mask=max(0,min(1,-y/.055))
        v.co.y-=mask*(.028*exp(-(x/.018)**2-((z-1.641)/.028)**2)+.008*exp(-(x/.035)**2-((z-1.588)/.014)**2)+.008*exp(-((abs(x)-.038)/.027)**2-((z-1.686)/.012)**2))
for s in [-1,1]:
    ellipsoid('Ear',(s*.081,0,1.65),(.013,.017,.027))
    loft('Arm',[(s*.19,0,1.401,.079,.068),(s*.258,0,1.407,.083,.075),(s*.337,0,1.405,.07,.064),(s*.415,0,1.405,.057,.059),(s*.48,0,1.40,.044,.046),(s*.505,0,1.40,.045,.045),(s*.566,0,1.40,.053,.048),(s*.63,0,1.40,.045,.037),(s*.692,0,1.399,.029,.026)],24,'X')
    loft('Palm',[(s*.68,0,1.40,.028,.024),(s*.727,-.004,1.40,.044,.023),(s*.773,-.007,1.40,.044,.019),(s*.79,-.007,1.40,.035,.016)],24,'X')
    # Four flat fingers and a distinct thumb in palms-down T pose.
    for j,(yy,ll) in enumerate([(-.035,.093),(-.013,.105),(.009,.098),(.030,.081)]):
        loft('Finger',[(s*.765,yy,1.40,.011,.014),(s*(.79+ll*.40),yy,1.399,.01,.012),(s*(.785+ll),yy,1.398,.007,.008)],12,'X')
    o=ellipsoid('Thumb',(s*.75,-.053,1.387),(.041,.014,.014));o.rotation_euler.z=s*.45
    # Bare foot and toes; ankles hidden under trouser hem.
    ellipsoid('Foot',(s*.17,-.055,.058),(.061,.113,.049))
    ellipsoid('Ankle',(s*.17,.012,.115),(.045,.05,.075))
    for j in range(5):ellipsoid('Toe',(s*(.127+j*.022),-.148+j*.006,.032),(.014 if j else .018,.032-j*.003,.022),segments=16,rings=12)
skin=merge_remesh(skinparts,'Lutador_Skin',.0065,.52)
# Cloth silhouette follows the front reference and is welded through the crotch.
loft('Waist',[(0,0,1.07,.169,.091),(0,.001,1.015,.182,.104),(0,.004,.95,.193,.109),(0,.004,.87,.172,.103)],32,collection=clothparts)
for s in [-1,1]:
    leg=loft('Trouser',[(s*.103,0,.985,.093,.108),(s*.13,0,.91,.094,.104),(s*.146,0,.79,.084,.096),(s*.152,-.006,.64,.077,.085),(s*.16,-.012,.55,.076,.077),(s*.165,0,.46,.078,.082),(s*.17,.006,.34,.079,.079),(s*.17,.005,.20,.078,.072),(s*.17,0,.105,.075,.066)],28,collection=clothparts)
    for v in leg.data.vertices:
        x,y,z=v.co;v.co.y+=.003*sin(z*67+x*22)*exp(-((z-.18)/.12)**2)
cloth=merge_remesh(clothparts,'Lutador_Trousers',.007,.6)
def basic_material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.85
    return m
# Reference projection, baked to ordinary UV textures for portable GLB.
def paint_bake(o,name,base):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    m=basic_material(name,base);o.data.materials.append(m);nodes=m.node_tree.nodes;links=m.node_tree.links
    geom=nodes.new('ShaderNodeNewGeometry');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(geom.outputs['Position'],sep.inputs[0])
    def mathnode(op,a,b):
        n=nodes.new('ShaderNodeMath');n.operation=op
        for i,v in enumerate([a,b]):
            if isinstance(v,(int,float)):n.inputs[i].default_value=v
            else:links.new(v,n.inputs[i])
        return n.outputs[0]
    # Original 1376x768 reference, 370px per meter, sole at y728.
    u=mathnode('ADD',mathnode('MULTIPLY',sep.outputs['X'],370/1376),.5)
    ub=mathnode('SUBTRACT',1,u)
    vv=mathnode('ADD',mathnode('MULTIPLY',sep.outputs['Z'],370/768),40/768)
    texs=[]
    for fn,uu in [('front.png',u),('back.png',ub)]:
        combine=nodes.new('ShaderNodeCombineXYZ');links.new(uu,combine.inputs['X']);links.new(vv,combine.inputs['Y'])
        tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(OUT/'references'/fn),check_existing=True);tex.extension='EXTEND';links.new(combine.outputs[0],tex.inputs['Vector']);texs.append(tex)
    norm=nodes.new('ShaderNodeSeparateXYZ');links.new(geom.outputs['Normal'],norm.inputs[0])
    front=mathnode('LESS_THAN',norm.outputs['Y'],0)
    mix=nodes.new('ShaderNodeMixRGB');links.new(front,mix.inputs[0]);links.new(texs[1].outputs['Color'],mix.inputs[1]);links.new(texs[0].outputs['Color'],mix.inputs[2])
    # Blend to a neutral matching material at silhouette sides where projection stretches.
    fac=mathnode('MULTIPLY',mathnode('ABSOLUTE',norm.outputs['Y'],0),2.8)
    fac=mathnode('MINIMUM',fac,1)
    mix2=nodes.new('ShaderNodeMixRGB');links.new(fac,mix2.inputs[0]);mix2.inputs[1].default_value=(*base,1);links.new(mix.outputs[0],mix2.inputs[2])
    em=nodes.new('ShaderNodeEmission');links.new(mix2.outputs[0],em.inputs[0]);links.new(em.outputs[0],nodes.get('Material Output').inputs['Surface'])
    img=bpy.data.images.new(name+'_BaseColor',width=2048,height=2048,alpha=False)
    target=nodes.new('ShaderNodeTexImage');target.image=img;nodes.active=target
    scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.margin=12
    bpy.ops.object.bake(type='EMIT')
    img.filepath_raw=str(OUT/(name+'_BaseColor.png'));img.file_format='PNG';img.save();img.pack()
    nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=.9;bs.inputs['Specular IOR Level'].default_value=.15
    tex=nodes.new('ShaderNodeTexImage');tex.image=img;links.new(tex.outputs['Color'],bs.inputs['Base Color']);links.new(bs.outputs[0],out.inputs[0]);o.select_set(False)
paint_bake(skin,'Skin',(.32,.17,.105));paint_bake(cloth,'Cloth',(.82,.82,.79))
accmat=basic_material('Accessories',(.7,.45,.12))
colors={'gold':(.66,.40,.075,1),'red':(.60,.025,.012,1),'yellow':(.87,.62,.035,1),'green':(.045,.30,.04,1),'hair':(.035,.022,.017,1),'white':(.83,.83,.8,1)}
def acc(o,color,bone):
    o.data.materials.clear();o.data.materials.append(accmat)
    attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for d in attr.data:d.color=colors[color]
    o['bone']=bone
def tube(name,points,radius,color,bone):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2;curve.resolution_u=2
    sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);accessories.append(o);acc(o,color,bone);return o
for j,col in enumerate(['green','yellow','red']):
    tube('Belt_'+col,[(.173*cos(t*2*pi/64),.096*sin(t*2*pi/64),1.05+j*.012) for t in range(65)],.007,col,'Hips')
    tube('Cord_'+col,[(.181+j*.007+.005*sin(t*.35),-.015-j*.01,.0+1.07-t*.012) for t in range(43)],.005,col,'CordUpper')
for s,side in [(1,'L'),(-1,'R')]:
    for r in range(2):
        for k in range(12):
            t=k*2*pi/12;o=ellipsoid('Bracelet',(s*(.695+r*.018),.032*cos(t),1.399+.03*sin(t)),(.007,.008,.008),accessories,12,8);acc(o,'gold','Hand.'+side)
pts=[]
for k in range(48):
    t=k*2*pi/48;x=.076*cos(t);y=.081*sin(t);z=1.503-max(0,-sin(t))*.139
    pts.append((x,y,z));o=ellipsoid('Necklace_bead',(x,y,z),(.0045,.0045,.0045),accessories,10,6);acc(o,'gold','Chest')
o=ellipsoid('Pendant',(0,-.126,1.358),(.013,.005,.021),accessories,16,12);acc(o,'gold','Chest')
# Hair cap follows the skull and maintains the cropped hair silhouette.
o=loft('Cropped_hair',[(0,.003,1.744,.076,.077),(0,.003,1.767,.065,.067),(0,.003,1.791,.038,.043),(0,.003,1.803,.004,.006)],32,collection=accessories);acc(o,'hair','Head')
attrnode=accmat.node_tree.nodes.new('ShaderNodeVertexColor');attrnode.layer_name='Color';accmat.node_tree.links.new(attrnode.outputs['Color'],accmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
# Independent rig; not copied from the game's skeleton.
bones=[('Root',(0,0,0),(0,0,.15),None),('Hips',(0,0,.94),(0,0,1.09),'Root'),('Spine',(0,0,1.09),(0,0,1.25),'Hips'),('Chest',(0,0,1.25),(0,0,1.46),'Spine'),('Neck',(0,0,1.46),(0,0,1.56),'Chest'),('Head',(0,0,1.56),(0,0,1.77),'Neck'),('CordUpper',(.19,-.02,1.06),(.19,-.02,.81),'Hips'),('CordLower',(.19,-.02,.81),(.19,-.02,.55),'CordUpper')]
for s,side in [(1,'L'),(-1,'R')]:
    bones += [('Clavicle.'+side,(s*.045,0,1.43),(s*.23,0,1.405),'Chest'),('UpperArm.'+side,(s*.23,0,1.405),(s*.49,0,1.4),'Clavicle.'+side),('Forearm.'+side,(s*.49,0,1.4),(s*.69,0,1.4),'UpperArm.'+side),('Hand.'+side,(s*.69,0,1.4),(s*.86,0,1.4),'Forearm.'+side),('Thigh.'+side,(s*.105,0,.95),(s*.16,-.012,.55),'Hips'),('Shin.'+side,(s*.16,-.012,.55),(s*.17,0,.13),'Thigh.'+side),('Foot.'+side,(s*.17,0,.13),(s*.17,-.135,.04),'Shin.'+side),('Toes.'+side,(s*.17,-.135,.04),(s*.17,-.18,.03),'Foot.'+side)]
data=bpy.data.armatures.new('Lutador_Rig');rig=bpy.data.objects.new('Lutador_Rig',data);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,a,b,parent in bones:
    bone=data.edit_bones.new(name);bone.head=a;bone.tail=b
    if parent:bone.parent=data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;rig.select_set(False)
def bind(o,allowed=None,rigid=None):
    o.parent=rig;mod=o.modifiers.new('Armature','ARMATURE');mod.object=rig
    groups={n:o.vertex_groups.new(name=n) for n,a,b,p in bones if (allowed is None or n in allowed)}
    for v in o.data.vertices:
        pos=o.matrix_world@v.co
        if rigid:
            if rigid=='CordUpper':
                t=max(0,min(1,(.88-pos.z)/.14));groups['CordUpper'].add([v.index],1-t,'REPLACE');groups['CordLower'].add([v.index],t,'REPLACE')
            else:groups[rigid].add([v.index],1,'REPLACE')
            continue
        distances=[]
        for n,a,b,p in bones:
            if n not in groups:continue
            a=Vector(a);delta=Vector(b)-a;t=max(0,min(1,(pos-a).dot(delta)/delta.length_squared));d=(pos-a-t*delta).length
            distances.append((d,n))
        distances.sort();nearest=distances[:3];d0=nearest[0][0]
        weights=[exp(-((d-d0)/.045)**2)*1/(d+.015)**2 for d,n in nearest];total=sum(weights)
        for (_,n),w in zip(nearest,weights):
            if w/total>.001:groups[n].add([v.index],w/total,'REPLACE')
    # Normalize after pruning small weights.
    for v in o.data.vertices:
        total=sum(g.weight for g in v.groups)
        for g in list(v.groups):o.vertex_groups[g.group].add([v.index],g.weight/total,'REPLACE')
bind(skin,[n for n,a,b,p in bones if n not in ['Root','CordUpper','CordLower'] and not n.startswith(('Thigh','Shin'))])
bind(cloth,['Hips','Thigh.L','Thigh.R','Shin.L','Shin.R'])
for o in accessories:bind(o,rigid=o['bone'])
bpy.ops.object.select_all(action='DESELECT')
for o in accessories:o.select_set(True)
bpy.context.view_layer.objects.active=accessories[0];bpy.ops.object.join();accessory=bpy.context.object;accessory.name='Lutador_Accessories'
models=[skin,cloth,accessory]
# Two authored clips: relaxed breathing and a deliberate deformation inspection pose.
for name,length in [('Idle',60),('Rig_Check',90)]:
    action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action;action.use_fake_user=True
    for f in range(0,length+1,3):
        phase=2*pi*f/length
        for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        if name=='Idle':
            rig.pose.bones['Chest'].rotation_euler.x=.012*sin(phase)
            for s,side in [(1,'L'),(-1,'R')]:rig.pose.bones['UpperArm.'+side].rotation_euler.x=s*1.25
            rig.pose.bones['CordUpper'].rotation_euler.y=.035*sin(phase)
        else:
            a=sin(pi*f/length)**2
            rig.pose.bones['Forearm.L'].rotation_euler.z=-1.35*a
            rig.pose.bones['Thigh.R'].rotation_euler.x=-.9*a
            rig.pose.bones['Shin.R'].rotation_euler.x=1.4*a
            rig.pose.bones['Chest'].rotation_euler.y=.22*a
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
scene.frame_set(0)
# Export only new character, embedded textures, native glTF axes conversion.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in models:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Lutador.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_yup=True)
report={'origin':'new geometry and rig authored from current references; no Lunia mesh/texture/clip reused','bones':len(data.bones),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models),'meshes':[{'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'max_weights':max(len(v.groups) for v in o.data.vertices)} for o in models],'clips':['Idle','Rig_Check'],'limitations':['Projection paint needs artistic cleanup at side seams','Rig_Check is a deformation test, not gameplay combat','No run or combat animation delivered in this version']}
(OUT/'model-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
# Review studio, excluded from the GLB.
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.7,.72,.76,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.6
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.018));floor=bpy.context.object;floor.name='Studio_floor';floor.data.materials.append(basic_material('Studio_gray',(.19,.21,.24)))
for loc,power,size in [((2,-4,5),450,4),((-3,-2,3),250,3),((0,3,4),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.25;scene.camera=cam
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
for name,loc in [('front',(0,-5,1.02)),('back',(0,5,1.02)),('side',(5,0,1.02)),('three-quarter',(3,-5,2.3))]:
    cam.location=loc;cam.rotation_euler=(Vector((0,0,.91))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/('review-'+name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Lutador.blend'))
print('MODEL_REPORT',json.dumps(report))
