// Personal LoveRoll favorites for the D100 card library.
// This first phase stores five favorite CARD identities per person/couple on
// this device. It never changes draw weights or server-owned challenge status.
export const EVENING_FAVORITES_LIMIT=5;
const KEY_PREFIX='loveroll-evening-favorites:';
export function eveningFavoriteId(card){
 const category=card?.category;
 const number=Number(card?.card_id??card?.face);
 if(!['SENSUEL','SEXUEL','MIXTE'].includes(category)||
  !Number.isInteger(number)||number<1||number>(category==='MIXTE'?50:100))return null;
 return category+':'+number;
}
const validScope=(userId,coupleId)=>typeof userId==='string'&&userId.length>0&&
 typeof coupleId==='string'&&coupleId.length>0;
const key=(userId,coupleId)=>KEY_PREFIX+encodeURIComponent(userId)+':'+encodeURIComponent(coupleId);
// Keep parsing independent of the storage I/O. Failed reads must not be
// interpreted as an empty collection when someone tries to save a new item.
function parseFavoriteEntries(raw){
 const parsed=JSON.parse(raw||'[]');
 if(!Array.isArray(parsed))return [];
 const seen=new Set(),items=[];
 for(const entry of parsed){
  if(typeof entry!=='string')continue;
  const [category,idText,...rest]=entry.split(':');
  if(rest.length||!/^\d{1,3}$/.test(idText))continue;
  const identity=eveningFavoriteId({category,card_id:Number(idText)});
  if(identity!==entry||seen.has(identity))continue;
  seen.add(identity);items.push(identity);
  if(items.length===EVENING_FAVORITES_LIMIT)break;
 }
 return items;
}
export function readEveningFavorites(userId,coupleId,storage){
 if(!validScope(userId,coupleId))return [];
 try{
  // localStorage property access itself can throw on Safari/iOS.
  const available=storage===undefined?globalThis.localStorage:storage;
  return parseFavoriteEntries(available?.getItem(key(userId,coupleId)));
 }catch{return [];}
}
export function toggleEveningFavorite(userId,coupleId,card,storage){
 const id=eveningFavoriteId(card);
 if(!validScope(userId,coupleId)||!id)return {ok:false,reason:'invalid',favorites:[]};
 let current,available;
 try{
  available=storage===undefined?globalThis.localStorage:storage;
  if(!available?.getItem||!available?.setItem)
   return {ok:false,reason:'storage',favorites:[]};
  // Do not overwrite five existing favorites just because a privacy policy,
  // quota restriction or transient failure prevented reading their key.
  current=parseFavoriteEntries(available.getItem(key(userId,coupleId)));
 }catch{return {ok:false,reason:'storage',favorites:[]};}
 const removing=current.includes(id);
 if(!removing&&current.length>=EVENING_FAVORITES_LIMIT)
  return {ok:false,reason:'limit',favorites:current};
 const next=removing?current.filter(value=>value!==id):[...current,id];
 try{
  available.setItem(key(userId,coupleId),JSON.stringify(next));
  return {ok:true,reason:removing?'removed':'added',favorites:next};
 }catch{return {ok:false,reason:'storage',favorites:current};}
}
