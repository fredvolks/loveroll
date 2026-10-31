import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {categoryConfirmOdds,categoryConfirmEnabled,saveCategoryConfirmLocal,eveningCategoryConfirmMarkup,ownsEveningCategoryDraw,askEveningCategoryConfirmation} from './evening-category-confirm.mjs';

const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const migration=readFileSync(new URL('./migrations/20261026_evening_category_confirmation.sql',import.meta.url),'utf8');

test('LR-014: probabilities reflect chosen category and active setting',()=>{
 assert.deepEqual(categoryConfirmOdds('SENSUEL',88),{sensuel:88,sexuel:12});
 assert.deepEqual(categoryConfirmOdds('SEXUEL',88),{sensuel:12,sexuel:88});
 assert.deepEqual(categoryConfirmOdds('HASARD',88),{sensuel:50,sexuel:50});
 assert.deepEqual(categoryConfirmOdds('SEXUEL',50),{sensuel:50,sexuel:50});
 assert.throws(()=>categoryConfirmOdds('INVALID'),/Catégorie invalide/);
 assert.match(eveningCategoryConfirmMarkup('HASARD',88),/Catégorie : <strong>Au hasard<\/strong>/);
 assert.match(eveningCategoryConfirmMarkup('SEXUEL',88),/Sensuel 12 % · Sexuel 88 %/);
});
test('LR-014: default on, per-user persistence and server preference precedence',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(categoryConfirmEnabled({},'user-a',storage),true);
 assert.equal(saveCategoryConfirmLocal('user-a',false,storage),true);
 assert.equal(categoryConfirmEnabled({},'user-a',storage),false);
 assert.equal(categoryConfirmEnabled({},'user-b',storage),true);
 assert.equal(categoryConfirmEnabled({confirm_evening_category:true},'user-a',storage),true);
 assert.equal(categoryConfirmEnabled({confirm_evening_category:false},'user-b',storage),false);
});
test('Queued D100 category taps cannot overwrite the in-flight confirmation or official roll',()=>{
 const start=source.indexOf("if(verb==='category'){");
 const end=source.indexOf("if(verb==='session-length'){",start);
 assert.ok(start>0&&end>start,'The production category handler must be present');
 const snippet=source.slice(start,end);
 function tryChange({confirming=false,diceStatus=null,allowUi=true}={}){
  const state={category:'SENSUEL',randomMode:false,
   couple:{category_preference_percent:74},session:{id:'night-1'},diceStatus};
  const writes=[],updates=[];
  const scope={state,parts:['HASARD'],eveningCategoryConfirmInFlight:confirming,
   EVENING_CATEGORIES:['SENSUEL','SEXUEL'],root:{},
   updateEveningCategoryUi:(...args)=>{updates.push(args);return allowUi;},
   sessionStorage:{setItem:(...args)=>writes.push(args)}};
  const handle=runInNewContext('(function(verb){'+snippet+'})',scope);
  handle('category');
  return {state,writes,updates};
 }
 for(const scenario of [
  {confirming:true},{diceStatus:'pending'},{diceStatus:'rolling'},
  {diceStatus:'settled'}
 ]){
  const result=tryChange(scenario);
  assert.equal(result.state.category,'SENSUEL');
  assert.equal(result.state.randomMode,false);
  assert.equal(result.writes.length,0,'No preference storage writes during a draw');
  assert.equal(result.updates.length,0,'Do not alter live WebGL UI during draw');
 }
 const disabled=tryChange({allowUi:false});
 assert.equal(disabled.state.category,'SENSUEL');
 assert.equal(disabled.writes.length,0);
 const allowed=tryChange();
 assert.equal(allowed.state.category,'HASARD');
 assert.equal(allowed.state.randomMode,true);
 assert.equal(allowed.updates.length,1);
 assert.equal(allowed.writes.length,1);
 assert.equal(allowed.writes[0][0],'loveroll-category-night-1');
 assert.equal(allowed.writes[0][1],'HASARD');
});

