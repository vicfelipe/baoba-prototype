import * as THREE from 'three';

// Texturas pintadas geradas em canvas (sem assets externos), na linha das superfícies
// pintadas à mão do Lunia: grama mesclada, terra com seixos, piso de pedra trançado,
// casca, folhagem, cartões de samambaia/capim e o círculo de runas.

export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Desenha repetindo nas bordas para a textura ladrilhar sem emenda
export function wrap(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
      fn(x + dx, y + dy);
    }
  }
}

export function blob(g, x, y, r, color) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

export function toTexture(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
export const grey = (v, a = 1) => `rgba(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)},${a})`;

// Normal (RGB, convenção OpenGL) + altura (A) a partir de um canvas de altura em tons de cinza ou da
// luminância da própria pintura. Sobel com borda ladrilhada; o resultado fica em tex.userData.nh.
// DataTexture e não canvas: o canvas pré-multiplica o alfa e destruiria a normal onde a altura é baixa.
export function withHeight(tex, hc, strength) {
  const S = hc.width;
  const T = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, S, T).data;
  const H = new Float32Array(S * T);
  for (let i = 0; i < S * T; i++) H[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  const at = (x, y) => H[((y + T) % T) * S + ((x + S) % S)];
  const out = new Uint8Array(S * T * 4);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < S; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      // o y do canvas desce e o v da textura sobe: dh/dv = -gy
      const nx = -gx * strength;
      const ny = gy * strength;
      const k = 1 / Math.hypot(nx, ny, 1);
      const o = ((T - 1 - y) * S + x) * 4;
      out[o] = (nx * k * 0.5 + 0.5) * 255;
      out[o + 1] = (ny * k * 0.5 + 0.5) * 255;
      out[o + 2] = (k * 0.5 + 0.5) * 255;
      out[o + 3] = H[y * S + x] * 255;
    }
  }
  const nh = new THREE.DataTexture(out, S, T, THREE.RGBAFormat);
  nh.wrapS = nh.wrapT = THREE.RepeatWrapping;
  nh.magFilter = THREE.LinearFilter;
  nh.minFilter = THREE.LinearMipmapLinearFilter;
  nh.generateMipmaps = true;
  nh.anisotropy = 8;
  nh.needsUpdate = true;
  tex.userData.nh = nh;
  return tex;
}

// Ruído fBm periódico (ladrilha sem emenda), um campo por canal: R e A grandes (troca de padrão, luz das
// copas), G médio, B fino. Contraste esticado para 0..1 para os limiares dos shaders serem previsíveis.
export function noiseTexture(S = 256) {
  const out = new Uint8Array(S * S * 4);
  [[4, 101], [8, 202], [16, 303], [5, 404]].forEach(([cells, seed], ch) => {
    const octs = [];
    let amp = 1;
    for (let o = 0; o < 4; o++) {
      const n = cells << o;
      octs.push({ n, amp, grid: Float32Array.from({ length: n * n }, rng(seed + o)) });
      amp *= 0.5;
    }
    const F = new Float32Array(S * S);
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let v = 0;
        for (const { n, amp: a, grid } of octs) {
          const fx = (x / S) * n;
          const fy = (y / S) * n;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
          const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
          const at = (i, j) => grid[(j % n) * n + (i % n)];
          const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
          const bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
          v += (top + (bot - top) * sy) * a;
        }
        F[y * S + x] = v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    for (let i = 0; i < S * S; i++) out[i * 4 + ch] = ((F[i] - lo) / (hi - lo)) * 255;
  });
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

export function grassTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const r = rng(11);
  g.fillStyle = '#5c9e3a';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 20 + r() * 70;
    const col = r() < 0.5 ? hsl(85 + r() * 20, 55, 52, 0.35) : hsl(120 + r() * 25, 50, 26, 0.3);
    wrap(S, x, y, rad, (px, py) => blob(g, px, py, rad, col));
  }
  // Folhinhas: traços curtos com luz de cima
  for (let i = 0; i < 9000; i++) {
    const x = r() * S;
    const y = r() * S;
    const len = 4 + r() * 9;
    const ang = -Math.PI / 2 + (r() - 0.5) * 1.1;
    const lt = r();
    g.strokeStyle = lt > 0.8 ? hsl(75 + r() * 20, 65, 66, 0.8) : lt > 0.35 ? hsl(95 + r() * 25, 55, 42, 0.75) : hsl(125, 55, 24, 0.6);
    g.lineWidth = 1 + r() * 1.6;
    wrap(S, x, y, len, (px, py) => {
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      g.stroke();
    });
  }
  // Florzinhas pontuais
  for (let i = 0; i < 40; i++) {
    const x = r() * S;
    const y = r() * S;
    const col = ['#fff7d6', '#ffd85a', '#ffb3c8'][Math.floor(r() * 3)];
    wrap(S, x, y, 4, (px, py) => {
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2, 1.6, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#e8a020';
      g.beginPath();
      g.arc(px, py, 1.3, 0, Math.PI * 2);
      g.fill();
    });
  }
  return withHeight(toTexture(c), c, 0.9);
}

