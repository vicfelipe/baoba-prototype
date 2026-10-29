import * as THREE from 'three';
import { MAR, WORLD } from './config.js';
import { hitsShape } from './telegraph.js';
import { Iara } from './iara.js';
import { Ipupiara } from './ipupiara.js';

// Iara e Ipupiara, a dupla do Porto de Santos (doc 25). Para o jogo é um chefe só (G.boss): encontro, cinemática,
// câmera e música; `parts` são os dois alvos, cada um com a sua barra (sem vida ligada, decisão do usuário,
// 28/10/2026). A luta acaba quando a Iara for libertada e o Ipupiara vencido, em qualquer ordem.
// O mar é a mecânica da dupla: um relógio próprio, enquanto houver chefe de pé, alterna a Ressaca (faixa larga
// que atravessa o deque mirando o herói; a espuma causa dano e empurra no sentido da onda) e, a cada
// MAR.tide.every eventos, a Maré alta (o anel da borda fica coberto: dano contínuo e passo lento). Empurrado
// para fora do deque, o herói cai no mar (player.fall).

export class Duo {
  constructor(G) {
    this.G = G;
    this.name = 'Iara e Ipupiara';
    this.card = { area: 'Chefe · Deque do Trapiche', name: 'Iara e Ipupiara', epithet: 'A voz das águas e a fera do mar',
      sleep: '[Sistema] O mar ferve em volta do deque…', wake: '[Sistema] A Iara e o Ipupiara emergem!', burst: 'splash' };
    this.isBoss = true;
    this.rig = { root: new THREE.Group() };
    this.rig.root.name = 'duo';
    G.scene.add(this.rig.root);
    this.iara = new Iara(G, this.rig.root);
    this.ipu = new Ipupiara(G, this.rig.root);
    this.parts = [this.iara, this.ipu];
    this._pos = new THREE.Vector3();
    this.buildSeaFx();
    this.reset();
  }

