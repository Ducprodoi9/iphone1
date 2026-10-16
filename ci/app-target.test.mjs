import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTarget,readTarget} from './app-target.mjs';
test('Public target can build without an ASC record but cannot sign/upload',()=>{
 const target={...readTarget(),appID:null};assert.equal(target.bundleID,'com.ronnguyen.fuehrerscheinvietduc.public');
 assert.throws(()=>validateTarget(target,{requireAppID:true}),/App ID/);
});
test('Public signing refuses the existing Unlisted App ID',()=>{
 assert.throws(()=>validateTarget({...readTarget(),appID:'6793430149'},{requireAppID:true}),/Unlisted/);
 assert.throws(()=>validateTarget({...readTarget(),appID:6793430149},{requireAppID:true}),/App ID/);
});
test('Public signing refuses mismatched target bundle or team',()=>{
 assert.throws(()=>validateTarget({...readTarget(),bundleID:'com.ronnguyen.fuehrerscheinvietduc'}),/bundle/);
 assert.throws(()=>validateTarget({...readTarget(),teamID:'3JD7L6FN23'}),/team/);
});
