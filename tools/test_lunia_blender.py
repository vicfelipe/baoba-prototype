import bpy,sys,json,traceback
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/cbb-skinned-addon-20261026'))
OUT=ROOT/'Evidence/lunia-20261026'
report={'blender':bpy.app.version_string,'imports':[]}
class Reporter:
    def report(self,level,msg):print(level,msg)
try:
    import cbb_skinned_addon
    from cbb_skinned_addon.core.skeleton_core import import_skeleton
    from cbb_skinned_addon.core.mesh_core import import_skinnedmesh
    from cbb_skinned_addon.core.animation_core import import_animation_from_files
    for char in ['Fighter','Sieg','Krieg']:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        folder=OUT/'samples'/char
        status=import_skeleton(False,char+'.Skeleton',str(folder),Reporter())
        rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
        rig.select_set(True);bpy.context.view_layer.objects.active=rig
        entry={'character':char,'skeleton_status':list(status),'bones':len(rig.data.bones),'meshes':[],'clips':[]}
        for part in ['Body','Head','Hand','Leg','Foot']:
            f=char+'_'+part+'_000.SkinnedMesh'
            status=import_skinnedmesh(False,f,str(folder),True,False,skeleton_name=char,texture_directory='unused',texture_file_name='missing',operator=Reporter())
            mesh=bpy.data.objects.get(Path(f).stem)
            if mesh:
                entry['meshes'].append({'name':mesh.name,'status':list(status),'vertices':len(mesh.data.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'max_influences':max(len([g for g in v.groups if g.weight>0]) for v in mesh.data.vertices),'weight_error':max(abs(sum(g.weight for g in v.groups)-1) for v in mesh.data.vertices),'bounds':[list(mesh.dimensions)]})
        for clip in ['Stand','Run','AtkA1']:
            status=import_animation_from_files(False,char+'_'+clip+'.SkinnedAnim',str(folder),True,skeleton_name=char,operator=Reporter())
            action=rig.animation_data.action
            action.use_fake_user=True
            entry['clips'].append({'name':action.name,'status':list(status),'frames':list(action.frame_range)})
        rig.animation_data_clear()
        from mathutils import Matrix
        for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
        bpy.context.scene.frame_set(0)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(char+'-study.blend')))
        report['imports'].append(entry)
except Exception:
    report['exception']=traceback.format_exc();print(report['exception'])
(OUT/'blender-import-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
