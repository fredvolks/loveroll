import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 WEEKLY_ODDS,PIP_POSITIONS,pipFace,nextMonday,nextMonthly,
 assignedTonight,coupleHomeStats,premiumHomeHtml,calculateMobileHomePhotoGeometry
} from './premium-home.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('./migrations/20261015_reset_all_current_dice_admin.sql',import.meta.url),'utf8');
const css=readFileSync(new URL('./premium-home.css',import.meta.url),'utf8');
const die=readFileSync(new URL('./dice3d.js',import.meta.url),'utf8');
test('Weekly faces 1-6 use true standard dice spot geometry and 100% total',()=>{
 assert.deepEqual(WEEKLY_ODDS,[50,25,12,8,4,1]);
 assert.equal(WEEKLY_ODDS.reduce((a,b)=>a+b,0),100);
 for(let n=1;n<=6;n++){
   assert.equal(PIP_POSITIONS[n].length,n);
   assert.equal((pipFace(n).match(/<circle /g)||[]).length,n);
   const home=premiumHomeHtml({weekly:{face:n}});
   const fallback=home.match(/<strong class="dice-fallback"[^>]*>([\s\S]*?)<\/strong>/)?.[1];
   assert.equal((fallback?.match(/<circle /g)||[]).length,n);
   assert.match(home,new RegExp('aria-label="Dé 3D, face '+n+'"'));
   assert.match(home,/data-dice-markers="pips"/);
   assert.doesNotMatch(home,/data-dice-preview="true"/);
 }
 assert.deepEqual(PIP_POSITIONS[1],[[50,50]]);
 assert.deepEqual(PIP_POSITIONS[2],[[29,29],[71,71]]);
 assert.deepEqual(PIP_POSITIONS[3],[[29,29],[50,50],[71,71]]);
 assert.deepEqual(PIP_POSITIONS[4],[[29,29],[71,29],[29,71],[71,71]]);
 assert.deepEqual(PIP_POSITIONS[5][2],[50,50]);
 assert.deepEqual(PIP_POSITIONS[6],[[29,22],[71,22],[29,50],[71,50],[29,78],[71,78]]);
 assert.throws(()=>pipFace(7));
});
test('Next weekly roll is Monday at Toronto midnight, including Sunday and DST',()=>{
 assert.equal(nextMonday(new Date('2026-10-14T18:00:00Z')),'2026-10-19');
 assert.equal(nextMonday(new Date('2026-10-18T14:00:00Z')),'2026-10-19');
 assert.equal(nextMonday(new Date('2026-10-19T11:00:00Z')),'2026-10-26');
 assert.equal(nextMonday(new Date('2026-03-08T22:00:00Z')),'2026-03-09');
});
test('Next first-of-month countdown updates, not hardcoded',()=>{
 assert.deepEqual(nextMonthly(new Date('2026-10-14T16:00:00Z')).date,'2026-11-01');
 assert.equal(nextMonthly(new Date('2026-10-14T16:00:00Z')).days,18);
 assert.equal(nextMonthly(new Date('2026-10-31T16:00:00Z')).days,1);
 assert.equal(nextMonthly(new Date('2026-11-01T16:00:00Z')).date,'2026-12-01');
});
test('Home uses server-authoritative assigned targets, not already drawn cards',()=>{
 const members=[{user_id:'a',name:'Fred'},{user_id:'b',name:'Camille'}];
 const assigned=assignedTonight({ready:true,targets:{a:4,b:6},
  remaining:{a:3,b:5},completed:{a:1,b:1}},members);
 assert.equal(assigned.total,10);assert.equal(assigned.forFirst,4);
 assert.equal(assigned.forSecond,6);assert.equal(assigned.remaining,8);
 assert.equal(assigned.completed,2);
 assert.equal(assignedTonight({ready:false},members).total,null);
});
test('Production home uses actual saved weekly result, disabled state and live cards',()=>{
 const args={weekly:{face:2,actor:'a'},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Camille'}],
 turn:{ready:true,targets:{a:4,b:6},remaining:{a:4,b:6},completed:{a:0,b:0}},now:new Date('2026-10-14T16:00:00Z')};
 const h=premiumHomeHtml(args);
 assert.match(h,/2 soirées de défi/);
 assert.match(h,/data-action="tab:session" aria-label="Aller à notre soirée, sans lancer de nouveau dé"/);
 assert.match(h,/data-dice-sides="6"/);
 assert.match(h,/data-face="2"/);
 assert.equal((h.match(/class="home-weight"/g)||[]).length,6);
 assert.equal((h.match(/class="home-stat-card /g)||[]).length,4);
 assert.match(h,/Fred/);assert.match(h,/Camille/);
 assert.match(h,/Surprise du mois à découvrir/);
 assert.match(h,/tab:special/);
 assert.doesNotMatch(h,/data-action="roll:weekly"/);
 const waiting=premiumHomeHtml({...args,weekly:null});
 assert.match(waiting,/<h2 class="ritual-page-title">Cette semaine, on joue \?<\/h2>/);
 assert.doesNotMatch(waiting,/Prêts pour votre prochain|home-title-last|Brassez votre dé hebdomadaire/);
 assert.match(waiting,/data-action="roll:weekly"/);
 assert.match(waiting,/data-dice-markers="pips"/);
 assert.match(waiting,/data-dice-preview="true"/);
 assert.match(waiting,/aria-label="Dé 3D, en attente du tirage"/);
 assert.match(waiting,/<strong class="dice-fallback"[^>]*>—<\/strong>/);
 assert.doesNotMatch(waiting,/aria-label="Dé 3D, face [1-6]"|[1-6] soirées? de défi/);
 assert.doesNotMatch(waiting,/<p>Info :|Prochain tirage/);
 const rolling=premiumHomeHtml({...args,weekly:args.weekly,rolling:true,rollFace:5});
 assert.match(rolling,/data-spinning="true"/);
 assert.match(rolling,/data-face="5"/);
 assert.match(rolling,/data-dice-markers="pips"/);
 assert.doesNotMatch(rolling,/data-dice-preview="true"/);
 assert.doesNotMatch(rolling,/2 soirées de défi/);
 assert.doesNotMatch(rolling,/data-action="tab:session" aria-label="Aller à notre soirée/);
 assert.match(rolling,/Brassage 3D en cours/);
 assert.match(rolling,/<strong class="dice-fallback" aria-hidden="true">—<\/strong>/);
});
test('True WebGL die retains 1/6, 2/5, 3/4 opposite sides and 3s fast roll + smooth slowdown',()=>{
 assert.match(die,/\[1,\[0,0,1\]\],\[6,\[0,0,-1\]\]/);
 assert.match(die,/\[2,\[0,1,0\]\]/);
 assert.match(die,/\[5,\[0,-1,0\]\]/);
 assert.match(die,/\[3,\[1,0,0\]\]/);
 assert.match(die,/\[4,\[-1,0,0\]\]/);
 assert.match(die,/duration=rolling&&!reduceMotion\?ROLL_TOTAL_MS:0/);
 assert.match(die,/new THREE\.WebGLRenderer/);
 assert.match(die,/built\.group\.quaternion\.copy\(target\)/);
 assert.match(app,/state\.weekly=result/);
 assert.match(app,/state\.diceStatus='rolling'/);
 assert.match(app,/setTimeout\(resolve,window\.matchMedia\?/);
});
test('Admin reset requires privileged server action and never touches custom challenges',()=>{
 assert.match(app,/isLoveAdmin\(\)&&hasPartner/);
 assert.match(app,/if\(verb==='admin-reset-all-dice'\)/);
 assert.match(app,/kind:'reset',title:'Réinitialiser tous les dés \?'/);
 assert.match(app,/rpc\('reset_love_all_dice_admin'/);
 assert.match(sql,/c\.owner_user_id=auth\.uid\(\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/update public\.couple_sessions/);
 assert.match(sql,/delete from public\.couple_rolls/);
 assert.match(sql,/love_all_dice_reset_audit/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
 assert.doesNotMatch(sql,/delete from auth\.users/);
 assert.match(css,/100dvh/);
 assert.match(css,/overflow:hidden/);
});

test('Monthly stats only use completed records, real categories, partner IDs and actual session history',()=>{
 const members=[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}];
 const sessions=[
  {id:'one',finished_at:'2026-10-07T19:00:00Z',counted:true},
  {id:'two',finished_at:'2026-10-14T19:00:00Z',counted:true},
  {id:'old',finished_at:'2026-09-24T18:00:00Z',counted:true}
 ];
 const challenges=[
  {session_id:'one',recipient:'a',status:'completed',category:'SENSUEL',created_at:'2026-10-06T18:00:00Z'},
  {session_id:'one',recipient:'b',status:'completed',category:'SEXUEL',created_at:'2026-10-06T18:00:00Z'},
  {session_id:'two',recipient:'a',status:'completed',category:'COQUIN',created_at:'2026-10-13T18:00:00Z'},
  {session_id:'two',recipient:'b',status:'proposed',category:'SENSUEL',created_at:'2026-10-13T18:00:00Z'},
  {session_id:'old',recipient:'a',status:'completed',category:'SENSUEL',created_at:'2026-09-23T18:00:00Z'}
 ];
 const stats=coupleHomeStats(challenges,sessions,members,new Date('2026-10-14T20:00:00Z'));
 assert.deepEqual(stats,{completed:3,byPartner:[2,1],sensualPercent:33,sexualPercent:67,streak:2});
 const html=premiumHomeHtml({history:challenges,sessions,members,now:new Date('2026-10-14T20:00:00Z')});
 assert.match(html,/class="home-stat-card completed"/);
 assert.match(html,/class="home-stat-card partners"/);
 assert.match(html,/class="home-stat-card categories"/);
 assert.match(html,/class="home-stat-card streak"/);
 assert.match(html,/33 \/ 67 %/);
 assert.match(html,/Fred \/ Émilie/);
 assert.doesNotMatch(html,/class="home-shortcut /);
});
test('Unpaired statistics are zero or no-data instead of invented sample figures',()=>{
 const noData=coupleHomeStats([],[],[{user_id:'x'},{user_id:'y'}]);
 assert.deepEqual(noData,{completed:0,byPartner:[0,0],sensualPercent:null,sexualPercent:null,streak:0});
});
test('D6 uses an actual bevel and no neon wireframe; fallback hidden during throws',()=>{
 assert.match(die,/RoundedBoxGeometry\(1\.8,1\.8,1\.8,9,\.18\)/);
 assert.doesNotMatch(die,/new THREE\.LineSegments/);
 assert.match(die,/function roundedPolyhedron\(/);
 assert.match(die,/if\(duration\)prepareMotion\(\)/);
 assert.match(css,/webgl-ready \.dice-fallback/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/home-stats-grid/);
});

test('Connected Home restores centered LoveRoll brand and preserves weekly status',()=>{
 assert.match(app,/root\.innerHTML=\(realHome\|\|realEvening\|\|realSurprise\|\|realEclat\|\|realSettings\|\|realEditor\|\|eveningArchive\|\|\(isCouple&&state\.tab==='advent'\)\?'':usualHeader\)\+body/);
 assert.doesNotMatch(app,/const homeHeader=|data-action="home-notices" aria-label="Notifications du couple"/);
 const html=premiumHomeHtml({
  weekly:{face:1,actor:'a'},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}]
 });
 assert.match(html,/♡ Aller à notre soirée/);
 assert.doesNotMatch(html,/♡ Dé déjà brassé cette semaine|Mon dé/);
 assert.match(html,/<button class="home-roll-button is-used[^"]*" type="button" data-action="tab:session"/);
 assert.equal((html.match(/home-gift-icon/g)||[]).length,1);
 assert.match(html,/ritual-brand/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/width:96%/);
 assert.match(css,/home-calendar-icon svg/);
 assert.match(html,/home-gift-icon[^>]*><svg viewBox="0 0 24 24"/);
 const afterDraw=premiumHomeHtml({members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],monthly:{monthly_activity:{face:7}}});
 assert.match(afterDraw,/data-action="tab:special"/);
 assert.match(afterDraw,/Déterminer qui invite/);
 assert.doesNotMatch(afterDraw,/Voir notre résultat/);
});

test('Partner statistics distinguish saved profiles with the same first name',()=>{
 const h=premiumHomeHtml({members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Fred Messely'}]});
 const partners=h.match(/class="home-stat-card partners"[\s\S]*?<\/div>/)?.[0];
 assert.match(partners,/<small>Fred \/ Fred Messely<\/small>/);
 assert.doesNotMatch(partners,/<small>Fred \/ Fred<\/small>/);
});

test('Mobile Home scene geometry never produces negative artwork heights when Safari viewport shrinks',()=>{
 const normal=calculateMobileHomePhotoGeometry(852,512);
 assert.equal(normal.split,512,'existing Android/iPhone portrait alignment is untouched');
 assert.equal(normal.topImageHeight,512/.438);
 assert.equal(normal.bottomImageHeight,(852-512)/.562);
 assert.equal(normal.contact,512*.342/.438);
 for(const [viewportHeight,rollTop] of [
  [320,800], // keyboard opened: roll button moved below visible viewport
  [568,-120], // vertical scrolling moved the roll above viewport
  [220,1000], // short landscape viewport
  [95,-20], // compact landscape
  [600,600]
 ]){
  const photo=calculateMobileHomePhotoGeometry(viewportHeight,rollTop);
  assert.ok(photo.split>0&&photo.split<viewportHeight);
  assert.ok(photo.topImageHeight>0&&Number.isFinite(photo.topImageHeight));
  assert.ok(photo.bottomImageHeight>0&&Number.isFinite(photo.bottomImageHeight));
  assert.ok(photo.contact>0&&Number.isFinite(photo.contact));
 }
 for(const bad of [[0,300],[-5,80],[Infinity,80],[700,NaN],[700,Infinity]]){
  assert.equal(calculateMobileHomePhotoGeometry(...bad),null);
 }
});

test('LR-ACCUEIL-001: Home uses an actionable shortcut and a non-private shared status',()=>{
 const members=[{user_id:'alice',name:'Alice'},{user_id:'bob',name:'Bob'}];
 const weekly={face:2,actor:'alice'};
 const unopened=premiumHomeHtml({weekly,activeEvening:false,members});
 assert.match(unopened,/Aucune soirée en cours/);
 assert.match(unopened,/data-action="tab:session"/);
 assert.doesNotMatch(unopened,/Déjà brassé cette semaine, revenez la semaine prochaine/);
 const preparing=premiumHomeHtml({weekly,activeEvening:true,members,turn:{ready:false}});
 assert.match(preparing,/Soirée commencée/);
 assert.match(preparing,/Préparez vos dés personnels/);
 assert.match(preparing,/class="home-evening-link" data-action="resume-evening"/);
 assert.doesNotMatch(preparing,/Restants : —|Défis attribués<br>ce soir/);
 const active=premiumHomeHtml({weekly,activeEvening:true,members,
  turn:{ready:true,targets:{alice:5,bob:2},remaining:{alice:4,bob:1},completed:{alice:1,bob:1}}});
 assert.match(active,/Soirée en cours/);
 assert.match(active,/Retrouvez vos défis dans Soirée/);
 assert.doesNotMatch(active,/Restants : 4|Restants : 1|Défis attribués<br>ce soir/);
 assert.match(active,/Semaines consécutives/);
 const pending=premiumHomeHtml({weekly:null,rolling:true});
 assert.match(pending,/data-action="roll:weekly" disabled/);
 assert.doesNotMatch(pending,/class="home-evening-link" data-action="resume-evening"/);
});

test('LR-ACCUEIL-001: monthly Surprise copy reflects whether an activity has been drawn',()=>{
 const newMonth=premiumHomeHtml({monthly:{},weekly:{face:1}});
 assert.match(newMonth,/Surprise du mois à découvrir/);
 const drawn=premiumHomeHtml({monthly:{monthly_activity:{face:7,activity_title:'Notre sortie'}}});
 assert.match(drawn,/Notre surprise du mois/);
 assert.doesNotMatch(drawn,/Surprise du mois à découvrir/);
 assert.match(drawn,/data-action="tab:special"/);
});

test('LR-ACCUEIL-001: official quota reports available weekly evenings, not daily eligibility',()=>{
 const weekly={face:3,key:'2026-10-26',created_at:'2026-10-26T12:00:00Z'};
 const summary={historyReady:true,limit:3,counted:1,dailyLocked:true,canStart:false};
 const html=premiumHomeHtml({weekly,weeklyProgress:summary});
 assert.match(html,/1 soirée partagée cette semaine · 2 disponibles cette semaine/);
 assert.match(html,/data-action="tab:session"/);
 assert.doesNotMatch(html,/2 disponibles aujourd’hui|2 disponibles aujourd'hui/);
 const spent=premiumHomeHtml({weekly,weeklyProgress:{...summary,counted:3}});
 assert.match(spent,/3 soirées partagées cette semaine · 0 disponibles cette semaine/);
 assert.match(spent,/data-action="evening-calendar"/);
 assert.match(spent,/Voir nos soirées/);
 assert.match(spent,/Notre semaine est complète/);
 assert.doesNotMatch(spent,/data-action="roll:weekly"|data-action="new-session"/);
 const missing=premiumHomeHtml({weekly,weeklyProgress:{...summary,historyReady:false}});
 assert.doesNotMatch(missing,/class="home-weekly-progress"/,
  'Unknown history must never be displayed as zero completed evenings');
 const invalid=premiumHomeHtml({weekly,weeklyProgress:{...summary,limit:2}});
 assert.doesNotMatch(invalid,/class="home-weekly-progress"/,
  'Unexpected quota input does not override the official D6 face');
});

test('LR-ACCUEIL-001: daily lock does not claim that all weekly evenings are spent',()=>{
 const weekly={face:3,key:'2026-10-26'};
 const progress={historyReady:true,limit:3,counted:1,dailyLocked:true,canStart:false};
 const today=premiumHomeHtml({weekly,weeklyProgress:progress});
 assert.match(today,/Soirée déjà partagée aujourd’hui/);
 assert.match(today,/Une seule soirée par jour/);
 assert.match(today,/2 disponibles cette semaine/);
 assert.match(today,/data-action="tab:session"/);
 assert.doesNotMatch(today,/data-action="evening-calendar"/);
 const quota=premiumHomeHtml({weekly,weeklyProgress:{...progress,counted:3}});
 assert.match(quota,/Notre semaine est complète/);
 assert.match(quota,/data-action="evening-calendar"/);
 assert.match(app,/if\(verb==='evening-calendar'\)/,
  'The quota shortcut must lead to an implemented read-only history route');
 const active=premiumHomeHtml({weekly,activeEvening:true,weeklyProgress:{...progress,counted:3},
  turn:{ready:true,targets:{},remaining:{},completed:{}}});
 assert.match(active,/data-action="resume-evening"/);
 assert.doesNotMatch(active,/Notre semaine est complète|data-action="evening-calendar"/);
});
test('LR-ACCUEIL-001: loading history never presents an invented quota or closed week',()=>{
 const weekly={face:2,key:'2026-10-26'};
 const html=premiumHomeHtml({weekly,weeklyProgress:{historyReady:false,counted:0,limit:2}});
 assert.match(html,/Synchronisation des soirées/);
 assert.doesNotMatch(html,/0 soirée partagée|Notre semaine est complète/);
 assert.match(html,/data-action="tab:session"/);
 assert.doesNotMatch(html,/data-action="evening-calendar"/);
});

test('LR-ACCUEIL-001: the monthly recap links to current-month history without mutating play',()=>{
 const html=premiumHomeHtml({weekly:{face:2},sessions:[],history:[]});
 assert.match(html,/<h3 id="home-statistics-title"><button type="button" class="home-monthly-link" data-action="evening-calendar:month"/);
 assert.match(html,/aria-label="Voir le détail de nos statistiques du mois dans le calendrier"/);
 assert.equal((html.match(/data-action="evening-calendar:month"/g)||[]).length,1);
 assert.match(html,/Semaines consécutives/);
 assert.doesNotMatch(html,/data-action="new-session"|data-action="roll:challenge"/);
 assert.match(css,/\.home-monthly-link:focus-visible/);
 assert.match(app,/if\(parts\[0\]==='month'\)/);
});
