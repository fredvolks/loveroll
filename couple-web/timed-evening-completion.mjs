// A timed Soirée challenge counts as completed after the countdown reaches 00:00.
// Server remains authoritative. Surprise, Advent and Éclat timers are excluded.
export function isAcceptedTimedEveningChallenge(challenge,userId,sessionId){
 return !!(challenge?.id&&sessionId&&userId&&
  challenge.recipient===userId&&challenge.session_id===sessionId&&
  challenge.status==='accepted');
}
export async function completeTimedEveningChallenge({challenge,userId,sessionId,rpc,query}){
 if(!isAcceptedTimedEveningChallenge(challenge,userId,sessionId))
  return {outcome:'ineligible',finished:false};
 let outcome='completed';
 try{await rpc('answer_challenge',{p_id:challenge.id,p_status:'completed'});}
 catch(error){
  // Another device may have completed the exact same card first.
  const current=(await query('couple_challenges',{eq:{id:challenge.id}}))?.[0];
  if(current?.status!=='completed')throw error;
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
