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
// A closure is final only when both timestamps are real instants and
// the finish does not precede the start. Counted is intentionally separate:
// non-counted evenings still appear as closed in their own history.
// PostgreSQL returns ISO timestamps with up to six fractional digits.
// Date.parse alone silently normalizes 31 February and loses microseconds.
function validSessionInstant(value){
 if(typeof value!=='string')return null;
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const hour=Number(match[4]),minute=Number(match[5]),second=Number(match[6]);
 const offset=match[8];
 const check=new Date(0);
 check.setUTCHours(0,0,0,0);
 check.setUTCFullYear(year,month-1,day);
 if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||
    check.getUTCDate()!==day||hour>23||minute>59||second>59)return null;
 if(offset!=='Z'&&(Number(offset.slice(1,3))>14||
    Number(offset.slice(4,6))>59||
    (Number(offset.slice(1,3))===14&&Number(offset.slice(4,6))!==0)))return null;
 const milliseconds=Date.parse(value);
 if(!Number.isFinite(milliseconds))return null;
 // Date.parse covers the first three fractional digits, preserve the rest.
 const microRemainder=Number((match[7]??'').padEnd(6,'0').slice(3));
 return {milliseconds,microRemainder};
}
export function isClosedEvening(session){
 const started=validSessionInstant(session?.started_at);
 const finished=validSessionInstant(session?.finished_at);
 return !!(started&&finished&&
  (finished.milliseconds>started.milliseconds||
   (finished.milliseconds===started.milliseconds&&
    finished.microRemainder>=started.microRemainder)));
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
  if(session.counted!==true||!isClosedEvening(session))continue;
  // The session must have begun after the official weekly D6 roll.
  if(Date.parse(session.started_at)<since)continue;
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
  const reportable=allocated.filter(c=>isClosedEvening(sessionsById.get(c.session_id))||
    c.status==='completed'||c.status==='passed'||c.status==='refused');
  const complete=reportable.filter(c=>c.status==='completed').length;
  // Free passes never penalize a monthly completion rate.
  const free=reportable.filter(c=>c.status==='passed'&&freePasses.has(c.id)).length;
  const penalized=reportable.filter(c=>c.status==='passed'&&!freePasses.has(c.id)).length;
  // Missing challenge slots become non-realized only after the night is closed.
  const undrawn=(sessionStats||[]).filter(row=>row.user_id===m.user_id&&
   isClosedEvening(sessionsById.get(row.session_id))).reduce((acc,row)=>{
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