  // Parede de espuma da ressaca e lâmina d'água da maré alta
  buildSeaFx() {
    const foam = new THREE.MeshBasicMaterial({ color: '#eef8fb', transparent: true, opacity: 0.85, depthWrite: false });
    const wall = new THREE.Group();
    // local: +x = sentido da onda, z = largura da faixa
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 10).rotateX(Math.PI / 2), foam);
    crest.scale.set(1, 1, MAR.wave.width);
    crest.position.y = 0.6;
    wall.add(crest);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), new THREE.MeshBasicMaterial({ color: '#5a9aa6', transparent: true, opacity: 0.7, depthWrite: false }));
    body.scale.set(1, 0.9, MAR.wave.width);
    body.position.set(-0.7, 0.35, 0);
    wall.add(body);
    wall.visible = false;
    wall.renderOrder = 6;
    this.rig.root.add(wall);
    this.wall = wall;
    const r = WORLD.arenaRadius;
    const tideMat = new THREE.MeshBasicMaterial({ color: '#4a8a96', transparent: true, opacity: 0, depthWrite: false });
    this.tideMesh = new THREE.Mesh(new THREE.RingGeometry(MAR.tide.inner, r + 0.4, 64, 1).rotateX(-Math.PI / 2), tideMat);
    this.tideMesh.renderOrder = 4;
    this.tideMesh.visible = false;
    this.rig.root.add(this.tideMesh);
    this.tideRim = new THREE.Mesh(new THREE.RingGeometry(MAR.tide.inner - 0.15, MAR.tide.inner + 0.25, 64, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8f6fa', transparent: true, opacity: 0, depthWrite: false }));
    this.tideRim.renderOrder = 5;
    this.tideMesh.add(this.tideRim);
  }

  get alive() {
    return this.iara.alive || this.ipu.alive;
  }

  get targetable() {
    return false;     // os alvos são as partes
  }

  get cast() {
    return this.iara.cast;
  }

  get freed() {
    return false;
  }

  get height() {
    return this.focus().height;
  }

  // Câmera e cinemática: o centro do deque antes da luta; depois o alvo do herói, ou o Ipupiara, ou a Iara
  get pos() {
    if (!this.started) return this._pos.set(WORLD.arenaCenter.x, 0, WORLD.arenaCenter.z);
    return this._pos.copy(this.focus().pos).setY(0);
  }

  focus() {
    const t = this.G.player.target;
    if (t && t.alive && this.parts.includes(t)) return t;
    if (this.ipu.alive) return this.ipu;
    return this.iara;
  }

  reset() {
    for (const p of this.parts) p.reset();
    this.started = false;
    this.done = false;
    this.seaT = 0;
    this.events = 0;
    this.clearSea();
    this.tideMesh.position.set(WORLD.arenaCenter.x, 0.07, WORLD.arenaCenter.z);
  }

  clearSea() {
    const G = this.G;
    if (this.wave?.tg) G.tg.remove(this.wave.tg);
    if (this.tide?.tg) G.tg.remove(this.tide.tg);
    this.wave = null;
    this.tide = null;
    this.wall.visible = false;
    this.tideMesh.visible = false;
    G.player.moveMul = 1;
  }

  awaken() {
    for (const p of this.parts) p.awaken();
  }

  begin() {
    this.started = true;
    this.seaT = MAR.every - MAR.first;   // o primeiro evento sai aos MAR.first s
    for (const p of this.parts) p.begin();
  }

  // ---------- Mar ----------
  nextSeaEvent() {
    this.events++;
    if (this.events % MAR.tide.every === 0) this.startTide();
    else this.startWave();
  }

  // Ressaca: faixa larga atravessando o deque; a linha do meio passa pelo herói
  startWave() {
    const G = this.G, pl = G.player, c = WORLD.arenaCenter, R = WORLD.arenaRadius + 2;
    const a = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    const off = THREE.MathUtils.clamp((pl.pos.x - c.x) * side.x + (pl.pos.z - c.z) * side.z, -WORLD.arenaRadius + 2, WORLD.arenaRadius - 2);
    const sx = c.x + side.x * off - dir.x * R, sz = c.z + side.z * off - dir.z * R;
    const shape = { x: sx, z: sz, radius: MAR.wave.width / 2, length: R * 2, dir };
    this.wave = { shape, t: 0, s: -1, hit: false, tg: G.tg.add({ ...shape, color: '#3a9cff' }) };
    G.audio.play('warn', MAR.wave.warn);
    G.hud.log('A ressaca vem aí — saia da faixa azul!', 'bad');
  }

  updateWave(dt) {
    const G = this.G, pl = G.player, w = this.wave, sh = w.shape;
    w.t += dt;
    if (w.tg) {
      G.tg.setProgress(w.tg, w.t / MAR.wave.warn);
      // a água sobe do lado de onde a onda vem
      if (Math.random() < dt * 25) G.fx.burst('foam', new THREE.Vector3(sh.x + sh.dir.x * 1.5 + (Math.random() - 0.5) * sh.radius * 2 * sh.dir.z, 0.1, sh.z + sh.dir.z * 1.5 - (Math.random() - 0.5) * sh.radius * 2 * sh.dir.x), { n: 2 });
      if (w.t < MAR.wave.warn) return;
      G.tg.resolve(w.tg);
      w.tg = null;
      w.s = 0;
      G.audio.play('wave');
      this.wall.visible = true;
      this.wall.rotation.y = Math.atan2(sh.dir.x, sh.dir.z) - Math.PI / 2;
    }
    const prev = w.s;
    w.s += MAR.wave.speed * dt;
    const k = Math.min(1, w.s / sh.length);
    this.wall.position.set(sh.x + sh.dir.x * w.s, 0, sh.z + sh.dir.z * w.s);
    this.wall.scale.set(1, 0.6 + Math.sin(k * Math.PI) * 0.8, 1);
    if (Math.random() < dt * 40) G.fx.burst('foam', this.wall.position.clone().setY(0.6), { n: 3 });
    const along = (pl.pos.x - sh.x) * sh.dir.x + (pl.pos.z - sh.z) * sh.dir.z;
    const lat = Math.abs((pl.pos.x - sh.x) * sh.dir.z - (pl.pos.z - sh.z) * sh.dir.x);
    if (!w.hit && pl.alive && !pl.adrift && lat <= sh.radius + pl.radius && along >= prev - 0.6 && along <= w.s + 0.6) {
      w.hit = true;
      if (pl.takeDamage(MAR.wave.dmg, 'Ressaca')) pl.shove(sh.dir, MAR.wave.shove, 0.4);
      G.fx.burst('splash', pl.pos.clone().setY(0.8), { n: 30 });
    }
    if (w.s >= sh.length) {
      this.wall.visible = false;
      this.wave = null;
    }
  }

  // Maré alta: anel na borda; depois a água cobre o anel por MAR.tide.last s
  startTide() {
    const G = this.G, c = WORLD.arenaCenter;
    const shape = { x: c.x, z: c.z, radius: WORLD.arenaRadius, inner: MAR.tide.inner };
    this.tide = { shape, t: 0, tick: 0, tg: G.tg.add({ ...shape, color: '#3a9cff' }) };
    G.audio.play('warn', MAR.tide.warn);
    G.hud.log('A maré está subindo — vá para o meio do deque!', 'bad');
  }

  updateTide(dt) {
    const G = this.G, pl = G.player, T = MAR.tide, td = this.tide;
    td.t += dt;
    if (td.tg) {
      G.tg.setProgress(td.tg, td.t / T.warn);
      if (td.t < T.warn) return;
      G.tg.resolve(td.tg);
      td.tg = null;
      G.audio.play('tide');
      this.tideMesh.visible = true;
    }
    const f = td.t - T.warn;
    // sobe em 0,5 s, fica, e escoa em 0,6 s
    const level = Math.min(1, f / 0.5) * Math.min(1, Math.max(0, (T.last + 0.6 - f) / 0.6));
    this.tideMesh.material.opacity = 0.62 * level;
    this.tideRim.material.opacity = 0.8 * level * (0.75 + 0.25 * Math.sin(f * 6));
    this.tideMesh.position.y = 0.04 + level * 0.06;
    const inside = pl.alive && !pl.adrift && f < T.last && hitsShape(td.shape, pl.pos.x, pl.pos.z, 0);
    pl.moveMul = inside ? T.slow : 1;
    if (inside) {
      td.tick -= dt;
      if (td.tick <= 0) {
        td.tick = 0.5;
        pl.takeDamage(Math.round(T.dps * 0.5), 'Maré alta');
        G.fx.burst('splash', pl.pos.clone().setY(0.2), { n: 6 });
      }
    } else td.tick = 0;
    if (Math.random() < dt * 30 * level) {
      const a = Math.random() * Math.PI * 2, r = T.inner + Math.random() * (WORLD.arenaRadius - T.inner);
      G.fx.burst('foam', new THREE.Vector3(td.shape.x + Math.sin(a) * r, 0.1, td.shape.z + Math.cos(a) * r), { n: 1 });
    }
    if (f >= T.last + 0.6) {
      this.tideMesh.visible = false;
      pl.moveMul = 1;
      this.tide = null;
    }
  }

  update(dt) {
    for (const p of this.parts) p.update(dt);
    if (!this.started || this.done) return;
    const pl = this.G.player;
    if (!pl.alive) {
      if (this.wave || this.tide) this.clearSea();
      return;
    }
    if (this.wave) this.updateWave(dt);
    if (this.tide) this.updateTide(dt);
    this.seaT += dt;
    if (this.seaT >= MAR.every) {
      this.seaT = 0;
      this.nextSeaEvent();
    }
  }

  // Uma das partes caiu (Iara liberta ou Ipupiara vencido); com as duas, o mar acalma e a luta acaba
  partDone(part) {
    if (this.alive) return false;
    this.done = true;
    this.clearSea();
    return true;
  }
}
