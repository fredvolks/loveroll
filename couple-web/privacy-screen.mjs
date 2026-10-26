// LR-025 — visual privacy shield scoped to this browser/device.
// This module only masks presentation; never calls game RPCs or modifies timers.
export const PRIVACY_STORAGE_KEY='loveroll-privacy-mask-v1';
export const shouldRestorePrivacy=storage=>{
 try{return storage?.getItem(PRIVACY_STORAGE_KEY)==='1';}catch{return false;}
};
export function startLoveRollPrivacy({doc=globalThis.document,storage=globalThis.localStorage}={}){
 if(!doc?.body)return ()=>{};
 const html=doc.documentElement;
 const app=doc.getElementById('app');
 const initialAriaHidden=app?.getAttribute('aria-hidden');
 if(doc.querySelector('[data-lr-privacy-screen]'))return ()=>{};
 const shield=doc.createElement('section');
 shield.className='lr-privacy-screen';
 shield.setAttribute('data-lr-privacy-screen','');
 shield.setAttribute('role','dialog');
 shield.setAttribute('aria-modal','true');
 shield.setAttribute('aria-label','LoveRoll masqué');
 shield.innerHTML='<div class="lr-privacy-panel">'+
  '<img src="./assets/loveroll-wordmark-v127.svg" alt="LoveRoll" width="180" height="55">'+
  '<p>Votre espace est masqué.</p>'+
  '<button type="button" data-lr-privacy-reveal>Revenir au jeu</button>'+
  '</div>';
 doc.body.append(shield);
 const reveal=shield.querySelector('[data-lr-privacy-reveal]');
 let previousTitle=doc.title,originalInert=!!app?.inert,opener=null;
 const apply=(masked,save=true)=>{
  if(save){try{storage?.setItem(PRIVACY_STORAGE_KEY,masked?'1':'0');}catch{}}
  html.classList.toggle('lr-privacy-active',masked);
  if(masked){
   shield.removeAttribute('aria-hidden');
   previousTitle=doc.title==='LoveRoll'?previousTitle:doc.title;
   doc.title='LoveRoll';
   if(app){app.inert=true;app.setAttribute('aria-hidden','true');}
   reveal.focus({preventScroll:true});
  }else{
   shield.setAttribute('aria-hidden','true');
   if(app){app.inert=originalInert;initialAriaHidden===null?app.removeAttribute('aria-hidden'):app.setAttribute('aria-hidden',initialAriaHidden);}
   doc.title=previousTitle;
   const target=opener?.isConnected?opener:app?.querySelector?.('[data-lr-privacy-hide]');
   if(target?.focus)target.focus({preventScroll:true});
  }
 };
 const onClick=event=>{
  const hide=event.target?.closest?.('[data-lr-privacy-hide]');
  if(hide){
   event.preventDefault();
   event.stopImmediatePropagation();
   opener=hide;
   if(!html.classList.contains('lr-privacy-active'))apply(true);
   return;
  }
  if(event.target?.closest?.('[data-lr-privacy-reveal]')){
   event.preventDefault();
   event.stopImmediatePropagation();
   apply(false);
  }
 };
 const onKey=event=>{
  if(!html.classList.contains('lr-privacy-active'))return;
  if(event.key==='Tab'){event.preventDefault();reveal.focus({preventScroll:true});}
  if(event.key==='Escape'||event.key==='Backspace')event.preventDefault();
  // Never let Escape close an underlying challenge while visually masked.
  event.stopImmediatePropagation();
 };
 doc.addEventListener('click',onClick,true);
 doc.addEventListener('keydown',onKey,true);
 if(shouldRestorePrivacy(storage)||html.classList.contains('lr-privacy-active'))apply(true,false);
 else shield.setAttribute('aria-hidden','true');
 return ()=>{
  doc.removeEventListener('click',onClick,true);
  doc.removeEventListener('keydown',onKey,true);
  shield.remove();
 };
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>startLoveRollPrivacy(),{once:true});
 }else startLoveRollPrivacy();
}
