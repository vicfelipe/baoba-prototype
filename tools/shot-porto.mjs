// Fase 3 (Porto de Santos, doc 25): abre web/dist/index.html no Chrome headless (DevTools Protocol, sem
// dependências), escolhe a fase na tela de título, fotografa o cenário e joga a fase inteira com
// __baoba.advance: afogados subindo do mar, cuspe da craca, carta da garrafa, corrente do trapiche, trapiche
// desabando, cinemática da dupla, duas barras, ressaca (dano, empurrão e queda no mar), maré alta, Canto da Iara
// (interrompido e completo), rabada do Ipupiara, Iara liberta, Ipupiara vencido, céu limpo, memória e conclusão.
// Uso: node tools/shot-porto.mjs  →  Evidence/porto-*.png e Evidence/porto-browser-checks.json
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9349;
const only = process.argv[2] || 'all';   // 'scenery' só fotografa o cenário
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/porto-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const check = (ok, what, data) => { if (!ok) throw new Error(what + ' ' + JSON.stringify(data)); console.log('ok', what); };
const out = {};
// Congela os dois chefes (estado sem efeito) para medir uma mecânica do mar de cada vez
const FREEZE = `__baoba.G.boss.seaT=-60;for(const p of __baoba.G.boss.parts){if(p.tg)__baoba.G.tg.remove(p.tg);p.tg=null;p.cast=null;p.charge=null;p.state='playerDown';}`;
const DUO = `__baoba.G.boss`;

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
try {
  await send('Page.navigate', { url: page });
  let ready = false;
  for (let i = 0; i < 120; i++) { await sleep(500); try { if (await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)) { ready = true; break; } } catch {} }
  if (!ready) throw new Error('Game load timed out');

  // Tela de título: escolher a fase troca título, mundo e chefe
  await js(`document.querySelector('.level-pick [data-level="porto"]').click()`);
  out.title = await js(`({level:__baoba.level,h1:document.getElementById('titleName').textContent,porto:__baoba.worlds.porto.root.visible,mata:__baoba.worlds.mata.root.visible,sertao:__baoba.worlds.sertao.root.visible,boss:__baoba.G.boss.name,mem:document.getElementById('memLabel').textContent})`);
  check(out.title.level === 'porto' && out.title.porto && !out.title.mata && !out.title.sertao && out.title.boss === 'Iara e Ipupiara' && out.title.h1 === 'A Ressaca do Porto', 'title picks Porto de Santos', out.title);
  await shot('title');

  await js(`(()=>{const B=__baoba;B.hold=true;document.getElementById('btnStart').click();B.advance(0.5);})()`);
  out.start = await js(`({rtl:__baoba.world.spawn.trail.x>__baoba.world.arena.x+60,mode:__baoba.mode,n:__baoba.G.fragments.length,kinds:__baoba.G.fragments.map(f=>f.kind),states:__baoba.G.fragments.map(f=>f.state),area:document.getElementById('areaName').textContent})`);
  check(out.start.rtl && out.start.mode === 'play' && out.start.n === 5 && out.start.states.join() === 'buried,buried,buried,idle,idle', 'level starts on the quay with 3 drowned + coral + craca', out.start);
  await shot('quay');

  // Cenário (HUD escondido), herói imortal
  await js(`(()=>{const s=document.createElement('style');s.id='nohud';s.textContent='#hud,.hud,#fxLayer{display:none!important}';document.head.appendChild(s);})()`);
  console.log('instanced tris', await js(`(()=>{let tris=0;__baoba.worlds.porto.root.traverse(o=>{if(!o.isInstancedMesh||!o.count)return;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3*o.count;});return Math.round(tris);})()`));
  for (const [name, x, z] of [['cais', 50, -31], ['canal', 27, -30], ['jardim', 15, -31], ['praia', 3, -32], ['ponta', -14, -30], ['trapiche', -24, -30], ['deque', -40, -28]]) {
    await js(`(()=>{const B=__baoba;for(const f of B.G.fragments){f.state='dead';f.alive=false;f.model.root.visible=false;}B.world.gateOpen=true;B.G.player.hp=1e6;B.G.player.pos.set(${x},0,${z});B.advance(1.2);})()`);
    await shot(name);
  }
  await js(`document.getElementById('nohud').remove()`);
  if (only === 'scenery') throw new Error('SCENERY_ONLY');

  // Afogado sobe do mar pela beira do cais quando o herói chega perto
  await js(`(()=>{const B=__baoba;B.startLevel('porto');B.hold=true;B.advance(0.2);B.G.player.pos.set(44,0,-28);B.advance(0.1);})()`);
  out.rise = { begin: await js(`({state:__baoba.G.fragments[0].state,targetable:__baoba.G.fragments[0].targetable})`) };
  await js(`__baoba.advance(0.6)`); await shot('afogado-rise');
  await js(`__baoba.advance(1.0)`);
  out.rise.end = await js(`({state:__baoba.G.fragments[0].state,targetable:__baoba.G.fragments[0].targetable,name:__baoba.G.fragments[0].name})`);
  check(out.rise.begin.state === 'rise' && !out.rise.begin.targetable && out.rise.end.targetable && out.rise.end.name === 'Afogado do cais', 'drowned stevedore climbs out of the sea', out.rise);
  // golpe em cone: 15
  await js(`(()=>{const p=__baoba.G.player;p.hp=100;})()`);
  for (let i = 0; i < 40; i++) {
    await js(`__baoba.advance(.2)`);
    const s = await js(`({st:__baoba.G.fragments[0].state,hp:__baoba.G.player.hp})`);
    if (s.hp < 100) { out.cone = s; break; }
  }
  check(out.cone && out.cone.hp === 85, 'drowned hook cone deals 15', out.cone);
  await js(`(()=>{const B=__baoba;for(const f of B.G.fragments.slice(0,3)){f.state='chase';f.targetable=true;f.takeHit(1000,{from:B.G.player.pos,heavy:true,actionId:8000+f.index});}B.advance(2);})()`);

  // Craca: de longe para e cospe; o círculo sob o herói dá 14
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(3,0,-32);B.G.player.hp=100;B.advance(0.1);})()`);
  for (let i = 0; i < 40; i++) {
    await js(`__baoba.advance(.2)`);
    const s = await js(`({st:__baoba.G.fragments[4].state,d:Math.hypot(__baoba.G.fragments[4].pos.x-3,__baoba.G.fragments[4].pos.z+32)})`);
    if (s.st === 'spit') { out.spit = { start: s }; break; }
  }
  await js(`__baoba.advance(.6)`); await shot('craca-spit');
  await js(`__baoba.advance(1.0)`);
  out.spit.hp = await js(`__baoba.G.player.hp`);
  check(out.spit.start && out.spit.start.d > 4 && out.spit.hp === 86, 'craca spits from range for 14', out.spit);
  await js(`(()=>{const B=__baoba;for(const f of B.G.fragments)if(f.alive){f.state='chase';f.targetable=true;f.takeHit(1000,{from:B.G.player.pos,heavy:true,actionId:8100+f.index});}B.advance(1);})()`);
  await shot('coral-shatter');
  await js(`__baoba.advance(1.5)`);

  // Carta da garrafa e corrente do trapiche
  await js(`(()=>{const B=__baoba;const v=B.world.vestigioPos;B.G.player.pos.set(v.x+1,0,v.z);B.advance(0.2);B.G.input.hits.add('KeyF');B.advance(0.1);B.advance(2.2);})()`);
  out.gate = await js(`({kills:__baoba.prog.kills,vestigio:__baoba.prog.vestigio,gate:__baoba.prog.gate,open:__baoba.world.gateOpen})`);
  check(out.gate.kills === 5 && out.gate.vestigio && out.gate.gate && out.gate.open, 'letter read and pier chain dropped', out.gate);
  await shot('letter');

  // Trapiche: entra no deque, o píer desaba, cinemática e luta com duas barras
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(-28,0,-30);B.advance(0.4);B.G.player.pos.set(-33.6,0,-30);B.G.player.hp=100;B.advance(0.4);})()`);
  out.encounter = await js(`({mode:__baoba.mode,area:${DUO}.card.area,broken:__baoba.world.pierBroken})`);
  check(out.encounter.mode === 'cinematic' && out.encounter.area === 'Chefe · Deque do Trapiche' && out.encounter.broken, 'duo encounter; the pier collapses', out.encounter);
  await js(`__baoba.advance(2.2)`); await shot('cine-emerge');
  await js(`__baoba.advance(2.2)`); await shot('cine-name');
  await js(`__baoba.advance(3.2)`);
  out.fight = await js(`({mode:__baoba.mode,parts:${DUO}.parts.map(p=>[p.name,p.targetable,p.hp]),bars:[...document.querySelectorAll('#bossBar .bar.boss')].map(b=>!b.classList.contains('hidden')),locked:__baoba.world.arenaLocked,enemies:__baoba.G.enemies().filter(e=>e.isBoss).length,ipuY:+${DUO}.ipu.pos.y.toFixed(2)})`);
  check(out.fight.mode === 'play' && out.fight.parts.every(p => p[1]) && out.fight.bars.every(Boolean) && out.fight.locked && out.fight.enemies === 2 && out.fight.ipuY === 0, 'fight: both targetable, two boss bars, deck locked', out.fight);
  for (let i = 0; i < 30; i++) { await js(`__baoba.advance(.25)`); if (await js(`!!__baoba.G.tg.list.length`)) { await js(`__baoba.advance(.4)`); break; } }
  await shot('fight');

  // Ressaca no meio do deque: 18 e empurrão, sem cair
  const center = await js(`({x:__baoba.world.arena.x,z:__baoba.world.arena.z,r:__baoba.world.arena.r})`);
  await js(`(()=>{const B=__baoba;${FREEZE}B.G.player.pos.set(${center.x}+2,0,${center.z}-2);B.G.player.hp=100;const R=Math.random;Math.random=()=>0.25;${DUO}.startWave();Math.random=R;B.advance(1.2);})()`);
  await shot('wave-warn');
  await js(`(()=>{const B=__baoba;B.advance(0.9);})()`);
  await shot('wave-crash');
  await js(`__baoba.advance(1.6)`);
  out.wave = await js(`({hp:__baoba.G.player.hp,x:+__baoba.G.player.pos.x.toFixed(2),adrift:__baoba.G.player.adrift})`);
  check(out.wave.hp === 82 && out.wave.x > center.x + 5.5 && !out.wave.adrift, 'ressaca deals 18 and pushes along the wave', out.wave);

  // Ressaca na borda: empurrado para fora do deque, cai no mar (12) e a corrente devolve
  await js(`(()=>{const B=__baoba;${FREEZE}B.G.player.pos.set(${center.x}+${center.r}-1.6,0,${center.z});B.G.player.hp=100;B.advance(3);const R=Math.random;Math.random=()=>0.25;${DUO}.seaT=-60;${DUO}.startWave();Math.random=R;B.advance(4.2);})()`);
  out.fall = { mid: await js(`({hp:__baoba.G.player.hp,swim:!!__baoba.G.player.swim,d:+Math.hypot(__baoba.G.player.pos.x-(${center.x}),__baoba.G.player.pos.z-(${center.z})).toFixed(2)})`) };
  await shot('overboard');
  await js(`__baoba.advance(2.2)`);
  out.fall.end = await js(`({hp:__baoba.G.player.hp,adrift:__baoba.G.player.adrift,d:+Math.hypot(__baoba.G.player.pos.x-(${center.x}),__baoba.G.player.pos.z-(${center.z})).toFixed(2)})`);
  check(out.fall.mid.swim && out.fall.mid.d > center.r && out.fall.end.hp === 70 && !out.fall.end.adrift && out.fall.end.d < center.r - 1, 'pushed off the deck: falls in the sea (18+12) and the current brings the hero back', out.fall);

  // Maré alta: no anel leva dano e anda devagar; no meio, nada
  await js(`(()=>{const B=__baoba;${FREEZE}${DUO}.seaT=-60;B.G.player.pos.set(${center.x},0,${center.z}-10);B.G.player.hp=100;${DUO}.startTide();B.advance(1.4);})()`);
  await shot('tide-warn');
  await js(`(()=>{const B=__baoba;B.advance(1.6);})()`);
  out.tide = { slow: await js(`__baoba.G.player.moveMul`) };
  await shot('tide-flood');
  await js(`__baoba.advance(2.0)`);
  out.tide.hp = await js(`__baoba.G.player.hp`);
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(${center.x},0,${center.z});B.G.player.hp=100;B.advance(1.5);})()`);
  out.tide.safe = await js(`({hp:__baoba.G.player.hp,mul:__baoba.G.player.moveMul})`);
  await js(`__baoba.advance(3)`);
  out.tide.gone = await js(`({tide:!!${DUO}.tide,mul:__baoba.G.player.moveMul})`);
  check(out.tide.slow === 0.6 && out.tide.hp <= 84 && out.tide.hp >= 72 && out.tide.safe.hp === 100 && !out.tide.gone.tide && out.tide.gone.mul === 1, 'tide: damage and slow on the rim, safe in the middle, then recedes', out.tide);

  // Canto da Iara: puxa para ela; a interrupção (Q) quebra a conjuração
  const songAt = `(()=>{const B=__baoba,I=${DUO}.iara;${FREEZE}${DUO}.seaT=-60;I.step=5;I.nextInCycle();})()`;
  await js(`(()=>{const B=__baoba,I=${DUO}.iara;B.G.player.hp=100;B.G.player.pos.set(${center.x},0,${center.z});})()`);
  await js(songAt);
  const d0 = await js(`Math.hypot(__baoba.G.player.pos.x-${DUO}.iara.pos.x,__baoba.G.player.pos.z-${DUO}.iara.pos.z)`);
  await js(`__baoba.advance(1.5)`);
  out.song = { cast: await js(`({state:${DUO}.iara.state,name:document.getElementById('castName').textContent,bar:!document.getElementById('castBar').classList.contains('hidden'),d:Math.hypot(__baoba.G.player.pos.x-${DUO}.iara.pos.x,__baoba.G.player.pos.z-${DUO}.iara.pos.z)})`), d0 };
  await shot('song');
  await js(`(()=>{const I=__baoba.G.boss.iara;I.takeHit(20,{interrupts:true,actionId:8500});__baoba.advance(0.2);})()`);
  out.song.after = await js(`({state:${DUO}.iara.state,hp:__baoba.G.player.hp})`);
  check(out.song.cast.state === 'cast' && out.song.cast.name === 'Canto da Iara' && out.song.cast.bar && out.song.cast.d < d0 - 1.5 && out.song.after.state === 'stagger' && out.song.after.hp === 100, 'Canto pulls toward the Iara; interrupt breaks it', out.song);
  // Canto completo perto da borda: 16 e arrastado para o mar
  await js(`(()=>{const B=__baoba,I=${DUO}.iara;const c=B.world.arena;B.G.player.hp=100;B.G.player.pos.set(c.x+(I.pos.x-c.x)*0.7,0,c.z+(I.pos.z-c.z)*0.7);})()`);
  await js(songAt);
  await js(`__baoba.advance(3.75)`);
  out.songFull = await js(`({hp:__baoba.G.player.hp,swim:!!__baoba.G.player.swim})`);
  check(out.songFull.hp === 72 && out.songFull.swim, 'full Canto drags the hero into the sea (16+12)', out.songFull);
  await js(`__baoba.advance(2.5)`);

  // Rabada do Ipupiara: 22 e empurrão
  await js(`(()=>{const B=__baoba,P=${DUO}.ipu;${FREEZE}const c=B.world.arena;P.pos.set(c.x,0,c.z);B.G.player.pos.set(c.x+2.5,0,c.z);B.G.player.hp=100;B.advance(0.1);P.step=1;P.nextInCycle();B.advance(0.8);})()`);
  await shot('tail-warn');
  await js(`__baoba.advance(1.0)`);
  out.tail = await js(`({hp:__baoba.G.player.hp,x:+(__baoba.G.player.pos.x-(${center.x})).toFixed(2)})`);
  check(out.tail.hp === 78 && out.tail.x > 5, 'Ipupiara tail sweep deals 22 and shoves', out.tail);

  // Iara liberta: a luta continua com o Ipupiara
  await js(`(()=>{const B=__baoba;B.G.player.pos.set(${center.x},0,${center.z}+4);B.G.player.hp=1e6;${DUO}.iara.takeHit(1e5,{heavy:true,actionId:8600});B.advance(2.5);})()`);
  out.iaraFree = await js(`({freed:${DUO}.iara.freed,mask:${DUO}.iara.model.mask.visible,name:${DUO}.iara.name,duoAlive:${DUO}.alive,fight:__baoba.prog.fight,bars:[...document.querySelectorAll('#bossBar .bar.boss')].map(b=>!b.classList.contains('hidden')),label:[...document.querySelectorAll('#labels .label.player .n, .label.player .n')].map(n=>n.textContent)})`);
  check(out.iaraFree.freed && !out.iaraFree.mask && out.iaraFree.duoAlive && out.iaraFree.fight && out.iaraFree.bars.filter(Boolean).length === 1, 'Iara freed (mask breaks); the Ipupiara fights on', out.iaraFree);
  await shot('iara-freed');

  // Ipupiara vencido: o mar acalma, o sol abre, a memória aparece
  await js(`(()=>{const B=__baoba;${DUO}.ipu.state='idle';${DUO}.ipu.takeHit(1e5,{heavy:true,actionId:8700});B.advance(3);})()`);
  out.clear = { mid: await js(`({dawn:+__baoba.world.dawn.toFixed(2),memory:__baoba.world.finalMemory.visible,victory:__baoba.G.player.victory,sea:!!(${DUO}.wave||${DUO}.tide),done:${DUO}.done})`) };
  await shot('ipu-sunk');
  await js(`__baoba.advance(5)`);
  out.clear.end = await js(`({dawn:__baoba.world.dawn,bg:'#'+__baoba.G.scene.background.getHexString(),rain:__baoba.world.rain.visible})`);
  check(out.clear.mid.memory && out.clear.mid.done && !out.clear.mid.sea && out.clear.end.dawn === 1 && !out.clear.end.rain, 'both resolved: the sea calms, rain stops, memory appears', out.clear);
  await js(`(()=>{const B=__baoba;const a=B.world.arena;B.G.player.pos.set(a.x+1.5,0,a.z+6);B.advance(1.5);})()`);
  await shot('clear-deck');
  await js(`(()=>{const B=__baoba;B.world.arenaLocked=false;B.G.player.pos.set(10,0,-30);B.advance(1.5);})()`);
  await shot('clear-beach');
  await js(`(()=>{const B=__baoba;const m=B.world.finalMemory.position;B.G.player.pos.set(m.x+1,0,m.z);B.advance(0.2);B.G.input.hits.add('KeyF');B.advance(0.1);})()`);
  await sleep(1500);
  await js(`__baoba.advance(0.2)`);
  out.complete = await js(`({mode:__baoba.mode,kicker:document.getElementById('completeKicker').textContent,quote:document.getElementById('completeQuote').textContent})`);
  check(out.complete.mode === 'complete' && out.complete.kicker === 'O mar se acalmou', 'level complete screen', out.complete);
  await shot('complete');

  // Ordem inversa: Ipupiara primeiro, depois a Iara (atalho do checkpoint)
  await js(`(()=>{const B=__baoba;B.startDuo();B.hold=true;B.advance(0.2);B.G.player.pos.set(-33.6,0,-30);B.G.player.hp=1e6;B.advance(8.5);${DUO}.ipu.takeHit(1e5,{heavy:true,actionId:8800});B.advance(0.5);})()`);
  out.reverse = { mid: await js(`({done:${DUO}.done,fight:__baoba.prog.fight,iara:${DUO}.iara.targetable})`) };
  await js(`(()=>{const B=__baoba;${DUO}.iara.takeHit(1e5,{heavy:true,actionId:8801});B.advance(0.5);})()`);
  out.reverse.end = await js(`({done:${DUO}.done,defeated:__baoba.prog.defeated})`);
  check(!out.reverse.mid.done && out.reverse.mid.fight && out.reverse.mid.iara && out.reverse.end.done && out.reverse.end.defeated, 'reverse order (Ipupiara first) also ends the fight', out.reverse);

  // Derrota no deque: volta ao trapiche com o píer inteiro
  await js(`(()=>{const B=__baoba;B.startDuo();B.hold=true;B.advance(0.2);B.G.player.pos.set(-33.6,0,-30);B.G.player.hp=100;B.advance(8.5);B.G.player.takeDamage(500,'teste');B.advance(2);document.querySelector('[data-act="retry"]')?.click();B.advance(0.3);})()`);
  out.retry = await js(`({mode:__baoba.mode,x:+__baoba.G.player.pos.x.toFixed(1),broken:__baoba.world.pierBroken,boss:${DUO}.parts.map(p=>p.state),fight:__baoba.prog.fight})`);
  check(out.retry.mode === 'play' && out.retry.x < -19.5 && !out.retry.broken && out.retry.boss.every(s => s === 'dormant') && !out.retry.fight, 'defeat on the deck returns to the pier with it restored', out.retry);

  // As outras fases continuam carregando
  await js(`(()=>{const B=__baoba;B.selectLevel('sertao');B.startLevel('sertao');B.advance(0.3);})()`);
  out.sertao = await js(`({boss:__baoba.G.boss.name,n:__baoba.G.fragments.length,porto:__baoba.worlds.porto.root.visible,duo:__baoba.G.bosses.duo.rig.root.visible})`);
  check(out.sertao.boss === 'Mula sem Cabeça' && out.sertao.n === 5 && !out.sertao.porto && !out.sertao.duo, 'Sertão Velho still loads', out.sertao);
  await js(`(()=>{const B=__baoba;B.selectLevel('mata');B.startLevel('mata');B.advance(0.3);})()`);
  out.mata = await js(`({boss:__baoba.G.boss.name,n:__baoba.G.fragments.length,bg:'#'+__baoba.G.scene.background.getHexString()})`);
  check(out.mata.boss === 'Curupira corrompido' && out.mata.n === 3 && out.mata.bg === '#86c4a8', 'Mata Viva still loads', out.mata);

  out.errors = errors;
  fs.writeFileSync(new URL('Evidence/porto-browser-checks.json', root), JSON.stringify(out, null, 2));
  if (errors.length) throw new Error('Page errors: ' + errors.join('\n'));
  console.log('PASS: level pick, drowned rise + cone, craca spit, letter, chain, pier collapse, duo encounter, two bars, ressaca (hit, push, overboard), tide, Canto (interrupt, full), tail, Iara freed, Ipupiara sunk, calm sea, memory, complete, reverse order, retry, other levels; errors []');
} catch (e) {
  if (e.message !== 'SCENERY_ONLY') throw e;
  console.log('scenery shots done; errors', errors);
} finally { ws.close(); proc.kill(); }
