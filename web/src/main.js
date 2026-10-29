import * as THREE from 'three';
import './style.css';
import { buildWorld, FRAG_SPAWNS } from './world.js';
import { buildSertao, SERTAO_ENEMIES, SERTAO_SPAWN } from './sertao.js';
import { buildPorto, PORTO_ENEMIES, PORTO_SPAWN } from './porto.js';
import { LEVELS } from './levels.js';
import { Player } from './player.js';
import { Fragmento } from './enemies.js';
import { Curupira } from './boss.js';
import { Mula } from './mula.js';
import { Duo } from './duo.js';
import { loadMulaAsset } from './mula-asset.js';
import { Telegraphs, setRuneTexture } from './telegraph.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createGradePass } from './grade.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { setupTouch, blocked, enterLandscape } from './touch.js';
import { buildLutador, lutadorPose } from './lutador.js';
import { buildSkinnedCurupira, loadCurupiraAssets } from './curupira-asset.js';
import { buildFragmento, animateFragmento } from './fragmento.js';
import { applyPose } from './rig.js';
import { WORLD, CINEMATIC, PLAYER } from './config.js';
import { loadCapoeiristaAsset } from './capoeirista-asset.js';
import { loadCangaceiroAsset, buildSkinnedCangaceiro } from './cangaceiro-asset.js';
import { loadVaqueiroAsset, buildSkinnedVaqueiro } from './vaqueiro-asset.js';
import { loadMalokaAsset, buildSkinnedMaloka } from './maloka-asset.js';
import { Projectiles } from './projectiles.js';
import { createLutadorStudio } from './lutador-studio.js';
import { Cinematic } from './cinematic.js';
import { encounterCinematic, liberationCinematic } from './boss-cinematics.js';

try {
  await Promise.all([loadCapoeiristaAsset(), loadCurupiraAssets(), loadCangaceiroAsset(), loadVaqueiroAsset(), loadMalokaAsset(), loadMulaAsset()]);
  document.getElementById('btnStart').disabled=false;
  document.getElementById('btnStart').innerHTML='Iniciar <small class="key-only">Enter</small>';
  document.getElementById('btnLutador').disabled=false;
} catch(error) {
  document.getElementById('btnStart').textContent='Falha ao carregar o personagem';
  document.querySelector('#title .note').textContent='Reabra o jogo. Se persistir, gere novamente a build com npm run build.';
  throw error;
}

// ---------- Renderização ----------
const canvas = document.getElementById('game');
// Celular e tablet: menos pixels, sombra e amostras para manter o quadro leve na GPU móvel.
const mobileGpu = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileGpu ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#86c4a8');
scene.fog = new THREE.Fog('#86c4a8', 32, 78);

// Câmera de ação (Tarisland/WoW): próxima e mais baixa, direção fixa; nos chefes recua e sobe a mira
// conforme a altura do chefe, para que gigantes e colossos dominem o quadro sem esconder os avisos no chão.
const CAM = {
  fov: 42,
  dist: 10.5, pitchDeg: 38, lookY: 1.4,          // exploração: herói ~22% da altura da tela
  // Chefes: enquadra pés do herói (acima das barras do rodapé) e topo do chefe (abaixo da borda);
  // recua só o necessário, a partir de baseDist. Pitch um pouco menor para o chefe se erguer.
  boss: { baseDist: 9, pitchDropDeg: 8, heroBottomNdc: -0.32, bossTopNdc: 0.86, maxDist: 60 },
  zoomMin: 0.65, zoomMax: 1.6,                   // roda do mouse; 1.6 ≈ a câmera alta antiga
};
const camera = new THREE.PerspectiveCamera(CAM.fov, window.innerWidth / window.innerHeight, 0.5, 260);
let zoom = 1;
const camTarget = new THREE.Vector3(0, CAM.lookY, 8);
const camRig = { dist: CAM.dist, pitch: CAM.pitchDeg, lookY: CAM.lookY };

