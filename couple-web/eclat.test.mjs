
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
test('Unsubscribed couples see the offer before the 12 private coffrets',()=>{
 const html=eclatHtml({status:{access:false,total_cents:999,base_cents:699}});
 assert.match(html,/12 expériences pour se retrouver/);
 assert.match(html,/9,99/);
 assert.doesNotMatch(html,/class="eclat-tile"/);
 assert.doesNotMatch(html,/data-action="eclat:detail:/);
 assert.doesNotMatch(html,/data-action="eclat:start:/);
 assert.match(html,/Aucune somme ne sera débitée/);
 const member=eclatHtml({status:{access:false},details:true,selected:4});
 assert.doesNotMatch(member,/Les portes de minuit/);
});
test('Both partners have private, distinct roles and choices are not leaked',()=>{
 const active={access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,
  chapter_number:1,variant_number:0,chapter_total:6,session_id:'session',my_choice:null,
  both_chosen:false,my_ready:false};
 const first=eclatHtml({status:active,userId:'a',members:people});
 const second=eclatHtml({status:active,userId:'b',members:people});
 assert.doesNotMatch(first,/eclat:choose:1/);
 assert.match(first,/Choisir un souvenir/);
 const choices=eclatHtml({status:active,userId:'a',members:people,noteState:{moment_done:true}});
 assert.match(choices,/eclat:choose:1/);
 assert.match(first,/eclat:choose:0/);
 assert.match(first,/POUR TOI SEULEMENT/);
 assert.notEqual(first,second);
 assert.doesNotMatch(first,/VOTRE SUITE COMMUNE/);
 const waiting=eclatHtml({status:{...active,my_choice:2},userId:'a',members:people});
 assert.match(waiting,/On attend ton partenaire/);
 assert.doesNotMatch(waiting,/eclat:choose:1/);
 const revealed=eclatHtml({status:{...active,my_choice:2,both_chosen:true,outcome:2},userId:'a',members:people});
 assert.match(revealed,/VOTRE SUITE COMMUNE/);
 assert.match(revealed,/eclat:next/);
});
test('Monthly Surprise keeps one entry before and after drawing',()=>{
 const normal=premiumHomeHtml({members:people,monthly:{}});
 const played=premiumHomeHtml({members:people,monthly:{monthly_activity:{face:17}}});
 assert.match(normal,/data-action="tab:special"/);
 assert.match(normal,/Brasser notre surprise/);
 assert.match(played,/data-action="tab:special"/);
 assert.match(played,/Déterminer qui invite/);
 const primary=played.match(/<button class="home-next-month[^"]*"[\s\S]*?<\/button>/)?.[0];
 assert.ok(primary);assert.match(primary,/data-action="tab:special"/);
 assert.doesNotMatch(played,/home-monthly-recap|Ouvrir nos coffrets/);
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

test('Selected Soirée / Éclat Premium tabs are outside the unobstructed 3D image',()=>{
 const src=read('./premium-evening.mjs');
 assert.match(src,/eveningEclatSwitcher\('session'\)/);
 assert.doesNotMatch(src,/eclat-evening-entry|evening-eclat-shortcut/);
 const picker=read('./evening-eclat-switcher.mjs');
 assert.match(picker,/data-action="tab:session"/);
 assert.match(picker,/data-action="tab:eclat"/);
 assert.match(picker,/Notre soirée/);
 assert.match(picker,/PREMIUM/);
 const eclat=read('./eclat-ui.mjs');
 assert.match(eclat,/ritualHeadingHtml/);
 assert.match(eclat,/eveningEclatSwitcher\('eclat'\)/);
 const style=read('./evening-eclat-switcher.css');
 assert.match(style,/ritual-title-height/);
 assert.match(style,/evening-intro>/);
});
test('Music control is only shown inside an active coffret',()=>{
 const inactive={access:true,active:false};
 assert.doesNotMatch(eclatHtml({status:inactive}),/data-action="eclat:music"/);
 assert.doesNotMatch(eclatHtml({status:inactive,details:true,selected:2}),/data-action="eclat:music"/);
 const active={access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,chapter_number:1,variant_number:0,
 chapter_total:6,session_id:'t',my_choice:null,both_chosen:false,my_ready:false};
 assert.match(eclatHtml({status:active,members:people,userId:'a'}),/data-action="eclat:music"/);
 assert.match(eclatHtml({status:active,members:people,userId:'a',music:true}),/Couper le son/);
 const app=read('./app.js');
 assert.ok(app.includes("if(!state.eclat?.active){eclatAudio.stop();state.eclatMusic=false;return;}"));
 assert.ok(app.includes("state.eclatDetails=false;eclatAudio.stop();state.eclatMusic=false;"));
});

test('Photographic Éclat shows exactly 12 clickable matching coffret pictures',()=>{
 const gallery=eclatHtml({status:{access:true}});
 assert.equal((gallery.match(/class="eclat-tile"/g)||[]).length,12);
 assert.equal((gallery.match(/class="eclat-tile-photo"/g)||[]).length,12);
 assert.match(gallery,/--photo-y:0\.00000%/);
 assert.match(gallery,/--photo-y:100\.00000%/);
 // The discovery recommendation opens a detail too, but is not a thirteenth coffret.
 // Match semantic list items without freezing unrelated attribute order.
 assert.equal((gallery.match(/<button\b[^>]*\bclass="eclat-tile"[^>]*\bdata-action="eclat:detail:\d+"[^>]*\baria-label="Ouvrir le coffret \d{2} :/g)||[]).length,12);
 assert.match(gallery,/data-action="eclat:intent:all"[^>]*aria-pressed="true"/,'Default filter is conveyed to screen readers');
 assert.equal((gallery.match(/data-action="eclat:intent:[^"]+"[^>]*aria-pressed="true"/g)||[]).length,1,'Exactly one filter is selected');
 const detail=eclatHtml({status:{access:true},details:true,selected:12,minutes:90});
 assert.match(detail,/data-action="eclat:minutes:90"[^>]*aria-pressed="true"/,'Chosen duration is accessible');
 assert.equal((detail.match(/data-action="eclat:minutes:\d+"[^>]*aria-pressed="true"/g)||[]).length,1,'Exactly one duration is selected');
 assert.doesNotMatch(gallery,/<div class="eclat-intro">/);
 const style=read('./eclat-photo-gallery-v179.css');
 assert.match(style,/eclat-photo-strip\.webp/);
 assert.match(style,/repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(style,/ritual-heading-height/);
 assert.match(read('./loveroll-nav-home-v181.css'),/\.nav-inner>button/);
});

test('Account preview helper never grants Eclat or admin server permissions',async()=>{
 const {previewMode,previewCanEdit,previewEclatStatus}=await import('./account-preview-mode.mjs');
 assert.equal(previewMode('admin',false),'real');
 assert.equal(previewMode('admin',true),'admin');
 assert.equal(previewCanEdit(false,'admin',true),false);
 assert.equal(previewCanEdit(true,'member',true),false);
 assert.equal(previewCanEdit(true,'admin',true),true);
 assert.equal(previewEclatStatus({access:true,active:false},'member',true).access,false);
 assert.equal(previewEclatStatus({access:false},'eclat',true).access,false);
 const app=read('./app.js');
 assert.match(app,/rpc\('love_test_mode_allowed'\)/);
 assert.match(app,/previewEclatStatus\(state\.eclat/);
 assert.match(app,/account-test:/);
});

test('Éclat approved intents and history suggestion work without sharing private choices',()=>{
 const status={access:true,active:false},html=eclatHtml({status});
 for(const k of ['together','reconnect','closer','all'])assert.match(html,new RegExp('data-action="eclat:intent:'+k+'"'));
 assert.equal((html.match(/class="eclat-tile"/g)||[]).length,12);
 assert.match(html,/Voir notre suggestion : Les cinq secrets/);
 const get=(intent,n)=>{const v=eclatHtml({status,intent});assert.equal((v.match(/class="eclat-tile"/g)||[]).length,n);return v;};
 assert.match(get('together',7),/Ouvrir le coffret 02/);
 assert.doesNotMatch(get('together',7),/Ouvrir le coffret 03/);
 assert.match(get('reconnect',3),/Ouvrir le coffret 08/);
 assert.match(get('closer',3),/Ouvrir le coffret 11/);
 assert.match(eclatHtml({status,history:[{coffret_id:1,started_at:'2026-10-20T12:00:00Z'}]}),/Voir notre suggestion : Le double jeu/);
 const allStarted=Array.from({length:12},(_,i)=>({coffret_id:i+1,started_at:new Date(Date.UTC(2026,9,1+i)).toISOString()}));
 assert.match(eclatHtml({status,history:allStarted}),/À retrouver/);
 assert.match(eclatHtml({status,history:allStarted}),/Voir notre suggestion : Les cinq secrets/);
 assert.doesNotMatch(eclatHtml({status,historyError:true}),/eclat-recommendation/);
});

test('Éclat guided progress is announced and secondary controls stay touch accessible',()=>{
 const active={access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,chapter_number:1,chapter_total:6,variant_number:0,session_id:'progress-test',my_choice:null,both_chosen:false};
 const html=eclatHtml({status:active,userId:'a',members:people});
 assert.match(html,/role="progressbar" aria-label="Progression du coffret" aria-valuemin="0" aria-valuemax="6" aria-valuenow="1" aria-valuetext="Étape 1 sur 6"/);
 assert.match(html,/data-action="eclat:choose:0"/);
 const css=read('./eclat-guided.css');
 assert.match(css,/button\.eclat-skip,button\.eclat-link,button\.eclat-note-save,summary/);
 assert.match(css,/min-height:44px!important/);
});

test('Éclat regroupe clairement les trois choix privés pour lecteurs d’écran',()=>{
 const status={access:true,active:true,coffret_id:1,minutes:90,chapter_index:3,
  chapter_number:3,chapter_total:8,variant_number:0,session_id:'a11y-choice',
  my_choice:null,both_chosen:false,my_ready:false};
 const prepare=eclatHtml({status,userId:'a',members:people});
 const choose=eclatHtml({status,userId:'a',members:people,noteState:{moment_done:true}});
 const waiting=eclatHtml({status:{...status,my_choice:1},userId:'a',members:people});
 const revealed=eclatHtml({status:{...status,my_choice:1,both_chosen:true,outcome:2},userId:'a',members:people});
 assert.match(choose,/class="eclat-choices" role="group" aria-label="Choix privé pour cette étape"/);
 assert.equal((choose.match(/class="eclat-choice"/g)||[]).length,3);
 assert.match(choose,/aria-valuemax="8" aria-valuenow="3" aria-valuetext="Étape 3 sur 8"/);
 assert.doesNotMatch(prepare,/class="eclat-choices"/);
 assert.doesNotMatch(waiting,/class="eclat-choices"/);
 assert.doesNotMatch(revealed,/class="eclat-choices"/);
 assert.match(waiting,/On attend ton partenaire/);
 assert.match(revealed,/VOTRE SUITE COMMUNE/);
});
