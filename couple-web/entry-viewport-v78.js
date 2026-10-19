/* LoveRoll v78: viewport-fitted invite/auth surface (Chrome, Messenger, Safari).
   Fallback for stale CSS/layout when the browser chrome reduces visible height.
   No auth state, session storage, API or form fields are modified. */
(function(){
 'use strict';
 var pending=false, fitted=null, previousRootOverflow='';
 function schedule(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(function(){pending=false;fit();});
 }
 function reset(el){
  if(!el)return;
  for(var key of ['height','max-height','min-height','overflow','width','max-width','transform','transform-origin','display','flex-direction'])
   el.style.removeProperty(key);
  var card=el.querySelector('.invite-auth-card');
  if(card)for(var p of ['height','max-height','min-height','overflow','flex'])card.style.removeProperty(p);
 }
 function fit(){
  var root=document.getElementById('app');
  if(!root)return;
  var isMobile=matchMedia('(max-width:767px)').matches;
  var el=isMobile?root.querySelector('.invite-account-screen:not(.invite-profile-screen),.love-discover.discover-v59'):null;
  if(!el){
   if(fitted){reset(fitted);fitted=null;}
   root.classList.remove('lr-entry-no-scroll');
   document.documentElement.classList.remove('lr-entry-no-scroll');
   document.body.classList.remove('lr-entry-no-scroll');
   return;
  }
  if(fitted&&fitted!==el)reset(fitted);
  fitted=el;
  root.classList.add('lr-entry-no-scroll');
  document.documentElement.classList.add('lr-entry-no-scroll');
  document.body.classList.add('lr-entry-no-scroll');
  var viewport=Math.max(220,Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight));
  // Measure natural, complete form content: the previous flex card clipped it.
  reset(el);
  el.style.setProperty('display','flex','important');
  el.style.setProperty('flex-direction','column','important');
  el.style.setProperty('height','auto','important');
  el.style.setProperty('min-height','0','important');
  el.style.setProperty('max-height','none','important');
  el.style.setProperty('overflow','visible','important');
  el.style.setProperty('width','100%','important');
  el.style.setProperty('max-width','none','important');
  var card=el.querySelector('.invite-auth-card');
  if(card){
   card.style.setProperty('flex','0 0 auto','important');
   card.style.setProperty('height','auto','important');
   card.style.setProperty('max-height','none','important');
   card.style.setProperty('min-height','0','important');
   card.style.setProperty('overflow','visible','important');
  }
  var rect=el.getBoundingClientRect();
  var natural=Math.max(el.scrollHeight,Math.ceil(rect.height));
  var padding=5;
  var available=Math.max(200,viewport-rect.top-padding);
  var ratio=Math.min(1,available/Math.max(1,natural));
  // On an already compact display preserve normal-size accessible controls.
  if(ratio<.995){
   var factor=Math.max(.35,Math.floor(ratio*1000)/1000);
   // Enlarging CSS width compensates for scaling it visually.
   el.style.setProperty('width',(100/factor).toFixed(3)+'%','important');
   el.style.setProperty('transform','scale('+factor+')','important');
   el.style.setProperty('transform-origin','top left','important');
   // Content may change line wraps after sizing; refine against real bottom.
   var childBottom=0;
   for(var child of el.children){
    var b=child.getBoundingClientRect();
    childBottom=Math.max(childBottom,b.bottom);
   }
   if(childBottom>viewport-1){
    factor*=Math.max(.35,(viewport-rect.top-3)/Math.max(1,childBottom-rect.top));
    el.style.setProperty('width',(100/factor).toFixed(3)+'%','important');
    el.style.setProperty('transform','scale('+factor.toFixed(4)+')','important');
   }
  }
  // Chrome may have retained scroll from the previous authentication mode.
  if(window.scrollY>0)window.scrollTo(0,0);
  if(root.scrollTop>0)root.scrollTop=0;
  if(document.body.scrollTop>0)document.body.scrollTop=0;
 }
 function init(){
  var root=document.getElementById('app');
  if(!root)return;
  new MutationObserver(schedule).observe(root,{childList:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  document.fonts?.ready?.then(schedule).catch(function(){});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.LoveRollEntryFit={refresh:schedule};
})();
