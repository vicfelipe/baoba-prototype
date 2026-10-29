import * as THREE from 'three';
import { PLAYER } from './config.js';
import { BOUNDS } from './world.js';
import { forTouch, isTouch } from './touch.js';

const $ = (s) => document.querySelector(s);
// Ícones por herói (viewBox 48); a esquiva é a mesma. Cangaceiro: bacamarte, peixeira, pistolas.
// Vaqueiro: punho com luva, laço, berrante. Maloka: navalha aberta, frasco de veneno, nuvem de fumaça.
const HERO_ICONS = {
  cangaceiro: {
    combo: '<path d="M4 30l26-10 2 4-8 4 2 5-6 2-2-5-12 5z"/><path d="M30 20l12-6 2 5-12 5z"/><circle cx="44" cy="16" r="3"/>',
    rasteira: '<path d="M8 40l22-24 4 4-22 24z"/><path d="M30 16l8-10 4 4-10 8z"/><path d="M6 42l4-4 3 3-4 4z"/>',
    meialua: '<path d="M6 20h18l2 4h-6l-2 8h-5l1-8H6z"/><path d="M24 30h18l-2 4h-6l-2 8h-5l1-8h-4z"/>',
  },
  vaqueiro: {
    combo: '<path d="M14 18h18a6 6 0 0 1 6 6v8a8 8 0 0 1-8 8H18a6 6 0 0 1-6-6V22z"/><path d="M10 26h4v8h-4z"/><path d="M18 12h12v6H18z"/>',
    rasteira: '<path fill="none" stroke="currentColor" stroke-width="4" d="M24 8a13 9 0 1 0 0.1 0M30 25l12 15"/>',
    meialua: '<path d="M6 30c6-2 12-10 16-18l4 2c-3 8-2 16 6 20l10-6 2 12-12 2 2-4c-10-2-16-6-28-4z"/>',
  },
  maloka: {
    combo: '<path d="M4 36c6-4 12-6 18-6l2 4c-6 1-12 3-17 6z"/><path d="M22 28l20-16 3 3-19 17z"/><circle cx="23" cy="31" r="2"/>',
    rasteira: '<path d="M20 6h8v6h-8z"/><path d="M19 12h10v5a12 12 0 1 1-10 0z"/><path fill="none" stroke="#1d3a1d" stroke-width="2" d="M17 32c4-4 8 2 14-3"/>',
    meialua: '<circle cx="16" cy="30" r="9"/><circle cx="28" cy="24" r="11"/><circle cx="34" cy="34" r="8"/><circle cx="22" cy="38" r="7"/>',
  },
};
const v3 = new THREE.Vector3();

