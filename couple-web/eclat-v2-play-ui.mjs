// Éclat V2 interface for coffrets 01–04, NOT mounted in production V1.
// Server snapshot is authoritative; only the active viewer's fictional mission
// enters DOM. One-phone mode explicitly covers the screen between A and B.
import {eclatV2SceneA} from './eclat-v2-coffrets-a.mjs';
const esc =value=>String(value??'').replace(/[&<>"']/g,ch=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const btn=(action,label,style='')=>'<button type="button" class="eclat-v2-btn '+style+'" data-eclat-v2-action="'+esc(action)+'">'+esc(label)+'</button>';
const paragraph=s=>'<p>'+esc(s)+'</p>';
function mainContent(view,status){
 let html='<h2>'+esc(view.title)+'</h2>'+
  '<p class="eclat-v2-instruction">'+esc(view.instruction)+'</p>';
 if(view.substepTotal)html+='<p class="eclat-v2-muted">Enveloppe '+view.substepIndex+' sur '+view.substepTotal+' de ce moment</p>';
 if(view.envelopes?.length){
  html+='<div class="eclat-v2-tasks">'+view.envelopes.map(e=>
   '<section class="eclat-v2-task"><small>ENVELOPPE '+e.number+(e.skipped?' · PASSÉE':'')+'</small>'+
   '<p>'+esc(e.theme)+'</p><p>Ordre : '+e.first+' puis '+(e.first==='A'?'B':'A')+
   ' · Jusqu’à trois indices et deux propositions par personne.</p></section>').join('')+'</div>';
 }
 if(view.privateMission&&!status.revealed){
  html+='<section class="eclat-v2-private" aria-label="Mission privée pour '+view.role+'"><small>POUR '+view.role+
   ' UNIQUEMENT</small><p>'+esc(view.privateMission)+'</p>'+
   (view.constraint?paragraph(view.constraint):'')+'</section>';
 }
 if(view.bonus)html+='<section class="eclat-v2-task"><strong>Bonus facultatif</strong>'+paragraph(view.bonus)+'</section>';
 if(view.optionalObjects)html+='<details><summary>Objets possibles, entièrement facultatifs</summary><p>'+
  esc(view.optionalObjects.join(' · '))+'</p></details>';
 if(view.choices?.length && view.coffretId===3){
  html+='<section aria-label="Trois façons de vivre ce moment" class="eclat-v2-options">'+
   view.choices.map(opt=>'<details><summary>'+esc(opt.label)+'</summary>'+paragraph(opt.description)+
    (opt.requiresContact?'<p><strong>Contact seulement après un Oui explicite des deux; arrêt immédiat possible. Sinon, choisissez l’alternative sans contact.</strong></p>':'')+
   '</details>').join('')+'</section>';
 }
 if(view.coffretId===3&&view.sceneNumber===6){
  html+='<section class="eclat-v2-contact" aria-label="Consentement au massage des mains">'+
   '<h3>Massage des mains : proposition facultative</h3>'+
   '<p>Le massage n’est possible qu’avec deux Oui explicites, chacun pouvant retirer le sien à tout moment. Décrire une texture sans contact reste une activité complète.</p>';
  if(status.contact_approved){
   html+='<p role="status"><strong>Accord commun confirmé pour cette proposition seulement.</strong></p>'+
    btn('contact:pass',status.device_mode==='one'?'Retirer notre Oui':'Retirer mon Oui');
  }else{
   html+=btn('contact:yes',status.device_mode==='one'?
    'Nous disons tous les deux Oui pour ce massage':'Oui, pour ce massage seulement')+
    btn('contact:other','Une autre proposition sans contact')+
    btn('contact:pass','Passer cette proposition');
   if(status.my_contact_response==='yes')
    html+='<p role="status">Votre Oui est enregistré, l’accord de l’autre reste nécessaire.</p>';
  }
  html+='</section>';
 }
 if(view.doors){
  if(view.branch)html+='<p class="eclat-v2-branch">Votre chemin : '+esc(view.branch)+'</p>';
  if(view.fallback)html+=paragraph(view.fallback);
  if(view.awaitBranch)html+='<p role="status">Le choix commun de la porte est requis pour cette activité.</p>';
  if(view.choices?.length && !status.door_confirmed)
   html+='<fieldset class="eclat-v2-door"><legend>Votre choix commun</legend>'+
    view.choices.map(d=>btn('door:'+d.id,(status.device_mode==='one'?'Nous confirmons ensemble : ':'Choisir : ')+d.label)).join('')+
    '<p class="eclat-v2-muted">'+(status.device_mode==='two'?
     'Les deux personnes confirment sur leur téléphone. En cas de désaccord, rien ne change.':
     'Validez uniquement après avoir entendu l’accord oral des deux personnes.')+'</p></fieldset>';
  if(status.my_door_vote && !status.door_confirmed)
   html+='<p role="status">Votre choix est transmis. Il reste à vous entendre sur la même porte.</p>';
  if(view.branchActivity)html+='<section class="eclat-v2-activity"><small>VOTRE ACTIVITÉ</small>'+paragraph(view.branchActivity)+'</section>';
 }
 if(view.finales?.length)html+='<details><summary>Finir avec ou sans invitation</summary>'+
  '<p>Si vous retenez une invitation : '+esc(view.finales[0])+'</p>'+
  '<p>Sans invitation : '+esc(view.finales[1])+'</p></details>';
 if(view.finale)html+='<section class="eclat-v2-activity"><strong>Pour conclure</strong>'+paragraph(view.finale)+'</section>';
 return html;
}
function actions(view,status,seenRoles){
 let rows='';
 if(status.state==='paused'){
  return btn('act:resume','Reprendre notre coffret','primary')+btn('act:stop','Arrêter cette séance');
 }
 if(status.state!=='active')return '';
 if(view.type==='Secret'&&!status.revealed){
  if(status.device_mode==='two'){
   rows+=status.my_ready?btn('ready:false','Retirer ma confirmation'):btn('ready:true','Prêt à révéler','primary');
   if(status.can_reveal)rows+=btn('reveal','Révéler les missions ensemble','primary');
   else rows+='<span role="status">Révélation après les deux confirmations.</span>';
  }else{
   if(seenRoles.includes('A')&&seenRoles.includes('B'))
    rows+=btn('reveal-oral','Nous sommes tous les deux d’accord pour révéler','primary');
   else rows+='<span role="status">Chaque personne consulte sa mission après remise du téléphone.</span>';
  }
 }
 const pendingDoor=view.coffretId===4&&[1,5].includes(view.sceneNumber)&&!status.door_confirmed;
 const secretLocked=view.type==='Secret'&&!status.revealed;
 if(!secretLocked&&!pendingDoor&&!view.awaitBranch){
  if(view.role==='A')rows+=btn('act:continue',view.type==='Finale'?
   'Terminer ensemble après notre accord':'Continuer ensemble après notre accord','primary');
  else rows+='<span role="status">Après votre accord oral, A pourra continuer cette scène commune.</span>';
 }
 rows+=btn('act:pass','Passer ce moment');
 rows+=btn('act:pause','Pause');
 rows+=btn('act:stop','Arrêter cette séance');
 return rows;
}
export function renderEclatV2PlayA({status,viewerId,localRole=null,seenRoles=[]}){
 if(!status?.access)return '<section class="eclat-v2-stage"><p>Accès Éclat requis.</p></section>';
 if(!status.active)return '<section class="eclat-v2-stage"><p>Aucune séance Éclat V2 en cours.</p></section>';
 if(status.content_version!==2)throw Error('L’interface Éclat V2 refuse les séances V1');
 if(status.device_mode==='one' && localRole===null){
  if(viewerId!==status.role_a)throw Error('Créateur requis en mode partagé');
  return '<section class="eclat-v2-stage eclat-v2-handover" aria-label="Écran protégé">'+
   '<h2>Passer le téléphone</h2><p>Le contenu personnel est masqué. La personne concernée touche son écran lorsqu’elle est prête.</p>'+
   btn('show-role:A','Écran pour A · Je suis prêt','primary')+
   btn('show-role:B','Écran pour B · Je suis prêt','primary')+
   '<p>Aucune réponse privée n’est enregistrée dans le compte de l’autre personne.</p></section>';
 }
 const view=eclatV2SceneA({session:status,viewerId,localDisplayRole:localRole});
 return '<section class="eclat-v2-stage" data-eclat-v2-scene="'+view.sceneNumber+'">'+
  '<header><small>ÉCLAT · COFFRET '+String(view.coffretId).padStart(2,'0')+
  ' · '+view.variantName+'</small><p>Étape '+view.number+' sur '+view.total+
  ' · '+view.budgetMinutes+' min indicatives</p></header>'+
  (status.device_mode==='one'?'<nav class="eclat-v2-handover-link">'+btn('hide-role','Masquer et passer le téléphone')+'</nav>':'')+
  '<div class="eclat-v2-content">'+mainContent(view,status)+'</div>'+
  '<footer class="eclat-v2-actions">'+actions(view,status,seenRoles)+'</footer>'+
  '<p class="eclat-v2-muted">Toutes les activités sont facultatives. Aucun score. Aucun contact sans accord explicite.</p>'+
  '</section>';
}
