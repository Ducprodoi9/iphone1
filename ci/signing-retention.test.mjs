import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {generateKeyPairSync} from 'node:crypto';

// Exercise the real cleanup command. Only the Apple network boundary is replaced;
// a DELETE records a real revocation attempt so the former bug fails this test.
function cleanup(record,uploadState='COMPLETE',buildState='VALID') {
  const directory=mkdtempSync(join(tmpdir(),'signing-retention-'));
  const journal=join(directory,'journal.json');
  const callsFile=join(directory,'calls.json');
  writeFileSync(callsFile,'[]');
  writeFileSync(journal,JSON.stringify({appID:'6823455331',certificateID:'CERT_OWNED',profileID:'PROFILE_OWNED',uploadID:'UPLOAD_OWNED',...record}));
  const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'});
  const script=`
    import {writeFileSync} from 'node:fs';
    const calls=[];
    globalThis.fetch=async (url,options)=>{
      const path=new URL(url).pathname;
      calls.push([options.method,path]);
      writeFileSync(${JSON.stringify(callsFile)},JSON.stringify(calls));
      const data=path.startsWith('/v1/buildUploads/')?{attributes:{state:{state:${JSON.stringify(uploadState)}}},relationships:${uploadState==='AWAITING_UPLOAD'?'{}':"{build:{data:{id:'BUILD_OWNED'}}}"}}:{attributes:{processingState:${JSON.stringify(buildState)}}};
      return {ok:true,status:options.method==='DELETE'?204:200,json:async()=>({data})};
    };
    process.argv[2]=${JSON.stringify(journal)};
    await import('./ci/cleanup-signing.mjs');
  `;
  try {
    execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),env:{...process.env,ASC_KEY_ID:'TESTKEY123',ASC_ISSUER_ID:'00000000-0000-0000-0000-000000000000',ASC_PRIVATE_KEY:key},stdio:'pipe'});
    return {record:JSON.parse(readFileSync(journal,'utf8')),calls:JSON.parse(readFileSync(callsFile,'utf8'))};
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('VALID uploaded build retains its signing certificate and profile for App Review',()=>{
  const result=cleanup({uploadStarted:true,processingFinished:true});
  assert.equal(result.record.certificateID,'CERT_OWNED');
  assert.equal(result.record.profileID,'PROFILE_OWNED');
  assert.deepEqual(result.calls.filter(([method])=>method==='DELETE'),[]);
});
test('reconciled VALID upload does not revoke signing assets before submission',()=>{
  const result=cleanup({uploadStarted:true,processingFinished:false});
  assert.equal(result.record.certificateID,'CERT_OWNED');
  assert.equal(result.record.profileID,'PROFILE_OWNED');
  assert.deepEqual(result.calls.filter(([method])=>method==='DELETE'),[]);
});
test('uncommitted failed archive still cleans only its own temporary signing resources',()=>{
  const result=cleanup({uploadStarted:false,processingFinished:false,uploadID:null});
  assert.deepEqual(result.calls,[['DELETE','/v1/profiles/PROFILE_OWNED'],['DELETE','/v1/certificates/CERT_OWNED']]);
  assert.equal(result.record.certificateID,null);
  assert.equal(result.record.profileID,null);
});
