
import {ECLAT_COFFRETS,eclatCoffret,eclatStage,ECLAT_MOODS} from './eclat-catalog.mjs';
import {ritualHeadingHtml} from './brand.mjs?v=20261017-ritual130';
import {eveningEclatSwitcher} from './evening-eclat-switcher.mjs';
import {coffretMemo} from './eclat-history.mjs?v=20261021-home218';
import {goldArrowHtml} from './gold-arrows.mjs?v=20261021-home218';
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const atlasPosition=id=>'--atlas-x:'+((Number(id)-1)%3*50)+'%;--atlas-y:'+(Math.floor((Number(id)-1)/3)*100/3).toFixed(5)+'%;';
const fmt=cents=>((Number(cents)||0)/100).toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+' $';
const btn=(action,label,cls='',disabled=false)=>'<button type="button" data-action="'+esc(action)+'" class="'+cls+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
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
export function eclatHtml({status=null,selected=1,minutes=60,details=false,members=[],userId=null,music=false,finished=null,history=[],historyError=false,browse=false}={}){
 const access=status?.access===true,active=status?.active===true;
 const c=eclatCoffret(active&&!browse?status.coffret_id:selected)||ECLAT_COFFRETS[0];
 const heading='<header class="eclat-top"><button type="button" class="eclat-return" data-action="'+(details?'eclat:library':'tab:session')+'" aria-label="'+(details?'Retour aux coffrets':'Retour à notre soirée')+'">‹</button>'+
  ritualHeadingHtml('NOTRE RITUEL DE LA SOIRÉE')+
  (active?btn('eclat:music',headphones+'<span>'+(music?'Couper le son':'Musique')+'</span>','eclat-audio-toggle'+(music?' is-on':'')):'<span class="eclat-header-balance" aria-hidden="true"></span>')+'</header>'+
  '<div class="eclat-page-title"><h2 class="ritual-page-title">Nos 12 coffrets à deux</h2></div>'+
  eveningEclatSwitcher('eclat');
 const lead=finished?'<div class="eclat-complete" role="status">♡ Coffret terminé ensemble · '+esc(finished)+'</div>':'';
 const premiumNote='<p class="eclat-disclaimer">Vos 200 défis et les 100 activités Surprise restent indépendants. Aucun achat n’est effectué depuis cet écran.</p>';
 let body='';
 if(active&&!browse){
  const stage=eclatStage(c.id,status.chapter_number,status.variant_number);
  if(!stage)return '<section class="eclat-shell">'+heading+'<p>Étape indisponible. Réessayez dans un instant.</p></section>';
  const ordered=members.map(m=>m.user_id);
  const isFirst=ordered[0]===userId;
  const hasSwap=stage.variantNumber%2===1;
  const roleIdx=(isFirst?0:1)^(hasSwap?1:0);
  const myChoice=status.my_choice;
  const chosen=myChoice!==null&&myChoice!==undefined;
  const revealed=status.both_chosen===true;
  const ready=status.my_ready===true;
  const isFinal=Number(status.chapter_index)===Number(status.chapter_total);
  const outcome=Number(status.outcome||1);
  const scenes=[
   'Douceur : accordez-vous un moment calme, et poursuivez seulement ce qui vous convient.',
   'Complicité : transformez cette découverte en un jeu spontané, à votre façon.',
   'Mystère : inventez ensemble une petite surprise inspirée de ce chapitre.'
  ];
  const finale=c.finales[Math.min(2,Math.max(0,outcome-1))];
  body='<section class="eclat-play"><div class="eclat-progress">'+
   '<small>COFFRET '+String(c.id).padStart(2,'0')+' · '+esc(c.title)+'</small>'+
   '<span>ÉTAPE '+status.chapter_index+'/'+status.chapter_total+'</span></div>'+
   '<div class="eclat-progress-track"><span style="width:'+(100*Number(status.chapter_index)/Number(status.chapter_total))+'%"></span></div>'+
   '<div class="eclat-story">'+
   '<span class="eclat-chapter-symbol">'+(moods[stage.mood]||'♡')+'</span>'+
   '<small>'+esc(ECLAT_MOODS[stage.mood]||stage.mood)+' · '+esc(status.minutes)+' min au total</small>'+
   '<h2>'+esc(stage.title)+'</h2>'+
   '<p class="eclat-story-main">'+esc(stage.story)+'</p>'+
   '<div class="eclat-private"><small>♡ TON RÔLE SECRET</small><p>'+esc(stage.roles[roleIdx])+'</p></div>'+
   '</div>'+
   (revealed?
    '<div class="eclat-reveal" role="status"><small>♡ VOTRE RÉVÉLATION COMMUNE</small><p>'+esc(isFinal?finale:scenes[outcome-1])+'</p></div>':
    chosen?'<div class="eclat-wait" role="status"><span class="eclat-spinner"></span> Ton choix est enregistré. On attend ton partenaire…</div>':
    '<div class="eclat-choices" aria-label="Choix privé pour cette étape">'+
      c.choices.map((label,i)=>btn('eclat:choose:'+(i+1),esc(label),'eclat-choice')).join('')+
      btn('eclat:choose:0','Passer cette étape','eclat-skip')+'</div>')+
   '<footer class="eclat-play-footer">'+
    (revealed?btn('eclat:next',ready?'En attente de l’autre…':isFinal?'♡ Terminer ensemble':'♡ Continuer ensemble','eclat-primary',ready):'')+
    '<div class="eclat-play-bottom">'+
     '<span>'+(revealed?ready?'Tu as confirmé · attente de l’autre':'Choisissez tous les deux pour avancer':chosen?'Ton partenaire choisit…':'Ton choix reste privé jusqu’à la révélation')+'</span>'+
     btn('eclat:library','Voir les 12 coffrets','eclat-link')+btn('eclat:end','Quitter le coffret','eclat-link')+'</div></footer></section>';
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
   '<p>'+esc(c.subtitle)+'</p><div class="eclat-descriptor"><span>8 chapitres</span><span>4 variantes chacun</span><span>Deux téléphones</span></div>'+
   memoHtml(history,c.id,status,true,historyError)+
   '<p class="eclat-detail-copy">Une expérience scénarisée à vivre à votre rythme. Chaque partenaire reçoit des instructions différentes; vos choix transforment les chapitres suivants.</p>'+
   '<div class="eclat-duration"><span>Durée de votre expérience</span><div>'+
    [30,60,90].map(n=>btn('eclat:minutes:'+n,n+' min','eclat-duration-choice'+(minutes===n?' is-selected':''))).join('')+
   '</div></div>'+
   (active?(Number(status.coffret_id)===c.id?btn('eclat:resume','Reprendre notre coffret '+goldArrowHtml(),'eclat-primary'):'<p class="eclat-active-note">Un coffret est en cours. Retrouvez-le avant d’en ouvrir un autre.</p>'+btn('eclat:resume','Reprendre le coffret en cours '+goldArrowHtml(),'eclat-primary')):access?btn('eclat:start:'+c.id,'Ouvrir notre coffret '+goldArrowHtml(),'eclat-primary'):
    '<div class="eclat-paywall"><strong>Éclat · '+fmt(status?.total_cents??999)+'/mois</strong>'+
    '<p>Abonnement total pour deux (base incluse). Le paiement sera proposé lors du lancement d’Éclat.</p>'+
    '<button type="button" class="eclat-primary" disabled>Activation prochainement</button></div>')+
   btn('eclat:library','← Voir les 12 coffrets','eclat-link')+'</section>';
 }else{
  body='<section class="eclat-library">'+lead+
   (active?btn('eclat:resume','Reprendre notre coffret en cours '+goldArrowHtml(),'eclat-resume'):'')+
   (historyError?'<p class="eclat-history-notice" role="status">Historique temporairement indisponible.</p>':'')+
   '<h3 class="eclat-gallery-a11y">Nos douze expériences · choisir un coffret</h3>'+
   '<div class="eclat-grid eclat-photo-grid" role="list">'+ECLAT_COFFRETS.map((coff,i)=>
    '<button role="listitem" type="button" class="eclat-tile" data-action="eclat:detail:'+coff.id+'" aria-label="Ouvrir le coffret '+String(coff.id).padStart(2,'0')+' : '+esc(coff.title)+'">'+
     '<span aria-hidden="true" class="eclat-tile-photo" style="'+atlasPosition(coff.id)+'--photo-y:'+(100*i/11).toFixed(5)+'%"></span>'+
     '<span class="eclat-tile-number">'+String(coff.id).padStart(2,'0')+' / 12</span>'+
     '<strong>'+esc(coff.title)+'</strong>'+
     memoHtml(history,coff.id,status,false,historyError)+
     '<span aria-hidden="true" class="eclat-tile-arrow">'+goldArrowHtml()+'</span></button>').join('')+'</div>'+
    (!access?'<p class="eclat-library-offer">Éclat : '+fmt(status?.total_cents??999)+'/mois au total pour le couple</p>':'<p class="eclat-library-offer">12 coffrets · Accès illimité · 30, 60 ou 90 minutes</p>')+
    premiumNote+'</section>';
 }
 return '<section class="eclat-shell">'+heading+body+'</section>';
}
