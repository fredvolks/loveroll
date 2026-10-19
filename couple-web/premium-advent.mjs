// Shared Advent letters. Only recorded server openings may reveal their contents.
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
export const ADVENT_ZONE='America/Toronto';
export const torontoDay=(when=new Date())=>new Intl.DateTimeFormat('en-CA',{
 timeZone:ADVENT_ZONE,year:'numeric',month:'2-digit',day:'2-digit'
}).format(when);
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function sharedAdventState(openings=[],when=new Date(),year=null){
 const date=torontoDay(when),[currentYear,month,day]=date.split('-').map(Number);
 // Before the next December, the previous calendar remains available for catch-up.
 const shown=Number.isInteger(year)?year:Math.max(2026,month<12?currentYear-1:currentYear);
 const opened=new Map((openings||[]).filter(x=>x.year===shown&&x.day>=1&&x.day<=25).map(x=>[x.day,x]));
 const days=Array.from({length:25},(_,i)=>{
  const d=i+1,entry=opened.get(d)||null,availableOn=shown+'-12-'+String(d).padStart(2,'0');
  const today=availableOn===date,canOpen=availableOn<=date&&!entry;
  return {day:d,date:availableOn,opened:!!entry,entry,today,canOpen,
   status:entry?'opened':today?'available':canOpen?'overdue':'locked'};
 });
 const note=days.some(x=>x.canOpen)?'Les lettres des jours passés restent à découvrir.':
  days.every(x=>x.opened)?'Vos vingt-cinq lettres restent à relire.':'Première lettre le 1er décembre '+shown+'.';
 return {year:shown,currentYear,month,day,date,days,note,
  totalOpened:days.filter(d=>d.opened).length,canReturnCurrent:shown!==currentYear};
}
const heart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20C9 17 3 13 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-6 9-9 12Z"/></svg>';
const lock='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3"/></svg>';
const button=(action,label,classes='',disabled=false)=>'<button type="button" class="'+classes+'" data-action="'+escape(action)+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
export function adventPremiumHtml({openings=[],members=[],when=new Date(),year=null,
 selectedDay=null,openingDay=null,revealing=false,dateTrusted=true,showHistory=false,timerHtml=''}={}){
 const cal=sharedAdventState(openings,when,year),opened=cal.days.find(x=>x.day===selectedDay)?.entry;
 const busy=openingDay!==null,today=cal.days.find(x=>x.today);
 const who=id=>members.find(m=>m.user_id===id)?.name||'Votre partenaire';
 const grid=cal.days.map(d=>{
  const canOpen=d.canOpen&&dateTrusted,disabled=busy||(!d.opened&&!canOpen);
  const act=d.opened?'advent-view:'+d.day:canOpen?'advent-open:'+d.day:'advent-locked:'+d.day;
  const state=d.opened?'✓ Ouverte':d.today?'Aujourd’hui':d.status==='overdue'?'À découvrir':'À venir';
  const label=d.opened?'Revoir la lettre':canOpen?'Ouvrir la lettre':'Lettre verrouillée';
  return '<button class="advent-box '+d.status+(openingDay===d.day?(revealing?' opening':' opening-pending'):'')+
   '" type="button" data-day="'+d.day+'" data-date="'+d.date+'" data-action="'+act+'" aria-label="'+
   escape(label+' du '+d.day+' décembre '+cal.year+' · '+state)+'"'+(disabled?' disabled aria-disabled="true"':'')+
   (openingDay===d.day?' aria-busy="true"':'')+'>'+
   '<span class="advent-envelope" aria-hidden="true"><span class="advent-letter-paper">♡</span>'+
   '<span class="advent-envelope-front"></span><span class="advent-envelope-flap"></span>'+
   '<svg class="advent-fold" viewBox="0 0 100 70" preserveAspectRatio="none"><path d="M0 0 50 40 100 0M0 70 35 40M100 70 65 40"/></svg>'+
   '<span class="advent-seal">'+(d.status==='locked'?lock:d.opened?'✓':heart)+'</span>'+
   '<b class="advent-box-number">'+d.day+'</b></span>'+
   '<span class="advent-state-label">'+state+'</span></button>';
 }).join('');
 const historyYears=[...new Set([2026,cal.currentYear,cal.year,...openings.map(x=>x.year)])]
  .filter(y=>Number.isInteger(y)&&y>=2026).sort((a,b)=>b-a);
 const primaryAction=today&&dateTrusted?(today.opened?'advent-view:':'advent-open:')+today.day:'';
 const primaryLabel=busy?(revealing?'Votre lettre se dévoile…':'Ouverture en cours…'):
  !dateTrusted?'Connexion au calendrier…':today?(today.opened?'Relire notre surprise du jour':'Ouvrir notre surprise du jour'):
  cal.days.every(d=>d.opened)?'Nos vingt-cinq lettres sont ouvertes':cal.days.some(d=>d.canOpen)?'Nos lettres restent à découvrir':'Rendez-vous le 1er décembre';
 const status=today?today.day+' décembre · '+(today.opened?'Notre lettre est ouverte':'À découvrir aujourd’hui'):
  cal.days.some(d=>d.canOpen)?'Choisissez une enveloppe à découvrir.':cal.note;
 const openedAt=opened&&Date.parse(opened.opened_at);
 const timestamp=Number.isFinite(openedAt)?new Intl.DateTimeFormat('fr-CA',{
  timeZone:ADVENT_ZONE,dateStyle:'medium',timeStyle:'short'
 }).format(new Date(openedAt)):null;
 return '<section class="advent-premium-view advent-letters" aria-label="Les lettres de décembre">'+
  '<header class="advent-top">'+ritualHeadingHtml('NOTRE RITUEL DE L’AVENT')+'</header>'+
  '<div class="advent-intro"><h1 class="ritual-page-title">Les mots doux de décembre.</h1></div>'+
  '<div class="advent-month-row"><span>Décembre '+cal.year+'</span><strong>'+cal.totalOpened+' / 25</strong>'+
  button('advent-history','<span aria-hidden="true">⋯</span><span class="sr-only">Choisir un calendrier</span>','advent-history-trigger',busy)+'</div>'+
  '<div class="advent-tiles" role="group" aria-label="Les 25 enveloppes de décembre '+cal.year+'">'+grid+'</div>'+
  '<footer class="advent-footer"><p class="advent-day-status" aria-live="polite">'+escape(status)+'</p>'+
  button(primaryAction,escape(primaryLabel),'advent-primary',busy||!dateTrusted||!today||(!today.opened&&!today.canOpen))+
  '<small>Une découverte par jour, pour deux.</small></footer>'+
  (showHistory?'<div class="advent-dialog-shade" role="dialog" aria-modal="true" aria-labelledby="advent-history-title"><article class="advent-dialog">'+
   '<div class="advent-reveal-heading">NOS SOUVENIRS À DEUX</div><h2 id="advent-history-title">Nos calendriers</h2>'+
   '<p>Les lettres des jours passés restent accessibles dans leur calendrier.</p>'+
   historyYears.map(y=>button('advent-year:'+y,'Décembre '+y,'advent-dialog-year'+(y===cal.year?' selected':''))).join('')+
   button('advent-history','Fermer','advent-dialog-close')+'</article></div>':'')+
  (opened?'<div class="advent-dialog-shade" role="dialog" aria-modal="true" aria-labelledby="advent-letter-title">'+
   '<article class="advent-dialog advent-reveal"><span class="advent-paper-corner" aria-hidden="true"></span>'+
   '<div class="advent-reveal-heart" aria-hidden="true">'+heart+'</div>'+
   '<div class="advent-reveal-heading">'+selectedDay+' DÉCEMBRE '+cal.year+'</div>'+
   '<h2 id="advent-letter-title">'+escape(opened.advent_title??'Notre surprise du jour')+'</h2>'+
   (opened.advent_type?'<div class="advent-reveal-type">'+escape(opened.advent_type)+'</div>':'')+
   '<p class="advent-description">'+escape(opened.advent_description??'Le texte de cette lettre n’a pas été enregistré.')+'</p>'+
   '<p class="advent-opened-by">Ouverte par '+escape(who(opened.opened_by))+(timestamp?' · '+escape(timestamp):'')+'</p>'+
   (opened.advent_timer_minutes?timerHtml:'')+
   button('advent-close','Fermer','advent-dialog-close')+'</article></div>':'')+'</section>';
}
