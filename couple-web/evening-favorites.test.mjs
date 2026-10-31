import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {EVENING_FAVORITES_LIMIT,eveningFavoriteId,readEveningFavorites,toggleEveningFavorite,removeEveningFavorite,eveningFavoritesSettingsHtml} from './evening-favorites.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const store=()=>{
 const data=new Map();
 return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}};
};
const card=n=>({id:'draw-'+n,category:'SENSUEL',card_id:n});

test('D100 favorites use stable card identities, not changing draw IDs',()=>{
 assert.equal(eveningFavoriteId(card(7)),'SENSUEL:7');
 assert.equal(eveningFavoriteId({...card(7),id:'another-draw'}),'SENSUEL:7');
 assert.equal(eveningFavoriteId({category:'SEXUEL',face:100}),'SEXUEL:100');
 assert.equal(eveningFavoriteId({category:'MIXTE',face:50}),'MIXTE:50');
 for(const invalid of [null,{category:'UNKNOWN',card_id:2},
  {category:'MIXTE',face:51},{category:'SENSUEL',card_id:0},
  {category:'SEXUEL',face:101},{category:'SENSUEL',face:'bad'}]){
  assert.equal(eveningFavoriteId(invalid),null);
 }
});

test('Each member has at most five favorites per couple, with removal and reuse',()=>{
 const storage=store();
 assert.equal(EVENING_FAVORITES_LIMIT,5);
 for(let n=1;n<=5;n++){
  const added=toggleEveningFavorite('fred','couple-a',card(n),storage);
  assert.equal(added.ok,true);
  assert.equal(added.favorites.length,n);
 }
 const limit=toggleEveningFavorite('fred','couple-a',card(6),storage);
 assert.deepEqual({ok:limit.ok,reason:limit.reason},{ok:false,reason:'limit'});
 assert.equal(readEveningFavorites('fred','couple-a',storage).length,5);
 assert.deepEqual(readEveningFavorites('partner','couple-a',storage),[]);
 assert.deepEqual(readEveningFavorites('fred','couple-b',storage),[]);
 assert.equal(toggleEveningFavorite('partner','couple-a',card(6),storage).ok,true);
 const removed=toggleEveningFavorite('fred','couple-a',card(2),storage);
 assert.equal(removed.reason,'removed');
 assert.equal(removed.favorites.length,4);
 assert.equal(toggleEveningFavorite('fred','couple-a',card(6),storage).ok,true);
 assert.equal(readEveningFavorites('fred','couple-a',storage).includes('SENSUEL:2'),false);
 assert.equal(readEveningFavorites('partner','couple-a',storage).includes('SENSUEL:6'),true);
});

test('Malformed local favorite data is safely constrained to five valid unique cards',()=>{
 const storage=store();
 storage.setItem('loveroll-evening-favorites:fred:couple-a',
  JSON.stringify(['SENSUEL:1','SENSUEL:1','BOGUS:7','SEXUEL:0',
   'MIXTE:51','SENSUEL:2','SEXUEL:3','SEXUEL:4','SEXUEL:5','SEXUEL:6']));
 assert.deepEqual(readEveningFavorites('fred','couple-a',storage),
  ['SENSUEL:1','SENSUEL:2','SEXUEL:3','SEXUEL:4','SEXUEL:5']);
 storage.setItem('loveroll-evening-favorites:fred:couple-a','not-json');
 assert.deepEqual(readEveningFavorites('fred','couple-a',storage),[]);
 storage.setItem('loveroll-evening-favorites:fred:couple-a','{}');
 assert.deepEqual(readEveningFavorites('fred','couple-a',storage),[]);
});

test('Favorites cannot leak to another account or claim success when storage is blocked',()=>{
 const blocked={getItem:()=>{throw Error('blocked');},
  setItem:()=>{throw Error('blocked');}};
 assert.deepEqual(readEveningFavorites('fred','couple-a',blocked),[]);
 assert.equal(toggleEveningFavorite('fred','couple-a',card(1),blocked).reason,'storage');
 assert.equal(toggleEveningFavorite('','couple-a',card(1),store()).reason,'invalid');
 assert.equal(toggleEveningFavorite('fred','',card(1),store()).reason,'invalid');
 assert.equal(toggleEveningFavorite('fred','couple-a',null,store()).reason,'invalid');
});

