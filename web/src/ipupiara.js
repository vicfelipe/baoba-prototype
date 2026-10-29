import * as THREE from 'three';
import { IPUPIARA, WORLD, CINEMATIC } from './config.js';
import { hitsShape } from './telegraph.js';
import { toon, part, GEO, limbGeo } from './toon.js';
import { makeFlashable } from './rig.js';

// Ipupiara (chefe da dupla do Porto de Santos, doc 25): monstro marinho das crônicas coloniais do litoral de São
// Vicente. Escamas escuras, nadadeiras como velas, muitos dentes e uma cauda longa. Corpo a corpo no deque.
// Modelo de primitivas e animação procedural (decisão do usuário, 28/10/2026: o pipeline Lunia vem depois, com
// referências). Frente em +z, cauda em -z. Números em config.js IPUPIARA (proposta a validar).
// Ciclo: aproximar → rabada → recuperar → arremetida → recuperar. Mordida (basic, sem aviso) com o herói perto,
// ao se aproximar e na 2ª metade da recuperação. Rabada e arremetida empurram o herói (pode cair no mar).

const CYCLE = ['approach', 'tail', 'recover', 'lunge', 'recover'];
const TAIL_HIT = 0.6, LUNGE_END = 0.7, DEAD = 2.6;

function buildIpupiaraModel() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const scale = toon('#2c4048');
  const scaleDark = toon('#1e2e36');
  const belly = toon('#8a9a86');
  const fin = toon('#2f6a70', { side: THREE.DoubleSide });
  const finEdge = toon('#7ab8b0');
  const tooth = toon('#ece4d0');
  const eyeMat = toon('#e6d0ff', { emissive: '#a070ff', emissiveIntensity: 2.4 });
  const weed = toon('#4a6e3a');

  body.add(part(GEO.sphere, scale, { pos: [0, 1.05, 0], scale: [0.95, 0.82, 1.55], line: 0.02 }));
  body.add(part(GEO.sphere, belly, { pos: [0, 0.86, 0.12], scale: [0.78, 0.6, 1.35], line: 0 }));
  // cracas e algas no lombo
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3;
    body.add(part(GEO.cone, toon('#c8c2b0'), { pos: [Math.sin(a) * 0.5, 1.7 + Math.cos(i) * 0.08, -0.8 + i * 0.2], scale: [0.07, 0.08, 0.07], line: 0 }));
  }
  for (const s of [-1, 1]) body.add(part(GEO.box, weed, { pos: [s * 0.9, 0.9, -0.3], rot: [0, 0, s * 0.2], scale: [0.04, 0.5, 0.012], line: 0 }));

  // peito, pescoço erguido e cabeça
  const chest = new THREE.Group();
  chest.position.set(0, 1.2, 0.95);
  body.add(chest);
  chest.add(part(GEO.sphere, scale, { scale: [0.86, 0.86, 0.82], line: 0.02 }));
  chest.add(part(GEO.sphere, belly, { pos: [0, -0.12, 0.25], scale: [0.66, 0.66, 0.6], line: 0 }));
  const neck = new THREE.Group();
  neck.position.set(0, 0.35, 0.45);
  chest.add(neck);
  neck.add(part(GEO.sphere, scale, { pos: [0, 0.18, 0.2], scale: [0.56, 0.6, 0.68], line: 0.018 }));
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.55);
  neck.add(head);
  head.add(part(GEO.sphere, scale, { scale: [0.62, 0.46, 0.72], line: 0.018 }));
  head.add(part(GEO.box, scale, { pos: [0, -0.02, 0.72], scale: [0.54, 0.24, 0.95], line: 0.016 }));
  head.add(part(GEO.box, scaleDark, { pos: [0, 0.14, 0.45], rot: [-0.25, 0, 0], scale: [0.6, 0.1, 0.5], line: 0.012 }));   // testa
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) head.add(part(GEO.cone, tooth, { pos: [s * 0.24, -0.17, 0.34 + i * 0.16], rot: [Math.PI, 0, 0], scale: [0.04, 0.12, 0.04], line: 0 }));
  }
  head.add(part(GEO.cone, tooth, { pos: [0, -0.17, 1.15], rot: [Math.PI, 0, 0], scale: [0.05, 0.16, 0.05], line: 0 }));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.2, 0.18);
  head.add(jaw);
  jaw.add(part(GEO.box, belly, { pos: [0, -0.04, 0.52], scale: [0.48, 0.14, 0.92], line: 0.014 }));
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) jaw.add(part(GEO.cone, tooth, { pos: [s * 0.2, 0.07, 0.24 + i * 0.17], scale: [0.035, 0.11, 0.035], line: 0 }));
  }
  jaw.add(part(GEO.box, toon('#5a2a32'), { pos: [0, 0.03, 0.5], scale: [0.36, 0.02, 0.8], line: 0 }));
  for (const s of [-1, 1]) {
    head.add(part(GEO.sphereLo, toon('#120c18'), { pos: [s * 0.31, 0.1, 0.42], scale: [0.11, 0.09, 0.08], line: 0 }));
    head.add(part(GEO.sphereLo, eyeMat, { pos: [s * 0.34, 0.1, 0.46], scale: [0.06, 0.05, 0.04], line: 0 }));
    // barbilhões pendendo do focinho e barbatanas atrás da cabeça
    head.add(part(GEO.cyl, scaleDark, { pos: [s * 0.22, -0.32, 0.95], rot: [0.3, 0, s * 0.15], scale: [0.025, 0.45, 0.025], line: 0 }));
    const hf = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.55, 0.12), new THREE.Vector2(0.1, 0.5)]);
    head.add(part(new THREE.ShapeGeometry(hf), fin, { pos: [s * 0.45, 0.05, -0.3], rot: [0, s * 2.2, 0.3 * s], line: 0.01 }));
  }

  // nadadeiras dianteiras: braço e mão palmada com garras
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.72, 1.05, 1.05);
    body.add(arm);
    arm.add(part(limbGeo(0.2, 0.62, 0.15), scale, { line: 0.014 }));
    const fore = new THREE.Group();
    fore.position.y = -0.62;
    arm.add(fore);
    fore.add(part(limbGeo(0.15, 0.45, 0.12), scale, { line: 0.012 }));
    fore.add(part(GEO.sphere, fin, { pos: [0, -0.5, 0.12], scale: [0.26, 0.06, 0.32], line: 0.01 }));
    for (let k = 0; k < 3; k++) fore.add(part(GEO.cone, tooth, { pos: [(k - 1) * 0.12, -0.52, 0.42], rot: [Math.PI / 2, 0, 0], scale: [0.03, 0.12, 0.03], line: 0 }));
    arms.push({ arm, fore, s });
  }
  // nadadeiras traseiras, curtas
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.62, 0.7, -0.85);
    body.add(leg);
    leg.add(part(limbGeo(0.17, 0.45, 0.12), scale, { line: 0.012 }));
    leg.add(part(GEO.sphere, fin, { pos: [0, -0.5, 0.15], scale: [0.24, 0.05, 0.34], line: 0.01 }));
    legs.push({ leg, s });
  }
  // velas dorsais: triângulos com raios claros
  const sails = [];
  for (const [z, h, l] of [[0.75, 1.05, 0.9], [-0.15, 0.85, 0.85], [-0.95, 0.6, 0.7]]) {
    const sh = new THREE.Shape([new THREE.Vector2(-l / 2, 0), new THREE.Vector2(l / 2, 0), new THREE.Vector2(-l * 0.2, h)]);
    const sail = new THREE.Group();
    sail.position.set(0, 1.72, z);
    body.add(sail);
    sail.add(part(new THREE.ShapeGeometry(sh), fin, { rot: [0, Math.PI / 2, 0], line: 0.012 }));
    for (let k = 0; k < 3; k++) sail.add(part(GEO.cyl, finEdge, { pos: [0, h * 0.35, (k - 1) * l * 0.28 + l * 0.05], rot: [(k - 1) * -0.4, 0, 0], scale: [0.018, h * 0.7, 0.018], line: 0 }));
    sails.push(sail);
  }
  // cauda em 5 gomos afinando até a barbatana
  const tail = [];
  let parent = body;
  let pos = [0, 0.95, -1.35];
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group();
    seg.position.set(...pos);
    parent.add(seg);
    const r = 0.58 - i * 0.1;
    seg.add(part(GEO.sphere, scale, { pos: [0, 0, -0.38], scale: [r, r * 0.85, 0.55], line: 0.016 }));
    if (i < 4) seg.add(part(GEO.cone, finEdge, { pos: [0, r * 0.85, -0.38], scale: [0.06, 0.22, 0.06], line: 0 }));
    tail.push(seg);
    parent = seg;
    pos = [0, -0.03, -0.72];
  }
  {
    const tf = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.9, -0.5), new THREE.Vector2(0.35, 0), new THREE.Vector2(0.9, 0.55)]);
    tail[4].add(part(new THREE.ShapeGeometry(tf), fin, { pos: [0, 0, -0.55], rot: [0, Math.PI / 2, 0], line: 0.012 }));
  }
  // lascas do Silêncio orbitando
  const shards = [];
  for (let i = 0; i < 5; i++) {
    const sh = part(GEO.oct, toon('#c4cad8'), { scale: [0.06, 0.18, 0.06], line: 0.006 });
    sh.userData = { a: (i / 5) * Math.PI * 2, r: 1.5, y: 1.6 + (i % 2) * 0.5, spin: 0.7 + i * 0.12 };
    root.add(sh);
    shards.push(sh);
  }
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = false; } });
  const m = { root, body, chest, neck, head, jaw, arms, legs, sails, tail, shards, flash: makeFlashable(root), height: 2.7 };
  m.cur = { open: 0.1, coil: 0, crouch: 0, reach: 0, walk: 0, roll: 0, rear: 0 };
  return m;
}

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => x * x * (3 - 2 * x);

