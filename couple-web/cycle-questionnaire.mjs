// LoveRoll — a private choice for EACH partner when 200 shared challenges
// have been completed. This is not a card and does not affect current dice.
// A completed-cycle choice is personal and must not inherit a replacement
// account, couple, or re-authenticated browser session during an async RPC.
// Cycle identity is checked separately before applying the server result.
export function ownsCycleIntensityAnswer(state,request,generation){
 return !!(typeof request?.userId==='string'&&request.userId&&
  typeof request?.coupleId==='string'&&request.coupleId&&
  Number.isInteger(request.generation)&&
  request.generation===generation&&
  state?.user?.id===request.userId&&state?.coupleId===request.coupleId);
}
export function cycleIntensityQuestionnaireHtml({
 status=null,style='medium',partnerName='votre partenaire',saving=false
}={}){
 if(!status?.pending)return '';
 const current=['soft','medium','intense'].includes(style)?style:'medium';
 const label={soft:'Soft',medium:'Medium',intense:'Intense'}[current];
 const already=!!status.answered_self;
 const isSaving=!!saving&&!already;
 const message=already?
  'Votre réponse est enregistrée. Le prochain cycle de 200 défis démarrera lorsque votre partenaire aura répondu.':
  'Vous venez de terminer un cycle de 200 défis ensemble. Pour le prochain cycle, souhaitez-vous changer votre intensité ?';
 const choices=already?'':[
  ['down','Diminuer','minus',current==='soft'],
  ['same','Conserver','heart',false],
  ['up','Augmenter','plus',current==='intense']
 ].map(([action,title,symbol,disabled])=>
  '<button type="button" class="lr-cycle-choice" data-action="cycle-answer:'+action+'"'+
   (disabled||isSaving?' disabled aria-disabled="true"':'')+'><span aria-hidden="true">'+
   (symbol==='heart'?'♡':symbol==='plus'?'+':'−')+
   '</span><strong>'+title+'</strong></button>').join('');
 return '<div class="lr-cycle-overlay" role="dialog" aria-modal="true" aria-label="Bilan des 200 défis"'+
  (isSaving?' aria-busy="true"':'')+'>'+ 
  '<section class="lr-cycle-card"><p class="lr-cycle-kicker">NOTRE PROCHAIN CHAPITRE</p>'+
  '<h2>200 défis à deux.</h2>'+
  '<p>'+message+'</p>'+
  '<p class="lr-cycle-current">Votre intensité actuelle : <strong>'+label+'</strong></p>'+
  (already?'<p class="lr-cycle-waiting">En attente de '+String(partnerName||'votre partenaire').replace(/[&<>"']/g,'')+'.</p>':
    '<div class="lr-cycle-choices">'+choices+'</div>')+
  '<p class="lr-cycle-progress" role="status" aria-live="polite"'+(isSaving?'':' hidden')+'>Enregistrement de votre choix…</p>'+ 
  '<p class="lr-cycle-note">Votre choix reste personnel. Les cartes et les anciennes soirées sont conservées.</p>'+
  '<button type="button" class="lr-cycle-later" data-action="cycle-later"'+
   (isSaving?' disabled aria-disabled="true"':'')+'>Revenir au jeu plus tard</button>'+ 
  '</section></div>';
}
