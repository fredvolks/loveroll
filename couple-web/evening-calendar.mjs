// LoveRoll evening archive. Challenge titles and outcomes are shared ONLY
// through the member-checked calendar RPC; the live game's RLS stays personal.
import {resolvedCard} from './evening-challenges.mjs';
import {eveningPersonReviewMarkup} from './evening-review.mjs';
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
import {calendarWeekSuccess,monthlyChallengeSuccess} from './calendar-success-stats.mjs?v=20261018-stats148';
const safe=x=>String(x??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[k]));
const isoMonth=v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v||'')?v:null;
export function eveningLocalDay(iso){
 if(!iso||!Number.isFinite(Date.parse(iso)))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
 const get=t=>parts.find(p=>p.type===t)?.value;
 return get('year')+'-'+get('month')+'-'+get('day');
}
// Unfinished cards are not failures until their evening is closed.
export function eveningChallengeStatusLabel(status,closed=false){
 if(status==='completed')return '✓ Réalisé';
 if(status==='passed')return closed?'↷ Passé, non réalisé':'↷ Passé';
 if(status==='refused')return closed?'◇ Refusé, non réalisé':'◇ Refusé';
 if(status==='accepted')return closed?'◷ Non réalisé après début':'◷ En cours';
 if(status==='proposed')return closed?'○ Non réalisé (non commencé)':'○ À faire';
 return closed?'○ Non réalisé':'○ À confirmer';
}
const monthLabel=mo=>new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric',timeZone:'UTC'})
 .format(new Date(mo+'-15T12:00:00Z'));
/** Choose a real Québec date before rendering the shared calendar.
 * Skip incomplete legacy rows and never read started_at from a null record.
 * This does not disclose anything outside the member-checked server history.
 */
export function eveningCalendarInitialDate({sessions=[],month,selectedDate,now=new Date()}={}){
 const currentDay=eveningLocalDay(now),currentMonth=currentDay?.slice(0,7);
 const targetMonth=isoMonth(month)||currentMonth;
 if(!targetMonth)return null;
 const validInMonth=date=>{
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
     !date.startsWith(targetMonth+'-'))return false;
  const [year,monthNum,day]=date.split('-').map(Number);
  return day>=1&&day<=new Date(Date.UTC(year,monthNum,0)).getUTCDate();
 };
 if(validInMonth(selectedDate))return selectedDate;
 const saved=Array.isArray(sessions)?sessions:[];
 const archiveDate=saved.map(row=>
  row&&typeof row.started_at==='string'?eveningLocalDay(row.started_at):null)
  .filter(validInMonth).sort().at(-1);
 return archiveDate||(targetMonth===currentMonth?currentDay:targetMonth+'-01');
}

