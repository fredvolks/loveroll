import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const start=app.indexOf('function verificationPendingHtml(email){');
const end=app.indexOf('async function refreshVerifiedIdentity(){',start);
assert.ok(start>=0&&end>start);
const source=app.slice(start,end);
import {emailConfirmationHtml} from './onboarding.mjs';
const make=state=>email=>emailConfirmationHtml(email,{needsSignIn:!state.user,google:true});
test('Existing Google account path never falsely promises an email was sent',()=>{
 const html=make({user:null})('existing@example.com');
 assert.match(html,/data-action="google"/);
 assert.match(html,/Continuer avec Google/);
 assert.match(html,/data-action="email-confirm-login"/);
 assert.match(html,/Un renvoi accepté ne garantit pas la livraison/);
 assert.doesNotMatch(html,/Nous venons de vous envoyer un lien de confirmation/);
 assert.match(html,/existing@example\.com/);
});
test('Unverified logged-in email user still has protected verification path',()=>{
 const html=make({user:{email:'fresh@example.com'}})('fresh@example.com');
 assert.match(html,/data-action="email-confirm-recheck"/);
 assert.doesNotMatch(html,/data-action="email-confirm-login"/);
 assert.match(html,/data-action="email-confirm-resend"/);
});
test('Verified account never remains stuck behind local pending state',()=>{
 assert.match(app,/state\.emailVerificationPending&&!state\.user/);
 assert.match(app,/state\.user&&!verifiedLoveEmail\(state\.user\)/);
 assert.match(app,/if\(verb==='email-confirm-recheck'\)\{\s*if\(!state\.user\)/);
 assert.match(app,/state\.authMode='signin'/);
 assert.match(app,/await refreshVerifiedIdentity\(\)/);
});
test('Supabase resend HTTP success is not incorrectly reported as email delivery',()=>{
 assert.match(app,/client\.auth\.resend\(\{type:'signup',email/);
 assert.match(app,/Demande reçue par le serveur. Cela ne garantit pas la réception/);
 assert.match(app,/Si ce compte est déjà confirmé avec Google/);
 assert.doesNotMatch(source,/Nous venons de vous envoyer un lien/);
});
test('Invitation reference and private user data are preserved',()=>{
 assert.match(app,/function pendingInviteUrl\(recover=false\)/);
 assert.match(app,/pendingInviteReference\(sessionStorage\)/);
 assert.match(app,/client\.auth\.signInWithOAuth\(\{provider:verb/);
 assert.doesNotMatch(source,/localStorage\.clear\(|sessionStorage\.clear\(/);
});
