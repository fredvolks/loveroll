/* One reusable glass-heart splash, independent of Supabase and app.js.
   The boot splash is literal HTML so it paints before JS loads.
   Secondary loads wait 150 ms to avoid flashing on fast navigation. */
(function(){
 'use strict';
 const root=document.getElementById('app');
 const boot=root?.querySelector('[data-lr-boot]');
 const template=boot?.outerHTML||'';
 let nextId=0;
 const pending=new Map();
 let overlay=null;
 let leaving=null;
 let failed=false;
 function removeAfterFade(target){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){target.remove();return;}
  target.classList.add('lr-splash--leaving');
  target.setAttribute('aria-hidden','true');
  const remove=()=>target.remove();
  target.addEventListener('transitionend',remove,{once:true});
  window.setTimeout(remove,260);
 }
 // Fade AFTER real initialization renders its destination. No minimum wait;
 // the outgoing layer never intercepts touches on the application underneath.
 if(boot){
  const observer=new MutationObserver(()=>{
   if(boot.isConnected)return;
   observer.disconnect();
   // The APK keeps its original local heart until this real destination paints.
   // Reattaching an HTML heart here would expose a second logo/animation beneath
   // the native fade. Browsers and older APKs still use their usual Web fade.
   if(failed||typeof window.LoveRollNativeAuth?.splashReady==='function'||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   boot.removeAttribute('data-lr-boot');boot.classList.remove('lr-splash--boot');
   document.body.appendChild(boot);removeAfterFade(boot);
  });
  observer.observe(root,{childList:true});
 }
 window.addEventListener('loveroll:boot-error',()=>{
  failed=true;
  for(const ticket of pending.values())window.clearTimeout(ticket.timer);
  pending.clear();overlay?.remove();leaving?.remove();overlay=null;leaving=null;
  document.querySelectorAll('.lr-splash--leaving').forEach(el=>el.remove());
 });
 function createOverlay(){
  if(!template)return null;
  const host=document.createElement('div');host.innerHTML=template;
  const el=host.firstElementChild;
  el.removeAttribute('data-lr-boot');
  el.classList.remove('lr-splash--boot');
  el.classList.add('lr-splash--overlay');
  el.setAttribute('aria-label','Chargement LoveRoll');
  return el;
 }
 function reveal(){
  if(failed)return;
  if(document.querySelector('[data-lr-boot]'))return;
  if(overlay)return;
  if(leaving){leaving.remove();leaving=null;}
  overlay=createOverlay();
  if(overlay)document.body.appendChild(overlay);
 }
 function closeOverlay(){
  if(!overlay)return;
  const target=overlay;overlay=null;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   target.remove();return;
  }
  target.classList.add('lr-splash--leaving');
  leaving=target;
  const remove=()=>{target.remove();if(leaving===target)leaving=null;};
  target.addEventListener('transitionend',remove,{once:true});
  window.setTimeout(remove,340);
 }
 function begin(delay=150){
  const id=++nextId;
  const ticket={id};
  const wait=Number.isFinite(Number(delay))?Math.max(0,Number(delay)):150;
  ticket.timer=window.setTimeout(()=>{ticket.timer=null;if(pending.has(id))reveal();},wait);
  pending.set(id,ticket);
  return id;
 }
 function end(id){
  const ticket=pending.get(id);if(!ticket)return;
  if(ticket.timer!==null)window.clearTimeout(ticket.timer);
  pending.delete(id);
  if(pending.size===0)closeOverlay();
 }
 async function during(promiseOrWork,delay=150){
  const id=begin(delay);
  try{return await (typeof promiseOrWork==='function'?promiseOrWork():promiseOrWork);}
  finally{end(id);}
 }
 // The app, auth recovery and re-sync may all render while asynchronous loads
 // settle. Mutation observations are not used: they would hide a true loading
 // state whenever a harmless UI re-render occurs.
 window.LoveRollLoader={begin,end,during};
})();
