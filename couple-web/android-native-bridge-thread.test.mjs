import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const native=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java',import.meta.url),'utf8');
const gradle=readFileSync(new URL('../app/build.gradle',import.meta.url),'utf8');
test('FCM getter never touches WebView from JavascriptInterface background thread',()=>{
 const a=native.indexOf('@JavascriptInterface public String nativePushToken()');
 const b=native.indexOf('@JavascriptInterface public void enableRemotePush()',a);
 assert.ok(a>0&&b>a);
 const body=native.slice(a,b).replace(/\/\/[^\n]*/g,'');
 for(const forbidden of ['web.getUrl(', 'web.evaluateJavascript(', 'isTrusted(', 'web.loadUrl(', 'web==null'])
  assert.ok(!body.includes(forbidden),'Unsafe bridge operation: '+forbidden);
 assert.match(body,/!pageReady\|\|!firebaseReady/);
 assert.match(native,/volatile boolean pageReady/);
 assert.match(native,/volatile boolean firebaseReady/);
});
test('Google native sign in reports Credential Manager problems and remains retryable',()=>{
 assert.match(native,/catch\(RuntimeException error\)\{\s*authInProgress=false/);
 assert.match(native,/error\.getType\(\)/);
 assert.match(native,/Google Play Services/);
 assert.match(native,/signInWithGoogleOption|GetSignInWithGoogleOption/);
 assert.match(gradle,/versionCode 130014/);
 assert.match(gradle,/versionName '0[.]13[.]14'/);
});

test('Native notification settings use the trusted UI-thread bridge',()=>{
 const start=native.indexOf('@JavascriptInterface public void openNotificationSettings()');
 const end=native.indexOf('@JavascriptInterface public boolean nativePushConfigured()',start);
 assert.ok(start>0&&end>start);
 const method=native.slice(start,end);
 for(const required of ['runOnUiThread','!pageReady','isTrusted(Uri.parse(web.getUrl()))',
  'Settings.ACTION_APP_NOTIFICATION_SETTINGS','Settings.EXTRA_APP_PACKAGE',
  'Settings.ACTION_APPLICATION_DETAILS_SETTINGS'])assert.ok(method.includes(required),required);
});
test('Android notification preferences remain editable without remote push',async()=>{
 const oldWindow=globalThis.window;
 try{
  globalThis.window={LoveRollNativeAuth:{
   nativePushConfigured:()=>false,nativePushToken:()=>'',weeklyReminderEnabled:()=>false,
   openNotificationSettings:()=>{}
  }};
  const {notificationSettingsMarkup}=await import('./push-notifications.mjs');
  const html=notificationSettingsMarkup({enabled:false,weekly:false},{registered:false});
  assert.equal((html.match(/data-push-option="/g)||[]).length,4);
  assert.doesNotMatch(html,/data-push-option="weekly"[^>]*disabled/);
  assert.match(html,/data-action="native-notify-system"/);
  assert.match(html,/envoi inactif/);
  assert.match(html,/Alertes à distance indisponibles/);
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

test('Signed Android release is versioned, immutable and references the preceding official APK',()=>{
 const release=readFileSync(new URL('../.github/workflows/android.yml',import.meta.url),'utf8');
 assert.match(release,/TAG: des-a-deux-v0[.]13[.]14/);
 assert.ok(release.includes('https://github.com/fredvolks/loveroll/releases/download/des-a-deux-v0.13.13/LoveRoll-v0.13.13.apk'));
 assert.ok(release.includes('gh release create "$TAG"'));
 assert.ok(!release.includes('gh release upload "$TAG"'));
 assert.ok(release.includes('if gh release view "$TAG"'));
 assert.match(release,/exit 1/);
 assert.match(gradle,/versionCode 130014/);
});
