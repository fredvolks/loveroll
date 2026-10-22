import {eclatGuide} from './eclat-guidance.mjs?v=20261022-home220';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,cls='',disabled=false)=>'<button type="button" data-action="eclat:'+action+'" class="'+cls+'"'+(disabled?' disabled':'')+'>'+label+'</button>';

export function eclatGuidedPlay({stage,status,members,userId,noteState={}}){
 const guide=eclatGuide(stage),c=stage.coffret;
 const ordered=[...members].sort((a,b)=>String(a.joined_at||a.user_id).localeCompare(String(b.joined_at||b.user_id)));
 const first=ordered[(Number(status.chapter_index)-1)%2];
 const firstText=first?.user_id===userId?'Tu commences, puis vous échangez les rôles.':(first?.name?.split(' ')[0]||'Ton partenaire')+' commence, puis vous échangez les rôles.';
 const chosen=status.my_choice!==null&&status.my_choice!==undefined;
 const revealed=status.both_chosen===true,ready=status.my_ready===true;
 const final=Number(status.chapter_index)===Number(status.chapter_total);
 const outcome=Math.min(3,Math.max(1,Number(status.outcome)||1));
 const phase=revealed?'reveal':chosen?'wait':noteState.moment_done?'choose':noteState.playing?'play':'prepare';
 const fieldKey=String(status.session_id)+'-'+status.chapter_index;
 const noteId='eclat-note-'+fieldKey,clueId='eclat-clue-'+fieldKey;
 const noteUnavailable=noteState.loading||noteState.error;
 const outcomeCopy=final?c.finales[outcome-1]:[
  'Prenez un instant calme ensemble. Prolongez seulement ce qui vous convient.',
  'Reprenez un détail de ce moment pour en faire un petit jeu spontané à deux.',
  'Inventez ensemble une petite surprise inspirée de ce moment.'
 ][outcome-1];
 const fields='<label for="'+esc(noteId)+'">'+esc(guide.label)+' <span>· privé · facultatif</span></label>'+
  '<textarea id="'+esc(noteId)+'" data-draft-ignore data-eclat-field="note" maxlength="2000" rows="2" placeholder="'+esc(guide.placeholder)+'"'+(noteUnavailable?' disabled':'')+'>'+esc(noteState.note)+'</textarea>'+
  (guide.clue?'<details class="eclat-clue-field"><summary>Préparer un indice · facultatif</summary><label for="'+esc(clueId)+'">Ton indice à dire à voix haute</label><textarea id="'+esc(clueId)+'" data-draft-ignore data-eclat-field="clue" maxlength="300" rows="2" placeholder="Un détail pour aider à deviner, sans donner la réponse…"'+(noteUnavailable?' disabled':'')+'>'+esc(noteState.clue)+'</textarea></details>':'')+
  '<div class="eclat-note-controls">'+button('note-save','Enregistrer ma note','eclat-note-save',!!noteUnavailable)+'<span data-eclat-note-status role="status">'+(noteState.loading?'Chargement…':noteState.error?'Lecture impossible. '+button('note-retry','Réessayer','eclat-note-save'):noteState.saved?'Note enregistrée pour toi':'Écris ici, puis enregistre.')+'</span></div>';
 const help='<details class="eclat-rules"><summary>Les règles de ce moment</summary><ol>'+guide.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><p>Tu peux effacer ta note puis enregistrer pour supprimer son texte. Les durées sont indicatives. Vous pouvez adapter ou passer sans pénalité. Aucun texte n’est analysé; les choix de fin déterminent l’ambiance, pas une bonne réponse. Pour passer, utilisez chacun « Passer ce moment ». La suite apparaît après vos deux choix, puis avance après vos deux confirmations.</p></details>';
 const common='<section class="eclat-together"><small>ENSEMBLE</small><h3>'+esc(stage.title)+'</h3><p>'+esc(stage.story)+'</p>'+(guide.kind==='x'||guide.kind==='p'?'':'<p class="eclat-turn">'+esc(firstText)+'</p>')+'</section>';
 let content='',actions='';
 if(phase==='prepare'){
  content=common+'<section class="eclat-personal"><small>POUR TOI SEULEMENT</small>'+fields+'</section>'+help;
  actions=button('note-play','Vivre ce moment à deux','eclat-primary',!!noteUnavailable)+button('choose:0','Passer ce moment','eclat-skip');
 }else if(phase==='play'){
  content=common+'<section class="eclat-moment-steps"><small>À VOUS DE JOUER</small><ol>'+guide.steps.slice(1).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></section><details class="eclat-personal"><summary>Relire ou modifier ma note privée</summary>'+fields+'</details>'+help;
  actions=button('note-done','J’ai terminé ce moment','eclat-primary',!!noteUnavailable)+button('choose:0','Passer ce moment','eclat-skip');
 }else if(phase==='choose'){
  content=common+'<section class="eclat-choice-intro"><small>ET POUR LA SUITE ?</small><h3>Ton envie, en privé</h3><p>Ces boutons choisissent l’ambiance de la suite. Ils ne répondent pas à la devinette et ne partagent pas ta note.</p></section>';
  actions='<div class="eclat-choices" aria-label="Choix privé pour cette étape">'+c.choices.map((s,i)=>button('choose:'+(i+1),esc(s),'eclat-choice')).join('')+'</div>'+button('note-edit','Revenir au moment','eclat-skip');
 }else if(phase==='wait'){
  content=common+'<div class="eclat-wait" role="status">Ton choix est enregistré. On attend ton partenaire…<p>Ta note reste privée. Aucun texte n’est transmis.</p></div>';
 }else{
  content=common+'<div class="eclat-reveal" role="status"><small>VOTRE SUITE COMMUNE</small><p>'+esc(outcomeCopy)+'</p></div>';
  actions=button('next',ready?'En attente de l’autre…':final?'Terminer ensemble':'Continuer ensemble','eclat-primary',ready);
 }
 return '<section class="eclat-play eclat-guided" data-eclat-phase="'+phase+'">'+
  '<div class="eclat-guided-heading"><strong>'+esc(c.title)+'</strong><span>Étape '+status.chapter_index+' / '+status.chapter_total+' · Environ '+status.minutes+' min</span></div>'+
  '<div class="eclat-progress-track"><span style="width:'+(100*Number(status.chapter_index)/Number(status.chapter_total))+'%"></span></div>'+
  '<div class="eclat-guided-content">'+content+'</div><div class="eclat-guided-actions">'+actions+'</div>'+
  '<footer class="eclat-play-footer"><small>'+(['choose','wait','reveal'].includes(phase)?'Chacun choisit et confirme sur son téléphone.':'Ta note reste privée. Rien n’est transmis à l’autre.')+'</small><div>'+button('library','Voir les coffrets','eclat-link')+button('end','Quitter le coffret','eclat-link')+'</div></footer></section>';
}
