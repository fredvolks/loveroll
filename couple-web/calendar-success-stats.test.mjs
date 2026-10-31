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


test('Sparse calendar RPC snapshots do not crash or fabricate a monthly success',()=>{
 const month='2026-10';
 const night={id:'safe-night',started_at:'2026-10-25T20:00:00Z',
  finished_at:'2026-10-25T22:00:00Z',counted:true};
 const card={id:'done',session_id:night.id,recipient:'a',status:'completed'};
 const params={month,members:[null,{user_id:'a',name:'A'},false,{}],
  sessions:[null,undefined,false,{},night],
  historyChallenges:[null,false,{},card],
  sessionStats:[null,false,{},{
   session_id:night.id,user_id:'a',target:2,completed:1,drawn:1}],
  passQuota:[null,false,{},{
   challenge_id:'missing',recipient:'a',free_pass:true}]};
 const result=monthlyChallengeSuccess(params);
 assert.equal(result.length,1);
 assert.equal(result[0].done,1);
 assert.equal(result[0].unpicked,1);
 assert.equal(result[0].percent,50);
 assert.equal(remainingWeekEvenings(null),0,'null time is not the epoch');
 const week=calendarWeekSuccess({
  date:'2026-10-25',
  weeklyRolls:[null,false,{},{
   kind:'weekly',key:'2026-10-19',face:3,
   created_at:'2026-10-25T13:00:00Z'}],
  sessions:[null,false,{},night]
 });
 assert.equal(week.hasRoll,true);
 assert.equal(week.completed,0,'an evening before the D6 cannot be credited');
 assert.deepEqual(monthlyChallengeSuccess({month,sessions:[null],members:[null]}),[]);
 assert.equal(calendarWeekSuccess({date:'2026-10-25',weeklyRolls:[null]}).hasRoll,false);
});

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
 assert.match(app,/\['save_my_play_style',\{p_style:playStyle\}\]/);
  assert.match(app,/await saveProfileForCurrentAccount\(name,birthday,gender,playStyle\)/);
 assert.match(app,/futureCoupleStyleMix/);
 assert.doesNotMatch(engine,/play_style|futureCoupleStyleMix/);
});


test('LR-003: proposed/accepted cards never lower the rate while a night is open',()=>{
 const open={id:'open',started_at:'2026-10-23T18:00:00Z',finished_at:null,counted:false};
 const cards=[
  {id:'done',session_id:'open',recipient:'a',status:'completed'},
  {id:'pending',session_id:'open',recipient:'a',status:'proposed'},
  {id:'started',session_id:'open',recipient:'a',status:'accepted'}
 ];
 const stats=[{session_id:'open',user_id:'a',target:4,drawn:3,completed:1}];
 const active=monthlyChallengeSuccess({month:'2026-10',members,sessions:[open],
  historyChallenges:cards,sessionStats:stats});
 assert.equal(active[0].done,1);
 assert.equal(active[0].denominator,1);
 assert.equal(active[0].percent,100);
 assert.equal(active[0].unpicked,0);
 const onlyPending=monthlyChallengeSuccess({month:'2026-10',members,sessions:[open],
  historyChallenges:cards.filter(c=>c.status!=='completed'),sessionStats:stats});
 assert.equal(onlyPending[0].percent,null);
 const closed=monthlyChallengeSuccess({month:'2026-10',members,
  sessions:[{...open,finished_at:'2026-10-23T23:00:00Z',counted:true}],
  historyChallenges:cards,sessionStats:stats});
 assert.equal(closed[0].denominator,4);
 assert.equal(closed[0].unpicked,1);
 assert.equal(closed[0].percent,25);
});
test('LR-003: a passed challenge is not counted again as an unpicked slot',()=>{
 const night={id:'closed',started_at:'2026-10-24T19:00:00Z',
  finished_at:'2026-10-24T21:00:00Z',counted:true};
 const cards=[
  {id:'done',session_id:'closed',recipient:'a',status:'completed'},
  {id:'pass',session_id:'closed',recipient:'a',status:'passed'},
  {id:'pending',session_id:'closed',recipient:'a',status:'proposed'}
 ];
 const base={month:'2026-10',members,sessions:[night],historyChallenges:cards,
  sessionStats:[{session_id:'closed',user_id:'a',target:5,drawn:3,completed:1}],
  passQuota:[{challenge_id:'pass',recipient:'a',free_pass:false}]};
 const charged=monthlyChallengeSuccess(base)[0];
 assert.equal(charged.unpicked,2);
 assert.equal(charged.penalizedPasses,1);
 assert.equal(charged.denominator,5,'3 assigned + 2 unpicked; do not double count a pass');
 assert.equal(charged.percent,20);
 const free=monthlyChallengeSuccess({...base,
  passQuota:[{challenge_id:'pass',recipient:'a',free_pass:true}]} )[0];
 assert.equal(free.denominator,4);
 assert.equal(free.percent,25);
});

test('LR-015 an open-evening refusal is final without penalizing only-pending cards',()=>{
 const open={id:'refused-night',started_at:'2026-10-24T19:00:00Z',finished_at:null};
 const cards=[
  {id:'done',session_id:open.id,recipient:'a',status:'completed'},
  {id:'refuse',session_id:open.id,recipient:'a',status:'refused'},
  {id:'pending',session_id:open.id,recipient:'a',status:'proposed'}
 ];
 const result=monthlyChallengeSuccess({month:'2026-10',members,sessions:[open],
  historyChallenges:cards,sessionStats:[{session_id:open.id,user_id:'a',target:3}]})[0];
 assert.equal(result.done,1);
 assert.equal(result.denominator,2);
 assert.equal(result.percent,50);
 assert.equal(result.penalizedPasses,0,'A refusal must not consume monthly pass quota');
});

test('LR-015: replacement chains consume one D6 slot, while all original events stay in history',()=>{
 const night={id:'n-rl',started_at:'2026-10-25T20:00:00Z',finished_at:'2026-10-26T00:00:00Z',counted:true};
 const all=[
  {id:'old1',session_id:'n-rl',recipient:'a',status:'refused'},
  {id:'new1',replaces_challenge_id:'old1',session_id:'n-rl',recipient:'a',status:'passed'},
  {id:'done1',replaces_challenge_id:'new1',session_id:'n-rl',recipient:'a',status:'completed'}
 ];
 const args={month:'2026-10',members,sessions:[night],historyChallenges:all,
   sessionStats:[{session_id:'n-rl',user_id:'a',target:3,drawn:1,completed:1}]};
 const result=monthlyChallengeSuccess(args)[0];
 assert.equal(all.length,3,'Immutable calendar history still records every attempt');
 assert.equal(result.done,1);
 assert.equal(result.unpicked,2,'Only the final replacement occupies a D6 slot');
 assert.equal(result.denominator,3,'Refusal and passage ancestors must not penalize twice');
 assert.equal(result.percent,33);
 const active=monthlyChallengeSuccess({...args,sessions:[{...night,finished_at:null} ]})[0];
 assert.equal(active.unpicked,0,'Open evening unpicked slots are not yet failures');
 assert.equal(active.denominator,1);
 assert.equal(active.percent,100);
});
