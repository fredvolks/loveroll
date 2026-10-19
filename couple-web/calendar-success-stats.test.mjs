import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {remainingWeekEvenings,mondayOf,calendarWeekSuccess,monthlyChallengeSuccess} from './calendar-success-stats.mjs';
import {futureCoupleStyleMix,normalizePlayStyle} from './play-style.mjs';
import {eveningHistoryMarkup} from './evening-calendar.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const saturdayRoll={kind:'weekly',key:'2026-10-12',face:4,created_at:'2026-10-17T16:00:00Z'};
const oneNight={id:'n1',started_at:'2026-10-17T23:00:00Z',finished_at:'2026-10-18T01:00:00Z',counted:true};
const twoNights=[oneNight,{id:'n2',started_at:'2026-10-18T23:00:00Z',finished_at:'2026-10-19T01:00:00Z',counted:true}];
const members=[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}];

test('Saturday D6 of 4: only two Quebec evenings possible; 1/2=50%, 2/2=100%',()=>{
 assert.equal(remainingWeekEvenings(saturdayRoll.created_at),2);
 assert.equal(mondayOf('2026-10-18'),'2026-10-12');
 const base={date:'2026-10-18',weeklyRolls:[saturdayRoll]};
 assert.deepEqual(calendarWeekSuccess({...base,sessions:[oneNight]}),{
  hasRoll:true,possible:2,completed:1,percent:50,face:4
 });
 assert.deepEqual(calendarWeekSuccess({...base,sessions:twoNights}),{
  hasRoll:true,possible:2,completed:2,percent:100,face:4
 });
 assert.equal(saturdayRoll.face,4,'Official result must NOT be altered');
});

test('Sunday gives at most one chance, Monday offers up to seven and never carries into next week',()=>{
 assert.equal(remainingWeekEvenings('2026-10-18T13:00:00Z'),1);
 assert.equal(remainingWeekEvenings('2026-10-12T13:00:00Z'),7);
 const result=calendarWeekSuccess({date:'2026-10-19',
  weeklyRolls:[saturdayRoll],sessions:twoNights});
 assert.equal(result.hasRoll,false);
 const sunday=calendarWeekSuccess({date:'2026-10-18',
  weeklyRolls:[{...saturdayRoll,created_at:'2026-10-18T14:00:00Z'}],
  sessions:twoNights});
 assert.equal(sunday.possible,1);
 assert.equal(sunday.completed,1);
 assert.equal(sunday.percent,100);
 assert.equal(calendarWeekSuccess({date:'2026-10-18'}).percent,null);
});

test('First three skips per person/month do not lower their completion percent, fourth does',()=>{
 const month='2026-10';
 const sessions=[{id:'night1',started_at:'2026-10-17T23:00:00Z',finished_at:'2026-10-18T00:00:00Z',counted:true}];
 const historyChallenges=[
  ...Array.from({length:4},(_,i)=>({id:'done'+i,session_id:'night1',recipient:'a',status:'completed'})),
  ...Array.from({length:4},(_,i)=>({id:'pass'+i,session_id:'night1',recipient:'a',status:'passed'}))
 ];
 const quota=Array.from({length:4},(_,i)=>({
  challenge_id:'pass'+i,recipient:'a',pass_number:i+1,free_pass:i<3
 }));
 const stats=[{session_id:'night1',user_id:'a',target:4,drawn:8,completed:4,passed:4}];
 const result=monthlyChallengeSuccess({month,members,sessions,historyChallenges,
  sessionStats:stats,passQuota:quota});
 assert.equal(result[0].freeUsed,3);
 assert.equal(result[0].penalizedPasses,1);
 assert.equal(result[0].done,4);
 assert.equal(result[0].denominator,5);
 assert.equal(result[0].percent,80);
 const firstThree=monthlyChallengeSuccess({month,members,sessions,
  historyChallenges:historyChallenges.filter(c=>c.id!=='pass3'),
  sessionStats:stats,passQuota:quota.slice(0,3)});
 assert.equal(firstThree[0].percent,100);
 assert.equal(firstThree[1].freeUsed,0,'Quotas must be per user');
});

test('Closed nights include unpicked card targets in completion rate; active nights do not',()=>{
 const sessions=[{id:'n',started_at:'2026-10-15T18:00:00Z',finished_at:'2026-10-16T02:00:00Z',counted:true}];
 const cards=[{id:'c',session_id:'n',recipient:'a',status:'completed'}];
 const stats=[{session_id:'n',user_id:'a',target:4,drawn:1,completed:1,passed:0}];
 const completed=monthlyChallengeSuccess({month:'2026-10',members,sessions,
  historyChallenges:cards,sessionStats:stats});
 assert.equal(completed[0].unpicked,3);
 assert.equal(completed[0].percent,25);
 const active=monthlyChallengeSuccess({month:'2026-10',members,
  sessions:[{...sessions[0],finished_at:null}],historyChallenges:cards,sessionStats:stats});
 assert.equal(active[0].unpicked,0);
 assert.equal(active[0].percent,100);
});

test('Calendar original three top bubbles remain untouched; new row uses same visual class',()=>{
 const html=eveningHistoryMarkup({
  month:'2026-10',selectedDate:'2026-10-18',sessions:twoNights,members,
  weeklyRolls:[saturdayRoll],stats:[],passQuota:[],historyChallenges:[]
 });
 assert.match(html,/<div class="evening-cal-stats"><span><strong>2<\/strong> soirées clôturées/);
 assert.match(html,/div class="evening-cal-stats evening-cal-extra"/);
 assert.match(html,/<strong>100 %<\/strong>2 \/ 2 soirées possibles/);
 assert.match(html,/Passes gratuites : 0\/3/);
 assert.equal((html.match(/class="evening-cal-stats"/g)||[]).length,1);
 assert.equal((html.match(/class="evening-cal-stats evening-cal-extra"/g)||[]).length,1);
});

test('Profile style mixing is prepared for 200x3 future cards, without touching current engine',()=>{
 assert.deepEqual(futureCoupleStyleMix('soft','intense'),[
  {style:'soft',weight:50},{style:'intense',weight:50}
 ]);
 assert.deepEqual(futureCoupleStyleMix('soft','soft'),[{style:'soft',weight:100}]);
 assert.deepEqual(futureCoupleStyleMix('medium','intense'),[
  {style:'medium',weight:50},{style:'intense',weight:50}
 ]);
 assert.equal(normalizePlayStyle('unknown'),'medium');
 const onboarding=read('onboarding.mjs'),app=read('app.js'),
  engine=read('evening-challenges.mjs');
 assert.match(onboarding,/profilePlayStyleSelect\(profile\?\.play_style\)/);
 assert.match(app,/rpc\('save_my_play_style'/);
 assert.match(app,/futureCoupleStyleMix/);
 assert.doesNotMatch(engine,/play_style|futureCoupleStyleMix/);
});
