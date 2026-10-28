// Geometry/skin/clock checks. Texture decoding is stubbed; shot-curupira checks real rendering.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { CURUPIRA } from '../web/src/config.js';
globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
const required = ['idle','walk','sweepWarn','sweepHit','rootsWarn','rootsHit','basicWarn','basicHit','cast','stagger','recover','freed','apose'];
const data = {};
for (const [form, filename] of [['corrupted','curupira-corrompido'],['freed','curupira']]) {
  const bytes = fs.readFileSync(new URL(`../web/assets/${filename}.glb`, import.meta.url));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  assert.equal(json.skins.length, 1);
  assert.equal(json.meshes.length, 6);
  assert(json.images.every(i => i.bufferView !== undefined));
  for (const m of json.meshes) for (const pr of m.primitives) {
    for (const a of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0','COLOR_0']) assert(pr.attributes[a] !== undefined, `${m.name}: missing ${a}`);
  }
  for (const name of required) assert(json.animations.some(a => a.name === name), `${form}: missing ${name}`);
  data[form] = 'data:model/gltf-binary;base64,' + bytes.toString('base64');
}
let code = fs.readFileSync(new URL('../web/src/curupira-asset.js', import.meta.url), 'utf8');
code = code.replace("from 'three'", `from '${new URL('../web/node_modules/three/build/three.module.js', import.meta.url)}'`)
  .replaceAll("'three/examples/jsm/", `'${new URL('../web/node_modules/three/examples/jsm/', import.meta.url)}`)
  .replace(/import corruptedUrl from .*?;/, `const corruptedUrl=${JSON.stringify(data.corrupted)};`)
  .replace(/import freedUrl from .*?;/, `const freedUrl=${JSON.stringify(data.freed)};`)
  .replace(/import \{ luniaMaterial, outlineFor \} from .*?;/, `const luniaMaterial=map=>new THREE.MeshBasicMaterial({map}); const outlineFor=()=>new THREE.Group();`);
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const loader = new GLTFLoader().register(() => ({ name:'geometry-only', loadTexture() { return Promise.resolve(new THREE.Texture()); } }));
await api.loadCurupiraAssets(loader);
const rig = api.buildSkinnedCurupira(), second = api.buildSkinnedCurupira();
const results = {};
for (const freed of [false,true]) {
  rig.setFreed(freed); const form=rig.form; const model=rig.model; const meshes=[];
  assert.equal(rig.forms.corrupted.model.visible,!freed); assert.equal(rig.forms.freed.model.visible,freed);
  model.traverse(o=>{if(o.isSkinnedMesh) meshes.push(o);});
  assert.notEqual(model.getObjectByName('Head'),second.forms[form].model.getObjectByName('Head'));
  rig.animate('apose'); const bounds=new THREE.Box3().setFromObject(model);
  assert(Math.abs(bounds.max.y-rig.height)<.045,`${form}: wrong height ${bounds.max.y}`);
  // Front is +Z in glTF, toes must point toward -Z.
  const heel=model.getObjectByName('L_Foot').getWorldPosition(new THREE.Vector3());
  const toe=model.getObjectByName('L_Toe1').getWorldPosition(new THREE.Vector3());
  assert(toe.z<heel.z-.05,`${form}: feet are not backwards`);
  for(const mesh of meshes) {
    const weights=mesh.geometry.attributes.skinWeight;
    for(let i=0;i<weights.count;i++) {
      const w=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)];
      assert(w.filter(v=>v>1e-4).length<=2);assert(Math.abs(w.reduce((a,b)=>a+b,0)-1)<.002);
    }
  }
  const clips=[];
  for(const [name,clip] of rig.clips) {
    let minY=Infinity,maxRadius=0;
    for(let i=0;i<=20;i++) {
      rig.animate(name,clip.duration*i/20);
      for(const m of meshes) {
        m.skeleton.update();
        for(let j=0;j<m.geometry.attributes.position.count;j+=13) {
          const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,j);
          m.applyBoneTransform(j,v);v.applyMatrix4(m.matrixWorld);
          assert([v.x,v.y,v.z].every(Number.isFinite)); minY=Math.min(minY,v.y);maxRadius=Math.max(maxRadius,v.length());
        }
      }
    }
    assert(maxRadius<rig.height*1.6,`${form}/${name}: exploded geometry`);
    assert(minY>-.08,`${form}/${name}: feet below ground (${minY})`);
    clips.push({name,duration:clip.duration,minY,maxRadius});
  }
  for(const [name,d] of Object.entries({sweepWarn:CURUPIRA.sweep.warn,rootsWarn:CURUPIRA.roots.warn,cast:CURUPIRA.call.cast,sweepHit:.5,rootsHit:.45,basicWarn:CURUPIRA.basic.windup,basicHit:CURUPIRA.basic.hit})) {
    assert(Math.abs(rig.clips.get(name).duration-d)<.001,`${form}/${name}: combat duration mismatch`);
  }
  rig.animate('sweepWarn',.8);assert(Math.abs(rig.forms[form].action.time-.8)<1e-6);
  rig.animate('idle',100);assert(rig.forms[form].action.time<rig.clips.get('idle').duration);
  results[form]={height:bounds.max.y,clips};
}
rig.setFreed(false);rig.animate('idle',0);assert.equal(rig.height,3);
fs.writeFileSync(new URL('../Evidence/curupira-checks.json',import.meta.url),JSON.stringify(results,null,2));
console.log('PASS: both forms, 6 slots, 11 clips, reverse feet, heights, weights, ground, combat clocks, independent skeletons and reset.');
