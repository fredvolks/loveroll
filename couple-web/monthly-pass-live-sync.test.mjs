// LR-016: two authenticated devices must see their OWN monthly pass limit
// after the other partner changes the shared maximum. No private pass history
// or challenge contents may be copied between partners.
import test from 'node:test';
import assert from 'node:assert/strict';
import {coupleSyncChanged,createCoupleLiveSync} from './couple-live-sync.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const weekly={id:'weekly-1',kind:'weekly',key:'2026-10-26',face:3};
function harness(){
 const db={limit:3,used:{alice:1,bob:2},month:'2026-10'};
 const calls={alice:0,bob:0};
 let now=100000;
 function quota(id){
  const used=db.used[id];
  return {month:db.month,used,limit:db.limit,remaining:Math.max(0,db.limit-used),can_pass:used<db.limit};
 }
 function device(id){
  const state={
   user:{id},coupleId:'our-couple',members:[{user_id:'alice'},{user_id:'bob'}],
   tab:'session',diceStatus:null,adventOpening:null,
   weekly,monthly:{},session:null,sessions:[],personal:[],challenges:[],
   gifts:[],events:[],occasionRolls:[],advent:[],eveningReviews:[],
   eveningInvite:null,monthlyPassQuota:quota(id)
  };
  let renders=0,refreshes=0;
  const rpc=async name=>{
   if(name==='love_evening_reviews_for_couple')return [];
   if(name==='love_evening_invite_status')return null;
   if(name==='my_love_monthly_pass_quota'){calls[id]++;return quota(id);}
   throw new Error('Unexpected RPC: '+name);
  };
  const query=async table=>{
   if(table==='couple_rolls')return [weekly];
   if(table==='couple_sessions')return [];
   throw new Error('Private table accessed in quota probe: '+table);
  };
  const sync=createCoupleLiveSync({
   state,query,rpc,
   refresh:async()=>{refreshes++;state.monthlyPassQuota=quota(id);},
   render:()=>{renders++;},ready:(_,members)=>members.length===2,
   week:()=>weekly.key,month:()=>db.month,formDirty:()=>false,
   visible:()=>true,clock:()=>now,online:()=>false
  });
  return {state,sync,renders:()=>renders,refreshes:()=>refreshes};
 }
 return {db,calls,device,advance:ms=>{now+=ms;}};
}
test('Changes in used, maximum and calendar month trigger a new server-backed display',async()=>{
 const h=harness(),alice=h.device('alice'),bob=h.device('bob');
 h.db.limit=5;
 await Promise.all([alice.sync.probe(true),bob.sync.probe(true)]);
 await sleep(55);
 assert.deepEqual([alice.state.monthlyPassQuota.used,bob.state.monthlyPassQuota.used],[1,2]);
 assert.deepEqual([alice.state.monthlyPassQuota.remaining,bob.state.monthlyPassQuota.remaining],[4,3]);
 assert.equal(alice.renders(),1);assert.equal(bob.renders(),1);
 h.db.limit=1;
 await bob.sync.probe(true);await sleep(55);
 assert.equal(bob.state.monthlyPassQuota.can_pass,false);
 assert.equal(bob.state.monthlyPassQuota.remaining,0);
 assert.equal(bob.state.monthlyPassQuota.used,2,'changing the cap never erases passes already used');
 assert.equal(alice.state.monthlyPassQuota.used,1);
 h.db.month='2026-11';h.db.used.alice=0;h.db.used.bob=0;
 await alice.sync.probe(true);await sleep(55);
 assert.equal(alice.state.monthlyPassQuota.month,'2026-11');
 assert.equal(alice.state.monthlyPassQuota.remaining,1);
});
test('Identical quota never rebuilds a live WebGL game or starts a dice roll',async()=>{
 const h=harness(),bob=h.device('bob');
 await bob.sync.probe(true);await sleep(45);
 assert.equal(bob.renders(),0);
 assert.equal(bob.refreshes(),0);
 h.db.used.bob=3;
 bob.state.diceStatus='rolling';
 await bob.sync.probe(true);await sleep(45);
 assert.equal(bob.renders(),0);
 assert.equal(bob.state.monthlyPassQuota.used,2,'do not interrupt the official throw');
 bob.state.diceStatus=null;
 await bob.sync.probe(true);await sleep(45);
 assert.equal(bob.state.monthlyPassQuota.used,3);
 assert.equal(bob.renders(),1);
});
test('Bounded quota probes: no extra RPC each 3.2 seconds, but poll by 10 seconds',async()=>{
 const h=harness(),alice=h.device('alice');
 await alice.sync.probe(false);
 assert.equal(h.calls.alice,1);
 h.advance(3300);await alice.sync.probe(false);
 assert.equal(h.calls.alice,1);
 h.advance(3300);await alice.sync.probe(false);
 assert.equal(h.calls.alice,1);
 h.advance(3600);await alice.sync.probe(false);
 assert.equal(h.calls.alice,2);
});
test('Only changed personal quota is relevant and no remote quota is trusted without RPC',()=>{
 const local={weekly,monthly:{},session:null,monthlyPassQuota:{month:'2026-10',used:1,limit:3,remaining:2,can_pass:true}};
 const unchanged={rolls:[weekly],sessions:[],passQuota:{...local.monthlyPassQuota}};
 assert.equal(coupleSyncChanged(local,unchanged,{week:weekly.key,tab:'session'}),false);
 assert.equal(coupleSyncChanged(local,{...unchanged,passQuota:{...unchanged.passQuota,limit:1,remaining:0,can_pass:false}},{week:weekly.key,tab:'session'}),true);
 assert.equal(coupleSyncChanged(local,{rolls:[weekly],sessions:[],passQuota:null},{week:weekly.key,tab:'session'}),false);
});