// state: dormant | awaken | idle | walk | tailWarn | tailHit | lungeWarn | lunge | lungeEnd | basicWarn | basicHit | recover | dead
function animateIpupiara(m, state, t, p, dt) {
  let open = 0.12, coil = 0, crouch = 0, reach = 0, walk = 0, roll = 0, rear = 0;
  if (state === 'walk') walk = 1;
  if (state === 'tailWarn') { coil = ease(Math.min(1, p * 1.4)); crouch = 0.3; }
  if (state === 'tailHit') coil = lerp(1, -1.1, ease(Math.min(1, p * 2.2)));
  if (state === 'lungeWarn') { crouch = ease(Math.min(1, p * 1.3)); open = 0.5; }
  if (state === 'lunge') { reach = 1; open = 0.8; }
  if (state === 'lungeEnd') { reach = 1 - p; open = 0.4; crouch = 0.3 * (1 - p); }
  if (state === 'basicWarn') { reach = -0.5; open = 0.9; rear = 0.3; }
  if (state === 'basicHit') { reach = 0.9 - p * 0.9; open = Math.max(0, 0.9 - p * 4); }
  if (state === 'recover') { crouch = 0.25; open = 0.35 + Math.sin(t * 6) * 0.1; }
  if (state === 'awaken') { rear = 0.6 * Math.sin(Math.min(1, p) * Math.PI); open = 0.9; }
  if (state === 'dead') { roll = ease(Math.min(1, p * 1.5)); open = 0.6; }
  const k = state === 'dead' ? 1 : 1 - Math.exp(-dt * 10);
  const c = m.cur;
  for (const [key, v] of Object.entries({ open, coil, crouch, reach, walk, roll, rear })) c[key] = lerp(c[key], v, k);

  const ph = t * 5;
  m.body.position.set(Math.sin(ph) * 0.06 * c.walk, -0.28 * c.crouch + Math.sin(t * 1.8) * 0.04, c.reach * 0.5);
  m.body.rotation.set(-0.08 * c.crouch - 0.25 * c.rear + 0.12 * c.reach, Math.sin(ph * 0.5) * 0.1 * c.walk + c.coil * 0.35, c.roll * 1.45);
  m.neck.rotation.x = -0.35 + 0.55 * c.crouch + 0.45 * c.reach - 0.3 * c.rear + Math.sin(t * 1.3) * 0.04;
  m.head.rotation.x = 0.1 - 0.25 * c.open + 0.2 * c.crouch;
  m.jaw.rotation.x = 0.05 + c.open * 0.75;
  for (const { arm, fore, s } of m.arms) {
    const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI));
    arm.rotation.x = -0.25 - sw * 0.5 * c.walk - 0.6 * c.reach + 0.3 * c.crouch - 0.7 * c.rear;
    arm.rotation.z = s * (0.35 + 0.15 * c.crouch);
    fore.rotation.x = -0.4 + Math.max(0, sw) * 0.4 * c.walk;
  }
  for (const { leg, s } of m.legs) leg.rotation.x = Math.sin(ph + (s > 0 ? Math.PI : 0)) * 0.4 * c.walk + 0.3;
  m.tail.forEach((seg, i) => {
    seg.rotation.y = Math.sin(t * 2.4 - i * 0.7) * (0.12 + 0.12 * c.walk) + c.coil * 0.42;
    seg.rotation.x = 0.04 + Math.sin(t * 1.6 - i * 0.5) * 0.03 - c.rear * 0.1;
  });
  m.sails.forEach((s, i) => { s.rotation.z = Math.sin(t * 3 + i) * 0.05; s.scale.y = 1 + c.crouch * 0.25; });
  m.shards.forEach((s, i) => {
    const d = s.userData;
    const a = d.a + t * d.spin;
    s.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 2 + i) * 0.1, Math.sin(a) * d.r);
    s.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.3);
    s.visible = state !== 'dead';
  });
}

