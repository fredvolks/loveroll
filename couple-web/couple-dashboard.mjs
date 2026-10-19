// LoveRoll — invitation state and couple statistics.
// Intimate encounter counts are computed on decrypted client-side entries only.
export function invitationStatus(invitation,connected,now=Date.now()){
 if(connected)return {code:'accepted',title:'Demande acceptée',hint:'Votre espace couple est connecté.'};
 if(!invitation)return {code:'none',title:'Aucune demande envoyée',hint:'Invitez votre partenaire quand vous serez prêts.'};
 if(invitation.accepted_at)return {code:'accepted',title:'Demande acceptée',hint:'Connexion du couple en cours de synchronisation.'};
 if(invitation.cancelled_at)return {code:'cancelled',title:'Invitation annulée',hint:'Vous pouvez créer une nouvelle invitation.'};
 if(Date.parse(invitation.expires_at)<=now)return {code:'expired',title:'Invitation expirée',hint:'Créez un nouveau lien sécurisé.'};
 if(invitation.sent_at)return {code:'pending',title:'Demande envoyée',hint:'En attente que votre partenaire accepte.'};
 return {code:'prepared',title:'Invitation préparée',hint:'Confirmez l’envoi après l’avoir envoyée depuis votre messagerie.'};
}
export function coupleStats(sessions=[],challenges=[],intimateReportCount=null){
 const opened=sessions.length;
 const completed=sessions.filter(s=>s.counted===true&&!!s.finished_at).length;
 const challengesDone=challenges.filter(c=>c.status==='completed').length;
 return {opened,completed,percentage:opened?Math.round(completed/opened*100):null,challengesDone,
  intimateReportCount};
}
export function formatCoupleDate(iso){
 if(!iso)return 'À compléter';
 const d=new Date(iso.slice(0,10)+'T12:00:00');
 return Number.isNaN(d.getTime())?'À compléter':new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',year:'numeric'}).format(d);
}
// Meta may choose not to render Open Graph cards, especially from Android
// ACTION_SEND or when a new invitation URL has not yet been scraped.
// Never rely on the preview as the only visible invitation: include a short,
// human-readable fallback and put the ONE personal URL on its own final line.
// The URL carries only a non-secret invitation reference; Supabase validates
// the authenticated recipient before joining the couple.
export function invitationMessengerText(url){
 // URL-only share: Messenger is responsible for rendering the Open Graph image.
 // The UUID is a non-secret reference, and Supabase authorizes the actual recipient.
 if(typeof url!=='string'||!/^https:\/\/[^\s]+$/.test(url))
  throw Error('Lien d’invitation invalide.');
 const parsed=new URL(url);
 if(parsed.username||parsed.password)throw Error('Lien d’invitation invalide.');
 return parsed.href;
}

export function invitationEmailText(url){
 return '♡ LoveRoll — Une invitation juste pour nous deux\n\n'
  +'Notre aventure commence ici. Je t’invite à partager avec moi des moments de complicité, de surprises et de tendresse sur LoveRoll.\n\n'
  +'ACCEPTER L’INVITATION ❤️\n'+url+'\n\n'
  +'Connecte-toi avec la même adresse courriel que celle qui reçoit ce message. '
  +'Ce lien personnel expire dans 7 jours.\n\n'
  +'Avec amour ♡';
}
export function invitationPreviewMarkup(){
 return '<div class="loveroll-invite-preview" aria-label="Aperçu de l’invitation LoveRoll">'+
  '<div class="loveroll-invite-heart"><img src="./assets/loveroll-messenger-og-v43.jpg" alt="Cœur lumineux et dés LoveRoll" loading="lazy"></div>'+
  '<h3>LoveRoll</h3><p class="loveroll-invite-kicker">Une invitation juste pour vous deux</p>'+
  '<div class="loveroll-invite-divider"></div>'+
  '<h4>♡ Votre aventure commence ici</h4>'+
  '<p>Votre partenaire vous invite à partager des moments de complicité, de surprises et de tendresse.</p>'+
  '<div class="loveroll-invite-cta">Accepter l’invitation ❤️</div>'+
  '<small>Une expérience privée, rien que pour vous deux.</small></div>';
}
