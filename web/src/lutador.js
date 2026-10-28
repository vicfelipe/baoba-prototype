import * as THREE from 'three';
import { toon, part, GEO, limbGeo } from './toon.js';
import { clothTexture } from './textures.js';
import { joint, keyed, makeFlashable } from './rig.js';
import { buildSkinnedCapoeirista } from './capoeirista-asset.js';

// Lutador em proporção anime adulta (~7 cabeças, 1,80 m), na linha dos personagens do Lunia:
// pele escura, camiseta clara, bermuda cinza até o joelho, tranças nagô continuando em locs
// presos, pés descalços, corda de capoeira e faixas nos punhos.

const C = {
  skin: '#5a3420',
  skinDark: '#3f2315',
  shirt: '#efe7d6',
  shirtShade: '#d9cdb5',
  shorts: '#7f858f',
  hair: '#16100b',
  braid: '#251911',
  cord: '#e3b73a',
  wrap: '#e8dfc8',
  lips: '#4a1e16',
};

const LINE = 0.013;

export function lathe(profile, zScale = 1, segs = 28) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  g.scale(1, 1, zScale);
  g.computeVertexNormals();
  return g;
}

// O herói jogável é o Capoeirista do pipeline Lunia (docs 18); o modelo anterior segue em
// lutador-asset.js / assets/lutador.glb, fora da build.
export function buildLutador() {
  return buildSkinnedCapoeirista();
}

