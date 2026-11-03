// Pure, read-only calendar statistics. Does NOT change the official number
// of evenings/dice rolls or any already stored result in Supabase.
// The weekly goal is the lesser of the D6 face and remaining local days
// (one eligible counted evening per calendar day, reset Monday).
const torontoDate=instant=>{
 const time=new Date(instant);
 if(!Number.isFinite(time.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time);
 const value=key=>parts.find(p=>p.type===key)?.value;
 return value('year')+'-'+value('month')+'-'+value('day');
};
// A nonempty finished_at is not sufficient: malformed or reversed dates must
// not turn an active evening into a final failure in monthly results.
export function hasValidEveningClosure(session){
 if(!session?.finished_at)return false;
 const started=Date.parse(session.started_at);
 const finished=Date.parse(session.finished_at);
 return Number.isFinite(started)&&Number.isFinite(finished)&&finished>=started;
}
export function mondayOf(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
 const time=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(time.getTime()))return null;
 const weekday=(time.getUTCDay()+6)%7;
 time.setUTCDate(time.getUTCDate()-weekday);
 return time.toISOString().slice(0,10);
}
export function remainingWeekEvenings(rollAt){
 const local=torontoDate(rollAt);
 if(!local)return 0;
 const day=new Date(local+'T12:00:00Z').getUTCDay();
 return day===0?1:8-day;
}
export function calendarWeekSuccess({date,weeklyRolls=[],sessions=[]}={}){
 const start=mondayOf(date);
 const roll=(weeklyRolls||[]).filter(r=>r.kind==='weekly'&&r.key===start)
  .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
 if(!roll)return {hasRoll:false,possible:0,completed:0,percent:null,face:null};
 const face=Math.max(1,Math.min(6,Number(roll.face)||1));
 const possible=Math.min(face,remainingWeekEvenings(roll.created_at));
 const since=Date.parse(roll.created_at);
 // One eligible evening per Toronto calendar day. Duplicate or resumed
 // session rows must not inflate a weekly success rate.
 const completedDays=new Set();
 for(const session of sessions||[]){
  if(session.counted!==true||!hasValidEveningClosure(session))continue;
  const started=Date.parse(session.started_at);
  if(started<since)continue;
  const day=torontoDate(session.started_at);
  if(day&&mondayOf(day)===start)completedDays.add(day);
 }
 const capped=Math.min(possible,completedDays.size);
 return {hasRoll:true,possible,completed:capped,
  percent:possible?Math.round(100*capped/possible):null,face};
}
export function monthlyChallengeSuccess({
 month,members=[],sessions=[],historyChallenges=[],sessionStats=[],passQuota=[]
}={}){
 const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'');
 if(!valid)return [];
 const chosenSessions=(sessions||[]).filter(s=>torontoDate(s.started_at)?.slice(0,7)===month);
 const sessionsById=new Map(chosenSessions.map(s=>[s.id,s]));
 const closedSessionIds=new Set(chosenSessions.filter(hasValidEveningClosure).map(s=>s.id));
 const freePasses=new Set((passQuota||[]).filter(p=>p.free_pass===true).map(p=>p.challenge_id));
 const byUser=(members||[]).map(m=>{
  const received=(historyChallenges||[]).filter(c=>sessionsById.has(c.session_id)&&c.recipient===m.user_id);
  // A replacement inherits its predecessor's D6 slot. Both occurrences
  // remain visible in history, but only the last card in a chain counts
  // toward the allocated slots and monthly success denominator.
  const replacedIds=new Set(received.map(c=>c.replaces_challenge_id).filter(Boolean));
  const allocated=received.filter(c=>!replacedIds.has(c.id));
  // LR-003: while the evening is open, pending or accepted cards are NOT failed.
  // A completed or passed card is reportable immediately; unresolved cards become
  // final non-completions only when that evening is actually closed.
  const reportable=allocated.filter(c=>closedSessionIds.has(c.session_id)||
    c.status==='completed'||c.status==='passed'||c.status==='refused');
  const complete=reportable.filter(c=>c.status==='completed').length;
  // Free passes never penalize a monthly completion rate.
  const free=reportable.filter(c=>c.status==='passed'&&freePasses.has(c.id)).length;
  const penalized=reportable.filter(c=>c.status==='passed'&&!freePasses.has(c.id)).length;
  // Missing challenge slots become non-realized only after the night is closed.
  const undrawn=(sessionStats||[]).filter(row=>row.user_id===m.user_id&&
   closedSessionIds.has(row.session_id)).reduce((acc,row)=>{
    if(row.target==null)return acc;
    // Count every assigned challenge, INCLUDING a pass, so it cannot count
   // again as a fictitious unpicked challenge.
   const assigned=allocated.filter(c=>c.session_id===row.session_id).length;
   return acc+Math.max(0,Number(row.target)-assigned);
   },0);
  const denominator=reportable.length-free+undrawn;
  const done=complete;
  const success=denominator>0?Math.round(100*done/denominator):null;
  const monthlyPasses=(passQuota||[]).filter(p=>p.recipient===m.user_id);
  return {userId:m.user_id,name:m.name||'Partenaire',done,freeUsed:monthlyPasses.filter(p=>p.free_pass).length,
   penalizedPasses:monthlyPasses.filter(p=>!p.free_pass).length,denominator,
   unpicked:undrawn,percent:success};
 });
 return byUser;
}
