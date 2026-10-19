import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANGUAGES,CURRENCIES,RADIUS_CHOICES,localeOrDefault,currencyOrDefault,normalizeSharedTravel,htmlDirection,t,worldwideSettingsHtml,isLocalSearchReady,money} from './world-preferences.mjs';
import {cadExchangeRate,displayCadRange} from './currency-exchange.mjs';
test('Exactly 10 complete worldwide preference translations are available',()=>{
 assert.equal(LANGUAGES.length,10);
 assert.equal(new Set(LANGUAGES.map(([id])=>id)).size,10);
 for(const [language] of LANGUAGES){
  for(const word of ['title','language','currency','departure','distance','gps','savePersonal','saveDuo','provider','privacy']){
   assert.ok(t(language,word)&&t(language,word)!==word,language+' '+word);
  }
  assert.equal((worldwideSettingsHtml({locale:language}).match(/<option value="fr-CA"/g)||[]).length,1);
 }
 assert.equal(htmlDirection('ar'),'rtl');
 assert.equal(htmlDirection('en'),'ltr');
});
test('Explicit opt-in GPS and bounded shared distance, no precise coordinates',()=>{
 assert.deepEqual(RADIUS_CHOICES.includes(125),true);
 const v=normalizeSharedTravel({travel_origin_label:'Paris',travel_origin_lat:48.85661,travel_origin_lon:2.3511,travel_radius_km:125,activity_localization_enabled:true});
 assert.equal(v.travel_origin_lat,48.86);assert.equal(v.travel_origin_lon,2.35);
 assert.equal(v.travel_radius_km,125);
 assert.equal(isLocalSearchReady(v,false),false,'Never claim nearby search ready without routing/places provider');
 assert.equal(isLocalSearchReady(v,true),true);
 assert.equal(normalizeSharedTravel({travel_origin_lat:null,travel_origin_lon:null,travel_radius_km:9999}).travel_radius_km,125);
 assert.equal(normalizeSharedTravel({travel_origin_lat:90.5,travel_origin_lon:6}).travel_origin_lat,null);
 const app=readFileSync(new URL('app.js',import.meta.url),'utf8');
 const click=app.indexOf("if(verb==='world-gps')"),gpsCall=app.indexOf('navigator.geolocation.getCurrentPosition');
 assert.ok(click>0&&gpsCall>click&&gpsCall<app.indexOf("if(verb==='save-world-duo')"));
 assert.match(app,/save_love_travel_preferences/);
 assert.match(app,/preferred_locale:locale,preferred_currency:currency/);
});
test('Settings always escape user-provided starting city',()=>{
 const html=worldwideSettingsHtml({couple:{travel_origin_label:'<img src=x onerror=alert(1)>'}});
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.match(html,/data-action="save-world-duo"/);
 assert.match(html,/data-action="save-world-personal"/);
 assert.match(html,/data-action="world-gps"/);
});
test('Currencies always come from real daily provider rates or retain original CAD',async()=>{
 const fx=await cadExchangeRate('EUR',async url=>({
  ok:true,json:async()=>({base:'CAD',quote:'EUR',rate:0.62,date:'2026-10-19'})
 }));
 assert.equal(fx.rate,0.62);assert.equal(fx.date,'2026-10-19');
 assert.ok(displayCadRange(200,400,{currency:'EUR',exchange:fx,locale:'fr-CA'}).text.includes('€'));
 const missing=displayCadRange(200,400,{currency:'EUR',exchange:null});
 assert.equal(missing.currency,'CAD');
 assert.match(missing.note,/CAD/);
 await assert.rejects(()=>cadExchangeRate('GBP',async()=>({
  ok:true,json:async()=>({base:'EUR',quote:'GBP',rate:0.88})
 })),/invalide/);
 assert.equal(currencyOrDefault('BTC'),'CAD');
 assert.equal(localeOrDefault('fake'),'fr-CA');
 assert.ok(CURRENCIES.includes('MAD')&&CURRENCIES.includes('JPY'));
 assert.ok(money(125,'CAD','fr-CA').includes('125'));
});
