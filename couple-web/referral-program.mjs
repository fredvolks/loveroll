// LoveRoll — account settings referral panel. Each partner has their own link,
// but all verified renewal credits are earned by their SHARED couple.
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[ch]));
const dollars=value=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format((Number(value)||0)/100);
export const REFERRAL_CODE_PATTERN=/^[0-9a-f]{24}$/;
export const REFERRAL_PENDING_STORAGE_KEY='loverollReferralPendingV1';
export const REFERRAL_PUBLIC_BASE='https://fredvolks.github.io/loveroll/';
export function referralLink(code,base=REFERRAL_PUBLIC_BASE){
 if(!REFERRAL_CODE_PATTERN.test(String(code||'')))return '';
 const url=new URL(base);
 url.searchParams.set('auth','signup');
 url.searchParams.set('ref',code);
 return url.href;
}
export function referralModeText(mode){
 return {renewal_credit:'crédit sur le prochain renouvellement annuel',
  wallet_credit:'solde de crédits LoveRoll',manual:'avantage appliqué par le service LoveRoll'}[mode]||'crédit LoveRoll';
}
export function referralSettingsHtml(referral){
 const v=referral||{},amount=dollars(v.reward_cad_cents??500);
 const head='<section class="settings-referral-card"><h3>♡ Parrainer un couple</h3>';
 if(!v.enabled)return head+'<p>Le programme de référencement n’est pas actif pour le moment.</p></section>';
 if(!v.couple_ready||!v.code)return head+
  '<p>Créez d’abord votre duo pour obtenir votre lien personnel de recommandation.</p></section>';
 const url=referralLink(v.code);
 return head+
  '<p>Partagez votre lien. Lorsqu’un nouveau couple crée un compte et règle son <strong>premier abonnement annuel</strong>, votre couple gagne <strong>'+
  esc(amount)+'</strong> en '+esc(referralModeText(v.reward_mode))+'.</p>'+
  '<label class="settings-referral-label" for="loveroll-referral-link">Mon lien personnel</label>'+
  '<input id="loveroll-referral-link" readonly aria-label="Mon lien de référencement" value="'+esc(url)+'">'+
  '<div class="settings-referral-actions">'+
  '<button type="button" data-action="referral-copy" class="settings-primary">Copier mon lien</button>'+
  '<button type="button" data-action="referral-share" class="settings-secondary">Partager</button></div>'+
  '<div class="settings-referral-stats">'+
   '<div><strong>'+esc(v.pending_count??0)+'</strong><small>En attente du paiement annuel</small></div>'+
   '<div><strong>'+esc(v.paid_count??0)+'</strong><small>Référencements validés</small></div>'+
   '<div><strong>'+esc(dollars(v.earned_cad_cents))+'</strong><small>Crédits acquis par notre duo</small></div>'+
  '</div>'+
  '<small>Un seul parrainage par nouveau couple. Le rabais est cumulable pour les deux partenaires. Aucune récompense pour une inscription seule ni pour un achat mensuel. '+
   'L’application des crédits sur les factures sera activée après la connexion du système de paiement sécurisé.</small>'+
  '</section>';
}
