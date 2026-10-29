import * as THREE from 'three';
import { IARA, WORLD, CINEMATIC } from './config.js';
import { hitsShape } from './telegraph.js';
import { toon, part, GEO, limbGeo } from './toon.js';
import { makeFlashable } from './rig.js';

// Iara (chefe da dupla do Porto de Santos, doc 25): guardiã das águas corrompida pelo Silêncio. Figura poderosa e
// não sexualizada (guia de arte histórico): veste de fibra trançada com faixa de escamas cobrindo o tronco,
// cabelos longos como correntezas e uma máscara espelhada do Silêncio sobre o rosto. Fica na água, junto à borda
// do deque, da cintura para cima; a cauda aparece atrás. Libertada, a máscara se parte e o cabelo ganha cor de rio.
// Modelo de primitivas e animação procedural (o pipeline Lunia vem com as referências do usuário).
// Ciclo: nadar → jato → recuperar → jato → nadar → Canto → recuperar. Rabanada (basic, sem aviso) se o herói
// encosta nela. Ângulo na borda medido a partir do norte (−z), no sentido horário; fica no lado norte e nos
// lados, longe da câmera.

const CYCLE = ['swim', 'jet', 'recover', 'jet', 'swim', 'song', 'recover'];
const JET_HIT = 0.5, SONG_DONE = 0.4, FREE_MASK = 1.0;
const ANG_MAX = 1.9;

