import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const native=read('../app/src/main/java/ca/desadeux/jeu/LoveRollHeartSplashView.java');
const activity=read('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java');
test('Web and Android use the exact same optimized local glass and satin artwork',()=>{
 for(const name of ['glass-heart','splash-satin']){
  const web=readFileSync(new URL('./assets/loveroll-'+name+'-v123.webp',import.meta.url));
  const apk=readFileSync(new URL('../app/src/main/res/drawable-nodpi/loveroll_'+name.replaceAll('-','_')+'.webp',import.meta.url));
  assert.deepEqual(web,apk);assert.ok(web.length<150000);
 }
 assert.match(native,/R\.drawable\.loveroll_glass_heart/);
 assert.match(native,/R\.drawable\.loveroll_splash_satin/);
 assert.match(native,/Chargement de votre espace…/);
 assert.match(native,/BEAT_MS=3000L/);
 assert.match(native,/ValueAnimator\.areAnimatorsEnabled\(\)/);
 assert.doesNotMatch(native,/cubicTo|rings\(|backdropHearts|particles\(/);
 assert.ok(native.indexOf('BitmapFactory.decodeResource')<native.indexOf('onDraw('));
});
test('Native launch keeps the same dark ground and glass emblem before WebView paint',()=>{
 const theme=read('../app/src/main/res/values-v31/styles.xml');
 assert.match(theme,/windowSplashScreenBackground">#10070C/);
 assert.match(theme,/windowSplashScreenAnimatedIcon">@drawable\/loveroll_splash_emblem/);
 assert.match(activity,/new LoveRollHeartSplashView\(this\)/);
 assert.match(activity,/postVisualStateCallback/);
 assert.match(activity,/nativeSplash\.animate\(\)\.alpha\(0f\)\.setDuration\(200\)/);
 assert.match(activity,/nativeSplash\.resumeHeart\(\)/);
 assert.match(activity,/nativeSplash\.pauseHeart\(\)/);
 assert.doesNotMatch(activity,/nativeSplash\.postDelayed/);
 assert.match(activity,/settings\.setCacheMode\(WebSettings\.LOAD_NO_CACHE\)/);
});
test('Both loading stages draw the identical outlined logo and caption without platform fonts',()=>{
 for(const asset of ['loveroll-wordmark-v127.svg','loveroll-loading-caption-v127.svg']){
  const web=readFileSync(new URL('./assets/'+asset,import.meta.url));
  const apk=readFileSync(new URL('../app/src/main/assets/'+asset,import.meta.url));
  assert.deepEqual(web,apk);
  assert.equal((web.toString().match(/<path\b/g)||[]).length,1);
  assert.doesNotMatch(web.toString(),/<text\b|font-family|transform=/);
  assert.ok(read('index.html').includes('./assets/'+asset));
  assert.ok(native.includes('new SharedLettering(context,"'+asset+'")'));
 }
 assert.doesNotMatch(native,/Typeface|drawText\(/);
 assert.match(native,/PathParser\.createPathFromPathData/);
 assert.match(read('loveroll-splash.css'),/--splash-logo-size:clamp\(42px,10\.8vw,62px\)/);
 assert.match(native,/Math\.max\(42\*density,Math\.min\(w\*\.108f,62\*density\)\)/);
});
test('Native document/network failure stops animation and offers retry without deleting data',()=>{
 assert.match(activity,/onReceivedError\(WebView view,WebResourceRequest request/);
 assert.match(activity,/request\.isForMainFrame\(\)\)showNativeLoadFailure/);
 assert.match(activity,/retry\.setText\("Réessayer"\)/);
 assert.match(activity,/web\.loadUrl\(retryDestination==null\?SITE:retryDestination\)/);
 assert.doesNotMatch(activity,/removeAllCookies|deleteDatabase|clearData/);
 assert.match(read('../app/build.gradle'),/versionCode 130013; versionName '0\.13\.13'/);
});
