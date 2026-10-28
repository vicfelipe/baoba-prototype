// Abre web/dist/index.html no Chrome headless (DevTools Protocol, sem dependências), percorre
// visualizador e jogo com __baoba.advance e grava capturas em Evidence/curupira-*.png.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const page = new URL('web/dist/index.html', root).href;
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'baoba-cdp-'));
const port = 9334;
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
const shot = async name => { await sleep(2500); const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(`Evidence/curupira-${name}.png`, root), Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const key = (code, type) => js(`window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true}))`);

await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable'); await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride', { width:1280,height:720,deviceScaleFactor:1,mobile:false });
try {
  await send('Page.navigate',{url:page});
  let ready=false;
  for(let i=0;i<120;i++){await sleep(500);try{if(await js(`!!window.__baoba && !document.getElementById('btnStart').disabled`)){ready=true;break;}}catch{}}
  if(!ready)throw new Error('Game load timed out');
  await shot('title');
  await js(`document.getElementById('btnLutador').click()`);
  for(const form of ['corrupted','freed']) {
    await js(`(()=>{const e=document.getElementById('studioCharacter');e.value='${form}';e.onchange({target:e});})()`);
    await shot('studio-'+form);
  }
  await js(`document.getElementById('studioClose').click()`);
  await js(`document.getElementById('btnStart').click();__baoba.hold=true;__baoba.advance(1)`);
  // Encounter cinematic, stepped deterministically (hold freezes the real clock).
  await js(`(()=>{const B=__baoba;B.prog.gate=true;B.prog.kills=3;B.prog.vestigio=true;const a=B.world.arena;B.G.player.pos.set(a.x,0,a.z+a.r-3);B.G.player.target=B.G.boss;B.G.player.hp=10000;B.advance(1.0);})()`);
  const cine={};
  cine.start=await js(`({mode:__baoba.mode,active:__baoba.cine.active,boss:__baoba.G.boss.state,targetable:__baoba.G.boss.targetable})`);
  if(cine.start.mode!=='cinematic'||!cine.start.active||cine.start.targetable)throw new Error('Encounter cinematic did not start '+JSON.stringify(cine.start));
  await shot('cine-encounter-wide');
  await js(`__baoba.advance(2.6)`); await shot('cine-encounter-roar');
  await js(`__baoba.advance(1.4)`); await shot('cine-encounter-name');
  await js(`__baoba.advance(3.0)`);
  cine.end=await js(`({mode:__baoba.mode,active:__baoba.cine.active,boss:__baoba.G.boss.state,targetable:__baoba.G.boss.targetable,bars:document.getElementById('cine').className})`);
  if(cine.end.mode!=='play'||cine.end.active||!cine.end.targetable)throw new Error('Encounter cinematic did not hand over '+JSON.stringify(cine.end));
  await js(`__baoba.advance(1.5)`);
  await shot('encounter');
  await key('Escape','keydown'); await js('__baoba.advance(.02)'); await key('Escape','keyup');
  await js(`document.getElementById('screens').style.visibility='hidden'`);
  const samples=[];
  for(const [state,time] of [['sweepWarn',1.2],['sweepHit',0],['rootsWarn',1.6],['rootsHit',0],['cast',1.5],['stagger',.3]]){
    await js(`(()=>{const B=__baoba,b=B.G.boss;B.G.tg.clear();b.tg=null;b.setState('${state}');b.st=${time};if('${state}'==='cast')b.cast={t:${time},dur:3.4};b.animate(0,false);document.getElementById('pause')?.setAttribute('hidden','');})()`);
    await shot(state);
    samples.push(await js(`({state:__baoba.G.boss.state,form:__baoba.G.boss.rig.form,height:__baoba.G.boss.height})`));
  }
  // Interrupt through the gameplay entry point and assert the actual state change.
  const interrupted=await js(`(()=>{const b=__baoba.G.boss;b.setState('cast');b.cast={t:0,dur:3.4};b.takeHit(65,{interrupts:true,heavy:false,actionId:99901});return b.state==='stagger';})()`);
  if(!interrupted)throw new Error('Rasteira did not interrupt the boss');
  // Liberation cinematic: release, flash + form swap, close on the freed guardian, wide shot.
  await js(`(()=>{const B=__baoba,b=B.G.boss;b.setState('idle');b.takeHit(10000,{interrupts:false,heavy:true,actionId:99902});B.advance(1.0);})()`);
  cine.release=await js(`({mode:__baoba.mode,form:__baoba.G.boss.rig.form})`);
  if(cine.release.mode!=='cinematic'||cine.release.form!=='corrupted')throw new Error('Liberation cinematic did not start '+JSON.stringify(cine.release));
  await shot('cine-release');
  await js(`__baoba.advance(1.35)`); await shot('cine-swap');
  await js(`__baoba.advance(2.4)`); await shot('cine-freed-close');
  await js(`__baoba.advance(2.2)`); await shot('cine-freed-wide');
  await js(`__baoba.advance(2.0)`);
  await shot('freed');
  const freed=await js(`({form:__baoba.G.boss.rig.form,height:__baoba.G.boss.height,hp:__baoba.G.boss.hp,alive:__baoba.G.boss.alive,cast:__baoba.G.boss.cast,prog:__baoba.prog.freed,mode:__baoba.mode,memory:__baoba.world.finalMemory.visible,clip:__baoba.G.boss.rig.forms.freed.current})`);
  if(freed.form!=='freed'||freed.height!==2.1||freed.hp!==0||freed.alive||freed.cast!==null||!freed.prog||freed.mode!=='play'||!freed.memory||freed.clip!=='freed')throw new Error('Liberation failed '+JSON.stringify(freed));
  await js(`(()=>{const b=__baoba.G.boss;b.reset();b.animate(0,false);})()`);
  const reset=await js(`({form:__baoba.G.boss.rig.form,height:__baoba.G.boss.height,hp:__baoba.G.boss.hp,state:__baoba.G.boss.state})`);
  if(reset.form!=='corrupted'||reset.height!==3||reset.hp!==2400||reset.state!=='dormant')throw new Error('Reset failed');
  // Skipping the encounter still hands over a fight-ready boss.
  cine.skip=await js(`(()=>{const B=__baoba;B.prog.freed=false;B.prog.fight=false;B.world.finalMemory.visible=false;const a=B.world.arena;B.G.player.pos.set(a.x,0,a.z+a.r-3);B.advance(.5);const during=B.mode;B.cine.skip();B.advance(.1);return {during,mode:B.mode,boss:B.G.boss.state,targetable:B.G.boss.targetable,bars:document.getElementById('cine').className};})()`);
  if(cine.skip.during!=='cinematic'||cine.skip.mode!=='play'||cine.skip.boss!=='intro'||!cine.skip.targetable)throw new Error('Skip failed '+JSON.stringify(cine.skip));
  fs.writeFileSync(new URL('Evidence/curupira-browser-checks.json',root),JSON.stringify({samples,interrupted,freed,reset,cine,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS: actual game load, encounter + liberation cinematics, skip, boss states, interruption, liberation, reset; errors []');
} finally {ws.close();proc.kill();}
