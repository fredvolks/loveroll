import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownsCoupleAsyncRead} from './evening-private-queue.mjs';

// Run the production Éclat background interval without modifying the app.
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf("setInterval(async()=>{\n if(document.hidden||state.tab!=='eclat'");
const end=app.indexOf('},4500);',start);
assert.ok(start>=0&&end>start,'real Éclat poll must remain available');
const statusBegin=app.indexOf('function applyEclatStatus(value){');
const statusEnd=app.indexOf('async function refreshEclatStatus(){',statusBegin);
const actionBegin=app.indexOf('// A user may switch accounts or leave Éclat',statusEnd);
assert.ok(statusBegin>=0&&statusEnd>statusBegin&&actionBegin>statusEnd,'real Éclat status handoff exists');
const source='let latestEclatHistoryRead=null,latestEclatStatusRead=null,latestEclatPollPending=null,latestEclatExplicitRead=null;\nlet latestEclatAudioOwner=null;\n'+
 app.slice(statusBegin,actionBegin)+'\n'+app.slice(start,end+8)+
 '\nfunction invalidateStatusRead(){latestEclatStatusRead={};}'+
 '\nfunction holdForegroundRead(){const request={};latestEclatStatusRead=request;'+
 'latestEclatExplicitRead={userId:state.user.id,coupleId:state.coupleId,'+
 'generation:authFeedbackGeneration,request,startedAt:Date.now()};return request;}'+
 '\nfunction releaseForegroundRead(request){if(latestEclatExplicitRead?.request===request)latestEclatExplicitRead=null;}';

function deferred(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {promise,resolve,reject};
}
function harness(){
 const state={user:{id:'alice'},coupleId:'couple-a',members:[{},{}],
  tab:'eclat',eclat:{id:'original',access:true}};
 const requests=[],renders=[],warnings=[],history=[];
 let tick=null,clock=0,audioStops=0;
 const runtime={
  state,authFeedbackGeneration:1,document:{hidden:false},Date:{now:()=>clock},
  eclatNoteDrafts:new Map(),eclatAudio:{stop:()=>{audioStops++;}},
  ownsCoupleAsyncRead,isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,
  rpc:name=>{
   assert.equal(name,'love_eclat_status');
   const task=deferred();requests.push(task);return task.promise;
  },
  refreshEclatHistory:async()=>{history.push(state.user?.id);},
  render:()=>renders.push(state.eclat?.id),
  console:{warn:(...args)=>warnings.push(args)},
  setInterval:(fn,ms)=>{assert.equal(ms,4500);tick=fn;}
 };
 runInNewContext(source,runtime);
 assert.equal(typeof tick,'function');
 return {state,runtime,requests,renders,warnings,history,audioStops:()=>audioStops,
  tick:()=>tick(),advance:ms=>{clock+=ms;},invalidate:()=>runtime.invalidateStatusRead(),hold:()=>runtime.holdForegroundRead(),release:req=>runtime.releaseForegroundRead(req)};
}

test('LR-026: late Éclat poll cannot repaint a new login for the same user',async()=>{
 const h=harness();
 const stale=h.tick();
 assert.equal(h.requests.length,1);
 h.runtime.authFeedbackGeneration=2;
 const current=h.tick();
 assert.equal(h.requests.length,2,'new login can immediately start another poll');
 h.requests[1].resolve({access:true,id:'current'});
 await current;
 h.requests[0].resolve({access:true,id:'old-private-result'});
 await stale;
 assert.equal(h.state.eclat.id,'current');
 assert.deepEqual(h.history,['alice']);
 assert.deepEqual(h.renders,['current']);
});

test('LR-026: repeated Éclat ticks reuse one pending server read per session',async()=>{
 const h=harness();
 const first=h.tick();
 await h.tick();
 await h.tick();
 assert.equal(h.requests.length,1,'the 4.5s poll must not pile up pending requests');
 h.requests[0].resolve({access:true,id:'first'});
 await first;
 const second=h.tick();
 assert.equal(h.requests.length,2,'a completed request permits the next poll');
 h.requests[1].resolve({access:true,id:'second'});
 await second;
 assert.deepEqual(h.renders,['first','second']);
});

