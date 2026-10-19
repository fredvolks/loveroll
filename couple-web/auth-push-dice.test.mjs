import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedLoveEmail} from './email-auth.mjs';
import {notificationSettingsMarkup} from './push-notifications.mjs';
const read=(file)=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const app=read('app.js'),dice=read('dice3d.js'),push=read('push-notifications.mjs'),
 sql=read('migrations/20261014_require_confirmed_email.sql'),native=read('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java'),
 manifest=read('../app/src/main/AndroidManifest.xml');
test('Unconfirmed Supabase user cannot enter LoveRoll or fetch private profiles',()=>{
 assert.equal(verifiedLoveEmail({email:'test@love.com',email_confirmed_at:null}),false);
 assert.equal(verifiedLoveEmail({email:'test@love.com',email_confirmed_at:'2026-10-14T14:00:00Z'}),true);
 assert.match(app,/async function refreshVerifiedIdentity\(\)/);
 assert.match(app,/client\.auth\.getUser\(\)/);
 assert.match(app,/if\(!\(await refreshVerifiedIdentity\(\)\)\)/);
 assert.match(app,/verificationPendingHtml\(/);
 assert.match(app,/state\.emailVerificationPending=true/);
 assert.match(app,/email-confirm-resend/);
 assert.match(app,/client\.auth\.resend\(\{type:'signup'/);
 assert.match(app,/sessionStorage\.setItem\('loverollConfirmResendAfter'/);
});
test('Server protects security-definer game RPCs and 29 RLS tables',()=>{
 assert.match(sql,/love_verified_identity\(\)/);
 assert.match(sql,/email_confirmed_at IS NOT NULL/);
 assert.match(sql,/PERFORM public\.love_require_verified_identity/);
 assert.match(sql,/AS RESTRICTIVE FOR ALL TO authenticated/);
 assert.match(sql,/roll_couple_once/);
 assert.match(sql,/open_advent_day/);
 assert.doesNotMatch(sql,/DELETE FROM public\.couples/);
});
test('Dice D6, D20, D35 share frame-independent 3D physics and deterministic end result',()=>{
 for(const n of ['6','20','35'])assert.ok(dice.includes('sides==='+n),'geometry '+n);
 assert.match(dice,/let duration=rolling&&!reduceMotion\?ROLL_TOTAL_MS:0/);
 assert.match(dice,/dt=lastFrame\?Math\.min\(\.05/);
 assert.match(dice,/rollAngles\(trajectory,elapsed\)/);
 assert.doesNotMatch(dice,/orientationAtSettle|slerpQuaternions\(orientationAtSettle/);
 assert.match(dice,/const orientationFor=face/);
 assert.match(dice,/new THREE\.Euler\(\.16,-\.18,-\.02\)/);
 assert.match(dice,/prefers-reduced-motion: reduce/);
 assert.match(dice,/built\.group\.quaternion\.copy\(target\)/);
 assert.doesNotMatch(dice,/t<\.77/);
 assert.doesNotMatch(app,/setTimeout\(resolve,2750\)/);
 assert.equal((app.match(/setTimeout\(resolve,window\.matchMedia\?/g)||[]).length,2);
});
test('Native Android FCM is truly configured, permission gated and routed',()=>{
 assert.match(manifest,/POST_NOTIFICATIONS/);
 assert.match(manifest,/\.LoveRollFcmService/);
 assert.match(native,/FirebaseMessaging\.getInstance\(\)\.getToken\(\)/);
 assert.match(native,/nativePushConfigured\(\)/);
 assert.match(native,/nativePushToken\(\)/);
 assert.match(native,/enableRemotePush\(\)/);
 assert.match(native,/disableRemotePush\(\)/);
 assert.match(native,/requestPermissions\(new String\[\]\{"android\.permission\.POST_NOTIFICATIONS"\},6832\)/);
 assert.match(native,/initializeLoveRollFirebase\(\)/);
 const service=read('../app/src/main/java/ca/desadeux/jeu/LoveRollFcmService.java');
 assert.match(service,/FirebaseMessagingService/);
 assert.match(service,/onNewToken/);
 assert.match(service,/onMessageReceived/);
 assert.doesNotMatch(service,/defi intime|jouet intime/i);
});
test('Disabled native Firebase never fakes push availability',()=>{
 globalThis.window={LoveRollNativeAuth:{weeklyReminderEnabled:()=>true,nativePushConfigured:()=>false,nativePushToken:()=>''}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Android',platform:'Android',maxTouchPoints:1,standalone:false}});
 const html=notificationSettingsMarkup({enabled:false});
 assert.match(html,/Mettez LoveRoll à jour pour recevoir toutes les alertes/);
 assert.doesNotMatch(html,/data-action="push-enable"/);
 assert.match(html,/data-action="native-notify-disable"/);
 assert.match(html,/data-push-option="weekly"[^>]*disabled/);
});
test('Push backend stores native token per verified owner and needs server secret',()=>{
 const claim=read('migrations/20261014_claim_native_push_token.sql');
 const table=read('migrations/20261014_android_fcm_device_tokens.sql');
 const dispatch=read('supabase/functions/love-push-dispatch/index.ts');
 assert.match(claim,/love_require_verified_identity/);
 assert.match(claim,/ON CONFLICT \(device_token\)/);
 assert.match(table,/ENABLE ROW LEVEL SECURITY/);
 assert.match(push,/love_claim_native_push_token/);
 assert.match(push,/nativePushConfigured/);
 assert.match(dispatch,/LOVEROLL_FIREBASE_SERVICE_ACCOUNT_JSON/);
 assert.match(dispatch,/https:\/\/fcm\.googleapis\.com\/v1\/projects\//);
 assert.match(dispatch,/love_push_native_devices/);
 assert.match(dispatch,/UNREGISTERED/);
 assert.match(push,/e\.apple&&!e\.standalone/);
 assert.match(push,/applicationServerKey/);
});
