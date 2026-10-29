import * as THREE from 'three';
import { toon, lambert, part, GEO, instanced, CORRUPTION, limbGeo, injectCorruption, mergeSimple } from './toon.js';
import { grassTexture, dirtTexture, paveTexture, barkTexture, foliageTexture, fernCard, grassCard, leafCard, runeTexture, noiseTexture, leafClusterAtlas, palmFrondCard, mushroomCapTextures } from './textures.js';
import { WORLD, PLAYER } from './config.js';

// Mata Viva no espírito das fases do Lunia: chão pintado em camadas (grama, terra, piso trançado),
// copas volumosas com folhagem pintada, samambaias turquesa, cogumelos luminosos e a sumaúma
// com raízes enormes ao fundo. Sem contorno de tinta no cenário.

export const PATH = [[0, 6], [0, -2], [-4, -11], [-3.5, -19], [2.5, -27], [3.5, -36], [0, -44], [0, -55]];
const PATH_HW = 3.2;
const GLADE = { x: 0, z: 7, r: 7.5 };
const ALCOVE = { x: 8.3, z: -33, r: 3.4 };
const ARENA = { x: WORLD.arenaCenter.x, z: WORLD.arenaCenter.z, r: WORLD.arenaRadius };
const WATER_Z = -15;
export const VESTIGIO_POS = new THREE.Vector3(9.2, 0, -33.3);
export const SPAWN = { trail: new THREE.Vector3(0, 0, 8), arena: new THREE.Vector3(0, 0, -52.5) };
export const FRAG_SPAWNS = [[-3.6, -12], [2.2, -26.5], [1.5, -41]];
export const BOUNDS = { x0: -75, z0: -118, w: 150, d: 170 };

export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function pathDist(x, z) {
  let d = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) d = Math.min(d, segDist(x, z, ...PATH[i], ...PATH[i + 1]));
  return d;
}

// Distância assinada à área caminhável (negativa dentro)
export function walkDist(x, z) {
  return Math.min(
    pathDist(x, z) - PATH_HW,
    Math.hypot(x - GLADE.x, z - GLADE.z) - GLADE.r,
    Math.hypot(x - ALCOVE.x, z - ALCOVE.z) - ALCOVE.r,
    Math.hypot(x - ARENA.x, z - ARENA.z) - ARENA.r,
  );
}

export function inArena(x, z, margin = 0) {
  return Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r - margin;
}

// Esfera irregular para copas e arbustos (volumes de folhagem)
export function lumpySphere(seed, detail = 22) {
  const g = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.1 * Math.sin(v.x * 4.1 + seed) * Math.sin(v.y * 3.7 + seed * 2) + 0.08 * Math.sin(v.z * 5.3 + v.x * 2 + seed * 3);
    v.multiplyScalar(n);
    if (v.y < -0.3) v.y = -0.3 + (v.y + 0.3) * 0.4; // base achatada
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Casca de cartões de folhagem sobre a mesma esfera irregular das copas. Cada cartão fica num ponto da
// superfície, guarda a normal da esfera (volume e luz da copa inteira) e abre na tela pelo atributo
// leafCorner (billboard no shader). A silhueta vira um recorte de folhas em vez de uma bolha lisa.
export function leafShell(seed, n, size) {
  const r = rng(seed * 977 + 13);
  const pos = [];
  const nor = [];
  const uv = [];
  const corner = [];
  const index = [];
  const v = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    if (y < -0.7) continue; // o fundo achatado fica por conta do miolo
    const ring = Math.sqrt(1 - y * y);
    const a = i * 2.39996 + seed;
    v.set(Math.cos(a) * ring, y, Math.sin(a) * ring);
    nv.copy(v).setY(v.y + 0.3).normalize();
    v.multiplyScalar((1 + 0.1 * Math.sin(v.x * 4.1 + seed) * Math.sin(v.y * 3.7 + seed * 2) + 0.08 * Math.sin(v.z * 5.3 + v.x * 2 + seed * 3)) * 0.95);
    if (v.y < -0.3) v.y = -0.3 + (v.y + 0.3) * 0.4;
    const ang = (r() - 0.5) * 1.2;
    const sz = size * (0.75 + r() * 0.5);
    const cell = Math.floor(r() * 4);
    const u0 = (cell % 2) * 0.5;
    const v0 = Math.floor(cell / 2) * 0.5;
    const base = pos.length / 3;
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(v.x, v.y, v.z);
      nor.push(nv.x, nv.y, nv.z);
      corner.push((cx * Math.cos(ang) - cy * Math.sin(ang)) * sz, (cx * Math.sin(ang) + cy * Math.cos(ang)) * sz);
      uv.push(u0 + (cx + 1) * 0.25, v0 + (cy + 1) * 0.25);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('leafCorner', new THREE.Float32BufferAttribute(corner, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  g.boundingSphere.radius += size * 2;
  return g;
}

// Material dos cartões: abre cada cartão no espaço da câmera, com tremor por folha e balanço da copa
export function leafCardMaterial(map) {
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', map, alphaTest: 0.5 });
  injectCorruption(mat, {
    key: 'leafcard',
    vertHead: 'uniform float uTime;\nattribute vec2 leafCorner;\n',
    projCode: `
      #ifdef USE_INSTANCING
        float bbS = length(instanceMatrix[0].xyz);
        vec3 bbBase = instanceMatrix[3].xyz;
      #else
        float bbS = 1.0;
        vec3 bbBase = vec3(0.0);
      #endif
      bbS *= length(modelMatrix[0].xyz);
      bbBase = (modelMatrix * vec4(bbBase, 1.0)).xyz;
      float bbPh = bbBase.x * 0.37 + bbBase.z * 0.23;
      float flutter = 1.0 + 0.08 * sin(uTime * 2.3 + bbPh * 3.0 + transformed.x * 4.0 + transformed.y * 3.0);
      mvPosition.xy += leafCorner * bbS * flutter;
      mvPosition.x += sin(uTime * 0.9 + bbPh) * 0.05 * bbS * (transformed.y + 0.4);
      gl_Position = projectionMatrix * mvPosition;
    `,
  });
  return mat;
}

// Tronco: base alargada em sapopemas, afinando para cima e com leve curva
export function trunkGeometry() {
  const g = new THREE.CylinderGeometry(0.75, 1, 1, 12, 7);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i) ** 1.6; // anéis concentrados na base, onde ficam as sapopemas
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + (y < 0.2 ? (1 - y / 0.2) ** 2 * (0.3 + 0.2 * (0.5 + 0.5 * Math.sin(a * 5 + 0.7))) : 0);
    p.setXYZ(i, x * k + Math.sin(y * 2.6) * 0.1, y, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Cogumelo torneado (perfis de baixo para cima, normais para fora): pé com bulbo afinando até o chapéu;
// chapéu em cúpula com a borda virada para baixo e a face de baixo levemente côncava (lamelas)
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
function mushStemGeometry() {
  return new THREE.LatheGeometry(v2([[0, 0], [0.2, 0], [0.23, 0.06], [0.16, 0.24], [0.12, 0.6], [0.13, 0.95], [0, 1]]), 10);
}
function mushCapGeometry() {
  return new THREE.LatheGeometry(v2([[0, 0.12], [0.2, 0.12], [0.6, 0.07], [0.85, 0.0], [0.95, -0.03], [0.97, 0.06], [0.88, 0.22], [0.72, 0.38], [0.5, 0.52], [0.25, 0.6], [0, 0.62]]), 16);
}

// Fronde de palmeira: cartão ao longo de +z, caindo na ponta e dobrado em V na nervura
export function frondGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 2, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = p.getY(i) + 0.5;
    p.setXYZ(i, x, -t * t * 0.55 + Math.abs(x) * 0.18, t);
  }
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

// Touceira de samambaia: frondes inclinadas para fora a partir da base, normais para cima
function fernClump(n = 7) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.PlaneGeometry(0.52, 0.95, 1, 3);
    p.translate(0, 0.475, 0);
    // arqueia a fronde: quanto mais alto, mais deitada
    const pos = p.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      pos.setZ(k, y * y * 0.45);
      pos.setY(k, y * (1 - y * 0.25));
    }
    p.rotateX(-0.85 - (i % 3) * 0.15);
    p.rotateY((i / n) * Math.PI * 2 + (i % 2) * 0.3);
    parts.push(p);
  }
  const g = mergeSimple(parts);
  const nn = g.attributes.normal;
  for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  return g;
}

