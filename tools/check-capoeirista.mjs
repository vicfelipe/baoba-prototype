import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
globalThis.ProgressEvent=class {constructor(type,init){Object.assign(this,{type},init);}};
const path=new URL('../web/assets/capoeirista.glb',import.meta.url);
const binary=fs.readFileSync(path);
const json=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)));
const required=['idle','run','combo0','combo1','combo2','rasteira','meialua','dodge','jump','hit','dead','victory','apose'];
for(const n of required)assert(json.animations.some(a=>a.name===n),`missing clip ${n}`);
const {PLAYER}=await import(new URL('../web/src/config.js',import.meta.url));
const timed={combo0:PLAYER.combo[0].dur,combo1:PLAYER.combo[1].dur,combo2:PLAYER.combo[2].dur,rasteira:PLAYER.rasteira.dur,meialua:PLAYER.meiaLua.dur,dodge:PLAYER.dodge.dur};
assert.equal(json.skins.length,1);
assert(json.meshes.every(m=>m.primitives.every(pr=>pr.attributes.COLOR_0!==undefined)),'NoSilhouette mask (COLOR_0) missing');
assert(json.images.every(i=>i.bufferView!==undefined),'Textures must be embedded');
let code=fs.readFileSync(new URL('../web/src/capoeirista-asset.js',import.meta.url),'utf8');
code=code.replace("import * as THREE from 'three';",`import * as THREE from '${new URL('../web/node_modules/three/build/three.module.js',import.meta.url)}';`)
 .replaceAll("'three/examples/jsm/",`'${new URL('../web/node_modules/three/examples/jsm/',import.meta.url)}`)
 .replace("from './config.js'",`from '${new URL('../web/src/config.js',import.meta.url)}'`)
 .replace(/import modelUrl from .*?;/,`const modelUrl='data:model/gltf-binary;base64,${binary.toString('base64')}';`);
const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
// Image decoding is deliberately stubbed: this test checks geometry, skinning and clocks.
const loader=new GLTFLoader().register(()=>({name:'geometry-test',loadTexture(){const t=new THREE.Texture();t.image={width:1,height:1};return Promise.resolve(t);}}));
await api.loadCapoeiristaAsset(loader);
const rig=api.buildSkinnedCapoeirista();
const meshes=[];rig.model.traverse(o=>{if(o.isSkinnedMesh && o.material.side!==THREE.BackSide)meshes.push(o);});
assert(meshes.length>=1);
const result={clips:[],geometryOnly:true};
for(const [name,clip] of rig.clips){
  let max=0;
  for(let i=0;i<=30;i++){
    rig.animate(name,clip.duration/30,i/30,5.1,i===0);
    for(const mesh of meshes){
      mesh.skeleton.update();
      for(let v=0;v<mesh.geometry.attributes.position.count;v+=97){
        const point=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,v);
        mesh.applyBoneTransform(v,point);point.applyMatrix4(mesh.matrixWorld);
        assert([point.x,point.y,point.z].every(Number.isFinite),`${name}: non-finite vertex`);
        max=Math.max(max,point.length());
      }
    }
  }
  assert(max<4,`${name}: mesh exploded (${max})`);
  result.clips.push({name,duration:clip.duration,maxRadius:max});
}
for(const [n,d] of Object.entries(timed))assert(Math.abs(rig.clips.get(n).duration-d)<.011,`${n}: clip ${rig.clips.get(n).duration}s, combat ${d}s`);
const bones=[];rig.model.traverse(o=>{if(o.isBone)bones.push(o.name);});
for(const n of ['Base','Chest2','Head','L_UpperArm','R_Thigh','Cord01'])assert(bones.includes(n),`missing bone ${n}`);
rig.animate('idle',1000);assert(rig.mixer.clipAction(rig.clips.get('idle')).time<rig.clips.get('idle').duration);
rig.animate('combo0',0,PLAYER.combo[0].hit/PLAYER.combo[0].dur,0,true);
assert(Math.abs(rig.mixer.clipAction(rig.clips.get('combo0')).time-PLAYER.combo[0].hit)<1e-6);
const second=api.buildSkinnedCapoeirista();
assert.notEqual(second.model.getObjectByProperty('isBone',true),rig.model.getObjectByProperty('isBone',true));
fs.writeFileSync(new URL('../Evidence/capoeirista-checks.json',import.meta.url),JSON.stringify(result,null,2));
console.log(`PASS: ${result.clips.length} clips (combat durations match); Lunia bones; finite skinned geometry; independent skeletons; loops; attack clock; embedded textures.`);
