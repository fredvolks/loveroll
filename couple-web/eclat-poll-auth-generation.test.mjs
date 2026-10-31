import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownsCoupleAsyncRead} from './evening-private-queue.mjs';

// Run the production Éclat background interval without modifying the app.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf("setInterval(async()=>{\n if(document.hidden||state.tab!=='eclat'");
const end=app.indexOf('},4500);',start);
assert.ok(start>=0&&end>start,'real Éclat poll must remain available');
const source='let latestEclatStatusRead=null;\n'+app.slice(start,end+8);

function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}
function harness(){
 const state={user:{id:'alice'},coupleId:'couple-a',members:[{},{}],
  tab:'eclat',eclat:{id:'original'}};
 const requests=[],renders=[],warnings=[],history=[];
 let tick=null;
 const runtime={
  state,authFeedbackGeneration:1,document:{hidden:false},
  ownsCoupleAsyncRead,isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,
  rpc:name=>{
   assert.equal(name,'love_eclat_status');
   const task=deferred();requests.push(task);return task.promise;
  },
  refreshEclatHistory:async()=>{history.push(state.user?.id);},
  render:()=>renders.push(state.eclat.id),
  console:{warn:(...args)=>warnings.push(args)},
  setInterval:(fn,ms)=>{assert.equal(ms,4500);tick=fn;}
 };
 runInNewContext(source,runtime);
 assert.equal(typeof tick,'function');
 return {state,runtime,requests,renders,warnings,history,tick:()=>tick()};
}

test('LR-026: late Éclat poll cannot repaint a new login for the same user',async()=>{
 const h=harness();
 const stale=h.tick();
 assert.equal(h.requests.length,1);
 h.runtime.authFeedbackGeneration=2;
 const current=h.tick();
 assert.equal(h.requests.length,2,'new login can immediately start another poll');
 h.requests[1].resolve({id:'current'});
 await current;
 h.requests[0].resolve({id:'old-private-result'});
 await stale;
 assert.equal(h.state.eclat.id,'current');
 assert.deepEqual(h.history,['alice']);
 assert.deepEqual(h.renders,['current']);
});

test('LR-026: two concurrent Éclat polls discard earlier delayed response',async()=>{
 const h=harness();
 const first=h.tick();
 const second=h.tick();
 h.requests[1].resolve({id:'newest'});
 await second;
 h.requests[0].resolve({id:'older'});
 await first;
 assert.equal(h.state.eclat.id,'newest');
 assert.deepEqual(h.renders,['newest']);
});

test('LR-026: old account or couple never receives private Éclat data',async()=>{
 for(const change of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.user=null;},
  h=>{h.state.coupleId='couple-b';},
  h=>{h.state.tab='home';}
 ]){
  const h=harness();
  const pending=h.tick();
  change(h);
  h.requests[0].resolve({id:'alice-private'});
  await pending;
  assert.equal(h.state.eclat.id,'original');
  assert.equal(h.renders.length,0);
  assert.equal(h.history.length,0);
 }
});

test('LR-026: stale network errors do not notify a reauthenticated user',async()=>{
 const h=harness(),pending=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.requests[0].reject(new Error('previous session network'));
 await pending;
 assert.equal(h.warnings.length,0);
 assert.equal(h.renders.length,0);
});

test('LR-026: Éclat poll ignores replies after couple membership disappears',async()=>{
 const h=harness(),pending=h.tick();
 h.state.members=[{id:'alice'}];
 h.requests[0].resolve({id:'no-longer-authorized'});
 await pending;
 assert.equal(h.state.eclat.id,'original');
 assert.equal(h.renders.length,0);
 assert.equal(h.history.length,0);
});

test('LR-026: hidden Éclat tab never paints a pending status update',async()=>{
 const h=harness(),pending=h.tick();
 h.runtime.document.hidden=true;
 h.requests[0].resolve({id:'background-only'});
 await pending;
 assert.equal(h.state.eclat.id,'original');
 assert.equal(h.renders.length,0);
});
