import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inviteLinkForId,parseInvitationFromUrl,pendingInviteReference,INVITATION_REVISION,MESSENGER_SHARE_PREVIEW_REVISION} from './invite-links.mjs';
import {invitationMessengerText} from './couple-dashboard.mjs';

const id='72aa640b-2644-4d0d-bcf7-575587d27f31';
const original='https://fredvolks.github.io/mon-wallet-android/';

test('Messenger receives only a personal URL; previews supply the image and text',()=>{
 const url=inviteLinkForId(original,id);
 assert.match(url,/\\?invite_id=/);
 assert.equal(new URL(url).searchParams.get('v'),MESSENGER_SHARE_PREVIEW_REVISION);
 assert.ok(!url.includes('#'),'Browser handoff must not depend on a fragment');
 assert.equal(parseInvitationFromUrl(url).id,id);
 const message=invitationMessengerText(url);
 assert.equal(message,url,'Do not send a blue paragraph alongside the link preview');
 assert.ok(!message.includes('\\n'));
 assert.ok(!message.includes('Je t’invite'));
 assert.throws(()=>invitationMessengerText('http://example.com'));
 // Previously shared invitation URLs remain valid after the compact change.
 assert.equal(parseInvitationFromUrl(original+'?invite_id='+id+'&v='+INVITATION_REVISION).id,id);
 assert.equal(parseInvitationFromUrl(original+'?invite_id='+id).id,id);
});

test('Browser handoff preserves invitation across Messenger and Chrome',()=>{
 const url=inviteLinkForId(original,id);
 const chrome=new URL(url);
 assert.equal(parseInvitationFromUrl(chrome.href).id,id);
 const storage=new Map([['pendingInviteId',id]]);
 assert.deepEqual(pendingInviteReference({getItem:key=>storage.get(key)||null}),{kind:'id',value:id});
});

test('Rejects malformed references and supports legacy token links',()=>{
 assert.throws(()=>inviteLinkForId(original,'invalid'));
 assert.throws(()=>parseInvitationFromUrl(original+'?invite_id=malicious'));
 assert.equal(parseInvitationFromUrl(original+'?invite_id='+id+'#invite='+('a'.repeat(64))).id,id);
 assert.equal(parseInvitationFromUrl(original+'#invite='+('a'.repeat(64))).token,'a'.repeat(64));
 assert.throws(()=>parseInvitationFromUrl(original+'#invite=broken'));
});

test('Client guards against premature sign-in and wrong-account pairing',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.ok(app.indexOf('if(!state.passwordRecovery&&(state.showDiscover||(pendingInvite&&!state.inviteAccepted)))')<
  app.indexOf('if(!state.user||state.passwordRecovery){',app.indexOf('function render(){')));
 assert.match(app,/if\(pendingInvite&&state\.user&&state\.coupleId\)/);
 assert.match(app,/verb==='switch-account-invite'/);
 assert.match(app,/accept_love_match_by_id/);
 assert.match(app,/resolve_love_invite_reference/);
 assert.match(app,/pendingInviteUrl\(/);
 const sql=readFileSync(new URL('./migrations/20261014_messenger_invite_id.sql',import.meta.url),'utf8');
 assert.match(sql,/lower\(email\)/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/v_email<>v_expected/);
 assert.match(sql,/return public\.accept_love_match\(v_hash\)/);
 assert.doesNotMatch(sql,/delete from public\.couple_members/);
});

test('Invitation survives a fresh browser tab but expires from local backup',()=>{
 const transient={getItem:()=>null};
 const store=new Map([
  ['pendingInviteId',id],
  ['loverollInviteUntil',String(Date.now()+60000)]
 ]);
 const durable={getItem:key=>store.get(key)||null};
 assert.deepEqual(pendingInviteReference(transient,durable),{kind:'id',value:id});
 store.set('loverollInviteUntil',String(Date.now()-1000));
 assert.equal(pendingInviteReference(transient,durable),null);
 store.set('loverollInviteUntil',String(Date.now()+60000));
 store.set('pendingInviteId','invalid');
 assert.equal(pendingInviteReference(transient,durable),null);
});
test('Account creation keeps invite and returning matched accounts do not see expired invitation',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/localStorage\.setItem\('pendingInviteId',invite\.value\)/);
 assert.match(app,/localStorage\.setItem\('loverollInviteAccepted','id:'\+invite\.value\)/);
 assert.match(app,/completedInvite\?\.kind==='id'/);
 assert.match(app,/i\.accepted_at&&!i\.cancelled_at\)\)\{/);
 assert.match(app,/finishInviteReference\(\)/);
 assert.match(app,/isSharedCoupleReady\(state\.coupleId,members\)/);
 assert.match(app,/if\(pendingInviteReference\(sessionStorage\)\)throw Error\('Une invitation est en attente\.'\)/);
});
