import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FireMesh } from '@wolffo/three-fire/vanilla';
import modelUrl from '../assets/mula.glb?inline';
import fireUrl from '../assets/three-fire/Fire.png?inline';
import { luniaMaterial, outlineFor } from './capoeirista-asset.js';

// Mula sem Cabeça (SourceArt/MulaSemCabeca): malha do TRELLIS pintada com a arte do usuário, esqueleto de
// quadrúpede e clipes de chefe de tools/charpipe/mula_rig.py (tempos de config.js MULA). O fogo do pescoço é o
// FireMesh do THREE.Fire (@wolffo/three-fire, GLSL, MIT): raymarching dentro de uma caixa que segue o osso
// Flame e fica sempre de pé (chama sobe). A chama pintada da malha (coroa do TRELLIS) é recolhida pelo osso Flame
// até virar a brasa do pescoço: a chama visível é a da biblioteca.

let source, fireTex;
const loops = new Set(['idle', 'walk', 'gallop', 'cast', 'stagger', 'recover', 'dormant']);
const FADE = 0.18;
const continuous = new Set(['kickWarn>kickHit', 'stompWarn>stompHit']);   // golpes autorados numa tomada só
const HEIGHT = 3;
// Fire.png já é laranja: a cor só clareia (normal) ou passa de 1 (branca, com bloom). Caixa estreita e alta.
const FIRE = { color: new THREE.Color(1, .86, .62), hot: new THREE.Color(1.5, 1.5, 1.5), size: new THREE.Vector3(.9, 1.9, .9) };
const EMBER = .42;   // escala da coroa pintada: brasa no pescoço

export async function loadMulaAsset(loader = new GLTFLoader()) {
  [source, fireTex] = await Promise.all([loader.loadAsync(modelUrl), new THREE.TextureLoader().loadAsync(fireUrl)]);
}

export function buildSkinnedMula() {
  if (!source) throw new Error('Carregue a Mula sem Cabeça antes de criar o chefe.');
  const root = new THREE.Group(), model = clone(source.scene), materials = [], bodies = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const map = o.material.map;
    if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = luniaMaterial(map, !!o.geometry.attributes.color);
    o.castShadow = true; o.frustumCulled = false;
    materials.push(o.material); bodies.push(o);
  });
  bodies.forEach(o => o.add(outlineFor(o, .0057)));
  root.add(model);
  const flameBone = model.getObjectByName('Flame');
  const fire = new FireMesh({ fireTex, color: FIRE.color.clone(), magnitude: 1.3, iterations: 32, octaves: 3, noiseScale: [1, 2, 1, 0.6] });
  fire.material.depthTest = true;   // a biblioteca desenha por cima de tudo; no jogo o herói pode passar na frente
  // Dois ajustes no fragment shader da biblioteca: a base da gota esmaece (a caixa tem fundo reto, e o teste de
  // profundidade só esconde a face, não o volume) e heat mistura até o branco (a Fire.png não tem azul).
  const fs = fire.material.fragmentShader;
  for (const k of ['return texture2D(fireTex, st);', 'col.rgb *= color;']) if (!fs.includes(k)) throw new Error('THREE.Fire: trecho do shader mudou: ' + k);
  fire.material.uniforms.heat = { value: 0 };
  fire.material.fragmentShader = `uniform float heat;
${fs}`
    .replace('return texture2D(fireTex, st);', 'return texture2D(fireTex, st) * smoothstep(0.0, 0.22, st.y);')
    .replace('col.rgb *= color;', 'col.rgb = mix(col.rgb * color, vec3(col.r + col.g) * 0.6 * color, heat);');
  fire.renderOrder = 6; fire.frustumCulled = false;
  root.add(fire);
  const clips = new Map(source.animations.map(c => [c.name, c]));
  const mixer = new THREE.AnimationMixer(model);
  const st = { current: null, action: null, fadeOut: null, fade: 0, clock: 0 };
  const flame = { scale: 1, heat: 0, target: { scale: 1, heat: 0 } };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();

  const rig = {
    root, model, clips, fire, flameBone, materials, skinned: true, height: HEIGHT,
    // scale: tamanho da chama (0 apagada, 1 normal); heat: 0 laranja, 1 branca (antes da investida)
    setFlame(scale, heat = 0) { flame.target.scale = scale; flame.target.heat = heat; },
    flash(amount) { materials.forEach(m => m.emissive.setRGB(.7 * amount, .42 * amount, .2 * amount)); },
    // Caixa do fogo: base dentro do pescoço (o corpo esconde o fundo reto da caixa), sempre de pé; dt suaviza tamanho e cor.
    placeFire(dt = 0) {
      const k = dt ? 1 - Math.exp(-dt * 5) : 1;
      flame.scale += (flame.target.scale - flame.scale) * k; flame.heat += (flame.target.heat - flame.heat) * k;
      flameBone.getWorldPosition(_a); _b.set(0, 1, 0).applyQuaternion(flameBone.getWorldQuaternion(new THREE.Quaternion()));
      _a.addScaledVector(_b, .12);
      fire.visible = flame.scale > .02;
      const s = Math.max(.02, flame.scale) * (1 + .25 * flame.heat);
      fire.scale.copy(FIRE.size).multiplyScalar(s);
      _a.y += fire.scale.y * .36;
      fire.position.copy(root.worldToLocal(_a));
      fire.fireColor = FIRE.color.clone().lerp(FIRE.hot, flame.heat);
      fire.material.uniforms.heat.value = flame.heat;
      fire.magnitude = 1.3 + .5 * flame.heat;
      st.clock += dt || 0;
      fire.update(st.clock);
    },
    // dt (segundos desde a última chamada) liga o crossfade; sem ele os estados cortam (visualizador, testes).
    animate(state, time = 0, dt) {
      if (!clips.has(state)) state = 'idle';
      if (st.current !== state) {
        const prev = st.action;
        if (st.fadeOut) st.fadeOut.stop();
        st.fadeOut = dt !== undefined && prev && !continuous.has(`${st.current}>${state}`) ? prev : null;
        if (prev && !st.fadeOut) prev.stop();
        st.action = mixer.clipAction(clips.get(state)).reset().play();
        st.action.setLoop(THREE.LoopOnce, 1); st.action.clampWhenFinished = true; st.current = state; st.fade = 0;
      }
      const duration = clips.get(state).duration;
      st.action.time = loops.has(state) ? time % duration : Math.min(time, duration);
      if (st.fadeOut) {
        st.fade += dt || 0;
        const w = Math.min(1, st.fade / FADE);
        st.action.setEffectiveWeight(w); st.fadeOut.setEffectiveWeight(1 - w);
        if (w >= 1) { st.fadeOut.stop(); st.fadeOut = null; }
      } else st.action.setEffectiveWeight(1);
      mixer.update(0);
      flameBone.scale.setScalar(EMBER * Math.min(1, .5 + .5 * flame.scale));   // a brasa diminui quando o fogo apaga
      root.updateMatrixWorld(true);
      rig.placeFire(dt);
    },
  };
  rig.animate('idle');
  return rig;
}
