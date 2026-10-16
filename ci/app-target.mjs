import {readFileSync} from 'node:fs';
export function validateTarget(target,{requireAppID=false}={}) {
 if(target.bundleID!=='com.ronnguyen.fuehrerscheinvietduc.public')throw new Error('Wrong Public bundle');
 if(target.teamID!=='285CT4P989')throw new Error('Wrong Public team');
 if(target.appID==='6793430149')throw new Error('Refusing the existing Unlisted App ID');
 if(target.appID!==null&&(typeof target.appID!=='string'||!/^[0-9]+$/.test(target.appID)))throw new Error('Invalid Public App ID');
 if(requireAppID&&target.appID===null)throw new Error('Create the Public app record and set its actual App ID before signing/upload');
 if(!/^\d+\.\d+\.\d+$/.test(target.version)||!/^\d+$/.test(target.build))throw new Error('Invalid version/build');
 return target;
}
export function readTarget(options) {
 return validateTarget(JSON.parse(readFileSync(new URL('./app-target.json',import.meta.url),'utf8')),options);
}
