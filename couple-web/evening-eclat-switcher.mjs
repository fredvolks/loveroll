// Shared LoveRoll Soirée / Éclat Premium selector.
// Navigation only: it never rolls dice, modifies challenges, or starts payment.
export function eveningEclatSwitcher(selected='session'){
 const session=selected!=='eclat';
 return '<nav class="ritual-mode-switcher" aria-label="Choisir notre expérience">'+
  '<button type="button" class="ritual-mode-tab'+(session?' is-active':'')+'" data-action="tab:session"'+
   (session?' aria-current="page"':'')+'>'+
   '<span class="ritual-mode-icon" aria-hidden="true">☾</span>'+
   '<span class="ritual-mode-name">Notre soirée</span></button>'+
  '<button type="button" class="ritual-mode-tab ritual-mode-premium'+(!session?' is-active':'')+
   '" data-action="tab:eclat"'+(!session?' aria-current="page"':'')+'>'+
   '<span class="ritual-mode-icon" aria-hidden="true">✧</span>'+
   '<span class="ritual-premium-copy"><strong>Éclat <span class="ritual-crown" aria-hidden="true">♛</span></strong>'+
   '<small>PREMIUM</small></span></button></nav>';
}
