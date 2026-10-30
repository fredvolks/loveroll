import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const d6=read('evening-d6-template.mjs'),d100=read('evening-d100-template.mjs'),
 idle=read('soiree-home-template.mjs'),css=read('ipad-soiree-one-photo-v237.css'),
 d6css=read('evening-d6-template.css'),d100css=read('evening-d100-template.css');
test('All Soirée states share the SAME live Android 3D templates on iPad',()=>{
 assert.match(d6,/fitTabletRomanceStage\(root\)/);
 assert.match(d100,/fitTabletRomanceStage\(root\)/);
 assert.match(idle,/fitTabletRomanceStage\(root\)/);
 for(const module of [d6,d100,idle])
  assert.match(module,/matchMedia\('\(max-width:1199px\), \(pointer:coarse\) and \(min-width:768px\)'\)/);
 assert.match(d6,/\.home-die-platform/);
 assert.match(d100,/evening-d100-theater/);
 assert.match(d100,/insertAdjacentHTML\('beforeend'/);
 assert.match(idle,/soiree-pedestal-marker/);
 assert.match(d6css,/@media\(max-width:1199px\)/);
 assert.match(d100css,/@media\(max-width:1199px\)/);
});
test('iPad Soirée draws one photographic layer and NO second background or separate pedestal',()=>{
 assert.match(css,/loveroll-home-portrait-v202\.webp/);
 assert.match(css,/background:none!important;background-image:none!important/);
 assert.match(css,/main#app\.loveroll-evening-page:has\([\s\S]*?\)::after\s*\{[\s\S]*?display:none!important/);
 assert.match(css,/\.home-pedestal,\.soiree-pedestal-marker/);
 assert.match(css,/width:0!important;height:0!important/);
 assert.match(css,/@layer loveroll-soiree-template/);
 assert.match(css,/\.evening-premium-view\.has-evening-d100-template :is\(/);
 assert.match(css,/grid-column:1\/-1!important/);
 assert.match(css,/min-width:768px/);
 assert.doesNotMatch(css,/url\(['"]?\.\/assets\/(?:ritual-satin-v115|loveroll-home-landscape-v199)\.webp/);
 assert.doesNotMatch(css,/<img|<canvas/);
});
test('Web 237 one-photo rule remains intact in the current release with offline assets',()=>{
 const html=read('index.html'),app=read('app.js'),sw=read('service-worker.js');
 const build=JSON.parse(read('web-version.json')).build;
 const ipadTag=build.split('.')[0].replaceAll('-','')+'-ipad'+build.split('.')[1];
 assert.ok(html.includes('ipad-soiree-one-photo-v237.css?v='+ipadTag),
  'The approved photo must load with a cache-buster matching the current release');
 const moduleTag=build.split('.')[0].replaceAll('-','')+'-web'+build.split('.')[1];
 assert.ok(app.includes('soiree-home-template.mjs?v='+moduleTag),
  'The real Soirée module must be refreshed at the displayed PWA release');
 assert.ok(app.includes("const WEB_RELEASE='"+build+"'"));
 assert.ok(sw.includes('loveroll-static-v'+build.split('.')[1]));
 assert.ok(sw.includes("'./ipad-soiree-one-photo-v237.css'"));
 assert.match(build,/^\d{4}-\d{2}-\d{2}\.\d+$/);
});