function buildIaraModel() {
  const root = new THREE.Group();
  const float = new THREE.Group();      // boia na linha d'água; afunda dormindo
  root.add(float);
  const fig = new THREE.Group();
  fig.scale.setScalar(1.35);
  float.add(fig);
  const skin = toon('#a8734f');
  const weave = toon('#c8a46a');
  const weaveDark = toon('#8a6a42');
  const scaleBand = toon('#3a8a7a');
  const hairMat = toon('#6a6a7a');          // cinza do Silêncio; liberta, cor de rio
  const tailMat = toon('#3e7a72');
  const finMat = toon('#6ab8a8', { side: THREE.DoubleSide });

  // quadril sob a água, faixa de escamas na cintura e espuma em volta
  fig.add(part(GEO.cyl, tailMat, { pos: [0, -0.35, 0], scale: [0.36, 0.7, 0.3], line: 0.014 }));
  fig.add(part(GEO.cyl, scaleBand, { pos: [0, 0.06, 0], scale: [0.33, 0.14, 0.27], line: 0.012 }));
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.75, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8f4f6', transparent: true, opacity: 0.7, depthWrite: false }));
  foam.position.y = 0.0;
  float.add(foam);
  // cauda curvada atrás, a barbatana rompe a superfície
  const tail = [];
  let parent = fig;
  let p = [0, -0.6, -0.15];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.set(...p);
    parent.add(seg);
    const r = 0.3 - i * 0.055;
    seg.add(part(GEO.sphere, tailMat, { pos: [0, 0, -0.3], scale: [r, r * 0.8, 0.42], line: 0.012 }));
    tail.push(seg);
    parent = seg;
    p = [0, 0.12, -0.55];
  }
  {
    const tf = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.65, -0.42), new THREE.Vector2(0.25, 0), new THREE.Vector2(0.65, 0.45)]);
    tail[3].add(part(new THREE.ShapeGeometry(tf), finMat, { pos: [0, 0.05, -0.45], rot: [-Math.PI / 2, 0, Math.PI / 2], line: 0.01 }));
  }

  // tronco coberto pela veste trançada (gola alta, sem decote)
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  fig.add(torso);
  torso.add(part(GEO.cyl, weave, { pos: [0, 0.32, 0], scale: [0.3, 0.64, 0.24], line: 0.014 }));
  torso.add(part(GEO.sphere, weave, { pos: [0, 0.66, 0], scale: [0.33, 0.14, 0.25], line: 0.012 }));
  for (let i = 0; i < 4; i++) torso.add(part(GEO.cyl, weaveDark, { pos: [0, 0.1 + i * 0.15, 0], scale: [0.305, 0.025, 0.245], line: 0 }));
  torso.add(part(GEO.cyl, scaleBand, { pos: [0, 0.74, 0], scale: [0.12, 0.08, 0.11], line: 0.008 }));   // gola
  // braços com braceletes de escama
  const arms = [];
  for (const s of [-1, 1]) {
    torso.add(part(GEO.sphere, weave, { pos: [s * 0.32, 0.62, 0], scale: [0.12, 0.11, 0.11], line: 0.01 }));
    const arm = new THREE.Group();
    arm.position.set(s * 0.34, 0.6, 0);
    torso.add(arm);
    arm.add(part(limbGeo(0.07, 0.36, 0.06), skin, { line: 0.01 }));
    const fore = new THREE.Group();
    fore.position.y = -0.36;
    arm.add(fore);
    fore.add(part(limbGeo(0.06, 0.32, 0.05), skin, { line: 0.01 }));
    fore.add(part(GEO.cyl, scaleBand, { pos: [0, -0.22, 0], scale: [0.065, 0.06, 0.065], line: 0.006 }));
    const hand = part(GEO.sphere, skin, { pos: [0, -0.38, 0.01], scale: [0.06, 0.08, 0.035], line: 0.008 });
    fore.add(hand);
    const glow = part(GEO.sphereLo, toon('#bff4ff', { emissive: '#3ac8ff', emissiveIntensity: 2.2 }), { pos: [0, -0.4, 0.04], scale: 0.07, line: 0 });
    glow.visible = false;
    fore.add(glow);
    arms.push({ arm, fore, glow, s });
  }
  // cabeça, máscara espelhada e cabelos
  const neck = new THREE.Group();
  neck.position.set(0, 0.76, 0);
  torso.add(neck);
  neck.add(part(GEO.cyl, skin, { pos: [0, 0.05, 0], scale: [0.06, 0.12, 0.06], line: 0.008 }));
  const head = new THREE.Group();
  head.position.y = 0.2;
  neck.add(head);
  head.add(part(GEO.sphere, skin, { scale: [0.13, 0.16, 0.14], line: 0.01 }));
  const mask = new THREE.Group();
  head.add(mask);
  mask.add(part(new THREE.SphereGeometry(1, 20, 14, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.18, Math.PI * 0.58), toon('#dfe4ee', { emissive: '#7a7aa8', emissiveIntensity: 0.4, side: THREE.DoubleSide }), { scale: [0.145, 0.17, 0.15], line: 0.008 }));
  for (const s of [-1, 1]) mask.add(part(GEO.sphereLo, toon('#efe0ff', { emissive: '#a070ff', emissiveIntensity: 2.4 }), { pos: [s * 0.05, 0.02, 0.145], scale: [0.028, 0.012, 0.01], line: 0 }));
  const face = new THREE.Group();     // rosto, à mostra só depois da libertação
  face.visible = false;
  head.add(face);
  for (const s of [-1, 1]) {
    face.add(part(GEO.sphereLo, toon('#2a1a14'), { pos: [s * 0.048, 0.02, 0.128], scale: [0.02, 0.013, 0.01], line: 0 }));
    face.add(part(GEO.box, toon('#3a2218'), { pos: [s * 0.05, 0.06, 0.125], rot: [0, 0, s * -0.15], scale: [0.045, 0.008, 0.01], line: 0 }));
  }
  face.add(part(GEO.box, toon('#7a3a30'), { pos: [0, -0.07, 0.13], scale: [0.04, 0.008, 0.01], line: 0 }));
  head.add(part(GEO.sphere, hairMat, { pos: [0, 0.04, -0.02], scale: [0.145, 0.16, 0.15], line: 0.01 }));
  const hair = [];
  for (let i = 0; i < 11; i++) {
    const a = -1.3 + (i / 10) * 2.6;
    const strand = new THREE.Group();
    strand.position.set(Math.sin(a) * 0.12, 0.06, -Math.cos(a) * 0.1);
    strand.rotation.y = a * 0.4;
    head.add(strand);
    const len = 0.9 + (i % 3) * 0.25;
    strand.add(part(GEO.box, hairMat, { pos: [0, -len / 2, -0.03], scale: [0.07, len, 0.025], line: 0.006 }));
    strand.add(part(GEO.cone, hairMat, { pos: [0, -len - 0.08, -0.03], rot: [Math.PI, 0, 0], scale: [0.035, 0.16, 0.012], line: 0 }));
    hair.push({ strand, i, len });
  }
  // conchas no cabelo (adorno, sem símbolo religioso)
  for (const s of [-1, 1]) head.add(part(GEO.cone, toon('#f2e4d4'), { pos: [s * 0.12, 0.08, 0.02], rot: [0, 0, s * 1.2], scale: [0.03, 0.04, 0.03], line: 0.004 }));

  const shards = [];
  for (let i = 0; i < 4; i++) {
    const sh = part(GEO.oct, toon('#c4cad8'), { scale: [0.05, 0.15, 0.05], line: 0.006 });
    sh.userData = { a: (i / 4) * Math.PI * 2, r: 0.9, y: 1.8 + (i % 2) * 0.35, spin: 0.8 + i * 0.15 };
    float.add(sh);
    shards.push(sh);
  }
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  const flash = makeFlashable(root);
  // depois do makeFlashable: as malhas do cabelo (materiais clonados) mudam de cor na libertação
  const hairMeshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline && o.material.color?.getHexString() === '6a6a7a') hairMeshes.push(o); });
  const m = { root, float, fig, torso, arms, neck, head, mask, face, hair, hairMeshes, tail, shards, foam, flash, height: 2.75 };
  m.cur = { raise: 0, open: 0, lean: 0, sink: 0, twist: 0 };
  return m;
}

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => x * x * (3 - 2 * x);

