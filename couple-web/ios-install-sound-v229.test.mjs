import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldShowIosTour,isIosSafari,IOS_TOUR_KEY} from './ios-install-tour.mjs';
import {soundEnabled,setSoundEnabled,unlockLoveRollSounds,playLoveRollSound,setLoveRollSoundUser} from './loveroll-sounds.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
test('iPhone Safari first-visit install tutorial does not repeat immediately',()=>{
 const values=new Map(),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(shouldShowIosTour(store,10000),true);
 store.setItem(IOS_TOUR_KEY,JSON.stringify({choice:'later',at:1000}));
 assert.equal(shouldShowIosTour(store,20000),false);
 assert.equal(shouldShowIosTour(store,8*86400000),true);
 store.setItem(IOS_TOUR_KEY,JSON.stringify({choice:'done',at:1000}));
 assert.equal(shouldShowIosTour(store,8*86400000),false);
});
test('Safari iPhone web shows tutorial, not Android or installed PWA',()=>{
 const safari={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18 Mobile Safari/604.1',platform:'iPhone'};
 assert.equal(isIosSafari(safari,{matchMedia:()=>({matches:false})}),true);
 assert.equal(isIosSafari({...safari,userAgent:safari.userAgent.replace('Safari/604.1','CriOS/125')},{matchMedia:()=>({matches:false})}),false);
 assert.equal(isIosSafari(safari,{matchMedia:()=>({matches:true})}),false);
 assert.equal(isIosSafari({userAgent:'Android Chrome'},{matchMedia:()=>({matches:false})}),false);
});
test('timer melody preference is isolated by account',()=>{
 const entries=new Map(),store={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
 setLoveRollSoundUser('fred');
 assert.equal(soundEnabled(store),true);
 setSoundEnabled(false,store);assert.equal(soundEnabled(store),false);
 setLoveRollSoundUser('emilie');assert.equal(soundEnabled(store),true);
 setLoveRollSoundUser('fred');setSoundEnabled(true,store);
});
test('a tap can unlock WebAudio before timer expiry, then melody plays',async()=>{
 const oldWindow=globalThis.window;
 let calls=0,notes=0;
 class FakeAudioContext {
  state='suspended';currentTime=3;destination={};
  resume(){calls++;this.state='running';return Promise.resolve();}
  createOscillator(){return {type:'sine',frequency:{value:0},connect(){},start(){notes++;},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
 }
 globalThis.window={AudioContext:FakeAudioContext};
 try{
  assert.equal(await unlockLoveRollSounds(),true);
  assert.equal(playLoveRollSound('timer-unit',{force:true}),true);
  assert.equal(calls,1);
  assert.equal(notes,6);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
 }
});
test('Soirée requires category and timer rings at 00:00 without challenge-received push',()=>{
 const app=read('app.js'),evening=read('premium-evening.mjs'),audio=read('loveroll-sounds.mjs');
 assert.match(evening,/Choisis ta catégorie pour lancer le dé/);
 assert.match(evening,/!category&&canDraw/);
 assert.match(app,/showEveningCategoryReminder/);
 assert.match(app,/challengeTimer\.deadline-Date\.now\(\)/);
 assert.match(app,/function endSignal\(\)/);
 assert.match(app,/playLoveRollSound\('timer:'\+challengeTimer\.id/);
 assert.match(app,/if\(verb==='timer-sound-test'\)/);
 assert.match(app,/if\(verb==='timer-toggle'\)/);
 assert.match(app,/if\(!document.hidden\)updateChallengeClock\(\)/);
 assert.doesNotMatch(app,/playLoveRollSound\('challenge:'\+payload\.new\.id/);
 assert.match(audio,/Son à la fin des minuteurs/);
 assert.match(read('index.html'),/ios-install-tour\.mjs/);
});
