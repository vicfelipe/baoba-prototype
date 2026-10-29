import * as THREE from 'three';

// Avisos no chão em forma de círculo mágico (referência Lunia), mantendo borda nítida e
// preenchimento crescente exigidos pelo doc 03, seção 5.
// Um único shader cobre círculo (meio-ângulo = PI) e cone.

const vert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Círculo mágico: preenchimento crescente, runas girando, aro luminoso e borda escura fina
const frag = `
  uniform vec3 uColor;
  uniform float uHalf;
  uniform float uProgress;
  uniform float uAlpha;
  uniform float uFlash;
  uniform float uTime;
  uniform float uRadius;
  uniform float uInner;
  uniform sampler2D tRune;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = abs(atan(p.x, p.y));
    if (r > 1.0 || a > uHalf || r < uInner) discard;
    float px = 1.0 / (uRadius * 30.0);
    float edgeR = max(smoothstep(1.0 - px * 5.0, 1.0 - px * 1.5, r), uInner > 0.0 ? smoothstep(uInner + px * 5.0, uInner + px * 1.5, r) : 0.0);
    float edgeA = uHalf < 3.1 ? smoothstep(uHalf - px * 5.0 / max(r, 0.05), uHalf - px * 1.0 / max(r, 0.05), a) : 0.0;
    float edge = max(edgeR, edgeA);
    float rim = max(smoothstep(px * 8.0, 0.0, abs(r - (1.0 - px * 7.0))), uInner > 0.0 ? smoothstep(px * 8.0, 0.0, abs(r - uInner - px * 7.0)) : 0.0);
    rim = max(rim, uHalf < 3.1 ? smoothstep(px * 8.0, 0.0, abs(a - uHalf + px * 7.0 / max(r, 0.05)) * max(r, 0.05)) : 0.0);
    float ang = uTime * 0.6;
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    float rune = texture2D(tRune, rot * p * 0.5 + 0.5).a;
    // anel (uInner > 0): enche de fora para dentro, como a água subindo pela borda
    float k = uInner > 0.0 ? (1.0 - r) / (1.0 - uInner) : r;
    float fill = step(k, uProgress);
    vec3 col = uColor * (0.35 + fill * 0.35);
    float alpha = 0.28 + fill * 0.3;
    col += uColor * rune * (0.8 + fill * 1.2);
    alpha = max(alpha, rune * 0.85);
    float front = smoothstep(0.05, 0.0, abs(k - uProgress)) * step(0.02, uProgress);
    col += vec3(1.0, 0.9, 0.85) * front * 1.4;
    alpha = max(alpha, front);
    col = mix(col, uColor * 1.8 + 0.3, rim);
    alpha = max(alpha, rim);
    col = mix(col, vec3(0.12, 0.03, 0.03), edge);
    alpha = max(alpha, edge * 0.9);
    col = mix(col, vec3(2.0, 1.8, 1.7), uFlash);
    alpha = mix(alpha, 0.95, uFlash);
    gl_FragColor = vec4(col, alpha * uAlpha);
  }
`;

// Faixa (investida): mesmo círculo mágico esticado numa linha. vUv.y = 0 na origem, 1 no fim;
// preenche da origem para o fim. uRadius = meia largura, uLen = comprimento (m).
const rectFrag = `
  uniform vec3 uColor;
  uniform float uProgress;
  uniform float uAlpha;
  uniform float uFlash;
  uniform float uTime;
  uniform float uRadius;
  uniform float uLen;
  uniform sampler2D tRune;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float f = vUv.y;
    vec2 d = (1.0 - abs(p)) * vec2(uRadius, uLen * 0.5);
    float e = min(d.x, d.y);
    float edge = smoothstep(0.17, 0.05, e);
    float rim = smoothstep(0.27, 0.0, abs(e - 0.23));
    vec2 q = vec2(p.x * 0.5 + 0.5, fract(f * uLen / (2.0 * uRadius) - uTime * 0.6));
    float rune = texture2D(tRune, q).a;
    float fill = step(f, uProgress);
    vec3 col = uColor * (0.35 + fill * 0.35);
    float alpha = 0.28 + fill * 0.3;
    col += uColor * rune * (0.8 + fill * 1.2);
    alpha = max(alpha, rune * 0.85);
    float front = smoothstep(0.25 / uLen, 0.0, abs(f - uProgress)) * step(0.02, uProgress);
    col += vec3(1.0, 0.9, 0.85) * front * 1.4;
    alpha = max(alpha, front);
    col = mix(col, uColor * 1.8 + 0.3, rim);
    alpha = max(alpha, rim);
    col = mix(col, vec3(0.12, 0.03, 0.03), edge);
    alpha = max(alpha, edge * 0.9);
    col = mix(col, vec3(2.0, 1.8, 1.7), uFlash);
    alpha = mix(alpha, 0.95, uFlash);
    gl_FragColor = vec4(col, alpha * uAlpha);
  }
`;

let runeTex = null;
export function setRuneTexture(t) {
  runeTex = t;
}

const planeGeo = new THREE.PlaneGeometry(2, 2);
// Raio: triângulo fino deitado, base no centro e ponta em -z local (girado para fora)
const spikeGeo = new THREE.PlaneGeometry(0.5, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
const spikeTex = (() => {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, 128);
  g.lineTo(16, 0);
  g.lineTo(32, 128);
  g.fill();
  return new THREE.CanvasTexture(c);
})();
planeGeo.rotateX(-Math.PI / 2);

