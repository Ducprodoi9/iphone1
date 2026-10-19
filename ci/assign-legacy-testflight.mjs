import {createAscClient} from './asc-client.mjs';
import {readTarget} from './app-target.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const api=createAscClient(), target=readTarget();
try {
 if(target.appID!=='6793430149'||target.bundleID!=='com.ronnguyen.fuehrerscheinvietduc'||target.version!=='1.0.12'||target.build!=='23')throw new Error('Legacy target mismatch');
 let build;
 const end=Date.now()+15*60*1000;
 while(Date.now()<end) {
  const d=await api('/v1/builds?filter%5Bapp%5D='+target.appID+'&filter%5Bversion%5D=23&include=preReleaseVersion&limit=100');
  const releases=new Map((d.included||[]).map(x=>[x.id,x.attributes?.version]));
  const exact=d.data.filter(b=>b.attributes.version===target.build&&releases.get(b.relationships?.preReleaseVersion?.data?.id)===target.version);
  if(exact.length>1)throw new Error('Legacy build selection is ambiguous');
  if(exact[0]?.attributes.processingState==='VALID'){build=exact[0];break;}
  if(['INVALID','FAILED'].includes(exact[0]?.attributes.processingState))throw new Error('Legacy build processing failed');
  console.log('Waiting for legacy 1.0.12 (23) processing');
  await delay(20000);
 }
 if(!build)throw new Error('Legacy build not ready within bounded wait');
 const groups=await api('/v1/apps/'+target.appID+'/betaGroups?limit=200');
 const exact=groups.data.filter(g=>g.attributes.name==='VietDuc Internal'&&g.attributes.isInternalGroup===true);
 if(exact.length!==1)throw new Error('Existing internal group selection is ambiguous');
 const group=exact[0];
 const groupApp=await api('/v1/betaGroups/'+group.id+'/app');
 if(groupApp.data.id!==target.appID)throw new Error('Internal group belongs to another app');
 const relation='/v1/builds/'+build.id+'/relationships/betaGroups';
 const before=await api(relation);
 if(!before.data.some(g=>g.id===group.id))await api(relation,'POST',{data:[{type:'betaGroups',id:group.id}]});
 const after=await api(relation);
 if(!after.data.some(g=>g.id===group.id))throw new Error('TestFlight group assignment was not confirmed');
 console.log('LEGACY_TESTFLIGHT_READY 1.0.12 (23) - VietDuc Internal');
 try {
  const notes='Build 23: Giai thich AI tai tung cau hoi. Vao Hoc, mo cau, bam AI canh bong den. Kiem tra Cau sai/Danh dau va xem lai sau thi. Nut AI chi hien khi backend cap quyen. Thu mat mang, Thu lai, bam lien tiep va chuyen cau khi dang tai. Kiem tra lai hoc, thi thu, dang nhap, Tro ly AI va Speed Room.';
  const localizations=await api('/v1/builds/'+build.id+'/betaBuildLocalizations');
  const existing=localizations.data.find(x=>x.attributes.locale==='de-DE');
  if(existing)await api('/v1/betaBuildLocalizations/'+existing.id,'PATCH',{data:{type:'betaBuildLocalizations',id:existing.id,attributes:{whatsNew:notes}}});
  else await api('/v1/betaBuildLocalizations','POST',{data:{type:'betaBuildLocalizations',attributes:{locale:'de-DE',whatsNew:notes},relationships:{build:{data:{type:'builds',id:build.id}}}}});
  console.log('LEGACY_TESTFLIGHT_CHECKLIST_SAVED');
 } catch(e) {console.log('Optional TestFlight notes could not be saved; group assignment remains confirmed.');}
} catch(e) {
 console.error('Legacy TestFlight assignment stopped:',e.status?'Apple HTTP '+e.status:e.message);
 process.exitCode=1;
}
