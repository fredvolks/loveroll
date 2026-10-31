import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {validEveningReview} from './evening-review.mjs';
import {eveningLocalDay} from './evening-calendar.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf("if(verb==='review-save'){");
const end=app.indexOf("if(verb==='evening-more'){",start);
assert.ok(start>0&&end>start,'production review-save action must exist');
const saveCode=app.slice(start,end);

function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
function harness(rpcResponse){
 const sessionId='night-1',state={
  user:{id:'alice'},coupleId:'duo-alice',tab:'session',
  sessions:[null,{id:sessionId,started_at:'2026-10-16T19:00:00Z',
   finished_at:'2026-10-16T21:00:00Z',counted:true}],
  reviewSaving:false,reviewModalSessionId:sessionId,
  reviewDraft:{overall:5,connection:4,appreciation:5,again:5,comment:'Original'},
  reviewDismissedSessionId:null,eveningCalendarMonth:null,eveningCalendarDate:null
 };
 const error={hidden:true,textContent:''};
 const button={disabled:false,textContent:'Sauvegarder',isConnected:true};
 const calls={refresh:0,writes:[],errors:[]};
 const scope={state,authFeedbackGeneration:1,validEveningReview,eveningLocalDay,
  root:{querySelector:selector=>selector==='#lr-review-comment'?{value:'Mon bilan'}:
    selector==='.lr-review-error'?error:selector==='.lr-review-save'?button:null},
  rpc:(method,args)=>{calls.writes.push({method,args});return rpcResponse();},
  month:()=> '2026-10',today:()=> '2026-10-16',
  refreshAndShow:async()=>{calls.refresh++;}
 };
 const execute=runInNewContext('let currentReviewSaveRequest=null;'+
  '(async verb=>{'+saveCode+'})',scope);
 return {execute:()=>execute('review-save'),state,scope,error,button,calls};
}
test('review save navigates only after the authoritative save resolves',async()=>{
 const pending=deferred(),h=harness(()=>pending.promise);
 const work=h.execute();
 assert.equal(h.state.reviewSaving,true);
 assert.equal(h.calls.refresh,0);
 assert.equal(h.calls.writes[0].args.p_session,'night-1');
 pending.resolve(null);await work;
 assert.equal(h.state.tab,'evening-calendar');
 assert.equal(h.state.reviewModalSessionId,null);
 assert.equal(h.state.eveningCalendarDate,'2026-10-16');
 assert.equal(h.state.reviewSaving,false);
 assert.equal(h.calls.refresh,1);
});
test('old review response cannot overwrite a newly authenticated player',async()=>{
 const pending=deferred(),h=harness(()=>pending.promise);
 const work=h.execute();
 h.state.user={id:'bob'};
 h.state.coupleId='duo-bob';
 h.state.reviewModalSessionId=null;
 h.state.reviewSaving=false;
 h.scope.authFeedbackGeneration++;
 pending.resolve(null);await work;
 assert.equal(h.state.tab,'session');
 assert.equal(h.state.eveningCalendarDate,null);
 assert.equal(h.calls.refresh,0);
 assert.equal(h.state.reviewDismissedSessionId,null);
});
test('closing the review while a network write is pending never reopens its calendar',async()=>{
 const pending=deferred(),h=harness(()=>pending.promise);
 const work=h.execute();
 h.state.reviewModalSessionId=null;
 pending.resolve(null);await work;
 assert.equal(h.calls.refresh,0);
 assert.equal(h.state.tab,'session');
 assert.equal(h.state.reviewSaving,false);
});
test('failed save shows an error only if the original modal still owns the write',async()=>{
 const pending=deferred(),h=harness(()=>pending.promise);
 const work=h.execute();
 pending.reject(Error('réseau indisponible'));await work;
 assert.match(h.error.textContent,/réseau indisponible/);
 assert.equal(h.state.reviewSaving,false);
 const late=deferred(),next=harness(()=>late.promise);
 const old=next.execute();
 next.state.user={id:'bob'};
 next.scope.authFeedbackGeneration++;
 late.reject(Error('old private error'));await old;
 assert.equal(next.error.textContent,'');
 assert.equal(next.calls.refresh,0);
});
