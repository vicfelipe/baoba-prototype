import * as THREE from 'three';
import { FRAGMENTO, MORTO, BRASA } from './config.js';
import { buildFragmento, animateFragmento } from './fragmento.js';
import { buildMorto, animateMorto } from './morto.js';
import { hitsShape } from './telegraph.js';

// Inimigos comuns (doc 03, seção 3): ocioso → perseguir → preparar → atingir → recuperar.
// Fragmento do Silêncio na Mata Viva; no Sertão Velho, as variações mortas-vivas (doc 24): começam
// enterradas e saem da cova quando o herói chega perto; a de brasa explode ao cair.

const KINDS = {
  silencio: { cfg: FRAGMENTO, name: 'Fragmento do Silêncio', source: 'Lascas do Fragmento', height: 1.5, build: () => buildFragmento(), anim: animateFragmento, deadDur: 0.5 },
  morto: { cfg: MORTO, name: 'Morto-vivo do Silêncio', source: 'Garras do morto-vivo', height: 1.9, build: (i) => buildMorto('morto', i), anim: animateMorto, deadDur: 1.5 },
  brasa: { cfg: BRASA, name: 'Morto-vivo em Brasa', source: 'Garras do morto-vivo', height: 1.9, build: (i) => buildMorto('brasa', i), anim: animateMorto, deadDur: 1.5 },
};

export class Fragmento {
  // face: ponto para onde olham parados (a entrada da fase)
  constructor(G, x, z, index, kind = 'silencio', parent = G.scene, face = [0, 8]) {
    this.G = G;
    const K = KINDS[kind];
    this.kind = kind;
    this.K = K;
    this.cfg = K.cfg;
    this.name = K.name;
    this.index = index;
    this.model = K.build(index);
    parent.add(this.model.root);
    this.pos = this.model.root.position;
    this.home = new THREE.Vector3(x, 0, z);
    this.face = face;
    this.radius = this.cfg.radius;
    this.maxHp = this.cfg.hp;
    this.height = K.height;
    this.reset();
  }

  reset() {
    this.pos.copy(this.home);
    this.hp = this.maxHp;
    this.alive = true;
    // os mortos-vivos começam enterrados: sem alvo e sem colisão até saírem da cova
    this.state = this.cfg.rise ? 'buried' : 'idle';
    this.targetable = !this.cfg.rise;
    this.solid = !this.cfg.rise;
    this.st = 0;
    this.t = Math.random() * 10;
    this.flash = 0;
    this.knock = new THREE.Vector3();
    this.facing = Math.atan2(this.face[0] - this.home.x, this.face[1] - this.home.z);   // de frente para quem vem da entrada
    this.model.root.rotation.y = this.facing;
    this.model.root.visible = this.state !== 'buried';
    this.model.root.scale.setScalar(1);
    this.dieT = 0;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    if (this.blast?.tg) this.G.tg.remove(this.blast.tg);
    this.blast = null;
    this.lastHitId = -1;
    this.held = 0;
    this.taunted = 0;
  }

  // Laço do Vaqueiro: preso, não age nem anda (quem arrasta é o vaqueiro); o aviso em curso se desfaz.
  hold(sec) {
    if (!this.alive || !this.targetable) return;
    this.held = sec;
    if (this.tg) this.G.tg.remove(this.tg);
    this.tg = null;
    this.knock.set(0, 0, 0);
    this.setState('chase');
  }

  // Berrante: persegue o herói, mesmo além da coleira, por `sec` segundos (e acorda os enterrados).
  taunt(sec) {
    if (!this.alive) return;
    this.taunted = sec;
    if (this.state === 'idle' || this.state === 'return') this.setState('chase');
  }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  // dot: tique de veneno (Maloka): número verde, sem faísca nem empurrão.
  takeHit(dmg, { from, heavy, actionId, dot }) {
    if (!this.alive || !this.targetable || actionId === this.lastHitId) return;
    this.lastHitId = actionId;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = dot ? 0.4 : 1;
    this.G.fx.text(this.pos.clone().setY(this.height + 0.4), String(dmg), dot ? 'dmg poison' : heavy ? 'dmg big' : 'dmg');
    if (!dot) this.G.fx.burst(heavy ? 'hitBig' : 'hit', this.pos.clone().setY(0.9));
    // Empurrão leve; não cancela o aviso (Q não interrompe o golpe)
    if (!dot && this.state !== 'warn' && this.state !== 'strike') {
      this.knock.copy(this.pos).sub(from).setY(0).normalize().multiplyScalar(heavy ? 5 : 2.5);
    }
    if (this.state === 'idle') this.setState('chase');
    if (this.hp <= 0) this.die();
  }