export function buildLegacyLutador() {
  const root = new THREE.Group();
  const rig = { root, pyScale: 1.4 };
  const cloth = clothTexture(7, 0.12);
  const skinTex = clothTexture(19, 0.08);
  const skin = toon(C.skin, { map: skinTex });
  const shirt = toon(C.shirt, { map: cloth });
  const shorts = toon(C.shorts, { map: cloth });
  const hair = toon(C.hair);
  const cord = toon(C.cord);

  rig.pivot = joint(root, 0, 1.0, 0);
  rig.hips = joint(rig.pivot, 0, -0.04, 0);
  // Quadril / bermuda
  rig.hips.add(part(lathe([[0.001, -0.12], [0.14, -0.11], [0.165, -0.05], [0.158, 0.02], [0.135, 0.09], [0.001, 0.1]], 0.74), shorts, { line: LINE }));
  // Corda de capoeira com nó e pontas
  rig.hips.add(part(GEO.torus, cord, { pos: [0, 0.075, 0], rot: [Math.PI / 2, 0, 0], scale: [0.15, 0.112, 0.18], line: 0.008 }));
  rig.hips.add(part(GEO.sphere, cord, { pos: [0.1, 0.065, 0.09], scale: 0.028, line: 0.006 }));
  const tail = limbGeo(0.014, 0.2, 0.012);
  for (const [x, rz] of [[0.105, 0.12], [0.09, -0.05]]) {
    rig.hips.add(part(tail, cord, { pos: [x, 0.06, 0.095], rot: [0.1, 0, rz], line: 0.006 }));
  }

  rig.torso = joint(rig.hips, 0, 0.08, 0);
  // Tronco em V com camiseta
  rig.torso.add(part(lathe([[0.001, 0.0], [0.15, 0.0], [0.142, 0.08], [0.138, 0.16], [0.17, 0.26], [0.205, 0.35], [0.215, 0.41], [0.17, 0.465], [0.07, 0.5], [0.001, 0.5]], 0.66), shirt, { line: LINE }));
  rig.torso.add(part(GEO.torus, toon(C.shirtShade), { pos: [0, 0.495, 0.005], rot: [Math.PI / 2 + 0.2, 0, 0], scale: [0.065, 0.05, 0.05], line: 0 }));
  rig.torso.add(part(GEO.cyl, skin, { pos: [0, 0.53, 0.005], scale: [0.048, 0.1, 0.045], line: LINE }));

  // Cabeça pequena e rosto anguloso
  rig.head = joint(rig.torso, 0, 0.55, 0.01);
  rig.head.add(part(GEO.sphere, skin, { pos: [0, 0.12, 0], scale: [0.1, 0.118, 0.108], line: LINE }));
  rig.head.add(part(GEO.sphere, skin, { pos: [0, 0.065, 0.03], scale: [0.078, 0.07, 0.085], line: 0 }));
  for (const s of [-1, 1]) {
    rig.head.add(part(GEO.sphere, skin, { pos: [s * 0.098, 0.115, -0.005], scale: [0.018, 0.03, 0.02], line: 0.005 }));
    rig.head.add(part(GEO.sphere, toon('#f4efe6'), { pos: [s * 0.037, 0.125, 0.093], rot: [0, s * 0.35, 0], scale: [0.022, 0.012, 0.01], line: 0 }));
    rig.head.add(part(GEO.sphere, toon('#24140c'), { pos: [s * 0.036, 0.125, 0.1], rot: [0, s * 0.35, 0], scale: [0.011, 0.012, 0.006], line: 0 }));
    rig.head.add(part(GEO.box, hair, { pos: [s * 0.04, 0.148, 0.098], rot: [0.15, s * 0.3, s * -0.18], scale: [0.04, 0.008, 0.008], line: 0 }));
  }
  rig.head.add(part(GEO.sphere, toon(C.skinDark), { pos: [0, 0.098, 0.108], scale: [0.016, 0.014, 0.014], line: 0 }));
  rig.head.add(part(GEO.sphere, toon(C.lips), { pos: [0, 0.062, 0.103], scale: [0.024, 0.006, 0.008], line: 0 }));

  // Tranças nagô da testa à nuca, coque alto e locs caindo nas costas
  const cap = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
  rig.head.add(part(cap, hair, { pos: [0, 0.128, -0.006], rot: [-0.5, 0, 0], scale: [0.106, 0.122, 0.114], line: 0.008 }));
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.026;
    const r = Math.sqrt(Math.max(0.0005, 0.118 * 0.118 - x * x));
    const braid = new THREE.TorusGeometry(r, 0.011, 6, 22, 2.6);
    rig.head.add(part(braid, toon(C.braid), { pos: [x, 0.13, -0.008], rot: [0, Math.PI / 2, -0.25], line: 0 }));
  }
  rig.head.add(part(GEO.sphere, hair, { pos: [0, 0.2, -0.11], scale: [0.055, 0.048, 0.05], line: 0.008 }));
  rig.head.add(part(GEO.torus, toon('#b4452a'), { pos: [0, 0.19, -0.135], rot: [0.5, 0, 0], scale: [0.03, 0.03, 0.05], line: 0 }));
  const loc = limbGeo(0.014, 0.3, 0.01);
  rig.locs = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 1.3;
    const l = part(loc, hair, { pos: [Math.sin(a) * 0.035, 0.2, -0.14 - Math.cos(a) * 0.01], rot: [0.35, 0, a * 0.5], line: 0.005 });
    l.userData.base = 0.35 + (i % 3) * 0.06;
    rig.head.add(l);
    rig.locs.push(l);
  }

  // Braços
  const sleeve = limbGeo(0.07, 0.13, 0.064);
  const upper = limbGeo(0.056, 0.28, 0.046);
  const fore = limbGeo(0.05, 0.25, 0.036);
  const hand = new THREE.SphereGeometry(1, 14, 10);
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const arm = joint(rig.torso, s * 0.218, 0.42, 0);
    arm.add(part(GEO.sphere, shirt, { pos: [0, -0.01, 0], scale: [0.078, 0.08, 0.074], line: LINE }));
    arm.add(part(sleeve, shirt, { pos: [0, -0.01, 0], line: LINE }));
    arm.add(part(upper, skin, { line: LINE }));
    const fa = joint(arm, 0, -0.28, 0);
    fa.add(part(fore, skin, { line: LINE }));
    fa.add(part(GEO.cyl, toon(C.wrap, { map: cloth }), { pos: [0, -0.21, 0], scale: [0.042, 0.075, 0.042], line: 0.006 }));
    fa.add(part(hand, skin, { pos: [0, -0.295, 0.005], scale: [0.042, 0.06, 0.036], line: LINE }));
    fa.add(part(hand, skin, { pos: [s * -0.026, -0.27, 0.02], rot: [0, 0, s * 0.5], scale: [0.012, 0.03, 0.012], line: 0.005 }));
    rig['arm' + side] = arm;
    rig['fore' + side] = fa;
  }

  // Pernas: bermuda até o joelho, canela e pé descalço
  const thigh = limbGeo(0.088, 0.42, 0.076);
  const shin = limbGeo(0.058, 0.42, 0.038);
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const leg = joint(rig.hips, s * 0.088, -0.04, 0);
    leg.add(part(thigh, shorts, { line: LINE }));
    const sh = joint(leg, 0, -0.43, 0);
    sh.add(part(shin, skin, { line: LINE }));
    sh.add(part(GEO.sphere, skin, { pos: [0, -0.12, -0.012], scale: [0.054, 0.1, 0.05], line: 0 }));
    sh.add(part(hand, skin, { pos: [0, -0.442, 0.045], scale: [0.05, 0.034, 0.115], line: LINE }));
    rig['leg' + side] = leg;
    rig['shin' + side] = sh;
  }

  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  rig.flash = makeFlashable(root);
  return rig;
}

