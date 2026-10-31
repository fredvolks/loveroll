// Offline draft archives only. This NEVER authorizes purchases, changes the
// active D100, or stores anything on Supabase. A server must own paid history.
import {FUTURE_LEVELS,FUTURE_TARGETS} from './future-card-catalog.mjs';
import {canEditFutureDraft} from './future-card-draft.mjs';

export const FUTURE_ARCHIVE_KIND='loveroll-future-deck-history';
export const FUTURE_ARCHIVE_VERSION=1;
export const FUTURE_ARCHIVE_LIMIT=24;
export const FUTURE_ARCHIVE_MAX_BYTES=8*1024*1024;
const utcIso=value=>typeof value==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const clone=value=>JSON.parse(JSON.stringify(value));
const textOk=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&
 value.trim().length<=max&&!/[\u0000-\u001f<>]/u.test(value);
const validSnapshot=cards=>canEditFutureDraft(cards)&&cards.every(card=>
 Array.isArray(card.levels)&&card.levels.length>0&&
 card.levels.every(level=>FUTURE_LEVELS.includes(level))&&
 new Set(card.levels).size===card.levels.length&&
 FUTURE_TARGETS.includes(card.target)&&
 Number.isInteger(card.minutes)&&card.minutes>=2&&card.minutes<=6&&
 textOk(card.title,5,120)&&textOk(card.description,15,1200));
const safeJson=value=>{
 try{
  const json=JSON.stringify(value);
  if(typeof json!=='string'||new TextEncoder().encode(json).length>FUTURE_ARCHIVE_MAX_BYTES)
   return null;
  return json;
 }catch{return null;}
};
export function blankFutureArchive(){
 return {kind:FUTURE_ARCHIVE_KIND,version:FUTURE_ARCHIVE_VERSION,revisions:[]};
}
export function inspectFutureArchive(archive){
 if(!archive||typeof archive!=='object'||Array.isArray(archive)||
  archive.kind!==FUTURE_ARCHIVE_KIND||archive.version!==FUTURE_ARCHIVE_VERSION||
  !Array.isArray(archive.revisions))
  return {valid:false,reason:'format',count:0};
 if(archive.revisions.length>FUTURE_ARCHIVE_LIMIT)
  return {valid:false,reason:'limit',count:archive.revisions.length};
 if(!safeJson(archive))return {valid:false,reason:'size',count:archive.revisions.length};
 const ids=new Set();
 for(const item of archive.revisions){
  if(!item||typeof item!=='object'||Array.isArray(item)||
    !utcIso(item.createdAt)||item.id!=='revision:'+item.createdAt||
    ids.has(item.id)||!textOk(item.label,1,80)||
    !validSnapshot(item.cards))
   return {valid:false,reason:'entry',count:archive.revisions.length};
  ids.add(item.id);
 }
 return {valid:true,reason:'ok',count:archive.revisions.length};
}
export function addFutureArchiveRevision(archive,cards,{createdAt,label}={}){
 const prior=inspectFutureArchive(archive);
 if(!prior.valid)throw Error('Historique invalide : aucune version ne peut être remplacée.');
 if(prior.count>=FUTURE_ARCHIVE_LIMIT)
  throw Error('Limite de 24 versions : exporter cet historique avant d’en créer un autre.');
 if(!validSnapshot(cards)||cards.length===0)
  throw Error('Corriger les cartes avant de sauvegarder cette version.');
 if(!utcIso(createdAt))throw Error('Date de version invalide (UTC requis).');
 const normalized=typeof label==='string'?label.trim():'';
 if(!textOk(normalized,1,80))throw Error('Nom de version requis (80 caractères max).');
 const id='revision:'+createdAt;
 if(archive.revisions.some(item=>item.id===id))
  throw Error('Une version existe déjà à cette date.');
 const next={kind:FUTURE_ARCHIVE_KIND,version:FUTURE_ARCHIVE_VERSION,
  revisions:[...clone(archive.revisions),{id,createdAt,label:normalized,cards:clone(cards)}]};
 if(!safeJson(next))throw Error('Historique trop volumineux pour un fichier local.');
 return next;
}
export function recoverFutureArchiveRevision(archive,id){
 if(!inspectFutureArchive(archive).valid||typeof id!=='string')
  throw Error('Historique illisible.');
 const found=archive.revisions.find(item=>item.id===id);
 if(!found)throw Error('Version introuvable.');
 return clone(found.cards);
}