export function dirtTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const [hc, h] = makeCanvas(S);
  const r = rng(23);
  g.fillStyle = '#b58a55';
  g.fillRect(0, 0, S, S);
  h.fillStyle = grey(0.3);
  h.fillRect(0, 0, S, S);
  for (let i = 0; i < 220; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 15 + r() * 60;
    const light = r() < 0.5;
    wrap(S, x, y, rad, (px, py) => {
      blob(g, px, py, rad, light ? hsl(35, 50, 68, 0.3) : hsl(25, 45, 32, 0.25));
      blob(h, px, py, rad, light ? grey(1, 0.12) : grey(0, 0.12));
    });
  }
  // Seixos com luz e sombra
  for (let i = 0; i < 300; i++) {
    const x = r() * S;
    const y = r() * S;
    const w = 2 + r() * 6;
    const ht = w * (0.5 + r() * 0.4);
    const rot = r() * Math.PI;
    const tone = 50 + r() * 25;
    wrap(S, x, y, w + 2, (px, py) => {
      g.fillStyle = 'rgba(60,40,20,0.45)';
      g.beginPath();
      g.ellipse(px + 1.2, py + 1.5, w, ht, rot, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = hsl(30, 18, tone);
      g.beginPath();
      g.ellipse(px, py, w, ht, rot, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = hsl(40, 30, tone + 12, 0.5);
      g.beginPath();
      g.ellipse(px - w * 0.25, py - ht * 0.3, w * 0.45, ht * 0.35, rot, 0, Math.PI * 2);
      g.fill();
      // cúpula: anéis cada vez mais altos até o topo
      for (const [k, v] of [[1, 0.45], [0.6, 0.55]]) {
        h.fillStyle = grey(v);
        h.beginPath();
        h.ellipse(px, py, w * k, ht * k, rot, 0, Math.PI * 2);
        h.fill();
      }
    });
  }
  return withHeight(toTexture(c), hc, 0.9);
}

// Piso de pedra em trama (basketweave), como os pátios antigos do Lunia
export function paveTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const [hc, hg] = makeCanvas(S);
  const r = rng(37);
  g.fillStyle = '#7a6a4c';
  g.fillRect(0, 0, S, S);
  hg.fillStyle = grey(0.1);
  hg.fillRect(0, 0, S, S);
  const cell = S / 4;
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const vertical = (cx + cy) % 2 === 0;
      for (let k = 0; k < 3; k++) {
        const gap = 3;
        let x;
        let y;
        let w;
        let h;
        if (vertical) {
          x = cx * cell + (k * cell) / 3 + gap / 2;
          y = cy * cell + gap / 2;
          w = cell / 3 - gap;
          h = cell - gap;
        } else {
          x = cx * cell + gap / 2;
          y = cy * cell + (k * cell) / 3 + gap / 2;
          w = cell - gap;
          h = cell / 3 - gap;
        }
        const l = 66 + r() * 12;
        const grd = g.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0, hsl(42, 38, l + 6));
        grd.addColorStop(1, hsl(38, 32, l - 8));
        g.fillStyle = grd;
        g.fillRect(x, y, w, h);
        // borda clara em cima/esquerda, escura embaixo/direita
        g.fillStyle = 'rgba(255,248,220,0.5)';
        g.fillRect(x, y, w, 2);
        g.fillRect(x, y, 2, h);
        g.fillStyle = 'rgba(70,50,25,0.45)';
        g.fillRect(x, y + h - 2.5, w, 2.5);
        g.fillRect(x + w - 2.5, y, 2.5, h);
        // altura: chanfro em degraus (o Sobel suaviza) e topo levemente torto por pedra
        const top = 0.78 + r() * 0.12;
        for (const [k, v] of [[0, top - 0.22], [2, top - 0.1], [5, top]]) {
          hg.fillStyle = grey(v);
          hg.fillRect(x + k, y + k, w - k * 2, h - k * 2);
        }
        // manchas e lascas (as escuras afundam a pedra)
        for (let s = 0; s < 6; s++) {
          const bx = x + r() * w;
          const by = y + r() * h;
          const br = 3 + r() * 9;
          const dark = r() < 0.5;
          blob(g, bx, by, br, dark ? 'rgba(120,95,60,0.25)' : 'rgba(255,245,215,0.25)');
          if (dark) blob(hg, bx, by, br * 0.7, grey(0.35, 0.5));
        }
      }
    }
  }
  // musgo nas juntas
  for (let i = 0; i < 180; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 3 + r() * 7;
    wrap(S, x, y, rad, (px, py) => blob(g, px, py, rad, hsl(95, 45, 35, 0.35)));
  }
  return withHeight(toTexture(c), hc, 1.6);
}

