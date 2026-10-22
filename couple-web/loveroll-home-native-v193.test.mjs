import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
test('Home 193 renders live native controls, not a screenshot with hotspots',()=>{
 const html=read('index.html'),home=read('premium-home.mjs'),css=read('loveroll-home-native-v193.css'),app=read('app.js');
 assert.ok(html.includes('loveroll-home-native-v193.css?v=20261020-native193'));
 assert.ok(html.includes('loveroll-home-touch-v193.js?v=20261022-home228'));
 assert.doesNotMatch(html,/approved-home-idle-v190\.(css|js)|approved-home-crisp-v191\.(css|js)/);
 assert.match(home,/data-action="roll:weekly"/);
 assert.match(home,/home-die-platform/);
 assert.match(home,/home-next-month/);
 assert.match(css,/home-roll-button:not\(\.is-used\):active/);
 assert.doesNotMatch(css,/home-reference-approved-v190/);
 assert.match(app,/title:'Brasser le dé \?'/);
});
test('Native press animation keeps live data untouched',()=>{
 const js=read('loveroll-home-touch-v193.js'),sw=read('service-worker.js');
 assert.match(js,/pointerdown/);assert.match(js,/lr-pressed/);
 assert.doesNotMatch(js,/rpc\(|localStorage\.clear|sessionStorage\.clear/);
 assert.match(sw,/loveroll-static-v228/);
 assert.ok(sw.includes('./loveroll-home-native-v193.css'));
});