const hemi = new THREE.HemisphereLight('#eaf6ff', '#5f7f45', 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d4', 2.7);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(mobileGpu ? 1024 : 2048);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-14, 26, 12);

// Céu, névoa e luz da fase; no Sertão vão da noite ao amanhecer (world.dawn) depois da Mula
const _ca = new THREE.Color(), _cb = new THREE.Color(), _cc = new THREE.Color();
function applyAtmosphere(k = 1) {
  const { night: A, day: B } = world.atmosphere, t = world.dawn;
  const lerp = (a, b) => a + (b - a) * t;
  const ease = (cur, a, b) => cur.lerp(_cc.copy(_ca.set(a)).lerp(_cb.set(b), t), k);
  ease(scene.background, A.bg, B.bg);
  ease(scene.fog.color, A.fog, B.fog);
  scene.fog.near += (lerp(A.near, B.near) - scene.fog.near) * k;
  scene.fog.far += (lerp(A.far, B.far) - scene.fog.far) * k;
  ease(hemi.color, A.sky, B.sky);
  ease(hemi.groundColor, A.ground, B.ground);
  hemi.intensity += (lerp(A.hemi, B.hemi) - hemi.intensity) * k;
  ease(sun.color, A.sun, B.sun);
  sun.intensity += (lerp(A.sunI, B.sunI) - sun.intensity) * k;
}

// Pós-processamento: bloom para runas, cogumelos, chamas e efeitos
const pr = renderer.getPixelRatio();
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth * pr, window.innerHeight * pr, { type: THREE.HalfFloatType, samples: mobileGpu ? 2 : 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.55, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// Filtro geral de aventura; fica mais tenso na luta contra o chefe e escoa a cor com pouca vida
const grade = createGradePass();
composer.addPass(grade);

// ---------- Sistemas ----------
const input = new Input(canvas);
setupTouch(input);
const studio=createLutadorStudio(renderer,input);
const audio = new Audio();
const hud = new HUD();
const fx = new FX(scene, camera, document.getElementById('fxLayer'));
const tg = new Telegraphs(scene);
// Fases (tela de título): cada mundo num grupo próprio; só o da fase escolhida fica visível e atualiza
const worlds = { mata: buildWorld(scene), sertao: buildSertao(scene), porto: buildPorto(scene) };
let world = worlds.mata;
setRuneTexture(world.runeTex);

const G = { scene, camera, world, fx, tg, audio, hud, input };
const log = (t, c) => hud.log(t, c);
G.player = new Player(G);
G.projectiles = new Projectiles(G);
// Inimigos comuns de cada fase, dentro do grupo do seu mundo
const ENEMIES = {
  mata: FRAG_SPAWNS.map(([x, z], i) => new Fragmento(G, x, z, i, 'silencio', worlds.mata.root)),
  sertao: SERTAO_ENEMIES.map((e, i) => new Fragmento(G, e.x, e.z, i, e.kind, worlds.sertao.root, [SERTAO_SPAWN.trail.x, SERTAO_SPAWN.trail.z])),
  porto: PORTO_ENEMIES.map((e, i) => new Fragmento(G, e.x, e.z, i, e.kind, worlds.porto.root, [PORTO_SPAWN.trail.x, PORTO_SPAWN.trail.z])),
};
G.fragments = ENEMIES.mata;
// Chefes: o Curupira (Mata Viva), a Mula sem Cabeça (Sertão Velho) e a dupla Iara e Ipupiara (Porto de
// Santos), cada um na arena da sua fase. Só o ativo aparece, atualiza e entra em G.enemies; a dupla entra
// pelas suas partes (dois alvos, duas barras).
G.bosses = { curupira: new Curupira(G), mula: new Mula(G), duo: new Duo(G) };
G.boss = G.bosses.curupira;
function selectBoss(key) {
  G.boss = G.bosses[key];
  for (const [k, b] of Object.entries(G.bosses)) b.rig.root.visible = k === key;
  if (key !== 'curupira') G.bosses.curupira.spikes.visible = false;
  document.getElementById('bossName').textContent = G.boss.name;
}
G.enemies = () => [...G.fragments, ...(G.boss.parts || [G.boss])];

let level = LEVELS.mata;
function selectLevel(key) {
  if (!LEVELS[key]) key = 'mata';
  level = G.level = LEVELS[key];
  for (const [k, w] of Object.entries(worlds)) w.root.visible = k === key;
  world = G.world = worlds[key];
  // os chefes leem o centro da arena em WORLD: cada fase tem o seu
  WORLD.arenaCenter.x = world.arena.x;
  WORLD.arenaCenter.z = world.arena.z;
  G.fragments = ENEMIES[key];
  selectBoss(level.boss);
  if (G.boss.card) G.boss.card.area = level.bossArea;
  // herói e chefe vão para o início e a arena desta fase (cada fase tem os seus)
  G.player.reset(world.spawn.trail);
  G.boss.reset();
  audio.ambientKind = level.ambientAudio;
  document.getElementById('titleName').textContent = level.title;
  document.getElementById('questName').textContent = level.title;
  document.getElementById('titleLead').textContent = level.lead;
  document.getElementById('memLabel').textContent = level.memLabel;
  document.querySelectorAll('.level-pick .level').forEach((b) => {
    const on = b.dataset.level === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  applyAtmosphere(1);
  try { localStorage.setItem('baoba.level', key); } catch {}
}
const cine = new Cinematic(document.body);

// Aura de runas sob o herói (marca do Lunia) e marcador do alvo
const flatQuad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 128;
{
  const gc = glowCanvas.getContext('2d');
  const gr = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  gc.fillStyle = gr;
  gc.fillRect(0, 0, 128, 128);
}
const glowTex = new THREE.CanvasTexture(glowCanvas);
const additive = (map, color, opacity) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const playerAura = new THREE.Group();
const auraRune = new THREE.Mesh(flatQuad, additive(world.runeTex, '#ffb35a', 0.9));
auraRune.scale.setScalar(1.6);
const auraGlow = new THREE.Mesh(flatQuad, additive(glowTex, '#ff7ab8', 0.55));
auraGlow.scale.setScalar(1.9);
playerAura.add(auraGlow, auraRune);
playerAura.renderOrder = 4;
scene.add(playerAura);
const targetRing = new THREE.Mesh(flatQuad, additive(world.runeTex, '#ff4a3a', 1));
targetRing.renderOrder = 4;
scene.add(targetRing);

// ---------- Estado da sessão ----------
let mode = 'title';
const prog = {};
let elapsed = 0;
let deathTimer = 0;
const hintsShown = new Set();

function resetProgress() {
  Object.assign(prog, { kills: 0, vestigio: false, gate: false, checkpoint: 'trail', fight: false, freed: false, memory: false, freedT: 0, defeated: false, defeatedT: 0, deaths: 0, time: 0 });
}
resetProgress();
G.prog = prog;

function once(key, text, dur = 5) {
  if (hintsShown.has(key)) return;
  hintsShown.add(key);
  hud.hint(text, dur);
}

function resetTrail() {
  G.player.reset(world.spawn.trail);
  G.fragments.forEach((f) => f.reset());
  world.resetTrail();
  prog.kills = 0;
  prog.vestigio = false;
  prog.gate = false;
}

function resetArena() {
  cine.stop();
  G.player.victory = false;
  G.player.reset(world.spawn.arena);
  G.boss.reset();
  world.resetArena();
  prog.fight = false;
  audio.setMusic('trail');
}

function clearTransient() {
  tg.clear();
  fx.clear();
  G.projectiles.clear();
  G.player.target = null;
}

function restartAll() {
  cine.stop();
  G.player.victory = false;
  clearTransient();
  resetProgress();
  world.resetArena();
  G.boss.reset();
  resetTrail();
  hintsShown.clear();
  audio.setMusic('trail');
  startPlay();
}

function retry() {
  clearTransient();
  if (prog.checkpoint === 'arena') resetArena();
  else resetTrail();
  mode = 'play';
  hud.screen(null);
  hud.banner(level.checkpoint[prog.checkpoint === 'arena' ? 'arena' : 'trail'], 'De volta ao checkpoint');
}

// Começa a fase escolhida (botão Iniciar); outra fase, ou a mesma depois de jogada, recomeça do zero
function startLevel(key) {
  if (key !== level.key || prog.time > 0) {
    selectLevel(key);
    restartAll();
  } else startPlay();
}

// Atalho dos testes: a fase já no checkpoint da arena (caminho limpo, portão aberto). startMula: Sertão
// Velho no terreiro; startDuo: Porto de Santos na entrada do trapiche.
function startMula(key = 'sertao') {
  selectLevel(key);
  restartAll();
  for (const f of G.fragments) {
    f.alive = false;
    f.state = 'dead';
    f.model.root.visible = false;
  }
  Object.assign(prog, { kills: G.fragments.length, vestigio: true, gate: true, checkpoint: 'arena' });
  world.activateVestigio();
  world.openGate();
  G.player.reset(world.spawn.arena);
}

function startPlay() {
  audio.init();
  hud.clearLog();
  log(level.enter, 'sys');
  log(level.lore || level.lead, 'lore');
  audio.setMusic(prog.fight ? 'boss' : prog.freed ? 'victory' : 'trail');
  mode = 'play';
  hud.screen(null);
  hud.show(true);
  hud.banner(level.name, level.lead, 3.5);
  setTimeout(() => once('move', G.player.kit.melee ? 'WASD para mover · Clique ou J para golpear' : 'WASD para mover · Clique ou J dispara o bacamarte', 6), 3200);
}

// ---------- Eventos de jogo ----------
G.onEnemyDefeated = () => {
  prog.kills = G.fragments.filter((f) => !f.alive).length;
  log(level.enemyKilled, 'good');
  const k = G.player.kit.slots;
  if (prog.kills === 1) once('skills', `Q ${k.rasteira} e E ${k.meialua} causam muito dano · Tab troca o alvo`, 6);
  checkGate();
};

G.onPlayerDeath = () => {
  prog.deaths++;
  deathTimer = 1.4;
  log('Você caiu.', 'bad');
  audio.play('defeat');
  tg.clear();
};

// Libertação: a cinemática conduz cor, música, forma do chefe e memória final.
G.onBossFreed = () => {
  prog.freed = true;
  prog.fight = false;
  prog.freedT = 0;
  tg.clear();
  G.player.victory = true;
  G.player.target = null;
  mode = 'cinematic';
  cine.play(liberationCinematic(G, cine, () => {
    G.player.victory = false;
    world.lockArena(false);
    G.boss.st = Math.max(G.boss.st, CINEMATIC.liberation.release + CINEMATIC.liberation.rise);
    mode = 'play';
  }));
};

// Fim da luta sem libertação (Mula vencida, dupla resolvida): a arena reabre, a cor volta e o céu muda
// (amanhecer no Sertão, sol depois da ressaca no Porto); a memória aparece longe do corpo do chefe.
function finishFight(title, sub, text) {
  prog.defeated = true;
  prog.freed = true;
  prog.fight = false;
  prog.defeatedT = 0;
  prog.freedT = 0;
  tg.clear();
  G.player.victory = true;
  G.player.target = null;
  world.lockArena(false);
  world.restoreAll();
  const fm = world.finalMemory, a = world.arena;
  fm.position.set(a.x, 0, a.z - 3);
  if (Math.hypot(fm.position.x - G.boss.pos.x, fm.position.z - G.boss.pos.z) < 4) fm.position.set(a.x, 0, a.z + 3);
  audio.setMusic('victory');
  audio.play('restore');
  hud.banner(title, sub, 4);
  log(text, 'good');
}
G.onBossDefeated = () => finishFight('A Mula sem Cabeça foi vencida!', 'A chama se apaga e o sertão amanhece', 'A Mula sem Cabeça foi vencida. O fogo se apaga e amanhece.');

// Dupla do Porto: cada parte resolvida tem o seu aviso; com as duas, o mar acalma e o sol abre.
const DUO_TEXT = {
  iara: { title: 'A Iara foi libertada!', rest: 'Falta vencer o Ipupiara', log: 'A máscara do Silêncio se parte: a Iara está livre.' },
  ipu: { title: 'O Ipupiara afundou!', rest: 'Falta libertar a Iara', log: 'O Ipupiara foi vencido e afunda no mar.' },
};
G.onDuoPart = (part) => {
  const t = DUO_TEXT[part === G.bosses.duo.iara ? 'iara' : 'ipu'];
  log(t.log, 'good');
  if (G.player.target === part) G.player.target = null;
  if (!G.bosses.duo.partDone(part)) {
    hud.banner(t.title, t.rest, 3);
    audio.play('chime');
    return;
  }
  finishFight(t.title, 'O mar se acalma e o sol abre sobre o porto', 'A ressaca passou. O mar se acalma e o sol volta ao porto.');
};

// Encontro: o portão de raízes fecha, o Curupira desperta e ruge; a luta começa no fim.
function startEncounter() {
  prog.fight = true;
  prog.checkpoint = 'arena';
  world.lockArena(true);
  audio.setMusic('boss');
  mode = 'cinematic';
  cine.play(encounterCinematic(G, cine, () => {
    G.boss.begin();
    mode = 'play';
    const tip = G.boss === G.bosses.mula ? 'Cone atrás: coice · Faixa laranja: investida · Rosa: empinada — saia antes de encher'
      : G.boss === G.bosses.duo ? 'Azul: ressaca e maré alta · Vermelho: rabada · Laranja: arremetida — não caia no mar!'
        : 'Vermelho largo: varredura de cipó · Rosa: raízes — saia antes de encher';
    setTimeout(() => once('boss' + level.key, tip, 6), 1500);
  }));
}

function checkGate() {
  if (!prog.gate && prog.kills >= G.fragments.length && prog.vestigio) {
    prog.gate = true;
    world.openGate();
    audio.play('gate');
    hud.banner(...level.gate.banner);
    log(level.gate.log, 'sys');
  }
}

function interact() {
  const p = G.player.pos;
  const vp = world.vestigioPos;
  if (!prog.vestigio && p.distanceTo(vp) < 2.4) {
    if (input.pressed('interact')) {
      prog.vestigio = true;
      world.activateVestigio();
      fx.burst('restore', vp.clone().setY(1.4), { n: 40 });
      audio.play('chime');
      hud.banner(...level.vestigio.banner);
      log(level.vestigio.log, 'lore');
      checkGate();
    }
    return level.vestigio.prompt;
  }
  const fm = world.finalMemory;
  if (fm.visible && !prog.memory && p.distanceTo(fm.position) < 2.4) {
    if (input.pressed('interact')) {
      prog.memory = true;
      log(level.memory.quote, 'lore');
      fx.burst('restore', fm.position.clone().setY(1.4), { n: 60 });
      audio.play('restore');
      setTimeout(showComplete, 1200);
    }
    return level.memory.prompt;
  }
  return null;
}

function showComplete() {
  mode = 'complete';
  document.getElementById('completeKicker').textContent = level.complete.kicker;
  document.getElementById('completeQuote').textContent = level.memory.quote;
  document.getElementById('completeLead').textContent = level.complete.lead;
  const m = Math.floor(prog.time / 60);
  const s = Math.floor(prog.time % 60).toString().padStart(2, '0');
  document.getElementById('stats').textContent = `Tempo: ${m}:${s} · Quedas: ${prog.deaths}`;
  hud.screen('complete');
}

function objectives() {
  const n = G.fragments.length;
  if (prog.memory) return [{ text: level.complete.kicker, done: true }];
  if (prog.freed) return [{ text: level.bossDone, done: true }, { text: level.memory.goal, done: false }];
  if (prog.fight) return [{ text: level.bossGoal, done: false }];
  const list = [
    { text: `${level.enemyGoal} (${prog.kills}/${n})`, done: prog.kills >= n },
    { text: level.vestigio.goal, done: prog.vestigio },
  ];
  list.push({ text: prog.gate ? level.enterArena : level.gate.goal, done: false });
  return list;
}

// ---------- Seleção por clique ----------
const raycaster = new THREE.Raycaster();
function clickSelect(pos) {
  const ndc = new THREE.Vector2((pos.x / window.innerWidth) * 2 - 1, -(pos.y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  let best = null;
  let bestD = Infinity;
  for (const e of G.enemies()) {
    if (!e.alive || !e.targetable) continue;
    const root = e.model ? e.model.root : e.rig.root;
    const hits = raycaster.intersectObject(root, true);
    if (hits.length && hits[0].distance < bestD) {
      bestD = hits[0].distance;
      best = e;
    }
  }
  if (best) G.player.target = best;
}

// ---------- Laço principal ----------
const clock = new THREE.Clock();
let worldTime = 0;
let ambientT = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt=Math.min(0.05, clock.getDelta());
  if(studio.active){studio.update(dt);renderer.render(studio.scene,studio.camera);return;}
  if (!window.__baoba?.hold) step(dt);
  updateGrade(dt);
  composer.render();
}

function updateGrade(dt) {
  const u = grade.uniforms;
  const k = Math.min(1, dt * 1.5);
  const danger = mode === 'play' && prog.fight && G.boss.alive ? 1 : 0;
  const drain = G.player.alive ? Math.min(1, Math.max(0, (0.4 - G.player.hp / PLAYER.hp) / 0.4)) : 1;
  u.uTime.value += dt;
  u.uDanger.value += (danger - u.uDanger.value) * k;
  u.uDrain.value += (drain - u.uDrain.value) * Math.min(1, dt * 4);
}

function step(dt) {

  if (blocked() && mode === 'play') {
    mode = 'pause';
    hud.screen('pause');
  }
  if (input.pressed('pause')) {
    if (mode === 'play') {
      mode = 'pause';
      hud.screen('pause');
    } else if (mode === 'pause') {
      mode = 'play';
      hud.screen(null);
    }
  }
  if (mode === 'title' && input.pressed('confirm')) startLevel(level.key);
  if (mode === 'dead' && (input.pressed('restart') || input.pressed('confirm'))) retry();
  if (mode === 'complete' && input.pressed('restart')) restartAll();

  if (mode === 'play') {
    worldTime += dt;
    prog.time += dt;
    if (input.clickPos) clickSelect(input.clickPos);
    G.player.update(dt, input);
    G.projectiles.update(dt);
    for (const f of G.fragments) f.update(dt);
    G.boss.update(dt);

    // Primeiro contato com um Fragmento
    if (G.fragments.some((f) => f.state === 'warn')) once('cone', 'Saia do cone laranja antes do golpe — ou esquive com Shift', 6);
    if (G.fragments.some((f) => f.state === 'rise')) once('rise', 'Os mortos saem das covas quando você chega perto', 5);
    if (G.fragments.some((f) => f.blast?.tg)) once('blast', 'O morto-vivo em brasa vai explodir — saia do círculo!', 5);
    if (!prog.vestigio && G.player.pos.distanceTo(world.vestigioPos) < 8) once('vest', level.vestigio.hint, 5);

    // Entrada na clareira = checkpoint e início do encontro
    const a = world.arena;
    if (prog.gate && !prog.fight && !prog.freed && !prog.defeated && Math.hypot(G.player.pos.x - a.x, G.player.pos.z - a.z) < a.r - 1.5) startEncounter();
    // Mula vencida: o herói volta a andar depois da pose de vitória para tocar a memória
    if (prog.defeated) {
      prog.defeatedT += dt;
      if (prog.defeatedT > 2.5 && G.player.victory) G.player.victory = false;
    }
    if (prog.freed) {
      prog.freedT += dt;
      if (prog.freedT > 1.6 && !world.finalMemory.visible) {
        world.finalMemory.visible = true;
        fx.burst('restore', world.finalMemory.position.clone().setY(1.4), { n: 30 });
        audio.play('chime');
      }
    }

    hud.interact(G.player.alive ? interact() : null);
    hud.objectives(objectives());

    if (!G.player.alive) {
      deathTimer -= dt;
      if (deathTimer <= 0) {
        mode = 'dead';
        document.getElementById('defeatText').textContent = level.defeat[prog.checkpoint === 'arena' ? 'arena' : 'trail'];
        hud.screen('defeat');
      }
    }
  }

  // Cinemática: só chefe, herói (pose) e mundo animam; Enter, Esc, Espaço ou toque na tela pulam.
  if (mode === 'cinematic') {
    worldTime += dt;
    prog.time += dt;
    if (input.pressed('confirm') || input.pressed('pause') || input.pressed('jump') || input.pressed('Tap')) cine.skip();
    cine.update(dt);
    G.boss.update(dt);
    G.player.animate(dt);
    hud.interact(null);
  }

  // Mundo e efeitos continuam animando fora da pausa
  if (mode !== 'pause') {
    world.update(dt, worldTime);
    tg.update(dt);
    fx.update(dt);
    ambientT += dt;
    if (ambientT > 0.12) {
      ambientT = 0;
      const life = world.restoredAt(camTarget.x, camTarget.z);
      if (Math.random() < 0.6) fx.burst(life > 0.5 ? world.ambient.restored : world.ambient.silent, camTarget);
      audio.updateAmbient(0.12, life);
    }
  }
  audio.updateMusic();
  if (mode === 'title') {
    // Pequeno passeio de câmera na tela de título
    worldTime += dt;
    G.player.animate(dt);
  }
  hud.update(dt, G);
  applyAtmosphere(Math.min(1, dt * 2));

  // Marcadores
  const t = G.player.target;
  targetRing.visible = !!(t && t.alive) && mode !== 'cinematic';
  if (targetRing.visible) {
    targetRing.position.set(t.pos.x, 0.05, t.pos.z);
    targetRing.scale.setScalar((t.radius + 0.6) * 2);
    targetRing.rotation.y -= dt * 0.8;
  }
  playerAura.position.set(G.player.pos.x, 0.045, G.player.pos.z);
  playerAura.visible = G.player.alive;
  auraRune.rotation.y += dt * 0.7;
  auraGlow.material.opacity = 0.45 + Math.sin(worldTime * 3) * 0.12;

  const pz = G.player.pos.z;
  hud.setArea(level.area(G.player.pos.x, pz));
  hud.setMemory((prog.kills / G.fragments.length) * 30 + (prog.vestigio ? 20 : 0) + (prog.gate ? 10 : 0) + (prog.freed ? 30 : 0) + (prog.memory ? 10 : 0));

  // Câmera
  zoom = Math.max(CAM.zoomMin, Math.min(CAM.zoomMax, zoom + input.wheel * 0.06));
  let dist = CAM.dist, pitch = CAM.pitchDeg, lookY = CAM.lookY;
  const goal = G.player.pos.clone();
  if (mode === 'title') goal.set(world.spawn.trail.x + Math.sin(worldTime * 0.15) * 2, 0, world.spawn.trail.z - 4);
  if (prog.fight && G.boss.alive) ({ dist, pitch, lookY } = frameBoss(goal));
  goal.y = 0;
  const k = 1 - Math.exp(-dt * 3);              // transição suave ao entrar/sair da luta
  camRig.dist += (dist - camRig.dist) * k; camRig.pitch += (pitch - camRig.pitch) * k; camRig.lookY += (lookY - camRig.lookY) * k;
  goal.y = camRig.lookY;
  camTarget.lerp(goal, 1 - Math.exp(-dt * 7));
  const pr = THREE.MathUtils.degToRad(camRig.pitch), d = camRig.dist * zoom;
  camera.position.set(camTarget.x, camTarget.y + Math.sin(pr) * d, camTarget.z + Math.cos(pr) * d);
  camera.lookAt(camTarget);
  if (cine.active) cine.camera(camera.position.clone(), camTarget.clone(), camera);
  if (G.debugCam) {
    camera.position.copy(G.debugCam.pos);
    camera.lookAt(G.debugCam.look);
  }
  sun.position.copy(camTarget).add(SUN_OFFSET);
  sun.target.position.copy(camTarget);

  input.endFrame();
}

// Enquadramento de chefe: o herói é a âncora (pés na faixa de baixo da tela). A mira avança em direção
// ao chefe só até onde o herói continua visível, e a câmera recua apenas o necessário para caber o topo
// do chefe (gigante 3–6 m a colossal 10 m+). Em luta corpo a corpo fica perto como na exploração.
const _ndc = new THREE.Vector3();
function frameBoss(goal) {
  const B = CAM.boss, h = G.boss.height || 3, pitch = CAM.pitchDeg - B.pitchDropDeg;
  const feet = G.player.pos.clone().setY(0), top = G.boss.pos.clone().setY(h), look = new THREE.Vector3();
  const lookY = CAM.lookY + 0.12 * h;
  const pr = THREE.MathUtils.degToRad(pitch);
  const place = (d, t) => {
    look.copy(feet).lerp(G.boss.pos, t).setY(lookY);
    camera.position.set(look.x, look.y + Math.sin(pr) * d, look.z + Math.cos(pr) * d);
    camera.lookAt(look); camera.updateMatrixWorld();
    return [_ndc.copy(feet).project(camera).y, _ndc.copy(top).project(camera).y];
  };
  for (let d = B.baseDist; d <= B.maxDist; d += 0.5) {
    for (let t = 0.6; t >= 0; t -= 0.05) {
      const [yf, yt] = place(d, t);
      if (yf < B.heroBottomNdc) continue;          // herói sairia por baixo: mire mais perto dele
      if (yt <= B.bossTopNdc) { goal.copy(look).setY(0); return { dist: d, pitch, lookY }; }
      break;                                        // herói ok, chefe cortado: recue
    }
  }
  goal.copy(feet); return { dist: B.maxDist, pitch, lookY };
}

// ---------- Retratos para a interface ----------
function makePortraits() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(160, 160);
  r.outputColorSpace = THREE.SRGBColorSpace;
  const shot = (obj, camPos, look) => {
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight('#ffffff', '#88aa77', 2));
    const d = new THREE.DirectionalLight('#fff2dd', 2);
    d.position.set(1, 2, 3);
    s.add(d, obj);
    const c = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    c.position.set(...camPos);
    c.lookAt(...look);
    r.render(s, c);
    return r.domElement.toDataURL();
  };
  const lut = buildLutador();
  // Retrato na pose de referência (rosto de frente); a câmera segue o osso da cabeça.
  lut.animate('apose', 0);
  const face = new THREE.Vector3();
  (lut.model.getObjectByName('Head') || lut.root).getWorldPosition(face);
  face.y += 0.085;
  const cang = buildSkinnedCangaceiro();
  cang.animate('apose', 0);
  const cface = new THREE.Vector3();
  cang.model.getObjectByName('Head').getWorldPosition(cface);
  cface.y += 0.07;
  const vaq = buildSkinnedVaqueiro();
  vaq.animate('apose', 0);
  const vface = new THREE.Vector3();
  vaq.model.getObjectByName('Head').getWorldPosition(vface);
  vface.y += 0.06;
  const mal = buildSkinnedMaloka();
  mal.animate('apose', 0);
  const mface = new THREE.Vector3();
  mal.model.getObjectByName('Head').getWorldPosition(mface);
  mface.y += 0.05;
  const cur = buildSkinnedCurupira();
  cur.animate('idle', 0);
  const frag = buildFragmento();
  animateFragmento(frag, 'idle', 0.5, 0);
  const out = {
    lutador: shot(lut.root, [face.x + 0.1, face.y + 0.04, face.z + 0.85], [face.x, face.y, face.z]),
    cangaceiro: shot(cang.root, [cface.x + 0.1, cface.y + 0.04, cface.z + 0.95], [cface.x, cface.y, cface.z]),
    vaqueiro: shot(vaq.root, [vface.x + 0.1, vface.y + 0.04, vface.z + 0.95], [vface.x, vface.y, vface.z]),
    maloka: shot(mal.root, [mface.x + 0.1, mface.y + 0.04, mface.z + 0.9], [mface.x, mface.y, mface.z]),
    curupira: shot(cur.root, [0.2, 2.67, 1.5], [0, 2.62, 0]),
    fragmento: shot(frag.root, [0.1, 0.95, 2], [0, 0.85, 0]),
  };
  r.dispose();
  return out;
}

// ---------- Botões e ajustes ----------
document.getElementById('btnStart').addEventListener('click', () => {
  enterLandscape();
  startLevel(level.key);
});
document.querySelectorAll('.level-pick .level').forEach((b) => b.addEventListener('click', () => { if (mode === 'title') selectLevel(b.dataset.level); }));
document.getElementById('btnLutador').addEventListener('click',()=>studio.open());
document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
  const act = b.dataset.act;
  if (act === 'resume') {
    mode = 'play';
    hud.screen(null);
  } else if (act === 'checkpoint') retry();
  else if (act === 'restart') restartAll();
  else if (act === 'retry') retry();
}));
document.getElementById('vol').addEventListener('input', (e) => audio.setVolume(Number(e.target.value)));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
});