export function barkTexture() {
  const [c, g] = makeCanvas(256);
  const r = rng(5);
  g.fillStyle = '#6e4a2c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = r() * 256;
    const w = 2 + r() * 6;
    g.fillStyle = r() < 0.5 ? 'rgba(40,24,12,0.45)' : 'rgba(170,120,75,0.35)';
    g.beginPath();
    g.moveTo(x, 0);
    let px = x;
    for (let y = 0; y <= 256; y += 16) {
      px += (r() - 0.5) * 4;
      g.lineTo(px, y);
    }
    g.lineTo(px + w, 256);
    for (let y = 256; y >= 0; y -= 16) g.lineTo(x + w + (r() - 0.5) * 3, y);
    g.fill();
  }
  for (let i = 0; i < 30; i++) blob(g, r() * 256, r() * 256, 6 + r() * 14, 'rgba(90,130,60,0.35)');
  return withHeight(toTexture(c), c, 0.6);
}

// Atlas 2×2 de cachos de folhas para as copas em cartões: cada célula é um tufo diferente, folhas
// pontudas saindo da base, escuras embaixo e com luz em cima. Branco-esverdeado: a cor da instância tinge.
export function leafClusterAtlas() {
  const S = 256;
  const C = S / 2;
  const [c, g] = makeCanvas(S);
  const r = rng(616);
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * C;
    const oy = Math.floor(cell / 2) * C;
    const leaves = [];
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * C * 0.27;
      leaves.push({ x: ox + C / 2 + Math.cos(a) * d, y: oy + C / 2 + Math.sin(a) * d * 0.85, rot: a + (r() - 0.5) * 0.8, len: C * (0.13 + r() * 0.08) });
    }
    // de baixo para cima: as folhas de cima ficam por cima e mais claras
    leaves.sort((p, q) => q.y - p.y);
    for (const lf of leaves) {
      const up = 1 - (lf.y - oy) / C;
      const lightness = 38 + up * 34 + r() * 8;
      g.save();
      g.translate(lf.x, lf.y);
      g.rotate(lf.rot);
      g.fillStyle = hsl(95 + r() * 30, 35, lightness * 0.55);
      g.beginPath();
      g.ellipse(1.5, 2, lf.len, lf.len * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      const grd = g.createLinearGradient(-lf.len, 0, lf.len, 0);
      grd.addColorStop(0, hsl(100, 30, lightness - 8));
      grd.addColorStop(1, hsl(80, 40, Math.min(96, lightness + 14)));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(-lf.len, 0);
      g.quadraticCurveTo(0, -lf.len * 0.55, lf.len, 0);
      g.quadraticCurveTo(0, lf.len * 0.5, -lf.len, 0);
      g.fill();
      g.strokeStyle = hsl(110, 30, lightness - 18, 0.6);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-lf.len * 0.9, 0);
      g.lineTo(lf.len * 0.8, 0);
      g.stroke();
      g.restore();
    }
  }
  return toTexture(c, false);
}