export class Telegraphs {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.spikes = [];
    this.time = 0;
  }

  // dir: Vector3 (direção do cone), angleDeg: abertura total.
  // Com length: faixa que parte de (x, z) na direção dir, com meia largura radius.
  // Com inner: anel entre inner e radius (maré alta do Porto, doc 25).
  add({ x, z, radius, angleDeg = 360, dir = null, length = 0, inner = 0, color = '#ff3a3a' }) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uHalf: { value: angleDeg >= 360 ? Math.PI : (angleDeg / 2) * (Math.PI / 180) },
        uProgress: { value: 0 },
        uAlpha: { value: 1 },
        uFlash: { value: 0 },
        uTime: { value: 0 },
        uRadius: { value: radius },
        uInner: { value: inner / radius },
        uLen: { value: length },
        tRune: { value: runeTex },
      },
      vertexShader: vert,
      fragmentShader: length ? rectFrag : frag,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.scale.set(radius, 1, length ? length / 2 : radius);
    mesh.position.set(x + (length ? dir.x * length / 2 : 0), 0.04 + this.list.length * 0.002, z + (length ? dir.z * length / 2 : 0));
    mesh.renderOrder = 5;
    if (dir) mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
    this.scene.add(mesh);
    const tg = { mesh, mat, dead: false, fade: -1, x, z, radius, angleDeg, length, dir, rotY: mesh.rotation.y, color };
    this.list.push(tg);
    return tg;
  }

  setProgress(tg, p) {
    if (!tg) return;
    tg.mat.uniforms.uProgress.value = Math.min(1, p);
  }

  // Resolve com um clarão breve e some
  resolve(tg) {
    if (!tg || tg.fade >= 0) return;
    tg.fade = 0;
    tg.mat.uniforms.uProgress.value = 1;
    this.burstSpikes(tg);
  }

  // Raios de luz que irrompem do círculo no impacto
  burstSpikes(tg) {
    if (tg.length) {   // faixa: raios ao longo da linha, apontando para o fim
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Mesh(spikeGeo, new THREE.MeshBasicMaterial({ map: spikeTex, color: tg.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        const k = (i / 6) * tg.length * 0.85;
        m.position.set(tg.x + tg.dir.x * k, 0.25, tg.z + tg.dir.z * k);
        m.rotation.set(0, tg.rotY, 0);
        m.userData = { t: 0, len: tg.radius * 1.6 };
        this.scene.add(m);
        this.spikes.push(m);
      }
      return;
    }
    const n = tg.angleDeg >= 360 ? 14 : Math.max(5, Math.round(tg.angleDeg / 14));
    const half = tg.angleDeg >= 360 ? Math.PI : (tg.angleDeg / 2) * (Math.PI / 180);
    for (let i = 0; i < n; i++) {
      const a = tg.angleDeg >= 360 ? (i / n) * Math.PI * 2 : -half + (i / (n - 1)) * half * 2;
      const m = new THREE.Mesh(spikeGeo, new THREE.MeshBasicMaterial({ map: spikeTex, color: tg.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(tg.x, 0.25, tg.z);
      m.rotation.set(0, tg.rotY + a, 0);
      m.userData = { t: 0, len: tg.radius * (0.9 + Math.random() * 0.5) };
      this.scene.add(m);
      this.spikes.push(m);
    }
  }

  remove(tg) {
    if (!tg) return;
    tg.dead = true;
  }

  clear() {
    for (const tg of this.list) tg.dead = true;
    this.update(0);
  }

  update(dt) {
    this.time += dt;
    this.spikes = this.spikes.filter((m) => {
      m.userData.t += dt;
      const k = m.userData.t / 0.4;
      m.scale.set(0.5 + k * 0.6, 1, m.userData.len * Math.min(1, k * 3));
      m.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) {
        this.scene.remove(m);
        m.material.dispose();
        return false;
      }
      return true;
    });
    for (const tg of this.list) {
      tg.mat.uniforms.uTime.value = this.time;
      if (tg.fade >= 0) {
        tg.fade += dt;
        const k = tg.fade / 0.35;
        tg.mat.uniforms.uFlash.value = Math.max(0, 1 - k * 2);
        tg.mat.uniforms.uAlpha.value = Math.max(0, 1 - k);
        if (k >= 1) tg.dead = true;
      }
    }
    this.list = this.list.filter((tg) => {
      if (tg.dead) {
        this.scene.remove(tg.mesh);
        tg.mat.dispose();
        return false;
      }
      return true;
    });
  }
}

// Ponto dentro do cone/círculo considerando o raio do alvo (disco intersecta a forma)
export function hitsShape({ x, z, radius, angleDeg = 360, dir = null, length = 0, inner = 0 }, px, pz, pr) {
  const dx = px - x;
  const dz = pz - z;
  if (length) {   // faixa: ao longo de dir entre 0 e length, meia largura radius
    const along = dx * dir.x + dz * dir.z, side = Math.abs(dx * dir.z - dz * dir.x);
    return along >= -pr && along <= length + pr && side <= radius + pr;
  }
  const d = Math.hypot(dx, dz);
  if (d > radius + pr || (inner && d < inner - pr)) return false;
  if (angleDeg >= 360 || d < pr) return true;
  const half = (angleDeg / 2) * (Math.PI / 180);
  const ang = Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dz * dir.z) / d)));
  // tolerância angular equivalente ao raio do alvo
  return ang <= half + Math.asin(Math.min(1, pr / d));
}
