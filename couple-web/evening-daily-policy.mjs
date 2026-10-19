// UI mirror of the server's shared 1-soirée-per-Québec-day policy.
const localDay=(date)=>{
 const instant=date instanceof Date?date:new Date(date);
 if(!Number.isFinite(instant.getTime()))return null;
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
 const val=t=>p.find(x=>x.type===t)?.value;
 return val('year')+'-'+val('month')+'-'+val('day');
};
export function eveningDailyAccess({sessions=[],weekly=null,now=new Date()}={}){
 const today=localDay(now),limit=weekly?Number(weekly.face)||0:0;
 const weekStart=weekly?.key||null,weeklyCreated=Date.parse(weekly?.created_at||'');
 const weekSessions=weekStart?(sessions||[]).filter(s=>
  localDay(s.started_at)>=weekStart):[];
 // Preserve old history but never consume a new weekly die with old sessions.
 // A reset creates a new weekly roll, used as the effective quota boundary.
 const current=weekSessions.filter(s=>!Number.isFinite(weeklyCreated)||
  Date.parse(s.started_at)>=weeklyCreated);
 const counted=current.filter(s=>s.counted===true).length;
 const dailyLocked=current.some(s=>localDay(s.started_at)===today||
  (s.finished_at&&localDay(s.finished_at)===today));
 const closedToday=current.filter(s=>s.counted===true&&s.finished_at&&
  localDay(s.finished_at)===today).sort((a,b)=>Date.parse(b.finished_at)-Date.parse(a.finished_at))[0]||null;
 const active=current.some(s=>!s.finished_at);
 return {today,counted,limit,dailyLocked,closedToday,
  canStart:limit>0&&counted<limit&&!dailyLocked&&!active};
}
