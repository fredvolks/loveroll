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
 const completed=(sessions||[]).filter(s=>s.counted===true&&s.finished_at&&
  mondayOf(torontoDate(s.started_at))===start&&Date.parse(s.started_at)>=since).length;
 const capped=Math.min(possible,completed);
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
  const complete=received.filter(c=>c.status==='completed').length;
  // A used free pass is never a failed challenge, even if it was re-drawn.
  const free=received.filter(c=>c.status==='passed'&&freePasses.has(c.id)).length;
  const penalized=received.filter(c=>c.status==='passed'&&!freePasses.has(c.id)).length;
  // Missing challenge slots become non-realized only after the night is closed.
  const undrawn=(sessionStats||[]).filter(row=>row.user_id===m.user_id&&
   sessionsById.get(row.session_id)?.finished_at).reduce((acc,row)=>{
    if(row.target==null)return acc;
    const nonPassed=(historyChallenges||[]).filter(c=>c.session_id===row.session_id&&
     c.recipient===m.user_id&&c.status!=='passed').length;
    return acc+Math.max(0,Number(row.target)-nonPassed);
   },0);
  const denominator=received.length-free+undrawn;
  const done=complete;
  const success=denominator>0?Math.round(100*done/denominator):null;
  const monthlyPasses=(passQuota||[]).filter(p=>p.recipient===m.user_id);
  return {userId:m.user_id,name:m.name||'Partenaire',done,freeUsed:monthlyPasses.filter(p=>p.free_pass).length,
   penalizedPasses:monthlyPasses.filter(p=>!p.free_pass).length,denominator,
   unpicked:undrawn,percent:success};
 });
 return byUser;
}
