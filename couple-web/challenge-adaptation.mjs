// LR-017: UI-only proposal/answer; source challenge remains authoritative.
// Never infer consent from viewing, editing, starting a timer or casting dice.
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const adaptationFor=(rows,id)=>Array.isArray(rows)?rows.find(x=>x.challenge_id===id)||null:null;
export function acceptedAdaptationText(original,row){
 return row?.status==='accepted'&&row.proposed_text?.trim()?row.proposed_text:original;
}
export function acceptedAdaptationMinutes(original,row){
 return row?.status==='accepted'&&Number.isInteger(row.proposed_minutes)?row.proposed_minutes:original;
}
// A duration accepted before start invalidates any timer previously saved
// for the original minutes (including an expired background timer).
export function adaptedTimerDurationMs(row){
 return row?.status==='accepted'&&Number.isInteger(row.proposed_minutes)&&
  row.proposed_minutes>=1&&row.proposed_minutes<=360?row.proposed_minutes*60000:null;
}
export function needsAdaptedTimerReset(row,currentDurationMs){
 const expected=adaptedTimerDurationMs(row);
 return expected!==null&&currentDurationMs!==expected;
}
export function adaptationPanelHtml(card,row,{open=false,busy=false,originalText=null,originalMinutes=null}={}){
 if(!card||!['proposed','accepted'].includes(card.status))return '';
 if(row){
  const state=row.status==='pending'?'Adaptation proposée · en attente de votre accord à deux':
   row.status==='accepted'?'Adaptation acceptée par les deux partenaires':
   'Adaptation refusée · le défi original reste inchangé';
  return '<div class="lr-adapt-panel" role="status"><small>'+safe(state)+'</small></div>';
 }
 if(open){
  return '<section class="lr-adapt-panel" aria-label="Proposer une adaptation">'+
   '<h3>Adapter ce défi, ensemble</h3>'+
   '<p>La consigne originale reste dans l’historique. Ton partenaire doit accepter avant tout changement.</p>'+ 
   (originalText!==null?'<div class="lr-adapt-original"><strong>Consigne originale</strong><p>'+safe(originalText)+'</p>'+ 
    (Number.isFinite(originalMinutes)?'<small>Durée actuelle : '+safe(originalMinutes)+' min</small>':'')+'</div>':'')+
   '<label for="lr-adapt-text">Ta proposition (facultatif si tu modifies la durée)</label>'+
   '<textarea id="lr-adapt-text" maxlength="500" rows="3" placeholder="Une version qui vous convient à tous les deux…"></textarea>'+
   (card.status==='proposed'?
    '<label for="lr-adapt-minutes">Durée en minutes (facultatif, avant de commencer)</label>'+
    '<input id="lr-adapt-minutes" type="number" min="1" max="360" step="1" placeholder="Garder la durée actuelle">':
    '<p class="tiny-note">Le défi est commencé : sa minuterie reste inchangée.</p>')+
   '<div class="lr-adapt-actions">'+
   '<button type="button" data-action="adapt-propose:'+safe(card.id)+'"'+(busy?' disabled':'')+'>Proposer l’adaptation</button>'+
   '<button type="button" data-action="adapt-cancel"'+(busy?' disabled':'')+'>Annuler</button></div></section>';
 }
 return '<button type="button" class="lr-adapt-open" data-action="adapt-open:'+safe(card.id)+'">Adapter ce défi</button>';
}
export function pendingAdaptationsHtml(rows,userId){
 const pending=(rows||[]).filter(x=>x?.status==='pending'&&x.proposed_by!==userId).slice(0,8);
 if(!pending.length)return '';
 return '<section class="lr-adapt-inbox" aria-label="Adaptations à approuver">'+
  '<strong>♡ Propositions à deux</strong>'+
  pending.map(x=>'<div class="lr-adapt-request">'+
   '<p>Ton partenaire propose une adaptation facultative. Aucun défi n’a été modifié.</p>'+
   (x.proposed_text?'<p class="lr-adapt-proposal">'+safe(x.proposed_text)+'</p>':'')+
   (Number.isInteger(x.proposed_minutes)?'<small>Durée proposée : '+safe(x.proposed_minutes)+' minutes</small>':'')+
   '<div class="lr-adapt-actions">'+
   '<button type="button" data-action="adapt-answer:'+safe(x.challenge_id)+':yes">Accepter</button>'+
   '<button type="button" data-action="adapt-answer:'+safe(x.challenge_id)+':no">Garder le défi original</button>'+
   '</div></div>').join('')+'</section>';
}
