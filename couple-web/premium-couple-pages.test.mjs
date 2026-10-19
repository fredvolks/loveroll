import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml,premiumPolyDie} from './premium-evening.mjs';
import {premiumSurpriseHtml,sixSpecialEvents} from './premium-surprise.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const app=read('app.js'),css=read('premium-couple-pages.css'),die=read('dice3d.js'),sql=read('migrations/20261014_enable_existing_6x6_special_events.sql');
const people=[{user_id:'first',name:'Camille'}, {user_id:'second',name:'Noémie'}];
const session={id:'s',paired_turns:true,self_draws:true,starting_user_id:'first'};
const turns={ready:true,first:'first',targets:{first:2,second:1},completed:{first:1,second:0},remaining:{first:1,second:1},next:'first',finished:false,pending:null};
test('Evening keeps original WebGL dice for partner result, own roll, summary and D100',()=>{
 const html=premiumEveningHtml({session,members:people,me:'first',
   rolls:[{user_id:'first',face:2},{user_id:'second',face:1}],
   status:{both_ready:true,my_rolled:true,partner_rolled:true},turn:turns,category:'SENSUEL'});
 assert.match(html,/Camille/);
 assert.match(html,/Noémie/);
 assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,4);
 assert.match(html,/evening-partner-die/);
 assert.equal((html.match(/data-dice-sides="100"/g)||[]).length,1);
 assert.match(html,/data-action="category:SENSUEL"/);
 assert.match(html,/data-action="category:SEXUEL"/);
 assert.match(html,/data-action="new-challenge"/);
 assert.match(html,/data-action="give-challenge"/);
 assert.match(html,/0 \/ 1/);
 assert.match(html,/1 \/ 2/);
 assert.match(html,/88 %/);
 assert.match(html,/class="evening-choice-odds">88 % de chances/);
 assert.doesNotMatch(html,/12 % autre|Défi cadeau : 100 %/);
 assert.doesNotMatch(html,/Fred|Émilie|Player 1/);
});
test('First D6 is immediately FINAL, its unrolled partner stays blank, and Step 2 remains locked',()=>{
 const first=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:4}],status:{both_ready:false,my_rolled:true,partner_rolled:false},
  turn:{ready:false}});
 assert.match(first,/data-dice-sides="6" data-face="4"/);
 assert.match(first,/aria-label="Total actuel 4 défis; dé initial 4"><strong>4<\/strong>/);
 assert.match(first,/Étape 2 verrouillée/);
 assert.match(first,/data-action="new-challenge"[^>]*disabled/);
 assert.doesNotMatch(first,/Dé initial : 4/);
 assert.equal((first.match(/data-dice-sides="6"/g)||[]).length,1,'Only own D6 is rendered');
 assert.match(first,/evening-partner-card is-pending/);
 assert.doesNotMatch(first,/data-dice-unrolled="true"/);
 // The partner's official face uses the existing shared 3D D6 renderer once confirmed.
 assert.match(css,/\.love3d-stage\.is-unrolled \.dice-canvas\{[\s\S]*?visibility:visible!important/);
 assert.doesNotMatch(app,/canvas\.dataset\.diceUnrolled!=='true'/);
 assert.match(die,/const neutral=canvas\.dataset\.diceUnrolled==='true'&&sides===6/);
 assert.match(read('dice-engraving.mjs'),/if\(neutral\)return \[heartShape/);
 // A missing partner roll must remain neutral, not look like a real result.
 const secondView=premiumEveningHtml({session,members:people,me:'second',
  rolls:[],status:{both_ready:false,my_rolled:false,partner_rolled:true},
  turn:{ready:false}});
 assert.doesNotMatch(secondView,/aria-label="Total actuel 4 défis/);
 assert.match(secondView,/data-action="my-d6"/);
 const both=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:4},{user_id:'second',face:2}],
  status:{both_ready:true,my_rolled:true,partner_rolled:true},
  turn:{...turns,targets:{first:4,second:2}}});
 assert.match(both,/data-dice-sides="6" data-face="4"/);
 assert.match(both,/aria-label="Total actuel 4 défis; dé initial 4"><strong>4<\/strong>/);
 assert.match(both,/evening-partner-die/);
 assert.match(both,/Étape 2 débloquée/);
 const spinning=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:4}],status:{both_ready:false,my_rolled:true,partner_rolled:false},
  rolling:true,rollingKind:'my-d6',rollFace:4,turn:{ready:false}});
 assert.match(spinning,/data-dice-sides="6" data-face="4"[^>]*data-spinning="true"/);
 assert.doesNotMatch(spinning,/aria-label="Total actuel 4 défis/);
 const migration=read('migrations/20261014_d6_immediate_official_result.sql');
 assert.match(migration,/RETURN r;/);
 assert.doesNotMatch(migration,/r\.face\s*:=\s*null/i);
 assert.match(migration,/couple_private\.is_member/);
 assert.match(migration,/user_id=auth\.uid\(\)/);
 assert.match(migration,/couple_private\.both_rolls_ready\(session_id\)/);
 assert.match(migration,/love_require_verified_identity/);
 assert.doesNotMatch(app,/Number\(result\?\.face\)\|\|1/);
 assert.match(app,/Le serveur n’a pas confirmé le résultat officiel/);
});
test('Giving challenges updates both Step 1 totals while the dice show original faces',()=>{
 // Original dice: Camille 5, Noémie 2; two gifts transfer from Camille to Noémie.
 const gifted={...turns,targets:{first:3,second:4},remaining:{first:3,second:4}};
 const html=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:5},{user_id:'second',face:2}],
  status:{both_ready:true,my_rolled:true,partner_rolled:true},turn:gifted,category:'SENSUEL'});
 assert.match(html,/data-dice-sides="6" data-face="5"/);
 assert.match(html,/evening-partner-die/);
 assert.match(html,/aria-label="Total actuel 3 défis; dé initial 5"><strong>3<\/strong>/);
 assert.match(html,/class="evening-partner-card is-confirmed"/);
 assert.match(html,/4 défis ce soir|2 défis ce soir|evening-summary-person/);
 assert.match(html,/Dé initial : 5/);
 assert.doesNotMatch(html,/Dé initial : 2/);
 assert.match(html,/<b>1 \/ 3<\/b>/);
 assert.match(html,/<b>0 \/ 4<\/b>/);
 assert.match(css,/\.evening-original-d6\{/);
 // Without gifts, the cards still match the rolls, no redundant label.
 const normal=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:5},{user_id:'second',face:2}],
  status:{both_ready:true},turn:{...gifted,targets:{first:5,second:2}}});
 assert.doesNotMatch(normal,/Dé initial :/);
 assert.match(normal,/aria-label="Total actuel 5 défis; dé initial 5"><strong>5<\/strong>/);
 // Before the second D6, the first official face remains visible but no
 // gift-adjusted totals or step-2 progress are available.
 const waiting=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:5}],status:{both_ready:false},
  turn:{...gifted,ready:false}});
 assert.match(waiting,/Total actuel 5 défis/);
 assert.doesNotMatch(waiting,/Total actuel 3 défis/);
 assert.doesNotMatch(waiting,/Dé initial :/);
});
test('D100 always visible and rolling face not displayed as text before settling',()=>{
 const html=premiumEveningHtml({session,members:people,me:'first',turn:{...turns,pending:{face:21}},rollFace:11,
  rollingKind:'new-challenge',rolling:true,category:'SENSUEL'});
 assert.match(html,/data-dice-sides="100" data-face="11" data-dice-zoom="1.07" data-dice-markers="numbers" data-spinning="true"/);
 assert.match(html,/class="dice-fallback" aria-hidden="true">♡<\/strong>/);
 assert.match(css,/\.love3d-stage\.is-rolling \.dice-fallback/);
 assert.match(die, /canvas\.dataset\.diceMarkers==='pips'/);
 assert.match(die,/canvas\.dataset\.diceZoom/);
 assert.match(app,/await new Promise\(resolve=>setTimeout\(resolve,window\.matchMedia\?/);
});
test('D100 keeps its official face and shows the same number below it',()=>{
 const live=premiumEveningHtml({session,members:people,me:'first',
  turn:{...turns,pending:{face:21}},status:{both_ready:true},category:'SENSUEL'});
 assert.match(live,/data-dice-sides="100" data-face="21"/);
 assert.match(live,/evening-d100-result/);
 assert.match(live,/>Résultat : 21<\/div>/);
 const last=premiumEveningHtml({session,members:people,me:'first',
  turn:turns,status:{both_ready:true},lastD35Face:17});
 assert.match(last,/data-dice-sides="100" data-face="17"/);
 assert.match(last,/evening-d100-result/);
 const spinning=premiumEveningHtml({session,members:people,me:'first',
  turn:{...turns,pending:{face:21}},status:{both_ready:true},
  rolling:true,rollingKind:'new-challenge',rollFace:11});
 assert.match(spinning,/data-dice-sides="100" data-face="11"[^>]*data-spinning="true"/);
 assert.match(spinning,/evening-d100-result/);
});
test('Gift transfer disabled when monthly 3/3 or zero own remaining',()=>{
 const html=premiumEveningHtml({session,members:people,me:'first',turn:turns,
   status:{both_ready:true},giftCount:3});
 assert.match(html,/data-action="give-challenge" disabled/);
 assert.match(html,/3\/3 dons ce mois/);
 assert.match(app,/rpc\('give_love_challenge'/);
});
test('Before D100 roll, Surprise has no separate host bubble and exactly six editable default events',()=>{
 const html=premiumSurpriseHtml({members:people,settings:{anniversary_md:'08-20',
   birthday_by_user:{first:'01-10',second:'11-25'}},now:new Date('2026-10-14T17:00:00Z')});
 assert.match(html,/class="surprise-header surprise-new-header"/);
 assert.match(html,/Une surprise à partager/);
 assert.doesNotMatch(html,/surprise-top-icons|surprise-header-symbol|surprise-host-grid/);
 assert.equal((html.match(/class="surprise-event-card /g)||[]).length,6);
 assert.equal((html.match(/data-action="edit-surprise-event:/g)||[]).length,6);
 assert.equal((html.match(/data-dice-sides="100"/g)||[]).length,1);
 assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,0,
  'The D6 appears only after the monthly activity is chosen');
 assert.match(html,/data-action="roll:monthly_activity">Brasser le dé<\/button>/);
 assert.doesNotMatch(html,/roll:monthly_host|surprise-invite-inside/);
 assert.doesNotMatch(html,/Quelle sera notre prochaine activité|20 activités · 1 tirage commun|Un moment pour nous|Appuie pour modifier/);
 assert.match(html,/Fête des Mères/);
 assert.match(html,/Fête des Pères/);
 assert.match(html,/Anniversaire couple/);
 assert.match(html,/data-action="edit-surprise-event:birthday:first"/);
 assert.match(html,/data-action="edit-surprise-event:birthday:second"/);
});
test('After D100 roll, D6 replaces the full-size D100 then restores it after the host choice',()=>{
 const html=premiumSurpriseHtml({members:people,monthly:{monthly_activity:{face:13}},
  activity:{title:'Une escapade',description:'Une sortie pour deux'}});
 assert.doesNotMatch(html,/data-action="surprise-activity"/);
 assert.doesNotMatch(html,/data-action="roll:monthly_activity"/);
 assert.match(html,/class="surprise-month has-activity host-pending"/);
 assert.match(html,/data-action="roll:monthly_host">Brasser le dé<\/button>/);
 assert.match(html,/class="surprise-host-legend"/);
 assert.match(html,/data-dice-preview="true"/);
 assert.match(html,/data-dice-markers="pips"/);
 assert.doesNotMatch(html,/data-dice-unrolled="true"/);
 assert.doesNotMatch(html,/2 · 4 · 6/);
 assert.doesNotMatch(html,/1 · 3 · 5/);
 assert.match(html,/Camille/);assert.match(html,/Noémie/);
 assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,1);
 assert.equal((html.match(/data-dice-sides="100"/g)||[]).length,0);
 assert.doesNotMatch(html,/class="surprise-invite-inside"|class="surprise-host"/);
 const assigned=premiumSurpriseHtml({members:people,monthly:{
  monthly_activity:{face:13},monthly_host:{face:5}}});
 assert.match(assigned,/Noémie invite cette fois-ci/);
 assert.match(assigned,/class="surprise-month has-activity host-complete"/);
 assert.match(assigned,/data-action="surprise-activity"/);
 assert.doesNotMatch(assigned,/data-action="roll:monthly_host"/);
 assert.equal((assigned.match(/data-dice-sides="100"/g)||[]).length,1);
 assert.equal((assigned.match(/data-dice-sides="6"/g)||[]).length,0);
});
test('The six event cards open an editor for shared name/date without rewriting old rolls',()=>{
 const settings={anniversary_md:'08-20',surprise_event_overrides:{
  anniversary:{title:'Notre journée spéciale',month_day:'12-07'}
 }};
 const html=premiumSurpriseHtml({members:people,settings,editSlot:'anniversary',
  now:new Date('2026-10-14T17:00:00Z')});
 assert.match(html,/Notre journée spéciale/);
 assert.match(html,/data-action="save-surprise-event"/);
 assert.match(html,/id="surprise-event-name"/);
 assert.match(html,/id="surprise-event-date" type="text" inputmode="numeric"/);
 assert.match(html,/placeholder="JJ\/MM\/AAAA"/);
 assert.match(html,/value="07\/12\/2026"/);
 assert.match(html,/data-action="close-surprise-event"/);
 assert.match(html,/data-action="open-occasion:anniversary:-"/);
 assert.equal((html.match(/data-action="save-surprise-event"/g)||[]).length,1);
 assert.match(app,/rpc\('save_love_surprise_event'/);
 assert.match(app,/surpriseEditSlot/);
 assert.match(app,/parseSurpriseDateInput/);
});
test('Special event Canadian date rollovers and missing anniversary remain correct',()=>{
 const settings={anniversary_md:'01-04',birthday_by_user:{first:'02-29',second:'12-25'}};
 const all=sixSpecialEvents(new Date('2026-10-14T13:00:00Z'),settings,people);
 assert.equal(all.length,6);
 assert.equal(all[0].date,'2027-01-04');
 assert.equal(all[1].date,'2027-02-28');
 assert.equal(all[2].date,'2026-12-25');
 assert.equal(all[3].date,'2027-02-14');
 assert.equal(all[4].date,'2027-05-09');
 assert.equal(all[5].date,'2027-06-20');
 assert.equal(sixSpecialEvents(new Date('2026-10-14T13:00:00Z'),{},people)[0].daysLeft,null);
});
test('Existing server rolls and cards untouched; migration makes configured 6x6 available in 2026',()=>{
 assert.match(sql,/if event_code is not null then/);
 assert.doesNotMatch(sql,/eventyear>=2027/);
 assert.match(sql,/select \* into rowout from public\.couple_occasion_rolls/);
 assert.match(sql,/if prior\.couple_id is null then raise exception/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
 assert.match(app,/rpc\('roll_love_occasion_once'/);
 assert.match(app,/rpc\('roll_my_evening_d6'/);
 assert.match(app,/rpc\('draw_for_partner'/);
 assert.match(app,/sharedEveningTurns\(/);
});
test('D20 and D100 are true glossy rounded polyhedra without pink wireframe',()=>{
 assert.match(die,/roundedPolyhedron\(polygons/);
 assert.match(die,/bevel:sides===20\?\.13:\.095/);
 assert.match(die,/shrink:sides===20\?\.095:\.07/);
 assert.match(die,/const n0=arc\(na,nb,j\/steps\)/);
 assert.match(die,/tri\(apex,base\.clone\(\)\.addScaledVector\(n0,bevel\)/);
 assert.match(die,/normal:outward\.clone\(\),value:i\+1/);
 assert.match(die,/flatShading:false/);
 assert.match(die,/clearcoat:1,clearcoatRoughness:/);
 assert.doesNotMatch(die,/new THREE\.LineSegments|new THREE\.LineBasicMaterial|new THREE\.EdgesGeometry/);
 assert.match(die,/new THREE\.IcosahedronGeometry\(1\.16,0\)/);
 assert.ok(die.includes('function manySidedGeometry(count=35)'));
 assert.match(die,/faceMarks\(sides,value,pips,neutral\)/);
});
test('Mobile full-height layout with safe area and fixed existing tabs',()=>{
 assert.match(css,/100dvh/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/loveroll-evening-page/);
 assert.match(css,/loveroll-surprise-page/);
 assert.match(css,/surprise-special-grid/);
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(app,/if\(verb==='occasion-back'\)/);
});

test('Selected category is visually distinct and reported to assistive technology',()=>{
 const html=premiumEveningHtml({session,members:people,me:'first',
  rolls:[{user_id:'first',face:4},{user_id:'second',face:6}],
  status:{both_ready:true,my_rolled:true},turn:{...turns,targets:{first:4,second:6}},category:'SENSUEL'});
 assert.match(html,/data-action="category:SENSUEL" aria-pressed="true"/);
 assert.match(html,/data-action="category:SEXUEL" aria-pressed="false"/);
 assert.match(html,/✓ Sensuel/);
 assert.match(css,/\.evening-choice-btn\.selected/);
 assert.match(css,/min-height:46px!important/);
});
test('After finishing the evening the official feedback pathway remains available',()=>{
 const html=premiumEveningHtml({members:people,me:'first',
  lastEvening:{id:'past',completed:10,responses:1,myResponse:true,partnerResponse:false}});
 assert.doesNotMatch(html,/review-open:past/);
  assert.match(html,/data-action="evening-calendar"/);
  assert.equal((html.match(/<button /g)||[]).length,2);
 assert.match(html,/Votre partenaire/);
 assert.match(html,/1 \/ 2 bilans déposés/);
 assert.match(html,/Consulter notre calendrier/);
});
test('Occasion within its seven days-after window is available this year',()=>{
 const settings={anniversary_md:'10-14',birthday_by_user:{}};
 const entries=sixSpecialEvents(new Date('2026-10-15T16:00:00Z'),settings,people);
 assert.equal(entries[0].year,2026);
 assert.match(entries[0].availability,/Disponible encore 6 jours/);
 const later=sixSpecialEvents(new Date('2026-10-22T16:00:00Z'),settings,people);
 assert.equal(later[0].year,2027);
});

test('Seventh day after the occasion is the last available day, then next year',()=>{
 const settings={anniversary_md:'10-14',birthday_by_user:{}};
 const lastDay=sixSpecialEvents(new Date('2026-10-21T16:00:00Z'),settings,people);
 assert.equal(lastDay[0].year,2026);
 assert.match(lastDay[0].availability,/dernier jour/);
 const after=sixSpecialEvents(new Date('2026-10-22T16:00:00Z'),settings,people);
 assert.equal(after[0].year,2027);
});

test('Fullscreen v61 renders all six event choices in two columns and three rows',()=>{
 const responsive=read('responsive-fullscreen.css');
 const html=premiumSurpriseHtml({members:people,monthly:{},settings:{}});
 assert.equal((html.match(/class="surprise-event-card /g)||[]).length,6);
 assert.equal((html.match(/class="surprise-event-details"/g)||[]).length,6);
 assert.match(responsive,/surprise-special-grid/);
 assert.match(responsive,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(responsive,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(responsive,/var\(--lr-nav-space\)/);
 assert.match(responsive,/overflow-y:auto!important/);
});
test('Soirée never crashes if the last session and feedback status are both missing',()=>{
 assert.doesNotMatch(app,/feedbackItemsFor|my_love_feedback_status|choose-feedback|save-feedback/);
 assert.match(app,/const recentReviews=last\?\(state.eveningReviews\|\|\[\]\)/);
 assert.match(app,/eveningDailyAccess\(/);
 assert.doesNotMatch(app,/evening-locked-view/);
 assert.match(app,/weeklyReady:!!state.weekly/);
 assert.match(app,/const canStartEvening=daily.canStart/);
});
