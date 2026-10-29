import * as THREE from 'three';
import { toon, part, GEO, limbGeo } from './toon.js';
import { makeFlashable } from './rig.js';

// Morto-vivo do Silêncio (fase 2, Sertão Velho): variação do Fragmento. O mesmo Silêncio que junta lascas
// na Mata levanta os mortos do cemitério do arraial: ossada corcunda com trapos de couro, coração de lasca
// brilhando entre as costelas, olhos de fogo-fátuo e lascas prateadas orbitando. 'brasa' tem o coração em
// brasa e explode ao cair. 'afogado' (fase 3, Porto de Santos, doc 25): estivador afogado, ossada esverdeada com
// cracas, camisa e macacão molhados, boné, algas penduradas e um gancho de carga na mão direita; sobe do mar.
// Animação procedural por transformação, sem esqueleto de pele (como o Fragmento).

export function buildMorto(kind = 'morto', index = 0) {
  const brasa = kind === 'brasa';
  const afog = kind === 'afogado';
  const root = new THREE.Group();
  const rise = new THREE.Group();          // sobe da cova; cai ao morrer
  root.add(rise);
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  rise.add(hips);

  const bone = toon(afog ? '#bcc6b2' : '#dcd2bb');
  const boneDark = toon(afog ? '#7f8e80' : '#a89c84');
  const rag = toon(afog ? (index % 2 ? '#3c5a78' : '#4a6656') : index % 2 ? '#4c3a2c' : '#3e3a34');
  const rag2 = toon(afog ? '#2e4458' : '#6a5440');
  const eyeCol = brasa ? '#ffd27a' : afog ? '#c8f4ff' : '#c4ffe6';
  const eyeEm = brasa ? '#ff7a1a' : afog ? '#36c8ff' : '#3dffb0';
  const weed = toon('#4f7a3a');

  hips.add(part(GEO.sphere, boneDark, { scale: [0.16, 0.09, 0.11], line: 0.012 }));
  hips.add(part(GEO.cyl, rag, { pos: [0, -0.06, 0], scale: [0.19, 0.16, 0.14], line: 0.012 }));

  // Pernas: coxa + canela, presas no quadril
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.1, -0.02, 0);
    hips.add(leg);
    leg.add(part(limbGeo(0.05, 0.44, 0.042), bone, { line: 0.01 }));
    leg.add(part(GEO.cyl, rag2, { pos: [0, -0.15, 0], scale: [0.08, 0.28, 0.08], line: 0.01 }));
    const shin = new THREE.Group();
    shin.position.y = -0.44;
    leg.add(shin);
    shin.add(part(limbGeo(0.042, 0.42, 0.032), bone, { line: 0.01 }));
    shin.add(part(GEO.box, boneDark, { pos: [0, -0.45, 0.05], scale: [0.07, 0.04, 0.17], line: 0.01 }));
    legs.push({ leg, shin, s });
  }

  // Coluna, costelas e o coração de lasca
  const spine = new THREE.Group();
  spine.position.y = 0.05;
  hips.add(spine);
  for (let i = 0; i < 3; i++) spine.add(part(GEO.oct, bone, { pos: [0, 0.08 + i * 0.1, -0.07], scale: [0.035, 0.05, 0.035], line: 0.008 }));
  const chest = new THREE.Group();
  chest.position.set(0, 0.38, 0);
  spine.add(chest);
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      chest.add(part(GEO.oct, bone, { pos: [s * 0.085, 0.03 - i * 0.07, 0.03], rot: [0.25, s * 0.55, s * (1.2 - i * 0.07)], scale: [0.024, 0.13 - i * 0.012, 0.03], line: 0.008 }));
    }
  }
  chest.add(part(GEO.box, bone, { pos: [0, -0.06, 0.1], scale: [0.03, 0.2, 0.02], line: 0.008 }));
  const heartMat = toon(brasa ? '#ffd27a' : afog ? '#bfe8ff' : '#d8b8ff', { emissive: brasa ? '#ff5a10' : afog ? '#2a9cff' : '#7a3cff', emissiveIntensity: 1.8 });
  const heart = part(GEO.ico, heartMat, { pos: [0, -0.07, 0.01], scale: 0.07, line: 0 });
  chest.add(heart);
  // Gibão rasgado só nas costas e nos lados: as costelas ficam à vista na frente
  const cape = part(new THREE.ConeGeometry(0.3, 0.46, 10, 1, true, Math.PI * 0.42, Math.PI * 1.16), toon(afog ? '#3a5468' : '#5a4636', { side: THREE.DoubleSide }), { pos: [0, -0.02, -0.02], line: 0.01 });
  chest.add(cape);
  for (let i = 0; i < 4; i++) {
    chest.add(part(GEO.box, toon(afog ? '#2c4252' : '#4a3828'), { pos: [-0.2 + i * 0.13, -0.3 - (i % 2) * 0.05, -0.12], rot: [0.15, 0, (i - 1.5) * 0.12], scale: [0.09, 0.16, 0.02], line: 0.008 }));
  }

  // Braços compridos com garras de lasca
  const arms = [];
  const clawMat = toon(brasa ? '#ffcf8a' : '#c4cad8', brasa ? { emissive: '#ff6a1a', emissiveIntensity: 0.6 } : {});
  for (const s of [-1, 1]) {
    chest.add(part(GEO.sphereLo, bone, { pos: [s * 0.17, 0.1, 0], scale: 0.05, line: 0.008 }));
    const arm = new THREE.Group();
    arm.position.set(s * 0.19, 0.1, 0);
    chest.add(arm);
    arm.add(part(limbGeo(0.038, 0.37, 0.032), bone, { line: 0.01 }));
    arm.add(part(GEO.cyl, rag, { pos: [0, -0.08, 0], scale: [0.065, 0.15, 0.065], line: 0.01 }));
    const fore = new THREE.Group();
    fore.position.y = -0.37;
    arm.add(fore);
    fore.add(part(limbGeo(0.032, 0.35, 0.026), bone, { line: 0.01 }));
    for (let k = 0; k < 3; k++) {
      fore.add(part(GEO.oct, clawMat, { pos: [(k - 1) * 0.03, -0.42, 0.02], rot: [0.3, 0, (k - 1) * 0.25], scale: [0.018, 0.09, 0.018], line: 0.006 }));
    }
    // afogado: gancho de carga na mão direita
    if (afog && s > 0) {
      fore.add(part(GEO.cyl, toon('#5a4634'), { pos: [0, -0.4, 0.03], rot: [1.2, 0, 0], scale: [0.025, 0.14, 0.025], line: 0.006 }));
      fore.add(part(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI * 1.3), toon('#6a6e76'), { pos: [0, -0.48, 0.1], rot: [0, Math.PI / 2, 0.6], line: 0.006 }));
    }
    arms.push({ arm, fore, s });
  }

  // Crânio com mandíbula solta e olhos de fogo-fátuo
  const neck = new THREE.Group();
  neck.position.set(0, 0.2, 0.03);
  chest.add(neck);
  neck.add(part(GEO.cyl, bone, { pos: [0, 0.04, 0], scale: [0.03, 0.1, 0.03], line: 0.008 }));
  const head = new THREE.Group();
  head.position.y = 0.1;
  neck.add(head);
  head.add(part(GEO.sphere, bone, { pos: [0, 0.09, 0], scale: [0.12, 0.13, 0.13], line: 0.012 }));
  head.add(part(GEO.box, bone, { pos: [0, -0.01, 0.05], scale: [0.12, 0.06, 0.1], line: 0.01 }));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.03, 0);
  head.add(jaw);
  jaw.add(part(GEO.box, boneDark, { pos: [0, -0.03, 0.06], scale: [0.1, 0.035, 0.1], line: 0.01 }));
  const socket = toon('#120c14');
  const eyeMat = toon(eyeCol, { emissive: eyeEm, emissiveIntensity: 2.6 });
  for (const s of [-1, 1]) {
    head.add(part(GEO.sphereLo, socket, { pos: [s * 0.047, 0.08, 0.1], scale: [0.036, 0.042, 0.025], line: 0 }));
    head.add(part(GEO.sphereLo, eyeMat, { pos: [s * 0.047, 0.08, 0.116], scale: [0.017, 0.02, 0.012], line: 0 }));
  }
  head.add(part(GEO.oct, socket, { pos: [0, 0.03, 0.126], scale: [0.015, 0.022, 0.01], line: 0 }));
  if (afog) {
    // boné de estivador e algas penduradas na cabeça e nos ombros; cracas no crânio
    if (index % 2 === 0) {
      head.add(part(GEO.sphere, toon('#2e3e52'), { pos: [0, 0.16, -0.01], scale: [0.13, 0.07, 0.135], line: 0.01 }));
      head.add(part(GEO.box, toon('#26344a'), { pos: [0, 0.14, 0.13], rot: [0.25, 0, 0], scale: [0.16, 0.015, 0.1], line: 0.008 }));
    }
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      head.add(part(GEO.box, weed, { pos: [Math.sin(a) * 0.11, 0.0, Math.cos(a) * 0.08 - 0.03], rot: [0.1, a, 0.05], scale: [0.03, 0.24 + (i % 2) * 0.08, 0.008], line: 0 }));
    }
    for (const sx of [-1, 1]) chest.add(part(GEO.box, weed, { pos: [sx * 0.2, -0.05, 0.02], rot: [0, 0, sx * 0.15], scale: [0.03, 0.3, 0.008], line: 0 }));
    for (let i = 0; i < 4; i++) head.add(part(GEO.cone, toon('#d8d4c4'), { pos: [-0.06 + i * 0.04, 0.17, -0.06 + (i % 2) * 0.05], scale: [0.018, 0.02, 0.018], line: 0 }));
    // corda enrolada no ombro
    chest.add(part(new THREE.TorusGeometry(0.2, 0.018, 6, 20), toon('#b09a6a'), { pos: [0, 0.02, 0], rot: [1.25, 0.5, 0.6], line: 0.006 }));
  }
  // Chapéu de couro gasto, de aba quebrada (metade deles)
  if (index % 2 === 0 && !afog) {
    const hat = new THREE.Group();
    hat.position.set(0, 0.2, -0.01);
    hat.rotation.set(-0.12, 0, index % 4 ? 0.22 : -0.22);
    head.add(hat);
    hat.add(part(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 14, 1, false, 0, Math.PI * 1.7), toon('#5c4430', { side: THREE.DoubleSide }), { line: 0.01 }));
    hat.add(part(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), toon('#4a3524'), { pos: [0, 0.06, 0], line: 0.01 }));
  }

  // Lascas do Silêncio orbitando os ombros
  const shards = [];
  for (let i = 0; i < 4; i++) {
    const sh = part(GEO.oct, clawMat, { scale: [0.04, 0.11, 0.04], line: 0.006 });
    sh.userData = { a: (i / 4) * Math.PI * 2, r: 0.42, y: 1.35 + (i % 2) * 0.22, spin: 0.9 + i * 0.2 };
    rise.add(sh);
    shards.push(sh);
  }

  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  const m = { root, rise, hips, spine, chest, neck, head, jaw, legs, arms, shards, heart, heartMat, brasa, afog, flash: makeFlashable(root) };
  m.cur = { walk: 0, reach: 0.9, lean: 0.35, open: 0.2 };
  return m;
}

