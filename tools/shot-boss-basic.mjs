// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências) e testa o
// ataque básico dos chefes (Curupira e Mula): golpe sem aviso (sem marcação no chão), dano exato, esquiva e
// janela de punição.
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
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/boss-basic-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const near = `const B=__baoba,P=B.G.player,b=B.G.boss; P.hp=100; P.alive=true; P.dodge=null; P.action=null; P.cd.dodge=0; P.target=b;
  P.pos.set(b.pos.x, 0, b.pos.z + b.radius + 1.4); b.basicCd=0;`;

// Ataque básico de um chefe já em luta (cfg = CURUPIRA ou MULA via config embutido no jogo).
async function basicCase(name, cfg) {
  const out = {};
  // 1. Aproximando com o herói perto: golpe sem marcação no chão, depois dano exato.
  await js(`(()=>{${near} b.setState('approach');})()`);
  await js(`__baoba.advance(.05)`); out.state = await js(`__baoba.G.boss.state`);
  out.telegraphs = await js(`__baoba.G.tg.list.filter(t => !t.dead).length`);
  await js(`__baoba.advance(${cfg.windup * .6})`); await sleep(300); await shot(`${name}-windup`);
  await js(`__baoba.advance(${cfg.windup * .4 + .05})`); await sleep(300); await shot(`${name}-hit`);
  out.hp = await js(`__baoba.G.player.hp`);
  await js(`__baoba.advance(${cfg.hit + .05})`); out.after = await js(`__baoba.G.boss.state`);
  // 2. Esquiva antes do impacto: sem dano.
  await js(`(()=>{${near} b.setState('approach');})()`);
  await js(`__baoba.advance(.05)`);
  await js(`__baoba.advance(${cfg.windup - .25})`);
  await js(`(()=>{const P=__baoba.G.player; P.startDodge(P.pos.clone().set(0, 0, 1));})()`);
  await js(`__baoba.advance(.45)`); out.dodged = await js(`__baoba.G.player.hp`);
  // 3. Recuperação: nada na 1ª metade (janela de punição), garrada/patada na 2ª.
  await js(`(()=>{${near} b.setState('recover');})()`);
  await js(`__baoba.advance(${cfg.recover * .45})`); out.recoverEarly = await js(`__baoba.G.boss.state`);
  await js(`__baoba.advance(${cfg.recover * .1})`); out.recoverLate = await js(`__baoba.G.boss.state`);
  const fails = [];
  if (out.state !== 'basicWarn') fails.push('não atacou de perto: ' + out.state);
  if (out.telegraphs) fails.push(`${out.telegraphs} marcação(ões) no chão no ataque básico`);
  if (100 - out.hp !== cfg.dmg) fails.push(`dano ${100 - out.hp}, esperado ${cfg.dmg}`);
  if (out.after === 'basicWarn' || out.after === 'basicHit') fails.push('não voltou ao ciclo: ' + out.after);
  if (out.dodged !== 100) fails.push('esquiva levou dano: ' + (100 - out.dodged));
  if (out.recoverEarly !== 'recover') fails.push('atacou na janela de punição: ' + out.recoverEarly);
  if (out.recoverLate !== 'basicWarn') fails.push('não atacou na 2ª metade da recuperação: ' + out.recoverLate);
  return { ...out, fails };
}

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
const checks = {};
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');
  // Curupira: entra na clareira, pula a cinemática.
  await js(`document.getElementById('btnStart').click(); __baoba.hold = true`);
  await js(`(()=>{const B=__baoba; B.prog.gate=true; B.prog.kills=3; B.prog.vestigio=true; const a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3);})()`);
  await js(`__baoba.advance(.2); __baoba.cine.skip(); __baoba.advance(3)`);
  checks.curupira = await basicCase('curupira', { windup: 0.6, hit: 0.4, dmg: 12, recover: 2 });     // CURUPIRA.basic, CURUPIRA.recover
  // Mula: desafio pelo botão da tela de título.
  await js(`__baoba.startMula()`);
  await js(`(()=>{const B=__baoba, a=B.world.arena; B.G.player.pos.set(a.x, 0, a.z + a.r - 3);})()`);
  await js(`__baoba.advance(.2); __baoba.cine.skip(); __baoba.advance(2.5)`);
  checks.mula = await basicCase('mula', { windup: 0.55, hit: 0.45, dmg: 14, recover: 1.8 });           // MULA.basic, MULA.recover
} finally {
  console.log('checks', JSON.stringify(checks));
  console.log('errors', JSON.stringify(errors));
  ws.close(); proc.kill(); await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
const fails = Object.entries(checks).flatMap(([k, v]) => (v.fails || []).map(f => `${k}: ${f}`));
console.log(fails.length ? 'BOSS_BASIC FAIL ' + fails.join('; ') : 'BOSS_BASIC PASS');
if (errors.length || fails.length) process.exit(1);
