// LR-028: server-backed invitation to play, never a dice roll.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
export function eveningInviteHtml(invite,{partnerName='Ton partenaire',busy=false}={}){
 if(!invite||['unpaired','obsolete'].includes(invite.state)||invite.state==='none'&&!invite.available)return '';
 const isSent=invite.direction==='sent',received=invite.direction==='received';
 const state=invite.state;
 const heading='<span class="lr-evening-invite-label">♥ UNE INVITATION À DEUX</span>';
 const name=String(partnerName||'Ton partenaire').trim().split(/\s+/)[0];
 const action=(kind,label,primary=false)=>
  '<button type="button" data-action="evening-invite:'+kind+'"'+
   (busy?' disabled aria-disabled="true"':'')+
   ' class="'+(primary?'lr-evening-invite-primary':'lr-evening-invite-secondary')+'">'+label+'</button>';
 if(state==='none'&&invite.available){
  return '<section class="lr-evening-invite" aria-label="Inviter à jouer ce soir">'+heading+
   '<p>Un petit moment à deux ?</p><div class="lr-evening-invite-actions">'+
   action('send','As-tu envie de jouer ce soir ? ♥',true)+'</div>'+
   '<small>Ton partenaire est libre de répondre, sans pression.</small></section>';
 }
 if(!isSent&&!received)return '';
 let title='',detail='',actions='';
 if(received&&['pending','maybe'].includes(state)){
  title=name+' a envie de jouer ce soir. Et toi ?';
  detail=state==='maybe'?'Tu peux changer d’avis, à ton rythme.':'À toi de choisir, sans obligation.';
  actions=action('yes','Oui ♥',true)+action('no','Non, pas ce soir')+
   (state==='pending'?action('maybe','Peut-être plus tard'):'')+
   action('ignored','Ignorer');
 }else if(isSent){
  const message={
   pending:'Invitation envoyée à '+name+'.',
   yes:name+' a répondu oui ♥',
   no:'Pas ce soir ♥',
   maybe:'Peut-être plus tard',
   ignored:'Invitation ignorée',
   expired:'Invitation expirée',
   obsolete:'Notre soirée a déjà avancé'
  };
  title=message[state]||'Invitation enregistrée';
  detail=state==='pending'?'La réponse apparaîtra ici. Aucune relance automatique.':
   'Vous pouvez continuer vos activités habituelles.';
 }else{
  const message={
   yes:'Tu as répondu oui ♥',no:'Pas ce soir ♥',
   ignored:'Invitation ignorée',expired:'Invitation expirée',
   obsolete:'Cette invitation n’est plus d’actualité'
  };
  title=message[state]||'Invitation reçue';
  detail=state==='yes'?'Continue dans Soirée et lance toi-même ton D6.':
   'Aucun lancer ni pénalité. Tu peux toujours utiliser Soirée normalement.';
 }
 return '<section class="lr-evening-invite" aria-label="Invitation de soirée" aria-live="polite">'+heading+
  '<p>'+escapeHtml(title)+'</p><small>'+escapeHtml(detail)+'</small>'+
  (actions?'<div class="lr-evening-invite-actions">'+actions+'</div>':'')+'</section>';
}
export function isEveningInviteAction(action){
 return ['send','yes','no','maybe','ignored'].includes(action);
}
export function eveningInviteChanged(before,after){
 const signature=i=>JSON.stringify([i?.id||null,i?.state||null,
  i?.available===true,i?.direction||null]);
 return signature(before)!==signature(after);
}

// Small, visible in-app fallback on Accueil when system Push is unavailable.
// It only opens Soirée; replying and any official D6 still require a tap there.
export function eveningInviteInboxHtml(invite,{partnerName='Ton partenaire'}={}){
 if(invite?.direction!=='received'||!['pending','maybe'].includes(invite?.state))
  return '';
 const name=String(partnerName||'Ton partenaire').trim().split(/\s+/)[0];
 const prefix=invite.state==='maybe'?'Toujours partant·e ? ':'';
 // A verified invitation can be accepted immediately from Accueil.
 // The existing account-scoped handler records consent and opens Soirée,
 // but NEVER throws a D6 for either person. Other answers stay in Soirée.
 const accept=invite.id?
  '<button type="button" data-action="evening-invite:yes" class="lr-evening-inbox-yes"'+
  ' aria-label="Accepter l’invitation à jouer ce soir">Oui ♥</button>':'';
 return '<aside class="lr-evening-inbox" role="region" aria-label="Invitation à jouer">'+
  '<span aria-hidden="true" class="lr-evening-inbox-heart">♥</span>'+
  '<span class="lr-evening-inbox-copy">'+escapeHtml(prefix+name+' a envie de jouer ce soir.')+'</span>'+
  '<span class="lr-evening-inbox-actions">'+accept+
   '<button type="button" data-action="tab:session" class="lr-evening-inbox-open">'+
   (accept?'Autres choix':'Répondre')+
   '<span class="sr-only"> dans Soirée : oui, non, peut-être ou ignorer</span></button>'+
  '</span></aside>';
}
