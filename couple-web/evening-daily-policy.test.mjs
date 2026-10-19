import test from 'node:test';
import assert from 'node:assert/strict';
import {eveningDailyAccess} from './evening-daily-policy.mjs';
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