// ---------- Animações ----------
const P = Math.PI;

export function lutadorPose(state, t, p, extra = {}) {
  switch (state) {
    case 'idle': {
      // Ginga: troca de base com braço protegendo o rosto
      const g = Math.sin(t * 3.2);
      const back = g > 0 ? 1 : -1;
      const a = Math.abs(g);
      return {
        pivot: [0, g * 0.25, 0], py: -0.08 - a * 0.06, px: g * 0.12,
        hips: [0, 0, 0],
        torso: [0.15 + a * 0.1, g * 0.15, g * -0.05],
        head: [-0.1, -g * 0.15, 0],
        legL: [back > 0 ? 0.7 * a - 0.15 : -0.35, 0, 0.12], shinL: [back > 0 ? 0.5 * a : 0.4, 0, 0],
        legR: [back < 0 ? 0.7 * a - 0.15 : -0.35, 0, -0.12], shinR: [back < 0 ? 0.5 * a : 0.4, 0, 0],
        armL: [-0.6 - (back > 0 ? 0.6 * a : 0), 0, 0.3], foreL: [-1.3, 0, 0],
        armR: [-0.6 - (back < 0 ? 0.6 * a : 0), 0, -0.3], foreR: [-1.3, 0, 0],
      };
    }
    case 'run': {
      const s = Math.sin(t * 13);
      const c = Math.cos(t * 13);
      return {
        pivot: [0, 0, 0], py: Math.abs(c) * 0.08 - 0.02,
        torso: [0.25, s * 0.15, 0], head: [-0.15, -s * 0.1, 0],
        legL: [s * 0.9, 0, 0.05], shinL: [Math.max(0, -c) * 1.2 + 0.2, 0, 0],
        legR: [-s * 0.9, 0, -0.05], shinR: [Math.max(0, c) * 1.2 + 0.2, 0, 0],
        armL: [-s * 0.9, 0, 0.2], foreL: [-0.9, 0, 0],
        armR: [s * 0.9, 0, -0.2], foreR: [-0.9, 0, 0],
      };
    }
    case 'combo0': // Martelo: chute circular de perna direita
      return keyed([
        { t: 0, pose: { pivot: [0, 0, 0], torso: [0.1, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0], armL: [-0.8, 0, 0.3], foreL: [-1.4, 0, 0], armR: [0.3, 0, -0.5], foreR: [-0.4, 0, 0] } },
        { t: 0.3, pose: { pivot: [0, 0.6, 0], torso: [0, 0.4, 0.3], legR: [-1.2, 0, -0.5], shinR: [1.8, 0, 0], legL: [0.1, 0, 0], armL: [-1, 0, 0.6], foreL: [-1.4, 0, 0], armR: [0.4, 0, -1], foreR: [-0.3, 0, 0] } },
        { t: 0.45, pose: { pivot: [0, -0.5, 0], torso: [0, -0.3, 0.45], legR: [-1.5, 0, -1.1], shinR: [0.1, 0, 0], legL: [0.15, 0, 0], armL: [-1, 0, 0.6], foreL: [-1.4, 0, 0], armR: [0.4, 0, -1.2], foreR: [-0.3, 0, 0] } },
        { t: 1, pose: { pivot: [0, 0, 0], torso: [0.15, 0, 0], legR: [-0.2, 0, 0], shinR: [0.4, 0, 0], armL: [-0.8, 0, 0.3], foreL: [-1.3, 0, 0], armR: [-0.6, 0, -0.3], foreR: [-1.3, 0, 0] } },
      ], p);
    case 'combo1': // Galopante: tapa de mão aberta com giro de quadril
      return keyed([
        { t: 0, pose: { pivot: [0, 0.4, 0], torso: [0.1, 0.5, 0], armL: [-0.8, 0, 0.3], foreL: [-1.3, 0, 0], armR: [-0.3, 0, -1.6], foreR: [-0.6, 0, 0], legL: [-0.4, 0, 0], shinL: [0.4, 0, 0], legR: [0.4, 0, 0], shinR: [0.3, 0, 0] } },
        { t: 0.4, pose: { pivot: [0, -0.5, 0], torso: [0.25, -0.6, 0], armR: [-1.5, 0, -0.2], foreR: [-0.1, 0, 0], armL: [-0.3, 0, 0.6], foreL: [-1, 0, 0], legL: [-0.6, 0, 0], shinL: [0.6, 0, 0], legR: [0.5, 0, 0], shinR: [0.3, 0, 0], py: -0.08 } },
        { t: 1, pose: { pivot: [0, 0, 0], torso: [0.15, 0, 0], armR: [-0.6, 0, -0.3], foreR: [-1.3, 0, 0], armL: [-0.8, 0, 0.3], foreL: [-1.3, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0] } },
      ], p);
    case 'combo2': { // Armada: giro completo com perna estendida
      const spin = p < 0.25 ? 0 : p > 0.8 ? -2 * P : -2 * P * ((p - 0.25) / 0.55);
      const k = keyed([
        { t: 0, pose: { torso: [0.1, 0.3, 0], legR: [0, 0, 0], shinR: [0.3, 0, 0], armL: [-0.5, 0, 1.2], armR: [-0.5, 0, -1.2], foreL: [-0.4, 0, 0], foreR: [-0.4, 0, 0], py: -0.15 } },
        { t: 0.35, pose: { torso: [-0.1, 0, 0.2], legR: [-0.4, 0, -1.4], shinR: [0, 0, 0], armL: [0, 0, 1.4], armR: [0, 0, -1.4], foreL: [0, 0, 0], foreR: [0, 0, 0], py: 0.12 } },
        { t: 0.75, pose: { torso: [-0.1, 0, 0.2], legR: [-0.4, 0, -1.4], shinR: [0, 0, 0], armL: [0, 0, 1.4], armR: [0, 0, -1.4], foreL: [0, 0, 0], foreR: [0, 0, 0], py: 0.12 } },
        { t: 1, pose: { torso: [0.15, 0, 0], legR: [0, 0, 0], shinR: [0.3, 0, 0], armL: [-0.8, 0, 0.3], armR: [-0.6, 0, -0.3], foreL: [-1.3, 0, 0], foreR: [-1.3, 0, 0], py: 0 } },
      ], p);
      k.pivot = [0, spin, 0];
      return k;
    }
    case 'rasteira': { // Agachado, varre o chão com a perna em giro
      const spin = p < 0.2 ? 0 : p > 0.75 ? -2 * P : -2 * P * ((p - 0.2) / 0.55);
      const k = keyed([
        { t: 0, pose: { py: -0.15, torso: [0.4, 0, 0], legL: [-1.2, 0, 0.2], shinL: [2.2, 0, 0], legR: [-0.3, 0, 0], shinR: [0.6, 0, 0], armL: [-0.6, 0, 0.6], armR: [-0.6, 0, -0.6], foreL: [-0.6, 0, 0], foreR: [-0.6, 0, 0] } },
        { t: 0.25, pose: { py: -0.45, torso: [0.8, 0, -0.3], legL: [-1.6, 0, 0.4], shinL: [2.4, 0, 0], legR: [-0.2, 0, -1.45], shinR: [0, 0, 0], armL: [-1.2, 0, 0.3], armR: [-1.4, 0, -0.2], foreL: [0, 0, 0], foreR: [0, 0, 0] } },
        { t: 0.75, pose: { py: -0.45, torso: [0.8, 0, -0.3], legL: [-1.6, 0, 0.4], shinL: [2.4, 0, 0], legR: [-0.2, 0, -1.45], shinR: [0, 0, 0], armL: [-1.2, 0, 0.3], armR: [-1.4, 0, -0.2], foreL: [0, 0, 0], foreR: [0, 0, 0] } },
        { t: 1, pose: { py: -0.1, torso: [0.2, 0, 0], legL: [-0.2, 0, 0], shinL: [0.4, 0, 0], legR: [0, 0, 0], shinR: [0.3, 0, 0], armL: [-0.8, 0, 0.3], armR: [-0.6, 0, -0.3], foreL: [-1.3, 0, 0], foreR: [-1.3, 0, 0] } },
      ], p);
      k.pivot = [0, spin, 0];
      return k;
    }
    case 'meialua': { // Meia-lua de compasso: mãos ao chão, perna traça o arco
      const spin = p < 0.3 ? 0 : p > 0.85 ? 2 * P : 2 * P * ((p - 0.3) / 0.55);
      const k = keyed([
        { t: 0, pose: { py: -0.1, torso: [0.3, 0, 0], armL: [-0.5, 0, 0.4], armR: [-0.5, 0, -0.4], legL: [0, 0, 0], legR: [0, 0, 0] } },
        { t: 0.3, pose: { py: -0.35, torso: [1.3, 0, 0], head: [-0.8, 0, 0], armL: [-1.9, 0, 0.2], foreL: [0, 0, 0], armR: [-1.9, 0, -0.2], foreR: [0, 0, 0], legL: [-0.6, 0, 0.3], shinL: [1.2, 0, 0], legR: [0.6, 0, -0.3], shinR: [0, 0, 0] } },
        { t: 0.55, pose: { py: -0.3, torso: [1.3, 0, 0.2], head: [-0.8, 0, 0], armL: [-1.9, 0, 0.2], foreL: [0, 0, 0], armR: [-1.9, 0, -0.2], foreR: [0, 0, 0], legL: [-0.6, 0, 0.3], shinL: [1.2, 0, 0], legR: [1.6, 0, -1.2], shinR: [0, 0, 0] } },
        { t: 0.85, pose: { py: -0.3, torso: [1.2, 0, 0.2], head: [-0.8, 0, 0], armL: [-1.9, 0, 0.2], foreL: [0, 0, 0], armR: [-1.9, 0, -0.2], foreR: [0, 0, 0], legL: [-0.6, 0, 0.3], shinL: [1.2, 0, 0], legR: [1.4, 0, -1.3], shinR: [0, 0, 0] } },
        { t: 1, pose: { py: 0, torso: [0.15, 0, 0], head: [0, 0, 0], armL: [-0.8, 0, 0.3], foreL: [-1.3, 0, 0], armR: [-0.6, 0, -0.3], foreR: [-1.3, 0, 0], legL: [0, 0, 0], shinL: [0.3, 0, 0], legR: [0, 0, 0], shinR: [0.3, 0, 0] } },
      ], p);
      k.pivot = [0, spin, 0];
      return k;
    }
    case 'dodge': { // Rolê: rolamento para frente
      const roll = Math.min(1, p / 0.85) * 2 * P;
      return {
        pivot: [roll, 0, 0], py: -0.35 * Math.sin(Math.min(1, p) * P),
        torso: [0.9, 0, 0], head: [-0.4, 0, 0],
        legL: [-1.6, 0, 0.1], shinL: [2.3, 0, 0], legR: [-1.6, 0, -0.1], shinR: [2.3, 0, 0],
        armL: [-1.4, 0, 0.3], foreL: [-1.2, 0, 0], armR: [-1.4, 0, -0.3], foreR: [-1.2, 0, 0],
      };
    }
    case 'jump':
      return {
        pivot: [0, 0, 0], torso: [0.2, 0, 0],
        legL: [-1.1, 0, 0.1], shinL: [1.8, 0, 0], legR: [-0.3, 0, -0.1], shinR: [1.1, 0, 0],
        armL: [-0.4, 0, 1.0], foreL: [-0.6, 0, 0], armR: [-0.4, 0, -1.0], foreR: [-0.6, 0, 0],
      };
    case 'hit':
      return {
        pivot: [-0.3, 0, 0], torso: [-0.35, 0, 0.1], head: [-0.3, 0, 0],
        armL: [0.3, 0, 0.6], foreL: [-0.5, 0, 0], armR: [0.3, 0, -0.6], foreR: [-0.5, 0, 0],
        legL: [0.2, 0, 0.1], legR: [-0.3, 0, -0.1], shinR: [0.4, 0, 0],
      };
    case 'dead':
      return {
        pivot: [-P / 2, 0, 0], py: -0.6, pz: -0.3,
        torso: [-0.1, 0, 0], head: [-0.2, 0.4, 0],
        armL: [0, 0, 1.4], armR: [0, 0, -1.4], legL: [0, 0, 0.2], legR: [0, 0, -0.2], shinL: [0.3, 0, 0],
      };
    case 'apose': // pose neutra da folha de personagem (revisão de arte)
      return {
        pivot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0],
        armL: [0, 0, 0.42], foreL: [-0.12, 0, 0.05], armR: [0, 0, -0.42], foreR: [-0.12, 0, -0.05],
        legL: [0, 0, 0.06], shinL: [0, 0, -0.03], legR: [0, 0, -0.06], shinR: [0, 0, 0.03],
      };
    case 'victory': {
      const b = Math.abs(Math.sin(t * 4));
      return {
        pivot: [0, 0, 0], py: b * 0.15,
        torso: [-0.1, 0, 0], head: [-0.25, 0, 0],
        armL: [-0.2, 0, 2.6 + b * 0.2], foreL: [0, 0, 0.3], armR: [-0.2, 0, -2.6 - b * 0.2], foreR: [0, 0, -0.3],
        legL: [0, 0, 0.1], legR: [0, 0, -0.1],
      };
    }
    default:
      return {};
  }
}

// Locs balançam com o movimento
export function animateLocs(rig, t, speed) {
  rig.locs.forEach((l, i) => {
    l.rotation.x = l.userData.base + Math.sin(t * 6 + i) * 0.06 + speed * 0.05;
  });
}
