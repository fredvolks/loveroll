// A challenge list belongs exclusively to the recipient, never to the other
// partner. The database RLS repeats this rule even for direct API requests.
export function ownEveningChallenges(rows=[],userId,sessionId){
 return (rows||[]).filter(r=>r?.recipient===userId&&r.session_id===sessionId)
  .sort((a,b)=>Date.parse(a.created_at||'')-Date.parse(b.created_at||'')||
   String(a.id).localeCompare(String(b.id)));
}
// LR-015: a replacement occupies the SAME D6 slot. Finished cards remain
// visible, but passed/refused occurrences belong to history, not the live queue.
// No source rows are deleted; the calendar still reads all occurrences.
export function visibleEveningQueue(cards=[]){
 const all=cards||[],originalOrder=new Map(all.map((card,index)=>[card?.id,index]));
 const byId=new Map(all.map(card=>[card?.id,card]));
 const slotFor=card=>{
  // A refusal can itself be replaced. Follow the chain back to the first
  // physical card in the D6 slot, with guards for malformed historic links.
  const visited=new Set();let current=card;
  for(let i=0;i<all.length&&current?.replaces_challenge_id;i++){
   if(visited.has(current.id))break;
   visited.add(current.id);
   const previous=byId.get(current.replaces_challenge_id);
   if(!previous||previous.id===current.id)break;
   current=previous;
  }
  return originalOrder.get(current?.id)??originalOrder.get(card?.id)??0;
 };
 return all.filter(c=>!['passed','refused'].includes(c?.status))
  .sort((left,right)=>slotFor(left)-slotFor(right)||
   (originalOrder.get(left.id)??0)-(originalOrder.get(right.id)??0));
}
export function queuePosition(cards=[],id){
 return cards.findIndex(c=>c.id===id);
}
export function queueLabel(status){
 return ({proposed:'À commencer',accepted:'En cours',completed:'Terminé',passed:'Passé',refused:'Refusé'})[status]||'À faire';
}
export function hasTurnToDraw(board,userId){
 return !!(board?.ready&&!board?.drawsFinished&&board?.next===userId&&
  Number(board?.remaining?.[userId]||0)>0);
}
