// Future card draft utility only. Never modifies live LoveRoll sessions,
// the legacy D100 deck, Supabase, user history or payment information.
import {FUTURE_LEVELS,FUTURE_TARGETS} from './future-card-catalog.mjs';
export const MAX_FUTURE_DRAFT_CARDS=1000;
const validId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9_.:-]{0,127}$/iu.test(id);
const cleanText=s=>typeof s==='string'&&!/[\u0000-\u001f<>]/u.test(s);
const clone=c=>({...c,levels:Array.isArray(c.levels)?[...c.levels]:c.levels});

export function canEditFutureDraft(cards){
 if(!Array.isArray(cards)||cards.length>MAX_FUTURE_DRAFT_CARDS)return false;
 const ids=new Set();
 for(const card of cards){
  if(!card||typeof card!=='object'||Array.isArray(card)||
     !validId(card.id)||ids.has(card.id))return false;
  ids.add(card.id);
 }
 return true;
}
export function upsertFutureDraftCard(cards,input,originalId=null){
 if(!canEditFutureDraft(cards))throw Error('Brouillon invalide : identifiants répétés ou incorrects.');
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw Error('Champs de carte invalides.');
 const id=typeof input.id==='string'?input.id.trim():'',
  title=typeof input.title==='string'?input.title.trim():'',
  description=typeof input.description==='string'?input.description.trim():'',
  levels=input.levels,target=input.target,
  minutes=typeof input.minutes==='string'&&/^[2-6]$/u.test(input.minutes)?
   Number(input.minutes):input.minutes;
 if(!validId(id))throw Error('Identifiant unique invalide (128 caractères maximum).');
 if(!cleanText(title)||title.length<5||title.length>120)
  throw Error('Titre : 5 à 120 caractères, sans HTML.');
 if(!cleanText(description)||description.length<15||description.length>1200)
  throw Error('Consigne : 15 à 1200 caractères, sans HTML.');
 if(!Array.isArray(levels)||levels.length===0||
    levels.some(level=>!FUTURE_LEVELS.includes(level))||
    new Set(levels).size!==levels.length)
  throw Error('Sélectionner un ou plusieurs niveaux valides, sans répétition.');
 if(!FUTURE_TARGETS.includes(target))throw Error('Destinataire invalide.');
 if(!Number.isInteger(minutes)||minutes<2||minutes>6)
  throw Error('Durée invalide : 2 à 6 minutes.');
 const i=originalId===null?-1:cards.findIndex(card=>card.id===originalId);
 if(originalId!==null&&i<0)throw Error('La carte modifiée est introuvable.');
 if(cards.some((card,index)=>card.id===id&&index!==i))
  throw Error('Cet identifiant existe déjà.');
 if(i<0&&cards.length>=MAX_FUTURE_DRAFT_CARDS)
  throw Error('Le brouillon est limité à 1000 cartes.');
 const copy=cards.map(clone);
 const next={id,title,description,levels:[...levels],target,minutes};
 if(i>=0)copy[i]=next;else copy.push(next);
 return copy;
}
export function removeFutureDraftCard(cards,id){
 if(!canEditFutureDraft(cards)||!validId(id)||!cards.some(c=>c.id===id))
  throw Error('Carte introuvable.');
 return cards.filter(card=>card.id!==id).map(clone);
}
