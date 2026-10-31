// Future 300-card routing only. The active Sensuel/Sexuel D100 and SQL
// challenge recipient are untouched. A card must never choose an account
// from missing, ambiguous or unverified profile genders.
import {selectFutureCard,FUTURE_TARGETS} from './future-card-catalog.mjs';
const validMember=member=>member&&typeof member.user_id==='string'&&
 member.user_id.trim().length>0;
const coupleIds=members=>Array.isArray(members)&&members.length===2&&
 members.every(validMember)&&members[0].user_id!==members[1].user_id?
 members.map(member=>member.user_id):null;

export function futureCardRecipients(card,members=[]){
 const ids=coupleIds(members);
 if(!ids||!card||!FUTURE_TARGETS.includes(card.target))return [];
 if(card.target==='both')return ids;
 const matching=members.filter(member=>
  member.gender===(card.target==='woman'?'her':'him'));
 // Two women/men do not identify a unique intended recipient. Do not
 // arbitrarily assign a gender-specific challenge to one member.
 return matching.length===1?[matching[0].user_id]:[];
}

// Select ONLY from cards which can be assigned unambiguously to the pair.
// A missing eligible card in a selected level stays unavailable: never
// silently substitute Soft when Medium+Intense was chosen.
export function selectFutureAssignedCard({members=[],cards=[],...options}={}){
 const eligible=Array.isArray(cards)?cards.filter(card=>
  futureCardRecipients(card,members).length>0):[];
 const drawn=selectFutureCard({...options,cards:eligible});
 return {...drawn,recipientIds:drawn.card?
  futureCardRecipients(drawn.card,members):[]};
}