test('Favorite interaction verifies personal challenge ownership before saving',()=>{
 const begin=app.indexOf("if(verb==='evening-favorite'){");
 const end=app.indexOf("if(verb==='evening-open'){",begin);
 assert.ok(begin>=0&&end>begin);
 const action=app.slice(begin,end);
 assert.match(action,/ownEveningChallenges\(state\.challenges,state\.user\?\.id,state\.session\?\.id\)/);
 assert.match(action,/if\(!item\|\|!state\.coupleId\|\|!state\.user\?\.id\)/);
 assert.match(action,/toggleEveningFavorite\(state\.user\.id,state\.coupleId,item\)/);
 assert.match(app,/eveningFavoriteId\(selected\)/);
 assert.match(app,/readEveningFavorites\(uid,state\.coupleId\)/);
 assert.match(app,/favoriteKeys\.length>=EVENING_FAVORITES_LIMIT/);
});

test('Blocked storage getter cannot crash a personal D100 favorite or expose another account',()=>{
 const source=readFileSync(new URL('./evening-favorites.mjs',import.meta.url),'utf8')
  .replace(/^export /gm,'')+'\n({readEveningFavorites,toggleEveningFavorite});';
 const browser={};
 Object.defineProperty(browser,'localStorage',{get(){throw Error('SecurityError');}});
 const api=runInNewContext(source,{globalThis:browser});
 assert.deepEqual(Array.from(api.readEveningFavorites('fred','couple-a')),[]);
 const result=api.toggleEveningFavorite('fred','couple-a',card(7));
 assert.equal(result.ok,false);
 assert.equal(result.reason,'storage');
 assert.deepEqual(Array.from(result.favorites),[]);
});

test('A failed favorite read cannot overwrite an existing five-card list',()=>{
 let writes=0;
 const halfBlocked={getItem:()=>{throw Error('temporary read failure');},
  setItem:()=>{writes++;}};
 const outcome=toggleEveningFavorite('fred','couple-a',card(9),halfBlocked);
 assert.equal(outcome.ok,false);
 assert.equal(outcome.reason,'storage');
 assert.equal(writes,0,'a failed read must never silently replace older favorites');
 const inaccessible={setItem:()=>{writes++;}};
 assert.equal(toggleEveningFavorite('fred','couple-a',card(1),inaccessible).reason,'storage');
 assert.equal(writes,0);
});

