import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {eveningHistoryMarkup,eveningLocalDay,eveningArchiveDay,eveningChallengeStatusLabel,eveningCalendarInitialDate} from './evening-calendar.mjs';
const files=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sessions=[
 {id:'s1',started_at:'2026-10-16T01:00:00Z',finished_at:'2026-10-16T02:00:00Z',counted:true},
 {id:'s2',started_at:'2026-10-15T16:00:00Z',finished_at:null,counted:false},
 {id:'older',started_at:'2026-09-01T12:00:00Z',finished_at:'2026-09-01T13:00:00Z',counted:false}
];
const members=[{user_id:'a',name:'Fred'},{user_id:'b',name:'Noémie'}];
const stats=[
 {session_id:'s1',user_id:'a',target:5,drawn:3,completed:2,incomplete:1,passed:0},
 {session_id:'s1',user_id:'b',target:3,drawn:2,completed:1,incomplete:1,passed:0},
 {session_id:'s2',user_id:'a',target:4,drawn:0,completed:0,incomplete:0,passed:0},
 {session_id:'s2',user_id:'b',target:null,drawn:0,completed:0,incomplete:0,passed:0}
];
const historyChallenges=[
 {id:'d1',session_id:'s1',recipient:'a',category:'SENSUEL',face:2,card_title:'Mon défi fait',
  status:'completed',created_at:'2026-10-16T01:01:00Z'},
 {id:'d2',session_id:'s1',recipient:'a',category:'SENSUEL',face:3,card_title:'Mon défi à faire',
  status:'proposed',created_at:'2026-10-16T01:02:00Z'},
 {id:'d3',session_id:'s1',recipient:'b',category:'SEXUEL',face:2,card_title:'Défi fait par Noémie',
  status:'completed',created_at:'2026-10-16T01:03:00Z'},
 {id:'d4',session_id:'s1',recipient:'b',category:'SENSUEL',face:4,card_title:'Défi passé par Noémie',
  status:'passed',created_at:'2026-10-16T01:04:00Z'}
];
const render=(date='2026-10-15',extra={})=>eveningHistoryMarkup({
 sessions,members,stats,historyChallenges,me:'a',month:'2026-10',selectedDate:date,...extra});
