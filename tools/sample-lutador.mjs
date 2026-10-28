import fs from 'node:fs';
// Extract only the pose authoring function; the runtime module also imports a GLB.
const source=fs.readFileSync(new URL('../web/src/lutador.js',import.meta.url),'utf8');
const poseCode=source.slice(source.indexOf('const P = Math.PI;'),source.indexOf('// Locs balançam'));
const rigUrl=new URL('../web/src/rig.js',import.meta.url).href;
const {lutadorPose}=await import('data:text/javascript;base64,'+Buffer.from(`import {keyed} from '${rigUrl}';\n${poseCode}`).toString('base64'));
const durations = {idle:Math.PI*2/3.2,run:Math.PI*2/13,combo0:.42,combo1:.42,combo2:.62,rasteira:.55,meialua:.75,dodge:.38,jump:.6,hit:.28,dead:.65,victory:Math.PI/2,apose:1};
const clips = Object.entries(durations).map(([name,duration]) => {
  const n=Math.ceil(duration*60);
  return {name,duration,frames:Array.from({length:n+1},(_,i)=>({time:i/n*duration,pose:lutadorPose(name,i/n*duration,i/n)}))};
});
fs.writeFileSync(new URL('../SourceArt/poses.json',import.meta.url),JSON.stringify(clips));
