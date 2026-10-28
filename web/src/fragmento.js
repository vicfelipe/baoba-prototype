import * as THREE from 'three';
import { toon, part, GEO } from './toon.js';
import { makeFlashable } from './rig.js';

// Fragmento do Silêncio: criatura original, aglomerado de lascas prateadas em volta de um núcleo escuro.
// Animação procedural por transformação (doc 06), sem esqueleto.

export function buildFragmento() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.75;
  root.add(body);
  root.scale.setScalar(1.15);
  const core = part(GEO.sphere, toon('#3b3552', { emissive: '#2a1f4a', emissiveIntensity: 0.6 }), { scale: [0.32, 0.34, 0.3], line: 0.012 });
  body.add(core);
  // Olhos lilás brilhantes
  for (const s of [-1, 1]) {
    body.add(part(GEO.sphere, toon('#e9d0ff', { emissive: '#c08cff', emissiveIntensity: 2.2 }), { pos: [s * 0.11, 0.06, 0.27], scale: [0.06, 0.085, 0.03], line: 0 }));
  }
  const shards = [];
  const shardMats = [toon('#c4cad8'), toon('#9ea6b8'), toon('#e2e6ef')];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const tier = i % 3;
    const s = part(GEO.oct, shardMats[tier], { scale: [0.09, 0.26 + tier * 0.05, 0.09], line: 0.008 });
    s.userData = { a, r: 0.42 + tier * 0.05, y: (tier - 1) * 0.2, spin: 0.6 + tier * 0.25 };
    body.add(s);
    shards.push(s);
  }
  // Coroa de lascas maiores em cima
  for (let i = 0; i < 3; i++) {
    body.add(part(GEO.oct, shardMats[2], { pos: [(i - 1) * 0.13, 0.36, -0.04], rot: [0, 0, (i - 1) * -0.35], scale: [0.07, 0.2, 0.07], line: 0.008 }));
  }
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  return { root, body, core, shards, flash: makeFlashable(root) };
}

// state: idle | chase | warn | strike | recover | dead
export function animateFragmento(f, state, t, p) {
  const bob = Math.sin(t * 3) * 0.08;
  let gather = 0;
  let shake = 0;
  let lunge = 0;
  if (state === 'warn') { gather = Math.min(1, p * 1.5); shake = p; }
  if (state === 'strike') { lunge = Math.sin(Math.min(1, p) * Math.PI) * 0.7; gather = 1 - p; }
  f.body.position.set(Math.sin(t * 60) * 0.03 * shake, 0.75 + bob, lunge);
  f.body.rotation.x = lunge * 0.4 - gather * 0.25;
  f.shards.forEach((s, i) => {
    const d = s.userData;
    const a = d.a + t * d.spin;
    const r = d.r * (1 - gather * 0.45);
    s.position.set(Math.cos(a) * r, d.y + Math.sin(t * 2 + i) * 0.06, Math.sin(a) * r + gather * 0.25);
    s.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.3 + gather * 1.2);
  });
}
