import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitTabletRomanceStage} from './shared-stage.mjs';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const app=read('app.js'),dice=read('dice3d.js'),style=read('surprise-dice-layout-v73.css');
const index=read('index.html'),worker=read('service-worker.js');
test('Soirée tolerates an absent review and no longer opens legacy feedback',()=>{
 assert.match(app,/const lastEvening=last\?eveningFinaleStatus\(/);
 assert.match(app,/reviews:state\.eveningReviews/);
 assert.match(app,/partnerId:partner\?\.user_id/);
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
test('iPad final Soirée die shares the actual Surprise D100 size limits',()=>{
 const eveningIpad=read('ipad-soiree-one-photo-v237.css');
 const surprise=read('surprise-d100-v151.css');
 const eveningWidth=/\.evening-finale-dice>\.love3d\{\s*width:([^;]+);/.exec(eveningIpad)?.[1];
 const surpriseTablet=/@media\(min-width:768px\)\{[\s\S]*?\.surprise-main-die-scene>\.love3d-100\{\s*width:([^;]+);/.exec(surprise)?.[1];
 assert.equal(eveningWidth?.replace('!important',''),surpriseTablet,
  'Soirée and Surprise must use the same D100 iPad size limits');
 assert.equal(eveningWidth?.replace('!important',''),'min(82%,43dvh,440px)');
 assert.match(eveningIpad,/\.evening-d100-theater \.love3d-stage\s*\{\s*max-height:none!important/,
  'The landscape WebGL canvas must remain square even beyond its grid row');
 assert.doesNotMatch(eveningIpad,/min\(52vw,39dvh,340px\)/,
  'Do not restore the undersized Soirée die');
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
 assert.match(app,/giftCount,giftPending:isActiveEveningGiftPending\(\),/);
 assert.match(app,/rolling:state\.diceStatus==='rolling'\|\|state\.diceStatus==='pending'/);
 assert.match(app,/redrawPending:isActiveEveningRedrawPending\(\)/);
 assert.match(app,/pendingInviteReference\(sessionStorage\)/);
});

test('Real playable iPad D100 lowers ONE photo marble enough for the WebGL mesh',()=>{
 const inspect=(width,height,heroTop,stageWidth,landscape)=>{
  const vars={};
  const stage={getBoundingClientRect:()=>({width:stageWidth})};
  const hero={
   getBoundingClientRect:()=>({top:heroTop}),
   querySelector:selector=>selector==='.love3d-stage'?stage:null
  };
  const root={
   ownerDocument:{defaultView:{
    innerWidth:width,innerHeight:height,
    matchMedia:query=>({matches:query==='(min-width:768px)'?true:
     query==='(orientation:landscape)'?landscape:false})
   }},
   getBoundingClientRect:()=>({width}),
   classList:{contains:key=>key==='loveroll-evening-page'},
   querySelector:selector=>selector==='.evening-premium-view.has-evening-d100-template'?{}:
    selector==='.evening-d100-theater'?hero:null,
   style:{setProperty:(key,value)=>{vars[key]=Number.parseFloat(value);}}
  };
  fitTabletRomanceStage(root);
  return vars;
 };
 const portrait=inspect(820,1180,267,440,false);
 assert.ok(portrait['--home-scene-contact']>=590,
  'Playable portrait D100 needs real silhouette room below the category row');
 assert.ok(portrait['--home-scene-top-image-height']>=
  portrait['--home-scene-contact']/.342-1);
 const landscape=inspect(1180,820,255,352,true);
 assert.ok(landscape['--home-scene-contact']>=515,
  'Playable landscape D100 must not remain pinned at the old 56dvh contact');
 const photoCss=read('ipad-soiree-one-photo-v237.css');
 assert.match(photoCss,/auto var\(--home-scene-top-image-height\) no-repeat!important/,
  'Zoom/crop the same HD photo without stretching it vertically');
});
