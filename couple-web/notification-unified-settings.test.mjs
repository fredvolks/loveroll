import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeSettingsMenus} from './settings-menus.mjs';
import {notificationSettingsMarkup,updatePushPreference} from './push-notifications.mjs';

test('Notifications opens one unified screen with all original controls still mounted',()=>{
 const tags=new Set(),body={
  dataset:{settingsPage:'notifications'},
  classList:{add:(...names)=>names.forEach(n=>tags.add(n))}
 };
 const root={
  classList:{contains:name=>name==='loveroll-settings-page',remove(){}},
  querySelector:selector=>selector==='.settings-detail-body,.editorial-workspace .editorial-content'?body:null
 };
 organizeSettingsMenus(root);
 assert.equal(body.dataset.menusReady,'true');
 assert.ok(tags.has('settings-notifications-unified'));
 assert.equal(typeof root._settingsMenuBack,'function');
 assert.equal(root._settingsMenuBack(),false,
  'no extra Sur cet appareil / Choisir mes alertes submenus');
 assert.ok(!tags.has('settings-submenu'),
  'keep the original device actions, preference switches and local reminder together');
});

test('Android notification preferences remain editable even if FCM and device reception are unavailable',()=>{
 const oldWindow=globalThis.window;
 globalThis.window={LoveRollNativeAuth:{
  nativePushConfigured:()=>false,nativePushToken:()=>'',weeklyReminderEnabled:()=>false,
  openNotificationSettings:()=>{}
 }};
 try{
  const html=notificationSettingsMarkup({
   enabled:false,weekly:false,invitation:true,monthly:false,special:true
  },{registered:false});
  assert.match(html,/data-notification-state="update"/);
  assert.match(html,/Alertes à distance indisponibles/);
  assert.match(html,/Autorisations Android/);
  assert.match(html,/Rappel du lundi/);
  for(const kind of ['weekly','invitation','monthly','special']){
   const option=html.match(new RegExp('<input[^>]*data-push-option="'+kind+'"[^>]*>'));
   assert.ok(option,kind+' must be rendered on the same screen');
   assert.doesNotMatch(option[0],/\\bdisabled\\b/,kind+' preference should stay editable');
  }
  assert.match(html,/data-push-option="weekly" aria-label="Dé hebdomadaire"/);
  assert.match(html,/data-push-option="invitation" checked aria-label="Invitation acceptée"/);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;
  else globalThis.window=oldWindow;
 }
});

test('account-level categories save without silently turning on device notification reception',async()=>{
 const writes=[];
 const client={from:table=>({
  upsert:async(value,opts)=>{
   writes.push({table,value,opts});return {error:null};
  }
 })};
 await updatePushPreference(client,'technical-user',{
  enabled:false,weekly:true,invitation:true,monthly:true,special:true
 },'monthly',false);
 assert.equal(writes.length,1);
 assert.equal(writes[0].table,'love_push_preferences');
 assert.deepEqual(writes[0].value,{
  user_id:'technical-user',enabled:false,monthly:false
 });
 assert.equal(writes[0].opts.onConflict,'user_id');
 await assert.rejects(
  updatePushPreference(client,'technical-user',{enabled:false},'unknown',true),
  /Notification inconnue/
 );
 assert.equal(writes.length,1,'unknown categories must never write SQL');
});
