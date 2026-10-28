// Geometry/skin/clock checks for the Mula sem Cabeça. Texture decoding and the fire shader are stubbed;
// shot-mula checks real rendering in the browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../web/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { MULA, CINEMATIC } from '../web/src/config.js';
globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, { type }, init); } };
const required = ['idle','walk','gallop','kickWarn','kickHit','chargeWarn','chargeEnd','stompWarn','stompHit','basicWarn','basicHit','cast','stagger','recover','dormant','awaken','dead','apose'];
const bytes = fs.readFileSync(new URL('../web/assets/mula.glb', import.meta.url));
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
assert.equal(json.skins.length, 1);
assert.equal(json.meshes.length, 1);
assert(json.images.every(i => i.bufferView !== undefined), 'texture must be embedded');
for (const m of json.meshes) for (const pr of m.primitives)
  for (const a of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0','COLOR_0']) assert(pr.attributes[a] !== undefined, `${m.name}: missing ${a}`);
for (const name of required) assert(json.animations.some(a => a.name === name), `missing clip ${name}`);
assert(fs.existsSync(new URL('../web/assets/three-fire/Fire.png', import.meta.url)), 'THREE.Fire texture missing');

const data = 'data:model/gltf-binary;base64,' + bytes.toString('base64');
let code = fs.readFileSync(new URL('../web/src/mula-asset.js', import.meta.url), 'utf8');
code = code.replace("from 'three'", `from '${new URL('../web/node_modules/three/build/three.module.js', import.meta.url)}'`)
  .replaceAll("'three/examples/jsm/", `'${new URL('../web/node_modules/three/examples/jsm/', import.meta.url)}`)
  .replace(/import modelUrl from .*?;/, `const modelUrl=${JSON.stringify(data)};`)
  .replace(/import fireUrl from .*?;/, `const fireUrl='';`)
  .replace(/import \{ FireMesh \} from .*?;/, `class FireMesh extends THREE.Mesh { constructor(){super(new THREE.BoxGeometry(1,1,1),new THREE.ShaderMaterial({uniforms:{},fragmentShader:'return texture2D(fireTex, st); col.rgb *= color;'}));this.t=0;} update(t){this.t=t;this.updateMatrixWorld();} set fireColor(c){this.color=c;} }`)
  .replace('new THREE.TextureLoader().loadAsync(fireUrl)', 'Promise.resolve(new THREE.Texture())')
  .replace(/import \{ luniaMaterial, outlineFor \} from .*?;/, `const luniaMaterial=map=>new THREE.MeshBasicMaterial({map}); const outlineFor=()=>new THREE.Group();`);
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const loader = new GLTFLoader().register(() => ({ name: 'geometry-only', loadTexture() { return Promise.resolve(new THREE.Texture()); } }));
await api.loadMulaAsset(loader);
const rig = api.buildSkinnedMula(), second = api.buildSkinnedMula();
assert.notEqual(rig.model.getObjectByName('Hips'), second.model.getObjectByName('Hips'), 'skeletons must be independent');
const meshes = []; rig.model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
assert.equal(meshes.length, 1);
const P = n => rig.model.getObjectByName(n).getWorldPosition(new THREE.Vector3());

rig.animate('apose');
const bounds = new THREE.Box3().setFromObject(rig.model);
// The painted crown is folded into an ember at the neck; the boss's 3 m are reached by the volumetric fire.
const fireTop = rig.fire.position.y + rig.fire.scale.y / 2;
assert(bounds.max.y > 2.4 && bounds.max.y < 2.8, `wrong body height ${bounds.max.y}`);
const fireBottom = rig.fire.position.y - rig.fire.scale.y / 2;
assert(fireBottom < bounds.max.y, `fire base ${fireBottom} must start inside the neck ember (${bounds.max.y})`);
assert(fireTop > rig.height && fireTop < rig.height + 1.3, `fire box top ${fireTop} for a ${rig.height} m boss`);
// Front is +Z in glTF: the flame (head end) ahead of the hips, the animal's left (+X) on L_ bones.
assert(P('Flame').z > P('Hips').z + 1, 'the Mula must face +Z');
assert(P('L_FHoof').x > P('R_FHoof').x, 'L_ bones must be on +X');
for (const mesh of meshes) {
  const w = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < w.count; i++) {
    const v = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)];
    assert(v.filter(x => x > 1e-4).length <= 2, 'more than 2 influences'); assert(Math.abs(v.reduce((a, b) => a + b, 0) - 1) < .002);
  }
}
const clips = [];
for (const [name, clip] of rig.clips) {
  let minY = Infinity, maxRadius = 0;
  for (let i = 0; i <= 20; i++) {
    rig.animate(name, clip.duration * i / 20);
    for (const m of meshes) {
      m.skeleton.update();
      for (let j = 0; j < m.geometry.attributes.position.count; j += 11) {
        const v = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, j);
        m.applyBoneTransform(j, v); v.applyMatrix4(m.matrixWorld);
        assert([v.x, v.y, v.z].every(Number.isFinite)); minY = Math.min(minY, v.y); maxRadius = Math.max(maxRadius, Math.hypot(v.x, v.z));
      }
    }
  }
  assert(maxRadius < rig.height * 1.6, `${name}: exploded geometry`);
  assert(minY > -.08, `${name}: below the ground (${minY.toFixed(3)})`);
  clips.push({ name, duration: clip.duration, minY: +minY.toFixed(3), maxRadius: +maxRadius.toFixed(3) });
}
for (const [name, d] of Object.entries({ kickWarn: MULA.kick.warn, chargeWarn: MULA.charge.warn, stompWarn: MULA.stomp.warn, cast: 1.6,
  kickHit: .6, stompHit: .7, chargeEnd: .7, dead: 2.4, awaken: CINEMATIC.encounter.awaken, basicWarn: MULA.basic.windup, basicHit: MULA.basic.hit }))
  assert(Math.abs(rig.clips.get(name).duration - d) < .011, `${name}: duration ${rig.clips.get(name).duration} != ${d}`);