// Chapéu de cogumelo no UV do torno. O perfil vai de baixo para cima, então no canvas y = t·H com t = 0 no
// topo do chapéu, ~0.55 na borda e 1 no centro de baixo. map: topo claro, borda mais escura, pintas creme e
// lamelas por baixo; glow: só pintas e lamelas brilham (o tom vem da cor da instância).
export function mushroomCapTextures() {
  const W = 256;
  const H = 128;
  const [c, g] = makeCanvas(W, H);
  const [ec, e] = makeCanvas(W, H);
  const r = rng(808);
  const rim = 0.55 * H;
  const top = g.createLinearGradient(0, 0, 0, rim);
  top.addColorStop(0, '#ffffff');
  top.addColorStop(0.7, '#e3edf0');
  top.addColorStop(1, '#9fb2ba');
  g.fillStyle = top;
  g.fillRect(0, 0, W, rim);
  g.fillStyle = '#6f8d95';
  g.fillRect(0, rim, W, H - rim);
  e.fillStyle = grey(0.1);
  e.fillRect(0, 0, W, H);
  // lamelas: raios do centro de baixo até a borda = linhas verticais no UV
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * W;
    g.fillStyle = 'rgba(210,240,240,0.55)';
    g.fillRect(x, rim + 4, 1.5, H - rim - 4);
    e.fillStyle = grey(0.85);
    e.fillRect(x, rim + 2, 1.5, H - rim - 2);
  }
  // pintas no topo, menores perto da borda
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const t = 0.06 + r() * 0.4;
    const rad = 2.5 + (0.5 - t) * 12 + r() * 2.5;
    for (const dx of [-W, 0, W]) {
      blob(g, x + dx, t * H, rad, 'rgba(255,250,225,0.95)');
      blob(e, x + dx, t * H, rad, 'rgba(255,255,255,0.9)');
    }
  }
  return { map: toTexture(c), glow: toTexture(ec) };
}

// Fronde de palmeira: nervura central ao longo de v e folíolos finos pendendo para os lados
export function palmFrondCard() {
  const [c, g] = makeCanvas(128, 256);
  const r = rng(321);
  for (let i = 0; i < 30; i++) {
    const t = i / 30;
    const y = 250 - t * 244;
    const len = 58 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)) + 6;
    for (const s of [-1, 1]) {
      const grd = g.createLinearGradient(64, y, 64 + s * len, y + 14);
      grd.addColorStop(0, hsl(105, 40, 42 + r() * 8));
      grd.addColorStop(1, hsl(85, 50, 66 + r() * 10));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(64, y);
      g.quadraticCurveTo(64 + s * len * 0.6, y - 3, 64 + s * len, y + 12);
      g.quadraticCurveTo(64 + s * len * 0.5, y + 6, 64, y + 6);
      g.fill();
    }
  }
  g.strokeStyle = hsl(60, 35, 55);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(64, 256);
  g.lineTo(64, 4);
  g.stroke();
  return toTexture(c, false);
}

// Folhagem em cachos para as copas
export function foliageTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const r = rng(71);
  g.fillStyle = '#2f7a3a';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = r() * S;
    const y = r() * S;
    const w = 6 + r() * 10;
    const h = w * 0.55;
    const rot = r() * Math.PI;
    const t = r();
    const col = t > 0.85 ? hsl(80, 60, 62) : t > 0.55 ? hsl(105, 50, 44) : t > 0.25 ? hsl(135, 45, 32) : hsl(160, 45, 24);
    wrap(S, x, y, w, (px, py) => {
      g.fillStyle = 'rgba(15,40,20,0.35)';
      g.beginPath();
      g.ellipse(px + 1.5, py + 2, w, h, rot, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(px, py, w, h, rot, 0, Math.PI * 2);
      g.fill();
    });
  }
  return toTexture(c);
}

