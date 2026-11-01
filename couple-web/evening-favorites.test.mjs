import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {favoriteCardIdentity,isEveningFavorite,canAddEveningFavorite,closedCalendarFavoriteCandidate,favoriteCardPreview,MAX_EVENING_FAVORITES}
 from './evening-favorites.mjs';
import {eveningHistoryMarkup} from './evening-calendar.mjs';

test('LR-019: a favorite is keyed by actual catalog card ID, never the visual D100 face',()=>{
 assert.deepEqual(favoriteCardIdentity({category:'SENSUEL',face:99,card_id:7}),
  {category:'SENSUEL',cardId:7});
 assert.deepEqual(favoriteCardIdentity({category:'SEXUEL',face:3,card_id:100}),
  {category:'SEXUEL',cardId:100});
 for(const invalid of [{category:'SENSUEL',face:25},{category:'COQUIN',card_id:2},
  {category:'SEXUEL',card_id:0},{category:'SEXUEL',card_id:101},
  {category:'SENSUEL',card_id:1.1},{category:'SENSUEL',card_id:'1x'},
  {category:'SENSUEL',card_id:Infinity},{card_id:4},null]){
  assert.equal(favoriteCardIdentity(invalid),null);
 }
});

test('LR-019: one shared five-heart list deduplicates by category and card, not dice face',()=>{
 const five=[
  {category:'SENSUEL',card_id:7},
  {category:'SEXUEL',card_id:7},
  {category:'SENSUEL',card_id:10},
  {category:'SENSUEL',card_id:25},
  {category:'SEXUEL',card_id:100}
 ];
 assert.equal(MAX_EVENING_FAVORITES,5);
 assert.equal(isEveningFavorite(five,{category:'SENSUEL',card_id:7,face:98}),true);
 assert.equal(isEveningFavorite(five,{category:'SEXUEL',card_id:7,face:30}),true);
 assert.equal(isEveningFavorite(five,{category:'SEXUEL',card_id:10}),false);
 assert.equal(canAddEveningFavorite(five,{category:'SEXUEL',card_id:10}),false);
 assert.equal(canAddEveningFavorite(five,{category:'SENSUEL',card_id:7}),true);
 assert.equal(canAddEveningFavorite(five.slice(0,4),{category:'SEXUEL',card_id:10}),true);
});