const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

// state: buried | rise | idle | chase | return | warn | strike | recover | dead; p = progresso do estado (0..1)
export function animateMorto(m, state, t, p, dt = 1 / 60) {
  let walk = 0;
  let reach = 0.75;      // braços erguidos para a frente (zumbi)
  let lean = 0.35;       // corcunda
  let open = 0.2;        // mandíbula
  let lunge = 0;
  m.rise.position.set(0, 0, 0);
  m.rise.rotation.set(0, 0, 0);
  if (state === 'chase' || state === 'return') walk = 1;
  if (state === 'warn') {
    const e = ease(Math.min(1, p * 1.3));
    reach = lerp(0.9, 2.8, e);   // ergue as garras
    lean = lerp(0.35, -0.2, e);
    open = 0.55;
  }
  if (state === 'strike') {
    const e = ease(Math.min(1, p * 1.6));
    reach = lerp(2.8, 0.4, e);
    lean = lerp(-0.2, 0.8, e);
    lunge = Math.sin(Math.min(1, p) * Math.PI) * 0.45;
    open = 0.6;
  }
  if (state === 'recover') {
    reach = 0.25;
    lean = 0.65;
    open = 0.35;
  }
  if (state === 'buried') {
    m.rise.position.y = -2.1;
    reach = 2.4;
  }
  if (state === 'rise') {
    // sai da cova arranhando a terra, depois se endireita
    const e = Math.min(1, p * 1.25);
    m.rise.position.y = -2.1 * (1 - e) * (1 - e);
    m.rise.position.x = Math.sin(t * 40) * 0.03 * (1 - e);
    m.rise.rotation.x = -0.45 * (1 - e);
    reach = lerp(2.6, 0.9, ease(p));
    lean = lerp(-0.2, 0.35, ease(p));
    open = 0.6;
  }
  if (state === 'dead') {
    const e = ease(Math.min(1, p));
    m.rise.rotation.x = e * 1.45;          // tomba de cara no chão
    m.rise.position.y = -0.12 * e;
    reach = 2.2;
    lean = 0.2;
    open = 0.8;
  }
  // transições suaves entre estados (o cair e o subir já vêm contínuos)
  const k = state === 'dead' || state === 'rise' || state === 'buried' ? 1 : 1 - Math.exp(-dt * 12);
  const c = m.cur;
  c.walk = lerp(c.walk, walk, k);
  c.reach = lerp(c.reach, reach, k);
  c.lean = lerp(c.lean, lean, k);
  c.open = lerp(c.open, open, k);

  // Andar arrastado: passo curto, a perna direita manca
  const ph = t * 5.5;
  m.hips.position.set(Math.sin(ph) * 0.04 * c.walk, 0.9 - Math.abs(Math.sin(ph)) * 0.05 * c.walk, lunge);
  m.hips.rotation.y = Math.sin(ph) * 0.12 * c.walk;
  m.hips.rotation.z = Math.sin(ph) * 0.08 * c.walk;
  for (const { leg, shin, s } of m.legs) {
    const amp = s > 0 ? 0.32 : 0.5;
    const sw = Math.sin(ph + (s > 0 ? Math.PI : 0));
    leg.rotation.x = -sw * amp * c.walk - 0.12;
    shin.rotation.x = 0.22 + Math.max(0, sw) * 0.55 * c.walk;
    leg.rotation.z = s * 0.06;
  }
  m.spine.rotation.x = c.lean;
  m.spine.rotation.z = Math.sin(t * 1.1) * 0.06;
  for (const { arm, fore, s } of m.arms) {
    arm.rotation.x = -c.reach + Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 0.18 * c.walk;
    arm.rotation.z = s * (0.18 + Math.sin(t * 2.3 + s) * 0.05);
    fore.rotation.x = -0.35 - Math.max(0, c.reach - 1.5) * 0.2;
  }
  // cabeça caída de lado, com trancos
  m.neck.rotation.x = -c.lean * 0.7 + Math.sin(t * 7.3) * Math.sin(t * 2.1) * 0.06;
  m.head.rotation.z = 0.28 + Math.sin(t * 1.3) * 0.1;
  m.head.rotation.y = Math.sin(t * 0.8) * 0.2;
  m.jaw.rotation.x = c.open + Math.max(0, Math.sin(t * 9)) * 0.12;
  const beat = 1 + 0.22 * Math.max(0, Math.sin(t * 6)) ** 4;
  m.heart.scale.setScalar(0.07 * beat);
  m.shards.forEach((s, i) => {
    const d = s.userData;
    const a = d.a + t * d.spin;
    s.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 2 + i) * 0.06, Math.sin(a) * d.r);
    s.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.3);
    s.visible = state !== 'dead';
  });
}
