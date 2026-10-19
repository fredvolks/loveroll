// Real shared-couple Home UI. Official faces and per-couple odds come from Supabase.
// Preserve the approved HTML/CSS; change only the six visible odds numbers.
import {WEEKLY_DEFAULT_WEIGHTS,effectiveDicePercentages,displayedDicePercent} from './dice-weighting.mjs?v=20261018-weights146';
export const WEEKLY_ODDS=WEEKLY_DEFAULT_WEIGHTS;
export const PIP_POSITIONS=Object.freeze({
  1:[[50,50]],2:[[29,29],[71,71]],3:[[29,29],[50,50],[71,71]],
  4:[[29,29],[71,29],[29,71],[71,71]],
  5:[[29,29],[71,29],[50,50],[29,71],[71,71]],
  6:[[29,22],[71,22],[29,50],[71,50],[29,78],[71,78]]
});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
let homeLayoutObserver=null;
// Keep complete names and all seven rows visible in the two-column dashboard.
// Only the lower panels compact when needed; the header and die keep their size.
export function fitHomeLayout(root){
 homeLayoutObserver?.disconnect();homeLayoutObserver=null;
 const shell=root.querySelector('.real-home-shell'),stack=shell?.querySelector('.home-bottom-stack');
 if(!stack)return;
 const win=root.ownerDocument.defaultView;
 let observer;
 const fit=()=>{
  if(!shell.isConnected){observer?.disconnect();return;}
  shell.style.removeProperty('--home-details-scale');shell.classList.remove('home-fit-compact');
  const fits=()=>{
   const nav=root.querySelector('.nav'),limit=Math.min(shell.getBoundingClientRect().bottom,nav?nav.getBoundingClientRect().top-6:Infinity);
   return [stack,...stack.querySelectorAll('.home-panel,.home-next-month,h3,strong,small')]
    .every(el=>el.getBoundingClientRect().bottom<=limit+.1);
  };
  if(fits())return;
  shell.classList.add('home-fit-compact');
  let low=.75,high=1;
  for(let i=0;i<8;i++){
   const scale=(low+high)/2;shell.style.setProperty('--home-details-scale',String(scale));
   if(fits())low=scale;else high=scale;
  }
  shell.style.setProperty('--home-details-scale',String(low));
 };
 if(win.ResizeObserver){observer=new win.ResizeObserver(fit);observer.observe(root);homeLayoutObserver=observer;}
 fit();win.document.fonts?.ready.then(fit);
}
export function pipFace(n){
  if(!Number.isInteger(n)||n<1||n>6)throw new Error('Face de dé inconnue');
  return '<svg class="home-pip-svg" viewBox="0 0 100 100" role="img" aria-label="Dé face '+n+'">'+
    '<rect x="3" y="3" width="94" height="94" rx="18" fill="#ffecf4" stroke="#f7a5c5" stroke-width="4"/>'+
    PIP_POSITIONS[n].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="10.6" fill="#271527"/>').join('')+'</svg>';
}
const inToronto=date=>new Intl.DateTimeFormat('en-CA',{
 timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'
}).format(date);
export function nextMonday(now=new Date()){
 const current=inToronto(now);
 const anchor=new Date(current+'T12:00:00Z'),day=(anchor.getUTCDay()+6)%7;
 anchor.setUTCDate(anchor.getUTCDate()+7-day);
 return anchor.toISOString().slice(0,10);
}
export function nextMonthly(now=new Date()){
 const day=inToronto(now),[y,m]=day.slice(0,7).split('-').map(Number);
 const first=new Date(Date.UTC(y,m,1));
 const diff=Math.max(0,Math.round((first-new Date(day+'T00:00:00Z'))/86400000));
 return {
   date:first.toISOString().slice(0,10),
   days:diff,
   label:new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(first)
 };
}
// Drawn cards are NOT assigned challenges. Use the official dice/gift turn budget;
// never reveal individual rolls on Home before both official dice are available.
export function assignedTonight(turn={},members=[]){
 const ready=turn?.ready===true;
 const [first,second]=members||[];
 const value=(field,person)=>ready?Math.max(0,Number(turn[field]?.[person?.user_id])||0):null;
 const forFirst=value('targets',first),forSecond=value('targets',second);
 const completedFirst=value('completed',first),completedSecond=value('completed',second);
 const remainingFirst=value('remaining',first),remainingSecond=value('remaining',second);
 return {ready,total:ready?forFirst+forSecond:null,forFirst,forSecond,
  completed:ready?completedFirst+completedSecond:null,
  remaining:ready?remainingFirst+remainingSecond:null,
  completedFirst,completedSecond,remainingFirst,remainingSecond};
}


