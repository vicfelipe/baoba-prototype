import * as THREE from 'three';

// Esqueleto rígido simples: cada articulação é um Group; poses são rotações Euler por articulação.
// "pivot" carrega deslocamento e rotação do corpo inteiro (pulo, rolamento, queda).

export const JOINTS = ['pivot', 'hips', 'torso', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR'];

export function joint(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  g.userData.rest = g.position.clone();
  return g;
}

// Pose: { joint: [rx, ry, rz] }, mais pivot: { py, pz } opcionais (deslocamento)
export function blendPose(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = a[k] ?? b[k];
    const vb = b[k] ?? a[k];
    if (typeof va === 'number') out[k] = va + (vb - va) * t;
    else out[k] = va.map((v, i) => v + (vb[i] - v) * t);
  }
  return out;
}

const ease = (t) => t * t * (3 - 2 * t);

// Interpola uma lista de quadros-chave [{t, pose}] (t de 0 a 1)
export function keyed(frames, p) {
  if (p <= frames[0].t) return frames[0].pose;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (p <= b.t) return blendPose(a.pose, b.pose, ease((p - a.t) / (b.t - a.t)));
  }
  return frames[frames.length - 1].pose;
}

// Aplica a pose com suavização exponencial (rate alto = mais rígido)
export function applyPose(rig, pose, dt, rate = 18) {
  const k = rate >= 999 ? 1 : 1 - Math.exp(-rate * dt);
  for (const name of JOINTS) {
    const j = rig[name];
    if (!j) continue;
    const r = pose[name] || ZERO;
    if (name === 'pivot') {
      // Giros completos terminam em 0 sem "desenrolar" para trás
      for (const [ax, i] of [['x', 0], ['y', 1], ['z', 2]]) {
        while (j.rotation[ax] - r[i] > Math.PI) j.rotation[ax] -= Math.PI * 2;
        while (r[i] - j.rotation[ax] > Math.PI) j.rotation[ax] += Math.PI * 2;
      }
    }
    j.rotation.x += (r[0] - j.rotation.x) * k;
    j.rotation.y += (r[1] - j.rotation.y) * k;
    j.rotation.z += (r[2] - j.rotation.z) * k;
  }
  const rest = rig.pivot.userData.rest;
  // Poses foram escritas em unidades relativas; pyScale ajusta à altura do quadril de cada modelo
  const ps = rig.pyScale || 1;
  const py = rest.y + (pose.py ?? 0) * ps;
  const pz = rest.z + (pose.pz ?? 0) * ps;
  const px = rest.x + (pose.px ?? 0) * ps;
  rig.pivot.position.x += (px - rig.pivot.position.x) * k;
  rig.pivot.position.y += (py - rig.pivot.position.y) * k;
  rig.pivot.position.z += (pz - rig.pivot.position.z) * k;
}

const ZERO = [0, 0, 0];

// Pisca em branco ao receber dano (todos os materiais do personagem são clonados para isso)
export function makeFlashable(root) {
  const mats = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline && o.material && o.material.emissive) {
      const src = o.material;
      o.material = src.clone();
      o.material.onBeforeCompile = src.onBeforeCompile;
      o.material.customProgramCacheKey = src.customProgramCacheKey;
      if (o.material.userData.baseEmissive === undefined) {
        o.material.userData.baseEmissive = o.material.emissive.clone();
        o.material.userData.baseEI = o.material.emissiveIntensity;
      }
      mats.push(o.material);
    }
  });
  return (amount) => {
    for (const m of mats) {
      m.emissive.copy(m.userData.baseEmissive).lerp(WHITE, amount);
      m.emissiveIntensity = m.userData.baseEI + amount * 0.9;
    }
  };
}
const WHITE = new THREE.Color(1, 1, 1);
