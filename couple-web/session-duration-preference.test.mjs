import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 readSessionLength,saveSessionLength,sessionLengthChooserHtml,sessionLengthSettingsHtml
} from './session-duration-preference.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';

const memory=()=>{
 const values=new Map();
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
};
test('The 5/10/15/30/free planner persists separately for each account',()=>{
 const store=memory();
 assert.equal(readSessionLength('fred',store),'libre');
 assert.equal(saveSessionLength('fred','15',store),true);
 assert.equal(readSessionLength('fred',store),'15');
 assert.equal(readSessionLength('emilie',store),'libre');
 assert.equal(saveSessionLength('emilie','5',store),true);
 assert.equal(readSessionLength('emilie',store),'5');
 assert.equal(readSessionLength('fred',store),'15');
 assert.equal(store.values.get('loveroll-session-length:fred'),'15');
 assert.equal(saveSessionLength('', '30',store),false);
 assert.equal(saveSessionLength('fred','120',store),false);
 assert.equal(readSessionLength('',store),'libre');
});
test('Safari denied storage retains temporary preference without mixing accounts',()=>{
 const noAccess=Object.defineProperty({},'localStorage',{
  get(){throw Error('SecurityError');}
 });
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){return noAccess.localStorage;}});
  assert.equal(saveSessionLength('safari-alice','10'),true);
  assert.equal(readSessionLength('safari-alice'),'10');
  assert.equal(readSessionLength('safari-bob'),'libre');
  assert.equal(saveSessionLength('safari-bob','30'),true);
  assert.equal(readSessionLength('safari-bob'),'30');
 }finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else delete globalThis.localStorage;
 }
 // A later successful persistent write ends the ephemeral fallback.
 const store=memory();
 assert.equal(saveSessionLength('safari-alice','5',store),true);
 assert.equal(readSessionLength('safari-alice',store),'5');
 assert.equal(store.values.get('loveroll-session-length:safari-alice'),'5');
});
test('The selected duration is visible in the compact pre-session picker and settings',()=>{
 const choice=sessionLengthChooserHtml('15');
 assert.match(choice,/<option value="15" selected>15 min<\/option>/);
 assert.match(choice,/data-session-length-select="true"/);
 const settings=sessionLengthSettingsHtml('30');
 assert.match(settings,/data-action="session-length:30" aria-pressed="true"/);
 assert.match(settings,/sinon pour cette visite seulement/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/saveSessionLength\(state\.user\.id,parts\[0\]\)/);
 assert.match(app,/sessionLength:readSessionLength\(uid\)/);
});

test('Next-evening planner stays visible after closure without unlocking another evening',()=>{
 const last={id:'closed',completed:9,myResponse:true,partnerResponse:false,responses:1};
 const html=premiumEveningHtml({
  session:null,members:[{user_id:'alice',name:'Alice'},{user_id:'bob',name:'Bob'}],
  me:'alice',lastEvening:last,sessionLength:'30',weeklyCount:1,weeklyLimit:3,
  canStartEvening:false,dailyLocked:true
 });
 assert.match(html,/Notre soirée est terminée/);
 assert.match(html,/<option value="30" selected>30 min<\/option>/);
 assert.equal((html.match(/data-session-length-select="true"/g)||[]).length,1);
 // A closed evening always offers its own review and calendar, not a disabled
 // "new session" action. The next-evening setting is only a local preference.
 assert.match(html,/data-action="review-open:closed"/);
 assert.match(html,/data-action="evening-calendar"/);
 assert.doesNotMatch(html,/data-action="new-session"/);
 const locked=premiumEveningHtml({
  session:null,lastEvening:null,sessionLength:'30',canStartEvening:false,
  dailyLocked:true
 });
 assert.match(locked,/data-action="new-session"[^>]*disabled/);
});