// Feet planted at the game's speeds: a hoof on the ground slides back (-Z) at the speed the root moves forward.
// In stance the hoof is flat, so its fetlock (the bone's head) sits at the rest height.
rig.animate('apose');
const restY = Object.fromEntries(['L_FHoof', 'R_FHoof', 'L_HHoof', 'R_HHoof'].map(h => [h, P(h).y]));
const slide = {};
for (const [name, speed] of [['walk', MULA.speed], ['gallop', MULA.charge.speed]]) {
  const d = rig.clips.get(name).duration, dt = d / 200, vs = [];
  for (const hoof of Object.keys(restY)) {
    for (let i = 0; i < 199; i++) {
      rig.animate(name, i * dt); const a = P(hoof);
      rig.animate(name, i * dt + dt); const b = P(hoof);
      if (a.y < restY[hoof] + .01 && b.y < restY[hoof] + .01) vs.push((b.z - a.z) / dt);
    }
  }
  const mean = vs.reduce((x, y) => x + y, 0) / vs.length;
  slide[name] = { samples: vs.length, meanGroundSpeed: +mean.toFixed(2), expected: -speed };
  assert(vs.length > 20, `${name}: no planted samples`);
  assert(Math.abs(mean + speed) < .25 * speed, `${name}: planted hooves slide at ${mean.toFixed(2)} m/s, expected ${-speed}`);
}
// Combat clocks: one-shots clamp, loops wrap.
rig.animate('kickWarn', .8); rig.animate('idle', 100);
rig.animate('stompWarn', 0); const fire0 = rig.fire.position.y;
rig.animate('stompWarn', MULA.stomp.warn * .7); const fireUp = rig.fire.position.y;
assert(fireUp > fire0 + .5, 'the fire must follow the Flame bone when rearing');
rig.setFlame(0, 0); for (let i = 0; i < 60; i++) rig.placeFire(1 / 30);
assert(!rig.fire.visible, 'flame scale 0 must hide the fire');
fs.writeFileSync(new URL('../Evidence/mula-checks.json', import.meta.url), JSON.stringify({ height: bounds.max.y, fireTop, clips, slide }, null, 2));
console.log(`PASS: ${rig.clips.size} clips, body ${bounds.max.y.toFixed(2)} m + fire to ${fireTop.toFixed(2)} m, faces +Z, <=2 influences, ground, combat durations, planted hooves (walk ${slide.walk.meanGroundSpeed} / gallop ${slide.gallop.meanGroundSpeed} m/s), fire on the Flame bone, independent skeletons.`);
