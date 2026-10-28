// Geometry/skin/clock/prop checks for the Maloka GLB. Texture decoding is stubbed;
// shot-maloka checks real rendering and the kit in the browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { MALOKA } from '../web/src/config.js';
globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
const required = ['idle','run','slash','throw','smoke','dodge','jump','hit','dead','victory','apose'];
const bytes = fs.readFileSync(new URL('../web/assets/maloka.glb', import.meta.url));
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
assert.equal(json.skins.length, 1);
assert.equal(json.meshes.length, 7, 'five body slots + razor + flask');
assert(json.images.every(i => i.bufferView !== undefined), 'textures embedded');
for (const m of json.meshes) for (const pr of m.primitives)
  for (const a of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0','COLOR_0']) assert(pr.attributes[a] !== undefined, `${m.name}: missing ${a}`);
for (const name of required) assert(json.animations.some(a => a.name === name), `missing ${name}`);
assert(!json.animations.some(a => a.name === 'PoseTest'), 'inspection clip left in the GLB');
const data = 'data:model/gltf-binary;base64,' + bytes.toString('base64');
let code = fs.readFileSync(new URL('../web/src/maloka-asset.js', import.meta.url), 'utf8');
code = code.replace("from 'three'", `from '${new URL('../web/node_modules/three/build/three.module.js', import.meta.url)}'`)
  .replaceAll("'three/examples/jsm/", `'${new URL('../web/node_modules/three/examples/jsm/', import.meta.url)}`)
  .replace(/import modelUrl from .*?;/, `const modelUrl=${JSON.stringify(data)};`)
  .replace(/import \{ luniaMaterial, outlineFor \} from .*?;/, `const luniaMaterial=map=>new THREE.MeshStandardMaterial({map}); const outlineFor=()=>new THREE.Group();`)
  .replace(/import \{ MALOKA \} from .*?;/, `const MALOKA=${JSON.stringify(MALOKA)};`);
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const loader = new GLTFLoader().register(() => ({ name: 'geometry-only', loadTexture() { return Promise.resolve(new THREE.Texture()); } }));
await api.loadMalokaAsset(loader);
const rig = api.buildSkinnedMaloka(), second = api.buildSkinnedMaloka();
assert.notEqual(rig.model.getObjectByName('Head'), second.model.getObjectByName('Head'), 'independent skeletons');
const meshes = []; rig.model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
const scale = name => rig.model.getObjectByName(name).getWorldScale(new THREE.Vector3()).x;
const props = ['Navalha', 'Frasco'];
rig.animate('apose'); const bounds = new THREE.Box3();
meshes.filter(m => !/Navalha|Frasco/.test(m.name)).forEach(m => bounds.expandByObject(m));
assert(Math.abs(bounds.max.y - rig.height) < .045, `wrong height ${bounds.max.y}`);
assert(props.every(p => scale(p) < .01), 'reference pose without props');
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
const clips = [];
for (const [name, clip] of rig.clips) {
  let minY = Infinity, maxRadius = 0;
  for (let i = 0; i <= 20; i++) {
    rig.animate(name, clip.duration * i / 20);
    for (const m of meshes) {
      m.skeleton.update();
      if (scale(m.skeleton.bones[m.geometry.attributes.skinIndex.getX(0)].name) < .01) continue;   // hidden prop
      for (let j = 0; j < m.geometry.attributes.position.count; j += 11) {
        const v = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, j);
        m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
        assert([v.x, v.y, v.z].every(Number.isFinite)); minY = Math.min(minY, v.y); maxRadius = Math.max(maxRadius, v.length());
      }
    }
  }
  assert(maxRadius < rig.height * 1.6, `${name}: exploded geometry`);
  assert(minY > -.08, `${name}: below ground (${minY})`);
  clips.push({ name, duration: clip.duration, minY, maxRadius });
}
for (const [name, d] of Object.entries(api.malokaDurations)) assert(Math.abs(rig.clips.get(name).duration - d) < .011, `${name}: duration ${rig.clips.get(name).duration} != ${d}`);
// Props: the razor is in the hand except during the throw; the flask leaves the hand at the release.
const h = MALOKA.veneno.hit;
rig.animate('throw', h - .05); assert(scale('Frasco') > .5 && scale('Navalha') < .01, 'flask (not razor) in hand before the throw');
rig.animate('throw', h + .05); assert(scale('Frasco') < .01, 'flask leaves the hand at the throw');
for (const c of ['idle', 'run', 'slash', 'smoke', 'dodge', 'victory']) {
  rig.animate(c, rig.clips.get(c).duration / 2);
  assert(scale('Navalha') > .5 && scale('Frasco') < .01, `${c}: razor shown, flask hidden`);
}
// The razor sits in the closed right fist.
rig.animate('slash', MALOKA.navalha.hit);
const grip = rig.model.getObjectByName('Navalha').getWorldPosition(new THREE.Vector3());
const fist = rig.model.getObjectByName('R_Hand').getWorldPosition(new THREE.Vector3());
assert(grip.distanceTo(fist) < .12, `razor in the fist (${grip.distanceTo(fist).toFixed(3)})`);
// Stealth veil: translucent and back.
rig.stealth(1); assert(rig.model.getObjectByName('Maloka_Body_000').material.opacity < .5, 'stealth veil');
rig.stealth(0); assert(rig.model.getObjectByName('Maloka_Body_000').material.opacity === 1, 'stealth off');
rig.animate('idle', 100); assert(rig.mixer.existingAction(rig.clips.get('idle')).time < rig.clips.get('idle').duration);
fs.writeFileSync(new URL('../Evidence/maloka-checks.json', import.meta.url), JSON.stringify({ height: bounds.max.y, clips }, null, 2));
console.log('PASS: 7 meshes, 11 clips, height, forward feet, weights, ground, clip clocks, razor in the fist, flask release, hidden props, stealth veil and independent skeletons.');
