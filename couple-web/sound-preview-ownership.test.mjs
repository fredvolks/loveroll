import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Run the production action bodies with an intentionally delayed iOS
// AudioContext permission. No real Supabase session or audio device is needed.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
function previewHarness(type){
 const settings=type==='settings';
 const action=settings?'sound-test':'timer-sound-test';
 const start=app.indexOf("if(verb==='"+action+"'){");
 const next=settings?"if(verb==='push-enable'){" : "if(verb==='timer-reset'){";
 const end=app.indexOf(next,start);
 assert.ok(start>=0&&end>start,'production preview handler must be present');
 let resolve;
 const pending=new Promise(ok=>{resolve=ok;});
 const calls={played:0,feedback:0,notices:0};
 const scope={
  state:{user:{id:'alice'},tab:settings?'settings':'session',session:{id:'session-a'}},
  challengeTimer:{id:'card-a'},
  authFeedbackGeneration:10,
  unlockLoveRollSounds:()=>pending,
  playLoveRollSound:()=>{calls.played++;return true;},
  setNotificationFeedback:()=>{calls.feedback++;},
  notify:()=>{calls.notices++;}
 };
 const actionFn=runInNewContext('(async verb=>{'+app.slice(start,end)+'})',scope);
 return {scope,calls,resolve,run:()=>actionFn(action)};
}
test('settings sound preview works for an unchanged active account',async()=>{
 const f=previewHarness('settings');
 const awaiting=f.run();
 f.resolve(true);
 await awaiting;
 assert.equal(f.calls.played,1);
 assert.equal(f.calls.feedback,1);
});
test('settings sound preview is discarded after logout or navigation',async()=>{
 for(const modify of [
  scope=>{scope.state.user={id:'bob'};scope.authFeedbackGeneration++;},
  scope=>{scope.state.tab='home';}
 ]){
  const f=previewHarness('settings'),awaiting=f.run();
  modify(f.scope);f.resolve(true);await awaiting;
  assert.equal(f.calls.played,0);
  assert.equal(f.calls.feedback,0);
 }
});
test('challenge sound preview cannot cross accounts, sessions or challenges',async()=>{
 for(const modify of [
  scope=>{scope.state.user={id:'bob'};scope.authFeedbackGeneration++;},
  scope=>{scope.state.session={id:'session-b'};},
  scope=>{scope.challengeTimer.id='card-b';},
  scope=>{scope.state.tab='home';}
 ]){
  const f=previewHarness('timer'),awaiting=f.run();
  modify(f.scope);f.resolve(true);await awaiting;
  assert.equal(f.calls.played,0);
  assert.equal(f.calls.notices,0);
 }
 const normal=previewHarness('timer'),awaiting=normal.run();
 normal.resolve(true);await awaiting;
 assert.equal(normal.calls.played,1);
 assert.equal(normal.calls.notices,1);
});
