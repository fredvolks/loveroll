// One actionable timer control across initial render and every clock tick.
// A completed/expired timer must never display an inert "Reprendre" button.
export function timedEveningTimerControl(timer){
 if(timer?.autoCompletePending)return {
  label:'♡ Validation en cours',status:'Validation du défi en cours',
  disabled:true,resetDisabled:true
 };
 // A view may render before the 500 ms clock tick observes the deadline.
 // Use the same wall-clock deadline as the visible countdown, not the
 // original remainingMs snapshot, so 00:00 never displays "Pause".
 const deadline=Number(timer?.deadline);
 // A running clock without a usable deadline cannot trust a stale
 // remainingMs snapshot: the next tick will treat that clock as expired.
 // In particular, never revive an actionable “Pause” for a broken timer.
 const remaining=timer?.running
  ?(Number.isFinite(deadline)&&deadline>0?Math.max(0,deadline-Date.now()):0)
  :Number(timer?.remainingMs);
 if(!(remaining>0))return {
  label:'♡ Terminé',status:'Terminé',disabled:true,resetDisabled:false
 };
 if(timer?.running)return {
  label:'Ⅱ Pause',status:'En cours',disabled:false,resetDisabled:false
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
// PostgREST timestamps can carry microseconds. Date.parse alone accepts
// impossible calendar dates and TRUNCATES sub-millisecond precision: a
// reversed close within the same millisecond must not count as idempotent.
function parsedValidSessionTimestamp(value){
 if(typeof value!=='string')return null;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!m)return null;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const hour=Number(m[4]),minute=Number(m[5]),second=Number(m[6]);
 const offset=m[8];
 const probe=new Date(0);
 probe.setUTCHours(0,0,0,0);
 probe.setUTCFullYear(year,month-1,day);
 if(probe.getUTCFullYear()!==year||probe.getUTCMonth()!==month-1||
    probe.getUTCDate()!==day||hour>23||minute>59||second>59)return null;
 if(offset!=='Z'&&(Number(offset.slice(1,3))>14||Number(offset.slice(4,6))>59||
    (Number(offset.slice(1,3))===14&&Number(offset.slice(4,6))!==0)))return null;
 const epochMs=Date.parse(value);
 if(!Number.isFinite(epochMs))return null;
 // First three fractional digits are already in epochMs. Keep the other
 // three separately to compare PostgreSQL's full microsecond precision.
 return {epochMs,micros:Number((m[7]??'').padEnd(6,'0').slice(3))};
}

export async function completeTimedEveningChallenge({challenge,userId,sessionId,rpc,query}){
 const accepted=isAcceptedTimedEveningChallenge(challenge,userId,sessionId);
 const alreadyCompleted=isSameCompletedEveningChallenge(challenge,challenge,userId,sessionId);
 if(!accepted&&!alreadyCompleted)return {outcome:'ineligible',finished:false};
 let outcome=alreadyCompleted?'already-completed':'completed';
 if(!alreadyCompleted){
  try{await rpc('answer_challenge',{p_id:challenge.id,p_status:'completed'});}
  catch(error){
   // Another device may have completed the exact same card first.
   const current=(await query('couple_challenges',{eq:{id:challenge.id}}))?.[0];
   if(!isSameCompletedEveningChallenge(challenge,current,userId,sessionId))throw error;
   outcome='already-completed';
  }
 }
 // The card is already saved at this point. A subsequent board/closure
 // outage is a different failure: keep retrying session synchronization,
 // but never tell the player that their completed challenge was rejected.
 let board;
 try{
  board=await rpc('my_love_evening_board',{p_session:sessionId});
  if(board?.finished){
   try{await rpc('finish_couple_session',{p_session:sessionId,p_count:true});}
   catch(error){
    // A simultaneous confirmation by the other partner can close it first.
    const previous=(await query('couple_sessions',{eq:{id:sessionId}}))?.[0];
    // An arbitrary nonempty finished_at is not proof of a successful close.
    // A concurrent device counts only if the exact session was counted
    // and has chronological timestamps. A reset/abandoned session closed
    // with counted=false is not equivalent to finish(..., p_count:true).
    const startedAt=parsedValidSessionTimestamp(previous?.started_at);
    const finishedAt=parsedValidSessionTimestamp(previous?.finished_at);
    const closeIsChronological=startedAt&&finishedAt&&
     (finishedAt.epochMs>startedAt.epochMs||
      (finishedAt.epochMs===startedAt.epochMs&&finishedAt.micros>=startedAt.micros));
    if(previous?.id!==sessionId||previous?.counted!==true||!closeIsChronological)throw error;
   }
  }
 }catch(error){
  const pending=new Error('Défi enregistré, synchronisation de Soirée en attente',{cause:error});
  pending.challengeCompletionConfirmed=true;
  throw pending;
 }
 return {outcome,finished:!!board?.finished};
}

/**
 * A successful server write is final even if the subsequent UI refresh fails.
 * Return a display state, never turn a confirmed completion into an RPC retry.
 */
export async function refreshAfterConfirmedWrite(refresh){
 try{await refresh();return true;}catch{return false;}
}
// Keep the existing Soirée interface while sharing the verified-write
// contract with Surprise reservation saves and cancellations.
export const refreshAfterTimedEveningConfirmation=refreshAfterConfirmedWrite;

// Browser timer state is transient and cannot be carried across sign-in accounts.
// The stored deadline is still restored from that account's own scoped key.
export function timerBelongsToUser(timer,userId){
 return !!(timer?.id&&userId&&timer.ownerUserId===userId);
}

// Only a live, recipient-owned Soirée card may control an existing countdown.
// A stale popup, previous account or completed card cannot restart it.
export function canControlTimedEveningChallenge(timer,challenge,userId,sessionId){
 return timerBelongsToUser(timer,userId)&&
  challenge?.id===timer.id&&challenge?.recipient===userId&&
  challenge?.session_id===sessionId&&
  (challenge.status==='proposed'||challenge.status==='accepted');
}
