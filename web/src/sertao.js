import * as THREE from 'three';
import { toon, lambert, part, GEO, instanced, CORRUPTION, injectCorruption, mergeSimple } from './toon.js';
import { dirtTexture, paveTexture, barkTexture, runeTexture, noiseTexture } from './textures.js';
import { clayTexture, whitewashTexture, roofTileTexture, dryGrassCard, cactusTexture, glowTexture } from './textures-sertao.js';
import { WORLD, PLAYER } from './config.js';
import { rng, crossCard, BOUNDS } from './world.js';

// Sertão Velho (fase 2), gótico: noite de lua fria sobre a caatinga morta. Arraial de taipa abandonado
// na entrada, estrada de barro rachado, cemitério de covas rasas onde os mortos se levantam, portão de
// ferro de um casarão arruinado e o terreiro diante dele, onde corre a Mula sem Cabeça. Vencida a Mula,
// amanhece. A fase corre da esquerda para a direita da tela (oeste → leste; pedido do usuário, 27/10/2026):
// arraial a oeste, cemitério acima da estrada, terreiro e casarão a leste. A arena tem centro próprio
// (main.js copia world.arena para WORLD.arenaCenter ao trocar de fase) e o mesmo raio da clareira da Mata.

export const SERTAO_PATH = [[-56, -30], [-46, -30], [-37, -26], [-27, -27], [-19, -32], [-10, -33], [-1, -29], [9, -29], [21, -30]];
const PATH_HW = 3.3;
const PLAZA = { x: -58, z: -30, r: 8.5 };
const YARD = { x: -26, z: -36.5, r: 5.8 };                 // cemitério, acima da estrada na tela
const ARENA = { x: 32, z: -30, r: WORLD.arenaRadius };
const GATE_X = 17.5;                                        // portão de ferro, atravessando a estrada
export const SERTAO_VESTIGIO = new THREE.Vector3(-25.2, 0, -37.8);
export const SERTAO_SPAWN = { trail: new THREE.Vector3(-61, 0, -29), arena: new THREE.Vector3(GATE_X + 1.3, 0, ARENA.z) };
// Mortos-vivos da estrada: 'morto' sai da cova e golpeia; 'brasa' também explode ao cair
export const SERTAO_ENEMIES = [
  { x: -44, z: -29.5, kind: 'morto' },
  { x: -33, z: -26.5, kind: 'morto' },
  { x: -24, z: -35, kind: 'brasa' },
  { x: -28.5, z: -39.5, kind: 'morto' },
  { x: -6, z: -32, kind: 'brasa' },
];
const CASARAO_Z = ARENA.z - 20;

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function pathDist(x, z) {
  let d = Infinity;
  for (let i = 0; i < SERTAO_PATH.length - 1; i++) d = Math.min(d, segDist(x, z, ...SERTAO_PATH[i], ...SERTAO_PATH[i + 1]));
  return d;
}
// Distância assinada à área caminhável (negativa dentro)
function walkDist(x, z) {
  return Math.min(
    pathDist(x, z) - PATH_HW,
    Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r,
    Math.hypot(x - YARD.x, z - YARD.z) - YARD.r,
    Math.hypot(x - ARENA.x, z - ARENA.z) - ARENA.r,
  );
}

// ---------- Geometrias da caatinga ----------

// Coluna de cacto torneada: topo arredondado e costelas pela volta
function cactusColumn(r, h, ribs = 8) {
  const prof = [[0, 0], [r, 0], [r, h - r * 0.9], [r * 0.85, h - r * 0.35], [r * 0.5, h - r * 0.06], [0, h]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(prof, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = 1 + 0.14 * Math.cos(Math.atan2(z, x) * ribs);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Mandacaru: tronco alto e braços que saem na horizontal e sobem como candelabro
function mandacaruGeometry(seed) {
  const r = rng(seed);
  const parts = [cactusColumn(0.2, 2.7 + r() * 0.8)];
  const arms = 2 + Math.floor(r() * 3);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + r() * 0.8;
    const y0 = 0.9 + r() * 0.9;
    const ext = 0.35 + r() * 0.2;
    const ra = 0.15;
    const elbow = new THREE.CylinderGeometry(ra, ra, ext, 10);
    elbow.rotateZ(Math.PI / 2);
    elbow.translate(ext / 2, 0, 0);
    elbow.rotateY(-a);
    elbow.translate(0, y0, 0);
    const knee = new THREE.SphereGeometry(ra * 1.02, 10, 8);
    knee.translate(Math.cos(a) * ext, y0, Math.sin(a) * ext);
    const col = cactusColumn(ra, 0.8 + r() * 0.9);
    col.translate(Math.cos(a) * ext, y0, Math.sin(a) * ext);
    parts.push(elbow, knee, col);
  }
  return mergeSimple(parts);
}

// Xique-xique: touceira baixa de colunas finas abertas para fora
function xiquexiqueGeometry(seed) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    const c = cactusColumn(0.08 + r() * 0.03, 0.35 + r() * 0.55, 6);
    c.rotateZ(0.25 + r() * 0.35);
    c.rotateY(-a);
    c.translate(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
    parts.push(c);
  }
  return mergeSimple(parts);
}

// Árvore seca da caatinga: galhos tortos que se abrem em leque, afinando até as pontas
const UP = new THREE.Vector3(0, 1, 0);
function deadTreeGeometry(seed, depth = 4, len0 = 1.5, rad0 = 0.2) {
  const r = rng(seed);
  const parts = [];
  const q = new THREE.Quaternion();
  const branch = (start, dir, len, rad, d) => {
    const g = new THREE.CylinderGeometry(rad * 0.62, rad, len, 6, 1, true);
    g.translate(0, len / 2, 0);
    q.setFromUnitVectors(UP, dir);
    g.applyQuaternion(q);
    g.translate(start.x, start.y, start.z);
    parts.push(g);
    const end = start.clone().addScaledVector(dir, len);
    if (d === 0) return;
    const n = 2 + (r() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const az = (i / n) * Math.PI * 2 + r() * 1.5;
      const tilt = 0.45 + r() * 0.55;
      const side = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const nd = dir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt));
      nd.y += (r() - 0.6) * 0.35;   // alguns galhos caem: silhueta retorcida
      nd.normalize();
      branch(end, nd, len * (0.62 + r() * 0.2), rad * 0.62, d - 1);
    }
  };
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3).normalize(), len0, rad0, depth);
  return mergeSimple(parts);
}

// Crânio de boi com chifres, sobre mourões, no portão e no cemitério
function makeSkull(boneMat, holeMat) {
  const g = new THREE.Group();
  g.add(part(GEO.sphereLo, boneMat, { pos: [0, 0, 0], scale: [0.16, 0.13, 0.17], line: 0 }));
  g.add(part(GEO.sphereLo, boneMat, { pos: [0, -0.04, 0.17], scale: [0.09, 0.08, 0.16], line: 0 }));
  for (const s of [-1, 1]) {
    g.add(part(GEO.sphereLo, holeMat, { pos: [s * 0.075, 0.02, 0.12], scale: [0.04, 0.045, 0.03], line: 0 }));
    const horn = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.12, 0.05, -0.02), new THREE.Vector3(s * 0.3, 0.06, -0.04), new THREE.Vector3(s * 0.42, 0.18, 0.02), new THREE.Vector3(s * 0.44, 0.32, 0.08)]);
    g.add(part(new THREE.TubeGeometry(horn, 10, 0.035, 6), boneMat, { line: 0 }));
  }
  return g;
}