export class HUD {
  constructor() {
    this.root = $('#hud');
    this.pHp = $('#playerFrame .bar.hp .fill');
    this.pGhost = $('#playerFrame .bar.hp .ghost');
    this.pVal = $('#playerFrame .bar.hp .val');
    this.pDodge = $('#playerFrame .bar.dodge .fill');
    this.tFrame = $('#targetFrame');
    this.tBar = $('#targetFrame .bar');
    this.tFill = $('#targetFrame .bar .fill');
    this.tGhost = $('#targetFrame .bar .ghost');
    this.tVal = $('#targetFrame .bar .val');
    this.tName = $('#tName');
    this.tKind = $('#tKind');
    this.tPortrait = $('#tPortrait');
    this.bossBar = $('#bossBar');
    this.bFill = $('#bossBar .bar .fill');
    this.bGhost = $('#bossBar .bar .ghost');
    this.bVal = $('#bossVal');
    this.cast = $('#castBar');
    this.castFill = $('#castBar .fill');
    this.obj = $('#objList');
    this.hintEl = $('#hint');
    this.toastEl = $('#toast');
    this.interactEl = $('#interact');
    this.bannerEl = $('#banner');
    this.vignette = $('#vignette');
    this.pulse = $('#pulseFlash');
    this.logList = $('#logList');
    this.areaEl = $('#areaName');
    this.memFill = $('#memoryBar .fill');
    this.memPct = $('#memPct');
    this.labelLayer = $('#labels');
    this.mini = $('#minimap').getContext('2d');
    this.slots = {};
    for (const s of document.querySelectorAll('.slot')) this.slots[s.dataset.skill] = s;
    this.pips = [...document.querySelectorAll('.pips i')];
    this.hintT = 0;
    this.toastT = 0;
    this.bannerT = 0;
    this.lastTarget = null;
    this.lastObj = '';
    this.prevCd = {};
    this.portraits = {};
    this.labels = new Map();
    this.area = '';
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setPortraits(p) {
    this.portraits = p;
    $('#pPortrait').src = p.lutador;
  }

  // Herói escolhido na tela de título: nome, papel, retrato e ícones das habilidades (mesmas teclas).
  setHero(name, kit) {
    $('#playerFrame .name').textContent = kit.name;
    $('#playerFrame .hearts').textContent = kit.role;
    const portrait = this.portraits[name] || this.portraits.lutador;
    if (portrait) $('#pPortrait').src = portrait;
    if (!this.defaultIcons) this.defaultIcons = Object.fromEntries(Object.entries(this.slots).map(([k, s]) => [k, s.querySelector('svg')?.innerHTML]));
    for (const [k, s] of Object.entries(this.slots)) {
      const svg = s.querySelector('svg');
      if (svg) svg.innerHTML = HERO_ICONS[name]?.[k] || this.defaultIcons[k];
    }
    const basic = { capoeirista: 'Golpes', cangaceiro: 'Bacamarte', vaqueiro: 'Gancho', maloka: 'Navalha' }[name];
    for (const [k, label] of Object.entries({ combo: basic, ...kit.slots })) if (this.slots[k]) this.slots[k].title = label;
    document.querySelector('.slot[data-skill="combo"] .pips').style.display = kit.combo ? '' : 'none';
  }

  update(dt, G) {
    const pl = G.player;
    const hpPct = (pl.hp / PLAYER.hp) * 100;
    this.pHp.style.width = Math.min(100, hpPct) + '%';
    this.pGhost.style.width = Math.min(100, hpPct) + '%';
    this.pVal.textContent = `${Math.ceil(pl.hp)}/${PLAYER.hp}`;
    this.pDodge.style.width = (1 - pl.cd.dodge / PLAYER.dodge.cd) * 100 + '%';
    this.vignette.classList.toggle('low', pl.alive && hpPct <= 30);

    // Alvo selecionado (o Curupira usa a barra longa de chefe)
    const t = pl.target && pl.target.alive && !pl.target.isBoss ? pl.target : null;
    if (t !== this.lastTarget) {
      this.lastTarget = t;
      this.tFrame.classList.toggle('hidden', !t);
      if (t) {
        this.tName.textContent = t.name;
        this.tKind.textContent = 'Silêncio';
        this.tBar.classList.add('fragment');
        this.tPortrait.src = this.portraits.fragmento;
      }
    }
    if (t) {
      const pct = (t.hp / t.maxHp) * 100;
      this.tFill.style.width = pct + '%';
      this.tGhost.style.width = pct + '%';
      this.tVal.textContent = `${Math.ceil(t.hp)}/${t.maxHp}`;
    }

    const boss = G.boss;
    this.bossBar.classList.toggle('hidden', !boss.targetable);
    if (boss.targetable) {
      const pct = (boss.hp / boss.maxHp) * 100;
      this.bFill.style.width = pct + '%';
      this.bGhost.style.width = pct + '%';
      this.bVal.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    }
    if (boss.cast) {
      this.cast.classList.remove('hidden', 'broken');
      this.castFill.style.width = Math.min(100, (boss.cast.t / boss.cast.dur) * 100) + '%';
    } else if (!this.cast.classList.contains('broken')) this.cast.classList.add('hidden');

    // Recargas
    const cds = { rasteira: [pl.cd.rasteira, pl.cdMax('rasteira')], meialua: [pl.cd.meialua, pl.cdMax('meialua')], dodge: [pl.cd.dodge, pl.cdMax('dodge')] };
    for (const [k, [v, max]] of Object.entries(cds)) {
      const slot = this.slots[k];
      slot.querySelector('.cd').style.setProperty('--p', (v / max) * 100 + '%');
      slot.querySelector('.cdText').textContent = v > 0 ? (v >= 1 ? Math.ceil(v) : v.toFixed(1)) : '';
      if (this.prevCd[k] > 0 && v <= 0) {
        slot.classList.remove('ready');
        void slot.offsetWidth;
        slot.classList.add('ready');
      }
      this.prevCd[k] = v;
    }
    const step = pl.comboTimer > 0 ? pl.comboIndex : 0;
    this.pips.forEach((p, i) => p.classList.toggle('on', pl.comboTimer > 0 && i < (step === 0 ? 3 : step)));

    this.hintT -= dt;
    if (this.hintT <= 0) this.hintEl.classList.remove('show');
    this.toastT -= dt;
    if (this.toastT <= 0) this.toastEl.classList.remove('show');
    this.bannerT -= dt;
    if (this.bannerT <= 0) this.bannerEl.classList.remove('show');

    this.updateLabels(G);
    this.drawMinimap(G);
  }

  // Nome sob cada personagem (e vida dos inimigos), como no Lunia
  updateLabels(G) {
    const cam = G.camera;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ents = [{ key: G.player, name: G.player.kit.name, cls: 'player', ent: G.player }];
    for (const e of G.enemies()) if (e.alive && (e.targetable || (!e.isBoss && e.state !== 'buried'))) ents.push({ key: e, name: e.name, cls: 'enemy', ent: e, hp: !e.isBoss });
    if (G.boss.freed) ents.push({ key: G.boss, name: 'Curupira', cls: 'player', ent: G.boss });
    const seen = new Set();
    for (const it of ents) {
      seen.add(it.key);
      let el = this.labels.get(it.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'label ' + it.cls;
        el.innerHTML = `<div class="n"></div>${it.hp ? '<div class="hp"><i></i></div>' : ''}`;
        this.labelLayer.appendChild(el);
        this.labels.set(it.key, el);
      }
      el.className = 'label ' + it.cls;
      el.querySelector('.n').textContent = it.name;
      if (it.hp) el.querySelector('.hp i').style.width = (it.ent.hp / it.ent.maxHp) * 100 + '%';
      v3.copy(it.ent.pos).setY(-0.15);
      v3.project(cam);
      const visible = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && (it.ent.alive !== false || it.ent.freed);
      el.style.display = visible ? '' : 'none';
      if (visible) el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%, 0)`;
    }
    for (const [k, el] of this.labels) {
      if (!seen.has(k)) {
        el.remove();
        this.labels.delete(k);
      }
    }
  }

  drawMinimap(G) {
    const m = this.mini;
    const S = 200;
    const scale = 2.6; // px por metro
    const p = G.player.pos;
    const map = G.world.mapCanvas;
    const k = map.width / BOUNDS.w;
    m.fillStyle = '#142014';
    m.fillRect(0, 0, S, S);
    const sx = (p.x - BOUNDS.x0) * k;
    const sz = (p.z - BOUNDS.z0) * k;
    const span = S / scale;
    m.drawImage(map, sx - (span * k) / 2, sz - (span * k) / 2, span * k, span * k, 0, 0, S, S);
    const toMini = (x, z) => [S / 2 + (x - p.x) * scale, S / 2 + (z - p.z) * scale];
    const dot = (x, z, col, r = 4) => {
      const [mx, my] = toMini(x, z);
      if (mx < 0 || my < 0 || mx > S || my > S) return;
      m.fillStyle = col;
      m.strokeStyle = '#000';
      m.lineWidth = 1.5;
      m.beginPath();
      m.arc(mx, my, r, 0, Math.PI * 2);
      m.fill();
      m.stroke();
    };
    const w = G.world;
    if (!G.prog.vestigio) dot(w.vestigio.position.x, w.vestigio.position.z, '#7fffe0', 5);
    if (w.finalMemory.visible && !G.prog.memory) dot(w.finalMemory.position.x, w.finalMemory.position.z, '#ffe07a', 5);
    if (!w.gateOpen) {
      const [gx, gy] = toMini(-4.4, -52);
      const [gx2] = toMini(4.4, -52);
      m.strokeStyle = '#b48cff';
      m.lineWidth = 3;
      m.beginPath();
      m.moveTo(gx, gy);
      m.lineTo(gx2, gy);
      m.stroke();
    }
    for (const e of G.enemies()) {
      if (!e.alive) continue;
      if (e.isBoss) dot(e.pos.x, e.pos.z, '#ff3a2a', 6);
      else dot(e.pos.x, e.pos.z, '#ff8a6a', 3.5);
    }
    // Herói: seta na direção
    const a = G.player.facing;
    m.save();
    m.translate(S / 2, S / 2);
    m.rotate(-a + Math.PI);
    m.fillStyle = '#fff';
    m.strokeStyle = '#000';
    m.lineWidth = 1.5;
    m.beginPath();
    m.moveTo(0, -7);
    m.lineTo(5, 5);
    m.lineTo(0, 2);
    m.lineTo(-5, 5);
    m.closePath();
    m.fill();
    m.stroke();
    m.restore();
  }

  setArea(name) {
    if (name === this.area) return;
    this.area = name;
    this.areaEl.textContent = name;
  }

  setMemory(pct) {
    this.memFill.style.width = pct + '%';
    this.memPct.textContent = Math.round(pct) + '%';
  }

  log(text, cls = '') {
    const li = document.createElement('li');
    li.textContent = text;
    if (cls) li.className = cls;
    this.logList.appendChild(li);
    while (this.logList.children.length > 8) this.logList.firstChild.remove();
  }

  clearLog() {
    this.logList.innerHTML = '';
  }

  objectives(items) {
    const key = JSON.stringify(items) + isTouch();
    if (key === this.lastObj) return;
    this.lastObj = key;
    this.obj.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.textContent = forTouch(it.text);
      if (it.done) li.classList.add('done');
      this.obj.appendChild(li);
    }
  }

  hint(text, dur = 4) {
    this.hintEl.textContent = forTouch(text);
    this.hintEl.classList.add('show');
    this.hintT = dur;
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastT = 0.9;
  }

  banner(title, sub = '', dur = 2.6) {
    this.bannerEl.innerHTML = `<div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}<div class="line"></div>`;
    this.bannerEl.classList.add('show');
    this.bannerT = dur;
  }

  interact(text) {
    this.interactEl.classList.toggle('show', !!text);
    if (text) this.interactEl.querySelector('span').textContent = text;
  }

  flashSlot(name) {
    const s = this.slots[name];
    if (!s) return;
    s.classList.remove('flash');
    void s.offsetWidth;
    s.classList.add('flash');
  }

  hurt() {
    this.vignette.classList.add('hit');
    requestAnimationFrame(() => requestAnimationFrame(() => this.vignette.classList.remove('hit')));
  }

  pulseFlash() {
    this.pulse.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => this.pulse.classList.remove('on')));
  }

  castBroken() {
    this.cast.classList.remove('hidden');
    this.cast.classList.add('broken');
    setTimeout(() => {
      this.cast.classList.remove('broken');
      this.cast.classList.add('hidden');
    }, 500);
  }

  screen(id) {
    for (const s of document.querySelectorAll('#screens .screen')) s.classList.toggle('show', s.id === id);
  }
}
