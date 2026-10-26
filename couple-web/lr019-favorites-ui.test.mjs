import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
test('LR-019 heart button uses real RPC with idempotent refresh and a server capability gate',()=>{
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
 assert.match(app,/if\(!present&&!owned\)throw Error/);
 assert.match(app,/safe\(resolvedCard\(view\)\.description\)/);
 assert.match(app,/state\.loveFavoritesReady\?settingRow\('Nos coups de cœur'/);
 assert.match(app,/\['admin','excluded-cards','favorites'\]\.includes\(settingsOpenSection\)\?'jeu'/);
});
