import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
globalThis.ProgressEvent=class {constructor(type,init){Object.assign(this,{type},init);}};
const path=new URL('../web/assets/lutador.glb',import.meta.url);
const binary=fs.readFileSync(path);
const json=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)));
assert.equal(json.animations.length,13);
assert.equal(json.skins.length,1);
assert(json.images.every(i=>i.bufferView!==undefined),'Textures must be embedded');
let code=fs.readFileSync(new URL('../web/src/lutador-asset.js',import.meta.url),'utf8');
code=code.replace("import * as THREE from 'three';",`import * as THREE from '${new URL('../web/node_modules/three/build/three.module.js',import.meta.url)}';`)
 .replaceAll("'three/examples/jsm/",`'${new URL('../web/node_modules/three/examples/jsm/',import.meta.url)}`)
 .replace(/import modelUrl from .*?;/,`const modelUrl='data:model/gltf-binary;base64,${binary.toString('base64')}';`);
const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
// Image decoding is deliberately stubbed: this test checks geometry, skinning and clocks.
const loader=new GLTFLoader().register(()=>({name:'geometry-test',loadTexture(){const t=new THREE.Texture();t.image={width:1,height:1};return Promise.resolve(t);}}));
await api.loadLutadorAsset(loader);
const rig=api.buildSkinnedLutador();
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
rig.animate('idle',1000);assert(rig.mixer.clipAction(rig.clips.get('idle')).time<rig.clips.get('idle').duration);
rig.animate('combo0',0,.16/.42,0,true);
assert(Math.abs(rig.mixer.clipAction(rig.clips.get('combo0')).time-.16)<1e-6);
const second=api.buildSkinnedLutador();
assert.notEqual(second.model.getObjectByProperty('isBone',true),rig.model.getObjectByProperty('isBone',true));
fs.writeFileSync(new URL('../Evidence/lutador-checks.json',import.meta.url),JSON.stringify(result,null,2));
console.log(`PASS: ${result.clips.length} clips; finite skinned geometry; independent skeletons; loops; attack clock; embedded textures.`);
