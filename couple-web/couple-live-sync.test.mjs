import test from 'node:test';
import assert from 'node:assert/strict';
import {coupleSyncChanged,createCoupleLiveSync,LIVE_SYNC_INTERVALS} from './couple-live-sync.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const weekly={id:'week-roll',kind:'weekly',key:'2026-10-12',face:3};
const session={id:'evening-session',finished_at:null};
function setup(){
 const db={rolls:[weekly],sessions:[session],faces:new Map(),challenges:[]};
 let forbiddenQueries=0;
 const made=[];
 function device(userId){
  const opponent=userId==='alice'?'bob':'alice';
  const state={
   user:{id:userId},coupleId:'couple-1',members:[{user_id:'alice'},{user_id:'bob'}],
   tab:'session',diceStatus:null,weekly,monthly:{},session,personal:[],challenges:[],
   rollStatus:{my_rolled:false,partner_rolled:false,both_ready:false},
   sessions:[session],challengesHistory:[],events:[],gifts:[],feedback:[],advent:[],occasionRolls:[]
  };
  let renders=0;
  const rollStatus=()=>({
   my_rolled:db.faces.has(userId),partner_rolled:db.faces.has(opponent),
   both_ready:db.faces.size===2
  });
  const refresh=async()=>{
   state.weekly=db.rolls.find(r=>r.kind==='weekly')||null;
   state.session=db.sessions.find(s=>s.finished_at===null)||null;
   state.sessions=[...db.sessions];state.rollStatus=rollStatus();
   state.personal=[...db.faces].filter(([id])=>id===userId||db.faces.size===2)
    .map(([user_id,face])=>({session_id:session.id,user_id,face}));
   state.challenges=db.challenges.map(c=>({...c}));
  };
  const query=async(table)=>{
   if(table==='couple_personal_rolls'){forbiddenQueries++;throw Error('private roll query not allowed');}
   if(table==='couple_rolls')return [...db.rolls];
   if(table==='couple_sessions')return [...db.sessions];
   if(table==='couple_challenges')return [...db.challenges];
   throw Error('Unexpected table '+table);
  };
  const rpc=async(name)=>{
   if(name==='my_love_evening_board')
    return {ready:db.faces.size===2,first:'alice',next:db.faces.size===2?'alice':null,
      targets:db.faces.size===2?{alice:4,bob:6}:{},drawn:{alice:0,bob:0},completed:{alice:0,bob:0},
      remaining:db.faces.size===2?{alice:4,bob:6}:{},drawsFinished:false,finished:false};
   if(name!=='my_love_roll_status')throw Error('Unexpected RPC '+name);
   return [rollStatus()];
  };
  const sync=createCoupleLiveSync({state,query,rpc,refresh,render:()=>{renders++;},
   ready:(id,members)=>!!id&&members.length===2,week:()=>weekly.key,
   month:()=>weekly.key.slice(0,7),formDirty:()=>false,
   visible:()=>true,clock:()=>Date.now(),online:()=>true});
  const device={state,sync,renders:()=>renders};
  made.push(device);
  return device;
 }
 return {db,device,forbidden:()=>forbiddenQueries};
}
test('Cross-device: partner D6 rolls update waiting status WITHOUT revealing the private face',async()=>{
 const {db,device,forbidden}=setup(),phone=device('alice'),pc=device('bob');
 db.faces.set('alice',4); // RPC insert from phone
 await pc.sync.probe(true);
 await sleep(70);
 assert.equal(pc.state.rollStatus.partner_rolled,true);
 assert.equal(pc.state.rollStatus.my_rolled,false);
 assert.equal(pc.state.rollStatus.both_ready,false);
 assert.deepEqual(pc.state.personal,[]);
 assert.equal(forbidden(),0);
 assert.ok(pc.renders()>0);
 // A repeat poll with identical state does NOT rerender dice/cancel controls.
 const count=pc.renders();
 await pc.sync.probe(true);await sleep(40);
 assert.equal(pc.renders(),count);
 db.faces.set('bob',6);
 await Promise.all([phone.sync.probe(true),pc.sync.probe(true)]);
 await sleep(70);
 for(const app of [phone,pc]){
  assert.equal(app.state.rollStatus.both_ready,true);
  assert.equal(app.state.personal.length,2);
  assert.deepEqual(app.state.personal.map(r=>r.face).sort(),[4,6]);
 }
 assert.equal(forbidden(),0);
});
test('Realtime events update another device immediately; no manual refresh',async()=>{
 const {db,device}=setup(),phone=device('alice'),ipad=device('bob');
 db.faces.set('alice',2);
 ipad.sync.request(0);  // Realtime callback
 await sleep(45);
 assert.equal(ipad.state.rollStatus.partner_rolled,true);
 assert.equal(ipad.state.personal.length,0);
 assert.ok(ipad.renders()>0);
});
test('Active local throw is not interrupted, but secure polling catches result afterwards',async()=>{
 const {db,device}=setup(),phone=device('alice'),pc=device('bob');
 pc.state.diceStatus='rolling';
 db.faces.set('alice',5);
 pc.sync.request(0);
 await sleep(40);
 assert.equal(pc.renders(),0);
 assert.equal(pc.state.rollStatus.partner_rolled,false);
 pc.state.diceStatus=null;
 await pc.sync.probe(true);await sleep(75);
 assert.equal(pc.state.rollStatus.partner_rolled,true);
 assert.equal(pc.state.personal.length,0);
});
test('New session and new weekly roll trigger a refresh, but unrelated couples cannot be copied',()=>{
 const base={coupleId:'ours',session:null,weekly:null,rollStatus:null,monthly:{},challenges:[]};
 assert.equal(coupleSyncChanged(base,{rolls:[weekly],sessions:[]},{week:weekly.key,tab:'session'}),true);
 assert.equal(coupleSyncChanged({...base,weekly},{rolls:[weekly],sessions:[session]},
  {week:weekly.key,tab:'session'}),true);
 assert.ok(LIVE_SYNC_INTERVALS.session<=4000);
 assert.ok(LIVE_SYNC_INTERVALS.other<=15000);
});

