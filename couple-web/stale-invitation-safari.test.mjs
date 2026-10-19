import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
function between(start,end){
 const from=app.indexOf(start),to=app.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,'Expected live source '+start);
 return app.slice(from,to);
}
const membership=between(' const knownMembership=await query(', ' const previousCouple=state.coupleId;');
const cleanup=between(' state.invitations=invitations;', ' state.couple=couple[0]||null;');

async function membershipRoute(rows,acceptInvites){
 const calls=[];
 const state={user:{id:'owner'}};
 const ctx={
  state,
  query:async(name,params)=>{
   calls.push(name+':'+params.eq.user_id);
   return rows;
  },
  autoAcceptPendingInvite:async()=>{calls.push('invite-accept');return acceptInvites;}
 };
 const fn=vm.runInNewContext('(async function(){'+membership+';return membership;})',ctx);
 const result=await fn();
 return {result,calls};
}

function cleanupRoute({pending=true,pair=true,member=true,invitationMatched=false}={}){
 const calls=[];
 const state={user:{id:'owner'},coupleId:'duo',invitations:[],
  showAuth:true,showDiscover:true};
 const members=pair?[{user_id:member?'owner':'another'},{user_id:'partner'}]:
  [{user_id:'owner'}];
 const id='72aa640b-2644-4d0d-bcf7-575587d27f31';
 const ctx={
  state,members,invitations:invitationMatched?
   [{id,couple_id:'duo',accepted_at:'2026-10-18',cancelled_at:null}]:[],
  sessionStorage:{},
  pendingInviteReference:()=>pending?{kind:'id',value:id}:null,
  isSharedCoupleReady:(coupleId,participants)=>Boolean(coupleId&&participants.length===2),
  finishInviteReference:()=>{
   calls.push('clear-stale-invite');
   state.inviteAccepted=false;state.inviteError=null;
  }
 };
 const fn=vm.runInNewContext('(function(){'+cleanup+';})',ctx);
 fn();
 return {calls,state};
}

test('Existing paired account never re-accepts another invite before loading own duo',async()=>{
 const original=[{user_id:'owner',couple_id:'duo'}];
 const result=await membershipRoute(original);
 assert.deepEqual(result.calls,['couple_members:owner']);
 assert.equal(result.result[0].couple_id,'duo');
 assert.equal(app.indexOf('const knownMembership=await query(')<
  app.indexOf('if(!knownMembership.length)await autoAcceptPendingInvite()'),true);
});

test('Safari old invite pointing to another person is discarded for paired owner',()=>{
 const result=cleanupRoute();
 assert.deepEqual(result.calls,['clear-stale-invite']);
 assert.equal(result.state.showAuth,false);
 assert.equal(result.state.showDiscover,false);
});
test('iPad already-paired member gets same fix (not just admin)',()=>{
 const result=cleanupRoute({invitationMatched:false,member:true});
 assert.deepEqual(result.calls,['clear-stale-invite']);
});
test('A person not in the linked couple cannot silently discard their invitation',()=>{
 const result=cleanupRoute({member:false});
 assert.deepEqual(result.calls,[]);
});
test('Solo owner preserves a legitimate invitation for explicit safe joining',()=>{
 const result=cleanupRoute({pair:false});
 assert.deepEqual(result.calls,[]);
});
test('New recipient without couple retains automatic invitation acceptance after signup',async()=>{
 const result=await membershipRoute([]);
 assert.deepEqual(result.calls,['couple_members:owner','invite-accept','couple_members:owner']);
});
test('No invite means nothing to clear and current authenticated duo remains',()=>{
 const result=cleanupRoute({pending:false});
 assert.deepEqual(result.calls,[]);
});
test('An already-accepted invite for same solo couple can still be cleaned',()=>{
 const result=cleanupRoute({pair:false,invitationMatched:true});
 assert.deepEqual(result.calls,['clear-stale-invite']);
});
test('Stale invitation cleanup never changes Supabase membership or signs the user out',()=>{
 assert.doesNotMatch(cleanup,/signOut|update\s+public|delete\s+from|client\.rpc/);
 assert.match(app,/history\.replaceState\(null,'',clean\.pathname\+clean\.search\)/);
 assert.match(app,/for\(const key of \['pendingInviteId','loverollInviteUntil','loverollInviteAccepted'\]\)/);
});
