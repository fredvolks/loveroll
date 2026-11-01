// Pure, read-only calendar statistics. Does NOT change the official number
// of evenings/dice rolls or any already stored result in Supabase.
// The weekly goal is the lesser of the D6 face and remaining local days
// (one eligible counted evening per calendar day, reset Monday).
const torontoDate=instant=>{
 // An unloaded legacy timestamp must not be mistaken for 1969/1970.
 if(typeof instant!=='string'&&!(instant instanceof Date))return null;
 const time=new Date(instant);
 if(!Number.isFinite(time.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time);
 const value=key=>parts.find(p=>p.type===key)?.value;
 return value('year')+'-'+value('month')+'-'+value('day');
};
// Shared month/day grouping for the couple archive and monthly success rate.
// Officially counted and closed evenings belong to their Québec closure day.
// Other sessions (in progress or interrupted) remain on their starting day.
// This is display-only and never changes the server's weekly quota rules.
export function eveningArchiveDay(session){
 if(!session||typeof session!=='object'||Array.isArray(session))return null;
 const started=torontoDate(session.started_at);
 if(session.counted===true&&session.finished_at)
  return torontoDate(session.finished_at)||started;
 return started;
}
export function mondayOf(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
 const time=new Date(date+'T12:00:00Z');
 // Reject impossible ISO days instead of normalizing them into another week.
 if(!Number.isFinite(time.getTime())||time.toISOString().slice(0,10)!==date)return null;
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
 // Sparse Supabase history may contain null or invalid legacy rows.
 const safeRows=value=>Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];
 const empty={hasRoll:false,possible:0,completed:0,percent:null,face:null};
 if(!start)return empty;
 const roll=safeRows(weeklyRolls).filter(r=>r.kind==='weekly'&&r.key===start)
  .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
 if(!roll)return empty;
 // A malformed latest roll is not a face 1, nor can it resurrect an older die.
 const face=Number(roll.face),since=Date.parse(roll.created_at);
 if(!Number.isInteger(face)||face<1||face>6||
    !Number.isFinite(since)||!torontoDate(roll.created_at))return empty;
 const possible=Math.min(face,remainingWeekEvenings(roll.created_at));
 // Count a maximum of one eligible counted night per Québec calendar day.
 // Two historical records on the same local day never increase D6 success.
 const completedDays=new Set(safeRows(sessions).filter(s=>s.counted===true&&s.finished_at&&
  mondayOf(torontoDate(s.started_at))===start&&Date.parse(s.started_at)>=since)
  .map(s=>torontoDate(s.started_at)));
 const capped=Math.min(possible,completedDays.size);
 return {hasRoll:true,possible,completed:capped,
  percent:possible?Math.round(100*capped/possible):null,face};
}
export function monthlyChallengeSuccess({
 month,members=[],sessions=[],historyChallenges=[],sessionStats=[],passQuota=[]
}={}){
 const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'');
 if(!valid)return [];
 // All inputs are RPC snapshots, sometimes including incomplete legacy rows.
 // Skip malformed entries instead of breaking the entire mobile calendar.
 const rows=value=>Array.isArray(value)?value.filter(x=>
  x&&typeof x==='object'&&!Array.isArray(x)):[];
 const chosenSessions=rows(sessions).filter(s=>
  s.id!=null&&eveningArchiveDay(s)?.slice(0,7)===month);
 const sessionsById=new Map(chosenSessions.map(s=>[s.id,s]));
 const passes=rows(passQuota);
 const history=rows(historyChallenges);
 const stats=rows(sessionStats);
 const freePasses=new Set(passes.filter(p=>p.free_pass===true).map(p=>p.challenge_id));
 const byUser=rows(members).filter(m=>typeof m.user_id==='string'&&m.user_id).map(m=>{
  const received=history.filter(c=>sessionsById.has(c.session_id)&&c.recipient===m.user_id);
  // A replacement inherits its predecessor's D6 slot. Both occurrences
  // remain visible in history, but only the last card in a chain counts
  // toward the allocated slots and monthly success denominator.
  const replacedIds=new Set(received.map(c=>c.replaces_challenge_id).filter(Boolean));
  const allocated=received.filter(c=>!replacedIds.has(c.id));
  // LR-003: while the evening is open, pending or accepted cards are NOT failed.
  // A completed or passed card is reportable immediately; unresolved cards become
  // final non-completions only when that evening is actually closed.
  const reportable=allocated.filter(c=>!!sessionsById.get(c.session_id)?.finished_at||
    c.status==='completed'||c.status==='passed'||c.status==='refused');
  const complete=reportable.filter(c=>c.status==='completed').length;
  // Free passes never penalize a monthly completion rate.
  const free=reportable.filter(c=>c.status==='passed'&&freePasses.has(c.id)).length;
  const penalized=reportable.filter(c=>c.status==='passed'&&!freePasses.has(c.id)).length;
  // Missing challenge slots become non-realized only after the night is closed.
  const undrawn=stats.filter(row=>row.user_id===m.user_id&&
   sessionsById.get(row.session_id)?.finished_at).reduce((acc,row)=>{
    // Historic RPC values may be null, NaN, Infinity, negative or fractional.
   // Ignore invalid targets rather than poisoning the entire couple summary.
   const target=Number(row.target);
   if(row.target==null||!Number.isSafeInteger(target)||target<0)return acc;
   // Include passes in the assigned count; they are not a second missing card.
   const assigned=allocated.filter(c=>c.session_id===row.session_id).length;
   return acc+Math.max(0,target-assigned);
   },0);
  const denominator=reportable.length-free+undrawn;
  const done=complete;
  const success=denominator>0?Math.round(100*done/denominator):null;
  const monthlyPasses=passes.filter(p=>p.recipient===m.user_id);
  return {userId:m.user_id,name:m.name||'Partenaire',done,freeUsed:monthlyPasses.filter(p=>p.free_pass).length,
   penalizedPasses:monthlyPasses.filter(p=>!p.free_pass).length,denominator,
   unpicked:undrawn,percent:success};
 });
 return byUser;
}
