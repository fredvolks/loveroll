import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FUTURE_REGEN_CARDS_PER_LEVEL,FUTURE_REGEN_PRICE_CAD_CENTS,
 FUTURE_REGEN_INTERVAL_MONTHS,futureRegenerationNextAt,
 futureRegenerationEligibility,futureRegenerationOverview
} from './future-card-regeneration.mjs';

const scope={userId:'joueur-a',coupleId:'couple-a',level:'medium'};
test('regeneration preview: 100 cards per level, CAD 4, no checkout',()=>{
 assert.equal(FUTURE_REGEN_PRICE_CAD_CENTS,400);
 assert.equal(FUTURE_REGEN_CARDS_PER_LEVEL,100);
 assert.equal(FUTURE_REGEN_INTERVAL_MONTHS,2);
 const view=futureRegenerationOverview({
  userId:'a',coupleId:'ab',now:'2026-10-31T12:00:00Z',
  historyByLevel:{soft:null,medium:null,intense:null}
 });
 assert.deepEqual(view.levels.map(r=>r.level),['soft','medium','intense']);
 assert.ok(view.levels.every(r=>r.eligible&&r.reason==='first'));
 assert.equal(view.paymentEnabled,false);
 assert.equal(view.archivePreserved,true);
 assert.ok(Object.isFrozen(view.levels));
});
test('missing, partial or corrupt server history fails closed by level',()=>{
 assert.deepEqual(futureRegenerationEligibility({...scope,
  now:'2026-10-31T12:00:00Z'}).eligible,false);
 const overview=futureRegenerationOverview({
  userId:'a',coupleId:'ab',historyByLevel:{soft:null,intense:'nonsense'},
  now:'2026-10-31T12:00:00Z'
 });
 assert.deepEqual(overview.levels.map(x=>x.reason),['first','history','history']);
 assert.equal(futureRegenerationOverview({userId:'a',coupleId:'ab',
  now:'2026-10-31T12:00:00Z'}).levels.every(x=>!x.eligible),true);
 for(const invalid of ['',null,[],{soft:null}])
  assert.equal(futureRegenerationOverview({
   userId:'a',coupleId:'ab',historyByLevel:invalid,
   now:'2026-10-31T12:00:00Z'}).levels.every(x=>x.reason!=='first'),
  invalid?.soft===null?false:true);
});
test('two calendar months clamp end-of-month and preserve UTC instant',()=>{
 assert.equal(futureRegenerationNextAt('2026-07-31T18:45:01.250Z'),
  '2026-09-30T18:45:01.250Z');
 assert.equal(futureRegenerationNextAt('2026-12-31T23:59:59Z'),
  '2027-02-28T23:59:59.000Z');
 assert.equal(futureRegenerationNextAt('2027-12-31T00:00:00Z'),
  '2028-02-29T00:00:00.000Z');
 assert.equal(futureRegenerationNextAt('2026-08-31T12:00:00-04:00'),
  '2026-10-31T16:00:00.000Z');
});
test('cooldown boundary is inclusive, independent for all three levels',()=>{
 const base={...scope,lastAt:'2026-08-31T00:00:00Z'};
 assert.equal(futureRegenerationEligibility({...base,
  now:'2026-10-30T23:59:59Z'}).reason,'cooldown');
 assert.equal(futureRegenerationEligibility({...base,
  now:'2026-10-31T00:00:00Z'}).reason,'eligible');
 const v=futureRegenerationOverview({
  userId:'a',coupleId:'ab',now:'2026-10-31T00:00:00Z',
  historyByLevel:{soft:'2026-10-30T00:00:00Z',
   medium:'2026-08-31T00:00:00Z',intense:null}
 });
 assert.deepEqual(v.levels.map(x=>x.reason),['cooldown','eligible','first']);
});
test('invalid dates, future audit, invalid scope and clocks never authorize',()=>{
 for(const lastAt of ['2026-02-30T12:00:00Z','2026-13-01T00:00:00Z',
  '2026-01-31T24:00:00Z','2026-01-31T00:60:00Z','hello',
  '2026-12-01T00:00:00Z',undefined]){
  assert.equal(futureRegenerationEligibility({...scope,lastAt,
   now:'2026-10-31T12:00:00Z'}).eligible,false,String(lastAt));
 }
 assert.equal(futureRegenerationNextAt('2026-02-30T12:00:00Z'),null);
 assert.equal(futureRegenerationEligibility({...scope,lastAt:null,
  now:'bad'}).reason,'clock');
 for(const altered of [{userId:''},{coupleId:' '},{level:'soft+medium'}])
  assert.equal(futureRegenerationEligibility({...scope,...altered,
   lastAt:null,now:'2026-10-31T12:00:00Z'}).reason,'invalid');
});
