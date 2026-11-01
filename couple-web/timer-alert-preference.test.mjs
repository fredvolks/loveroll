import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TIMER_ALERT_KEY,readTimerAlertMode,saveTimerAlertMode} from './timer-alert-preference.mjs';

const memory=()=>{
 const items=new Map();
 return {items,getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};
};
test('alert mode belongs to the individual account, never the shared device',()=>{
 const store=memory();
 assert.equal(readTimerAlertMode('alice',store),'sound');
 assert.equal(saveTimerAlertMode('alice','vibrate',store),true);
 assert.equal(store.items.get(TIMER_ALERT_KEY+':alice'),'vibrate');
 assert.equal(readTimerAlertMode('alice',store),'vibrate');
 assert.equal(readTimerAlertMode('bob',store),'sound');
 assert.equal(saveTimerAlertMode('bob','sound',store),true);
 assert.equal(readTimerAlertMode('bob',store),'sound');
 assert.equal(readTimerAlertMode('alice',store),'vibrate');
 // A pre-upgrade global setting must not be inherited by another account.
 store.setItem(TIMER_ALERT_KEY,'vibrate');
 assert.equal(readTimerAlertMode('charlie',store),'sound');
 assert.equal(readTimerAlertMode(null,store),'sound');
 assert.equal(saveTimerAlertMode(null,'vibrate',store),false);
 assert.equal(saveTimerAlertMode('','sound',store),false);
 assert.equal(saveTimerAlertMode('alice','invalid',store),false);
});
test('Safari private mode, missing storage and full quota never break timer alert choice',()=>{
 const blocked=Object.defineProperty({},'localStorage',{
  get(){throw new DOMException('Blocked','SecurityError');}
 });
 const getter=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){return blocked.localStorage;}});
  assert.equal(readTimerAlertMode('alice'),'sound');
  assert.equal(saveTimerAlertMode('alice','vibrate'),false);
 }finally{
  if(getter)Object.defineProperty(globalThis,'localStorage',getter);
  else delete globalThis.localStorage;
 }
 const full={getItem:()=>{throw Error('blocked read');},setItem:()=>{throw Error('QuotaExceededError');}};
 assert.equal(readTimerAlertMode('alice',full),'sound');
 assert.equal(saveTimerAlertMode('alice','vibrate',full),false);
 assert.equal(readTimerAlertMode('alice',null),'sound');
 assert.equal(saveTimerAlertMode('alice','vibrate',null),false);
});
test('stale audio permission cannot update the new login or evening',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/if\(previousId!==nextId\)challengeTimer\.mode=readTimerAlertMode\(nextId\)/);
 const handler=app.slice(app.indexOf("if(verb==='timer-mode'){"),app.indexOf("if(verb==='timer-sound-test'){"));
 assert.match(handler,/const owner=\{userId:state\.user\?\.id,sessionId:state\.session\?\.id/);
 assert.match(handler,/authFeedbackGeneration===owner\.generation/);
 assert.match(handler,/if\(!current\(\)\)return;/);
 assert.match(handler,/challengeTimer\.mode=parts\[0\]/);
 assert.match(handler,/saveTimerAlertMode\(owner\.userId,parts\[0\]\)/);
 assert.ok(handler.indexOf('if(!current())return;')<handler.indexOf('challengeTimer.mode=parts[0]'));
 assert.doesNotMatch(handler,/localStorage\./);
 const worker=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(worker,/\.\/timer-alert-preference\.mjs/);
});
