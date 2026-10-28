import * as THREE from 'three';

// Partículas gráficas curtas, anéis de impacto e números flutuantes.

const MAX = 2400;

function makeSystem(blending) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const size = new Float32Array(MAX);
  const alpha = new Float32Array(MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } },
    vertexShader: `
      attribute float size; attribute float alpha; attribute vec3 color;
      varying vec3 vColor; varying float vAlpha;
      uniform float uScale;
      void main() {
        vColor = color; vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        // Estrela de quatro pontas suave + disco
        float star = 1.0 - smoothstep(0.0, 0.35, min(abs(p.x), abs(p.y)) * (0.6 + r));
        float disc = 1.0 - smoothstep(0.55, 1.0, r);
        float a = max(disc * 0.85, star) * vAlpha;
        gl_FragColor = vec4(vColor * (0.8 + star * 0.4), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  const parts = [];
  return { pts, geo, mat, parts };
}

const tmpColor = new THREE.Color();

// Tufo de fumaça: mancha suave com bordas irregulares (vários discos com gradiente), desenhada uma vez.
let smokeTex = null;
function puffTexture() {
  if (smokeTex) return smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) {
    const x = 64 + (rnd() - 0.5) * 44, y = 64 + (rnd() - 0.5) * 44, r = 26 + rnd() * 22;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  smokeTex = new THREE.CanvasTexture(c);
  smokeTex.colorSpace = THREE.SRGBColorSpace;
  return smokeTex;
}
// Fumaça cinza-carvão com veios vermelhos e brancos, como a estampa da regata do Maloka.
const SMOKE_TINTS = ['#5c5c66', '#74747e', '#8c8c96', '#4a4a54', '#a4a4ae', '#7a2a2a', '#6a6a74', '#b8b8c2'];

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene;
    this.camera = camera;
    this.layer = layer;
    this.add = makeSystem(THREE.AdditiveBlending);
    this.norm = makeSystem(THREE.NormalBlending);
    scene.add(this.add.pts, this.norm.pts);
    this.rings = [];
    this.smokes = [];
    this.texts = [];
    this.ambient = [];
  }

  spawn(sys, p) {
    if (sys.parts.length >= MAX) sys.parts.shift();
    sys.parts.push(p);
  }

  burst(type, pos, opts = {}) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const P = (sys, n, f) => {
      for (let i = 0; i < n; i++) this.spawn(sys, f(i));
    };
    const base = (color, life, size, vel, extra = {}) => ({
      x: pos.x + (extra.ox || 0), y: pos.y + (extra.oy || 0), z: pos.z + (extra.oz || 0),
      vx: vel[0], vy: vel[1], vz: vel[2], life, max: life, size, color: tmpColor.set(color).toArray(),
      g: extra.g ?? -6, drag: extra.drag ?? 2, grow: extra.grow ?? 0,
    });
    switch (type) {
      case 'hit':
        P(this.add, 14, () => base(Math.random() < 0.5 ? '#fff3b0' : '#ffd060', rnd(0.2, 0.4), rnd(0.25, 0.45), [rnd(-6, 6), rnd(0, 6), rnd(-6, 6)], { drag: 6 }));
        break;
      case 'hitBig':
        P(this.add, 26, () => base(Math.random() < 0.5 ? '#ffffff' : '#ffb84a', rnd(0.25, 0.5), rnd(0.35, 0.6), [rnd(-9, 9), rnd(0, 8), rnd(-9, 9)], { drag: 5 }));
        break;
      case 'interrupt':
        P(this.add, 30, (i) => {
          const a = (i / 30) * Math.PI * 2;
          return base(i % 2 ? '#9fe8ff' : '#ffffff', 0.55, 0.5, [Math.cos(a) * 8, rnd(1, 4), Math.sin(a) * 8], { drag: 4, g: 0 });
        });
        break;
      case 'dust':
        P(this.norm, opts.n || 8, () => base('#d9c49a', rnd(0.35, 0.6), rnd(0.35, 0.6), [rnd(-1.5, 1.5), rnd(0.3, 1.2), rnd(-1.5, 1.5)], { g: 0, drag: 3, grow: 1.2, oy: 0.1 }));
        break;
      case 'leaves':
        P(this.norm, opts.n || 18, () => base(Math.random() < 0.5 ? '#5fbf4a' : '#9ad65a', rnd(0.6, 1.1), rnd(0.18, 0.3), [rnd(-4, 4), rnd(1, 5), rnd(-4, 4)], { g: -5, drag: 2 }));
        break;
      case 'shards':
        P(this.norm, 22, () => base(Math.random() < 0.5 ? '#d7dbe6' : '#9aa1b5', rnd(0.5, 0.9), rnd(0.18, 0.32), [rnd(-5, 5), rnd(2, 7), rnd(-5, 5)], { g: -14, drag: 1 }));
        P(this.add, 12, () => base('#c9a0ff', rnd(0.5, 0.9), rnd(0.3, 0.5), [rnd(-2, 2), rnd(1, 3), rnd(-2, 2)], { g: 2, drag: 2 }));
        break;
      case 'restore':
        P(this.add, opts.n || 30, () => base(Math.random() < 0.5 ? '#ffe17a' : '#8ff5d0', rnd(1, 2), rnd(0.25, 0.45), [rnd(-2, 2), rnd(2, 5), rnd(-2, 2)], { g: 0.5, drag: 1, ox: rnd(-1, 1), oz: rnd(-1, 1) }));
        break;
      case 'corrupt':
        P(this.add, opts.n || 2, () => base('#a07cff', rnd(0.8, 1.4), rnd(0.25, 0.45), [rnd(-0.4, 0.4), rnd(1, 2), rnd(-0.4, 0.4)], { g: 0.5, drag: 0.5, ox: rnd(-1.2, 1.2), oz: rnd(-1.2, 1.2), oy: rnd(0, 2.5) }));
        break;
      case 'fire':
        P(this.add, opts.n || 1, () => base(Math.random() < 0.5 ? '#ffb030' : '#ff6a1a', rnd(0.4, 0.8), rnd(0.2, 0.35), [rnd(-0.3, 0.3), rnd(1.5, 2.5), rnd(-0.3, 0.3)], { g: 0, drag: 0.5, ox: rnd(-0.5, 0.5), oz: rnd(-0.5, 0.5) }));
        break;
      case 'firefly':
        P(this.add, 1, () => base(Math.random() < 0.6 ? '#e8ff8a' : '#ffffff', rnd(2.5, 4), rnd(0.08, 0.15), [rnd(-0.5, 0.5), rnd(0.1, 0.5), rnd(-0.5, 0.5)], { g: 0, drag: 0.2, ox: rnd(-12, 12), oz: rnd(-10, 8), oy: rnd(0.4, 2.5) }));
        break;
      case 'mote':
        P(this.add, 1, () => base('#c9c2e8', rnd(2.5, 4), rnd(0.07, 0.13), [rnd(-0.2, 0.2), rnd(0.2, 0.5), rnd(-0.2, 0.2)], { g: 0, drag: 0.2, ox: rnd(-12, 12), oz: rnd(-10, 8), oy: rnd(0.2, 1.5) }));
        break;
      // Sertão Velho: ossos e terra da cova, explosão de brasa, cinza fria e brasas no ar
      case 'bones':
        P(this.norm, 18, () => base(Math.random() < 0.6 ? '#e2d8c0' : '#a89c84', rnd(0.5, 0.9), rnd(0.16, 0.28), [rnd(-4, 4), rnd(2, 6), rnd(-4, 4)], { g: -14, drag: 1 }));
        P(this.add, 10, () => base('#9dffcf', rnd(0.5, 0.9), rnd(0.25, 0.4), [rnd(-1.5, 1.5), rnd(1, 3), rnd(-1.5, 1.5)], { g: 2, drag: 2 }));
        break;
      case 'grave':
        P(this.norm, 26, () => base(Math.random() < 0.5 ? '#7a4a30' : '#a8704a', rnd(0.5, 1), rnd(0.2, 0.38), [rnd(-2.5, 2.5), rnd(3, 6), rnd(-2.5, 2.5)], { g: -14, drag: 1.2 }));
        P(this.norm, 10, () => base('#b89a7a', rnd(0.6, 1), rnd(0.5, 0.8), [rnd(-1, 1), rnd(0.3, 1), rnd(-1, 1)], { g: 0, drag: 3, grow: 1.4 }));
        break;
      case 'emberBlast':
        P(this.add, 40, () => base(Math.random() < 0.5 ? '#ffd060' : '#ff5a1a', rnd(0.4, 0.8), rnd(0.3, 0.55), [rnd(-8, 8), rnd(1, 7), rnd(-8, 8)], { g: -4, drag: 3 }));
        P(this.norm, 10, () => base('#3a2a24', rnd(0.8, 1.3), rnd(0.6, 0.9), [rnd(-1.5, 1.5), rnd(1, 2.5), rnd(-1.5, 1.5)], { g: 0, drag: 2, grow: 1.5 }));
        break;
      case 'ash':
        P(this.norm, 1, () => base(Math.random() < 0.5 ? '#8c8aa0' : '#b4b0c0', rnd(3, 5), rnd(0.06, 0.11), [rnd(-0.3, 0.3), rnd(-0.35, -0.1), rnd(-0.3, 0.3)], { g: 0, drag: 0.1, ox: rnd(-12, 12), oz: rnd(-10, 8), oy: rnd(1.5, 4) }));
        break;
      case 'ember':
        P(this.add, 1, () => base(Math.random() < 0.6 ? '#ffb040' : '#ffe08a', rnd(2, 3.5), rnd(0.06, 0.11), [rnd(-0.4, 0.4), rnd(0.3, 0.7), rnd(-0.4, 0.4)], { g: 0, drag: 0.2, ox: rnd(-12, 12), oz: rnd(-10, 8), oy: rnd(0.2, 1.5) }));
        break;
      case 'poison':
        P(this.norm, opts.n || 16, () => base(Math.random() < 0.6 ? '#5cff4a' : '#1f9a2a', rnd(0.4, 0.8), rnd(0.18, 0.32), [rnd(-3, 3), rnd(1, 4), rnd(-3, 3)], { g: -6, drag: 2 }));
        break;
      case 'poisonTick':
        P(this.add, 2, () => base('#7dff5a', rnd(0.5, 0.8), rnd(0.15, 0.25), [rnd(-0.3, 0.3), rnd(0.6, 1.2), rnd(-0.3, 0.3)], { g: 0, drag: 1, ox: rnd(-0.3, 0.3), oz: rnd(-0.3, 0.3) }));
        break;
      case 'roots':
        P(this.norm, 20, () => base(Math.random() < 0.5 ? '#6e5a7e' : '#8a7a5a', rnd(0.4, 0.8), rnd(0.25, 0.45), [rnd(-3, 3), rnd(3, 7), rnd(-3, 3)], { g: -16, drag: 1 }));
        break;
      default:
        break;
    }
  }

  ring(pos, color, maxR, dur = 0.45, y = 0.08, thick = 0.18) {
    const geo = new THREE.RingGeometry(1 - thick, 1, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos.x, y, pos.z);
    m.renderOrder = 6;
    this.scene.add(m);
    this.rings.push({ m, t: 0, dur, maxR });
  }

  // Cortina de fumaça (Maloka): tufos que estouram do chão, incham até o raio, rolam devagar e se desfazem
  // no último 0,8 s, e fiapos (tufos menores) que sobem e renascem enquanto ela dura. Puramente visual;
  // quem está dentro é decidido pelo Player.
  smoke(pos, radius, dur) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);
    const puffs = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const r = radius * Math.sqrt(Math.random()) * 0.8;
      const mat = new THREE.SpriteMaterial({ map: puffTexture(), color: SMOKE_TINTS[i % SMOKE_TINTS.length], transparent: true,
        opacity: 0, depthWrite: false, rotation: Math.random() * Math.PI * 2 });
      const s = new THREE.Sprite(mat);
      const size = radius * (0.75 + Math.random() * 0.5);
      const home = new THREE.Vector3(Math.cos(a) * r, 0.3 + Math.random() * 2.0 * (1 - (r / radius) * 0.6), Math.sin(a) * r);
      s.renderOrder = 9;
      group.add(s);
      puffs.push({ s, home, size, spin: (Math.random() - 0.5) * 0.6, rise: 0.08 + Math.random() * 0.12, delay: Math.random() * 0.12 });
    }
    const wisps = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: i % 3 ? '#a6a6b0' : '#c8c8d2', transparent: true,
        opacity: 0, depthWrite: false, rotation: Math.random() * Math.PI * 2 }));
      s.renderOrder = 9;
      group.add(s);
      wisps.push({ s, age: -Math.random() * 1.6, x: 0, z: 0 });
    }
    this.scene.add(group);
    this.smokes.push({ group, puffs, wisps, t: 0, dur, radius });
    return group;
  }

  text(pos, str, cls = '') {
    const el = document.createElement('div');
    el.className = 'ftext ' + cls;
    el.textContent = str;
    this.layer.appendChild(el);
    this.texts.push({ el, pos: pos.clone(), t: 0, dur: cls.includes('info') ? 1.4 : 0.9, dx: (Math.random() - 0.5) * 30 });
  }

  update(dt) {
    for (const sys of [this.add, this.norm]) {
      const { parts, geo } = sys;
      const pos = geo.attributes.position.array;
      const col = geo.attributes.color.array;
      const size = geo.attributes.size.array;
      const alpha = geo.attributes.alpha.array;
      let n = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vz *= d;
        p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.03) {
          p.y = 0.03;
          p.vy *= -0.3;
        }
        p.size += p.grow * dt;
      }
      for (const p of parts) {
        pos[n * 3] = p.x;
        pos[n * 3 + 1] = p.y;
        pos[n * 3 + 2] = p.z;
        col[n * 3] = p.color[0];
        col[n * 3 + 1] = p.color[1];
        col[n * 3 + 2] = p.color[2];
        size[n] = p.size;
        alpha[n] = Math.min(1, (p.life / p.max) * 2);
        n++;
      }
      geo.setDrawRange(0, n);
      for (const k of ['position', 'color', 'size', 'alpha']) geo.attributes[k].needsUpdate = true;
    }
    this.add.mat.uniforms.uScale.value = this.norm.mat.uniforms.uScale.value = window.innerHeight * 0.9;

    this.rings = this.rings.filter((r) => {
      r.t += dt;
      const k = r.t / r.dur;
      const e = 1 - (1 - k) * (1 - k);
      r.m.scale.setScalar(Math.max(0.01, e * r.maxR));
      r.m.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) {
        this.scene.remove(r.m);
        r.m.geometry.dispose();
        r.m.material.dispose();
        return false;
      }
      return true;
    });

    this.smokes = this.smokes.filter((c) => {
      c.t += dt;
      const fade = Math.min(1, c.t / 0.2) * Math.max(0, Math.min(1, (c.dur - c.t) / 0.8));
      for (const p of c.puffs) {
        const u = Math.max(0, c.t - p.delay);
        const grow = 1 - Math.exp(-u * 7);   // estoura rápido, depois só rola
        p.s.position.set(p.home.x * grow, p.home.y * grow + u * p.rise, p.home.z * grow);
        p.s.scale.setScalar(p.size * (0.3 + 0.7 * grow + u * 0.03));
        p.s.material.rotation += p.spin * dt;
        p.s.material.opacity = 0.62 * fade;
      }
      // Fiapos: sobem 1,6 s a partir de um ponto da nuvem, crescem e somem; renascem em outro ponto.
      for (const w of c.wisps) {
        w.age += dt;
        if (w.age >= 1.6) {
          const a = Math.random() * Math.PI * 2, r = c.radius * Math.sqrt(Math.random()) * 0.75;
          w.age = 0; w.x = Math.cos(a) * r; w.z = Math.sin(a) * r;
        }
        const k = Math.max(0, w.age) / 1.6;
        w.s.position.set(w.x, 1.2 + k * 1.6, w.z);
        w.s.scale.setScalar(c.radius * (0.25 + k * 0.35));
        w.s.material.rotation += dt * 0.4;
        w.s.material.opacity = w.age < 0 ? 0 : Math.sin(k * Math.PI) * 0.45 * fade;
      }
      if (c.t >= c.dur) {
        this.scene.remove(c.group);
        [...c.puffs, ...c.wisps].forEach((p) => p.s.material.dispose());
        return false;
      }
      return true;
    });

    const v = new THREE.Vector3();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.texts = this.texts.filter((t) => {
      t.t += dt;
      const k = t.t / t.dur;
      v.copy(t.pos);
      v.y += k * 0.9;
      v.project(this.camera);
      t.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w + t.dx * k}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%) scale(${k < 0.12 ? 0.6 + k * 4 : 1.08 - k * 0.15})`;
      t.el.style.opacity = k > 0.65 ? (1 - k) / 0.35 : 1;
      if (k >= 1) {
        t.el.remove();
        return false;
      }
      return true;
    });
  }

  clear() {
    for (const c of this.smokes) this.scene.remove(c.group);
    this.smokes = [];
    this.add.parts.length = 0;
    this.norm.parts.length = 0;
    for (const t of this.texts) t.el.remove();
    this.texts = [];
  }
}
