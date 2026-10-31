import test from 'node:test';
import assert from 'node:assert/strict';
import {eveningInviteHtml,eveningInviteInboxHtml,isEveningInviteAction,eveningInviteChanged} from './evening-invitation.mjs';
test('discreet invite only offered when verified server says available',()=>{
 assert.equal(eveningInviteHtml({state:'none',available:false}),'');
 assert.equal(eveningInviteHtml(null),'');
 assert.equal(eveningInviteHtml({state:'obsolete',direction:'received'}),'');
 assert.equal(eveningInviteHtml({state:'obsolete',direction:'sent'}),'');
 const html=eveningInviteHtml({state:'none',available:true});
 assert.match(html,/As-tu envie de jouer ce soir/);
 assert.match(html,/data-action="evening-invite:send"/);
 assert.doesNotMatch(html,/my-d6|roll_my_evening_d6|new-session/);
});
test('incoming private invitation allows real yes/no/maybe/ignore, no dice automation',()=>{
 const html=eveningInviteHtml({state:'pending',direction:'received',id:'123'},{partnerName:'Alex'});
 assert.match(html,/Alex a envie de jouer ce soir/);
 for(const answer of ['yes','no','maybe','ignored'])
  assert.ok(html.includes('evening-invite:'+answer));
 assert.doesNotMatch(html,/roll_my_evening_d6|ensure_couple_session/);
 const maybe=eveningInviteHtml({state:'maybe',direction:'received'});
 assert.match(maybe,/evening-invite:yes/);
 assert.doesNotMatch(maybe,/evening-invite:maybe/);
});
test('escaping names and user feedback, no direct card text in invitation',()=>{
 const html=eveningInviteHtml({state:'pending',direction:'received'},
  {partnerName:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
});
test('sender sees polite response states with no resend button',()=>{
 for(const status of ['pending','yes','no','maybe','expired','ignored']){
  const html=eveningInviteHtml({state:status,direction:'sent'},{partnerName:'Alex'});
  assert.ok(html.includes('lr-evening-invite'));
  assert.doesNotMatch(html,/evening-invite:send/);
 }
});
test('Accueil displays an in-app invitation even with Push disabled',()=>{
 assert.equal(eveningInviteInboxHtml(null),'');
 for(const status of ['none','no','yes','ignored','obsolete','expired'])
  assert.equal(eveningInviteInboxHtml({state:status,direction:'received'}),'');
 assert.equal(eveningInviteInboxHtml({state:'pending',direction:'sent'}),'');
 const noId=eveningInviteInboxHtml({state:'pending',direction:'received'},
  {partnerName:'<script>Intrus</script>'});
 assert.match(noId,/data-action="tab:session"/);
 assert.match(noId,/&lt;script&gt;Intrus/);
 assert.match(noId,/Répondre/);
 assert.doesNotMatch(noId,/<script>|roll_my_evening_d6|evening-invite:yes/);
 // Immediate acceptance is shown ONLY when the server provided a real
 // received invitation ID; we never generate an invitation from the UI.
 const html=eveningInviteInboxHtml({state:'pending',direction:'received',id:'abc'},
  {partnerName:'Alex'});
 assert.match(html,/data-action="evening-invite:yes"/);
 assert.match(html,/data-action="tab:session"/);
 assert.match(html,/Autres choix/);
 assert.match(html,/aria-label="Accepter l’invitation/);
 assert.doesNotMatch(html,/roll_my_evening_d6|roll_couple_once|ensure_couple_session/);
 const maybe=eveningInviteInboxHtml({state:'maybe',direction:'received',id:'def'},
  {partnerName:'Alex'});
 assert.match(maybe,/Toujours partant/);
 assert.match(maybe,/Alex a envie de jouer ce soir/);
 assert.match(maybe,/data-action="evening-invite:yes"/);
 const responseStates=['no','yes','expired','ignored','obsolete','none'];
 for(const state of responseStates)
  assert.equal(eveningInviteInboxHtml({state,direction:'received',id:'z'}),'');
 assert.equal(eveningInviteInboxHtml({state:'pending',direction:'sent',id:'z'}),'');
 assert.equal(eveningInviteInboxHtml({state:'pending',direction:'received',id:null}).includes('evening-invite:yes'),false);
});
test('status changes only when official invitation read changes',()=>{
 assert.equal(eveningInviteChanged({state:'pending',id:'a'},{state:'yes',id:'a'}),true);
 assert.equal(eveningInviteChanged({state:'none',available:false},{state:'none',available:true}),true);
 assert.equal(eveningInviteChanged({state:'yes',id:'a'},{state:'yes',id:'a'}),false);
 assert.equal(isEveningInviteAction('send'),true);
 assert.equal(isEveningInviteAction('roll'),false);
});

test('Real invitation response stays owned by its account through server setup and refresh',async()=>{
 const {readFileSync}=await import('node:fs');
 const {runInNewContext}=await import('node:vm');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf("if(verb==='evening-invite'){");
 const end=app.indexOf("if(verb==='account-test'){",start);
 assert.ok(start>=0&&end>start);
 const route=app.slice(start,end);
 const deferred=()=>{
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  return {promise,resolve,reject};
 };
 const make=(answer='yes')=>{
  const state={user:{id:'alice'},coupleId:'duo-a',
   members:[{user_id:'alice'},{user_id:'partner'}],
   session:null,tab:'home',diceStatus:null,eveningInviteBusy:false,
   eveningInvite:{id:'invite-a',state:'pending',direction:'received',available:true}};
  const events=[],response=deferred(),setup=deferred(),refresh=deferred();
  const element={isConnected:true,disabled:false,
   setAttribute:(name,value)=>events.push('set:'+name+':'+value),
   removeAttribute:name=>events.push('remove:'+name)};
  const scope={state,parts:[answer],element,authFeedbackGeneration:2,
   currentEveningInviteRequest:null,
   isEveningInviteAction,isSharedCoupleReady:()=>true,
   rpc:(method,args)=>{
    events.push(method+':'+(args?.p_invitation||args?.p_couple));
    if(method==='love_evening_invite_respond'||method==='love_evening_invite_send')
     return response.promise;
    if(method==='ensure_couple_session')return setup.promise;
    throw Error('Unexpected RPC '+method);
   },
   refreshShared:()=>{events.push('refresh');return refresh.promise;},
   render:()=>events.push('render'),showInlineError:()=>events.push('message')
  };
  const execute=runInNewContext('(async verb=>{'+route+'})',scope);
  const start=()=>execute('evening-invite');
  const switchTo=(name='bob')=>{
   state.user={id:name};state.coupleId='duo-b';
   state.eveningInviteBusy=false;scope.authFeedbackGeneration++;
  };
  return {state,scope,events,element,response,setup,refresh,start,switchTo};
 };
 const normal=make(),work=normal.start();
 assert.equal(normal.state.eveningInviteBusy,true);
 assert.equal(normal.element.disabled,true);
 assert.ok(normal.events.includes('love_evening_invite_respond:invite-a'));
 normal.response.resolve({status:'yes'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(normal.events.includes('ensure_couple_session:duo-a'));
 assert.equal(normal.state.tab,'home','Do not navigate before server setup');
 normal.setup.resolve({id:'night-a'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(normal.state.tab,'home',
  'An accepted invite must keep Accueil visible until its server refresh completes');
 assert.equal(normal.state.eveningInviteBusy,true);
 normal.refresh.resolve();
 await work;
 assert.equal(normal.state.tab,'session');
 assert.equal(normal.state.eveningInviteBusy,false);
 assert.equal(normal.element.disabled,false);
 assert.equal(normal.events.filter(e=>e==='render').length,1);
 assert.equal(normal.events.includes('message'),false);
 assert.equal(normal.events.some(e=>/roll_my_evening_d6|roll_couple_once/.test(e)),false);

 const old=make(),pending=old.start();
 old.switchTo();
 old.scope.currentEveningInviteRequest={}; // Another login owns its action.
 old.state.eveningInviteBusy=true;
 old.response.resolve({status:'yes'});
 await pending;
 assert.equal(old.state.tab,'home');
 assert.equal(old.events.includes('ensure_couple_session:duo-a'),false);
 assert.equal(old.events.includes('refresh'),false);
 assert.equal(old.state.eveningInviteBusy,true,
  'Old finally cannot unlock a replacement login');
 assert.equal(old.element.disabled,true,'Old control is not re-enabled');

 const duringSetup=make(),saving=duringSetup.start();
 duringSetup.response.resolve({status:'yes'});
 await new Promise(resolve=>setImmediate(resolve));
 duringSetup.switchTo();
 duringSetup.setup.resolve({id:'old-night'});
 await saving;
 assert.equal(duringSetup.state.tab,'home');
 assert.equal(duringSetup.events.includes('refresh'),false);

 const duringRefresh=make('no'),savingNo=duringRefresh.start();
 duringRefresh.response.resolve({status:'no'});
 await new Promise(resolve=>setImmediate(resolve));
 duringRefresh.switchTo();
 duringRefresh.refresh.resolve();
 await savingNo;
 assert.equal(duringRefresh.events.includes('render'),false);

 // If the authoritative refresh fails after server consent, the home
 // screen remains the visible route; a later retry can open Soirée safely.
 const refreshFailure=make('yes'),refreshFailed=refreshFailure.start();
 refreshFailure.response.resolve({status:'yes'});
 await new Promise(resolve=>setImmediate(resolve));
 refreshFailure.setup.resolve({id:'night-a'});
 await new Promise(resolve=>setImmediate(resolve));
 refreshFailure.refresh.reject(Error('Refresh unavailable'));
 await assert.rejects(refreshFailed,/Refresh unavailable/);
 assert.equal(refreshFailure.state.tab,'home');
 assert.equal(refreshFailure.state.eveningInviteBusy,false);
 assert.equal(refreshFailure.element.disabled,false);
 assert.equal(refreshFailure.events.includes('render'),false);

 const failed=make('no'),failedWork=failed.start();
 failed.response.reject(Error('Temporary network outage'));
 await assert.rejects(failedWork,/Temporary network outage/);
 assert.equal(failed.state.eveningInviteBusy,false);
 assert.equal(failed.element.disabled,false);
 assert.ok(failed.events.includes('remove:aria-busy'));
 const staleFailure=make('no'),staleWork=staleFailure.start();
 staleFailure.switchTo();staleFailure.response.reject(Error('Old failure'));
 await staleWork;
 assert.equal(staleFailure.events.includes('message'),false);
});

test('Accueil invitation shortcut preserves responsive touch targets and safe routing',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('./evening-invitation.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(css,/\.lr-evening-inbox-yes\{min-height:44px/);
 assert.match(css,/\.lr-evening-inbox-actions\{/);
 assert.match(css,/@media\(max-width:530px\)/);
 const handler=app.slice(app.indexOf("if(verb==='evening-invite'){"),
  app.indexOf("if(verb==='account-test'){"));
 assert.match(handler,/answer==='yes'/);
 assert.match(handler,/ensure_couple_session/);
 assert.doesNotMatch(handler,/roll_my_evening_d6|roll_couple_once/);
 assert.match(handler,/generation=authFeedbackGeneration/);
 assert.match(handler,/if\(!current\(\)\)return/);
});
