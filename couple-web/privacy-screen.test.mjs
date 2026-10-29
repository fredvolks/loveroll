import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldRestorePrivacy,PRIVACY_STORAGE_KEY} from './privacy-screen.mjs';
import {unlockLoveRollSounds,playLoveRollSound,silenceLoveRollSounds} from './loveroll-sounds.mjs';
import {createEclatAudio} from './eclat-audio.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const index=read('./index.html'),app=read('./app.js'),evening=read('./premium-evening.mjs');
const sw=read('./service-worker.js'),code=read('./privacy-screen.mjs');

test('LR-025 only stores a local visual masking preference',()=>{
 const bag=new Map();const storage={getItem:k=>bag.get(k)??null};
 assert.equal(shouldRestorePrivacy(storage),false);
 bag.set(PRIVACY_STORAGE_KEY,'1');
 assert.equal(shouldRestorePrivacy(storage),true);
 bag.set(PRIVACY_STORAGE_KEY,'0');
 assert.equal(shouldRestorePrivacy(storage),false);
 assert.equal(shouldRestorePrivacy({getItem(){throw Error('blocked');}}),false);
 assert.match(code,/const html=doc\.documentElement/);
 assert.match(code,/html\.classList\.toggle\('lr-privacy-active',masked\)/);
 assert.match(code,/app\.inert=true/);
 assert.match(code,/if\(html\.classList\.contains\('lr-privacy-active'\)\)\{/);
 assert.match(code,/html\.classList\.remove\('lr-privacy-active'\)/);
 assert.match(code,/const initialAriaHidden=app\?\.getAttribute\('aria-hidden'\)/);
 assert.match(code,/initialAriaHidden===null\?app\.removeAttribute\('aria-hidden'\):app\.setAttribute\('aria-hidden',initialAriaHidden\)/);
 assert.doesNotMatch(code,/\brpc\s*\(|answer_challenge|finish_couple_session|timer\.start/i);
});
test('Removed privacy action stays absent from all challenge entries',()=>{
 assert.doesNotMatch(evening,/data-lr-privacy-hide/);
 assert.doesNotMatch(evening,/Masquer temporairement le jeu/);
 assert.match(evening,/class="evening-header-balance" aria-hidden="true"/);
 assert.doesNotMatch(app,/class="lr-privacy-challenge-button" data-lr-privacy-hide/);
 assert.match(code,/event\.stopImmediatePropagation\(\)/);
 assert.match(code,/data-lr-privacy-reveal/);
});
test('Removed privacy overlay no longer boots or restores itself on first paint',()=>{
 assert.doesNotMatch(index,/localStorage\.getItem\('loveroll-privacy-mask-v1'\)/);
 assert.doesNotMatch(index,/privacy-screen\.mjs\?v=/);
 assert.doesNotMatch(index,/privacy-screen\.css\?v=/);
 assert.match(index,/privacy-screen\.css\?v=/);
 assert.match(sw,/\.\/privacy-screen\.mjs/);
 assert.match(sw,/\.\/privacy-screen\.css/);
 assert.match(code,/doc\.title='LoveRoll'/);
});


test('LR-025 privacy immediately mutes active Éclat and scheduled timer tones',async()=>{
 const audio=read('./loveroll-sounds.mjs');
 assert.match(code,/dispatchEvent\?\.\(new Event\('loveroll:privacy-mask'\)\)/);
 assert.match(app,/document\.addEventListener\('loveroll:privacy-mask'/);
 assert.match(audio,/document\.addEventListener\('loveroll:privacy-mask',silenceLoveRollSounds\)/);
 assert.match(audio,/classList\?\.contains\('lr-privacy-active'\)/);
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 const oscillators=[];let masked=false;
 class FakeOscillator{
  constructor(){this.frequency={value:0};this.stopped=[];oscillators.push(this);}
  connect(){}
  start(at){this.started=at;}
  stop(at){this.stopped.push(at);}
  disconnect(){this.disconnected=true;}
 }
 class FakeContext{
  constructor(){this.currentTime=10;this.state='running';this.destination={};}
  createOscillator(){return new FakeOscillator();}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  async resume(){}
 }
 try{
  globalThis.window={AudioContext:FakeContext};
  globalThis.document={documentElement:{classList:{contains:()=>masked}}};
  assert.equal(await unlockLoveRollSounds(),true);
  assert.equal(playLoveRollSound('privacy-in-progress',{force:true}),true);
  assert.equal(oscillators.length,6);
  masked=true;
  silenceLoveRollSounds();
  assert.ok(oscillators.every(osc=>osc.disconnected&&osc.stopped.at(-1)===10),
   'Masking must stop every already scheduled tone at the current audio clock');
  assert.equal(playLoveRollSound('privacy-still-masked',{force:true}),false);
 }finally{
  silenceLoveRollSounds();
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 }
});


test('Masking Éclat during an asynchronous AudioContext resume never restarts music',async()=>{
 let unfreeze,masked=false,intervals=0;
 class PendingContext{
  constructor(){this.currentTime=10;this.state='suspended';this.destination={};}
  createGain(){return {numberOfOutputs:1,gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}
  resume(){return new Promise(resolve=>{unfreeze=resolve;});}
  close(){this.state='closed';return Promise.resolve();}
 }
 const win={AudioContext:PendingContext,document:{documentElement:{classList:{contains:()=>masked}}},
  setInterval(){intervals++;return 1;},clearInterval(){}};
 const music=createEclatAudio(win);
 const pending=music.start('romantique');
 assert.equal(typeof unfreeze,'function');
 masked=true;
 music.stop();
 unfreeze();
 assert.equal(await pending,false);
 assert.equal(music.isPlaying(),false);
 assert.equal(intervals,0,'An already cancelled soundtrack must not leave a looping timer');
 assert.equal(await music.start('romantique'),false,'No audio may start while masked');
});