// state: dormant | awaken | idle | swim | jetWarn | jetHit | cast | songDone | stagger | basicWarn | basicHit | recover | freed
function animateIara(m, state, t, p, dt, seaY) {
  let raise = 0, open = 0, lean = 0, sink = 0, twist = 0;
  if (state === 'swim') { lean = 0.5; sink = 0.25; }
  if (state === 'jetWarn') { raise = ease(Math.min(1, p * 1.4)); lean = -0.1; }
  if (state === 'jetHit') { raise = 0.6; lean = 0.35; }
  if (state === 'cast') { open = 1; lean = -0.25; }
  if (state === 'songDone') { open = 0.6; lean = 0.2; }
  if (state === 'stagger') { lean = -0.45; open = 0.3; sink = 0.15; }
  if (state === 'basicWarn') { twist = 1; lean = 0.15; }
  if (state === 'basicHit') { twist = -0.8; lean = 0.3; }
  if (state === 'recover') { lean = 0.15; }
  if (state === 'dormant') sink = 1;
  if (state === 'awaken') { sink = 1 - ease(Math.min(1, p * 1.3)); open = 0.6 * p; lean = -0.2; }
  if (state === 'freed') { open = 0.25 + 0.1 * Math.sin(t * 0.8); lean = -0.05; }
  const k = state === 'dormant' || state === 'awaken' ? 1 : 1 - Math.exp(-dt * 8);
  const c = m.cur;
  for (const [key, v] of Object.entries({ raise, open, lean, sink, twist })) c[key] = lerp(c[key], v, k);
  m.float.position.y = seaY + Math.sin(t * 1.4) * 0.07 - c.sink * 3.2;
  m.foam.visible = c.sink < 0.6;
  m.foam.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
  m.fig.rotation.set(c.lean * 0.5, c.twist * 0.6, Math.sin(t * 0.9) * 0.05);
  m.torso.rotation.x = c.lean * 0.4;
  for (const { arm, fore, s } of m.arms) {
    // erguer para o jato, abrir os braços no Canto
    arm.rotation.x = -0.15 - c.raise * 1.4 - c.open * 0.3 + Math.sin(t * 1.2 + s) * 0.05;
    arm.rotation.z = s * (0.2 + c.open * 1.1);
    fore.rotation.x = -0.35 - c.raise * 0.2;
  }
  m.neck.rotation.x = -c.open * 0.35 + c.lean * 0.2;
  m.head.rotation.y = Math.sin(t * 0.6) * 0.15;
  m.hair.forEach(({ strand, i }) => {
    strand.rotation.x = 0.25 + c.lean * 0.6 + Math.sin(t * 1.7 + i * 0.6) * 0.08;
    strand.rotation.z = Math.sin(t * 1.3 + i) * 0.07;
  });
  m.tail.forEach((seg, i) => {
    seg.rotation.x = -0.25 + Math.sin(t * 2.2 - i * 0.7) * (0.12 + 0.2 * c.lean) + c.twist * 0.15 * (i + 1);
    seg.rotation.y = c.twist * 0.25;
  });
  m.shards.forEach((s, i) => {
    const d = s.userData;
    const a = d.a + t * d.spin;
    s.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 2 + i) * 0.08, Math.sin(a) * d.r);
    s.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.3);
  });
}

