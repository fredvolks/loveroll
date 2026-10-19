import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('./app.js');
const index=read('./index.html');
const css=read('./settings-premium.css');
const push=read('./push-notifications.mjs');
const native=read('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java');

test('Profile is separate from exactly five editorial settings routes',()=>{
 const settings=app.slice(app.indexOf('function renderSettings(){'),app.indexOf('async function refreshAndShow()'));
 for(const label of ['Notre duo','Notifications','Cartes et activités','Journal et confidentialité','Application et aide'])assert.ok(settings.includes(label),label);
 assert.match(settings,/settings-profile-row/);assert.match(settings,/settings-sections/);
 assert.doesNotMatch(settings,/settingGroup|Mon ressenti|wellbeingFields|save-wellbeing/);
 assert.match(settings,/canEdit\?'<div class="settings-advanced">'/);
});
test('Detail navigation retains creator guard, back route and dirty-form confirmation',()=>{
 assert.match(app,/function openSettingsPage/);
 assert.match(app,/section==='admin'&&!isLoveAdmin\(\)/);
 assert.match(app,/editorialHeader\(page\?'settings-page:'/);
 assert.match(app,/verb==='settings-page'[\s\S]*?hasUnsavedForm\(\)/);
 assert.match(app,/settingsOpenSection=section;state.tab='settings'/);
});

test('All existing settings actions are still wired',()=>{
 for(const name of ['profile','signout','save-couple-date','end-couple',
  'admin-reset-all-dice','native-update','reload-web']){
  assert.ok(app.includes("if(verb==='"+name+"')"),name);
 }
 for(const name of ['tab:library','tab:monthly-library','tab:advent-editor',
  'tab:special-editor','evening-calendar:settings','native-legacy']){
  assert.ok(app.includes("'"+name+"'"),name);
 }
});

test('Settings theme is scoped and loaded last with cache revision',()=>{
 assert.match(index,/settings-premium\.css\?v=[0-9a-z-]+/);
 assert.match(index,/app\.js\?v=[0-9a-z-]+/);
 assert.match(css,/main#app\.loveroll-settings-page/);
 assert.match(css,/grid-template-rows:repeat\(5,minmax\(58px,1fr\)\)/);
 assert.match(css,/\.settings-row-icon/);
 assert.match(css,/\.settings-link-row/);
 assert.match(css,/\.settings-actions/);
 assert.match(css,/var\(--ritual-button\)/);
});

test('Native version is real and unavailable notifications are not marked as on',()=>{
 assert.match(native,/getPackageManager\(\)\.getPackageInfo\(getPackageName\(\),0\)/);
 assert.match(app,/window\.LoveRollNativeAuth\.appVersion\(\)/);
 assert.match(push,/prefs\[key\]!==false/);
 assert.match(push,/\(!active\?' disabled':''\)/);
 assert.match(push,/weeklyReminderEnabled/);assert.match(push,/device\?\.registered===true/);
});

test('Couple menu removes fictional preview and directs the invitation CTA to the real invite screen',()=>{
 const settings=app.slice(app.indexOf('function renderSettings(){'),app.indexOf('async function refreshAndShow()',app.indexOf('function renderSettings(){')));
 const waiting=app.slice(app.indexOf('function renderWaitingPartner(){'),app.indexOf('function renderHome(){'));
 assert.match(settings,/Inviter un conjoint ou une conjointe/);
 assert.match(settings,/button\('start-couple'/);
 assert.doesNotMatch(settings,/button\('demo-enter'/);
 assert.doesNotMatch(waiting,/button\('demo-enter'/);
 assert.match(app,/function renderPartnerInvitation\(\)/);
 assert.match(app,/if\(state\.tab==='invitation'&&state\.coupleId\)renderPartnerInvitation\(\)/);
 assert.match(waiting,/button\('tab:invitation',[^\n]*class="settings-primary"/);
 const action=app.slice(app.indexOf("if(verb==='start-couple'){"),app.indexOf("if(verb==='end-couple'){"));
 assert.match(action,/rpc\('create_love_match',\{p_anniversary_md:null\}\)/);
 assert.match(action,/state\.tab='invitation'/);
 assert.match(action,/await reload\(\)/);
});
