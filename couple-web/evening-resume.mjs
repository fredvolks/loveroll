// An opaque bookmark only. Supabase owns all active game state.
// Never reopen a completed/refused/replaced card after a cross-device update.
const key=(userId,sessionId)=>userId&&sessionId?'loveroll-evening-resume-v1:'+userId+':'+sessionId:null;
export function saveEveningSelection(storage,userId,sessionId,challengeId){
 const k=key(userId,sessionId);if(!k||!challengeId)return false;
 try{if(typeof storage?.setItem!=='function')return false;
  storage.setItem(k,String(challengeId));return true;}catch{return false;}
}
export function clearEveningSelection(storage,userId,sessionId){
 const k=key(userId,sessionId);if(!k)return;
 try{storage?.removeItem(k);}catch{}
}
export function restoreEveningSelection(storage,userId,sessionId,ownVisibleCards=[]){
 const k=key(userId,sessionId);if(!k)return null;
 let id=null;try{id=storage?.getItem(k)||null;}catch{return null;}
 if(!id)return null;
 const card=ownVisibleCards.find(c=>c?.id===id&&c?.recipient===userId&&
  c?.session_id===sessionId&&['proposed','accepted'].includes(c.status));
 if(!card){clearEveningSelection(storage,userId,sessionId);return null;}
 return card.id;
}
