import * as THREE from 'three';
import { PLAYER, CANGACEIRO, VAQUEIRO, MALOKA, MAR } from './config.js';
import { buildLutador, lutadorPose, animateLocs } from './lutador.js';
import { buildSkinnedCangaceiro } from './cangaceiro-asset.js';
import { buildSkinnedVaqueiro } from './vaqueiro-asset.js';
import { buildSkinnedMaloka } from './maloka-asset.js';
import { applyPose } from './rig.js';

const tmp = new THREE.Vector3();

// Heróis jogáveis (doc 19): mesmas teclas, kits diferentes. Os slots do HUD e as recargas usam os nomes
// do Capoeirista (rasteira = Q, meialua = E); no Cangaceiro Q é a Peixeira (interrompe) e E as Pistolas;
// no Vaqueiro Q é o Laço (prende e puxa; nos chefes interrompe) e E o Berrante (provoca); no Maloka Q é o
// Veneno (frasco arremessado, interrompe e envenena) e E a Fumaça (esconde e prepara a emboscada).
export const KITS = {
  capoeirista: { name: 'Capoeirista', role: 'DPS Melee', interrupt: 'Rasteira', melee: true, combo: true, autoRange: 7, speed: PLAYER.speed,
    slots: { rasteira: 'Rasteira', meialua: 'Meia-lua' } },
  cangaceiro: { name: 'Cangaceiro', role: 'DPS Ranged', interrupt: 'Peixeira', melee: false, autoRange: 13, speed: CANGACEIRO.speed,
    slots: { rasteira: 'Peixeira', meialua: 'Pistolas' } },
  vaqueiro: { name: 'Peão', role: 'Tanker', interrupt: 'Laço', melee: true, combo: false, autoRange: VAQUEIRO.laco.range, speed: VAQUEIRO.speed,
    slots: { rasteira: 'Laço', meialua: 'Berrante' } },
  maloka: { name: 'Maloka', role: 'DPS Stealth', interrupt: 'Veneno', melee: true, combo: false, autoRange: MALOKA.veneno.range, speed: MALOKA.speed,
    slots: { rasteira: 'Veneno', meialua: 'Fumaça' } },
};
const RIGS = { capoeirista: buildLutador, cangaceiro: buildSkinnedCangaceiro, vaqueiro: buildSkinnedVaqueiro, maloka: buildSkinnedMaloka };
const SHOTS = { bacamarte: 'shoot', pistolas: 'pistols', peixeira: 'throw' };

export class Player {
  constructor(G) {
    this.G = G;
    this.rig = buildLutador();
    G.scene.add(this.rig.root);
    this.pos = this.rig.root.position;
    this.radius = PLAYER.radius;
    this.heroName = 'capoeirista';
    this.kit = KITS.capoeirista;
    this.poisonSeq = 2e6;   // ids próprios dos tiques de veneno (takeHit ignora id repetido)
    this.reset(new THREE.Vector3(0, 0, 8));
  }

  // Troca o modelo e o kit, mantendo posição, vida e estado.
  setHero(name) {
    if (name === this.heroName || !KITS[name]) return;
    const old = this.rig.root;
    this.rig = RIGS[name]();
    this.rig.root.position.copy(old.position);
    this.rig.root.rotation.y = old.rotation.y;
    this.G.scene.remove(old);
    this.G.scene.add(this.rig.root);
    this.pos = this.rig.root.position;
    this.heroName = name;
    this.kit = KITS[name];
    this.action = null;
    this.lastVisualAction = null;
    this.dropRope();
    this.clearStealth();
  }

  cdMax(slot) {
    if (slot === 'dodge') return PLAYER.dodge.cd;
    if (this.heroName === 'cangaceiro') return (slot === 'rasteira' ? CANGACEIRO.peixeira : CANGACEIRO.pistolas).cd;
    if (this.heroName === 'vaqueiro') return (slot === 'rasteira' ? VAQUEIRO.laco : VAQUEIRO.berrante).cd;
    if (this.heroName === 'maloka') return (slot === 'rasteira' ? MALOKA.veneno : MALOKA.fumaca).cd;
    return slot === 'rasteira' ? PLAYER.rasteira.cd : PLAYER.meiaLua.cd;
  }

