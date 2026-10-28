// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências), mostra o Maloka no
// visualizador, joga com ele (navalhada, pelas costas, frasco de veneno, cortina de fumaça e emboscada,
// frasco interrompendo o chefe) e grava capturas em Evidence/maloka-*.png. Deve terminar com errors [].
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9337;
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/maloka-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
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
  await pick('studioCharacter', 'maloka');
  checks.title = await js(`document.querySelector('#lutadorStudio h1').textContent`);
  checks.clips = await js(`[...document.getElementById('studioClip').options].map(o=>o.value)`);
  if (checks.title !== 'Maloka' || !checks.clips.includes('smoke')) throw new Error('Maloka not selected ' + JSON.stringify(checks));
  await shot('idle-three');
  await view('front'); await pick('studioClip', 'apose'); await at(0); await shot('apose-front');
  // MALOKA: estocada acerta em 0.3 de 0.6 s; frasco sai em 0.36 de 0.7 s; bomba no chão em 0.3 de 0.6 s.
  await view('three'); await pick('studioClip', 'slash'); await at(0.3 / 0.6); await shot('slash-hit');
  await pick('studioClip', 'throw'); await at(0.25 / 0.7); await shot('throw-windup');
  await pick('studioClip', 'smoke'); await at(0.3 / 0.6); await shot('smoke-hit');
  await pick('studioClip', 'run'); await view('game'); await at(0.3); await shot('run-game-camera');
  await js(`document.getElementById('studioClose').click()`);

  // Herói jogável: escolha na tela de título, HUD, navalha (J), veneno (Q), fumaça (E).
  await js(`document.querySelector('.hero-pick [data-hero="maloka"]').click()`);
  checks.hud = await js(`({hero: __baoba.G.player.heroName, name: document.querySelector('#playerFrame .name').textContent,
    role: document.querySelector('#playerFrame .hearts').textContent, q: document.getElementById('ctlQ').textContent, e: document.getElementById('ctlE').textContent})`);
  if (checks.hud.hero !== 'maloka' || checks.hud.name !== 'Maloka' || checks.hud.role !== 'DPS Stealth') throw new Error('hero pick ' + JSON.stringify(checks.hud));
  await shot('title-pick');
  await js(`document.getElementById('btnStart').click()`); await js(`__baoba.advance(1)`);
  checks.fragments = await js(`__baoba.G.fragments.length`);
  // Fragmento à frente do herói (casa no lugar: fora da coleira ele voltaria e curaria); away: de costas
  // para o herói (os dois olham para -z).
  // Cada cena começa com os outros fragmentos parados longe, fora do caminho do frasco e do arco do golpe.
  const place = (i, d, away = false) => js(`(()=>{const B=__baoba,P=B.G.player; B.G.fragments.forEach((o,k)=>{ if(k!==${i}){o.pos.set(P.pos.x+40, 0, P.pos.z); o.home.copy(o.pos); o.held=999;} });
    const f=B.G.fragments[${i}]; f.reset(); f.pos.set(P.pos.x, 0, P.pos.z - ${d}); f.home.copy(f.pos); f.setState('idle');
    f.facing=${away ? 'Math.PI' : '0'}; P.facing=Math.PI; P.target=f; return f.hp})()`);
  const press = async (code, sec) => { await key(code, 'keydown'); await js(`__baoba.advance(.05)`); await key(code, 'keyup'); await js(`__baoba.advance(${sec})`); };
  const hp = i => js(`__baoba.G.fragments[${i}].hp`);
  // Números de config.js (MALOKA): navalha 24, ×1,5 pelas costas, frasco 10 + 6/s por 5 s, emboscada ×2.
  let h0 = await place(0, 2); await press('KeyJ', .6); await shot('game-navalha');
  checks.navalha = h0 - await hp(0);
  // De costas: o fragmento ocioso detectaria o herói e se viraria antes do impacto; parado (held), fica de costas.
  h0 = await place(1, 2, true); await js(`__baoba.G.fragments[1].held = 1`); await press('KeyJ', .6);
  checks.costas = h0 - await hp(1);
  // Veneno: frasco a 6 m; o dano do impacto e depois o veneno por 5 s (o alvo fica parado no lugar).
  h0 = await place(2, 6); await press('KeyQ', .75); await shot('game-veneno');
  checks.veneno = { impact: h0 - await hp(2) };
  await js(`__baoba.G.fragments[2].held = 99`);
  await js(`__baoba.advance(5.2)`);
  checks.veneno.total = h0 - await hp(2);
  await js(`__baoba.G.fragments[2].held = 0`);
  // Fumaça: um fragmento perseguindo a 4 m perde o rastro; o golpe seguinte é emboscada (×2). Só há 3
  // fragmentos na fase: place() os revive.
  await place(0, 4); await js(`__baoba.G.fragments[0].setState('chase')`);
  await press('KeyE', .7); await js(`__baoba.advance(.3)`); await shot('game-fumaca');
  checks.fumaca = await js(`({hidden: __baoba.G.player.hidden, ambush: __baoba.G.player.ambush, state: __baoba.G.fragments[0].state,
    veil: __baoba.G.player.rig.model.getObjectByName('Maloka_Body_000').material.opacity})`);
  if (!checks.fumaca.hidden || checks.fumaca.state !== 'lost' || checks.fumaca.veil > .5) throw new Error('fumaça não escondeu ' + JSON.stringify(checks.fumaca));
  const amb = 1;
  h0 = await place(amb, 2); await press('KeyJ', .6); await shot('game-emboscada');
  checks.emboscada = { dmg: h0 - await hp(amb), ambush: await js(`__baoba.G.player.ambush`) };
  await js(`__baoba.advance(6)`);
  checks.reveal = await js(`({hidden: __baoba.G.player.hidden, veil: __baoba.G.player.rig.model.getObjectByName('Maloka_Body_000').material.opacity})`);
  for (const [k, d] of [['navalha', 24], ['costas', 36]]) if (checks[k] !== d) throw new Error(`${k}: dano ${checks[k]}, esperado ${d}`);
  // impact: o 1º tique (3) pode já ter caído na leitura; o total é 10 + 10 tiques de 3.
  if (checks.veneno.impact < 10 || checks.veneno.impact > 13 || checks.veneno.total !== 40) throw new Error('veneno ' + JSON.stringify(checks.veneno));
  if (checks.emboscada.dmg !== 48 || checks.emboscada.ambush) throw new Error('emboscada ' + JSON.stringify(checks.emboscada));
  if (checks.reveal.hidden || checks.reveal.veil !== 1) throw new Error('não reapareceu ' + JSON.stringify(checks.reveal));
  // Chefe: o frasco, de longe, interrompe o Chamado do Silêncio.
  await js(`(()=>{const B=__baoba; B.G.fragments.forEach(f=>{f.held=0; f.alive&&f.die();}); B.prog.gate=true; B.prog.kills=3; B.prog.vestigio=true; const a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3);})()`);
  await js(`__baoba.advance(.2); __baoba.cine.skip(); __baoba.advance(3)`);
  await js(`(()=>{const B=__baoba,P=B.G.player,b=B.G.boss; P.hp=100; P.pos.set(b.pos.x, 0, b.pos.z + 8); P.facing=Math.PI; P.target=b; P.cd.rasteira=0; b.setState('cast'); b.cast={t:0,dur:3.4};})()`);
  await press('KeyQ', 1.2); await shot('game-interrompe');
  checks.interrupt = await js(`__baoba.G.boss.state`);
  if (checks.interrupt !== 'stagger') throw new Error('frasco não interrompeu: ' + checks.interrupt);
  // Fumaça junto do chefe: ele não usa o golpe básico no Maloka escondido.
  await js(`(()=>{const P=__baoba.G.player,b=__baoba.G.boss; P.hp=100; P.cd.meialua=0; P.pos.set(b.pos.x, 0, b.pos.z + 2.2); P.facing=Math.PI;})()`);
  await press('KeyE', .4);
  checks.bossBasic = await js(`(()=>{const P=__baoba.G.player,b=__baoba.G.boss; b.setState('approach'); b.basicCd=0; __baoba.advance(.1); return {hidden: P.hidden, state: b.state}})()`);
  if (!checks.bossBasic.hidden || checks.bossBasic.state === 'basicWarn') throw new Error('chefe atacou o Maloka escondido ' + JSON.stringify(checks.bossBasic));
  await shot('game-fumaca-chefe');
  // Volta ao Capoeirista sem resíduo.
  checks.back = await js(`(()=>{__baoba.selectHero('capoeirista'); const P=__baoba.G.player; return {hero:P.heroName, combo:P.rig.clips.has('combo0'), hidden:P.hidden, poisons:P.poisons.length}})()`);
  if (!checks.back.combo || checks.back.hidden || checks.back.poisons) throw new Error('voltar ao Capoeirista ' + JSON.stringify(checks.back));
} finally {
  console.log('checks', JSON.stringify(checks));
  console.log('errors', JSON.stringify(errors));
  ws.close(); proc.kill(); await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
if (errors.length) process.exit(1);
