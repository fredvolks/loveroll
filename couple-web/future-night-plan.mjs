// Future-only night planner. Never writes to Supabase, changes live D100
// weights, starts a session, charges a fee, or consumes active challenges.
// Use this for previews until the 300 original cards pass the release audit.
import {selectFutureAssignedCard} from './future-card-audience.mjs';

export const FUTURE_NIGHT_LENGTHS=Object.freeze([5,10,15,30,'free']);
const VALID_CAP=20;
const isTicket=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<1;
const ticketAt=(tickets,index)=>{
 if(tickets===undefined)return (index*0.6180339887498949+0.123)%1;
 const value=tickets[index];
 if(!isTicket(value))throw Error('Tirage de carte indisponible ou invalide.');
 return value;
};

/** The two partner styles alternate in the future planner, making 50/50
 * exact for an even number of cards rather than merely probable over time.
 * No fallback to a third category, no repeat of a used card, no truncated
 * challenge, and no client-side decision about the server's live game.
 */
export function buildFutureNightPlan({
 members=[],cards=[],styleA='medium',styleB='medium',minutes=15,
 excludedIds=[],cardTickets,maxCards=VALID_CAP
}={}){
 // The current next-night dropdown persists string values ("5", "15", ...).
 // Normalize those exact choices; do not accept arbitrary coercible input.
 const selectedMinutes=typeof minutes==='string'&&/^(5|10|15|30)$/.test(minutes)?
  Number(minutes):minutes;
 if(!FUTURE_NIGHT_LENGTHS.includes(selectedMinutes))
  throw Error('Durée de soirée invalide.');
 if(!Number.isInteger(maxCards)||maxCards<1||maxCards>100)
  throw Error('Nombre de cartes invalide.');
 if(!Array.isArray(cards)||!Array.isArray(excludedIds)||
    (cardTickets!==undefined&&!Array.isArray(cardTickets)))
  throw Error('Liste de cartes ou de tirages invalide.');
 const free=selectedMinutes==='free',selected=[],used=new Set(excludedIds),
  seenIds=new Set();
 let spent=0,reason='limit';
 for(let index=0;index<maxCards;index++){
  const remaining=free?Infinity:selectedMinutes-spent;
  if(remaining<2){reason='duration';break;}
  // Validation, level and recipient rules are delegated to the same future
  // selector used by the single-card preview. Invalid cards are ignored.
  const fitting=cards.filter(card=>Number.isInteger(card?.minutes)&&
   card.minutes<=remaining&&!seenIds.has(card.id));
  const assigned=selectFutureAssignedCard({
   members,cards:fitting,styleA,styleB,
   styleTicket:index%2===0?0.25:0.75,
   cardTicket:ticketAt(cardTickets,index),excludedIds:[...used]
  });
  if(!assigned.card){reason='no-eligible-card';break;}
  const card=assigned.card,fromMinute=spent;
  spent+=card.minutes;
  used.add(card.id);seenIds.add(card.id);
  selected.push(Object.freeze({
   cardId:card.id,level:assigned.level,minutes:card.minutes,
   recipientIds:Object.freeze([...assigned.recipientIds]),
   fromMinute,toMinute:spent
  }));
  if(!free&&spent===selectedMinutes){reason='duration';break;}
 }
 return Object.freeze({
  requestedMinutes:selectedMinutes,spentMinutes:spent,
  remainingMinutes:free?null:selectedMinutes-spent,
  reason,items:Object.freeze(selected)
 });
}
