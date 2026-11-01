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
 assert.equal(h.calls.requests[0].args.p_couple,'duo-alice');
 assert.equal(h.calls.requests[0].args.p_month,'2026-11');
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

function calendarOpenHarness(tab='home',closedToday=null){
 const from=app.indexOf("if(verb==='evening-calendar'){");
 const to=app.indexOf("if(verb==='evening-month-prev'",from);
 assert.ok(from>=0&&to>from,'The actual calendar action is extractable');
 const state={tab,session:{id:'older',started_at:'2026-09-14T18:00:00Z'},
  eveningCalendarMonth:'2026-09',eveningCalendarDate:'2026-09-14',
  eveningMore:true,confirmCancel:true,diceStatus:null,
  weekly:{face:2,key:'2026-10-26'},sessions:closedToday?[closedToday]:[]};
 let redraw=false,gift=false,renders=0;
 const context={state,month:()=> '2026-10',today:()=> '2026-10-31',
  eveningDailyAccess:()=>({closedToday}),
  eveningLocalDay:stamp=>stamp==='2026-10-31T20:00:00Z'?'2026-10-31':'2026-09-14',
  isActiveEveningRedrawPending:()=>redraw,
  isActiveEveningGiftPending:()=>gift,
  render:()=>{renders++;}};
 const open=runInNewContext('(async (verb,parts=[])=>{'+app.slice(from,to)+'})',context);
 const backFrom=app.indexOf('function eveningCalendarReturn(){');
 const backTo=app.indexOf('function renderEveningCalendar(){',backFrom);
 const goBack=runInNewContext(app.slice(backFrom,backTo)+'; eveningCalendarReturn',Object.assign(context,{
  isSharedCoupleReady:()=>true
 }));
 return {state,open,goBack,renderCount:()=>renders,
  setBusy:(kind)=>{if(kind==='dice')state.diceStatus='rolling';
   if(kind==='redraw')redraw=true;if(kind==='gift')gift=true;}};
}

test('LR-ACCUEIL-001: Home monthly shortcut opens October instead of an old session',async()=>{
 const h=calendarOpenHarness('home');
 await h.open('evening-calendar',['month']);
 assert.equal(h.state.tab,'evening-calendar');
 assert.equal(h.state.eveningCalendarMonth,'2026-10');
 assert.equal(h.state.eveningCalendarDate,'2026-10-01');
 assert.equal(h.state.eveningCalendarBack,'tab:home');
 assert.equal(h.goBack(),'tab:home');
 assert.equal(h.renderCount(),1);
 assert.equal(h.state.eveningMore,false);
});

test('LR-ACCUEIL-001: completed evening shortcut from Home never restores a stale calendar month',async()=>{
 const h=calendarOpenHarness('home');
 await h.open('evening-calendar',[]);
 assert.equal(h.state.eveningCalendarMonth,'2026-10');
 assert.equal(h.state.eveningCalendarDate,'2026-10-01');
 assert.equal(h.state.eveningCalendarBack,'tab:home');
 assert.equal(h.goBack(),'tab:home');
 assert.equal(h.renderCount(),1);
});

test('LR-ACCUEIL-001: Home finished-today action selects server-closed day without a dice roll',async()=>{
 const h=calendarOpenHarness('home',{id:'night',finished_at:'2026-10-31T20:00:00Z',counted:true});
 await h.open('evening-calendar',['today']);
 assert.equal(h.state.eveningCalendarMonth,'2026-10');
 assert.equal(h.state.eveningCalendarDate,'2026-10-31');
 assert.equal(h.goBack(),'tab:home');
 assert.equal(h.renderCount(),1);
});

test('LR-ACCUEIL-001: stale completed-today shortcut falls back when closure disappears',async()=>{
 const h=calendarOpenHarness('home',null);
 await h.open('evening-calendar',['today']);
 assert.equal(h.state.eveningCalendarMonth,'2026-10');
 assert.equal(h.state.eveningCalendarDate,'2026-10-31');
 assert.equal(h.goBack(),'tab:home');
 assert.equal(h.renderCount(),1);
});

test('LR-ACCUEIL-001: other calendar entry keeps the existing session context',async()=>{
 const h=calendarOpenHarness('session');
 await h.open('evening-calendar',[]);
 assert.equal(h.state.eveningCalendarMonth,'2026-09');
 assert.equal(h.state.eveningCalendarDate,'2026-09-14');
 assert.equal(h.goBack(),'tab:session');
 const settings=calendarOpenHarness('settings');
 await settings.open('evening-calendar',['settings']);
 assert.equal(settings.goBack(),'settings-page:confidentialite');
});

test('LR-ACCUEIL-001: official weekly Home D6 cannot be interrupted by monthly shortcut',async()=>{
 const h=calendarOpenHarness('home');
 h.setBusy('dice');
 await h.open('evening-calendar',['month']);
 assert.equal(h.state.tab,'home');
 assert.equal(h.state.eveningCalendarMonth,'2026-09');
 assert.equal(h.renderCount(),0);
});

test('LR-ACCUEIL-001: an official dice, redraw or gift blocks calendar navigation',async()=>{
 for(const busy of ['dice','redraw','gift']){
  const h=calendarOpenHarness('session');h.setBusy(busy);
  await h.open('evening-calendar',['month']);
  assert.equal(h.state.tab,'session');
  assert.equal(h.renderCount(),0);
  assert.equal(h.state.eveningCalendarMonth,'2026-09');
 }
});