hud.setPortraits(makePortraits());

// ---------- Escolha do herói (tela de título) ----------
const HERO_TEXT = {
  capoeirista: { line: '<strong>Capoeirista</strong> · DPS corpo a corpo — mobilidade, esquivas rítmicas e chutes devastadores.',
    attack: 'golpes', q: 'Rasteira — interrompe', e: 'Meia-lua — área' },
  cangaceiro: { line: '<strong>Cangaceiro</strong> · DPS à distância — bacamarte, pistolas e arremesso de peixeira.',
    attack: 'bacamarte', q: 'Peixeira — interrompe', e: 'Pistolas — rajada curta' },
  vaqueiro: { line: '<strong>Peão</strong> · Tanque — armadura de couro, laço que prende e puxa, berrante que chama os inimigos.',
    attack: 'gancho', q: 'Laço — prende e puxa (chefes: interrompe)', e: 'Berrante — provoca' },
  maloka: { line: '<strong>Maloka</strong> · DPS furtivo — navalha, veneno e cortina de fumaça; mais dano pelas costas e saindo da fumaça.',
    attack: 'navalha', q: 'Veneno — interrompe e envenena', e: 'Fumaça — some e embosca' },
};
function selectHero(name) {
  if (!HERO_TEXT[name]) name = 'capoeirista';
  G.player.setHero(name);
  hud.setHero(name, G.player.kit);
  const t = HERO_TEXT[name];
  document.getElementById('heroLine').innerHTML = t.line;
  for (const el of document.querySelectorAll('[data-ctl]')) el.textContent = t[el.dataset.ctl];
  document.querySelectorAll('.hero-pick .hero[data-hero]').forEach((b) => {
    const on = b.dataset.hero === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  try { localStorage.setItem('baoba.hero', name); } catch {}
}
document.querySelectorAll('.hero-pick .hero[data-hero]').forEach((b) => b.addEventListener('click', () => selectHero(b.dataset.hero)));
let savedHero = 'capoeirista';
try { savedHero = localStorage.getItem('baoba.hero') || savedHero; } catch {}
selectHero(savedHero);
let savedLevel = 'mata';
try { savedLevel = localStorage.getItem('baoba.level') || savedLevel; } catch {}
selectLevel(savedLevel);
G.player.reset(world.spawn.trail);
frame();

// Acesso para depuração no console
window.__baoba = {
  G, prog, get world() { return world; }, WORLD, renderer, cine, grade,
  hold: false,   // testes: congela o relógio real; advance() continua avançando
  get mode() { return mode; },
  startMula,
  startDuo: () => startMula('porto'),
  startLevel,
  selectLevel,
  worlds,
  get level() { return level.key; },
  selectHero,
  // Avança a simulação em passos fixos (testes automáticos em máquinas lentas)
  advance(sec, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) step(dt); },
};
