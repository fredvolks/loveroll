import test from 'node:test';
import assert from 'node:assert/strict';
import {createEclatV2LatestRead} from './eclat-v2-latest-read.mjs';
import {readFileSync} from 'node:fs';

test('latest request wins even when previous server read completes afterward',async()=>{
 const fence=createEclatV2LatestRead(),results=[];
 let finishOld,finishNew;
 const old=new Promise(resolve=>finishOld=resolve),newer=new Promise(resolve=>finishNew=resolve);
 const read=async promise=>{
  const ticket=fence.begin();
  const state=await promise;
  if(fence.isCurrent(ticket))results.push(state);
 };
 const slow=read(old),fast=read(newer);
 finishNew({session_id:'new',chapter_index:2});
 await fast;
 finishOld({session_id:'old',chapter_index:1});
 await slow;
 assert.deepEqual(results,[{session_id:'new',chapter_index:2}]);
});

test('server-confirmed start invalidates an earlier pre-start status read',async()=>{
 const guard=createEclatV2LatestRead();
 const before=guard.begin();
 guard.invalidate(); // the real start action confirmed a new session
 assert.equal(guard.isCurrent(before),false);
 const after=guard.begin();
 assert.equal(guard.isCurrent(after),true);
});

test('denied entitlement and logout both invalidate older in-flight snapshots',()=>{
 const guard=createEclatV2LatestRead();
 let ticket=guard.begin();
 guard.invalidate();
 assert.equal(guard.isCurrent(ticket),false,'revoked entitlement must never be resurrected');
 ticket=guard.begin();
 guard.invalidate();
 assert.equal(guard.isCurrent(ticket),false,'account switch discards old request');
 assert.equal(guard.isCurrent(0),false);
 assert.equal(guard.isCurrent(NaN),false);
 assert.equal(guard.isCurrent(99.5),false);
});

test('LoveRoll app uses guard for both successful and refused Supabase V2 responses',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const refresh=app.slice(app.indexOf('async function refreshEclatV2Status(){'),
   app.indexOf('async function refreshEclatStatus(){'));
 assert.match(refresh,/const ticket=eclatV2StatusFence\.begin\(\)/);
 assert.equal((refresh.match(/eclatV2StatusFence\.isCurrent\(ticket\)/g)||[]).length,2);
 assert.match(refresh,/state\.eclatV2OwnerId=userId;state\.eclatV2CoupleId=coupleId/);
 assert.match(app,/eclatV2StatusFence\.invalidate\(\);\s*state\.eclatV2Status=latest/);
 assert.match(app,/eclatV2StatusFence\.invalidate\(\);\s*state\.eclatV2Status=result/);
 assert.match(app,/eclatV2StatusFence\.invalidate\(\);\s*disposeEclatV2Player\(\);state\.eclatV2Status=null/);
});


test('switching Supabase accounts immediately removes the previous Premium player and sensitive state',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const auth=app.slice(app.indexOf('client.auth.onAuthStateChange((event,session)=>{'),
   app.indexOf('// Version probe bypasses'));
 assert.match(auth,/state\.user\?\.id!==session\.user\.id/);
 assert.match(auth,/eclatV2StatusFence\.invalidate\(\);\s*disposeEclatV2Player\(\)/);
 assert.match(auth,/state\.eclatV2Status=null;state\.eclatV2OwnerId=null;state\.eclatV2CoupleId=null/);
 assert.match(auth,/state\.coupleId=null;state\.couple=null;state\.members=\[\]/);
 assert.match(auth,/state\.unlockKey=null;state\.personalPass=null;state\.personalJournal=\[\]/);
 assert.match(auth,/root\.replaceChildren\(\)/);
 assert.match(auth,/setTimeout\(\(\)=>reload\(\)\.catch\(fail\),0\)/);
 assert.match(auth,/if\(event==='SIGNED_OUT'\)/);
 assert.match(auth,/if\(event==='PASSWORD_RECOVERY'\)/);
});


test('an old player A start result is discarded after switching the actual client to B',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.slice(app.indexOf("if(kind==='start'){",app.indexOf("if(verb==='eclat'){")),
   app.indexOf("if(kind==='choose')",app.indexOf("if(verb==='eclat'){")));
 const capture=start.indexOf('const actorAtStart=state.user.id,coupleAtStart=state.coupleId');
 const awaitStart=start.indexOf('const result=await eclatV2Api.start(');
 const guard=start.indexOf('if(state.user?.id!==actorAtStart||state.coupleId!==coupleAtStart)');
 const write=start.indexOf('state.eclatV2Status=result;');
 assert.ok(capture>=0&&awaitStart>capture&&guard>awaitStart&&write>guard,
  'the exact authorized A/couple context must be captured before the server request and rechecked before mounting');
 assert.match(start,/if\(state\.user\?\.id!==actorAtStart\|\|state\.coupleId!==coupleAtStart\)\s*return/);
 assert.match(start,/state\.eclatV2OwnerId=actorAtStart;state\.eclatV2CoupleId=coupleAtStart/);
});
