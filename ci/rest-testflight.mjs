import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {createAscClient,validateUploadOperations} from './asc-client.mjs';

import {readTarget} from './app-target.mjs';
const {appID:APP,bundleID:BUNDLE,teamID:TEAM,version:VERSION,build:BUILD}=readTarget({requireAppID:true});
if(process.platform!=='darwin') throw new Error('Signing requires a macOS runner');
const api=createAscClient();
const temp=mkdtempSync(join(process.env.RUNNER_TEMP||'/tmp','vietduc-rest-'));
const archive=process.argv[2];
const journalPath=join(process.env.RUNNER_TEMP||'/tmp','vietduc-signing-resources.json');
const journal={appID:APP,runID:process.env.GITHUB_RUN_ID,certificateID:null,profileID:null,uploadID:null,uploadStarted:false,processingFinished:false};
const saveJournal=()=>writeFileSync(journalPath,JSON.stringify(journal),{mode:0o600});
saveJournal();
let certificateID,profileID,keychainPath,priorKeychains,profilePaths=[],uploadStarted=false,processingFinished=false;
const keychainPassword=randomBytes(30).toString('base64url');
console.log('::add-mask::'+keychainPassword);
const run=(cmd,args,options={})=>{try{return execFileSync(cmd,args,{stdio:'inherit',...options});}catch(error){throw new Error(cmd+' failed (exit '+error.status+'); command arguments redacted');}};
const capture=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8'}).trim();
const jsonPlist=(out,obj)=>run('python3',['-c','import plistlib,json,sys; plistlib.dump(json.loads(sys.argv[2]),open(sys.argv[1],"wb"))',out,JSON.stringify(obj)]);
const pollBuild=async uploadID=>{
  const end=Date.now()+14*60*1000;let previous='';
  while(Date.now()<end){
    const d=await api('/v1/buildUploads/'+uploadID+'?include=build');
    const state=d.data.attributes?.state?.state;
    if(state!==previous){console.log('Apple build upload state:',state);previous=state;}
    if(state==='FAILED'){processingFinished=true;throw new Error('Apple validation failed: '+JSON.stringify(d.data.attributes.state.errors||[]));}
    const buildID=d.data.relationships?.build?.data?.id;
    if(buildID){
      const b=(await api('/v1/builds/'+buildID)).data;
      console.log('Build',buildID,'processing:',b.attributes.processingState);
      if(b.attributes.processingState==='VALID'){
        processingFinished=true;
        console.log('TESTFLIGHT_BUILD_VALID',VERSION,BUILD,buildID);
        writeFileSync(join(process.env.RUNNER_TEMP||'/tmp','vietduc-build-result.json'),JSON.stringify({appID:APP,version:VERSION,build:BUILD,buildID,processingState:'VALID'}));
        return;
      }
      if(['FAILED','INVALID'].includes(b.attributes.processingState)){processingFinished=true;throw new Error('Apple build processing rejected: '+b.attributes.processingState);}
    }
    await delay(20000);
  }
  throw new Error('Upload accepted; Apple processing exceeded the bounded polling window. Check TestFlight before retrying.');
};
try {
  const archiveInfo=JSON.parse(capture('python3',['-c','import plistlib,json,sys; print(json.dumps(plistlib.load(open(sys.argv[1],"rb"))))',join(archive,'Products/Applications/FuehrerscheinVietDuc.app/Info.plist')]));
  if(archiveInfo.CFBundleIdentifier!==BUNDLE||archiveInfo.CFBundleShortVersionString!==VERSION||String(archiveInfo.CFBundleVersion)!==BUILD||archiveInfo.DTPlatformName!=='iphoneos') throw new Error('Archive app/version/build/platform mismatch; signing has not started');
  const app=(await api('/v1/apps/'+APP+'?fields%5Bapps%5D=bundleId')).data;
  if(app.attributes.bundleId!==BUNDLE) throw new Error('Wrong App Store bundle');
  const existing=await api('/v1/builds?filter%5Bapp%5D='+APP+'&filter%5Bversion%5D='+BUILD+'&include=preReleaseVersion&limit=100');
  const releases=new Map((existing.included||[]).map(x=>[x.id,x.attributes.version]));
  if(existing.data.some(x=>releases.get(x.relationships?.preReleaseVersion?.data?.id)===VERSION)) throw new Error('This version/build already exists; inspect processing state before any new upload.');
  const bundles=(await api('/v1/bundleIds?filter%5Bidentifier%5D='+BUNDLE)).data;
  if(bundles.length!==1) throw new Error('Expected exactly one existing registered bundle ID');
  const bundleID=bundles[0].id;
  const keyPath=join(temp,'distribution.key'),csrPath=join(temp,'distribution.csr');
  run('openssl',['genrsa','-out',keyPath,'2048']);
  run('openssl',['req','-new','-key',keyPath,'-out',csrPath,'-subj','/CN=VietDuc TestFlight CI/OU='+TEAM]);
  const cert=(await api('/v1/certificates','POST',{data:{type:'certificates',attributes:{certificateType:'DISTRIBUTION',csrContent:readFileSync(csrPath,'utf8')}}})).data;
  certificateID=cert.id; journal.certificateID=certificateID; saveJournal();
  console.log('Created a CI-owned distribution certificate:',certificateID);
  const certBytes=Buffer.from(cert.attributes.certificateContent,'base64');
  const certPath=join(temp,'distribution.cer'),pemPath=join(temp,'distribution.pem'),p12Path=join(temp,'distribution.p12');
  writeFileSync(certPath,certBytes,{mode:0o600});
  run('openssl',['x509','-inform','DER','-in',certPath,'-out',pemPath]);
  run('openssl',['pkcs12','-export','-keypbe','PBE-SHA1-3DES','-certpbe','PBE-SHA1-3DES','-macalg','sha1','-inkey',keyPath,'-in',pemPath,'-out',p12Path,'-passout','env:CI_P12_PASSWORD'],{env:{...process.env,CI_P12_PASSWORD:keychainPassword}});
  keychainPath=join(temp,'signing.keychain-db');
  priorKeychains=[...capture('security',['list-keychains','-d','user']).matchAll(/"([^\"]+)"/g)].map(x=>x[1]);
  run('security',['create-keychain','-p',keychainPassword,keychainPath]);
  run('security',['set-keychain-settings','-lut','21600',keychainPath]);
  run('security',['unlock-keychain','-p',keychainPassword,keychainPath]);
  run('security',['list-keychains','-d','user','-s',keychainPath,...priorKeychains]);
  run('security',['import',p12Path,'-k',keychainPath,'-P',keychainPassword,'-T','/usr/bin/codesign','-T','/usr/bin/security']);
  run('security',['set-key-partition-list','-S','apple-tool:,apple:,codesign:','-s','-k',keychainPassword,keychainPath]);
  const profile=(await api('/v1/profiles','POST',{data:{type:'profiles',attributes:{name:'VietDuc-CI-'+(process.env.GITHUB_RUN_ID||Date.now())+'-'+randomBytes(3).toString('hex'),profileType:'IOS_APP_STORE'},relationships:{bundleId:{data:{type:'bundleIds',id:bundleID}},certificates:{data:[{type:'certificates',id:certificateID}]}}}})).data;
  profileID=profile.id; journal.profileID=profileID; saveJournal();
  const uuid=profile.attributes.uuid;
  if(!/^[0-9A-F-]+$/i.test(uuid)) throw new Error('Invalid profile UUID');
  for(const folder of ['Library/MobileDevice/Provisioning Profiles','Library/Developer/Xcode/UserData/Provisioning Profiles']){
    const p=join(homedir(),folder,uuid+'.mobileprovision');mkdirSync(dirname(p),{recursive:true});writeFileSync(p,Buffer.from(profile.attributes.profileContent,'base64'),{mode:0o600});profilePaths.push(p);
  }
  const exportOptions=join(temp,'ExportOptions.plist'),exportPath=join(temp,'export');
  jsonPlist(exportOptions,{method:'app-store-connect',destination:'export',teamID:TEAM,signingStyle:'manual',signingCertificate:createHash('sha1').update(certBytes).digest('hex').toUpperCase(),provisioningProfiles:{[BUNDLE]:uuid},manageAppVersionAndBuildNumber:false,uploadSymbols:false,stripSwiftSymbols:true});
  run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportPath',exportPath,'-exportOptionsPlist',exportOptions]);
  const ipaNames=readdirSync(exportPath).filter(x=>x.endsWith('.ipa'));
  if(ipaNames.length!==1) throw new Error('Expected exactly one exported IPA');
  const ipaPath=join(exportPath,ipaNames[0]);
  const verifiedPath=join(temp,'verify-ipa');
  run('ditto',['-x','-k',ipaPath,verifiedPath]);
  const signedApp=join(verifiedPath,'Payload','FuehrerscheinVietDuc.app');
  run('codesign',['--verify','--deep','--strict','--verbose=2',signedApp]);
  const leafPrefix=join(temp,'signed-certificate-');
  run('codesign',['--display','--extract-certificates',leafPrefix,signedApp]);
  if(!readFileSync(leafPrefix+'0').equals(certBytes)) throw new Error('IPA signed with an unexpected certificate');
  const embeddedProfile=capture('security',['cms','-D','-i',join(signedApp,'embedded.mobileprovision')]);
  run('python3',['-c',
    'import plistlib,sys,datetime; p=plistlib.loads(sys.argv[1].encode()); e=p["Entitlements"]; assert e["application-identifier"]==sys.argv[2]; assert e.get("get-task-allow",False)==False; assert not p.get("ProvisionedDevices"); assert not p.get("ProvisionsAllDevices",False); assert p["ExpirationDate"]>datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)',
    embeddedProfile,TEAM+'.'+BUNDLE]);
  console.log('IPA_SIGNATURE_VERIFIED: strict codesign, distribution certificate and App Store profile match.');
  const ipa=readFileSync(ipaPath);
  console.log('Manually signed IPA exported; bytes:',ipa.length);
  const upload=(await api('/v1/buildUploads','POST',{data:{type:'buildUploads',attributes:{cfBundleShortVersionString:VERSION,cfBundleVersion:BUILD,platform:'IOS'},relationships:{app:{data:{type:'apps',id:APP}}}}})).data;
  journal.uploadID=upload.id; saveJournal();
  console.log('Created build upload:',upload.id);
  const file=(await api('/v1/buildUploadFiles','POST',{data:{type:'buildUploadFiles',attributes:{assetType:'ASSET',fileName:ipaNames[0],fileSize:ipa.length,uti:'com.apple.ipa'},relationships:{buildUpload:{data:{type:'buildUploads',id:upload.id}}}}})).data;
  const operations=file.attributes.uploadOperations;
  validateUploadOperations(operations,ipa.length);
  for(const op of operations){
    const headers=Object.fromEntries((op.requestHeaders||[]).map(h=>[h.name,h.value]));
    const r=await fetch(op.url,{method:'PUT',headers,body:ipa.subarray(op.offset,op.offset+op.length),signal:AbortSignal.timeout(120000),redirect:'error'});
    if(!r.ok) throw new Error('Apple asset PUT failed: HTTP '+r.status);
  }
  uploadStarted=true; journal.uploadStarted=true; saveJournal();
  try {
    await api('/v1/buildUploadFiles/'+file.id,'PATCH',{data:{type:'buildUploadFiles',id:file.id,attributes:{uploaded:true,sourceFileChecksums:{file:{algorithm:'MD5',hash:createHash('md5').update(ipa).digest('hex')}}}}});
  } catch(error) {
    // A definitive validation rejection can be reconciled; network failures stay ambiguous.
    if(/HTTP (400|422)\b/.test(error.message)){journal.commitRejected=true;saveJournal();}
    throw error;
  }
  console.log('IPA committed through the App Store Connect REST API.');
  await pollBuild(upload.id);
} finally {
  journal.processingFinished=processingFinished; saveJournal();
  // Upload VALID is not App Review acceptance. Keep the registered signing
  // assets after upload; removing local private keys/keychain remains safe.
  if(!uploadStarted){
    if(profileID) try{await api('/v1/profiles/'+profileID,'DELETE');journal.profileID=null;saveJournal();console.log('Removed CI-owned profile:',profileID);}catch(e){console.error(e.message);}
    if(certificateID) try{await api('/v1/certificates/'+certificateID,'DELETE');journal.certificateID=null;saveJournal();console.log('Removed CI-owned certificate:',certificateID);}catch(e){console.error(e.message);}
  }else {
    journal.retainedForAppReview=true;saveJournal();
    console.log('Retained CI-owned certificate/profile for App Review:',certificateID,profileID);
  }
  for(const p of profilePaths) rmSync(p,{force:true});
  if(priorKeychains) try{run('security',['list-keychains','-d','user','-s',...priorKeychains]);}catch{}
  if(keychainPath&&existsSync(keychainPath)) try{run('security',['delete-keychain',keychainPath]);}catch{}
  rmSync(temp,{recursive:true,force:true});
}