export function buildSertao(parent) {
  const rand = rng(20261027);
  const scene = new THREE.Group();
  scene.name = 'sertao';
  parent.add(scene);
  const world = { key: 'sertao', root: scene, gateOpen: false, arenaLocked: false, dawn: 0 };
  const { x0: X0, z0: Z0, w: W, d: D } = BOUNDS;

  // Atmosfera: noite de lua fria; a vitória sobre a Mula traz o amanhecer (main.js interpola por world.dawn)
  world.atmosphere = {
    night: { bg: '#1e2440', fog: '#262d4c', near: 26, far: 72, sky: '#8c9ad6', ground: '#4a3632', hemi: 1.05, sun: '#c6d2ff', sunI: 1.75 },
    day: { bg: '#e9b38c', fog: '#e4ae88', near: 34, far: 86, sky: '#ffe0bc', ground: '#8a5e40', hemi: 1.3, sun: '#ffc68a', sunI: 2.6 },
  };
  world.ambient = { restored: 'ember', silent: 'ash' };

  // ---------- Chão: barro rachado, estrada de terra e lajes de pedra ----------
  // Máscara: R = estrada/terreiro de terra, G = lajes de pedra, B = variação de tom
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
  for (let i = 0; i < 600; i++) {
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
  const disc = (c, r, color, blur) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx(c.x), cz(c.z), r * sx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  g.save();
  g.filter = 'blur(5px)';
  g.strokeStyle = 'rgb(255,0,0)';
  g.lineWidth = (PATH_HW * 2 + 0.6) * sx;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  SERTAO_PATH.forEach(([x, z], i) => (i ? g.lineTo(cx(x), cz(z)) : g.moveTo(cx(x), cz(z))));
  g.stroke();
  g.restore();
  disc(PLAZA, PLAZA.r + 0.3, 'rgb(255,0,0)', 5);
  disc(YARD, YARD.r + 0.3, 'rgb(255,0,0)', 6);
  disc(ARENA, ARENA.r + 0.4, 'rgb(255,0,0)', 2);
  // Lajes: centro da praça do arraial; no terreiro (terra batida) só o anel da borda e a roda do meio
  disc(PLAZA, 3.6, 'rgb(0,220,0)', 2);
  g.save();
  g.filter = 'blur(1.5px)';
  g.strokeStyle = 'rgb(0,255,0)';
  g.lineWidth = 1.8 * sx;
  g.beginPath();
  g.arc(cx(ARENA.x), cz(ARENA.z), (ARENA.r - 0.5) * sx, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  disc(ARENA, 3.2, 'rgb(0,255,0)', 1.5);
  g.globalCompositeOperation = 'source-over';
  const maskTex = new THREE.CanvasTexture(mc);
  maskTex.flipY = false;

  const clayTex = clayTexture();
  const dirtTex = dirtTexture();
  const paveTex = paveTexture();
  const noiseTex = noiseTexture();
  const groundMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  injectCorruption(groundMat, {
    key: 'sertaoGround',
    uniforms: {
      tMask: { value: maskTex },
      tClay: { value: clayTex },
      tDirt: { value: dirtTex },
      tPave: { value: paveTex },
      tClayN: { value: clayTex.userData.nh },
      tDirtN: { value: dirtTex.userData.nh },
      tPaveN: { value: paveTex.userData.nh },
      tNoise: { value: noiseTex },
      uMaskOrigin: { value: new THREE.Vector2(X0, Z0) },
      uMaskSize: { value: new THREE.Vector2(W, D) },
    },
    fragHead: `
      uniform sampler2D tMask, tClay, tDirt, tPave, tClayN, tDirtN, tPaveN, tNoise;
      uniform vec2 uMaskOrigin, uMaskSize;
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
      vec4 cc, cn, dc, dn;
      noTile(tClay, tClayN, wuv / 6.0, nz.r, cc, cn);
      noTile(tDirt, tDirtN, wuv / 4.5, nz.a, dc, dn);
      dc.rgb *= vec3(1.0, 0.8, 0.68);                          // terra batida avermelhada
      vec2 puv = wuv / 3.4;
      float l = dot(texture2D(tPave, puv).rgb, vec3(0.33));
      vec3 pc = vec3(l) * vec3(0.8, 0.7, 0.6) * (0.8 + 0.25 * nz2.b);       // lajes de arenito sem musgo
      pc = mix(pc, dc.rgb * 0.9, smoothstep(0.5, 0.8, nz2.g + (nz.b - 0.5) * 0.3) * 0.65);   // poeira por cima
      vec4 pn = texture2D(tPaveN, puv);
      float wP = smoothstep(0.2, 0.8, msk.g + (nz2.r - 0.5) * 0.4);
      float dm = smoothstep(0.3, 0.75, msk.r + (nz2.b - 0.5) * 0.5);
      vec3 w = vec3((1.0 - dm) * (1.0 - wP), dm * (1.0 - wP), wP);
      vec3 hh = vec3(cn.a, dn.a, pn.a) * 0.7 + w;
      float hm = max(max(hh.x, hh.y), hh.z) - 0.22;
      vec3 bw = max(hh - hm, 0.0);
      bw /= bw.x + bw.y + bw.z;
      vec3 col = cc.rgb * bw.x + dc.rgb * bw.y + pc * bw.z;
      vec4 nh = cn * bw.x + dn * bw.y + pn * bw.z;
      // poeira de barro assentada nas juntas das lajes
      float groove = bw.z * (1.0 - smoothstep(0.12, 0.4, pn.a));
      col = mix(col, vec3(0.5, 0.3, 0.2), groove * 0.55);
      col *= 0.8 + 0.42 * msk.b;
      col *= mix(0.7, 1.05, smoothstep(0.05, 0.7, nh.a));
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

  // Sem círculo gravado no terreiro (o da Mata tem uma estrela de seis pontas, que à noite leria como
  // símbolo oculto/religioso); as runas ficam só nos anéis das memórias, como na fase 1
  const runeTex = runeTexture();

  // ---------- Neblina rasteira ----------
  // Duas lâminas de névoa animada fora dos caminhos; sobre a área caminhável fica rala para não cobrir os
  // avisos no chão. Some ao amanhecer.
  const mistUniforms = {
    tNoise: { value: noiseTex },
    tMask: { value: maskTex },
    uMaskOrigin: { value: new THREE.Vector2(X0, Z0) },
    uMaskSize: { value: new THREE.Vector2(W, D) },
    uTime: CORRUPTION.uTime,
    uColor: { value: new THREE.Color('#6a76a8') },
    uAmount: { value: 1 },
  };
  const mistMat = (k) => new THREE.ShaderMaterial({
    uniforms: { ...mistUniforms, uK: { value: k } },
    transparent: true,
    depthWrite: false,
    vertexShader: 'varying vec3 vW;\nvoid main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform sampler2D tNoise, tMask; uniform vec2 uMaskOrigin, uMaskSize; uniform float uTime, uAmount, uK; uniform vec3 uColor;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz;
        float n = texture2D(tNoise, p * 0.028 * uK + vec2(uTime * 0.012, uTime * 0.007)).r;
        float n2 = texture2D(tNoise, p * 0.07 - vec2(uTime * 0.018 * uK, 0.0)).g;
        vec4 m = texture2D(tMask, (p - uMaskOrigin) / uMaskSize);
        float open = max(m.r, m.g);
        float a = smoothstep(0.35, 0.95, n * 0.65 + n2 * 0.45) * mix(0.32, 0.04, open) * uAmount / uK;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  for (const [y, k] of [[0.3, 1], [1.0, 1.6]]) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), mistMat(k));
    mist.position.set(X0 + W / 2, y, Z0 + D / 2);
    mist.renderOrder = 2;
    scene.add(mist);
  }

  // ---------- Materiais ----------
  const bark = barkTexture();
  const wash = whitewashTexture();
  const tiles = roofTileTexture();
  const woodMat = lambert('#9a7a5c', { map: bark });
  const darkWood = lambert('#5a4030', { map: bark });
  const washMat = lambert('#ffffff', { map: wash });
  const roofMat = lambert('#ffffff', { map: tiles });
  const voidMat = new THREE.MeshBasicMaterial({ color: '#0d0a10' });
  const ironMat = lambert('#3b3742');
  const boneMat = lambert('#e2d8c0');
  const stoneMat = lambert('#ffffff');
  const barraCols = ['#4f7da0', '#b0703a', '#6f8f5a', '#9a4a3a'];

  // ---------- Caatinga ----------
  const deadMat = lambert('#ffffff', { map: bark });
  const deadTrees = [11, 23, 37].map((s) => instanced(deadTreeGeometry(s), deadMat, 140, 0));
  const deadShrubs = [5, 9].map((s) => instanced(deadTreeGeometry(s, 3, 0.45, 0.07), deadMat, 400, 0));
  const cactusTex = cactusTexture();
  const cactusMat = lambert('#ffffff', { map: cactusTex });
  const mandacarus = [3, 8, 14].map((s) => instanced(mandacaruGeometry(s), cactusMat, 90, 0));
  const xiques = [4, 6].map((s) => instanced(xiquexiqueGeometry(s), cactusMat, 300, 0));
  const dryGrass = instanced(crossCard(0.9, 0.6), lambert('#ffffff', { map: dryGrassCard(), alphaTest: 0.4, side: THREE.DoubleSide, wind: 0.12 }), 3500, 0);
  dryGrass.mesh.castShadow = false;
  const rocks = instanced(GEO.dodec, stoneMat, 700, 0);
  const bones = instanced(GEO.capsule, boneMat, 260, 0);
  bones.mesh.castShadow = false;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const deadTree = (x, z, s) => pick(deadTrees).add([x, 0, z], [(rand() - 0.5) * 0.12, rand() * 6, (rand() - 0.5) * 0.12], s, rand() < 0.5 ? '#bdb2a4' : '#a39888');
  const shrub = (x, z, s) => pick(deadShrubs).add([x, 0, z], [0, rand() * 6, 0], s, rand() < 0.5 ? '#9a8a78' : '#b8a68e');
  const mandacaru = (x, z, s) => pick(mandacarus).add([x, 0, z], [(rand() - 0.5) * 0.08, rand() * 6, (rand() - 0.5) * 0.08], s, rand() < 0.5 ? '#6f9a72' : '#7fa47a');
  const xique = (x, z, s) => pick(xiques).add([x, 0, z], [0, rand() * 6, 0], s, rand() < 0.5 ? '#86a882' : '#9cb48a');
  const rock = (x, z, s, flat = 0.6) => rocks.add([x, s * flat * 0.4, z], [rand() * 3, rand() * 3, rand() * 3], [s, s * flat, s], rand() < 0.5 ? '#a89a8a' : '#c0ae98');
  const bone = (x, z) => bones.add([x, 0.04, z], [Math.PI / 2, rand() * 6, 0, 'YXZ'], [0.035, 0.12 + rand() * 0.1, 0.035], '#e8dcc4');

  // Nada alto entre a câmera (sul) e a área jogável
  const blocksView = (x, z) => {
    for (let k = 0; k <= 11; k += 1.25) if (walkDist(x, z - k) < 1.5) return true;
    return false;
  };
  const busy = [];   // pegadas das construções: a vegetação não nasce dentro delas
  const free = (x, z) => busy.every((b) => Math.hypot(x - b[0], z - b[1]) > b[2]);

  // ---------- Casas de taipa do arraial ----------
  // w × d × h; o telhado de duas águas corre ao longo de x. ruin: 0 inteira, 1 meio telhado caído, 2 sem telhado
  const house = (x, z, w, d, h, ruin) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    // a frente (+z) olha para o ponto mais próximo da estrada ou da praça
    let best = [PLAZA.x, PLAZA.z];
    let bd = Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r;
    for (let i = 0; i < SERTAO_PATH.length - 1; i++) {
      const [ax, az] = SERTAO_PATH[i];
      const [bx, bz] = SERTAO_PATH[i + 1];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const d = Math.hypot(x - px, z - pz) - PATH_HW;
      if (d < bd) {
        bd = d;
        best = [px, pz];
      }
    }
    grp.rotation.y = Math.atan2(best[0] - x, best[1] - z) + (rand() - 0.5) * 0.3;
    const barra = pick(barraCols);
    grp.add(part(GEO.box, washMat, { pos: [0, h / 2, 0], scale: [w, h, d], line: 0 }));
    grp.add(part(GEO.box, lambert(barra), { pos: [0, 0.3, 0], scale: [w + 0.04, 0.6, d + 0.04], line: 0 }));
    // porta e janelas na frente (+z) e na lateral
    const door = rand() < 0.5;
    grp.add(part(GEO.box, voidMat, { pos: [w * 0.15, 0.95, d / 2 + 0.01], scale: [0.9, 1.9, 0.04], line: 0 }));
    grp.add(part(GEO.box, darkWood, { pos: [w * 0.15 + (door ? 0.55 : 0), 0.95, d / 2 + (door ? 0.35 : 0.03)], rot: [0, door ? 1.2 : 0, 0], scale: [0.85, 1.85, 0.06], line: 0 }));
    for (const wx of [-w * 0.28]) {
      grp.add(part(GEO.box, voidMat, { pos: [wx, 1.45, d / 2 + 0.01], scale: [0.7, 0.7, 0.04], line: 0 }));
      grp.add(part(GEO.box, darkWood, { pos: [wx - 0.5, 1.4, d / 2 + 0.12], rot: [0, -0.9, (rand() - 0.5) * 0.4], scale: [0.36, 0.72, 0.04], line: 0 }));
    }
    grp.add(part(GEO.box, voidMat, { pos: [w / 2 + 0.01, 1.45, 0], scale: [0.04, 0.6, 0.6], line: 0 }));
    // oitões (triângulos nas pontas) e telhado
    const pitch = 0.42;
    const rise = (d / 2) * Math.tan(pitch);
    const gable = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise)]);
    const gableGeo = new THREE.ShapeGeometry(gable);
    for (const s of [-1, 1]) {
      if (ruin === 2) break;
      const m = part(gableGeo, lambert('#ffffff', { map: wash, side: THREE.DoubleSide }), { pos: [s * w / 2, h, 0], rot: [0, Math.PI / 2, 0], line: 0 });
      grp.add(m);
    }
    const slab = (s) => part(GEO.box, roofMat, { pos: [0, h + rise / 2 + 0.06, s * d / 4], rot: [s * pitch, 0, 0], scale: [w + 0.6, 0.1, d / 2 / Math.cos(pitch) + 0.5], line: 0 });
    if (ruin === 0) grp.add(slab(1), slab(-1));
    if (ruin === 1) {
      grp.add(slab(-1));
      // caibros à mostra onde as telhas caíram
      for (let i = 0; i < 6; i++) {
        const rx = -w / 2 + (i + 0.5) * (w / 6);
        grp.add(part(GEO.box, darkWood, { pos: [rx, h + rise / 2, d / 4], rot: [pitch + (rand() - 0.5) * 0.2, 0, (rand() - 0.5) * 0.1], scale: [0.09, 0.09, d / 2 / Math.cos(pitch) + 0.3], line: 0 }));
      }
      for (let i = 0; i < 5; i++) rock(x + (rand() - 0.5) * w, z + d / 2 + 0.8 + rand(), 0.25 + rand() * 0.2, 0.3);
    }
    if (ruin === 2) {
      // parede de cima desmoronada em degraus e entulho
      for (let i = 0; i < 4; i++) grp.add(part(GEO.box, washMat, { pos: [-w / 2 + (i + 0.5) * (w / 4), h + 0.25, -d / 2 + 0.15], scale: [w / 4, 0.5 + rand() * 0.6, 0.3], line: 0 }));
      for (let i = 0; i < 4; i++) grp.add(part(GEO.box, darkWood, { pos: [(rand() - 0.5) * w, h - 0.2, (rand() - 0.5) * d], rot: [rand(), rand(), rand() * 0.6], scale: [0.1, 0.1, d], line: 0 }));
    }
    scene.add(grp);
    busy.push([x, z, Math.max(w, d) * 0.75]);
    return grp;
  };
  const houseSpots = [
    [-70, -31, 0], [-67, -41, 1], [-57, -43, 0], [-47, -40, 2], [-69, -20, 1], [-60, -15, 0], [-48, -19, 0],
    [-36, -41, 2], [-14, -44, 1], [-2, -40, 2], [6, -41, 1], [-12, -18, 2], [4, -17, 1],
  ];
  for (const [x, z, ruin] of houseSpots) {
    if (blocksView(x, z) || walkDist(x, z) < 3) continue;
    house(x, z, 4 + rand() * 1.5, 3.2 + rand(), 2.6 + rand() * 0.4, ruin);
  }

  // ---------- Casarão arruinado no fundo do terreiro ----------
  const casarao = new THREE.Group();
  casarao.position.set(ARENA.x, 0, CASARAO_Z);
  {
    const W2 = 24;
    const H2 = 8;
    const D2 = 7;
    casarao.add(part(GEO.box, washMat, { pos: [0, H2 / 2, 0], scale: [W2, H2, D2], line: 0 }));
    casarao.add(part(GEO.box, lambert('#5a6e82'), { pos: [0, 0.45, 0], scale: [W2 + 0.06, 0.9, D2 + 0.06], line: 0 }));
    // cornija e cunhais
    casarao.add(part(GEO.box, washMat, { pos: [0, H2 + 0.15, 0.1], scale: [W2 + 0.6, 0.3, D2 + 0.4], line: 0 }));
    casarao.add(part(GEO.box, washMat, { pos: [0, 4.1, D2 / 2 + 0.12], scale: [W2 + 0.2, 0.22, 0.3], line: 0 }));
    for (const px of [-W2 / 2, -4, 4, W2 / 2]) casarao.add(part(GEO.box, lambert('#d8ccb6'), { pos: [px, H2 / 2, D2 / 2 + 0.1], scale: [0.6, H2, 0.25], line: 0 }));
    // vãos em arco: retângulo + meio disco escuros
    const arch = (ax, ay, aw, ah) => {
      casarao.add(part(GEO.box, voidMat, { pos: [ax, ay + ah / 2, D2 / 2 + 0.02], scale: [aw, ah, 0.04], line: 0 }));
      casarao.add(part(new THREE.CircleGeometry(aw / 2, 14, 0, Math.PI), voidMat, { pos: [ax, ay + ah, D2 / 2 + 0.03], line: 0 }));
      casarao.add(part(GEO.box, lambert('#cfc2aa'), { pos: [ax, ay - 0.08, D2 / 2 + 0.12], scale: [aw + 0.3, 0.14, 0.3], line: 0 }));
    };
    arch(0, 0, 2.6, 3.0);
    for (const ax of [-8.5, -6, 6, 8.5]) arch(ax, 1.2, 1.2, 1.6);
    for (const ax of [-9.5, -7, -2, 0, 2, 7, 9.5]) arch(ax, 4.9, 1.1, 1.7);
    // venezianas soltas e a sacada de ferro
    for (const ax of [-7, 2, 9.5]) casarao.add(part(GEO.box, darkWood, { pos: [ax + 0.75, 5.6, D2 / 2 + 0.35], rot: [0, -0.8, (rand() - 0.5) * 0.5], scale: [0.55, 1.6, 0.05], line: 0 }));
    casarao.add(part(GEO.box, lambert('#bfb39c'), { pos: [0, 4.4, D2 / 2 + 0.6], scale: [6.4, 0.16, 1.2], line: 0 }));
    for (let i = 0; i <= 20; i++) casarao.add(part(GEO.cyl, ironMat, { pos: [-3.1 + i * 0.31, 4.95, D2 / 2 + 1.15], scale: [0.025, 1.0, 0.025], line: 0 }));
    casarao.add(part(GEO.box, ironMat, { pos: [0, 5.45, D2 / 2 + 1.15], scale: [6.3, 0.06, 0.06], line: 0 }));
    // telhado de quatro águas pela metade: uma água inteira, a outra caída com os caibros
    const pitch = 0.5;
    casarao.add(part(GEO.box, roofMat, { pos: [-3, H2 + 1.1, D2 / 4], rot: [pitch, 0, 0], scale: [W2 * 0.7, 0.14, D2 / 2 / Math.cos(pitch) + 0.8], line: 0 }));
    casarao.add(part(GEO.box, roofMat, { pos: [0, H2 + 1.1, -D2 / 4], rot: [-pitch, 0, 0], scale: [W2 + 0.8, 0.14, D2 / 2 / Math.cos(pitch) + 0.8], line: 0 }));
    for (let i = 0; i < 9; i++) casarao.add(part(GEO.box, darkWood, { pos: [W2 * 0.22 + i * 0.75 - 1.5, H2 + 1.0, D2 / 4], rot: [pitch + (rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.15], scale: [0.12, 0.12, D2 / 2 + 0.6], line: 0 }));
    // torre do oitão com o vão escuro
    casarao.add(part(GEO.box, washMat, { pos: [0, H2 + 1.8, 0.4], scale: [4.2, 3.6, 3], line: 0 }));
    arch(0, H2 + 1.2, 1.2, 1.4);
    casarao.add(part(new THREE.ConeGeometry(3.2, 1.6, 4, 1), roofMat, { pos: [0, H2 + 4.4, 0.4], rot: [0, Math.PI / 4, 0], line: 0 }));
    // entulho na frente
    for (let i = 0; i < 14; i++) rock(ARENA.x + (rand() - 0.5) * 22, CASARAO_Z + D2 / 2 + 0.6 + rand() * 1.4, 0.3 + rand() * 0.4, 0.4);
  }
  scene.add(casarao);
  busy.push([ARENA.x, CASARAO_Z, 13]);

  // ---------- Muro e portão de ferro do casarão ----------
  // montado ao longo de x local e girado: o muro corre de norte a sul e as folhas abrem para o terreiro (leste)
  const gate = new THREE.Group();
  gate.position.set(GATE_X, 0, ARENA.z);
  gate.rotation.y = -Math.PI / 2;
  const leaves = [];
  for (const s of [-1, 1]) {
    // pilar caiado com capitel e crânio de boi
    gate.add(part(GEO.box, washMat, { pos: [s * 4.7, 1.7, 0], scale: [1.0, 3.4, 1.0], line: 0 }));
    gate.add(part(GEO.box, lambert('#d0c4ac'), { pos: [s * 4.7, 3.5, 0], scale: [1.25, 0.25, 1.25], line: 0 }));
    const sk = makeSkull(boneMat, voidMat);
    sk.position.set(s * 4.7, 3.82, 0.1);
    sk.scale.setScalar(1.4);
    gate.add(sk);
    // folha do portão, articulada no pilar
    const leaf = new THREE.Group();
    leaf.position.set(s * 4.15, 0, 0);
    for (let i = 0; i < 14; i++) {
      const bx = -s * (0.15 + i * 0.29);
      const bh = 2.5 + Math.sin((i / 13) * Math.PI) * 0.5 * (s > 0 ? 1 : 1);
      leaf.add(part(GEO.cyl, ironMat, { pos: [bx, bh / 2, 0], scale: [0.03, bh, 0.03], line: 0 }));
      leaf.add(part(GEO.cone, ironMat, { pos: [bx, bh + 0.09, 0], scale: [0.06, 0.18, 0.06], line: 0 }));
    }
    for (const y of [0.35, 1.3, 2.25]) leaf.add(part(GEO.box, ironMat, { pos: [-s * 2.05, y, 0], scale: [4.1, 0.06, 0.06], line: 0 }));
    // voluta no alto
    const scroll = new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map((t) => new THREE.Vector3(-s * (0.3 + t * 3.6), 2.3 + Math.sin(t * Math.PI) * 0.45, 0)));
    leaf.add(part(new THREE.TubeGeometry(scroll, 20, 0.035, 5), ironMat, { line: 0 }));
    gate.add(leaf);
    leaves.push({ leaf, s });
    // muro de taipa com telhinha em cima, quebrado em trechos
    for (let k = 0; k < 6; k++) {
      const x0 = s * (5.2 + k * 3);
      // do lado de baixo da tela (sul) o muro é baixo, para não esconder a estrada da câmera
      const hW = (k === 3 ? 1.1 : 2.3 - (k > 3 ? rand() * 0.8 : 0)) * (s > 0 ? 0.55 : 1);
      gate.add(part(GEO.box, washMat, { pos: [x0 + s * 1.5, hW / 2, 0], scale: [3, hW, 0.6], line: 0 }));
      if (k !== 3) gate.add(part(GEO.box, roofMat, { pos: [x0 + s * 1.5, hW + 0.08, 0], scale: [3.1, 0.12, 0.9], line: 0 }));
    }
  }
  scene.add(gate);
  for (let z = -23; z <= 23; z += 2) busy.push([GATE_X, ARENA.z + z, 1.6]);

  // ---------- Cemitério do arraial ----------
  // Covas rasas de pedra e terra com marcos de madeira (tábuas, sem símbolos religiosos), mureta baixa
  // de pedra quebrada e duas covas abertas de onde os mortos se levantam.
  const toPath = Math.atan2(-22 - YARD.x, -30.1 - YARD.z);   // direção do cemitério para a estrada
  const moundMat = lambert('#8a5a3c');
  const openGrave = (x, z) => {
    scene.add(part(new THREE.CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), voidMat, { pos: [x, 0.03, z], scale: [1, 1, 1.6], line: 0 }));
    for (let i = 0; i < 5; i++) scene.add(part(GEO.sphereLo, moundMat, { pos: [x + 0.8 + rand() * 0.3, 0.05, z + (rand() - 0.5) * 1.2], scale: [0.35, 0.18, 0.35], line: 0 }));
  };
  for (const e of SERTAO_ENEMIES) if (Math.hypot(e.x - YARD.x, e.z - YARD.z) < YARD.r) openGrave(e.x, e.z - 0.6);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.2;
    const da = Math.atan2(Math.sin(a - toPath), Math.cos(a - toPath));
    if (Math.abs(da) < 0.7) continue;
    const r = 3.6 + rand() * 1.4;
    const x = YARD.x + Math.sin(a) * r;
    const z = YARD.z + Math.cos(a) * r;
    if (SERTAO_ENEMIES.some((e) => Math.hypot(e.x - x, e.z - z) < 1.4)) continue;
    const rot = a + Math.PI / 2;
    scene.add(part(GEO.sphereLo, moundMat, { pos: [x, 0, z], rot: [0, rot, 0], scale: [0.55, 0.28, 1.0], line: 0 }));
    for (let k = 0; k < 7; k++) {
      const t = (k / 7) * Math.PI * 2;
      rock(x + Math.cos(t) * 0.55 * Math.cos(rot) + Math.sin(t) * 1.0 * Math.sin(rot), z - Math.cos(t) * 0.55 * Math.sin(rot) + Math.sin(t) * 1.0 * Math.cos(rot), 0.16, 0.6);
    }
    // marco: estaca com uma tábua pregada
    const lean = (rand() - 0.5) * 0.35;
    const mx = x + Math.sin(rot) * 1.05;
    const mz = z + Math.cos(rot) * 1.05;
    scene.add(part(GEO.box, darkWood, { pos: [mx, 0.45, mz], rot: [lean, rot, lean * 0.5], scale: [0.08, 0.95, 0.08], line: 0 }));
    scene.add(part(GEO.box, woodMat, { pos: [mx, 0.78, mz], rot: [lean, rot, lean * 0.5 + (rand() - 0.5) * 0.3], scale: [0.4, 0.24, 0.04], line: 0 }));
    if (rand() < 0.3) {
      const sk = makeSkull(boneMat, voidMat);
      sk.position.set(x, 0.3, z);
      sk.rotation.y = rand() * 6;
      sk.scale.setScalar(0.8);
      scene.add(sk);
    }
  }
  const wallStones = instanced(GEO.dodec, stoneMat, 260, 0);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - toPath), Math.cos(a - toPath))) < 0.85) continue;
    if (rand() < 0.12) continue;   // trechos caídos
    const r = YARD.r + 0.5;
    const x = YARD.x + Math.sin(a) * r;
    const z = YARD.z + Math.cos(a) * r;
    for (let k = 0; k < 2; k++) wallStones.add([x + (rand() - 0.5) * 0.1, 0.16 + k * 0.26, z], [rand(), a, rand() * 0.3], [0.3, 0.17, 0.24], rand() < 0.5 ? '#9e958a' : '#b5a996');
  }
  wallStones.done();
  scene.add(wallStones.mesh);
  busy.push([YARD.x, YARD.z, YARD.r + 1.2]);

  // ---------- Terreiro: meio-fio, muros quebrados e postes de ferro ----------
  const curbs = instanced(GEO.box, lambert('#c8bcaa'), 120, 0);
  const nCurb = 64;
  for (let i = 0; i < nCurb; i++) {
    const a = (i / nCurb) * Math.PI * 2;
    const x = ARENA.x + Math.sin(a) * (ARENA.r + 0.55);
    const z = ARENA.z + Math.cos(a) * (ARENA.r + 0.55);
    if (pathDist(x, z) < PATH_HW - 0.2 && x < ARENA.x) continue;
    curbs.add([x, 0.12, z], [0, a, 0], [((Math.PI * 2 * (ARENA.r + 0.55)) / nCurb) * 0.96, 0.24, 0.55], rand() < 0.5 ? '#ffffff' : '#ddd2c0');
  }
  curbs.done();
  scene.add(curbs.mesh);
  for (let a = 1.1; a < Math.PI * 2 - 1.1; a += 0.2) {
    if (rand() < 0.25 || Math.abs(a - Math.PI * 1.5) < 0.6) continue;   // sem muro na entrada (oeste)
    const r = ARENA.r + 2.4;
    const h = 1 + rand() * 1.6;
    scene.add(part(GEO.box, washMat, { pos: [ARENA.x + Math.sin(a) * r, h / 2, ARENA.z + Math.cos(a) * r], rot: [0, a, (rand() - 0.5) * 0.06], scale: [r * 0.2 + 0.05, h, 0.5], line: 0 }));
  }
  busy.push([ARENA.x, ARENA.z, ARENA.r + 3.5]);

  // ---------- Candeeiros: fogo morno no arraial, fogo-fátuo frio no cemitério e no terreiro ----------
  const glowTex = glowTexture();
  const lamps = [];
  const lamp = (x, z, ghost, light, h = 2.6) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.add(part(GEO.cyl, ghost ? ironMat : darkWood, { pos: [0, h / 2, 0], scale: [0.07, h, 0.07], line: 0 }));
    grp.add(part(GEO.box, ghost ? ironMat : darkWood, { pos: [0.3, h - 0.05, 0], scale: [0.65, 0.06, 0.06], line: 0 }));
    grp.add(part(GEO.box, ironMat, { pos: [0.55, h - 0.4, 0], scale: [0.24, 0.32, 0.24], line: 0 }));
    const flameMat = new THREE.MeshBasicMaterial({ color: ghost ? '#8affd6' : '#ffbb55' });
    grp.add(part(GEO.sphereLo, flameMat, { pos: [0.55, h - 0.42, 0], scale: [0.09, 0.13, 0.09], line: 0 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ghost ? '#5affc8' : '#ffa040', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
    halo.position.set(0.55, h - 0.42, 0);
    halo.scale.setScalar(1.3);
    grp.add(halo);
    let pl = null;
    if (light) {
      pl = new THREE.PointLight(ghost ? '#6affc8' : '#ff9a40', ghost ? 7 : 9, 11, 1.4);
      pl.position.set(0.55, h - 0.5, 0);
      grp.add(pl);
    }
    grp.rotation.y = rand() * 6;
    scene.add(grp);
    lamps.push({ flameMat, halo, pl, ghost, base: pl ? pl.intensity : 0, phase: rand() * 6 });
  };
  lamp(-63.5, -25, false, true);
  lamp(-52, -35.5, false, false);
  lamp(-20.5, -33.8, true, true);
  lamp(-33, -31.8, false, false);
  lamp(-3, -35.5, true, false);
  for (const s of [-1, 1]) lamp(GATE_X - 0.9, ARENA.z + s * 5.7, false, s > 0, 2.8);
  for (const [a, light] of [[1.75, true], [-2.3, true], [2.6, false], [-0.9, false]]) lamp(ARENA.x + Math.sin(a) * (ARENA.r + 1.2), ARENA.z + Math.cos(a) * (ARENA.r + 1.2), true, light, 3.2);

  // ---------- Poço, carro de boi tombado e cercas de varas ----------
  {
    const wx = -62.5;
    const wz = -35;
    scene.add(part(new THREE.CylinderGeometry(0.9, 1, 0.8, 16, 1, true), lambert('#c2b6a0', { side: THREE.DoubleSide }), { pos: [wx, 0.4, wz], line: 0 }));
    scene.add(part(new THREE.CircleGeometry(0.88, 16).rotateX(-Math.PI / 2), voidMat, { pos: [wx, 0.35, wz], line: 0 }));
    scene.add(part(GEO.torus, lambert('#d0c4ae'), { pos: [wx, 0.8, wz], rot: [Math.PI / 2, 0, 0], scale: [0.95, 0.95, 0.5], line: 0 }));
    for (const s of [-1, 1]) scene.add(part(GEO.box, darkWood, { pos: [wx + s * 0.95, 1.2, wz], scale: [0.12, 2.4, 0.12], line: 0 }));
    scene.add(part(GEO.cyl, darkWood, { pos: [wx, 2.25, wz], rot: [0, 0, Math.PI / 2], scale: [0.07, 2.1, 0.07], line: 0 }));
    scene.add(part(GEO.cyl, woodMat, { pos: [wx + 0.2, 1.6, wz], scale: [0.16, 0.26, 0.16], line: 0 }));
  }
  {
    const ox = -41;
    const oz = -37;
    const cart = new THREE.Group();
    cart.position.set(ox, 0, oz);
    cart.rotation.set(0, 0.6, 0.18);
    cart.add(part(GEO.box, woodMat, { pos: [0, 0.75, 0], scale: [1.6, 0.12, 2.8], line: 0 }));
    for (const s of [-1, 1]) cart.add(part(GEO.box, darkWood, { pos: [s * 0.8, 1.0, 0], scale: [0.08, 0.45, 2.8], line: 0 }));
    cart.add(part(GEO.box, darkWood, { pos: [0, 0.6, 2.2], rot: [0.25, 0, 0], scale: [0.14, 0.14, 2.4], line: 0 }));
    const wheel = (wx, wy, wz, ry, rz) => {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      wg.rotation.set(0, ry, rz);
      wg.add(part(GEO.torus, darkWood, { rot: [0, Math.PI / 2, 0], scale: [0.72, 0.72, 0.5], line: 0 }));
      for (let i = 0; i < 4; i++) wg.add(part(GEO.box, woodMat, { rot: [(i / 4) * Math.PI, 0, 0], scale: [0.06, 1.35, 0.1], line: 0 }));
      return wg;
    };
    cart.add(wheel(-0.9, 0.72, 0, 0, 0.1));
    scene.add(cart);
    scene.add(wheel(ox + 1.9, 0.08, oz + 0.8, 0.4, Math.PI / 2));
    busy.push([ox, oz, 2.4]);
  }
  const stakes = instanced(GEO.cyl, darkWood, 700, 0);
  const rails = instanced(GEO.box, darkWood, 200, 0);
  const fence = (a, b) => {
    const [ax, az] = a;
    const [bx, bz] = b;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.floor(len / 0.32);
    const rot = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i <= n; i++) {
      if (rand() < 0.08) continue;
      const t = i / n;
      const h = 0.9 + rand() * 0.5;
      stakes.add([ax + (bx - ax) * t, h / 2, az + (bz - az) * t], [(rand() - 0.5) * 0.15, 0, (rand() - 0.5) * 0.15], [0.045, h, 0.045], rand() < 0.5 ? '#ffffff' : '#c8b8a0');
    }
    for (const y of [0.4, 0.8]) rails.add([(ax + bx) / 2, y, (az + bz) / 2], [0, rot, (rand() - 0.5) * 0.05], [0.05, 0.05, len], '#ffffff');
  };
  // ao longo da estrada, do lado de fora
  for (let i = 1; i < SERTAO_PATH.length - 2; i++) {
    const [ax, az] = SERTAO_PATH[i];
    const [bx, bz] = SERTAO_PATH[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = (bz - az) / len;
    const nz = -(bx - ax) / len;
    for (const s of [-1, 1]) {
      const off = PATH_HW + 0.7;
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3 + 0.03;
        const t1 = t0 + 0.24;
        const p0 = [ax + (bx - ax) * t0 + nx * s * off, az + (bz - az) * t0 + nz * s * off];
        const p1 = [ax + (bx - ax) * t1 + nx * s * off, az + (bz - az) * t1 + nz * s * off];
        if (rand() < 0.45 || walkDist(...p0) < 0.3 || walkDist(...p1) < 0.3 || blocksView(...p0)) continue;
        fence(p0, p1);
      }
    }
  }
  stakes.done();
  rails.done();
  scene.add(stakes.mesh, rails.mesh);

  // ---------- Espalha a caatinga ----------
  for (let x = -74; x <= 72; x += 3) {
    for (let z = -78; z <= 14; z += 3) {
      const px2 = x + (rand() - 0.5) * 2.8;
      const pz = z + (rand() - 0.5) * 2.8;
      const d = walkDist(px2, pz);
      const r = rand();
      if (d < 0.5 || d > 26 || !free(px2, pz) || r < 0.22) continue;
      if (d < 2.6) {
        if (r < 0.5) xique(px2, pz, 0.8 + rand() * 0.5);
        else if (r < 0.8) shrub(px2, pz, 0.8 + rand() * 0.6);
        else rock(px2, pz, 0.3 + rand() * 0.4);
        continue;
      }
      if (blocksView(px2, pz)) {
        if (r < 0.4) xique(px2, pz, 1 + rand() * 0.5);
        else if (r < 0.75) shrub(px2, pz, 1 + rand() * 0.8);
        else rock(px2, pz, 0.4 + rand() * 0.6, 0.45);
        continue;
      }
      if (r < 0.5) deadTree(px2, pz, 1 + rand() * 0.8);
      else if (r < 0.72) mandacaru(px2, pz, 0.9 + rand() * 0.5);
      else if (r < 0.82) xique(px2, pz, 1.2 + rand() * 0.5);
      else if (r < 0.92) shrub(px2, pz, 1.3 + rand() * 0.6);
      else rock(px2, pz, 0.9 + rand() * 1.2, 0.35);   // lajedo
    }
  }
  // árvores secas gigantes ao lado do casarão (marco da fase)
  pick(deadTrees).add([ARENA.x - 17, 0, ARENA.z - 12], [0, 0.6, 0.04], 3.6, '#c4b8a8');
  pick(deadTrees).add([ARENA.x + 18, 0, ARENA.z - 14], [0, 2.1, -0.05], 3.0, '#b6aa9a');
  // capim seco, ossos e pedrinhas
  for (let i = 0; i < 5000; i++) {
    const x = -72 + rand() * 142;
    const z = -72 + rand() * 84;
    const d = walkDist(x, z);
    if (d > 12) continue;
    if (d < -0.2 && (d < -1.4 || Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 0.5 || rand() < 0.6)) continue;
    if (!free(x, z) && rand() < 0.7) continue;
    const r = rand();
    if (r < 0.8) dryGrass.add([x, 0, z], [0, rand() * 6, 0], 0.6 + rand() * 0.8, rand() < 0.5 ? '#ffffff' : '#e8d8b8');
    else if (r < 0.9 && d > -0.5) bone(x, z);
    else if (d > 0.4) rock(x, z, 0.15 + rand() * 0.2);
  }
  for (let i = 0; i < 40; i++) bone(YARD.x + (rand() - 0.5) * 9, YARD.z + (rand() - 0.5) * 9);
  for (const inst of [...deadTrees, ...deadShrubs, ...mandacarus, ...xiques, dryGrass, rocks, bones]) {
    inst.done();
    scene.add(inst.mesh);
  }

  // Crânios de boi em mourões pela estrada
  for (const [x, z] of [[-50, -34.5], [-36, -21.5], [-15, -37.5], [-4, -24.5], [12, -34.5]]) {
    if (walkDist(x, z) < 0.2) continue;
    scene.add(part(GEO.cyl, darkWood, { pos: [x, 0.7, z], scale: [0.08, 1.4, 0.08], line: 0 }));
    const sk = makeSkull(boneMat, voidMat);
    sk.position.set(x, 1.45, z + 0.08);
    sk.rotation.set(0.2, (rand() - 0.5) * 0.8, 0);
    scene.add(sk);
  }

  // ---------- Fogo-fátuo: luzinhas frias flutuando no cemitério e no terreiro ----------
  const wisps = [];
  const wispMat = new THREE.SpriteMaterial({ map: glowTex, color: '#7affd2', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const addWisp = (x, z) => {
    const s = new THREE.Sprite(wispMat);
    s.position.set(x, 0.8, z);
    s.scale.setScalar(0.45);
    s.userData = { x, z, ph: rand() * 6, sp: 0.4 + rand() * 0.6 };
    scene.add(s);
    wisps.push(s);
  };
  for (let i = 0; i < 12; i++) addWisp(YARD.x + (rand() - 0.5) * 11, YARD.z + (rand() - 0.5) * 11);
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    addWisp(ARENA.x + Math.sin(a) * (ARENA.r + 3 + rand() * 4), ARENA.z + Math.cos(a) * (ARENA.r + 3 + rand() * 4));
  }
  for (let i = 0; i < 8; i++) addWisp(-45 + rand() * 60, -48 + rand() * 36);

  // ---------- Cristais do Silêncio (somem quando a cor volta) ----------
  const crystals = [];
  const crysMat = toon('#c3c8d6', { emissive: '#6e6a9a', emissiveIntensity: 0.35 });
  for (let i = 0; i < 80; i++) {
    const x = -50 + rand() * 70;
    const z = -48 + rand() * 36;
    const d = walkDist(x, z);
    if (d < 0.5 || d > 5 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 18) continue;
    const s = 0.8 + rand() * 0.8;
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    for (let k = 0; k < 3; k++) {
      grp.add(part(GEO.oct, crysMat, { pos: [(k - 1) * 0.25 * s, 0.4 * s, (rand() - 0.5) * 0.3], rot: [(rand() - 0.5) * 0.6, rand(), (k - 1) * 0.4], scale: [0.16 * s, (0.6 + rand() * 0.5) * s, 0.16 * s], line: 0 }));
    }
    crystals.push(grp);
    scene.add(grp);
  }

  // ---------- Vestígio: um folheto de cordel sobre uma pedra, e a memória final ----------
  const makeMemory = (cordel) => {
    const grp = new THREE.Group();
    grp.add(part(GEO.cyl, lambert('#b8ad98', { map: paveTex }), { pos: [0, 0.3, 0], scale: [0.55, 0.6, 0.55], line: 0 }));
    grp.add(part(GEO.cyl, lambert('#a89c86', { map: paveTex }), { pos: [0, 0.65, 0], scale: [0.7, 0.12, 0.7], line: 0 }));
    const seed = cordel
      ? part(GEO.box, toon('#fff1c8', { emissive: '#ffcf6a', emissiveIntensity: 0.6 }), { pos: [0, 1.45, 0], scale: [0.36, 0.48, 0.05], line: 0.01 })
      : part(GEO.ico, toon('#ffe2a0', { emissive: '#ffb84a', emissiveIntensity: 0.6 }), { pos: [0, 1.45, 0], scale: [0.24, 0.34, 0.24], line: 0.01 });
    seed.material = seed.material.clone();
    grp.add(seed);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex, color: '#ffd27a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = 0.73;
    ring.scale.setScalar(1.8);
    grp.add(ring);
    const light = new THREE.PointLight('#ffc86a', 6, 7, 1.5);
    light.position.y = 1.5;
    grp.add(light);
    grp.userData = { seed, ring, light };
    return grp;
  };
  const vestigio = makeMemory(true);
  vestigio.position.copy(SERTAO_VESTIGIO);
  scene.add(vestigio);
  const finalMemory = makeMemory(false);
  finalMemory.position.set(ARENA.x, 0, ARENA.z - 3);
  finalMemory.visible = false;
  scene.add(finalMemory);

  // ---------- Barreira do terreiro: estacas que brotam do chão ----------
  const barrier = new THREE.Group();
  barrier.position.set(ARENA.x - ARENA.r - 0.3, -3.2, ARENA.z);
  barrier.rotation.y = -Math.PI / 2;   // fila de estacas de norte a sul, na entrada oeste
  const stakeMat = toon('#5e4a5e', { emissive: '#3a2060', emissiveIntensity: 0.45 });
  for (let i = 0; i < 16; i++) {
    const x = -4.5 + i * 0.6;
    const h = 1.3 + rand() * 0.5;
    barrier.add(part(GEO.cone, stakeMat, { pos: [x, h / 2, (rand() - 0.5) * 0.5], rot: [(rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3], scale: [0.16, h, 0.16], line: 0.01 }));
  }
  barrier.visible = false;
  scene.add(barrier);

  // ---------- Ondas de restauração ----------
  const waves = [
    { x: PLAZA.x, z: PLAZA.z - 1, r: 15, target: 15, speed: 0, glow: 0 },
    { x: SERTAO_VESTIGIO.x, z: SERTAO_VESTIGIO.z, r: 0, target: 0, speed: 14, glow: 0 },
    { x: ARENA.x, z: ARENA.z, r: 0, target: 0, speed: 22, glow: 0 },
    { x: 0, z: 0, r: 0, target: 0, speed: 0, glow: 0 },
  ];
  world.restoredAt = (x, z) => {
    let r = 0;
    for (const w of waves) if (w.r > 0) r = Math.max(r, Math.min(1, Math.max(0, (w.r - Math.hypot(x - w.x, z - w.z)) / 2.5)));
    return r;
  };

  // ---------- Minimapa ----------
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 512;
  mapCanvas.height = Math.round((512 * D) / W);
  {
    const m = mapCanvas.getContext('2d');
    const k = mapCanvas.width / W;
    m.fillStyle = '#4a2c24';
    m.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    m.strokeStyle = '#b88a5a';
    m.lineWidth = PATH_HW * 2 * k;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.beginPath();
    SERTAO_PATH.forEach(([x, z], i) => (i ? m.lineTo((x - X0) * k, (z - Z0) * k) : m.moveTo((x - X0) * k, (z - Z0) * k)));
    m.stroke();
    m.fillStyle = '#b88a5a';
    for (const c of [PLAZA, YARD]) {
      m.beginPath();
      m.arc((c.x - X0) * k, (c.z - Z0) * k, c.r * k, 0, Math.PI * 2);
      m.fill();
    }
    m.fillStyle = '#cfc2aa';
    m.beginPath();
    m.arc((ARENA.x - X0) * k, (ARENA.z - Z0) * k, ARENA.r * k, 0, Math.PI * 2);
    m.fill();
    m.fillStyle = '#e8e0d0';
    m.fillRect((ARENA.x - 12 - X0) * k, (CASARAO_Z - 3.5 - Z0) * k, 24 * k, 7 * k);
  }
  world.mapCanvas = mapCanvas;

  // ---------- API (a mesma do world.js) ----------
  world.walkable = (x, z) => {
    const pr = PLAYER.radius;
    if (world.arenaLocked) return Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r - pr;
    if (walkDist(x, z) > -pr) return false;
    if (!world.gateOpen && x > GATE_X - 0.7) return false;
    return true;
  };
  world.walkableEnemy = (x, z) => walkDist(x, z) < -0.5 && x < GATE_X - 1;
  world.spawn = SERTAO_SPAWN;
  world.gateTimer = 0;
  world.openGate = () => { world.gateOpen = true; world.gateTimer = 0.001; };
  world.vestigio = vestigio;
  world.vestigioPos = SERTAO_VESTIGIO;
  world.finalMemory = finalMemory;
  world.vestigioActive = false;
  world.freed = false;
  world.activateVestigio = () => {
    world.vestigioActive = true;
    waves[1].target = 22;
    waves[1].glow = 1;
  };
  // Mula vencida: a cor volta e amanhece
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
    for (const { leaf } of leaves) leaf.rotation.y = 0;
  };
  world.resetArena = () => {
    world.lockArena(false);
    world.freed = false;
    world.dawn = 0;
    barrier.position.y = -3.2;
    waves[2].r = 0;
    waves[2].target = 0;
    finalMemory.visible = false;
  };

  world.update = (dt, t) => {
    CORRUPTION.uTime.value = t;
    CORRUPTION.uSilent.value.set(0.52, 0.56, 0.78, 0.05);   // Silêncio frio de lua, sem clarear as sombras
    waves.forEach((w, i) => {
      if (w.r < w.target) w.r = Math.min(w.target, w.r + w.speed * dt);
      else if (w.r > w.target) w.r = w.target;
      if (w.r >= w.target && w.glow > 0) w.glow = Math.max(0, w.glow - dt * 0.8);
      CORRUPTION.uWaves.value[i].set(w.x, w.z, w.r, w.glow);
    });
    if (world.freed) world.dawn = Math.min(1, world.dawn + dt / 7);
    const day = world.dawn;
    mistUniforms.uAmount.value = 1 - day;
    for (const c of crystals) {
      const s = Math.max(0.001, 1 - world.restoredAt(c.position.x, c.position.z));
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
    // Candeeiros: tremulam; os frios esquentam onde a cor voltou e todos se apagam com o dia
    for (const l of lamps) {
      const flick = 0.85 + 0.15 * Math.sin(t * 9 + l.phase) * Math.sin(t * 5.3 + l.phase * 2);
      const warm = l.ghost ? world.restoredAt(l.halo.parent.position.x, l.halo.parent.position.z) : 1;
      l.flameMat.color.set(warm > 0.5 ? '#ffbb55' : '#8affd6');
      l.halo.material.color.set(warm > 0.5 ? '#ffa040' : '#5affc8');
      l.halo.material.opacity = 0.8 * flick * (1 - day * 0.8);
      if (l.pl) {
        l.pl.color.set(warm > 0.5 ? '#ff9a40' : '#6affc8');
        l.pl.intensity = l.base * flick * (1 - day * 0.85);
      }
    }
    for (const s of wisps) {
      const u = s.userData;
      s.position.set(u.x + Math.sin(t * u.sp + u.ph) * 0.8, 0.7 + Math.sin(t * 1.7 + u.ph) * 0.35, u.z + Math.cos(t * u.sp * 0.8 + u.ph) * 0.8);
      const gone = world.restoredAt(u.x, u.z);
      s.material.opacity = 0.75;
      s.visible = gone < 0.5;
      s.scale.setScalar(0.4 + 0.12 * Math.sin(t * 4 + u.ph));
    }
    // Portão: as folhas abrem para dentro do terreiro
    if (world.gateOpen && world.gateTimer > 0) {
      world.gateTimer += dt;
      const k = Math.min(1, world.gateTimer / 1.6);
      const e = k * k * (3 - 2 * k);
      for (const { leaf, s } of leaves) leaf.rotation.y = -s * e * 1.75;
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
