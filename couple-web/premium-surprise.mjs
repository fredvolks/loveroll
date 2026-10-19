// LoveRoll — Rendez-vous Surprise, connected to real monthly and occasion draws.
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
import {occasionDate,dueOccasions} from './special-occasions.mjs';
import {premiumPolyDie} from './premium-evening.mjs';
import {surpriseSlot,surpriseCustom,surpriseTitle,displaySurpriseDate} from './surprise-event-config.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const button=(a,s,cls='',disabled=false)=>'<button type="button" class="'+cls+'" data-action="'+esc(a)+'"'+(disabled?' disabled':'')+'>'+s+'</button>';
const partnerNames=members=>{
 const full=[0,1].map(i=>String(members[i]?.name||'Partenaire '+(i+1)).trim());
 const short=full.map(n=>n.split(/\s+/)[0]);
 return short[0]===short[1]?full:short;
};
const eventSymbol=key=>{
 const paths={anniversary:'<path d="M12 21S3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z"/>',birthday:'<path d="M4 11h16v10H4zM4 15q2 3 4 0t4 0t4 0t4 0M7 11V7m5 4V7m5 4V7M7 3v1m5-1v1m5-1v1"/>',valentine:'<path d="M12 19C-2 11 5 1 12 8c7-7 14 3 0 11ZM3 21 21 3m-5 0h5v5"/>',mothers_day:'<path d="M12 7c-7-12-13 0-6 4-11 1-4 13 3 7 0 11 13 6 9-2 11-2 4-13-3-8 4-10-9-11-7-3"/><circle cx="12" cy="12" r="2"/>',fathers_day:'<path d="m10 10-8-5v14l8-5h4l8 5V5l-8 5zM10 10v4m4-4v4"/>'};
 return '<svg viewBox="0 0 24 24" class="surprise-event-svg" aria-hidden="true" focusable="false">'+paths[key]+'</svg>';
};


