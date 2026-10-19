import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loginEmail,loginCode,emailAuthMessage,requireLovePassword,passwordQuality} from './email-auth.mjs';
import {authHtml} from './onboarding.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
test('email validation accepts real address formats',()=>{
 assert.equal(loginEmail('  Fred_VR6@Hotmail.com  '),'fred_vr6@hotmail.com');
 assert.throws(()=>loginEmail('invalid email'),/adresse courriel valide/);
 assert.throws(()=>loginEmail('not@valid'),/adresse courriel valide/);
});
test('new preferred signup, sign-in and recovery are password-based',()=>{
 const signup=authHtml(true),signin=authHtml(true,'signin'),recovery=authHtml(true,'recover');
 assert.match(signup,/Choisissez un mot de passe/);
 assert.match(signup,/type="email"/);
 assert.match(signup,/autocomplete="new-password"/);
 assert.match(signup,/auth-signup-password/);
 assert.match(signin,/auth-signin-password/);
 assert.match(signin,/auth-reset-request/);
 assert.match(recovery,/auth-update-password/);
 assert.doesNotMatch(signup,/Recevoir mon lien de connexion|CONFIRMER NOTRE MATCH/);
 assert.equal(passwordQuality('Abcdef12').valid,true);
 assert.throws(()=>requireLovePassword('short'),/8 caractères/);
});
test('legacy OTP utility stays safe for old messages',()=>{
 assert.equal(loginCode('123456'),'123456');
 assert.throws(()=>loginCode('abc'),/6 chiffres/);
 assert.match(emailAuthMessage({status:429}),/Limite temporaire/);
});
test('main auth now uses real Supabase password APIs, not magic link primary',()=>{
 assert.match(app,/client\.auth\.signUp\(\{email,password/);
 assert.match(app,/client\.auth\.signInWithPassword\(\{email,password\}\)/);
 assert.match(app,/client\.auth\.resetPasswordForEmail/);
 assert.match(app,/client\.auth\.updateUser\(\{password\}\)/);
 assert.doesNotMatch(app,/if\(verb==='email-login'\)/);
});
test('expired login links render a helpful message rather than empty form',()=>{
 assert.match(app,/errorCode=currentUrl\.searchParams\.get\('error_code'\)/);
 assert.match(app,/state\.authNotice=/);
 assert.match(app,/authHtml\(!!pendingInvite/);
});
