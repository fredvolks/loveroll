// LR-028: integration-level polling/realtime fallback with TWO client states.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoupleLiveSync} from './couple-live-sync.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const WEEK='2026-10-26';
const weekly={id:'week-1',kind:'weekly',key:WEEK,face:3};
function harness(){
 let invitation={id:null,state:'none',available:true},allowed=true,callCount=0;
 const clients=[];
 function device(userId){
  const state={user:{id:userId},coupleId:'our-couple',
   members:[{user_id:'a'},{user_id:'b'}],tab:'home',
   weekly,monthly:{},session:null,sessions:[],personal:[],rollStatus:null,
   eveningInvite:{id:null,state:'none',available:true},eveningReviews:[],
   challenges:[],challengesHistory:[],eveningCalendarChallenges:[],
   gifts:[],events:[],occasionRolls:[],advent:[]};
  let renders=0,refreshes=0;
  const query=async(table)=>{
   if(table==='couple_rolls')return [weekly];
   if(table==='couple_sessions')return [];
   throw Error('Unexpected query '+table);
  };
  const rpc=async(name)=>{
   if(name==='love_evening_reviews_for_couple')return [];
   if(name==='love_evening_invite_status'){
    callCount++;
    if(!allowed)throw Error('PGRST202: function absent before migration');
    return {...invitation,direction:userId==='a'?'sent':'received'};
   }
   throw Error('No writing/dice RPC permitted in a status probe: '+name);
  };
  const refresh=async()=>{
   refreshes++;
   try{state.eveningInvite=await rpc('love_evening_invite_status');}
   catch{state.eveningInvite=null;}
  };
  const sync=createCoupleLiveSync({state,query,rpc,refresh,render:()=>{renders++;},
   ready:(_,m)=>m.length===2,week:()=>WEEK,month:()=>'2026-10',
   formDirty:()=>false,visible:()=>true,online:()=>false});
  const client={state,sync,renders:()=>renders,refreshes:()=>refreshes};
  clients.push(client);
  return client;
 }
 return {device,setInvite:inv=>{invitation=inv;},setAvailable:v=>{allowed=v;},
  calls:()=>callCount};
}
test('A and B independently see pending, maybe and accepted without opening rolls',async()=>{
 const h=harness(),a=h.device('a'),b=h.device('b');
 const flush=async()=>{await Promise.all([a.sync.probe(true),b.sync.probe(true)]);await delay(55)};
 h.setInvite({id:'invite-1',state:'pending',available:false});
 await flush();
 assert.equal(a.state.eveningInvite.direction,'sent');
 assert.equal(b.state.eveningInvite.direction,'received');
 assert.equal(a.state.eveningInvite.state,'pending');
 assert.equal(b.state.eveningInvite.state,'pending');
 const previous=a.renders()+b.renders();
 await flush();
 assert.equal(a.renders()+b.renders(),previous,'identical polling must not rebuild 3D views');
 h.setInvite({id:'invite-1',state:'maybe',available:false});
 await flush();
 assert.equal(b.state.eveningInvite.state,'maybe');
 h.setInvite({id:'invite-1',state:'yes',available:false});
 await flush();
 assert.equal(a.state.eveningInvite.state,'yes');
 assert.equal(b.state.eveningInvite.state,'yes');
 assert.equal(a.state.session,null);
 assert.equal(b.state.session,null);
});
test('Realtime request refreshes even when native Push is refused',async()=>{
 const h=harness(),b=h.device('b');
 h.setInvite({id:'invite-2',state:'pending',available:false});
 b.sync.request(0);
 await delay(60);
 assert.equal(b.state.eveningInvite.direction,'received');
 assert.equal(b.renders(),1);
 h.setInvite({id:'invite-2',state:'no',available:false});
 b.sync.request(0);
 await delay(60);
 assert.equal(b.state.eveningInvite.state,'no');
 assert.equal(b.renders(),2);
});
test('Old deployment without invitation RPC stays usable and has no stale card',async()=>{
 const h=harness(),a=h.device('a');
 h.setAvailable(false);
 await a.sync.probe(true);
 await delay(35);
 assert.equal(a.renders(),0);
 a.sync.request(0);
 await delay(40);
 assert.equal(a.state.eveningInvite,null);
 assert.equal(a.state.session,null);
});
test('An in-flight poll for an old couple never changes its replacement',async()=>{
 const h=harness(),a=h.device('a');
 h.setInvite({id:'invite-3',state:'pending',available:false});
 // A changed verified couple makes any delayed remote result inapplicable.
 a.state.coupleId='next-couple';
 await a.sync.probe(true);
 await delay(45);
 assert.equal(a.state.eveningInvite.state,'none');
 assert.equal(a.renders(),0);
});
