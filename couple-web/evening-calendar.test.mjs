import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eveningHistoryMarkup,eveningLocalDay} from './evening-calendar.mjs';
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
 assert.match(html,/À faire, non réalisé/);
 assert.match(html,/Passé, non réalisé/);
 assert.match(html,/2<\/b> réalisés/);
 assert.match(html,/3<\/b> non réalisés/);
 assert.match(html,/1<\/b> réalisé/);
 assert.match(html,/2<\/b> non réalisés/);
 assert.match(html,/2 défis non pigés : aucune carte attribuée/);
 assert.match(html,/4 défis non pigés : aucune carte attribuée/);
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
