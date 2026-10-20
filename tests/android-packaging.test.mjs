import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/prepare-driving-android.mjs');
async function fixture(t, missing=false) {
  const root=await mkdtemp(join(tmpdir(),'driving-package-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const app=join(root,'mobile-app-source');
  const old=join(root,'ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc/www');
  for(const dir of [old,app+'/dist/features',app+'/public/features',app+'/android-web']) await mkdir(dir,{recursive:true});
  const tags=['runtime.js','ai-assistant.js','speed-room.js','ai-explanations.js','ai-explanations.css'];
  await writeFile(app+'/dist/index.html','<head>'+tags.map(p=>p.endsWith('.css')?`<link href="./features/${p}" rel="stylesheet">`:`<script src="./features/${p}"></script>`).join('')+'</head><body>FRESH</body>');
  for(const p of tags) if(!missing||p!=='ai-explanations.js') await writeFile(app+'/dist/features/'+p,'fresh-'+p);
  await writeFile(old+'/index.html','<head></head><body>STALE IOS</body>');
  await writeFile(app+'/public/features/android-bootstrap.js','bootstrap');
  await writeFile(app+'/android-web/keep.txt','last-good');
  return {root,app};
}
test('Android packages the fresh frontend build with per-question AI, not stale iOS assets',async t=>{
  const {root,app}=await fixture(t);
  const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=await readFile(app+'/android-web/index.html','utf8');
  assert.match(html,/FRESH/); assert.doesNotMatch(html,/STALE IOS/);
  assert.match(html,/android-bootstrap.js/);
  assert.equal(await readFile(app+'/android-web/features/ai-explanations.js','utf8'),'fresh-ai-explanations.js');
});
test('Missing AI asset fails before replacing the last good package',async t=>{
  const {root,app}=await fixture(t,true);
  const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.equal(await readFile(app+'/android-web/keep.txt','utf8'),'last-good');
});
