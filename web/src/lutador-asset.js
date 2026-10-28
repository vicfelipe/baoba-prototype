import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import modelUrl from '../assets/lutador.glb?inline';

let source;
const actionDurations={combo0:.42,combo1:.42,combo2:.62,rasteira:.55,meialua:.75,dodge:.38};
export async function loadLutadorAsset(loader = new GLTFLoader()) {
  source = await loader.loadAsync(modelUrl);
}

export function buildSkinnedLutador() {
  if (!source) throw new Error('Lutador asset must be loaded before actor creation.');
  const root = new THREE.Group();
  const model = clone(source.scene);
  root.add(model);
  const materials = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    const src=o.material;
    const base=src.userData.paintBase || [1,1,1];
    o.material = new THREE.MeshToonMaterial({ color: new THREE.Color().setRGB(...base), vertexColors: true, map:src.map });
    if(src.map){
      o.material.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','');
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
          #ifdef USE_MAP
          vec4 painted=texture2D(map,vMapUv);
          float paper=step(0.47,painted.r)*step(0.46,painted.g)*step(0.30,painted.b);
          float paintWeight=1.0;
          #ifdef USE_COLOR_ALPHA
          paintWeight=vColor.a;
          #endif
          diffuseColor.rgb=mix(diffuseColor.rgb,painted.rgb,paintWeight*(1.0-paper));
          #endif`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',
          'outgoingLight = diffuseColor.rgb * 0.72 + min(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, diffuseColor.rgb * 1.2) * 0.28 + totalEmissiveRadiance;\n#include <opaque_fragment>');
      };
      o.material.customProgramCacheKey=()=> 'baoba-reference-paint-v1';
    }
    materials.push(o.material);
    // MeshToonMaterial supplies skinning for both the actor and its inverted hull.
    const outline = new THREE.SkinnedMesh(o.geometry, new THREE.MeshToonMaterial({color: '#30211c',side: THREE.BackSide}));
    outline.material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>',
        'transformed += normalize(objectNormal) * 0.0025;\n#include <project_vertex>');
    };
    outline.material.customProgramCacheKey = () => 'lutador-skinned-outline-v1';
    outline.bind(o.skeleton, o.bindMatrix);outline.frustumCulled=false;
    // Added after traversal to avoid traversing newly inserted meshes.
    o.userData.outline = outline;
  });
  const bodies=[];model.traverse(o=>{if(o.userData.outline)bodies.push(o);});
  bodies.forEach(o=>o.add(o.userData.outline));
  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(source.animations.map(c => [c.name, c]));
  let current = null, action = null, elapsed = 0;
  const rig = {
    root, model, mixer, skinned: true, clips,
    flash(amount) {materials.forEach(m=>{m.emissive.setRGB(amount*.65,amount*.55,amount*.4);});},
    animate(state, dt, progress = 0, speed = 0, restart = false) {
      if(!clips.has(state)) state='idle';
      const changed=current!==state || restart;
      if(changed){
        const previous=action;
        action=mixer.clipAction(clips.get(state));action.reset().setEffectiveWeight(1).play();
        const loop=['idle','run','victory'].includes(state);
        action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);action.clampWhenFinished=true;
        if(previous && previous!==action){previous.stop();}
        current=state;elapsed=0;
      }
      elapsed+=dt;
      const timed=['combo0','combo1','combo2','rasteira','meialua','dodge'].includes(state);
      if(timed) action.time=Math.min(clips.get(state).duration,progress*actionDurations[state]);
      else if(state==='run') action.time+=dt*Math.max(.15,speed/5.1);
      else if(state==='apose'||state==='jump')action.time=0;
      else action.time+=dt;
      if(['idle','run','victory'].includes(state))action.time%=clips.get(state).duration;
      else action.time=Math.min(action.time,clips.get(state).duration);
      // Gameplay owns the attack clock; no crossfade or low-pass delays contact.
      mixer.update(0);
      root.updateMatrixWorld(true);
    },
  };
  rig.animate('idle',0);
  return rig;
}
