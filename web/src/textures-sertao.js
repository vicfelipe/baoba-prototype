import { rng, makeCanvas, wrap, blob, toTexture, hsl, grey, withHeight } from './textures.js';

// Texturas pintadas do Sertão Velho (fase 2), na mesma linha das da Mata Viva: geradas em canvas,
// com normal + altura (userData.nh) nas que vão para o chão.

// Barro vermelho rachado da seca: placas de Voronoi (grade com jitter, ladrilhável) com bordas
// levantadas pela secagem, fendas escuras e fundas entre elas, poeira clara e seixos por cima.
export function clayTexture() {
  const S = 512;
  const N = 7;
  const cell = S / N;
  const r = rng(1907);
  const pts = Array.from({ length: N * N }, () => [r(), r(), 0.82 + r() * 0.3]);
  const [c, g] = makeCanvas(S);
  const [hc, h] = makeCanvas(S);
  const col = g.createImageData(S, S);
  const hgt = h.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      let d1 = 9;
      let d2 = 9;
      let tone = 1;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const cx = gx + i;
          const cy = gy + j;
          const p = pts[((cy + N) % N) * N + ((cx + N) % N)];
          const d = Math.hypot(cx + p[0] - x / cell, cy + p[1] - y / cell);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            tone = p[2];
          } else if (d < d2) d2 = d;
        }
      }
      const e = d2 - d1;
      const crack = 1 - Math.min(1, Math.max(0, (e - 0.014) / 0.03));
      const rim = Math.max(0, 1 - e / 0.22);
      const o = (y * S + x) * 4;
      const k = tone * (1 + rim * 0.12) * (1 - crack * 0.62);
      col.data[o] = Math.min(255, 172 * k);
      col.data[o + 1] = Math.min(255, 92 * k);
      col.data[o + 2] = Math.min(255, 60 * k);
      col.data[o + 3] = 255;
      const hv = (0.55 + rim * 0.22) * (1 - crack * 0.9) * 255;
      hgt.data[o] = hgt.data[o + 1] = hgt.data[o + 2] = hv;
      hgt.data[o + 3] = 255;
    }
  }
  g.putImageData(col, 0, 0);
  h.putImageData(hgt, 0, 0);
  for (let i = 0; i < 160; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 14 + r() * 50;
    const light = r() < 0.55;
    wrap(S, x, y, rad, (px, py) => blob(g, px, py, rad, light ? hsl(28, 40, 70, 0.16) : hsl(12, 50, 24, 0.14)));
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * S;
    const y = r() * S;
    const w = 1.5 + r() * 3.5;
    const tone = 58 + r() * 15;
    wrap(S, x, y, w + 2, (px, py) => {
      g.fillStyle = 'rgba(50,25,15,0.4)';
      g.beginPath();
      g.ellipse(px + 1, py + 1.2, w, w * 0.7, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = hsl(30, 20, tone);
      g.beginPath();
      g.ellipse(px, py, w, w * 0.7, 0, 0, Math.PI * 2);
      g.fill();
      h.fillStyle = grey(0.85);
      h.beginPath();
      h.ellipse(px, py, w * 0.8, w * 0.55, 0, 0, Math.PI * 2);
      h.fill();
    });
  }
  return withHeight(toTexture(c), hc, 1.4);
}

// Parede de taipa caiada: cal encardida, reboco descascado mostrando o barro, rachaduras e sujeira
// subindo do chão. Uma face inteira por textura (sem repetição): o pé da parede fica embaixo.
export function whitewashTexture() {
  const S = 256;
  const [c, g] = makeCanvas(S);
  const r = rng(733);
  g.fillStyle = '#e6dccb';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) blob(g, r() * S, r() * S, 12 + r() * 40, r() < 0.5 ? 'rgba(170,150,120,0.16)' : 'rgba(255,252,240,0.2)');
  // reboco caído: manchas irregulares de barro com borda escura
  for (let i = 0; i < 9; i++) {
    const x = r() * S;
    const y = S * 0.25 + r() * S * 0.7;
    const rad = 8 + r() * 22;
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const rr = rad * (0.6 + r() * 0.5);
      if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
      else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
    }
    g.closePath();
    g.fillStyle = hsl(18, 42, 44);
    g.strokeStyle = 'rgba(70,40,25,0.7)';
    g.lineWidth = 2;
    g.fill();
    g.stroke();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = 'rgba(90,45,25,0.5)';
      g.fillRect(x - rad * 0.6 + r() * rad, y - rad * 0.4 + r() * rad * 0.6, 5 + r() * 8, 2);
    }
  }
  // rachaduras
  g.strokeStyle = 'rgba(60,45,35,0.55)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    let x = r() * S;
    let y = r() * S * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 14;
      y += 6 + r() * 10;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // encardido subindo do chão
  const grd = g.createLinearGradient(0, S, 0, S * 0.55);
  grd.addColorStop(0, 'rgba(95,55,35,0.6)');
  grd.addColorStop(1, 'rgba(95,55,35,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = 'rgba(110,70,45,0.25)';
    g.fillRect(r() * S, S * 0.7 + r() * S * 0.1, 2 + r() * 3, S * 0.3);
  }
  return toTexture(c, false);
}

