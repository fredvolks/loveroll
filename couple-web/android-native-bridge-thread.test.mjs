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
 assert.match(gradle,/versionCode 130013/);
 assert.match(gradle,/versionName '0[.]13[.]13'/);
});
