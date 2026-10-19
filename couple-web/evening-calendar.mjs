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
const statusLabel=s=>({
 completed:'✓ Réalisé',accepted:'◷ Commencé, non réalisé',
 proposed:'○ À faire, non réalisé',passed:'↷ Passé, non réalisé'
})[s]||'○ Non réalisé';
const monthLabel=mo=>new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric',timeZone:'UTC'})
 .format(new Date(mo+'-15T12:00:00Z'));
export function eveningHistoryMarkup({sessions=[],members=[],stats=[],historyChallenges=[],reviews=[],me,month,selectedDate,
 weeklyRolls=[],passQuota=[],backAction='tab:session',backLabel='Retour à Soirée'}={}){
 const current=isoMonth(month)||'2026-10';
 const [year,m]=current.split('-').map(Number);
 const validDate=selectedDate&&/^\d{4}-\d\d-\d\d$/.test(selectedDate)?selectedDate:current+'-01';
 const firstDay=new Date(Date.UTC(year,m-1,1)).getUTCDay(),padding=(firstDay+6)%7;
 const days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const archives=(sessions||[]).filter(s=>!!s.started_at).map(s=>({...s,localDay:eveningLocalDay(s.started_at)}));
 const forDay=archives.filter(s=>s.localDay===validDate).sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at));
 const history=archives.filter(s=>s.finished_at).length;
 const done=stats.filter(r=>archives.some(s=>s.id===r.session_id&&!!s.finished_at))
  .reduce((n,r)=>n+Number(r.completed||0),0);
 const incomplete=stats.filter(r=>archives.some(s=>s.id===r.session_id&&!!s.finished_at))
  .reduce((n,r)=>n+Math.max(0,Number(r.target==null?r.incomplete:(r.target-r.completed))||0),0);
 const weekResult=calendarWeekSuccess({date:validDate,weeklyRolls,sessions});
 const monthlyResults=monthlyChallengeSuccess({
  month:current,members,sessions,historyChallenges,sessionStats:stats,passQuota
 });
 const freeByChallenge=new Set((passQuota||[]).filter(p=>p.free_pass).map(p=>p.challenge_id));
 const chargedByChallenge=new Set((passQuota||[]).filter(p=>!p.free_pass).map(p=>p.challenge_id));
 const extraStats='<div class="evening-cal-stats evening-cal-extra" aria-label="Taux de réussite et passes mensuelles">'+
  '<span><strong>'+(weekResult.hasRoll?weekResult.percent+' %':'—')+'</strong>'+
   (weekResult.hasRoll?weekResult.completed+' / '+weekResult.possible+' soirées possibles':'Aucun dé cette semaine')+'</span>'+
  monthlyResults.slice(0,2).map(item=>'<span><strong>'+(item.percent===null?'—':item.percent+' %')+'</strong>'+
   safe(item.name)+' · défis réalisés'+
   '<small>Passes gratuites : '+item.freeUsed+'/3'+
   (item.penalizedPasses?' · pénalisées : '+item.penalizedPasses:'')+'</small></span>').join('')+
  '</div>';
 const byDay=new Map();
 for(const row of archives){byDay.set(row.localDay,(byDay.get(row.localDay)||0)+1);}
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
   const countDone=Number(row?.completed)||0;
   const countOutstanding=row?.target==null
    ?Number(row?.incomplete)||0
    :Math.max(0,Number(row.target)-countDone);
   const name=String(m.name||'Partenaire').trim();
   const role=m.user_id===me?' (moi)':' (partenaire)';
   const statusSummary=row
    ?'<span><b>'+countDone+'</b> réalisé'+(countDone>1?'s':'')+
     ' · <b>'+countOutstanding+'</b> non réalisé'+(countOutstanding>1?'s':'')+'</span>'
    :'<span>Bilan indisponible</span>';
   const picked=cards.map(c=>{
    const card=resolvedCard(c);
    return '<li class="evening-cal-challenge '+(c.status==='completed'?'is-done':'is-open')+'">'+
      '<span>'+safe(c.status==='passed'?
       (freeByChallenge.has(c.id)?'↷ Passé sans pénalité':
        chargedByChallenge.has(c.id)?'↷ Passé, comptabilisé':statusLabel(c.status)):
       statusLabel(c.status))+'</span><strong>'+safe(card.title)+'</strong>'+
      '<small>'+safe(c.category==='SEXUEL'?'Sexuel':'Sensuel')+'</small></li>';
   }).join('');
   const unpicked=row?.target==null?0:Math.max(0,Number(row.target)-Number(row.drawn||cards.length));
   const extras=unpicked?'<p class="evening-cal-unpicked">♡ '+unpicked+
      ' défi'+(unpicked>1?'s':'')+' non pigé'+(unpicked>1?'s':'')+
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
   '<p>Toutes les soirées, avec les défis réalisés et non réalisés.</p></div>'+
  '<div class="evening-cal-stats"><span><strong>'+history+'</strong> soirées clôturées</span>'+
   '<span><strong>'+done+'</strong> défis réalisés</span>'+
   '<span><strong>'+incomplete+'</strong> non réalisés</span></div>'+
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
