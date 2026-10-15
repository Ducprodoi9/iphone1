const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const dir = path.join(__dirname, '../public/features');
const flush = () => new Promise(r => setTimeout(r, 30));
const config = { ai_enabled: true, speed_room_enabled: true, speed_room_poll_ms: 10000 };
const aiState = { success:true, enabled:true, plan:'premium', premium_until:'2026-12-31', usage:{used:2,limit:20,remaining:18}, context_messages:10, messages:[{role:'assistant',content:'### Xin chào\n\\*\\*Dữ liệu thật\\*\\* <img src=x onerror=bad()>\n- Một'}] };
function roomState(){return {success:true, config,server_now_ms:Date.now(),room:{participant_count:2,max_players:50},leaderboard:[{is_me:true,user_id:1,name:'Student',rank:1,total_points:7}],messages:[],round:{id:77,phase:'answer',answer_ends_at_ms:Date.now()+60000},question:{question_code:'1.3.01-120-M',points:3,question_de:'Test?',answers:[{id:1,answer_de:'A'},{id:2,answer_de:'B'}]}};}
async function setup(t,handler=()=>undefined){
 const dom=new JSDOM('<div class="app-shell"><div class="cards-grid"><button class="home-card original">Lernen</button></div></div>',{url:'https://local.test/',runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close()); const w=dom.window; const requests=[];
 w.localStorage.setItem('token','student-a');w.localStorage.setItem('ui_lang','vi');w.alert=()=>{};w.confirm=()=>true;w.AbortController=AbortController;
 w.fetch=async(url,options)=>{
  const p=new URL(url).pathname.split('/').pop();requests.push({p,url,options});
  const custom=await handler(p,options,w);
  const data=custom===undefined? p==='system_config.php'?{success:true,config}:p==='ai_state.php'?aiState:p==='speed_room_state.php'?roomState():p==='speed_room_awards_state.php'?{success:true,awards:{}}:{success:true}:custom;
  if(data instanceof Error)throw data;
  return {ok:data.success!==false,status:data.status||200,json:async()=>data};
 };
 for(const file of ['runtime.js','speed-room.js','ai-assistant.js'])if(fs.existsSync(path.join(dir,file)))w.eval(fs.readFileSync(path.join(dir,file),'utf8'));
 await flush();return {w,requests,doc:w.document};
}
async function openAI(ctx){const card=ctx.doc.getElementById('ai-assistant-home-card');assert.ok(card,'AI card available in native shell');card.click();await flush();return ctx.doc.getElementById('ai-assistant-root');}
async function openRoom(ctx){const card=ctx.doc.getElementById('speed-room-home-card');assert.ok(card,'Speed card available in native shell');card.click();await flush();return ctx.doc.getElementById('speed-room-root');}
function submit(w,root,text){root.querySelector('.ai-input').value=text;root.querySelector('.ai-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
test('adds one pair of feature cards and leaves original learning card intact',async t=>{
 const c=await setup(t);assert.equal(c.doc.querySelectorAll('#ai-assistant-home-card').length,1);assert.equal(c.doc.querySelectorAll('#speed-room-home-card').length,1);assert.equal(c.doc.querySelector('.original').textContent,'Lernen');
 assert.equal(c.requests.filter(x=>x.p==='system_config.php').length,1);
});
test('AI renders escaped markdown safely, backend premium expiry and quota',async t=>{
 const c=await setup(t);const root=await openAI(c);assert.ok(root.querySelector('h4'));assert.equal(root.querySelector('.ai-msg-bubble strong').textContent,'Dữ liệu thật');assert.equal(root.querySelector('.ai-msg-bubble img'),null);assert.match(root.textContent,/2026-12-31/);assert.match(root.textContent,/2\/20/);
});
test('greeting is instant and does not consume a server chat request',async t=>{
 const c=await setup(t);const root=await openAI(c);submit(c.w,root,'xin chào');await flush();assert.equal(c.requests.filter(x=>x.p==='ai_chat.php').length,0);assert.match(root.querySelector('.ai-messages').textContent,/Chào bạn/);
});
test('repeated submit sends one backend personal-analysis request and renders backend quota',async t=>{
 let resolve;const c=await setup(t,p=>p==='ai_chat.php'?new Promise(r=>resolve=r):undefined);const root=await openAI(c);submit(c.w,root,'Chủ đề tôi yếu nhất?');submit(c.w,root,'Chủ đề tôi yếu nhất?');await flush();assert.equal(c.requests.filter(x=>x.p==='ai_chat.php').length,1);resolve({success:true,answer:'**Không đủ dữ liệu**',usage:{used:3,limit:20,remaining:17}});await flush();assert.equal(root.querySelector('.ai-typing'),null);assert.match(root.textContent,/3\/20/);
});
test('network failure exposes retry and releases busy state',async t=>{
 const c=await setup(t,p=>p==='ai_chat.php'?new Error('Mất mạng'):undefined);const root=await openAI(c);submit(c.w,root,'Tôi đang yếu gì?');await flush();assert.ok(root.querySelector('.ai-retry'));assert.equal(root.querySelector('.ai-send').disabled,false);assert.equal(root.querySelector('.ai-typing'),null);
});
test('question code uses actual points and saved explanation',async t=>{
 const c=await setup(t,p=>p==='questions.php'?{questions:[{id:9,question_code:'1.3.01-120-M',points:3,question_de:'Test?',answers:[]}]}:p==='ai_explanation.php'?{available:true,detailed_explanation_vi:'Giải thích đã lưu'}:undefined);const root=await openAI(c);submit(c.w,root,'Giải thích câu 1.3.01-120-M');await flush();assert.match(root.textContent,/3 điểm/);assert.match(root.textContent,/Giải thích đã lưu/);assert.equal(c.requests.filter(x=>x.p==='ai_chat.php').length,0);
});
test('closing AI cancels pending response and does not alter learning card',async t=>{
 let resolve;const c=await setup(t,p=>p==='ai_chat.php'?new Promise(r=>resolve=r):undefined);const root=await openAI(c);submit(c.w,root,'Phân tích cá nhân');await flush();root.querySelector('.ai-back').click();resolve({success:true,answer:'Private response'});await flush();assert.equal(c.doc.getElementById('ai-assistant-root'),null);assert.ok(c.doc.querySelector('.original'));
});
test('Speed Room displays backend points despite -M and submits once with server score',async t=>{
 let resolve;const c=await setup(t,p=>p==='speed_room_answer.php'?new Promise(r=>resolve=r):undefined);const root=await openRoom(c);assert.match(root.querySelector('.sr-exam-points').textContent,/3/);root.querySelector('.sr-answers input').checked=true;const button=root.querySelector('.sr-submit-answer');button.click();button.click();await flush();assert.equal(c.requests.filter(x=>x.p==='speed_room_answer.php').length,1);resolve({success:true,answer:{is_correct:true,points_awarded:3}});await flush();assert.match(root.querySelector('.sr-toast').textContent,/\+3/);assert.equal(root.querySelector('.sr-question-layer'),null);
});
test('rapid Speed open does not create duplicate room roots',async t=>{
 const c=await setup(t);c.doc.getElementById('speed-room-home-card').click();c.doc.getElementById('speed-room-home-card').click();await flush();assert.equal(c.doc.querySelectorAll('#speed-room-root').length,1);
});
test('closing Speed invalidates late state and stops old session',async t=>{
 let resolve;const c=await setup(t,p=>p==='speed_room_state.php'?new Promise(r=>resolve=r):undefined);const root=await openRoom(c);root.querySelector('.sr-back').click();resolve(roomState());await flush();assert.equal(c.doc.getElementById('speed-room-root'),null);assert.ok(c.doc.querySelector('.original'));
});
test('AI clear history waits for confirmation and uses existing API',async t=>{
 const c=await setup(t);const root=await openAI(c);c.w.confirm=()=>false;root.querySelector('.ai-clear').click();await flush();assert.equal(c.requests.filter(x=>x.p==='ai_clear_chat.php').length,0);c.w.confirm=()=>true;root.querySelector('.ai-clear').click();await flush();assert.equal(c.requests.filter(x=>x.p==='ai_clear_chat.php').length,1);assert.match(root.querySelector('.ai-messages').textContent,/Đã xóa/);
});
test('AI overall deadline releases loading and exposes retry even when fetch never settles',async t=>{
 const c=await setup(t,p=>p==='ai_chat.php'?new Promise(()=>{}):undefined);const root=await openAI(c);
 const timer=c.w.setTimeout.bind(c.w);c.w.setTimeout=(fn,ms,...args)=>timer(fn,ms===35000?15:ms,...args);
 submit(c.w,root,'Phân tích dữ liệu');await flush();await flush();assert.equal(root.querySelector('.ai-send').disabled,false);assert.equal(root.querySelector('.ai-typing'),null);assert.ok(root.querySelector('.ai-retry'));
});
test('Speed ranking tabs request the selected server period',async t=>{
 const c=await setup(t);const root=await openRoom(c);root.querySelector('[data-period="week"]').click();await flush();assert.ok(c.requests.some(x=>x.p==='speed_room_state.php'&&new URL(x.url).searchParams.get('leaderboard_period')==='week'));
});
test('Speed chat ignores repeated submits while its POST is pending',async t=>{
 let resolve;const c=await setup(t,p=>p==='speed_room_chat.php'?new Promise(r=>resolve=r):undefined);const root=await openRoom(c);root.querySelector('.sr-chat-input').value='Hello';const form=root.querySelector('.sr-chat-form');form.dispatchEvent(new c.w.Event('submit',{cancelable:true}));form.dispatchEvent(new c.w.Event('submit',{cancelable:true}));await flush();assert.equal(c.requests.filter(x=>x.p==='speed_room_chat.php').length,1);resolve({success:true});await flush();
});
test('background and foreground cannot resend an in-flight Speed answer',async t=>{
 let resolve;const c=await setup(t,p=>p==='speed_room_answer.php'?new Promise(r=>resolve=r):undefined);const root=await openRoom(c);
 root.querySelector('.sr-answers input').checked=true;root.querySelector('.sr-submit-answer').click();await flush();
 Object.defineProperty(c.doc,'hidden',{configurable:true,value:true});c.doc.dispatchEvent(new c.w.Event('visibilitychange'));
 Object.defineProperty(c.doc,'hidden',{configurable:true,value:false});c.doc.dispatchEvent(new c.w.Event('visibilitychange'));await flush();
 const button=root.querySelector('.sr-submit-answer');if(button){root.querySelector('.sr-answers input').checked=true;button.click();}
 await flush();assert.equal(c.requests.filter(x=>x.p==='speed_room_answer.php').length,1);
 resolve({success:true,answer:{is_correct:true,points_awarded:3}});await flush();
});
test('accepted AI reply survives failed optional points validation without a charged resend',async t=>{
 const c=await setup(t,p=>p==='ai_chat.php'?{success:true,answer:'### Câu 5 điểm\n1. 1.3.01-120-M — dữ liệu',usage:{used:3,limit:20,remaining:17}}:p==='questions.php'?new Promise(()=>{}):undefined);
 const root=await openAI(c);const timer=c.w.setTimeout.bind(c.w);c.w.setTimeout=(fn,ms,...args)=>timer(fn,[35000,12000,2000].includes(ms)?15:ms,...args);
 submit(c.w,root,'5 câu 5 điểm tôi sai nhất?');await flush();await flush();
 assert.match(root.querySelector('.ai-quota').textContent,/3\/20/);assert.equal(root.querySelector('.ai-retry'),null);
 assert.equal(c.requests.filter(x=>x.p==='ai_chat.php').length,1);assert.equal(root.querySelector('.ai-typing'),null);
});
test('late closed-round error preserves a newer round and its selected answer',async t=>{
 let resolve;let roundId=77;
 const c=await setup(t,p=>p==='speed_room_answer.php'?new Promise(r=>resolve=r):p==='speed_room_state.php'?{...roomState(),round:{...roomState().round,id:roundId}}:undefined);
 const root=await openRoom(c);root.querySelector('.sr-answers input').checked=true;root.querySelector('.sr-submit-answer').click();await flush();
 roundId=78;root.querySelector('[data-period="week"]').click();await flush();
 const layer=root.querySelector('.sr-question-layer');assert.equal(layer.dataset.roundId,'78');layer.querySelector('.sr-answers input').checked=true;
 resolve({success:false,status:409,code:'ROUND_CLOSED',message:'Closed'});await flush();
 assert.equal(root.querySelector('.sr-question-layer'),layer);assert.equal(layer.querySelector('.sr-answers input').checked,true);
});