test('LR-019: archived completed cards expose favorites only to their owner',()=>{
 const html=render('2026-10-15',{favoriteIds:['SENSUEL:2']});
 assert.match(html,/data-action="calendar-favorite:d1" data-favorite-id="SENSUEL:2" aria-pressed="true"/);
 assert.match(html,/♥ Dans mes favoris/);
 assert.doesNotMatch(html,/data-action="calendar-favorite:d2"/);
 assert.doesNotMatch(html,/data-action="calendar-favorite:d3"/);
 assert.doesNotMatch(html,/data-action="calendar-favorite:d4"/);
 assert.match(render('2026-10-15',{favoriteIds:[]}),/calendar-favorite:d1"[^>]*aria-pressed="false"/);
 const full=render('2026-10-15',{favoriteIds:['SENSUEL:1','SENSUEL:3','SENSUEL:4','SENSUEL:5','SEXUEL:2']});
 assert.match(full,/calendar-favorite:d1"[^>]*disabled aria-disabled="true"/);
 const already=render('2026-10-15',{favoriteIds:['SENSUEL:1','SENSUEL:2','SENSUEL:3','SENSUEL:4','SENSUEL:5']});
 assert.match(already,/calendar-favorite:d1"[^>]*aria-pressed="true"/);
 assert.doesNotMatch(already,/calendar-favorite:d1"[^>]*disabled/);
 assert.doesNotMatch(render('2026-10-15',{me:null}),/data-action="calendar-favorite:/);
});
test('LR-019: calendar favorites are local, account-checked and never trigger a roll',()=>{
 const app=files('./app.js');
 const begin=app.indexOf("if(verb==='calendar-favorite'){");
 const end=app.indexOf("if(verb==='favorite-remove'){",begin);
 assert.ok(begin>0&&end>begin);
 const source=app.slice(begin,end);
 assert.match(source,/state\.tab!=='evening-calendar'/);
 assert.match(source,/c\.recipient===state\.user\.id&&c\.status==='completed'/);
 assert.match(source,/s\.finished_at/);
 assert.match(source,/state\.coupleId/);
 assert.match(source,/toggleEveningFavorite\(state\.user\.id,state\.coupleId,card\)/);
 assert.match(source,/outcome\.favorites\.length>=EVENING_FAVORITES_LIMIT/);
 assert.doesNotMatch(source,/rpc\(|roll_couple_once|finish_couple_session/);
});
test('LR-019: actual calendar favorite handler rejects foreign ownership and leaves UI open',async()=>{
 const app=files('./app.js');
 const from=app.indexOf("if(verb==='calendar-favorite'){");
 const until=app.indexOf("if(verb==='favorite-remove'){",from);
 assert.ok(from>0&&until>from);
 const code=app.slice(from,until);
 const session={id:'s1',couple_id:'c1',finished_at:'2026-10-16T02:00:00Z'};
 const saved={id:'d1',session_id:'s1',recipient:'alice',status:'completed',
  category:'SENSUEL',card_id:2};
 const state={tab:'evening-calendar',user:{id:'alice'},coupleId:'c1',
  members:[{user_id:'alice'},{user_id:'bob'}],sessions:[session],
  eveningCalendarChallenges:[saved]};
 let writes=0,buttonUpdates=0;
 const button={dataset:{favoriteId:'SENSUEL:2'},setAttribute(){buttonUpdates++;},
  removeAttribute(){},disabled:false,textContent:'',title:''};
 const element={getAttribute:key=>key==='data-favorite-id'?'SENSUEL:2':null};
 const root={contains:x=>x===element,querySelectorAll:()=>[button]};
 const ctx={state,root,EVENING_FAVORITES_LIMIT:5,
  eveningFavoriteId:c=>c.category==='SENSUEL'&&c.card_id===2?'SENSUEL:2':null,
  toggleEveningFavorite:()=>{writes++;return {ok:true,favorites:['SENSUEL:2']};}};
 const run=runInNewContext('(async (verb,parts,element)=>{'+code+'})',ctx);
 const click=()=>run('calendar-favorite',['d1'],element);
 await click();
 assert.equal(writes,1);
 assert.ok(buttonUpdates>0);
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'♥ Dans mes favoris');
 state.eveningCalendarChallenges=[{...saved,recipient:'bob'}];
 await assert.rejects(click(),/historique personnel/);
 assert.equal(writes,1);
 state.eveningCalendarChallenges=[saved];
 state.sessions=[{...session,couple_id:'other'}];
 await assert.rejects(click(),/historique personnel/);
 assert.equal(writes,1);
 state.sessions=[session];
 state.tab='home';
 await click();
 assert.equal(writes,1,'old calendar actions are ignored after navigation');
 state.tab='evening-calendar';
 ctx.toggleEveningFavorite=()=>({ok:false,reason:'limit',favorites:[]});
 await assert.rejects(click(),/cinq favoris/);
 assert.equal(writes,1);
});
test('Québec calendar honors local dates for day and year',()=>{
 assert.equal(eveningLocalDay('2026-10-16T01:00:00Z'),'2026-10-15');
 assert.equal(eveningLocalDay('2026-01-02T02:00:00Z'),'2026-01-01');
 assert.equal(eveningLocalDay('not-a-date'),null);
});
test('Two member rows are independent expandable lists on each evening',()=>{
 const html=render();
 assert.equal((html.match(/class="evening-cal-person-group"/g)||[]).length,4);
 assert.equal((html.match(/<summary class="evening-cal-person">/g)||[]).length,4);
 assert.match(html,/Fred \(moi\)/);
 assert.match(html,/Noémie \(partenaire\)/);
 assert.match(html,/Mon défi fait/);
 assert.match(html,/Mon défi à faire/);
 assert.match(html,/Défi fait par Noémie/);
 assert.match(html,/Défi passé par Noémie/);
 assert.match(html,/✓ Réalisé/);
 assert.match(html,/Non réalisé \(non commencé\)/);
 assert.match(html,/Passé, non réalisé/);
 assert.match(html,/2<\/b> réalisés/);
 assert.match(html,/3<\/b> non réalisés/);
 assert.match(html,/1<\/b> réalisé/);
 assert.match(html,/2<\/b> non réalisés/);
 assert.match(html,/2 défis non pigés : aucune carte attribuée/);
 assert.match(html,/4 défis à piger : aucune carte attribuée/);
 assert.match(html,/<b>4<\/b> à faire/);
 assert.doesNotMatch(html,/<b>4<\/b> non réalisés/);
 assert.doesNotMatch(html,/Les cartes de ton partenaire restent privées/);
 assert.match(html,/data-action="evening-date:2026-10-15"/);
 assert.match(html,/data-action="evening-month-prev"/);
 assert.match(html,/data-action="evening-month-next"/);
});
test('Full per-person list is isolated by recipient, session, and calendar day',()=>{
 const html=render();
 const first=html.slice(html.indexOf('data-person-id="a"'),html.indexOf('data-person-id="b"'));
 assert.match(first,/Mon défi fait/);
 assert.doesNotMatch(first,/Défi fait par Noémie/);
 const second=html.slice(html.indexOf('data-person-id="b"'),html.indexOf('</details>',html.indexOf('data-person-id="b"'))+10);
 assert.match(second,/Défi fait par Noémie/);
 assert.doesNotMatch(second,/Mon défi fait/);
 assert.match(render('2026-10-10'),/Aucune soirée enregistrée pour cette journée/);
 assert.doesNotMatch(render('2026-10-10'),/Défi fait par Noémie/);
});
test('Titles are escaped even when they come from Supabase',()=>{
 const html=render('2026-10-15',{historyChallenges:[{
  ...historyChallenges[0],card_title:'<script>danger</script>'
 }]});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;danger&lt;\/script&gt;/);
});
test('App uses member-only challenge history without weakening the real game RLS',()=>{
 const app=files('./app.js');
 const db=files('./migrations/20261016_evening_calendar_shared_challenges.sql');
 const security=files('./migrations/20261016_close_evening_and_history.sql');
 const markup=files('./evening-calendar.mjs');
 assert.match(app,/rpc\('love_evening_calendar_challenges',\{p_couple:c\}\)/);
 assert.match(app,/historyChallenges:state\.eveningCalendarChallenges\|\|\[\]/);
 assert.match(app,/rpc\('close_love_evening_preserve',\{p_session:ended\.id\}\)/);
 assert.match(db,/love_require_verified_identity\(\)/);
 assert.match(db,/couple_private\.is_member\(p_couple\)/);
 assert.match(db,/JOIN public\.couple_sessions s ON s\.id=q\.session_id/);
 assert.match(db,/REVOKE ALL ON FUNCTION public\.love_evening_calendar_challenges\(uuid\) FROM PUBLIC/);
 assert.match(db,/GRANT EXECUTE ON FUNCTION public\.love_evening_calendar_challenges\(uuid\) TO authenticated/);
 assert.doesNotMatch(db,/DROP POLICY|CREATE POLICY|card_description|card_timer_minutes/i);
 assert.match(security,/counted=true/);
 assert.match(markup,/<details class="evening-cal-person-group"/);
 assert.match(markup,/<summary class="evening-cal-person"/);
 const css=files('./evening-calendar.css');
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.doesNotMatch(css,/scroll-snap|overflow-x:auto/i);
});

test('An ongoing evening has pending/accepted cards without a false non-realized verdict',()=>{
 const html=eveningHistoryMarkup({
  sessions:[{id:'active',started_at:'2026-10-15T16:00:00Z',finished_at:null,counted:false}],
  members,stats:[{session_id:'active',user_id:'a',target:4,drawn:2,completed:0},
   {session_id:'active',user_id:'b',target:2,drawn:0,completed:0}],
  historyChallenges:[
   {id:'pending',session_id:'active',recipient:'a',category:'SENSUEL',status:'proposed',card_title:'A venir'},
   {id:'begun',session_id:'active',recipient:'a',category:'SENSUEL',status:'accepted',card_title:'En chemin'}
  ],me:'a',month:'2026-10',selectedDate:'2026-10-15'
 });
 assert.match(html,/<b>4<\/b> à faire/);
 assert.match(html,/<b>2<\/b> à faire/);
 assert.match(html,/○ À faire/);
 assert.match(html,/◷ En cours/);
 assert.match(html,/2 défis à piger/);
 assert.doesNotMatch(html,/<b>4<\/b> non réalisés/);
 assert.doesNotMatch(html,/Commencé, non réalisé/);
});
test('Only closure makes a proposed or accepted card definitively non-realized',()=>{
 assert.equal(eveningChallengeStatusLabel('proposed',false),'○ À faire');
 assert.equal(eveningChallengeStatusLabel('accepted',false),'◷ En cours');
 assert.equal(eveningChallengeStatusLabel('proposed',true),'○ Non réalisé (non commencé)');
 assert.equal(eveningChallengeStatusLabel('accepted',true),'◷ Non réalisé après début');
 assert.equal(eveningChallengeStatusLabel('completed',false),'✓ Réalisé');
});

test('LR-015 refusal is explicit in the calendar before and after evening closure',()=>{
 assert.equal(eveningChallengeStatusLabel('refused',false),'◇ Refusé');
 assert.equal(eveningChallengeStatusLabel('refused',true),'◇ Refusé, non réalisé');
 const html=eveningHistoryMarkup({
  month:'2026-10',selectedDate:'2026-10-15',
  sessions:[{id:'refusal',started_at:'2026-10-15T16:00:00Z',finished_at:null}],
  members:[{user_id:'a',name:'Partenaire'}],me:'a',
  stats:[{session_id:'refusal',user_id:'a',target:1,completed:0,drawn:1}],
  historyChallenges:[{id:'r1',session_id:'refusal',recipient:'a',status:'refused',
   category:'SENSUEL',card_title:'Ancien défi refusé'}]
 });
 assert.match(html,/◇ Refusé/);
 assert.match(html,/Ancien défi refusé/);
});

test('LR-003 calendar without a month uses the current Toronto month, never fixed October 2026',()=>{
 const html=eveningHistoryMarkup();
 const expected=eveningLocalDay(new Date().toISOString()).slice(0,7);
 assert.match(html,new RegExp('data-action="evening-date:'+expected+'-01"'));
 assert.match(html,new RegExp(expected+'-01 · Historique'));
 const source=files('./evening-calendar.mjs');
 assert.doesNotMatch(source,/isoMonth\(month\)\|\|'2026-10'/);
});
test('LR-003 calendar rejects stale, malformed and impossible selected dates',()=>{
 const previous=['2026-09-30','2026-11-01','2026-10-32','2026-10-00',
  '2026-10-31x','2026-10-99','2026-02-31'];
 for(const selectedDate of previous){
  const html=eveningHistoryMarkup({month:'2026-10',selectedDate});
  assert.match(html,/2026-10-01 · Historique/);
  assert.match(html,/data-action="evening-date:2026-10-01"[^>]*aria-pressed="true"/);
 }
 const valid=eveningHistoryMarkup({month:'2026-10',selectedDate:'2026-10-31'});
 assert.match(valid,/2026-10-31 · Historique/);
 assert.match(valid,/data-action="evening-date:2026-10-31"[^>]*aria-pressed="true"/);
 const leap=eveningHistoryMarkup({month:'2028-02',selectedDate:'2028-02-29'});
 assert.match(leap,/2028-02-29 · Historique/);
 const notLeap=eveningHistoryMarkup({month:'2027-02',selectedDate:'2027-02-29'});
 assert.match(notLeap,/2027-02-01 · Historique/);
});

test('LR-003 monthly headline counts only CLOSED evenings in the selected Toronto month',()=>{
 const entries=[
  {id:'sep',started_at:'2026-09-25T20:00:00Z',finished_at:'2026-09-25T21:00:00Z',counted:true},
  {id:'oct',started_at:'2026-10-15T20:00:00Z',finished_at:'2026-10-15T22:00:00Z',counted:true},
  {id:'open',started_at:'2026-10-20T20:00:00Z',finished_at:null,counted:false},
  // UTC November 1 is still October 31 in Québec.
  {id:'utc-boundary',started_at:'2026-11-01T02:00:00Z',
   finished_at:'2026-11-01T03:00:00Z',counted:true}
 ];
 const outcomes=[
  {session_id:'sep',user_id:'a',target:9,completed:7},
  {session_id:'oct',user_id:'a',target:3,completed:2},
  {session_id:'open',user_id:'a',target:5,completed:0},
  {session_id:'utc-boundary',user_id:'a',target:1,completed:1}
 ];
 const show=(month,selectedDate)=>eveningHistoryMarkup({
  sessions:entries,members:[{user_id:'a',name:'Partenaire'}],stats:outcomes,
  me:'a',month,selectedDate});
 const headline=html=>{
  const match=html.match(/<div class="evening-cal-stats">([\s\S]*?)<\/div>/);
  assert.ok(match,'headline totals are month-scoped and clearly labelled');
  return match[1];
 };
 const oct=headline(show('2026-10','2026-10-15'));
 assert.match(oct,/<strong>2<\/strong> soirées clôturées ce mois/);
 assert.match(oct,/<strong>3<\/strong> défis réalisés ce mois/);
 assert.match(oct,/<strong>1<\/strong> non réalisés ce mois/);
 // The open October evening is not a failure, and September is not October.
 assert.doesNotMatch(oct,/>12<\/strong> défis réalisés/);
 const sep=headline(show('2026-09','2026-09-25'));
 assert.match(sep,/<strong>1<\/strong> soirées clôturées ce mois/);
 assert.match(sep,/<strong>7<\/strong> défis réalisés ce mois/);
 assert.match(sep,/<strong>2<\/strong> non réalisés ce mois/);
 const nov=headline(show('2026-11','2026-11-01'));
 assert.match(nov,/<strong>0<\/strong> soirées clôturées ce mois/);
 assert.match(nov,/<strong>0<\/strong> défis réalisés ce mois/);
 assert.match(nov,/<strong>0<\/strong> non réalisés ce mois/);
});

test('Sparse or unloaded historic rows never crash a mobile couple calendar',()=>{
 const empty=eveningHistoryMarkup({
  month:'2026-10',selectedDate:'2026-10-16',
  sessions:null,members:null,stats:null,historyChallenges:null,reviews:null,
  weeklyRolls:null,passQuota:null
 });
 assert.match(empty,/Notre calendrier/);
 assert.match(empty,/Aucune soirée enregistrée/);
 const html=eveningHistoryMarkup({
  month:'2026-10',selectedDate:'2026-10-16',me:'a',
  sessions:[null,{id:'sparse',started_at:'2026-10-16T17:00:00Z',
   finished_at:'2026-10-16T21:00:00Z',counted:true},false,{}],
  members:[null,{user_id:'a',name:'Partenaire'},{id:'missing'},false],
  stats:[null,{session_id:'sparse',user_id:'a',completed:1,target:1,drawn:1}],
  historyChallenges:[null,{id:'c1',session_id:'sparse',recipient:'a',
   category:'SENSUEL',face:2,status:'completed',created_at:'2026-10-16T17:10:00Z'}],
  reviews:[null,{session_id:'sparse',author_id:'a',
   overall:5,connection:5,appreciation:5,again:5}],
  weeklyRolls:null,passQuota:[null]
 });
 assert.match(html,/Soirée/);
 assert.match(html,/evening-cal-person-group/);
 assert.match(html,/Bilan de Partenaire/);
 assert.equal((html.match(/evening-cal-person-group/g)||[]).length,1);
});

test('Calendar chooses a real Québec day despite sparse history and UTC midnight',()=>{
 const now=new Date('2026-10-25T14:00:00Z');
 const history=[null,undefined,false,{},'bad',{started_at:'not-a-date'},
  {started_at:'2026-10-15T19:00:00Z'},
  {started_at:'2026-11-01T02:30:00Z'}];
 // A UTC November record still belongs to October 31 in Québec.
 assert.equal(eveningCalendarInitialDate({sessions:history,month:'2026-10',now}),'2026-10-31');
 assert.equal(eveningCalendarInitialDate({sessions:history,month:'2026-10',
  selectedDate:'2026-10-15',now}),'2026-10-15');
 for(const invalid of ['2026-10-99','2026-10-00','2026-02-29','2026-11-01']){
  assert.equal(eveningCalendarInitialDate({sessions:history,month:'2026-10',
   selectedDate:invalid,now}),'2026-10-31');
 }
 assert.equal(eveningCalendarInitialDate({sessions:null,month:'2026-10',now}),'2026-10-25');
 assert.equal(eveningCalendarInitialDate({sessions:[],month:'2026-09',now}),'2026-09-01');
 assert.equal(eveningCalendarInitialDate({sessions:[],month:'2028-02',
  selectedDate:'2028-02-29',now}),'2028-02-29');
 assert.equal(eveningCalendarInitialDate({sessions:[],month:'2027-02',
  selectedDate:'2027-02-29',now}),'2027-02-01');
 const app=files('./app.js');
 assert.match(app,/const date=eveningCalendarInitialDate\(/);
 assert.doesNotMatch(app,/state\.sessions\.find\(s=>eveningLocalDay\(s\.started_at\)/);
});

test('Soirée calendar never prints NaN, Infinity or negative challenge counts from older stats',()=>{
 const html=eveningHistoryMarkup({
  month:'2026-10',selectedDate:'2026-10-15',me:'a',
  sessions:[{id:'legacy',started_at:'2026-10-15T19:00:00Z',
   finished_at:'2026-10-15T22:00:00Z',counted:true}],
  members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Camille'}],
  stats:[
   {session_id:'legacy',user_id:'a',completed:'Infinity',target:'NaN',
    drawn:-10,incomplete:'-Infinity'},
   {session_id:'legacy',user_id:'b',completed:'2',target:'3',drawn:'2'}
  ]
 });
 const totals=html.match(/<div class="evening-cal-stats">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(totals);
 assert.match(totals,/<strong>2<\/strong> défis réalisés ce mois/);
 assert.match(totals,/<strong>1<\/strong> non réalisés ce mois/);
 assert.doesNotMatch(html,/NaN|Infinity|<b>-\d+<\/b>/);
 assert.match(html,/Fred \(moi\)/);
 assert.match(html,/Camille \(partenaire\)/);
});

test('LR-ACCUEIL-001: an officially counted overnight evening lives on its Québec completion day',()=>{
 const finished={id:'overnight',counted:true,
  started_at:'2026-10-16T03:55:00Z',finished_at:'2026-10-16T04:30:00Z'};
 assert.equal(eveningLocalDay(finished.started_at),'2026-10-15');
 assert.equal(eveningLocalDay(finished.finished_at),'2026-10-16');
 assert.equal(eveningArchiveDay(finished),'2026-10-16');
 const opts={sessions:[finished],members:[{user_id:'alice',name:'Alice'}],
  stats:[{session_id:'overnight',user_id:'alice',target:2,completed:1,drawn:2}],
  me:'alice',month:'2026-10'};
 const closed=eveningHistoryMarkup({...opts,selectedDate:'2026-10-16'});
 assert.match(closed,/2026-10-16 · Historique/);
 assert.match(closed,/evening-cal-person-group/);
 assert.match(closed,/<strong>1<\/strong> soirées clôturées ce mois/);
 assert.match(closed,/class="evening-cal-day has-evening selected" data-action="evening-date:2026-10-16"/);
 const previous=eveningHistoryMarkup({...opts,selectedDate:'2026-10-15'});
 assert.match(previous,/Aucune soirée enregistrée pour cette journée/);
 assert.equal(eveningCalendarInitialDate({sessions:[finished],month:'2026-10',
  now:new Date('2026-10-20T12:00:00Z')}),'2026-10-16');
});

test('LR-ACCUEIL-001: monthly calendar boundary matches Home finished-at accounting',()=>{
 const counted={id:'nov',counted:true,started_at:'2026-11-01T03:50:00Z',
  finished_at:'2026-11-01T05:15:00Z'};
 assert.equal(eveningArchiveDay(counted),'2026-11-01');
 const show=(mo,day)=>eveningHistoryMarkup({
  sessions:[counted],members:[{user_id:'alice',name:'Alice'}],
  month:mo,selectedDate:day,me:'alice'});
 const oct=show('2026-10','2026-10-31');
 assert.match(oct,/<strong>0<\/strong> soirées clôturées ce mois/);
 assert.match(oct,/Aucune soirée enregistrée pour cette journée/);
 const nov=show('2026-11','2026-11-01');
 assert.match(nov,/<strong>1<\/strong> soirées clôturées ce mois/);
 assert.match(nov,/Clôturée/);
 assert.equal(eveningCalendarInitialDate({sessions:[counted],month:'2026-11',
  now:new Date('2026-11-02T15:00:00Z')}),'2026-11-01');
 const active={id:'active',counted:true,started_at:'2026-10-31T23:30:00Z',finished_at:null};
 const interrupted={...counted,id:'cancelled',counted:false};
 assert.equal(eveningArchiveDay(active),'2026-10-31');
 assert.equal(eveningArchiveDay(interrupted),'2026-10-31');
 assert.equal(eveningArchiveDay({id:'invalid',counted:true,
  started_at:'not-a-date',finished_at:'invalid'}),null);
 assert.equal(eveningArchiveDay(null),null);
});
