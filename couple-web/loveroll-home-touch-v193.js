/* Shared tactile state for native LoveRoll controls. Actions remain owned by
   their real buttons; this adds only the visual press and its release. */
(()=>{
 const root=document.getElementById('app');if(!root)return;
 const held=new Set(),timers=new WeakMap();
 const match=e=>e.target?.closest?.('button.lr-ruby-control,button.lr-ruby-tab,button.home-roll-button,button.home-next-month,.nav .nav-inner>button');
 const down=e=>{
  if(e.isPrimary===false||e.button>0||e.repeat)return;
  const button=match(e);if(!button||button.disabled)return;
  clearTimeout(timers.get(button));held.add(button);button.classList.add('lr-pressed');
 };
 const release=(immediate=false)=>{
  for(const button of held){
   clearTimeout(timers.get(button));
   if(immediate)button.classList.remove('lr-pressed');
   else timers.set(button,setTimeout(()=>button.classList.remove('lr-pressed'),105));
  }
  held.clear();
 };
 root.addEventListener('pointerdown',down,{passive:true});
 window.addEventListener('pointerup',()=>release(),{passive:true});
 window.addEventListener('pointercancel',()=>release(true),{passive:true});
 window.addEventListener('blur',()=>release(true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release(true);});
 root.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')down(e);});
 window.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')release();});
})();
