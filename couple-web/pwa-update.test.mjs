import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeSessionLength,readSessionLength,saveSessionLength,sessionLengthSettingsHtml} from './session-duration-preference.mjs';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),sw=read('service-worker.js');
const release=JSON.parse(read('web-version.json'));
const appTag=release.build.replaceAll('-','').replace('.', '-web');
test('LoveRoll build versions agree between endpoint, app, HTML and imported modules',()=>{
 const build=release.build,tag='20261015-no-toast87',inviteTag='20261018-safari150',controlsTag='20261017-controls141',diceTag=appTag;
 assert.match(build,/^\d{4}-\d{2}-\d{2}\.\d+$/);
 assert.ok(sw.includes("const CACHE='loveroll-static-v"+build.split('.')[1]+"'"));
 assert.ok(app.includes('invite-links.mjs?v='+inviteTag));
 assert.ok(sw.includes('./assets/loveroll-messenger-og-v142.jpg'));
 assert.ok(sw.includes('./lr001-d100-entry-parity-v244.css'));
 assert.ok(html.includes('lr001-d100-entry-parity-v244.css?v=20261027-lr001-parity247'));
 assert.match(html,/og:image:type" content="image\/jpeg/);
 for(const css of ['controls-rose-v141.css','premium-theme.css','editorial-details.css','entry-ritual-v139.css']){
  assert.ok(html.includes(css+'?v='+(css==='entry-ritual-v139.css'?'20261018-style148':controlsTag)),
   css+' must ship with the new palette');
  assert.ok(sw.includes('./'+css),css+' must remain available offline');
 }
 assert.ok(html.includes('ritual-scenes.css?v=20261017-scenes138'));
 assert.ok(sw.includes('./ritual-scenes.css'));
 assert.ok(sw.includes('./assets/home-reference-approved-v190.webp'));
 for(const f of ['eclat.css','eclat-catalog.mjs','eclat-scenes-a.mjs','eclat-scenes-b.mjs','eclat-ui.mjs','eclat-audio.mjs'])assert.ok(sw.includes('./'+f),f+' must be cached');
 assert.ok(html.includes('ritual-titles.css?v=20261020-switch178'));
 assert.ok(sw.includes('./ritual-titles.css'));
 assert.ok(app.includes('premium-advent.mjs?v=20261019-bubble175'));
 assert.ok(app.includes('evening-calendar.mjs?v='+appTag));
 assert.ok(app.includes('play-style.mjs?v=20261018-styles149'));
 assert.ok(sw.includes('./calendar-success-stats.mjs'));
 assert.ok(sw.includes('./play-style.mjs'));
 assert.ok(sw.includes('./session-duration-preference.mjs'));
 assert.ok(app.includes('session-duration-preference.mjs?v=20261031-length262'));
 assert.ok(sw.includes('./cycle-questionnaire.mjs'));
 assert.ok(app.includes('cycle-questionnaire.mjs?v=20261031-cycle261'),
  'the active PWA must import the latest personal 200-card questionnaire');
 assert.ok(app.includes("rpc('love_cycle_status'"));
 assert.ok(app.includes("rpc('reset_love_challenges_admin'"));
 assert.ok(html.includes('evening-calendar.css?v=20261018-stats148'));
 assert.ok(app.includes('couple-live-sync.mjs?v=20261017-advent119'));
 assert.ok(html.includes('premium-advent.css?v=20261019-ipad155'));
  assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
 assert.ok(html.includes('bubble-centering.css?v=20261020-ecrin177'));
 assert.ok(sw.includes('./bubble-centering.css'));
 assert.ok(html.includes('eclat.css?v=20261020-switch178'));
 assert.match(html,new RegExp('app\\.js\\?v='+appTag));
 for(const css of ['satin-reference.css','discover.css']){
  assert.ok(html.includes(css+'?v='+tag),css);
 }
 assert.ok(html.includes('styles.css?v=20261017-glass123'));
 assert.match(html,/premium-home\.css\?v=20261019-ipad155/);
 assert.ok(app.includes('premium-home.mjs?v='+appTag));
 assert.match(app,new RegExp("dice3d\\.js\\?v="+diceTag));
 assert.ok(app.includes('premium-evening.mjs?v=20261028-lr027-web254'));
 assert.ok(html.includes('evening-editorial.css?v=20261028-lr027'));
 assert.ok(app.includes('onboarding.mjs?v=20261018-style148'));
 assert.ok(app.includes('json-libraries.mjs?v=20261016-restore113'));
 assert.match(html,/settings-premium\.css\?v=20261019-(?:ref|personal)\d+/);
 assert.ok(!html.includes('restore-categories-v113.css'));
 assert.ok(!html.includes('evening-step1-mobile-v101.css'));
 assert.ok(!html.includes('evening-queue-fixed-v102.css'));
 assert.ok(!html.includes('evening-private-queue.css'),
  'the deprecated queue stylesheet must not override official Soirée visuals');
 assert.ok(html.includes('evening-editorial.css?v=20261028-lr027'),
  'the approved Soirée stylesheet must load the Passer/Refuser controls');
 assert.ok(sw.includes('./evening-editorial.css'),
  'the Soirée stylesheet must remain cached for PWA offline fallback');
 assert.ok(html.includes('surprise-refined-v104.css?v=20261017-ritual130'));
 assert.match(app,/surprise-event-config\.mjs\?v=20261016-surprise109/);
});
test('PWA bypasses stale Android network caches while preserving offline fallback',()=>{
 assert.match(sw,new RegExp('loveroll-static-v'+release.build.split('.')[1]));
 assert.match(sw,/fetch\(req,\{cache:'no-store'\}\)/);
 assert.match(sw,/cache\.match\(fallback\.href\)/);
 assert.match(sw,/const cache=await caches\.open\(CACHE\)/);
 assert.match(sw,/\.\/web-version\.json/);
 assert.match(app,/updateViaCache:'none'/);
 assert.match(app,/reloadWebAssets\(\)\.catch\(console\.warn\)/);
});
test('Updating LoveRoll retains caches owned by Mon Wallet and other applications',async()=>{
 const events={},deleted=[];
 const self={registration:{scope:'https://example.test/mon-wallet-android/'},clients:{claim:async()=>{}},addEventListener:(type,callback)=>{events[type]=callback;}};
 vm.runInNewContext(sw,{URL,self,caches:{keys:async()=>['loveroll-static-v121','loveroll-static-v122','loveroll-static-v123','loveroll-static-v124','loveroll-static-v125','loveroll-static-v126','loveroll-static-v127','loveroll-static-v128','loveroll-static-v130','loveroll-static-v131','loveroll-static-v132','loveroll-static-v133','loveroll-static-v134','loveroll-static-v135','loveroll-static-v136','loveroll-static-v137','loveroll-static-v138','loveroll-static-v139','loveroll-static-v140','loveroll-static-v141','loveroll-static-v142','loveroll-static-v143','loveroll-static-v144','loveroll-static-v145','loveroll-static-v146','loveroll-static-v147','loveroll-static-v148','loveroll-static-v149','loveroll-static-v150','loveroll-static-v151','loveroll-static-v152','loveroll-static-v153','loveroll-static-v154','loveroll-static-v155','loveroll-static-v156','loveroll-static-v157','loveroll-static-v158','mon-wallet-offline-v9','other-app-data'],delete:async key=>{deleted.push(key);}}});
 let work;events.activate({waitUntil:promise=>{work=promise;}});await work;
 assert.deepEqual(deleted,['loveroll-static-v121','loveroll-static-v122','loveroll-static-v123','loveroll-static-v124','loveroll-static-v125','loveroll-static-v126','loveroll-static-v127','loveroll-static-v128','loveroll-static-v130','loveroll-static-v131','loveroll-static-v132','loveroll-static-v133','loveroll-static-v134','loveroll-static-v135','loveroll-static-v136','loveroll-static-v137','loveroll-static-v138','loveroll-static-v139','loveroll-static-v140','loveroll-static-v141','loveroll-static-v142','loveroll-static-v143','loveroll-static-v144','loveroll-static-v145','loveroll-static-v146','loveroll-static-v147','loveroll-static-v148','loveroll-static-v149','loveroll-static-v150','loveroll-static-v151','loveroll-static-v152','loveroll-static-v153','loveroll-static-v154','loveroll-static-v155','loveroll-static-v156','loveroll-static-v157','loveroll-static-v158']);
});
test('LoveRoll can force reload from Settings without touching user or challenge data',()=>{
 assert.match(app,/Actualiser LoveRoll/);
 assert.match(app,/if\(verb==='reload-web'\)/);
 assert.match(app,/await reloadWebAssets\(true\)/);
 assert.match(app,/const newest=String\(data\?\.build/);
 assert.match(app,/latest\.searchParams\.set\('web_build',newest\)/);
 assert.match(app,/location\.replace\(latest\.toString\(\)\)/);
 assert.match(app,/state\.diceStatus/);
 assert.match(app,/state\.session/);
 assert.doesNotMatch(app,/localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
});

test('Orphaned active evening NEVER blocks a corrected Web release from loading',()=>{
 const begin=app.indexOf('async function reloadWebAssets(force=false)');
 const end=app.indexOf("window.addEventListener('load'",begin);
 assert.ok(begin>=0&&end>begin,'Version checker must be present');
 const checker=app.slice(begin,end);
 assert.doesNotMatch(checker,/state\.session\s*\|\|/);
 assert.match(checker,/challengeTimer\.running/);
 assert.match(checker,/hasUnsavedForm\(\)/);
 assert.match(checker,/location\.replace\(latest\.toString\(\)\)/);
 assert.match(app,/setInterval\(\(\)=>\{if\(state\.user&&!document\.hidden\)/);
});

test('Éclat mode tabs and title layout resources are cached and versioned',()=>{
 assert.ok(html.includes('evening-eclat-switcher.css?v=20261020-switch178'));
 assert.ok(app.includes('eclat-ui.mjs?v=20261027-web242'));
 assert.ok(sw.includes('./evening-eclat-switcher.mjs'));
 assert.ok(sw.includes('./evening-eclat-switcher.css'));
 assert.ok(read('ritual-titles.css').includes('.eclat-page-title'));
});

test('Web 179 delivers the selected twelve photographic coffrets offline',()=>{
 assert.ok(html.includes('eclat-photo-gallery-v179.css?v=20261020-photo179'));
 assert.ok(app.includes('eclat-ui.mjs?v=20261027-web242'));
 assert.ok(sw.includes('./assets/eclat-photo-strip.webp'));
 assert.ok(sw.includes('./eclat-photo-gallery-v179.css'));
 const style=read('eclat-photo-gallery-v179.css');
 assert.match(style,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(style,/repeat\(6,minmax\(0,1fr\)\)/);
});

test('Web 180 includes one shared nav geometry, a centered picker, and preview guards',()=>{
 assert.ok(html.includes('loveroll-layout-fixes-v180.css?v=20261020-fixed180'));
 assert.ok(app.includes('account-preview-mode.mjs?v=20261020-test180'));
 assert.ok(sw.includes('./loveroll-layout-fixes-v180.css'));
 const sheet=read('loveroll-layout-fixes-v180.css');
 assert.ok(sheet.includes('background:var(--ritual-page)!important'));
 assert.ok(sheet.includes('Bottom navigation now reuses Accueil'));
 assert.ok(sheet.includes('dialog.lr-premium-picker-dialog[open]'));
 assert.ok(sheet.includes('.eclat-offer'));
 const picker=read('loveroll-premium-pickers.mjs');
 assert.match(picker,/select\.getAttribute\('aria-label'\)/);
});

test('Web 181 reuses original Accueil bottom navigation and preserves stored app data',()=>{
 assert.ok(html.includes('loveroll-nav-home-v181.css?v=20261020-homebar181'));
 assert.ok(sw.includes('./loveroll-nav-home-v181.css'));
 const css=read('loveroll-nav-home-v181.css');
 assert.ok(css.includes('selected tab inherits Accueil'));
 assert.ok(css.includes('min-height:52px!important'));
 assert.ok(css.includes('min-height:45px!important'));
 assert.ok(!read('loveroll-layout-fixes-v180.css').includes('height:72px!important'));
 assert.ok(!read('eclat-photo-gallery-v179.css').includes('height:auto!important;min-height:0!important'));
});

test('Web 182 loads the ruby buttons stylesheet with premium-only gold ring',()=>{
 assert.ok(html.includes('loveroll-ruby-buttons-v182.css?v=20261020-ruby182'));
 assert.ok(sw.includes('./loveroll-ruby-buttons-v182.css'));
 const ruby=read('loveroll-ruby-buttons-v182.css');
 assert.ok(ruby.includes('--control-primary:linear-gradient'));
 assert.ok(ruby.includes('.ritual-mode-premium.is-active'));
 assert.ok(app.includes('premium-surprise.mjs?v=20261022-home228'));
});

// The cinema layer is intentionally last: earlier responsive and editorial
// rules keep ownership of spacing and user flows.
test('Web 183 adds cinematic theme assets and new ruby die optics',()=>{
 assert.ok(html.includes('loveroll-cinematic-v183.css?v=20261020-cinema183'));
 assert.ok(html.includes('app.js?v='+appTag));
 assert.ok(sw.includes('./assets/eclat-photo-strip-v183.webp'));
 assert.ok(sw.includes('./assets/eclat-secret-letter-v183.webp'));
 assert.ok(sw.includes('./assets/loveroll-romance-scene-v183.webp'));
 assert.ok(app.includes('eclat-ui.mjs?v=20261027-web242'));
 assert.ok(app.includes('service-worker.js?v='+appTag));
});

test('LoveRoll 184 loads the final coffret visual fidelity skin',()=>{
 assert.ok(html.includes('loveroll-eclat-fidelity-v184.css?v=20261020-fidelity184'));
 assert.ok(sw.includes('./loveroll-eclat-fidelity-v184.css'));
 const layer=read('loveroll-eclat-fidelity-v184.css');
 assert.ok(layer.includes('eclat-tile-number'));
 assert.ok(layer.includes('eclat-tile-arrow'));
 assert.ok(layer.includes('ritual-mode-premium'));
});

// Real service-worker fetch event: an online CSS fix must replace its offline
// fallback, even when the public page used a versioned query-string URL.
test('network-first shell asset refreshes canonical offline cache without touching API or other apps',async()=>{
 const events={},stored=new Map(),touched=[],bg=[];
 const appRoot='https://test.invalid/loveroll/';
 const self={registration:{scope:appRoot},addEventListener:(name,handler)=>{events[name]=handler;}};
 let online=true,body='version a';
 const makeResponse=content=>({ok:true,body:content,clone:()=>makeResponse(content)});
 const caches={open:async name=>({
  put:async(key,response)=>{touched.push([name,key]);stored.set(key,response);},
  match:async key=>stored.get(key)||undefined
 })};
 const ctx={URL,self,caches,
  fetch:async()=>{if(!online)throw Error('offline');return makeResponse(body);},
  Response:{error:()=>({error:true})}};
 vm.runInNewContext(sw,ctx);
 const run=async(url,method='GET')=>{
  let promise=null;bg.length=0;
  events.fetch({request:{url,method,mode:'cors'},respondWith:p=>{promise=p;},
   waitUntil:p=>bg.push(p)});
  if(!promise)return null;
  const result=await promise;await Promise.all(bg);return result;
 };
 const url=appRoot+'premium-dialogs.css?v=20261029-touch';
 const first=await run(url);
 assert.equal(first.body,'version a');
 assert.equal(stored.get(appRoot+'premium-dialogs.css').body,'version a',
  'PWA must refresh the unversioned key the offline fallback reads');
 body='version b';
 await run(url);
 assert.equal(stored.get(appRoot+'premium-dialogs.css').body,'version b',
  'The latest online CSS must replace stale offline styles');
 online=false;
 const fallback=await run(url);
 assert.equal(fallback.body,'version b');
 assert.equal(await run(appRoot+'api/private'),null,
  'Private API calls must bypass the application asset cache');
 assert.equal(await run('https://other.test/mon-wallet-android/app.js'),null,
  'Other origins and applications must remain untouched');
 assert.deepEqual(touched.map(x=>x[1]),[appRoot+'premium-dialogs.css',appRoot+'premium-dialogs.css']);
 assert.ok(touched.every(x=>x[0]==='loveroll-static-v'+release.build.split('.')[1]));
});

test('PWA release refreshes the actual iPad D100 CSS and ONE shared stage module',()=>{
 // iPad visual assets are versioned only when their actual bytes change.
 // A timer-only release must not force a misleading iPad asset version bump.
 const ipadTag=html.match(/ipad-soiree-one-photo-v237[.]css[?]v=([0-9]{8}-ipad[0-9]+)/)?.[1];
 assert.ok(ipadTag,'The approved iPad photo stylesheet needs a versioned URL');
 const d100=read('evening-d100-template.mjs');
 const d6=read('evening-d6-template.mjs');
 const home=read('premium-home.mjs');
 const evening=read('soiree-home-template.mjs');
 assert.ok(html.includes('ipad-soiree-one-photo-v237.css?v='+ipadTag));
 assert.ok(app.includes('evening-d100-template.mjs?v='+ipadTag));
 assert.ok(evening.includes('evening-d100-template.mjs?v='+ipadTag),
  'Soirée and app must share exactly one D100 module instance');
 for(const [source,name] of [[d100,'D100'],[d6,'D6'],[home,'Accueil'],[evening,'Soirée']]){
  assert.ok(source.includes('shared-stage.mjs?v='+ipadTag),name+' must use refreshed iPad scene');
 }
 assert.ok(sw.includes('./ipad-soiree-one-photo-v237.css'));
 assert.ok(sw.includes('./shared-stage.mjs'));
 assert.ok(sw.includes('./evening-d100-template.mjs'));
 assert.ok(app.includes("const WEB_RELEASE='"+release.build+"'"));
 assert.ok(html.includes('app.js?v='+appTag));
 assert.ok(app.includes('service-worker.js?v='+appTag));
});

test('Web 259 and later keep the repaired countdown UI without stale PWA assets',()=>{
 const build=release.build;
 const tag=build.replaceAll('-','').replace('.','-web');
 const [releaseDay,releaseSeq]=build.split('.');
 const day=Number(releaseDay.replaceAll('-',''));
 assert.ok(day>20261029||(day===20261029&&Number(releaseSeq)>=259),
  'The countdown fix first shipped with Web 259');
 const timerImport=app.match(/timed-evening-completion[.]mjs[?]v=([0-9]{8})-timer([0-9]+)/);
 assert.ok(timerImport,'The repaired timer needs a versioned module import');
 const timerDay=Number(timerImport[1]),timerSeq=Number(timerImport[2]);
 assert.ok(timerDay>20261029||(timerDay===20261029&&timerSeq>=259),
  'Never import the pre-fix countdown module');
 assert.ok(html.includes('app.js?v='+tag));
 assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
 assert.ok(app.includes('service-worker.js?v='+tag));
 assert.ok(sw.includes("const CACHE='loveroll-static-v"+build.split('.')[1]+"'"));
 assert.ok(sw.includes('./timed-evening-completion.mjs'),
  'The offline shell must include the active timed completion module');
 assert.doesNotMatch(app,/timed-evening-completion[.]mjs[?]v=20261027-web240/);
 const control=read('timed-evening-completion.mjs');
 assert.match(control,/export function timedEveningTimerControl\(timer\)/);
 assert.match(control,/Validation en cours/);
 assert.match(app,/presentation\.disabled/);
 assert.match(app,/presentation\.resetDisabled/);
});

test('Personal evening length choices persist only for this account on this device',()=>{
 const cache=new Map(),storage={
  getItem:key=>cache.get(key)??null,
  setItem:(key,value)=>{cache.set(key,value);}
 };
 assert.equal(readSessionLength('fred',storage),'libre');
 for(const length of ['5','10','15','30','libre']){
  assert.equal(normalizeSessionLength(length),length);
  assert.equal(saveSessionLength('fred',length,storage),true);
  assert.equal(readSessionLength('fred',storage),length);
  assert.equal(readSessionLength('partner',storage),'libre');
 }
 for(const invalid of [null,undefined,5,'0','60','999','NaN','<script>']){
  assert.equal(saveSessionLength('fred',invalid,storage),false);
 }
 assert.equal(saveSessionLength('', '5',storage),false);
 assert.equal(readSessionLength('',storage),'libre');
 cache.set('loveroll-session-length:fred','corrupt');
 assert.equal(readSessionLength('fred',storage),'libre');
 const restricted={getItem:()=>{throw Error('private browsing');},
  setItem:()=>{throw Error('private browsing');}};
 assert.equal(readSessionLength('fred',restricted),'libre');
 assert.equal(saveSessionLength('fred','10',restricted),false);
});

test('Evening duration settings have accessible choices without an automatic stop',()=>{
 const settings=sessionLengthSettingsHtml('15');
 for(const length of ['5','10','15','30','libre']){
  assert.match(settings,new RegExp('data-action="session-length:'+length+'"'));
 }
 assert.match(settings,/data-action="session-length:15" aria-pressed="true"/);
 assert.match(settings,/Durée souhaitée de ma soirée/);
 assert.match(settings,/ne termine pas automatiquement/);
 assert.match(settings,/Préférence enregistrée sur cet appareil/);
 assert.match(sessionLengthSettingsHtml('unknown'),/data-action="session-length:libre" aria-pressed="true"/);
 assert.match(app,/sessionLengthSettingsHtml\(readSessionLength\(state\.user\?\.id\)\)/);
 assert.match(app,/saveSessionLength\(state\.user\.id,parts\[0\]\)/);
});

test('Safari privacy restrictions cannot crash rendering of session duration preferences',()=>{
 // The localStorage PROPERTY getter may throw before getItem is reached.
 // Evaluate the real implementation against a simulated blocked browser.
 const source=read('session-duration-preference.mjs')
  .replace(/^export /gm,'')+'\n({readSessionLength,saveSessionLength});';
 const blocked={};
 Object.defineProperty(blocked,'localStorage',{
  get(){throw Error('SecurityError: storage access denied');}
 });
 const safe=vm.runInNewContext(source,{globalThis:blocked});
 assert.equal(safe.readSessionLength('fred'),'libre');
 assert.equal(safe.saveSessionLength('fred','15'),false);
 assert.equal(safe.readSessionLength('fred',null),'libre');
 assert.equal(safe.saveSessionLength('fred','15',null),false);
 assert.match(app,/sessionLength:readSessionLength\(uid\)/);
 assert.doesNotMatch(app,/sessionLength:readSessionLength\(uid,localStorage\)/);
});
