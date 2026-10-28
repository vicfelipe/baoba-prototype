// Capturas do chão (tiles) em pontos fixos do mapa: clareira inicial, trilha, riacho, nicho do vestígio,
// área corrompida e a arena. Uso: node tools/shot-tiles.mjs <prefixo>  →  Evidence/tiles-<prefixo>-*.png
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tag = process.argv[2] || 'now';
const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9341;
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
const shot = async name => { await sleep(3000); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/tiles-${tag}-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');
  await js(`(()=>{const B=__baoba;B.hold=true;document.getElementById('btnStart').click();B.advance(0.5);})()`);
  const mode = await js(`__baoba.mode`);
  if (mode !== 'play') throw new Error('Did not enter play mode: ' + mode);
  // Esconde o HUD para o chão ficar à vista
  await js(`(()=>{const s=document.createElement('style');s.textContent='#hud,.hud,#fxLayer{display:none!important}';document.head.appendChild(s);})()`);
  // Custo da vegetação: instâncias e triângulos das malhas instanciadas
  console.log('instanced', await js(`(()=>{let tris=0;const rows=[];__baoba.G.scene.traverse(o=>{if(!o.isInstancedMesh||!o.count)return;const g=o.geometry;const t=(g.index?g.index.count:g.attributes.position.count)/3*o.count;tris+=t;rows.push(o.count+'x'+Math.round(t/o.count));});return {meshes:rows.join(' '),tris:Math.round(tris)};})()`));
  const spots = [['glade', 0, 6], ['trail', -3.5, -8], ['stream', -3.5, -12.5], ['alcove', 7, -32], ['corrupt', 2.5, -27], ['arena', 0, -50]];
  for (const [name, x, z] of spots) {
    await js(`(()=>{const B=__baoba;B.G.player.hp=1e6;B.G.player.pos.set(${x},0,${z});B.advance(1.2);})()`);
    await shot(name);
  }
  // Arena restaurada (ondas da libertação)
  await js(`(()=>{const B=__baoba;B.world.restoreAll();B.advance(4);})()`);
  await shot('arena-freed');
  await js(`(()=>{const B=__baoba;const a=B.world.arena;B.G.player.pos.set(0,0,-50);B.advance(1.2);})()`);
  await shot('mushrooms');
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(-3.5,0,-12.5);B.advance(1.2);})()`);
  await shot('stream-freed');
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(0,0,6);B.advance(1.2);})()`);
  await shot('glade-freed');
  // Floresta com a câmera afastada (roda do mouse até o zoom máximo)
  await js(`(()=>{const B=__baoba;const c=document.getElementById('game');for(let i=0;i<12;i++){c.dispatchEvent(new WheelEvent('wheel',{deltaY:100}));B.advance(1/60);}B.G.player.pos.set(-2,0,-4);B.advance(1.5);})()`);
  await shot('forest');
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(0,0,-62);B.advance(1.5);})()`);
  await shot('sumauma');
  // Vida baixa: a cor escoa
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(-2,0,-4);B.G.player.hp=8;B.advance(1.5);})()`);
  await shot('lowhp');
  const drain = await js(`__baoba.grade.uniforms.uDrain.value`);
  if (drain < 0.4) throw new Error('Low HP did not drain the color: ' + drain);
  await js(`(()=>{const B=__baoba;B.G.player.hp=1e6;})()`);
  // Luta contra o chefe: filtro tenso (Mula, no terreiro do Sertão Velho)
  await js(`(()=>{const B=__baoba;B.startMula();B.hold=true;B.advance(1);const a=B.world.arena;B.G.player.pos.set(a.x,0,a.z+a.r-3);B.G.player.target=B.G.boss;B.G.player.hp=1e6;B.advance(10);})()`);
  await shot('boss');
  const danger = await js(`__baoba.grade.uniforms.uDanger.value`);
  if (danger < 0.2) throw new Error('Boss fight did not raise the danger grade: ' + danger);
  console.log('grade', { drain, danger });
  if (errors.length) throw new Error('Page errors: ' + errors.join('\n'));
} finally {
  ws.close();
  proc.kill();
}
