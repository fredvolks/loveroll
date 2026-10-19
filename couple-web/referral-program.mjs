// LoveRoll: each partner owns a permanent personal referral wallet.
// The present duo pools available balances only when paying an annual renewal.
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
  wallet_credit:'solde personnel LoveRoll (utilisation limitée à un an par renouvellement)',
  manual:'avantage personnel traité par LoveRoll (limite au renouvellement)'}[mode]||'crédit LoveRoll';
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
  '<h3>Vos invitations, vos crédits</h3>'+
  '<p>Chaque nouveau couple qui s’inscrit par votre lien et paie son <strong>premier abonnement annuel</strong> rapporte jusqu’à <strong>'+
   esc(reward)+'</strong> à votre compte personnel. Vos crédits vous suivent si vous changez de partenaire. Au renouvellement, les deux soldes sont réunis, avec un maximum d’une année gratuite par facture.</p>'+
  '<div class="settings-referral-progress-head"><strong>'+esc(dollars(prog.credited))+
  ' <span>/ '+esc(dollars(prog.max))+'</span></strong>'+
  '<span>'+esc(prog.percentage)+' %</span></div>'+
  '<div class="settings-referral-progress-track" role="progressbar" aria-label="Rabais accumulé pour notre prochain renouvellement" aria-valuemin="0" aria-valuemax="'+prog.max+'" aria-valuenow="'+prog.credited+'">'+
  '<div class="settings-referral-progress-fill" style="width:'+prog.percentage+'%"></div></div>'+
  '<div class="settings-referral-due">'+
   (prog.remaining===0?'♡ Votre prochain renouvellement est couvert à 100 % !':
   'Encore <strong>'+esc(dollars(prog.remaining))+'</strong> pour un renouvellement gratuit.')+
  '</div>'+
  '<div class="settings-referral-wallets" aria-label="Nos soldes de référencement">'+
   '<div><small>Mon solde personnel</small><strong>'+esc(dollars(v.personal_balance_cad_cents??0))+'</strong></div>'+
   '<div><small>Solde de mon partenaire</small><strong>'+esc(dollars(v.partner_balance_cad_cents??0))+'</strong></div>'+
   '<div><small>Solde du couple</small><strong>'+esc(dollars(v.combined_balance_cad_cents??v.available_cad_cents??0))+'</strong></div>'+
   '<div><small>Crédit conservé après un renouvellement gratuit</small><strong>'+esc(dollars(v.surplus_cad_cents??0))+'</strong></div>'+
  '</div>'+ 
  '<div class="settings-referral-stats">'+
   '<div><strong>'+esc(v.pending_count??0)+'</strong><small>Inscriptions en attente de paiement</small></div>'+
   '<div><strong>'+esc(v.paid_count??0)+'</strong><small>Couples payants parrainés</small></div>'+
   '<div><strong>'+esc(dollars(prog.credited))+'</strong><small>Applicable au renouvellement</small></div>'+
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
   '<p>3. Après validation du premier paiement annuel, votre compte personnel reçoit '+esc(reward)+' par nouveau duo admissible.</p>'+
   '<p>4. Au renouvellement, les deux soldes personnels se combinent. La facture peut être réduite d’au plus '+esc(dollars(prog.max))+', soit une année. Les crédits excédentaires restent disponibles.</p>'+
   '<p>5. Si un code promotionnel est aussi disponible, seul le rabais le plus élevé est appliqué. En cas d’égalité, les crédits gagnent. Aucun cumul : le rabais non retenu n’est pas consommé, mais le code reste soumis à sa date d’expiration.</p>'+
   '<p>6. Le montant utilisé est partagé aussi équitablement que possible entre les deux membres. Chacun garde son solde restant, même en cas de séparation ou de nouveau couple.</p>'+
   '<p>Un simple compte ou un achat mensuel ne donne aucun crédit. Les inscriptions existantes, les auto-parrainages et les paiements non vérifiés ne sont pas admissibles.</p>'+
  '</details>'+
  '<small>Mode actuel : '+esc(referralModeText(v.reward_mode))+
  '. Les crédits sont enregistrés mais ne seront appliqués à une facture qu’après la connexion sécurisée du système de paiement.</small>'+
  '</section>';
}