test('LR-026: a stalled Éclat poll retries after 30 seconds and rejects the old reply',async()=>{
 const h=harness();
 const first=h.tick();
 h.advance(29999);
 await h.tick();
 assert.equal(h.requests.length,1,'short stalls remain single-flight');
 h.advance(1);
 const replacement=h.tick();
 assert.equal(h.requests.length,2,'an overdue request cannot freeze synchronization');
 h.requests[1].resolve({access:true,id:'replacement'});
 await replacement;
 h.requests[0].resolve({access:true,id:'stale'});
 await first;
 assert.equal(h.state.eclat.id,'replacement');
 assert.deepEqual(h.renders,['replacement']);
 assert.deepEqual(h.history,['alice']);
});

test('LR-026: identical Éclat status skips private history reads and redraws',async()=>{
 const h=harness();
 const poll=h.tick();
 h.requests[0].resolve({id:'original',access:true});
 await poll;
 assert.deepEqual(h.history,[]);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: old account or couple never receives private Éclat data',async()=>{
 for(const change of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.user=null;},
  h=>{h.state.coupleId='couple-b';},
  h=>{h.state.tab='home';}
 ]){
  const h=harness();
  const pending=h.tick();
  change(h);
  h.requests[0].resolve({access:true,id:'alice-private'});
  await pending;
  assert.equal(h.state.eclat.id,'original');
  assert.equal(h.renders.length,0);
  assert.equal(h.history.length,0);
 }
});

test('LR-026: stale network errors do not notify a reauthenticated user',async()=>{
 const h=harness(),pending=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.requests[0].reject(new Error('previous session network'));
 await pending;
 assert.equal(h.warnings.length,0);
 assert.equal(h.renders.length,0);
});

test('LR-026: Éclat poll ignores replies after couple membership disappears',async()=>{
 const h=harness(),pending=h.tick();
 h.state.members=[{id:'alice'}];
 h.requests[0].resolve({access:true,id:'no-longer-authorized'});
 await pending;
 assert.equal(h.state.eclat.id,'original');
 assert.equal(h.renders.length,0);
 assert.equal(h.history.length,0);
});

test('LR-026: hidden Éclat tab never paints a pending status update',async()=>{
 const h=harness(),pending=h.tick();
 h.runtime.document.hidden=true;
 h.requests[0].resolve({access:true,id:'background-only'});
 await pending;
 assert.equal(h.state.eclat.id,'original');
 assert.equal(h.renders.length,0);
});

test('LR-026: failed Éclat poll releases the single-flight slot for retry',async()=>{
 const h=harness();
 const failing=h.tick();
 await h.tick();
 assert.equal(h.requests.length,1);
 h.requests[0].reject(new Error('connection unavailable'));
 await failing;
 assert.equal(h.warnings.length,1,'current network failures remain observable');
 const retry=h.tick();
 assert.equal(h.requests.length,2,'a failed read must not block further sync');
 h.requests[1].resolve({access:true,id:'recovered'});
 await retry;
 assert.equal(h.state.eclat.id,'recovered');
 assert.deepEqual(h.renders,['recovered']);
});

test('LR-026: explicit status refresh can supersede an unresolved background poll',async()=>{
 const h=harness();
 const background=h.tick();
 // An explicit refresh owns the status token, so a newer poll may resume.
 h.invalidate();
 const foreground=h.tick();
 assert.equal(h.requests.length,2);
 h.requests[1].resolve({access:true,id:'foreground'});
 await foreground;
 h.requests[0].resolve({access:true,id:'obsolete-background'});
 await background;
 assert.equal(h.state.eclat.id,'foreground');
 assert.deepEqual(h.renders,['foreground']);
});

test('LR-026: the automatic Éclat poll does not supersede a pending foreground refresh',async()=>{
 const h=harness();
 const request=h.hold();
 await h.tick();
 h.advance(29999);
 await h.tick();
 assert.equal(h.requests.length,0,
  'a user-triggered refresh retains priority until it completes or expires');
 h.release(request);
 const background=h.tick();
 assert.equal(h.requests.length,1,'background polling resumes after foreground completes');
 h.requests[0].resolve({access:true,id:'background'});
 await background;
 assert.equal(h.state.eclat.id,'background');
});

