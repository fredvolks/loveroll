import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const css=read('ipad-android-stage-v236.css');
const android=read('loveroll-android-ruby-v194.css');
const html=read('index.html');
const js=read('shared-stage.mjs');
const home=read('premium-home.mjs');
const evening=read('evening-d100-template.mjs');
const empty=read('soiree-home-template.mjs');
const dice=read('dice3d.js');

test('iPad displays EXACT approved Android HD v202 roses, velvet and marble photograph',()=>{
 assert.match(android,/@media \(max-width:767px\)[\s\S]*?loveroll-home-portrait-v202\.webp/);
 assert.match(css,/@media \(min-width:768px\)/);
 assert.match(css,/loveroll-home-portrait-v202\.webp/);
 assert.doesNotMatch(css,/url\(['"]?\.\/assets\/(?:loveroll-home-landscape-v199|ritual-satin-v115|loveroll-pedestal-03-v198)\.webp/);
 assert.match(css,/background-image:none!important/);
 assert.match(css,/background-size:100% var\(--home-scene-top-image-height\)/);
 assert.match(css,/\.home-die-theater::before/);
 assert.match(css,/\.evening-finale-velvet/);
});

test('photo owns the ONLY marble pedestal; no second image nor frame on iPad',()=>{
 assert.match(css,/width:0!important/);
 assert.match(css,/\.home-pedestal-contact/);
 assert.match(css,/\.evening-die-row>\.home-pedestal/);
 assert.match(css,/\.evening-finale-hero>\.soiree-pedestal-marker/);
 assert.match(home,/fitTabletRomanceStage\(root\)/);
 assert.match(empty,/fitTabletRomanceStage\(root\)/);
 assert.match(evening,/fitTabletRomanceStage\(root\)/);
 assert.match(evening,/hero\.insertAdjacentHTML\('beforeend'/);
 assert.match(js,/photoHeight=width\*1672\/941/);
 assert.match(js,/contact-photoHeight\*\.342/);
});

test('both real dice and official results remain intact while glass follows the SAME photo offset',()=>{
 assert.match(dice,/const photoOffset=stageHeight/);
 assert.match(dice,/--lr-ipad-scene-offset/);
 assert.match(dice,/photoSoiree=.*loveroll-evening-page/);
 assert.match(dice,/built\.material\.roughness=\.075/);
 assert.match(home,/data-dice-sides="6"/);
 assert.match(evening,/classList\.add\('home-die-theater','evening-d100-theater'\)/);
 assert.match(html,/ipad-android-stage-v236\.css\?v=20261026-web236/);
 assert.match(read('service-worker.js'),/\.\/ipad-android-stage-v236\.css/);
 const build=JSON.parse(read('web-version.json')).build;
 assert.match(build,/^\d{4}-\d{2}-\d{2}\.\d+$/);
 assert.ok(read('app.js').includes("const WEB_RELEASE='"+build+"'"));
});
