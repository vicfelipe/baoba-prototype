"""Build the web actor from a preserved Baoba source. Blender 5.2, no third-party clips.
Original UV paint and projection masks are preserved in the GLB and source copy.
The two showcase clips have baked analytical foot IK, exported as ordinary bone keys.
"""
import bpy, json, math, pathlib
import numpy as np
from mathutils import Matrix, Vector, Euler
ROOT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'SourceArt/Lutador-source.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
rig.animation_data_clear()
for p in rig.pose.bones: p.matrix_basis=Matrix.Identity(4)
# Preserve original UV painting and its feather mask for the web shader.
original_materials=list(mesh.data.materials)
original_indices=[p.material_index for p in mesh.data.polygons]
paint=mesh.data.color_attributes.get('PaintBlend')
source_alpha=np.array([v.color[3] for v in paint.data],dtype=np.float32) if paint else np.ones(len(mesh.data.loops),dtype=np.float32)
rgba=np.ones((len(mesh.data.loops),4),dtype=np.float32)
rgba[:,3]=source_alpha
color=mesh.data.color_attributes.new(name='WebPaint',type='FLOAT_COLOR',domain='CORNER')
color.data.foreach_set('color',rgba.ravel())
mesh.data.color_attributes.active_color=color
for a in list(mesh.data.color_attributes):
    if a.name!='WebPaint':mesh.data.color_attributes.remove(a)
# Portable material graph plus metadata used by the toon shader in Three.js.
mesh.data.materials.clear()
for src in original_materials:
    nodes=src.node_tree.nodes
    tex=next((n for n in nodes if n.type=='TEX_IMAGE' and n.image),None)
    mix=next((n for n in nodes if n.type=='MIX_RGB'),None)
    emit=next((n for n in nodes if n.type=='EMISSION'),None)
    base=list(mix.inputs[1].default_value[:3] if mix else emit.inputs['Color'].default_value[:3] if emit else src.diffuse_color[:3])
    portable=bpy.data.materials.new(src.name+'_Web');portable.use_nodes=True
    portable['paintBase']=base
    bs=portable.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*base,1);bs.inputs['Roughness'].default_value=1
    if tex:
        n=portable.node_tree.nodes.new('ShaderNodeTexImage');n.image=tex.image;portable.node_tree.links.new(n.outputs['Color'],bs.inputs['Base Color'])
    mesh.data.materials.append(portable)
for poly,mi in zip(mesh.data.polygons,original_indices):poly.material_index=mi
# Only the alpha channel carries the source's projection edge mask.
rgba[:,:3]=1
rgba[:,3]=source_alpha
color.data.foreach_set('color',rgba.ravel())
# Three.js Y-up to Blender Z-up.
B=Matrix(((1,0,0),(0,0,-1),(0,1,0)))
def rot(v):return B@Euler(v,'XYZ').to_matrix()@B.inverted()
I=Matrix.Identity(3)
def sample_pose(p):
    rotations={}
    hip=rot(p.get('pivot',(0,0,0)))@rot(p.get('hips',(0,0,0)))
    chest=hip@rot(p.get('torso',(0,0,0)))
    rotations.update(Hips=hip,Spine=hip,Chest=chest,UpperChest=chest,Neck=chest,Head=chest@rot(p.get('head',(0,0,0))))
    for side,s,sign in [('Left','L',1),('Right','R',-1)]:
        a=chest@rot(p.get('arm'+s,(0,0,0))); f=a@rot(p.get('fore'+s,(0,0,0)))
        down=Matrix.Rotation(sign*math.pi/2,3,'Y')
        rotations[side+'Shoulder']=chest
        rotations[side+'UpperArm']=a@down;rotations[side+'LowerArm']=f@down;rotations[side+'Hand']=f@down
        l=hip@rot(p.get('leg'+s,(0,0,0)));sh=l@rot(p.get('shin'+s,(0,0,0)))
        for n,r in [('UpperLeg',l),('LowerLeg',sh),('Foot',sh),('Toes',sh)]:rotations[side+n]=r
    for pb in rig.pose.bones:
        rest=pb.bone.matrix_local
        pos=(pb.parent.matrix@pb.parent.bone.matrix_local.inverted()@rest).translation if pb.parent else rest.translation+Vector((p.get('px',0),-p.get('pz',0),p.get('py',0)))
        m=(rotations.get(pb.name,I)@rest.to_3x3()).to_4x4();m.translation=pos;pb.matrix=m
        bpy.context.view_layer.update()
    bpy.context.view_layer.update()
def point_bone(pb,start,end):
    rest=pb.bone
    q=(rest.tail_local-rest.head_local).rotation_difference(end-start)
    m=(q.to_matrix()@rest.matrix_local.to_3x3()).to_4x4();m.translation=start;pb.matrix=m
    bpy.context.view_layer.update()
