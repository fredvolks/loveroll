import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENING_FAVORITES_LIMIT,eveningFavoriteId,readEveningFavorites,toggleEveningFavorite} from './evening-favorites.mjs';

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
 assert.match(action,/toggleEveningFavorite\(state\.user\.id,state\.coupleId,item,localStorage\)/);
 assert.match(app,/eveningFavoriteId\(selected\)/);
 assert.match(app,/readEveningFavorites\(uid,state\.coupleId,localStorage\)/);
 assert.match(app,/favoriteKeys\.length>=EVENING_FAVORITES_LIMIT/);
});
