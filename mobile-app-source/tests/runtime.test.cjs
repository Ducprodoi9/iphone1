const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=path.join(__dirname,'../public/features/runtime.js');
function setup(fetcher){
 const storage=new Map([['token','student-a']]);
 const window={setTimeout,clearTimeout,addEventListener(){},visualViewport:null};
 const context={window,URL,AbortController,DOMException,Promise,Date,Error,Map,Set,
  document:{documentElement:{style:{setProperty(){}}}},localStorage:{getItem:k=>storage.get(k)||null},fetch:fetcher};
 if(fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
 return {api:window.FuehrerscheinFeatures?.api,storage};
}
const ok=data=>({ok:true,status:200,json:async()=>data});
test('feature transport is available without changing the existing app API',()=>{
 assert.equal(typeof setup(()=>{}).api,'function');
});
test('uses production bearer token and never puts it in a URL',async()=>{
 let request;
 const {api}=setup(async(url,options)=>{request={url,options};return ok({success:true,points:3});});
 const result=await api('ai_state.php');
 assert.equal(result.points,3); assert.equal(new URL(request.url).origin,'https://nguyenron.com');
 assert.equal(new URL(request.url).searchParams.has('token'),false);
 assert.equal(request.options.headers.Authorization,'Bearer student-a');
 assert.equal(request.options.credentials,'omit');
});
test('network failure never retries a chat or answer POST',async()=>{
 let calls=0; const {api}=setup(async()=>{calls++;throw new Error('network');});
 await assert.rejects(api('ai_chat.php',{method:'POST',body:'{}'})); assert.equal(calls,1);
});
test('timeout settles even if fetch ignores abort',async()=>{
 const {api}=setup(()=>new Promise(()=>{}));
 await assert.rejects(api('ai_state.php',{},15),e=>e.code==='CLIENT_TIMEOUT');
});
test('aborting a closed feature settles without retry',async()=>{
 const {api}=setup(()=>new Promise(()=>{})); const control=new AbortController();
 const pending=api('ai_chat.php',{method:'POST',signal:control.signal}); control.abort();
 await assert.rejects(pending,e=>e.name==='AbortError');
});
test('response from a prior student is rejected',async()=>{
 let finish;const {api,storage}=setup(()=>new Promise(r=>finish=r));
 const pending=api('ai_state.php');storage.set('token','student-b');finish(ok({messages:['private']}));
 await assert.rejects(pending,e=>e.name==='AbortError');
});
test('retains backend error code and quota payload',async()=>{
 const {api}=setup(async()=>({ok:false,status:429,json:async()=>({success:false,code:'DAILY_LIMIT',message:'Limit',remaining:0})}));
 await assert.rejects(api('ai_chat.php',{method:'POST'}),e=>e.code==='DAILY_LIMIT'&&e.data.remaining===0&&e.status===429);
});
