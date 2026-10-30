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

/**
 * Display only the decision persisted by love_respond_and_redraw.
 * Competing devices may send different actions/exclusion choices on the
 * same challenge. A replay returns the WINNER's action and excluded flag,
 * not the losing device's requested buttons. Never infer from local intent.
 */
// A receipt cannot be trusted just because it claims Passer or Refuser.
// Validate both IDs and the action from the server before selecting a new
// card. The caller can bind it to the challenge that was actually answered.
export function isValidEveningRedrawReceipt(outcome,expectedOriginalId=null){
 if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return false;
 const original=outcome.original_id,replacement=outcome.replacement_id;
 const hasOriginal=typeof original==='string'&&original.trim().length>0;
 const hasReplacement=typeof replacement==='string'&&
  replacement.trim().length>0&&replacement.trim()!==original?.trim();
 const unavailable=outcome.replacement_unavailable===true;
 return hasOriginal&&
  (expectedOriginalId==null||original===expectedOriginalId)&&
  (unavailable?replacement==null:hasReplacement)&&
  (outcome.replacement_unavailable===undefined||
   typeof outcome.replacement_unavailable==='boolean')&&
  (outcome.action==='pass'||outcome.action==='refuse')&&
  typeof outcome.excluded==='boolean'&&
  typeof outcome.already_processed==='boolean'&&
  (outcome.action!=='pass'||outcome.excluded===false);
}

/**
 * Async redraws may resolve after the user changes account, evening or tab.
 * Only the exact initiating view may receive navigation and confirmation.
 * This check is intentionally separate from the server receipt validation.
 */
export function isSameEveningResponseContext(view,request){
 return typeof request?.userId==='string'&&request.userId.length>0&&
  typeof request?.sessionId==='string'&&request.sessionId.length>0&&
  typeof request?.tab==='string'&&request.tab.length>0&&
  view?.user?.id===request.userId&&
  view?.session?.id===request.sessionId&&view?.tab===request.tab;
}

/**
 * Derive confirmation from the stored decision, not the tap from this device.
 * When provided, expectedOriginalId also prevents a mismatched RPC receipt
 * from confirming or navigating to an unrelated challenge.
 */
export function eveningRedrawFeedback(outcome,expectedOriginalId=null){
 if(!isValidEveningRedrawReceipt(outcome,expectedOriginalId))
  return 'Réponse reçue. Vérifie la liste de tes défis pour confirmer le résultat.';
 let detail;
 if(outcome.replacement_unavailable===true)
  detail='Aucun autre défi admissible dans cette catégorie pour ce soir. Tu peux réintégrer un défi retiré ou revenir plus tard.';
 else if(outcome.action==='pass')
  detail='Défi passé — il pourra revenir plus tard.';
 else if(outcome.excluded)
  detail='Défi retiré du lot pour ce cycle.';
 else
  detail='Défi conservé dans la pige.';
 return outcome.already_processed
  ?'Ce défi avait déjà reçu une réponse. '+detail
  :detail;
}