export class Ipupiara {
  constructor(G, parent) {
    this.G = G;
    this.name = 'Ipupiara';
    this.model = buildIpupiaraModel();
    parent.add(this.model.root);
    this.pos = this.model.root.position;
    this.radius = IPUPIARA.radius;
    this.maxHp = IPUPIARA.hp;
    this.isBoss = true;
    this.solid = true;
    this.height = this.model.height;
    this.reset();
  }

  // Dorme no mar, ao norte do deque; no despertar salta para cima das tábuas
  reset() {
    const c = WORLD.arenaCenter;
    this.home = new THREE.Vector3(c.x, 0, c.z - 2.5);
    this.from = new THREE.Vector3(c.x + 1, -2.6, c.z - 15.5);
    this.pos.copy(this.from);
    this.model.root.visible = false;
    this.hp = this.maxHp;
    this.alive = true;
    this.targetable = false;
    this.solid = true;
    this.state = 'dormant';
    this.st = 0;
    this.t = 0;
    this.step = 0;
    this.facing = Math.PI;
    this.flash = 0;
    this.defeated = false;
    this.lastHitId = -1;
    this.basicCd = 0;
    this.resume = null;
    this.charge = null;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    this.model.root.rotation.set(0, Math.PI, 0);
    this.model.cur.roll = 0;
    this.leapt = this.landed = this.sunk = false;
  }

