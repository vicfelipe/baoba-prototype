import * as THREE from 'three';
import { toon, part, GEO } from './toon.js';
import { makeFlashable } from './rig.js';

// Criaturas de coral do Silêncio (fase 3, Porto de Santos, doc 25): variações do Fragmento. Em vez de lascas
// prateadas, o Silêncio junta coral e cracas da praia em volta do núcleo escuro. 'coral': galhos de coral
// rosado orbitando, golpeia de perto. 'craca': casca de cracas acinzentadas e um tubo na frente, cospe água de
// longe. Mesma estrutura do Fragmento (root, body, core, shards), animada por animateFragmento.

export function buildCoral(kind = 'coral') {
  const craca = kind === 'craca';
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.75;
  root.add(body);
  root.scale.setScalar(craca ? 1.05 : 1.2);
  const core = part(GEO.ico0, toon(craca ? '#4a5260' : '#3e3550', { emissive: craca ? '#1f3a4a' : '#2a1f4a', emissiveIntensity: 0.6 }), { scale: [0.33, 0.33, 0.3], line: 0.012 });
  body.add(core);
  // Olhos azul-mar brilhantes
  for (const s of [-1, 1]) {
    body.add(part(GEO.sphere, toon('#d8f6ff', { emissive: '#3ad0ff', emissiveIntensity: 2.2 }), { pos: [s * 0.11, 0.07, 0.27], scale: [0.06, 0.08, 0.03], line: 0 }));
  }
  if (craca) {
    // tubo de cuspir na frente e cracas grudadas no núcleo
    body.add(part(GEO.cyl, toon('#c8c2b0'), { pos: [0, -0.08, 0.3], rot: [Math.PI / 2, 0, 0], scale: [0.07, 0.18, 0.07], line: 0.008 }));
    body.add(part(GEO.torus, toon('#9ad8e8', { emissive: '#3ab0d8', emissiveIntensity: 1.2 }), { pos: [0, -0.08, 0.4], scale: 0.06, line: 0 }));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      body.add(part(GEO.cone, toon('#d6d0c0'), { pos: [Math.cos(a) * 0.24, 0.18 + Math.sin(i * 2.1) * 0.08, Math.sin(a) * 0.2 - 0.05], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], scale: [0.07, 0.09, 0.07], line: 0.006 }));
    }
  }
  const shards = [];
  const mats = craca ? [toon('#cfc9b8'), toon('#a8a496'), toon('#e4e0d2')] : [toon('#e8857a'), toon('#d0675e'), toon('#f2b0a0')];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const tier = i % 3;
    const s = new THREE.Group();
    if (craca) {
      // concha de craca: cone baixo e aberto
      s.add(part(GEO.cone, mats[tier], { scale: [0.1, 0.13, 0.1], line: 0.006 }));
      s.add(part(GEO.sphereLo, toon('#3a4450'), { pos: [0, 0.06, 0], scale: [0.04, 0.02, 0.04], line: 0 }));
    } else {
      // galho de coral: tronco e duas pontas
      s.add(part(GEO.cyl, mats[tier], { scale: [0.035, 0.26 + tier * 0.05, 0.035], line: 0.006 }));
      s.add(part(GEO.cyl, mats[tier], { pos: [0.05, 0.08, 0], rot: [0, 0, -0.7], scale: [0.025, 0.14, 0.025], line: 0.006 }));
      s.add(part(GEO.cyl, mats[tier], { pos: [-0.05, 0.03, 0], rot: [0, 0, 0.8], scale: [0.025, 0.12, 0.025], line: 0.006 }));
    }
    s.userData = { a, r: 0.42 + tier * 0.05, y: (tier - 1) * 0.2, spin: 0.5 + tier * 0.2 };
    body.add(s);
    shards.push(s);
  }
  // Coroa: coral grande (coral) ou três cracas grandes (craca)
  for (let i = 0; i < 3; i++) {
    if (craca) body.add(part(GEO.cone, mats[2], { pos: [(i - 1) * 0.14, 0.34, -0.04], rot: [0, 0, (i - 1) * -0.35], scale: [0.09, 0.14, 0.09], line: 0.008 }));
    else body.add(part(GEO.cyl, mats[2], { pos: [(i - 1) * 0.12, 0.42, -0.04], rot: [0, 0, (i - 1) * -0.45], scale: [0.04, 0.3, 0.04], line: 0.008 }));
  }
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  return { root, body, core, shards, flash: makeFlashable(root) };
}
