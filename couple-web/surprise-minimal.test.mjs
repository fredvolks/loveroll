import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingSpecialEvents,premiumSurpriseHtml} from './premium-surprise.mjs';
import {goldArrowHtml} from './gold-arrows.mjs';
test('Events sort by next date, keep available events first and missing dates last without changing input',()=>{
 const input=[{slot:'missing',daysLeft:null},{slot:'later',daysLeft:90},{slot:'soon',daysLeft:2},{slot:'active',daysLeft:-3},{slot:'today',daysLeft:0}];
 assert.deepEqual(upcomingSpecialEvents(input).map(x=>x.slot),['active','today','soon','later','missing']);
 assert.equal(input[0].slot,'missing');
});
test('Rendered event order follows dates while edit actions retain each owner',()=>{
 const html=premiumSurpriseHtml({now:new Date('2026-10-22T16:00:00Z'),members:[{user_id:'f',name:'Fred'},{user_id:'e',name:'Émilie'}],settings:{anniversary_md:'08-15',birthday_by_user:{f:'01-04',e:'02-08'}}});
 const actions=[...html.matchAll(/data-action="edit-surprise-event:([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(actions,['birthday:f','birthday:e','valentine:-','mothers_day:-','fathers_day:-','anniversary:-']);
});
test('Forward template is a simple filled triangle; back keeps its existing gold circle',()=>{
 assert.match(goldArrowHtml(),/is-next/);assert.doesNotMatch(goldArrowHtml(),/<circle/);
 assert.match(goldArrowHtml(true),/is-back/);assert.match(goldArrowHtml(true),/<circle/);
});