export class Iara {
  constructor(G, parent) {
    this.G = G;
    this.model = buildIaraModel();
    parent.add(this.model.root);
    this.pos = this.model.root.position;
    this.radius = IARA.radius;
    this.maxHp = IARA.corruption;
    this.isBoss = true;
    this.solid = false;         // na água, fora do deque: não empurra o herói
    this.height = this.model.height;
    this.allyName = 'Iara';
    this.barStyle = 'water';   // barra de Corrupção azul no HUD
    this.reset();
  }

  reset() {
    this.name = 'Iara corrompida';
    this.ang = -1.0;            // noroeste, do outro lado do deque para quem chega pelo trapiche
    this.place();
    this.hp = this.maxHp;
    this.alive = true;
    this.freed = false;
    this.targetable = false;
    this.state = 'dormant';
    this.st = 0;
    this.t = 0;
    this.step = 0;
    this.flash = 0;
    this.cast = null;
    this.lastHitId = -1;
    this.basicCd = 0;
    this.resume = null;
    this.shownSongHint = false;
    this.ringT = 0;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    const m = this.model;
    m.mask.visible = true;
    m.face.visible = false;
    for (const h of m.hairMeshes) h.material.color.set('#6a6a7a');
    m.shards.forEach((s) => { s.visible = true; });
    this.facing = this.faceCenter();
    m.root.rotation.y = this.facing;
  }

  // posição na borda pelo ângulo
  place() {
    const c = WORLD.arenaCenter;
    this.pos.set(c.x + Math.sin(this.ang) * IARA.edge, 0, c.z - Math.cos(this.ang) * IARA.edge);
  }

  faceCenter() {
    const c = WORLD.arenaCenter;
    return Math.atan2(c.x - this.pos.x, c.z - this.pos.z);
  }

  awaken() {
    this.setState('awaken');
    this.G.fx.burst('splash', this.pos.clone().setY(0), { n: 40 });
  }

  begin() {
    this.targetable = true;
    this.setState('intro');
  }

  setState(s) {
    this.state = s;
    this.st = 0;
    this.cast = null;
  }

  toPlayer() {
    const pl = this.G.player;
    return new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
  }

  nextInCycle() {
    const s = CYCLE[this.step % CYCLE.length];
    this.step++;
    const G = this.G;
    const pl = G.player;
    if (s === 'recover') return this.setState('recover');
    if (s === 'swim') {
      // um ponto novo na borda, a pelo menos ~55° do atual
      let a = this.ang;
      for (let i = 0; i < 12 && Math.abs(a - this.ang) < 0.95; i++) a = (Math.random() * 2 - 1) * ANG_MAX;
      this.swimTo = a;
      return this.setState('swim');
    }
    if (s === 'jet') {
      if (!pl.alive || pl.adrift) return this.setState('recover');
      this.setState('jetWarn');
      this.shape = { x: pl.pos.x, z: pl.pos.z, radius: IARA.jet.radius };
      this.tg = G.tg.add({ ...this.shape, color: '#3a9cff' });
      G.audio.play('warn', IARA.jet.warn);
      return;
    }
    if (s === 'song') {
      this.setState('cast');
      this.cast = { t: 0, dur: IARA.song.cast, name: 'Canto da Iara' };
      G.audio.play('song', IARA.song.cast);
      G.hud.log('A Iara começa o Canto — ele puxa para o mar!', 'bad');
      if (!this.shownSongHint) {
        this.shownSongHint = true;
        G.hud.hint(`Q (${pl.kit.interrupt}) interrompe o Canto${pl.kit.melee ? ' — vá até a borda!' : ''}`, 5);
      }
    }
  }

