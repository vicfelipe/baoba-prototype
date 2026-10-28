// Spec validation + budget report for the game's GLBs: Khronos glTF-Validator (errors fail the run)
// and glTF Transform inspect (triangles, textures, clips). node tools/validate-glb.mjs [file.glb ...]
// Defaults to every web/assets/*.glb; writes Evidence/glb-validation.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../web/package.json', import.meta.url));
const validator = req('gltf-validator');
const { NodeIO } = await import(new URL('../web/node_modules/@gltf-transform/core/dist/index.js', import.meta.url));
const { ALL_EXTENSIONS } = await import(new URL('../web/node_modules/@gltf-transform/extensions/dist/index.js', import.meta.url));
const { inspect } = await import(new URL('../web/node_modules/@gltf-transform/functions/dist/index.js', import.meta.url));

const LUNIA_TEX = 1024;   // largest texture of the Lunia slot contract (doc 18)
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(root, 'web/assets')).filter(f => f.endsWith('.glb')).map(f => path.join(root, 'web/assets', f));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const out = {}; let failed = false;
for (const file of files) {
  const bytes = new Uint8Array(fs.readFileSync(file));
  const rep = await validator.validateBytes(bytes, { maxIssues: 200 });
  const byCode = {};
  for (const m of rep.issues.messages) (byCode[m.code] ??= { severity: ['error', 'warning', 'info', 'hint'][m.severity], count: 0, first: m.pointer ?? m.message }).count++;
  const ins = inspect(await io.readBinary(bytes));
  const tris = ins.meshes.properties.reduce((s, m) => s + (m.mode.includes('TRIANGLES') ? m.glPrimitives : 0), 0);
  const big = ins.textures.properties.filter(t => Math.max(...t.resolution.split('x').map(Number)) > LUNIA_TEX).map(t => `${t.name} ${t.resolution}`);
  const r = out[path.basename(file)] = {
    errors: rep.issues.numErrors, warnings: rep.issues.numWarnings, infos: rep.issues.numInfos, issues: byCode,
    meshes: ins.meshes.properties.length, triangles: tris,
    textures: ins.textures.properties.map(t => `${t.name || t.uri || '?'} ${t.resolution}`), textures_over_budget: big,
    animations: ins.animations.properties.map(a => a.name), size_kb: Math.round(bytes.length / 1024),
  };
  if (rep.issues.numErrors) failed = true;
  console.log(`${rep.issues.numErrors ? 'FAIL' : 'ok  '} ${path.basename(file).padEnd(22)} errors ${rep.issues.numErrors}  warnings ${rep.issues.numWarnings}  meshes ${r.meshes}  tris ${tris}  clips ${r.animations.length}  ${r.size_kb} KB` +
    (big.length ? `  textures over ${LUNIA_TEX}: ${big.join(', ')}` : ''));
  for (const [code, i] of Object.entries(byCode)) if (i.severity !== 'info' && i.severity !== 'hint') console.log(`       ${i.severity} ${code} x${i.count} (${i.first})`);
}
fs.mkdirSync(path.join(root, 'Evidence'), { recursive: true });
fs.writeFileSync(path.join(root, 'Evidence/glb-validation.json'), JSON.stringify(out, null, 1));
console.log(failed ? 'GLB_VALIDATION FAIL' : 'GLB_VALIDATION PASS');
process.exit(failed ? 1 : 0);
