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
