import * as THREE from 'three';
import { CURUPIRA, WORLD, CINEMATIC } from './config.js';
import { buildSkinnedCurupira } from './curupira-asset.js';
import { hitsShape } from './telegraph.js';
import { toon, part, GEO } from './toon.js';

// Curupira corrompido (doc 03 seção 4, números do doc 14). Ciclo sem sobreposição:
// aproximar → varredura → recuperar → raízes → recuperar → aproximar → Chamado → recuperar.
// Entre as habilidades, com o herói perto, a garrada (ataque básico sem aviso, CURUPIRA.basic) ao se aproximar e na
// 2ª metade da recuperação; a 1ª metade continua sendo a janela de punição.

const CYCLE = ['approach', 'sweep', 'recover', 'roots', 'recover', 'approach', 'call', 'recover'];

export class Curupira {
  constructor(G) {
    this.G = G;
    this.name = 'Curupira corrompido';
    this.rig = buildSkinnedCurupira();
    G.scene.add(this.rig.root);
    this.pos = this.rig.root.position;
    this.radius = CURUPIRA.radius;
    this.maxHp = CURUPIRA.corruption;
    this.isBoss = true;
    this.solid = true;
    this.height = this.rig.height;
    // Espinhos das raízes (reaproveitados a cada uso)
    this.spikes = new THREE.Group();
    const mat = toon('#6e5a7e');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = i === 0 ? 0 : 1.5;
      this.spikes.add(part(GEO.cone, mat, { pos: [Math.cos(a) * r, 0.7, Math.sin(a) * r], rot: [Math.sin(a) * 0.3, 0, Math.cos(a) * -0.3], scale: [0.35, 1.6, 0.35], line: 0.016 }));
    }
    this.spikes.visible = false;
    G.scene.add(this.spikes);
    this.reset();
  }

  reset() {
    this.rig.setFreed(false);
    this.height = this.rig.height;
    this.name = 'Curupira corrompido';
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
    this.lastHitId = -1;
    this.basicCd = 0;
    this.resume = null;
    this.shownCallHint = false;
    this.spikes.visible = false;
    this.spikeT = 0;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    this.rig.root.rotation.y = 0;
  }

  // Cinemática de encontro: desperta e ruge, ainda sem alvo nem ataques.
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

  nextInCycle() {
    const s = CYCLE[this.step % CYCLE.length];
    this.step++;
    const G = this.G;
    const pl = G.player;
    if (s === 'approach') return this.setState('approach');
    if (s === 'recover') return this.setState('recover');
    if (s === 'sweep') {
      this.setState('sweepWarn');
      const dir = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z).normalize();
      this.facing = Math.atan2(dir.x, dir.z);
      this.shape = { x: this.pos.x, z: this.pos.z, radius: CURUPIRA.sweep.range, angleDeg: CURUPIRA.sweep.angle, dir };
      this.tg = G.tg.add({ ...this.shape, color: '#ff3a32' });
      G.audio.play('warn', CURUPIRA.sweep.warn);
      this.rig.vine.scale.y = 0.01;
      return;
    }
    if (s === 'roots') {
      this.setState('rootsWarn');
      this.shape = { x: pl.pos.x, z: pl.pos.z, radius: CURUPIRA.roots.radius };
      this.tg = G.tg.add({ ...this.shape, color: '#ff3aa8' });
      G.audio.play('warn', CURUPIRA.roots.warn);
      return;
    }
    if (s === 'call') {
      this.setState('cast');
      this.cast = { t: 0, dur: CURUPIRA.call.cast };
      G.audio.play('cast', CURUPIRA.call.cast);
      G.hud.log('O Curupira conjura o Chamado do Silêncio!', 'bad');
      if (!this.shownCallHint) {
        this.shownCallHint = true;
        G.hud.hint(`Q (${G.player.kit.interrupt}) interrompe o Chamado${G.player.kit.melee ? ' — aproxime-se!' : ''}`, 5);
      }
    }
  }

  takeHit(dmg, { interrupts, heavy, actionId, dot }) {
    if (!this.alive || !this.targetable || actionId === this.lastHitId) return;
    this.lastHitId = actionId;
    const G = this.G;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 1;
    G.fx.text(this.pos.clone().setY(3.4), String(dmg), dot ? 'dmg poison' : heavy ? 'dmg big' : 'dmg');
    if (!dot) G.fx.burst(heavy ? 'hitBig' : 'hit', this.pos.clone().setY(1.6));
    if (this.hp <= 0) return this.free();
    if (interrupts && this.state === 'cast') {
      this.setState('stagger');
      G.fx.burst('interrupt', this.pos.clone().setY(2.5));
      G.fx.text(this.pos.clone().setY(4.2), 'Interrompido!', 'info good');
      G.audio.play('interrupt');
      G.hud.castBroken();
      G.hud.log('Chamado do Silêncio interrompido!', 'good');
    }
  }

  // Corrupção zerada: cancela tudo e inicia a restauração (doc 03, seção 5)
  free() {
    const G = this.G;
    this.alive = false;
    this.freed = true;
    this.targetable = false;
    if (this.tg) G.tg.remove(this.tg);
    this.tg = null;
    G.tg.clear();
    this.spikes.visible = false;
    this.setState('freed');
    G.onBossFreed(this);
  }

  // Ataque básico entre as habilidades: com o herói perto, ao se aproximar ou na 2ª metade da recuperação.
  // Golpe comum, como os dos heróis: sem marcação no chão nem som de aviso. Vira para o herói, prepara e, no
  // impacto, acerta quem estiver dentro de alcance e arco. Ao terminar, volta ao estado em que estava.
  tryBasic(toP, dist) {
    const b = CURUPIRA.basic, pl = this.G.player;
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
    const toP = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = toP.length();
    let walking = false;

    // Morte do jogador cancela avisos e impactos futuros (doc 03, seção 6)
    if (!pl.alive && !['dormant', 'freed', 'playerDown'].includes(this.state)) {
      if (this.tg) G.tg.remove(this.tg);
      this.tg = null;
      this.setState('playerDown');
    }

    switch (this.state) {
      case 'dormant':
        break;
      case 'awaken':
        this.facing = Math.atan2(toP.x, toP.z);
        break;
      case 'intro':
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.st >= CURUPIRA.startWait) this.nextInCycle();
        break;
      case 'approach': {
        this.facing = Math.atan2(toP.x, toP.z);
        if (this.tryBasic(toP, dist)) break;
        const reach = CURUPIRA.approachRange + this.radius + pl.radius;
        if (dist <= reach || this.st >= CURUPIRA.approachMax) this.nextInCycle();
        else {
          const v = toP.normalize().multiplyScalar(CURUPIRA.speed * dt);
          const nx = this.pos.x + v.x;
          const nz = this.pos.z + v.z;
          if (Math.hypot(nx - WORLD.arenaCenter.x, nz - WORLD.arenaCenter.z) < WORLD.arenaRadius - 1) this.pos.set(nx, 0, nz);
          walking = true;
        }
        break;
      }
      case 'sweepWarn':
        G.tg.setProgress(this.tg, this.st / CURUPIRA.sweep.warn);
        if (this.st >= CURUPIRA.sweep.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(CURUPIRA.sweep.dmg, 'Varredura de cipó');
          G.fx.burst('leaves', this.pos.clone().add(this.shape.dir.clone().multiplyScalar(2.5)).setY(1));
          G.audio.play('swingBig');
          this.setState('sweepHit');
        }
        break;
      case 'sweepHit':
        if (this.st >= 0.5) this.nextInCycle();
        break;
      case 'rootsWarn':
        G.tg.setProgress(this.tg, this.st / CURUPIRA.roots.warn);
        if (this.st >= CURUPIRA.roots.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(CURUPIRA.roots.dmg, 'Raízes cinzentas');
          this.spikes.position.set(this.shape.x, 0, this.shape.z);
          this.spikes.visible = true;
          this.spikeT = 0;
          G.fx.burst('roots', this.spikes.position.clone().setY(0.4));
          G.audio.play('impact');
          this.setState('rootsHit');
        }
        break;
      case 'rootsHit':
        if (this.st >= 0.45) this.nextInCycle();
        break;
      case 'cast':
        this.cast.t = this.st;
        if (this.st >= CURUPIRA.call.cast) {
          // Pulso em toda a arena; só a esquiva no instante certo evita
          G.fx.ring(this.pos, '#b48cff', WORLD.arenaRadius + 1, 0.6, 0.15, 0.25);
          G.fx.ring(this.pos, '#ffffff', WORLD.arenaRadius + 1, 0.45, 0.2, 0.08);
          G.audio.play('pulse');
          G.hud.pulseFlash();
          if (pl.alive) pl.takeDamage(CURUPIRA.call.dmg, 'Chamado do Silêncio');
          this.setState('callDone');
        }
        break;
      case 'callDone':
        if (this.st >= 0.3) this.nextInCycle();
        break;
      case 'stagger':
        if (this.st >= CURUPIRA.recoverInterrupted) {
          // Pula a recuperação normal do ciclo
          this.step++;
          this.nextInCycle();
        }
        break;
      case 'recover':
        if (this.st >= CURUPIRA.recover) this.nextInCycle();
        else if (this.st >= CURUPIRA.recover * 0.5) this.tryBasic(toP, dist);
        break;
      case 'basicWarn':   // preparo do golpe (só animação)
        if (this.st >= CURUPIRA.basic.windup) {
          if (pl.alive && hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(CURUPIRA.basic.dmg, 'Garrada');
          G.audio.play('swing');
          this.setState('basicHit');
        }
        break;
      case 'basicHit':
        if (this.st >= CURUPIRA.basic.hit) {
          const r = this.resume;
          this.resume = null;
          this.state = r ? r.state : 'recover';
          this.st = r ? r.st + CURUPIRA.basic.windup + CURUPIRA.basic.hit : 0;
        }
        break;
      case 'freed':   // olha para quem o libertou
        if (this.st < CINEMATIC.liberation.release + CINEMATIC.liberation.rise) this.facing = Math.atan2(toP.x, toP.z);
        break;
      default:
        break;
    }

    // Espinhos das raízes sobem e voltam
    if (this.spikes.visible) {
      this.spikeT += dt;
      const k = this.spikeT;
      const s = k < 0.12 ? k / 0.12 : k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.3);
      this.spikes.scale.set(1, Math.max(0.01, s), 1);
      if (k > 0.9) this.spikes.visible = false;
    }

    // Aura de corrupção e chamas
    if (this.alive && this.state !== 'dormant' && Math.random() < dt * 20) G.fx.burst('corrupt', this.pos, { n: 1 });
    if (this.state === 'cast' && Math.random() < dt * 40) G.fx.burst('corrupt', this.pos, { n: 2 });
    if (G.world.restoredAt(this.pos.x, this.pos.z) > 0.5 && Math.random() < dt * 12) G.fx.burst('fire', this.pos.clone().setY(3.1));

    this.animate(dt, walking);
  }

  animate(dt, walking) {
    const r = this.rig;
    let state = 'idle';
    let p = 0;
    let animT = null;
    switch (this.state) {
      case 'approach': state = walking ? 'walk' : 'idle'; break;
      case 'sweepWarn': state = 'sweepWarn'; p = this.st / CURUPIRA.sweep.warn; break;
      case 'sweepHit': state = 'sweepHit'; p = this.st / 0.5; break;
      case 'rootsWarn': state = 'rootsWarn'; break;
      case 'rootsHit': state = 'rootsHit'; break;
      case 'basicWarn': state = 'basicWarn'; break;
      case 'basicHit': state = 'basicHit'; break;
      case 'cast': state = 'cast'; break;
      case 'callDone': state = 'rootsHit'; break;
      case 'stagger': state = 'stagger'; break;
      case 'recover': state = 'recover'; break;
      case 'dormant': state = 'dormant'; break;
      case 'awaken': state = 'awaken'; break;
      case 'freed': {
        // Cinemática de libertação: a corrupção sai (release), troca de forma, o liberto se ergue.
        const L = CINEMATIC.liberation, t = this.st - L.release;
        state = t < 0 ? 'release' : t < L.rise ? 'rise' : 'freed';
        animT = t < 0 ? this.st : t < L.rise ? t : t - L.rise;
        break;
      }
      default: state = 'idle';
    }
    r.setFreed(this.freed && this.st >= CINEMATIC.liberation.release);
    this.height = r.height;
    this.name = r.form === 'freed' ? 'Curupira liberto' : 'Curupira corrompido';
    r.animate(state, animT ?? (['idle', 'walk'].includes(state) ? this.t : this.st), dt > 0 ? dt : undefined);  // dt 0: corte seco
    // Cipó cresce durante a varredura
    const vineTarget = state === 'sweepWarn' || state === 'sweepHit' ? 1.4 : 0.01;
    r.vine.scale.y += (vineTarget - r.vine.scale.y) * Math.min(1, dt * 8);
    let diff = this.facing - r.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    r.root.rotation.y += diff * Math.min(1, dt * 6);
    r.flash(this.flash);
  }
}
