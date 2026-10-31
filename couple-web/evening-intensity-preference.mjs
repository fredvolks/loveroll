// Personal planning choice for the NEXT soirée only. Do not override the
// server profile or the active D100 category/draw until the future 300-card
// catalog routing is ready and both partners' selections are authoritative.
import {normalizePlayStyle} from './play-style.mjs';

const key=id=>'loveroll-evening-intensity:'+encodeURIComponent(id);
const localChoices=new Map();
const validId=id=>typeof id==='string'&&!!id.trim();
export function readEveningIntensity(userId,profileStyle='medium',storage){
 const fallback=normalizePlayStyle(profileStyle);
 if(!validId(userId))return fallback;
 if(localChoices.has(userId))return localChoices.get(userId);
 try{
  const available=storage===undefined?globalThis.localStorage:storage;
  const value=available?.getItem(key(userId));
  return ['soft','medium','intense'].includes(value)?value:fallback;
 }catch{return fallback;}
}
export function saveEveningIntensity(userId,style,storage){
 if(!validId(userId)||!['soft','medium','intense'].includes(style))return false;
 try{
  const available=storage===undefined?globalThis.localStorage:storage;
  if(typeof available?.setItem!=='function')throw Error('Storage unavailable');
  available.setItem(key(userId),style);
  localChoices.delete(userId);
 }catch{
  // Safari private browsing: retain this choice for this page visit only.
  localChoices.set(userId,style);
 }
 return true;
}
export function eveningIntensityChooserHtml(style='medium'){
 const selected=normalizePlayStyle(style);
 const options=[['soft','Soft'],['medium','Medium'],['intense','Intense']]
  .map(([value,label])=>'<option value="'+value+'"'+
   (value===selected?' selected':'')+'>'+label+'</option>').join('');
 return '<label class="evening-intensity-compact">'+
  '<span>Intensité souhaitée pour la prochaine soirée</span>'+
  '<select data-evening-intensity-select="true" aria-label="Intensité souhaitée pour la prochaine soirée">'+
   options+'</select></label>';
}