export function eveningHistoryMarkup({
 sessions:rawSessions=[],members:rawMembers=[],stats:rawStats=[],
 historyChallenges:rawChallenges=[],reviews:rawReviews=[],me,month,selectedDate,
 weeklyRolls:rawWeeklyRolls=[],passQuota:rawPassQuota=[],
 backAction='tab:session',backLabel='Retour à Soirée'}={}){
 // Legacy or partially loaded RPC arrays can be null or include null rows.
 // Keep the calendar navigable without inventing completed challenges.
 const rows=value=>Array.isArray(value)?value.filter(row=>
  row!==null&&typeof row==='object'&&!Array.isArray(row)):[]; 
 // Legacy rows must not leak NaN/Infinity/negative counts into the calendar.
 // Accept nonnegative integer strings returned by older SQL views.
 const count=value=>{
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=0?n:0;
 };
 const sessions=rows(rawSessions),members=rows(rawMembers).filter(m=>!!m.user_id);
 const stats=rows(rawStats),historyChallenges=rows(rawChallenges);
 const reviews=rows(rawReviews),weeklyRolls=rows(rawWeeklyRolls),passQuota=rows(rawPassQuota);
 // The calendar's fallback month follows the couple's Toronto timezone.
 // Previously it was frozen to October 2026, including in future years.
 const current=isoMonth(month)||eveningLocalDay(new Date().toISOString()).slice(0,7);
 const [year,m]=current.split('-').map(Number);
 // A stale selection from a different month (or an impossible local date)
 // must never leave the calendar showing one month and another day's history.
 const candidate=selectedDate&&/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)?selectedDate:null;
 const [cy,cm,cd]=(candidate||'').split('-').map(Number);
 const validDate=candidate&&candidate.startsWith(current+'-')&&
  cd>=1&&cd<=new Date(Date.UTC(cy,cm,0)).getUTCDate()?candidate:current+'-01';
 const firstDay=new Date(Date.UTC(year,m-1,1)).getUTCDay(),padding=(firstDay+6)%7;
 const days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const archives=sessions.filter(s=>typeof s.started_at==='string'&&!!s.started_at)
  .map(s=>({...s,localDay:eveningLocalDay(s.started_at)}))
  .filter(s=>s.localDay!==null);
 // The displayed totals must describe the selected Toronto calendar month.
 // Previously they summed EVERY archived year/month while the grid showed one.
 // Only CLOSED evenings count as final non-completions; never penalize open cards.
 const monthSessions=archives.filter(s=>s.localDay?.startsWith(current+'-'));
 const forDay=monthSessions.filter(s=>s.localDay===validDate).sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at));
 const closedMonthIds=new Set(monthSessions.filter(s=>s.finished_at).map(s=>s.id));
 const history=closedMonthIds.size;
 const done=stats.filter(r=>closedMonthIds.has(r.session_id))
  .reduce((n,r)=>n+count(r.completed),0);
 const incomplete=stats.filter(r=>closedMonthIds.has(r.session_id))
  .reduce((n,r)=>n+(r.target==null?count(r.incomplete):
   Math.max(0,count(r.target)-count(r.completed))),0);
 const weekResult=calendarWeekSuccess({date:validDate,weeklyRolls,sessions});
 const monthlyResults=monthlyChallengeSuccess({
  month:current,members,sessions,historyChallenges,sessionStats:stats,passQuota
 });
 const freeByChallenge=new Set((passQuota||[]).filter(p=>p.free_pass).map(p=>p.challenge_id));
 const chargedByChallenge=new Set((passQuota||[]).filter(p=>!p.free_pass).map(p=>p.challenge_id));
 const extraStats='<div class="evening-cal-stats evening-cal-extra" aria-label="Taux de réussite et passes mensuelles">'+
  '<span><strong>'+(weekResult.percent!==null?weekResult.percent+' %':'—')+'</strong>'+
   (weekResult.hasRoll?weekResult.completed+' / '+weekResult.possible+' soirées possibles':'Aucun dé cette semaine')+'</span>'+
  monthlyResults.slice(0,2).map(item=>'<span><strong>'+(item.percent===null?'—':item.percent+' %')+'</strong>'+
   safe(item.name)+' · défis réalisés'+
   '<small>Passes gratuites : '+item.freeUsed+'/3'+
   (item.penalizedPasses?' · pénalisées : '+item.penalizedPasses:'')+'</small></span>').join('')+
  '</div>';
 const byDay=new Map();
 for(const row of monthSessions){byDay.set(row.localDay,(byDay.get(row.localDay)||0)+1);}
 let cells=Array.from({length:padding},()=>'<span class="evening-cal-blank"></span>').join('');
 for(let d=1;d<=days;d++){
  const date=current+'-'+String(d).padStart(2,'0'),has=byDay.has(date);
  cells+='<button type="button" class="evening-cal-day'+(has?' has-evening':'')+
   (date===validDate?' selected':'')+'" data-action="evening-date:'+date+
   '" aria-label="'+safe(date)+(has?' : '+byDay.get(date)+' soirée(s)':' : aucune soirée')+
   '" aria-pressed="'+(date===validDate)+'"><span>'+d+'</span>'+
   (has?'<span class="evening-cal-dot" aria-hidden="true">♥</span>':'')+'</button>';
 }
 const content=forDay.length?forDay.map((s,i)=>{
  const rolls=stats.filter(r=>r.session_id===s.id);
  const personSections=members.map(m=>{
   const row=rolls.find(item=>item.user_id===m.user_id);
   const cards=historyChallenges.filter(c=>c.session_id===s.id&&c.recipient===m.user_id)
    .sort((a,b)=>Date.parse(a.created_at||'')-Date.parse(b.created_at||''));
   const countDone=count(row?.completed);
   const countOutstanding=row?.target==null
    ?count(row?.incomplete)
    :Math.max(0,count(row.target)-countDone);
   const closed=!!s.finished_at;
   const name=String(m.name||'Partenaire').trim();
   const role=m.user_id===me?' (moi)':' (partenaire)';
   const statusSummary=row
    ?'<span><b>'+countDone+'</b> réalisé'+(countDone>1?'s':'')+
     ' · <b>'+countOutstanding+'</b> '+(closed?'non réalisé':'à faire')+
     (closed&&countOutstanding>1?'s':'')+'</span>'
    :'<span>Bilan indisponible</span>';
   const picked=cards.map(c=>{
    const card=resolvedCard(c);
    return '<li class="evening-cal-challenge '+(c.status==='completed'?'is-done':'is-open')+'">'+
      '<span>'+safe(c.status==='passed'?
       (freeByChallenge.has(c.id)?'↷ Passé sans pénalité':
        chargedByChallenge.has(c.id)?'↷ Passé, comptabilisé':eveningChallengeStatusLabel(c.status,closed)):
       eveningChallengeStatusLabel(c.status,closed))+'</span><strong>'+safe(card.title)+'</strong>'+
      '<small>'+safe(c.category==='SEXUEL'?'Sexuel':'Sensuel')+'</small></li>';
   }).join('');
   const unpicked=row?.target==null?0:Math.max(0,count(row.target)-
    count(row.drawn??cards.length));
   const extras=unpicked?'<p class="evening-cal-unpicked">♡ '+unpicked+
      ' défi'+(unpicked>1?'s':'')+(closed?' non pigé':' à piger')+(closed&&unpicked>1?'s':'')+
      ' : aucune carte attribuée.</p>':'';
   return '<details class="evening-cal-person-group" data-person-id="'+safe(m.user_id)+
      '" data-session-id="'+safe(s.id)+'">'+
     '<summary class="evening-cal-person">'+
      '<strong>'+safe(name+role)+'</strong>'+statusSummary+
      '<span class="evening-cal-arrow" aria-hidden="true">⌄</span></summary>'+
     '<div class="evening-cal-person-content">'+
      (cards.length?'<ul>'+picked+'</ul>':
       '<p class="evening-cal-empty">Aucun défi pigé pour cette personne.</p>')+
      extras+(s.finished_at&&s.counted?eveningPersonReviewMarkup({reviews,sessionId:s.id,person:m,me}):'')+'</div></details>';
  }).join('');
  return '<article class="evening-cal-session"><header><strong>♡ Soirée '+(forDay.length>1?(i+1):'')+
   '</strong><span>'+(s.finished_at?'Clôturée':'En cours')+'</span></header>'+
   '<div class="evening-cal-people">'+personSections+'</div>'+
   '</article>';
 }).join(''):'<p class="evening-cal-empty">Aucune soirée enregistrée pour cette journée.</p>';
 return '<div class="evening-calendar-shell">'+
  '<div class="evening-cal-head">'+ritualHeadingHtml('NOS SOIRÉES À DEUX')+'<h2>Notre calendrier</h2>'+
   '<p>En cours : défis à faire. Clôturées : bilan définitif.</p></div>'+
  '<div class="evening-cal-stats"><span><strong>'+history+'</strong> soirées clôturées ce mois</span>'+
   '<span><strong>'+done+'</strong> défis réalisés ce mois</span>'+
   '<span><strong>'+incomplete+'</strong> non réalisés ce mois</span></div>'+
  extraStats+
  '<section class="evening-cal-month"><div class="evening-cal-toolbar">'+
   '<button data-action="evening-month-prev" aria-label="Mois précédent">‹</button>'+
   '<h3>'+safe(monthLabel(current))+'</h3>'+
   '<button data-action="evening-month-next" aria-label="Mois suivant">›</button></div>'+
   '<div class="evening-cal-grid">'+['L','M','M','J','V','S','D'].map((v,i)=>
    '<span class="evening-cal-weekday" aria-label="'+['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i]+'">'+v+'</span>').join('')+
    cells+'</div></section>'+
  '<section class="evening-cal-history"><h3>'+safe(validDate)+' · Historique</h3>'+content+'</section>'+
  '<button type="button" class="evening-cal-return" data-action="'+safe(backAction)+'">← '+safe(backLabel)+'</button>'+
 '</div>';
}
