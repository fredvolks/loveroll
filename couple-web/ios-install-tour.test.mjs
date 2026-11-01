import test from 'node:test';
import assert from 'node:assert/strict';
import {isIosSafari,isIosTablet,iosInstallTourTitle,shouldShowIosTour,cycleIosTourFocus} from './ios-install-tour.mjs';

const safariWindow={LoveRollNativeAuth:false,matchMedia:()=>({matches:false})};
const iphone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari',platform:'iPhone',maxTouchPoints:5};
const ipad={userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Safari',platform:'iPad',maxTouchPoints:5};
const ipadDesktopUA={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit Safari',platform:'MacIntel',maxTouchPoints:5};
const mac={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit Safari',platform:'MacIntel',maxTouchPoints:0};

test('Safari installation guide distinguishes iPhone, iPad and desktop-class iPad Safari',()=>{
 assert.equal(isIosSafari(iphone,safariWindow),true);
 assert.equal(isIosSafari(ipad,safariWindow),true);
 assert.equal(isIosSafari(ipadDesktopUA,safariWindow),true);
 assert.equal(isIosSafari(mac,safariWindow),false);
 assert.equal(isIosTablet(iphone),false);
 assert.equal(isIosTablet(ipad),true);
 assert.equal(isIosTablet(ipadDesktopUA),true);
 assert.equal(iosInstallTourTitle(iphone),'LoveRoll sur ton iPhone');
 assert.equal(iosInstallTourTitle(ipad),'LoveRoll sur ton iPad');
 assert.equal(iosInstallTourTitle(ipadDesktopUA),'LoveRoll sur ton iPad');
 assert.equal(isIosSafari({...ipad,userAgent:'CriOS iPad'},safariWindow),false);
 assert.equal(isIosSafari(ipad,{...safariWindow,matchMedia:()=>({matches:true})}),false);
});

test('iOS tour never becomes permanently hidden from a broken or future reminder timestamp',()=>{
 const now=1_900_000_000_000,week=7*86400000;
 const saved=data=>({getItem:()=>data===null?null:JSON.stringify(data)});
 assert.equal(shouldShowIosTour(saved(null),now),true);
 assert.equal(shouldShowIosTour(saved({choice:'done',at:now-week*3}),now),false);
 assert.equal(shouldShowIosTour(saved({choice:'later',at:now-week+1}),now),false);
 assert.equal(shouldShowIosTour(saved({choice:'later',at:now-week-1}),now),true);
 for(const at of [null,'invalid',Infinity,-100,now+86400000]){
  assert.equal(shouldShowIosTour(saved({choice:'later',at}),now),true,String(at));
 }
 assert.equal(shouldShowIosTour(saved({choice:'unknown',at:now}),now),true);
 assert.equal(shouldShowIosTour({getItem:()=>'{broken'},now),true);
});

test('iOS tour Tab focus cannot escape even if background or removed control was focused',()=>{
 const focused=[],controls=['close','back','next'].map(label=>({
  label,focus:options=>focused.push({label,options})
 }));
 const trap=(active,shiftKey=false)=>{
  let blocked=false;
  const event={key:'Tab',shiftKey,preventDefault:()=>{blocked=true;}};
  const moved=cycleIosTourFocus(event,controls,active);
  return {blocked,moved};
 };
 assert.deepEqual(trap(controls[2]),{blocked:true,moved:true});
 assert.deepEqual(focused.pop(),{label:'close',options:{preventScroll:true}});
 assert.deepEqual(trap(controls[0],true),{blocked:true,moved:true});
 assert.deepEqual(focused.pop(),{label:'next',options:{preventScroll:true}});
 assert.deepEqual(trap(null),{blocked:true,moved:true});
 assert.deepEqual(focused.pop(),{label:'close',options:{preventScroll:true}});
 assert.deepEqual(trap(null,true),{blocked:true,moved:true});
 assert.deepEqual(focused.pop(),{label:'next',options:{preventScroll:true}});
 assert.deepEqual(trap(controls[1]),{blocked:false,moved:false});
 assert.equal(cycleIosTourFocus({key:'Escape'},controls,controls[1]),false);
});
