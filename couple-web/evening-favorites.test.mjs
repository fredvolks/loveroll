import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {favoriteCardIdentity,isEveningFavorite,canAddEveningFavorite,MAX_EVENING_FAVORITES}
 from './evening-favorites.mjs';

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
 assert.match(app,/evening-favorite:\+view\.id/);
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