test('LR-026: stalled foreground refresh does not disable Éclat polling permanently',async()=>{
 const h=harness();
 h.hold();
 h.advance(30000);
 const background=h.tick();
 assert.equal(h.requests.length,1,'background may retry after the 30-second deadline');
 h.requests[0].resolve({access:true,id:'retry'});
 await background;
 assert.equal(h.state.eclat.id,'retry');
});

test('LR-026: a previous login foreground refresh cannot block the current login',async()=>{
 const h=harness();
 h.hold();
 h.runtime.authFeedbackGeneration=2;
 const background=h.tick();
 assert.equal(h.requests.length,1);
 h.requests[0].resolve({access:true,id:'new-session'});
 await background;
 assert.equal(h.state.eclat.id,'new-session');
});

test('LR-026: missing background Éclat status clears cached private history',async()=>{
 const h=harness();
 h.state.eclat={active:true,id:'previous-coffret'};
 h.state.eclatHistory=[{id:'old-private-history'}];
 h.state.eclatHistoryError=true;
 const pending=h.tick();
 h.requests[0].resolve(null);
 await pending;
 assert.equal(h.state.eclat,null,'old Éclat session must not remain visible');
 assert.deepEqual(Array.from(h.state.eclatHistory),[],
  'background refresh must clear the same private history as foreground');
 assert.equal(h.state.eclatHistoryError,false);
 assert.deepEqual(h.history,[],'null status must not launch a new history request');
 assert.deepEqual(h.renders,[undefined],'Éclat must redraw after old session disappears');
});

test('LR-026: stale background null cannot erase a newer account history',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'alice-private'}];
 const pending=h.tick();
 h.state.user={id:'bob'};
 h.state.eclat={id:'bob'};
 h.state.eclatHistory=[{id:'bob-private'}];
 h.requests[0].resolve(null);
 await pending;
 assert.equal(h.state.eclat.id,'bob');
 assert.deepEqual(h.state.eclatHistory,[{id:'bob-private'}]);
 assert.deepEqual(h.renders,[]);
});


test('LR-026: background access revocation drops cached history without another fetch',async()=>{
 const h=harness();
 h.state.eclat={id:'private-session',access:true,active:true};
 h.state.eclatHistory=[{id:'old-private-history'}];
 h.state.eclatHistoryError=true;
 const ticking=h.tick();
 h.requests[0].resolve({access:true,id:'no-entitlement',access:false,active:false});
 await ticking;
 assert.equal(h.state.eclat?.id,'no-entitlement');
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatHistoryError,false);
 assert.deepEqual(h.history,[],'revoked status must not load private history');
 assert.deepEqual(h.renders,['no-entitlement']);
});

test('LR-026: background access revocation cannot erase a newly signed-in account',async()=>{
 const h=harness();
 h.state.eclat={id:'alice-session',access:true,active:true};
 const previous=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclat={id:'new-login',access:true,active:true};
 h.state.eclatHistory=[{id:'new-private-history'}];
 h.requests[0].resolve({access:false,active:false});
 await previous;
 assert.equal(h.state.eclat.id,'new-login');
 assert.deepEqual(h.state.eclatHistory,[{id:'new-private-history'}]);
 assert.deepEqual(h.renders,[]);
});


test('LR-026: denied background status erases cached drafts and completion',async()=>{
 const h=harness();
 h.state.eclat={access:true,active:true,id:'active'};
 h.state.eclatFinished='Private ending';
 h.runtime.eclatNoteDrafts.set('private',{note:'Former member note'});
 const tick=h.tick();
 h.requests[0].resolve({access:false,active:false});
 await tick;
 assert.equal(h.runtime.eclatNoteDrafts.size,0);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclat.access,false);
});

test('LR-026: stale denied background response preserves new login drafts',async()=>{
 const h=harness();
 const tick=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.runtime.eclatNoteDrafts.set('new-session',{note:'New draft'});
 h.state.eclatFinished='New ending';
 h.requests[0].resolve({access:false,active:false});
 await tick;
 assert.equal(h.runtime.eclatNoteDrafts.get('new-session').note,'New draft');
 assert.equal(h.state.eclatFinished,'New ending');
});


