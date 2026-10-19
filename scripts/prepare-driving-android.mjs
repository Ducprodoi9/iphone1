import {readFile,writeFile,cp,mkdir,rm} from 'node:fs/promises';
const app='mobile-app-source';
const config={
  appId:'com.ronnguyen.fuehrerscheinvietduc',appName:'Führerschein Viet-Duc',webDir:'android-web',
  android:{backgroundColor:'#ffffff',allowMixedContent:false,captureInput:true},
  server:{androidScheme:'https'},
  plugins:{CapacitorHttp:{enabled:true},SystemBars:{insetsHandling:'css',style:'LIGHT'}}
};
await writeFile(`${app}/capacitor.config.ts`,'export default '+JSON.stringify(config,null,2)+';\n');
await rm(`${app}/android-web`,{recursive:true,force:true});
await cp('ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc/www',`${app}/android-web`,{recursive:true});
await cp(`${app}/public/features/android-bootstrap.js`,`${app}/android-web/features/android-bootstrap.js`);
const index=await readFile(`${app}/android-web/index.html`,'utf8');
await writeFile(`${app}/android-web/index.html`,index.replace('viewport-fit=cover','viewport-fit=contain').replace('</head>','<script src="./features/android-bootstrap.js"></script></head>'));
console.log('Copied latest tested iOS bundle, AI and Speed Room to Android web assets.');