export const SIX_SPECIAL_KEYS=['anniversary','birthday','birthday','valentine','mothers_day','fathers_day'];
export function sixSpecialEvents(now,settings={},members=[]){
 const day=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Toronto'}).format(now);
 const year=Number(day.slice(0,4)),names=partnerNames(members);
 const available=dueOccasions(day,settings,members);
 const defs=[
  {key:'anniversary',title:'Anniversaire couple',emoji:'♡♡',owner:null},
  ...members.slice(0,2).map((m,i)=>({key:'birthday',title:'Anniversaire '+names[i],emoji:'♕',owner:m.user_id})),
  {key:'valentine',title:'Saint-Valentin',emoji:'♥',owner:null},
  {key:'mothers_day',title:'Fête des Mères',emoji:'✿',owner:null},
  {key:'fathers_day',title:'Fête des Pères',emoji:'♧',owner:null}
 ];
 return defs.map(entry=>{
  const possible=[year,year+1,year+2].map(y=>({date:occasionDate(entry.key,y,settings,entry.owner),year:y}))
   .filter(x=>x.date);
  const active=available.find(x=>x.key===entry.key&&x.actorId===entry.owner);
  const upcoming=possible.find(x=>x.date>=day)||null;
  const selected=active||upcoming;
  const days=selected?.daysLeft??(selected?Math.round(
    (Date.parse(selected.date+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000):null);
  const availability=active?(days<=-7?'Disponible aujourd’hui · dernier jour':days<0?'Disponible encore '+(7+days)+' jour'+(7+days===1?'':'s'):
    days===0?'Disponible aujourd’hui':'Disponible · dans '+days+' jour'+(days===1?'':'s')):null;
  return {...entry,title:surpriseTitle(settings,entry.key,entry.owner,entry.title),
   slot:surpriseSlot(entry.key,entry.owner),
   date:selected?.date||null,daysLeft:days,year:selected?.year||null,availability};
 });
}
export function premiumSurpriseHtml({
 monthly={},members=[],settings={},now=new Date(),activity=null,
 rolling=false,rollingKind=null,rollFace=1,settlingHost=false,showActivity=false,timerHtml='',editSlot=null,season=null
}={}){
 const a=monthly.monthly_activity,h=monthly.monthly_host;
 const rollingActivity=rolling&&rollingKind==='monthly_activity';
 const rollingHost=rolling&&rollingKind==='monthly_host'&&!settlingHost;
 // This month has just one large dice stage: D100 -> seasonal activity dialog -> D6 -> D100.
 // The server owns the official face; parity only selects which partner invites.
 const needsHost=!!a&&!showActivity&&(!h||settlingHost);
 const hostFaceVisible=rollingHost||settlingHost;
 const host=h?members[h.face%2===0?0:1]:null;
 const cards=sixSpecialEvents(now,settings,members);
 const editEvent=cards.find(e=>e.slot===editSlot)||null;
 const names=partnerNames(members),partner=i=>esc(names[i]);
 const activityTitle=esc(activity?.title||'Notre rendez-vous');
 const monthLabel=new Intl.DateTimeFormat('fr-CA',{month:'long',timeZone:'America/Toronto'}).format(now);
 const localMonth=Number(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',month:'2-digit'}).format(now));
 const currentSeason=season==='hiver'||season==='ete'?season:(localMonth>=11||localMonth<=4?'hiver':'ete');
 const seasonalText=activity?.[currentSeason]||activity?.description||'';
 const minCost=activity?.['prix_'+currentSeason+'_min'];
 const maxCost=activity?.['prix_'+currentSeason+'_max'];
 const costRange=Number.isInteger(minCost)&&Number.isInteger(maxCost)?
  minCost.toLocaleString('fr-CA')+' à '+maxCost.toLocaleString('fr-CA')+' $ CA':null;
 const outingPlace=[activity?.region,activity?.location].filter(Boolean).map(esc).join(' · ');
 return '<div class="surprise-premium-view surprise-ecrin">'+
  '<header class="surprise-header surprise-new-header">'+ritualHeadingHtml('NOTRE RITUEL DE LA SURPRISE')+
   '<h2 class="ritual-page-title">Une surprise à partager</h2></header>'+
  '<div class="surprise-gallery ritual-gallery">'+
   '<div class="surprise-d20-scene surprise-d100-scene surprise-main-die-scene" aria-label="'+
      (needsHost?'Dé à six faces pour déterminer qui invite':'Dé à cent faces pour choisir l’activité')+'">'+
    '<div class="surprise-month-label"><span>'+esc(monthLabel)+'</span></div>'+
    (needsHost?premiumPolyDie(6,hostFaceVisible?rollFace:null,'Dé six faces : pair ou impair',rollingHost,true):
       premiumPolyDie(100,rollingActivity?rollFace:a?.face||null,'Dé 100 faces, activité du mois',rollingActivity))+
    ((!needsHost&&a)?'<div class="surprise-d100-result" aria-live="polite">Résultat : '+esc(a.face)+'</div>':'')+
   '</div>'+
  '<div class="surprise-details">'+
  '<section class="surprise-month '+(a?'has-activity':'waiting-activity')+
    (needsHost?' host-pending':h?' host-complete':'')+'" aria-label="Notre écrin du mois">'+
   (needsHost?'<div class="surprise-host-legend" aria-label="Règle du dé : pair ou impair">'+
     '<div class="surprise-host-option"><span>PAIR</span><strong>'+partner(0)+'</strong></div>'+
     '<div class="surprise-host-option"><span>IMPAIR</span><strong>'+partner(1)+'</strong></div></div>':'')+
   (needsHost?button('roll:monthly_host','Brasser le dé','surprise-primary',rolling):
    a?button('surprise-activity','Voir notre activité','surprise-primary',rolling):
      button('roll:monthly_activity','Brasser le dé','surprise-primary',rolling))+
   (h&&!needsHost?'<div class="surprise-host-winner" role="status">♥ '+esc(h?names[h.face%2===0?0:1]:'Partenaire')+
     ' invite cette fois-ci !</div>':'')+
  '</section>'+
  '<section class="surprise-special">'+
   '<div class="surprise-events-heading"><h3>Nos événements</h3></div>'+
   '<div class="surprise-special-grid">'+cards.map((e,i)=>
    button('edit-surprise-event:'+e.key+':'+(e.owner||'-'),
     '<span class="surprise-event-symbol" aria-hidden="true">'+eventSymbol(e.key)+'</span>'+
     '<span class="surprise-event-details"><span class="surprise-event-title">'+esc(e.title)+'</span>'+
      '<span class="surprise-event-days">'+
       (e.daysLeft===null?'Choisir la date':e.availability?'Disponible':e.daysLeft+' jours')+
      '</span></span>',
     'surprise-event-card '+(i===0?'couple':'')+(e.daysLeft===null?' no-date':''),rolling)).join('')+
   '</div></section></div></div>'+
  (editEvent?
   '<div class="surprise-modal surprise-edit-modal" role="dialog" aria-modal="true" aria-label="Modifier un événement spécial">'+
    '<div class="surprise-modal-content surprise-event-editor">'+
     '<div class="surprise-edit-top"><span class="surprise-eyebrow">♡ PERSONNALISER CET ÉVÉNEMENT</span>'+
      button('close-surprise-event','✕','surprise-edit-close')+'</div>'+
     '<h2>Modifier notre événement</h2>'+
     '<label for="surprise-event-name">Nom de l’événement</label>'+
     '<input id="surprise-event-name" type="text" maxlength="55" value="'+esc(editEvent.title)+'">'+
     '<label for="surprise-event-date">Date de l’événement (chaque année)</label>'+
     '<input id="surprise-event-date" type="text" inputmode="numeric" autocomplete="off" '+
     'enterkeyhint="done" maxlength="10" placeholder="JJ/MM/AAAA" '+
     'aria-describedby="surprise-event-date-hint" value="'+esc(displaySurpriseDate(editEvent.date))+'">'+
     '<small id="surprise-event-date-hint" class="surprise-date-hint">Écris la date avec ton clavier · JJ/MM/AAAA</small>'+
     '<p>Remplace le nom et choisis une autre date au besoin. Les anciens tirages restent enregistrés.</p>'+
     '<div class="surprise-edit-actions">'+
      button('save-surprise-event','Enregistrer','surprise-primary')+
     '</div><small>Si tu modifies seulement le nom, la date d’origine demeure inchangée.</small>'+
     button('open-occasion:'+editEvent.key+':'+(editEvent.owner||'-'),'Activités et historique de cet événement','surprise-event-activities')+
    '</div></div>':'')+
  (showActivity&&a?
   '<div class="surprise-modal" role="dialog" aria-modal="true" aria-label="Notre activité du mois">'+
    '<article class="surprise-modal-content surprise-season-modal">'+
     '<strong class="surprise-season-overline">♡ ACTIVITÉ DU MOIS · D100 · '+esc(a.face)+'</strong>'+
     '<h2>'+activityTitle+'</h2>'+
     (outingPlace?'<p class="surprise-location">'+outingPlace+'</p>':'')+
     (activity?.hiver||activity?.ete?
       '<div class="surprise-season-switch" role="group" aria-label="Choisir la saison">'+
       button('surprise-season:hiver','❄ Hiver','surprise-season-tab'+(currentSeason==='hiver'?' is-active':''))+
       button('surprise-season:ete','☀ Été','surprise-season-tab'+(currentSeason==='ete'?' is-active':''))+'</div>':'')+
     '<p class="surprise-season-description">'+esc(seasonalText)+'</p>'+
     (costRange?'<div class="surprise-budget-block">'+
       '<span>Budget approximatif · 2 personnes</span><strong>'+esc(costRange)+'</strong>'+
       '<small>'+esc(activity?.budget_note||'Estimation, transport compris.')+'</small>'+
       (activity?.distance_km_est!=null?'<small>Environ '+esc(activity.distance_km_est)+' km de Québec (aller simple).</small>':'')+
       '</div>':'')+
     '<small class="surprise-season-disclaimer">Tarifs variables selon les dates, les réservations et la météo. Vérifiez les horaires et la disponibilité avant de partir.</small>'+
     timerHtml+button('surprise-activity','Fermer','surprise-primary')+
    '</article></div>':'')+
 '</div>';
}
