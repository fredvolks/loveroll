// LoveRoll v87: no floating in-app banners; keep offline loading and push.
const CACHE='loveroll-static-v254';
const SHELL=['./evening-invitation.mjs','./evening-invitation.css','./evening-resume.mjs','./evening-category-confirm.mjs','./evening-category-confirm.css','./timed-evening-completion.mjs','./privacy-screen.mjs','./privacy-screen.css','./ios-install-tour.mjs','./ios-install-tour.css','./loveroll-sounds.mjs','./mobile-ios-polish-v229.css','./settings-menus.css','./settings-menus.mjs','./shared-stage.mjs','./uniform-submenus.css','./evening-d6-template.css','./evening-d100-template.mjs','./evening-d100-template.css','./lr001-d100-entry-parity-v244.css','./surprise-minimal.mjs','./surprise-minimal.css','./evening-d6-template.mjs','./eclat-guidance.mjs','./eclat-guided-ui.mjs','./eclat-guided.css','./ritual-mode-shared.css','./assets/eclat-night-atlas-v218.webp','./gold-arrows.mjs','./gold-arrows.css','./eclat-night-gallery.css','./eclat-history.mjs','./calendar-ruby-template.css','./soiree-home-template.mjs','./soiree-home-template.css','./ruby-surfaces.css','./home-duo-card.css','./ipad-android-stage-v236.css','./ipad-soiree-one-photo-v237.css','./monthly-invitation.mjs','./ruby-controls.css','./assets/fonts/cormorant-garamond-latin.woff','./assets/loveroll-home-portrait-v202.webp','./loveroll-android-ruby-v194.css','./assets/loveroll-romance-android-v194.webp','./assets/loveroll-romance-android-v195.webp','./assets/loveroll-romance-landscape-v195.webp','./assets/loveroll-marble-v194.webp','./assets/loveroll-pedestal-03-v198.webp','./assets/loveroll-home-portrait-v199.webp','./assets/loveroll-home-portrait-v200.webp','./assets/loveroll-home-portrait-v201.webp','./assets/loveroll-home-landscape-v199.webp','./loveroll-home-native-v193.css','./loveroll-home-touch-v193.js','./home-real-buttons-v192.css','./home-real-buttons-v192.js','./approved-home-crisp-v191.css','./approved-home-crisp-v191.js','./approved-home-idle-v190.css','./approved-home-idle-v190.js','./assets/home-reference-approved-v190.webp','./loveroll-home-parity-v187.css','./loveroll-home-reference-v186.css','./loveroll-eclat-fidelity-v184.css','./loveroll-cinematic-v183.css','./assets/loveroll-romance-scene-v183.webp','./assets/eclat-photo-strip-v183.webp','./assets/eclat-secret-letter-v183.webp','./loveroll-ruby-buttons-v182.css','./loveroll-nav-home-v181.css','./loveroll-layout-fixes-v180.css','./account-preview-mode.mjs','./assets/eclat-photo-strip.webp','./eclat-photo-gallery-v179.css','./evening-eclat-switcher.css','./evening-eclat-switcher.mjs','./eclat.css',
  './bubble-centering.css','./eclat-catalog.mjs','./eclat-scenes-a.mjs','./eclat-scenes-b.mjs','./eclat-ui.mjs','./eclat-audio.mjs','./loveroll-premium-pickers.mjs','./referral-program.mjs','./monthly-geo-ui.mjs','./monthly-geo-ui.css','./world-preferences.mjs','./currency-exchange.mjs','./assets/loveroll-messenger-og-v142.jpg','./controls-rose-v141.css','./entry-ritual-v139.css','./assets/loveroll-invitation-scene-v139.webp','./assets/loveroll-messenger-og-v139.png','./ritual-scenes.css','./ritual-titles.css','./assets/loveroll-wordmark-v127.svg','./assets/loveroll-loading-caption-v127.svg','./notification-design-v127.css','./waiting-invitation-v127.css','./occasion-details-v127.css','./web-dialogs-v127.css','./legacy-session-v127.css','./assets/loveroll-glass-heart-v123.webp','./assets/loveroll-splash-satin-v123.webp','./json-library-ui.mjs','./json-libraries.mjs','./editorial-ui.mjs','./editorial-editors.mjs','./editorial-details.css','./brand.mjs','./evening-editorial.css','./assets/ritual-satin-v115.webp','./','./index.html','./app.js','./boot-recovery.js','./styles.css','./premium-theme.css','./premium-home.css','./premium-couple-pages.css','./premium-dialogs.css','./premium-dialogs.mjs','./premium-advent.css','./premium-advent.mjs','./settings-premium.css','./invite-account.css','./invitation-poster.css','./responsive-fullscreen.css','./responsive-tablet-desktop.css','./premium-evening.mjs','./premium-surprise.mjs','./satin-reference.css','./premium-home.mjs','./dice-weighting.mjs','./discover.css','./approved-artwork.css','./demo-couple.css','./demo-couple.mjs','./assets/loveroll-die-approved.webp','./assets/loveroll-invitation-hero-hd.webp','./discover.mjs','./invite-links.mjs','./email-auth.mjs','./dice3d.js','./dice-engraving.mjs','./dice-numerals.mjs','./dice-roll-motion.mjs','./couple-live-sync.mjs','./couple-reset-view.mjs','./evening-private-queue.mjs','./dice-no-overlay.css','./surprise-dice-layout-v73.css','./mobile-one-screen-v74.css','./mobile-entry-v79.css','./loveroll-splash.css','./loveroll-splash.js','./evening-calendar.css','./evening-calendar.mjs','./calendar-success-stats.mjs','./play-style.mjs','./cycle-questionnaire.mjs','./evening-review.mjs','./evening-review.css','./evening-daily-policy.mjs','./surprise-responsive-v86.css','./surprise-refined-v104.css','./surprise-d100-v151.css','./surprise-event-config.mjs',
 './special-occasions.mjs','./evening-challenges.mjs','./monthly-activities.mjs','./advent-calendar.mjs','./private-special-events.mjs','./onboarding.mjs','./evening-turns.mjs','./wellbeing.mjs',
 './config.js','./invite-email.mjs','./push-notifications.mjs','./home-install.mjs','./messenger-browser.mjs','./couple-dashboard.mjs','./web-version.json','./manifest.webmanifest','./assets/loveroll-icon-48.png','./assets/loveroll-icon-180.png','./assets/loveroll-icon-maskable-512.png','./assets/loveroll-icon-192.png','./assets/loveroll-icon-512.png','./assets/loveroll-hero.webp','./assets/loveroll-messenger-og-v43.jpg'];
