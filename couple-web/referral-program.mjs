// LoveRoll referral: a private link for EACH partner, but ONE shared couple
// credit balance. Only server-confirmed annual payments count toward progress.
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dollars=value=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format((Number(value)||0)/100);
export const REFERRAL_CODE_PATTERN=/^[0-9a-f]{24}$/;
export const REFERRAL_PENDING_STORAGE_KEY='loverollReferralPendingV1';
export const REFERRAL_PUBLIC_BASE='https://fredvolks.github.io/loveroll/';
export function referralLink(code,base=REFERRAL_PUBLIC_BASE){
 if(!REFERRAL_CODE_PATTERN.test(String(code||'')))return '';
 const url=new URL(base);
 url.searchParams.set('auth','signup');url.searchParams.set('ref',code);
 return url.href;
}
export function referralModeText(mode){
 return {renewal_credit:'crédit sur le prochain renouvellement annuel',
  wallet_credit:'solde de crédits LoveRoll (plafonné à un an)',
  manual:'avantage appliqué par le service LoveRoll (plafonné à un an)'}[mode]||'crédit LoveRoll';
}
export function referralProgress(referral){
 const max=Math.max(0,Math.round(Number(referral?.annual_renewal_cad_cents??4999)||0));
 const credited=Math.min(max,Math.max(0,Math.round(Number(referral?.available_cad_cents??0)||0)));
 return {max,credited,remaining:Math.max(0,max-credited),
  percentage:max===0?100:Math.min(100,Math.round(100*credited/max))};
}
export function referralSettingsHtml(referral){
 const v=referral||{},reward=dollars(v.reward_cad_cents??500);
 if(!v.enabled)return '';
 const prog=referralProgress(v);
 const url=referralLink(v.code);
 return '<section class="settings-referral-card" aria-label="Mon parrainage LoveRoll">'+
  '<div class="settings-referral-eyebrow">♡ NOS INVITATIONS</div>'+
  '<h3>Parrainez un couple, gagnez un renouvellement</h3>'+
  '<p>Chaque nouveau couple qui s’inscrit par votre lien et paie son <strong>premier abonnement annuel</strong> rapporte jusqu’à <strong>'+
   esc(reward)+'</strong> à votre duo. Vous pouvez cumuler les récompenses jusqu’au prix d’<strong>une année complète</strong>, jamais plus.</p>'+
  '<div class="settings-referral-progress-head"><strong>'+esc(dollars(prog.credited))+
  ' <span>/ '+esc(dollars(prog.max))+'</span></strong>'+
  '<span>'+esc(prog.percentage)+' %</span></div>'+
  '<div class="settings-referral-progress-track" role="progressbar" aria-label="Rabais accumulé pour notre prochain renouvellement" aria-valuemin="0" aria-valuemax="'+prog.max+'" aria-valuenow="'+prog.credited+'">'+
  '<div class="settings-referral-progress-fill" style="width:'+prog.percentage+'%"></div></div>'+
  '<div class="settings-referral-due">'+
   (prog.remaining===0?'♡ Votre prochain renouvellement est couvert à 100 % !':
   'Encore <strong>'+esc(dollars(prog.remaining))+'</strong> pour un renouvellement gratuit.')+
  '</div>'+
  '<div class="settings-referral-stats">'+
   '<div><strong>'+esc(v.pending_count??0)+'</strong><small>Inscriptions en attente de paiement</small></div>'+
   '<div><strong>'+esc(v.paid_count??0)+'</strong><small>Couples payants parrainés</small></div>'+
   '<div><strong>'+esc(dollars(prog.credited))+'</strong><small>Crédit du prochain renouvellement</small></div>'+
  '</div>'+
  (v.couple_ready&&url?
   '<label class="settings-referral-label" for="loveroll-referral-link">Mon lien personnel à partager</label>'+
   '<input id="loveroll-referral-link" readonly aria-label="Mon lien de référencement" value="'+esc(url)+'">'+
   '<div class="settings-referral-actions">'+
    '<button type="button" data-action="referral-copy" class="settings-primary">Copier le lien</button>'+
    '<button type="button" data-action="referral-share" class="settings-secondary">Partager</button></div>':
   '<p>Créez votre duo pour obtenir votre lien personnel.</p>')+
  '<details class="settings-referral-rules"><summary>Comment fonctionne le référencement ?</summary>'+
   '<p>1. Partagez votre lien personnel avec un nouveau couple.</p>'+
   '<p>2. Le nouveau couple crée son espace LoveRoll et s’abonne pour un an.</p>'+
   '<p>3. Après validation du paiement annuel, votre couple obtient son crédit : '+esc(reward)+' par nouveau duo, ou moins si vous approchez du plafond.</p>'+
   '<p>4. Vous voyez le rabais s’ajouter ici. Les deux partenaires partagent le même total. '+
   'Vous ne pouvez jamais dépasser la valeur d’un renouvellement annuel ('+esc(dollars(prog.max))+').</p>'+
   '<p>5. Si un code promotionnel est aussi disponible, seul le rabais le plus élevé est appliqué. En cas d’égalité, les crédits gagnent. Aucun cumul : le rabais non retenu n’est pas consommé, mais le code reste soumis à sa date d’expiration.</p>'+
   '<p>6. Une fois les crédits utilisés au renouvellement, la progression pourra recommencer pour l’année suivante.</p>'+
   '<p>Un simple compte ou un achat mensuel ne donne aucun crédit. Les inscriptions existantes, les auto-parrainages et les paiements non vérifiés ne sont pas admissibles.</p>'+
  '</details>'+
  '<small>Mode actuel : '+esc(referralModeText(v.reward_mode))+
  '. Les crédits sont enregistrés mais ne seront appliqués à une facture qu’après la connexion sécurisée du système de paiement.</small>'+
  '</section>';
}
