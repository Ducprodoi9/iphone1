import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {createAscClient,validateUploadOperations} from './asc-client.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const env={ASC_KEY_ID:'TESTKEY123',ASC_ISSUER_ID:'8ada664b-7fe1-4e89-bd2c-b3ab8f979540',ASC_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
test('Apple REST JWT is valid ES256 and restricted to official API origin',async()=>{
 let request;const api=createAscClient(env,async(url,options)=>{request={url,options};return {ok:true,status:200,json:async()=>({data:{id:'app'}})};});
 await api('/v1/apps/6793430149');
 assert.equal(request.url,'https://api.appstoreconnect.apple.com/v1/apps/6793430149');
 const token=request.options.headers.Authorization.slice(7),[header,payload,sig]=token.split('.');
 assert.equal(JSON.parse(Buffer.from(header,'base64url')).alg,'ES256');
 const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.iss,env.ASC_ISSUER_ID);assert.equal(claims.aud,'appstoreconnect-v1');assert.ok(claims.exp-claims.iat<=330);
 assert.equal(verify('sha256',Buffer.from(header+'.'+payload),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')),true);
 await assert.rejects(()=>api('https://example.com/v1/apps'),/official/);
});
test('failed certificate POST is never silently retried',async()=>{
 let calls=0;const api=createAscClient(env,async()=>{calls++;return {ok:false,status:409,json:async()=>({errors:[{code:'LIMIT_REACHED',detail:'Certificate quota reached'}]})};});
 await assert.rejects(()=>api('/v1/certificates','POST',{data:{}}),/409.*LIMIT_REACHED/);assert.equal(calls,1);
});
test('upload operations must cover entire file with no gaps or overlaps',()=>{
 const ops=[{method:'PUT',url:'https://upload.apple.com/a',offset:0,length:3},{method:'PUT',url:'https://store.s3.amazonaws.com/b',offset:3,length:2}];
 validateUploadOperations(ops,5);
 assert.throws(()=>validateUploadOperations([{...ops[0],length:4},ops[1]],5),/ranges/);
 assert.throws(()=>validateUploadOperations([ops[0]],5),/full IPA/);
});
test('asset upload rejects insecure hosts and REST bearer credentials',()=>{
 const op={method:'PUT',url:'https://upload.apple.com/a',offset:0,length:5};
 for(const url of ['http://upload.apple.com/a','https://apple.com.example.com/a','https://example.com/a'])assert.throws(()=>validateUploadOperations([{...op,url}],5),/destination/);
 assert.throws(()=>validateUploadOperations([{...op,requestHeaders:[{name:'Authorization',value:'Bearer secret'}]}],5),/bearer/);
});
