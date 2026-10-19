import {readFileSync} from 'node:fs';
export function validateTarget(target) {
 if(target.appID!=='6793430149')throw new Error('Wrong existing app ID');
 if(target.bundleID!=='com.ronnguyen.fuehrerscheinvietduc')throw new Error('Wrong existing app bundle');
 if(target.teamID!=='285CT4P989')throw new Error('Wrong existing app team');
 if(!/^\d+\.\d+\.\d+$/.test(target.version)||!/^\d+$/.test(target.build))throw new Error('Invalid version/build');
 return target;
}
export function readTarget() {
 return validateTarget(JSON.parse(readFileSync(new URL('./app-target.json',import.meta.url),'utf8')));
}
