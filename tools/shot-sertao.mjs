// Fase 2 (Sertão Velho, doc 24): abre web/dist/index.html no Chrome headless (DevTools Protocol, sem
// dependências), escolhe a fase na tela de título, fotografa o cenário e joga a fase inteira com
// __baoba.advance: mortos saindo da cova, golpe em cone, explosão do morto em brasa (dentro e fora do
// círculo), cordel, portão, cinemática da Mula, vitória, amanhecer, memória final e volta à Mata Viva.
// Uso: node tools/shot-sertao.mjs  →  Evidence/sertao-*.png e Evidence/sertao-browser-checks.json
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9347;
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/sertao-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const check = (ok, what, data) => { if (!ok) throw new Error(what + ' ' + JSON.stringify(data)); console.log('ok', what); };
const out = {};

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');

  // Tela de título: escolher a fase troca título, mundo e chefe
  await js(`document.querySelector('.level-pick [data-level="sertao"]').click()`);
  out.title = await js(`({level:__baoba.level,h1:document.getElementById('titleName').textContent,sertao:__baoba.worlds.sertao.root.visible,mata:__baoba.worlds.mata.root.visible,boss:__baoba.G.boss.name,mem:document.getElementById('memLabel').textContent})`);
  check(out.title.level === 'sertao' && out.title.sertao && !out.title.mata && out.title.boss === 'Mula sem Cabeça' && out.title.h1 === 'A Noite do Sertão', 'title picks Sertão', out.title);
  await shot('title');

  await js(`(()=>{const B=__baoba;B.hold=true;document.getElementById('btnStart').click();B.advance(0.5);})()`);
  out.start = await js(`({ltr:__baoba.world.spawn.trail.x<__baoba.world.arena.x-60,mula:+__baoba.G.boss.pos.x.toFixed(1),mode:__baoba.mode,n:__baoba.G.fragments.length,kinds:__baoba.G.fragments.map(f=>f.kind),states:__baoba.G.fragments.map(f=>f.state),targetable:__baoba.G.fragments.some(f=>f.targetable),area:document.getElementById('areaName').textContent,obj:document.getElementById('objectives').textContent})`);
  check(out.start.ltr && out.start.mula === 32 && out.start.mode === 'play' && out.start.n === 5 && out.start.states.every(s => s === 'buried') && !out.start.targetable, 'level starts with 5 buried undead', out.start);
  await shot('plaza');

  // Cenário (HUD escondido), herói imortal e longe dos mortos
  await js(`(()=>{const s=document.createElement('style');s.id='nohud';s.textContent='#hud,.hud,#fxLayer{display:none!important}';document.head.appendChild(s);})()`);
  console.log('instanced', await js(`(()=>{let tris=0;__baoba.worlds.sertao.root.traverse(o=>{if(!o.isInstancedMesh||!o.count)return;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3*o.count;});return Math.round(tris);})()`));
  for (const [name, x, z] of [['arraial', -58, -32], ['road', -38, -27], ['cemetery', -26, -33], ['gate', 13.5, -30], ['arena', 28, -30], ['casarao', 32, -37]]) {
    await js(`(()=>{const B=__baoba;B.G.player.hp=1e6;B.G.player.pos.set(${x},0,${z});B.advance(1.2);})()`);
    await shot(name);
  }
  await js(`document.getElementById('nohud').remove()`);

  // Mortos saem da cova quando o herói chega perto
  await js(`(()=>{const B=__baoba;B.startLevel('sertao');B.hold=true;B.advance(0.2);B.G.player.pos.set(-47,0,-27.5);B.advance(0.1);})()`);
  out.rise = { begin: await js(`({state:__baoba.G.fragments[0].state,targetable:__baoba.G.fragments[0].targetable})`) };
  await js(`__baoba.advance(0.6)`); await shot('rise');
  await js(`__baoba.advance(1.0)`);
  out.rise.end = await js(`({state:__baoba.G.fragments[0].state,targetable:__baoba.G.fragments[0].targetable,y:+__baoba.G.fragments[0].model.rise.position.y.toFixed(3)})`);
  check(out.rise.begin.state === 'rise' && !out.rise.begin.targetable && out.rise.end.targetable && out.rise.end.state !== 'rise', 'undead rises from the grave', out.rise);

  // Golpe em cone: 16 de dano no herói parado (Capoeirista sem armadura)
  await js(`(()=>{const p=__baoba.G.player;p.hp=100;})()`);
  let warnShot = false;
  for (let i = 0; i < 40; i++) {
    await js(`__baoba.advance(.2)`);
    const s = await js(`({st:__baoba.G.fragments[0].state,hp:__baoba.G.player.hp})`);
    if (s.st === 'warn' && !warnShot) { warnShot = true; await js(`__baoba.advance(.5)`); await shot('cone'); }
    if (s.hp < 100) { out.cone = s; break; }
  }
  check(out.cone && out.cone.hp === 84, 'cone hit deals 16', out.cone);
  await js(`(()=>{const f=__baoba.G.fragments[0];f.takeHit(1000,{from:__baoba.G.player.pos,heavy:true,actionId:7001});__baoba.advance(0.4);})()`);
  await shot('collapse');
  await js(`__baoba.advance(1.5)`);
  out.kill = await js(`({kills:__baoba.prog.kills,visible:__baoba.G.fragments[0].model.root.visible})`);
  check(out.kill.kills === 1 && !out.kill.visible, 'undead collapses and sinks', out.kill);

  // Morto em brasa: explode depois de cair; dentro do círculo leva 18, fora não leva nada
  const brasa = async (i, px, pz, label, away = null) => {
    await js(`(()=>{const B=__baoba,f=B.G.fragments[${i}];B.G.player.pos.set(${px},0,${pz});B.advance(1.8);f.takeHit(1000,{from:B.G.player.pos,heavy:true,actionId:${7100 + i}});B.G.player.hp=100;${away ? `B.G.player.pos.set(${away[0]},0,${away[1]});` : ''}B.advance(0.9);})()`);
    const mid = await js(`({tg:!!__baoba.G.fragments[${i}].blast?.tg,hp:__baoba.G.player.hp})`);
    if (label) await shot(label);
    await js(`__baoba.advance(1.0)`);
    return { mid, hp: await js(`__baoba.G.player.hp`), blast: await js(`!!__baoba.G.fragments[${i}].blast`) };
  };
  out.brasaIn = await brasa(2, -23.4, -33.1, 'blast');
  check(out.brasaIn.mid.tg && out.brasaIn.hp === 82 && !out.brasaIn.blast, 'ember undead blast deals 18 inside the circle', out.brasaIn);
  out.brasaOut = await brasa(4, -3.2, -29.5, null, [2.5, -29]);
  check(out.brasaOut.mid.tg && out.brasaOut.hp === 100, 'stepping out of the circle avoids the blast', out.brasaOut);

  // Restantes, cordel e portão
  await js(`(()=>{const B=__baoba;for(const f of B.G.fragments)if(f.alive){f.state='chase';f.targetable=true;f.takeHit(1000,{from:B.G.player.pos,heavy:true,actionId:7200+f.index});}B.advance(2);})()`);
  await js(`(()=>{const B=__baoba;const v=B.world.vestigioPos;B.G.player.pos.set(v.x+1,0,v.z);B.advance(0.2);B.G.input.hits.add('KeyF');B.advance(0.1);B.advance(2.2);})()`);
  out.gate = await js(`({kills:__baoba.prog.kills,vestigio:__baoba.prog.vestigio,gate:__baoba.prog.gate,open:__baoba.world.gateOpen,obj:document.getElementById('objectives').textContent})`);
  check(out.gate.kills === 5 && out.gate.vestigio && out.gate.gate && out.gate.open, 'cordel read and iron gate opened', out.gate);
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(13.5,0,-30);B.advance(0.6);})()`);
  await shot('gate-open');

  // Terreiro: cinemática da Mula e luta
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(22.5,0,-30);B.G.player.hp=1e6;B.advance(0.6);})()`);
  out.encounter = await js(`({mode:__baoba.mode,area:__baoba.G.boss.card.area})`);
  check(out.encounter.mode === 'cinematic' && out.encounter.area === 'Chefe · Terreiro do Casarão', 'Mula encounter cinematic in the terreiro', out.encounter);
  await js(`__baoba.advance(4.2)`); await shot('cine-name');
  await js(`__baoba.advance(3.5)`);
  out.fight = await js(`({mode:__baoba.mode,targetable:__baoba.G.boss.targetable,locked:__baoba.world.arenaLocked})`);
  check(out.fight.mode === 'play' && out.fight.targetable && out.fight.locked, 'fight starts with the terreiro locked', out.fight);
  for (let i = 0; i < 40; i++) {
    await js(`__baoba.advance(.25)`);
    if (await js(`['kickWarn','chargeWarn','stompWarn'].includes(__baoba.G.boss.state)`)) { await js(`__baoba.advance(.5)`); break; }
  }
  await shot('fight');

  // Vitória: a chama se apaga, amanhece, a memória do sertão aparece e encerra a fase
  await js(`(()=>{const b=__baoba.G.boss;b.setState('idle');b.takeHit(100000,{interrupts:false,heavy:true,actionId:7300});__baoba.advance(3);})()`);
  out.dawn = { mid: await js(`({dawn:+__baoba.world.dawn.toFixed(2),memory:__baoba.world.finalMemory.visible,victory:__baoba.G.player.victory,obj:document.getElementById('objectives').textContent})`) };
  await shot('dawn-start');
  await js(`__baoba.advance(5)`);
  out.dawn.end = await js(`({dawn:__baoba.world.dawn,bg:'#'+__baoba.G.scene.background.getHexString()})`);
  check(out.dawn.mid.memory && !out.dawn.mid.victory && out.dawn.mid.dawn > 0.2 && out.dawn.end.dawn === 1, 'sunrise after the Mula and memory shown', out.dawn);
  await js(`(()=>{const B=__baoba;const a=B.world.arena;B.G.player.pos.set(a.x+1.5,0,a.z+6);B.advance(1.5);})()`);
  await shot('dawn');
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(-30,0,-28);B.advance(1.5);})()`);
  await shot('dawn-road');
  await js(`(()=>{const B=__baoba;const m=B.world.finalMemory.position;B.G.player.pos.set(m.x+1,0,m.z);B.advance(0.2);B.G.input.hits.add('KeyF');B.advance(0.1);})()`);
  await sleep(1500);
  await js(`__baoba.advance(0.2)`);
  out.complete = await js(`({mode:__baoba.mode,kicker:document.getElementById('completeKicker').textContent,quote:document.getElementById('completeQuote').textContent})`);
  check(out.complete.mode === 'complete' && out.complete.kicker === 'Amanheceu no sertão', 'level complete screen', out.complete);
  await shot('complete');

  // Volta à Mata Viva: mundo, inimigos e chefe da fase 1
  await js(`(()=>{const B=__baoba;B.selectLevel('mata');B.startLevel('mata');B.advance(0.3);})()`);
  out.mata = await js(`({level:__baoba.level,boss:__baoba.G.boss.name,n:__baoba.G.fragments.length,kind:__baoba.G.fragments[0].kind,state:__baoba.G.fragments[0].state,sertao:__baoba.worlds.sertao.root.visible,mata:__baoba.worlds.mata.root.visible,bg:'#'+__baoba.G.scene.background.getHexString(),mode:__baoba.mode})`);
  check(out.mata.boss === 'Curupira corrompido' && out.mata.n === 3 && out.mata.kind === 'silencio' && out.mata.state === 'idle' && !out.mata.sertao && out.mata.mata && out.mata.bg === '#86c4a8' && out.mata.mode === 'play', 'Mata Viva still loads as phase 1', out.mata);
  await shot('back-to-mata');

  out.errors = errors;
  fs.writeFileSync(new URL('Evidence/sertao-browser-checks.json', root), JSON.stringify(out, null, 2));
  if (errors.length) throw new Error('Page errors: ' + errors.join('\n'));
  console.log('PASS: level pick, buried undead, rise, cone 16, collapse, ember blast in/out, cordel, gate, Mula encounter, fight, sunrise, memory, complete, back to Mata; errors []');
} finally { ws.close(); proc.kill(); }
