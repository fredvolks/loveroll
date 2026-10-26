import {editorialIcon} from './editorial-ui.mjs';
// LoveRoll Web Push registration (Safari home-screen iOS/iPadOS and PWA browsers).
// Android 0.13.4 exposed a bridge getter that accessed WebView off the UI
// thread. A Java exception must NEVER prevent account sign-in or profile loads.
export function safeNativePushToken(){
 try{return typeof window!=='undefined'?String(window.LoveRollNativeAuth?.nativePushToken?.()||''):'';}
 catch(error){return '';}
}
export function safeNativePushConfigured(){
 try{return !!window?.LoveRollNativeAuth?.nativePushConfigured?.();}
 catch(error){return false;}
}
// Android WebView APK does not implement PushManager; Android uses native local reminders.
export function pushEnvironment(){
 const native=!!globalThis.window?.LoveRollNativeAuth;
 const supported=typeof navigator!=='undefined'&&'serviceWorker' in navigator&&
  typeof window!=='undefined'&&'PushManager' in window&&'Notification' in window;
 const apple=/iPhone|iPad|iPod/i.test(navigator?.userAgent||'')||
  (navigator?.platform==='MacIntel'&&navigator?.maxTouchPoints>1);
 const standalone=!!(navigator?.standalone||window?.matchMedia?.('(display-mode: standalone)')?.matches);
 return {native,supported,apple,standalone,permission:
  typeof Notification==='undefined'?'unsupported':Notification.permission};
}
const decodeBase64Url=(value)=>{
 const s=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 return Uint8Array.from(s,c=>c.charCodeAt(0));
};
const encodeB64=buffer=>btoa(String.fromCharCode(...new Uint8Array(buffer)));
export async function enablePush(client,userId){
 const e=pushEnvironment();
 if(e.native){
  if(!safeNativePushConfigured())
   throw Error('Les notifications à distance ne sont pas disponibles dans cette version de LoveRoll.');
  const token=await new Promise((resolve,reject)=>{
   const listener=event=>{clearTimeout(timeout);window.removeEventListener('loveroll-native-push-token',listener);resolve(event.detail?.token);};
   const timeout=setTimeout(()=>{
    window.removeEventListener('loveroll-native-push-token',listener);
    reject(Error('Activation non confirmée par votre téléphone. Vérifiez les autorisations de notification et votre connexion.'));
   },25000);
   window.addEventListener('loveroll-native-push-token',listener,{once:true});
   window.LoveRollNativeAuth.enableRemotePush();
  });
  if(!token)throw Error('Activation non confirmée par votre téléphone. Réessayez.');
  const {error:claimError}=await client.rpc('love_claim_native_push_token',{p_token:token});
  if(claimError)throw claimError;
  const {error:prefError}=await client.from('love_push_preferences')
   .upsert({user_id:userId,enabled:true},{onConflict:'user_id'});
  if(prefError)throw prefError;
  // The remote weekly push replaces the local Monday reminder: no doubles.
  window.LoveRollNativeAuth?.disableWeeklyReminder?.();
  return true;
 }
 if(!e.supported)throw Error('Ce navigateur ne prend pas en charge les notifications push.');
 if(e.apple&&!e.standalone)throw Error('Sur iPhone/iPad, ajoutez LoveRoll à l’écran d’accueil depuis Safari, puis rouvrez-le.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw Error('Notifications refusées. Autorisez LoveRoll dans les réglages de votre appareil.');
 const {data:publicKey,error:keyError}=await client.rpc('love_push_public_key');
 if(keyError||!publicKey)throw Error('Service push non disponible. Réessayez après quelques instants.');
 const registration=await navigator.serviceWorker.register('./service-worker.js');
 await navigator.serviceWorker.ready;
 let subscription=await registration.pushManager.getSubscription();
 if(!subscription)subscription=await registration.pushManager.subscribe({
  userVisibleOnly:true,applicationServerKey:decodeBase64Url(publicKey)
 });
 const json=subscription.toJSON();
 if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)
  throw Error('Abonnement push incomplet : réessayez.');
 const {error:saveError}=await client.from('love_push_subscriptions').upsert({
  user_id:userId,endpoint:json.endpoint,p256dh:json.keys.p256dh,auth_key:json.keys.auth,
  user_agent:navigator.userAgent.slice(0,240)
 },{onConflict:'user_id,endpoint'});
 if(saveError)throw saveError;
 const {error:prefError}=await client.from('love_push_preferences')
  .upsert({user_id:userId,enabled:true},{onConflict:'user_id'});
 if(prefError)throw prefError;
 return true;
}
export async function disablePush(client,userId){
 const e=pushEnvironment();
 if(e.native){
  const token=safeNativePushToken();
  if(token){
   const {error:rm}=await client.from('love_push_native_devices')
    .delete().eq('user_id',userId).eq('device_token',token);
   if(rm)throw rm;
  }
  window.LoveRollNativeAuth?.disableRemotePush?.();
 }else if(e.supported){
  try{const reg=await navigator.serviceWorker.ready;await (await reg.pushManager.getSubscription())?.unsubscribe();}catch{}
 }
 const {error:a}=await client.from('love_push_subscriptions').delete().eq('user_id',userId);
 if(a)throw a;
 const {error:b}=await client.from('love_push_preferences').upsert({user_id:userId,enabled:false},{onConflict:'user_id'});
 if(b)throw b;
 return true;
}
export async function updatePushPreference(client,userId,current,kind,enabled){
 if(!['weekly','invitation','monthly','special'].includes(kind))throw Error('Notification inconnue.');
 const {error}=await client.from('love_push_preferences').upsert({
  user_id:userId,enabled:current.enabled===true,[kind]:enabled
 },{onConflict:'user_id'});
 if(error)throw error;
}
export async function sendTestPush(client){
 const {data,error}=await client.rpc('love_push_test_me');
 if(error)throw error;
 return data;
}
// A preference is shared by the account; a subscription belongs to this device.
export async function currentPushDevice(client=null,userId=null){
 const e=pushEnvironment();
 try{
  if(e.native){
   const token=safeNativePushToken();let registered=safeNativePushConfigured()&&!!token;
   if(registered&&client&&userId){const {data,error}=await client.from('love_push_native_devices').select('device_token').eq('user_id',userId).eq('device_token',token);registered=!error&&data?.length>0;}
   return {registered,permission:'native',native:true};
  }
  if(!e.supported||e.permission!=='granted')return {registered:false,permission:e.permission,native:false};
  const registration=await navigator.serviceWorker.getRegistration();
  const subscription=await registration?.pushManager?.getSubscription();let registered=!!subscription;
  if(registered&&client&&userId){const {data,error}=await client.from('love_push_subscriptions').select('endpoint').eq('user_id',userId).eq('endpoint',subscription.endpoint);registered=!error&&data?.length>0;}
  return {registered,permission:e.permission,native:false};
 }catch{return {registered:false,permission:e.native?'native':e.permission,native:e.native};}
}
export function notificationSettingsMarkup(prefs={},device=null){
 const e=pushEnvironment(),enabled=!!prefs.enabled;
 const active=enabled&&device?.registered===true&&(e.native?safeNativePushConfigured()&&!!safeNativePushToken():e.permission==='granted');
 const categories=[['weekly','Dé hebdomadaire','Quand le dé est prêt','dice'],['invitation','Invitation acceptée','Votre partenaire vous rejoint','heart'],['monthly','Activité du mois','Au début du mois','star'],['special','Événements spéciaux','À l’approche de vos dates','calendar']];
 const action=(key,label,secondary=false)=>'<button type="button" class="'+(secondary?'settings-signout':'settings-primary')+' notification-action" data-action="'+key+'">'+label+'</button>';
 let status='',detail='',actions='',localReminder='',state='inactive',statusIcon='bell';
 if(e.native){
  const local=!!window.LoveRollNativeAuth?.weeklyReminderEnabled?.(),configured=safeNativePushConfigured();
  state=active?'active':configured?'inactive':'update';
  status=active?'Activées sur cet appareil':configured?'Un rappel au bon moment':'Mise à jour nécessaire';
  detail=active?'Choisissez les moments pour lesquels recevoir une alerte.':configured?'Activez les alertes pour retrouver vos moments à deux.':'Mettez LoveRoll à jour pour recevoir toutes les alertes.';
  actions=configured?(active?action('push-test','Envoyer un test')+action('push-disable','Désactiver',true):action('push-enable','Activer les notifications')):'';
  localReminder='<div class="notification-local"><span class="notification-row-icon">'+editorialIcon('clock')+'</span>'+
   '<span class="notification-choice-copy"><strong>Rappel du lundi</strong><small>À 9 h, sur ce téléphone</small></span>'+
   '<button type="button" class="notification-local-switch" role="switch" aria-checked="'+local+'" aria-label="Rappel du lundi à 9 h" data-action="'+(local?'native-notify-disable':'native-notify-enable')+'"><span aria-hidden="true"></span></button></div>';
 }else if(e.apple&&!e.standalone){
  state='install';statusIcon='home';status='Ajoutez LoveRoll à l’accueil';detail='Sur iPhone ou iPad, ouvrez ensuite LoveRoll depuis son icône pour activer les alertes.';
  actions=action('show-install-guide','Voir comment l’ajouter');
 }else if(!e.supported){state='unsupported';statusIcon='phone';status='Indisponibles ici';detail='Ouvrez LoveRoll dans l’application ou dans un navigateur compatible avec les notifications.';}
 else{
  state=active?'active':e.permission==='denied'?'denied':enabled?'device':'inactive';
  status=active?'Activées sur cet appareil':state==='denied'?'Autorisation nécessaire':enabled?'À activer sur cet appareil':'Un rappel au bon moment';
  detail=active?'Choisissez les moments pour lesquels recevoir une alerte.':state==='denied'?'Autorisez LoveRoll dans les réglages du navigateur, puis réessayez.':enabled?'Vos choix sont conservés. Activez les alertes ici pour les recevoir.':'Activez les alertes pour retrouver vos moments à deux.';
  actions=(active?action('push-test','Envoyer un test'):action('push-enable',state==='denied'?'Réessayer l’activation':'Activer sur cet appareil'))+
   (enabled?action('push-disable','Désactiver',true):'');
 }
 return '<section class="notification-settings" data-notification-state="'+state+'">'+
 '<div class="push-status notification-summary" role="status"><span class="notification-emblem">'+editorialIcon(statusIcon)+'</span><div><strong>'+status+'</strong><p>'+detail+'</p></div></div>'+
 '<section class="notification-choices" aria-labelledby="notification-choices-title"><div class="notification-section-heading"><h2 id="notification-choices-title">Mes alertes</h2><span>'+(active?'À votre rythme':'Choix conservés')+'</span></div>'+
 '<div class="push-options notification-options">'+categories.map(([key,title,desc,icon])=>'<label class="push-option notification-option"><span class="notification-row-icon">'+editorialIcon(icon)+'</span><span class="notification-choice-copy"><strong>'+title+'</strong><small>'+desc+'</small></span>'+
 '<input class="notification-toggle" type="checkbox" role="switch" data-push-option="'+key+'"'+(prefs[key]!==false?' checked':'')+(!active?' disabled':'')+' aria-label="'+title+'"></label>').join('')+'</div></section>'+
 localReminder+(actions?'<div class="push-actions notification-actions">'+actions+'</div>':'')+
 '<p id="notification-feedback" class="notification-feedback" role="status" aria-live="polite" hidden></p>'+
 '<p class="tiny-note notification-privacy">'+editorialIcon('lock')+'<span>Le contenu de vos surprises reste privé.</span></p></section>';
}
