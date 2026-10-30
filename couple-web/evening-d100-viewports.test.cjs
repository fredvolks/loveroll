'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ALL,LANES,eveningD100Viewports}=require('./evening-d100-viewports.cjs');
const key=([w,h])=>w+'x'+h;
test('parallel lanes cover every original D100 viewport exactly once',()=>{
 const expected=['320x568','360x640','360x740','393x852','412x824','412x915','430x932'];
 assert.deepEqual(ALL.map(key),expected);
 assert.deepEqual([...LANES.a,...LANES.b].map(key),expected);
 assert.equal(new Set([...LANES.a,...LANES.b].map(key)).size,7);
 assert.equal(LANES.a.length,4);
 assert.equal(LANES.b.length,3);
 assert.deepEqual(eveningD100Viewports('all'),ALL);
 assert.deepEqual(eveningD100Viewports('a'),LANES.a);
 assert.deepEqual(eveningD100Viewports('b'),LANES.b);
});
test('a typo or unsupported lane fails closed, never skips validation',()=>{
 for(const name of ['','A','B','unknown','dice-stage',null]){
  assert.throws(()=>eveningD100Viewports(name),/Unknown mandatory D100 viewport lane/);
 }
});
