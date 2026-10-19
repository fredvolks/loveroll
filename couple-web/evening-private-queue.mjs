// A challenge list belongs exclusively to the recipient, never to the other
// partner. The database RLS repeats this rule even for direct API requests.
export function ownEveningChallenges(rows=[],userId,sessionId){
 return (rows||[]).filter(r=>r?.recipient===userId&&r.session_id===sessionId)
  .sort((a,b)=>Date.parse(a.created_at||'')-Date.parse(b.created_at||'')||
   String(a.id).localeCompare(String(b.id)));
}
export function queuePosition(cards=[],id){
 return cards.findIndex(c=>c.id===id);
}
export function queueLabel(status){
 return ({proposed:'À commencer',accepted:'En cours',completed:'Terminé',passed:'Passé'})[status]||'À faire';
}
export function hasTurnToDraw(board,userId){
 return !!(board?.ready&&!board?.drawsFinished&&board?.next===userId&&
  Number(board?.remaining?.[userId]||0)>0);
}
