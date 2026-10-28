import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import modelUrl from '../assets/maloka.glb?inline';
import { luniaMaterial, outlineFor } from './capoeirista-asset.js';
import { MALOKA } from './config.js';

// Maloka (DPS Stealth urbano, doc 24): modelo do pipeline Lunia a partir das referências do usuário
// (SourceArt/Maloka). A navalha e o frasco de veneno ficam em ossos próprios sob a mão direita
// (Navalha, Frasco) e cada clipe mostra ou esconde o adereço pela escala desse osso.
let source;
const LOOPS = new Set(['idle', 'run', 'victory']);
// Durações dos golpes vêm do config.js (os clipes do GLB foram gerados com os mesmos valores).
export const malokaDurations = { slash: MALOKA.navalha.dur, throw: MALOKA.veneno.dur, smoke: MALOKA.fumaca.dur,
  dodge: MALOKA.dodge.dur };
const OUTLINE = .0036;
const HIDDEN_OPACITY = .38;   // escondido na fumaça: o jogador ainda se vê, os inimigos não

export async function loadMalokaAsset(loader = new GLTFLoader()) {
  source = await loader.loadAsync(modelUrl);
}

export function buildSkinnedMaloka() {
  if (!source) throw new Error('Carregue o Maloka antes de criar o personagem.');
  const root = new THREE.Group();
  const model = clone(source.scene);
  root.add(model);
  const materials = [], bodies = [], outlines = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = luniaMaterial(map, !!o.geometry.attributes.color);
    o.castShadow = true; o.frustumCulled = false;
    materials.push(o.material); bodies.push(o);
  });
  bodies.forEach(o => { const line = outlineFor(o, OUTLINE); outlines.push(line); o.add(line); });
  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(source.animations.map(c => [c.name, c]));
  let current = null, action = null, veil = 0;
  const rig = {
    root, model, mixer, clips, skinned: true, height: 1.79,
    flash(amount) { materials.forEach(m => m.emissive.setRGB(amount * .65, amount * .55, amount * .4)); },
    // Posição de um osso no mundo (a mão do frasco, Frasco).
    muzzle(name, out = new THREE.Vector3()) { return model.getObjectByName(name).getWorldPosition(out); },
    // Escondido (0..1): corpo translúcido, sem contorno nem sombra.
    stealth(k) {
      if (Math.abs(k - veil) < 1e-3) return;
      const was = veil > 0; veil = k;
      materials.forEach(m => {
        m.transparent = k > 0; m.opacity = 1 - (1 - HIDDEN_OPACITY) * k; m.depthWrite = k < .5;
        if (was !== k > 0) m.needsUpdate = true;
      });
      outlines.forEach(l => { l.visible = k < .5; });
      bodies.forEach(o => { o.castShadow = k < .5; o.renderOrder = k > 0 ? 11 : 0; });   // depois da fumaça (9): ele se vê dentro dela
    },
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
    // pela velocidade, o resto pelo tempo; restart reinicia o clipe no mesmo estado (golpe seguido de golpe).
    play(state, dt, progress = 0, speed = 0, restart = false) {
      if (!clips.has(state)) state = 'idle';
      if (state !== playing || restart) { clock = 0; playing = state; }
      if (state in malokaDurations) clock = progress * malokaDurations[state];
      else clock += state === 'run' ? dt * Math.max(.15, speed / MALOKA.speed) : dt;
      rig.animate(state, clock);
    },
  };
  let playing = null, clock = 0;
  rig.animate('idle');
  return rig;
}
