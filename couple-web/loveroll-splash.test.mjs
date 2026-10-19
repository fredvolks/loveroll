import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('loveroll-splash.css'),js=read('loveroll-splash.js');
const boot=read('boot-recovery.js'),app=read('app.js'),sw=read('service-worker.js');
test('First paint has separate local glass, satin, live logo, caption and three dots',()=>{
 const markup=html.match(/<main id="app">([\s\S]*?)<\/main>/)[1];
 assert.match(markup,/data-lr-boot role="status"/);
 for(const name of ['heart','decor','logo','caption','dots'])assert.match(markup,new RegExp('lr-splash__'+name));
 assert.match(markup,/Chargement de votre espace…/);
 assert.equal((markup.match(/<i><\/i>/g)||[]).length,3);
 assert.doesNotMatch(markup,/back-heart|lr-splash__ring|<svg|<button|<nav/);
 for(const image of ['loveroll-glass-heart-v123.webp','loveroll-splash-satin-v123.webp','loveroll-wordmark-v127.svg','loveroll-loading-caption-v127.svg']){
  assert.match(html,new RegExp('rel="preload" as="image" href="./assets/'+image));
  assert.ok(readFileSync(new URL('./assets/'+image,import.meta.url)).length<150000);
  assert.ok(sw.includes('./assets/'+image));
 }
});
test('Slow subtle movement is isolated from stationary typography, with reduced motion',()=>{
 assert.match(css,/lr-splash-beat 3s ease-in-out/);
 assert.match(css,/scale\(1\.018\)/);
 assert.match(css,/lr-splash-dot 1\.8s/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/safe-area-inset/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/lr-splash-wave|lr-splash-dust/);
});
test('Real initialization owns the destination; outgoing splash is nonblocking and errors recover',()=>{
 assert.match(js,/function begin\(delay=150\)/);
 assert.match(js,/function end\(id\)/);
 assert.match(js,/finally\{end\(id\);\}/);
 assert.match(app,/window\.LoveRollLoader\?\.begin\(150\)/);
 assert.match(app,/window\.LoveRollLoader\?\.end\(loaderTicket\)/);
 assert.match(css,/lr-splash--leaving\{opacity:0;pointer-events:none/);
 assert.match(boot,/loveroll:boot-error/);
 assert.match(boot,/Réessayer/);
 assert.match(boot,/setTimeout\(show,18000\)/);
 assert.doesNotMatch(js,/minimumDuration|minDuration/);
});
test('Current boot assets and cache generation are coherent',()=>{
 assert.ok(read('app.js').includes("const WEB_RELEASE='"+JSON.parse(read('web-version.json')).build+"'"));
 assert.ok(html.includes('loveroll-splash.css?v=20261017-complete127'));
 assert.ok(html.includes('boot-recovery.js?v=20261017-glass123'));
 assert.ok(html.includes('loveroll-splash.js?v=20261017-complete127'));
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
 for(const name of ['loveroll-splash.css','loveroll-splash.js'])assert.ok(sw.includes('./'+name));
});
