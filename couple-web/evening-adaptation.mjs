// LR-017: presentation only; official card, D100 and pass quota are immutable.
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const active=status=>status==='pending'||status==='accepted';
export function acceptedAdaptation(rows,challengeId){
 const row=(Array.isArray(rows)?rows:[]).find(a=>a.challenge_id===challengeId);
 return row?.status==='accepted'?row:null;
}
export function adaptationHtml(challenge,{adaptation=null,viewerId=null,editing=false,busy=false}={}){
 if(!challenge||challenge.status!=='proposed')return '';
 const id=esc(challenge.id),isApprover=adaptation?.approver_id===viewerId;
 const isProposer=adaptation?.proposer_id===viewerId;
 const btn=(action,text,primary=false)=>'<button type="button" data-action="evening-adapt-'+action+':'+id+
  '" class="'+(primary?'evening-primary':'subtle')+'"'+(busy?' disabled':'')+'>'+text+'</button>';
 const proposal=adaptation?.proposed_description?'<p class="lr-adapt-proposal">'+esc(adaptation.proposed_description)+'</p>':'';
 const duration=Number.isInteger(adaptation?.proposed_minutes)?
  '<p class="tiny-note">Durée proposée : '+adaptation.proposed_minutes+' min</p>':'';
 let inner='';
 if(adaptation?.status==='accepted'){
  inner='<p>♥ Adaptation acceptée à deux pour ce défi seulement.</p>';
 }else if(adaptation?.status==='pending'){
  inner='<p>Proposition en attente de l’autre partenaire.</p>'+proposal+duration+
   '<div class="lr-refusal-buttons">'+
   (isApprover?btn('accept','Accepter ♥',true)+btn('decline','Garder le défi original'):
     isProposer?btn('cancel','Annuler la proposition'):'')+'</div>';
 }else if(editing){
  inner='<p>Le texte de la carte originale reste intact. Votre partenaire doit accepter.</p>'+
   '<label for="lr-adapt-text">Nouvelle consigne (facultative)</label>'+
   '<textarea id="lr-adapt-text" maxlength="1200" rows="3" placeholder="Une proposition plus douce, à votre rythme…"></textarea>'+
   '<label for="lr-adapt-minutes">Durée en minutes (facultative, de 1 à 120)</label>'+
   '<input id="lr-adapt-minutes" type="number" min="1" max="120" step="1" inputmode="numeric">'+
   '<div class="lr-refusal-buttons">'+btn('propose','Proposer l’adaptation',true)+
   btn('dismiss','Annuler')+'</div>';
 }else{
  inner=(adaptation?.status==='declined'?'<p>Votre partenaire préfère garder le défi original.</p>':
    adaptation?.status==='cancelled'?'<p>Proposition annulée.</p>':'')+
   btn('open','Adapter ce défi');
 }
 return '<section class="lr-adapt-panel" aria-label="Adapter le défi" aria-live="polite">'+
  '<h3>♡ Adapter ce défi</h3>'+inner+'</section>';
}
// The approving partner may not have the original private challenge in their
// own queue. Show only the voluntary proposal, never a hidden D100 result.
export function adaptationInboxHtml(rows,viewerId,{busy=false}={}){
 const pending=(Array.isArray(rows)?rows:[]).filter(a=>
  a.status==='pending'&&a.approver_id===viewerId);
 if(!pending.length)return '';
 return '<section class="lr-evening-invite lr-adapt-inbox" aria-label="Proposition d’adaptation">'+
  '<span class="lr-evening-invite-label">♡ UNE PROPOSITION À DEUX</span>'+
  pending.map(a=>{
   const id=esc(a.challenge_id),description=a.proposed_description?esc(a.proposed_description):
    'Ton partenaire propose une autre durée.';
   return '<div class="lr-adapt-inbox-row"><p>'+description+'</p>'+
    (Number.isInteger(a.proposed_minutes)?'<small>Durée proposée : '+a.proposed_minutes+' min</small>':'')+
    '<div class="lr-evening-invite-actions">'+
    '<button type="button" class="lr-evening-invite-primary" data-action="evening-adapt-accept:'+id+'"'+(busy?' disabled':'')+'>Accepter ♥</button>'+
    '<button type="button" class="lr-evening-invite-secondary" data-action="evening-adapt-decline:'+id+'"'+(busy?' disabled':'')+'>Garder le défi original</button>'+
    '</div></div>';
  }).join('')+
  '<small>Libre de refuser, sans passe ni pénalité.</small></section>';
}
