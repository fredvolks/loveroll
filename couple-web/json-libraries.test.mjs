import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
 buildEveningLibrary,validateEveningLibrary,buildMonthlyLibrary,validateMonthlyLibrary,
 librarySummary,validatePortableAdvent,validatePortableSpecial
} from './json-libraries.mjs';
import {SPECIAL_EVENT_KEYS} from './private-special-events.mjs';

test('evening category export contains 100 cards and preserves timer metadata',()=>{
 const empty=buildEveningLibrary('SENSUEL',[]);
 assert.equal(empty.cards.length,100);
 assert.equal(librarySummary(empty,'evening').total,100);
 const changed={category:'SENSUEL',card_id:1,title:'Câlin surprise',description:'Serrer doucement dans les bras pendant une minute',timer_minutes:5,drawer_role:'both',recipient_role:'both'};
 const lib=buildEveningLibrary('SENSUEL',[changed]);
 assert.equal(lib.cards[0].timer_minutes,5);
 assert.equal(librarySummary(lib,'evening').timers>=1,true);
 assert.deepEqual(validateEveningLibrary(JSON.parse(JSON.stringify(lib))).cards,lib.cards);
});

test('invalid evening JSON does not validate or overwrite',()=>{
 const lib=buildEveningLibrary('SEXUEL');
 lib.cards[0].timer_minutes=61;
 assert.throws(()=>validateEveningLibrary(lib),/durée/i);
 lib.cards[0].timer_minutes=3;
 lib.cards[1].card_id=1;
 assert.throws(()=>validateEveningLibrary(lib),/numérotation/i);
 const restored=buildEveningLibrary('SEXUEL');
 restored.cards[0].drawer_role='owner';restored.cards[0].recipient_role='owner';
 assert.throws(()=>validateEveningLibrary(restored),/restrictions/i);
});

test('An old 35-card JSON backup stays importable without erasing new 100-card capacity',()=>{
 const legacy=buildEveningLibrary('SENSUEL');
 legacy.cards=legacy.cards.slice(0,35);
 assert.equal(validateEveningLibrary(legacy).cards.length,35);
 assert.equal(librarySummary(legacy,'evening').total,100);
 assert.equal(buildEveningLibrary('SENSUEL').cards.length,100);
 const custom=buildEveningLibrary('SEXUEL',[{
  category:'SEXUEL',card_id:100,title:'Notre centième idée',
  description:'Une activité romantique choisie et acceptée ensemble.',
  timer_minutes:null,drawer_role:'both',recipient_role:'both'
 }]);
 assert.equal(custom.cards[99].card_id,100);
 assert.equal(custom.cards[99].title,'Notre centième idée');
 assert.deepEqual(validateEveningLibrary(custom).cards,custom.cards);
});
test('monthly JSON is always 100 numbered options, with optional timer',()=>{
 const lib=buildMonthlyLibrary([{face:1,title:'Souper à deux',description:'Planifier un souper ensemble au restaurant',is_restaurant:true,timer_minutes:15,catalogue_version:2}]);
 assert.equal(lib.activities.length,100);
 assert.equal(lib.activities[0].timer_minutes,15);
 assert.equal(librarySummary(lib,'monthly').timers,1);
 const bad=JSON.parse(JSON.stringify(lib));bad.activities[0].timer_minutes=-2;
 assert.throws(()=>validateMonthlyLibrary(bad),/durée/i);
});

test('Advent JSON supports an independent timer on every day',()=>{
 const calendar={calendar_title:'Notre Avent amoureux',year:2026,target_audience:'18+',note:'',
 days:Array.from({length:25},(_,i)=>({day:i+1,type:'Sensuel',title:'Surprise du jour '+(i+1),description:'Une activité tendre et consensuelle du jour',timer_minutes:i===0?8:null}))};
 assert.equal(librarySummary(calendar,'advent').timers,1);
 const invalid=structuredClone(calendar);invalid.days[0].timer_minutes=100;
 assert.throws(()=>validatePortableAdvent(invalid),/minuteur/i);
});

test('special occasions include two sets of six independently timed D6 faces',()=>{
 const json={evenements_speciaux:{}};
 for(const key of SPECIAL_EVENT_KEYS){
  json.evenements_speciaux[key]={evenement:'Surprise pour '+key,date:'2027-02-14',
   D6_activite:Array.from({length:6},(_,i)=>({[String(i+1)]:'Moment spécial ensemble au calme'})),
   D6_modificateur:Array.from({length:6},(_,i)=>({[String(i+1)]:'Une belle surprise sans obligation'})),
   minuteurs:{D6_activite:[5,null,null,null,null,null],D6_modificateur:[null,null,null,null,2,null]}
  };
 }
 assert.equal(librarySummary(json,'special').timers,12);
 const bad=structuredClone(json);bad.evenements_speciaux.saint_valentin.minuteurs.D6_activite[0]=90;
 assert.throws(()=>validatePortableSpecial(bad),/minuteurs/i);
});

test('all imports are protected and timer fields are copied to rolled results',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const schema=readFileSync(new URL('./migrations/20261014_json_library_imports.sql',import.meta.url),'utf8');
 const rolls=readFileSync(new URL('./migrations/20261014_timer_snapshots.sql',import.meta.url),'utf8');
 const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
 assert.match(app,/data-json-file/);
 assert.match(app,/json-apply/);
 assert.match(app,/send-messenger/);
 assert.match(app,/grid-template-columns:repeat/);
 assert.match(app,/previewPortableJson\('advent'\)/);
 assert.match(schema,/create or replace function public.import_love_evening_library/);
 assert.match(schema,/create or replace function public.import_love_monthly_library/);
 assert.match(rolls,/activity_timer_minutes/);
 assert.match(rolls,/advent_timer_minutes/);
 assert.match(rolls,/modifier_timers/);
 assert.match(css,/\.json-tool-buttons/);
});
