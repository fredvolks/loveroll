// An opaque bookmark only. Supabase owns all active game state.
// Never reopen a completed/refused/replaced card after a cross-device update.
const key=(userId,sessionId)=>userId&&sessionId?'loveroll-evening-resume-v1:'+userId+':'+sessionId:null;
// Some browsers throw on reading window.localStorage itself (e.g. blocked storage).
export function safeEveningStorage(readStorage=()=>globalThis.localStorage){
 try{return readStorage()??null;}catch{return null;}
}
export function saveEveningSelection(storage,userId,sessionId,challengeId){
 const k=key(userId,sessionId);if(!k||!challengeId)return false;
 // An accepted setItem call does not prove persistence (e.g. a silent no-op shim).
 // Browser Storage writes are synchronous; read back the opaque ID before
 // reporting a bookmark that can genuinely survive the next UI render.
 try{
  if(typeof storage?.setItem!=='function'||typeof storage?.getItem!=='function')return false;
  const selected=String(challengeId);
  storage.setItem(k,selected);
  return storage.getItem(k)===selected;
 }catch{return false;}
}
export function clearEveningSelection(storage,userId,sessionId){
 const k=key(userId,sessionId);if(!k)return;
 try{storage?.removeItem(k);}catch{}
}
export function restoreEveningSelection(storage,userId,sessionId,ownVisibleCards){
 const k=key(userId,sessionId);if(!k)return null;
 let id=null;try{id=storage?.getItem(k)||null;}catch{return null;}
 if(!id)return null;
 // Missing or malformed data is not evidence that the server removed the card.
 // Only a confirmed array of visible cards may invalidate a bookmark.
 if(!Array.isArray(ownVisibleCards))return null;
 const card=ownVisibleCards.find(c=>c?.id===id&&c?.recipient===userId&&
  c?.session_id===sessionId&&['proposed','accepted'].includes(c.status));
 if(!card){clearEveningSelection(storage,userId,sessionId);return null;}
 return card.id;
}

// A started card belongs to Supabase. If browser storage is denied, resume
// that server-confirmed card instead of opening an arbitrary unstarted draw.
// Never use an unverified, foreign, completed or refused card as a fallback.
export function recoverAcceptedEveningSelection(visibleCards,userId,sessionId){
 if(!Array.isArray(visibleCards)||!userId||!sessionId)return null;
 return visibleCards.find(c=>c?.recipient===userId&&c.session_id===sessionId&&
  c.status==='accepted'&&c.id)?.id||null;
}
