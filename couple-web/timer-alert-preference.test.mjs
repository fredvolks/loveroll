import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TIMER_ALERT_KEY,readTimerAlertMode,saveTimerAlertMode} from './timer-alert-preference.mjs';

const memory=()=>{
 const items=new Map();
 return {items,getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};
};
test('timer sound and vibration selection is saved without changing countdown state',()=>{
 const store=memory();
 assert.equal(readTimerAlertMode(store),'sound');
 assert.equal(saveTimerAlertMode('vibrate',store),true);
 assert.equal(store.items.get(TIMER_ALERT_KEY),'vibrate');
 assert.equal(readTimerAlertMode(store),'vibrate');
 assert.equal(saveTimerAlertMode('sound',store),true);
 assert.equal(readTimerAlertMode(store),'sound');
});
test('Safari private mode, missing storage and full quota never break timer alert choice',()=>{
 const blocked=Object.defineProperty({},'localStorage',{
  get(){throw new DOMException('Blocked','SecurityError');}
 });
 const getter=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){return blocked.localStorage;}});
  assert.equal(readTimerAlertMode(),'sound');
  assert.equal(saveTimerAlertMode('vibrate'),false);
 }finally{
  if(getter)Object.defineProperty(globalThis,'localStorage',getter);
  else delete globalThis.localStorage;
 }
 const full={getItem:()=>{throw Error('blocked read');},setItem:()=>{throw Error('QuotaExceededError');}};
 assert.equal(readTimerAlertMode(full),'sound');
 assert.equal(saveTimerAlertMode('vibrate',full),false);
 assert.equal(readTimerAlertMode(null),'sound');
 assert.equal(saveTimerAlertMode('vibrate',null),false);
 assert.equal(saveTimerAlertMode('invalid',memory()),false);
});
test('timer event uses the safe preference while retaining in-memory alert mode',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/challengeTimer\.mode=readTimerAlertMode\(\)/);
 const handler=app.slice(app.indexOf("if(verb==='timer-mode'){"),app.indexOf("if(verb==='timer-sound-test'){"));
 assert.match(handler,/challengeTimer\.mode=parts\[0\]/);
 assert.match(handler,/saveTimerAlertMode\(parts\[0\]\)/);
 assert.doesNotMatch(handler,/localStorage\./);
 const worker=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/\.\/timer-alert-preference\.mjs/);
});
