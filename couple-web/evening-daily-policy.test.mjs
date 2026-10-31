import test from 'node:test';
import assert from 'node:assert/strict';
import {eveningDailyAccess} from './evening-daily-policy.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {readFileSync} from 'node:fs';
const weekly={face:3,key:'2026-10-12',created_at:'2026-10-12T15:00:00Z'};
const past={id:'one',started_at:'2026-10-15T20:00:00Z',finished_at:'2026-10-16T00:00:00Z',counted:true};
test('At 8am Québec Friday, yesterday closed game does not block',()=>{
 const x=eveningDailyAccess({sessions:[past],weekly,now:new Date('2026-10-16T12:00:00Z')});
 assert.deepEqual([x.counted,x.limit,x.canStart,x.dailyLocked],[1,3,true,false]);
 assert.equal(x.closedToday,null);
});
test('After a finished game on the same Québec day, start is disabled',()=>{
 const x=eveningDailyAccess({sessions:[past],weekly,now:new Date('2026-10-15T23:00:00Z')});
 assert.equal(x.dailyLocked,true);
 assert.equal(x.canStart,false);
 assert.equal(x.closedToday.id,'one');
});
test('A game that started yesterday but ended today blocks until tomorrow',()=>{
 const overnight={...past,finished_at:'2026-10-16T11:00:00Z'};
 const x=eveningDailyAccess({sessions:[overnight],weekly,now:new Date('2026-10-16T12:00:00Z')});
 assert.equal(x.canStart,false);
 assert.equal(x.dailyLocked,true);
});
test('No weekly draw or exhausted quota stays blocked',()=>{
 assert.equal(eveningDailyAccess({sessions:[past],now:new Date('2026-10-16T12:00:00Z')}).canStart,false);
 assert.equal(eveningDailyAccess({sessions:[past],weekly:{...weekly,face:1},now:new Date('2026-10-16T12:00:00Z')}).canStart,false);
});

test('New weekly roll reset ignores historical closed sessions and unlocks the button',()=>{
 const historical={id:'old-session',started_at:'2026-10-16T03:10:00Z',
  finished_at:'2026-10-16T05:19:00Z',counted:true};
 const resetWeekly={face:1,key:'2026-10-12',created_at:'2026-10-16T12:48:10Z'};
 const result=eveningDailyAccess({sessions:[historical],weekly:resetWeekly,
  now:new Date('2026-10-16T13:00:00Z')});
 assert.equal(result.counted,0);
 assert.equal(result.dailyLocked,false);
 assert.equal(result.closedToday,null);
 assert.equal(result.canStart,true);
});
test('Actual finished evening after new weekly roll disables button until tomorrow',()=>{
 const roll={face:3,key:'2026-10-12',created_at:'2026-10-16T12:48:10Z'};
 const fresh={id:'session',started_at:'2026-10-16T13:00:00Z',
  finished_at:'2026-10-16T14:30:00Z',counted:true};
 const today=eveningDailyAccess({sessions:[fresh],weekly:roll,
  now:new Date('2026-10-16T15:00:00Z')});
 assert.deepEqual([today.counted,today.dailyLocked,today.canStart,today.closedToday.id],[1,true,false,'session']);
 const tomorrow=eveningDailyAccess({sessions:[fresh],weekly:roll,
  now:new Date('2026-10-17T13:00:00Z')});
 assert.deepEqual([tomorrow.counted,tomorrow.dailyLocked,tomorrow.canStart],[1,false,true]);
});

test('Missing/failed session history never opens another evening optimistically',()=>{
 for(const sessions of [null,undefined,{},'not yet loaded']){
  const result=eveningDailyAccess({sessions,weekly,now:new Date('2026-10-16T12:00:00Z')});
  assert.equal(result.canStart,false,'missing history must never enable an official draw');
  assert.equal(result.counted,0);
 }
});
test('Malformed historic entries do not crash access or alter valid couples sessions',()=>{
 const result=eveningDailyAccess({
  sessions:[null,undefined,false,[],{},past,'unparseable'],
  weekly,now:new Date('2026-10-16T12:00:00Z')
 });
 assert.equal(result.counted,1);
 assert.equal(result.canStart,true);
 assert.equal(result.dailyLocked,false);
});
test('Invalid weekly D6 result and invalid device date cannot open soirée',()=>{
 for(const face of [0,7,100,-1,2.5,'invalid',null]){
  const state=eveningDailyAccess({sessions:[],weekly:{...weekly,face},now:new Date('2026-10-16T12:00:00Z')});
  assert.equal(state.canStart,false,'invalid D6 face '+String(face));
 }
 assert.equal(eveningDailyAccess({sessions:[],weekly,now:new Date('invalid')}).canStart,false);
 assert.equal(eveningDailyAccess({sessions:[],weekly:{face:3},now:new Date('2026-10-16T12:00:00Z')}).canStart,false);
});

test('Unavailable history keeps Start disabled and explains why instead of claiming quota exhausted',()=>{
 const pending=eveningDailyAccess({sessions:null,weekly,now:new Date('2026-10-16T12:00:00Z')});
 assert.equal(pending.historyReady,false);
 assert.equal(pending.canStart,false);
 const html=premiumEveningHtml({
  members:[{user_id:'alice',name:'Alice'},{user_id:'bob',name:'Bob'}],
  me:'alice',weeklyReady:true,weeklyLimit:pending.limit,weeklyCount:pending.counted,
  historyReady:pending.historyReady,canStartEvening:pending.canStart
 });
 assert.match(html,/Chargement de votre historique de soirées/);
 assert.doesNotMatch(html,/Toutes les soirées de la semaine ont été utilisées/);
 assert.match(html,/data-action="new-session"[^>]*disabled/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/historyReady:daily\.historyReady/);
});
test('A loaded empty history is distinct from a failed history request',()=>{
 const loaded=eveningDailyAccess({sessions:[],weekly,now:new Date('2026-10-16T12:00:00Z')});
 assert.equal(loaded.historyReady,true);
 assert.equal(loaded.canStart,true);
 const html=premiumEveningHtml({weeklyReady:true,weeklyLimit:loaded.limit,
  historyReady:true,canStartEvening:true});
 assert.doesNotMatch(html,/Chargement de votre historique de soirées/);
 assert.match(html,/Votre prochain moment à deux vous attend/);
});