test('LR-014: the existing server draw is only reached after confirmation',()=>{
 const trigger=source.slice(source.indexOf("if(verb==='new-challenge'){"),source.indexOf("if(verb==='answer'){"));
 assert.ok(trigger.indexOf("askEveningCategoryConfirmation(")>0);
 assert.ok(trigger.indexOf("if(!answer.confirmed)return;")<trigger.indexOf("animateRoll("));
 assert.ok(trigger.indexOf("state.category!==selectedCategory")<trigger.indexOf("animateRoll("));
 assert.match(trigger,/rpc\('draw_for_partner_random'/);
 assert.match(trigger,/rpc\('draw_for_partner'/);
 assert.match(trigger,/if\(disableReminder\)/);
 assert.match(source,/if\(verb==='evening-confirm-pref-toggle'\)/);
 assert.match(trigger,/eveningCategoryConfirmInFlight=true/);
 assert.match(trigger,/finally\{eveningCategoryConfirmInFlight=false;\}/);
 assert.match(source,/id\('evening-category-confirm-pref'\)\?\.checked/);
 assert.match(source,/function backFromLoveRoll\(\)\{[\s\S]{0,440}lr-evening-category-dialog/);
 assert.match(html,/evening-category-confirm\.css/);
 assert.match(migration,/ADD COLUMN IF NOT EXISTS confirm_evening_category boolean NOT NULL DEFAULT true/);
});

test('LR-014: a queued category confirmation cannot draw after an account switch',()=>{
 const state={user:{id:'alice'},coupleId:'couple-a',
  session:{id:'evening-one'},tab:'session'};
 const owner={userId:'alice',coupleId:'couple-a',sessionId:'evening-one',generation:7};
 assert.equal(ownsEveningCategoryDraw(state,owner,7),true);
 for(const changed of [
  {...state,user:{id:'bob'}},
  {...state,user:null},
  {...state,coupleId:'couple-b'},
  {...state,session:{id:'evening-two'}},
  {...state,session:null},
  {...state,tab:'home'}
 ])assert.equal(ownsEveningCategoryDraw(changed,owner,7),false);
 assert.equal(ownsEveningCategoryDraw(state,owner,8),false,
  'even a re-login as the same account invalidates its earlier confirmation');
 assert.equal(ownsEveningCategoryDraw(state,{...owner,userId:''},7),false);
 assert.equal(ownsEveningCategoryDraw(state,null,7),false);
});

test('LR-014: a stale confirmation cannot execute RPC or write another account preference',()=>{
 const trigger=source.slice(source.indexOf("if(verb==='new-challenge'){"),source.indexOf("if(verb==='answer'){"));
 const fresh=trigger.indexOf('if(!ownsDraw())return;');
 const confirm=trigger.indexOf('if(!answer.confirmed)return;');
 const roll=trigger.indexOf('animateRoll(');
 const result=trigger.indexOf('const drawn=await animateRoll(');
 const post=trigger.indexOf('if(!ownsDraw())return;',result);
 const pref=trigger.indexOf('persistEveningCategoryConfirmPref(false)');
 assert.ok(fresh>confirm&&fresh<roll,
  'identity must be checked after confirmation and before the official D100 RPC');
 assert.ok(post>result&&post<pref,
  'identity must be checked again before a personal preference or UI is updated');
 assert.match(trigger,/const drawOwner=\{userId:state\.user\?\.id,coupleId:state\.coupleId,/);
 assert.match(trigger,/generation:authFeedbackGeneration/);
});

test('LR-014: delayed preference save cannot rewrite a replacement account',async()=>{
 const impl=source.slice(source.indexOf('async function persistEveningCategoryConfirmPref('),
  source.indexOf('let eveningCategoryConfirmInFlight=false;'));
 assert.ok(impl.includes('async function persistEveningCategoryConfirmPref'));
 const alice={user:{id:'alice'},coupleId:'duo-a',
  profile:{confirm_evening_category:true}};
 let resolveWrite;
 const scope={state:alice,authFeedbackGeneration:5,
  client:{from:()=>({update:()=>({eq:()=>new Promise(resolve=>{resolveWrite=resolve;})})})},
  saveCategoryConfirmLocal:()=>true,localStorage:{}};
 const persist=runInNewContext(impl+';persistEveningCategoryConfirmPref',scope);
 const pending=persist(false);
 alice.user={id:'bob'};
 alice.coupleId='duo-b';
 alice.profile={confirm_evening_category:true};
 scope.authFeedbackGeneration=6;
 resolveWrite({error:null});
 await pending;
 assert.equal(alice.profile.confirm_evening_category,true,
  'late confirmation may not overwrite Bob’s profile');
 // A new Auth generation is also distinct even with the same UUID.
 const same={user:{id:'alice'},coupleId:'duo-a',
  profile:{confirm_evening_category:true}};
 scope.state=same;scope.authFeedbackGeneration=7;
 const second=persist(false);
 scope.authFeedbackGeneration=8;
 resolveWrite({error:null});
 await second;
 assert.equal(same.profile.confirm_evening_category,true,
  'late confirmation may not overwrite a freshly signed-in session');
 const third=persist(false);
 resolveWrite({error:null});
 await third;
 assert.equal(same.profile.confirm_evening_category,false,
  'the still-current account can persist its own preference');
});

function categoryDialogFixture(){
 const focusCalls=[];
 const opener={isConnected:true,focus:options=>focusCalls.push(options)};
 const doc={activeElement:opener,dialog:null,body:{append:dialog=>{
  doc.dialog=dialog;dialog.isConnected=true;
 }}};
 doc.createElement=tag=>{
  assert.equal(tag,'dialog');
  const events=new Map();
  const yes={focus:()=>{doc.activeElement=yes;}};
  const dialog={
   open:false,isConnected:false,innerHTML:'',className:'',
   setAttribute(){},
   addEventListener:(type,fn)=>events.set(type,fn),
   querySelector:selector=>selector==='[data-confirm-action="yes"]'?yes:
    selector==='[data-confirm-optout]'?{checked:true}:null,
   showModal(){dialog.open=true;},
   close(){dialog.open=false;events.get('close')?.();},
   remove(){dialog.isConnected=false;},
   send(type,event){events.get(type)?.(event);}
  };
  return dialog;
 };
 return {doc,opener,focusCalls};
}
test('LR-014: confirmation dialog returns keyboard focus when dismissed or approved',async()=>{
 for(const [action,confirmed] of [['change',false],['close',false],['yes',true]]){
  const f=categoryDialogFixture();
  const pending=askEveningCategoryConfirmation({category:'HASARD',doc:f.doc});
  f.doc.dialog.send('click',{target:{closest:()=>({dataset:{confirmAction:action}})}});
  const result=await pending;
  assert.equal(result.confirmed,confirmed);
  assert.equal(f.doc.dialog.isConnected,false);
  assert.deepEqual(f.focusCalls,[{preventScroll:true}],
   'keyboard and mobile focus must return without forcing scroll');
 }
});
test('LR-014: Escape restores focus, but never focuses a detached old account control',async()=>{
 const f=categoryDialogFixture();
 const pending=askEveningCategoryConfirmation({category:'SENSUEL',doc:f.doc});
 let prevented=false;
 f.doc.dialog.send('cancel',{preventDefault:()=>{prevented=true;}});
 assert.equal((await pending).confirmed,false);
 assert.equal(prevented,true);
 assert.equal(f.focusCalls.length,1);
 const changed=categoryDialogFixture();
 const waiting=askEveningCategoryConfirmation({category:'SEXUEL',doc:changed.doc});
 changed.opener.isConnected=false;
 changed.doc.dialog.send('click',{target:{closest:()=>({dataset:{confirmAction:'change'}})}});
 await waiting;
 assert.equal(changed.focusCalls.length,0,
  'an old button must not reclaim focus after its screen was replaced');
});
