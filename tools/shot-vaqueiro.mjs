// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências), mostra o Vaqueiro no
// visualizador, joga com ele (gancho, laço, berrante, armadura, laço interrompendo o chefe) e grava
// capturas em Evidence/vaqueiro-*.png. Deve terminar com errors [].
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9336;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720', '--allow-file-access-from-files', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50 && !targets; i++) { await sleep(200); try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/vaqueiro-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const pick = (sel, value) => js(`(()=>{const e=document.getElementById('${sel}');e.value='${value}';e.onchange({target:e});})()`);
// Pausa no instante t (fração da duração do clipe) pelo controle deslizante do visualizador.
const at = frac => js(`(()=>{const s=document.getElementById('studioTime');s.value=${frac};s.oninput();})()`);
const view = name => js(`document.querySelector('[data-view="${name}"]').click()`);
const key = (code, type) => js(`window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true}))`);

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
const checks = {};
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');
  await js(`document.getElementById('btnLutador').click()`);
  await pick('studioCharacter', 'vaqueiro');
  checks.title = await js(`document.querySelector('#lutadorStudio h1').textContent`);
  checks.clips = await js(`[...document.getElementById('studioClip').options].map(o=>o.value)`);
  if (checks.title !== 'Peão' || !checks.clips.includes('lasso')) throw new Error('Vaqueiro not selected ' + JSON.stringify(checks));
  await shot('idle-three');
  await view('front'); await pick('studioClip', 'apose'); await at(0); await shot('apose-front');
  // VAQUEIRO: laço solta em 0.42 de 0.8 s; berrante na boca no meio de 1.4 s.
  await view('three'); await pick('studioClip', 'lasso'); await at(0.3 / 0.8); await shot('lasso-windup');
  await pick('studioClip', 'pull'); await at(0.5); await shot('pull');
  await pick('studioClip', 'taunt'); await at(0.5); await shot('taunt');
  await pick('studioClip', 'attack'); await at(0.26 / 0.6); await shot('attack-hit');
  await pick('studioClip', 'run'); await view('game'); await at(0.3); await shot('run-game-camera');
  await js(`document.getElementById('studioClose').click()`);

  // Herói jogável: escolha na tela de título, HUD, gancho (J), laço (Q), berrante (E), armadura.
  await js(`document.querySelector('.hero-pick [data-hero="vaqueiro"]').click()`);
  checks.hud = await js(`({hero: __baoba.G.player.heroName, name: document.querySelector('#playerFrame .name').textContent,
    role: document.querySelector('#playerFrame .hearts').textContent, q: document.getElementById('ctlQ').textContent})`);
  if (checks.hud.hero !== 'vaqueiro' || checks.hud.name !== 'Peão' || checks.hud.role !== 'Tanker') throw new Error('hero pick ' + JSON.stringify(checks.hud));
  await shot('title-pick');
  await js(`document.getElementById('btnStart').click()`); await js(`__baoba.advance(1)`);
  const place = (i, d) => js(`(()=>{const B=__baoba,P=B.G.player,f=B.G.fragments[${i}]; f.pos.set(P.pos.x, 0, P.pos.z - ${d}); f.home.copy(f.pos); f.setState('idle');   // casa no lugar: fora da coleira ele voltaria (e curaria)
    P.facing=Math.PI; P.target=f; return f.hp})()`);
  const press = async (code, sec) => { await key(code, 'keydown'); await js(`__baoba.advance(.05)`); await key(code, 'keyup'); await js(`__baoba.advance(${sec})`); };
  const dist = i => js(`(()=>{const P=__baoba.G.player,f=__baoba.G.fragments[${i}]; return Math.hypot(f.pos.x-P.pos.x, f.pos.z-P.pos.z)})()`);
  const hp0 = await place(0, 2); await press('KeyJ', .7); await shot('game-gancho');
  checks.gancho = { before: hp0, after: await js(`__baoba.G.fragments[0].hp`) };
  // Laço: o fragmento a 7 m fica preso e é arrastado até a frente do vaqueiro.
  const hp1 = await place(1, 7); await press('KeyQ', .75); await shot('game-laco');
  await js(`__baoba.advance(.8)`);
  checks.laco = { before: hp1, after: await js(`__baoba.G.fragments[1].hp`), dist: await dist(1), held: await js(`__baoba.G.fragments[1].held > 0`) };
  if (checks.laco.dist > 2.6 || !checks.laco.held) throw new Error('laço não prendeu/puxou ' + JSON.stringify(checks.laco));
  // Berrante: um fragmento ocioso a 9 m (fora da detecção) passa a perseguir.
  await js(`__baoba.advance(2.6)`);
  await place(2, 9); await press('KeyE', 1.0); await shot('game-berrante');
  checks.berrante = await js(`({state: __baoba.G.fragments[2].state, taunted: __baoba.G.fragments[2].taunted > 0})`);
  if (checks.berrante.state !== 'chase' || !checks.berrante.taunted) throw new Error('berrante não provocou ' + JSON.stringify(checks.berrante));
  for (const [k, dmg] of [['gancho', 20], ['laco', 8]])   // VAQUEIRO em config.js
    if (checks[k].before - checks[k].after !== dmg) throw new Error(`${k}: dano ${checks[k].before - checks[k].after}, esperado ${dmg}`);
  // Armadura de couro: 30% a menos de dano recebido.
  checks.armor = await js(`(()=>{const P=__baoba.G.player; P.hp=100; P.dodge=null; P.takeDamage(20); return 100-P.hp})()`);
  if (checks.armor !== 14) throw new Error('armadura: dano ' + checks.armor + ', esperado 14');
  // Chefe: o laço, de longe, interrompe o Chamado do Silêncio sem prender nem puxar.
  await js(`(()=>{const B=__baoba; B.G.fragments.forEach(f=>f.alive&&f.die()); B.prog.gate=true; B.prog.kills=3; B.prog.vestigio=true; const a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3);})()`);
  await js(`__baoba.advance(.2); __baoba.cine.skip(); __baoba.advance(3)`);
  await js(`(()=>{const B=__baoba,P=B.G.player,b=B.G.boss; P.hp=100; P.pos.set(b.pos.x, 0, b.pos.z + 8); P.facing=Math.PI; P.target=b; P.cd.rasteira=0; b.setState('cast'); b.cast={t:0,dur:3.4}; window.__bossPos=b.pos.clone();})()`);
  await press('KeyQ', 1.2); await shot('game-interrompe');
  checks.interrupt = await js(`({state: __baoba.G.boss.state, moved: __baoba.G.boss.pos.distanceTo(window.__bossPos)})`);
  if (checks.interrupt.state !== 'stagger') throw new Error('laço não interrompeu: ' + JSON.stringify(checks.interrupt));
  // Volta ao Capoeirista sem resíduo.
  checks.back = await js(`(()=>{__baoba.selectHero('capoeirista'); const P=__baoba.G.player; return {hero:P.heroName, melee:P.kit.melee, combo:P.rig.clips.has('combo0'), rope:!P.rope}})()`);
  if (!checks.back.combo || !checks.back.melee || !checks.back.rope) throw new Error('voltar ao Capoeirista ' + JSON.stringify(checks.back));
} finally {
  console.log('checks', JSON.stringify(checks));
  console.log('errors', JSON.stringify(errors));
  ws.close(); proc.kill(); await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
if (errors.length) process.exit(1);
