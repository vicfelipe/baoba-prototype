// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências), percorre o visualizador e o
// chefe da fase 2 (Sertão Velho, doc 24) a partir do checkpoint do terreiro, com __baoba.advance, e grava
// capturas em Evidence/mula-*.png. A fase inteira é testada em tools/shot-sertao.mjs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9335;
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/mula-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');
  await shot('title');
  // Viewer: the Mula with the volumetric fire, in a few clips.
  await js(`document.getElementById('btnLutador').click()`);
  await js(`(()=>{const e=document.getElementById('studioCharacter');e.value='mula';e.onchange({target:e});})()`);
  for (const clip of ['idle', 'chargeWarn', 'stompWarn', 'gallop']) {
    await js(`(()=>{const s=document.getElementById('studioClip');s.value='${clip}';s.onchange();})()`);
    await shot('studio-' + clip);
  }
  await js(`document.getElementById('studioClose').click()`);
  // Sertão Velho at the terreiro checkpoint (road cleared, gate open); the Curupira is hidden.
  await js(`__baoba.startMula();__baoba.hold=true;__baoba.advance(1)`);
  const start = await js(`({boss:__baoba.G.boss.name,curupiraVisible:__baoba.G.bosses.curupira.rig.root.visible,mulaVisible:__baoba.G.bosses.mula.rig.root.visible,gate:__baoba.prog.gate,mode:__baoba.mode,bar:document.getElementById('bossName').textContent})`);
  if (start.boss !== 'Mula sem Cabeça' || start.curupiraVisible || !start.mulaVisible || !start.gate || start.mode !== 'play' || start.bar !== 'Mula sem Cabeça') throw new Error('Challenge did not start ' + JSON.stringify(start));
  await js(`(()=>{const B=__baoba;const a=B.world.arena;B.G.player.pos.set(a.x,0,a.z+a.r-3);B.G.player.target=B.G.boss;B.G.player.hp=10000;B.advance(1.0);})()`);
  const cine = { start: await js(`({mode:__baoba.mode,active:__baoba.cine.active,targetable:__baoba.G.boss.targetable})`) };
  if (cine.start.mode !== 'cinematic' || !cine.start.active || cine.start.targetable) throw new Error('Encounter cinematic did not start ' + JSON.stringify(cine.start));
  await shot('cine-encounter-wide');
  await js(`__baoba.advance(2.6)`); await shot('cine-encounter-rear');
  await js(`__baoba.advance(1.4)`); await shot('cine-encounter-name');
  await js(`__baoba.advance(3.0)`);
  cine.end = await js(`({mode:__baoba.mode,active:__baoba.cine.active,boss:__baoba.G.boss.state,targetable:__baoba.G.boss.targetable})`);
  if (cine.end.mode !== 'play' || cine.end.active || !cine.end.targetable) throw new Error('Encounter did not hand over ' + JSON.stringify(cine.end));
  await js(`__baoba.advance(1.5)`);
  await shot('encounter');
  // The real attack cycle from the gameplay entry point (warning shapes, white flame, charge run, impacts).
  const cycle = [];
  for (let i = 0; i < 90 && cycle.filter(c => c.state === 'stompHit').length === 0; i++) {
    await js(`__baoba.advance(.25)`);
    const s = await js(`({state:__baoba.G.boss.state,x:+__baoba.G.boss.pos.x.toFixed(2),z:+__baoba.G.boss.pos.z.toFixed(2),fire:+__baoba.G.boss.rig.fire.scale.y.toFixed(2),tg:__baoba.G.tg.list.length})`);
    if (!cycle.length || cycle[cycle.length - 1].state !== s.state) {
      cycle.push(s);
      if (['kickWarn', 'chargeWarn', 'charge', 'stompWarn'].includes(s.state)) { await js(`__baoba.advance(.5)`); await shot('fight-' + s.state); }
    }
  }
  const seen = new Set(cycle.map(c => c.state));
  for (const s of ['approach', 'kickWarn', 'kickHit', 'chargeWarn', 'charge', 'chargeEnd', 'stompWarn', 'stompHit'])
    if (!seen.has(s)) throw new Error('Attack cycle missed ' + s + ' ' + JSON.stringify(cycle));
  // Interrupt the Labareda through takeHit.
  const interrupted = await js(`(()=>{const b=__baoba.G.boss;b.setState('cast');b.cast={t:0,dur:3.2};b.takeHit(65,{interrupts:true,heavy:false,actionId:99901});return b.state==='stagger';})()`);
  if (!interrupted) throw new Error('Rasteira did not interrupt the Labareda');
  await js(`(()=>{const b=__baoba.G.boss;b.setState('cast');b.st=2.4;b.cast={t:2.4,dur:3.2};b.animate(0,false);})()`);
  await js(`__baoba.advance(.3)`); await shot('fight-cast');
  // Defeat: dead clip, flame dies out, sunrise and the final memory (the level ends when it is touched).
  await js(`(()=>{const b=__baoba.G.boss;b.setState('idle');b.takeHit(100000,{interrupts:false,heavy:true,actionId:99902});__baoba.advance(1.2);})()`);
  await shot('defeat-fall');
  await js(`__baoba.advance(3.6)`);
  const end = await js(`({mode:__baoba.mode,alive:__baoba.G.boss.alive,state:__baoba.G.boss.state,fire:__baoba.G.boss.rig.fire.visible,defeated:__baoba.prog.defeated,memory:__baoba.world.finalMemory.visible,dawn:__baoba.world.dawn})`);
  if (end.mode !== 'play' || end.alive || end.state !== 'dead' || end.fire || !end.defeated || !end.memory || !(end.dawn > 0.5)) throw new Error('Defeat failed ' + JSON.stringify(end));
  await shot('complete');
  // Restart from the checkpoint resets the boss.
  await js(`__baoba.startMula();__baoba.advance(.2)`);
  const reset = await js(`({boss:__baoba.G.boss.name,hp:__baoba.G.boss.hp,state:__baoba.G.boss.state,mode:__baoba.mode,defeated:__baoba.prog.defeated})`);
  if (reset.boss !== 'Mula sem Cabeça' || reset.hp !== 2600 || reset.state !== 'dormant' || reset.mode !== 'play' || reset.defeated) throw new Error('Restart failed ' + JSON.stringify(reset));
  // Phase 1 brings the Curupira back.
  await js(`__baoba.selectLevel('mata');__baoba.startLevel('mata');__baoba.advance(.2)`);
  const back = await js(`({boss:__baoba.G.boss.name,curupiraVisible:__baoba.G.bosses.curupira.rig.root.visible,mulaVisible:__baoba.G.bosses.mula.rig.root.visible})`);
  if (back.boss !== 'Curupira corrompido' || !back.curupiraVisible || back.mulaVisible) throw new Error('Campaign did not restore the Curupira ' + JSON.stringify(back));
  fs.writeFileSync(new URL('Evidence/mula-browser-checks.json', root), JSON.stringify({ start, cine, cycle, interrupted, end, reset, back, errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: game load, viewer, challenge start, encounter cinematic, attack cycle (kick, charge, stomp), interruption, defeat, restart, campaign; errors []');
} finally { ws.close(); proc.kill(); }
