import {eclatGuidedPlay} from './eclat-guided-ui.mjs?v=20261022-home228';

import {ECLAT_COFFRETS,eclatCoffret,eclatStage,ECLAT_MOODS} from './eclat-catalog.mjs';
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
import {eveningEclatSwitcher} from './evening-eclat-switcher.mjs?v=20261022-home228';
import {coffretMemo} from './eclat-history.mjs?v=20261022-home228';
import {goldArrowHtml} from './gold-arrows.mjs?v=20261022-home228';
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const atlasPosition=id=>'--atlas-x:'+((Number(id)-1)%3*50)+'%;--atlas-y:'+(Math.floor((Number(id)-1)/3)*100/3).toFixed(5)+'%;';
const fmt=cents=>((Number(cents)||0)/100).toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+' $';
const btn=(action,label,cls='',disabled=false,pressed=null)=>'<button type="button" data-action="'+esc(action)+'" class="'+cls+'"'+(disabled?' disabled':'')+(pressed===null?'':' aria-pressed="'+(pressed?'true':'false')+'"')+'>'+label+'</button>';
const moods={romantique:'♡',ludique:'✦',mystere:'◇',sensuel:'♥',sensoriel:'❋',musique:'♫',detente:'☾',finale:'✧'};
const headphones='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 14v-3a9 9 0 0 1 18 0v3M3 14v5h5v-8H3zm13-3h5v8h-5z"/></svg>';
function memoHtml(history,id,status,full=false,unavailable=false){
 if(unavailable)return '<span class="eclat-memo">Mémo temporairement indisponible</span>';
 const m=coffretMemo(history,id,status);
 const label=m.active?'En cours · '+m.minutes+' min · étape '+m.chapter:
  m.completed.length===3?'Les 3 durées terminées':m.completed.length?'Terminé · '+m.completed.length+'/3 durées':m.started?'Déjà commencé':'À découvrir';
 return '<span class="eclat-memo'+(m.active?' is-running':'')+'" aria-label="Progression du coffret"><span>'+label+'</span>'+
  ((m.started||full)?'<span class="eclat-memo-durations">'+[30,60,90].map(n=>'<span class="'+(m.completed.includes(n)?'is-done':'')+'">'+n+' min'+(m.completed.includes(n)?' ✓':'')+'</span>').join('')+'</span>':'')+'</span>';
}
// LR-ECLAT-001 : one catalogue, grouped by the owner's approved intentions.
const ECLAT_INTENTIONS=[
 {id:'together',label:'Jouer ensemble',ids:[1,2,4,6,7,10,12]},
 {id:'reconnect',label:'Se retrouver',ids:[1,5,8]},
 {id:'closer',label:'Se rapprocher',ids:[3,9,11]},
 {id:'all',label:'Tous les coffrets',ids:ECLAT_COFFRETS.map(c=>c.id)}
];
function eclatRecommendation(history){
 const lastStart=new Map();
 for(const row of Array.isArray(history)?history:[]){
  if(!row||typeof row!=='object'||Array.isArray(row))continue;
  const id=Number(row.coffret_id),date=Date.parse(row.started_at||'');
  if(!ECLAT_COFFRETS.some(c=>c.id===id))continue;
  lastStart.set(id,Math.max(lastStart.get(id)??0,Number.isFinite(date)?date:0));
 }
 const newOne=ECLAT_COFFRETS.find(c=>!lastStart.has(c.id));
 if(newOne)return {coffret:newOne,reason:'À découvrir · pas encore commencé'};
 const oldOne=[...ECLAT_COFFRETS].sort((a,b)=>lastStart.get(a.id)-lastStart.get(b.id)||a.id-b.id)[0];
 return {coffret:oldOne,reason:'À retrouver · commencé depuis le plus longtemps'};
}
export function eclatHtml({status=null,selected=1,minutes=30,intent='all',discovery=true,details=false,members=[],userId=null,music=false,finished=null,history=[],historyError=false,browse=false,noteState={},coupleReady=true}={}){
 if(!coupleReady){
  // A missing association is not a subscription failure. Do not show an
  // old private coffret, price or history while the duo is unavailable.
  return '<section class="eclat-shell" aria-label="Éclat · duo indisponible">'+
   '<header class="eclat-top">'+ritualHeadingHtml('NOTRE RITUEL DE LA SOIRÉE')+'</header>'+
   '<section class="eclat-offer" role="status" aria-label="Duo à vérifier">'+
   '<div class="eclat-offer-symbol" aria-hidden="true">♡</div>'+
   '<h2>Votre duo n’est pas prêt</h2>'+
   '<p>Éclat est réservé aux deux partenaires associés. Vérifiez votre association avant de retrouver vos coffrets.</p>'+
   btn('tab:session','← Retour à notre soirée','eclat-offer-back')+
   '</section></section>';
 }
 // A stale status can claim an active session after access was revoked.
 // Access and active play must be authorized together before showing steps.
 const access=status?.access===true,active=access&&status?.active===true;
 const c=eclatCoffret(active&&!browse?status.coffret_id:selected)||ECLAT_COFFRETS[0];
 const heading='<header class="eclat-top">'+
  (details||active&&!browse?'<button type="button" class="eclat-return" data-action="eclat:library" aria-label="Retour aux coffrets">‹</button>':'<span class="eclat-header-balance" aria-hidden="true"></span>')+
  ritualHeadingHtml('NOTRE RITUEL DE LA SOIRÉE')+
  (active?btn('eclat:music',headphones+'<span>'+(music?'Couper le son':'Musique')+'</span>','eclat-audio-toggle'+(music?' is-on':'')):'<span class="eclat-header-balance" aria-hidden="true"></span>')+'</header>'+
  '<div class="eclat-page-title"><h2 class="ritual-page-title">'+esc(active&&!browse?c.title:'Nos 12 coffrets à deux')+'</h2></div>'+
  eveningEclatSwitcher('eclat');
 // A completion notice is private and only valid with confirmed Éclat access.
 // A revoked/absent status or a newly active coffret must not inherit it.
 const lead=finished&&access&&!active?'<div class="eclat-complete" role="status">♡ Coffret terminé ensemble · '+esc(finished)+'</div>':'';
 const premiumNote='<p class="eclat-disclaimer">Vos 200 défis et les 100 activités Surprise restent indépendants. Aucun achat n’est effectué depuis cet écran.</p>';
 let body='';
 if(active&&!browse){
  const stage=eclatStage(c.id,status.chapter_number,status.variant_number);
  if(!stage)return '<section class="eclat-shell">'+heading+'<p>Étape indisponible. Réessayez dans un instant.</p></section>';
  body=eclatGuidedPlay({stage,status,members,userId,noteState});
 }else if(!access){
  // The catalogue is private to Éclat members. Billing is not enabled yet.
  body='<section class="eclat-offer" aria-label="Découvrir l’abonnement Éclat">'+
   '<div class="eclat-offer-symbol" aria-hidden="true">✧</div>'+
   '<small class="eclat-offer-kicker">COLLECTION PRIVÉE · ÉCLAT PREMIUM</small>'+
   '<h2>12 expériences pour se retrouver</h2>'+
   '<p>Des coffrets romantiques, sensoriels et complices. Une nouvelle histoire à vivre ensemble, à votre rythme.</p>'+
   '<div class="eclat-offer-features"><span>♡ 12 coffrets</span><span>♧ À deux</span><span>◷ 30, 60 ou 90 min</span></div>'+
   '<div class="eclat-offer-price"><small>Forfait Éclat · total pour le couple</small>'+
    '<strong>'+fmt(status?.total_cents??999)+'</strong><span> / mois, base incluse</span></div>'+
   '<p class="eclat-offer-info">L’activation et le paiement en ligne ne sont pas encore disponibles. Aucune somme ne sera débitée.</p>'+
   btn('tab:session','← Retour à notre soirée','eclat-offer-back')+
   '</section>';
 }else if(details){
  body='<section class="eclat-detail" data-coffret-id="'+c.id+'">'+
   '<div class="eclat-detail-hero'+(Number(c.id)===1?' is-secret':'')+'" role="img" aria-label="Décor du coffret '+esc(c.title)+'"><span class="eclat-detail-hero-photo" style="'+atlasPosition(c.id)+'--photo-y:'+(100*(Number(c.id)-1)/11).toFixed(5)+'%"></span></div>'+
   '<small>COFFRET '+String(c.id).padStart(2,'0')+' / 12</small><h2>'+esc(c.title)+'</h2>'+
   '<p>'+esc(c.subtitle)+'</p><div class="eclat-descriptor"><span>'+({30:4,60:6,90:8}[minutes]||6)+' étapes</span><span>Environ '+minutes+' min</span><span>Deux téléphones</span></div>'+
   memoHtml(history,c.id,status,true,historyError)+
   '<p class="eclat-detail-copy"><span>1. Lisez la consigne et préparez le moment.</span><span>2. Vivez le moment à votre rythme.</span><span>3. Choisissez l’ambiance, puis confirmez à deux.</span></p>'+
   '<div class="eclat-duration"><span>Durée de votre expérience</span><div>'+
    [30,60,90].map(n=>btn('eclat:minutes:'+n,n+' min','eclat-duration-choice'+(minutes===n?' is-selected':''),false,minutes===n)).join('')+
   '</div></div>'+
   (active?(Number(status.coffret_id)===c.id?btn('eclat:resume','Reprendre notre coffret '+goldArrowHtml(),'eclat-primary'):'<p class="eclat-active-note">Un coffret est en cours. Retrouvez-le avant d’en ouvrir un autre.</p>'+btn('eclat:resume','Reprendre le coffret en cours '+goldArrowHtml(),'eclat-primary')):access?btn('eclat:start:'+c.id,'Ouvrir notre coffret '+goldArrowHtml(),'eclat-primary'):
    '<div class="eclat-paywall"><strong>Éclat · '+fmt(status?.total_cents??999)+'/mois</strong>'+
    '<p>Abonnement total pour deux (base incluse). Le paiement sera proposé lors du lancement d’Éclat.</p>'+
    '<button type="button" class="eclat-primary" disabled>Activation prochainement</button></div>')+
   btn('eclat:library','← Voir les 12 coffrets','eclat-link')+'</section>';
 }else{
  const group=ECLAT_INTENTIONS.find(item=>item.id===intent)||ECLAT_INTENTIONS[3];
  const visibleCoffrets=ECLAT_COFFRETS.filter(c=>!discovery||group.ids.includes(c.id));
  const suggestion=discovery&&!active&&!historyError?eclatRecommendation(history):null;
  body='<section class="eclat-library">'+lead+
   (active?btn('eclat:resume','Reprendre notre coffret en cours '+goldArrowHtml(),'eclat-resume'):'')+
   (historyError?'<p class="eclat-history-notice" role="status">Historique temporairement indisponible.</p>':'')+
   (discovery?'<nav class="eclat-intents" aria-label="Explorer les coffrets selon notre envie">'+ECLAT_INTENTIONS.map(item=>btn('eclat:intent:'+item.id,esc(item.label),'eclat-intent'+(group.id===item.id?' is-selected':''),false,group.id===item.id)).join('')+'</nav>':'')+ 
   (suggestion?'<button type="button" class="eclat-recommendation" data-action="eclat:suggest:'+suggestion.coffret.id+'" aria-label="Voir notre suggestion : '+esc(suggestion.coffret.title)+'"><span><small>NOTRE SUGGESTION · '+esc(suggestion.reason)+'</small><strong>'+esc(suggestion.coffret.title)+'</strong></span><span aria-hidden="true">Voir le coffret ›</span></button>':'')+
   '<h3 class="eclat-gallery-a11y">'+esc(group.label)+' · '+visibleCoffrets.length+' coffrets</h3>'+
   '<div class="eclat-grid eclat-photo-grid" role="group" aria-label="Les coffrets Éclat">'+visibleCoffrets.map(coff=>
    '<button type="button" class="eclat-tile" data-action="eclat:detail:'+coff.id+'" aria-label="Ouvrir le coffret '+String(coff.id).padStart(2,'0')+' : '+esc(coff.title)+'">'+
     '<span aria-hidden="true" class="eclat-tile-photo" style="'+atlasPosition(coff.id)+'--photo-y:'+(100*(Number(coff.id)-1)/11).toFixed(5)+'%"></span>'+
     '<span class="eclat-tile-number">'+String(coff.id).padStart(2,'0')+' / 12</span>'+
     '<strong>'+esc(coff.title)+'</strong>'+
     memoHtml(history,coff.id,status,false,historyError)+
     '<span aria-hidden="true" class="eclat-tile-arrow">'+goldArrowHtml()+'</span></button>').join('')+'</div>'+
    (!access?'<p class="eclat-library-offer">Éclat : '+fmt(status?.total_cents??999)+'/mois au total pour le couple</p>':'<p class="eclat-library-offer">12 coffrets · Accès illimité · 30, 60 ou 90 minutes</p>')+
    premiumNote+'</section>';
 }
 return '<section class="eclat-shell">'+heading+body+'</section>';
}