test('A delayed new-session RPC cannot navigate another account or couple',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const begin=source.indexOf("if(verb==='new-session'){");
 const end=source.indexOf("if(verb==='my-d6'){",begin);
 assert.ok(begin>0&&end>begin,'The production new-session route exists');
 const route=source.slice(begin,end);
 function harness(){
  let resolve;
  const pending=new Promise(done=>{resolve=done;});
  const state={user:{id:'alice'},coupleId:'couple-a',weekly:{id:'week'},
   sessions:[],tab:'home'};
  const calls={writes:[],refresh:0};
  const scope={state,authFeedbackGeneration:2,currentNewSessionRequest:null,
   eveningDailyAccess:()=>({canStart:true}),
   rpc:(method,args)=>{calls.writes.push({method,args});return pending;},
   refreshAndShow:async()=>{calls.refresh++;}
  };
  const execute=runInNewContext('(async verb=>{'+route+'})',scope);
  return {state,scope,calls,resolve,execute:()=>execute('new-session')};
 }
 const normal=harness(),go=normal.execute();
 assert.equal(normal.calls.writes.length,1);
 assert.equal(normal.calls.writes[0].method,'ensure_couple_session');
 assert.equal(normal.calls.writes[0].args.p_couple,'couple-a');
 normal.resolve(null);await go;
 assert.equal(normal.state.tab,'session');
 assert.equal(normal.calls.refresh,1);
 for(const change of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.coupleId='couple-b';},
  h=>{h.scope.authFeedbackGeneration++;},
  h=>{h.state.user=null;}
 ]){
  const h=harness(),work=h.execute();
  change(h);h.resolve(null);await work;
  assert.equal(h.calls.writes.length,1);
  assert.equal(h.state.tab,'home');
  assert.equal(h.calls.refresh,0,'Stale session result must not refresh another login');
 }
 const missing=harness();
 missing.state.coupleId=null;
 await missing.execute();
 assert.equal(missing.calls.writes.length,0);
 assert.equal(missing.state.tab,'home');
});


test('Rapid Soirée start taps only create one session; next login is not blocked',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(verb==='new-session'){");
 const end=source.indexOf("if(verb==='my-d6'){",start);
 assert.ok(start>0&&end>start);
 const route=source.slice(start,end);
 const state={user:{id:'alice'},coupleId:'duo-a',
  weekly:{id:'week'},sessions:[],tab:'home'};
 let nextResolve;
 const pending=[];
 let writes=0,refreshes=0;
 const scope={state,authFeedbackGeneration:2,currentNewSessionRequest:null,
  eveningDailyAccess:()=>({canStart:true}),
  rpc:(name,args)=>{
   assert.equal(name,'ensure_couple_session');
   writes++;
   let resolve,reject;
   const promise=new Promise((a,b)=>{resolve=a;reject=b;});
   pending.push({resolve,reject,args});
   nextResolve=resolve;
   return promise;
  },
  refreshAndShow:async()=>{refreshes++;}
 };
 const act=runInNewContext('(async verb=>{'+route+'})',scope);
 const first=act('new-session'),duplicate=act('new-session');
 await duplicate;
 assert.equal(writes,1,'Double-tap must not send a second server RPC');
 assert.equal(pending[0].args.p_couple,'duo-a');
 // A fresh account may start even while the earlier pending request is unresolved.
 state.user={id:'bob'};state.coupleId='duo-b';scope.authFeedbackGeneration=3;
 const second=act('new-session');
 assert.equal(writes,2);
 assert.equal(pending[1].args.p_couple,'duo-b');
 pending[0].resolve(null);await first;
 assert.equal(state.tab,'home','Earlier user cannot navigate the replacement login');
 assert.equal(refreshes,0);
 assert.ok(scope.currentNewSessionRequest,'Stale completion cannot clear Bob’s request');
 pending[1].resolve(null);await second;
 assert.equal(state.tab,'session');
 assert.equal(refreshes,1);
 assert.equal(scope.currentNewSessionRequest,null);
 // Failure must release the guard so a legitimate same-account retry can run.
 state.tab='home';
 const failed=act('new-session');
 assert.equal(writes,3);
 pending[2].reject(Error('Temporary network failure'));
 await assert.rejects(failed,/Temporary network failure/);
 assert.equal(scope.currentNewSessionRequest,null);
 const retry=act('new-session');
 assert.equal(writes,4);
 pending[3].resolve(null);await retry;
 assert.equal(refreshes,2);
});