function monthKeyToronto(date){
 const d=new Date(date);
 return Number.isFinite(d.getTime())?inToronto(d).slice(0,7):null;
}
function torontoWeekIndex(date){
 const key=inToronto(new Date(date));
 const noon=new Date(key+'T12:00:00Z');
 const day=(noon.getUTCDay()+6)%7;
 return Math.floor((noon.getTime()-day*86400000)/604800000);
}
// Computed exclusively from completed couple_challenges and counted couple_sessions.
// Never infer completions from "proposed", "accepted" or a mockup value.
export function coupleHomeStats(challenges=[],sessions=[],members=[],now=new Date()){
 const month=inToronto(now).slice(0,7);
 const byId=new Map((sessions||[]).map(s=>[s.id,s]));
 const completed=(challenges||[]).filter(c=>c?.status==='completed');
 const monthDone=completed.filter(c=>{
  const session=byId.get(c.session_id);
  return monthKeyToronto(session?.finished_at||c.created_at)===month;
 });
 const counts=(members||[]).map(m=>monthDone.filter(c=>c.recipient===m.user_id).length);
 const sensual=monthDone.filter(c=>String(c.category||'').toUpperCase()==='SENSUEL').length;
 const sexual=monthDone.filter(c=>['SEXUEL','COQUIN'].includes(String(c.category||'').toUpperCase())).length;
 const categorized=sensual+sexual;
 const activeWeeks=new Set((sessions||[]).filter(s=>s.counted&&s.finished_at)
  .map(s=>torontoWeekIndex(s.finished_at)));
 let current=torontoWeekIndex(now);
 if(!activeWeeks.has(current))current--;
 let streak=0;
 while(activeWeeks.has(current)){streak++;current--;}
 return {
  completed:monthDone.length,byPartner:counts,
  sensualPercent:categorized?Math.round(sensual*100/categorized):null,
  sexualPercent:categorized?100-Math.round(sensual*100/categorized):null,
  streak,
 };
}

