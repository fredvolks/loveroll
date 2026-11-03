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

test('timer vibrates on Android in sound mode too, and never duplicates expiry',()=>{
 const app=read('app.js'),start=app.indexOf('function endSignal(){'),end=app.indexOf('function updateChallengeClock(){',start);
 assert.ok(start>=0&&end>start);
 const expiry=app.slice(start,end);
 assert.match(expiry,/if\(challengeTimer\.notified\)return/);
 assert.match(expiry,/navigator\.vibrate\(\[220,110,220,110,360\]\)/);
 assert.ok(expiry.indexOf('navigator.vibrate')<expiry.indexOf("challengeTimer.mode==='sound'"));
 assert.match(expiry,/showTimerFinished\(\)/);
});

test('LR-004: a new gesture resumes the timer melody after an iOS-style audio suspension',async()=>{
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 const events=new Map();let ctx,resumes=0,notes=0;
 class PausableAudioContext{
  state='suspended';currentTime=1;destination={};
  constructor(){ctx=this;}
  resume(){resumes++;this.state='running';return Promise.resolve();}
  createOscillator(){return {frequency:{value:0},connect(){},start(){notes++;},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
 }
 globalThis.document={
  addEventListener:(name,fn)=>events.set(name,fn)
 };
 globalThis.window={AudioContext:PausableAudioContext};
 try{
  // Fresh import avoids sharing WebAudio state with the preceding unit test.
  const audio=await import('./loveroll-sounds.mjs?test-lr004-rearm');
  assert.equal(events.has('pointerdown'),true);
  events.get('pointerdown')();
  await Promise.resolve();
  assert.equal(resumes,1);
  assert.equal(audio.playLoveRollSound('timer:first',{force:true}),true);
  ctx.state='suspended'; // OS background/lock suspends audio while app survives
  assert.equal(audio.playLoveRollSound('timer:while-suspended',{force:true}),false);
  events.get('pointerdown')();
  await Promise.resolve();
  assert.equal(resumes,2,'Second gesture must reactivate suspended WebAudio');
  assert.equal(audio.playLoveRollSound('timer:after-resume',{force:true}),true);
  events.get('pointerdown')();
  await Promise.resolve();
  assert.equal(resumes,2,'Already-running audio must not resume redundantly');
  assert.equal(notes,12);
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 }
});

test('LR-004: switching sound off cancels already scheduled WebAudio notes immediately',async()=>{
 const oldWindow=globalThis.window,oldStore=globalThis.localStorage;
 const values=new Map(),notes=[];
 class FakeAudioContext{
  state='running';currentTime=12;destination={};
  createOscillator(){
   const note={stops:[],disconnected:0,type:'',frequency:{value:0},
    connect(){},start(){},stop(at){this.stops.push(at);},
    disconnect(){this.disconnected++;}};
   notes.push(note);return note;
  }
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 globalThis.window={AudioContext:FakeAudioContext};
 globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 try{
  const sound=await import('./loveroll-sounds.mjs?test-lr004-mute');
  sound.setLoveRollSoundUser('first');
  assert.equal(await sound.unlockLoveRollSounds(),true);
  assert.equal(sound.playLoveRollSound('timer:before-mute'),true);
  assert.equal(notes.length,6);
  assert.ok(notes.every(note=>note.stops.length===1),'Six melody notes were scheduled');
  assert.equal(sound.setSoundEnabled(false),false);
  assert.equal(sound.soundEnabled(),false);
  assert.ok(notes.every(note=>note.stops.length>=2&&note.disconnected>0),
   'Muting must stop and disconnect every already scheduled note');
  assert.equal(sound.playLoveRollSound('timer:while-muted'),false);
  assert.equal(sound.setSoundEnabled(true),true);
  assert.equal(sound.playLoveRollSound('timer:after-unmute'),true);
  assert.equal(notes.length,12,'Unmuting allows a new timer melody');
  sound.setLoveRollSoundUser('second');
  assert.ok(notes.slice(6).every(note=>note.stops.length>=2&&note.disconnected>0),
   'Switching account must silence the previous account melody');
  assert.equal(sound.soundEnabled(),true,'Sound preference remains per account');
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldStore===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStore;
 }
});


test('LR-004: an interrupted WebAudio melody stops previously scheduled notes',async()=>{
 const oldWindow=globalThis.window,oldWarn=console.warn;
 const notes=[];let created=0;
 class InterruptedAudioContext{
  state='running';currentTime=5;destination={};
  createOscillator(){
   if(++created===3)throw new Error('audio device failed during scheduling');
   const note={stops:[],disconnected:0,frequency:{value:0},
    connect(){},start(){},stop(at){this.stops.push(at);},
    disconnect(){this.disconnected++;}};
   notes.push(note);return note;
  }
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},disconnect(){}};}
 }
 globalThis.window={AudioContext:InterruptedAudioContext};
 console.warn=()=>{}; // The simulated device error is intentional.
 try{
  const sound=await import('./loveroll-sounds.mjs?test-lr004-interrupted-audio');
  assert.equal(await sound.unlockLoveRollSounds(),true);
  assert.equal(sound.playLoveRollSound('timer:interrupted'),false);
  assert.equal(notes.length,2,'Two notes were scheduled before the third failed');
  assert.ok(notes.every(note=>note.stops.length>=2&&note.disconnected>0),
   'Failure must stop and disconnect even notes already scheduled');
  assert.equal(sound.playLoveRollSound('timer:interrupted'),true,
   'A failed attempt must not mark the event as already played');
 }finally{
  console.warn=oldWarn;
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
 }
});
