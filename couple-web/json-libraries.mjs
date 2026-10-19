// LoveRoll — portable challenge libraries. No account data, secrets, history or couple IDs.
import {EVENING_CATEGORIES,editableCardSlots} from './evening-challenges.mjs';
import {editableMonthlyActivities} from './monthly-activities.mjs?v=20261018-d100151';
import {validateAdventJson} from './advent-calendar.mjs';
import {validateSpecialEventsJson} from './private-special-events.mjs';
export const JSON_VERSION=1;
export const MAX_IMPORT_BYTES=250000;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,min,max,label)=>{
 if(typeof v!=='string'||v.trim().length<min||v.length>max)
  throw Error(label+' doit contenir entre '+min+' et '+max+' caractères.');
 return v;
};
const duration=(v,label)=>{
 if(v===null||v===undefined||v===0)return null;
 if(!Number.isInteger(v)||v<1||v>60)
  throw Error(label+' : la durée doit être un entier de 1 à 60 minutes, ou null pour désactiver le minuteur.');
 return v;
};
// Evening v1/v2 JSON: one of two category libraries, with 1..100 distinct slots.
// Separate exports per category. All 100 positions are editable in one grid.
export function buildEveningLibrary(category='SENSUEL',overrides=[]){
 if(!EVENING_CATEGORIES.includes(category))throw Error('Catégorie Sensuel ou Sexuel requise.');
 return {format:'loveroll-evening',version:2,category,
  cards:editableCardSlots(category,overrides).map(item=>({
   card_id:item.cardId,title:item.title,description:item.description,
   timer_minutes:duration(item.minutes,'Minuteur carte '+item.cardId),
   drawer_role:item.drawerRole,recipient_role:item.recipientRole
  }))};
}
export function validateEveningLibrary(data){
 if(!object(data)||data.format!=='loveroll-evening'||
   ![1,2].includes(data.version)||
   !EVENING_CATEGORIES.includes(data.category)||
   !Array.isArray(data.cards)||data.cards.length<1||data.cards.length>100)
  throw Error('Fichier de soirée : liste de 1 à 100 cartes, version 1 ou 2 attendue.');
 const seen=new Set(),cards=[];
 for(const raw of data.cards){
  const card=object(raw)?{...raw}:null;
  if(!card||!Number.isInteger(card.card_id)||card.card_id<1||card.card_id>100||
    seen.has(card.card_id))throw Error('Numérotation invalide : cartes 1 à 100 uniques.');
  seen.add(card.card_id);
  card.title=card.title??'';
  card.description=card.description??'';
  card.timer_minutes=card.timer_minutes??null;
  card.drawer_role=card.drawer_role??'both';
  card.recipient_role=card.recipient_role??'both';
  const empty=card.title===''&&card.description==='';
  if(!empty){
   text(card.title,3,120,'Titre carte '+card.card_id);
   text(card.description,10,900,'Consigne carte '+card.card_id);
  }
  if(!['both','him','her','owner','partner'].includes(card.drawer_role)||
    !['both','him','her','owner','partner'].includes(card.recipient_role)||
    (card.drawer_role===card.recipient_role&&['owner','partner'].includes(card.drawer_role)))
   throw Error('Restrictions de tirage invalides à la carte '+card.card_id);
  duration(card.timer_minutes,'Carte '+card.card_id);
  if(empty&&(card.timer_minutes!==null||card.drawer_role!=='both'||card.recipient_role!=='both'))
   throw Error('Une carte vide ne peut contenir ni durée ni restrictions : carte '+card.card_id);
  cards.push(card);
 }
 // Preserve numbering, existing personal settings and official default cards.
 // A partial library updates only the supplied card IDs.
 return {format:'loveroll-evening',version:2,category:data.category,
  cards:cards.sort((a,b)=>a.card_id-b.card_id)};
}
export function buildMonthlyLibrary(overrides=[]){
 return {format:'loveroll-monthly',version:2,
  activities:editableMonthlyActivities(overrides).map(item=>({
   face:item.face,title:item.title,description:item.description,is_restaurant:item.is_restaurant,
   timer_minutes:duration(item.timer_minutes,'Activité '+item.face)
  }))};
}
export function validateMonthlyLibrary(data){
 if(!object(data)||data.format!=='loveroll-monthly'||data.version!==2||
 !Array.isArray(data.activities)||data.activities.length!==100)
  throw Error('Fichier d’activités : 100 idées de sortie du D100 attendues.');
 const seen=new Set();
 for(const item of data.activities){
  if(!object(item)||!Number.isInteger(item.face)||item.face<1||item.face>100||seen.has(item.face))
   throw Error('Les 100 faces doivent être uniques et numérotées de 1 à 100.');
  seen.add(item.face);text(item.title,3,120,'Titre sortie '+item.face);
  text(item.description,10,900,'Description sortie '+item.face);
  if(typeof item.is_restaurant!=='boolean')throw Error('is_restaurant doit être true ou false.');
  duration(item.timer_minutes,'Sortie '+item.face);
 }
 return data;
}
export function validatePortableAdvent(data){
 return validateAdventJson(data);
}
export function validatePortableSpecial(data){
 return validateSpecialEventsJson(data);
}
export function librarySummary(data,kind){
 if(kind==='evening'){
  const item=validateEveningLibrary(data);
  return {count:item.cards.filter(c=>!!c.title).length,total:100,timers:item.cards.filter(c=>duration(c.timer_minutes,'Minuteur')!==null).length,label:'Bibliothèque '+(item.category==='SENSUEL'?'Sensuel':'Sexuel')+' · 100 cartes'};
 }
 if(kind==='monthly'){
  const item=validateMonthlyLibrary(data);
  return {count:item.activities.length,total:100,timers:item.activities.filter(c=>duration(c.timer_minutes,'Minuteur')!==null).length,label:'Activités du mois'};
 }
 if(kind==='advent'){
  const item=validatePortableAdvent(data);
  return {count:item.days.length,total:25,timers:item.days.filter(c=>duration(c.timer_minutes,'Minuteur')!==null).length,label:'Avent 2026'};
 }
 if(kind==='special'){
  const item=validatePortableSpecial(data);
  let timers=0;
  for(const event of Object.values(item.evenements_speciaux))
   for(const field of ['D6_activite','D6_modificateur'])
    timers+=(event.minuteurs?.[field]||[]).filter(x=>duration(x,'Minuteur')!==null).length;
  return {count:6,total:6,timers,label:'Événements spéciaux'};
 }
 throw Error('Type de bibliothèque inconnu.');
}
export function normalizeLibraryData(data,kind){
 if(kind==='evening')return validateEveningLibrary(data);
 librarySummary(data,kind);
 return data;
}