const iconSvg=(kind)=>{
 const paths={
  games:'<g transform="translate(7 6) rotate(-12 15 17)"><rect x="2" y="6" width="31" height="31" rx="7" fill="#240919" stroke="#ff82bd" stroke-width="2.4"/><circle cx="11" cy="15" r="3" fill="#ff60ac"/><circle cx="25" cy="28" r="3" fill="#ff60ac"/></g><g transform="translate(10 8) rotate(13 30 29)"><rect x="18" y="18" width="30" height="30" rx="7" fill="#110712" stroke="#ff8dbc" stroke-width="2.4"/><path d="M33 27c-5-7-13 0 0 11 13-11 5-18 0-11z" fill="#ff5ba3"/></g>',
  challenges:'<path d="M27 48C7 32 3 22 9 14c7-9 18-5 21 1 7-12 25-8 25 5 0 12-13 22-25 32z" fill="#f52b8444" stroke="#ff78bc" stroke-width="3.5"/><path d="M17 14Q24 9 29 21" stroke="#ffdaee" stroke-width="2.3" fill="none"/>',
  dates:'<rect x="9" y="11" width="44" height="43" rx="6" fill="#26091c" stroke="#ff78bc" stroke-width="3"/><path d="M10 23H52M21 5V17M41 5V17" stroke="#ff7dba" stroke-width="4" stroke-linecap="round"/><path d="M31 37c-6-9-15 0 0 11 15-11 6-20 0-11z" fill="#ff5f9e"/>',
  surprises:'<rect x="9" y="27" width="45" height="27" rx="4" fill="#28071a" stroke="#ff82bb" stroke-width="3"/><rect x="6" y="20" width="50" height="11" rx="3" fill="#5a1139" stroke="#ff89c1" stroke-width="3"/><path d="M32 20V54" stroke="#ff459d" stroke-width="8"/><path d="M31 20c-18-2-19-20-8-17 7 1 8 11 8 17zm2 0c18-2 19-20 8-17-7 1-8 11-8 17z" fill="#fa58a4" stroke="#ffa8d4" stroke-width="2"/>'
 };
 return '<svg viewBox="0 0 62 62" aria-hidden="true" focusable="false">'+paths[kind]+'</svg>';
};

