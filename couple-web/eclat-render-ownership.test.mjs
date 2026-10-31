import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Verify the live renderEclat function rather than duplicating its privacy rules.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const begin=app.indexOf('function renderEclat(){');
const end=app.indexOf('function renderHome(){',begin);
assert.ok(begin>0&&end>begin,'renderEclat production implementation exists');
const source=app.slice(begin,end)+';renderEclat();';

function renderFixture(memberCount){
 const status={active:true,access:true,coffret_id:1,chapter_number:1,variant_number:0};
 const history=[{coffret_id:1,private_note:'old couple content'}];
 const state={user:{id:'alice'},coupleId:'shared-duo',
  members:Array.from({length:memberCount},(_,i)=>({id:i?'bob':'alice'})),
  testMode:'real',testModeEligible:false,eclat:status,
  tab:'eclat',eclatMusic:false,eclatSelection:1,eclatMinutes:30,
  eclatDetails:false,eclatBrowse:false,eclatIntent:'all',
  eclatFinished:'private completed title',eclatHistory:history,
  eclatHistoryCouple:'shared-duo',eclatHistoryUserId:'alice',
  eclatHistoryError:false};
 const captured=[];let stops=0,notes=0,frames=0;
 runInNewContext(source,{
  state,isSharedCoupleReady:(c,m)=>!!c&&Array.isArray(m)&&m.length===2,
  previewEclatStatus:e=>e,eclatStage:()=>({mood:'romantique'}),
  eclatAudio:{setMood:()=>{},stop:()=>stops++},
  eclatHtml:payload=>{captured.push(payload);return '<eclat>';},
  eclatNoteState:()=>{notes++;return {note:'not-shared'};},
  frame:()=>frames++
 });
 return {state,status,history,payload:captured[0],stops,notes,frames};
}

test('LR-026: revoked couple cannot display cached Éclat status, history or completed title',()=>{
 const f=renderFixture(1);
 assert.equal(f.payload.status,null);
 assert.equal(f.payload.history.length,0);
 assert.equal(f.payload.finished,null);
 assert.equal(f.notes,0,'no private note can load while the couple is unavailable');
 assert.equal(f.frames,1);
});

test('LR-026: valid couple retains normal Éclat status, history and completion',()=>{
 const f=renderFixture(2);
 assert.equal(f.payload.status,f.status);
 assert.equal(f.payload.history,f.history);
 assert.equal(f.payload.finished,'private completed title');
 assert.equal(f.notes,1);
 assert.equal(f.frames,1);
});
