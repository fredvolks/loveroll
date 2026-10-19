import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authHtml,profileHtml,emailConfirmationHtml} from './onboarding.mjs';
import {cardLibraryHtml,adventEditorHtml,specialEditorHtml} from './editorial-editors.mjs';
import {notificationSettingsMarkup,currentPushDevice} from './push-notifications.mjs';
import {jsonToolsPanel} from './json-library-ui.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
test('Profile has an explicit unselected adult consent and no replacement wellbeing answers',()=>{
 const html=profileHtml({email:'account@test.invalid'},{display_name:'<Alex>',gender:'her',birthday_md:'04-12'});
 assert.match(html,/&lt;Alex&gt;/);assert.match(html,/value="her" selected/);
 assert.match(html,/id="age-confirm"/);assert.doesNotMatch(html,/id="age-confirm"[^>]*checked|wellbeing|ressenti|sexualité/);
 assert.doesNotMatch(app,/rpc\('save_my_wellbeing'|birthday_md\|\|!state\.wellbeing|if\(!state\.wellbeing\)/);
});
test('Signup, recovery and confirmation expose only configured sign-in providers',()=>{
 assert.match(authHtml(true,'signup','','',false,{google:true}),/data-action="google"/);
 assert.doesNotMatch(authHtml(true,'signup','','',false,{google:false}),/data-action="google"|data-action="apple"/);
 assert.doesNotMatch(authHtml(true,'recover'),/data-action="google"|type="email"/);
 const html=emailConfirmationHtml('x"<tag>@test.invalid',{needsSignIn:false});
 assert.match(html,/readonly aria-readonly="true"/);assert.match(html,/x&quot;&lt;tag&gt;/);assert.match(html,/email-confirm-recheck/);
});
test('Card libraries retain one hundred independent slots, true playable counts and keyword search',()=>{
 const state={customCategory:'SENSUEL',customCards:[],members:[],couple:{},libraryScreen:'list'};
 const html=cardLibraryHtml(state);
 assert.equal((html.match(/data-card-id=/g)||[]).length,100);
 assert.match(html,/25 Sensuel · 25 Sexuel jouables/);assert.match(html,/data-keywords=/);assert.match(html,/data-action="editor-import:evening"/);
 const edit=cardLibraryHtml({...state,libraryScreen:'edit',customSlot:100});
 assert.equal((edit.match(/name="custom-drawer"/g)||[]).length,3);
 assert.equal((edit.match(/name="custom-recipient"/g)||[]).length,3);
 assert.doesNotMatch(edit,/value="owner"|value="partner"/);
 assert.match(edit,/editorial-timer-duration" hidden/);
});
test('An empty private Advent editor invites import without inventing or revealing surprises',()=>{
 const html=adventEditorHtml({advent2026Config:null,advent2026Days:[]});
 assert.match(html,/Importez votre calendrier/);assert.match(html,/editor-import:advent/);assert.doesNotMatch(html,/id="advent-day-description"/);
 const events=specialEditorHtml({specialEventsConfig:null},[{key:'birthday',owner:'a',title:'<Prénom>',date:null}]);
 assert.match(events,/&lt;Prénom&gt;/);assert.doesNotMatch(events,/<Prénom>/);
});
test('Every library supports file input and pasted JSON before an explicit validated import',()=>{
 for(const kind of ['evening','monthly','advent','special']){
  const html=jsonToolsPanel(kind,'Bibliothèque');assert.match(html,/type="file"/);assert.match(html,/<textarea/);assert.match(html,new RegExp('json-preview:'+kind));assert.doesNotMatch(html,/json-apply:/);
  const ready=jsonToolsPanel(kind,'Bibliothèque',{kind,summary:{label:'Liste <test>',count:25,timers:3}});
  assert.match(ready,/Liste &lt;test&gt;/);assert.match(ready,/25 éléments · 3 minuteur/);assert.match(ready,new RegExp('json-apply:'+kind));
 }
});
test('A shared push preference cannot impersonate a registration on this browser',async()=>{
 const previousWindow=globalThis.window,previousNotification=globalThis.Notification,descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const registration={pushManager:{getSubscription:async()=>null}};
 globalThis.window={PushManager:function(){},Notification:function(){},matchMedia:()=>({matches:false})};globalThis.Notification={permission:'granted'};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Android',platform:'Linux',serviceWorker:{getRegistration:async()=>registration}}});
 try{
  const device=await currentPushDevice();assert.equal(device.registered,false);
  assert.doesNotMatch(notificationSettingsMarkup({enabled:true},device),/Activées sur cet appareil/);
  registration.pushManager.getSubscription=async()=>({endpoint:'https://push.test.invalid/device'});
  assert.match(notificationSettingsMarkup({enabled:true},await currentPushDevice()),/Activées sur cet appareil/);
 }finally{globalThis.window=previousWindow;globalThis.Notification=previousNotification;if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
