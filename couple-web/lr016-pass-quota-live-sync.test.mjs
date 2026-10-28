// LR-016: Two real client states, no personal quota shared between partners.
// Realtime is primary; secure, bounded polling recovers when socket is blocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coupleSyncChanged,createCoupleLiveSync} from './couple-live-sync.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
function harness(){
 const db={limit:3,used:{alice:1,bob:3}};
 let reads=0;
 const devices=[];
 function device(name){
  const personal=()=>({month:'2026-10',used:db.used[name],limit:db.limit,
   remaining:Math.max(db.limit-db.used[name],0),can_pass:db.used[name]<db.limit});
  const state={user:{id:name},coupleId:'two-person-couple',members:[{user_id:'alice'},{user_id:'bob'}],
   tab:'session',weekly:null,monthly:{},session:null,sessions:[],challenges:[],
   monthlyPassQuota:personal(),diceStatus:null,adventOpening:null};
  let renders=0;
  const query=async table=>{
   if(table==='couple_rolls'||table==='couple_sessions')return [];
   throw Error('Unexpected table '+table);
  };
  const rpc=async name=>{
   if(name==='my_love_monthly_pass_quota'){reads++;return personal();}
   if(name==='love_evening_reviews_for_couple')return [];
   if(name==='love_evening_invite_status')return null;
   throw Error('A quota probe must not draw a D6 or mutate a challenge: '+name);
  };
  const refresh=async()=>{state.monthlyPassQuota=await rpc('my_love_monthly_pass_quota')};
  const sync=createCoupleLiveSync({state,query,rpc,refresh,render:()=>renders++,
   ready:(id,m)=>!!id&&m.length===2,week:()=>'2026-10-26',
   month:()=>'2026-10',formDirty:()=>false,visible:()=>true,online:()=>false});
  const client={state,sync,renders:()=>renders};devices.push(client);return client;
 }
 return {db,device,reads:()=>reads};
}
test('per-person monthly quota change triggers fallback refresh but no automatic dice or pass',async()=>{
 const h=harness(),admin=h.device('alice'),partner=h.device('bob');
 assert.equal(admin.state.monthlyPassQuota.used,1);
 assert.equal(partner.state.monthlyPassQuota.used,3);
 assert.equal(partner.state.monthlyPassQuota.can_pass,false);
 h.db.limit=5; // Only the owner can change this through the official server RPC.
 await partner.sync.probe(true);await delay(50);
 assert.deepEqual(partner.state.monthlyPassQuota,
  {month:'2026-10',used:3,limit:5,remaining:2,can_pass:true});
 assert.equal(admin.state.monthlyPassQuota.used,1,'Other partner count remains private');
 assert.equal(partner.renders(),1);
 await partner.sync.probe(true);await delay(50);
 assert.equal(partner.renders(),1,'Identical quota never remounts official 3D dice');
 h.db.limit=0;
 await partner.sync.probe(true);await delay(50);
 assert.equal(partner.state.monthlyPassQuota.can_pass,false);
 assert.equal(partner.state.monthlyPassQuota.remaining,0);
 await admin.sync.probe(true);await delay(50);
 assert.equal(admin.state.monthlyPassQuota.used,1);
 assert.equal(admin.state.monthlyPassQuota.limit,0);
});
test('Realtime refresh does not interrupt active official 3D throw',async()=>{
 const h=harness(),partner=h.device('bob');
 h.db.limit=7;partner.state.diceStatus='spinning';
 partner.sync.request(0);await delay(55);
 assert.equal(partner.renders(),0);
 assert.equal(partner.state.monthlyPassQuota.limit,3);
 partner.state.diceStatus=null;
 partner.sync.request(0);await delay(55);
 assert.equal(partner.state.monthlyPassQuota.limit,7);
 assert.equal(partner.renders(),1);
});
test('quota comparison ignores unknown legacy RPC, recognizes limit and month, not private other-person data',()=>{
 const local={monthlyPassQuota:{month:'2026-10',used:2,limit:3,can_pass:true},weekly:null,session:null,monthly:{}};
 const base={rolls:[],sessions:[]};
 assert.equal(coupleSyncChanged(local,base,{tab:'session'}),false);
 assert.equal(coupleSyncChanged(local,{...base,passQuota:{...local.monthlyPassQuota}},{tab:'session'}),false);
 assert.equal(coupleSyncChanged(local,{...base,passQuota:{...local.monthlyPassQuota,limit:5}},{tab:'session'}),true);
 assert.equal(coupleSyncChanged(local,{...base,passQuota:{...local.monthlyPassQuota,month:'2026-11'}},{tab:'session'}),true);
});
test('couple realtime detects a shared limit change without reading partner pass count',()=>{
 assert.match(app,/const earlierLimit=Number\(state\.couple\.monthly_pass_limit\?\?3\)/);
 assert.match(app,/Number\(state\.couple\.monthly_pass_limit\?\?3\)!==earlierLimit/);
 assert.match(app,/liveSync\.request\(120\)/);
 assert.match(app,/rpc\('my_love_monthly_pass_quota',\{p_couple:c\}\)/);
 assert.match(app,/state\.monthlyPassQuota\?\.can_pass===false/);
 assert.match(app,/button\('evening-refuse:[^\n]*Refuser ce défi/);
});
