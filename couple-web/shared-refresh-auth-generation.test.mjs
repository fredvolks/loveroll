import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the actual request-owner guard from refreshShared. The production
// function's subsequent network calls are deliberately excluded so each
// stale-response scenario can be simulated with exact auth boundaries.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('async function refreshShared(expectedContext=null){');
const boundary=app.indexOf(' if(!current())return;',start);
assert.ok(start>=0&&boundary>start,'shared-refresh ownership guard exists');
const guardSource=app.slice(start,boundary)+' return current;\n}';

function harness(){
 const state={user:{id:'alice'},coupleId:'couple-a',tab:'session'};
 const runtime={state,authFeedbackGeneration:1,
  isSameEveningResponseContext:()=>true};
 runInNewContext(guardSource+'; this.probe=refreshShared;',runtime);
 return {state,runtime,probe:context=>runtime.probe(context)};
}

test('LR-026: current shared read remains valid in original Auth generation',async()=>{
 const h=harness();
 const current=await h.probe();
 assert.equal(current(),true);
 h.state.tab='settings';
 assert.equal(current(),true,'ordinary background refresh can outlive tab navigation');
});

test('LR-026: same-user reauthentication invalidates old shared read',async()=>{
 const h=harness();
 const current=await h.probe();
 assert.equal(current(),true);
 h.runtime.authFeedbackGeneration++;
 assert.equal(current(),false,
  'a new login to the same ID must not accept old session SQL results');
});

test('LR-026: account or couple change invalidates old shared result',async()=>{
 for(const change of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.user=null;},
  h=>{h.state.coupleId='couple-b';}
 ]){
  const h=harness();
  const current=await h.probe();
  change(h);
  assert.equal(current(),false);
 }
});

test('LR-026: newer unscoped refresh invalidates older overlapping read',async()=>{
 const h=harness();
 const first=await h.probe();
 const second=await h.probe();
 assert.equal(first(),false);
 assert.equal(second(),true);
});

test('LR-026: scoped timer refresh still honors its original owner and generation',async()=>{
 const h=harness();
 const scope={userId:'alice',coupleId:'couple-a',tab:'session',sessionId:'evening-1'};
 h.state.timerCompletionContext=scope;
 const current=await h.probe(scope);
 assert.equal(current(),true,'legitimate scoped timer completion can refresh');
 h.runtime.authFeedbackGeneration++;
 assert.equal(current(),false,'the same account after reauth cannot receive stale timer data');
 const next=await h.probe(scope);
 assert.equal(next(),true,'a new request in the new generation is allowed');
 h.state.timerCompletionContext=null;
 assert.equal(next(),false,'request must still be owned by the action context');
});

test('LR-026: full shared SQL refresh discards same-user response after Auth replacement',async()=>{
 const finishFirstRead=(()=>{let release;const promise=new Promise(ok=>{release=ok;});return {promise,release};})();
 const state={
  user:{id:'alice'},coupleId:'couple-a',tab:'session',
  session:{id:'original-session'},cycleStatus:'keep-original',
  monthlyPassQuota:'keep-original',challenges:[{id:'original-private-card'}]
 };
 let reads=0,postBatchCalls=0;
 const runtime={
  state,authFeedbackGeneration:1,
  query:async table=>{
   reads++;
   if(table==='couple_sessions'){
    await finishFirstRead.promise;
    return [{id:'original-session',finished_at:null}];
   }
   return [];
  },
  rpc:async name=>{
   if(name==='love_redraw_capabilities')postBatchCalls++;
   if(name==='love_cycle_status')return {pending:false};
   return [];
  },
  month:()=>'2026-10',week:()=>'2026-W44',
  isSameEveningResponseContext:()=>true,
  mayApplyScopedEveningRefresh:()=>true,
  console
 };
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(end>start,'the full production refresh remains extractable');
 const refresh=runInNewContext(app.slice(start,end)+'; refreshShared;',runtime);
 const pending=refresh();
 assert.ok(reads>=8,'an actual private Supabase read batch began');
 runtime.authFeedbackGeneration=2;
 finishFirstRead.release();
 assert.equal(await pending,undefined,'stale read must finish without committing');
 assert.equal(postBatchCalls,0,'no further private calls from an expired Auth generation');
 assert.equal(state.cycleStatus,'keep-original');
 assert.equal(state.monthlyPassQuota,'keep-original');
 assert.equal(state.session.id,'original-session');
 assert.deepEqual(state.challenges,[{id:'original-private-card'}]);
});