  takeHit(dmg, { interrupts, heavy, actionId, dot }) {
    if (!this.alive || !this.targetable || actionId === this.lastHitId) return;
    this.lastHitId = actionId;
    const G = this.G;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 1;
    G.fx.text(this.pos.clone().setY(3.2), String(dmg), dot ? 'dmg poison' : heavy ? 'dmg big' : 'dmg');
    if (!dot) G.fx.burst(heavy ? 'hitBig' : 'hit', this.pos.clone().setY(1.8));
    if (this.hp <= 0) return this.free();
    if (interrupts && this.state === 'cast') {
      this.setState('stagger');
      G.fx.burst('interrupt', this.pos.clone().setY(2.4));
      G.fx.text(this.pos.clone().setY(3.9), 'Interrompido!', 'info good');
      G.audio.play('interrupt');
      G.hud.castBroken();
      G.hud.log('Canto da Iara interrompido!', 'good');
    }
  }

  // Corrupção zerada: para de atacar, a máscara se parte e o cabelo ganha cor de rio
  free() {
    const G = this.G;
    this.alive = false;
    this.freed = true;
    this.targetable = false;
    if (this.tg) G.tg.remove(this.tg);
    this.tg = null;
    this.cast = null;
    this.setState('freed');
    this.name = 'Iara liberta';
    G.fx.burst('interrupt', this.pos.clone().setY(2.6));
    G.fx.burst('corrupt', this.pos.clone().setY(1.8), { n: 40 });
    G.audio.play('interrupt');
    G.onDuoPart?.(this);
  }

  // Rabanada: golpe comum, sem marcação no chão nem som de aviso
  tryBasic(toP, dist) {
    const b = IARA.basic, pl = this.G.player;
    if (this.basicCd > 0 || !pl.alive || pl.hidden || pl.adrift || dist > b.range + this.radius) return false;
    const dir = toP.clone().normalize();
    this.facing = Math.atan2(dir.x, dir.z);
    this.resume = { state: this.state, st: this.st };
    this.state = 'basicWarn';
    this.st = 0;
    this.shape = { x: this.pos.x, z: this.pos.z, radius: b.range + this.radius, angleDeg: b.angle, dir };
    this.basicCd = b.cd;
    return true;
  }

