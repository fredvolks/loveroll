import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumHomeHtml} from './premium-home.mjs';
import {saveEveningSelection,clearEveningSelection,restoreEveningSelection} from './evening-resume.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8'),app=read('app.js'),sw=read('service-worker.js');
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('Home exposes resume only while an official weekly evening is open',()=>{
 const weekly={face:2},active=premiumHomeHtml({weekly,activeEvening:true});
 assert.match(active,/data-action="resume-evening"/);
 assert.match(active,/Reprendre notre soirée/);
 assert.doesNotMatch(active,/data-action="roll:weekly"/);
 const inactive=premiumHomeHtml({weekly,activeEvening:false});
 assert.doesNotMatch(inactive,/data-action="resume-evening"/);
 assert.match(inactive,/home-roll-button is-used[^"]*" type="button" disabled/);
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
 assert.match(handler,/await refreshShared\(\)/);
 assert.match(handler,/playableSessionForWeekly\(state\.session,state\.weekly\)/);
 assert.match(handler,/ownEveningChallenges\(state\.challenges,state\.user\.id,session\.id\)/);
 assert.match(handler,/restoreEveningSelection\(localStorage,state\.user\.id,session\.id,privateCards\)/);
 assert.match(handler,/reconcileSavedEveningTimers\(\)/);
 assert.doesNotMatch(handler,/rpc\('|animateRoll|new-session|new-challenge|roll_my_evening_d6/);
 assert.match(app,/activeEvening:!!activeEvening/);
 assert.match(app,/saveEveningSelection\(localStorage,state\.user\.id,state\.session\.id,parts\[0\]\)/);
 const build=JSON.parse(read('web-version.json')).build;
 assert.ok(sw.includes("const CACHE='loveroll-static-v"+build.split('.')[1]+"'"));
 assert.match(sw,/\.\/evening-resume\.mjs/);
 assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
});