// Cartão de samambaia com transparência (folíolos azul-esverdeados)
export function fernCard(hue = 175) {
  const [c, g] = makeCanvas(128, 256);
  g.clearRect(0, 0, 128, 256);
  const r = rng(hue);
  g.strokeStyle = hsl(hue - 30, 35, 34);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(64, 256);
  g.quadraticCurveTo(70, 120, 60, 6);
  g.stroke();
  // folíolos arredondados (gotas), da base larga até a ponta, sem pontas agudas
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const y = 246 - t * 232;
    const x = 64 + Math.sin(t * 2) * 4;
    const len = 14 + 34 * Math.sin(Math.PI * (0.14 + t * 0.78)); // fronde oval: ponta arredondada
    for (const s of [-1, 1]) {
      const grd = g.createLinearGradient(x, y, x + s * len, y - 8);
      grd.addColorStop(0, hsl(hue, 45, 38 + r() * 8));
      grd.addColorStop(1, hsl(hue - 15, 55, 60 + r() * 10));
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x + s * len * 0.52, y - 4 - t * 3, len * 0.52, 5.5 + (1 - t) * 3, s * -0.22, 0, Math.PI * 2);
      g.fill();
    }
  }
  return toTexture(c, false);
}

// Tufo de capim macio: folhas largas de ponta arredondada, curvadas para fora, base em verde médio
export function grassCard() {
  const [c, g] = makeCanvas(128);
  const r = rng(99);
  for (let i = 0; i < 16; i++) {
    const x = 26 + r() * 76;
    const h = 40 + r() * 50;
    const bend = (x - 64) * 0.5 + (r() - 0.5) * 20;
    const w = 4 + r() * 3;
    const grd = g.createLinearGradient(0, 128, 0, 128 - h);
    grd.addColorStop(0, hsl(110, 45, 34));
    grd.addColorStop(1, hsl(80 + r() * 20, 55, 60 + r() * 10));
    g.fillStyle = grd;
    const tx = x + bend;
    const ty = 128 - h;
    g.beginPath();
    g.moveTo(x - w, 128);
    g.quadraticCurveTo(x - w + bend * 0.4, 128 - h * 0.6, tx - w * 0.6, ty + w);
    g.quadraticCurveTo(tx, ty - w * 0.8, tx + w * 0.6, ty + w);
    g.quadraticCurveTo(x + w + bend * 0.4, 128 - h * 0.6, x + w, 128);
    g.fill();
  }
  return toTexture(c, false);
}

export function leafCard() {
  const [c, g] = makeCanvas(128, 256);
  const grd = g.createLinearGradient(0, 256, 0, 0);
  grd.addColorStop(0, '#1f6a3a');
  grd.addColorStop(1, '#6cc25a');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(64, 256);
  g.bezierCurveTo(-10, 180, 10, 40, 64, 4);
  g.bezierCurveTo(118, 40, 138, 180, 64, 256);
  g.fill();
  g.strokeStyle = 'rgba(220,255,200,0.55)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(64, 250);
  g.lineTo(64, 10);
  g.stroke();
  g.lineWidth = 1.5;
  for (let y = 40; y < 240; y += 18) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(64, y + 10);
      g.quadraticCurveTo(64 + s * 25, y, 64 + s * 42, y - 8);
      g.stroke();
    }
  }
  return toTexture(c, false);
}

