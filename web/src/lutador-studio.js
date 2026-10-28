import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildSkinnedCapoeirista, actionDurations } from './capoeirista-asset.js';
import { buildSkinnedCurupira } from './curupira-asset.js';
import { buildSkinnedCangaceiro } from './cangaceiro-asset.js';
import { buildSkinnedVaqueiro } from './vaqueiro-asset.js';
import { buildSkinnedMaloka } from './maloka-asset.js';
import { buildSkinnedMula } from './mula-asset.js';

export function createLutadorStudio(renderer, input) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#203b36');
  scene.add(new THREE.HemisphereLight('#fff4dc','#526457',1.4));
  const key=new THREE.DirectionalLight('#fff4e4',2);key.position.set(-3,5,4);scene.add(key);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.1,80),new THREE.MeshLambertMaterial({color:'#597064'}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.97,2.0,80),new THREE.MeshBasicMaterial({color:'#b5a575',side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=-.012;scene.add(ring);
  const grid=new THREE.GridHelper(4,16,'#90a48e','#6b8073');grid.position.y=-.008;scene.add(grid);
  const hero=buildSkinnedCapoeirista(), boss=buildSkinnedCurupira(), canga=buildSkinnedCangaceiro(), vaq=buildSkinnedVaqueiro(), mal=buildSkinnedMaloka(), mula=buildSkinnedMula();
  let actor=hero;scene.add(hero.root,boss.root,canga.root,vaq.root,mal.root,mula.root);boss.root.visible=false;canga.root.visible=false;vaq.root.visible=false;mal.root.visible=false;mula.root.visible=false;
  // Chama da Mula por clipe: branca na investida, maior na Labareda, brasa adormecida, apagando na queda.
  const mulaFlame={chargeWarn:[1.3,1],gallop:[1.3,1],cast:[1.4,.5],dormant:[.35,0],dead:[.2,0]};
  const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.05,50);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.9,0);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=8;controls.enabled=false;
  const panel=document.createElement('section');panel.id='lutadorStudio';panel.hidden=true;
  panel.innerHTML=`<div class="studio-heading"><span>BAOBÁ / PERSONAGENS</span><h1>Capoeirista</h1><p>DPS Melee · mobilidade, esquivas rítmicas e chutes devastadores</p></div>
    <div class="studio-controls"><label>Personagem<select id="studioCharacter"><option value="hero">Capoeirista</option><option value="corrupted">Curupira corrompido</option><option value="freed">Curupira liberto</option><option value="cangaceiro">Cangaceiro</option><option value="vaqueiro">Peão</option><option value="maloka">Maloka</option><option value="mula">Mula sem Cabeça</option></select></label><label>Movimento<select id="studioClip"></select></label>
    <label>Velocidade<select id="studioSpeed"><option value="1">Normal</option><option value="0.25">Câmera lenta · ¼</option><option value="0.5">Câmera lenta · ½</option></select></label>
    <div class="studio-views"><button data-view="front">Frente</button><button data-view="three">¾</button><button data-view="back">Costas</button><button data-view="game">Câmera de jogo</button></div>
    <button id="studioPause">Pausar</button><label>Quadro<input id="studioTime" type="range" min="0" max="1" step="0.001" value="0"></label>
    <p class="studio-hint">Arraste para girar · roda para aproximar</p><button id="studioClose">Voltar ao jogo</button></div>`;
  document.body.append(panel);
  const labels={idle:'Ginga',combo0:'Martelo',run:'Corrida',combo1:'Ponteira',combo2:'Armada',rasteira:'Rasteira',meialua:'Meia-lua',dodge:'Esquiva',jump:'Pulo',hit:'Reação',dead:'Queda',victory:'Vitória',apose:'Pose de referência'};
  const select=panel.querySelector('#studioClip');
  Object.entries(labels).forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);});
  let state='idle',time=0,paused=false;
  const slider=panel.querySelector('#studioTime');
  const durations=actionDurations;
  const duration=()=>actor===hero?(durations[state]||actor.clips.get(state).duration):actor.clips.get(state).duration;
  function pose(){if(actor===mula)mula.setFlame(...(mulaFlame[state]||[1,0]));if(actor!==hero){actor.animate(state,time);return;}actor.animate(state,0,time/duration(),0);const action=actor.mixer.clipAction(actor.clips.get(state));action.time=time;actor.mixer.update(0);actor.root.updateMatrixWorld(true);}
  function view(name){
    const views={front:[0,1.35,4.8],three:[2.8,2.1,4.2],back:[0,1.4,-4.8],game:[0,12.6,10.6]};
    const scale=actor===hero?1:actor.height/1.8;
    camera.position.set(...views[name]).multiplyScalar(scale);controls.target.set(0,.9*scale,0);controls.maxDistance=8*scale;controls.update();
  }
  const api={active:false,scene,camera,open(){api.active=true;panel.hidden=false;document.getElementById('screens').style.visibility='hidden';document.getElementById('hud').style.visibility='hidden';controls.enabled=true;view('three');},close(){api.active=false;panel.hidden=true;document.getElementById('screens').style.visibility='';document.getElementById('hud').style.visibility='';controls.enabled=false;input.endFrame();},update(dt){if(!paused)time=(time+dt*Number(panel.querySelector('#studioSpeed').value))%duration();pose();if(actor===mula)mula.placeFire(dt);slider.value=time/duration();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();controls.update();input.endFrame();}};
  select.onchange=()=>{state=select.value;time=0;pose();};
  panel.querySelector('#studioCharacter').onchange=e=>{
    const choice=e.target.value;actor=choice==='hero'?hero:choice==='cangaceiro'?canga:choice==='vaqueiro'?vaq:choice==='maloka'?mal:choice==='mula'?mula:boss;
    hero.root.visible=actor===hero;boss.root.visible=actor===boss;canga.root.visible=actor===canga;vaq.root.visible=actor===vaq;mal.root.visible=actor===mal;mula.root.visible=actor===mula;boss.setFreed(choice==='freed');boss.vine.visible=false;
    const title=choice==='hero'?'Capoeirista':choice==='cangaceiro'?'Cangaceiro':choice==='vaqueiro'?'Peão':choice==='maloka'?'Maloka':choice==='mula'?'Mula sem Cabeça':choice==='freed'?'Curupira liberto':'Curupira corrompido';
    panel.querySelector('h1').textContent=title;
    panel.querySelector('.studio-heading p').textContent=choice==='hero'?'DPS Melee · mobilidade, esquivas rítmicas e chutes devastadores':choice==='cangaceiro'?'DPS Ranged · bacamarte, pistolas e peixeira':choice==='vaqueiro'?'Tanker · armadura de couro, laço e berrante':choice==='maloka'?'DPS Stealth · navalha, veneno e cortina de fumaça':choice==='mula'?'Chefe · fogo no lugar da cabeça · 3 m':choice==='freed'?'Protetor da Mata Viva · 2,1 m':'Guardião tomado pelo Silêncio · 3 m';
    const bossLabels={idle:'Repouso',walk:'Caminhada',sweepWarn:'Preparar varredura',sweepHit:'Impacto da varredura',rootsWarn:'Invocar raízes',rootsHit:'Impacto das raízes',cast:'Chamado do Silêncio',stagger:'Interrompido',recover:'Recuperação',freed:'Liberto',dormant:'Adormecido',awaken:'Despertar (cinemática)',release:'Libertação (cinemática)',rise:'Erguer-se (cinemática)',apose:'Pose de referência'};
    const cangaLabels={idle:'Descanso (bacamarte)',run:'Corrida',shoot:'Tiro de bacamarte',pistols:'Rajada de pistolas',throw:'Arremesso da peixeira',dodge:'Esquiva',jump:'Pulo',hit:'Reação',dead:'Queda',victory:'Vitória',apose:'Pose de referência'};
    const mulaLabels={idle:'Repouso',walk:'Passo',gallop:'Galope (investida)',kickWarn:'Preparar coice',kickHit:'Coice',chargeWarn:'Preparar investida',chargeEnd:'Frear',stompWarn:'Empinar',stompHit:'Pisada de fogo',cast:'Labareda',stagger:'Interrompida',recover:'Recuperação',dormant:'Adormecida',awaken:'Despertar (cinemática)',dead:'Queda',apose:'Pose de referência'};
    const malLabels={idle:'Descanso',run:'Corrida',slash:'Navalhada',throw:'Frasco de veneno',smoke:'Bomba de fumaça',dodge:'Esquiva',jump:'Pulo',hit:'Reação',dead:'Queda',victory:'Vitória',apose:'Pose de referência'};
    const vaqLabels={idle:'Descanso',run:'Corrida',attack:'Gancho',lasso:'Arremesso do laço',pull:'Puxada do laço',taunt:'Berrante',dodge:'Esquiva',jump:'Pulo',hit:'Reação',dead:'Queda',victory:'Vitória',apose:'Pose de referência'};
    select.replaceChildren();Object.entries(actor===hero?labels:actor===canga?cangaLabels:actor===vaq?vaqLabels:actor===mal?malLabels:actor===mula?mulaLabels:bossLabels).forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);});
    state='idle';time=0;pose();view('three');
  };
  panel.querySelector('#studioPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Reproduzir':'Pausar';};
  slider.oninput=()=>{paused=true;panel.querySelector('#studioPause').textContent='Reproduzir';time=Number(slider.value)*duration();pose();};
  panel.querySelector('#studioClose').onclick=()=>api.close();
  panel.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
  return api;
}
