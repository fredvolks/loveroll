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

/**
 * Human-readable 5/5 replacement cards. Historical text is used only after
 * server-authorized calendar data is associated with a CLOSED session.
 * Never treat a random D100 face as a stable favorite card identifier.
 */
export function favoriteCardPreview(row,{customCards=[],history=[],sessions=[],builtinCard=null}={}){
 const key=favoriteCardIdentity(row);
 if(!key)return null;
 const {category,cardId}=key;
 const custom=(customCards||[]).find(c=>c?.category===category&&Number(c.card_id)===cardId);
 const archived=(history||[]).find(c=>
  c?.category===category&&Number(c.card_id)===cardId&&
  (sessions||[]).some(s=>s?.id===c.session_id&&!!s.finished_at));
 const original=cardId<=25&&typeof builtinCard==='function'?builtinCard(category,cardId):null;
 return {
  category,cardId,
  title:String(custom?.title||archived?.card_title||original?.title||'Carte n° '+cardId),
  description:String(custom?.description||archived?.card_description||original?.description||''),
 };
}
