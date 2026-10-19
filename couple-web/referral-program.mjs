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
 const head='<section class="settings-referral-card" aria-label="Programme de parrainage LoveRoll">'+
  '<div class="settings-referral-hero"><span>♡ LOVEROLL · PARRAINAGE</span><h3>Invitez un couple, gagnez ensemble.</h3></div>';
 if(!v.enabled)return head+'<p>Le programme de parrainage est temporairement désactivé. Les crédits déjà acquis sont conservés.</p></section>';
 const explainer='<p>Chaque partenaire peut partager son propre lien. Lorsqu’un nouveau couple rejoint LoveRoll et paie son <strong>premier abonnement annuel</strong>, <strong>votre duo reçoit '+esc(amount)+'</strong> sous forme de '+esc(referralModeText(v.reward_mode))+'.</p>'+
  '<ol class="settings-referral-steps"><li><strong>Partagez votre lien personnel</strong><small>Par message, Messenger ou ailleurs.</small></li>'+
  '<li><strong>Le nouveau couple s’inscrit et s’abonne</strong><small>Le premier paiement annuel doit être confirmé. Un simple compte gratuit ne suffit pas.</small></li>'+
  '<li><strong>Votre couple gagne '+esc(amount)+'</strong><small>Les récompenses se cumulent pour le même duo et sont suivies dans LoveRoll.</small></li></ol>';
 const disclaimer='<small>Un seul parrainage par nouveau couple. Aucun crédit pour un achat mensuel ou une inscription seule. '+
  'Les crédits confirmés seront appliqués lorsque la facturation sécurisée sera connectée. '+
  'Les conditions du programme peuvent évoluer pour les nouvelles recommandations.</small>';
 if(!v.couple_ready||!v.code)return head+explainer+
  '<p class="settings-referral-waiting">♡ Créez votre duo pour obtenir votre lien de parrainage personnel.</p>'+
  disclaimer+'</section>';
 const url=referralLink(v.code);
 return head+explainer+
  '<div class="settings-referral-link-card"><label class="settings-referral-label" for="loveroll-referral-link">VOTRE LIEN PERSONNEL</label>'+
  '<input id="loveroll-referral-link" readonly aria-label="Mon lien de parrainage" value="'+esc(url)+'">'+
  '<div class="settings-referral-actions">'+
  '<button type="button" data-action="referral-copy" class="settings-primary">Copier le lien</button>'+
  '<button type="button" data-action="referral-share" class="settings-secondary">Partager</button></div></div>'+
  '<div class="settings-referral-stats">'+
   '<div><strong>'+esc(v.pending_count??0)+'</strong><small>En attente du paiement annuel</small></div>'+
   '<div><strong>'+esc(v.paid_count??0)+'</strong><small>Parrainages confirmés</small></div>'+
   '<div><strong>'+esc(dollars(v.earned_cad_cents))+'</strong><small>Crédits obtenus par notre duo</small></div>'+
  '</div>'+disclaimer+
  '</section>';
}
