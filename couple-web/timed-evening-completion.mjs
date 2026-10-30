// One actionable timer control across initial render and every clock tick.
// A completed/expired timer must never display an inert "Reprendre" button.
export function timedEveningTimerControl(timer){
 if(timer?.autoCompletePending)return {
  label:'♡ Validation en cours',status:'Validation du défi en cours',
  disabled:true,resetDisabled:true
 };
 // A Passer/Refuser RPC is deciding this card's authoritative status.
 // Keep the timer and its reset locked until server reconciliation completes.
 if(timer?.decisionPending)return {
  label:'♡ Réponse en cours',status:'Décision sur le défi en cours',
  disabled:true,resetDisabled:true
 };
 if(timer?.running)return {
  label:'Ⅱ Pause',status:'En cours',disabled:false,resetDisabled:false
 };
 if(!(Number(timer?.remainingMs)>0))return {
  label:'♡ Terminé',status:'Terminé',disabled:true,resetDisabled:false
 };
 const resumed=Number(timer?.remainingMs)<Number(timer?.durationMs);
 return {label:resumed?'▶ Reprendre':'▶ Démarrer',
  status:'À votre rythme',disabled:false,resetDisabled:false};
}

// A timed Soirée challenge counts as completed after the countdown reaches 00:00.
// Server remains authoritative. Surprise, Advent and Éclat timers are excluded.
export function isAcceptedTimedEveningChallenge(challenge,userId,sessionId){
 return !!(challenge?.id&&sessionId&&userId&&
  challenge.recipient===userId&&challenge.session_id===sessionId&&
  challenge.status==='accepted');
}
// Do not interpret a denied RPC as an idempotent success just because
// a different account/session has a completed card. Re-check the identity
// of the server record after concurrent completion.
export function isSameCompletedEveningChallenge(challenge,current,userId,sessionId){
 return !!(challenge?.id&&userId&&sessionId&&
  challenge.recipient===userId&&challenge.session_id===sessionId&&
  current?.id===challenge.id&&current?.recipient===userId&&
  current?.session_id===sessionId&&current?.status==='completed');
}
export async function completeTimedEveningChallenge({challenge,userId,sessionId,rpc,query}){
 if(!isAcceptedTimedEveningChallenge(challenge,userId,sessionId))
  return {outcome:'ineligible',finished:false};
 let outcome='completed';
 try{await rpc('answer_challenge',{p_id:challenge.id,p_status:'completed'});}
 catch(error){
  // Another device may have completed the exact same card first.
  const current=(await query('couple_challenges',{eq:{id:challenge.id}}))?.[0];
  if(!isSameCompletedEveningChallenge(challenge,current,userId,sessionId))throw error;
  outcome='already-completed';
 }
 const board=await rpc('my_love_evening_board',{p_session:sessionId});
 if(board?.finished){
  try{await rpc('finish_couple_session',{p_session:sessionId,p_count:true});}
  catch(error){
   // A simultaneous confirmation by the other partner can close it first.
   const previous=(await query('couple_sessions',{eq:{id:sessionId}}))?.[0];
   if(!previous?.finished_at)throw error;
  }
 }
 return {outcome,finished:!!board?.finished};
}
