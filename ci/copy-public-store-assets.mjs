// Copy existing App Store screenshots and review contact inside the same Apple account.
// Never prints reviewer credentials, contact information, signed URLs or API secrets.
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createAscClient,validateUploadOperations} from './asc-client.mjs';
import {readTarget} from './app-target.mjs';
const api=createAscClient();
const target=readTarget({requireAppID:true});
const source='6793430149';
if(target.appID!=='6823455331') throw new Error('Unexpected Public target');
const rel=(type,id)=>({data:{type,id}});
for(const [id,bundle] of [[source,'com.ronnguyen.fuehrerscheinvietduc'],[target.appID,target.bundleID]]) {
  if((await api('/v1/apps/'+id)).data.attributes.bundleId!==bundle) throw new Error('App identity mismatch');
}
const oldVersions=(await api('/v1/apps/'+source+'/appStoreVersions?limit=100')).data;
const oldVersion=oldVersions.find(x=>x.attributes.versionString==='1.0.11');
const newVersion=(await api('/v1/apps/'+target.appID+'/appStoreVersions?limit=100')).data.find(x=>x.attributes.versionString===target.version);
if(!oldVersion||!newVersion||newVersion.attributes.appStoreState!=='PREPARE_FOR_SUBMISSION') throw new Error('Expected editable new version and tested source');
const oldLocs=(await api('/v1/appStoreVersions/'+oldVersion.id+'/appStoreVersionLocalizations?limit=100')).data;
const newLocs=(await api('/v1/appStoreVersions/'+newVersion.id+'/appStoreVersionLocalizations?limit=100')).data;
for(const oldLoc of oldLocs) {
  const newLoc=newLocs.find(x=>x.attributes.locale===oldLoc.attributes.locale);
  if(!newLoc) { console.log('Locale needs manual setup:',oldLoc.attributes.locale); continue; }
  const oldSets=(await api('/v1/appStoreVersionLocalizations/'+oldLoc.id+'/appScreenshotSets?limit=100')).data;
  const newSets=(await api('/v1/appStoreVersionLocalizations/'+newLoc.id+'/appScreenshotSets?limit=100')).data;
  for(const oldSet of oldSets) {
    const shots=(await api('/v1/appScreenshotSets/'+oldSet.id+'/appScreenshots?limit=100')).data;
    if(!shots.length) continue;
    const display=oldSet.attributes.screenshotDisplayType;
    let newSet=newSets.find(x=>x.attributes.screenshotDisplayType===display);
    if(!newSet) newSet=(await api('/v1/appScreenshotSets','POST',{data:{type:'appScreenshotSets',attributes:{screenshotDisplayType:display},relationships:{appStoreVersionLocalization:rel('appStoreVersionLocalizations',newLoc.id)}}})).data;
    const existing=(await api('/v1/appScreenshotSets/'+newSet.id+'/appScreenshots?limit=100')).data;
    for(const shot of shots) {
      let copy=existing.find(x=>x.attributes.fileName===shot.attributes.fileName);
      if(copy) {
        if(copy.attributes.assetDeliveryState?.state!=='COMPLETE') throw new Error('Existing screenshot is incomplete; inspect before retry');
        continue;
      }
      const a=shot.attributes.imageAsset;
      if(!a?.templateUrl||!a.width||!a.height) throw new Error('Source image unavailable');
      const url=new URL(a.templateUrl.replaceAll('{w}',String(a.width)).replaceAll('{h}',String(a.height)).replaceAll('{c}','bb').replaceAll('{f}','png'));
      if(url.protocol!=='https:'||!url.hostname.endsWith('.mzstatic.com')) throw new Error('Unexpected Apple image host');
      const image=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});
      if(!image.ok) throw new Error('Apple source image download HTTP '+image.status);
      const bytes=Buffer.from(await image.arrayBuffer());
      copy=(await api('/v1/appScreenshots','POST',{data:{type:'appScreenshots',attributes:{fileSize:bytes.length,fileName:shot.attributes.fileName},relationships:{appScreenshotSet:rel('appScreenshotSets',newSet.id)}}})).data;
      validateUploadOperations(copy.attributes.uploadOperations,bytes.length);
      for(const op of copy.attributes.uploadOperations) {
        const r=await fetch(op.url,{method:op.method,headers:Object.fromEntries((op.requestHeaders||[]).map(x=>[x.name,x.value])),body:bytes.subarray(op.offset,op.offset+op.length),signal:AbortSignal.timeout(60000),redirect:'error'});
        if(!r.ok) throw new Error('Apple screenshot upload HTTP '+r.status);
      }
      await api('/v1/appScreenshots/'+copy.id,'PATCH',{data:{type:'appScreenshots',id:copy.id,attributes:{uploaded:true,sourceFileChecksum:createHash('md5').update(bytes).digest('hex')}}});
      let state;
      for(let i=0;i<30;i++) {
        state=(await api('/v1/appScreenshots/'+copy.id)).data.attributes.assetDeliveryState?.state;
        if(state==='COMPLETE') break;
        if(state==='FAILED') throw new Error('Apple screenshot processing failed');
        await delay(2000);
      }
      if(state!=='COMPLETE') throw new Error('Screenshot processing pending; inspect before retry');
      console.log('Screenshot copied:',oldLoc.attributes.locale,display,shot.attributes.fileName);
    }
  }
}
const oldReview=(await api('/v1/appStoreVersions/'+oldVersion.id+'/appStoreReviewDetail')).data;
const fields=['contactFirstName','contactLastName','contactPhone','contactEmail','demoAccountName','demoAccountPassword','demoAccountRequired'];
const attributes=Object.fromEntries(fields.map(k=>[k,oldReview.attributes[k]]));
attributes.notes='Public replacement of our existing Unlisted app Führerschein Viet-Duc (Apple ID 6793430149), following Apple Support case 102997712728: a new app record and binary are required for Public distribution. Both apps belong to the same developer and use the same production learning backend. This app is intended for individual Vietnamese-speaking learners preparing for the German class B theory exam.\n\nVersion 1.0.0 (1) contains the AI Learning Assistant and Speed Room features tested by the account holder in TestFlight on our existing app, version 1.0.11 (22). Sign in using the demo credentials in the sign-in fields. A participant account must be activated; AI entitlement and quota are controlled by the backend.\n\nAI: open Trợ lý AI / KI-Lernassistent from Home. It supports learning profile, chat history, quick prompts and quota display. Speed Room: open Phòng luyện tốc độ from Home, join a round and answer within the countdown. Scoring is performed by the server. Existing learning, mock exams, wrong questions, marked questions and account functions are preserved. Account deletion is available in the account/profile area.\n\nSupport: https://nguyenron.com/fuehrerschein-backend/support.php\nPrivacy: https://nguyenron.com/fuehrerschein-backend/privacy.php';
let review;
try { review=(await api('/v1/appStoreVersions/'+newVersion.id+'/appStoreReviewDetail')).data; } catch(e) { if(e.status!==404) throw e; }
if(review) await api('/v1/appStoreReviewDetails/'+review.id,'PATCH',{data:{type:'appStoreReviewDetails',id:review.id,attributes}});
else await api('/v1/appStoreReviewDetails','POST',{data:{type:'appStoreReviewDetails',attributes,relationships:{appStoreVersion:rel('appStoreVersions',newVersion.id)}}});
console.log('PUBLIC_STORE_ASSETS_READY',target.appID,target.version,'review contact copied without logging');
