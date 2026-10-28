import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import modelUrl from '../assets/cangaceiro.glb?inline';
import { luniaMaterial, outlineFor } from './capoeirista-asset.js';
import { CANGACEIRO } from './config.js';

// Cangaceiro (DPS Ranged, doc 21): modelo do pipeline Lunia a partir das referências do usuário
// (SourceArt/Cangaceiro). As armas ficam em ossos próprios sob as mãos e cada clipe mostra ou
// esconde a arma pela escala desse osso; a peixeira some no instante do arremesso.
let source;
const LOOPS = new Set(['idle', 'run', 'victory']);
// Durações dos golpes vêm do config.js (os clipes do GLB foram gerados com os mesmos valores).
export const cangaceiroDurations = { shoot: CANGACEIRO.bacamarte.dur, pistols: CANGACEIRO.pistolas.dur,
  throw: CANGACEIRO.peixeira.dur, dodge: CANGACEIRO.dodge.dur };
export const MUZZLES = ['Muzzle_Bacamarte', 'Muzzle_Pistol_R', 'Muzzle_Pistol_L', 'Muzzle_Peixeira'];
const OUTLINE = .0036;

export async function loadCangaceiroAsset(loader = new GLTFLoader()) {
  source = await loader.loadAsync(modelUrl);
}

export function buildSkinnedCangaceiro() {
  if (!source) throw new Error('Carregue o Cangaceiro antes de criar o personagem.');
  const root = new THREE.Group();
  const model = clone(source.scene);
  root.add(model);
  const materials = [], bodies = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = luniaMaterial(map, !!o.geometry.attributes.color);
    o.castShadow = true; o.frustumCulled = false;
    materials.push(o.material); bodies.push(o);
  });
  bodies.forEach(o => o.add(outlineFor(o, OUTLINE)));
  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(source.animations.map(c => [c.name, c]));
  let current = null, action = null;
  const rig = {
    root, model, mixer, clips, skinned: true, height: 1.89,
    flash(amount) { materials.forEach(m => m.emissive.setRGB(amount * .65, amount * .55, amount * .4)); },
    // Posição da boca do cano (ou da ponta da peixeira) no mundo, para o disparo do projétil.
    muzzle(name, out = new THREE.Vector3()) { return model.getObjectByName(name).getWorldPosition(out); },
    // time = segundos desde o início do clipe; loops dão a volta, golpes param no último quadro.
    animate(state, time = 0) {
      if (!clips.has(state)) state = 'idle';
      if (current !== state) {
        if (action) action.stop();
        action = mixer.clipAction(clips.get(state)).reset().play();
        action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; current = state;
      }
      const duration = clips.get(state).duration;
      action.time = LOOPS.has(state) ? time % duration : Math.min(time, duration);
      mixer.update(0); root.updateMatrixWorld(true);
    },
    // Relógio do jogo (Player): golpes e esquiva tocam por progresso × duração do config.js, a corrida
    // pela velocidade, o resto pelo tempo; restart reinicia o clipe no mesmo estado (tiro seguido de tiro).
    play(state, dt, progress = 0, speed = 0, restart = false) {
      if (!clips.has(state)) state = 'idle';
      if (state !== playing || restart) { clock = 0; playing = state; }
      if (state in cangaceiroDurations) clock = progress * cangaceiroDurations[state];
      else clock += state === 'run' ? dt * Math.max(.15, speed / CANGACEIRO.speed) : dt;
      rig.animate(state, clock);
    },
  };
  let playing = null, clock = 0;
  rig.animate('idle');
  return rig;
}
