import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFERRAL_CODE_PATTERN,REFERRAL_PENDING_STORAGE_KEY,referralLink,
 referralModeText,referralSettingsHtml,referralProgress} from './referral-program.mjs';
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
test('Settings show the one-year annual cap and a clear share flow',()=>{
 const mock={enabled:true,couple_ready:true,code:'0123456789abcdef01234567',
  reward_cad_cents:500,reward_mode:'renewal_credit',pending_count:2,paid_count:3,
  available_cad_cents:1500,annual_renewal_cad_cents:4999};
 const html=referralSettingsHtml(mock);
 assert.match(html,/referral-copy/);assert.match(html,/referral-share/);
 assert.match(html,/5,00/);assert.match(html,/premier abonnement annuel/);
 assert.match(html,/Rabais accumulé pour notre prochain renouvellement/);
 assert.match(html,/49,99/);assert.match(html,/15,00/);assert.match(html,/34,99/);
 assert.match(html,/30 %/);
 assert.match(html,/progressbar/);
 assert.match(html,/Mon lien personnel à partager/);
 assert.match(html,/Comment fonctionne le référencement/);
 assert.doesNotMatch(html,/bad<script>/);
 assert.equal(referralSettingsHtml({enabled:false}),'');
 assert.match(referralSettingsHtml({enabled:true,couple_ready:false}),/Créez votre duo/);
 assert.match(referralModeText('wallet_credit'),/solde de crédits/i);
 const capped=referralSettingsHtml({...mock,available_cad_cents:5050});
 assert.match(capped,/100 %/);
 assert.match(capped,/couvert à 100 %/);
});
test('Account Settings and secure signup wiring keep referral separate from invite',()=>{
 const app=read('app.js');
 assert.ok(app.includes("REFERRAL_PENDING_STORAGE_KEY"));
 assert.match(app,/sessionStorage\.setItem\(REFERRAL_PENDING_STORAGE_KEY,code\)/);
 assert.ok(app.includes("rpc('love_referral_claim'"));
 assert.ok(app.includes('referralSettingsHtml(state.referral)'));
 // A separate conditional Settings route; no referral card embedded in Profile.
 assert.match(app,/parrainage:\{title:'Parrainage',body:referralSettingsHtml\(state.referral\)/);
 assert.match(app,/state.referral\?\.enabled===true\?\[\['parrainage','Parrainage'/);
 assert.match(app,/data-referral-active/);
 assert.match(app,/if\(section==='parrainage'&&state.referral\?\.enabled!==true\)return/);
 const account=app.slice(app.indexOf("const account='<div class"),app.indexOf("let partner='"));
 assert.doesNotMatch(account,/referralSettingsHtml/);
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

test('One-year cap is atomic and adapts to the configured annual fee',()=>{
 const sql=read('migrations/20261019_referral_annual_cap.sql');
 assert.match(sql,/for update/i);
 assert.match(sql,/perform 1 from public\.couples where id=v_claim\.referrer_couple_id for update/i);
 assert.match(sql,/v_award:=least\(v_claim\.reward_cad_cents,greatest\(0,v_price-v_unspent\)\)/);
 assert.match(sql,/annual_base_cad_cents/);
 assert.match(sql,/and state='awaiting_application'/);
 assert.match(sql,/to service_role/);
 const progress=referralProgress({annual_renewal_cad_cents:4999,available_cad_cents:4500});
 assert.deepEqual(progress,{max:4999,credited:4500,remaining:499,percentage:90});
 assert.deepEqual(referralProgress({annual_renewal_cad_cents:4999,available_cad_cents:10000}),
 {max:4999,credited:4999,remaining:0,percentage:100});
});
test('Referral detail appears ONLY while switched on and live ledger refresh is restricted',()=>{
 const app=read('app.js');
 assert.match(app,/state\.referral\?\.enabled===true/);
 assert.match(app,/setInterval\(async\(\)=>\{/);
 assert.match(app,/settingsOpenSection!=='parrainage'/);
 assert.match(app,/rpc\('love_my_referral'\)/);
 assert.match(read('settings-premium.css'),/settings-referral-progress-track/);
});