  reset(spawn) {
    this.pos.copy(spawn);
    this.facing = Math.PI;
    this.vy = 0;
    this.y = 0;
    this.hp = PLAYER.hp;
    this.alive = true;
    this.action = null;
    this.comboIndex = 0;
    this.comboTimer = 0;
    this.queued = false;
    this.cd = { rasteira: 0, meialua: 0, dodge: 0 };
    this.dodge = null;
    this.hitReact = 0;
    this.flash = 0;
    this.target = null;
    this.moving = 0;
    this.victory = false;
    this.animT = 0;
    this.actionSeq = 0;
    this.push = null;
    this.swim = null;
    this.moveMul = 1;
    this.rig.root.rotation.y = this.facing;
    this.dropRope();
    this.clearStealth();
  }

  get grounded() {
    return this.y <= 0.0001;
  }

  // Maloka dentro de uma nuvem de fumaça (ou há menos de `linger` s fora dela): os inimigos comuns perdem o
  // rastro e os chefes não usam o golpe básico nele (enemies.js, boss.js, mula.js).
  get hidden() {
    return this.heroName === 'maloka' && this.alive && this.unseen > 0;
  }

  // Empurrado ou na água (Porto, doc 25): sem controle até a corrente devolver o herói ao deque
  get adrift() {
    return !!(this.push || this.swim);
  }

  get invulnerable() {
    return this.dodge && this.dodge.t >= PLAYER.dodge.iStart && this.dodge.t < PLAYER.dodge.iEnd;
  }

