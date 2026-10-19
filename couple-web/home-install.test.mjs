import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldOfferInstall,markInstallOffered,dismissInstall,installSteps,
 installStatus,installOfferHtml,installStepsHtml,requestInstall} from './home-install.mjs';

const read=name=>readFileSync(new URL('./'+name,import.meta.url));
function localStore(){
 const entries=new Map();
 return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};
}
test('only one optional offer per new user, never repeated on every sign-in',()=>{
 const db=localStore();
 assert.equal(shouldOfferInstall('new-user',db),true);
 markInstallOffered('new-user',db);
 assert.equal(shouldOfferInstall('new-user',db),false);
 assert.equal(shouldOfferInstall('another-user',db),true);
 dismissInstall('another-user',db);
 assert.equal(shouldOfferInstall('another-user',db),false);
 assert.equal(shouldOfferInstall(null,db),false);
});
test('native APK gets a home launcher guide, not a second APK/PWA installation',async()=>{
 const oldWindow=globalThis.window,oldNavigator=globalThis.navigator;
 try{
  globalThis.window={LoveRollNativeAuth:{},matchMedia:()=>({matches:false})};
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{userAgent:'Mozilla/5.0 (Linux; Android 16)',standalone:false}});
  assert.equal(installStatus(),'apk');
  assert.equal(shouldOfferInstall('new-native',localStore()),true);
  assert.match(installOfferHtml(),/Placer l’icône LoveRoll/);
  assert.match(installSteps().text,/liste des applications/);
  const result=await requestInstall();
  assert.equal(result.prompted,false);
  assert.equal(result.alreadyInstalled,true);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:oldNavigator});
 }
});
test('Messenger provides a copyable external browser guide; iPhone uses Safari',()=>{
 const oldWindow=globalThis.window,oldNavigator=globalThis.navigator;
 try{
  globalThis.window={matchMedia:()=>({matches:false})};
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{userAgent:'Mozilla/5.0 (iPhone) Messenger',platform:'iPhone',maxTouchPoints:5}});
  assert.equal(installStatus(),'embedded');
  assert.match(installSteps().text,/Safari/);
  assert.match(installStepsHtml(),/install-copy-url/);
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{userAgent:'Mozilla/5.0 (iPhone) Safari',platform:'iPhone',maxTouchPoints:5}});
  assert.match(installSteps().text,/Sur l’écran d’accueil/);
  globalThis.window={matchMedia:()=>({matches:true})};
  assert.equal(shouldOfferInstall('new-user',localStore()),false);
  assert.equal(installStatus(),'installed');
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:oldNavigator});
 }
});
test('real PWA icons, manifest, offline cache and entry points are present',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest').toString('utf8'));
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.name,'LoveRoll');
 for(const size of [192,512]){
  const file=read('assets/loveroll-icon-'+size+'.png');
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(file.readUInt32BE(16),size);
  assert.equal(file.readUInt32BE(20),size);
  assert.ok(manifest.icons.some(item=>item.sizes===size+'x'+size&&item.type==='image/png'));
 }
 const app=read('app.js').toString();
 const sw=read('service-worker.js').toString();
 assert.match(sw,/loveroll-icon-192.png/);
 assert.match(sw,/loveroll-icon-512.png/);
 assert.match(app,/state.installAfterSignup=true/);
 assert.match(app,/markInstallOffered\(state.user\?\.id\)/);
 assert.match(app,/state.installModalOpen\|\|state.forceInstallGuide/);
 assert.match(app,/if\(verb==='install-home'\)/);
 assert.match(app,/if\(verb==='install-copy-url'\)/);
 assert.match(app,/Écran d’accueil/);
 assert.match(app,/Ajouter ou retrouver l’icône/);
});
