
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECLAT_COFFRETS,eclatStage,validateEclatCatalogue} from './eclat-catalog.mjs';
import {eclatHtml} from './eclat-ui.mjs';
import {premiumHomeHtml} from './premium-home.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const people=[{user_id:'a',name:'Alex'},{user_id:'b',name:'Charlie'}];
test('Twelve complete original coffrets with 384 distinct passages and 36 finales',()=>{
 assert.deepEqual(validateEclatCatalogue(),{coffrets:12,chapters:96,variants:384,finales:36});
 for(let i=1;i<=12;i++){
  for(let chapter=1;chapter<=8;chapter++){
   for(let v=0;v<4;v++){
    const s=eclatStage(i,chapter,v);
    assert.ok(s.story.length>35);
    assert.equal(s.roles.length,2);
    assert.equal(s.coffret.id,i);
   }
  }
 }
});
test('All 12 are browsable but payment remains disabled for base couples',()=>{
 const html=eclatHtml({status:{access:false,total_cents:999,base_cents:699}});
 assert.equal((html.match(/class="eclat-tile"/g)||[]).length,12);
 assert.match(html,/9,99/);
 assert.doesNotMatch(html,/data-action="eclat:start:/);
 const detail=eclatHtml({status:{access:false,total_cents:999},details:true,selected:4,minutes:60});
 assert.match(detail,/Activation prochainement/);
 assert.match(detail,/Les portes de minuit/);
 assert.doesNotMatch(detail,/data-action="eclat:start:4"/);
});
test('Both partners have private, distinct roles and choices are not leaked',()=>{
 const active={access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,
  chapter_number:1,variant_number:0,chapter_total:6,session_id:'session',my_choice:null,
  both_chosen:false,my_ready:false};
 const first=eclatHtml({status:active,userId:'a',members:people});
 const second=eclatHtml({status:active,userId:'b',members:people});
 assert.match(first,/eclat:choose:1/);
 assert.match(first,/eclat:choose:0/);
 assert.match(first,/TON RÔLE SECRET/);
 assert.notEqual(first,second);
 assert.doesNotMatch(first,/VOTRE RÉVÉLATION COMMUNE/);
 const waiting=eclatHtml({status:{...active,my_choice:2},userId:'a',members:people});
 assert.match(waiting,/On attend ton partenaire/);
 assert.doesNotMatch(waiting,/eclat:choose:1/);
 const revealed=eclatHtml({status:{...active,my_choice:2,both_chosen:true,outcome:2},userId:'a',members:people});
 assert.match(revealed,/VOTRE RÉVÉLATION COMMUNE/);
 assert.match(revealed,/eclat:next/);
});
test('Monthly Surprise remains unchanged before drawing and Eclat appears after result',()=>{
 const normal=premiumHomeHtml({members:people,monthly:{}});
 const played=premiumHomeHtml({members:people,monthly:{monthly_activity:{face:17}}});
 assert.match(normal,/data-action="tab:special"/);
 assert.match(normal,/Brasser notre surprise/);
 assert.match(played,/data-action="tab:eclat"/);
 assert.match(played,/Ouvrir nos coffrets/);
 assert.doesNotMatch(played,/data-action="tab:special"/);
});
test('Eclat is separate from old official dice and protected by Supabase',()=>{
 const app=read('./app.js');
 const styles=read('./eclat.css');
 const sw=read('./service-worker.js');
 assert.match(app,/rpc\('love_eclat_start'/);
 assert.match(app,/rpc\('love_eclat_choose'/);
 assert.match(app,/rpc\('love_eclat_next'/);
 assert.match(app,/rpc\('love_eclat_end'/);
 assert.match(styles,/\.home-next-month>span:nth-child\(2\)/);
 assert.match(styles,/\.home-gift-icon svg/);
 for(const file of ['eclat-scenes-a.mjs','eclat-scenes-b.mjs','eclat-ui.mjs','eclat-catalog.mjs','eclat-audio.mjs','eclat.css'])
  assert.ok(sw.includes("'./"+file+"'"),file+' offline');
 assert.ok(!app.includes('localStorage.clear()'));
});
