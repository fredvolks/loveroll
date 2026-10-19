import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileHtml,inviteProfileHtml,profileAccountChoiceHtml,authHtml} from './onboarding.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const app=read('app.js'),css=read('editorial-details.css');
const currentUser={id:'00000000-0000-4000-8000-000000000001',
 email:'existing-google-user@example.com',user_metadata:{name:'Existing Account'}};
const all=[['regular',profileHtml(currentUser,null)],['invited',inviteProfileHtml(currentUser,null)]];
test('All incomplete-profile variants offer an existing-account login in the first card',()=>{
 for(const [name,html] of all){
  const button=html.indexOf('data-action="use-existing-account"');
  assert.ok(button>=0,'No switch button in '+name);
  const form=html.indexOf('id="profile-name"');
  if(form>=0)assert.ok(button<form,'Login action must be above name form '+name);
  assert.match(html,/Compte actuellement connecté/);
  assert.match(html,/existing-google-user@example\.com/);
  assert.match(html,/Se connecter à mon compte existant/);
 }
});
test('Existing identity is HTML-escaped and never causes raw HTML injection',()=>{
 const html=profileAccountChoiceHtml({email:'<img src=x onerror=alert(1)>@domain.test'});
 assert.ok(!html.includes('<img'));
 assert.match(html,/&lt;img/);
});
test('Switch button preserves invitation and signs out local session only',()=>{
 const start=app.indexOf("if(verb==='use-existing-account'){");
 const end=app.indexOf("if(verb==='switch-account-invite'){",start);
 assert.ok(start>=0&&end>start);
 const body=app.slice(start,end);
 assert.match(body,/pendingInviteReference\(sessionStorage\)/);
 assert.match(body,/client\.auth\.signOut\(\{scope:'local'\}\)/);
 assert.match(body,/state\.inviteAccepted=hadInvite&&priorConsent/);
 assert.match(body,/state\.authMode='signin'/);
 assert.match(body,/state\.showAuth=true/);
 assert.doesNotMatch(body,/delete\(|localStorage\.clear|sessionStorage\.clear|complete_love_registration/);
});
test('Login page provides password, Google and recovery without creating a profile',()=>{
 const page=authHtml(false,'signin');
 assert.match(page,/Se connecter/);
 assert.match(page,/auth-signin-password/);
 assert.match(page,/google/);
 assert.match(page,/auth-reset-request/);
 assert.doesNotMatch(page,/id="profile-name"/);
});
test('Switch interface is compact and touch-accessible',()=>{
 assert.match(css,/\.entry-account-choice/);
 assert.match(css,/\.entry-switch-account/);
 assert.match(css,/min-height:44px/);
});