test('Advent fallback compares full calendar identities even without row IDs',()=>{
 const local={advent:[{year:2026,day:3,opened_at:'2026-12-10T12:00:00Z',opened_by:'a'}]};
 const remote={advent:[{year:2026,day:4,opened_at:'2026-12-10T12:00:00Z',opened_by:'a'}]};
 assert.equal(coupleSyncChanged(local,remote,{tab:'advent'}),true);
 assert.equal(coupleSyncChanged(local,{advent:[...local.advent]},{tab:'advent'}),false);
});
test('Realtime refresh waits until the official envelope animation has finished',async()=>{
 const state={user:{id:'a'},coupleId:'c',members:[{},{}],tab:'advent',adventOpening:3,advent:[]};
 let refreshed=0,renders=0;
 const sync=createCoupleLiveSync({state,query:async()=>[],rpc:async()=>[],refresh:async()=>{refreshed++;state.advent=[{year:2026,day:3}];},render:()=>renders++,ready:()=>true,week:()=>'',month:()=>'',formDirty:()=>false,visible:()=>true,online:()=>true});
 sync.request(0);await sleep(30);assert.equal(refreshed,0);assert.equal(renders,0);
 state.adventOpening=null;sync.request(0);await sleep(40);assert.equal(refreshed,1);assert.equal(renders,1);
});