  die() {
    const G = this.G;
    this.alive = false;
    this.state = 'dead';
    this.solid = false;
    if (this.tg) G.tg.remove(this.tg);
    this.tg = null;
    if (this.kind === 'silencio') {
      G.fx.burst('shards', this.pos.clone().setY(0.8));
      G.audio.play('shatter');
    } else {
      G.fx.burst('bones', this.pos.clone().setY(0.9));
      G.audio.play('collapse');
    }
    if (this.cfg.burst) this.blast = { t: 0, tg: null, shape: { x: this.pos.x, z: this.pos.z, radius: this.cfg.burst.radius } };
    G.onEnemyDefeated(this);
  }

  // Brasa: depois de cair, anuncia o círculo e explode uma vez; a morte do herói cancela
  updateBlast(dt) {
    const G = this.G;
    const b = this.blast;
    const B = this.cfg.burst;
    b.t += dt;
    if (!G.player.alive) {
      G.tg.remove(b.tg);
      this.blast = null;
      return;
    }
    if (Math.random() < dt * 20) G.fx.burst('fire', this.pos.clone().setY(0.4));
    if (!b.tg && b.t >= B.delay) {
      b.tg = G.tg.add({ ...b.shape, color: '#ff8a2a' });
      G.audio.play('warn', B.warn);
    }
    if (!b.tg) return;
    G.tg.setProgress(b.tg, (b.t - B.delay) / B.warn);
    if (b.t >= B.delay + B.warn) {
      G.tg.resolve(b.tg);
      const pl = G.player;
      if (hitsShape(b.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(B.dmg, 'Brasa do morto-vivo');
      G.fx.burst('emberBlast', this.pos.clone().setY(0.6));
      G.fx.ring(this.pos, '#ff8a2a', B.radius, 0.45, 0.12, 0.25);
      G.audio.play('impact');
      this.blast = null;
      this.dieT = Math.max(this.dieT, this.K.deadDur - 0.3);
    }
  }

  update(dt) {
    const G = this.G;
    const cfg = this.cfg;
    this.t += dt;
    this.st += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (!this.alive) {
      this.dieT += dt;
      if (this.blast) this.updateBlast(dt);
      if (this.kind === 'silencio') {
        const k = Math.min(1, this.dieT / 0.5);
        this.model.root.scale.setScalar(Math.max(0.001, 1 - k));
        this.model.root.visible = k < 1;
        return;
      }
      // tomba, fica no chão (a brasa arde até explodir) e afunda na terra
      animateMorto(this.model, 'dead', this.t, this.dieT / 0.7, dt);
      if (this.model.brasa) this.model.heartMat.emissiveIntensity = 1.8 + (this.blast ? Math.min(1, this.blast.t / 1.5) * 4 : 0);
      const sink = Math.max(0, (this.dieT - (this.blast ? 99 : this.K.deadDur - 0.5)) / 0.5);
      this.model.rise.position.y -= sink * 1.2;
      this.model.root.visible = sink < 1;
      this.model.flash(this.flash);
      return;
    }
    const pl = G.player;
    this.taunted = Math.max(0, this.taunted - dt);
    if (this.held > 0) {
      this.held = Math.max(0, this.held - dt);
      this.K.anim(this.model, 'idle', this.t, 0, dt);
      this.model.flash(this.flash);
      return;
    }
    const toP = new THREE.Vector3(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = toP.length();
    const surf = dist - this.radius - pl.radius;
    const fromHome = Math.hypot(pl.pos.x - this.home.x, pl.pos.z - this.home.z);
    // Maloka escondido na fumaça: não é visto (só a provocação do Berrante vence a fumaça).
    const seen = !pl.hidden || this.taunted > 0;

    let move = new THREE.Vector3();
    if (!pl.alive && (this.state === 'warn' || this.state === 'strike')) {
      if (this.tg) G.tg.remove(this.tg);
      this.tg = null;
      this.setState('return');
    }
    switch (this.state) {
      case 'buried':
        if (pl.alive && (dist < cfg.detect || this.taunted > 0)) {
          this.setState('rise');
          this.model.root.visible = true;
          this.facing = Math.atan2(toP.x, toP.z);
          G.fx.burst('grave', this.pos.clone().setY(0.15));
          G.audio.play('rise');
        }
        break;
      case 'rise':
        if (this.st >= cfg.rise) {
          this.targetable = true;
          this.solid = true;
          this.setState('chase');
        }
        break;
      case 'idle':
        if (pl.alive && seen && (dist < cfg.detect || this.taunted > 0)) this.setState('chase');
        break;
      case 'chase':
        if (!pl.alive || (fromHome > cfg.leash && this.taunted <= 0)) {
          this.setState('return');
          break;
        }
        if (!seen) {
          this.setState('lost');
          break;
        }
        this.facing = Math.atan2(toP.x, toP.z);
        if (surf <= cfg.attackRange) {
          this.setState('warn');
          this.dir = toP.clone().normalize();
          this.shape = { x: this.pos.x, z: this.pos.z, radius: cfg.cone.range, angleDeg: cfg.cone.angle, dir: this.dir };
          this.tg = G.tg.add({ ...this.shape, color: '#ff6a24' });
          G.audio.play('warn', cfg.cone.warn);
        } else move = toP.clone().normalize().multiplyScalar(cfg.speed);
        break;
      case 'warn':
        G.tg.setProgress(this.tg, this.st / cfg.cone.warn);
        if (this.st >= cfg.cone.warn) {
          G.tg.resolve(this.tg);
          this.tg = null;
          if (hitsShape(this.shape, pl.pos.x, pl.pos.z, pl.radius)) pl.takeDamage(cfg.cone.dmg, this.K.source);
          this.setState('strike');
        }
        break;
      case 'strike':
        if (this.st >= 0.3) this.setState('recover');
        break;
      case 'recover':
        if (this.st >= cfg.cone.recover) this.setState('chase');
        break;
      // Perdeu o herói de vista (fumaça): para e procura; se ele não reaparecer, volta para casa.
      case 'lost':
        this.facing += Math.sin(this.t * 2.2) * dt * 1.5;
        if (seen && pl.alive && dist < cfg.detect * 1.3) this.setState('chase');
        else if (this.st >= 2.5) this.setState('return');
        break;
      case 'return': {
        const back = this.home.clone().sub(this.pos).setY(0);
        if (back.length() < 0.3) {
          this.hp = this.maxHp;
          this.setState('idle');
        } else {
          move = back.normalize().multiplyScalar(cfg.speed * 1.4);
          this.facing = Math.atan2(move.x, move.z);
        }
        if (pl.alive && seen && dist < cfg.detect && Math.hypot(pl.pos.x - this.home.x, pl.pos.z - this.home.z) < cfg.leash * 0.8) this.setState('chase');
        break;
      }
      default:
        break;
    }

    // Separação entre inimigos
    for (const o of G.fragments) {
      if (o === this || !o.alive || !o.solid) continue;
      const dx = this.pos.x - o.pos.x;
      const dz = this.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.2 && d > 0.001) move.add(new THREE.Vector3(dx / d, 0, dz / d).multiplyScalar(2));
    }
    if (this.state === 'buried' || this.state === 'rise') move.set(0, 0, 0);
    move.add(this.knock);
    this.knock.multiplyScalar(Math.exp(-dt * 8));
    const nx = this.pos.x + move.x * dt;
    const nz = this.pos.z + move.z * dt;
    if (G.world.walkableEnemy(nx, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    }

    let diff = this.facing - this.model.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.model.root.rotation.y += diff * Math.min(1, dt * 10);
    const p = this.state === 'warn' ? this.st / cfg.cone.warn
      : this.state === 'strike' ? this.st / 0.3
        : this.state === 'rise' ? this.st / cfg.rise
          : 0;
    this.K.anim(this.model, this.state === 'lost' ? 'idle' : this.state, this.t, p, dt);
    this.model.flash(this.flash);
  }
}