  forward() {
    return tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  // ---------- Alvo ----------
  targetables() {
    return this.G.enemies().filter((e) => e.alive && e.targetable);
  }

  cycleTarget() {
    const list = this.targetables()
      .map((e) => ({ e, d: e.pos.distanceTo(this.pos) }))
      .filter((o) => o.d < 14)
      .sort((a, b) => a.d - b.d);
    if (!list.length) {
      this.target = null;
      return;
    }
    const i = list.findIndex((o) => o.e === this.target);
    this.target = list[(i + 1) % list.length].e;
  }

  autoTarget() {
    if (this.target && this.target.alive && this.target.pos.distanceTo(this.pos) < 14) return;
    const f = this.forward().clone();
    let best = null;
    let bestScore = Infinity;
    for (const e of this.targetables()) {
      const d = e.pos.distanceTo(this.pos);
      if (d > this.kit.autoRange) continue;
      const dir = e.pos.clone().sub(this.pos).setY(0).normalize();
      const score = d - dir.dot(f) * 2;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    this.target = best;
  }

  faceTarget() {
    if (!this.target || !this.target.alive) return;
    const dx = this.target.pos.x - this.pos.x;
    const dz = this.target.pos.z - this.pos.z;
    if (Math.hypot(dx, dz) < (this.kit.melee ? PLAYER.reach + 3 : this.kit.autoRange + 3)) this.facing = Math.atan2(dx, dz);
  }

  inReach(e, reach = PLAYER.reach) {
    return Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) <= reach + (e.radius - 0.65);
  }

  // ---------- Comandos ----------
  canAct() {
    return this.alive && !this.victory && this.grounded && !this.dodge;
  }

  attack() {
    if (!this.alive || this.victory) return;
    if (!this.grounded || this.dodge) return this.reject();
    if (!this.kit.melee) return this.action ? undefined : this.shoot('bacamarte');
    if (this.action) {
      // Encadeia o próximo golpe se já passou do impacto
      if (this.action.kind === 'combo' && this.action.t > this.action.hit * 0.8) this.queued = true;
      return;
    }
    this.startCombo();
  }

  startCombo() {
    this.autoTarget();
    this.faceTarget();
    if (!this.kit.combo) {   // Vaqueiro (gancho) e Maloka (navalhada): um golpe por vez (encadeia como o combo)
      const maloka = this.heroName === 'maloka';
      const c = maloka ? MALOKA.navalha : VAQUEIRO.attack;
      this.action = { kind: 'combo', anim: maloka ? 'slash' : 'attack', t: 0, dur: c.dur, hit: c.hit, dmg: c.dmg, arc: 110, reach: c.reach, done: false, step: 0, id: ++this.actionSeq };
      this.G.audio.play('swing');
      return;
    }
    if (this.comboTimer <= 0) this.comboIndex = 0;
    const c = PLAYER.combo[this.comboIndex];
    this.action = { kind: 'combo', anim: 'combo' + this.comboIndex, t: 0, dur: c.dur, hit: c.hit, dmg: c.dmg, arc: 110, reach: PLAYER.reach, done: false, step: this.comboIndex, id: ++this.actionSeq };
    this.comboIndex = (this.comboIndex + 1) % PLAYER.combo.length;
    this.comboTimer = PLAYER.comboWindow;
    this.G.audio.play(c.dmg > 40 ? 'swingBig' : 'swing');
  }

  skill(name) {
    if (!this.canAct() || this.action) return this.reject();
    if (!this.kit.melee) return this.shoot(name === 'rasteira' ? 'peixeira' : 'pistolas', name);
    if (this.heroName === 'vaqueiro') return name === 'rasteira' ? this.lasso() : this.horn();
    if (this.heroName === 'maloka') return name === 'rasteira' ? this.poison() : this.smokeBomb();
    const cfg = name === 'rasteira' ? PLAYER.rasteira : PLAYER.meiaLua;
    if (this.cd[name] > 0) return this.reject('Recarregando');
    this.autoTarget();
    const reach = name === 'rasteira' ? PLAYER.reach : cfg.radius;
    const anyInReach = this.targetables().some((e) => this.inReach(e, reach));
    if (!anyInReach) return this.reject('Fora de alcance');
    this.faceTarget();
    this.cd[name] = cfg.cd;
    this.action = {
      kind: name, anim: name === 'rasteira' ? 'rasteira' : 'meialua', t: 0, dur: cfg.dur, hit: cfg.hit, dmg: cfg.dmg,
      arc: name === 'rasteira' ? 200 : 360, reach, done: false, interrupts: name === 'rasteira', id: ++this.actionSeq,
    };
    this.G.audio.play('swingBig');
    this.G.hud.flashSlot(name);
  }

  // Cangaceiro: a ação dispara um projétil da boca da arma em cada instante de impacto do config.js.
  // O tiro do bacamarte (J) sai mesmo sem alvo; Peixeira e Pistolas pedem um alvo ao alcance.
  shoot(kind, slot) {
    const c = CANGACEIRO[kind];
    if (slot && this.cd[slot] > 0) return this.reject('Recarregando');
    this.autoTarget();
    if (slot && !(this.target && this.inReach(this.target, c.range))) return this.reject('Fora de alcance');
    this.faceTarget();
    if (slot) {
      this.cd[slot] = c.cd;
      this.G.hud.flashSlot(slot);
    }
    this.action = { kind, anim: SHOTS[kind], t: 0, dur: c.dur, hits: c.hits || [c.hit], fired: 0, id: ++this.actionSeq };
  }

  fire(a, i) {
    const c = CANGACEIRO[a.kind];
    const muzzle = { bacamarte: 'Muzzle_Bacamarte', peixeira: 'Muzzle_Peixeira' }[a.kind] || (i % 2 ? 'Muzzle_Pistol_L' : 'Muzzle_Pistol_R');
    const from = this.rig.muzzle(muzzle, new THREE.Vector3());
    let dir = this.forward().clone();
    const t = this.target;
    if (t && t.alive && this.inReach(t, c.range * 1.15)) {
      const to = t.pos.clone().sub(from).setY(0);
      if (to.lengthSq() > 1e-4) dir = to;
    }
    const knife = a.kind === 'peixeira';
    this.G.projectiles.fire({ from, dir, speed: c.shot, range: c.range, dmg: c.dmg, kind: knife ? 'knife' : 'bullet',
      interrupts: knife, heavy: a.kind === 'bacamarte', size: a.kind === 'bacamarte' ? 0.07 : 0.045 });
    this.G.audio.play(knife ? 'throw' : a.kind === 'bacamarte' ? 'shotBig' : 'shot');
    if (!knife) this.G.fx.burst('fire', from, { n: a.kind === 'bacamarte' ? 8 : 4 });
  }

  // ---------- Vaqueiro ----------
  // Laço (Q): pede um alvo ao alcance; no instante do arremesso a corda voa até ele. Inimigo comum fica
  // preso e é arrastado (clipe 'pull', com o lado esquerdo voltado para ele); chefe só é interrompido.
  lasso() {
    const c = VAQUEIRO.laco;
    if (this.cd.rasteira > 0) return this.reject('Recarregando');
    this.autoTarget();
    if (!(this.target && this.inReach(this.target, c.range))) return this.reject('Fora de alcance');
    this.faceTarget();
    this.cd.rasteira = c.cd;
    this.G.hud.flashSlot('rasteira');
    this.action = { kind: 'laco', anim: 'lasso', t: 0, dur: c.dur, hit: c.hit, done: false, target: this.target, id: ++this.actionSeq };
    this.G.audio.play('swing');
  }

  throwRope(a) {
    const t = a.target;
    if (!t || !t.alive) return;
    const from = this.rig.muzzle('R_Hand', new THREE.Vector3());
    this.rope = { target: t, t: 0, fly: Math.max(.08, from.distanceTo(t.pos) / VAQUEIRO.laco.rope), id: a.id, latched: false };
    this.G.audio.play('throw');
  }

  latch(r) {
    const t = r.target, c = VAQUEIRO.laco;
    r.latched = true;
    t.takeHit(c.dmg, { interrupts: true, from: this.pos, heavy: false, actionId: r.id });
    if (t.isBoss || !t.alive) { this.dropRope(); return; }   // chefes: só interrompe a conjuração
    t.hold?.(c.hold);
    const dir = t.pos.clone().sub(this.pos).setY(0);
    const d = Math.max(.01, dir.length()); dir.divideScalar(d);
    // Lado esquerdo do vaqueiro voltado para o preso: a captura puxa a corda pela esquerda.
    this.facing = Math.atan2(dir.x, dir.z) - Math.PI / 2;
    const to = this.pos.clone().addScaledVector(dir, Math.min(d, VAQUEIRO.pull.to + t.radius));
    this.action = { kind: 'pull', anim: 'pull', t: 0, dur: VAQUEIRO.pull.dur, target: t, from: t.pos.clone(), to, id: ++this.actionSeq };
    this.G.fx.burst('dust', t.pos, { n: 8 });
    this.G.audio.play('impact');
  }

  dropRope() {
    this.rope = null;
    if (this.ropeMesh) this.ropeMesh.visible = false;
  }

  // Corda: cilindro fino da mão direita até o alvo (no ar, cresce até ele).
  updateRope(dt) {
    const r = this.rope;
    if (!r) return;
    if (!r.target.alive || !this.alive) return this.dropRope();
    r.t += dt;
    if (!r.latched && r.t >= r.fly) this.latch(r);
    if (!this.rope) return;
    if (r.latched && !(this.action && this.action.kind === 'pull')) return this.dropRope();
    if (!this.ropeMesh) {
      this.ropeMesh = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 6).translate(0, .5, 0).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#c9a072' }));
      this.G.scene.add(this.ropeMesh);
    }
    const from = this.rig.muzzle('R_Hand', new THREE.Vector3());
    const to = r.target.pos.clone().setY(1.0);
    const k = r.latched ? 1 : Math.min(1, r.t / r.fly);
    const end = from.clone().lerp(to, k);
    this.ropeMesh.visible = true;
    this.ropeMesh.position.copy(from);
    this.ropeMesh.lookAt(end);
    this.ropeMesh.scale.set(1, 1, Math.max(.01, from.distanceTo(end)));
  }

