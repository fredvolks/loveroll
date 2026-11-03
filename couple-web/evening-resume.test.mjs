import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumHomeHtml} from './premium-home.mjs';
import {safeEveningStorage,saveEveningSelection,clearEveningSelection,restoreEveningSelection} from './evening-resume.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8'),app=read('app.js'),sw=read('service-worker.js');
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('Home exposes resume only while an official weekly evening is open',()=>{
 const weekly={face:2},active=premiumHomeHtml({weekly,activeEvening:true});
 assert.match(active,/data-action="resume-evening"/);
 assert.match(active,/Reprendre notre soirée/);
 assert.doesNotMatch(active,/data-action="roll:weekly"/);
 const inactive=premiumHomeHtml({weekly,activeEvening:false});
 assert.doesNotMatch(inactive,/data-action="resume-evening"/);
 assert.match(inactive,/data-action="tab:session"/);
 assert.match(inactive,/Aller à notre soirée/);
 assert.doesNotMatch(inactive,/data-action="roll:weekly"/);
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
 for(const status of ['completed','passed','refused','cancelled','unknown']){
  const store=memory();saveEveningSelection(store,'alice','s1','a');
  assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'a',recipient:'alice',session_id:'s1',status}]),null);
 }
 const store=memory();saveEveningSelection(store,'alice','s1','a');
 assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'new',recipient:'alice',session_id:'s1'}]),null);
 assert.equal(restoreEveningSelection(store,'alice','s1',[{id:'a',recipient:'bob',session_id:'s1'}]),null);
});
test('Resume action is read-only, restores server private queue and reconciles timers',()=>{
 const handler=app.slice(app.indexOf("if(verb==='resume-evening'){"),app.indexOf("if(verb==='tab'){"));
 assert.match(handler,/await refreshShared\(\)/);
 assert.match(handler,/playableSessionForWeekly\(state\.session,state\.weekly\)/);
 assert.match(handler,/ownEveningChallenges\(state\.challenges,state\.user\.id,session\.id\)/);
 assert.match(handler,/restoreEveningSelection\(safeEveningStorage\(\),state\.user\.id,session\.id,privateCards\)/);
 assert.match(handler,/reconcileSavedEveningTimers\(\)/);
 assert.doesNotMatch(handler,/rpc\('|animateRoll|new-session|new-challenge|roll_my_evening_d6/);
 assert.match(app,/const ongoingEvening=activeEvening&&!activeEvening\.finished_at/);
 assert.match(app,/activeEvening:!!ongoingEvening/);
 assert.match(app,/saveEveningSelection\(safeEveningStorage\(\),state\.user\.id,state\.session\.id,parts\[0\]\)/);
 const build=JSON.parse(read('web-version.json')).build;
 assert.ok(sw.includes("const CACHE='loveroll-static-v"+build.split('.')[1]+"'"));
 assert.match(sw,/\.\/evening-resume\.mjs/);
 assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
});

test('Only current proposed or accepted cards can resume after a server refresh',()=>{
 for(const status of ['proposed','accepted']){
  const store=memory(),card={id:'a',recipient:'alice',session_id:'s1',status};
  saveEveningSelection(store,'alice','s1','a');
  assert.equal(restoreEveningSelection(store,'alice','s1',[card]),'a');
 }
 const store=memory();saveEveningSelection(store,'alice','s1','a');
 const completed={id:'a',recipient:'alice',session_id:'s1',status:'completed'};
 assert.equal(restoreEveningSelection(store,'alice','s1',[completed]),null);
 assert.equal(store.map.size,0,'The obsolete bookmark must be cleared');
});

test('LR-018: unavailable storage is not reported as successful persistence',()=>{
 const card={id:'a',recipient:'alice',session_id:'s1',status:'accepted'};
 for(const storage of [null,undefined,{}, {setItem:null}]){
  assert.equal(saveEveningSelection(storage,'alice','s1','a'),false);
  assert.equal(restoreEveningSelection(storage,'alice','s1',[card]),null);
 }
 const getterDenied=Object.defineProperty({},'setItem',{get(){throw new Error('SecurityError')}});
 assert.equal(saveEveningSelection(getterDenied,'alice','s1','a'),false);
 const disabled={
  setItem(){throw new Error('SecurityError')},
  getItem(){throw new Error('SecurityError')},
  removeItem(){throw new Error('SecurityError')}
 };
 assert.equal(saveEveningSelection(disabled,'alice','s1','a'),false);
 assert.equal(restoreEveningSelection(disabled,'alice','s1',[card]),null);
 const available=memory();
 assert.equal(saveEveningSelection(available,'alice','s1','a'),true);
 assert.equal(restoreEveningSelection(available,'alice','s1',[card]),'a');
});

test('LR-018: a silent or unreadable write must never confirm a saved bookmark',()=>{
 const card={id:'a',recipient:'alice',session_id:'s1',status:'proposed'};
 const silent={setItem(){},getItem(){return null}};
 const stale={setItem(){},getItem(){return 'previous-card'}};
 const noRead={setItem(){}};
 const readDenied={setItem(){},getItem(){throw Error('SecurityError')}};
 const readGetterDenied=Object.defineProperty({setItem(){}},'getItem',{
  get(){throw Error('SecurityError')}
 });
 for(const storage of [silent,stale,noRead,readDenied,readGetterDenied]){
  assert.equal(saveEveningSelection(storage,'alice','s1','a'),false);
  assert.notEqual(restoreEveningSelection(storage,'alice','s1',[card]),'a');
 }
 const stored=memory();
 assert.equal(saveEveningSelection(stored,'alice','s1','a'),true);
 assert.equal(restoreEveningSelection(stored,'alice','s1',[card]),'a');
});

// Storage's property getter can throw before a helper receives the storage object.
test('LR-018: denied browser storage getter never interrupts selecting or resuming a card',()=>{
 const denied=()=>{throw new Error('SecurityError')};
 const store=memory();
 assert.equal(safeEveningStorage(denied),null);
 assert.equal(safeEveningStorage(()=>undefined),null);
 assert.equal(safeEveningStorage(()=>store),store);
 assert.equal(saveEveningSelection(safeEveningStorage(denied),'alice','s1','a'),false);
 assert.equal(restoreEveningSelection(safeEveningStorage(denied),'alice','s1',[]),null);
 assert.equal(clearEveningSelection(safeEveningStorage(denied),'alice','s1'),undefined);
 assert.equal((app.match(/(?:saveEveningSelection|restoreEveningSelection|clearEveningSelection)\(safeEveningStorage\(\),/g)||[]).length,5);
 assert.doesNotMatch(app,/(?:saveEveningSelection|restoreEveningSelection|clearEveningSelection)\(localStorage,/);
});