// LR-016: all quota values come from the authenticated user's RPC, not from
// the other partner's Realtime payload or a local counter.
function quotaHarness(){
 const db={month:'2026-10',limit:3,used:{alice:1,bob:2}};
 let tick=100000;
 function phone(userId){
  const own=()=>({month:db.month,used:db.used[userId],limit:db.limit,
   remaining:Math.max(0,db.limit-db.used[userId]),can_pass:db.used[userId]<db.limit});
  const state={user:{id:userId},coupleId:'duo',members:[{user_id:'alice'},{user_id:'bob'}],
   tab:'session',diceStatus:null,weekly,monthly:{},session:null,sessions:[],
   personal:[],challenges:[],events:[],gifts:[],occasionRolls:[],
   eveningReviews:[],advent:[],monthlyPassQuota:own()};
  let rendered=0,quotaCalls=0,refreshes=0,dirty=false;
  const query=async(name)=>{
   if(name==='couple_rolls')return [weekly];
   if(name==='couple_sessions')return [];
   throw Error('Forbidden cross-user data: '+name);
  };
  const rpc=async(name)=>{
   if(name==='love_evening_reviews_for_couple')return [];
   if(name==='love_evening_invite_status')return null;
   if(name==='my_love_monthly_pass_quota'){quotaCalls++;return own();}
   throw Error('Unexpected RPC: '+name);
  };
  const refresh=async()=>{refreshes++;state.monthlyPassQuota=await rpc('my_love_monthly_pass_quota');};
  const sync=createCoupleLiveSync({state,query,rpc,refresh,render:()=>rendered++,
   ready:(couple,members)=>couple==='duo'&&members.length===2,
   week:()=>weekly.key,month:()=>db.month,formDirty:()=>dirty,
   visible:()=>true,clock:()=>tick,online:()=>false});
  return {state,sync,rendered:()=>rendered,refreshes:()=>refreshes,
   quotaCalls:()=>quotaCalls,formDirty:value=>{dirty=value;}};
 }
 return {db,phone,advance:ms=>{tick+=ms;}};
}
test('LR-016: the owner limit propagates to BOTH clients with separate private counts',async()=>{
 const h=quotaHarness(),alice=h.phone('alice'),bob=h.phone('bob');
 h.db.limit=1;
 await Promise.all([alice.sync.probe(true),bob.sync.probe(true)]);
 await sleep(60);
 assert.deepEqual(alice.state.monthlyPassQuota,{month:'2026-10',used:1,limit:1,remaining:0,can_pass:false});
 assert.deepEqual(bob.state.monthlyPassQuota,{month:'2026-10',used:2,limit:1,remaining:0,can_pass:false});
 assert.equal(alice.rendered(),1);
 assert.equal(bob.rendered(),1);
 assert.ok(alice.quotaCalls()>0&&bob.quotaCalls()>0);
 // Repeated identical server polls must not rebuild the die or wipe UI state.
 await Promise.all([alice.sync.probe(true),bob.sync.probe(true)]);
 await sleep(40);
 assert.equal(alice.rendered(),1);
 assert.equal(bob.rendered(),1);
 h.db.limit=5;
 await bob.sync.probe(true);await sleep(55);
 assert.deepEqual(bob.state.monthlyPassQuota,{month:'2026-10',used:2,limit:5,remaining:3,can_pass:true});
 assert.equal(alice.state.monthlyPassQuota.limit,1,'one device cannot mutate another client until sync');
});
test('LR-016: a new Toronto calendar month restores quota without client-side reset',async()=>{
 const h=quotaHarness(),bob=h.phone('bob');
 h.db.month='2026-11';
 h.db.used.bob=0;
 await bob.sync.probe(true);await sleep(50);
 assert.deepEqual(bob.state.monthlyPassQuota,{month:'2026-11',used:0,limit:3,remaining:3,can_pass:true});
 assert.equal(bob.rendered(),1);
});
test('LR-016: quota polling is bounded and the active D6 throw stays untouched',async()=>{
 const h=quotaHarness(),bob=h.phone('bob');
 await bob.sync.probe(false);
 const first=bob.quotaCalls();
 assert.equal(first,1);
 h.advance(3500);
 await bob.sync.probe(false);
 assert.equal(bob.quotaCalls(),first,'the D6 probe must not query personal quota every 3 seconds');
 h.db.limit=0;bob.state.diceStatus='rolling';
 h.advance(11000);
 await bob.sync.probe(true);await sleep(30);
 assert.equal(bob.rendered(),0);
 assert.equal(bob.state.monthlyPassQuota.limit,3);
 bob.state.diceStatus=null;
 await bob.sync.probe(false);await sleep(55);
 assert.equal(bob.state.monthlyPassQuota.limit,0);
 assert.equal(bob.state.monthlyPassQuota.can_pass,false);
});
test('LR-016: unsaved Settings fields are never overwritten by remote quota refresh',async()=>{
 const h=quotaHarness(),alice=h.phone('alice');
 alice.state.tab='settings';alice.formDirty(true);
 h.db.limit=0;
 await alice.sync.probe(true);await sleep(40);
 assert.equal(alice.state.monthlyPassQuota.limit,3);
 assert.equal(alice.rendered(),0);
 alice.formDirty(false);alice.sync.request(0);await sleep(55);
 assert.equal(alice.state.monthlyPassQuota.limit,0);
 assert.equal(alice.rendered(),1);
});
