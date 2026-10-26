import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldShowIosTour,isIosSafari,IOS_TOUR_KEY} from './ios-install-tour.mjs';
import {soundEnabled,setSoundEnabled} from './loveroll-sounds.mjs';
const read=x=>readFileSync(new URL('./'+x,import.meta.url),'utf8');
test('Safari tour first launch and week-long postpone',()=>{
 const values=new Map();const store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(shouldShowIosTour(store,10000),true);
 store.setItem(IOS_TOUR_KEY,JSON.stringify({choice:'later',at:1000}));
 assert.equal(shouldShowIosTour(store,20000),false);
 assert.equal(shouldShowIosTour(store,8*86400000),true);
 store.setItem(IOS_TOUR_KEY,JSON.stringify({choice:'done',at:1000}));
 assert.equal(shouldShowIosTour(store,8*86400000),false);
});
test('only Safari iPhone web gets auto tour, not PWA, Messenger or Android',()=>{
 const safari={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18 Mobile/15E148 Safari/604.1',platform:'iPhone'};
 assert.equal(isIosSafari(safari,{matchMedia:()=>({matches:false})}),true);
 assert.equal(isIosSafari({...safari,userAgent:safari.userAgent.replace('Safari/604.1','CriOS/125')},{matchMedia:()=>({matches:false})}),false);
 assert.equal(isIosSafari(safari,{matchMedia:()=>({matches:true})}),false);
 assert.equal(isIosSafari({userAgent:'Android Chrome'},{matchMedia:()=>({matches:false})}),false);
});
test('sound toggle is device-local, no server key needed',()=>{
 const m=new Map(),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 assert.equal(soundEnabled(store),true);
 setSoundEnabled(false,store);assert.equal(soundEnabled(store),false);
 setSoundEnabled(true,store);assert.equal(soundEnabled(store),true);
});
test('premium category invitation and native 3D engine retained',()=>{
 const evening=read('premium-evening.mjs');const app=read('app.js'),guide=read('ios-install-tour.mjs');
 assert.match(evening,/Choisis ta catégorie pour lancer le dé/);
 assert.match(evening,/!category&&canDraw/);
 assert.match(evening,/group\.querySelector\('\.lr-category-hint'\)/);
 assert.match(app,/showEveningCategoryReminder/);
 assert.match(app,/playLoveRollSound\('challenge:'\+payload\.new\.id\)/);
 assert.match(app,/sound-test/);
 assert.match(guide,/window\.addEventListener\('loveroll:ios-install-guide'/);
 assert.match(read('index.html'),/ios-install-tour\.mjs/);
 assert.match(read('manifest.webmanifest'),/\"standalone\"/);
});

test('New challenges notify only the recipient with generic text',()=>{
 const sql=read('migrations/20261025_love_challenge_notifications.sql');
 const edge=read('functions/love-push-dispatch/index.ts');
 const sw=read('service-worker.js');
 const native=read('../app/src/main/java/ca/desadeux/jeu/LoveRollFcmService.java');
 const settings=read('push-notifications.mjs');
 assert.match(sql,/new\.recipient is distinct from new\.offered_by/);
 assert.match(sql,/new\.id::text/);
 assert.doesNotMatch(sql,/new\.card_title|new\.card_description/);
 assert.match(edge,/special,challenge/);
 assert.match(edge,/fredvolks\.github\.io\/loveroll/);
 assert.doesNotMatch(edge,/mon-wallet-android/);
 assert.match(sw,/kind==='challenge'/);
 assert.match(native,/case "challenge"/);
 assert.match(settings,/Nouveaux défis/);
});
