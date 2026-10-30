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
// The live SQL replay returns the original persisted receipt without the
// replacement_unavailable flag. NULL replacement_id on that replay means
// there was no eligible card to replace the original; a missing property
// remains invalid so truncated network payloads cannot masquerade as replays.
function isUnavailableRedrawReceipt(outcome){
 return outcome?.replacement_unavailable===true||
  (outcome?.already_processed===true&&
   outcome.replacement_unavailable===undefined&&
   outcome.replacement_id===null);
}

// A receipt cannot be trusted just because it claims Passer or Refuser.
// Validate both IDs and the action from the server before selecting a new
// card. The caller can bind it to the challenge that was actually answered.
export function isValidEveningRedrawReceipt(outcome,expectedOriginalId=null){
 if(!outcome||typeof outcome!=='object'||Array.isArray(outcome))return false;
 const original=outcome.original_id,replacement=outcome.replacement_id;
 const hasOriginal=typeof original==='string'&&original.trim().length>0;
 const hasReplacement=hasOriginal&&typeof replacement==='string'&&
  replacement.trim().length>0&&replacement.trim()!==original.trim();
 const unavailable=isUnavailableRedrawReceipt(outcome);
 return hasOriginal&&
  (expectedOriginalId==null||original===expectedOriginalId)&&
  (unavailable?replacement===null:hasReplacement)&&
  (outcome.replacement_unavailable===undefined||
   typeof outcome.replacement_unavailable==='boolean')&&
  (outcome.action==='pass'||outcome.action==='refuse')&&
  typeof outcome.excluded==='boolean'&&
  typeof outcome.already_processed==='boolean'&&
  // The first successful SQL response always contains this boolean.
  // Only an already_processed replay may legitimately omit it.
  (outcome.already_processed===true||
   typeof outcome.replacement_unavailable==='boolean')&&
  (outcome.action!=='pass'||outcome.excluded===false);
}

/**
 * A syntactically valid RPC receipt is not proof that the refreshed RLS
 * view actually contains the decision and its replacement. Verify both
 * persisted rows before showing a final confirmation to the player.
 *
 * The replacement might already be accepted/completed by another device:
 * its presence and provenance matter, not its current action status.
 */
