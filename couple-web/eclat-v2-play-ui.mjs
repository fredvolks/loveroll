// Éclat V2 interface for coffrets 01–04, NOT mounted in production V1.
// Server snapshot is authoritative; only the active viewer's fictional mission
// enters DOM. One-phone mode explicitly covers the screen between A and B.
import {eclatV2SceneA} from './eclat-v2-coffrets-a.mjs';
import {eclatV2SceneB} from './eclat-v2-coffrets-b.mjs';
import {eclatV2SceneC} from './eclat-v2-coffrets-c.mjs';
const esc =value=>String(value??'').replace(/[&<>"']/g,ch=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const btn=(action,label,style='')=>'<button type="button" class="eclat-v2-btn '+style+'" data-eclat-v2-action="'+esc(action)+'">'+esc(label)+'</button>';
const paragraph=s=>'<p>'+esc(s)+'</p>';
function mainContent(view,status,predictionDraft={},puzzleDraft={},puzzleAttempt=null,sharedAnswers={},sharedConfirmed=[],sharedReveal=null,musicDraft={},sharedMusicNotes={},sharedRevealedMusic=[],cardDraft=[],sharedCardDraft={},sharedCardConfirmed=[]){
 let html='<h2>'+esc(view.title)+'</h2>'+
  '<p class="eclat-v2-instruction">'+esc(view.instruction)+'</p>';
 if(view.substepTotal)html+='<p class="eclat-v2-muted">'+(view.coffretId===1?'Enveloppe':view.coffretId===5?'Tour':'Partie')+
  ' '+view.substepIndex+' sur '+view.substepTotal+' de ce moment</p>';
 if(view.coffretId===10){
  html+='<section class="eclat-v2-task" aria-label="Minuteur facultatif">';
  if(view.sceneNumber===1&&!status.timer_mode){
   html+='<h3>Avec ou sans minuteur ?</h3>'+
    '<p>Chacun choisit; le mode ne sera fixé qu’après un accord des deux.</p>'+
    btn('timer-mode:with','Avec minuteur')+btn('timer-mode:without','Sans minuteur');
   if(status.my_timer_vote)html+='<p role="status">Choix transmis. Votre partenaire doit confirmer le même mode.</p>';
  }else if(status.timer_mode==='without'){
   html+='<p>Sans minuteur : prenez le temps qui vous convient.</p>';
  }else if(view.timerSeconds){
   const seconds=status.timer_remaining_seconds??view.timerSeconds;
   const clock=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
   html+='<h3>Manche · '+view.timerSeconds+' secondes indicatives</h3>'+
    '<p class="eclat-v2-timer" role="timer" aria-live="off">'+clock+'</p>';
   if(status.timer_remaining_seconds===null||status.timer_remaining_seconds===undefined)
    html+=btn('timer-action:start','Démarrer le minuteur','primary');
   else if(seconds===0){
    html+='<p role="status">Le temps indicatif est écoulé. Rien ne se termine automatiquement.</p>'+
     btn('timer-action:extend','Prolonger 1 minute','primary');
   }else if(status.timer_running)
    html+=btn('timer-action:pause','Mettre le minuteur en pause');
   else html+=btn('timer-action:resume','Reprendre le minuteur','primary');
   if(view.perPerson)html+='<p>90 secondes par partenaire.</p>';
   if(view.oralFinaleUntimed)html+='<p>Terminez cette scène oralement, sans minuterie.</p>';
  }
  if(view.fallback)html+='<p>'+esc(view.fallback)+'</p>';
  html+='</section>';
 }
 if(view.coffretId===9&&view.cards?.length){
  const selected=status.device_mode==='one'?(sharedCardDraft[view.role]||[]):cardDraft,
    validated=status.device_mode==='one'?sharedCardConfirmed.includes(view.role):
      status.my_cards_ready===true;
  html+='<section class="eclat-v2-task"><h3>Mes envies privées</h3>'+
   '<p>Jusqu’à trois cartes, ou aucune. Le partenaire ne voit pas les cartes non communes.</p>';
  if(status.common_cards!==null&&status.common_cards!==undefined)
   html+='<p role="status">Comparaison commune terminée. Les sélections privées ne sont plus conservées.</p>';
  else{
   if(validated)html+='<p role="status">Sélection validée. Les idées restent masquées jusqu’à la double validation.</p>';
   else html+='<fieldset class="eclat-v2-door"><legend>Mes cartes (« J’en ai envie »)</legend>'+
    view.cards.map(c=>btn('wish-toggle:'+c.number,(selected.includes(c.number)?'✓ ':'')+c.title))
    .join('')+'</fieldset>';
   if(!validated)html+=btn(status.device_mode==='one'?'wish-confirm-local':'wish-confirm',
     'Valider ma sélection','primary');
   if(status.device_mode==='one'&&sharedCardConfirmed.includes('A')&&
     sharedCardConfirmed.includes('B')&&view.role==='A'&&
     status.common_cards===null)
    html+=btn('wish-reveal-joint','Nous acceptons de révéler seulement les idées communes','primary');
  }
  html+='</section>';
 }
 if(view.coffretId===9&&view.commonCards){
  html+='<section class="eclat-v2-task"><h3>Vos idées communes</h3>';
  if(!view.commonCards.length)
   html+='<p>Aucune idée commune à révéler aujourd’hui.</p>'+
     '<p>Vous pouvez discuter cinq minutes ou continuer sans proposition.</p>';
  else{
   html+='<ul>'+view.commonCards.map(c=>'<li>'+esc(c.title)+'</li>').join('')+'</ul>';
   if(view.sceneNumber===3&&!view.selectedCard)
    html+='<fieldset class="eclat-v2-door"><legend>Choisir ensemble</legend>'+
     view.commonCards.map(c=>btn('wish-vote:'+c.number,c.title)).join('')+'</fieldset>';
   if(view.selectedCard)
    html+='<p role="status">Carte retenue ensemble : '+esc(view.selectedCard.title)+'</p>';
  }
  if(view.proposal)html+=paragraph(view.proposal);
  if(view.contactAgreementRequired)html+='<p>Cette carte demande un accord explicite des deux, et une alternative sans contact reste possible.</p>';
  html+='</section>';
 }
 if(view.coffretId===12){
  html+='<section class="eclat-v2-activity"><h3>Votre histoire à inventer</h3>'+
   '<p><strong>Votre objectif :</strong> '+esc(view.objective)+'</p>';
  if(view.dicePending)
   html+='<p role="status">Les trois dés réels du récit n’ont pas encore été reçus du serveur. Aucun résultat local n’est créé.</p>';
  else{
   const d=view.story;
   html+='<p><strong>Décor ('+d.draws.decor+') :</strong> '+esc(d.decor)+'</p>'+
    '<p><strong>Personnages fictifs :</strong> A · '+esc(view.roleSwapped?d.roleB:d.roleA)+
     ' / B · '+esc(view.roleSwapped?d.roleA:d.roleB)+'</p>'+
    '<p><strong>Contrainte ('+d.draws.constraint+') :</strong> '+
     (status.constraint_enabled===false?'Sans contrainte, d’un commun accord':esc(d.constraint))+'</p>'+
    '<p>Relances volontaires de la contrainte : '+view.reRollCount+
     '. Le décor et les rôles ne sont jamais retirés.</p>';
   if(view.shortRouteSwitch)html+='<p>Échangez maintenant vos rôles fictifs pour cette scène.</p>';
  }
  html+='</section>';
  if(view.rerollConstraintOnly&&!view.dicePending){
   html+='<fieldset class="eclat-v2-door"><legend>Décidons ensemble</legend>'+
    btn('story-vote:keep','Garder notre contrainte')+
    btn('story-vote:reroll','Relancer seulement la contrainte')+
    (view.sceneNumber===6?btn('story-vote:off','Jouer sans contrainte'):'')+
    '<p class="eclat-v2-muted">'+(status.device_mode==='two'?
      'Chaque partenaire confirme sur son téléphone; deux choix identiques sont nécessaires.':
      'Confirmez uniquement après un accord oral des deux.')+'</p>';
   if(status.my_story_vote&&!status.story_decision_confirmed)
    html+='<p role="status">Votre choix est transmis; attendez l’accord de l’autre.</p>';
   if(status.story_decision_confirmed)
    html+='<p role="status">Décision commune confirmée. Vous pouvez la conserver ou relancer uniquement la contrainte.</p>';
   html+='</fieldset>';
  }
 }
 if(view.envelopes?.length){
  html+='<div class="eclat-v2-tasks">'+view.envelopes.map(e=>
   '<section class="eclat-v2-task"><small>ENVELOPPE '+e.number+(e.skipped?' · PASSÉE':'')+'</small>'+
   '<p>'+esc(e.theme)+'</p><p>Ordre : '+e.first+' puis '+(e.first==='A'?'B':'A')+
   ' · Jusqu’à trois indices et deux propositions par personne.</p></section>').join('')+'</div>';
 }
 if(view.questions?.length&&view.coffretId===5)
  html+='<section class="eclat-v2-tasks"><h3>À tour de rôle</h3>'+
   view.questions.map(q=>'<p><strong>'+esc(q.name)+'</strong> · '+esc(q.text)+'</p>').join('')+'</section>';
 if(view.attentions){
  const proposer=view.role===view.turn,chosen=status.attention_index,
   decided=status.attention_response;
  html+='<section class="eclat-v2-tasks" aria-label="Attention facultative"><h3>Au tour de '+view.turn+' de proposer</h3>'+
   '<p>Une attention peut rester imaginaire, sans achat ni réservation. Aucun refus ne devient une préférence.</p>';
  if(chosen===null||chosen===undefined||decided==='other'){
   if(decided==='other')html+='<p role="status">Une autre proposition a été demandée.</p>';
   if(proposer)html+='<fieldset class="eclat-v2-door"><legend>Mon attention proposée</legend>'+
    view.attentions.map((t,i)=>btn('attention-propose:'+i,t)).join('')+'</fieldset>';
   else html+='<p role="status">En attente de la proposition de '+view.turn+'.</p>';
  }else{
   html+='<p role="status"><strong>Proposition :</strong> '+esc(view.attentions[chosen])+'</p>';
   if(decided==='yes')html+='<p>Oui, cette attention est acceptée pour ce tour.</p>';
   else if(decided==='pass')html+='<p>Cette attention est passée, sans conséquence.</p>';
   else if(!proposer){
    html+='<fieldset class="eclat-v2-door"><legend>Ma réponse libre</legend>'+
     btn('attention-reply:yes','Oui')+
     btn('attention-reply:other','Une autre proposition')+
     btn('attention-reply:pass','Passer')+'</fieldset>';
   }else html+='<p role="status">En attente de la réponse de '+(view.turn==='A'?'B':'A')+'.</p>';
  }
  if(status.device_mode==='one')html+='<p class="eclat-v2-muted">Sur un appareil partagé, chaque touche représente une décision annoncée oralement; aucune session de B n’est simulée.</p>';
  html+='</section>';
 }
 if(view.endingOptions)html+='<section class="eclat-v2-tasks"><h3>Votre finale facultative</h3>'+
  '<ul>'+view.endingOptions.map(o=>'<li>'+esc(o)+'</li>').join('')+'</ul></section>';
 if(view.opening)html+='<p>'+esc(view.opening)+'</p>';
 if(view.places)html+='<section class="eclat-v2-tasks"><h3>Tableau des lieux</h3>'+
  '<ul>'+view.places.map(o=>'<li><strong>'+esc(o.name)+'</strong> : '+esc(o.clues)+'</li>').join('')+'</ul></section>';
 if(view.privateMission&&(!status.revealed||view.allowClueReread)){
  html+='<section class="eclat-v2-private" aria-label="Mission privée pour '+view.role+'"><small>'+esc(view.privateLabel||('POUR '+view.role+' UNIQUEMENT'))+
   '</small><p>'+esc(view.privateMission)+'</p>'+
   (view.constraint?paragraph(view.constraint):'')+'</section>';
 }
 if(view.bonus){
  if(typeof view.bonus==='string')
   html+='<section class="eclat-v2-task"><strong>Bonus facultatif</strong>'+paragraph(view.bonus)+'</section>';
  else html+='<section class="eclat-v2-task"><strong>Énigme bonus</strong>'+paragraph(view.bonus.cipher)+
   (view.bonus.key?paragraph(view.bonus.key):'')+
   '<details><summary>Voir la solution (sur demande)</summary>'+paragraph(view.bonus.solution)+'</details></section>';
 }
 if(view.puzzle){
  html+='<section class="eclat-v2-task"><strong>Votre enquête</strong>'+
   '<p>Choisissez ensemble. Aucun score ni limite d’essais.</p>';
  if(view.puzzle.kind==='place-time')
   html+='<fieldset class="eclat-v2-door"><legend>Quel lieu ?</legend>'+
    view.puzzle.places.map(p=>btn('puzzle-place:'+p,(puzzleDraft.place===p?'✓ ':'')+p)).join('')+
    '</fieldset><fieldset class="eclat-v2-door"><legend>À quelle heure ?</legend>'+
    view.puzzle.times.map(t=>btn('puzzle-time:'+t,(puzzleDraft.time===t?'✓ ':'')+t)).join('')+
    '</fieldset>';
  else html+='<fieldset class="eclat-v2-door"><legend>Quel code ?</legend>'+
    view.puzzle.codes.map(c=>btn('puzzle-code:'+c,(puzzleDraft.code===c?'✓ ':'')+c)).join('')+'</fieldset>';
  if(!status.puzzle_solved&&status.puzzle_hint_level!==2&&
     (view.puzzle.kind==='code'?puzzleDraft.code:
      puzzleDraft.place&&puzzleDraft.time))
    html+=btn('puzzle-submit','Vérifier notre réponse','primary');
  if(status.puzzle_solved)html+='<p role="status">La réponse correspond aux deux dossiers.</p>';
  else if(puzzleAttempt===false)html+='<p role="status">'+
   (view.puzzle.kind==='code'?
    'Ce code ne respecte pas les deux indices. Vous pouvez réessayer ou demander une aide.':
    'Réessayez ou demandez une aide.')+'</p>';
  if(status.puzzle_hint_level>=1)html+=paragraph(view.puzzle.firstHelp);
  if(status.puzzle_hint_level>=2)
   html+='<p role="status"><strong>Solution révélée :</strong> '+
      esc(Object.values(view.puzzle.solution).join(' · '))+'</p>';
  if(!status.puzzle_solved&&status.puzzle_hint_level<2)
   html+=btn('puzzle-help',status.puzzle_hint_level===0?'Demander un indice':
     'Afficher la solution (niveau 2)');
  html+='</section>';
 }
 if(view.investigationFinal){
  const f=view.investigationFinal;
  html+='<section class="eclat-v2-task"><h3>La lettre finale</h3>'+
   paragraph([f.place,f.time,f.code].join(' · '))+paragraph(f.letter)+
   (f.assistance?paragraph('Résolution avec aide'):'')+'</section>';
 }
 if(view.questions?.length&&view.secretComparison){
  const q=view.questions[0],draft=predictionDraft||{};
  html+='<section class="eclat-v2-task"><h3>Question '+q.number+'</h3>'+
   paragraph(q.prompt)+'<p>Choisis ta réponse puis celle que tu imagines pour l’autre. Aucune note.</p>';
  if(status.device_mode==='two'){
   for(const [kind,heading,key] of [['answer','Ma réponse','my_answer'],['prediction',"Ma prédiction pour l’autre",'my_prediction']]){
    const selected=draft[kind]??status[key];
    html+='<fieldset class="eclat-v2-door"><legend>'+heading+'</legend>'+
     q.options.map((option,i)=>btn(kind+':'+i,
      (selected===i?'✓ ':'')+option)).join('')+'</fieldset>';
   }
   const hasSaved=status.my_answer!==null&&status.my_answer!==undefined&&
     status.my_prediction!==null&&status.my_prediction!==undefined;
   const hasDraft=draft.answer!==null&&draft.answer!==undefined&&
     draft.prediction!==null&&draft.prediction!==undefined;
   const changed=hasDraft&&(!hasSaved||draft.answer!==status.my_answer||
      draft.prediction!==status.my_prediction);
   if(hasSaved)html+='<p role="status">Tes deux choix sont enregistrés dans ton compte, pas dans celui de ton partenaire.</p>';
   if(changed&&!status.revealed)html+=btn('save-prediction',hasSaved?'Enregistrer mes modifications':
      'Enregistrer mes deux choix','primary');
  }else{
   const values=sharedAnswers[view.role]||{},confirmed=sharedConfirmed.includes(view.role);
   for(const [key,label] of [['answer','Ma réponse'],['prediction',"Ma prédiction pour l’autre"]]){
    html+='<fieldset class="eclat-v2-door"><legend>'+label+'</legend>'+
     q.options.map((item,i)=>btn(key+':'+i,(values[key]===i?'✓ ':'')+item)).join('')+'</fieldset>';
   }
   if([0,1,2].includes(values.answer)&&[0,1,2].includes(values.prediction))
    html+=btn('save-shared-prediction',confirmed?'Confirmer et masquer':'Terminer mon tour et masquer','primary');
   html+='<p>Ces deux réponses restent éphémères dans le téléphone partagé. Aucun compte de B n’est modifié.</p>';
  }
  html+='</section>';
  const disclosed=view.revealAnswers?.players?view.revealAnswers:sharedReveal;
  if(disclosed?.players){
   const r=disclosed.players,approved=view.revealedQuestion||
     (sharedReveal?{number:sharedReveal.question,options:sharedReveal.options}:null);
   if(r.A&&r.B&&approved&&approved.number===disclosed.question)
    html+='<section class="eclat-v2-activity"><strong>Découverte de la question '+esc(approved.number)+'</strong>'+
    '<p>A : '+esc(approved.options[r.A.answer])+' — '+(r.A.prediction===r.B.answer?'Comme tu l’imaginais':'Une découverte')+'</p>'+
    '<p>B : '+esc(approved.options[r.B.answer])+' — '+(r.B.prediction===r.A.answer?'Comme tu l’imaginais':'Une découverte')+'</p></section>';
  }
 }
 if(view.themes){
  const theme=view.themes[0],shared=status.device_mode==='one';
  const key=view.role+':'+theme.number;
  const saved=shared?(sharedMusicNotes[key]||null):(status.my_music_note||null);
  const draftTitle=musicDraft.title??saved?.title??'';
  const draftArtist=musicDraft.artist??saved?.artist??'';
  const alreadyRevealed=shared?sharedRevealedMusic.some(x=>x.theme===theme.number&&x.owner===view.role):
   saved?.revealed===true;
  html+='<section class="eclat-v2-task"><strong>Thème '+theme.number+'</strong>'+
   paragraph(theme.theme)+
   '<p>Trois indices maximum et deux propositions maximum, à tour de rôle. Vous pouvez simplement raconter sans jouer de musique.</p>'+
   '<fieldset class="eclat-v2-door"><legend>Mon titre privé (facultatif)</legend>'+
   '<label for="eclat-v2-song-title">Titre</label>'+
   '<input id="eclat-v2-song-title" data-eclat-v2-input="music-title" type="text" maxlength="120" autocomplete="off"'+
    (alreadyRevealed?' disabled':'')+' value="'+esc(draftTitle)+'">'+
   '<label for="eclat-v2-song-artist">Artiste (facultatif)</label>'+
   '<input id="eclat-v2-song-artist" data-eclat-v2-input="music-artist" type="text" maxlength="120" autocomplete="off"'+
    (alreadyRevealed?' disabled':'')+' value="'+esc(draftArtist)+'">';
  if(alreadyRevealed)html+='<p role="status">Ce titre a été révélé volontairement.</p>';
  else{
   if(draftTitle.trim())html+=btn('music-save',shared?
     'Conserver mon titre sur ce téléphone':'Enregistrer ma note privée','primary');
   if(saved?.title)html+=btn('music-reveal','Révéler volontairement mon titre');
   if(saved?.title)html+='<p class="eclat-v2-muted">Cette note reste privée tant que vous ne choisissez pas Révéler.</p>';
  }
  html+='</fieldset></section>';
 }
 const publicMusic=status.device_mode==='one'?sharedRevealedMusic:(status.revealed_music||[]);
 if(view.coffretId===8&&publicMusic.length){
  html+='<section class="eclat-v2-task"><h3>Titres déjà révélés</h3><ul>'+
   publicMusic.map(song=>'<li>'+esc(song.title)+(song.artist?' — '+esc(song.artist):'')+'</li>').join('')+
   '</ul><p>Révélés volontairement, sans diffusion audio.</p></section>';
 }

 if(view.listeningChoices)
  html+='<section class="eclat-v2-task"><strong>Choisissez ensemble</strong><ul>'+
   view.listeningChoices.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
   '<p>LoveRoll ne démarre aucune lecture musicale.</p></section>';
 if(view.playlistLimit)
  html+='<section class="eclat-v2-task"><p>Jusqu’à '+view.playlistLimit+
   ' titres révélés, uniquement avec l’accord des deux personnes. Aucune chanson ou fichier n’est téléchargé par l’app.</p></section>';
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
function actions(view,status,seenRoles,sharedConfirmed=[]){
 let rows='';
 if(status.state==='paused'){
  return btn('act:resume','Reprendre notre coffret','primary')+btn('act:stop','Arrêter cette séance');
 }
 if(status.state!=='active')return '';
 if(view.type==='Secret'&&!status.revealed&&view.coffretId!==9){
  if(status.device_mode==='two'){
   const missingPrediction=view.coffretId===7&&
    (status.my_answer===null||status.my_answer===undefined||
     status.my_prediction===null||status.my_prediction===undefined);
   if(missingPrediction)rows+='<span role="status">Enregistre ta réponse et ta prédiction avant de confirmer.</span>';
   else rows+=status.my_ready?btn('ready:false','Retirer ma confirmation'):btn('ready:true','Prêt à révéler','primary');
   if(status.can_reveal)rows+=btn('reveal','Révéler les missions ensemble','primary');
   else rows+='<span role="status">Révélation après les deux confirmations.</span>';
  }else{
   if(view.coffretId===7){
    if(view.role==='A'&&sharedConfirmed.includes('A')&&sharedConfirmed.includes('B'))
     rows+=btn('reveal-oral','Nous avons choisi et acceptons tous les deux de révéler','primary');
    else rows+='<span role="status">Chaque partenaire répond sur son écran, masqué entre les tours.</span>';
   }
   else if(seenRoles.includes('A')&&seenRoles.includes('B'))
    rows+=btn('reveal-oral','Nous sommes tous les deux d’accord pour révéler','primary');
   else rows+='<span role="status">Chaque personne consulte sa mission après remise du téléphone.</span>';
  }
 }
 const pendingDoor=view.coffretId===4&&[1,5].includes(view.sceneNumber)&&!status.door_confirmed;
 const secretLocked=view.type==='Secret'&&!status.revealed;
 const puzzleLocked=!!view.puzzle&&!status.puzzle_solved&&status.puzzle_hint_level<2;
 const attentionLocked=!!view.attentions&&!['yes','pass'].includes(status.attention_response);
 const wishLocked=view.coffretId===9&&
  ((view.sceneNumber===1&&status.common_cards===null)||
   (view.sceneNumber===3&&view.commonCards?.length>0&&!view.selectedCard));
 const timerLocked=view.coffretId===10&&view.sceneNumber===1&&!status.timer_mode;
 const storyLocked=view.coffretId===12&&!!view.rerollConstraintOnly&&
  (!status.story_decision_confirmed||view.dicePending);
 if(!secretLocked&&!pendingDoor&&!view.awaitBranch&&!puzzleLocked&&!attentionLocked&&!storyLocked&&!wishLocked&&!timerLocked){
  if(view.role==='A')rows+=btn('act:continue',view.type==='Finale'?
   'Terminer ensemble après notre accord':'Continuer ensemble après notre accord','primary');
  else rows+='<span role="status">Après votre accord oral, A pourra continuer cette scène commune.</span>';
 }
 rows+=btn('act:pass','Passer ce moment');
 rows+=btn('act:pause','Pause');
 rows+=btn('act:stop','Arrêter cette séance');
 return rows;
}
export function renderEclatV2PlayA({status,viewerId,localRole=null,seenRoles=[],predictionDraft={},puzzleDraft={},puzzleAttempt=null,sharedAnswers={},sharedConfirmed=[],sharedReveal=null,musicDraft={},sharedMusicNotes={},sharedRevealedMusic=[],cardDraft=[],sharedCardDraft={},sharedCardConfirmed=[]}){
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
 const model=status.coffret_id<=4?eclatV2SceneA:
   status.coffret_id<=8?eclatV2SceneB:eclatV2SceneC;
 const view=model({session:status,viewerId,localDisplayRole:localRole});
 return '<section class="eclat-v2-stage" data-eclat-v2-scene="'+view.sceneNumber+'">'+
  '<header><small>ÉCLAT · COFFRET '+String(view.coffretId).padStart(2,'0')+
  ' · '+view.variantName+'</small><p>Étape '+view.number+' sur '+view.total+
  ' · '+view.budgetMinutes+' min indicatives</p></header>'+
  (status.device_mode==='one'?'<nav class="eclat-v2-handover-link">'+btn('hide-role','Masquer et passer le téléphone')+'</nav>':'')+
  '<div class="eclat-v2-content">'+mainContent(view,status,predictionDraft,puzzleDraft,puzzleAttempt,sharedAnswers,sharedConfirmed,sharedReveal,musicDraft,sharedMusicNotes,sharedRevealedMusic,cardDraft,sharedCardDraft,sharedCardConfirmed)+'</div>'+
  '<footer class="eclat-v2-actions">'+actions(view,status,seenRoles,sharedConfirmed)+'</footer>'+
  '<p class="eclat-v2-muted">Toutes les activités sont facultatives. Aucun score. Aucun contact sans accord explicite.</p>'+
  '</section>';
}
