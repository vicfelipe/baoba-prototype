import * as THREE from 'three';
import { MULA, WORLD, CINEMATIC } from './config.js';
import { buildSkinnedMula } from './mula-asset.js';
import { hitsShape } from './telegraph.js';

// Mula sem Cabeça (chefe; números em config.js MULA, proposta a validar). Ciclo sem sobreposição:
// aproximar → coice → recuperar → investida → recuperar → aproximar → empinada → Labareda → recuperar.
// Coice: vira a garupa e acerta um cone atrás. Investida: a chama cresce e fica branca, faixa no chão, corre em
// linha. Empinada: ergue-se e pisa um círculo à frente. Labareda: conjuração; a Rasteira interrompe.
// Patada (ataque básico sem aviso, MULA.basic): golpe curto à frente, com o herói perto, ao se aproximar e na 2ª metade da recuperação.

const CYCLE = ['approach', 'kick', 'recover', 'charge', 'recover', 'approach', 'stomp', 'blaze', 'recover'];
const KICK_HIT = 0.6, STOMP_HIT = 0.7, CHARGE_END = 0.7, DEAD = 2.4;

export class Mula {
  constructor(G) {
    this.G = G;
    this.name = 'Mula sem Cabeça';
    this.card = { area: 'Chefe · Terreiro do Casarão', name: 'Mula sem Cabeça', epithet: 'O fogo que corre sem rumo',
      sleep: '[Sistema] Uma brasa arde no centro do terreiro…', wake: '[Sistema] A Mula sem Cabeça desperta!', burst: 'fire' };
    this.rig = buildSkinnedMula();
    G.scene.add(this.rig.root);
    this.pos = this.rig.root.position;
    this.radius = MULA.radius;
    this.maxHp = MULA.hp;
    this.isBoss = true;
    this.solid = true;
    this.height = this.rig.height;
    this.reset();
  }

  reset() {
    this.pos.set(WORLD.arenaCenter.x, 0, WORLD.arenaCenter.z - 2);
    this.hp = this.maxHp;
    this.alive = true;
    this.targetable = false;
    this.state = 'dormant';
    this.st = 0;
    this.t = 0;
    this.step = 0;
    this.facing = 0;
    this.flash = 0;
    this.cast = null;
    this.freed = false;
    this.defeated = false;
    this.lastHitId = -1;
    this.basicCd = 0;
    this.resume = null;
    this.shownBlazeHint = false;
    this.charge = null;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    this.rig.root.rotation.y = 0;
    this.rig.setFlame(0.35, 0);
  }

