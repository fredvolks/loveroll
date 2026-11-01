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
