import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRegisteredBundle} from './registered-bundle.mjs';
const legacy={id:'LEGACY',attributes:{identifier:'com.ronnguyen.fuehrerscheinvietduc'}};
const publicApp={id:'PUBLIC',attributes:{identifier:'com.ronnguyen.fuehrerscheinvietduc.public'}};
test('selects the exact legacy bundle when Apple also returns its Public prefix match',()=>{
 assert.equal(selectRegisteredBundle([publicApp,legacy],legacy.attributes.identifier),'LEGACY');
});
test('never signs the Public bundle for a legacy target when an exact match is missing',()=>{
 assert.throws(()=>selectRegisteredBundle([publicApp],legacy.attributes.identifier),/exact/);
});
test('refuses ambiguous exact bundle registrations',()=>{
 assert.throws(()=>selectRegisteredBundle([legacy,{...legacy,id:'DUPLICATE'}],legacy.attributes.identifier),/exact/);
});
