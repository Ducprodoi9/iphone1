import {createPrivateKey,sign} from 'node:crypto';

export function createAscClient(env=process.env, fetchFn=fetch) {
  const keyID=env.ASC_KEY_ID, issuer=env.ASC_ISSUER_ID;
  if(!/^[A-Z0-9]{10}$/.test(keyID||'')) throw new Error('Invalid ASC_KEY_ID');
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(issuer||'')) throw new Error('Invalid ASC_ISSUER_ID');
  const key=createPrivateKey(env.ASC_PRIVATE_KEY||'');
  if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1') throw new Error('Invalid Apple P-256 private key');
  return async function api(path,method='GET',body) {
    if(!path.startsWith('/v1/')||path.includes('://')) throw new Error('Only the official Apple v1 API is allowed');
    const now=Math.floor(Date.now()/1000),b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const input=`${b64({alg:'ES256',kid:keyID,typ:'JWT'})}.${b64({iss:issuer,iat:now-30,exp:now+300,aud:'appstoreconnect-v1'})}`;
    const token=input+'.'+sign('sha256',Buffer.from(input),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');
    const r=await fetchFn('https://api.appstoreconnect.apple.com'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000),redirect:'error'});
    const data=r.status===204?{}:await r.json();
    if(!r.ok) { const e=new Error(`Apple ${method} ${path.split('?')[0]} HTTP ${r.status}: `+(data.errors||[]).map(x=>`${x.code}: ${x.detail||x.title||''}`).join('; '));e.status=r.status;throw e; }
    return data;
  };
}
export function validateUploadOperations(operations,size) {
  if(!Array.isArray(operations)||!operations.length) throw new Error('No Apple upload operations');
  let offset=0;
  for(const op of [...operations].sort((a,b)=>a.offset-b.offset)) {
    const u=new URL(op.url);
    if(u.protocol!=='https:'||!['apple.com','icloud.com','amazonaws.com','apple-cloudkit.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d))) throw new Error('Unexpected upload destination');
    if(op.method!=='PUT'||!Number.isSafeInteger(op.offset)||!Number.isSafeInteger(op.length)||op.length<=0||op.offset!==offset||op.offset+op.length>size) throw new Error('Invalid or overlapping upload ranges');
    if((op.requestHeaders||[]).some(h=>h.name.toLowerCase()==='authorization'&&h.value.startsWith('Bearer '))) throw new Error('Unexpected bearer token on asset upload');
    offset+=op.length;
  }
  if(offset!==size) throw new Error('Upload ranges do not cover the full IPA');
}
