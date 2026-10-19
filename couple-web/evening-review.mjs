// LoveRoll v96 – couple-only, individually submitted end-of-evening feedback.
// The full-screen panel is deliberately separate from old encrypted journal feedback.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
export const REVIEW_QUESTIONS=[
 {key:'overall',label:'Rendu global de la soirée',icon:'✦'},
 {key:'connection',label:'Connexion à deux',icon:'♡'},
 {key:'appreciation',label:'Appréciation des défis',icon:'🎲'},
 {key:'again',label:'Envie de recommencer',icon:'↻'}
];
export function validEveningReview(draft){
 return REVIEW_QUESTIONS.every(q=>Number.isInteger(draft?.[q.key])&&
   draft[q.key]>=1&&draft[q.key]<=5)&&
   String(draft?.comment||'').length<=500;
}
export function eveningHeartRating(key,score){
 const value=Number(score)||0;
 return '<div class="lr-review-hearts" role="group" aria-label="Note sur 5 pour '+esc(REVIEW_QUESTIONS.find(x=>x.key===key)?.label)+'">'+
  Array.from({length:5},(_,i)=>{
   const n=i+1;
   return '<button type="button" class="lr-review-heart'+(n<=value?' is-lit':'')+
    '" data-action="review-rate:'+key+':'+n+'" aria-label="'+n+' cœur'+(n>1?'s':'')+
    ' sur 5" aria-pressed="'+(value===n)+'"><span aria-hidden="true">'+
    (n<=value?'♥':'♡')+'</span><small>'+n+'</small></button>';
  }).join('')+'</div>';
}
export function eveningReviewModal({sessionId,draft={},saving=false,partnerName='ton partenaire'}={}){
 if(!sessionId)return '';
 return '<div class="lr-review-backdrop" role="presentation">'+
 '<section class="lr-review-modal" role="dialog" aria-modal="true" aria-labelledby="lr-review-title" '+
  'aria-describedby="lr-review-intro" data-review-session="'+esc(sessionId)+'">'+
 '<button type="button" class="lr-review-x" data-action="review-dismiss" aria-label="Fermer le bilan">×</button>'+
 '<div class="lr-review-eyebrow">♡ FIN DE SOIRÉE</div>'+
 '<h2 id="lr-review-title">Notre bilan de la soirée</h2>'+
 '<p id="lr-review-intro">Chacun remplit son ressenti de son côté.</p>'+
 '<div class="lr-review-questions">'+REVIEW_QUESTIONS.map(q=>
   '<div class="lr-review-question"><span class="lr-review-icon" aria-hidden="true">'+q.icon+'</span>'+
   '<strong>'+esc(q.label)+'</strong>'+eveningHeartRating(q.key,draft[q.key])+'</div>').join('')+'</div>'+
 '<label class="lr-review-comment-label" for="lr-review-comment">♧ Commentaire</label>'+
 '<div class="lr-review-note"><textarea id="lr-review-comment" maxlength="500" rows="3" '+
  'placeholder="Écrire une note ou un commentaire sur ce qu’on a aimé ou moins aimé...">'+
  esc(draft.comment||'')+'</textarea><span id="lr-review-counter">'+String(draft.comment||'').length+'/500</span></div>'+
 '<p class="lr-review-calendar-note">▦ Ce bilan sera sauvegardé dans votre calendrier commun. '+
  'Le bilan de '+esc(partnerName)+' sera ajouté dès qu’il sera enregistré.</p>'+
 '<p class="lr-review-error" role="alert" hidden></p>'+
 '<button type="button" class="lr-review-save" data-action="review-save"'+(saving?' disabled':'')+
  '>♡ '+(saving?'Enregistrement…':'Enregistrer notre bilan')+'</button>'+
 '</section></div>';
}
// The review belongs inside its owner's expandable challenge list, never
// in a separate shared block below both partners.
export function eveningPersonReviewMarkup({reviews=[],sessionId,person={},me}={}){
 const isMine=person.user_id===me;
 const review=reviews.find(r=>r.session_id===sessionId&&r.author_id===person.user_id);
 const heading='♡ Bilan de '+esc(person.name||'cette personne');
 const edit=isMine?'<button type="button" class="evening-review-edit" data-action="review-open:'+
   esc(sessionId)+'">'+(review?'Modifier mon bilan':'♡ Remplir mon bilan')+'</button>':'';
 if(!review)return '<section class="evening-review-person" data-review-person="'+esc(person.user_id)+'">'+
  '<h4>'+heading+'</h4><p>♡ '+(isMine?'Ton bilan n’est pas encore rempli.':'En attente de son bilan')+
  '</p>'+edit+'</section>';
 const scores=REVIEW_QUESTIONS.map(q=>{
  const score=Math.max(0,Math.min(5,Number(review[q.key])||0));
  return '<div class="evening-review-score"><span>'+esc(q.label)+'</span>'+
   '<strong aria-label="'+score+' sur 5">'+('♥'.repeat(score))+
    ('♡'.repeat(5-score))+'</strong></div>';
 }).join('');
 return '<section class="evening-review-person" data-review-person="'+esc(person.user_id)+'">'+
  '<h4>'+heading+'</h4>'+scores+
  (review.comment?'<p class="evening-review-note">'+esc(review.comment)+'</p>':'')+
  edit+'</section>';
}
