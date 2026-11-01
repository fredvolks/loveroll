// Read-only comparison of a future LoveRoll card archive and a local draft.
// Neither the active D100 nor any Supabase/payment/history state is changed.
import {canEditFutureDraft} from './future-card-draft.mjs';
const FIELDS=Object.freeze(['title','description','levels','target','minutes']);
const canonicalLevels=value=>Array.isArray(value)?[...value].sort():value;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function compareFutureCardDrafts(savedCards,currentCards,{maxDetails=12}={}){
 if(!canEditFutureDraft(savedCards)||!canEditFutureDraft(currentCards))
  throw Error('Impossible de comparer des cartes aux identifiants invalides ou répétés.');
 if(!Number.isInteger(maxDetails)||maxDetails<0||maxDetails>100)
  throw Error('Limite de comparaison invalide.');
 const previous=new Map(savedCards.map(card=>[card.id,card]));
 const current=new Map(currentCards.map(card=>[card.id,card]));
 const summary={added:0,removed:0,modified:0,unchanged:0},changes=[];
 for(const card of savedCards){
  const next=current.get(card.id);
  if(!next){summary.removed++;changes.push({id:card.id,type:'removed',fields:[]});continue;}
  const fields=FIELDS.filter(key=>{
   const left=key==='levels'?canonicalLevels(card[key]):card[key],
    right=key==='levels'?canonicalLevels(next[key]):next[key];
   return !same(left,right);
  });
  if(fields.length){summary.modified++;changes.push({id:card.id,type:'modified',fields});}
  else summary.unchanged++;
 }
 for(const card of currentCards)if(!previous.has(card.id)){
  summary.added++;changes.push({id:card.id,type:'added',fields:[]});
 }
 return Object.freeze({
  ...summary,totalSaved:savedCards.length,totalCurrent:currentCards.length,
  totalChanges:summary.added+summary.removed+summary.modified,
  details:Object.freeze(changes.slice(0,maxDetails).map(item=>Object.freeze({
   id:item.id,type:item.type,fields:Object.freeze([...item.fields])
  })))
 });
}