// Círculo de runas branco sobre transparente; tingido nos shaders
export function runeTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const r = rng(404);
  const C = S / 2;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.translate(C, C);
  const ring = (rad, w) => {
    g.lineWidth = w;
    g.beginPath();
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.stroke();
  };
  ring(250, 6);
  ring(236, 2);
  ring(180, 4);
  ring(168, 1.5);
  ring(70, 3);
  // runas na faixa externa
  for (let i = 0; i < 36; i++) {
    g.save();
    g.rotate((i / 36) * Math.PI * 2);
    g.translate(0, -208);
    g.lineWidth = 2.5;
    g.beginPath();
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x0 = (r() - 0.5) * 18;
      const y0 = (r() - 0.5) * 22;
      g.moveTo(x0, y0);
      g.lineTo(x0 + (r() - 0.5) * 16, y0 + (r() - 0.5) * 18);
    }
    g.stroke();
    if (r() < 0.4) {
      g.beginPath();
      g.arc(0, 0, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  // estrela de seis pontas
  g.lineWidth = 3;
  for (const off of [0, Math.PI / 3]) {
    g.beginPath();
    for (let k = 0; k <= 3; k++) {
      const a = off + (k / 3) * Math.PI * 2 - Math.PI / 2;
      k ? g.lineTo(Math.cos(a) * 168, Math.sin(a) * 168) : g.moveTo(Math.cos(a) * 168, Math.sin(a) * 168);
    }
    g.stroke();
  }
  // raios
  g.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 74, Math.sin(a) * 74);
    g.lineTo(Math.cos(a) * 160, Math.sin(a) * 160);
    g.globalAlpha = i % 2 ? 0.4 : 0.8;
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// Ruído suave para tecido/pele, quebrando a cor chapada
export function clothTexture(seed = 3, strength = 0.18) {
  const [c, g] = makeCanvas(256);
  const r = rng(seed);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const rad = 8 + r() * 30;
    wrap(256, x, y, rad, (px, py) => blob(g, px, py, rad, r() < 0.5 ? `rgba(0,0,0,${strength * 0.6})` : `rgba(255,255,255,${strength})`));
  }
  for (let i = 0; i < 90; i++) {
    const y = r() * 256;
    g.strokeStyle = `rgba(0,0,0,${strength * 0.45})`;
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    g.moveTo(r() * 256, y);
    g.quadraticCurveTo(r() * 256, y + (r() - 0.5) * 30, r() * 256, y + (r() - 0.5) * 20);
    g.stroke();
  }
  return toTexture(c);
}

// ---------- Roupa e cabelo do Lutador (acabamento pintado da folha de referência) ----------
// UV do torno: u = volta (0 frente, 0.25 lado, 0.5 costas), v = altura (0 barra, 1 gola)

function inkLine(g, pts, w, a = 0.75) {
  g.strokeStyle = `rgba(40,38,40,${a})`;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}

function fold(g, x, y, len, ang, w, a) {
  g.strokeStyle = `rgba(70,72,80,${a})`;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + 6, y + Math.sin(ang) * len * 0.5 - 4, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  g.stroke();
}

export function shirtTexture() {
  const W = 512;
  const H = 512;
  const [c, g] = makeCanvas(W, H);
  const r = rng(808);
  // tecido claro com sombra pintada embaixo e luz no peito
  const grd = g.createLinearGradient(0, H, 0, 0);
  grd.addColorStop(0, '#c9c9cc');
  grd.addColorStop(0.35, '#ededee');
  grd.addColorStop(1, '#ffffff');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) blob(g, r() * W, r() * H, 10 + r() * 40, r() < 0.5 ? 'rgba(170,172,182,0.18)' : 'rgba(255,255,255,0.25)');
  // costuras laterais e barra
  for (const u of [0.25, 0.75]) inkLine(g, [[u * W, H], [u * W + 2, H * 0.5], [u * W, 0]], 2.2);
  inkLine(g, [[0, H - 10], [W, H - 10]], 2, 0.6);
  // dobras na barriga (frente) e nas costas (escápulas)
  // dobras diagonais nas laterais da barriga (puxadas para o quadril)
  for (const [cx, ang] of [[0.16, 2.3], [0.84, 0.85]]) for (let k = 0; k < 2; k++) fold(g, cx * W + (r() - 0.5) * 16, H * (0.66 + k * 0.1), 45 + r() * 20, ang + (r() - 0.5) * 0.2, 2.4, 0.32);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) fold(g, W * (0.5 + s * (0.08 + k * 0.03)), H * (0.25 + k * 0.07), 50, s > 0 ? -2.2 : -0.9, 3, 0.4);
  // gola
  inkLine(g, [[0, 6], [W, 6]], 3, 0.5);
  return toTexture(c);
}

