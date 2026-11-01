// LR-019: favorite identity is the stable *card_id*, NEVER the D100 face.
// This module is pure; the Postgres RPC owns membership, quota and transactions.
export const MAX_EVENING_FAVORITES=5;
export function favoriteCardIdentity(card){
 const category=card?.category;
 const raw=card?.card_id;
 const cardId=typeof raw==='number'?raw:
  (typeof raw==='string'&&/^\d+$/.test(raw)?Number(raw):NaN);
 if(!['SENSUEL','SEXUEL'].includes(category)||!Number.isSafeInteger(cardId)||
    cardId<1||cardId>100)return null;
 return {category,cardId};
}
export function isEveningFavorite(rows,card){
 const key=favoriteCardIdentity(card);
 return !!key&&(rows||[]).some(x=>x?.category===key.category&&
   Number(x.card_id)===key.cardId);
}
export function canAddEveningFavorite(rows,card){
 return !!favoriteCardIdentity(card)&&(
  isEveningFavorite(rows,card)||((rows||[]).length<MAX_EVENING_FAVORITES));
}

/**
 * Calendar RPC rows are already scoped by the server to the current couple.
 * The UI must ALSO require a CLOSED session: no secret or live challenge
 * becomes a shared heart by merely guessing its UUID.
 */
export function closedCalendarFavoriteCandidate(history=[],sessions=[],challengeId){
 const row=(history||[]).find(c=>c?.id===challengeId);
 if(!row||!favoriteCardIdentity(row))return null;
 const closed=(sessions||[]).some(s=>s?.id===row.session_id&&!!s.finished_at);
 return closed?row:null;
}
