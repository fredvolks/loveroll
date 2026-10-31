// An opaque bookmark only. Supabase owns all active game state.
const key=(userId,sessionId)=>userId&&sessionId?'loveroll-evening-resume-v1:'+userId+':'+sessionId:null;
export function saveEveningSelection(storage,userId,sessionId,challengeId){
 const k=key(userId,sessionId);
 // Never acknowledge a bookmark that was not actually persisted. UUIDs are
 // opaque strings; a missing storage adapter or a malformed ID is not success.
 if(!k||typeof challengeId!=='string'||!challengeId.trim())return false;
 try{
  if(typeof storage?.setItem!=='function')return false;
  storage.setItem(k,challengeId);
  return true;
 }catch{return false;}
}
export function clearEveningSelection(storage,userId,sessionId){
 const k=key(userId,sessionId);if(!k)return;
 try{storage?.removeItem(k);}catch{}
}
export function restoreEveningSelection(storage,userId,sessionId,ownVisibleCards=[]){
 const k=key(userId,sessionId);if(!k)return null;
 // Network/RLS loading can temporarily return a malformed collection.
 // Avoid crashing or erasing a valid bookmark on a non-authoritative response.
 if(!Array.isArray(ownVisibleCards))return null;
 let id=null;try{id=storage?.getItem(k)||null;}catch{return null;}
 if(!id)return null;
 const card=ownVisibleCards.find(c=>c?.id===id&&c?.recipient===userId&&
  c?.session_id===sessionId&&!['passed','refused'].includes(c.status));
 if(!card){clearEveningSelection(storage,userId,sessionId);return null;}
 return card.id;
}