test('LR-019: Soirée UI is gated by installed server table and handles full 5/5 popup',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/query\('love_evening_favorites',\{eq:\{couple_id:c\}\}\)/);
 assert.match(app,/state\.favoritesReady=true/);
 assert.match(app,/state\.eveningFavorites=\[\];state\.favoritesReady=false/);
 assert.match(app,/favoriteCardIdentity\(view\)/);
 assert.match(app,/state\.favoritesReady&&favoriteKey/);
 assert.match(app,/evening-favorite:'\+view\.id/);
 assert.match(app,/evening-favorite-replace:/);
 assert.match(app,/role="alertdialog" aria-modal="true" aria-label="Remplacer un coup de cœur"/);
 assert.match(app,/state\.eveningFavorites\.length>=MAX_EVENING_FAVORITES/);
 assert.match(app,/evening-favorite-remove:/);
 assert.match(app,/favoriteWriteBusy=true;render\(\)/);
 assert.match(app,/await rpc\('save_love_evening_favorite'/);
 assert.match(app,/p_replace_category:oldFavorite\?\.category\|\|null/);
 assert.match(app,/p_replace_card_id:oldFavorite\?\.cardId\|\|null/);
 assert.match(app,/favoriteWriteBusy=false/);
 assert.doesNotMatch(app,/localStorage\.setItem\('loveroll-favorites'/);
});

test('LR-019: shared archive hearts require an actual closed session and stable card ID',()=>{
 const entries=[
  {id:'closed',started_at:'2026-10-16T01:00:00Z',
   finished_at:'2026-10-16T02:00:00Z',counted:true},
  {id:'active',started_at:'2026-10-15T20:00:00Z',finished_at:null,counted:false}
 ];
 const history=[
  {id:'historic',session_id:'closed',recipient:'a',category:'SENSUEL',
   card_id:7,face:95,status:'completed',card_title:'Historique'},
  {id:'open-secret',session_id:'active',recipient:'b',category:'SEXUEL',
   card_id:11,face:4,status:'proposed',card_title:'Défi privé'},
  {id:'legacy-face',session_id:'closed',recipient:'a',category:'SENSUEL',
   face:3,status:'completed'}
 ];
 assert.equal(closedCalendarFavoriteCandidate(history,entries,'historic')?.card_id,7);
 assert.equal(closedCalendarFavoriteCandidate(history,entries,'open-secret'),null);
 assert.equal(closedCalendarFavoriteCandidate(history,entries,'legacy-face'),null);
 assert.equal(closedCalendarFavoriteCandidate(history,entries,'not-a-card'),null);
});

test('LR-019: only closed authorized calendar rows expose hearts and a direct 5/5 replacement',()=>{
 const sessions=[
  {id:'closed',started_at:'2026-10-16T01:00:00Z',finished_at:'2026-10-16T02:00:00Z',counted:true},
  {id:'open',started_at:'2026-10-15T22:00:00Z',finished_at:null,counted:false}
 ];
 const historyChallenges=[
  {id:'historical-a',session_id:'closed',recipient:'a',category:'SENSUEL',
   card_id:5,face:91,status:'completed',card_title:'Un défi tendre'},
  {id:'historical-b',session_id:'closed',recipient:'b',category:'SEXUEL',
   card_id:18,face:4,status:'completed',card_title:'Un défi à deux'},
  {id:'secret-pending',session_id:'open',recipient:'b',category:'SEXUEL',
   card_id:19,face:5,status:'proposed',card_title:'Encore secret'}
 ];
 const favs=[{category:'SENSUEL',card_id:5},{category:'SEXUEL',card_id:2},
  {category:'SEXUEL',card_id:3},{category:'SENSUEL',card_id:4},
  {category:'SEXUEL',card_id:5}];
 const render=other=>eveningHistoryMarkup({sessions,members:[
  {user_id:'a',name:'A'},{user_id:'b',name:'B'}],
  historyChallenges,me:'a',month:'2026-10',selectedDate:'2026-10-15',
  favorites:favs,favoritesReady:true,...other});
 const html=render({favoriteReplace:{source:'calendar',challengeId:'historical-b'}});
 assert.match(html,/data-action="evening-favorite-calendar:historical-a"/);
 assert.match(html,/data-action="evening-favorite-calendar:historical-b"/);
 assert.doesNotMatch(html,/data-action="evening-favorite-calendar:secret-pending"/);
 assert.match(html,/Nos coups de cœur · 5\/5/);
 assert.match(html,/♥ Retirer des coups de cœur/);
 assert.match(html,/role="alertdialog" aria-modal="true" aria-labelledby="lr-calendar-fav-title"/);
 assert.equal((html.match(/data-action="evening-favorite-replace:/g)||[]).length,5);
 assert.match(html,/data-action="evening-favorite-cancel"/);
 assert.doesNotMatch(render({favoritesReady:false}),/evening-favorite-calendar:/);
 assert.doesNotMatch(render({favoritesReady:false}),/evening-favorite-replace:/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/closedCalendarFavoriteCandidate\(state\.eveningCalendarChallenges,state\.sessions,parts\[0\]\)/);
 assert.match(app,/favoriteReplace=\{\.\.\.key,challengeId:view\.id,source:fromCalendar\?'calendar':'session'\}/);
});

test('LR-019: replacement previews distinguish closed archive titles and never leak active secrets',()=>{
 const sessions=[{id:'closed',finished_at:'2026-11-01T03:00:00Z'},
  {id:'open',finished_at:null}];
 const history=[{id:'old',session_id:'closed',category:'SEXUEL',
   card_id:90,card_title:'Souvenir sur mesure',card_description:'Consigne partagée'},
  {id:'secret',session_id:'open',category:'SEXUEL',
   card_id:91,card_title:'Titre secret',card_description:'Consigne secrète'}];
 const first=favoriteCardPreview({category:'SEXUEL',card_id:90},{history,sessions});
 assert.equal(first.title,'Souvenir sur mesure');
 assert.equal(first.description,'Consigne partagée');
 const hidden=favoriteCardPreview({category:'SEXUEL',card_id:91},{history,sessions});
 assert.equal(hidden.title,'Carte n° 91');
 assert.equal(hidden.description,'');
 const builtin=(cat,id)=>({title:cat+' '+id,description:'Consigne de catalogue'});
 assert.equal(favoriteCardPreview({category:'SENSUEL',card_id:2},{builtinCard:builtin}).title,'SENSUEL 2');
 assert.equal(favoriteCardPreview({category:'SENSUEL',card_id:27},{customCards:[
  {category:'SENSUEL',card_id:27,title:'Carte modifiée',description:'Texte du couple'}]}).title,'Carte modifiée');
 assert.equal(favoriteCardPreview({category:'SENSUEL',card_id:0}),null);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/favoriteCardPreview\(row,\{/);
 assert.match(app,/history:state\.eveningCalendarChallenges,sessions:state\.sessions/);
});

test('LR-019: calendar 5-heart modal displays real titles and scoped card descriptions',()=>{
 const sessions=[{id:'closed',started_at:'2026-10-16T01:00:00Z',
  finished_at:'2026-10-16T02:00:00Z',counted:true}];
 const data=[{id:'archived',session_id:'closed',recipient:'a',category:'SEXUEL',
  card_id:80,face:10,status:'completed',card_title:'Défi archivé',
  card_description:'Consigne historique'}];
 const html=eveningHistoryMarkup({
  sessions,members:[{user_id:'a',name:'A'}],
  historyChallenges:data,me:'a',month:'2026-10',selectedDate:'2026-10-15',
  favorites:[{category:'SEXUEL',card_id:80}],favoritesReady:true,
  favoriteReplace:{source:'calendar',challengeId:'archived'}
 });
 assert.match(html,/Pour ajouter « Défi archivé »/);
 assert.match(html,/Retirer « Défi archivé » et ajouter/);
 assert.match(html,/Consigne historique/);
 assert.match(html,/Voir la consigne/);
 assert.match(html,/lr-favorite-replace-entry/);
 assert.doesNotMatch(html,/Titre secret/);
});
