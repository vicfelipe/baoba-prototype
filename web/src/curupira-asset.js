import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import corruptedUrl from '../assets/curupira-corrompido.glb?inline';
import freedUrl from '../assets/curupira.glb?inline';
import { luniaMaterial, outlineFor } from './capoeirista-asset.js';

const sources = {};
const loops = new Set(['idle', 'walk', 'cast', 'stagger', 'recover', 'freed', 'dormant']);
// Visual crossfade between states. Warning -> impact clips were authored as one take, so
// they cut with no fade and the impact pose shows on the impact frame.
const FADE = 0.18;
const continuous = new Set(['sweepWarn>sweepHit', 'rootsWarn>rootsHit']);
export async function loadCurupiraAssets(loader = new GLTFLoader()) {
  [sources.corrupted, sources.freed] = await Promise.all([loader.loadAsync(corruptedUrl), loader.loadAsync(freedUrl)]);
}

export function buildSkinnedCurupira() {
  if (!sources.corrupted || !sources.freed) throw new Error('Carregue as duas formas do Curupira antes de criar o chefe.');
  const root = new THREE.Group();
  const forms = {};
  for (const [name, source] of Object.entries(sources)) {
    const model = clone(source.scene), materials = [], bodies = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      const map = o.material.map;
      if (map) map.colorSpace = THREE.SRGBColorSpace;
      o.material = luniaMaterial(map, !!o.geometry.attributes.color);
      o.castShadow = true; o.frustumCulled = false;
      materials.push(o.material); bodies.push(o);
    });
    bodies.forEach(o => o.add(outlineFor(o, name === 'corrupted' ? .0057 : .004)));
    forms[name] = { model, materials, mixer: new THREE.AnimationMixer(model), clips: new Map(source.animations.map(c => [c.name, c])), current: null };
    root.add(model);
  }
  // Combat effect attached to the animated hand, separate from the character asset.
  const vine = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .065, 1, 7), new THREE.MeshToonMaterial({ color: '#40344c' }));
  stem.position.y = .5; vine.add(stem); vine.scale.y = .01;
  forms.corrupted.model.getObjectByName('R_Hand').add(vine);
  let form = 'corrupted';
  const rig = {
    root, forms, vine, skinned: true,
    get model() { return forms[form].model; },
    get clips() { return forms[form].clips; },
    get height() { return form === 'corrupted' ? 3 : 2.1; },
    get form() { return form; },
    setFreed(value) {
      form = value ? 'freed' : 'corrupted';
      forms.corrupted.model.visible = !value; forms.freed.model.visible = value;
      vine.visible = !value;
    },
    flash(amount) { Object.values(forms).forEach(f => f.materials.forEach(m => m.emissive.setRGB(.65 * amount, .5 * amount, .7 * amount))); },
    // dt (seconds since the last call) enables the crossfade; without it states cut (viewer, tests).
    animate(state, time = 0, dt) {
      const f = forms[form]; if (!f.clips.has(state)) state = 'idle';
      if (f.current !== state) {
        const prev = f.action;
        if (f.fadeOut) f.fadeOut.stop();
        f.fadeOut = dt !== undefined && prev && !continuous.has(`${f.current}>${state}`) ? prev : null;
        if (prev && !f.fadeOut) prev.stop();
        f.action = f.mixer.clipAction(f.clips.get(state)).reset().play();
        f.action.setLoop(THREE.LoopOnce, 1); f.action.clampWhenFinished = true; f.current = state; f.fade = 0;
      }
      const duration = f.clips.get(state).duration;
      f.action.time = loops.has(state) ? time % duration : Math.min(time, duration);
      if (f.fadeOut) {
        f.fade += dt || 0;
        const w = Math.min(1, f.fade / FADE);
        f.action.setEffectiveWeight(w); f.fadeOut.setEffectiveWeight(1 - w);
        if (w >= 1) { f.fadeOut.stop(); f.fadeOut = null; }
      } else f.action.setEffectiveWeight(1);
      f.mixer.update(0); root.updateMatrixWorld(true);
    },
  };
  rig.setFreed(false); rig.animate('idle');
  return rig;
}
