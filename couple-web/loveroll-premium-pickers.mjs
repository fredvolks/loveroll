// LoveRoll premium native-select replacement for connected Settings only.
// Keeps the original <select> in the DOM, so every existing save and validation
// handler receives the exact same value. A branded accessible modal replaces the
// inconsistent grey platform popup without exposing new preferences.
const safeString=value=>String(value??'');
function openPicker(select,trigger){
 const dialog=document.createElement('dialog');
 dialog.className='lr-premium-picker-dialog';
 const card=document.createElement('div');card.className='lr-premium-picker-card';
 const head=document.createElement('header');head.className='lr-premium-picker-header';
 const title=document.createElement('h2');
 const label=select.closest('label');
 const caption=label?.querySelector('span')?.textContent||
  label?.childNodes?.[0]?.textContent?.trim()||select.getAttribute('aria-label')||'Choisir une option';
 title.textContent=caption;
 const close=document.createElement('button');close.type='button';close.className='lr-picker-close';
 close.setAttribute('aria-label','Fermer les choix');close.textContent='✕';
 head.append(title,close);
 const options=document.createElement('div');options.className='lr-picker-options';
 const entries=[...select.options].filter(o=>!o.disabled&&!o.hidden);
 for(const opt of entries){
  const b=document.createElement('button');b.type='button';b.className='lr-picker-choice';
  b.dataset.value=opt.value;
  b.textContent=opt.textContent||opt.label;
  b.setAttribute('aria-pressed',opt.value===select.value?'true':'false');
  if(opt.value===select.value)b.classList.add('selected');
  b.addEventListener('click',()=>{
   select.value=opt.value;
   select.dispatchEvent(new Event('input',{bubbles:true}));
   select.dispatchEvent(new Event('change',{bubbles:true}));
   trigger.querySelector('.lr-premium-picker-value').textContent=
    select.selectedOptions[0]?.textContent||'Choisir';
   dialog.close();
  });
  options.append(b);
 }
 card.append(head,options);dialog.append(card);
 document.body.append(dialog);
 const destroy=()=>{dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});};
 dialog.addEventListener('close',destroy,{once:true});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 close.addEventListener('click',()=>dialog.close());
 try{dialog.showModal();options.querySelector('.selected')?.scrollIntoView({block:'nearest'});}
 catch{dialog.remove();select.focus();select.click();}
}
export function enhanceLoveRollSettingsSelects(root){
 if(!root?.classList?.contains('loveroll-settings-page'))return;
 for(const select of root.querySelectorAll('.settings-detail-body select')){
  if(select.closest('.lr-premium-picker-control')||select.disabled)continue;
  if(select.dataset.premiumPicker==='ready')continue;
  select.dataset.premiumPicker='ready';
  const control=document.createElement('span');control.className='lr-premium-picker-control';
  select.parentNode.insertBefore(control,select);
  control.append(select);
  const trigger=document.createElement('button');trigger.type='button';
  trigger.className='lr-premium-picker-trigger';
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-label','Choisir : '+safeString(select.getAttribute('aria-label')||select.closest('label')?.textContent?.trim()||'option'));
  const value=document.createElement('span');value.className='lr-premium-picker-value';
  value.textContent=select.selectedOptions?.[0]?.textContent||'Choisir';
  const chev=document.createElement('span');chev.className='lr-premium-picker-chevron';chev.setAttribute('aria-hidden','true');chev.textContent='⌄';
  trigger.append(value,chev);control.append(trigger);
  select.addEventListener('change',()=>{value.textContent=select.selectedOptions?.[0]?.textContent||'Choisir';});
  trigger.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openPicker(select,trigger);});
 }
}
