import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('./'+f,import.meta.url),'utf8');
const app=read('app.js'),markup=read('premium-dialogs.mjs'),styles=read('premium-dialogs.css'),html=read('index.html'),sw=read('service-worker.js');
test('All eight old confirm() dialogs replaced; mutations still await explicit approval',()=>{
 const actions=['reset_love_all_dice_admin','openLegacyOffline','import_love_evening_library',
 'reset_love_monthly_activity','delete_love_custom_card','dissociate_love_to_solo','give_love_challenge','couple_intimacy'];
 assert.doesNotMatch(app,/(?:^|[^a-zA-Z])confirm\s*\(/m);
 assert.doesNotMatch(app,/(?:^|[^a-zA-Z])prompt\s*\(/m);
 assert.ok((app.match(/await premiumConfirm\(/g)||[]).length>=8);
 for(const action of actions)assert.ok(app.includes(action),action);
 const gift=app.slice(app.indexOf("if(verb==='give-challenge')"),app.indexOf("if(verb==='new-challenge')"));
 assert.ok(gift.indexOf("await premiumConfirm")<gift.indexOf("rpc('give_love_challenge'"));
 const unlink=app.slice(app.indexOf("if(verb==='end-couple')"),app.indexOf("if(verb==='save-wellbeing')"));
 assert.ok(unlink.indexOf("await premiumConfirm")<unlink.indexOf("rpc('dissociate_love_to_solo'"));
});
test('Modal promises always resolve on cancel/accept/Escape, without any backend mutation',()=>{
 assert.match(markup,/role="alertdialog"/);
 assert.match(markup,/aria-modal="true"/);
 assert.match(markup,/document\.addEventListener\('keydown'/);
 assert.match(markup,/event\.key==='Escape'/);
 assert.match(markup,/close\(false\)/);
 assert.match(markup,/close\(true\)/);
 assert.match(markup,/previous\?\.isConnected/);
 assert.doesNotMatch(markup,/client\.rpc\(|fetch\(/i);
 assert.match(markup,/textContent=message/);
});
test('Gift and dissociation are styled as premium accessible actions, not browser dialogs',()=>{
 for(const kind of ['gift','couple','reset','library','delete','legacy'])
  assert.ok(markup.includes(kind+':{title:'),kind);
 assert.match(markup,/Offrir 1 défi \?/);
 assert.match(markup,/Garder notre couple/);
 assert.match(markup,/activeDialog=null/);
 assert.match(styles,/\.lr-dialog-overlay/);
 assert.match(styles,/\.lr-dialog-card/);
 assert.match(styles,/\.lr-dialog-icon/);
 assert.match(styles,/\.lr-dialog-accept\.lr-dialog-danger/);
 assert.match(html,/premium-dialogs\.css\?v=20261017-complete127/);
 assert.match(sw,/premium-dialogs\.mjs/);
});
test('No floating toast anywhere; real failures remain inline',()=>{
 assert.doesNotMatch(html,/id="toast"/);
 assert.doesNotMatch(app,/toastEl/);
 const start=app.indexOf('function notify(_message)');
 const end=app.indexOf('function showInlineError(',start);
 assert.ok(start>=0&&end>start);
 assert.doesNotMatch(app.slice(start,end),/document\.createElement|classList|setTimeout/);
 assert.match(app,/function showInlineError\(message\)/);
 assert.match(app,/showInlineError\(msg\)/);
 assert.match(app,/note\.setAttribute\('role','alert'\)/);
 assert.match(styles,/#toast,#toast\.visible,#toast\.lr-premium-toast\.visible\{display:none!important\}/);
 assert.match(styles,/\.lr-inline-feedback\{/);
});
