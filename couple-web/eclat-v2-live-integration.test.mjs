import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./eclat-v2-stage.css',import.meta.url),'utf8');
const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('./web-version.json',import.meta.url),'utf8'));

test('all official 12 coffrets open in the real LoveRoll through a server-confirmed V2 session',()=>{
 assert.match(app,/import \{createEclatV2SessionApi\}/);
 assert.match(app,/import \{createEclatV2PlayController\}/);
 assert.match(app,/const eclatV2Api=client\?createEclatV2SessionApi\(client\):null/);
 assert.match(app,/const value=await eclatV2Api\.status\(\)/);
 assert.match(app,/if\(\['PGRST202','42883'\]\.includes\(error\?\.code\)\)\{\s*state\.eclatV2Status=null/);
 assert.match(app,/disposeEclatV2Player\(\)/);
 assert.match(app,/state\.eclatV2Status\?\.access===true&&!state\.eclat\?\.active\)\{/);
 assert.match(app,/state\.eclatV2OwnerId===state\.user\?\.id&&state\.eclatV2CoupleId===state\.coupleId/);
 assert.match(app,/const result=await eclatV2Api\.start\(\{coffretId:num,minutes:state\.eclatMinutes,/);
 assert.match(app,/result\.content_version!==2/);
 assert.match(app,/state\.eclat=await rpc\('love_eclat_start'/,
  'older published V1 RPC remains the safe fallback before V2 migration');
 assert.match(app,/Number\.isInteger\(num\)\|\|num<1\|\|num>12/);
});

test('premium auth, client identity and shared-phone restrictions are never mocked',()=>{
 assert.match(app,/if\(v2\?\.access&&v2\.active&&!e\?\.active\)/);
 assert.match(app,/const sharedDevice=v2\.device_mode==='one',isSharedHost=state\.user\?\.id===v2\.role_a/);
 assert.match(app,/if\(sharedDevice&&!isSharedHost\)/);
 assert.match(app,/viewerId:state\.user\.id,initialStatus:v2/);
 assert.match(app,/eclatV2Player=createEclatV2PlayController/);
 assert.match(app,/if\(!result\?\.access\|\|!result\.active\|\|result\.content_version!==2\)/);
 assert.match(app,/!state\.eclatV2Status\?\.access\|\|state\.eclatV2Status\?\.active/);
 assert.doesNotMatch(app,/testModeEligible\s*\?\s*\{\s*access:true,active:true,content_version:2/);
});

test('two devices or one shared device are selectable, and leaving does not leak private controllers',()=>{
 assert.match(app,/state\.eclatV2DeviceMode=parts\[1\]/);
 assert.match(app,/button\('eclat-v2:mode:two'/);
 assert.match(app,/button\('eclat-v2:mode:one'/);
 assert.match(app,/deviceMode:state\.eclatV2DeviceMode/);
 assert.match(app,/if\(state\.tab!=='eclat'\|\|!state\.user\|\|state\.passwordRecovery\|\|/);
 assert.match(app,/!verifiedLoveEmail\(state\.user\)\|\|!state\.profile\?\.birthday_md/);
 assert.match(app,/if\(state\.tab!=='eclat'\)\{disposeEclatV2Player\(\)/);
 assert.match(app,/if\(eclatV2Player\)\{eclatV2Player\.destroy\(\)/);
 assert.match(app,/eclatV2Poll=setInterval/);
 assert.match(app,/const latest=currentPlayer\.getStatus\(\)/);
 assert.match(app,/disposeEclatV2Player\(\);render\(\)/);
});

test('Web 251 CSS, bootloader and cache agree on the same feature revision',()=>{
 assert.equal(manifest.build,'2026-10-28.251');
 assert.match(app,/const WEB_RELEASE='2026-10-28.251'/);
 assert.match(html,/app\.js\?v=20261028-web251/);
 assert.match(html,/eclat-v2-stage\.css\?v=20261028-v2-live251/);
 assert.match(sw,/const CACHE='loveroll-static-v251'/);
 assert.match(css,/\.eclat-v2-live/);
 assert.match(css,/\.eclat-v2-device-choice/);
});


test('cached V2 status belongs only to the exact signed-in user and original couple',()=>{
 assert.match(app,/eclatV2OwnerId:null,eclatV2CoupleId:null/);
 assert.match(app,/state\.eclatV2OwnerId===state\.user\?\.id&&/);
 assert.match(app,/state\.eclatV2CoupleId===state\.coupleId\?state\.eclatV2Status:null/);
 assert.match(app,/state\.eclatV2OwnerId=userId;state\.eclatV2CoupleId=coupleId/);
 assert.match(app,/state\.eclatV2OwnerId=state\.user\.id;state\.eclatV2CoupleId=state\.coupleId/);
 assert.match(app,/if\(!state\.user\?\.id\|\|state\.passwordRecovery\)\{state\.eclatV2Status=null/);
 assert.match(app,/if\(state\.eclatV2OwnerId!==state\.user\?\.id\|\|state\.eclatV2CoupleId!==state\.coupleId/);
});


test('V2 completion preserves the approved finale until user intentionally opens the gallery',()=>{
 assert.match(app,/id="eclat-v2-finished-return" hidden/);
 assert.match(app,/button\('eclat-v2:gallery','Retour aux 12 coffrets'/);
 assert.match(app,/if\(!latest\.active\)\{/);
 assert.match(app,/returnToGallery\.hidden=false/);
 assert.match(app,/clearInterval\(eclatV2Poll\)/);
 assert.match(app,/if\(!latest\?\.access\)\{\s*disposeEclatV2Player\(\);render\(\);return;/);
});


test('ordinary redraw preserves same real editor; identity loss or server denial closes it',()=>{
 assert.match(app,/import \{canReuseEclatV2Editor\}/);
 assert.match(app,/if\(canReuseEclatV2Editor\(\{/);
 assert.match(app,/player:mounted,userId:state\.user\?\.id/);
 assert.match(app,/lockedCoupleId:state\.eclatV2CoupleId/);
 assert.match(app,/hasMountedHost:!!root\.querySelector\('#eclat-v2-live-player'\)/);
 assert.match(app,/if\(state\.tab!=='eclat'\|\|!state\.user\|\|state\.passwordRecovery\|\|/);
 assert.match(app,/!verifiedLoveEmail\(state\.user\)\|\|!state\.profile\?\.birthday_md/);
 assert.match(app,/\['42501','28000'\]\.includes\(error\?\.code\)/);
 assert.match(app,/state\.eclatV2Status=\{access:false,active:false\};\s*disposeEclatV2Player\(\)/);
});


test('revoked child status cannot be remounted by an unrelated app-level update',()=>{
 assert.match(app,/\}\)\.catch\(error=>\{\s*if\(eclatV2Player!==currentPlayer\)return;/);
 assert.match(app,/const latest=currentPlayer\.getStatus\(\);\s*if\(latest\?\.access===false\)/);
 assert.match(app,/state\.eclatV2Status=\{access:false,active:false\};\s*disposeEclatV2Player\(\);render\(\);return;/);
 assert.match(app,/if\(canReuseEclatV2Editor\(\{/);
});


test('a confirmed V2 Premium entitlement opens the public gallery without legacy V1 entitlement',()=>{
 // A server-confirmed V2 right is only projected onto the catalog display;
 // it never writes into, escalates or replaces the existing V1 SQL status.
 assert.match(app,/const catalogStatus=v2Ready\?\{\.\.\.\(e\|\|\{\}\),access:true,active:false\}:e/);
 assert.match(app,/frame\(eclatHtml\(\{status:catalogStatus/);
 assert.match(app,/const v2Ready=v2\?\.access===true&&!e\?\.active/);
 // The V2 start MUST happen before the V1-only entitlement rejection.
 const start=app.slice(app.indexOf("if(kind==='start'){"),app.indexOf("if(kind==='choose'){"));
 const v2Start=start.indexOf("await eclatV2Api.start(");
 const v1Guard=start.indexOf("if(!previewEclatStatus(");
 const v1Start=start.indexOf("await rpc('love_eclat_start'");
 assert.ok(v2Start>0&&v1Guard>v2Start&&v1Start>v1Guard,
  'genuine V2 server rights must work independently of V1, which retains its own guard');
 assert.match(start,/state\.eclatV2OwnerId===state\.user\?\.id&&state\.eclatV2CoupleId===state\.coupleId/);
 assert.match(start,/state\.eclatV2Status\?\.access===true&&!state\.eclat\?\.active/);
});
