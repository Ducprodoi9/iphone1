import {createAscClient} from './asc-client.mjs';
const api=createAscClient();
try {
 const publicApp='6823455331', publicBundle='com.ronnguyen.fuehrerscheinvietduc.public';
 const builds=await api('/v1/builds?filter%5Bapp%5D='+publicApp+'&filter%5Bversion%5D=3&include=preReleaseVersion&limit=100');
 const versions=new Map((builds.included||[]).map(x=>[x.id,x.attributes?.version]));
 const exact=builds.data.filter(b=>b.attributes.version==='3'&&versions.get(b.relationships?.preReleaseVersion?.data?.id)==='1.0.0');
 if(exact.length!==1)throw new Error('Public test build selection is ambiguous');
 const testBuild=exact[0];
 const submitted=await api('/v1/apps/'+publicApp+'/appStoreVersions?include=build&limit=200');
 if(submitted.links?.next)throw new Error('Cannot verify every App Store version safely');
 if(submitted.data.some(v=>v.relationships?.build?.data?.id===testBuild.id))throw new Error('Public build 3 is attached to an App Store version; revocation blocked');
 const profiles=await api('/v1/profiles?include=certificates,bundleId&limit=200');
 if(profiles.links?.next)throw new Error('Cannot verify every profile safely');
 const bundles=new Map((profiles.included||[]).filter(x=>x.type==='bundleIds').map(x=>[x.id,x.attributes.identifier]));
 const selected=profiles.data.filter(p=>p.attributes.name.startsWith('VietDuc-CI-39218620713-')&&bundles.get(p.relationships?.bundleId?.data?.id)===publicBundle);
 if(selected.length!==1)throw new Error('Approved CI signing profile selection is ambiguous');
 const profile=selected[0], ids=profile.relationships?.certificates?.data||[];
 if(ids.length!==1)throw new Error('Approved profile does not have exactly one signing certificate');
 const certID=ids[0].id;
 if(profiles.data.some(p=>p.id!==profile.id&&(p.relationships?.certificates?.data||[]).some(c=>c.id===certID)))throw new Error('Approved certificate is shared with another profile; revocation blocked');
 const cert=(await api('/v1/certificates/'+certID)).data;
 if(cert.attributes.certificateType!=='DISTRIBUTION')throw new Error('Unexpected certificate type');
 await api('/v1/profiles/'+profile.id,'DELETE');
 await api('/v1/certificates/'+certID,'DELETE');
 console.log('APPROVED_PUBLIC_BUILD3_SIGNING_SLOT_RELEASED');
 console.log('Other certificates, including the Public review build certificate, were not modified.');
} catch(e) {
 console.error('Approved slot operation stopped:',e.status?'Apple HTTP '+e.status:e.message);
 process.exitCode=1;
}
