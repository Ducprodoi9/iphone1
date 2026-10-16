import { createPrivateKey, sign } from 'node:crypto';
import {readTarget} from './app-target.mjs';
const target=readTarget({requireAppID:true});

// A read-only REST probe isolates API credentials from Xcode's export authentication.
// Never log the key, JWT, Authorization header or request options.
const { ASC_KEY_ID: keyID, ASC_ISSUER_ID: issuerID, ASC_PRIVATE_KEY: pem } = process.env;
if (!/^[A-Za-z0-9]+$/.test(keyID || '')) throw new Error('ASC_KEY_ID format invalid');
if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(issuerID || '')) {
  throw new Error('ASC_ISSUER_ID must be the exact UUID from Team Keys; check whitespace');
}
const key = createPrivateKey(pem || '');
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
  throw new Error('ASC_PRIVATE_KEY must be an Apple P-256 API private key');
}
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const input = `${b64({ alg:'ES256', kid:keyID, typ:'JWT' })}.${b64({ iss:issuerID, iat:now-30, exp:now+300, aud:'appstoreconnect-v1' })}`;
const signature = sign('sha256', Buffer.from(input), {key, dsaEncoding:'ieee-p1363'}).toString('base64url');
const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps/'+target.appID+'?fields%5Bapps%5D=bundleId,name', {
  headers: {Authorization:`Bearer ${input}.${signature}`}, signal:AbortSignal.timeout(20000),
});
console.log(`App Store Connect REST credential probe: HTTP ${response.status}`);
const data = await response.json();
if (!response.ok) {
  console.error('Apple error codes:', (data.errors || []).map(x => x.code).join(', ') || 'unknown');
  throw new Error('REST authentication/app access failed; archive/upload has not started');
}
if (data.data?.attributes?.bundleId !== target.bundleID) {
  throw new Error('App Store record does not match the existing iOS bundle');
}
console.log('REST authentication succeeded; existing app and bundle access confirmed.');
