import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=f=>readFileSync(new URL('./'+f,import.meta.url),'utf8');
test('ruby material is shipped as the last stylesheet with fixed control sizes',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),css=read('loveroll-ruby-buttons-v182.css');
 assert.match(html,/loveroll-ruby-buttons-v182\.css\?v=20261020-ruby182/);
 assert.ok(html.indexOf('loveroll-nav-home-v181.css')<html.indexOf('loveroll-ruby-buttons-v182.css'));
 assert.match(sw,/loveroll-static-v182/);
 assert.ok(sw.includes('./loveroll-ruby-buttons-v182.css'));
 assert.match(css,/--control-primary:linear-gradient/);
 assert.match(css,/--ritual-page:radial-gradient/);
 assert.match(css,/\.ritual-mode-premium\.is-active/);
 assert.match(css,/\.loveroll-eclat-page :is\(/);
 assert.doesNotMatch(css,/\b(?:height|min-height|width|padding|border-radius):[^;]+!important/);
});
test('gold only marks premium controls, not normal pages or bottom navigation',()=>{
 const css=read('loveroll-ruby-buttons-v182.css');
 const suffix=css.slice(css.indexOf('/* Éclat is the ONLY premium surface'));
 const goldLines=suffix.split('\n').filter(line=>/#(?:c9a06a|f2cb8f|e0b678|edc892|f4cd8b)/i.test(line));
 assert.ok(goldLines.length>=3);
 assert.doesNotMatch(suffix,/\.nav\s+button\.active/);
 assert.doesNotMatch(suffix,/canvas\[data-dice-sides\][^{]*\{[^}]*\b(?:background|transform|filter):/);
});
test('Surprise keeps its real D100 and changes only the activity CTA label',()=>{
 const src=read('premium-surprise.mjs');
 assert.match(src,/premiumPolyDie\(100,rollingActivity\?rollFace:a\?\.face\|\|null/);
 assert.match(src,/'surprise-activity','Découvrir notre activité','surprise-primary',rolling/);
 assert.doesNotMatch(src,/'surprise-activity','Voir notre activité','surprise-primary',rolling/);
 const ready=premiumSurpriseHtml({monthly:{monthly_activity:{face:11}},members:[{name:'A'},{name:'B'}]});
 assert.match(ready,/Découvrir notre activité/);
 assert.match(ready,/data-dice-sides="100"/);
});