test('LR-026: background entitlement revocation immediately silences Éclat audio',async()=>{
 const h=harness();
 h.state.eclat={access:true,active:true,id:'private'};
 h.state.eclatMusic=true;
 const pending=h.tick();
 h.requests[0].resolve({access:false,active:false,id:'revoked'});
 await pending;
 assert.equal(h.audioStops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.deepEqual(h.renders,['revoked']);
});

test('LR-026: obsolete background revocation cannot stop newer login music',async()=>{
 const h=harness();
 const previous=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclatMusic=true;
 h.requests[0].resolve({access:false,active:false,id:'old'});
 await previous;
 assert.equal(h.audioStops(),0);
 assert.equal(h.state.eclatMusic,true);
});


test('LR-026: background normal completion stops music but retains authorized history',async()=>{
 const h=harness();
 h.state.eclat={id:'playing',access:true,active:true};
 h.state.eclatMusic=true;
 h.state.eclatHistory=[{id:'prior-activity'}];
 h.runtime.eclatNoteDrafts.set('private',{note:'Keep until session changes'});
 const pending=h.tick();
 h.requests[0].resolve({access:true,id:'finished',access:true,active:false});
 await pending;
 assert.equal(h.audioStops(),1);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.runtime.eclatNoteDrafts.get('private').note,
  'Keep until session changes');
 assert.deepEqual(h.history,['alice'],'authorized history still refreshes');
 assert.deepEqual(h.renders,['finished']);
});

test('LR-026: stale background completion cannot silence new login music',async()=>{
 const h=harness();
 h.state.eclat={id:'previous',access:true,active:true};
 const pending=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclatMusic=true;
 h.requests[0].resolve({access:true,id:'old-completion',access:true,active:false});
 await pending;
 assert.equal(h.audioStops(),0);
 assert.equal(h.state.eclatMusic,true);
 assert.deepEqual(h.renders,[]);
});


test('LR-026: partner starting another coffret clears former completion on poll',async()=>{
 const h=harness();
 h.state.eclat={id:'previous-finished',access:true,active:false};
 h.state.eclatFinished='Former coffret ending';
 const refreshing=h.tick();
 h.requests[0].resolve({access:true,id:'partner-new-session',access:true,active:true});
 await refreshing;
 assert.equal(h.state.eclat?.id,'partner-new-session');
 assert.equal(h.state.eclatFinished,null);
 assert.deepEqual(h.renders,['partner-new-session']);
 assert.deepEqual(h.history,['alice'],'new authorized session refreshes history');
});

test('LR-026: obsolete background activation cannot clear the new login ending',async()=>{
 const h=harness();
 h.state.eclat={id:'previous-finished',access:true,active:false};
 const refreshing=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclatFinished='Only new login ending';
 h.requests[0].resolve({access:true,id:'old-account-new-session',access:true,active:true});
 await refreshing;
 assert.equal(h.state.eclatFinished,'Only new login ending');
 assert.deepEqual(h.renders,[]);
});


test('LR-026: incomplete background permission purges cached notes and stops music',async()=>{
 const h=harness();
 h.state.eclat={id:'old',access:true,active:true};
 h.state.eclatHistory=[{id:'old-private'}];
 h.state.eclatFinished='Old completion';
 h.state.eclatMusic=true;
 h.runtime.eclatNoteDrafts.set('old',{note:'Old secret'});
 const request=h.tick();
 h.requests[0].resolve({id:'incomplete',active:true});
 await request;
 assert.equal(h.state.eclat.id,'incomplete');
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.runtime.eclatNoteDrafts.size,0);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.history,[]);
 assert.deepEqual(h.renders,['incomplete']);
});

