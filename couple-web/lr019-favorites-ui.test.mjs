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
test('LR-019 hearts remain per-partner, keep challenge content and protect private history',()=>{
 assert.match(app,/mark\.marked_by===state\.user\?\.id/);
 assert.match(app,/f\.marked_by===state\.user\.id/);
 assert.match(app,/item\.recipient===state\.user\?\.id/);
 assert.match(app,/mine\?\.card_title\|\|\('Carte '\+cardId\)/);
 assert.match(app,/if\(!present&&!owned&&!archived\)throw Error/);
 assert.match(app,/const closedIds=new Set/);
 assert.match(app,/safe\(resolvedCard\(view\)\.description\)/);
 assert.match(app,/state\.loveFavoritesReady\?settingRow\('Nos coups de cœur'/);
 assert.match(app,/\['admin','excluded-cards','favorites'\]\.includes\(settingsOpenSection\)\?'jeu'/);
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
 assert.match(html,/evening-calendar\.css\?v=20261028-favs250/);
 assert.match(html,/settings-premium\.css\?v=20261028-favs250/);
});
