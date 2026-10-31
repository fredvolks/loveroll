// Future LoveRoll 300-card catalog. Pure preview only; no current Supabase
// D100, Sensuel/Sexuel probability, session, favorites or history is changed.
// Memberships count per level: a single card may belong to several levels.
import {chooseFutureStyle} from './play-style.mjs';
export const FUTURE_LEVELS=Object.freeze(['soft','medium','intense']);
export const FUTURE_TARGETS=Object.freeze(['woman','man','both']);
const validId=id=>typeof id==='string'&&id.trim().length>0&&id.length<=128;
const hasUniqueLevels=levels=>Array.isArray(levels)&&levels.length>0&&
 levels.every(v=>FUTURE_LEVELS.includes(v))&&new Set(levels).size===levels.length;
const validCard=c=>!!c&&typeof c==='object'&&!Array.isArray(c)&&
 validId(c.id)&&hasUniqueLevels(c.levels)&&
 FUTURE_TARGETS.includes(c.target)&&Number.isInteger(c.minutes)&&
 c.minutes>=2&&c.minutes<=6;

/** Quality gate for a future 100/100/100 deck (not a game migration).
 * A balanced audience means 33/33/34 among woman/man/both per level.
 */
export function auditFutureCardCatalog(cards,{perLevel=100}={}){
 const errors=[],counts=Object.fromEntries(FUTURE_LEVELS.map(level=>
  [level,{total:0,woman:0,man:0,both:0}]));
 const seen=new Set();
 if(!Array.isArray(cards))return {valid:false,errors:['Le catalogue doit être un tableau.'],counts};
 for(const [index,card] of cards.entries()){
  if(!validCard(card)){errors.push('Carte invalide à la position '+(index+1));continue;}
  if(seen.has(card.id)){errors.push('Identifiant en double : '+card.id);continue;}
  seen.add(card.id);
  for(const level of card.levels){
   counts[level].total++;
   counts[level][card.target]++;
  }
 }
 for(const level of FUTURE_LEVELS){
  const row=counts[level];
  if(perLevel!==null&&row.total!==perLevel)
   errors.push(level+' : '+row.total+' cartes sur '+perLevel+' attendues');
  const audiences=FUTURE_TARGETS.map(audience=>row[audience]);
  if(Math.max(...audiences)-Math.min(...audiences)>1)
   errors.push(level+' : répartition femme/homme/les deux déséquilibrée');
 }
 return {valid:errors.length===0,errors,counts};
}

/** Independent bucket tickets preserve the 50/50 Medium+Intense rule.
 * Never silently insert Soft when partners chose Medium and Intense.
 * Exclusions and previous selections remain caller-owned, with no side effect.
 */
export function selectFutureCard({
 cards=[],styleA='medium',styleB='medium',styleTicket=0,cardTicket=0,
 excludedIds=[]
}={}){
 if(!Number.isFinite(cardTicket)||cardTicket<0||cardTicket>=1)
  throw Error('Tirage de carte invalide.');
 const level=chooseFutureStyle(styleA,styleB,styleTicket);
 const excluded=new Set(Array.isArray(excludedIds)?excludedIds:[]);
 const choices=Array.isArray(cards)?cards.filter(c=>
  validCard(c)&&c.levels.includes(level)&&!excluded.has(c.id)):[];
 if(!choices.length)return {level,card:null,candidateCount:0};
 const card=choices[Math.floor(cardTicket*choices.length)];
 return {level,card,candidateCount:choices.length};
}