test('LR-026: stale incomplete background response cannot purge new login cache',async()=>{
 const h=harness();
 const request=h.tick();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclat={id:'new-login',access:true,active:true};
 h.state.eclatMusic=true;
 h.state.eclatHistory=[{id:'new-private'}];
 h.requests[0].resolve({id:'obsolete',active:true});
 await request;
 assert.equal(h.state.eclat.id,'new-login');
 assert.equal(h.state.eclatMusic,true);
 assert.deepEqual(h.state.eclatHistory,[{id:'new-private'}]);
 assert.equal(h.audioStops(),0);
});


test('LR-026: reordered server status fields do not trigger redundant history refresh',async()=>{
 const h=harness();
 h.state.eclat={id:'original',access:true,active:true};
 const poll=h.tick();
 h.requests[0].resolve({active:true,access:true,id:'original'});
 await poll;
 assert.deepEqual(h.history,[],'same status must not trigger a gallery fetch');
 assert.deepEqual(h.renders,[],'same status must not repaint the view');
 assert.equal(h.state.eclat.id,'original');
});

test('LR-026: nested server status field ordering is also ignored',async()=>{
 const h=harness();
 h.state.eclat={id:'original',access:true,active:true,
  progress:{chapter_index:1,chapter_total:6},choices:[{id:1,selected:false}]};
 const poll=h.tick();
 h.requests[0].resolve({choices:[{selected:false,id:1}],
  progress:{chapter_total:6,chapter_index:1},active:true,access:true,id:'original'});
 await poll;
 assert.deepEqual(h.history,[]);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: actual status change still reloads authorized history once',async()=>{
 const h=harness();
 h.state.eclat={id:'original',access:true,active:true};
 const poll=h.tick();
 h.requests[0].resolve({active:true,access:true,id:'changed'});
 await poll;
 assert.equal(h.state.eclat.id,'changed');
 assert.deepEqual(h.history,['alice']);
 assert.deepEqual(h.renders,['changed']);
});

test('LR-026: reordered status with revoked entitlement still clears private state',async()=>{
 const h=harness();
 h.state.eclat={id:'original',access:true,active:true};
 h.state.eclatHistory=[{id:'previous-private'}];
 h.state.eclatMusic=true;
 const poll=h.tick();
 h.requests[0].resolve({active:true,id:'original',access:false});
 await poll;
 assert.equal(h.state.eclat.access,false);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.history,[]);
});

test('LR-026: confirmed Auth 401 response purges private Éclat cache',async()=>{
 const h=harness();
 h.state.eclat={id:'restricted-session',access:true,active:true};
 h.state.eclatHistory=[{id:'private-photo'}];
 h.state.eclatFinished={id:'private-ending'};
 h.state.eclatMusic=true;
 const pending=h.tick();
 h.requests[0].reject({status:401,code:'auth_denied'});
 await pending;
 assert.equal(h.state.eclat,null,'rejected Auth must revoke the local entitlement receipt');
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatFinished,null);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.history,[]); 
 assert.deepEqual(h.renders,[undefined],'the now-locked screen must repaint');
 assert.equal(h.warnings.length,1);
});

test('LR-026: PostgREST expired-JWT rejection also revokes local Éclat access',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'former-private'}];
 const pending=h.tick();
 h.requests[0].reject({code:'PGRST301',message:'JWT expired'});
 await pending;
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.deepEqual(h.renders,[undefined]);
});

test('LR-026: a stale auth rejection cannot erase a replacement login',async()=>{
 const h=harness();
 const oldPoll=h.tick();
 h.runtime.authFeedbackGeneration=2;
 const newPoll=h.tick();
 h.requests[1].resolve({id:'new-private-session',access:true});
 await newPoll;
 h.state.eclatHistory=[{id:'new-private'}];
 h.state.eclatMusic=true;
 h.requests[0].reject({status:401,code:'PGRST301'});
 await oldPoll;
 assert.equal(h.state.eclat.id,'new-private-session');
 assert.deepEqual(h.state.eclatHistory,[{id:'new-private'}]);
 assert.equal(h.state.eclatMusic,true);
 assert.equal(h.audioStops(),0);
 assert.deepEqual(h.renders,['new-private-session']);
 assert.equal(h.warnings.length,0);
});

