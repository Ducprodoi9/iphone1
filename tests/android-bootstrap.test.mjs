import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const file='mobile-app-source/public/features/android-bootstrap.js';
const script=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
function run(saved={},cryptoApi={randomUUID:()=> 'a680d811-9391-4cca-9a08-50caa3c5a04c'}) {
  const values=new Map(Object.entries(saved));
  const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};
  vm.runInNewContext(script,{localStorage,crypto:cryptoApi});
  return values;
}
test('a fresh Android install receives an Android identity before the original iOS UI starts',()=>{
  assert.equal(run().get('device_id'),'android-a680d811-9391-4cca-9a08-50caa3c5a04c');
});
test('reopening preserves device identity, auth token and student preferences',()=>{
  const saved={device_id:'android-existing',token:'test-only-token',ui_lang:'vi'};
  assert.deepEqual(Object.fromEntries(run(saved)),saved);
});
test('bootstrap leaves existing study/exam caches untouched',()=>{
  const values=run({exam_answers:'[1,2]',marked_questions:'[5]'});
  assert.equal(values.get('exam_answers'),'[1,2]');
  assert.equal(values.get('marked_questions'),'[5]');
});
test('older Android WebViews create and preserve an Android identity without randomUUID',()=>{
  const cryptoApi={getRandomValues:bytes=>{bytes.fill(42);return bytes;}};
  const first=run({},cryptoApi);
  assert.match(first.get('device_id'),/^android-[0-9a-f]{32}$/);
  assert.equal(run(Object.fromEntries(first),cryptoApi).get('device_id'),first.get('device_id'));
});
