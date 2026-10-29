import { rng, makeCanvas, wrap, blob, toTexture, hsl, grey, withHeight } from './textures.js';

// Texturas pintadas do Porto de Santos (fase 3, doc 25), na linha das da Mata e do Sertão: geradas em canvas,
// com normal + altura (userData.nh) nas que vão para o chão.

// Areia da praia: grão fino, marcas de vento (ondulações) e conchinhas
export function sandTexture() {
  const S = 512;
  const [c, g] = makeCanvas(S);
  const [hc, h] = makeCanvas(S);
  const r = rng(2026);
  g.fillStyle = '#e2cc9c';
  g.fillRect(0, 0, S, S);
  h.fillStyle = grey(0.45);
  h.fillRect(0, 0, S, S);
  for (let i = 0; i < 180; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 20 + r() * 70;
    const light = r() < 0.5;
    wrap(S, x, y, rad, (px, py) => blob(g, px, py, rad, light ? hsl(42, 55, 82, 0.28) : hsl(34, 40, 58, 0.22)));
  }
  // ondulações de vento: faixas onduladas e ladrilháveis (período inteiro na textura)
  const img = h.getImageData(0, 0, S, S);
  const col = g.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * Math.PI * 2;
      const v = (y / S) * Math.PI * 2;
      const rip = Math.sin(v * 9 + Math.sin(u * 2) * 1.6 + Math.sin(u * 5 + v) * 0.35) * 0.5 + 0.5;
      const o = (y * S + x) * 4;
      const k = rip ** 2;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 110 + k * 50 + (r() - 0.5) * 40;
      const shade = 0.96 + k * 0.05 + (r() - 0.5) * 0.08;
      col.data[o] *= shade;
      col.data[o + 1] *= shade;
      col.data[o + 2] *= shade;
    }
  }
  h.putImageData(img, 0, 0);
  g.putImageData(col, 0, 0);
  // conchinhas e pedrinhas
  for (let i = 0; i < 90; i++) {
    const x = r() * S;
    const y = r() * S;
    const w = 2 + r() * 4;
    wrap(S, x, y, w, (px, py) => {
      g.fillStyle = r() < 0.5 ? '#f4ead8' : '#b89a78';
      g.beginPath();
      g.ellipse(px, py, w, w * 0.7, r() * 3, 0, Math.PI * 2);
      g.fill();
      blob(h, px, py, w * 1.4, grey(1, 0.5));
    });
  }
  return withHeight(toTexture(c), hc, 1.1);
}

// Tábuas do trapiche: madeira lavada pelo sal, juntas escuras, pregos e manchas de umidade.
// As tábuas correm ao longo de v (eixo z da textura); a largura de cada uma é 1/8 da textura.
export function plankTexture() {
  const S = 512;
  const N = 8;
  const [c, g] = makeCanvas(S);
  const [hc, h] = makeCanvas(S);
  const r = rng(1546);
  for (let i = 0; i < N; i++) {
    const x0 = (i * S) / N;
    const w = S / N;
    const tone = 0.85 + r() * 0.25;
    g.fillStyle = hsl(30 + r() * 8, 22 + r() * 10, 52 * tone);
    g.fillRect(x0, 0, w, S);
    h.fillStyle = grey(0.62 + r() * 0.1);
    h.fillRect(x0 + 2, 0, w - 4, S);
    // veios
    for (let k = 0; k < 14; k++) {
      const vx = x0 + 4 + r() * (w - 8);
      g.strokeStyle = r() < 0.5 ? hsl(28, 25, 36, 0.35) : hsl(36, 20, 70, 0.3);
      g.lineWidth = 1 + r() * 1.5;
      g.beginPath();
      g.moveTo(vx, 0);
      for (let y = 0; y <= S; y += 32) g.lineTo(vx + Math.sin(y * 0.02 + k) * 2.5, y);
      g.stroke();
    }
    // emendas de topo, pregos e nós
    const cut = r() * S;
    g.fillStyle = 'rgba(30,20,14,0.8)';
    g.fillRect(x0, cut, w, 3);
    h.fillStyle = grey(0.1);
    h.fillRect(x0, cut, w, 3);
    for (const py of [cut - 10, cut + 12]) {
      for (const px of [x0 + w * 0.25, x0 + w * 0.75]) {
        g.fillStyle = '#4a3a32';
        g.beginPath();
        g.arc(px, (py + S) % S, 2.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (r() < 0.6) wrap(S, x0 + w / 2, r() * S, 8, (px, py) => blob(g, px, py, 7, hsl(25, 30, 28, 0.6)));
  }
  // juntas entre as tábuas
  for (let i = 0; i < N; i++) {
    g.fillStyle = 'rgba(24,16,12,0.9)';
    g.fillRect((i * S) / N - 1.5, 0, 3, S);
    h.fillStyle = grey(0.05);
    h.fillRect((i * S) / N - 2, 0, 4, S);
  }
  // manchas de sal e umidade
  for (let i = 0; i < 40; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 20 + r() * 50;
    wrap(S, x, y, rad, (px, py) => blob(g, px, py, rad, r() < 0.5 ? 'rgba(220,230,232,0.12)' : 'rgba(40,52,48,0.16)'));
  }
  return withHeight(toTexture(c), hc, 1.2);
}

// Chapa ondulada (contêineres e armazéns): caneluras verticais, ferrugem escorrendo e sujeira na base.
// Pintada em tons de cinza: a cor vem do material (cada contêiner na sua cor).
export function corrugatedTexture() {
  const S = 256;
  const [c, g] = makeCanvas(S);
  const r = rng(1892);
  for (let x = 0; x < S; x++) {
    const k = Math.sin((x / S) * Math.PI * 2 * 16) * 0.5 + 0.5;
    g.fillStyle = grey(0.62 + k * 0.32);
    g.fillRect(x, 0, 1, S);
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * S;
    const len = 30 + r() * 120;
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(120,60,30,0.45)');
    gr.addColorStop(1, 'rgba(120,60,30,0)');
    g.fillStyle = gr;
    g.fillRect(x, r() * 40, 2 + r() * 4, len);
  }
  const base = g.createLinearGradient(0, S, 0, S * 0.75);
  base.addColorStop(0, 'rgba(40,30,24,0.4)');
  base.addColorStop(1, 'rgba(40,30,24,0)');
  g.fillStyle = base;
  g.fillRect(0, S * 0.75, S, S * 0.25);
  return toTexture(c);
}