export {ritualBrandHtml} from './brand.mjs?v=20261017-ritual130';
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
export function premiumHomeHtml({weekly=null,rolling=false,disabled=false,members=[],
  turn=null,monthly={},history=[],sessions=[],events=[],rollFace=1,now=new Date(),
  weeklyWeights=WEEKLY_ODDS,weeklyWeightsEnabled=true}={}){
 const weights=effectiveDicePercentages(weeklyWeights,weeklyWeightsEnabled,WEEKLY_ODDS).map((pct,i)=>
  '<span class="home-weight" title="'+(i+1)+' soirée'+(i===0?'':'s')+' : '+displayedDicePercent(pct)+' %">'+pipFace(i+1)+
  '<b>'+(i+1)+'x</b><span>'+displayedDicePercent(pct)+'%</span></span>').join('');
 const stats=assignedTonight(turn,members),m=nextMonthly(now);
 const activity=monthly?.monthly_activity||null;
 const shown=value=>value===null?'—':String(value);
 const ready=!rolling&&weekly&&Number.isInteger(weekly.face),next=nextMonday(now);
 const coupleStats=coupleHomeStats(history,sessions,members,now);
 const memberA=escape(members[0]?.name||'Partenaire 1');
 const memberB=escape(members[1]?.name||'Partenaire 2');
 const weeklyTitle=ready?weekly.face+' soirée'+(weekly.face===1?'':'s')+' de défi':'Cette semaine, on joue ?';
 const statistic=(value,label,subtitle,cls='')=>
  '<div class="home-stat-card '+cls+'"><div class="home-stat-content"><i aria-hidden="true">'+({completed:'★',partners:'♧',categories:'♡',streak:'▥'}[cls]||'')+'</i><strong>'+escape(value)+'</strong>'+
  '<span>'+escape(label)+'</span><small>'+escape(subtitle)+'</small></div></div>';
 const summary=(icon,value,label)=>'<div><div class="home-summary-content">'+
  '<div class="home-summary-value"><span aria-hidden="true">'+icon+'</span><strong>'+shown(value)+'</strong></div>'+
  '<small>'+label+'</small></div></div>';
 const displayNames=[0,1].map(i=>String(members[i]?.name||'Partenaire '+(i+1)).trim());
 const shortNames=displayNames.map(n=>n.split(/\s+/)[0]);
 const [nameA,nameB]=shortNames[0]===shortNames[1]?displayNames:shortNames;
 const percent=coupleStats.sensualPercent==null?'—':
  coupleStats.sensualPercent+' / '+coupleStats.sexualPercent+' %';
 const pending=rolling||disabled;
 return '<section class="real-home-shell" aria-label="Tableau de bord du couple">'+
   '<div class="home-ritual">'+ritualHeadingHtml('NOTRE RITUEL DE LA SEMAINE')+
   '<div class="home-title"><h2 class="ritual-page-title">'+escape(weeklyTitle)+'</h2></div></div>'+
   '<div class="home-die-theater" aria-label="Dé à six faces en trois dimensions">'+
   '<div class="home-fabric-photo" aria-hidden="true"></div>'+
   '<div class="home-satin-orbit" aria-hidden="true"></div>'+
   '<div class="home-die-platform"><strong class="dice-fallback" '+(rolling?'aria-hidden="true"':'')+'>'+
   (ready?pipFace(weekly.face):'—')+'</strong>'+
   '<canvas class="dice-canvas" width="300" height="300" data-dice-sides="6" '+
   'data-face="'+(rolling?rollFace:ready?weekly.face:1)+'" data-spinning="'+(rolling?'true':'false')+'" '+
   'data-dice-markers="pips" '+(!ready&&!rolling?'data-dice-preview="true" ':'')+
   'aria-label="Dé 3D, '+(rolling?'en cours de brassage':ready?'face '+weekly.face:'en attente du tirage')+'"></canvas></div></div>'+
   '<div class="home-weights" aria-label="Pondération des six faces du dé">'+weights+'</div>'+
   '<div class="home-roll-area">'+
   (ready?
    '<button class="home-roll-button is-used" type="button" disabled>Déjà brassé cette semaine, revenez la semaine prochaine</button>':
    '<button class="home-roll-button" type="button" data-action="roll:weekly" '+(pending?'disabled':'')+'>'+
    (rolling?'Brassage 3D en cours…':disabled?'Préparation du brassage…':'🎲 BRASSER LE DÉ')+'</button>')+
   '</div>'+
   '<div class="home-bottom-stack">'+
   '<button class="home-next-month" data-action="tab:special" type="button">'+
   '<span class="home-calendar-icon home-present" aria-hidden="true">'+iconSvg('surprises')+'</span>'+ 
   '<span><small>'+(activity?'Surprise du mois tirée':'Surprise du mois disponible')+'</small>'+
   '<strong>'+(activity?'Voir notre résultat':'Brasser notre surprise')+'</strong>'+
   '<em>'+(activity?'Prochaine surprise : '+escape(m.label):'Un tirage commun ce mois-ci')+'</em></span>'+
   '<span class="home-gift-icon" aria-hidden="true">›</span></button>'+ 
   '<div class="home-dashboard">'+
   '<section class="home-panel home-tonight-panel" aria-labelledby="home-tonight-title">'+
   '<h3 id="home-tonight-title"><span aria-hidden="true">♢</span>Ce soir</h3><div class="home-challenge-stats">'+
   summary('♢',stats.total,'Défis attribués<br>ce soir')+
   summary('♡',stats.forFirst,'Attribués à<br>'+memberA+'<br>Restants : '+shown(stats.remainingFirst))+
   summary('♡',stats.forSecond,'Attribués à<br>'+memberB+'<br>Restants : '+shown(stats.remainingSecond))+'</div></section>'+
   '<section class="home-panel home-monthly-panel" aria-labelledby="home-statistics-title">'+
   '<h3 id="home-statistics-title"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1 11h3v8H1zm5-7h3v15H6zm5 3h3v12h-3zm5-6h3v18h-3z"/></svg>Nos statistiques</h3>'+
   '<div class="home-stats-grid" aria-label="Statistiques réelles du couple">'+
   statistic(String(coupleStats.completed),'Défis réalisés','Ce mois · Couple','completed')+
   statistic(coupleStats.byPartner.join(' / '),'Répartition',nameA+' / '+nameB,'partners')+
   statistic(percent,'Sensuel / Sexuel','Ce mois','categories')+
   statistic(String(coupleStats.streak),'Semaines actives','Série actuelle','streak')+
   '</div></section></div></div></section>';
}
