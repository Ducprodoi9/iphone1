import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTarget,readTarget} from './app-target.mjs';
test('Legacy target is the existing app and agrees with native version and build',()=>{
 const t=readTarget();
 assert.equal(t.appID,'6793430149');assert.equal(t.bundleID,'com.ronnguyen.fuehrerscheinvietduc');
 const native=readFileSync(new URL('../ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc.xcodeproj/project.pbxproj',import.meta.url),'utf8');
 assert.ok(native.includes('CURRENT_PROJECT_VERSION = '+t.build+';'));
 assert.ok(native.includes('MARKETING_VERSION = '+t.version+';'));
 assert.ok(native.includes('PRODUCT_BUNDLE_IDENTIFIER = '+t.bundleID+';'));
 assert.equal(JSON.parse(readFileSync(new URL('../mobile-app-source/package.json',import.meta.url),'utf8')).version,t.version);
});
test('Legacy target refuses the Public app and wrong bundle or team',()=>{
 assert.throws(()=>validateTarget({...readTarget(),appID:'6823455331'}),/app ID/);
 assert.throws(()=>validateTarget({...readTarget(),bundleID:'com.ronnguyen.fuehrerscheinvietduc.public'}),/bundle/);
 assert.throws(()=>validateTarget({...readTarget(),teamID:'3JD7L6FN23'}),/team/);
});
test('Legacy target refuses absent app record or malformed version/build',()=>{
 assert.throws(()=>validateTarget({...readTarget(),appID:null}),/app ID/);
 assert.throws(()=>validateTarget({...readTarget(),version:'1.0'}),/version/);
 assert.throws(()=>validateTarget({...readTarget(),build:'23x'}),/build/);
});
