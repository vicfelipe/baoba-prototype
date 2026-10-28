import * as THREE from 'three';
import { toon, part, GEO, limbGeo } from './toon.js';
import { clothTexture } from './textures.js';
import { joint, keyed, makeFlashable } from './rig.js';

// Curupira com ~3 m: guardião esguio de membros longos, pele verde com grafismos, olhos amarelos,
// juba de fogo, saia de folhas, braceletes de madeira e corda, pés virados para trás.
// Construído em unidades humanas (pivô a 1 m) e escalado 1,62x.
// Todos os materiais são "corruptíveis": cinzentos até a onda de restauração da clareira.

const C = {
  skin: '#3f9a4c',
  skinLight: '#62b85a',
  mark: '#22663a',
  leaf: '#7cbf3a',
  leafDark: '#2f7d33',
  wood: '#7a4f2c',
  rope: '#d4ad68',
  eye: '#ffd43a',
};

const LINE = 0.012;

function lathe(profile, zScale = 1, segs = 24) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  g.scale(1, 1, zScale);
  g.computeVertexNormals();
  return g;
}

export function buildCurupira() {
  const root = new THREE.Group();
  const rig = { root, pyScale: 1.4 };
  const o = { corruptible: true };
  const skinTex = clothTexture(31, 0.2);
  const skin = toon(C.skin, { ...o, map: skinTex });
  const mark = toon(C.mark, o);
  const wood = toon(C.wood, o);
  const rope = toon(C.rope, o);

  const body = new THREE.Group();
  body.scale.setScalar(1.66);
  root.add(body);
  rig.body = body;

  rig.pivot = joint(body, 0, 1.0, 0);
  rig.hips = joint(rig.pivot, 0, -0.04, 0);
  rig.hips.add(part(lathe([[0.001, -0.1], [0.135, -0.08], [0.148, 0.0], [0.128, 0.07], [0.001, 0.08]], 0.75), skin, { line: LINE }));
  // Saia de folhas em duas camadas
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  leafGeo.scale(0.07, 0.24, 0.016);
  leafGeo.translate(0, -0.17, 0);
  for (let layer = 0; layer < 2; layer++) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = ((i + layer * 0.5) / n) * Math.PI * 2;
      const leaf = part(leafGeo, toon((i + layer) % 2 ? C.leaf : C.leafDark, o), { line: 0.005 });
      leaf.position.set(Math.sin(a) * 0.15, 0.06 - layer * 0.08, Math.cos(a) * 0.115);
      leaf.rotation.set(0, a, 0);
      leaf.rotateX(0.28 + layer * 0.1);
      leaf.scale.y = 1 - layer * 0.15;
      rig.hips.add(leaf);
    }
  }
  rig.hips.add(part(GEO.torus, rope, { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0], scale: [0.13, 0.1, 0.12], line: 0.005 }));

  rig.torso = joint(rig.hips, 0, 0.07, 0);
  // Tronco magro, costelas marcadas, ombros ossudos
  rig.torso.add(part(lathe([[0.001, 0.0], [0.13, 0.0], [0.122, 0.1], [0.145, 0.2], [0.185, 0.3], [0.205, 0.38], [0.16, 0.445], [0.06, 0.475], [0.001, 0.475]], 0.7), skin, { line: LINE }));
  for (const [x, y, r] of [[0.06, 0.3, 0.5], [-0.06, 0.3, -0.5], [0.05, 0.2, 0.3], [-0.05, 0.2, -0.3], [0, 0.1, 0]]) {
    rig.torso.add(part(GEO.sphere, mark, { pos: [x, y, 0.1], rot: [0, 0, r], scale: [0.012, 0.045, 0.01], line: 0 }));
  }
  rig.torso.add(part(GEO.cyl, skin, { pos: [0, 0.5, 0.01], scale: [0.04, 0.1, 0.04], line: LINE }));
  // Colar de sementes
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 2.2;
    rig.torso.add(part(GEO.sphere, toon(i % 2 ? '#c4462a' : '#e9d9a8', o), { pos: [Math.sin(a) * 0.08, 0.43 - Math.cos(a) * 0.04, 0.06 + Math.cos(a) * 0.03], scale: 0.014, line: 0 }));
  }

  rig.head = joint(rig.torso, 0, 0.52, 0.02);
  rig.head.add(part(GEO.sphere, skin, { pos: [0, 0.1, 0], scale: [0.1, 0.11, 0.105], line: LINE }));
  rig.head.add(part(GEO.sphere, skin, { pos: [0, 0.045, 0.035], scale: [0.06, 0.06, 0.07], line: 0 }));
  rig.head.add(part(GEO.cone, skin, { pos: [0, -0.005, 0.06], rot: [2.6, 0, 0], scale: [0.03, 0.05, 0.03], line: 0 }));
  for (const s of [-1, 1]) {
    // Orelhas longas e pontudas
    rig.head.add(part(GEO.cone, skin, { pos: [s * 0.1, 0.12, -0.01], rot: [0.2, 0, s * -1.2], scale: [0.025, 0.13, 0.012], line: 0.005 }));
    rig.head.add(part(GEO.sphere, toon(C.eye, { emissive: '#ffb000', emissiveIntensity: 0.8, ...o }), { pos: [s * 0.036, 0.105, 0.083], rot: [0, s * 0.3, s * 0.3], scale: [0.024, 0.013, 0.01], line: 0.004 }));
    rig.head.add(part(GEO.sphere, toon('#1a120c'), { pos: [s * 0.035, 0.105, 0.091], scale: [0.005, 0.012, 0.004], line: 0 }));
    rig.head.add(part(GEO.box, mark, { pos: [s * 0.04, 0.13, 0.085], rot: [0.2, s * 0.3, s * 0.4], scale: [0.045, 0.008, 0.008], line: 0 }));
    rig.head.add(part(GEO.sphere, mark, { pos: [s * 0.065, 0.06, 0.07], rot: [0, s * 0.6, s * 0.7], scale: [0.025, 0.006, 0.005], line: 0 }));
  }
  const smile = new THREE.TorusGeometry(0.03, 0.005, 6, 14, Math.PI);
  rig.head.add(part(smile, toon('#173018', o), { pos: [0, 0.05, 0.095], rot: [0.2, 0, Math.PI + 0.1], line: 0 }));

  // Juba de fogo: chamas sólidas para cima e para trás
  rig.flames = [];
  const flameGeo = new THREE.ConeGeometry(1, 1, 10);
  flameGeo.translate(0, 0.5, 0);
  const flameCols = ['#e8401c', '#ff7a1a', '#ffb42a', '#ffe070'];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const back = Math.cos(a) < 0.2;
    const r = 0.08 + Math.random() * 0.04;
    const h = (back ? 0.42 : 0.28) + Math.random() * 0.18;
    const ci = Math.min(3, Math.floor(Math.random() * 3) + (i % 4 === 0 ? 1 : 0));
    const m = part(flameGeo, toon(flameCols[ci], { emissive: flameCols[ci], emissiveIntensity: 0.9, ...o }), {
      pos: [Math.sin(a) * 0.06, 0.17, -0.02 + Math.cos(a) * 0.05],
      rot: [-0.7 + Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.6],
      scale: [r, h, r * 0.7], line: 0.006, lineColor: '#5a1408',
    });
    m.userData.base = h;
    rig.flames.push(m);
    rig.head.add(m);
  }

  const upper = limbGeo(0.054, 0.32, 0.044);
  const fore = limbGeo(0.047, 0.3, 0.034);
  const finger = limbGeo(0.013, 0.1, 0.006);
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const arm = joint(rig.torso, s * 0.205, 0.4, 0);
    arm.add(part(GEO.sphere, skin, { pos: [0, -0.01, 0], scale: 0.07, line: LINE }));
    arm.add(part(upper, skin, { line: LINE }));
    const fa = joint(arm, 0, -0.32, 0);
    fa.add(part(fore, skin, { line: LINE }));
    fa.add(part(GEO.torus, wood, { pos: [0, -0.2, 0], rot: [Math.PI / 2, 0, 0], scale: [0.05, 0.05, 0.08], line: 0.005 }));
    fa.add(part(GEO.torus, rope, { pos: [0, -0.24, 0], rot: [Math.PI / 2, 0, 0], scale: [0.042, 0.042, 0.05], line: 0 }));
    fa.add(part(GEO.sphere, skin, { pos: [0, -0.33, 0], scale: [0.045, 0.06, 0.034], line: LINE }));
    for (let f = -1; f <= 1; f++) fa.add(part(finger, skin, { pos: [f * 0.022, -0.37, 0.01], rot: [-0.15, 0, f * 0.14], line: 0.004 }));
    rig['arm' + side] = arm;
    rig['fore' + side] = fa;
  }
  // Chicote de cipó na mão direita (aparece na varredura)
  const vineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, -0.3, 0.08), new THREE.Vector3(-0.04, -0.65, 0.04), new THREE.Vector3(0.03, -1.0, 0.1), new THREE.Vector3(0, -1.35, 0.04),
  ]);
  rig.vine = part(new THREE.TubeGeometry(vineCurve, 24, 0.026, 6), toon('#4f8a2a', o), { pos: [0, -0.33, 0], line: 0.006 });
  rig.vine.scale.set(1, 0.01, 1);
  rig.foreR.add(rig.vine);

  const thigh = limbGeo(0.078, 0.43, 0.056);
  const shin = limbGeo(0.056, 0.43, 0.036);
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const leg = joint(rig.hips, s * 0.085, -0.03, 0);
    leg.add(part(thigh, skin, { line: LINE }));
    const sh = joint(leg, 0, -0.44, 0);
    sh.add(part(shin, skin, { line: LINE }));
    sh.add(part(GEO.torus, wood, { pos: [0, -0.33, 0], rot: [Math.PI / 2, 0, 0], scale: [0.046, 0.046, 0.07], line: 0.004 }));
    // Pé virado para trás: calcanhar à frente, dedos para trás
    sh.add(part(GEO.sphere, skin, { pos: [0, -0.44, -0.05], scale: [0.052, 0.034, 0.13], line: LINE }));
    for (let f = -1; f <= 1; f++) sh.add(part(GEO.sphere, skin, { pos: [f * 0.026, -0.45, -0.17], scale: [0.017, 0.016, 0.03], line: 0.003 }));
    rig['leg' + side] = leg;
    rig['shin' + side] = sh;
  }

  root.traverse((m) => { if (m.isMesh && !m.userData.isOutline) { m.castShadow = true; m.receiveShadow = false; } });
  rig.flash = makeFlashable(root);
  return rig;
}