test('Delayed close and finish responses cannot repaint a replacement login',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const routes=[
  ["finish-session","if(verb==='finish-session'){","if(verb==='cancel-session'){",
   'finish_couple_session','session'],
  ["evening-close-confirm","if(verb==='evening-close-confirm'){",
   "if(verb==='evening-challenge'||verb==='evening-list'){",
   'close_love_evening_preserve','evening-calendar']
 ];
 for(const [verb,start,end,rpcName,targetTab] of routes){
  const from=source.indexOf(start),to=source.indexOf(end,from+start.length);
  assert.ok(from>0&&to>from,'Production route missing: '+verb);
  const block=source.slice(from,to);
  function harness(){
   let resolve;
   const pending=new Promise(done=>{resolve=done;});
   const state={
    user:{id:'alice'},coupleId:'duo-a',diceStatus:null,tab:'home',
    session:{id:'night-one',started_at:'2026-10-16T19:00:00Z'},
    chosenSession:null,confirmCancel:true,showEveningChallenges:true
   };
   const calls={writes:[],refresh:0};
   const scope={state,authFeedbackGeneration:5,
    rpc:(name,args)=>{calls.writes.push({name,args});return pending;},
    eveningLocalDay:()=> '2026-10-16',month:()=> '2026-10',
    today:()=> '2026-10-16',
    refreshAndShow:async()=>{calls.refresh++;}
   };
   const run=runInNewContext('(async verb=>{'+block+'})',scope);
   return {state,scope,calls,resolve,execute:()=>run(verb)};
  }
  const success=harness(),ok=success.execute();
  assert.equal(success.calls.writes[0].name,rpcName);
  assert.equal(success.calls.writes[0].args.p_session,'night-one');
  success.resolve(null);await ok;
  assert.equal(success.state.tab,targetTab);
  assert.equal(success.calls.refresh,1);
  for(const change of [
   h=>{h.state.user={id:'bob'};},
   h=>{h.state.coupleId='duo-b';},
   h=>{h.scope.authFeedbackGeneration++;},
   h=>{h.state.session={id:'night-two'};}
  ]){
   const h=harness(),work=h.execute();
   change(h);h.resolve(null);await work;
   assert.equal(h.state.tab,'home','The new account keeps its own screen');
   assert.equal(h.calls.refresh,0,'No stale data refresh');
   assert.equal(h.state.chosenSession,null);
   assert.equal(h.state.confirmCancel,true);
   assert.equal(h.state.eveningCalendarDate,undefined);
  }
 }
});

test('Cancel confirmation is safe during an official roll and after an Auth change',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(verb==='cancel-session'){");
 const end=source.indexOf("if(verb==='advent-open'){",start);
 assert.ok(start>0&&end>start);
 const route=source.slice(start,end);
 function fixture(){
  let resolve;
  const pending=new Promise(done=>{resolve=done;});
  const state={user:{id:'alice'},coupleId:'duo-a',tab:'session',
   session:{id:'night-a'},confirmCancel:false,diceStatus:null};
  const calls={writes:[],refresh:0,renders:0};
  const scope={state,authFeedbackGeneration:4,
   rpc:(name,args)=>{calls.writes.push({name,args});return pending;},
   render:()=>{calls.renders++;},
   refreshAndShow:async()=>{calls.refresh++;}
  };
  const run=runInNewContext('(async verb=>{'+route+'})',scope);
  return {state,scope,calls,resolve,run};
 }
 const normal=fixture();
 await normal.run('cancel-session');
 assert.equal(normal.state.confirmCancel,true);
 assert.equal(normal.calls.renders,1);
 const closed=normal.run('confirm-cancel');
 assert.equal(normal.calls.writes.length,1);
 assert.equal(normal.calls.writes[0].name,'finish_couple_session');
 assert.equal(normal.calls.writes[0].args.p_session,'night-a');
 assert.equal(normal.calls.writes[0].args.p_count,false);
 normal.resolve(null);await closed;
 assert.equal(normal.state.tab,'home');
 assert.equal(normal.state.confirmCancel,false);
 assert.equal(normal.calls.refresh,1);
 for(const status of ['pending','rolling','settled']){
  const h=fixture();h.state.diceStatus=status;
  await h.run('cancel-session');
  await h.run('confirm-cancel');
  assert.equal(h.calls.writes.length,0,'No cancel RPC while dice are active');
  assert.equal(h.calls.renders,0);
  assert.equal(h.state.confirmCancel,false);
 }
 for(const mutation of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.coupleId='duo-b';},
  h=>{h.state.session={id:'night-b'};},
  h=>{h.scope.authFeedbackGeneration++;}
 ]){
  const h=fixture();
  h.state.confirmCancel=true;
  const work=h.run('confirm-cancel');
  mutation(h);
  h.resolve(null);await work;
  assert.equal(h.calls.writes.length,1);
  assert.equal(h.state.tab,'session','Old receipt cannot send new login home');
  assert.equal(h.state.confirmCancel,true);
  assert.equal(h.calls.refresh,0);
 }
});

