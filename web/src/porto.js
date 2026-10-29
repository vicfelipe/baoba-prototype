import * as THREE from 'three';
import { toon, lambert, part, GEO, instanced, CORRUPTION, injectCorruption } from './toon.js';
import { paveTexture, barkTexture, runeTexture, noiseTexture, grassTexture, foliageTexture, palmFrondCard, makeCanvas, toTexture } from './textures.js';
import { glowTexture } from './textures-sertao.js';
import { sandTexture, plankTexture, corrugatedTexture } from './textures-porto.js';
import { WORLD, PLAYER } from './config.js';
import { rng, BOUNDS, lumpySphere, trunkGeometry, frondGeometry } from './world.js';

// Porto de Santos (fase 3, doc 25): dia de ressaca, céu cinza-chumbo, garoa e vento. O cais do porto (calçada de
// paralelepípedo, trilhos, cabeços, navio atracado, contêineres, guindastes e armazéns), um canal com ponte, o
// calçadão com o jardim da orla, a praia e, no fim dela, o trapiche velho que leva ao deque circular no meio do
// mar, onde lutam a Iara e o Ipupiara. A fase corre da direita para a esquerda da tela (leste → oeste; pedido do
// usuário, 28/10/2026). O mar fica ao norte (alto da tela, à vista o caminho todo) e a outra margem da baía no
// horizonte; ao sul, entre o caminho e a câmera, só coisas baixas (jardim, bancos, trilhos). Vencida a dupla, a
// ressaca acalma e o sol do fim de tarde abre (world.dawn, interpolado em main.js como no Sertão).

export const PORTO_PATH = [[60, -30], [50, -30], [40, -30.5], [30, -30], [20, -30], [10, -30.5], [0, -30], [-8, -30], [-14, -30]];
const PATH_HW = 3.3;
const PLAZA = { x: 57, z: -29, r: 7 };
const QUAY = { x0: 30, x1: 64, z0: -33.4, z1: -26 };      // calçada do cais até a beira do muro (norte)
const YARD = { x: 3, z: -34, r: 2.9 };                     // praia: onde a garrafa encalhou, perto da água
const ARENA = { x: -44, z: -30, r: WORLD.arenaRadius };    // deque do trapiche
const PIER = { x0: -33, x1: -14, z: -30, hw: 1.7 };
const GATE_X = -19.5;                                      // corrente na entrada do trapiche
const BREAK_X = -26.5;                                     // o trapiche desaba entre aqui e o deque
const SEA_Y = -0.32;
const QUAY_Z = -33.8;                                      // muro do cais (x ≥ CANAL.x + CANAL.hw)
const SHORE_Z = -37.4;                                     // linha d'água da praia
const LAND_END = -22.5;                                    // Ponta da Praia: a terra acaba aqui
const CANAL = { x: 26, hw: 2 };
export const PORTO_VESTIGIO = new THREE.Vector3(3.4, 0, -34.6);
export const PORTO_SPAWN = { trail: new THREE.Vector3(61, 0, -29), arena: new THREE.Vector3(GATE_X - 1.3, 0, PIER.z) };
// Afogados sobem do mar pela beira do cais; coral e craca ficam na praia
export const PORTO_ENEMIES = [
  { x: 47, z: -33, kind: 'afogado' },
  { x: 40, z: -33.1, kind: 'afogado' },
  { x: 34, z: -32.9, kind: 'afogado' },
  { x: 12, z: -30.5, kind: 'coral' },
  { x: -4, z: -29, kind: 'craca' },
];

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function pathDist(x, z) {
  let d = Infinity;
  for (let i = 0; i < PORTO_PATH.length - 1; i++) d = Math.min(d, segDist(x, z, ...PORTO_PATH[i], ...PORTO_PATH[i + 1]));
  return d;
}
const boxDist = (x, z, b) => Math.max(b.x0 - x, x - b.x1, b.z0 - z, z - b.z1);
const pierDist = (x, z) => Math.max(PIER.x0 - x, x - PIER.x1, Math.abs(z - PIER.z) - PIER.hw);
// Distância assinada à área caminhável (negativa dentro), sem o trapiche e o deque
function landWalk(x, z) {
  return Math.min(
    pathDist(x, z) - PATH_HW,
    Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r,
    boxDist(x, z, QUAY),
    Math.hypot(x - YARD.x, z - YARD.z) - YARD.r,
  );
}
function walkDist(x, z) {
  return Math.min(landWalk(x, z), pierDist(x, z), Math.hypot(x - ARENA.x, z - ARENA.z) - ARENA.r);
}
// Distância assinada à costa (positiva em terra, ao sul): muro reto do cais, praia, Ponta da Praia e o canal
function landD(x, z) {
  let d = x >= CANAL.x + CANAL.hw ? z - QUAY_Z : z - SHORE_Z;
  d = Math.min(d, x - LAND_END);
  return Math.min(d, Math.abs(x - CANAL.x) - CANAL.hw);
}
// Muros de pedra (cais e canal) descem a pique; a praia desce em rampa até o fundo
const hardEdge = (x) => x >= CANAL.x + CANAL.hw - 0.6 || Math.abs(x - CANAL.x) < CANAL.hw + 0.6;
function groundY(x, z) {
  const d = landD(x, z);
  if (hardEdge(x)) return d > 0 ? 0 : -2.2;
  if (d > 3) return 0;
  if (d > -4) {
    const k = (3 - d) / 7;
    return -1.05 * k * k * (3 - 2 * k);
  }
  return -1.05 - Math.min(1, (-4 - d) / 10) * 1.1;
}

