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
  const scope={state,authFeedbackGeneration:2,
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

