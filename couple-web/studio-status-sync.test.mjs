import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioStatusSync} from './studio-status-sync.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};

test('bursts from two genuine game seats produce at most one follow-up read',async()=>{
 const first=deferred(),second=deferred(),received=[];
 let fetchCount=0;
 const sync=createStudioStatusSync(()=>{
  fetchCount++;
  return fetchCount===1?first.promise:second.promise;
 },v=>received.push(v));
 const a=sync.refresh();
 const b=sync.refresh();
 const c=sync.refresh();
 assert.equal(fetchCount,1);
 first.resolve({dice:3,late:false});
 await Promise.resolve();
 assert.equal(fetchCount,2);
 second.resolve({dice:4,late:true});
 await Promise.all([a,b,c]);
 assert.equal(fetchCount,2);
 assert.deepEqual(received,[{dice:3,late:false},{dice:4,late:true}]);
});

test('an in-flight read cannot restore an A/B game after a destructive reset',async()=>{
 const before=deferred(),after=deferred(),visible=[];
 let count=0;
 const sync=createStudioStatusSync(()=>++count===1?before.promise:after.promise,v=>visible.push(v));
 const pending=sync.refresh();
 sync.invalidate();
 const needed=sync.refresh();
 before.resolve({state:'old-couple',ready:true});
 await Promise.resolve();
 assert.deepEqual(visible,[]);
 after.resolve({state:'missing',ready:false});
 await Promise.all([pending,needed]);
 assert.deepEqual(visible,[{state:'missing',ready:false}]);
});

test('temporary backend failure leaves no permanent refresh lock',async()=>{
 let calls=0,received=[];
 const sync=createStudioStatusSync(async()=>{
  if(++calls===1)throw Error('temporary offline');
  return {ready:true};
 },value=>received.push(value));
 await assert.rejects(sync.refresh(),/temporary offline/);
 await sync.refresh();
 assert.equal(calls,2);
 assert.deepEqual(received,[{ready:true}]);
});
