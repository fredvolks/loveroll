// Best-effort external browser link for a user tapping directly inside Messenger.
// iOS Safari has no supported web deep link, so never advertise an automatic launch.
export function chromeIntentForInvite(href){
 let url;
 try{url=new URL(href);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.hash)return null;
 // Never let a literal semicolon inside a query value alter the Intent syntax.
 const path=url.host+url.pathname+url.search.replaceAll(';','%3B');
 return 'intent://'+path+'#Intent;scheme=https;package=com.android.chrome;'+
  'action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;'+
  'S.browser_fallback_url='+encodeURIComponent(url.href)+';end';
}
export function messengerExternalBrowserHtml(url,{ios=false}={}){
 const intent=ios?null:chromeIntentForInvite(url);
 const main=intent?
  '<a class="messenger-browser-primary" href="'+escapeHtml(intent)+'" rel="external">'+
  '↗ Ouvrir dans Chrome</a>':
  '<button type="button" class="messenger-browser-primary" data-action="copy-invite-for-browser">'+
  (ios?'↗ Copier pour Safari':'↗ Copier le lien pour le navigateur')+'</button>';
 return '<aside class="messenger-browser-handoff" aria-label="Ouvrir l’invitation hors de Messenger">'+
  '<strong>Votre invitation, dans votre navigateur</strong>'+
  main+
  '<details><summary><span class="messenger-help-label">Ça ne s’ouvre pas ?</span><span aria-hidden="true">?</span></summary>'+
  '<p>'+ (ios?
   'Safari ne peut pas être ouvert automatiquement depuis Messenger. Copiez le lien, puis ouvrez Safari et collez-le dans la barre d’adresse.':
   'Si Messenger bloque Chrome, ouvrez le menu ⋯ de Messenger et choisissez « Ouvrir dans le navigateur ». Sinon, copiez le lien et collez-le dans Chrome.')+'</p>'+
  '<button class="messenger-browser-copy" type="button" data-action="copy-invite-for-browser">Copier mon invitation</button>'+
  '</details></aside>';
}
function escapeHtml(value){
 return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