// Telhado de telha capa-canal de barro: fileiras alternando canal (escuro) e capa (claro), sobreposição
// sombreada entre as fiadas e algumas telhas trocadas ou escurecidas.
export function roofTileTexture() {
  const S = 256;
  const [c, g] = makeCanvas(S);
  const r = rng(4242);
  g.fillStyle = '#5a2a1a';
  g.fillRect(0, 0, S, S);
  const cols = 8;
  const rows = 6;
  const cw = S / cols;
  const rh = S / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * cw;
      const y = j * rh;
      const capa = i % 2 === 1;
      const l = (capa ? 46 : 32) + (r() - 0.5) * 12;
      const hue = 14 + (r() - 0.5) * 8;
      const grd = g.createLinearGradient(x, 0, x + cw, 0);
      grd.addColorStop(0, hsl(hue, 52, l - (capa ? 10 : -4)));
      grd.addColorStop(0.5, hsl(hue, 55, l + (capa ? 10 : -6)));
      grd.addColorStop(1, hsl(hue, 52, l - (capa ? 10 : -4)));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x + 1, y);
      g.lineTo(x + cw - 1, y);
      g.lineTo(x + cw - (capa ? 2 : 0), y + rh);
      g.lineTo(x + (capa ? 2 : 0), y + rh);
      g.fill();
      // sombra da fiada de cima
      g.fillStyle = 'rgba(30,10,5,0.45)';
      g.fillRect(x, y, cw, 4);
      if (r() < 0.12) blob(g, x + cw / 2, y + rh / 2, cw * 0.8, 'rgba(40,30,25,0.45)');
      if (r() < 0.1) blob(g, x + cw / 2, y + rh / 2, cw * 0.6, 'rgba(120,140,90,0.3)');
    }
  }
  return toTexture(c);
}

// Tufo de capim seco: lâminas finas de ponta arredondada em palha, base escura
export function dryGrassCard() {
  const [c, g] = makeCanvas(128);
  const r = rng(515);
  for (let i = 0; i < 20; i++) {
    const x = 22 + r() * 84;
    const h = 30 + r() * 60;
    const bend = (x - 64) * 0.6 + (r() - 0.5) * 24;
    const w = 2.5 + r() * 2.5;
    const grd = g.createLinearGradient(0, 128, 0, 128 - h);
    grd.addColorStop(0, hsl(30, 30, 28));
    grd.addColorStop(1, hsl(38 + r() * 10, 45, 62 + r() * 15));
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

// Mandacaru: costelas verticais claras e escuras (8, como as da geometria) e pontinhos de espinho
export function cactusTexture() {
  const [c, g] = makeCanvas(256);
  const r = rng(77);
  const ribs = 8;
  const w = 256 / ribs;
  for (let i = 0; i < ribs; i++) {
    const grd = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
    grd.addColorStop(0, '#6f8f78');
    grd.addColorStop(0.5, '#d8eadc');
    grd.addColorStop(1, '#6f8f78');
    g.fillStyle = grd;
    g.fillRect(i * w, 0, w, 256);
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.round(r() * ribs) * w;
    const y = r() * 256;
    g.fillStyle = r() < 0.5 ? 'rgba(255,248,220,0.9)' : 'rgba(80,60,40,0.7)';
    g.fillRect(x - 1, y, 2, 2);
  }
  return toTexture(c);
}

// Brilho radial branco (fogo-fátuo, chamas dos candeeiros); tingido pela cor do material
export function glowTexture() {
  const [c, g] = makeCanvas(64);
  blob(g, 32, 32, 32, 'rgba(255,255,255,1)');
  blob(g, 32, 32, 12, 'rgba(255,255,255,1)');
  return toTexture(c, false);
}