  awaken() {
    this.model.root.visible = true;
    this.setState('awaken');
  }

  begin() {
    this.pos.copy(this.home);
    this.targetable = true;
    this.setState('intro');
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  toPlayer() {
    const pl = this.G.player;
    return new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
  }

  forward() {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  inDeck(x, z, margin) {
    const c = WORLD.arenaCenter;
    return Math.hypot(x - c.x, z - c.z) < WORLD.arenaRadius - margin;
  }

  nextInCycle() {
    const s = CYCLE[this.step % CYCLE.length];
    this.step++;
    const G = this.G;
    const dir = this.toPlayer().normalize();
    if (s === 'approach' || s === 'recover') return this.setState(s);
    if (s === 'tail') {
      // vira a cauda para o herói; o cone sai do centro para trás
      this.setState('tailWarn');
      this.facing = Math.atan2(-dir.x, -dir.z);
      this.shape = { x: this.pos.x, z: this.pos.z, radius: IPUPIARA.tail.range + this.radius, angleDeg: IPUPIARA.tail.angle, dir };
      this.tg = G.tg.add({ ...this.shape, color: '#ff3a32' });
      G.audio.play('warn', IPUPIARA.tail.warn);
      return;
    }
    if (s === 'lunge') {
      this.setState('lungeWarn');
      this.facing = Math.atan2(dir.x, dir.z);
      // a faixa termina antes da borda do deque
      let len = IPUPIARA.lunge.length;
      for (; len > 2; len -= 0.25) if (this.inDeck(this.pos.x + dir.x * len, this.pos.z + dir.z * len, 1.6)) break;
      this.shape = { x: this.pos.x, z: this.pos.z, radius: IPUPIARA.lunge.width / 2, length: len, dir };
      this.tg = G.tg.add({ ...this.shape, color: '#ff8a2a' });
      G.audio.play('warn', IPUPIARA.lunge.warn);
      G.hud.log('O Ipupiara se encolhe — vai arremeter!', 'bad');
    }
  }

  takeHit(dmg, { heavy, actionId, dot }) {
    if (!this.alive || !this.targetable || actionId === this.lastHitId) return;
    this.lastHitId = actionId;
    const G = this.G;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 1;
    G.fx.text(this.pos.clone().setY(3.1), String(dmg), dot ? 'dmg poison' : heavy ? 'dmg big' : 'dmg');
    if (!dot) G.fx.burst(heavy ? 'hitBig' : 'hit', this.pos.clone().setY(1.5));
    if (this.hp <= 0) this.defeat();
  }

  defeat() {
    const G = this.G;
    this.alive = false;
    this.defeated = true;
    this.targetable = false;
    this.solid = false;
    if (this.tg) G.tg.remove(this.tg);
    this.tg = null;
    this.charge = null;
    this.setState('dead');
    // afunda pela borda mais próxima
    const c = WORLD.arenaCenter;
    const out = new THREE.Vector3(this.pos.x - c.x, 0, this.pos.z - c.z);
    if (out.lengthSq() < 0.01) out.set(0, 0, -1);
    out.normalize();
    this.sinkFrom = this.pos.clone();
    this.sinkTo = new THREE.Vector3(c.x + out.x * (WORLD.arenaRadius + 2), -2.4, c.z + out.z * (WORLD.arenaRadius + 2));
    G.onDuoPart?.(this);
  }

  // Arremetida: corre pela faixa; acerta uma vez e empurra no sentido da corrida.
  runLunge(dt) {
    const G = this.G, pl = G.player, c = this.charge, sh = this.shape;
    const step = Math.min(IPUPIARA.lunge.speed * dt, c.len - c.s);
    const prev = c.s;
    c.s += step;
    this.pos.set(sh.x + sh.dir.x * c.s, 0, sh.z + sh.dir.z * c.s);
    const along = (pl.pos.x - sh.x) * sh.dir.x + (pl.pos.z - sh.z) * sh.dir.z;
    const side = Math.abs((pl.pos.x - sh.x) * sh.dir.z - (pl.pos.z - sh.z) * sh.dir.x);
    if (!c.hit && pl.alive && !pl.adrift && side <= sh.radius + pl.radius && along >= prev - 0.5 && along <= c.s + this.radius + 0.6) {
      c.hit = true;
      if (pl.takeDamage(IPUPIARA.lunge.dmg, 'Arremetida do Ipupiara')) pl.shove(sh.dir, IPUPIARA.lunge.shove);
      G.fx.burst('hitBig', pl.pos.clone().setY(1.2));
    }
    if (Math.random() < dt * 20) G.fx.burst('splash', this.pos.clone().setY(0.2), { n: 2 });
    return c.s >= c.len - 1e-3;
  }

  // Mordida: golpe comum, sem marcação no chão nem som de aviso (como os básicos dos outros chefes)
  tryBasic(toP, dist) {
    const b = IPUPIARA.basic, pl = this.G.player;
    if (this.basicCd > 0 || !pl.alive || pl.hidden || pl.adrift || dist > b.range + this.radius - 0.2) return false;
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
    let walking = false;

    if (!pl.alive && !['dormant', 'awaken', 'dead', 'playerDown'].includes(this.state)) {
      if (this.tg) G.tg.remove(this.tg);
      this.tg = null;
      this.charge = null;
      this.setState('playerDown');
    }

    switch (this.state) {
      case 'dormant':
        break;
      case 'awaken': {
        // nada sob a água, salta em arco e cai no deque
        const D = CINEMATIC.encounter.awaken, k = Math.min(1, this.st / D);
        const lift = Math.max(0, (k - 0.35) / 0.65);
        this.pos.lerpVectors(this.from, this.home, ease(lift));
        const under = this.from.y + Math.min(1, k / 0.35) * 1.2;   // sobe até perto da tona antes do salto
        this.pos.y = lift >= 1 ? 0 : lerp(under, 0, lift) + Math.sin(lift * Math.PI) * 3.2;
        this.facing = Math.atan2(toP.x, toP.z);
        if (!this.leapt && lift > 0) {
          this.leapt = true;
          G.fx.burst('splash', this.from.clone().setY(0), { n: 50 });
          G.audio.play('splash');
        }
        if (!this.landed && lift >= 1) {
          this.landed = true;
          G.fx.burst('splash', this.home.clone().setY(0.2), { n: 30 });
          G.audio.play('impact');
        }
        break;
      }
      case 'intro':
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.st >= IPUPIARA.startWait) this.nextInCycle();
        break;
      case 'approach': {
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.tryBasic(toP, dist)) break;
        const reach = IPUPIARA.approachRange + this.radius + pl.radius;
        if (dist <= reach || this.st >= IPUPIARA.approachMax) this.nextInCycle();
        else if (!pl.adrift) {
          const v = toP.normalize().multiplyScalar(IPUPIARA.speed * dt);
          if (this.inDeck(this.pos.x + v.x, this.pos.z + v.z, 1 + this.radius)) this.pos.set(this.pos.x + v.x, 0, this.pos.z + v.z);
          walking = true;
        }
        break;
      }
      case 'tailWarn':
        G.tg.setProgress(this.tg, this.st / IPUPIARA.tail.warn);
        if (this.st >= IPUPIARA.tail.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && !pl.adrift && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) {
            const out = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
            if (pl.takeDamage(IPUPIARA.tail.dmg, 'Rabada do Ipupiara')) pl.shove(out, IPUPIARA.tail.shove);
          }
          G.fx.burst('splash', this.pos.clone().addScaledVector(this.shape.dir, 3).setY(0.4), { n: 22 });
          G.audio.play('swingBig');
          this.setState('tailHit');
        }
        break;
      case 'tailHit':
        if (this.st >= TAIL_HIT) this.nextInCycle();
        break;
      case 'lungeWarn':
        G.tg.setProgress(this.tg, this.st / IPUPIARA.lunge.warn);
        if (this.st >= IPUPIARA.lunge.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          G.audio.play('roar');
          this.charge = { s: 0, len: this.shape.length, hit: false };
          this.setState('lunge');
        }
        break;
      case 'lunge':
        if (this.runLunge(dt)) {
          this.charge = null;
          this.setState('lungeEnd');
        }
        break;
      case 'lungeEnd':
        if (this.st >= LUNGE_END) this.nextInCycle();
        break;
      case 'recover':
        if (this.st >= IPUPIARA.recover) this.nextInCycle();
        else if (this.st >= IPUPIARA.recover * 0.5) this.tryBasic(toP, dist);
        break;
      case 'basicWarn':
        if (this.st >= IPUPIARA.basic.windup) {
          if (pl.alive && !pl.adrift && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(IPUPIARA.basic.dmg, 'Mordida');
          G.audio.play('bite');
          this.setState('basicHit');
        }
        break;
      case 'basicHit':
        if (this.st >= IPUPIARA.basic.hit) {
          const r = this.resume;
          this.resume = null;
          this.state = r ? r.state : 'recover';
          this.st = r ? r.st + IPUPIARA.basic.windup + IPUPIARA.basic.hit : 0;
        }
        break;
      case 'dead': {
        // tomba de lado, escorrega até a borda e afunda
        const k = Math.max(0, Math.min(1, (this.st - 0.8) / (DEAD - 0.8)));
        this.pos.lerpVectors(this.sinkFrom, this.sinkTo, ease(k));
        if (k > 0 && !this.sunk && k > 0.55) {
          this.sunk = true;
          G.fx.burst('splash', this.pos.clone().setY(0), { n: 40 });
          G.audio.play('splash');
        }
        this.model.root.visible = this.st < DEAD + 0.2;
        break;
      }
      default:
        break;
    }

    if (this.alive && !['dormant', 'awaken'].includes(this.state) && Math.random() < dt * 14) G.fx.burst('corrupt', this.pos, { n: 1 });
    this.animate(dt, walking);
  }

  animate(dt, walking) {
    const m = this.model;
    const S = this.state;
    let state = S, p = 0, time = this.t;
    if (S === 'approach') state = walking ? 'walk' : 'idle';
    else if (S === 'tailWarn') p = this.st / IPUPIARA.tail.warn;
    else if (S === 'tailHit') p = this.st / TAIL_HIT;
    else if (S === 'lungeWarn') p = this.st / IPUPIARA.lunge.warn;
    else if (S === 'lungeEnd') p = this.st / LUNGE_END;
    else if (S === 'basicHit') p = this.st / IPUPIARA.basic.hit;
    else if (S === 'awaken') p = this.st / CINEMATIC.encounter.awaken;
    else if (S === 'dead') p = this.st / DEAD;
    else if (!['lunge', 'basicWarn', 'recover', 'dormant'].includes(S)) state = 'idle';
    animateIpupiara(m, state, time, p, dt > 0 ? dt : 1 / 60);
    let diff = this.facing - m.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    m.root.rotation.y += diff * Math.min(1, dt * (S === 'tailWarn' ? 8 : 5));
    m.flash(this.flash);
  }
}
