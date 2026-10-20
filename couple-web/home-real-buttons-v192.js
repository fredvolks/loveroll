/* LoveRoll 192 — tactile feedback on actual buttons only. */
(()=>{
 const root=document.getElementById('app');
 if(!root)return;
 const selector='.home-roll-button,.home-next-month,.nav .nav-inner>button';
 let active=null;
 const clear=()=>{active?.classList.remove('lr-is-pressed');active=null;};
 const find=e=>{
  if(!root.classList.contains('approved-home-idle'))return null;
  const button=e.target?.closest?.(selector);
  return button?.closest('#app')===root&&!button.disabled?button:null;
 };
 root.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  clear();active=find(e);active?.classList.add('lr-is-pressed');
 },{passive:true});
 for(const type of ['pointerup','pointercancel','pointerleave'])root.addEventListener(type,clear,{passive:true});
 root.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&!e.repeat){
   clear();active=find(e);active?.classList.add('lr-is-pressed');
  }
 });
 root.addEventListener('keyup',clear);
 window.addEventListener('blur',clear);
})();