export function isPersistedEveningRedrawReceipt(outcome,rows,userId,sessionId,originalBefore=null){
 if(!isValidEveningRedrawReceipt(outcome))return false;
 if(typeof userId!=='string'||!userId||typeof sessionId!=='string'||!sessionId)
  return false;
 const mine=ownEveningChallenges(rows,userId,sessionId);
 const original=mine.find(card=>card.id===outcome.original_id);
 if(original?.status!==(outcome.action==='pass'?'passed':'refused'))
  return false;
 // After the tap the server may change only decision state and stamps.
 // Compare the refreshed row against the exact card seen on this device.
 if(originalBefore!==null){
  if(!originalBefore||typeof originalBefore!=='object')return false;
  const immutableKeys=['id','session_id','couple_id','offered_by',
   'recipient','category','face','card_id','card_title',
   'card_description','card_timer_minutes','is_gifted','created_at',
   'replaces_challenge_id'];
  if(!immutableKeys.every(key=>
   Object.hasOwn(originalBefore,key)&&Object.hasOwn(original,key)&&
   originalBefore[key]===original[key]))return false;
 }
 // Supabase/PostgREST returns absolute RFC3339 timestamps. Date.parse
 // alone accepts ambiguous input such as '1' or a date without a timezone;
 // those are not trustworthy evidence of a committed database mutation.
 const validStamp=value=>typeof value==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&
  Number.isFinite(Date.parse(value));
 const validCardContent=card=>
  typeof card.card_title==='string'&&card.card_title.trim().length>0&&
  typeof card.card_description==='string'&&card.card_description.trim().length>0&&
  (card.card_timer_minutes===null||
   (Number.isInteger(card.card_timer_minutes)&&card.card_timer_minutes>0));
 // New cards have neither decision stamp. A second device may have
 // already acted on the replacement: accept a committed passed/refused
 // state ONLY when its corresponding stamp is present and the other absent.
 const validDecisionStamps=card=>{
  // The server cannot decide a challenge before creating that challenge.
  if(card.status==='passed')return validStamp(card.passed_at)&&
   card.refused_at===null&&
   Date.parse(card.passed_at)>=Date.parse(card.created_at);
  if(card.status==='refused')return validStamp(card.refused_at)&&
   card.passed_at===null&&
   Date.parse(card.refused_at)>=Date.parse(card.created_at);
  return ['proposed','accepted','completed'].includes(card.status)&&
   card.passed_at===null&&card.refused_at===null;
 };
 // A malformed historical row cannot confirm a new D100 challenge.
 if(!validStamp(original.created_at)||!validCardContent(original)||
  typeof original.is_gifted!=='boolean'||!validDecisionStamps(original))
  return false;
 const validD100=card=>Number.isInteger(card.face)&&card.face>=1&&card.face<=100&&
  Number.isInteger(card.card_id)&&card.card_id>=1&&card.card_id<=100;
 if(!validD100(original))return false;
 // The decision must not predate the challenge it answered.
 const actionStamp=outcome.action==='pass'?original.passed_at:original.refused_at;
 if(Date.parse(actionStamp)<Date.parse(original.created_at))return false;
 // One answered card occupies precisely one D6 slot. Repeated device
 // responses must never create two direct replacements for the same origin.
 const replacements=mine.filter(card=>
  card.replaces_challenge_id===outcome.original_id);
 if(outcome.replacement_id===null)return replacements.length===0;
 if(replacements.length!==1)return false;
 const replacement=replacements[0];
 if(!validStamp(replacement.created_at)||!validCardContent(replacement)||
  !validDecisionStamps(replacement))return false;
 // The replacement is inserted by the SAME transaction that commits
 // Passer/Refuser. It cannot be older than that persisted decision stamp.
 if(Date.parse(replacement.created_at)<Date.parse(actionStamp))
  return false;
 // The official SQL chooses a different library card and D100 face
 // within the same category, recipient and evening. A stale or corrupted
 // response must not falsely confirm the same physical card again.
 return replacement.id===outcome.replacement_id&&
  replacement.category===original.category&&
  replacement.offered_by===original.offered_by&&
  replacement.couple_id===original.couple_id&&
  validD100(original)&&validD100(replacement)&&
  replacement.face!==original.face&&
  replacement.card_id!==original.card_id&&
  // The official redraw RPC excludes a face AND a library card already
  // seen by this recipient in the selected category during this evening.
  // This must include past cards, not only the previous original.
  !mine.some(card=>card.id!==replacement.id&&
   card.category===replacement.category&&
   (card.face===replacement.face||card.card_id===replacement.card_id))&&
  replacement.is_gifted===original.is_gifted;
}

/**
 * A confirmed replacement may have already been passed/refused on another
 * device while the first device refreshed the list. Focus only a currently
 * visible D6 card; never navigate to a historical row or a foreign account.
 * Caller must first check isPersistedEveningRedrawReceipt.
 */
export function activeEveningRedrawReplacementId(rows,outcome,userId,sessionId){
 if(!Array.isArray(rows)||!outcome?.replacement_id)return null;
 const replacement=ownEveningChallenges(rows,userId,sessionId)
  .find(card=>card.id===outcome.replacement_id);
 return replacement&&['proposed','accepted','completed'].includes(replacement.status)
  ?replacement.id:null;
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
 * Reconcile an uncertain Passer/Refuser receipt against an independently
 * refreshed challenge, never against the button the user tapped.
 * Keep the timer untouched when no reliable status is available.
 */
export function redrawTimerRecovery(status,deadline,now){
 if(['passed','refused','completed'].includes(status))return 'stop';
 if(status==='accepted'&&Number.isFinite(deadline)&&deadline>0&&
    Number.isFinite(now)&&deadline<=now)return 'expire';
 return 'retain';
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
 if(isUnavailableRedrawReceipt(outcome))
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
