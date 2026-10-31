import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Run the actual 60-second Advent callback without starting the real app.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const begin=app.indexOf('// When left open across midnight, server time');
const end=app.indexOf('// Fallback when Realtime WebSocket events are missed',begin);
assert.ok(begin>=0&&end>begin,'Advent server-date polling source exists');
const source=app.slice(begin,end);
function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}
function harness(){
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'advent',
  adventOpening:null,adventServerDate:'2026-12-01',adventYear:2026};
 const document={hidden:false},requests=[],refreshes=[],renders=[],warnings=[];
 let tick=null;
 const context={
  state,document,authFeedbackGeneration:1,
  rpc:name=>{
   assert.equal(name,'love_advent_server_date');
   const req=deferred();requests.push(req);return req.promise;
  },
  refreshShared:async()=>{refreshes.push(state.user?.id);},
  render:()=>renders.push([state.user?.id,state.adventServerDate]),
  console:{warn:(...args)=>warnings.push(args)},
  setInterval:(callback,delay)=>{
   assert.equal(delay,60_000);
   assert.equal(tick,null);
   tick=callback;
  }
 };
 runInNewContext(source,context);
 assert.equal(typeof tick,'function');
 return {state,document,requests,refreshes,renders,warnings,context,tick:()=>tick()};
}

test('LR-026: delayed Advent reply from previous account never repaints new login',async()=>{
 const h=harness(),old=h.tick();
 h.state.user={id:'bob'};h.state.coupleId='couple-b';
 h.state.adventServerDate='2026-12-02';h.state.adventYear=2026;
 const current=h.tick();
 assert.equal(h.requests.length,2,'new account must not wait for old HTTP response');
 h.requests[1].resolve('2026-12-03');
 await current;
 h.requests[0].resolve('2026-12-04');
 await old;
 assert.equal(h.state.adventServerDate,'2026-12-03');
 assert.equal(h.state.adventYear,null);
 assert.deepEqual(h.refreshes,['bob']);
 assert.equal(h.renders.length,1);
 assert.equal(h.warnings.length,0);
});

test('LR-026: old network failure is silent and cannot unlock new in-flight poll',async()=>{
 const h=harness(),old=h.tick();
 h.state.user={id:'bob'};h.state.coupleId='couple-b';
 const current=h.tick();
 h.requests[0].reject(new Error('old user network error'));
 await old;
 assert.equal(h.warnings.length,0);
 await h.tick();
 assert.equal(h.requests.length,2);
 h.requests[1].resolve('2026-12-02');
 await current;
 assert.equal(h.renders.length,1);
});

test('LR-026: same-user login generation invalidates old Advent result',async()=>{
 const h=harness(),old=h.tick();
 h.context.authFeedbackGeneration=2;
 const current=h.tick();
 assert.equal(h.requests.length,2,'reauthenticated session gets a fresh read');
 h.requests[0].resolve('2026-12-08');
 await old;
 assert.equal(h.state.adventServerDate,'2026-12-01');
 h.requests[1].resolve('2026-12-03');
 await current;
 assert.equal(h.state.adventServerDate,'2026-12-03');
 assert.equal(h.renders.length,1);
});

test('LR-026: same user in a different couple cannot inherit the older Advent date',async()=>{
 const h=harness(),old=h.tick();
 h.state.coupleId='couple-b';
 h.state.adventServerDate='2026-12-05';
 const current=h.tick();
 assert.equal(h.requests.length,2);
 h.requests[0].resolve('2026-12-25');
 await old;
 assert.equal(h.state.adventServerDate,'2026-12-05');
 h.requests[1].resolve('2026-12-06');
 await current;
 assert.equal(h.state.adventServerDate,'2026-12-06');
 assert.equal(h.refreshes.length,1);
});

test('LR-026: closed, hidden or actively opening Advent does not repaint after a reply',async()=>{
 for(const change of [
  h=>{h.state.tab='home';},
  h=>{h.document.hidden=true;},
  h=>{h.state.adventOpening=3;},
  h=>{h.state.user=null;}
 ]){
  const h=harness(),pending=h.tick();
  change(h);
  h.requests[0].resolve('2026-12-07');
  await pending;
  assert.equal(h.state.adventServerDate,'2026-12-01');
  assert.equal(h.refreshes.length,0);
  assert.equal(h.renders.length,0);
 }
});

test('LR-026: duplicate ticks coalesce and a completed tick allows next date check',async()=>{
 const h=harness(),first=h.tick();
 await h.tick();
 assert.equal(h.requests.length,1);
 h.requests[0].resolve('2026-12-01');
 await first;
 assert.equal(h.refreshes.length,0,'unchanged date never reloads');
 const second=h.tick();
 assert.equal(h.requests.length,2);
 h.requests[1].resolve('2026-12-02');
 await second;
 assert.equal(h.refreshes.length,1);
 assert.equal(h.renders.length,1);
});

test('LR-026: auth switch while Advent refresh awaits suppresses stale repaint',async()=>{
 const h=harness(),refresh=deferred();
 h.context.refreshShared=async()=>{h.refreshes.push('started');await refresh.promise;};
 const pending=h.tick();
 h.requests[0].resolve('2026-12-02');
 // Complete RPC and schedule the async refresh before changing Auth.
 await Promise.resolve();
 assert.equal(h.refreshes.length,1);
 h.state.user={id:'bob'};h.state.coupleId='couple-b';
 h.context.authFeedbackGeneration=2;
 refresh.resolve();
 await pending;
 assert.equal(h.renders.length,0,'old session cannot render after refresh await');
});