export function animateFlames(rig, t, intensity = 1) {
  rig.flames.forEach((f, i) => {
    const s = 1 + Math.sin(t * 9 + i * 1.7) * 0.12 * intensity + Math.sin(t * 15 + i) * 0.06 * intensity;
    f.scale.y = f.userData.base * s;
  });
}

const P = Math.PI;

export function curupiraPose(state, t, p) {
  switch (state) {
    case 'idle':
    case 'recover': {
      const tired = state === 'recover';
      const b = Math.sin(t * (tired ? 2.5 : 3.5));
      return {
        pivot: [0, 0, b * 0.04], py: b * 0.03 - (tired ? 0.05 : 0),
        torso: [tired ? 0.45 : 0.12, b * 0.1, 0], head: [tired ? 0.15 : -0.05, -b * 0.15, b * 0.05],
        armL: [tired ? -0.2 : -0.3, 0, 0.5 + b * 0.1], foreL: [-0.6, 0, 0],
        armR: [tired ? -0.2 : -0.3, 0, -0.5 - b * 0.1], foreR: [-0.6, 0, 0],
        legL: [-0.15, 0, 0.12], shinL: [0.35, 0, 0], legR: [-0.15, 0, -0.12], shinR: [0.35, 0, 0],
      };
    }
    case 'walk': {
      const s = Math.sin(t * 7);
      const c = Math.cos(t * 7);
      return {
        pivot: [0, 0, s * 0.05], py: Math.abs(c) * 0.05,
        torso: [0.2, s * 0.1, 0], head: [-0.1, 0, 0],
        legL: [s * 0.7, 0, 0.05], shinL: [Math.max(0, -c) * 0.9 + 0.2, 0, 0],
        legR: [-s * 0.7, 0, -0.05], shinR: [Math.max(0, c) * 0.9 + 0.2, 0, 0],
        armL: [-s * 0.6, 0, 0.5], foreL: [-0.6, 0, 0], armR: [s * 0.6, 0, -0.5], foreR: [-0.6, 0, 0],
      };
    }
    case 'sweepWarn': { // Prepara o cipó: torção e braço para trás
      const sh = Math.sin(t * 30) * 0.03 * p;
      return {
        pivot: [0, -0.5 * Math.min(1, p * 2), sh], py: -0.06,
        torso: [0.1, -0.5, 0.1], head: [0, 0.4, 0],
        armR: [0.4, 0, -1.9], foreR: [-0.4, 0, 0], armL: [-0.8, 0, 0.6], foreL: [-1, 0, 0],
        legL: [-0.5, 0, 0.2], shinL: [0.6, 0, 0], legR: [0.3, 0, -0.2], shinR: [0.3, 0, 0],
      };
    }
    case 'sweepHit':
      return keyed([
        { t: 0, pose: { pivot: [0, -0.5, 0], torso: [0.1, -0.5, 0.1], armR: [0.4, 0, -1.9], foreR: [-0.4, 0, 0], armL: [-0.8, 0, 0.6], legL: [-0.5, 0, 0.2], shinL: [0.6, 0, 0], legR: [0.3, 0, -0.2] } },
        { t: 0.35, pose: { pivot: [0, 0.8, 0], torso: [0.3, 0.6, -0.1], armR: [-1.4, 0, -0.4], foreR: [0, 0, 0], armL: [0.2, 0, 0.8], legL: [-0.3, 0, 0.2], shinL: [0.4, 0, 0], legR: [0.4, 0, -0.2] } },
        { t: 1, pose: { pivot: [0, 0.4, 0], torso: [0.35, 0.3, 0], armR: [-0.8, 0, -0.5], foreR: [-0.3, 0, 0], armL: [-0.2, 0, 0.6], legL: [-0.2, 0, 0.1], legR: [0.1, 0, -0.1] } },
      ], p);
    case 'rootsWarn': { // Braços erguidos chamando raízes
      const b = Math.sin(t * 6);
      return {
        pivot: [0, 0, 0], py: 0.05 + b * 0.02,
        torso: [-0.15, 0, 0], head: [-0.3, 0, 0],
        armL: [-2.6, 0, 0.4 + b * 0.1], foreL: [-0.3, 0, 0], armR: [-2.6, 0, -0.4 - b * 0.1], foreR: [-0.3, 0, 0],
        legL: [0, 0, 0.25], shinL: [0.2, 0, 0], legR: [0, 0, -0.25], shinR: [0.2, 0, 0],
      };
    }
    case 'rootsHit':
      return {
        pivot: [0, 0, 0], py: -0.18,
        torso: [0.7, 0, 0], head: [0.2, 0, 0],
        armL: [-1.2, 0, 0.2], foreL: [0, 0, 0], armR: [-1.2, 0, -0.2], foreR: [0, 0, 0],
        legL: [-0.6, 0, 0.3], shinL: [1.0, 0, 0], legR: [-0.6, 0, -0.3], shinR: [1.0, 0, 0],
      };
    case 'cast': { // Chamado do Silêncio: levita, braços abertos
      const b = Math.sin(t * 4);
      return {
        pivot: [0, 0, 0], py: 0.18 + b * 0.04,
        torso: [-0.2, 0, 0], head: [-0.35, 0, 0],
        armL: [-0.3, 0, 1.5 + b * 0.1], foreL: [0, 0, 0.4], armR: [-0.3, 0, -1.5 - b * 0.1], foreR: [0, 0, -0.4],
        legL: [0.3, 0, 0.1], shinL: [0.8, 0, 0], legR: [0.1, 0, -0.1], shinR: [1.0, 0, 0],
      };
    }
    case 'stagger': { // Interrompido: tonto, recua
      const w = Math.sin(t * 8);
      return {
        pivot: [-0.25, 0, w * 0.15], py: -0.08,
        torso: [-0.3, w * 0.2, 0], head: [0.1, w * 0.4, w * 0.2],
        armL: [0.2, 0, 1.1], foreL: [-0.8, 0, 0], armR: [0.2, 0, -1.1], foreR: [-0.8, 0, 0],
        legL: [0.2, 0, 0.2], shinL: [0.3, 0, 0], legR: [-0.4, 0, -0.2], shinR: [0.6, 0, 0],
      };
    }
    case 'freed': { // Libertado: sentado de pernas cruzadas, alegre
      const b = Math.sin(t * 3);
      return {
        pivot: [0, 0, 0], py: -0.48 + Math.abs(b) * 0.02,
        torso: [-0.05, b * 0.1, 0], head: [-0.15, b * 0.2, b * 0.08],
        armL: [-0.4, 0, 0.3], foreL: [-1.1, 0, 0], armR: [-0.4, 0, -0.3], foreR: [-1.1, 0, 0],
        legL: [-1.5, 0.6, 0.6], shinL: [2.2, 0, 0], legR: [-1.5, -0.6, -0.6], shinR: [2.2, 0, 0],
      };
    }
    default:
      return {};
  }
}

export { P as PI };
