import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumHomeHtml} from './premium-home.mjs';
import {saveEveningSelection,clearEveningSelection,restoreEveningSelection,safeEveningBookmarkStorage} from './evening-resume.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8'),app=read('app.js'),sw=read('service-worker.js');
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('Home exposes resume only while an official weekly evening is open',()=>{
 const weekly={face:2},active=premiumHomeHtml({weekly,activeEvening:true});
 assert.match(active,/data-action="resume-evening"/);
 assert.match(active,/Reprendre notre soirée/);
 assert.doesNotMatch(active,/data-action="roll:weekly"/);
 const inactive=premiumHomeHtml({weekly,activeEvening:false});
 assert.doesNotMatch(inactive,/data-action="resume-evening"/);
 assert.match(inactive,/home-roll-button is-used[^"]*" type="button" data-action="tab:session"/);
 assert.match(inactive,/♡ Aller à notre soirée/);
 assert.doesNotMatch(premiumHomeHtml({weekly:null}),/data-action="resume-evening"/);
});
test('Bookmark is scoped by account/session, stores no private card text and rejects stale IDs',()=>{
 const store=memory(),card={id:'a',recipient:'alice',session_id:'s1',status:'accepted',title:'private'};
 assert.equal(saveEveningSelection(store,'alice','s1','a'),true);
 assert.equal(restoreEveningSelection(store,'alice','s1',[card]),'a');
 assert.equal(restoreEveningSelection(store,'bob','s1',[{...card,recipient:'bob'}]),null);
 assert.equal(restoreEveningSelection(store,'alice','s2',[{...card,session_id:'s2'}]),null);
 assert.equal(JSON.stringify([...store.map]).includes('private'),false);
 clearEveningSelection(store,'alice','s1');
 assert.equal(restoreEveningSelection(store,'alice','s1',[card]),null);
});
test('Rejected, replaced and foreign challenges never reopen',()=>{
 for(const status of ['passed','refused']){
  const store=memory();saveEveningSelection(store,'alice','s1','a');
  assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'a',recipient:'alice',session_id:'s1',status}]),null);
 }
 const store=memory();saveEveningSelection(store,'alice','s1','a');
 assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'new',recipient:'alice',session_id:'s1'}]),null);
 assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'a',recipient:'bob',session_id:'s1'}]),null);
});
test('Resume action is read-only, restores server private queue and reconciles timers',()=>{
 const handler=app.slice(app.indexOf("if(verb==='resume-evening'){"),app.indexOf("if(verb==='tab'){"));
 // Capture the refresh ownership token before awaiting its result: another
 // account, official draw or newer refresh may finish first.
 assert.match(handler,/const refreshing=refreshShared\(\)/);
 assert.match(handler,/const request=state\.unscopedSharedRefreshRequest/);
 assert.match(handler,/await refreshing/);
 assert.match(handler,/state\.unscopedSharedRefreshRequest!==request/);
 assert.match(handler,/isActiveEveningGiftPending\(\)/);
 assert.match(handler,/playableSessionForWeekly\(state\.session,state\.weekly\)/);
 assert.match(handler,/ownEveningChallenges\(state\.challenges,state\.user\.id,session\.id\)/);
 assert.match(handler,/restoreEveningSelection\(safeEveningBookmarkStorage\(\),state\.user\.id,session\.id,privateCards\)/);
 assert.match(handler,/reconcileSavedEveningTimers\(\)/);
 assert.doesNotMatch(handler,/rpc\('|animateRoll|new-session|new-challenge|roll_my_evening_d6/);
 assert.match(app,/activeEvening:!!activeEvening/);
 assert.match(app,/saveEveningSelection\(safeEveningBookmarkStorage\(\),state\.user\.id,state\.session\.id,parts\[0\]\)/);
 const build=JSON.parse(read('web-version.json')).build;
 assert.ok(sw.includes("const CACHE='loveroll-static-v"+build.split('.')[1]+"'"));
 assert.match(sw,/\.\/evening-resume\.mjs/);
 assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
});


test('Resume bookmark acknowledges only a real successful storage write',()=>{
 const store=memory();
 assert.equal(saveEveningSelection(undefined,'alice','s1','a'),false);
 assert.equal(saveEveningSelection({getItem:()=>null},'alice','s1','a'),false);
 assert.equal(saveEveningSelection({setItem:()=>{throw Error('blocked');}},'alice','s1','a'),false);
 assert.equal(saveEveningSelection(store,'alice','s1',null),false);
 assert.equal(saveEveningSelection(store,'alice','s1',{}),false);
 assert.equal(saveEveningSelection(store,'alice','s1','   '),false);
 assert.equal(store.map.size,0);
 assert.equal(saveEveningSelection(store,'alice','s1','a'),true);
 assert.equal(restoreEveningSelection(store,'alice','s1',[{
  id:'a',recipient:'alice',session_id:'s1',status:'accepted'
 }]),'a');
});
test('A transient malformed private queue cannot crash resume or erase its bookmark',()=>{
 const store=memory();
 saveEveningSelection(store,'alice','s1','a');
 const before=[...store.map];
 for(const malformed of [null,undefined,{},'not ready',false]){
  assert.equal(restoreEveningSelection(store,'alice','s1',malformed),null);
  assert.deepEqual([...store.map],before);
 }
 assert.equal(restoreEveningSelection(store,'alice','s1',[{
  id:'a',recipient:'alice',session_id:'s1',status:'accepted'
 }]),'a');
 // Once the server returns a valid list with no matching card, the bookmark
 // is legitimately stale and must be discarded.
 assert.equal(restoreEveningSelection(store,'alice','s1',[]),null);
 assert.equal(store.map.size,0);
});

test('Safari denied storage access cannot interrupt opening, closing or resuming Soirée',()=>{
 const restricted=Object.defineProperty({},'localStorage',{
  get(){throw new DOMException('Storage blocked','SecurityError');}
 });
 assert.equal(safeEveningBookmarkStorage(restricted),null);
 assert.equal(safeEveningBookmarkStorage({}),null);
 const store=memory();
 assert.equal(safeEveningBookmarkStorage({localStorage:store}),store);
 const own={id:'a',recipient:'alice',session_id:'s1',status:'accepted'};
 assert.equal(saveEveningSelection(safeEveningBookmarkStorage(restricted),'alice','s1','a'),false);
 assert.equal(restoreEveningSelection(safeEveningBookmarkStorage(restricted),'alice','s1',[own]),null);
 assert.doesNotThrow(()=>clearEveningSelection(safeEveningBookmarkStorage(restricted),'alice','s1'));
 // All five private bookmark entry points in the app must use this adapter.
 const callsites=app.match(/(?:saveEveningSelection|restoreEveningSelection|clearEveningSelection)\(safeEveningBookmarkStorage\(\),/g)||[];
 assert.equal(callsites.length,5);
 assert.doesNotMatch(app,/(?:saveEveningSelection|restoreEveningSelection|clearEveningSelection)\(localStorage,/);
 assert.match(app,/evening-resume\.mjs\?v=20261031-resume-safari/);
});

test('LR-028: gift starting during the home resume cannot reopen an outdated private queue',async()=>{
 const {runInNewContext}=await import('node:vm');
 const from=app.indexOf("if(verb==='resume-evening'){");
 const to=app.indexOf("if(verb==='tab'){",from);
 assert.ok(from>=0&&to>from,'Production resume route must remain extractable');
 const state={tab:'home',user:{id:'alice'},coupleId:'duo-a',
  session:{id:'night-a'},weekly:{id:'week-a'},
  members:[{user_id:'alice'},{user_id:'bob'}],challenges:[],
  showEveningChallenges:false,diceStatus:null};
 let giftPending=false,resolveRefresh,refreshCount=0,renderCount=0,queueReads=0;
 const token={};
 const scope={state,authFeedbackGeneration:5,
  isActiveEveningRedrawPending:()=>false,
  isActiveEveningGiftPending:()=>giftPending,
  isSharedCoupleReady:()=>true,
  refreshShared:()=>{
   refreshCount++;
   state.unscopedSharedRefreshRequest=token;
   return new Promise(resolve=>{resolveRefresh=resolve;});
  },
  playableSessionForWeekly:()=>state.session,
  ownEveningChallenges:()=>{queueReads++;return [];},
  visibleEveningQueue:cards=>cards,
  restoreEveningSelection:()=>null,
  safeEveningBookmarkStorage:()=>({}),
  render:()=>{renderCount++;},
  reconcileSavedEveningTimers:async()=>{},
  notify:()=>{},console:{warn(){}}
 };
 const action=runInNewContext('(async verb=>{'+app.slice(from,to)+'})',scope);
 giftPending=true;
 await action('resume-evening');
 assert.equal(refreshCount,0,'An active gift blocks resume immediately');
 giftPending=false;
 const pending=action('resume-evening');
 assert.equal(refreshCount,1,'Home resume uses the official refresh');
 giftPending=true;
 resolveRefresh(true);await pending;
 assert.equal(state.tab,'home','Do not remount stale private D100 cards');
 assert.equal(queueReads,0,'No private queue lookup during an active gift');
 assert.equal(renderCount,0,'Do not replace the gift confirmation screen');
 giftPending=false;
 const retry=action('resume-evening');
 resolveRefresh(true);await retry;
 assert.equal(state.tab,'session','Resume is available again once the gift settles');
 assert.equal(queueReads,1);
 assert.equal(renderCount,1);
});