// Cartão cruzado (dois planos em X) com normais para cima: ilumina como vegetação rasteira
export function crossCard(w, h) {
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  const g = mergeSimple([a, b]);
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

export function buildWorld(parent) {
  const rand = rng(20261025);
  // Tudo da fase fica num grupo próprio: a troca de fase só esconde um e mostra o outro
  const scene = new THREE.Group();
  scene.name = 'mata';
  parent.add(scene);
  const world = { key: 'mata', root: scene, gateOpen: false, arenaLocked: false };
  const { x0: X0, z0: Z0, w: W, d: D } = BOUNDS;

  // ---------- Chão em camadas ----------
  // Máscara: R = terra da trilha, G = piso de pedra, B = variação de tom
  const mc = document.createElement('canvas');
  mc.width = 1024;
  mc.height = 1024;
  const g = mc.getContext('2d');
  const sx = mc.width / W;
  const cx = (x) => (x - X0) * sx;
  const cz = (z) => (z - Z0) * (mc.height / D);
  g.fillStyle = 'rgb(0,0,128)';
  g.fillRect(0, 0, mc.width, mc.height);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 700; i++) {
    const x = rand() * mc.width;
    const y = rand() * mc.height;
    const r = 6 + rand() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(0,0,${Math.floor(rand() * 90)},1)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  const strokePath = (width, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.strokeStyle = color;
    g.lineWidth = width * sx;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    PATH.forEach(([x, z], i) => (i ? g.lineTo(cx(x), cz(z)) : g.moveTo(cx(x), cz(z))));
    g.stroke();
    g.restore();
  };
  const disc = (c, r, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx(c.x), cz(c.z), r * sx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  g.globalCompositeOperation = 'lighter';
  strokePath(PATH_HW * 2 + 0.6, 'rgb(255,0,0)', 5);
  disc(GLADE, GLADE.r + 0.3, 'rgb(255,0,0)', 5);
  disc(ALCOVE, ALCOVE.r + 0.3, 'rgb(255,0,0)', 5);
  // Piso de pedra: clareira (santuário antigo), nicho do vestígio e a praça da entrada
  disc(ARENA, ARENA.r + 0.4, 'rgb(0,255,0)', 1.5);
  disc(ALCOVE, 2.6, 'rgb(0,255,0)', 2);
  disc(GLADE, 4.2, 'rgb(0,200,0)', 2);
  g.globalCompositeOperation = 'source-over';
  const maskTex = new THREE.CanvasTexture(mc);
  maskTex.flipY = false;

  // Camadas com relevo: cada textura pintada traz normal + altura (userData.nh). Anti-repetição de Quilez
  // (técnica 3) na grama e na terra; o piso trançado é regular demais para isso e varia por manchas e juntas.
  // As camadas se misturam por altura: a terra entra pelas juntas antes de cobrir as pedras e a grama
  // invade a terra pelas folhinhas. No Silêncio, rachaduras roxas pulsam no chão até a onda passar.
  const grassTex = grassTexture();
  const dirtTex = dirtTexture();
  const paveTex = paveTexture();
  const noiseTex = noiseTexture();
  const groundMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  injectCorruption(groundMat, {
    key: 'ground',
    uniforms: {
      tMask: { value: maskTex },
      tGrass: { value: grassTex },
      tDirt: { value: dirtTex },
      tPave: { value: paveTex },
      tGrassN: { value: grassTex.userData.nh },
      tDirtN: { value: dirtTex.userData.nh },
      tPaveN: { value: paveTex.userData.nh },
      tNoise: { value: noiseTex },
      uMaskOrigin: { value: new THREE.Vector2(X0, Z0) },
      uMaskSize: { value: new THREE.Vector2(W, D) },
    },
    fragHead: `
      uniform sampler2D tMask, tGrass, tDirt, tPave, tGrassN, tDirtN, tPaveN, tNoise;
      uniform vec2 uMaskOrigin, uMaskSize;
      // Quilez, "texture repetition" (técnica 3): mistura dois deslocamentos escolhidos por um ruído lento
      void noTile(sampler2D cm, sampler2D nm, vec2 uv, float k, out vec4 c, out vec4 n) {
        float idx = k * 8.0;
        float i = floor(idx);
        float f = fract(idx);
        vec2 oa = sin(vec2(3.0, 7.0) * i);
        vec2 ob = sin(vec2(3.0, 7.0) * (i + 1.0));
        vec2 dx = dFdx(uv), dy = dFdy(uv);
        vec4 ca = textureGrad(cm, uv + oa, dx, dy);
        vec4 cb = textureGrad(cm, uv + ob, dx, dy);
        float b = smoothstep(0.2, 0.8, f - 0.1 * dot(ca.rgb - cb.rgb, vec3(1.0)));
        c = mix(ca, cb, b);
        n = mix(textureGrad(nm, uv + oa, dx, dy), textureGrad(nm, uv + ob, dx, dy), b);
      }
      vec2 gHash(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      // Voronoi F2-F1: perto de zero nas fronteiras das células (rachaduras)
      float crackDist(vec2 p) {
        vec2 ip = floor(p), fp = fract(p);
        float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y));
          float d = length(g + gHash(ip + g) - fp);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        return d2 - d1;
      }
    `,
    mapCode: `
      vec2 wuv = vCorrPos.xz;
      vec4 nz = texture2D(tNoise, wuv * 0.021);
      vec4 nz2 = texture2D(tNoise, wuv * 0.11);
      vec4 msk = texture2D(tMask, (wuv + (nz2.ga - 0.5) * 1.1 - uMaskOrigin) / uMaskSize);
      vec4 gc, gn, dc, dn;
      noTile(tGrass, tGrassN, wuv / 5.0, nz.r, gc, gn);
      vec3 g2 = texture2D(tGrass, wuv / 13.0 + 0.37).rgb;
      gc.rgb = mix(gc.rgb, g2, 0.4);
      noTile(tDirt, tDirtN, wuv / 4.5, nz.a, dc, dn);
      vec2 puv = wuv / 3.4;
      vec3 pc = texture2D(tPave, puv).rgb * (0.88 + 0.24 * nz2.b) * mix(vec3(1.0), vec3(0.93, 0.97, 1.04), nz.g);
      vec4 pn = texture2D(tPaveN, puv);
      // pesos da máscara, com a borda do piso quebrada por ruído
      float wP = smoothstep(0.2, 0.8, msk.g + (nz2.r - 0.5) * 0.4);
      float dm = smoothstep(0.3, 0.75, msk.r + (g2.g - 0.35) * 0.4);
      vec3 w = vec3((1.0 - dm) * (1.0 - wP), dm * (1.0 - wP), wP);
      // mistura por altura: só aparece o que estiver a até 0.22 da camada mais alta
      vec3 hh = vec3(gn.a, dn.a, pn.a) * 0.7 + w;
      float hm = max(max(hh.x, hh.y), hh.z) - 0.22;
      vec3 bw = max(hh - hm, 0.0);
      bw /= bw.x + bw.y + bw.z;
      vec3 col = gc.rgb * bw.x + dc.rgb * bw.y + pc * bw.z;
      vec4 nh = gn * bw.x + dn * bw.y + pn * bw.z;
      // terra e musgo assentados nas juntas do piso
      float groove = bw.z * (1.0 - smoothstep(0.12, 0.4, pn.a));
      col = mix(col, mix(vec3(0.45, 0.35, 0.22), vec3(0.32, 0.45, 0.2), smoothstep(0.35, 0.7, nz2.g)), groove * 0.6);
      col *= 0.8 + 0.42 * msk.b;
      // oclusão pintada: fundo das juntas e entre os seixos mais escuro
      col *= mix(0.74, 1.05, smoothstep(0.05, 0.7, nh.a));
      // luz filtrada pelas copas, derivando devagar
      float dap = texture2D(tNoise, wuv * 0.045 + vec2(uTime * 0.004, uTime * 0.003)).a;
      col *= 0.93 + 0.2 * smoothstep(0.55, 0.75, dap);
      diffuseColor.rgb *= col;
      vec3 tn = nh.rgb * 2.0 - 1.0;
      vec3 gWorldN = normalize(vec3(tn.x, tn.z, tn.y));
    `,
    normalCode: 'normal = normalize((viewMatrix * vec4(gWorldN, 0.0)).xyz);',
    postCode: `
      float silence = 1.0 - rest;
      if (silence > 0.01) {
        float cd = crackDist(wuv * 0.55 + (nz2.rg - 0.5) * 0.7);
        float crack = (1.0 - smoothstep(0.015, 0.06, cd)) * smoothstep(0.52, 0.66, texture2D(tNoise, wuv * 0.07).b) * silence;
        float pulse = 0.55 + 0.45 * sin(uTime * 1.6 - length(wuv) * 0.35);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.4, crack);
        gl_FragColor.rgb += vec3(0.55, 0.3, 1.0) * crack * pulse * 0.6;
      }
    `,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(X0 + W / 2, 0, Z0 + D / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Gravação de runas no piso da clareira; acende na libertação
  const runeTex = runeTexture();
  const arenaRune = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex, color: '#3a2814', transparent: true, opacity: 0.35, depthWrite: false }));
  arenaRune.scale.setScalar(ARENA.r * 1.5);
  arenaRune.position.set(ARENA.x, 0.02, ARENA.z);
  arenaRune.renderOrder = 1;
  scene.add(arenaRune);

  // ---------- Riacho e passarela ----------
  // Água estilizada toda no shader: raso turquesa nas margens e fundo azul no meio, correnteza em faixas,
  // espuma que bate nas pedras da margem em linhas e cintilações para o bloom. A margem é reta, então a
  // distância até ela é analítica (não precisa de depth buffer).
  const waterMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  injectCorruption(waterMat, {
    key: 'water',
    uniforms: { tNoise: { value: noiseTex }, uWaterZ: { value: WATER_Z }, uWaterHW: { value: 1.6 } },
    fragHead: 'uniform sampler2D tNoise;\nuniform float uWaterZ, uWaterHW;\n',
    mapCode: `
      vec2 wuv = vCorrPos.xz;
      float t = uTime;
      float shore = abs(wuv.y - uWaterZ) / uWaterHW;
      float n1 = texture2D(tNoise, wuv * vec2(0.08, 0.35) - vec2(t * 0.09, 0.0)).g;
      float n2 = texture2D(tNoise, wuv * vec2(0.13, 0.5) + vec2(-t * 0.05, t * 0.02)).b;
      vec3 col = mix(vec3(0.12, 0.45, 0.58), vec3(0.36, 0.74, 0.7), smoothstep(0.15, 1.0, shore + (n1 - 0.5) * 0.35));
      // correnteza: faixas claras esticadas no sentido do fluxo
      float streak = smoothstep(0.66, 0.74, texture2D(tNoise, vec2(wuv.x * 0.06 - t * 0.05, wuv.y * 0.55)).r + (n2 - 0.5) * 0.25);
      col += vec3(0.75, 1.0, 0.95) * streak * 0.22 * (1.0 - shore);
      // espuma: borda irregular grudada nas pedras e linhas que vêm do meio até a margem
      float rim = smoothstep(0.8, 0.97, shore + (n2 - 0.5) * 0.3);
      float lines = smoothstep(0.6, 0.8, sin((shore - t * 0.22) * 26.0) * 0.5 + 0.5) * smoothstep(0.45, 0.8, shore) * step(0.45, n1);
      float foam = max(rim, lines * 0.7);
      vec3 glow = col * 0.18;
      col = mix(col, vec3(0.7, 0.8, 0.79), foam);
      diffuseColor.rgb = col;
      // cintilação: produto de dois ruídos em movimento, só os picos
      float spark = smoothstep(0.92, 0.97, texture2D(tNoise, wuv * 0.9 + vec2(t * 0.11, -t * 0.07)).b * texture2D(tNoise, wuv * 0.7 - vec2(t * 0.06, t * 0.09)).g * 1.8);
      totalEmissiveRadiance = glow * (1.0 - foam) + vec3(1.0) * spark * (1.0 - foam) * 1.2;
      vec3 gWorldN = normalize(vec3((n1 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.35));
    `,
    normalCode: 'normal = normalize((viewMatrix * vec4(gWorldN, 0.0)).xyz);',
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 3.2), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.06, WATER_Z);
  water.receiveShadow = true;
  scene.add(water);
  const rockMat = lambert('#ffffff');
  const bankRocks = instanced(GEO.dodec, rockMat, 400, 0);
  for (let x = -40; x < 40; x += 0.8) {
    if (pathDist(x, WATER_Z) < 2) continue;
    for (const s of [-1, 1]) bankRocks.add([x + rand() * 0.4, 0.05, WATER_Z + s * (1.7 + rand() * 0.2)], [rand(), rand(), rand()], [0.38 + rand() * 0.2, 0.2, 0.32], rand() < 0.5 ? '#9aa6a8' : '#b8b09a');
  }
  bankRocks.done();
  scene.add(bankRocks.mesh);
  const bark = barkTexture();
  const bridge = new THREE.Group();
  const plankMat = lambert('#c08850', { map: bark });
  const px = -3.55;
  for (let i = 0; i < 9; i++) {
    bridge.add(part(GEO.box, plankMat, { pos: [px, 0.14, WATER_Z - 2.1 + i * 0.52], rot: [0, (rand() - 0.5) * 0.05, 0], scale: [3.0, 0.12, 0.46], line: 0 }));
  }
  for (const s of [-1, 1]) {
    for (const dz of [-2.2, 2.2]) bridge.add(part(GEO.cyl, lambert('#8a5c34', { map: bark }), { pos: [px + s * 1.65, 0.45, WATER_Z + dz], scale: [0.12, 0.9, 0.12], line: 0 }));
    const rope = new THREE.CatmullRomCurve3([new THREE.Vector3(px + s * 1.65, 0.85, WATER_Z - 2.2), new THREE.Vector3(px + s * 1.65, 0.6, WATER_Z), new THREE.Vector3(px + s * 1.65, 0.85, WATER_Z + 2.2)]);
    bridge.add(part(new THREE.TubeGeometry(rope, 12, 0.035, 5), lambert('#e0c38a'), { line: 0 }));
  }
  scene.add(bridge);

  // ---------- Vegetação ----------
  const foliage = foliageTexture();
  const trunkGeo = trunkGeometry();
  const trunks = instanced(trunkGeo, lambert('#ffffff', { map: bark, normalMap: bark.userData.nh }), 1400, 0);
  // Copas e arbustos: miolo escuro (preenche os vãos e projeta a sombra) + casca de cartões de folhas
  const canopyMat = lambert('#ffffff', { map: foliage });
  const leafMat = leafCardMaterial(leafClusterAtlas());
  const canopies = instanced(lumpySphere(1.3, 12), canopyMat, 3200, 0); // escondido pelos cartões: low-poly
  const canopyCards = instanced(leafShell(1.3, 70, 0.34), leafMat, 3200, 0);
  const bushes = instanced(lumpySphere(4.1, 14), canopyMat, 2600, 0);
  const bushCards = instanced(leafShell(4.1, 40, 0.42), leafMat, 2600, 0);
  for (const c of [canopyCards, bushCards]) c.mesh.castShadow = false;
  const palmLeaves = instanced(frondGeometry(), lambert('#ffffff', { map: palmFrondCard(), alphaTest: 0.45, side: THREE.DoubleSide, wind: 0.1 }), 2500, 0);
  const fernMatA = lambert('#ffffff', { map: fernCard(172), alphaTest: 0.45, side: THREE.DoubleSide, wind: 0.07 });
  const fernMatB = lambert('#ffffff', { map: fernCard(140), alphaTest: 0.45, side: THREE.DoubleSide, wind: 0.07 });
  const fernGeo = fernClump();
  const ferns = instanced(fernGeo, fernMatA, 2200, 0);
  const ferns2 = instanced(fernGeo, fernMatB, 1600, 0);
  const grass = instanced(crossCard(0.9, 0.7), lambert('#ffffff', { map: grassCard(), alphaTest: 0.4, side: THREE.DoubleSide, wind: 0.16 }), 5000, 0);
  const leaves = instanced(crossCard(0.7, 1.4), lambert('#ffffff', { map: leafCard(), alphaTest: 0.5, side: THREE.DoubleSide, wind: 0.05 }), 1500, 0);
  for (const c of [ferns, ferns2, grass, leaves]) c.mesh.castShadow = false;
  const flowers = instanced(GEO.sphereLo, lambert('#ffffff', { emissive: '#202020' }), 1600, 0);
  const rocks = instanced(GEO.dodec, rockMat, 500, 0);
  const mushStem = instanced(mushStemGeometry(), lambert('#eef6ee', { emissive: '#3a7a74', emissiveIntensity: 0.35 }), 800, 0);
  // Chapéu: pintas e lamelas brilham na cor da instância e pulsam devagar, cada cogumelo na sua fase
  const capTex = mushroomCapTextures();
  const capMat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: capTex.map, emissive: '#ffffff', emissiveMap: capTex.glow, emissiveIntensity: 1.3, side: THREE.DoubleSide });
  injectCorruption(capMat, {
    key: 'mushcap',
    mapCode: `
      #include <map_fragment>
      #ifdef USE_COLOR
        totalEmissiveRadiance *= vColor;
      #endif
      totalEmissiveRadiance *= 0.65 + 0.35 * sin(uTime * 1.6 + vCorrPos.x * 1.9 + vCorrPos.z * 1.3);
    `,
  });
  const mushCap = instanced(mushCapGeometry(), capMat, 800, 0);
  const mushE = new THREE.Euler();
  const mushTip = new THREE.Vector3();

  const leafCols = ['#9fd07a', '#c4e08a', '#86c9a0', '#b6dc78', '#7cc4b4', '#d8e690'];
  const core = new THREE.Color();
  const leafBall = (cores, cards, pos, rot, scale, col) => {
    cores.add(pos, rot, scale.map((v) => v * 0.88), core.set(col).multiplyScalar(0.62));
    cards.add(pos, rot, scale, col);
  };
  const roundTree = (x, z, s) => {
    const h = (2.4 + rand() * 1.6) * s;
    trunks.add([x, 0, z], [0, rand() * 6, (rand() - 0.5) * 0.1], [0.3 * s, h + 0.8 * s, 0.3 * s], '#cdc5b6');
    const col = leafCols[Math.floor(rand() * leafCols.length)];
    const top = h + 1.5 * s;
    leafBall(canopies, canopyCards, [x, top, z], [0, rand() * 6, 0], [2.1 * s, 1.7 * s, 2.1 * s], col);
    leafBall(canopies, canopyCards, [x + 1.3 * s, top - 0.6 * s, z + 0.4 * s], [0, rand() * 6, 0], [1.4 * s, 1.2 * s, 1.4 * s], col);
    leafBall(canopies, canopyCards, [x - 1.2 * s, top - 0.5 * s, z - 0.3 * s], [0, rand() * 6, 0], [1.35 * s, 1.15 * s, 1.35 * s], col);
    leafBall(canopies, canopyCards, [x + 0.2 * s, top + 1.1 * s, z - 0.2 * s], [0, rand() * 6, 0], [1.3 * s, 1.1 * s, 1.3 * s], col);
  };
  const palm = (x, z, s) => {
    const h = (4.2 + rand() * 1.5) * s;
    const lean = (rand() - 0.5) * 0.25;
    trunks.add([x, 0, z], [lean * 0.3, 0, lean * 0.3], [0.15 * s, h, 0.15 * s], '#dccfb4');
    const col = rand() < 0.5 ? '#b2dc84' : '#94d2a4';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.6;
      palmLeaves.add([x - lean * 0.3 * h, h - 0.05 * s, z + lean * 0.3 * h], [-0.15 - rand() * 0.35, a, 0, 'YXZ'], [0.95 * s, 1.3 * s, 2.4 * s], col);
    }
  };
  const bush = (x, z, s) => {
    const col = leafCols[Math.floor(rand() * leafCols.length)];
    leafBall(bushes, bushCards, [x, 0.4 * s, z], [0, rand() * 6, 0], [0.9 * s, 0.75 * s, 0.9 * s], col);
    leafBall(bushes, bushCards, [x + 0.55 * s, 0.28 * s, z + 0.3 * s], [0, rand() * 6, 0], [0.6 * s, 0.55 * s, 0.6 * s], col);
    if (rand() < 0.45) {
      const fc = ['#ff8fb4', '#ffd84a', '#ffffff', '#ff7a5a', '#c99bff'][Math.floor(rand() * 5)];
      for (let i = 0; i < 5; i++) flowers.add([x + (rand() - 0.5) * 1.3 * s, 0.7 * s + rand() * 0.3, z + (rand() - 0.2) * 0.9 * s], [0, 0, 0], 0.07, fc);
    }
  };
  const fern = (x, z, s) => {
    (rand() < 0.6 ? ferns : ferns2).add([x, 0, z], [0, rand() * 6, (rand() - 0.5) * 0.3], [s, s * (0.8 + rand() * 0.4), s], rand() < 0.5 ? '#ffffff' : '#d8f0e0');
  };
  const mushrooms = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const s = 0.12 + rand() * 0.22;
      const mx = x + (rand() - 0.5) * 1.4;
      const mz = z + (rand() - 0.5) * 1.4;
      mushE.set((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3);
      mushTip.set(0, s * 1.7, 0).applyEuler(mushE);
      mushStem.add([mx, 0, mz], [mushE.x, 0, mushE.z], [s, s * 1.7, s]);
      // mesmo número de sorteios de antes: o resto do mapa não muda de lugar
      const pick = rand();
      mushCap.add([mx + mushTip.x, mushTip.y - s * 0.1, mz + mushTip.z], [mushE.x * 1.5, s * 37, mushE.z * 1.5], s * 1.15, pick < 0.65 ? '#7ff0e0' : pick < 0.9 ? '#9fd8ff' : '#d8a8ff');
    }
  };

  // Árvores altas não ficam entre a câmera (sul) e a área jogável
  const blocksView = (x, z) => {
    for (let k = 0; k <= 11; k += 1.25) if (walkDist(x, z - k) < 1.5) return true;
    return false;
  };
  for (let x = -50; x <= 50; x += 2.4) {
    for (let z = -112; z <= 30; z += 2.4) {
      const px2 = x + (rand() - 0.5) * 2.2;
      const pz = z + (rand() - 0.5) * 2.2;
      const d = walkDist(px2, pz);
      if (d < 0.4 || d > 24) continue;
      if (Math.abs(pz - WATER_Z) < 2.2) continue;
      if (Math.hypot(px2, pz + 88) < 10) continue; // espaço da sumaúma
      const r = rand();
      if (d < 2.4) {
        if (r < 0.35) bush(px2, pz, 0.7 + rand() * 0.5);
        else if (r < 0.8) fern(px2, pz, 0.9 + rand() * 0.6);
        else mushrooms(px2, pz, 3 + Math.floor(rand() * 4));
        continue;
      }
      if (blocksView(px2, pz)) {
        if (r < 0.4) bush(px2, pz, 1 + rand() * 0.7);
        else if (r < 0.85) fern(px2, pz, 1.2 + rand() * 0.6);
        else mushrooms(px2, pz, 4);
        continue;
      }
      if (r < 0.52) roundTree(px2, pz, 1 + rand() * 0.7);
      else if (r < 0.72) palm(px2, pz, 0.95 + rand() * 0.35);
      else if (r < 0.88) bush(px2, pz, 1.3 + rand() * 0.6);
      else fern(px2, pz, 1.5);
    }
  }
  // Capim, folhas largas e flores soltas
  for (let i = 0; i < 6000; i++) {
    const x = -42 + rand() * 84;
    const z = -104 + rand() * 132;
    const d = walkDist(x, z);
    if (d > 10 || Math.abs(z - WATER_Z) < 1.9) continue;
    if (d < -0.2) {
      // poucos tufos nas bordas da terra; nunca no piso de pedra
      if (d < -1.6 || inArena(x, z, -0.5) || rand() < 0.6) continue;
    }
    const r = rand();
    if (r < 0.65) grass.add([x, 0, z], [0, rand() * 6, 0], 0.6 + rand() * 0.7, rand() < 0.5 ? '#ffffff' : '#e0f0c0');
    else if (r < 0.8 && d > 0.6) leaves.add([x, 0, z], [0, rand() * 6, (rand() - 0.5) * 0.4], 0.6 + rand() * 0.7, rand() < 0.5 ? '#ffffff' : '#c8e8d0');
    else if (d > 0.2) {
      const fc = ['#ff8fb4', '#ffe066', '#ffffff', '#ff9a5a', '#b9a0ff'][Math.floor(rand() * 5)];
      flowers.add([x, 0.22, z], [0, 0, 0], [0.07, 0.05, 0.07], fc);
    }
  }
  // Pedras nas bordas
  for (let i = 0; i < 300; i++) {
    const x = -40 + rand() * 80;
    const z = -100 + rand() * 125;
    const d = walkDist(x, z);
    if (d < 0.4 || d > 3) continue;
    const s = 0.3 + rand() * 0.6;
    rocks.add([x, s * 0.35, z], [rand() * 3, rand() * 3, rand() * 3], [s, s * 0.7, s], rand() < 0.5 ? '#a9b2b6' : '#bdb5a0');
  }
  // Cogumelos luminosos em volta da clareira, como nas fases de floresta do Lunia
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const r = ARENA.r + 1.4 + rand() * 3;
    const x = ARENA.x + Math.sin(a) * r;
    const z = ARENA.z + Math.cos(a) * r;
    if (pathDist(x, z) < PATH_HW + 0.8) continue;
    mushrooms(x, z, 3 + Math.floor(rand() * 4));
  }
  for (const inst of [trunks, canopies, canopyCards, palmLeaves, bushes, bushCards, ferns, ferns2, grass, leaves, flowers, rocks, mushStem, mushCap]) {
    inst.done();
    scene.add(inst.mesh);
  }

  // ---------- Santuário: meio-fio de pedra e pilares antigos em volta da clareira ----------
  const pave = paveTexture();
  pave.repeat.set(0.5, 0.5);
  pave.userData.nh.repeat.set(0.5, 0.5);
  const curbMat = lambert('#d8ccb0', { map: pave, normalMap: pave.userData.nh });
  const curbs = instanced(GEO.box, curbMat, 120, 0);
  const nCurb = 64;
  for (let i = 0; i < nCurb; i++) {
    const a = (i / nCurb) * Math.PI * 2;
    const x = ARENA.x + Math.sin(a) * (ARENA.r + 0.55);
    const z = ARENA.z + Math.cos(a) * (ARENA.r + 0.55);
    if (pathDist(x, z) < PATH_HW - 0.2 && z > ARENA.z) continue;
    curbs.add([x, 0.12, z], [0, a, 0], [((Math.PI * 2 * (ARENA.r + 0.55)) / nCurb) * 0.96, 0.24, 0.55], rand() < 0.5 ? '#ffffff' : '#e6dcc4');
  }
  curbs.done();
  scene.add(curbs.mesh);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const x = ARENA.x + Math.sin(a) * (ARENA.r + 2.3);
    const z = ARENA.z + Math.cos(a) * (ARENA.r + 2.3);
    if (pathDist(x, z) < PATH_HW + 1) continue;
    const h = 1.2 + rand() * 2.2;
    scene.add(part(GEO.cyl, curbMat, { pos: [x, h / 2, z], scale: [0.55, h, 0.55], line: 0 }));
    scene.add(part(GEO.box, curbMat, { pos: [x, h + 0.12, z], rot: [0, rand(), (rand() - 0.5) * 0.2], scale: [1.4, 0.25, 1.4], line: 0 }));
    scene.add(part(GEO.sphere, canopyMat, { pos: [x + 0.3, h + 0.35, z], scale: [0.6, 0.3, 0.5], line: 0 }));
  }

  // ---------- Sumaúma-marco com raízes enormes ----------
  const suma = new THREE.Group();
  suma.position.set(0, 0, -90);
  const smTrunk = lambert('#c9b8a6', { map: bark });
  suma.add(part(trunkGeo, smTrunk, { scale: [2.6, 18, 2.6], line: 0 }));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const len = 9 + rand() * 6;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const r = 1.8 + t * len;
      pts.push(new THREE.Vector3(Math.cos(a + Math.sin(t * 3 + i) * 0.25) * r, (1 - t) * 3.5 + Math.sin(t * 5 + i) * 0.4 + 0.2, Math.sin(a + Math.sin(t * 3 + i) * 0.25) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 40, 1, 10);
    // raiz afina até a ponta
    const pos = tube.attributes.position;
    const v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      const seg = Math.floor(k / 11) / 40;
      const c = curve.getPointAt(Math.min(1, seg));
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(1.1 * (1 - seg * 0.85)).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
    tube.computeVertexNormals();
    suma.add(part(tube, smTrunk, { line: 0 }));
  }
  const smCols = ['#a6d47c', '#86c79a', '#c0dc84'];
  const smCards = instanced(leafShell(7.7, 110, 0.26), leafMat, 17, 0);
  smCards.mesh.castShadow = false;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i < 8 ? 7 : 4;
    const pos = [Math.cos(a) * r, 18 + (i < 8 ? 0 : 2.6) + Math.sin(i * 3) * 0.6, Math.sin(a) * r];
    suma.add(part(lumpySphere(i), lambert(core.set(smCols[i % 3]).multiplyScalar(0.62).getHex(), { map: foliage }), { pos, scale: [4.6, 2.7, 4.6], line: 0 }));
    smCards.add([pos[0], pos[1], pos[2]], [0, a, 0], [4.8, 2.8, 4.8], smCols[i % 3]);
  }
  suma.add(part(lumpySphere(9), lambert('#7f9a5e', { map: foliage }), { pos: [0, 22, 0], scale: [5.3, 2.9, 5.3], line: 0 }));
  smCards.add([0, 22, 0], [0, 0, 0], [5.5, 3, 5.5], '#b8dc88');
  smCards.done();
  suma.add(smCards.mesh);
  scene.add(suma);

  // ---------- Raios de luz (aditivos) ----------
  const shaftCanvas = document.createElement('canvas');
  shaftCanvas.width = 64;
  shaftCanvas.height = 256;
  const sg = shaftCanvas.getContext('2d');
  const sgr = sg.createLinearGradient(0, 0, 0, 256);
  sgr.addColorStop(0, 'rgba(255,250,210,0)');
  sgr.addColorStop(0.3, 'rgba(255,250,210,0.8)');
  sgr.addColorStop(1, 'rgba(255,250,210,0)');
  sg.fillStyle = sgr;
  sg.fillRect(0, 0, 64, 256);
  const hg = sg.createLinearGradient(0, 0, 64, 0);
  hg.addColorStop(0, 'rgba(0,0,0,1)');
  hg.addColorStop(0.5, 'rgba(0,0,0,0)');
  hg.addColorStop(1, 'rgba(0,0,0,1)');
  sg.globalCompositeOperation = 'destination-out';
  sg.fillStyle = hg;
  sg.fillRect(0, 0, 64, 256);
  const shaftTex = new THREE.CanvasTexture(shaftCanvas);
  const shafts = [];
  for (const [x, z] of [[-6, -60], [5, -72], [-2, -30], [6, -20], [-5, -4], [3, -46]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 14), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, 6, z);
    m.rotation.set(0, 0.3, -0.35);
    m.userData.phase = rand() * 6;
    shafts.push(m);
    scene.add(m);
  }

  // ---------- Cristais do Silêncio (somem quando a cor volta) ----------
  const crystals = [];
  const crysMat = toon('#c3c8d6', { emissive: '#6e6a9a', emissiveIntensity: 0.35 });
  const placeCrystal = (x, z, s) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    for (let i = 0; i < 3; i++) {
      grp.add(part(GEO.oct, crysMat, { pos: [(i - 1) * 0.25 * s, 0.4 * s, (rand() - 0.5) * 0.3], rot: [(rand() - 0.5) * 0.6, rand(), (i - 1) * 0.4], scale: [0.16 * s, (0.6 + rand() * 0.5) * s, 0.16 * s], line: 0 }));
    }
    crystals.push(grp);
    scene.add(grp);
  };
  for (let i = 0; i < 90; i++) {
    const x = -22 + rand() * 44;
    const z = -80 + rand() * 75;
    const d = walkDist(x, z);
    if (d < 0.5 || d > 5) continue;
    if (Math.hypot(x - GLADE.x, z - GLADE.z) < 20) continue;
    placeCrystal(x, z, 0.8 + rand() * 0.8);
  }

  // ---------- Vestígio (objeto de memória) ----------
  const makeMemory = () => {
    const grp = new THREE.Group();
    grp.add(part(GEO.cyl, lambert('#d6ccb2', { map: pave }), { pos: [0, 0.3, 0], scale: [0.55, 0.6, 0.55], line: 0 }));
    grp.add(part(GEO.cyl, lambert('#c2b698', { map: pave }), { pos: [0, 0.65, 0], scale: [0.7, 0.12, 0.7], line: 0 }));
    const seed = part(GEO.ico, toon('#9ff5e0', { emissive: '#3fd9b8', emissiveIntensity: 0.6 }), { pos: [0, 1.45, 0], scale: [0.24, 0.34, 0.24], line: 0.01 });
    seed.material = seed.material.clone();
    grp.add(seed);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex, color: '#7fffe0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = 0.73;
    ring.scale.setScalar(1.8);
    grp.add(ring);
    const light = new THREE.PointLight('#7fffd8', 6, 7, 1.5);
    light.position.y = 1.5;
    grp.add(light);
    grp.userData = { seed, ring, light };
    return grp;
  };
  const vestigio = makeMemory();
  vestigio.position.copy(VESTIGIO_POS);
  scene.add(vestigio);
  const finalMemory = makeMemory();
  finalMemory.position.set(ARENA.x, 0, ARENA.z - 3);
  finalMemory.visible = false;
  scene.add(finalMemory);

  // ---------- Portão de cipós ----------
  const gate = new THREE.Group();
  gate.position.set(0, 0, WORLD.gateZ);
  const vineMat = lambert('#5a8a40', { map: bark });
  const thornMat = toon('#a49ac0', { emissive: '#5a3a9a', emissiveIntensity: 0.5 });
  for (let i = 0; i < 7; i++) {
    const y0 = 0.3 + i * 0.32;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const x = -4.4 + (k / 8) * 8.8;
      pts.push(new THREE.Vector3(x, y0 + Math.sin(k * 1.3 + i) * 0.35, Math.cos(k + i * 2) * 0.25));
    }
    gate.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09 + (i % 2) * 0.04, 6), vineMat, { line: 0 }));
  }
  for (let i = 0; i < 18; i++) {
    gate.add(part(GEO.cone, thornMat, { pos: [-4 + rand() * 8, 0.4 + rand() * 2, (rand() - 0.5) * 0.4], rot: [rand() * 3, rand() * 3, rand() * 3], scale: [0.07, 0.3, 0.07], line: 0 }));
  }
  for (const s of [-1, 1]) gate.add(part(limbGeo(0.3, 2.8, 0.2), lambert('#a07850', { map: bark }), { pos: [s * 4.4, 2.8, 0], line: 0 }));
  scene.add(gate);

  // ---------- Barreira de raízes da arena ----------
  const barrier = new THREE.Group();
  barrier.position.set(0, -3.2, ARENA.z + ARENA.r + 0.3);
  const barMat = toon('#6e5a7e', { emissive: '#3a2060', emissiveIntensity: 0.4 });
  for (let i = 0; i < 11; i++) {
    const x = -4.2 + i * 0.84;
    barrier.add(part(GEO.cone, barMat, { pos: [x, 1.4, (rand() - 0.5) * 0.6], rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.35], scale: [0.35, 2.8 + rand() * 0.8, 0.35], line: 0.01 }));
  }
  barrier.visible = false;
  scene.add(barrier);

  // ---------- Ondas de restauração ----------
  const waves = [
    { x: GLADE.x, z: GLADE.z - 2, r: 17, target: 17, speed: 0, glow: 0 },
    { x: VESTIGIO_POS.x, z: VESTIGIO_POS.z, r: 0, target: 0, speed: 14, glow: 0 },
    { x: ARENA.x, z: ARENA.z, r: 0, target: 0, speed: 22, glow: 0 },
    { x: 0, z: 0, r: 0, target: 0, speed: 0, glow: 0 },
  ];
  world.restoredAt = (x, z) => {
    let r = 0;
    for (const w of waves) if (w.r > 0) r = Math.max(r, Math.min(1, Math.max(0, (w.r - Math.hypot(x - w.x, z - w.z)) / 2.5)));
    return r;
  };

  // ---------- Mapa para o minimapa ----------
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 512;
  mapCanvas.height = Math.round((512 * D) / W);
  {
    const m = mapCanvas.getContext('2d');
    const k = mapCanvas.width / W;
    m.fillStyle = '#2f5a2a';
    m.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    m.fillStyle = '#2a7f8c';
    m.fillRect(0, (WATER_Z - 1.6 - Z0) * k, mapCanvas.width, 3.2 * k);
    m.strokeStyle = '#c9a56a';
    m.lineWidth = PATH_HW * 2 * k;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.beginPath();
    PATH.forEach(([x, z], i) => (i ? m.lineTo((x - X0) * k, (z - Z0) * k) : m.moveTo((x - X0) * k, (z - Z0) * k)));
    m.stroke();
    m.fillStyle = '#c9a56a';
    for (const c of [GLADE, ALCOVE]) {
      m.beginPath();
      m.arc((c.x - X0) * k, (c.z - Z0) * k, c.r * k, 0, Math.PI * 2);
      m.fill();
    }
    m.fillStyle = '#d8c89a';
    m.beginPath();
    m.arc((ARENA.x - X0) * k, (ARENA.z - Z0) * k, ARENA.r * k, 0, Math.PI * 2);
    m.fill();
  }
  world.mapCanvas = mapCanvas;

  // ---------- API ----------
  world.walkable = (x, z) => {
    const pr = PLAYER.radius;
    if (world.arenaLocked) return Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r - pr;
    if (walkDist(x, z) > -pr) return false;
    if (Math.abs(z - WATER_Z) < 1.75 && pathDist(x, z) > 1.25) return false;
    if (!world.gateOpen && z < WORLD.gateZ + 0.7) return false;
    return true;
  };
  world.walkableEnemy = (x, z) => walkDist(x, z) < -0.5 && !(Math.abs(z - WATER_Z) < 1.75 && pathDist(x, z) > 1.25) && z > WORLD.gateZ + 1;
  world.gateTimer = 0;
  world.openGate = () => { world.gateOpen = true; world.gateTimer = 0.001; };
  world.vestigio = vestigio;
  world.vestigioPos = VESTIGIO_POS;
  world.spawn = SPAWN;
  world.finalMemory = finalMemory;
  // Atmosfera de dia (sem amanhecer nesta fase) e partículas do ar
  const ATMO = { bg: '#86c4a8', fog: '#86c4a8', near: 32, far: 78, sky: '#eaf6ff', ground: '#5f7f45', hemi: 1.35, sun: '#fff0d4', sunI: 2.7 };
  world.atmosphere = { night: ATMO, day: ATMO };
  world.dawn = 0;
  world.ambient = { restored: 'firefly', silent: 'mote' };
  world.vestigioActive = false;
  world.freed = false;
  world.activateVestigio = () => {
    world.vestigioActive = true;
    waves[1].target = 22;
    waves[1].glow = 1;
  };
  world.restoreAll = () => {
    world.freed = true;
    waves[2].target = 120;
    waves[2].glow = 1;
  };
  world.lockArena = (on) => {
    world.arenaLocked = on;
    barrier.visible = true;
    barrier.userData.target = on ? 0 : -3.2;
  };
  world.resetTrail = () => {
    world.vestigioActive = false;
    waves[1].r = 0;
    waves[1].target = 0;
    world.gateOpen = false;
    world.gateTimer = 0;
    gate.visible = true;
    gate.position.y = 0;
    gate.scale.set(1, 1, 1);
  };
  world.resetArena = () => {
    world.lockArena(false);
    world.freed = false;
    barrier.position.y = -3.2;
    waves[2].r = 0;
    waves[2].target = 0;
    finalMemory.visible = false;
  };

  world.update = (dt, t) => {
    CORRUPTION.uTime.value = t;
    CORRUPTION.uSilent.value.set(0.56, 0.54, 0.72, 0.18);
    waves.forEach((w, i) => {
      if (w.r < w.target) w.r = Math.min(w.target, w.r + w.speed * dt);
      else if (w.r > w.target) w.r = w.target;
      if (w.r >= w.target && w.glow > 0) w.glow = Math.max(0, w.glow - dt * 0.8);
      CORRUPTION.uWaves.value[i].set(w.x, w.z, w.r, w.glow);
    });
    for (const c of crystals) {
      const r = world.restoredAt(c.position.x, c.position.z);
      const s = Math.max(0.001, 1 - r);
      c.scale.setScalar(c.scale.x + (s - c.scale.x) * Math.min(1, dt * 4));
      c.visible = c.scale.x > 0.02;
    }
    for (const m of [vestigio, finalMemory]) {
      const { seed, ring, light } = m.userData;
      const lit = m === vestigio ? world.vestigioActive : true;
      seed.rotation.y = t * (lit ? 2.5 : 1);
      seed.position.y = 1.45 + Math.sin(t * 2) * 0.1;
      ring.rotation.y = t * 0.4;
      ring.material.opacity = lit ? 0.9 : 0.4 + Math.sin(t * 3) * 0.15;
      seed.material.emissiveIntensity = lit ? 1.6 : 0.6 + Math.sin(t * 3) * 0.2;
      light.intensity = lit ? 14 : 5 + Math.sin(t * 3) * 1.5;
    }
    // Runas da clareira: gravadas enquanto corrompida, douradas e brilhantes depois
    const rr = world.restoredAt(ARENA.x, ARENA.z);
    arenaRune.rotation.y = t * 0.03;
    if (world.freed && rr > 0.5 && arenaRune.material.blending !== THREE.AdditiveBlending) {
      arenaRune.material.blending = THREE.AdditiveBlending;
      arenaRune.material.color.set('#ffd77a');
      arenaRune.material.needsUpdate = true;
    } else if (!world.freed && arenaRune.material.blending !== THREE.NormalBlending) {
      arenaRune.material.blending = THREE.NormalBlending;
      arenaRune.material.color.set('#3a2814');
      arenaRune.material.needsUpdate = true;
    }
    if (world.freed) arenaRune.material.opacity = 0.35 + Math.sin(t * 2) * 0.1;
    for (const s of shafts) s.material.opacity = 0.14 + Math.sin(t * 0.6 + s.userData.phase) * 0.06;
    if (world.gateOpen && gate.visible) {
      world.gateTimer += dt;
      const k = Math.min(1, world.gateTimer / 1.6);
      gate.position.y = -k * 3;
      gate.scale.set(1 - k * 0.3, 1, 1);
      if (k >= 1) gate.visible = false;
    }
    if (barrier.userData.target !== undefined) {
      barrier.position.y += (barrier.userData.target - barrier.position.y) * Math.min(1, dt * 5);
      barrier.visible = barrier.position.y > -3.1;
    }
  };

  world.runeTex = runeTex;
  world.arena = ARENA;
  return world;
}
