import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the production tab handler, not a duplicated navigation algorithm.
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=source.indexOf(" if(verb==='tab'){");
const end=source.indexOf("\n if(['review-save'",start);
assert.ok(start>=0&&end>start,'The production navigation handler is extractable');
const handlerSource='(async (verb,parts)=>{'+source.slice(start,end)+'\n})';

function pendingNavigation(){
 const state={tab:'session',user:{id:'alice'},coupleId:'duo-a',
  session:{id:'night-a'},members:[{user_id:'alice'},{user_id:'bob'}],
  diceStatus:null,couple:{},eveningMore:false};
 let resolveChoice,renderCount=0,probeCount=0,stopCount=0;
 let giftPending=false,redrawPending=false;
 const context={
  state,authFeedbackGeneration:1,settingsOpenSection:'',lastFormTab:null,
  allowBackExit:false,sessionStorage:{setItem(){}},
  isSharedCoupleReady:()=>true,isLoveAdmin:()=>true,hasUnsavedForm:()=>true,
  isActiveEveningRedrawPending:()=>redrawPending,
  isActiveEveningGiftPending:()=>giftPending,
  premiumConfirm:()=>new Promise(resolve=>{resolveChoice=resolve;}),
  eclatAudio:{stop(){stopCount++;}},render(){renderCount++;},
  liveSync:{probe(){probeCount++;return Promise.resolve();}},
  console:{warn(){}}
 };
 const action=runInNewContext(handlerSource,context);
 const request=action('tab',['settings']);
 assert.equal(typeof resolveChoice,'function','Unsaved draft opened a confirmation');
 return {
  state,context,request,
  confirm(choice){resolveChoice(choice);},
  setGift(value){giftPending=value;},
  setRedraw(value){redrawPending=value;},
  metrics(){return {renderCount,probeCount,stopCount};}
 };
}

test('LR-028: leaving an edited form still works after an unchanged confirmed route',async()=>{
 const nav=pendingNavigation();
 assert.equal(nav.state.tab,'session','Do not navigate before the choice');
 nav.confirm(true);await nav.request;
 assert.equal(nav.state.tab,'settings');
 assert.equal(nav.metrics().renderCount,1);
 assert.equal(nav.metrics().probeCount,1);
});

test('LR-028: cancelling unsaved changes keeps the original screen intact',async()=>{
 const nav=pendingNavigation();
 nav.confirm(false);await nav.request;
 assert.equal(nav.state.tab,'session');
 assert.equal(nav.metrics().renderCount,0);
});

test('LR-028: a delayed confirmation cannot steal an official D100, redraw or gift',async()=>{
 for(const condition of ['dice','redraw','gift']){
  const nav=pendingNavigation();
  if(condition==='dice')nav.state.diceStatus='rolling';
  if(condition==='redraw')nav.setRedraw(true);
  if(condition==='gift')nav.setGift(true);
  nav.confirm(true);await nav.request;
  assert.equal(nav.state.tab,'session',condition+' retains the active evening');
  assert.equal(nav.metrics().renderCount,0,condition+' must not repaint');
  assert.equal(nav.metrics().probeCount,0,condition+' must not sync another screen');
 }
});

test('LR-028: a stale unsaved-form confirmation cannot navigate another account or evening',async()=>{
 const variations=[
  nav=>{nav.state.user={id:'charlie'};},
  nav=>{nav.state.coupleId='duo-b';},
  nav=>{nav.state.session={id:'night-b'};},
  nav=>{nav.state.tab='home';},
  nav=>{nav.context.authFeedbackGeneration=2;}
 ];
 for(const mutate of variations){
  const nav=pendingNavigation();mutate(nav);
  const expectedTab=nav.state.tab;
  nav.confirm(true);await nav.request;
  assert.equal(nav.state.tab,expectedTab);
  assert.equal(nav.metrics().renderCount,0);
  assert.equal(nav.metrics().probeCount,0);
 }
});

function pendingAndroidExit(){
 const start=source.indexOf('function backFromLoveRoll(){');
 const end=source.indexOf('\nwindow.loveRollHandleBack',start);
 assert.ok(start>=0&&end>start,'Android Back handler must be extractable');
 const state={tab:'home',user:{id:'alice'},coupleId:'duo-a',
  session:{id:'night-a'},diceStatus:null,showEveningChallenges:false,
  reviewModalSessionId:null,installModalOpen:false,forceInstallGuide:false,
  eveningRefusalId:null,showEveningChallenge:false,showSurpriseActivity:false,
  surpriseEditSlot:null,adventSelected:null,adventHistory:false,
  eveningMore:false,homeNotices:false,confirmCancel:false,specialFocus:null};
 let route='home|draft-a',unsaved=true;
 const notifications=[],dialogResolvers=[],failures=[];
 const context={state,authFeedbackGeneration:1,
  document:{querySelector:()=>null},
  root:{_settingsMenuBack:()=>false},
  hasUnsavedForm:()=>unsaved,formRouteKey:()=>route,
  premiumConfirm:()=>new Promise(resolve=>dialogResolvers.push(resolve)),
  notify:message=>notifications.push(message),fail:error=>failures.push(error)};
 const fixture=runInNewContext(
  'let allowBackExit=false,allowBackExitOwner=null;\n'+
  source.slice(start,end)+'\nbackFromLoveRoll',context);
 return {back:fixture,state,context,notifications,dialogResolvers,failures,
  setRoute(value){route=value;},setUnsaved(value){unsaved=value;}};
}

test('LR-028: Android Back exit approval applies only to unchanged account and draft',async()=>{
 const h=pendingAndroidExit();
 assert.equal(h.back(),true,'First Back asks whether to discard the draft');
 assert.equal(h.dialogResolvers.length,1);
 h.dialogResolvers[0](true);
 await Promise.resolve();
 assert.equal(h.notifications.length,1,'The active account gets the second-Back hint');
 assert.equal(h.back(),false,'Second Back can exit the same approved form');
 assert.equal(h.back(),true,'A third Back requires fresh approval for the still-unsaved form');
});

test('LR-028: old Android confirmation cannot authorize exiting a new login',async()=>{
 for(const mutate of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.coupleId='duo-b';},
  h=>{h.state.session={id:'night-b'};},
  h=>{h.context.authFeedbackGeneration=2;},
  h=>{h.setRoute('home|draft-b');}
 ]){
  const h=pendingAndroidExit();
  assert.equal(h.back(),true);
  mutate(h);
  h.dialogResolvers[0](true);
  await Promise.resolve();
  assert.equal(h.notifications.length,0,'Stale approval must be discarded');
  assert.equal(h.back(),true,'New owner/form still requires its own approval');
  assert.equal(h.dialogResolvers.length,2);
  h.dialogResolvers[1](false);
  await Promise.resolve();
  assert.equal(h.failures.length,0);
 }
});

test('LR-028: an approved Android exit expires when the form or Auth changes',async()=>{
 for(const mutate of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.context.authFeedbackGeneration=2;},
  h=>{h.setRoute('home|another-editor');}
 ]){
  const h=pendingAndroidExit();
  assert.equal(h.back(),true);
  h.dialogResolvers[0](true);
  await Promise.resolve();
  mutate(h);
  assert.equal(h.back(),true,'Never consume another account’s exit allowance');
  assert.equal(h.dialogResolvers.length,2,'Show a fresh draft warning');
  h.dialogResolvers[1](false);
  await Promise.resolve();
 }
});
