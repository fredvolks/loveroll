export function goldArrowHtml(back=false){
 return '<span class="lr-gold-arrow'+(back?' is-back':'')+'" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5"/><path d="M9 16h14m-6-6 6 6-6 6"/></svg></span>';
}
export function enhanceGoldBacks(root){
 for(const button of root.querySelectorAll('button[data-action]')){
  if(button.closest('.nav')||button.classList.contains('lr-gold-back'))continue;
  const text=button.textContent.trim(),label=button.getAttribute('aria-label')||'';
  if(!button.matches('.settings-back,.eclat-return,.calendar-back-arrow,.evening-cal-return')&&
   !/^(?:[←‹⟵]\s*)?(?:Retour|Revenir|Voir les 12 coffrets)\b/i.test(text)&&!/^Retour\b/i.test(label))continue;
  const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode()))node.textContent=node.textContent.replace(/^[\s←‹⟵]+/,'');
  const iconOnly=!button.textContent.trim();
  if(iconOnly&&!label)button.setAttribute('aria-label','Retour');
  button.querySelectorAll('svg').forEach(n=>n.remove());
  button.querySelectorAll('span[aria-hidden="true"]').forEach(n=>{if(!n.textContent.trim()&&!n.children.length)n.remove();});
  button.insertAdjacentHTML('afterbegin',goldArrowHtml(true));
  button.classList.add('lr-gold-back');
  button.classList.toggle('is-icon-only',iconOnly);
 }
}
