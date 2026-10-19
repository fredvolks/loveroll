import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml,completedEveningLibraryCount} from './premium-evening.mjs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const members=[{user_id:'one',name:'Fred Messely'},{user_id:'two',name:'Alex Fred'}];
const base={session:{id:'s1'},members,me:'one',giftCount:0,
 turn:{ready:false,remaining:{one:2,two:3},targets:{one:2,two:3},completed:{one:0,two:0}},
 playable:{sensual:25,sexual:25,total:50}};
test('Library progress counts completed slots once across both partners and sessions',()=>{
 const completed=(category,face,recipient='one')=>({category,face,recipient,status:'completed'});
 assert.equal(completedEveningLibraryCount(),0);
 assert.equal(completedEveningLibraryCount([
  completed('SENSUEL',7),completed('SENSUEL',7,'two'),
  {...completed('SENSUEL',7),session_id:'another'},
  completed('SEXUEL',7),completed('COQUIN',7,'two'),
  completed('SENSUEL','100'),
  ...['proposed','accepted','passed','refused'].map(status=>({...completed('SEXUEL',9),status})),
  ...[0,101,-1,1.5,null,'invalid'].map(face=>completed('SEXUEL',face)),
  completed('UNKNOWN',1),null
 ]),3);
 const all=['SENSUEL','SEXUEL'].flatMap(category=>Array.from({length:100},(_,i)=>completed(category,i+1)));
 assert.equal(completedEveningLibraryCount([...all,...all]),200);
});
test('Inactive Soirée invites a roll and shows actual progress through 200 challenges',()=>{
 for(const [challengeHistory,count] of [
  [[],0],
  [[{category:'SENSUEL',face:1,status:'completed'},
    {category:'SEXUEL',face:1,status:'completed'},
    {category:'SENSUEL',face:2,status:'accepted'}],2]
 ]){
  const html=premiumEveningHtml({members,challengeHistory});
  assert.match(html,/<h2 class="ritual-page-title">200 défis à vivre à deux<\/h2><\/div>/);
  assert.doesNotMatch(html,/Brassez le dé et découvrez votre prochain défi/);
  assert.ok(html.includes('<strong>'+count+' / 200</strong><span>Défis complétés</span>'));
  assert.doesNotMatch(html,/Nos défis disponibles|100 \+ 100|idées jouables|résultats synchronisés/);
 }
});
test('Soirée removes oversized header and old top Options, but retains contextual session management',()=>{
 const html=premiumEveningHtml({...base,status:{both_ready:false}});
 assert.doesNotMatch(html,/<header class="evening-topline">/);
 assert.doesNotMatch(html,/NOTRE SOIRÉE PARTAGÉE|⋯ Options/);
 assert.match(html,/<h2 class="ritual-page-title">À toi de brasser ton dé<\/h2>/);
 assert.match(html,/class="evening-manage" data-action="evening-more" aria-label="Gérer notre soirée"/);
 assert.match(html,/data-action="evening-list"/);
 assert.match(html,/data-action="give-challenge"/);
});
test('Partner has no 3D D6 until server confirms their actual pip face',()=>{
 for(const roll of [undefined,null,{user_id:'two',face:null},{user_id:'two',face:0}]){
  const html=premiumEveningHtml({...base,rolls:roll?[roll]:[],status:{my_rolled:false,partner_rolled:false,both_ready:false}});
  assert.match(html,/evening-partner-card is-pending/);
  assert.match(html,/En attente/);
  assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,1,'Only our own 3D D6 is rendered');
  assert.match(html,/data-action="my-d6"/);
 }
});
test('Partner numeric result is immutable and separate from our own D6',()=>{
 const html=premiumEveningHtml({...base,rolls:[{user_id:'one',face:2},{user_id:'two',face:5}],
  status:{my_rolled:true,partner_rolled:true,both_ready:true},
  turn:{ready:true,next:'one',first:'two',remaining:{one:2,two:5},targets:{one:2,two:5},completed:{one:0,two:0}},
  category:'SENSUEL',ownChallengeCount:2});
 assert.match(html,/evening-partner-card is-confirmed/);
 assert.match(html,/evening-partner-die/);
 assert.match(html,/data-dice-sides="6" data-face="5"/);
 assert.match(html,/class="evening-partner-result"[\s\S]*?<strong>5<\/strong>[\s\S]*?défis ce soir/);
 assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,4);
 assert.match(html,/data-dice-sides="100"/);
 assert.match(html,/Voir mes défis \(2\)/);
 assert.match(html,/data-action="new-challenge"/);
});
test('Editorial layout owns a fixed viewport with square personal dice and a partner status',()=>{
 const css=read('evening-editorial.css'),index=read('index.html'),worker=read('service-worker.js');
 assert.match(css,/height:100dvh/);
 assert.match(css,/\.evening-user-die \.love3d-stage/);
 assert.match(css,/aspect-ratio:1/);
 assert.match(css,/\.evening-premium-view\.is-ready/);
 assert.match(index,/evening-editorial\.css\?v=20261017-ritual130/);
 assert.doesNotMatch(index,/evening-clean-v83\.css|evening-focused-v84\.css/);
 assert.match(worker,/\.\/evening-editorial\.css/);
});