def leg_ik(side,target):
    upper=rig.pose.bones[side+'UpperLeg'];lower=rig.pose.bones[side+'LowerLeg'];foot=rig.pose.bones[side+'Foot']
    start=upper.head.copy();end=Vector(target);delta=end-start
    a=upper.bone.length;b=lower.bone.length;d=min(delta.length,a+b-.0001);axis=delta.normalized()
    along=(a*a-b*b+d*d)/(2*d);height=math.sqrt(max(0,a*a-along*along))
    pole=Vector((0,-1,0));bend=(pole-axis*pole.dot(axis)).normalized()
    knee=start+axis*along+bend*height;end=start+axis*d
    point_bone(upper,start,knee);point_bone(lower,knee,end)
    m=foot.bone.matrix_local.copy();m.translation=end;foot.matrix=m
    bpy.context.view_layer.update()
def lerp_path(points,t):
    for (ta,a),(tb,b) in zip(points,points[1:]):
        if t<=tb:
            f=max(0,(t-ta)/(tb-ta));f=f*f*(3-2*f)
            return Vector(a).lerp(Vector(b),f)
    return Vector(points[-1][1])
scene=bpy.context.scene;scene.render.fps=60
clips=json.loads((ROOT/'SourceArt/poses.json').read_text())
for clip in clips:
    action=bpy.data.actions.new(clip['name']);rig.animation_data_create();rig.animation_data.action=action
    for fr in clip['frames']:
        t=fr['time'];p=fr['pose'];u=t/clip['duration']
        if clip['name']=='idle':
            p['pivot']=[0,0,0];p['py']=-.065-.018*math.sin(2*math.pi*u)**2;p['px']=.035*math.sin(2*math.pi*u)
        if clip['name']=='combo0':
            # The actual contact is 0.16 seconds, shared with gameplay.
            p['pivot']=[0,0,0];p['py']=-.045;p['px']=.045
        sample_pose(p)
        if clip['name']=='idle':
            for side,phase,x in [('Left',u,.166),('Right',(u+.5)%1,-.166)]:
                q=(phase%1)*2*math.pi
                # Front foot stays planted for half-cycle; rear step arcs above floor.
                back=max(0,math.sin(q));lift=.065*max(0,math.sin(2*q)) if q<math.pi else 0
                leg_ik(side,(x,.22*back,.12+lift))
        elif clip['name']=='combo0':
            leg_ik('Left',(.166,0,.12))
            target=lerp_path([(0,(-.166,0,.12)),(.10,(-.24,.02,.72)),(.16,(-.38,-.73,1.13)),(.205,(-.43,-.66,1.10)),(.31,(-.24,-.15,.64)),(.42,(-.166,0,.12))],t)
            leg_ik('Right',target)
        for pb in rig.pose.bones:
            pb.rotation_mode='QUATERNION'
            frame=1+t*60
            pb.keyframe_insert('location',frame=frame,group=pb.name)
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
            pb.keyframe_insert('scale',frame=frame,group=pb.name)
    action.use_fake_user=True
    track=rig.animation_data.nla_tracks.new();track.name=clip['name'];track.strips.new(clip['name'],1,action)
    track.mute=True
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(ROOT/'web/assets/lutador.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_all_influences=False,export_materials='EXPORT',export_force_sampling=True,export_yup=True,export_extras=True,export_vertex_color='ACTIVE')
(ROOT/'Evidence/lutador-export.json').write_text(json.dumps({'vertices':len(mesh.data.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'bones':len(rig.data.bones),'clips':[{k:c[k] for k in ('name','duration')} for c in clips]},indent=2))
# Render a contact sheet from the same source/animations, with neutral studio lighting.
for track in rig.animation_data.nla_tracks:track.mute=True
mesh.data.materials.clear()
for m in original_materials:mesh.data.materials.append(m)
for poly,mi in zip(mesh.data.polygons,original_indices):poly.material_index=mi
color.name='PaintBlend'
rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'SourceArt/Lutador-web.blend'))
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=700;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.35,.35,.35)
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,5),350,4);area('Fill',(3,-2,3),180,3);area('Rim',(1,2,4),250,3)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object
floorMat=bpy.data.materials.new('StudioSand');floorMat.diffuse_color=(.28,.32,.29,1);floor.data.materials.append(floorMat)
cam=scene.camera;cam.location=(2.5,-5,2.8);cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.35
scene.view_settings.view_transform='Standard'
for name,t in [('idle',.4),('combo0',.16),('apose',0)]:
    rig.animation_data.action=bpy.data.actions[name];scene.frame_set(int(1+t*60))
    scene.render.filepath=str(ROOT/f'Evidence/lutador-{name}.png');bpy.ops.render.render(write_still=True)
