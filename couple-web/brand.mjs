// One wordmark for every ritual screen.
export const ritualBrandHtml=()=>'<div class="ritual-brand" aria-label="LoveRoll"><i aria-hidden="true">♡</i><b>LoveRoll</b></div>';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// One measured header for every tab: only its caption changes.
export const ritualHeadingHtml=caption=>'<div class="ritual-heading">'+ritualBrandHtml()+
 '<span class="ritual-kicker">'+escape(caption)+'</span></div>';