  // Berrante (E): todos os inimigos no raio passam a perseguir o vaqueiro (provocação).
  horn() {
    const c = VAQUEIRO.berrante;
    if (this.cd.meialua > 0) return this.reject('Recarregando');
    this.cd.meialua = c.cd;
    this.G.hud.flashSlot('meialua');
    this.action = { kind: 'berrante', anim: 'taunt', t: 0, dur: c.dur, hit: c.hit, done: false, id: ++this.actionSeq };
  }

  blowHorn() {
    const c = VAQUEIRO.berrante;
    let n = 0;
    for (const e of this.G.enemies()) {
      if (!e.alive || Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) > c.radius) continue;
      if (e.taunt) { e.taunt(c.taunt); n++; }
    }
    this.G.fx.ring(this.pos, '#ffd27a', c.radius, 0.7, 0.1, 0.25);
    this.G.audio.play('horn');
    if (n) this.G.hud.log(`Berrante: ${n} ${n > 1 ? 'inimigos vêm' : 'inimigo vem'} até você.`, 'good');
  }

  // ---------- Maloka ----------
  // Veneno (Q): pede um alvo ao alcance; no instante do arremesso o frasco sai da mão em direção a ele.
  // Acerta o primeiro inimigo do caminho: interrompe conjurações e deixa veneno (dano por segundo).
  poison() {
    const c = MALOKA.veneno;
    if (this.cd.rasteira > 0) return this.reject('Recarregando');
    this.autoTarget();
    if (!(this.target && this.inReach(this.target, c.range))) return this.reject('Fora de alcance');
    this.faceTarget();
    this.cd.rasteira = c.cd;
    this.G.hud.flashSlot('rasteira');
    this.action = { kind: 'veneno', anim: 'throw', t: 0, dur: c.dur, hit: c.hit, done: false, target: this.target, id: ++this.actionSeq };
    this.G.audio.play('swing');
  }

  throwFlask(a) {
    const c = MALOKA.veneno;
    const from = this.rig.muzzle('Frasco', new THREE.Vector3());
    let dir = this.forward().clone();
    const t = a.target;
    if (t && t.alive) {
      const to = t.pos.clone().sub(from).setY(0);
      if (to.lengthSq() > 1e-4) dir = to;
    }
    this.G.projectiles.fire({ from, dir, speed: c.shot, range: c.range * 1.15, dmg: c.dmg, kind: 'flask', interrupts: true,
      onHit: (e, at) => this.envenom(e, at) });
    this.G.audio.play('throw');
  }

  // Veneno: dano a cada 0,5 s por `last` s; um frasco novo no mesmo alvo renova a duração.
  envenom(e, at) {
    const c = MALOKA.veneno;
    this.G.fx.burst('poison', at);
    this.G.audio.play('glass');
    if (!e.alive) return;
    const old = this.poisons.find((p) => p.e === e);
    if (old) old.left = c.last;
    else this.poisons.push({ e, left: c.last, tick: 0 });
  }

  // Fumaça (E): a bomba estoura no chão à frente dos pés no instante do golpe; a nuvem fica no lugar.
  smokeBomb() {
    const c = MALOKA.fumaca;
    if (this.cd.meialua > 0) return this.reject('Recarregando');
    this.cd.meialua = c.cd;
    this.G.hud.flashSlot('meialua');
    this.action = { kind: 'fumaca', anim: 'smoke', t: 0, dur: c.dur, hit: c.hit, done: false, id: ++this.actionSeq };
  }

  popSmoke() {
    const c = MALOKA.fumaca;
    const at = this.pos.clone().addScaledVector(this.forward(), 0.4);
    this.smokes.push({ x: at.x, z: at.z, t: 0 });
    this.G.fx.smoke(at, c.radius, c.last);
    this.G.audio.play('smoke');
    this.ambush = true;
    this.unseen = c.linger;
    this.G.fx.text(this.pos.clone().setY(2.3), 'Sumiu!', 'info stealth');
    this.G.hud.log('Cortina de fumaça: os inimigos perdem o seu rastro.', 'good');
  }

  clearStealth() {
    this.smokes = [];
    this.poisons = [];
    this.unseen = 0;
    this.ambush = false;
    this.rig.stealth?.(0);
  }

  // Nuvens, rastro perdido e veneno, todo quadro.
  updateStealth(dt) {
    const c = MALOKA.fumaca;
    this.smokes = this.smokes.filter((s) => (s.t += dt) < c.last);
    const inside = this.smokes.some((s) => Math.hypot(this.pos.x - s.x, this.pos.z - s.z) <= c.radius);
    this.unseen = inside ? c.linger : Math.max(0, this.unseen - dt);
    if (!this.unseen) this.ambush = false;
    const v = MALOKA.veneno;
    this.poisons = this.poisons.filter((p) => {
      if (!p.e.alive) return false;
      p.left -= dt;
      p.tick += dt;
      if (p.tick >= 0.5) {
        p.tick -= 0.5;
        p.e.takeHit(Math.round(v.dps * 0.5), { from: p.e.pos, dot: true, actionId: ++this.poisonSeq });
        this.G.fx.burst('poisonTick', p.e.pos.clone().setY(1.2));
      }
      return p.left > 0;
    });
  }

  startDodge(moveDir) {
    if (!this.alive || this.victory || !this.grounded || this.dodge) return;
    if (this.cd.dodge > 0) return this.reject('Recarregando');
    // Esquiva cancela apenas a sequência de golpes; Rasteira e Meia-lua precisam terminar
    if (this.action && this.action.kind !== 'combo' && this.action.kind !== 'bacamarte') return this.reject();
    this.action = null;
    this.dropRope();
    this.queued = false;
    const dir = moveDir.lengthSq() > 0 ? moveDir.clone().normalize() : this.forward().clone().multiplyScalar(-1);
    this.facing = Math.atan2(dir.x, dir.z);
    this.dodge = { t: 0, dir, back: moveDir.lengthSq() === 0 };
    this.cd.dodge = PLAYER.dodge.cd;
    this.G.audio.play('dodge');
    this.G.fx.burst('dust', this.pos, { n: 10 });
    this.G.hud.flashSlot('dodge');
  }

  jump() {
    if (!this.alive || this.victory || !this.grounded || this.action || this.dodge) return;
    this.vy = PLAYER.jump.v;
    this.y = 0.001;
    this.G.audio.play('jump');
  }

  reject(msg) {
    this.G.audio.play('deny');
    if (msg) this.G.hud.toast(msg);
  }

  // ---------- Mar (Porto de Santos, doc 25) ----------
  // Empurrão de golpes e ondas: desliza `dist` m na direção `dir` em `dur` s, sem controle e cancelando a ação.
  // No deque cercado de mar (world.overboard), passar da borda derruba o herói na água.
  shove(dir, dist, dur = 0.32) {
    if (!this.alive || this.victory || this.swim || dist <= 0) return;
    this.push = { dir: dir.clone().setY(0).normalize(), speed: dist / dur, t: 0, dur };
    this.action = null;
    this.queued = false;
    this.dodge = null;
    this.dropRope();
  }

  updatePush(dt) {
    const p = this.push, w = this.G.world;
    p.t += dt;
    const k = p.t < p.dur * 0.7 ? 1 : 0.5;
    const nx = this.pos.x + p.dir.x * p.speed * k * dt, nz = this.pos.z + p.dir.z * p.speed * k * dt;
    if (w.walkable(nx, nz)) this.pos.set(nx, 0, nz);
    else if (w.overboard?.(nx, nz)) {
      this.pos.set(nx, 0, nz);
      return this.fall();
    } else this.tryMove(nx - this.pos.x, nz - this.pos.z);
    if (p.t >= p.dur) this.push = null;
  }

  // Na água: leva dano, boia por MAR.fall.swim s e a corrente o devolve à beirada (world.rescue).
  fall() {
    const G = this.G;
    this.push = null;
    // escorrega da beirada para a água, boia e volta
    this.swim = { t: 0, start: this.pos.clone(), from: G.world.seaPoint(this.pos.x, this.pos.z), to: G.world.rescue(this.pos.x, this.pos.z) };
    G.fx.burst('splash', this.pos.clone().setY(0.2), { n: 30 });
    G.audio.play('splash');
    G.hud.toast('Caiu no mar!');
    this.takeDamage(MAR.fall.dmg, 'Caiu no mar');
  }

  updateSwim(dt) {
    const s = this.swim;
    s.t += dt;
    const back = MAR.fall.swim;
    if (s.t < 0.25) this.pos.lerpVectors(s.start, s.from, s.t / 0.25);
    else if (s.t > back) {
      const k = Math.min(1, (s.t - back) / 0.6), e = k * k * (3 - 2 * k);
      this.pos.lerpVectors(s.from, s.to, e);
      if (k >= 1) {
        this.swim = null;
        this.G.fx.burst('splash', this.pos.clone().setY(0.2), { n: 12 });
      }
    } else {
      this.pos.copy(s.from);
      if (Math.random() < dt * 6) this.G.fx.burst('splash', this.pos.clone().setY(0.1), { n: 3 });
    }
  }

  // ---------- Dano ----------
  takeDamage(amount, label) {
    if (!this.alive || this.victory) return false;
    if (this.invulnerable) {
      this.G.fx.text(this.pos.clone().setY(2.2), 'Esquiva!', 'info dodge');
      if (label) this.G.hud.log(`Você esquivou de ${label}.`, 'good');
      return false;
    }
    if (this.heroName === 'vaqueiro') amount = Math.max(1, Math.round(amount * VAQUEIRO.armor));   // armadura de couro
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    this.hitReact = 0.28;
    this.G.fx.text(this.pos.clone().setY(2.1), `-${amount}`, 'hurt');
    if (label) this.G.hud.log(`${label}: -${amount} de vida`, 'bad');
    this.G.fx.burst('hit', this.pos.clone().setY(1.1));
    this.G.audio.play('hurt');
    this.G.hud.hurt();
    if (this.hp <= 0) {
      this.alive = false;
      this.action = null;
      this.dodge = null;
      this.G.onPlayerDeath();
    }
    return true;
  }

  // Maloka: pelas costas (o inimigo de costas para ele) × navalha.back; saindo da fumaça, o 1º golpe que
  // acerta é crítico (× fumaca.crit, acumula com as costas).
  backstab(e, dmg) {
    if (this.heroName !== 'maloka') return { dmg };
    let mul = 1, tag = '';
    const away = new THREE.Vector3(this.pos.x - e.pos.x, 0, this.pos.z - e.pos.z).normalize();
    if (Number.isFinite(e.facing) && away.dot(new THREE.Vector3(Math.sin(e.facing), 0, Math.cos(e.facing))) < -0.3) {
      mul *= MALOKA.navalha.back;
      tag = 'Pelas costas!';
    }
    if (this.ambush) {
      mul *= MALOKA.fumaca.crit;
      tag = 'Emboscada!';
    }
    return { dmg: Math.round(dmg * mul), tag };
  }

  resolveHit(a) {
    const f = this.forward().clone();
    let hitAny = false, ambushed = false;
    for (const e of this.targetables()) {
      if (!this.inReach(e, a.reach)) continue;
      if (a.arc < 360) {
        const dir = e.pos.clone().sub(this.pos).setY(0);
        const d = dir.length();
        if (d > 0.5 && dir.normalize().dot(f) < Math.cos(((a.arc / 2) * Math.PI) / 180)) continue;
      }
      const { dmg, tag } = this.backstab(e, a.dmg);
      e.takeHit(dmg, { interrupts: !!a.interrupts, from: this.pos, heavy: dmg >= 50, actionId: a.id });
      if (tag) this.G.fx.text(e.pos.clone().setY((e.height || 2) + 0.9), tag, tag === 'Emboscada!' ? 'big ambush' : 'info');
      ambushed = ambushed || this.ambush;
      hitAny = true;
    }
    if (ambushed) this.ambush = false;
    if (a.kind === 'meialua') this.G.fx.ring(this.pos, '#fff1b8', a.reach, 0.35, 0.3, 0.12);
    if (a.kind === 'rasteira') this.G.fx.burst('dust', this.pos, { n: 14 });
    if (hitAny) this.G.audio.play(a.dmg >= 50 ? 'hitBig' : 'hit');
  }

  // ---------- Atualização ----------
  update(dt, input) {
    const G = this.G;
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
    this.comboTimer -= dt;
    this.hitReact = Math.max(0, this.hitReact - dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.animT += dt;
    if (this.target && !this.target.alive) this.target = null;

    const move = new THREE.Vector3();
    if (this.alive && !this.victory && !this.adrift) {
      move.set(input.axisX, 0, input.axisZ);
      if (move.lengthSq() > 1) move.normalize();
    }

    if (this.alive && !this.victory && !this.adrift) {
      if (input.pressed('Tab')) this.cycleTarget();
      if (input.pressed('attack')) this.attack();
      if (input.pressed('rasteira')) this.skill('rasteira');
      if (input.pressed('meialua')) this.skill('meialua');
      if (input.pressed('dodge')) this.startDodge(move);
      if (input.pressed('jump')) this.jump();
    }

    // Ação em curso
    let speedMul = 1;
    if (this.action) {
      const a = this.action;
      a.t += dt;
      speedMul = PLAYER.attackMoveMul;
      if (a.kind !== 'combo') speedMul = 0.15;
      if (a.hits) {
        speedMul = CANGACEIRO.moveMul;
        while (a.fired < a.hits.length && a.t >= a.hits[a.fired]) this.fire(a, a.fired++);
      } else if (a.kind === 'pull') {
        // Arrasta o preso até a frente do vaqueiro (saída suave); o vaqueiro fica plantado.
        speedMul = 0;
        const k = Math.min(1, a.t / a.dur), e = 1 - (1 - k) * (1 - k);
        if (a.target.alive) a.target.pos.lerpVectors(a.from, a.to, e);
      } else if (!a.done && a.t >= a.hit) {
        a.done = true;
        if (a.kind === 'laco') this.throwRope(a);
        else if (a.kind === 'veneno') this.throwFlask(a);
        else if (a.kind === 'fumaca') this.popSmoke();
        else if (a.kind === 'berrante') this.blowHorn();
        else this.resolveHit(a);
      }
      if (a === this.action && a.t >= a.dur) {
        this.action = null;
        if (this.queued) {
          this.queued = false;
          this.startCombo();
        }
      }
    }

    // Deslocamento
    const vel = new THREE.Vector3();
    if (this.dodge) {
      const d = this.dodge;
      d.t += dt;
      const sp = PLAYER.dodge.dist / PLAYER.dodge.dur;
      vel.copy(d.dir).multiplyScalar(sp * (d.t < PLAYER.dodge.dur * 0.8 ? 1 : 0.4));
      if (d.t >= PLAYER.dodge.dur) {
        this.dodge = null;
        G.fx.burst('dust', this.pos, { n: 5 });
      }
    } else if (move.lengthSq() > 0) {
      vel.copy(move).multiplyScalar(this.kit.speed * speedMul * this.moveMul);
      if (!this.action) {
        const want = Math.atan2(move.x, move.z);
        let diff = want - this.facing;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.facing += Math.sign(diff) * Math.min(Math.abs(diff), dt * 14);
      }
    }
    this.moving = vel.length();
    if (this.swim) this.updateSwim(dt);
    else if (this.push) this.updatePush(dt);
    else this.tryMove(vel.x * dt, vel.z * dt);

    // Pulo
    if (!this.grounded || this.vy > 0) {
      this.vy += PLAYER.jump.g * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        G.fx.burst('dust', this.pos, { n: 6 });
      }
    }

    // Empurrado para fora de inimigos
    for (const e of G.enemies()) {
      if (!e.alive || !e.solid) continue;
      const dx = this.pos.x - e.pos.x;
      const dz = this.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      const min = this.radius + e.radius;
      if (d < min && d > 0.0001) this.tryMove((dx / d) * (min - d), (dz / d) * (min - d));
    }

    if (this.heroName === 'maloka') this.updateStealth(dt);
    this.animate(dt);
    this.updateRope(dt);
  }

  tryMove(dx, dz) {
    const w = this.G.world;
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (w.walkable(nx, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (w.walkable(nx, this.pos.z)) this.pos.x = nx;
    else if (w.walkable(this.pos.x, nz)) this.pos.z = nz;
  }

  animate(dt) {
    const r = this.rig;
    let state = 'idle';
    let p = 0;
    if (this.forcePose) state = this.forcePose;
    else if (!this.alive) state = 'dead';
    else if (this.victory) state = 'victory';
    else if (this.adrift) state = 'hit';
    else if (this.dodge) {
      state = 'dodge';
      p = this.dodge.t / PLAYER.dodge.dur;
    } else if (this.action) {
      state = this.action.anim;
      p = this.action.t / this.action.dur;
    } else if (!this.grounded) state = 'jump';
    else if (this.hitReact > 0) state = 'hit';
    else if (this.moving > 0.5) state = 'run';
    const fast = state.startsWith('combo') || state === 'rasteira' || state === 'meialua' || state === 'dodge';
    if(r.skinned) {
      const actionId=this.action?.id ?? 0;
      (r.play || r.animate).call(r, state,dt,p,this.moving,actionId!==this.lastVisualAction && actionId!==0);   // play: Cangaceiro
      this.lastVisualAction=actionId;
    } else applyPose(r, lutadorPose(state, this.animT, p), dt, fast ? 28 : 14);
    // na água: afunda até o peito e boia
    r.root.position.y = this.y + (this.swim ? -0.95 + Math.sin(this.animT * 4) * 0.06 : 0);
    let diff = this.facing - r.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    r.root.rotation.y += diff * Math.min(1, dt * 20);
    if(!r.skinned) animateLocs(r, this.animT, this.moving);
    r.flash(this.flash);
    r.stealth?.(this.hidden ? 1 : 0);
  }
}