  awaken() {
    this.targetable = false;
    this.setState('awaken');
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

  forward() {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  nextInCycle() {
    const s = CYCLE[this.step % CYCLE.length];
    this.step++;
    const G = this.G;
    const dir = this.toPlayer().normalize();
    if (s === 'approach' || s === 'recover') return this.setState(s);
    if (s === 'kick') {
      // vira a garupa para o herói; o cone sai do centro para trás
      this.setState('kickWarn');
      this.facing = Math.atan2(-dir.x, -dir.z);
      this.shape = { x: this.pos.x, z: this.pos.z, radius: MULA.kick.range + this.radius, angleDeg: MULA.kick.angle, dir };
      this.tg = G.tg.add({ ...this.shape, color: '#ff3a32' });
      G.audio.play('warn', MULA.kick.warn);
      return;
    }
    if (s === 'charge') {
      this.setState('chargeWarn');
      this.facing = Math.atan2(dir.x, dir.z);
      // a faixa termina na borda da arena
      const c = WORLD.arenaCenter, lim = WORLD.arenaRadius - 1.5;
      let len = MULA.charge.length;
      for (; len > 2; len -= 0.25) {
        const ex = this.pos.x + dir.x * len, ez = this.pos.z + dir.z * len;
        if (Math.hypot(ex - c.x, ez - c.z) < lim) break;
      }
      this.shape = { x: this.pos.x, z: this.pos.z, radius: MULA.charge.width / 2, length: len, dir };
      this.tg = G.tg.add({ ...this.shape, color: '#ff8a2a' });
      G.audio.play('warn', MULA.charge.warn);
      G.hud.log('A chama da Mula fica branca — ela vai investir!', 'bad');
      return;
    }
    if (s === 'stomp') {
      this.setState('stompWarn');
      this.facing = Math.atan2(dir.x, dir.z);
      const f = this.forward();
      this.shape = { x: this.pos.x + f.x * MULA.stomp.reach, z: this.pos.z + f.z * MULA.stomp.reach, radius: MULA.stomp.radius };
      this.tg = G.tg.add({ ...this.shape, color: '#ff3aa8' });
      G.audio.play('warn', MULA.stomp.warn);
      return;
    }
    if (s === 'blaze') {
      this.setState('cast');
      this.cast = { t: 0, dur: MULA.blaze.cast };
      G.audio.play('cast', MULA.blaze.cast);
      G.hud.log('A Mula sem Cabeça conjura a Labareda!', 'bad');
      if (!this.shownBlazeHint) {
        this.shownBlazeHint = true;
        G.hud.hint(`Q (${G.player.kit.interrupt}) interrompe a Labareda${G.player.kit.melee ? ' — aproxime-se!' : ''}`, 5);
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
    if (!dot) G.fx.burst(heavy ? 'hitBig' : 'hit', this.pos.clone().setY(1.6));
    if (this.hp <= 0) return this.defeat();
    if (interrupts && this.state === 'cast') {
      this.setState('stagger');
      G.fx.burst('interrupt', this.pos.clone().setY(2.5));
      G.fx.text(this.pos.clone().setY(4), 'Interrompido!', 'info good');
      G.audio.play('interrupt');
      G.hud.castBroken();
      G.hud.log('Labareda interrompida!', 'good');
    }
  }

  defeat() {
    const G = this.G;
    this.alive = false;
    this.defeated = true;
    this.targetable = false;
    if (this.tg) G.tg.remove(this.tg);
    this.tg = null;
    G.tg.clear();
    this.setState('dead');
    G.onBossDefeated(this);
  }

  // Investida: corre pela faixa; acerta uma vez quem estiver na faixa quando o peito passa.
  runCharge(dt) {
    const G = this.G, pl = G.player, c = this.charge, sh = this.shape;
    const step = Math.min(MULA.charge.speed * dt, c.len - c.s);
    const prev = c.s;
    c.s += step;
    this.pos.set(sh.x + sh.dir.x * c.s, 0, sh.z + sh.dir.z * c.s);
    const along = (pl.pos.x - sh.x) * sh.dir.x + (pl.pos.z - sh.z) * sh.dir.z;
    const side = Math.abs((pl.pos.x - sh.x) * sh.dir.z - (pl.pos.z - sh.z) * sh.dir.x);
    const front = this.radius + 0.6;
    if (!c.hit && pl.alive && side <= sh.radius + pl.radius && along >= prev - 0.5 && along <= c.s + front) {
      c.hit = true;
      pl.takeDamage(MULA.charge.dmg, 'Investida em chamas');
      G.fx.burst('hitBig', pl.pos.clone().setY(1.2));
    }
    if (Math.random() < dt * 30) G.fx.burst('fire', this.pos.clone().setY(0.3), { n: 1 });
    return c.s >= c.len - 1e-3;
  }

  // Ataque básico entre as habilidades: com o herói perto, ao se aproximar ou na 2ª metade da recuperação.
  // Golpe comum, como os dos heróis: sem marcação no chão nem som de aviso. Vira para o herói, prepara e, no
  // impacto, acerta quem estiver dentro de alcance e arco. Ao terminar, volta ao estado em que estava.
  tryBasic(toP, dist) {
    const b = MULA.basic, pl = this.G.player;
    if (this.basicCd > 0 || !pl.alive || pl.hidden || dist > b.range + this.radius - 0.2) return false;
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

    if (!pl.alive && !['dormant', 'dead', 'playerDown'].includes(this.state)) {
      if (this.tg) G.tg.remove(this.tg);
      this.tg = null;
      this.charge = null;
      this.setState('playerDown');
    }

    switch (this.state) {
      case 'dormant':
        break;
      case 'awaken':
      case 'intro':
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.state === 'intro' && this.st >= MULA.startWait) this.nextInCycle();
        break;
      case 'approach': {
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.tryBasic(toP, dist)) break;
        const reach = MULA.approachRange + this.radius + pl.radius;
        if (dist <= reach || this.st >= MULA.approachMax) this.nextInCycle();
        else {
          const v = toP.normalize().multiplyScalar(MULA.speed * dt);
          const nx = this.pos.x + v.x, nz = this.pos.z + v.z;
          if (Math.hypot(nx - WORLD.arenaCenter.x, nz - WORLD.arenaCenter.z) < WORLD.arenaRadius - 1) this.pos.set(nx, 0, nz);
          walking = true;
        }
        break;
      }
      case 'kickWarn':
        G.tg.setProgress(this.tg, this.st / MULA.kick.warn);
        if (this.st >= MULA.kick.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(MULA.kick.dmg, 'Coice');
          G.fx.burst('dust', this.pos.clone().addScaledVector(this.shape.dir, 2.4).setY(0.6));
          G.audio.play('impact');
          this.setState('kickHit');
        }
        break;
      case 'kickHit':
        if (this.st >= KICK_HIT) this.nextInCycle();
        break;
      case 'chargeWarn':
        G.tg.setProgress(this.tg, this.st / MULA.charge.warn);
        if (this.st >= MULA.charge.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          G.audio.play('swingBig');
          this.charge = { s: 0, len: this.shape.length, hit: false };
          this.setState('charge');
        }
        break;
      case 'charge':
        if (this.runCharge(dt)) {
          this.charge = null;
          G.fx.burst('dust', this.pos.clone().setY(0.4));
          this.setState('chargeEnd');
        }
        break;
      case 'chargeEnd':
        if (this.st >= CHARGE_END) this.nextInCycle();
        break;
      case 'stompWarn':
        G.tg.setProgress(this.tg, this.st / MULA.stomp.warn);
        if (this.st >= MULA.stomp.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(MULA.stomp.dmg, 'Pisada de fogo');
          G.fx.ring(new THREE.Vector3(this.shape.x, 0, this.shape.z), '#ff7a2a', this.shape.radius, 0.45, 0.25, 0.3);
          G.fx.burst('fire', new THREE.Vector3(this.shape.x, 0.4, this.shape.z), { n: 24 });
          G.audio.play('impact');
          this.setState('stompHit');
        }
        break;
      case 'stompHit':
        if (this.st >= STOMP_HIT) this.nextInCycle();
        break;
      case 'cast':
        this.cast.t = this.st;
        if (this.st >= MULA.blaze.cast) {
          // pulso de fogo em toda a arena; só a esquiva no instante certo evita
          G.fx.ring(this.pos, '#ff7a2a', WORLD.arenaRadius + 1, 0.6, 0.15, 0.25);
          G.fx.ring(this.pos, '#fff1d6', WORLD.arenaRadius + 1, 0.45, 0.2, 0.08);
          G.audio.play('pulse');
          G.hud.pulseFlash();
          if (pl.alive) pl.takeDamage(MULA.blaze.dmg, 'Labareda');
          this.setState('blazeDone');
        }
        break;
      case 'blazeDone':
        if (this.st >= 0.3) this.nextInCycle();
        break;
      case 'stagger':
        if (this.st >= MULA.recoverInterrupted) {
          this.step++;   // pula a recuperação normal do ciclo
          this.nextInCycle();
        }
        break;
      case 'recover':
        if (this.st >= MULA.recover) this.nextInCycle();
        else if (this.st >= MULA.recover * 0.5) this.tryBasic(toP, dist);
        break;
      case 'basicWarn':   // preparo do golpe (só animação)
        if (this.st >= MULA.basic.windup) {
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(MULA.basic.dmg, 'Patada');
          G.audio.play('impact');
          this.setState('basicHit');
        }
        break;
      case 'basicHit':
        if (this.st >= MULA.basic.hit) {
          const r = this.resume;
          this.resume = null;
          this.state = r ? r.state : 'recover';
          this.st = r ? r.st + MULA.basic.windup + MULA.basic.hit : 0;
        }
        break;
      default:
        break;
    }

    // Brasas
    if (this.alive && this.state !== 'dormant' && Math.random() < dt * 14) G.fx.burst('fire', this.rig.fire.getWorldPosition(new THREE.Vector3()), { n: 1 });
    this.animate(dt, walking);
  }

  animate(dt, walking) {
    const r = this.rig;
    let state = 'idle';
    let time = this.st;
    switch (this.state) {
      case 'approach': state = walking ? 'walk' : 'idle'; time = this.t; break;
      case 'kickWarn': state = 'kickWarn'; break;
      case 'kickHit': state = 'kickHit'; break;
      case 'chargeWarn': state = 'chargeWarn'; break;
      case 'charge': state = 'gallop'; break;
      case 'chargeEnd': state = 'chargeEnd'; break;
      case 'stompWarn': state = 'stompWarn'; break;
      case 'stompHit': state = 'stompHit'; break;
      case 'basicWarn': state = 'basicWarn'; break;
      case 'basicHit': state = 'basicHit'; break;
      case 'cast': state = 'cast'; break;
      case 'blazeDone': state = 'stompHit'; time = STOMP_HIT * 0.6 + this.st; break;
      case 'stagger': state = 'stagger'; break;
      case 'recover': state = 'recover'; break;
      case 'dormant': state = 'dormant'; time = this.t; break;
      case 'awaken': state = 'awaken'; break;
      case 'dead': state = 'dead'; break;
      default: state = 'idle'; time = this.t;
    }
    // Chama: brasa adormecida, acende no despertar, cresce e fica branca na investida e na Labareda, apaga ao morrer.
    const S = this.state;
    if (S === 'dormant') r.setFlame(0.35, 0);
    else if (S === 'awaken') r.setFlame(this.st < CINEMATIC.encounter.awaken * 0.3 ? 0.5 : 1.15, 0);
    else if (S === 'chargeWarn') r.setFlame(1 + 0.3 * Math.min(1, this.st / MULA.charge.warn), Math.min(1, this.st / MULA.charge.warn));
    else if (S === 'charge') r.setFlame(1.3, 1);
    else if (S === 'cast') r.setFlame(1 + 0.4 * Math.min(1, this.st / MULA.blaze.cast), 0.5 * Math.min(1, this.st / MULA.blaze.cast));
    else if (S === 'dead') r.setFlame(Math.max(0, 1 - this.st / (DEAD * 0.8)), 0);
    else r.setFlame(1, 0);
    r.animate(state, time, dt > 0 ? dt : undefined);
    let diff = this.facing - r.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    r.root.rotation.y += diff * Math.min(1, dt * (this.state === 'kickWarn' ? 9 : 6));
    r.flash(this.flash);
  }
}
