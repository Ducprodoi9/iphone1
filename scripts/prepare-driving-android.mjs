import {readFile,writeFile,cp,access,rm} from 'node:fs/promises';
const app='mobile-app-source';
const source=`${app}/dist`;
const sourceIndex=await readFile(`${source}/index.html`,'utf8');
for(const asset of ['runtime.js','ai-assistant.js','speed-room.js','ai-explanations.js','ai-explanations.css']) {
  await access(`${source}/features/${asset}`);
  if(!sourceIndex.includes(`features/${asset}`)) throw new Error(`Fresh build does not load ${asset}`);
}
const config={
  appId:'com.ronnguyen.fuehrerscheinvietduc',appName:'Führerschein Viet-Duc',webDir:'android-web',
  android:{backgroundColor:'#ffffff',allowMixedContent:false,captureInput:true},
  server:{androidScheme:'https'},
  plugins:{CapacitorHttp:{enabled:true},SystemBars:{insetsHandling:'css',style:'LIGHT'}}
};
await writeFile(`${app}/capacitor.config.ts`,'export default '+JSON.stringify(config,null,2)+';\n');
await rm(`${app}/android-web`,{recursive:true,force:true});
await cp(source,`${app}/android-web`,{recursive:true});
await cp(`${app}/public/features/android-bootstrap.js`,`${app}/android-web/features/android-bootstrap.js`);
const index=await readFile(`${app}/android-web/index.html`,'utf8');
await writeFile(`${app}/android-web/index.html`,index.replace('viewport-fit=cover','viewport-fit=contain').replace('</head>','<script src="./features/android-bootstrap.js"></script></head>'));
console.log('Packaged fresh shared frontend with AI explanations, AI Assistant and Speed Room.');