test('Previously drawn favorites can be removed from Settings after the evening is closed',()=>{
 const storage=store();
 for(let n=1;n<=5;n++)assert.equal(toggleEveningFavorite('fred','couple-a',card(n),storage).ok,true);
 const initial=readEveningFavorites('fred','couple-a',storage);
 const html=eveningFavoritesSettingsHtml(initial);
 assert.match(html,/Gérer mes cartes favorites/);
 assert.match(html,/Mes favoris D100 · 5 \/ 5/);
 assert.equal((html.match(/data-action="favorite-remove:/g)||[]).length,5);
 assert.match(html,/data-action="favorite-remove:SENSUEL:2"/);
 assert.match(html,/aria-label="Retirer le favori Sensuel · carte 2"/);
 const freed=removeEveningFavorite('fred','couple-a','SENSUEL:2',storage);
 assert.equal(freed.ok,true);
 assert.equal(freed.reason,'removed');
 assert.deepEqual(freed.favorites,['SENSUEL:1','SENSUEL:3','SENSUEL:4','SENSUEL:5']);
 assert.deepEqual(readEveningFavorites('fred','couple-a',storage),freed.favorites);
 assert.equal(readEveningFavorites('partner','couple-a',storage).length,0);
 assert.equal(toggleEveningFavorite('fred','couple-a',card(6),storage).ok,true);
 assert.equal(removeEveningFavorite('fred','couple-a','SENSUEL:2',storage).reason,'not-found');
 assert.equal(removeEveningFavorite('fred','couple-b','SENSUEL:1',storage).reason,'not-found');
 assert.equal(removeEveningFavorite('partner','couple-a','SENSUEL:1',storage).reason,'not-found');
});
test('Settings favorite actions cannot inject markup or add arbitrary cards',()=>{
 assert.match(eveningFavoritesSettingsHtml(),/Aucun favori/);
 const html=eveningFavoritesSettingsHtml([
  'SENSUEL:7','SEXUEL:100','MIXTE:50','SENSUEL:07',
  'SEXUEL:101','bad','<img src=x onerror=alert(1)>',null
 ]);
 assert.equal((html.match(/data-action="favorite-remove:/g)||[]).length,3);
 assert.doesNotMatch(html,/<img|onerror|favorite-remove:SENSUEL:07/);
 assert.match(html,/Sensuel · carte 7/);
 assert.match(html,/Sexuel · carte 100/);
 assert.match(html,/Mixte · carte 50/);
 for(const invalid of ['SENSUEL:07','SENSUEL:0','SENSUEL:101','SENSUEL:1:2','SEXUEL:bad',
  'BAD:5','<script>','MIXTE:51']){
  assert.equal(removeEveningFavorite('fred','couple-a',invalid,store()).reason,'invalid',invalid);
 }
});
test('Settings never erase saved favorites after a failed read or write',()=>{
 let writes=0;
 const blocked={getItem(){throw Error('blocked');},setItem(){writes++;}};
 assert.equal(removeEveningFavorite('fred','couple-a','SENSUEL:1',blocked).reason,'storage');
 assert.equal(writes,0);
 const storage=store();toggleEveningFavorite('fred','couple-a',card(1),storage);
 const writeDenied={getItem:key=>storage.getItem(key),setItem(){throw Error('quota');}};
 assert.equal(removeEveningFavorite('fred','couple-a','SENSUEL:1',writeDenied).reason,'storage');
 assert.deepEqual(readEveningFavorites('fred','couple-a',storage),['SENSUEL:1']);
});
test('Favorite Settings controls are scoped to the current user and couple',()=>{
 assert.match(app,/const savedFavorites=readEveningFavorites\(state\.user\?\.id,state\.coupleId\)/);
 assert.match(app,/eveningFavoritesSettingsHtml\(savedFavorites,favoriteTitles\)/);
 assert.match(app,/editableCardSlots\(category,state\.customCards\|\|\[\]\)/);
 assert.match(app,/card\.filled&&savedFavorites\.includes\(key\)&&card\.title/);
 const handler=app.slice(app.indexOf("if(verb==='favorite-remove'){"),
  app.indexOf("if(verb==='evening-favorite'){"));
 assert.match(handler,/if\(!state\.user\?\.id\|\|!state\.coupleId/);
 assert.match(handler,/element&&!root\.contains\(element\)/);
 assert.match(handler,/removeEveningFavorite\(state\.user\.id,state\.coupleId,identity\)/);
 assert.match(handler,/root\.querySelector\('\.lr-favorite-manager'\)\?\.focus/);
 const css=readFileSync(new URL('./settings-premium.css',import.meta.url),'utf8');
 assert.match(css,/\.lr-favorite-item button\{[^}]*min-height:44px/);
});

test('Saved favorite IDs show their current library titles with HTML escaping',()=>{
 const names=Object.create(null);
 names['SENSUEL:7']='Baisers au clair de lune';
 names['SEXUEL:3']='<img src=x onerror=alert(1)> & "Bonjour"';
 const html=eveningFavoritesSettingsHtml(['SENSUEL:7','SEXUEL:3','MIXTE:2'],names);
 assert.match(html,/Baisers au clair de lune/);
 assert.match(html,/Sensuel · carte 7/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;Bonjour&quot;/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/Mixte · carte 2/);
 assert.equal((html.match(/data-action="favorite-remove:/g)||[]).length,3);
 const huge='x'.repeat(150);
 const bounded=eveningFavoritesSettingsHtml(['SENSUEL:7'],{'SENSUEL:7':huge});
 assert.doesNotMatch(bounded,/x{121}/);
 assert.match(bounded,/x{120}/);
});