test('Two-step design locks challenges until both D6 and retains the ORIGINAL 3D engines',()=>{
 const wait=premiumEveningHtml({...base,status:{both_ready:false}});
 assert.match(wait,/Compléter l’étape 1 pour brasser le dé/);
 assert.match(wait,/data-action="new-challenge"[^>]*disabled/);
 assert.equal((wait.match(/data-dice-sides="6"/g)||[]).length,1);
 const ready=premiumEveningHtml({...base,status:{both_ready:true,my_rolled:true,partner_rolled:true},
  rolls:[{user_id:'one',face:3},{user_id:'two',face:6}],
  turn:{...base.turn,ready:true,next:'one'},category:'SEXUEL'});
 assert.match(ready,/evening-summary-die/);
 assert.match(ready,/data-dice-sides="100"/);
 assert.match(ready,/88 %/);
 assert.match(ready,/class="evening-choice-odds">88 % de chances/);
 assert.doesNotMatch(ready,/12 % autre|Défi cadeau : 100 %/);
 assert.match(ready,/data-action="new-challenge"/);
 assert.match(ready,/data-action="evening-list"/);
 const unchanged=read('dice3d.js');
 assert.match(unchanged,/manySidedGeometry/);
 assert.match(unchanged,/canvas\.dataset\.diceMarkers==='pips'/);
});

test('Step 1 shows partner D6 before mine and keeps Step 2 locked',()=>{
 const html=premiumEveningHtml({...base,me:'one',
  rolls:[{user_id:'two',face:5}],
  status:{my_rolled:false,partner_rolled:true,both_ready:false},
  turn:{ready:false}});
 assert.match(html,/evening-partner-card is-confirmed/);
 assert.match(html,/data-dice-sides="6" data-face="5"/);
 assert.match(html,/class="evening-partner-result"/);
 assert.match(html,/<strong>5<\/strong>/);
 assert.match(html,/data-action="my-d6"/);
 assert.match(html,/data-action="new-challenge"[^>]*disabled/);
 assert.doesNotMatch(html,/MON DÉ ·|evening-person/);
 assert.equal((html.match(/data-dice-sides="6"/g)||[]).length,2);
});
test('Own official result sits below the unmodified 3D die without a result panel',()=>{
 const html=premiumEveningHtml({...base,rolls:[{user_id:'one',face:6}],
  status:{my_rolled:true,partner_rolled:false,both_ready:false}});
 const own=html.slice(html.indexOf('<article class="evening-user-die'),html.indexOf('</article>')+10);
 assert.ok(own.indexOf('class="love3d')<own.indexOf('class="evening-face-result"'));
 assert.match(own,/<strong>6<\/strong>/);
 assert.doesNotMatch(own,/MON DÉ ·/);
 const css=read('evening-step1-v89.css');
 assert.match(css,/\.evening-face-result,/);
 assert.match(css,/background:none!important;border:0!important/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/@media \(max-width:767px\)/);
 assert.match(css,/@media \(min-width:768px\) and \(max-width:1099px\)/);
 assert.match(css,/@media \(min-width:1100px\)/);
 const migration=read('migrations/20261016_d6_partner_immediate_visible.sql');
 assert.match(migration,/couple_private\.is_member\(s\.couple_id\)/);
 assert.match(migration,/FOR SELECT TO authenticated/);
 assert.doesNotMatch(migration,/both_rolls_ready/);
});
