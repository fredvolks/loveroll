import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the REAL 15-second referral callback from app.js, not a test copy.
// Deferred promises make account switches and out-of-order replies deterministic.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('let referralPolling=null;');
const end=app.indexOf('function timerWidget(challenge,minutes){',start);
assert.ok(start>=0&&end>start,'find the real referral polling callback');
const source=app.slice(start,end);

function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
function harness(){
 const state={user:{id:'alice'},coupleId:'couple-alice',tab:'settings',
  referral:{enabled:true,credits:0}};
 const requests=[],renders=[],warnings=[];
 let interval=null;
 const context={
  state,authFeedbackGeneration:1,settingsOpenSection:'parrainage',
  document:{hidden:false},
  rpc:name=>{
   assert.equal(name,'love_my_referral');
   const pending=deferred();
   requests.push(pending);
   return pending.promise;
  },
  setInterval:(callback,delay)=>{
   assert.equal(delay,15000);
   assert.equal(interval,null);
   interval=callback;
  },
  render:()=>renders.push(JSON.stringify(state.referral)),
  console:{warn:(...args)=>warnings.push(args)}
 };
 runInNewContext(source,context);
 assert.equal(typeof interval,'function');
 return {state,context,requests,renders,warnings,tick:()=>interval()};
}

test('LR-026: new account polling is not blocked by an older pending login',async()=>{
 const h=harness();
 const alice=h.tick();
 assert.equal(h.requests.length,1);
 h.state.user={id:'bob'};
 h.state.referral={enabled:true,credits:20};
 const bob=h.tick();
 assert.equal(h.requests.length,2,'Bob starts before Alice network request settles');
 h.requests[1].resolve({enabled:true,credits:31});
 await bob;
 assert.equal(h.state.referral.credits,31);
 assert.equal(h.renders.length,1);
 h.requests[0].resolve({enabled:true,credits:999});
 await alice;
 assert.equal(h.state.referral.credits,31,'old Alice data cannot overwrite Bob');
 assert.equal(h.renders.length,1);
 assert.equal(h.warnings.length,0);
});

test('LR-026: obsolete rejected request is silent and cannot unlock a newer poll',async()=>{
 const h=harness();
 const alice=h.tick();
 h.state.user={id:'bob'};
 h.state.referral={enabled:true,credits:20};
 const bob=h.tick();
 h.requests[0].reject(new Error('Alice network expired'));
 await alice;
 assert.equal(h.warnings.length,0,'never expose old-account error');
 await h.tick();
 assert.equal(h.requests.length,2,'Alice finally cannot unlock Bob in-flight request');
 h.requests[1].resolve({enabled:true,credits:42});
 await bob;
 assert.equal(h.state.referral.credits,42);
 assert.equal(h.renders.length,1);
});

test('LR-026: same user with new Auth generation owns a fresh independent read',async()=>{
 const h=harness();
 const stale=h.tick();
 h.context.authFeedbackGeneration=2;
 h.state.referral={enabled:true,credits:10};
 const fresh=h.tick();
 assert.equal(h.requests.length,2,'new session is not blocked by old session');
 await h.tick();
 assert.equal(h.requests.length,2,'same session cannot fire duplicate requests');
 h.requests[0].resolve({enabled:true,credits:999});
 await stale;
 assert.equal(h.state.referral.credits,10);
 await h.tick();
 assert.equal(h.requests.length,2,'stale finally cannot release new lock');
 h.requests[1].resolve({enabled:true,credits:27});
 await fresh;
 assert.equal(h.state.referral.credits,27);
 assert.equal(h.renders.length,1);
});

test('LR-026: leaving settings or disabling referral suppresses pending private results',async()=>{
 for(const change of [
  h=>{h.state.tab='home';},
  h=>{h.context.settingsOpenSection='notifications';},
  h=>{h.state.referral.enabled=false;},
  h=>{h.state.user=null;},
 ]){
  const h=harness(),pending=h.tick();
  change(h);
  h.requests[0].resolve({enabled:true,credits:900});
  await pending;
  assert.equal(h.state.referral.credits,0);
  assert.equal(h.renders.length,0);
  assert.equal(h.warnings.length,0);
 }
});

test('LR-026: polling refuses unrelated tabs, hidden screen, and disabled rewards',async()=>{
 const h=harness();
 h.context.document.hidden=true;
 await h.tick();
 h.context.document.hidden=false;
 h.state.tab='home';
 await h.tick();
 h.state.tab='settings';
 h.context.settingsOpenSection='privacy';
 await h.tick();
 h.context.settingsOpenSection='parrainage';
 h.state.referral.enabled=false;
 await h.tick();
 assert.equal(h.requests.length,0);
});

test('LR-026: same user changing couples never receives the former couple ledger',async()=>{
 const h=harness();
 const prior=h.tick();
 h.state.coupleId='couple-new';
 h.state.referral={enabled:true,credits:5};
 const current=h.tick();
 assert.equal(h.requests.length,2,'a changed couple gets an independent query');
 h.requests[0].resolve({enabled:true,credits:999});
 await prior;
 assert.equal(h.state.referral.credits,5,'prior couple data stays private');
 await h.tick();
 assert.equal(h.requests.length,2,'old completion does not unlock the new couple request');
 h.requests[1].resolve({enabled:true,credits:14});
 await current;
 assert.equal(h.state.referral.credits,14);
 assert.equal(h.renders.length,1);
});