test('LR-026: temporary network failures do not erase valid cached Éclat access',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'authorized-photo'}];
 h.state.eclatMusic=true;
 const pending=h.tick();
 h.requests[0].reject(new Error('temporarily offline'));
 await pending;
 assert.equal(h.state.eclat.id,'original');
 assert.deepEqual(h.state.eclatHistory,[{id:'authorized-photo'}]);
 assert.equal(h.state.eclatMusic,true);
 assert.equal(h.audioStops(),0);
 assert.deepEqual(h.renders,[]);
 assert.equal(h.warnings.length,1);
});

test('LR-026: foreground Auth rejection clears Éclat history and keeps the error visible',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'private-coffret'}];
 h.state.eclatMusic=true;
 const pending=h.runtime.refreshEclatStatus();
 assert.equal(h.requests.length,1);
 const rejection=new Error('Auth required');
 rejection.status=401;
 h.requests[0].reject(rejection);
 await assert.rejects(pending,(/Auth required/));
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.renders,[undefined]);
});

test('LR-026: obsolete foreground Auth denial cannot revoke the new login',async()=>{
 const h=harness();
 const pending=h.runtime.refreshEclatStatus();
 h.runtime.authFeedbackGeneration=2;
 h.state.eclat={id:'new-session',access:true,active:true};
 h.state.eclatHistory=[{id:'new-photo'}];
 const rejection=new Error('stale Auth failure');rejection.status=401;
 h.requests[0].reject(rejection);
 await assert.rejects(pending,(/stale Auth failure/));
 assert.equal(h.state.eclat.id,'new-session');
 assert.deepEqual(h.state.eclatHistory,[{id:'new-photo'}]);
 assert.deepEqual(h.renders,[]);
 assert.equal(h.audioStops(),0);
});

test('LR-026: foreground offline error keeps authorized Éclat state for a retry',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'valid-photo'}];
 const pending=h.runtime.refreshEclatStatus();
 h.requests[0].reject(new Error('offline'));
 await assert.rejects(pending,(/offline/));
 assert.equal(h.state.eclat.id,'original');
 assert.deepEqual(h.state.eclatHistory,[{id:'valid-photo'}]);
 assert.deepEqual(h.renders,[]);
});

test('LR-026: a 403 access denial clears private Éclat state',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'private-gallery'}];
 h.state.eclatMusic=true;
 const pending=h.tick();
 h.requests[0].reject({status:403,code:'42501'});
 await pending;
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.equal(h.state.eclatMusic,false);
 assert.equal(h.audioStops(),1);
 assert.deepEqual(h.renders,[undefined]);
});

test('LR-026: string HTTP authorization status is also treated as a denial',async()=>{
 for(const status of ['401','403']){
  const h=harness();
  h.state.eclatHistory=[{id:'private-gallery'}];
  const pending=h.tick();
  h.requests[0].reject({status});
  await pending;
  assert.equal(h.state.eclat,null);
  assert.deepEqual(Array.from(h.state.eclatHistory),[]);
  assert.deepEqual(h.renders,[undefined]);
 }
});

test('LR-026: obsolete 403 denial does not clear the replacement login',async()=>{
 const h=harness();
 const old=h.tick();
 h.runtime.authFeedbackGeneration=2;
 const next=h.tick();
 h.requests[1].resolve({id:'new-session',access:true});
 await next;
 h.state.eclatHistory=[{id:'new-gallery'}];
 h.requests[0].reject({status:403});
 await old;
 assert.equal(h.state.eclat.id,'new-session');
 assert.deepEqual(h.state.eclatHistory,[{id:'new-gallery'}]);
 assert.deepEqual(h.renders,['new-session']);
});

test('LR-026: foreground 403 denial also clears private Éclat state',async()=>{
 const h=harness();
 h.state.eclatHistory=[{id:'private-gallery'}];
 const pending=h.runtime.refreshEclatStatus();
 const rejection=Object.assign(new Error('access denied'),{status:403});
 h.requests[0].reject(rejection);
 await assert.rejects(pending,/access denied/);
 assert.equal(h.state.eclat,null);
 assert.deepEqual(Array.from(h.state.eclatHistory),[]);
 assert.deepEqual(h.renders,[undefined]);
});
