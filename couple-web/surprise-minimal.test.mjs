import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingSpecialEvents,premiumSurpriseHtml} from './premium-surprise.mjs';
import {goldArrowHtml} from './gold-arrows.mjs';
import {readFileSync} from 'node:fs';
test('Events sort by next date, keep available events first and missing dates last without changing input',()=>{
 const input=[{slot:'missing',daysLeft:null},{slot:'later',daysLeft:90},{slot:'soon',daysLeft:2},{slot:'active',daysLeft:-3},{slot:'today',daysLeft:0}];
 assert.deepEqual(upcomingSpecialEvents(input).map(x=>x.slot),['active','today','soon','later','missing']);
 assert.equal(input[0].slot,'missing');
});
test('Rendered event order follows dates while edit actions retain each owner',()=>{
 const html=premiumSurpriseHtml({now:new Date('2026-10-22T16:00:00Z'),members:[{user_id:'f',name:'Fred'},{user_id:'e',name:'Émilie'}],settings:{anniversary_md:'08-15',birthday_by_user:{f:'01-04',e:'02-08'}}});
 const actions=[...html.matchAll(/data-action="edit-surprise-event:([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(actions,['birthday:f','birthday:e','valentine:-','mothers_day:-','fathers_day:-','anniversary:-']);
});
test('Forward template is a simple filled triangle; back keeps its existing gold circle',()=>{
 assert.match(goldArrowHtml(),/is-next/);assert.doesNotMatch(goldArrowHtml(),/<circle/);
 assert.match(goldArrowHtml(true),/is-back/);assert.match(goldArrowHtml(true),/<circle/);
});

test('Mobile Surprise uses a safe fallback for partial renders and preserves event browsing during a D100 roll',()=>{
 const code=readFileSync(new URL('./surprise-minimal.mjs',import.meta.url),'utf8');
 assert.match(code,/if\(!header\|\|!title\|\|!hero\|\|!month\|\|!controls\|\|!special\|\|!mainButton\|\|!eventsGrid\)/);
 assert.match(code,/root\.classList\.remove\('has-surprise-minimal'\)/);
 assert.doesNotMatch(code,/eventsButton\.disabled=mainButton\.disabled/);
 assert.match(code,/if\(renderId!==activeRender\)return; \/\/ stale async event/);
 assert.match(code,/if\(!list\.open&&!info\.open&&opener\.isConnected\)/);
 assert.match(code,/else if\(infoOpen&&!view\.querySelector/);
 assert.match(code,/if\(!target\.open\)target\.showModal\(\)/);
 assert.match(code,/if\(other\.open\)other\.close\(\)/);
 assert.match(code,/if\(!list\.open&&!info\.open&&opener\.isConnected\)/);
});

test('Escape and native Android Back close native Surprise dialogs before navigating',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const keydown=app.slice(app.indexOf("document.addEventListener('keydown',event=>{"),
  app.indexOf('let diceView=null;'));
 assert.match(keydown,/!document\.querySelector\('\.lr-dialog-overlay,dialog\[open\]'\)/);
 assert.doesNotMatch(keydown,/!document\.querySelector\('dialog#evening-play-info\[open\]'\)/);
 const back=app.slice(app.indexOf('function backFromLoveRoll(){'),keydown.length+
  app.indexOf("document.addEventListener('keydown',event=>{"));
 assert.match(back,/const nativeModal=document\.querySelector\('dialog\[open\]'\)/);
 assert.match(back,/if\(nativeModal\)\{nativeModal\.close\(\);return true;\}/);
 assert.ok(back.indexOf('if(nativeModal)')<back.indexOf("if(state.tab==='settings'"),
  'native dialog must close before navigation');
});
