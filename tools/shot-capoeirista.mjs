// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências), percorre
// visualizador e jogo com __baoba.advance e grava capturas em Evidence/capoeirista-*.png.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9333;
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/capoeirista-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const key = (code, type) => js(`window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true}))`);

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: page });
for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!document.getElementById('btnStart')?.disabled`)) break; } catch {} }
await shot('title');

await js(`document.getElementById('btnLutador').click()`); await shot('studio');
await js(`document.getElementById('studioClip').value='combo0';document.getElementById('studioClip').onchange();document.getElementById('studioPause').click();document.getElementById('studioTime').value=String(.22/.57);document.getElementById('studioTime').oninput()`);
await shot('studio-martelo');
await js(`document.getElementById('studioClose').click()`);

await js(`document.getElementById('btnStart').click()`); await js(`__baoba.advance(1.5)`); await shot('game-idle');
await key('KeyW', 'keydown'); await js(`__baoba.advance(.6)`); await shot('game-run'); await key('KeyW', 'keyup');
await key('KeyJ', 'keydown'); await js(`__baoba.advance(.16)`); await key('KeyJ', 'keyup'); await shot('game-martelo');
// Boss framing: enter the clearing (gate open) and let the encounter start.
await js(`(()=>{const B=__baoba; B.prog.gate=true; B.prog.kills=3; B.prog.vestigio=true; const a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3); B.G.player.target=B.G.boss;})()`);
// The encounter cinematic plays first; skip it to test the fight framing.
await js(`__baoba.advance(.2); __baoba.cine.skip(); __baoba.advance(3.5)`); await shot('boss');
// Melee range: the boss has approached; frame should be close.
await js(`(()=>{const B=__baoba; const b=B.G.boss.pos; B.G.player.pos.set(b.x, 0, b.z + 3.2);})()`); await js(`__baoba.advance(1.2)`); await shot('boss-melee');
// Colossal stress test: same boss scaled to 10 m (test only, not saved).
await js(`(()=>{const b=__baoba.G.boss; const k=10/(b.height||3.4); b.rig.root.scale.multiplyScalar(k); b.height=10;})()`);
await js(`__baoba.advance(2.5)`); await shot('boss-colossal');
const state = await js(`({hp: __baoba.G.player.hp, alive: __baoba.G.player.alive, pos: __baoba.G.player.pos.toArray().map(v=>+v.toFixed(2)), skinned: __baoba.G.player.rig.skinned, clips: [...__baoba.G.player.rig.clips.keys()]})`);
console.log('state', JSON.stringify(state));
console.log('errors', JSON.stringify(errors));
ws.close(); proc.kill();
