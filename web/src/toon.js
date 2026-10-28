import * as THREE from 'three';

// Materiais: personagens com sombreamento cel suave (4 tons) e contorno fino; cenário com
// Lambert e texturas pintadas. A corrupção do Silêncio dessatura o que estiver marcado até ser
// desfeita por "ondas" de restauração em espaço de mundo.

export const INK = new THREE.Color('#2a1a12');

const gradientMap = (() => {
  const data = new Uint8Array([95, 150, 205, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

// Rampa suave para personagens com acabamento pintado (sombra contínua com leve ombro de cel)
const softGradient = (() => {
  const data = new Uint8Array([70, 92, 118, 150, 182, 210, 232, 246, 255, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
})();

// Até 4 ondas: (x, z, raio, brilho da borda)
export const CORRUPTION = {
  uWaves: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
  uTime: { value: 0 },
  uSilent: { value: new THREE.Vector4(0.56, 0.54, 0.72, 0.18) },   // tom do Silêncio (rgb) e piso de brilho (w); cada fase escolhe o seu
};

const VERT_HEAD = 'varying vec3 vCorrPos;\n';
const VERT_BODY = `
  vec4 cwp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cwp = instanceMatrix * cwp;
  #endif
  vCorrPos = (modelMatrix * cwp).xyz;
`;
const FRAG_HEAD = 'uniform vec4 uWaves[4];\nuniform float uTime;\nuniform vec4 uSilent;\nvarying vec3 vCorrPos;\n';
const FRAG_BODY = `
  float rest = 0.0;
  float edge = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    if (w.z > 0.0) {
      float d = length(vCorrPos.xz - w.xy);
      float wob = sin(atan(vCorrPos.z - w.y, vCorrPos.x - w.x) * 7.0 + uTime * 0.7) * 0.8;
      rest = max(rest, smoothstep(w.z + wob, w.z + wob - 2.5, d));
      edge = max(edge, (1.0 - smoothstep(0.0, 1.4, abs(d - w.z - wob))) * w.w);
    }
  }
  float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 silent = uSilent.rgb * (lum * 0.9 + uSilent.w);
  silent = mix(silent, gl_FragColor.rgb, 0.16);
  gl_FragColor.rgb = mix(silent, gl_FragColor.rgb, rest);
  gl_FragColor.rgb += vec3(1.0, 0.8, 0.35) * edge * 0.6;
`;

// Vento nos cartões de vegetação: balanço pela posição de cada instância, crescendo com a altura do cartão
const windCode = (amp) => `
  #ifdef USE_INSTANCING
    vec3 wBase = (modelMatrix * instanceMatrix[3]).xyz;
  #else
    vec3 wBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float wSway = sin(uTime * 1.9 + wBase.x * 0.42 + wBase.z * 0.31) + 0.45 * sin(uTime * 3.3 + wBase.z * 0.9 - wBase.x * 0.2);
  transformed.xz += vec2(1.0, 0.6) * wSway * ${amp.toFixed(3)} * position.y * position.y;
`;

// extra: { key, uniforms, fragHead, mapCode, normalCode, postCode, vertHead, vertCode, projCode } permite trocar a
// amostragem de cor e a normal (chão por camadas, água), somar efeitos depois da corrupção e mexer nos vértices
// antes (vertCode) ou depois da projeção (projCode, com mvPosition pronto: billboards)
export function injectCorruption(mat, extra = null, corrupt = true) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaves = CORRUPTION.uWaves;
    shader.uniforms.uTime = CORRUPTION.uTime;
    shader.uniforms.uSilent = CORRUPTION.uSilent;
    if (extra) Object.assign(shader.uniforms, extra.uniforms);
    let vert = VERT_HEAD + (extra?.vertHead || '') + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n' + (extra?.projCode || '') + VERT_BODY,
    );
    if (extra?.vertCode) vert = vert.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + extra.vertCode);
    shader.vertexShader = vert;
    let frag = FRAG_HEAD + (extra?.fragHead || '') + shader.fragmentShader;
    if (extra?.mapCode) frag = frag.replace('#include <map_fragment>', extra.mapCode);
    if (extra?.normalCode) frag = frag.replace('#include <normal_fragment_maps>', extra.normalCode);
    if (corrupt) frag = frag.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + FRAG_BODY + (extra?.postCode || ''));
    shader.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => 'corr' + (extra?.key || '') + corrupt;
}

const matCache = new Map();

export function toon(color, opts = {}) {
  const { corruptible = false, emissive = null, emissiveIntensity = 1, map = null, transparent = false, opacity = 1, side = THREE.FrontSide, cache = true, soft = false } = opts;
  const key = cache && !map ? `${color}|${corruptible}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}|${side}|${soft}` : null;
  if (key && matCache.has(key)) return matCache.get(key);
  const mat = new THREE.MeshToonMaterial({ color, gradientMap: soft ? softGradient : gradientMap, map, transparent, opacity, side });
  if (emissive) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = emissiveIntensity;
  }
  if (corruptible) injectCorruption(mat);
  if (key) matCache.set(key, mat);
  return mat;
}

// Cenário pintado: Lambert (sombra suave) com textura opcional; wind = amplitude do balanço (cartões)
export function lambert(color, opts = {}) {
  const { corruptible = true, emissive = null, emissiveIntensity = 1, map = null, normalMap = null, alphaTest = 0, side = THREE.FrontSide, transparent = false, wind = 0 } = opts;
  const mat = new THREE.MeshLambertMaterial({ color, map, normalMap, alphaTest, side, transparent });
  if (emissive) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = emissiveIntensity;
  }
  const extra = wind ? { key: 'wind' + wind, vertHead: 'uniform float uTime;\n', vertCode: windCode(wind) } : null;
  if (corruptible || wind) injectCorruption(mat, extra, corruptible);
  return mat;
}

