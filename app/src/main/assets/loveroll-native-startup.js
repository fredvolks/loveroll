/* Packaged with the APK and evaluated only for a committed trusted document.
   The native heart stays visible until the actual page (or recovery UI) has
   replaced every web loading layer. This also works with older cached HTML. */
(function(navigationSerial){
 'use strict';
 const key='__loveRollNativeStartup';
 const previous=window[key];
 if(previous){
  // A late callback from an aborted navigation must never relabel its old
  // document as the new navigation. Only a fresh document can get a new serial.
  if(previous.serial===navigationSerial)previous.check();
  else previous.cancel();
  return;
 }
 let cancelled=false,notified=false;
 const observer=new MutationObserver(check);
 function cancel(){cancelled=true;observer.disconnect();}
 function check(){
  if(cancelled||notified)return;
  const root=document.getElementById('app');
  const bridge=window.LoveRollNativeAuth;
  if(!root?.firstElementChild||document.querySelector('[data-lr-boot],.lr-splash')||
     typeof bridge?.splashReady!=='function')return;
  notified=true;observer.disconnect();
  bridge.splashReady(navigationSerial);
 }
 window[key]={serial:navigationSerial,check,cancel};
 observer.observe(document.documentElement,{
  childList:true,subtree:true,attributes:true,attributeFilter:['class','data-lr-boot']
 });
 check();
})
