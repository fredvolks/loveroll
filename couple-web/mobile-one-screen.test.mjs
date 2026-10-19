import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
import {adventPremiumHtml} from './premium-advent.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const css=read('mobile-one-screen-v74.css');
test('Mobile main screens have fixed dynamic viewport; bottom navigation remains visible',()=>{
 for(const cls of ['loveroll-evening-page','loveroll-surprise-page','loveroll-advent-page']){
  assert.ok(css.includes('main#app.'+cls),'Missing '+cls);
 }
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/--lr-nav-space:calc\(62px/);
 assert.match(css,/max-height:660px/);
 assert.doesNotMatch(css,/scroll-padding-bottom|grid-auto-rows:max-content/);
});
test('Home owns its responsive layout and retains a real canvas',()=>{
 const home=read('premium-home.css');
 assert.match(home,/height:100dvh/);
 assert.doesNotMatch(home,/transform:translateY\(-8%\)/);
 assert.match(home,/safe-area-inset-bottom/);
 // Navigation is shared; the Home content layout stays in premium-home.css.
 assert.doesNotMatch(css,/loveroll-real-home\s*(?:,|\{)/);
});
test('Step 2 and all private-queue controls fit into the same mobile grid',()=>{
 assert.match(css,/grid-template-rows:minmax\(36px,\.48fr\)/);
 assert.match(css,/\.evening-play-controls \.evening-primary\{/);
 assert.match(css,/\.evening-play-controls \.evening-queue-open-btn\{/);
 assert.match(css,/\.evening-d35-col\{/);
 assert.match(css,/\.evening-play-controls>p\{/);
 const html=premiumEveningHtml({session:{id:'s1'},members:[{user_id:'a',name:'Moi'},{user_id:'b',name:'Partenaire'}],
  me:'a',rolls:[{user_id:'a',face:2},{user_id:'b',face:3}],
  status:{my_rolled:true,partner_rolled:true,both_ready:true},
  turn:{ready:true,first:'a',next:'a',remaining:{a:2,b:3},targets:{a:2,b:3},completed:{a:0,b:0}},
  category:'SENSUEL',ownChallengeCount:2});
 assert.match(html,/data-action="new-challenge"/);
 assert.match(html,/data-action="evening-list"/);
 assert.match(html,/Voir mes défis \(2\)/);
 assert.match(html,/data-action="category:SENSUEL"/);
});
test('Surprise monthly D20, host D6, six events stay in one fixed panel view',()=>{
 const html=premiumSurpriseHtml({members:[{user_id:'a',name:'Moi'},{user_id:'b',name:'Partenaire'}]});
 assert.match(css,/\.surprise-premium-view\{/);
 assert.match(css,/\.surprise-host-die\{/);
 assert.match(css,/\.surprise-special-grid\{/);
 assert.match(html,/data-dice-sides="20"/);
 assert.doesNotMatch(html,/data-dice-sides="6"/);
 const ready=premiumSurpriseHtml({monthly:{monthly_activity:{face:2}}});
 assert.match(ready,/data-dice-sides="6"/);
 assert.equal((html.match(/data-action="edit-surprise-event:/g)||[]).length,6);
});
test('Advent 25 squares keep their screen space',()=>{
 assert.match(css,/\.advent-premium-view\{/);
 assert.match(css,/\.advent-tiles\{/);
 const html=adventPremiumHtml();
 assert.equal((html.match(/class="advent-box /g)||[]).length,25);
});
test('v74 loaded LAST in HTML and cached with updated worker; server version updated',()=>{
 const index=read('index.html'),sw=read('service-worker.js'),v=JSON.parse(read('web-version.json'));
 assert.equal(v.build,'2026-10-17.142');
 assert.match(index,/mobile-one-screen-v74\.css\?v=20261017-editorial121/);
 assert.ok(index.lastIndexOf('mobile-one-screen-v74.css')>index.lastIndexOf('surprise-dice-layout-v73.css'));
 assert.match(sw,/loveroll-static-v142/);
 assert.match(sw,/\.\/mobile-one-screen-v74\.css/);
});

test('Completed D6 stage collapses to private scoreboard to fit Step 2 without scrolling',()=>{
 const html=premiumEveningHtml({session:{id:'s1'},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Partner'}],me:'a',
  rolls:[{user_id:'a',face:2},{user_id:'b',face:3}],
  status:{both_ready:true,my_rolled:true,partner_rolled:true},
  turn:{ready:true,first:'a',next:'a',remaining:{a:2,b:3},targets:{a:2,b:3},completed:{a:0,b:0}},
  category:'SENSUEL'});
 assert.match(html,/evening-premium-view is-ready/);
 assert.match(html,/evening-step one is-complete/);
 assert.match(html,/evening-step1-summary/);
 assert.match(html,/data-action="evening-list"/);
 assert.match(css,/\.evening-step\.one\.is-complete \.evening-d6-grid/);
 assert.match(css,/\.evening-premium-view\.is-waiting \.evening-step\.two \.evening-play/);
});
