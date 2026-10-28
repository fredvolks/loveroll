import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
import {eveningHistoryMarkup} from './evening-calendar.mjs';
test('LR-019 heart button uses real RPC with idempotent refresh and a server capability gate',()=>{
 assert.match(app,/rpc\('love_favorites_capabilities',\{p_couple:c\}\)/);
 assert.match(app,/if\(capabilities!==true\)throw Error/);
 assert.match(app,/rpc\('my_love_couple_favorites',\{p_couple:c\}\)/);
 assert.match(app,/state\.loveFavoritesReady=true/);
 assert.match(app,/catch\{state\.loveFavorites=\[\];state\.loveFavoritesReady=false;\}/);
 assert.match(app,/favorite-toggle:'\+view\.category\+':'\+Number\(view\.card_id\)/);
 assert.match(app,/rpc\('set_love_couple_favorite',\{p_couple:state\.coupleId,p_category:category,p_card_id:cardId,p_enabled:!mine\}\)/);
 assert.match(app,/if\(state\.loveFavoritesBusy\)return/);
 assert.match(app,/finally\{state\.loveFavoritesBusy=false;render\(\);\}/);
});
test('LR-019 shared list and one-click replacement preserve authorized challenge content',()=>{
 assert.match(app,/const hearts=\[\.\.\.\(state\.loveFavorites\|\|\[\]\)\]/);
 assert.match(app,/favorite-limit-replace:/);
 assert.match(app,/rpc\('replace_love_couple_favorite',\{/);
 assert.match(app,/p_old_category:category,p_old_card_id:cardId/);
 assert.match(app,/p_new_category:pending\.category,p_new_card_id:Number\(pending\.cardId\)/);
 assert.match(app,/Nos coups de cœur · /);
 assert.match(app,/state\.loveFavorites\|\|\[\]\)\.length>=5/);
 assert.match(app,/item\.recipient===state\.user\?\.id/);
 assert.match(app,/mine\?\.card_title\|\|\('Carte '\+cardId\)/);
 assert.match(app,/if\(!present&&!owned&&!archived\)throw Error/);
 assert.match(app,/const closedIds=new Set/);
 assert.match(app,/safe\(resolvedCard\(view\)\.description\)/);
 assert.match(app,/state\.loveFavoritesReady\?settingRow\('Nos coups de cœur'/);
 assert.match(app,/\['admin','excluded-cards','favorites'\]\.includes\(settingsOpenSection\)\?'jeu'/);
});
test('LR-019 database enforces five DISTINCT couple-wide hearts with one atomic replacement',()=>{
 const sql=readFileSync(new URL('./migrations/20261026_lr019_favorites_core.sql',import.meta.url),'utf8');
 assert.match(sql,/PRIMARY KEY \(couple_id,category,card_id\)/);
 assert.doesNotMatch(sql,/PRIMARY KEY \(couple_id,category,card_id,marked_by\)/);
 assert.match(sql,/WHERE f\.couple_id=p_couple\s*\)\s*>=5/);
 assert.match(sql,/FUNCTION public\.replace_love_couple_favorite\(/);
 assert.match(sql,/FROM public\.couples WHERE id=p_couple FOR UPDATE/);
 assert.match(sql,/DELETE FROM public\.love_couple_favorites/);
 assert.match(sql,/INSERT INTO public\.love_couple_favorites/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.replace_love_couple_favorite/);
 assert.doesNotMatch(sql,/WHERE f\.couple_id=p_couple AND f\.marked_by=v_actor/);
});

test('History hearts are available for both partners after closure and obey capability/busy gating',()=>{
 const params={
  month:'2026-10',selectedDate:'2026-10-25',me:'person-one',favoriteControlsEnabled:true,
  favorites:[{category:'SENSUEL',card_id:4,marked_by:'person-one'}],
  sessions:[{id:'night-1',started_at:'2026-10-25T20:00:00Z',finished_at:'2026-10-25T23:00:00Z',counted:true}],
  members:[{user_id:'person-one',name:'Personne A'},{user_id:'person-two',name:'Personne B'}],
  historyChallenges:[
   {id:'a',session_id:'night-1',recipient:'person-one',category:'SENSUEL',card_id:4,card_title:'Carte connue',status:'completed',created_at:'2026-10-25T20:10:00Z'},
   {id:'b',session_id:'night-1',recipient:'person-two',category:'SEXUEL',card_id:9,card_title:'Carte privée partenaire',status:'completed',created_at:'2026-10-25T20:12:00Z'}
  ]
 };
 const html=eveningHistoryMarkup(params);
 assert.match(html,/data-action="favorite-toggle:SENSUEL:4"/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/data-action="favorite-toggle:SEXUEL:9"/);
 assert.equal((html.match(/class="evening-cal-favorite"/g)||[]).length,2);
 const busy=eveningHistoryMarkup({...params,favoriteControlsBusy:true});
 assert.match(busy,/data-action="favorite-toggle:SENSUEL:4"[^>]+ disabled/);
 assert.doesNotMatch(eveningHistoryMarkup({...params,favoriteControlsEnabled:false}),/data-action="favorite-toggle:/);
 const openNight=eveningHistoryMarkup({...params,sessions:[{...params.sessions[0],finished_at:null}]});
 assert.doesNotMatch(openNight,/data-action="favorite-toggle:/);
});


test('LR-019 cannot regress the already published privacy mask or expose private notifications',()=>{
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(app,/document\.addEventListener\('loveroll:privacy-mask'/);
 assert.match(app,/if\(document\.documentElement\.classList\.contains\('lr-privacy-active'\)\)/);
 assert.match(app,/eclatAudio\.stop\(\);state\.eclatMusic=false;return;/);
 assert.match(sw,/const safeBodies=\{/);
 assert.match(sw,/const body=safeBodies\[kind\]/);
 assert.doesNotMatch(sw,/message\.body:\s*'Votre espace à deux vous attend'/);
 assert.match(html,/privacy-screen\.mjs\?v=20261028-privacy250/);
 assert.match(html,/evening-calendar\.css\?v=20261028-favs252/);
 assert.match(html,/settings-premium\.css\?v=20261028-favs252/);
});


test('four original live SQL routines require an explicit non-mutating drift preflight',()=>{
 const preflight=readFileSync(new URL('./qa/lr019-production-schema-preflight.sql',import.meta.url),'utf8');
 for(const signature of [
  'public.love_respond_and_redraw(uuid,text,boolean)',
  'public.draw_for_partner(uuid,text,boolean)',
  'public.love_cycle_status(uuid)',
  'public.finish_couple_session(uuid,boolean)'
 ])assert.ok(preflight.includes(signature),'missing protected live routine '+signature);
 assert.match(preflight,/md5\(pg_get_functiondef\(p\.oid\)\)/);
 assert.match(preflight,/changed: REVIEW BEFORE REPLACING/);
 assert.match(preflight,/favorites_already_present/);
 assert.match(preflight,/favorite_engine_already_active/);
 assert.doesNotMatch(preflight,/^\s*(?:DROP|ALTER|UPDATE|DELETE|INSERT|TRUNCATE|CREATE\s+(?:TABLE|FUNCTION|INDEX))\s+/gmi,
  'preflight must never mutate a couple or system schema');
});
