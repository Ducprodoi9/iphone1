const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const flush = () => new Promise(resolve => setTimeout(resolve, 45));
const dir = path.join(__dirname, '../public/features');
const question = {id:9, question_code:'1.3.01-120-M', points:3, question_de:'Frage?', answers:[{id:1,answer_de:'A',is_correct:1}]};
const content = {success:true, question_id:9, question_code:question.question_code, available:true, detailed_explanation_vi:'### Quy tắc\n\\*\\*Giải thích chuẩn\\*\\*\n- Giữ khoảng cách\n<img src=x onerror=alert(1)>'};
let appBundle;
async function setup(t, {handler, app=false, slot=true}={}) {
  const dom = new JSDOM(app ? '<div id="root"></div>' : '<div class="question-topbar"><span class="ai-explanation-slot" data-ai-question-id="9" data-ai-question-code="1.3.01-120-M" hidden></span></div>', {url:'https://local.test',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(() => dom.window.close());
  const w=dom.window, doc=w.document, requests=[];
  if (!slot && !app) doc.body.replaceChildren();
  w.localStorage.setItem('token','student-a'); w.localStorage.setItem('ui_lang','vi'); w.AbortController=AbortController;
  w.fetch=async (url, options) => {
    const u=new URL(url), mode=u.searchParams.get('mode'); requests.push({url:u,options});
    const custom=handler ? await handler(u,options,w) : undefined;
    let data=custom;
    if (data===undefined) data=u.pathname.endsWith('ai_explanation.php') ? (mode==='state' ? {success:true,can_view:true} : content) : u.pathname.endsWith('questions.php') ? {success:true,questions:[question]} : u.pathname.endsWith('start_exam.php') ? {success:true,questions:[question]} : {success:true,stats:{},user:{}};
    if (data instanceof Error) throw data;
    return {ok:data.success!==false,status:data.status||200,json:async()=>data};
  };
  if(app) {
    appBundle ||= import('vite').then(({build})=>build({root:path.join(__dirname,'..'),configFile:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},build:{write:false,minify:false,lib:{entry:path.join(__dirname,'../src/main.tsx'),formats:['iife'],name:'VietDucTest'}}})).then(r=>r[0].output.find(x=>x.type==='chunk').code);
    w.eval(await appBundle);
  }
  for(const file of ['runtime.js','ai-explanations.js']) if(fs.existsSync(path.join(dir,file))) w.eval(fs.readFileSync(path.join(dir,file),'utf8'));
  await flush(); await flush();
  return {w,doc,requests};
}
const questionRequests=c=>c.requests.filter(r=>r.url.searchParams.get('mode')==='question');
function open(c) { const b=c.doc.querySelector('.fv-ai-explain-button'); assert.ok(b,'Question screen exposes the AI explanation button'); b.click(); }
test('premium question screen loads matching saved AI explanation and renders safe markdown',async t=>{
  const c=await setup(t); open(c); await flush();
  assert.equal(questionRequests(c)[0].url.origin,'https://nguyenron.com');
  assert.equal(questionRequests(c)[0].options.headers.Authorization,'Bearer student-a');
  assert.equal(questionRequests(c)[0].url.searchParams.get('question_id'),'9');
  assert.equal(c.doc.querySelector('.fv-ai-explain-body strong').textContent,'Giải thích chuẩn');
  assert.equal(c.doc.querySelector('.fv-ai-explain-body img'),null);
  assert.match(c.doc.querySelector('.fv-ai-explain-body').textContent,/<img/);
});
test('backend denied entitlement hides AI and does not request paid content',async t=>{
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='state'?{success:true,can_view:false}:undefined});
  assert.equal(c.doc.querySelector('.fv-ai-explain-button'),null); assert.equal(questionRequests(c).length,0);
});
test('double tap opens one dialog with one pending request',async t=>{
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'?new Promise(()=>{}):undefined});
  open(c); open(c); await flush(); assert.equal(c.doc.querySelectorAll('.fv-ai-explain-overlay').length,1); assert.equal(questionRequests(c).length,1);
});
test('network failure exposes retry and successful retry displays saved explanation',async t=>{
  let count=0;
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'&&count++===0?new TypeError('Offline'):undefined});
  open(c); await flush(); const retry=c.doc.querySelector('.fv-ai-explain-retry'); assert.equal(retry.hidden,false); assert.equal(c.doc.querySelector('.fv-ai-explain-body').getAttribute('aria-busy'),'false');
  retry.click(); await flush(); assert.equal(questionRequests(c).length,2); assert.equal(retry.hidden,true); assert.match(c.doc.querySelector('.fv-ai-explain-body').textContent,/Giải thích chuẩn/);
});
test('hard deadline releases loading even when transport never settles',async t=>{
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'?new Promise(()=>{}):undefined});
  const timer=c.w.setTimeout.bind(c.w); c.w.setTimeout=(fn,ms,...args)=>timer(fn,ms===12000?10:ms,...args);
  open(c); await flush(); assert.equal(c.doc.querySelector('.fv-ai-explain-body').getAttribute('aria-busy'),'false'); assert.equal(c.doc.querySelector('.fv-ai-explain-retry').hidden,false);
});
test('changing question aborts request and ignores late response',async t=>{
  let resolve; const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'?new Promise(r=>resolve=r):undefined});
  open(c); await flush(); c.doc.querySelector('.ai-explanation-slot').dataset.aiQuestionId='10'; await flush();
  assert.equal(questionRequests(c)[0].options.signal.aborted,true); resolve(content); await flush(); assert.equal(c.doc.querySelector('.fv-ai-explain-overlay'),null);
});
test('account change removes private content and rejects stale entitlement',async t=>{
  const c=await setup(t); open(c); await flush(); c.w.localStorage.setItem('token','student-b'); c.w.dispatchEvent(new c.w.Event('storage')); await flush(); assert.equal(c.doc.querySelector('.fv-ai-explain-overlay'),null);
});
test('mismatched question and missing content never invent an explanation',async t=>{
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'?{...content,question_id:10}:undefined});
  open(c); await flush(); assert.match(c.doc.querySelector('.fv-ai-explain-body').textContent,/không khớp/); assert.doesNotMatch(c.doc.querySelector('.fv-ai-explain-body').textContent,/Giải thích chuẩn/);
});
test('question without saved explanation has a clear empty state',async t=>{
  const c=await setup(t,{handler:u=>u.searchParams.get('mode')==='question'?{...content,available:false,detailed_explanation_vi:null}:undefined});
  open(c); await flush(); assert.match(c.doc.querySelector('.fv-ai-explain-body').textContent,/chưa có giải thích AI/);
});
test('real React learning screen exposes AI beside the existing explanation',async t=>{
  const c=await setup(t,{app:true}); c.doc.querySelector('.home-card').click(); await flush(); c.doc.querySelector('.list-btn').click(); await flush(); await flush();
  assert.ok(c.doc.querySelector('.bulb-btn')); open(c); await flush(); assert.match(c.doc.querySelector('.fv-ai-explain-body').textContent,/Giải thích chuẩn/);
  c.doc.querySelector('.fv-ai-explain-done').click(); c.doc.querySelector('.bulb-btn').click(); await flush(); assert.ok(c.doc.querySelector('.explanation-overlay'));
});
test('real active exam contains no explanation slot and makes no explanation request',async t=>{
  const c=await setup(t,{app:true}); c.doc.querySelectorAll('.home-card')[1].click(); await flush(); c.doc.querySelector('.primary').click(); await flush(); await flush();
  assert.ok(c.doc.querySelector('.exam-question-topbar')); assert.equal(c.doc.querySelector('.ai-explanation-slot'),null); assert.equal(c.requests.filter(r=>r.url.pathname.endsWith('ai_explanation.php')).length,0);
});
