import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {eveningCalendarInitialDate} from './evening-calendar.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf("if(verb==='evening-month-prev'||verb==='evening-month-next'){");
const end=app.indexOf("if(verb==='evening-close-request'){",start);
assert.ok(start>0&&end>start,'actual production calendar actions are available');
const actionCode=app.slice(start,end);

function harness({rpc}={}){
 const state={user:{id:'alice'},coupleId:'duo-alice',tab:'evening-calendar',
  eveningCalendarMonth:'2026-10',eveningCalendarDate:'2026-10-15',
  calendarPassQuota:[{id:'old-quota'}],calendarPassMonth:'2026-10'};
 const calls={requests:[],renders:0,notices:[],warnings:[]};
 let generation=1;
 const scope={state,authFeedbackGeneration:generation,month:()=> '2026-10',
  eveningCalendarInitialDate,render:()=>calls.renders++,
  notify:message=>calls.notices.push(message),
  rpc:(method,args)=>{calls.requests.push({method,args});return rpc?.(method,args)??[];},
  console:{warn:(...args)=>calls.warnings.push(args)}
 };
 const action=runInNewContext(
  'let latestCalendarPassQuotaRequest=null;'+
  '(async (verb,parts=[])=>{'+actionCode+'})',scope);
 return {state,calls,scope,action,
  setLogin:(userId,coupleId)=>{state.user={id:userId};state.coupleId=coupleId;
   scope.authFeedbackGeneration++;}};
}
const deferred=()=>{let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
};

test('month navigation paints immediately and loads only its own optional quota',async()=>{
 const pending=deferred(),h=harness({rpc:()=>pending.promise});
 const task=h.action('evening-month-next');
 assert.equal(h.state.eveningCalendarMonth,'2026-11');
 assert.equal(h.state.eveningCalendarDate,'2026-11-01');
 assert.equal(h.calls.renders,1,'calendar should not wait for network');
 assert.deepEqual(h.calls.requests[0].args,
  {p_couple:'duo-alice',p_month:'2026-11'});
 pending.resolve([{id:'nov-quota'}]);await task;
 assert.equal(h.calls.renders,2);
 assert.equal(h.state.calendarPassMonth,'2026-11');
 assert.equal(h.state.calendarPassQuota[0].id,'nov-quota');
});
test('a stale previous month reply never overwrites the active month',async()=>{
 const november=deferred(),december=deferred();
 const h=harness({rpc:(_,args)=>args.p_month==='2026-11'?
  november.promise:december.promise});
 const first=h.action('evening-month-next');
 const second=h.action('evening-month-next');
 assert.equal(h.state.eveningCalendarMonth,'2026-12');
 december.resolve([{id:'december'}]);await second;
 november.resolve([{id:'obsolete-november'}]);await first;
 assert.equal(h.state.calendarPassMonth,'2026-12');
 assert.equal(h.state.calendarPassQuota[0].id,'december');
 assert.equal(h.calls.renders,3);
});
test('a delayed quota response or failure cannot repaint a new user',async()=>{
 const pending=deferred(),h=harness({rpc:()=>pending.promise});
 const task=h.action('evening-month-next');
 h.setLogin('bob','duo-bob');
 h.state.eveningCalendarMonth='2026-10';
 h.state.calendarPassMonth=null;
 pending.resolve([{id:'alice-private-quota'}]);await task;
 assert.equal(h.state.calendarPassMonth,null);
 assert.equal(h.state.calendarPassQuota.some(v=>v.id==='alice-private-quota'),false);
 assert.equal(h.calls.renders,1);
 assert.equal(h.calls.notices.length,0);
});
test('network failure does not block browsing the calendar',async()=>{
 const h=harness({rpc:()=>Promise.reject(Error('offline'))});
 await h.action('evening-month-prev');
 assert.equal(h.state.eveningCalendarMonth,'2026-09');
 assert.equal(h.state.eveningCalendarDate,'2026-09-01');
 assert.equal(h.state.calendarPassMonth,null);
 assert.equal(h.calls.renders,1);
 assert.equal(h.calls.notices.length,1);
});
test('calendar day selection refuses invalid dates, not just malformed months',async()=>{
 const h=harness();
 await assert.rejects(h.action('evening-date',['2026-10-32']),/Date de calendrier invalide/);
 await assert.rejects(h.action('evening-date',['2026-11-01']),/Date de calendrier invalide/);
 await h.action('evening-date',['2026-10-31']);
 assert.equal(h.state.eveningCalendarDate,'2026-10-31');
 assert.equal(eveningCalendarInitialDate({sessions:[],month:'2027-02',
  selectedDate:'2027-02-29'}),'2027-02-01');
});