  update(dt) {
    const G = this.G;
    this.t += dt;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.basicCd = Math.max(0, this.basicCd - dt);
    const pl = G.player;
    const toP = this.toPlayer();
    const dist = toP.length();

    if (!pl.alive && !['dormant', 'awaken', 'freed', 'playerDown'].includes(this.state)) {
      if (this.tg) G.tg.remove(this.tg);
      this.tg = null;
      this.setState('playerDown');
    }
    if (this.state !== 'dormant' && this.state !== 'swim') this.facing = Math.atan2(toP.x, toP.z);

    switch (this.state) {
      case 'intro':
        if (this.st >= IARA.startWait) this.nextInCycle();
        break;
      case 'swim': {
        const w = IARA.swim / IARA.edge * dt;
        const d = this.swimTo - this.ang;
        this.ang += Math.sign(d) * Math.min(Math.abs(d), w);
        this.place();
        this.facing = Math.atan2(Math.cos(this.ang) * Math.sign(d), Math.sin(this.ang) * Math.sign(d));
        if (Math.random() < dt * 12) G.fx.burst('foam', this.pos.clone().setY(0.1), { n: 2 });
        if (Math.abs(d) < 1e-3) this.nextInCycle();
        break;
      }
      case 'jetWarn':
        G.tg.setProgress(this.tg, this.st / IARA.jet.warn);
        if (this.st >= IARA.jet.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && !pl.adrift && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(IARA.jet.dmg, "Jato d'água");
          G.fx.burst('splash', new THREE.Vector3(this.shape.x, 0.3, this.shape.z), { n: 36 });
          G.fx.ring(new THREE.Vector3(this.shape.x, 0, this.shape.z), '#9fe0ff', this.shape.radius, 0.4, 0.12, 0.25);
          G.audio.play('jet');
          this.setState('jetHit');
        }
        break;
      case 'jetHit':
        if (this.st >= JET_HIT) this.nextInCycle();
        break;
      case 'cast': {
        this.cast.t = this.st;
        // o Canto puxa o herói devagar em direção à Iara (para a borda)
        if (pl.alive && !pl.adrift) {
          const v = toP.clone().normalize().multiplyScalar(-IARA.song.pull * dt);
          pl.tryMove(v.x, v.z);
        }
        this.ringT -= dt;
        if (this.ringT <= 0) {
          this.ringT = 0.6;
          G.fx.ring(this.pos, '#9fd8ff', 5, 0.9, 0.3, 0.06);
        }
        if (this.st >= IARA.song.cast) {
          G.fx.ring(this.pos, '#cfeeff', WORLD.arenaRadius + 2, 0.6, 0.2, 0.1);
          G.audio.play('pulse');
          G.hud.pulseFlash();
          if (pl.alive && !pl.adrift && pl.takeDamage(IARA.song.dmg, 'Canto da Iara')) pl.shove(toP.clone().negate(), IARA.song.drag, 0.55);
          this.setState('songDone');
        }
        break;
      }
      case 'songDone':
        if (this.st >= SONG_DONE) this.nextInCycle();
        break;
      case 'stagger':
        if (this.st >= IARA.recoverInterrupted) {
          this.step++;   // pula a recuperação normal do ciclo
          this.nextInCycle();
        }
        break;
      case 'recover':
        if (this.st >= IARA.recover) this.nextInCycle();
        else if (this.st >= IARA.recover * 0.5) this.tryBasic(toP, dist);
        break;
      case 'basicWarn':
        if (this.st >= IARA.basic.windup) {
          if (pl.alive && !pl.adrift && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(IARA.basic.dmg, 'Rabanada');
          G.fx.burst('splash', this.pos.clone().addScaledVector(this.shape.dir, 1.6).setY(0.3), { n: 14 });
          G.audio.play('impact');
          this.setState('basicHit');
        }
        break;
      case 'basicHit':
        if (this.st >= IARA.basic.hit) {
          const r = this.resume;
          this.resume = null;
          this.state = r ? r.state : 'recover';
          this.st = r ? r.st + IARA.basic.windup + IARA.basic.hit : 0;
        }
        break;
      case 'freed':
        if (this.st >= FREE_MASK && this.model.mask.visible) {
          // a máscara espelhada se parte; o rosto aparece e o cabelo ganha cor de rio
          this.model.mask.visible = false;
          this.model.face.visible = true;
          for (const h of this.model.hairMeshes) h.material.color.set('#1e3a3c');
          this.model.shards.forEach((s) => { s.visible = false; });
          G.fx.burst('shards', this.model.head.getWorldPosition(new THREE.Vector3()));
          G.fx.burst('restore', this.pos.clone().setY(1.8), { n: 40 });
          G.audio.play('restore');
        }
        if (Math.random() < dt * 3) G.fx.burst('restore', this.pos.clone().setY(1.2), { n: 1 });
        break;
      default:
        break;
    }

    if (this.alive && !['dormant'].includes(this.state) && Math.random() < dt * 10) G.fx.burst('corrupt', this.pos.clone().setY(0.5), { n: 1 });
    this.animate(dt);
  }

  animate(dt) {
    const m = this.model;
    const S = this.state;
    let p = 0;
    if (S === 'jetWarn') p = this.st / IARA.jet.warn;
    if (S === 'awaken') p = this.st / CINEMATIC.encounter.awaken;
    const state = ['intro', 'playerDown'].includes(S) ? 'idle' : S;
    animateIara(m, state, this.t, p, dt > 0 ? dt : 1 / 60, this.G.world.seaY ?? -0.3);
    for (const a of m.arms) a.glow.visible = S === 'jetWarn' || S === 'cast';
    let diff = this.facing - m.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    m.root.rotation.y += diff * Math.min(1, dt * 5);
    m.flash(this.flash);
  }
}
