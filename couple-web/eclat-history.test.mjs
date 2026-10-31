import test from 'node:test';
import assert from 'node:assert/strict';
import {coffretMemo,loadEclatHistory} from './eclat-history.mjs';
import {eclatHtml} from './eclat-ui.mjs';
const ended=(minutes,cancelled=false)=>({coffret_id:9,minutes,ended_at:'2026-10-21',cancelled});
test('Only actually finished, uncancelled sessions complete a duration; repeats count once',()=>{
 const rows=[ended(30),ended(30),ended(60,true),{coffret_id:9,minutes:90,ended_at:null}];
 assert.deepEqual(coffretMemo(rows,9).completed,[30]);
 assert.equal(coffretMemo(rows,9).active,true);
 assert.equal(coffretMemo([ended(60,true)],9).started,true);
 assert.deepEqual(coffretMemo([ended(30),ended(60),ended(90)],9).completed,[30,60,90]);
 assert.equal(coffretMemo(rows,8).started,false);
});
test('History is restricted to its couple, paginated, and contains no private instructions or choices',async()=>{
 const requests=[];
 const client={from(table){const q={table};requests.push(q);return {select(columns){q.columns=columns;return this},eq(k,v){q.filter=[k,v];return this},order(k,v){q.order=[k,v];return this},range(a,b){q.range=[a,b];return Promise.resolve({data:a===0?Array.from({length:1000},(_,i)=>({id:i})):[{id:1000}],error:null})}}}};
 assert.equal((await loadEclatHistory(client,'couple-a')).length,1001);
 assert.equal(requests.length,2);
 for(const r of requests){assert.deepEqual(r.filter,['couple_id','couple-a']);assert.doesNotMatch(r.columns,/choice|variant_plan|outcome|started_by/);}
});
test('Gallery and detail retain persistent completed-duration memos and safe resume actions',()=>{
 const status={access:true,active:false};
 const html=eclatHtml({status,history:[ended(30),ended(60)]});
 assert.equal((html.match(/data-action="eclat:detail:/g)||[]).length,12);
 assert.match(html,/Terminé · 2\/3 durées/);
 const active={access:true,active:true,coffret_id:9,minutes:90,chapter_index:2};
 const detail=eclatHtml({status:active,browse:true,details:true,selected:1});
 assert.match(detail,/data-action="eclat:resume"/);
 assert.doesNotMatch(detail,/data-action="eclat:start:/);
});

function deferredHistoryPage(){
 let resolve,reject;
 const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});
 return {promise,resolve,reject};
}
function historyPageClient(){
 const pages=[];
 const client={from(table){
  assert.equal(table,'love_eclat_sessions');
  return {
   select(columns){assert.doesNotMatch(columns,/choice|outcome|variant_plan/);return this;},
   eq(key,value){assert.deepEqual([key,value],['couple_id','couple-a']);return this;},
   order(){return this;},
   range(begin,end){const page=deferredHistoryPage();pages.push({begin,end,...page});return page.promise;}
  };
 }};
 return {client,pages};
}
test('LR-026: account switch between history pages skips further Supabase reads',async()=>{
 const h=historyPageClient();
 let ownsRequest=true;
 const pending=loadEclatHistory(h.client,'couple-a',()=>ownsRequest);
 assert.equal(h.pages.length,1);
 assert.deepEqual([h.pages[0].begin,h.pages[0].end],[0,999]);
 ownsRequest=false;
 h.pages[0].resolve({data:Array.from({length:1000},(_,i)=>({id:i})),error:null});
 const history=await pending;
 assert.equal(history,null,'a cancelled page must not expose partial private data');
 assert.equal(h.pages.length,1,'never query an old couple under the new login');
});
test('LR-026: invalidated account cannot start a paginated private-history read',async()=>{
 const h=historyPageClient();
 const rows=await loadEclatHistory(h.client,'couple-a',()=>false);
 assert.equal(rows,null);
 assert.equal(h.pages.length,0);
});
test('LR-026: account revoked while second history page is in flight yields no private rows',async()=>{
 const h=historyPageClient();
 let ownsRequest=true;
 const pending=loadEclatHistory(h.client,'couple-a',()=>ownsRequest);
 h.pages[0].resolve({data:Array.from({length:1000},(_,i)=>({id:i})),error:null});
 // Allow the first resolved await to advance to the next range.
 await Promise.resolve();
 assert.equal(h.pages.length,2);
 assert.deepEqual([h.pages[1].begin,h.pages[1].end],[1000,1999]);
 ownsRequest=false;
 h.pages[1].resolve({data:[{id:1000}],error:null});
 assert.equal(await pending,null);
});
test('LR-026: stale history authorization error is ignored after account switch',async()=>{
 const h=historyPageClient();
 let ownsRequest=true;
 const pending=loadEclatHistory(h.client,'couple-a',()=>ownsRequest);
 ownsRequest=false;
 h.pages[0].resolve({data:null,error:{status:403,code:'42501'}});
 assert.equal(await pending,null,'obsolete denial belongs only to the old session');
});
test('LR-026: still-authorized multipage history preserves all rows',async()=>{
 const h=historyPageClient();
 const pending=loadEclatHistory(h.client,'couple-a',()=>true);
 h.pages[0].resolve({data:Array.from({length:1000},(_,i)=>({id:i})),error:null});
 await Promise.resolve();
 assert.equal(h.pages.length,2);
 h.pages[1].resolve({data:[{id:1000}],error:null});
 const rows=await pending;
 assert.equal(rows.length,1001);
 assert.equal(rows.at(-1).id,1000);
});