export function basic(color, { corruptible = false, ...rest } = {}) {
  const mat = new THREE.MeshBasicMaterial({ color, ...rest });
  if (corruptible) injectCorruption(mat);
  return mat;
}

// Contorno por casco invertido, deslocado no espaço de visão para manter espessura estável.
const outlineCache = new Map();
function outlineMaterial(thickness, color) {
  const key = `${thickness}|${color}`;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uThick: { value: thickness }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float uThick;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 nrm = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          nrm = mat3(instanceMatrix) * nrm;
        #endif
        vec4 mv = modelViewMatrix * p;
        vec3 n = normalize(normalMatrix * nrm);
        mv.xyz += n * uThick * clamp(-mv.z * 0.06, 0.6, 2.2);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
  outlineCache.set(key, mat);
  return mat;
}

export function outline(mesh, thickness = 0.022, color = '#2a1a12') {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, color));
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.isOutline = true;
  mesh.add(o);
  return mesh;
}

// Malha instanciada com contorno compartilhando as mesmas matrizes
export function instanced(geo, mat, count, line = 0.02, lineColor = '#2a1a12') {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = 0;
  let ol = null;
  if (line) {
    ol = new THREE.InstancedMesh(geo, outlineMaterial(line, lineColor), count);
    ol.instanceMatrix = mesh.instanceMatrix;
    ol.count = 0;
    ol.frustumCulled = false;
    mesh.add(ol);
  }
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    mesh,
    add(pos, rot = [0, 0, 0], scale = [1, 1, 1], color = null) {
      if (mesh.count >= count) return -1;
      const i = mesh.count++;
      if (ol) ol.count = mesh.count;
      e.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ');
      q.setFromEuler(e);
      v.set(...pos);
      typeof scale === 'number' ? s.setScalar(scale) : s.set(...scale);
      m4.compose(v, q, s);
      mesh.setMatrixAt(i, m4);
      if (color) mesh.setColorAt(i, new THREE.Color(color));
      return i;
    },
    done() {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}

// Atalho para peças de personagem e cenário
export function part(geo, mat, { pos, rot, scale, line = 0.022, lineColor, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (line) outline(m, line, lineColor);
  return m;
}

export const GEO = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  capsule: new THREE.CapsuleGeometry(1, 1, 6, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 18),
  box: new THREE.BoxGeometry(1, 1, 1),
  ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  oct: new THREE.OctahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.22, 10, 28),
  dodec: new THREE.DodecahedronGeometry(1, 0),
};

// Cápsula com origem na ponta superior, útil para membros que giram a partir da articulação
export function limbGeo(radius, length, radiusEnd = radius) {
  const g = new THREE.CylinderGeometry(radius, radiusEnd, length, 16, 1);
  g.translate(0, -length / 2, 0);
  const capTop = new THREE.SphereGeometry(radius, 16, 10);
  const capBot = new THREE.SphereGeometry(radiusEnd, 16, 10);
  capBot.translate(0, -length, 0);
  return mergeSimple([g, capTop, capBot]);
}

// Fusão simples de geometrias não indexadas (evita importar BufferGeometryUtils só para isso)
export function mergeSimple(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const hasUv = parts.every((g) => g.attributes.uv);
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = hasUv ? new Float32Array(count * 2) : null;
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}
