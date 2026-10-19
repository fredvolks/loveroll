import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sharedAdventState,adventPremiumHtml,torontoDay} from './premium-advent.mjs';
const date=x=>new Date(x);
const couple=[{user_id:'a',name:'Camille Louise'},{user_id:'b',name:'Noémie Marie'}];
const row=(day,extra={})=>({couple_id:'couple',year:2026,day,opened_by:'b',opened_at:'2026-12-10T15:03:04Z',
 advent_title:'Notre titre officiel',advent_type:'Romantique',advent_description:'Ligne 1.\n  Ligne 2 inchangée. ',...extra});
test('Toronto midnight unlocks a full calendar date, never the phone timezone',()=>{
 assert.equal(torontoDay(date('2026-12-01T04:59:59Z')),'2026-11-30');
 assert.equal(torontoDay(date('2026-12-01T05:00:00Z')),'2026-12-01');
 assert.equal(sharedAdventState([],date('2026-12-01T04:59:59Z')).days.filter(d=>d.canOpen).length,0);
 assert.deepEqual(sharedAdventState([],date('2026-12-01T05:00:00Z')).days.filter(d=>d.canOpen).map(d=>d.day),[1]);
});
test('On December 10 all unopened dates 1–10 are available; 11–25 stay locked',()=>{
 const cal=sharedAdventState([row(2),row(6)],date('2026-12-10T16:00:00Z'));
 assert.deepEqual(cal.days.filter(d=>d.canOpen).map(d=>d.day),[1,3,4,5,7,8,9,10]);
 assert.equal(cal.days[0].status,'overdue');assert.equal(cal.days[9].status,'available');
 assert.equal(cal.days[10].status,'locked');assert.equal(cal.days[1].status,'opened');
 assert.equal(cal.days[9].date,'2026-12-10');assert.equal(cal.totalOpened,2);
});
test('Catch-up remains possible after December 25 and into the next year',()=>{
 for(const when of ['2026-12-26T16:00:00Z','2027-01-01T16:00:00Z','2027-10-14T16:00:00Z']){
  const cal=sharedAdventState([row(3)],date(when),2026);
  assert.equal(cal.days.filter(d=>d.canOpen).length,24);
  assert.equal(cal.days[24].status,'overdue');assert.equal(cal.days[2].status,'opened');
 }
 assert.equal(sharedAdventState([],date('2027-01-01T16:00:00Z')).year,2026);
 assert.equal(sharedAdventState([],date('2027-01-01T16:00:00Z'),2027).days.some(d=>d.canOpen),false);
});
test('Multiple caught-up letters do not consume the current day opening',()=>{
 const when=date('2026-12-10T16:00:00Z');
 const cal=sharedAdventState([row(1),row(4),row(9)],when);
 assert.equal(cal.days[9].canOpen,true);
 const after=sharedAdventState([row(1),row(4),row(9),row(10)],when);
 assert.equal(after.days[9].canOpen,false);assert.equal(after.days[8].opened,true);
 assert.equal(after.days[1].canOpen,true);
});
test('The grid has exactly 25 numbered letters and distinct non-color states',()=>{
 const h=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),members:couple,openings:[row(1)]});
 assert.equal((h.match(/class="advent-box /g)||[]).length,25);
 assert.equal((h.match(/class="advent-envelope"/g)||[]).length,25);
 assert.match(h,/Les mots doux de décembre/);assert.doesNotMatch(h,/Vingt-cinq lettres, une histoire à deux/);
 assert.match(h,/À découvrir/);assert.match(h,/Aujourd’hui/);assert.match(h,/✓ Ouverte/);assert.match(h,/À venir/);
 assert.match(h,/data-action="advent-open:2"/);assert.match(h,/data-action="advent-view:1"/);
 assert.match(h,/data-action="advent-locked:11"[^>]*disabled/);
 assert.doesNotMatch(h,/Jour manqué|sans rattrapage|Notre titre officiel|Ligne 1\./i);
});
test('Today primary action changes from opening to consulting the same snapshot',()=>{
 const when=date('2026-12-10T16:00:00Z');
 assert.match(adventPremiumHtml({when}),/data-action="advent-open:10">Ouvrir notre surprise du jour/);
 const h=adventPremiumHtml({when,openings:[row(10)]});
 assert.match(h,/data-action="advent-view:10">Relire notre surprise du jour/);
 assert.doesNotMatch(h,/data-action="advent-open:10"/);
});
test('Both members see exact recorded content, full author, actual opened time and optional timer',()=>{
 const record=row(3,{advent_timer_minutes:7});
 for(const members of [couple,[...couple].reverse()]){
  const h=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),members,openings:[record],selectedDay:3,timerHtml:'<div id="official-timer">7 min</div>'});
  assert.match(h,/3 DÉCEMBRE 2026/);assert.match(h,/Notre titre officiel/);assert.match(h,/Ligne 1\.\n  Ligne 2 inchangée\. /);
  assert.match(h,/Ouverte par Noémie Marie/);assert.match(h,/10 déc/);assert.match(h,/official-timer/);
 }
 const noTimer=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),openings:[row(3)],selectedDay:3,timerHtml:'DO_NOT_SHOW'});
 assert.doesNotMatch(noTimer,/DO_NOT_SHOW/);
});
test('No trusted server date disables opening but retains access to saved letters',()=>{
 const h=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),dateTrusted:false,openings:[row(1)]});
 assert.doesNotMatch(h,/data-action="advent-open:/);assert.match(h,/data-action="advent-view:1"/);
 assert.match(h,/Connexion au calendrier/);
});
test('Pending and confirmed animation states block every letter and never reveal content early',()=>{
 for(const revealing of [false,true]){
  const h=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),openingDay:3,revealing,openings:revealing?[row(3)]:[]});
  assert.equal((h.match(/class="advent-box [^>]+disabled/g)||[]).length,25);
  assert.match(h,revealing?/opened opening"/:/overdue opening-pending"/);
  assert.doesNotMatch(h,/advent-reveal"|Notre titre officiel/);
 }
});
test('Historical calendar selector preserves past unopened dates and future years remain locked',()=>{
 const h=adventPremiumHtml({when:date('2027-01-10T16:00:00Z'),year:2026,showHistory:true});
 assert.match(h,/data-action="advent-year:2026"/);assert.match(h,/data-action="advent-year:2027"/);
 assert.match(h,/data-action="advent-open:25"/);
});
test('Recorded text is escaped without rewording or executing HTML',()=>{
 const h=adventPremiumHtml({when:date('2026-12-10T16:00:00Z'),openings:[row(3,{advent_title:'<img src=x onerror=alert(1)>',advent_description:'<script>attack()</script>'})],selectedDay:3});
 assert.doesNotMatch(h,/<img src=x|<script>attack/);assert.match(h,/&lt;img/);assert.match(h,/&lt;script&gt;attack/);
});
test('Published migration is additive and retains explicit authenticated function grants',()=>{
 const db=readFileSync(new URL('./migrations/20261017045614_loveroll_advent_catchup.sql',import.meta.url),'utf8');
 assert.doesNotMatch(db,/\bdelete\s+from|\btruncate\b|\bdrop\s+table\b|update public\.couple_advent/i);
 assert.match(db,/grant execute on function public\.open_advent_day\(uuid,integer,integer\) to authenticated/);
});