export function buildPorto(parent) {
  const rand = rng(20261028);
  const scene = new THREE.Group();
  scene.name = 'porto';
  parent.add(scene);
  const world = { key: 'porto', root: scene, gateOpen: false, arenaLocked: false, dawn: 0, pierBroken: false };
  const { x0: X0, z0: Z0, w: W, d: D } = BOUNDS;

  // Atmosfera: ressaca de céu cinza-chumbo; vencida a dupla, abre o sol do fim de tarde (world.dawn)
  world.atmosphere = {
    night: { bg: '#7e8b96', fog: '#86929c', near: 26, far: 78, sky: '#c4d0da', ground: '#5c5a52', hemi: 1.3, sun: '#dfe6ee', sunI: 1.5 },
    day: { bg: '#f0c08c', fog: '#ecbc8e', near: 36, far: 92, sky: '#ffe6c4', ground: '#8a7254', hemi: 1.35, sun: '#ffcf8e', sunI: 2.8 },
  };
  world.ambient = { restored: 'sunmote', silent: 'spray' };

  // ---------- Máscaras ----------
  // tMask: R = calçada de pedra (cais, praça, calçadão e ponte), G = grama do jardim, B = variação de tom
  const mc = document.createElement('canvas');
  mc.width = 1024;
  mc.height = 1024;
  const g = mc.getContext('2d');
  const sx = mc.width / W;
  const sz = mc.height / D;
  const cx = (x) => (x - X0) * sx;
  const cz = (z) => (z - Z0) * sz;
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
  g.save();
  g.filter = 'blur(3px)';
  g.fillStyle = 'rgb(255,0,0)';
  g.fillRect(cx(CANAL.x - CANAL.hw), cz(QUAY_Z), (75 - CANAL.x + CANAL.hw) * sx, (30 - QUAY_Z) * sz);   // cais inteiro
  g.fillRect(cx(8), cz(-33.6), (CANAL.x - 8) * sx, 7.2 * sz);                                         // calçadão da orla
  g.restore();
  g.save();
  g.filter = 'blur(4px)';
  g.fillStyle = 'rgb(0,255,0)';
  g.fillRect(cx(8.5), cz(-26.3), (CANAL.x - CANAL.hw - 9) * sx, 26 * sz);                             // jardim da orla, ao sul
  g.restore();
  g.globalCompositeOperation = 'source-over';
  const maskTex = new THREE.CanvasTexture(mc);
  maskTex.flipY = false;

  // Costa: 0,5 na linha d'água, mais claro em terra (a água usa para a espuma da arrebentação)
  const cc = document.createElement('canvas');
  cc.width = 512;
  cc.height = Math.round((512 * D) / W);
  {
    const c2 = cc.getContext('2d');
    const img = c2.createImageData(cc.width, cc.height);
    for (let j = 0; j < cc.height; j++) {
      for (let i = 0; i < cc.width; i++) {
        const x = X0 + ((i + 0.5) / cc.width) * W;
        const z = Z0 + ((j + 0.5) / cc.height) * D;
        const v = Math.max(0, Math.min(1, 0.5 + landD(x, z) / 16));
        const o = (j * cc.width + i) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v * 255;
        img.data[o + 3] = 255;
      }
    }
    c2.putImageData(img, 0, 0);
  }
  const coastTex = new THREE.CanvasTexture(cc);
  coastTex.flipY = false;

  // ---------- Chão: areia, calçada de pedra e grama; a praia desce sob a água ----------
  const sandTex = sandTexture();
  const paveTex = paveTexture();
  const grassTex = grassTexture();
  const noiseTex = noiseTexture();
  const groundMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  injectCorruption(groundMat, {
    key: 'portoGround',
    uniforms: {
      tMask: { value: maskTex },
      tSand: { value: sandTex },
      tSandN: { value: sandTex.userData.nh },
      tPave: { value: paveTex },
      tPaveN: { value: paveTex.userData.nh },
      tGrass: { value: grassTex },
      tGrassN: { value: grassTex.userData.nh },
      tNoise: { value: noiseTex },
      uMaskOrigin: { value: new THREE.Vector2(X0, Z0) },
      uMaskSize: { value: new THREE.Vector2(W, D) },
    },
    fragHead: `
      uniform sampler2D tMask, tSand, tSandN, tPave, tPaveN, tGrass, tGrassN, tNoise;
      uniform vec2 uMaskOrigin, uMaskSize;
    `,
    mapCode: `
      vec2 wuv = vCorrPos.xz;
      vec4 nz = texture2D(tNoise, wuv * 0.021);
      vec4 nz2 = texture2D(tNoise, wuv * 0.11);
      vec4 msk = texture2D(tMask, (wuv + (nz2.ga - 0.5) * 0.8 - uMaskOrigin) / uMaskSize);
      vec2 suv = wuv / 5.0 + (nz.rg - 0.5) * 0.3;
      vec3 sc = texture2D(tSand, suv).rgb * mix(0.9, 1.06, nz.r);
      vec4 sn = texture2D(tSandN, suv);
      vec2 puv = wuv / 2.6;
      float pl = dot(texture2D(tPave, puv).rgb, vec3(0.33));
      vec3 pc = vec3(pl) * vec3(0.84, 0.84, 0.86) * (0.82 + 0.25 * nz2.b);        // paralelepípedo de granito
      vec4 pn = texture2D(tPaveN, puv);
      vec3 gc = texture2D(tGrass, wuv / 4.0).rgb * vec3(0.92, 1.0, 0.9);
      vec4 gn = texture2D(tGrassN, wuv / 4.0);
      float wP = smoothstep(0.35, 0.65, msk.r + (nz2.r - 0.5) * 0.15);
      float wG = smoothstep(0.3, 0.7, msk.g + (nz2.b - 0.5) * 0.4) * (1.0 - wP);
      float wS = max(0.0, 1.0 - wP - wG);
      vec3 col = sc * wS + pc * wP + gc * wG;
      vec4 nh = sn * wS + pn * wP + gn * wG;
      // areia molhada na beira da água e escura no fundo
      float wet = smoothstep(-0.06, -0.3, vCorrPos.y);
      col = mix(col, col * vec3(0.6, 0.58, 0.55), wet);
      col = mix(col, vec3(0.24, 0.32, 0.31), smoothstep(-0.4, -1.4, vCorrPos.y));
      // juntas escuras e molhadas no paralelepípedo
      col = mix(col, col * 0.55, wP * (1.0 - smoothstep(0.1, 0.4, pn.a)) * 0.6);
      col *= 0.84 + 0.3 * msk.b;
      diffuseColor.rgb *= col;
      vec3 tn = nh.rgb * 2.0 - 1.0;
      vec3 gWorldN = normalize(vec3(tn.x, tn.z, tn.y));
    `,
    normalCode: 'normal = normalize((viewMatrix * vec4(gWorldN, 0.0)).xyz);',
  });
  {
    const GX0 = -75, GX1 = 75, GZ0 = -100, GZ1 = 4;
    const geo = new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0, 300, 208).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (GX0 + GX1) / 2;
      const z = p.getZ(i) + (GZ0 + GZ1) / 2;
      p.setY(i, groundY(x, z));
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, groundMat);
    ground.position.set((GX0 + GX1) / 2, 0, (GZ0 + GZ1) / 2);
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // ---------- Mar de ressaca ----------
  // Ondulação no vértice (uSwell: alta na ressaca, baixa com o mar calmo), espuma nas cristas, linhas de
  // arrebentação andando até a costa (pela textura da costa), espuma em volta do deque e cintilação do sol
  // quando acalma (uCalm = world.dawn).
  const seaUniforms = {
    tNoise: { value: noiseTex },
    tCoast: { value: coastTex },
    uMaskOrigin: { value: new THREE.Vector2(X0, Z0) },
    uMaskSize: { value: new THREE.Vector2(W, D) },
    uSwell: { value: 0.22 },
    uCalm: { value: 0 },
    uArena: { value: new THREE.Vector3(ARENA.x, ARENA.z, ARENA.r) },
  };
  const seaMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  injectCorruption(seaMat, {
    key: 'portoSea',
    uniforms: seaUniforms,
    vertHead: 'uniform float uTime;\nuniform float uSwell;\nvarying float vSwell;\n',
    vertCode: `
      vec2 sw0 = (modelMatrix * vec4(transformed, 1.0)).xz;
      float sw = sin(sw0.x * 0.33 + uTime * 1.25) * 0.55 + sin(sw0.y * 0.52 - uTime * 1.7 + sw0.x * 0.21) * 0.45;
      transformed.y += sw * uSwell;
      vSwell = sw;
    `,
    fragHead: `
      uniform sampler2D tNoise, tCoast;
      uniform vec2 uMaskOrigin, uMaskSize;
      uniform float uCalm, uSwell;
      uniform vec3 uArena;
      varying float vSwell;
    `,
    mapCode: `
      vec2 wuv = vCorrPos.xz;
      float t = uTime;
      float coast = texture2D(tCoast, (wuv - uMaskOrigin) / uMaskSize).r;
      float n1 = texture2D(tNoise, wuv * 0.05 + vec2(t * 0.02, t * 0.03)).g;
      float n2 = texture2D(tNoise, wuv * 0.13 - vec2(t * 0.04, -t * 0.012)).b;
      float near = smoothstep(0.3, 0.5, coast);
      vec3 deepC = mix(vec3(0.16, 0.3, 0.34), vec3(0.1, 0.36, 0.5), uCalm);
      vec3 shallowC = mix(vec3(0.34, 0.46, 0.44), vec3(0.3, 0.64, 0.62), uCalm);
      vec3 col = mix(deepC, shallowC, clamp(near * 0.85 + (n1 - 0.5) * 0.25, 0.0, 1.0));
      float crest = smoothstep(0.62, 0.95, vSwell * 0.5 + 0.5 + (n2 - 0.5) * 0.45) * (1.0 - uCalm * 0.85);
      float lines = smoothstep(0.62, 0.86, sin(coast * 44.0 - t * 1.7) * 0.5 + 0.5) * smoothstep(0.36, 0.47, coast) * step(0.42, n1);
      float rim = smoothstep(0.462, 0.5, coast + (n2 - 0.5) * 0.03);
      float dd = abs(length(wuv - uArena.xy) - uArena.z - 0.2);
      float deckFoam = smoothstep(1.3, 0.0, dd + (n2 - 0.5) * 0.9) * (1.0 - uCalm * 0.5);
      float foam = max(max(crest * 0.65, lines * 0.85), max(rim, deckFoam * 0.75));
      col = mix(col, vec3(0.86, 0.92, 0.93), foam);
      diffuseColor.rgb = col;
      float spark = smoothstep(0.9, 0.97, texture2D(tNoise, wuv * 0.6 + vec2(t * 0.08, -t * 0.05)).b * texture2D(tNoise, wuv * 0.45 - vec2(t * 0.05, t * 0.07)).g * 1.8);
      totalEmissiveRadiance = col * 0.1 + vec3(1.0, 0.82, 0.55) * spark * (1.0 - foam) * uCalm * 1.3;
      vec3 gWorldN = normalize(vec3((n1 - 0.5) * 0.5 - cos(wuv.x * 0.33 + t * 1.25) * uSwell * 0.4, 1.0, (n2 - 0.5) * 0.5));
    `,
    normalCode: 'normal = normalize((viewMatrix * vec4(gWorldN, 0.0)).xyz);',
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 200, 160, 120).rotateX(-Math.PI / 2), seaMat);
  sea.position.set(0, SEA_Y, -40);
  sea.receiveShadow = true;
  scene.add(sea);

  // ---------- Materiais ----------
  const bark = barkTexture();
  const plankTex = plankTexture();
  const corrTex = corrugatedTexture();
  const woodMat = lambert('#a08a70', { map: bark });
  const darkWood = lambert('#5e4a3a', { map: bark });
  const stoneMat = lambert('#9a988e', { map: paveTex });
  const granite = lambert('#b4b2aa');
  const ironMat = lambert('#3e4248');
  const rustMat = lambert('#8a5a3a');
  const voidMat = new THREE.MeshBasicMaterial({ color: '#1a1c20' });
  const ropeMat = lambert('#c8b07a');
  const white = lambert('#e8e4da');
  const foliageTex = foliageTexture();
  const runeTex = runeTexture();
  const glowTex = glowTexture();

  // Nada alto entre a câmera (sul) e a área jogável
  const blocksView = (x, z) => {
    for (let k = 0; k <= 11; k += 1.25) if (walkDist(x, z - k) < 1.5) return true;
    return false;
  };
  const busy = [];
  const free = (x, z) => busy.every((b) => Math.hypot(x - b[0], z - b[1]) > b[2]);

  // ---------- Cais: muro de pedra ao norte, meio-fio, cabeços de amarração e trilhos ----------
  const QX0 = CANAL.x + CANAL.hw;
  scene.add(part(GEO.box, stoneMat, { pos: [(QX0 + 76) / 2, -1.1, QUAY_Z - 0.25], scale: [76 - QX0, 2.3, 0.5], line: 0 }));
  scene.add(part(GEO.box, granite, { pos: [(QX0 + 76) / 2, 0.06, QUAY_Z + 0.3], scale: [76 - QX0, 0.14, 0.6], line: 0 }));
  const bollards = instanced(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 12), ironMat, 40, 0.012);
  const bollardCaps = instanced(GEO.sphereLo, ironMat, 40, 0.012);
  const bollardXs = [];
  for (let x = QX0 + 4; x < 74; x += 7.5) {
    bollards.add([x, 0.3, QUAY_Z + 0.65]);
    bollardCaps.add([x, 0.62, QUAY_Z + 0.65], [0, 0, 0], [0.3, 0.12, 0.3]);
    bollardXs.push(x);
  }
  for (const b of [bollards, bollardCaps]) {
    b.done();
    scene.add(b.mesh);
  }
  // trilhos do porto embutidos na calçada, ao sul do caminho (baixos: não tapam a câmera)
  for (const z of [-24.9, -23.7]) scene.add(part(GEO.box, ironMat, { pos: [(QX0 + 76) / 2, 0.02, z], scale: [76 - QX0, 0.04, 0.1], line: 0, shadow: false }));
  for (let x = QX0 + 0.5; x < 75; x += 1.1) scene.add(part(GEO.box, darkWood, { pos: [x, 0.012, -24.3], scale: [0.25, 0.02, 1.8], line: 0, shadow: false }));

  // ---------- Navio atracado, terminal de contêineres na outra margem, guindastes e armazém ----------
  const signTex = (txt) => {
    const [c, g2] = makeCanvas(256, 64);
    g2.fillStyle = '#e8e0cc';
    g2.fillRect(0, 0, 256, 64);
    g2.fillStyle = '#3a4a5a';
    g2.font = 'bold 34px sans-serif';
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    g2.fillText(txt, 128, 34);
    return toTexture(c, false);
  };
  const contCols = ['#b8433a', '#3a6ea8', '#d89a3a', '#4a8a5a', '#8a8a92', '#c8c0b0', '#2e5a78', '#a85a2a'];
  const conts = instanced(GEO.box, lambert('#ffffff', { map: corrTex }), 160, 0.02);
  const cont = (x, y, z, rot = 0) => conts.add([x + (rand() - 0.5) * 0.2, y + 1.3, z], [0, rot + (rand() - 0.5) * 0.03, 0], [6.06, 2.59, 2.44], contCols[Math.floor(rand() * contCols.length)]);
  {
    // casco escuro ao longo do cais, contêineres no convés e a ponte de comando a leste
    const sx0 = 49, sz0 = QUAY_Z - 6.4, L = 34;
    const ship = new THREE.Group();
    ship.position.set(sx0, 0, sz0);
    ship.add(part(GEO.box, lambert('#34424e'), { pos: [0, 1.2, 0], scale: [L, 4.6, 9], line: 0.02 }));
    ship.add(part(GEO.box, lambert('#8a3a32'), { pos: [0, -0.7, 0], scale: [L + 0.1, 1.2, 9.1], line: 0 }));
    ship.add(part(GEO.box, white, { pos: [0, 3.45, 0], scale: [L + 0.1, 0.12, 9.1], line: 0 }));
    // proa afinando a oeste
    ship.add(part(new THREE.CylinderGeometry(4.5, 4.5, 4.6, 3, 1, false, Math.PI / 2, Math.PI), lambert('#34424e'), { pos: [-L / 2, 1.2, 0], scale: [0.9, 1, 1], rot: [0, Math.PI, 0], line: 0.02 }));
    ship.add(part(GEO.box, white, { pos: [L / 2 - 4, 7, 0], scale: [6, 7, 8], line: 0.02 }));
    ship.add(part(GEO.box, voidMat, { pos: [L / 2 - 4, 9.4, 4.02], scale: [5, 0.8, 0.04], line: 0 }));
    ship.add(part(GEO.cyl, lambert('#c84a32'), { pos: [L / 2 - 4, 11.8, -1], scale: [0.9, 2.6, 0.9], line: 0.015 }));
    scene.add(ship);
    for (let i = 0; i < 4; i++) for (let row = -1; row <= 1; row++) for (let h = 0; h < 1 + ((i + row + 3) % 3); h++) cont(sx0 - 12 + i * 6.6, 3.5 + h * 2.6, sz0 + row * 2.6);
    // cordas de amarração do cabeço ao costado
    for (const x of bollardXs.filter((v) => v > sx0 - L / 2 + 1 && v < sx0 + L / 2 - 1)) {
      const rope = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.55, QUAY_Z + 0.65), new THREE.Vector3(x + 0.6, 0.6, QUAY_Z - 0.9), new THREE.Vector3(x + 1.2, 2.6, sz0 + 4.5)]);
      scene.add(part(new THREE.TubeGeometry(rope, 12, 0.04, 5), ropeMat, { line: 0 }));
    }
  }
  // terminal na outra margem do canal do porto: plataforma, pilhas de contêineres e guindastes de pórtico
  scene.add(part(GEO.box, lambert('#8a8a84'), { pos: [52, -0.3, -62], scale: [52, 1.6, 16], line: 0 }));
  for (let i = 0; i < 7; i++) for (let row = 0; row < 3; row++) for (let h = 0; h < 1 + ((i * 2 + row) % 4); h++) cont(31 + i * 6.8, 0.5 + h * 2.6, -58 - row * 3);
  const crane = (x, z, col) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0.5, z);
    const m = lambert(col);
    for (const [lx, lz] of [[-3.5, -3], [3.5, -3], [-3.5, 3], [3.5, 3]]) grp.add(part(GEO.box, m, { pos: [lx, 8, lz], scale: [0.7, 16, 0.7], line: 0.02 }));
    for (const lz of [-3, 3]) grp.add(part(GEO.box, m, { pos: [0, 15.5, lz], scale: [8, 0.9, 0.9], line: 0.02 }));
    grp.add(part(GEO.box, m, { pos: [0, 4, 0], scale: [8, 0.6, 0.6], line: 0.02 }));
    grp.add(part(GEO.box, m, { pos: [0, 17, 8], scale: [1.4, 1.4, 30], line: 0.02 }));    // lança sobre o canal
    grp.add(part(GEO.box, lambert('#e8e2d4'), { pos: [0, 18.6, -1], scale: [3, 2.6, 3], line: 0.02 }));
    grp.add(part(GEO.cyl, ironMat, { pos: [0, 12, 16], scale: [0.04, 10, 0.04], line: 0 }));
    grp.add(part(GEO.box, lambert('#d8a03a'), { pos: [0, 6.8, 16], scale: [2.2, 0.4, 1.2], line: 0.01 }));
    scene.add(grp);
  };
  crane(36, -64, '#c84a32');
  crane(52, -64, '#d8a83a');
  crane(68, -64, '#c84a32');
  // armazém numerado e pilhas no canto leste do cais, além da praça
  {
    const grp = new THREE.Group();
    grp.position.set(71.5, 0, -25);
    grp.rotation.y = -Math.PI / 2;   // frente para o oeste, para quem chega
    const h = 7.5, d = 10, w = 14;
    const wall = lambert('#d8c8a8');
    grp.add(part(GEO.box, wall, { pos: [0, h / 2, 0], scale: [w, h, d], line: 0 }));
    grp.add(part(GEO.box, lambert('#8a5a44'), { pos: [0, 0.6, 0], scale: [w + 0.05, 1.2, d + 0.05], line: 0 }));
    for (let i = 0; i < 3; i++) {
      const px = (i - 1) * (w / 3.2);
      grp.add(part(GEO.box, voidMat, { pos: [px, 1.9, d / 2 + 0.02], scale: [3.2, 3.8, 0.04], line: 0 }));
      grp.add(part(GEO.box, lambert('#5a6a74', { map: corrTex }), { pos: [px + 1.1, 1.6, d / 2 + 0.06], scale: [1.4, 3.2, 0.05], line: 0 }));
      grp.add(part(new THREE.CircleGeometry(0.7, 12, 0, Math.PI), voidMat, { pos: [px, 5.6, d / 2 + 0.03], line: 0 }));
      grp.add(part(GEO.box, voidMat, { pos: [px, 5.1, d / 2 + 0.03], scale: [1.4, 1.0, 0.04], line: 0 }));
    }
    grp.add(part(new THREE.PlaneGeometry(4.4, 1.1), lambert('#ffffff', { map: signTex('ARMAZÉM 5') }), { pos: [0, h - 0.9, d / 2 + 0.05], line: 0 }));
    const roof = lambert('#7a7c80', { map: corrTex });
    for (const s of [-1, 1]) grp.add(part(GEO.box, roof, { pos: [0, h + 0.8, s * d / 4], rot: [s * 0.28, 0, 0], scale: [w + 0.6, 0.12, d / 2 + 0.6], line: 0 }));
    scene.add(grp);
  }
  for (const [x, z, n] of [[68.5, -31.6, 3], [68.5, -28.9, 2]]) for (let h = 0; h < n; h++) cont(x, h * 2.6, z);
  conts.done();
  scene.add(conts.mesh);

  // ---------- Canal com muros e ponte baixa ----------
  for (const s of [-1, 1]) scene.add(part(GEO.box, stoneMat, { pos: [CANAL.x + s * (CANAL.hw + 0.25), -1.05, (QUAY_Z + 8) / 2], scale: [0.5, 2.2, 8 - QUAY_Z], line: 0 }));
  {
    const bz0 = -33.6, bz1 = -26.4;
    scene.add(part(GEO.box, granite, { pos: [CANAL.x, -0.12, (bz0 + bz1) / 2], scale: [CANAL.hw * 2 + 1.6, 0.3, bz1 - bz0], line: 0 }));
    for (const z of [bz0 + 0.15, bz1 - 0.15]) {
      scene.add(part(GEO.box, white, { pos: [CANAL.x, 0.45, z], scale: [CANAL.hw * 2 + 1.6, 0.12, 0.18], line: 0.01 }));
      for (let i = 0; i < 6; i++) scene.add(part(GEO.box, white, { pos: [CANAL.x - CANAL.hw - 0.6 + i * 1.04, 0.2, z], scale: [0.14, 0.45, 0.14], line: 0.01 }));
    }
  }

  // ---------- Calçadão, jardim da orla (ao sul, baixo) e palmeiras (ao norte, na areia) ----------
  const trunks = instanced(trunkGeometry(), lambert('#ffffff', { map: bark, normalMap: bark.userData.nh }), 200, 0);
  const hedges = instanced(lumpySphere(4.1, 14), lambert('#ffffff', { map: foliageTex }), 300, 0.012);
  const flowers = instanced(GEO.sphereLo, lambert('#ffffff'), 400, 0);
  flowers.mesh.castShadow = false;
  const palmLeaves = instanced(frondGeometry(), lambert('#ffffff', { map: palmFrondCard(), alphaTest: 0.45, side: THREE.DoubleSide, wind: 0.18 }), 400, 0);
  const rocks = instanced(GEO.dodec, lambert('#ffffff'), 400, 0);
  const leafCols = ['#7aa86a', '#8ab878', '#6aa088', '#9ab870'];
  const flowerCols = ['#e86a8a', '#f2c84a', '#ffffff', '#c86ae8'];
  // palmeira que verga para o oeste com o vento da ressaca
  const palm = (x, z, s) => {
    const h = (5 + rand() * 1.5) * s;
    const lean = 0.08 + rand() * 0.1;
    trunks.add([x, 0, z], [0, 0, lean], [0.14 * s, h, 0.14 * s], '#d8ccb4');
    const col = rand() < 0.5 ? '#a8d084' : '#90c89c';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.6;
      palmLeaves.add([x - lean * h, h - 0.05 * s, z], [-0.1 - rand() * 0.3, a, 0, 'YXZ'], [0.95 * s, 1.3 * s, 2.4 * s], col);
    }
  };
  const hedge = (x, z, s) => hedges.add([x, 0.25 * s, z], [0, rand() * 6, 0], [0.75 * s, 0.42 * s, 0.75 * s], leafCols[Math.floor(rand() * leafCols.length)]);
  const rock = (x, z, s, flat = 0.6, col) => rocks.add([x, s * flat * 0.35 + groundY(x, z), z], [rand() * 3, rand() * 3, rand() * 3], [s, s * flat, s], col || (rand() < 0.5 ? '#8a8a84' : '#a09c92'));
  // canteiros baixos ao longo do calçadão, com flores
  for (let x = 9.2; x < CANAL.x - CANAL.hw - 0.8; x += 1.3) {
    if (Math.abs(x - 13) < 1.4 || Math.abs(x - 20) < 1.4) continue;
    hedge(x, -25.7 + (rand() - 0.5) * 0.3, 0.9 + rand() * 0.3);
    for (let k = 0; k < 3; k++) flowers.add([x + (rand() - 0.5), 0.45, -25.6 + (rand() - 0.5) * 0.6], [0, 0, 0], 0.07, flowerCols[Math.floor(rand() * 4)]);
  }
  for (const [x, z] of [[9.5, -35], [14, -35.4], [18.5, -34.8], [23, -35.2], [6, -36.2], [-10, -35.8], [-15, -35.4]]) palm(x, z, 1 + rand() * 0.2);
  // postes do calçadão e do cais, do lado do mar
  const lamps = [];
  const lamp = (x, z, light) => {
    scene.add(part(GEO.cyl, ironMat, { pos: [x, 2, z], scale: [0.07, 4, 0.07], line: 0.008 }));
    scene.add(part(GEO.box, ironMat, { pos: [x, 4, z + 0.35], scale: [0.08, 0.08, 0.8], line: 0.008 }));
    const bulb = part(GEO.sphereLo, toon('#fff2c8', { emissive: '#ffc86a', emissiveIntensity: 1.6, cache: false }), { pos: [x, 3.85, z + 0.7], scale: [0.16, 0.12, 0.16], line: 0 });
    scene.add(bulb);
    let pl = null;
    if (light) {
      pl = new THREE.PointLight('#ffc070', 7, 9, 1.6);
      pl.position.set(x, 3.6, z + 0.7);
      scene.add(pl);
    }
    lamps.push({ bulb, pl, base: 7 });
  };
  for (const [x, z, l] of [[53, -33.7, true], [37, -33.7, false], [16.5, -34.2, true], [6, -33.9, false]]) lamp(x, z, l);
  // bancos de frente para o mar, na beira sul do calçadão
  for (const x of [13, 20]) {
    scene.add(part(GEO.box, darkWood, { pos: [x, 0.45, -26], scale: [1.8, 0.08, 0.5], line: 0.01 }));
    scene.add(part(GEO.box, darkWood, { pos: [x, 0.75, -25.72], scale: [1.8, 0.4, 0.06], line: 0.01 }));
    for (const s of [-1, 1]) scene.add(part(GEO.box, ironMat, { pos: [x + s * 0.75, 0.22, -26], scale: [0.08, 0.44, 0.5], line: 0 }));
  }

  // ---------- Praia: canoa caiçara encalhada, varas de rede, troncos e pedras da ponta ----------
  {
    const canoa = new THREE.Group();
    canoa.position.set(-1.8, 0.02, -35.6);
    canoa.rotation.y = 1.25;
    const hull = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    canoa.add(part(hull, lambert('#8a5a3a', { side: THREE.DoubleSide, map: bark }), { pos: [0, 0.35, 0], scale: [0.55, 0.38, 2.6], line: 0.015 }));
    canoa.add(part(GEO.box, lambert('#3a6a8a'), { pos: [0, 0.36, 0], scale: [1.05, 0.06, 0.2], line: 0.008 }));
    canoa.add(part(GEO.box, darkWood, { pos: [0.9, 0.08, 0.6], rot: [0, 0.4, 0.05], scale: [0.08, 0.06, 2.1], line: 0.008 }));
    scene.add(canoa);
    busy.push([-1.8, -35.6, 3]);
  }
  for (const [x, z] of [[-7, -35.4], [-9.5, -35.9], [-12, -35.4]]) {
    scene.add(part(GEO.cyl, woodMat, { pos: [x, 1.1 + groundY(x, z), z], rot: [(rand() - 0.5) * 0.1, 0, (rand() - 0.5) * 0.1], scale: [0.06, 2.2, 0.06], line: 0.008 }));
  }
  {
    // rede de pesca estendida entre as varas
    const net = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4, 10, 3), new THREE.MeshLambertMaterial({ color: '#c8b890', wireframe: true }));
    net.position.set(-9.5, 1.3, -35.6);
    scene.add(net);
  }
  for (let i = 0; i < 9; i++) {
    const x = -12 + rand() * 30;
    const z = -34 - rand() * 3.4;
    if (walkDist(x, z) < 0.6 || !free(x, z)) continue;
    scene.add(part(GEO.cyl, lambert('#b8a68a', { map: bark }), { pos: [x, groundY(x, z) + 0.12, z], rot: [Math.PI / 2, rand() * 3, 0, 'YXZ'], scale: [0.12, 1 + rand() * 1.5, 0.12], line: 0.008 }));
  }
  // Ponta da Praia: pedras grandes ao norte da entrada do trapiche, pequenas ao sul (câmera)
  for (let i = 0; i < 70; i++) {
    const x = LAND_END - 3 + rand() * 10;
    const z = -42 + rand() * 24;
    if (walkDist(x, z) < 1.2) continue;
    const south = z > PIER.z;
    const s = south ? 0.4 + rand() * 0.5 : 1 + rand() * 2.2;
    if (south && blocksView(x, z) && s > 0.6) continue;
    rock(x, z, s, 0.6);
  }
  for (let i = 0; i < 40; i++) {
    const x = -12 + rand() * 40;
    const z = -40 + rand() * 6;
    if (walkDist(x, z) < 0.8 || !free(x, z)) continue;
    rock(x, z, 0.2 + rand() * 0.4, 0.5);
  }
  // posto de salvamento (guarda-vidas) na areia, perto da água
  {
    const px = -4.5, pz = -36.6;
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) scene.add(part(GEO.cyl, white, { pos: [px + lx, 1.3, pz + lz], scale: [0.08, 2.8, 0.08], line: 0.008 }));
    scene.add(part(GEO.box, lambert('#d84a3a'), { pos: [px, 3.3, pz], scale: [2.2, 1.4, 2.2], line: 0.012 }));
    scene.add(part(GEO.box, white, { pos: [px, 4.15, pz], scale: [2.5, 0.2, 2.5], line: 0.01 }));
    scene.add(part(GEO.cyl, white, { pos: [px + 1.4, 4.9, pz], scale: [0.04, 3, 0.04], line: 0 }));
    const flag = part(new THREE.PlaneGeometry(1, 0.6), lambert('#d83a2a', { side: THREE.DoubleSide }), { pos: [px + 0.9, 6.1, pz], line: 0 });
    scene.add(flag);
    world.flag = flag;
    busy.push([px, pz, 2]);
  }

  // ---------- A outra margem da baía no horizonte: morros e prédios na névoa ----------
  const hillMat = lambert('#6a8a70');
  for (const [x, z, s, h] of [[-50, -96, 22, 12], [-22, -100, 26, 16], [6, -98, 20, 10], [-70, -86, 16, 9]]) {
    scene.add(part(lumpySphere(Math.round(Math.abs(x)) + 7, 16), hillMat, { pos: [x, -2, z], scale: [s, h, s * 0.6], line: 0 }));
  }
  const winTex = (() => {
    const [c, g2] = makeCanvas(128);
    g2.fillStyle = '#ffffff';
    g2.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g2.fillStyle = (x + y) % 3 ? '#5a6878' : '#7a8898';
        g2.fillRect(x * 32 + 8, y * 32 + 9, 16, 14);
      }
    }
    return toTexture(c);
  })();
  for (const [x, z, w, h, col] of [[-36, -82, 9, 18, '#e8e0d4'], [-26, -84, 8, 24, '#dcd4c8'], [-16, -81, 10, 15, '#e4dcd0'], [-6, -85, 8, 28, '#e8e4dc'], [4, -82, 9, 20, '#d8d4cc'], [14, -84, 8, 16, '#e0d8cc']]) {
    const t = winTex.clone();
    t.needsUpdate = true;
    t.repeat.set(w / 4, h / 4);
    scene.add(part(GEO.box, lambert(col, { map: t }), { pos: [x, h / 2 - 1, z], scale: [w, h, 8], line: 0 }));
  }

  for (const inst of [trunks, hedges, flowers, palmLeaves, rocks]) {
    inst.done();
    scene.add(inst.mesh);
  }

  // ---------- Trapiche e deque ----------
  const deckTex = plankTex.clone();
  deckTex.needsUpdate = true;
  deckTex.repeat.set(6, 6);
  const deckMat = lambert('#ffffff', { map: deckTex });
  const pierTex = plankTex.clone();
  pierTex.needsUpdate = true;
  pierTex.repeat.set(0.125, 0.6);   // uma tábua da textura por prancha
  const pierMat = lambert('#ffffff', { map: pierTex });
  // deque: disco de tábuas, viga de borda e estacas com cordas
  {
    const deck = part(new THREE.CircleGeometry(ARENA.r, 64).rotateX(-Math.PI / 2), deckMat, { pos: [ARENA.x, 0.01, ARENA.z], line: 0 });
    deck.castShadow = false;
    scene.add(deck);
    scene.add(part(new THREE.CylinderGeometry(ARENA.r, ARENA.r, 0.5, 64, 1, true), darkWood, { pos: [ARENA.x, -0.24, ARENA.z], line: 0 }));
    const stilts = instanced(GEO.cyl, darkWood, 60, 0.015);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = ARENA.x + Math.sin(a) * (ARENA.r + 0.1);
      const z = ARENA.z + Math.cos(a) * (ARENA.r + 0.1);
      const tall = a < Math.PI * 0.45 || a > Math.PI * 1.55 ? 0.35 : 0.9;   // no sul, mais baixas (câmera)
      stilts.add([x, (tall - 2.6) / 2, z], [(rand() - 0.5) * 0.06, 0, (rand() - 0.5) * 0.06], [0.2, 2.6 + tall, 0.2]);
    }
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const r = 3 + rand() * 7;
      stilts.add([ARENA.x + Math.sin(a) * r, -1.2, ARENA.z + Math.cos(a) * r], [0, 0, 0], [0.24, 2.4, 0.24]);
    }
    stilts.done();
    scene.add(stilts.mesh);
    // corda velha entre os postes do lado norte (a do sul se perdeu na ressaca)
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      if (!(a0 > Math.PI * 0.6 && a1 < Math.PI * 1.4) || rand() < 0.3) continue;
      const p0 = new THREE.Vector3(ARENA.x + Math.sin(a0) * (ARENA.r + 0.1), 0.78, ARENA.z + Math.cos(a0) * (ARENA.r + 0.1));
      const p1 = new THREE.Vector3(ARENA.x + Math.sin(a1) * (ARENA.r + 0.1), 0.78, ARENA.z + Math.cos(a1) * (ARENA.r + 0.1));
      const mid = p0.clone().lerp(p1, 0.5).setY(0.55);
      scene.add(part(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 6, 0.03, 4), ropeMat, { line: 0 }));
    }
    // barril, rolos de corda e caixotes na borda
    for (const [a, r] of [[2.3, 10.6], [3.6, 10.4], [4.1, 10.9]]) {
      const x = ARENA.x + Math.sin(a) * r, z = ARENA.z + Math.cos(a) * r;
      scene.add(part(GEO.cyl, lambert('#7a5a3a', { map: bark }), { pos: [x, 0.45, z], scale: [0.35, 0.9, 0.35], line: 0.012 }));
    }
    scene.add(part(GEO.torus, ropeMat, { pos: [ARENA.x - 3, 0.1, ARENA.z - 10], rot: [Math.PI / 2, 0, 0], scale: 0.4, line: 0.01 }));
  }
  // píer: tábuas da praia até o deque; o trecho junto do deque (BREAK_X → deque) desaba no início da luta
  const pierPlanks = [];
  const breakGroup = new THREE.Group();
  scene.add(breakGroup);
  for (let x = PIER.x1 + 0.6; x > PIER.x0 + 0.2; x -= 0.52) {
    const plank = part(GEO.box, pierMat, { pos: [x, 0.0, PIER.z + (rand() - 0.5) * 0.08], rot: [0, (rand() - 0.5) * 0.05, 0], scale: [0.48, 0.1, PIER.hw * 2 + 0.3], line: 0 });
    if (x < BREAK_X && x > ARENA.x + ARENA.r - 0.6) {
      breakGroup.add(plank);
      plank.userData.home = plank.position.clone();
      plank.userData.spin = (rand() - 0.5) * 2;
      plank.userData.delay = (BREAK_X - x) * 0.04 + rand() * 0.15;
      pierPlanks.push(plank);
    } else scene.add(plank);
  }
  for (let x = PIER.x1; x > PIER.x0; x -= 2.6) {
    for (const s of [-1, 1]) {
      const tall = s < 0 ? 1.4 : 0.5;
      scene.add(part(GEO.cyl, darkWood, { pos: [x, (tall - 2.4) / 2, PIER.z + s * (PIER.hw + 0.05)], scale: [0.16, 2.4 + tall, 0.16], line: 0.012 }));
    }
  }
  for (let x = PIER.x1; x > PIER.x0 + 2.6; x -= 2.6) {
    const z = PIER.z - PIER.hw - 0.05;
    const p0 = new THREE.Vector3(x, 0.66, z), p1 = new THREE.Vector3(x - 2.6, 0.66, z);
    scene.add(part(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(p1, 0.5).setY(0.48), p1), 6, 0.03, 4), ropeMat, { line: 0 }));
  }

  // ---------- Portão: corrente com boias atravessada na entrada do trapiche ----------
  const gate = new THREE.Group();
  gate.position.set(GATE_X, 0, PIER.z);
  scene.add(gate);
  for (const s of [-1, 1]) {
    gate.add(part(GEO.cyl, lambert('#6a5a4a', { map: bark }), { pos: [0, 0.75, s * (PIER.hw + 0.25)], scale: [0.2, 1.5, 0.2], line: 0.015 }));
    gate.add(part(GEO.sphereLo, ironMat, { pos: [0, 1.52, s * (PIER.hw + 0.25)], scale: 0.14, line: 0.01 }));
  }
  const chain = new THREE.Group();
  gate.add(chain);
  {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 1.3, -PIER.hw - 0.25), new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(0, 1.3, PIER.hw + 0.25));
    for (let i = 0; i <= 18; i++) {
      const p = curve.getPoint(i / 18);
      chain.add(part(GEO.torus, ironMat, { pos: [p.x, p.y, p.z], rot: [0, i % 2 ? Math.PI / 2 : 0, 0], scale: [0.07, 0.07, 0.1], line: 0 }));
    }
    for (const t of [0.3, 0.5, 0.7]) {
      const p = curve.getPoint(t);
      chain.add(part(GEO.sphere, lambert(t === 0.5 ? '#e8e4da' : '#d8462a'), { pos: [p.x, p.y - 0.25, p.z], scale: 0.2, line: 0.01 }));
    }
    chain.add(part(new THREE.PlaneGeometry(1.1, 0.4), lambert('#ffffff', { map: signTex('TRAPICHE'), side: THREE.DoubleSide }), { pos: [0, 0.92, 0.01], rot: [0, Math.PI / 2, 0], line: 0 }));
  }

  // ---------- Garoa: riscos finos caindo inclinados com o vento (some com o céu limpo) ----------
  const rainUniforms = { uTime: CORRUPTION.uTime, uAmount: { value: 1 } };
  {
    const N = 5000;
    const pos = new Float32Array(N * 6);
    const off = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = -62 + rand() * 132, y = rand() * 9, z = -66 + rand() * 50;
      pos.set([x, y, z, x, y, z], i * 6);
      off[i * 2] = 0;
      off[i * 2 + 1] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: rainUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uTime; attribute float aOff; varying float vA;
        void main() {
          vec3 p = position;
          float y = mod(p.y - uTime * 9.0, 9.0);
          p.y = y - aOff * 0.45;
          p.x += -(9.0 - y) * 0.16 - aOff * 0.08;
          vA = 1.0 - aOff;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: 'uniform float uAmount; varying float vA; void main(){ gl_FragColor = vec4(0.82, 0.88, 0.94, (0.12 + vA * 0.25) * uAmount); }',
    });
    const rain = new THREE.LineSegments(geo, mat);
    rain.frustumCulled = false;
    rain.renderOrder = 3;
    scene.add(rain);
    world.rain = rain;
  }

  // ---------- Cristais do Silêncio (somem quando a cor volta) ----------
  const crystals = [];
  const crysMat = toon('#c3cad6', { emissive: '#5a6e9a', emissiveIntensity: 0.35 });
  for (let i = 0; i < 70; i++) {
    const x = -16 + rand() * 82;
    const z = -38 + rand() * 18;
    const d = landWalk(x, z);
    if (d < 0.6 || d > 5 || landD(x, z) < 0.5 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 16 || !free(x, z) || blocksView(x, z)) continue;
    const s = 0.7 + rand() * 0.7;
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    for (let k = 0; k < 3; k++) {
      grp.add(part(GEO.oct, crysMat, { pos: [(k - 1) * 0.25 * s, 0.4 * s, (rand() - 0.5) * 0.3], rot: [(rand() - 0.5) * 0.6, rand(), (k - 1) * 0.4], scale: [0.16 * s, (0.6 + rand() * 0.5) * s, 0.16 * s], line: 0 }));
    }
    crystals.push(grp);
    scene.add(grp);
  }

  // ---------- Vestígio: garrafa com uma carta antiga encalhada na areia; memória final ----------
  const makeMemory = (bottle) => {
    const grp = new THREE.Group();
    grp.add(part(GEO.dodec, lambert('#8a8a84'), { pos: [0, 0.25, 0], scale: [0.7, 0.45, 0.6], line: 0 }));
    grp.add(part(GEO.cyl, lambert('#9a8a70', { map: bark }), { pos: [0.1, 0.55, 0.05], rot: [Math.PI / 2, 0.8, 0, 'YXZ'], scale: [0.12, 1.4, 0.12], line: 0.008 }));
    let seed;
    if (bottle) {
      seed = new THREE.Group();
      const glass = toon('#bfe8d8', { emissive: '#7ad8b0', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
      seed.add(part(GEO.cyl, glass, { scale: [0.13, 0.36, 0.13], line: 0.008 }));
      seed.add(part(GEO.cyl, glass, { pos: [0, 0.25, 0], scale: [0.05, 0.16, 0.05], line: 0.006 }));
      seed.add(part(GEO.cyl, lambert('#8a6a4a'), { pos: [0, 0.35, 0], scale: [0.055, 0.05, 0.055], line: 0 }));
      const letter = part(GEO.cyl, toon('#fff1c8', { emissive: '#ffcf6a', emissiveIntensity: 0.6 }), { scale: [0.07, 0.26, 0.07], line: 0 });
      seed.add(letter);
      seed.userData.mat = letter.material;
      seed.rotation.z = 0.35;
      seed.position.y = 1.4;
    } else {
      seed = part(GEO.ico, toon('#ffe2a0', { emissive: '#ffb84a', emissiveIntensity: 0.6 }), { pos: [0, 1.45, 0], scale: [0.24, 0.34, 0.24], line: 0.01 });
      seed.material = seed.material.clone();
      seed.userData.mat = seed.material;
    }
    grp.add(seed);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: runeTex, color: '#ffd27a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.y = 0.08;
    ring.scale.setScalar(1.8);
    grp.add(ring);
    const light = new THREE.PointLight('#ffc86a', 6, 7, 1.5);
    light.position.y = 1.5;
    grp.add(light);
    grp.userData = { seed, ring, light };
    return grp;
  };
  const vestigio = makeMemory(true);
  vestigio.position.copy(PORTO_VESTIGIO);
  scene.add(vestigio);
  const finalMemory = makeMemory(false);
  finalMemory.position.set(ARENA.x, 0, ARENA.z - 3);
  finalMemory.visible = false;
  scene.add(finalMemory);

  // ---------- Ondas de restauração ----------
  const waves = [
    { x: PLAZA.x, z: PLAZA.z, r: 14, target: 14, speed: 0, glow: 0 },
    { x: PORTO_VESTIGIO.x, z: PORTO_VESTIGIO.z, r: 0, target: 0, speed: 14, glow: 0 },
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
    const img = m.createImageData(mapCanvas.width, mapCanvas.height);
    for (let j = 0; j < mapCanvas.height; j++) {
      for (let i = 0; i < mapCanvas.width; i++) {
        const x = X0 + (i + 0.5) / k, z = Z0 + (j + 0.5) / k;
        const land = landD(x, z) > 0;
        const o = (j * mapCanvas.width + i) * 4;
        const c = land ? [196, 176, 132] : [52, 92, 108];
        img.data.set([c[0], c[1], c[2], 255], o);
      }
    }
    m.putImageData(img, 0, 0);
    m.strokeStyle = '#e8e0c8';
    m.lineWidth = PATH_HW * 2 * k;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.beginPath();
    PORTO_PATH.forEach(([x, z], i) => (i ? m.lineTo((x - X0) * k, (z - Z0) * k) : m.moveTo((x - X0) * k, (z - Z0) * k)));
    m.stroke();
    m.fillStyle = '#9a9a92';
    m.fillRect((QUAY.x0 - X0) * k, (QUAY.z0 - Z0) * k, (QUAY.x1 - QUAY.x0) * k, (QUAY.z1 - QUAY.z0) * k);
    m.fillStyle = '#b08a5a';
    m.fillRect((PIER.x0 - X0) * k, (PIER.z - PIER.hw - Z0) * k, (PIER.x1 - PIER.x0) * k, PIER.hw * 2 * k);
    m.beginPath();
    m.arc((ARENA.x - X0) * k, (ARENA.z - Z0) * k, ARENA.r * k, 0, Math.PI * 2);
    m.fill();
  }
  world.mapCanvas = mapCanvas;

  // ---------- API (a mesma do world.js), mais o mar em volta do deque ----------
  world.walkable = (x, z) => {
    const pr = PLAYER.radius;
    if (world.arenaLocked) return Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r - pr;
    if (walkDist(x, z) > -pr) return false;
    if (!world.gateOpen && x < GATE_X + 0.7) return false;
    if (world.pierBroken && x < BREAK_X && Math.hypot(x - ARENA.x, z - ARENA.z) > ARENA.r - pr) return false;
    return true;
  };
  world.walkableEnemy = (x, z) => landWalk(x, z) < -0.5 && x > GATE_X + 1;
  // Fora do deque, na água em volta (só durante a luta): o herói cai no mar (player.fall)
  world.overboard = (x, z) => world.arenaLocked && Math.hypot(x - ARENA.x, z - ARENA.z) >= ARENA.r - PLAYER.radius;
  // A corrente devolve o herói à beirada mais próxima
  world.rescue = (x, z) => {
    const dx = x - ARENA.x, dz = z - ARENA.z, d = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(ARENA.x + (dx / d) * (ARENA.r - 1.3), 0, ARENA.z + (dz / d) * (ARENA.r - 1.3));
  };
  // Onde o herói boia depois de cair: na água, logo além da borda
  world.seaPoint = (x, z) => {
    const dx = x - ARENA.x, dz = z - ARENA.z, d = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(ARENA.x + (dx / d) * (ARENA.r + 1.4), 0, ARENA.z + (dz / d) * (ARENA.r + 1.4));
  };
  world.seaY = SEA_Y;
  world.spawn = PORTO_SPAWN;
  world.gateTimer = 0;
  world.openGate = () => { world.gateOpen = true; world.gateTimer = 0.001; };
  world.vestigio = vestigio;
  world.vestigioPos = PORTO_VESTIGIO;
  world.finalMemory = finalMemory;
  world.vestigioActive = false;
  world.freed = false;
  world.activateVestigio = () => {
    world.vestigioActive = true;
    waves[1].target = 22;
    waves[1].glow = 1;
  };
  // Dupla resolvida: a cor volta, a ressaca acalma e o céu abre
  world.restoreAll = () => {
    world.freed = true;
    waves[2].target = 130;
    waves[2].glow = 1;
  };
  // Início da luta: o trapiche desaba atrás do herói; o deque fica isolado no mar
  world.breakT = -1;
  world.lockArena = (on) => {
    world.arenaLocked = on;
    if (on && !world.pierBroken) {
      world.pierBroken = true;
      world.breakT = 0;
    }
  };
  const restorePier = () => {
    world.pierBroken = false;
    world.breakT = -1;
    for (const p of pierPlanks) {
      p.position.copy(p.userData.home);
      p.rotation.set(0, 0, 0);
      p.visible = true;
    }
  };
  world.resetTrail = () => {
    world.vestigioActive = false;
    waves[1].r = 0;
    waves[1].target = 0;
    world.gateOpen = false;
    world.gateTimer = 0;
    chain.position.set(0, 0, 0);
    chain.rotation.set(0, 0, 0);
    chain.visible = true;
  };
  world.resetArena = () => {
    world.arenaLocked = false;
    world.freed = false;
    world.dawn = 0;
    restorePier();
    waves[2].r = 0;
    waves[2].target = 0;
    finalMemory.visible = false;
  };

  world.update = (dt, t) => {
    CORRUPTION.uTime.value = t;
    CORRUPTION.uSilent.value.set(0.58, 0.62, 0.68, 0.14);   // Silêncio cinza-chumbo da ressaca
    waves.forEach((w, i) => {
      if (w.r < w.target) w.r = Math.min(w.target, w.r + w.speed * dt);
      else if (w.r > w.target) w.r = w.target;
      if (w.r >= w.target && w.glow > 0) w.glow = Math.max(0, w.glow - dt * 0.8);
      CORRUPTION.uWaves.value[i].set(w.x, w.z, w.r, w.glow);
    });
    if (world.freed) world.dawn = Math.min(1, world.dawn + dt / 7);
    const calm = world.dawn;
    seaUniforms.uCalm.value = calm;
    seaUniforms.uSwell.value = 0.22 - calm * 0.16;
    rainUniforms.uAmount.value = 1 - calm;
    world.rain.visible = calm < 0.99;
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
      seed.userData.mat.emissiveIntensity = lit ? 1.6 : 0.6 + Math.sin(t * 3) * 0.2;
      light.intensity = lit ? 14 : 5 + Math.sin(t * 3) * 1.5;
    }
    // postes acesos no dia escuro da ressaca; apagam com o sol
    for (const l of lamps) {
      l.bulb.material.emissiveIntensity = 1.6 * (1 - calm * 0.8);
      if (l.pl) l.pl.intensity = l.base * (1 - calm);
    }
    // bandeira do guarda-vidas tremula (vermelha: mar perigoso)
    world.flag.rotation.y = Math.sin(t * 6) * 0.25 * (1 - calm * 0.6);
    world.flag.material.color.set(calm > 0.5 ? '#e8c83a' : '#d83a2a');
    // portão: a corrente cai na água
    if (world.gateOpen && world.gateTimer > 0) {
      world.gateTimer += dt;
      const k = Math.min(1, world.gateTimer / 1.4);
      const e = k * k;
      chain.position.y = -1.6 * e;
      chain.rotation.x = 0.4 * e;
      chain.visible = k < 1;
    }
    // trapiche desabando: as tábuas caem em cascata a partir do deque e somem na água
    if (world.breakT >= 0) {
      world.breakT += dt;
      for (const p of pierPlanks) {
        const k = Math.max(0, world.breakT - p.userData.delay);
        p.position.y = p.userData.home.y - 4 * k * k;
        p.rotation.x = p.userData.spin * k;
        p.rotation.z = p.userData.spin * 0.5 * k;
        p.visible = p.position.y > SEA_Y - 0.6;
      }
      if (world.breakT > 2.5) world.breakT = -1;
    }
  };

  world.runeTex = runeTex;
  world.glowTex = glowTex;
  world.arena = ARENA;
  return world;
}
