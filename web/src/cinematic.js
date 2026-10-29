import * as THREE from 'three';

// Cinemáticas de jogo (doc 20): câmera por pontos-chave no tempo, faixas de cinema,
// cartela do chefe, clarão e tremor. A câmera entra e sai misturada com a de jogo, então
// não há corte no começo nem no fim. Eventos disparam uma vez; ao pular, todos os que
// faltam disparam em ordem (o estado do jogo fica igual ao de quem assistiu).

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// Hermite com tangentes Catmull-Rom espaçadas no tempo; velocidade zero nas pontas.
function track(keys, t, field, out) {
  if (t <= keys[0].t) return out.copy(keys[0][field]);
  const n = keys.length;
  if (t >= keys[n - 1].t) return out.copy(keys[n - 1][field]);
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1], h = b.t - a.t, x = (t - a.t) / h;
  const tangent = (k) => (k <= 0 || k >= n - 1) ? new THREE.Vector3()
    : keys[k + 1][field].clone().sub(keys[k - 1][field]).multiplyScalar(1 / (keys[k + 1].t - keys[k - 1].t));
  const ma = tangent(i).multiplyScalar(h), mb = tangent(i + 1).multiplyScalar(h);
  const x2 = x * x, x3 = x2 * x;
  return out.copy(a[field]).multiplyScalar(2 * x3 - 3 * x2 + 1).addScaledVector(ma, x3 - 2 * x2 + x)
    .addScaledVector(b[field], -2 * x3 + 3 * x2).addScaledVector(mb, x3 - x2);
}

export class Cinematic {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.id = 'cine';
    this.el.innerHTML = `<div class="bar top"></div><div class="bar bottom"></div><div class="flash"></div>
      <div class="namecard"><div class="nc-kicker"></div><div class="nc-name"></div><div class="nc-epithet"></div></div>
      <div class="skip"><span class="key-only"><kbd>Enter</kbd> pular</span><span class="touch-only">Toque para pular</span></div>`;
    parent.append(this.el);
    this.active = false;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this.shakeT = 0;
  }

  // def: { duration, shots: [{t, pos, look}], events: [{t, fn}], blendIn, blendOut, onEnd }
  play(def) {
    this.def = def;
    this.t = 0;
    this.next = 0;
    this.def.events.sort((a, b) => a.t - b.t);
    this.active = true;
    this.shakeT = 0;
    this.el.className = 'on';
    document.body.classList.add('cine');
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    const ev = this.def.events;
    while (this.next < ev.length && ev[this.next].t <= this.t) ev[this.next++].fn(false);
    if (this.t >= this.def.duration) this.end();
  }

  skip() {
    if (!this.active) return;
    const ev = this.def.events;
    while (this.next < ev.length) ev[this.next++].fn(true);
    this.end();
  }

  end() {
    if (!this.active) return;
    this.stop();
    this.def.onEnd?.();
  }

  // Interrompe sem disparar eventos (reinício da área).
  stop() {
    this.active = false;
    this.el.className = '';
    this.hideCard();
    document.body.classList.remove('cine');
  }

  // Mistura a câmera de jogo (pos, look) com a da cinemática.
  camera(gamePos, gameLook, camera) {
    const d = this.def, t = this.t;
    const w = smooth(t / (d.blendIn ?? 0.8)) * smooth((d.duration - t) / (d.blendOut ?? 1.0));
    track(d.shots, t, 'pos', this._pos);
    track(d.shots, t, 'look', this._look);
    this._pos.lerp(gamePos, 1 - w);
    this._look.lerp(gameLook, 1 - w);
    if (this.shakeT > 0) {
      const a = this.shakeAmp * (this.shakeT / this.shakeDur);
      this._pos.x += Math.sin(t * 61) * a; this._pos.y += Math.sin(t * 47 + 1) * a; this._look.y += Math.sin(t * 53 + 2) * a * 0.6;
    }
    camera.position.copy(this._pos);
    camera.lookAt(this._look);
  }

  shake(amp, dur) { this.shakeAmp = amp; this.shakeDur = dur; this.shakeT = dur; }

  flash() {
    const f = this.el.querySelector('.flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  nameCard(kicker, name, epithet) {
    const c = this.el.querySelector('.namecard');
    c.querySelector('.nc-kicker').textContent = kicker;
    c.querySelector('.nc-name').textContent = name;
    c.querySelector('.nc-epithet').textContent = epithet;
    c.classList.add('show');
  }

  hideCard() { this.el.querySelector('.namecard').classList.remove('show'); }
}