const root=new URL('./',self.registration.scope);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(names=>
 Promise.all(names.filter(n=>n.startsWith('loveroll-static-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==root.origin)return;
 const asset=SHELL.some(path=>new URL(path,root).pathname===u.pathname);
 const isHome=u.pathname===root.pathname&&req.mode==='navigate';
 if(!asset&&!isHome)return;
 // Always fetch current content from the network rather than Android WebView's
 // stale HTTP cache; app assets are pre-cached strictly for offline fallback.
 e.respondWith(fetch(req,{cache:'no-store'}).then(response=>{
  if(!response.ok)throw Error('Asset temporarily unavailable: '+response.status);
  return response;
 }).catch(async()=>{
  const fallback=new URL(isHome?'./index.html':u.pathname,root);
  const cache=await caches.open(CACHE);
  return (await cache.match(fallback.href))||Response.error();
 }));
});
// Incoming Web Push notifications (iOS/iPadOS home-screen PWA and supported browsers).
self.addEventListener('push',event=>{
 let message={};
 try{message=event.data?.json()||{};}catch{}
 // Lock-screen payloads are intentionally generic: never show raw private cards.
 const kind=['weekly','invitation','evening-invite','evening-reply','monthly','special'].includes(message.tag)?message.tag:'home';
 const title='LoveRoll ❤️';
 const safeBodies={
  weekly:'Votre rituel de la semaine vous attend.',
  invitation:'Une nouveauté LoveRoll vous attend.',
  'evening-invite':'♥ Une invitation LoveRoll t\'attend',
  'evening-reply':'Votre invitation LoveRoll a une réponse.',
  monthly:'Une surprise à deux vous attend.',
  special:'Un moment LoveRoll vous attend.',
  home:'Votre espace à deux vous attend.'
 };
 const body=safeBodies[kind];
 const tab=['weekly','evening-invite','evening-reply'].includes(kind)?'session':kind==='monthly'||kind==='special'?'special':'home';
 const url=new URL('./?open='+tab,self.registration.scope).href;
 event.waitUntil(self.registration.showNotification(title,{
  body,tag:'loveroll-'+kind,
  icon:new URL('./assets/loveroll-hero.webp',self.registration.scope).href,
  badge:new URL('./assets/loveroll-hero.webp',self.registration.scope).href,
  data:{url}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const candidate=event.notification.data?.url||'./';
 const parsed=new URL(candidate,self.registration.scope);
 const origin=new URL(self.registration.scope).origin;
 const destination=parsed.origin===origin&&parsed.pathname.startsWith(new URL(self.registration.scope).pathname)?parsed.href:new URL('./',self.registration.scope).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   if(new URL(client.url).origin===new URL(destination).origin){
    await client.focus();if('navigate' in client)await client.navigate(destination);return;
   }
  }
  if(self.clients.openWindow)await self.clients.openWindow(destination);
 })());
});
