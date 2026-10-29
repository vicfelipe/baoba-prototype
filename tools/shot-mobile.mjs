// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências) e testa o jogo no celular:
// tela deitada com toque (joystick, botões de ação, pausa, toque pula cinemática, textos sem teclas), celular em pé
// (aviso de girar e pausa automática) e, por fim, o PC sem nenhum controle de toque.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9338;
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
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/mobile-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await touch('touchEnd'); };
const center = sel => js(`(()=>{const r=document.querySelector('${sel}').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`);
const phone = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true, screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
async function load() {
  await send('Page.navigate', { url: page });
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) return; } catch {} }
  throw new Error('Game load timed out');
}

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const checks = {}, fails = [];
const expect = (name, ok, value) => { checks[name] = value; if (!ok) fails.push(`${name}=${JSON.stringify(value)}`); };
try {
  // ---------- Celular deitado (844×390, toque) ----------
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await phone(844, 390);
  await load();
  expect('touchMode', await js(`document.body.classList.contains('touch')`), true);
  expect('rotateHiddenLandscape', (await js(`getComputedStyle(document.getElementById('rotate')).display`)) === 'none', 'none');
  const title = await js(`(()=>{const s=document.getElementById('title'), b=document.getElementById('btnStart').getBoundingClientRect();
    return { scroll: s.scrollHeight - s.clientHeight, startBottom: Math.round(b.bottom), keysHidden: getComputedStyle(document.querySelector('.controls.key-only')).display === 'none' };})()`);
  expect('titleKeysHidden', title.keysHidden, title);
  await shot('title');

  await js(`document.getElementById('btnStart').click(); __baoba.hold = true; __baoba.advance(4)`);
  await shot('play');
  const obj = await js(`document.getElementById('objList').textContent`);
  expect('objectivesNoKeys', !/\(F\)/.test(obj), obj);

  // Joystick: arrastar 80 px para a direita na metade esquerda move o herói para +X.
  const x0 = await js(`__baoba.G.player.pos.x`);
  await touch('touchStart', 150, 280); await touch('touchMove', 190, 280); await touch('touchMove', 230, 280);
  const stick = await js(`[__baoba.G.player.pos.x, document.getElementById('stickBase').classList.contains('on')]`);
  await js(`__baoba.advance(1)`);
  await shot('stick');
  const x1 = await js(`__baoba.G.player.pos.x`);
  await touch('touchEnd');
  await js(`__baoba.advance(.1)`);
  const x2 = await js(`__baoba.G.player.pos.x`); await js(`__baoba.advance(.5)`);
  const x3 = await js(`__baoba.G.player.pos.x`);
  expect('stickMoves', x1 - x0 > 2 && stick[1], { x0, x1, baseOn: stick[1] });
  expect('stickReleases', Math.abs(x3 - x2) < 0.05, { x2, x3 });

  // Botões: golpe, esquiva e pausa.
  await js(`__baoba.advance(1)`);
  await tap(...await center('.slot[data-skill="combo"]'));
  await js(`__baoba.advance(1/60)`);
  expect('attackButton', await js(`__baoba.G.player.action?.kind === 'combo' || !!__baoba.G.player.action`), await js(`__baoba.G.player.action?.kind || null`));
  await js(`__baoba.advance(1.5)`);
  await tap(...await center('.slot[data-skill="dodge"]'));
  await js(`__baoba.advance(1/60)`);
  expect('dodgeButton', await js(`__baoba.G.player.cd.dodge > 0`), await js(`__baoba.G.player.cd.dodge`));
  await tap(...await center('#btnPause'));
  await js(`__baoba.advance(1/60)`);
  expect('pauseButton', (await js(`__baoba.mode`)) === 'pause', await js(`__baoba.mode`));
  await shot('pause');
  await js(`document.querySelector('[data-act="resume"]').click(); __baoba.advance(.1)`);

  // Em pé: aviso de girar e pausa automática.
  await phone(390, 844); await sleep(300);
  await js(`__baoba.advance(.1)`);
  const portrait = await js(`[getComputedStyle(document.getElementById('rotate')).display, __baoba.mode]`);
  expect('portraitBlocks', portrait[0] === 'grid' && portrait[1] === 'pause', portrait);
  await shot('portrait');
  await phone(844, 390); await sleep(300);
  await js(`document.querySelector('[data-act="resume"]').click(); __baoba.advance(.1)`);
  expect('landscapeResumes', (await js(`__baoba.mode`)) === 'play', await js(`__baoba.mode`));

  // Cinemática do chefe: um toque na tela pula.
  await js(`(()=>{const B=__baoba; B.prog.gate=true; B.prog.kills=B.G.fragments.length; B.prog.vestigio=true; const a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3);})()`);
  await js(`__baoba.advance(.3)`);
  const cineOn = await js(`__baoba.mode`);
  await shot('cinematic');
  await tap(520, 160);
  await js(`__baoba.advance(1/60)`);
  expect('tapSkipsCinematic', cineOn === 'cinematic' && !(await js(`__baoba.cine.active`)), cineOn);
  await js(`__baoba.advance(3)`);
  await shot('boss');

  // ---------- PC (1280×720, mouse): nada de toque ----------
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await load();
  const pc = await js(`(()=>{const sb=document.getElementById('skillbar').getBoundingClientRect();
    return { touch: document.body.classList.contains('touch'), touchUi: getComputedStyle(document.getElementById('touchUi')).display,
      rotate: getComputedStyle(document.getElementById('rotate')).display, keys: getComputedStyle(document.querySelector('.controls.key-only')).display,
      skillbarCenter: Math.round(sb.x + sb.width / 2) };})()`);
  expect('pcNoTouch', !pc.touch && pc.touchUi === 'none' && pc.rotate === 'none' && pc.keys !== 'none', pc);
  await shot('pc-title');
  await js(`document.getElementById('btnStart').click(); __baoba.hold = true; __baoba.advance(4)`);
  const pcPlay = await js(`(()=>{const sb=document.getElementById('skillbar').getBoundingClientRect(); return { skillbarCenter: Math.round(sb.x + sb.width / 2), bottom: Math.round(innerHeight - sb.bottom) };})()`);
  expect('pcSkillbarCentered', Math.abs(pcPlay.skillbarCenter - 640) <= 2 && pcPlay.bottom === 30, pcPlay);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
  const p0 = await js(`__baoba.G.player.pos.x`); await js(`__baoba.advance(1)`);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });
  const p1 = await js(`__baoba.G.player.pos.x`);
  expect('pcKeyboardMoves', p1 - p0 > 2, { p0, p1 });
  await shot('pc-play');
} finally {
  console.log('checks', JSON.stringify(checks));
  console.log('errors', JSON.stringify(errors));
  ws.close(); proc.kill(); await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
console.log(fails.length ? 'MOBILE FAIL ' + fails.join('; ') : 'MOBILE PASS');
if (errors.length || fails.length) process.exit(1);
