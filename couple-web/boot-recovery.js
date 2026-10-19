/* This classic script loads before the application module. It can recover the UI
   even when app.js or a dependency fails to parse (no JS module can catch that). */
(function(){
 'use strict';
 var started=Date.now(),reported=false;
 var bootMarker='[data-lr-boot]';
 function stillLoading(){
  return !!document.querySelector('#app > '+bootMarker);
 }
 function show(){
  if(reported||!stillLoading())return;
  reported=true;
  window.dispatchEvent(new Event('loveroll:boot-error'));
  var node=document.querySelector('#app');
  node.textContent='';
  var card=document.createElement('section');
  card.className='love-boot-error';
  card.setAttribute('role','alert');
  var title=document.createElement('h1');title.textContent='♡ LoveRoll ne démarre pas';
  var message=document.createElement('p');
  message.textContent='La page n’a pas pu s’ouvrir. Vos comptes, invitations et données restent enregistrés.';
  var retry=document.createElement('button');
  retry.type='button';retry.textContent='Réessayer';retry.className='boot-retry-button';
  retry.addEventListener('click',function(){
   retry.disabled=true;retry.textContent='Nouvelle tentative…';
   var url=new URL(location.href);
   url.searchParams.set('boot_retry',String(Date.now()));
   var go=function(){location.replace(url.href);};
   if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistration().then(function(reg){
     return reg?reg.update():null;
    }).catch(function(){}).finally(go);
   }else go();
  });
  card.append(title,message,retry);
  node.appendChild(card);
 }
 window.addEventListener('error',function(event){
  var msg=String(event.message||'');
  if(/SyntaxError|Invalid regular expression|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg))
   setTimeout(show,50);
 },true);
 window.addEventListener('unhandledrejection',function(event){
  if(stillLoading()){
   console.warn('LoveRoll boot rejected',String(event.reason?.name||'UnknownError'));
   setTimeout(show,500);
  }
 });
 setTimeout(show,18000);
 window.LoveRollBoot={showFailure:show,started:started};
})();
