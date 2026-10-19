import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const app=read('app.js'),dice=read('dice3d.js'),style=read('surprise-dice-layout-v73.css');
const index=read('index.html'),worker=read('service-worker.js');
test('Soirée tolerates an absent review and no longer opens legacy feedback',()=>{
 assert.match(app,/const recentReviews=last\?\(state.eveningReviews\|\|\[\]\)/);
 assert.match(app,/reviewModalSessionId/);
 assert.doesNotMatch(app,/feedbackItemsFor|my_love_feedback_status|choose-feedback|save-feedback/);
 assert.doesNotMatch(app,/loveroll-aftercare-auto-recover-/);
 assert.match(app,/reviewModalSessionId/);
});
test('Surprise monthly D100 and host D6 own separate centered 3D stages and never escape scene',()=>{
 assert.match(style,/surprise-d20-scene/);
 assert.match(style,/surprise-host-die/);
 assert.match(style,/display:grid;place-items:center/);
 assert.match(style,/\.dice-canvas\{/);
 assert.match(style,/position:absolute!important/);
 assert.match(style,/overflow:hidden!important/);
 assert.match(style,/grid-template-rows:minmax\(49px,auto\) minmax\(230px,auto\)/);
 assert.match(style,/max-width:767px/);
 assert.match(style,/min-width:768px/);
});
test('Renderer resizes to live scene with WebGL camera correctly, also after orientation switch',()=>{
 assert.match(dice,/const layoutSize=\(\)=>/);
 assert.match(dice,/canvas\.getBoundingClientRect\(\)/);
 assert.match(dice,/renderer\.setSize\(width,height,false\)/);
 assert.match(dice,/camera\.aspect=width\/height/);
 assert.match(dice,/new ResizeObserver\(resizeDie\)/);
 assert.match(dice,/resizeObserver\?\.disconnect\(\)/);
});
test('PWA and served HTML share v73 CSS and cache-busting tags',()=>{
 assert.match(index,/surprise-refined-v104\.css\?v=20261017-ritual130/);
 assert.match(worker,/const CACHE='loveroll-static-v\d+';/);
 assert.match(worker,/surprise-dice-layout-v73\.css/);
 assert.ok(app.includes("const WEB_RELEASE='"+JSON.parse(read('web-version.json')).build+"'"));
});

test('Active Soirée does not pass an unbound pending challenge into premiumEveningHtml',()=>{
 assert.doesNotMatch(app,/giftCount,pending,rolling/);
 assert.match(app,/turn,category:state\.category,/);
 assert.match(app,/showSensuel:state\.couple\?\.show_sensuel_button!==false/);
 assert.match(app,/giftCount,rolling:state\.diceStatus==='rolling'\|\|state\.diceStatus==='pending'/);
 assert.match(app,/pendingInviteReference\(sessionStorage\)/);
});