export function sleeveTexture() {
  const [c, g] = makeCanvas(256);
  g.fillStyle = '#f2f2f3';
  g.fillRect(0, 0, 256, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(160,160,170,0.35)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  inkLine(g, [[0, 236], [256, 236]], 4, 0.7);
  inkLine(g, [[128, 0], [128, 256]], 2, 0.45);
  fold(g, 40, 120, 60, 0.4, 3, 0.35);
  fold(g, 180, 150, 50, 2.6, 3, 0.3);
  return toTexture(c);
}

export function shortsTexture() {
  const W = 512;
  const [c, g] = makeCanvas(W);
  const r = rng(909);
  const grd = g.createLinearGradient(0, W, 0, 0);
  grd.addColorStop(0, '#cfcfd2');
  grd.addColorStop(1, '#e4e4e6');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, W);
  for (let i = 0; i < 90; i++) blob(g, r() * W, r() * W, 10 + r() * 35, r() < 0.5 ? 'rgba(140,140,150,0.2)' : 'rgba(255,255,255,0.2)');
  for (const u of [0.25, 0.75]) inkLine(g, [[u * W, 0], [u * W, W]], 2.4);
  // bolsos frontais e braguilha
  inkLine(g, [[0.08 * W, 20], [0.14 * W, 150], [0.2 * W, 190]], 2.4, 0.7);
  inkLine(g, [[0.92 * W, 20], [0.86 * W, 150], [0.8 * W, 190]], 2.4, 0.7);
  inkLine(g, [[0.02 * W, 20], [0.02 * W, 170]], 2, 0.55);
  // cós
  inkLine(g, [[0, 26], [W, 26]], 2.5, 0.6);
  for (let k = 0; k < 6; k++) fold(g, r() * W, W * (0.4 + r() * 0.4), 40, (r() - 0.5) * 1.2, 2.5, 0.35);
  return toTexture(c);
}

// Perna da bermuda (cilindro): costura lateral e dobras
export function shortsLegTexture() {
  const [c, g] = makeCanvas(256);
  const r = rng(77);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#e2e2e4');
  grd.addColorStop(1, '#a9a9ac');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  inkLine(g, [[64, 0], [64, 256]], 2, 0.6);
  inkLine(g, [[192, 0], [192, 256]], 2, 0.4);
  for (let k = 0; k < 5; k++) fold(g, r() * 256, 60 + r() * 150, 50, (r() - 0.5) * 0.8, 3, 0.35);
  return toTexture(c);
}

// Loc: faixas ao longo do comprimento (u) sugerindo os segmentos enrolados
export function locTexture() {
  const [c, g] = makeCanvas(256, 64);
  g.fillStyle = '#3a2a1e';
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 16; i++) {
    const x = i * 16;
    const grd = g.createLinearGradient(x, 0, x + 16, 0);
    grd.addColorStop(0, 'rgba(14,9,6,0.75)');
    grd.addColorStop(0.4, 'rgba(96,70,50,0.3)');
    grd.addColorStop(1, 'rgba(14,9,6,0.75)');
    g.fillStyle = grd;
    g.fillRect(x, 0, 16, 64);
  }
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.45, 'rgba(255,220,180,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 64);
  return toTexture(c);
}

// Pele: variação quente sutil, mais avermelhada nas partes altas
export function skinTexture() {
  const [c, g] = makeCanvas(256);
  const r = rng(515);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const rad = 10 + r() * 40;
    wrap(256, x, y, rad, (px, py) => blob(g, px, py, rad, r() < 0.5 ? 'rgba(255,190,150,0.16)' : 'rgba(120,60,40,0.1)'));
  }
  return toTexture(c);
}
