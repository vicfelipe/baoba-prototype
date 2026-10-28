import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import modelUrl from '../assets/capoeirista.glb?inline';
import { PLAYER } from './config.js';

// Capoeirista: modelo feito pelo usuário (SourceArt/CapoeiristaNovo, adotado por tools/charpipe/adopt.py)
// com esqueleto Lunia, clipes do pipeline (mesmos nomes e durações do combate, config.js) e
// material de banda + contorno. O modelo anterior do pipeline está em SourceArt/Capoeirista/export.

let source;
// Clip lengths come from the combat numbers (the GLB clips are authored to the same values).
export const actionDurations = { combo0: PLAYER.combo[0].dur, combo1: PLAYER.combo[1].dur, combo2: PLAYER.combo[2].dur,
  rasteira: PLAYER.rasteira.dur, meialua: PLAYER.meiaLua.dur, dodge: PLAYER.dodge.dur };
const LOOPS = ['idle', 'run', 'victory'];
const TIMED = Object.keys(actionDurations);
// Lunia "Cartoon": sombra = 62% da cor pintada; contorno cinza-escuro (#232323) ~0,35% da altura.
const BAND_SHADOW = 0.62;
const OUTLINE = 0.0034; // modelo do artista (SourceArt/CapoeiristaNovo): superfície com relevo pede traço mais fino

// Dois tons: só informa "lado iluminado" ao shader, independente da intensidade das luzes.
const litMask = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([0, 255]), 2, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  return tex;
})();

export async function loadCapoeiristaAsset(loader = new GLTFLoader()) {
  source = await loader.loadAsync(modelUrl);
}

export function luniaMaterial(map, banded) {
  // COLOR_0.g = light-band weight (0 on the hanging sash: a thin strip must not flip light/dark).
  const m = new THREE.MeshToonMaterial({ map, gradientMap: litMask });
  m.onBeforeCompile = shader => {
    if (banded) {
      shader.vertexShader = 'attribute vec4 color;\nvarying float vBand;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBand = color.g;');
      shader.fragmentShader = 'varying float vBand;\n' + shader.fragmentShader;
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float litAmount = dot(reflectedLight.directDiffuse, vec3(1.0));
      float band = litAmount > 1e-4 ? 1.0 : ${BAND_SHADOW.toFixed(2)};
      ${banded ? 'band = mix(1.0, band, vBand);' : ''}
      outgoingLight = diffuseColor.rgb * band + totalEmissiveRadiance;
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'capoeirista-lunia-band-v2' + banded;
  return m;
}

export function outlineFor(mesh, thickness = OUTLINE) {
  // COLOR_0 = Lunia "NoSilhouette" mask (0 on thin accessories and the hidden head base).
  const masked = !!mesh.geometry.attributes.color;
  const mat = new THREE.MeshBasicMaterial({ color: '#232323', side: THREE.BackSide });
  mat.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>',
      `transformed += normalize(objectNormal) * ${thickness.toFixed(4)}${masked ? ' * color.r' : ''};\n#include <project_vertex>`);
    if (masked) shader.vertexShader = 'attribute vec4 color;\n' + shader.vertexShader;
  };
  mat.customProgramCacheKey = () => 'capoeirista-outline-v2' + masked + thickness;
  const outline = new THREE.SkinnedMesh(mesh.geometry, mat);
  outline.bind(mesh.skeleton, mesh.bindMatrix); outline.frustumCulled = false;
  return outline;
}

export function buildSkinnedCapoeirista() {
  if (!source) throw new Error('Capoeirista asset must be loaded before actor creation.');
  const root = new THREE.Group();
  const model = clone(source.scene);
  root.add(model);
  const materials = [], bodies = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = luniaMaterial(map, !!o.geometry.attributes.color);
    materials.push(o.material); bodies.push(o);
  });
  // Added after traversal to avoid traversing newly inserted meshes.
  bodies.forEach(o => o.add(outlineFor(o)));
  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(source.animations.map(c => [c.name, c]));
  let current = null, action = null;
  const rig = {
    root, model, mixer, skinned: true, clips,
    flash(amount) { materials.forEach(m => { m.emissive.setRGB(amount * .65, amount * .55, amount * .4); }); },
    animate(state, dt, progress = 0, speed = 0, restart = false) {
      if (!clips.has(state)) state = 'idle';
      if (current !== state || restart) {
        const previous = action;
        action = mixer.clipAction(clips.get(state)); action.reset().setEffectiveWeight(1).play();
        const loop = LOOPS.includes(state);
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); action.clampWhenFinished = true;
        if (previous && previous !== action) previous.stop();
        current = state;
      }
      const clip = clips.get(state);
      if (TIMED.includes(state)) action.time = Math.min(clip.duration, progress * actionDurations[state]);
      else if (state === 'run') action.time += dt * Math.max(.15, speed / 5.1);
      else if (state === 'apose') action.time = 0;
      else action.time += dt;
      if (LOOPS.includes(state)) action.time %= clip.duration;
      else action.time = Math.min(action.time, clip.duration);
      // Gameplay owns the attack clock; no crossfade delays the contact pose.
      mixer.update(0);
      root.updateMatrixWorld(true);
    },
  };
  rig.animate('idle', 0);
  return rig;
}
