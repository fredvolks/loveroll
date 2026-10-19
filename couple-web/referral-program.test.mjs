import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFERRAL_CODE_PATTERN,REFERRAL_PENDING_STORAGE_KEY,referralLink,
 referralModeText,referralSettingsHtml} from './referral-program.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('Each person receives an opaque URL referring to the new LoveRoll site',()=>{
 const code='0123456789abcdef01234567';
 assert.ok(REFERRAL_CODE_PATTERN.test(code));
 const link=referralLink(code);
 const url=new URL(link);
 assert.equal(url.host,'fredvolks.github.io');
 assert.equal(url.pathname,'/loveroll/');
 assert.equal(url.searchParams.get('ref'),code);
 assert.equal(url.searchParams.get('auth'),'signup');
 assert.equal(referralLink('bad<script>'),'');
});
test('Settings show couple-owned, annual-payment-only referral benefits',()=>{
 const html=referralSettingsHtml({enabled:true,couple_ready:true,code:'0123456789abcdef01234567',
 reward_cad_cents:500,reward_mode:'renewal_credit',pending_count:2,paid_count:3,earned_cad_cents:1500});
 assert.match(html,/referral-copy/);assert.match(html,/referral-share/);
 assert.match(html,/5,00/);assert.match(html,/premier abonnement annuel/);
 assert.match(html,/crédits acquis par notre duo/i);
 assert.doesNotMatch(html,/bad<script>/);
 assert.match(referralSettingsHtml({enabled:false}),/n’est pas actif/);
 assert.match(referralSettingsHtml({enabled:true,couple_ready:false}),/Créez d’abord votre duo/);
 assert.match(referralModeText('wallet_credit'),/solde de crédits/i);
});
test('Account Settings and secure signup wiring keep referral separate from invite',()=>{
 const app=read('app.js');
 assert.ok(app.includes("REFERRAL_PENDING_STORAGE_KEY"));
 assert.match(app,/sessionStorage\.setItem\(REFERRAL_PENDING_STORAGE_KEY,code\)/);
 assert.ok(app.includes("rpc('love_referral_claim'"));
 assert.ok(app.includes('referralSettingsHtml(state.referral)'));
 assert.ok(app.includes('pendingInviteReference(sessionStorage)'));
 assert.ok(app.includes("state.couple?.owner_user_id===state.user.id"));
 assert.ok(app.includes('if(pendingRef)url.searchParams.set'));
});
test('Only trusted annual-payment backend can award credits; dashboard is owner-only',()=>{
 const sql=read('migrations/20261019_referral_rewards.sql');
 assert.ok(sql.includes("grant execute on function public.love_referral_confirm_annual_payment(uuid,text) to service_role"));
 assert.ok(sql.includes("revoke all on function public.love_referral_confirm_annual_payment(uuid,text) from public,anon,authenticated"));
 assert.ok(sql.includes("p_payment_reference"));
 assert.ok(sql.includes("referred_couple_id uuid primary key"));
 assert.ok(sql.includes("reward_cad_cents integer not null default 500"));
 assert.ok(sql.includes("love_platform_is_admin()"));
 const admin=read('admin.html'),script=read('platform-admin.js');
 assert.match(admin,/data-pane="referrals"/);
 assert.match(admin,/id="ref-mode"/);
 assert.match(script,/love_admin_referral_settings/);
 assert.match(script,/love_admin_referral_save/);
 assert.match(script,/renderReferralSettings/);
});
