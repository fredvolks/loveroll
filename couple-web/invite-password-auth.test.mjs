import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loginEmail,requireLovePassword,passwordQuality,verifiedLoveEmail,
 passwordAuthMessage,invitationAuthMessage} from './email-auth.mjs';
import {authHtml,inviteProfileHtml,matchHtml} from './onboarding.mjs';
import {discoverHtml} from './discover.mjs';
import {inviteLinkForId,parseInvitationFromUrl} from './invite-links.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const app=read('app.js'),sql=read('migrations/20261014_invite_auto_match_idempotent.sql');
const inviteId='72aa640b-2644-4d0d-bcf7-575587d27f31';
test('First invitation screen preserves visual, only one consent action',()=>{
 const html=discoverHtml(true);
 assert.match(html,/UNE INVITATION POUR NOUS DEUX/);
 for(const label of ['Soirées','surprise','Avent','événements à deux','ACCEPTER L’INVITATION'])assert.ok(html.includes(label),label);
 assert.match(html,/data-action="invite-start"/);
 assert.doesNotMatch(html,/CONFIRMER NOTRE MATCH/);
});
test('Second page has signup and signin tabs with real password form and Google',()=>{
 const signup=authHtml(true),signin=authHtml(true,'signin');
 for(const html of [signup,signin]){
  assert.match(html,/Love/);assert.match(html,/entry-access-screen/);
  assert.match(html,/data-action="auth-mode:signup"/);
  assert.match(html,/data-action="auth-mode:signin"/);
  assert.match(html,/type="email"/);
  assert.match(html,/type="password"/);
  assert.match(html,/data-action="auth-eye"/);
  assert.match(html,/autocomplete="email"/);
  assert.match(html,/data-action="google"/);
  assert.doesNotMatch(html,/accept-invite|CONFIRMER NOTRE MATCH/);
 }
 assert.match(signup,/autocomplete="new-password"/);
 assert.match(signin,/autocomplete="current-password"/);
 assert.match(signin,/Mot de passe oublié/);
 assert.match(signin,/data-action="auth-reset-request"/);
 assert.match(authHtml(true,'recover'),/data-action="auth-update-password"/);
 assert.doesNotMatch(matchHtml('Exemple',true),/CONFIRMER NOTRE MATCH/);
});
test('Password requirements and Supabase errors are validated without storing passwords',()=>{
 assert.equal(loginEmail('  Test@EXAMPLE.COM '),'test@example.com');
 assert.equal(passwordQuality('Abcdefg8').valid,true);
 assert.equal(passwordQuality('abcdefg8').valid,false);
 assert.equal(requireLovePassword('Abcdefg8'),'Abcdefg8');
 assert.throws(()=>requireLovePassword('password'),/majuscule/);
 assert.match(passwordAuthMessage({code:'invalid_credentials'}),/incorrect/);
 assert.match(passwordAuthMessage({status:429}),/Trop de tentatives/);
 assert.match(invitationAuthMessage({message:'Cette invitation est destinée à un autre courriel'}),/autre adresse/);
 assert.equal(verifiedLoveEmail({email:'ok@test.com',email_confirmed_at:'2026-10-14'}),true);
 assert.equal(verifiedLoveEmail({email:'ok@test.com'}),false);
});
test('Supabase password and recovery methods are actually used',()=>{
 for(const regex of [/client\.auth\.signUp\(\{email,password/,
  /client\.auth\.signInWithPassword\(\{email,password\}\)/,
  /client\.auth\.resetPasswordForEmail\(email,\{redirectTo:/,
  /client\.auth\.updateUser\(\{password\}\)/,
  /signInWithIdToken\(\{provider:'google'/,
  /state\.passwordRecovery=true/,
  /await autoAcceptPendingInvite\(\)/,
  /if\(!verifiedLoveEmail\(state\.user\)\)/])assert.match(app,regex);
 assert.doesNotMatch(app,/localStorage\.setItem\([^)]*password/i);
 assert.match(app,/data\?\.session\?\.user/);
});
test('Profile completion and matching require a personal profile, never wellbeing answers',()=>{
 const profile=inviteProfileHtml({user_metadata:{given_name:'Alex'}},null);
 for(const field of ['profile-name','signup-birth','profile-gender','age-confirm','complete-registration'])assert.ok(profile.includes(field));
 assert.doesNotMatch(profile,/wellbeing-|save-wellbeing|Mon ressenti/);
 assert.doesNotMatch(app,/birthday_md\|\|!state\.wellbeing/);
 assert.doesNotMatch(app,/rpc\('save_my_wellbeing'/);
});
test('Invitation UUID survives browser handoff and server validates email atomically',()=>{
 const link=inviteLinkForId('https://fredvolks.github.io/mon-wallet-android/',inviteId);
 assert.equal(parseInvitationFromUrl(link).id,inviteId);
 assert.match(app,/pendingInviteUrl\(/);
 assert.match(app,/redirectTo:pendingInviteUrl/);
 assert.match(app,/pendingInviteReference\(sessionStorage\)/);
 assert.match(app,/accept_love_match_by_id/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/for update/);
 assert.match(sql,/public\.couple_members/);
 assert.match(sql,/if v_accepted is not null then/);
 assert.doesNotMatch(sql,/delete from auth\.users|delete from public\.couple_/i);
});
test('No other couple app or local journal data is reset for login',()=>{
 assert.match(app,/state\.unlockKey/);
 assert.doesNotMatch(app,/localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
 assert.match(read('index.html'),/invite-account\.css/);
});

test('Correct invited email may leave only its own solo space after explicit confirmation',()=>{
 const sql=read('migrations/20261015_join_invitation_from_solo_atomic.sql');
 assert.match(app,/if\(pendingInvite&&state\.user&&state\.coupleId\)/);
 assert.match(app,/const soloOwner=state\.members\.length===1/);
 assert.match(app,/state\.couple\?\.owner_user_id===state\.user\.id/);
 assert.match(app,/join-invite-from-solo/);
 assert.match(app,/premiumConfirm\(/);
 assert.match(app,/rpc\('join_love_invitation_from_solo',\{p_invitation:invitationId\}\)/);
 assert.match(app,/finishInviteReference\(\)/);
 assert.doesNotMatch(app,/Cette invitation attend un autre compte ❤️/);
 assert.match(sql,/v_email<>lower\(trim\(v_inv\.invited_email\)\)/);
 assert.match(sql,/v_old_owner is distinct from v_user or v_old_count<>1/);
 assert.match(sql,/perform public\.end_love_match\(v_old\)/);
 assert.match(sql,/return public\.accept_love_match_by_id\(p_invitation\)/);
 assert.match(sql,/grant execute on function public\.join_love_invitation_from_solo\(uuid\) to authenticated/);
});
