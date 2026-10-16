import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createAscClient} from './asc-client.mjs';
const path=process.argv[2]||join(process.env.RUNNER_TEMP||'/tmp','vietduc-signing-resources.json');
if(!existsSync(path)){console.log('No signing resources were created.');process.exit(0);}
const record=JSON.parse(readFileSync(path,'utf8'));
const {readTarget}=await import('./app-target.mjs');
if(record.appID!==readTarget({requireAppID:true}).appID)throw new Error('Unexpected signing journal app');
const api=createAscClient();
if(record.uploadStarted&&!record.processingFinished){
  const upload=(await api('/v1/buildUploads/'+encodeURIComponent(record.uploadID)+'?include=build')).data;
  const buildID=upload.relationships?.build?.data?.id;
  let terminal=upload.attributes?.state?.state==='FAILED';
  if(record.commitRejected&&upload.attributes?.state?.state==='AWAITING_UPLOAD'){
    await api('/v1/buildUploads/'+encodeURIComponent(record.uploadID),'DELETE');
    record.uploadID=null;terminal=true;
    console.log('Removed abandoned CI upload after definitive commit rejection.');
  }
  if(buildID){const build=(await api('/v1/builds/'+encodeURIComponent(buildID))).data;terminal=['VALID','INVALID','FAILED'].includes(build.attributes.processingState);}
  if(!terminal){console.log('Apple processing pending; retained only the signing IDs recorded in the cleanup artifact. Re-run this script with that journal after processing finishes.');process.exit(0);}
  record.processingFinished=true;
}
for(const [field,collection]of [['profileID','profiles'],['certificateID','certificates']]){
  if(!record[field])continue;
  try{await api('/v1/'+collection+'/'+encodeURIComponent(record[field]),'DELETE');}
  catch(e){if(!e.message.includes('HTTP 404'))throw e;}
  console.log('Cleaned CI-owned',field,record[field]);record[field]=null;
  writeFileSync(path,JSON.stringify(record),{mode:0o600});
}
