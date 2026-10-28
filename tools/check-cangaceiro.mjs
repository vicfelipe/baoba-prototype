// Geometry/skin/clock/weapon checks for the Cangaceiro GLB. Texture decoding is stubbed;
// shot-cangaceiro checks real rendering in the browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { CANGACEIRO } from '../web/src/config.js';
globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
const required = ['idle','run','shoot','pistols','throw','dodge','jump','hit','dead','victory','apose'];
const bytes = fs.readFileSync(new URL('../web/assets/cangaceiro.glb', import.meta.url));
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
assert.equal(json.skins.length, 1);
assert.equal(json.meshes.length, 9, 'six body slots + three weapons');
assert(json.images.every(i => i.bufferView !== undefined), 'textures embedded');
for (const m of json.meshes) for (const pr of m.primitives)
  for (const a of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0','COLOR_0']) assert(pr.attributes[a] !== undefined, `${m.name}: missing ${a}`);
for (const name of required) assert(json.animations.some(a => a.name === name), `missing ${name}`);
const data = 'data:model/gltf-binary;base64,' + bytes.toString('base64');
let code = fs.readFileSync(new URL('../web/src/cangaceiro-asset.js', import.meta.url), 'utf8');
code = code.replace("from 'three'", `from '${new URL('../web/node_modules/three/build/three.module.js', import.meta.url)}'`)
  .replaceAll("'three/examples/jsm/", `'${new URL('../web/node_modules/three/examples/jsm/', import.meta.url)}`)
  .replace(/import modelUrl from .*?;/, `const modelUrl=${JSON.stringify(data)};`)
  .replace(/import \{ luniaMaterial, outlineFor \} from .*?;/, `const luniaMaterial=map=>new THREE.MeshBasicMaterial({map}); const outlineFor=()=>new THREE.Group();`)
  .replace(/import \{ CANGACEIRO \} from .*?;/, `const CANGACEIRO=${JSON.stringify(CANGACEIRO)};`);
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const loader = new GLTFLoader().register(() => ({ name: 'geometry-only', loadTexture() { return Promise.resolve(new THREE.Texture()); } }));
await api.loadCangaceiroAsset(loader);
const rig = api.buildSkinnedCangaceiro(), second = api.buildSkinnedCangaceiro();
assert.notEqual(rig.model.getObjectByName('Head'), second.model.getObjectByName('Head'), 'independent skeletons');
for (const m of api.MUZZLES) assert(rig.model.getObjectByName(m), `missing ${m}`);
const meshes = []; rig.model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
rig.animate('apose'); const bounds = new THREE.Box3();
meshes.filter(m => !/Weapon|Bacamarte|Pistolas|Peixeira/.test(m.name)).forEach(m => bounds.expandByObject(m));
assert(Math.abs(bounds.max.y - rig.height) < .045, `wrong height ${bounds.max.y}`);
// Front is +Z in glTF: toes ahead of the heels.
const heel = rig.model.getObjectByName('L_Foot').getWorldPosition(new THREE.Vector3());
const toe = rig.model.getObjectByName('L_Toe1').getWorldPosition(new THREE.Vector3());
assert(toe.z > heel.z + .05, 'feet point forward');
for (const mesh of meshes) {
  const w = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < w.count; i++) {
    const v = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)];
    assert(v.filter(x => x > 1e-4).length <= 2); assert(Math.abs(v.reduce((a, b) => a + b, 0) - 1) < .002);
  }
}
const scale = name => rig.model.getObjectByName(name).getWorldScale(new THREE.Vector3()).x;
const shown = { idle: ['R_Bacamarte'], run: ['R_Bacamarte'], shoot: ['R_Bacamarte'], pistols: ['R_Pistol', 'L_Pistol'], victory: ['R_Bacamarte'] };
const weapons = ['R_Bacamarte', 'R_Pistol', 'L_Pistol', 'R_Peixeira'];
const clips = [];
for (const [name, clip] of rig.clips) {
  let minY = Infinity, maxRadius = 0;
  for (let i = 0; i <= 20; i++) {
    rig.animate(name, clip.duration * i / 20);
    for (const m of meshes) {
      m.skeleton.update();
      if (scale(m.skeleton.bones[m.geometry.attributes.skinIndex.getX(0)].name) < .01) continue;   // hidden weapon
      for (let j = 0; j < m.geometry.attributes.position.count; j += 11) {
        const v = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, j);
        m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
        assert([v.x, v.y, v.z].every(Number.isFinite)); minY = Math.min(minY, v.y); maxRadius = Math.max(maxRadius, v.length());
      }
    }
  }
  assert(maxRadius < rig.height * 1.6, `${name}: exploded geometry`);
  assert(minY > -.08, `${name}: below ground (${minY})`);
  if (shown[name]) { rig.animate(name, clip.duration / 2); for (const w of weapons) assert.equal(scale(w) > .5, shown[name].includes(w), `${name}: ${w} visibility`); }
  clips.push({ name, duration: clip.duration, minY, maxRadius });
}
for (const [name, d] of Object.entries(api.cangaceiroDurations)) assert(Math.abs(rig.clips.get(name).duration - d) < .011, `${name}: duration ${rig.clips.get(name).duration} != ${d}`);
const h = CANGACEIRO.peixeira.hit;
rig.animate('throw', h - .05); assert(scale('R_Peixeira') > .5, 'knife in hand before release');
rig.animate('throw', h + .05); assert(scale('R_Peixeira') < .01, 'knife released at the hit time');
rig.animate('apose'); assert(weapons.every(w => scale(w) < .01), 'reference pose without weapons');
rig.animate('shoot', CANGACEIRO.bacamarte.hit); const muzzle = rig.muzzle('Muzzle_Bacamarte'), chest = rig.model.getObjectByName('Chest2').getWorldPosition(new THREE.Vector3());
assert(muzzle.z > chest.z + .5 && muzzle.y > 1.2, 'bacamarte aimed forward at the shot time');
rig.animate('idle', 100); assert(rig.mixer.existingAction(rig.clips.get('idle')).time < rig.clips.get('idle').duration);
fs.writeFileSync(new URL('../Evidence/cangaceiro-checks.json', import.meta.url), JSON.stringify({ height: bounds.max.y, clips }, null, 2));
console.log('PASS: 9 meshes, 11 clips, height, forward feet, weights, ground, clip clocks, weapon visibility, knife release, aim and independent skeletons.');
