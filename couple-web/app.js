import { marketingHtml,authHtml,profileHtml,inviteProfileHtml,emailConfirmationHtml,profileGenderSelect,profilePlayStyleSelect,matchHtml,parseMonthDay,monthDayInputs } from './onboarding.mjs?v=20261018-style148';
import {editorialHeader,editorialRow,editorialIcon} from './editorial-ui.mjs?v=20261017-ritual130';
import {cardLibraryHtml,monthlyEditorHtml,adventEditorHtml,specialEditorHtml,importEditorHtml} from './editorial-editors.mjs?v=20261017-ritual130';
import { discoverHtml } from './discover.mjs?v=20261017-entry139';
import {ROLL_TOTAL_MS} from './dice-roll-motion.mjs';
import {createCoupleLiveSync} from './couple-live-sync.mjs?v=20261017-advent119';
import {playableSessionForWeekly} from './couple-reset-view.mjs';
import {eveningDailyAccess} from './evening-daily-policy.mjs?v=20261016-daily100';
import {ownEveningChallenges,queuePosition,queueLabel,hasTurnToDraw} from './evening-private-queue.mjs';
import {premiumHomeHtml,nextMonday,fitHomeLayout} from './premium-home.mjs?v=20261018-weights146';
import {futureCoupleStyleMix,playStyleLabel} from './play-style.mjs?v=20261018-styles149';
import {cycleIntensityQuestionnaireHtml} from './cycle-questionnaire.mjs?v=20261018-cycle149';
import {DICE_WEIGHT_CONFIG,configuredDiceWeights,parseDiceWeightInputs} from './dice-weighting.mjs?v=20261018-weights146';
import {premiumEveningHtml,updateEveningCategoryUi} from './premium-evening.mjs?v=20261018-odds148';
import {eveningHistoryMarkup,eveningLocalDay} from './evening-calendar.mjs?v=20261018-stats148';
import {eveningReviewModal,validEveningReview} from './evening-review.mjs?v=20261016-person-review97';
import {premiumSurpriseHtml,sixSpecialEvents} from './premium-surprise.mjs?v=20261018-d100151';
import {surpriseSlot,surpriseCustom,surpriseTitle,formatSurpriseDateInput,parseSurpriseDateInput} from './surprise-event-config.mjs?v=20261016-surprise109';
import {loginEmail,loginCode,emailAuthMessage,requireLovePassword,passwordQuality,verifiedLoveEmail,passwordAuthMessage,invitationAuthMessage} from './email-auth.mjs';
import {demoCoupleHtml,DEMO_TABS} from './demo-couple.mjs';
import {inviteLinkForId,parseInvitationFromUrl,pendingInviteReference,INVITATION_REVISION} from './invite-links.mjs?v=20261018-safari150';
import {sharedEveningTurns,lastOfficialChallengeFace,latestCountedSession} from './evening-turns.mjs';
import { eveningCard, EVENING_CATEGORIES, formatCountdown,customCardSlots,editableCardSlots,playableEveningCount,resolvedCard } from './evening-challenges.mjs?v=20261016-restore113';
import {MONTHLY_ACTIVITIES,editableMonthlyActivities,monthlyActivityForRoll} from './monthly-activities.mjs?v=20261018-d100151';
import {ritualBrandHtml} from './brand.mjs?v=20261017-ritual130';
import {validateAdventJson,calendarFromSaved} from './advent-calendar.mjs';
import {adventPremiumHtml,sharedAdventState} from './premium-advent.mjs?v=20261017-titles136';
import {validateSpecialEventsJson,SPECIAL_EVENT_KEYS,privateSpecialKey} from './private-special-events.mjs';
import {buildEveningLibrary,buildMonthlyLibrary,librarySummary,normalizeLibraryData,MAX_IMPORT_BYTES} from './json-libraries.mjs?v=20261016-restore113';
import {jsonToolsPanel,jsonInputId,exportJsonFile} from './json-library-ui.mjs?v=20261017-editorial121';
import {guidedIdeas,guidanceFor} from './wellbeing.mjs';

import { SPECIAL_SURPRISES,OCCASIONS,occasionDate,dueOccasions,specialSurprise,occasionRoles,TARGETED_OCCASIONS } from './special-occasions.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { CONFIG } from './config.js';
import {normalizeInviteEmail,composeInviteEmail} from './invite-email.mjs';
import {enablePush,disablePush,updatePushPreference,sendTestPush,notificationSettingsMarkup,safeNativePushToken,currentPushDevice} from './push-notifications.mjs?v=20261017-complete127';
import {shouldOfferInstall,markInstallOffered,dismissInstall,requestInstall,installOfferHtml,installStepsHtml,installStatus,isEmbeddedBrowser,isIos} from './home-install.mjs?v=20261017-complete127';
import {messengerExternalBrowserHtml} from './messenger-browser.mjs?v=20261017-entry139';
import {invitationStatus,coupleStats,formatCoupleDate,invitationEmailText,invitationMessengerText,invitationPreviewMarkup} from './couple-dashboard.mjs';
import {premiumConfirm,premiumCopyLink,focusInlineLoveDialog} from './premium-dialogs.mjs?v=20261017-complete127';


const WEB_RELEASE='2026-10-19.155';
const root=document.querySelector('#app');
const enc=new TextEncoder(),dec=new TextDecoder();
let diceCleanup=[],renderToken=0;
const opts={auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}};
const client=CONFIG.supabaseUrl&&CONFIG.supabasePublishableKey?
 createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,opts):null;
const launchParams=new URLSearchParams(location.search);
const requestedSettingsSection=launchParams.get('section')||'';
let settingsOpenSection=requestedSettingsSection||'';
let notificationFeedback=null;
const state={user:null,profile:null,members:[],coupleId:null,couple:null,
 tab:launchParams.has('settings')?'settings':(['home','session','special','advent'].includes(launchParams.get('open'))?launchParams.get('open'):'home'),weekly:null,monthly:{},session:null,personal:[],challenges:[],gifts:[],rollStatus:null,customCards:[],customCategory:'SENSUEL',customSlot:1,customSearch:'',customFilter:'all',monthlyActivities:[],monthlySlot:1,libraryScreen:'list',libraryImportKind:null,specialEditorKey:null,specialEditorStage:'D6_activite',specialEditorFace:1,adventEditorDay:1,pushDevice:null,
 events:[],journal:[],advent:[],advent2026Config:null,advent2026Days:[],selectedDay:1,adventYear:null,adventSelected:null,adventHistory:false,adventOpening:null,adventRevealing:false,adventServerDate:null,unlockKey:null,channel:null,
 occasionSettings:null,occasionRolls:[],specialEventsConfig:null,specialEventKeys:[],wellbeing:null,guidance:'playful',personalJournal:[],personalPass:null,showAuth:launchParams.has('auth'),authNotice:null,authMode:['signin','request-reset'].includes(launchParams.get('auth'))?launchParams.get('auth'):'signup',authNeedsEmailConfirmation:false,emailVerificationPending:false,authDraftEmail:'',passwordRecovery:launchParams.get('auth')==='recover',inviteError:null,inviteAttemptKey:null,inviteWelcome:false,homeNotices:false,showDiscover:false,inviteAccepted:false,demoMode:false,demoTab:'home',demoRoll:null,demoSurprise:null,demoDay:1,demoChallengeComplete:false,showEveningChallenge:false,showEveningChallenges:false,selectedEveningChallengeId:null,eveningQueueSeen:null,eveningBoard:null,eveningMore:false,eveningHistoryStats:[],eveningCalendarChallenges:[],weeklyRollHistory:[],calendarPassQuota:[],calendarPassMonth:null,cycleStatus:null,cycleDeferred:null,eveningReviews:[],reviewModalSessionId:null,reviewDismissedSessionId:null,reviewDraft:{},reviewSaving:false,eveningCalendarMonth:null,eveningCalendarDate:null,showSurpriseActivity:false,surpriseSeason:null,surpriseEditSlot:null,specialFocus:null,diceStatus:null,rollAnimationFace:null,rollAnimationKind:null,category:null,randomMode:false,confirmCancel:false,showInstallSteps:false,installAfterSignup:false,installModalOpen:false,forceInstallGuide:false,invitations:[],inviteDraft:null,inviteCopyFallback:false,challengesHistory:[],jsonPending:null,specialTimerKey:null,pushPrefs:null};
const names={SENSUEL:'Sensuel',COQUIN:'Coquin',SEXUEL:'Sexuel'};
function isSharedCoupleReady(coupleId,members){
 return !!coupleId&&Array.isArray(members)&&members.length===2;
}
let timerCtx=null;
const challengeTimer={id:null,durationMs:0,remainingMs:0,deadline:0,running:false,notified:false,mode:'sound'};
try{const saved=localStorage.getItem('loveroll-timer-mode');if(saved==='vibrate'||saved==='sound')challengeTimer.mode=saved;}catch(e){}

const kinds={weekly:'Rituel de la semaine',monthly_activity:'Sortie du mois',
 monthly_host:'Qui invite',monthly_restaurant:'Type de restaurant'};
const ideas={
 SENSUEL:['Baiser prolongé','Massage relaxant','Danse collée','Trois compliments','Baisers dans le cou','Câlin prolongé','Souvenir romantique','Baiser au choix','Massage des mains','Regard complice','Promenade main dans la main','Moment sans écran','Surprise tendre','Écoute à deux','Baiser surprise','Chanson romantique','Massage du dos','Déclaration douce','Lumière tamisée','Choix de douceur'],
 COQUIN:['Danse privée','Baiser à la carte','Jeu du regard','Massage coquin','Petit strip-tease','Défi du vêtement','Une envie secrète','Séduction au ralenti','Bandeau et baisers','Invitation discrète','Un compliment osé','Massage à l’huile','Une chanson à deux','Rôle de séduction','Cinq baisers','Un petit fantasme','Défi de la surprise','Ambiance de soirée','Deux choix coquins','Un jeu à deux'],
 SEXUEL:['Moment intime','Préliminaires préférés','Proposition de sexe oral','Position choisie ensemble','Plaisir partagé','Douche intime','Prendre l’initiative','Moment sans pénétration','Jouet intime consensuel','Changer de pièce','Partager un fantasme','L’autre choisit','Inverser les rôles','Changer l’éclairage','Bandeau intime','Une nouveauté consensuelle','Rythme préféré','Désir secret','Carte blanche encadrée','Finale à deux']
};
const advent=[
 'Dix minutes de tendresse','Massage relaxant','Trois baisers','Danse lente',
 'Petite attention','Baisers dans le cou','Souvenir à deux','Danse de séduction',
 'Chuchotement coquin','Strip-tease léger','Jeu de tentation','Douche à deux',
 'Massage sensuel','Confession d’une envie','Préliminaires à choisir','Choix d’un jouet',
 'Invitation intime','Attention sexuelle consensuelle','Soirée passionnée',
 'Strip-tease et surprise','Changer de décor','Plaisir partagé','Fantasme à raconter',
 'Soirée intime choisie','Cadeau final à deux'
];
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const month=()=>today().slice(0,7);
const week=()=>{const d=new Date(today()+'T12:00:00Z');let n=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10)};
const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const id=v=>document.getElementById(v);
const other=()=>state.members.find(m=>m.user_id!==state.user?.id);
const me=()=>state.members.find(m=>m.user_id===state.user?.id);
const person=u=>state.members.find(m=>m.user_id===u)?.name||'Partenaire';
const button=(action,label,extra='')=>'<button '+extra+' data-action="'+safe(action)+'">'+label+'</button>';
function inviteBrowserHelp(){
 const invite=pendingInviteReference(sessionStorage);
 if(!isEmbeddedBrowser()||!invite)return '';
 const base=CONFIG.siteUrl||location.origin+location.pathname;
 const href=invite.kind==='id'?inviteLinkForId(base,invite.value):
  base+'?v='+INVITATION_REVISION+'#invite='+encodeURIComponent(invite.value);
 return messengerExternalBrowserHtml(href,{ios:isIos()});
}
function invitationLandingHeader(showAction=true){
 return '<section class="premium-invite-hero" aria-label="Votre invitation LoveRoll">'+
 '<div class="premium-invite-photo"><img src="./assets/loveroll-premium-scene.png" alt="Cœur rose lumineux et deux dés noirs LoveRoll" loading="eager"></div>'+
 '<div class="premium-eyebrow">♡ LOVEROLL · INVITATION PRIVÉE</div>'+
 '<h2>Une surprise rien que pour vous deux ❤️</h2>'+
 '<p>Partagez des moments de complicité, des défis et de belles surprises à votre rythme.</p>'+
 '<p class="premium-invite-note">♡ Votre invitation est privée · Un compte par personne</p>'+ 
 (showAction?button('invite-start','♡ ACCEPTER L’INVITATION ❤️'):'')+'</section>';
}
// No floating banners: gameplay and confirmation states remain inside their pages.
function notify(_message){
 // Deliberately silent; system push and confirmation dialogs remain separate.
}
function showInlineError(message){
 if(!root)return;
 const focused=document.activeElement?.closest?.('section,article,.card');
 const host=(focused&&root.contains(focused)?focused:null)||root.querySelector('section,.card')||root;
 let note=host.querySelector('.lr-inline-feedback');
 if(!note){
  note=document.createElement('p');
  note.className='lr-inline-feedback';
  note.setAttribute('role','alert');
  host.append(note);
 }
 note.textContent=String(message||'Une erreur est survenue');
}
function fail(error){
 console.error(error);
 const msg=String(error?.message||'Une erreur est survenue');
 if(isNotificationPage())setNotificationFeedback(msg,'error');else showInlineError(msg);
}
function isNotificationPage(){return state.tab==='settings'&&settingsOpenSection==='notifications';}
function setNotificationFeedback(message,tone='status'){
 notificationFeedback={message:String(message||''),tone};
 const note=root.querySelector('#notification-feedback');
 if(note){
  note.textContent=notificationFeedback.message;note.dataset.tone=tone;note.hidden=!message;
  const panel=note.closest('.settings-detail-body');
  if(message&&panel){
   const bounds=note.getBoundingClientRect(),visible=panel.getBoundingClientRect();
   if(bounds.bottom>visible.bottom||bounds.top<visible.top)note.scrollIntoView({block:'nearest',behavior:'instant'});
  }
 }
}
function refreshNativeNotificationSettings(){
 if(!isNotificationPage())return;
 render();
}
async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
async function query(table,options={}){
 let q=client.from(table).select(options.columns||'*');
 for(const [column,value] of Object.entries(options.eq||{}))q=q.eq(column,value);
 if(options.order)q=q.order(options.order,{ascending:options.asc??false});
 const {data,error}=await q;if(error)throw error;return data;
}

// Unsaved form text lives ONLY in process memory: no LocalStorage, logs or cloud.
// It is restored after partner realtime refreshes and activity resume.
let lastFormTab=null;
let allowBackExit=false;
function snapshotDraft(){
 const inputs=[...root.querySelectorAll('input[id],select[id],textarea[id]')].filter(el=>
  !el.disabled&&!el.readOnly&&!el.hasAttribute('data-draft-ignore')&&!['password','file','hidden'].includes(el.type));
 return inputs.filter(el=>{
  if(el.type==='checkbox'||el.type==='radio')return el.checked!==el.defaultChecked;
  if(el.tagName==='SELECT'){
   const options=[...el.options],initial=options.findIndex(o=>o.defaultSelected);
   return el.selectedIndex!==(initial<0?0:initial);
  }
  return el.value!==el.defaultValue;
 }).map(el=>({
    id:el.id,value:el.value,checked:el.checked,type:el.type
 }));
}
function formRouteKey(){return [state.tab,settingsOpenSection,state.libraryScreen,state.libraryImportKind,state.customCategory,state.customSlot,state.monthlySlot,state.adventEditorDay,state.specialEditorKey,state.specialEditorStage,state.specialEditorFace].join('|');}
function hasUnsavedForm(){return snapshotDraft().length>0;}
function restoreDraft(draft){
 for(const field of draft||[]){
  const el=document.getElementById(field.id);
  if(!el||!root.contains(el)||['password','file','hidden'].includes(el.type))continue;
  if(field.type==='checkbox'||field.type==='radio')el.checked=field.checked;
  else el.value=field.value;
 }
}
function backFromLoveRoll(){
 if(document.querySelector('.lr-dialog-overlay')){
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  return true;
 }
 if(state.installModalOpen||state.forceInstallGuide){handle('install-later').catch(fail);return true;}
 if(state.reviewModalSessionId){state.reviewDismissedSessionId=state.reviewModalSessionId;state.reviewModalSessionId=null;state.reviewDraft={};render();return true;}
 if(allowBackExit){allowBackExit=false;return false;}
 if(state.showEveningChallenge){state.showEveningChallenge=false;render();return true;}
 if(state.showSurpriseActivity){state.showSurpriseActivity=false;render();return true;}
 if(state.surpriseEditSlot){state.surpriseEditSlot=null;render();return true;}
 if(state.adventSelected!==null){state.adventSelected=null;render();return true;}
 if(state.adventHistory){state.adventHistory=false;render();return true;}
 if(state.eveningMore){state.eveningMore=false;render();return true;}
 if(state.homeNotices){state.homeNotices=false;render();return true;}
 if(state.confirmCancel){state.confirmCancel=false;render();return true;}
 if(state.specialFocus){state.specialFocus=null;state.tab='special';render();return true;}
 if(state.tab==='settings'&&settingsOpenSection){handle('settings-page:'+(['admin'].includes(settingsOpenSection)?'jeu':settingsOpenSection.startsWith('aide')?'application':'')).catch(fail);return true;}
 if(state.tab==='evening-calendar'){handle(eveningCalendarReturn()).catch(fail);return true;}
 if(['library','monthly-library','advent-editor','special-editor'].includes(state.tab)){handle(state.libraryImportKind?'editor-import-back':state.tab==='library'&&state.libraryScreen==='edit'?'editor-back':state.specialEditorKey?'special-editor-back':'settings-page:jeu').catch(fail);return true;}
 const parent={
  library:'settings','monthly-library':'settings','advent-editor':'settings',
  'special-editor':'settings','personal-journal':'settings',journal:'session','evening-calendar':'session',
  occasions:'special',ideas:'home',invitation:'settings'
 }[state.tab];
 const destination=parent||(state.tab!=='home'?'home':null);
 if(destination){
  handle('tab:'+destination).catch(fail);
  return true;
 }
 if(hasUnsavedForm()){
  premiumConfirm('Vous avez une saisie non enregistrée. La quitter sans enregistrer ?',{
   kind:'library',title:'Quitter le formulaire ?',accept:'Quitter',cancel:'Continuer'
  }).then(ok=>{if(ok){allowBackExit=true;notify('Appuyez de nouveau sur Retour pour quitter.');}});
  return true;
 }
 return false;
}
window.loveRollHandleBack=backFromLoveRoll;
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!document.querySelector('.lr-dialog-overlay')){
  if(backFromLoveRoll())event.preventDefault();
 }
});

let diceView=null;
function frame(body,title='LOVEROLL',subtitle='Un jeu intime, juste pour vous deux'){
 const openerAction=document.activeElement?.dataset?.action||null;
 const draft=lastFormTab===formRouteKey()?snapshotDraft():[];
 lastFormTab=formRouteKey();
 const connected=!!(state.user&&state.profile?.birthday_md);
 const isCouple=connected&&isSharedCoupleReady(state.coupleId,state.members);
 const realHome=isCouple&&state.tab==='home';
 const realEvening=isCouple&&state.tab==='session'&&(!state.session||(state.session.paired_turns&&state.session.self_draws));
 const eveningArchive=connected&&state.tab==='evening-calendar';
 const realSurprise=isCouple&&state.tab==='special';
 const realSettings=connected&&state.tab==='settings';
 const realEditor=connected&&['library','monthly-library','advent-editor','special-editor'].includes(state.tab);
 root.classList.toggle('loveroll-advent-page',isCouple&&state.tab==='advent');
 root.classList.toggle('loveroll-advent-letters',isCouple&&state.tab==='advent');
 root.classList.toggle('loveroll-real-home',realHome);
 root.classList.toggle('loveroll-evening-page',realEvening);
 root.classList.toggle('loveroll-editorial',realEvening||eveningArchive);
 root.classList.toggle('loveroll-evening-calendar-page',eveningArchive);
 root.classList.toggle('loveroll-surprise-page',realSurprise);
 root.classList.toggle('loveroll-surprise-ecrin',realSurprise);
 root.classList.toggle('loveroll-settings-menu',realSettings&&!settingsOpenSection);
 root.classList.toggle('loveroll-settings-detail',realSettings&&!!settingsOpenSection);
 root.classList.toggle('loveroll-settings-page',realSettings||realEditor||(isCouple&&state.tab==='occasions'));
 root.classList.toggle('loveroll-occasion-details',isCouple&&state.tab==='occasions');
 root.classList.toggle('loveroll-library-page',realEditor);
 root.classList.toggle('loveroll-library-list',realEditor&&state.tab==='library'&&state.libraryScreen!=='edit'&&!state.libraryImportKind);
 // Preserve the SAME D100 canvas through UI refreshes with an unchanged face.
 const oldD100=realEvening?root.querySelector('.evening-step.two .evening-d35-col canvas[data-dice-sides="100"]'):null;
 const savedStage=oldD100?.loveRollDie&&oldD100?.loveRollCleanup?
  oldD100.closest('.love3d-stage'):null;
 const savedDispose=savedStage?oldD100.loveRollCleanup:null;
 if(savedStage)savedStage.remove();
 // Keep settled WebGL canvases when this view only refreshes text/data.
 // Signature includes all visual inputs; a new roll or changed result remounts.
 const dieSignature=c=>['diceSides','face','diceUnrolled','diceMarkers','diceZoom','dicePreview'].map(k=>c.dataset[k]||'').join('|');
 const settled=diceView===state.tab?[...root.querySelectorAll('canvas[data-dice-sides]')].map((canvas,index)=>({canvas,index,signature:dieSignature(canvas)})).filter(({canvas})=>canvas.loveRollDie&&canvas.loveRollCleanup&&canvas.dataset.spinning!=='true'):[];
 const kept=new Set(settled.map(({canvas})=>canvas.loveRollCleanup));
 if(savedDispose)kept.add(savedDispose);
 for(const dispose of diceCleanup)if(!kept.has(dispose))dispose();
 diceCleanup=[...kept];diceView=state.tab;
 const token=++renderToken;
 // Offer only after completing a NEW account. Never interrupt ordinary logins.
 if(connected&&state.installAfterSignup){
  state.installAfterSignup=false;
  if(shouldOfferInstall(state.user?.id)){
   state.installModalOpen=true;
   markInstallOffered(state.user?.id);
  }
 }
 const installation=connected&&(state.installModalOpen||state.forceInstallGuide)?
  (state.showInstallSteps?installStepsHtml():installOfferHtml()):'';
 const usualHeader='<header class="header"><div><h1>♡ '+safe(title)+'</h1><p>'+safe(subtitle)+'</p></div>'+
  (state.user&&state.tab!=='settings'?'<button class="subtle" data-action="signout" aria-label="Se déconnecter">↪</button>':'')+'</header>';
 // The connected Home begins directly with the weekly ritual: no top logo or action buttons.
 const reviewing=state.reviewModalSessionId&&isCouple&&state.sessions?.some(x=>
  x.id===state.reviewModalSessionId&&x.finished_at&&x.counted);
 const reviewPanel=reviewing?eveningReviewModal({
  sessionId:state.reviewModalSessionId,draft:state.reviewDraft||{},
  saving:state.reviewSaving,partnerName:other()?.name?.split(' ')[0]||'ton partenaire'
 }):'';
 const cyclePanel=connected&&state.members?.length===2&&state.cycleStatus?.pending&&
  state.cycleDeferred!==state.cycleStatus?.cycle?
  cycleIntensityQuestionnaireHtml({
   status:state.cycleStatus,style:state.profile?.play_style,
   partnerName:other()?.name?.split(' ')[0]||'votre partenaire'
  }):'';
 root.innerHTML=(realHome||realEvening||realSurprise||realSettings||realEditor||eveningArchive||(isCouple&&state.tab==='advent')?'':usualHeader)+body+(connected?nav():'')+installation+reviewPanel+cyclePanel;
 if(savedStage){
  const freshD100=root.querySelector('.evening-step.two .evening-d35-col canvas[data-dice-sides="100"]');
  const freshStage=freshD100?.closest('.love3d-stage');
  if(freshStage&&freshD100.dataset.face===oldD100.dataset.face){
   savedStage.classList.toggle('is-rolling',freshStage.classList.contains('is-rolling'));
   oldD100.dataset.spinning=freshD100.dataset.spinning;
   freshStage.replaceWith(savedStage);
   oldD100.loveRollDie?.refresh?.();
  }else{
   savedDispose();diceCleanup=diceCleanup.filter(dispose=>dispose!==savedDispose);
  }
 }
 const freshCanvases=[...root.querySelectorAll('canvas[data-dice-sides]')].filter(c=>c!==oldD100);
 for(const {canvas,index,signature} of settled){
  const fresh=freshCanvases[index];
  if(fresh&&fresh.dataset.spinning!=='true'&&signature===dieSignature(fresh)){
   fresh.replaceWith(canvas);
   canvas.closest('.home-die-platform,.love3d-stage')?.classList.add('webgl-ready');
   canvas.loveRollDie?.refresh?.();
  }else{canvas.loveRollCleanup();diceCleanup=diceCleanup.filter(fn=>fn!==canvas.loveRollCleanup);}
 }
 restoreDraft(draft);
 fitHomeLayout(root);
 bindActions();
 focusInlineLoveDialog(root,openerAction);
 // Render idle evening D6 in WebGL too: each side is a neutral heart,
 // never a fabricated pip result. Actual face comes from Supabase after rolling.
 const canvases=[...root.querySelectorAll('canvas[data-dice-sides]')];
 if(canvases.length){
  import('./dice3d.js?v=20261017-home134').then(({dieOn})=>{
   if(token!==renderToken)return;
   for(const canvas of canvases){
    if(!canvas.isConnected||canvas.loveRollDie)continue;
    try{
     const cleanup=dieOn(canvas,Number(canvas.dataset.diceSides),
       Number(canvas.dataset.face)||1,canvas.dataset.spinning==='true');
     canvas.loveRollCleanup=cleanup;
     diceCleanup.push(cleanup);
     canvas.closest('.die')?.classList.add('ready');
    }catch(error){console.warn('WebGL non disponible',error);}
   }
  }).catch(error=>console.warn('Animation 3D indisponible, résultat textuel maintenu',error));
 }
}
function navIcon(key,fallback){
 const paths={home:'<path d="m3 10 9-7 9 7v10H3z M9 20v-7h6v7"/>',session:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',special:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',advent:'<path d="M3 9h18v4H3z M5 13v8h14v-8 M12 9v12"/><path d="M12 9C2 9 5 0 9 4L12 9c10 0 7-9 3-5Z"/>',settings:'<path d="M19.32,9.62 L21.85,10.26 L21.85,13.74 L19.32,14.38 L18.86,15.50 L20.19,17.74 L17.74,20.19 L15.50,18.86 L14.38,19.32 L13.74,21.85 L10.26,21.85 L9.62,19.32 L8.50,18.86 L6.26,20.19 L3.81,17.74 L5.14,15.50 L4.68,14.38 L2.15,13.74 L2.15,10.26 L4.68,9.62 L5.14,8.50 L3.81,6.26 L6.26,3.81 L8.50,5.14 L9.62,4.68 L10.26,2.15 L13.74,2.15 L14.38,4.68 L15.50,5.14 L17.74,3.81 L20.19,6.26 L18.86,8.50 Z"/><circle cx="12" cy="12" r="3.5"/>'};
 return paths[key]?'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[key]+'</svg>':fallback;
}
function nav(){
 const tabs=isSharedCoupleReady(state.coupleId,state.members)?
 [['home','⌂','Accueil'],['session','🎲','Soirée'],['special','✦','Surprise'],
  ['advent','🎁','Avent'],['settings','⚙','Réglages']]:
 [['home','⌂','Accueil'],...(isLoveAdmin()?[['library','♡','Mes cartes']]:[]),
  ['personal-journal','♥','Calendrier'],['settings','⚙','Réglages']];
 return '<nav class="nav"><div class="nav-inner" style="grid-template-columns:repeat('+tabs.length+',minmax(0,1fr))">'+tabs.map(([key,icon,label])=>
 '<button data-action="tab:'+key+'" class="'+((state.tab===key||(['session','personal-journal'].includes(key)&&state.tab==='evening-calendar')||(key==='special'&&state.tab==='occasions')||(key==='settings'&&!tabs.some(([tab])=>tab===state.tab)&&['library','monthly-library','advent-editor','special-editor','journal'].includes(state.tab)))?'active':'')+'"'+(state.diceStatus?' disabled':'')+'><span>'+navIcon(key,icon)+
 '</span>'+safe(label)+'</button>').join('')+'</div></nav>';
}
function bindActions(){
 const librarySearch=root.querySelector('#custom-card-search');
 const libraryFilter=root.querySelector('#custom-card-filter');
 const updateLibraryFilter=()=>{
  state.customSearch=librarySearch?.value||'';state.customFilter=libraryFilter?.value||'all';
  const term=state.customSearch.trim().toLocaleLowerCase('fr-CA');
  const choice=state.customFilter;
  root.querySelectorAll('.custom-card-tiles button[data-card-id]').forEach(card=>{
   const matchesText=((card.textContent||'')+' '+(card.dataset.keywords||'')).toLocaleLowerCase('fr-CA').includes(term);
   const matchesKind=choice==='all'||choice==='edited'&&card.dataset.saved==='true'||
    choice==='empty'&&card.dataset.empty==='true';
   card.hidden=!(matchesText&&matchesKind);
  });
 };
 librarySearch?.addEventListener('input',updateLibraryFilter);
 libraryFilter?.addEventListener('change',updateLibraryFilter);
 if(librarySearch)updateLibraryFilter();
 // Admin weighting editors: show live total and require exactly 100%.
 root.querySelectorAll('.admin-dice-weight-section').forEach(section=>{
  const fields=[...section.querySelectorAll('.admin-dice-weight-face input')];
  const total=section.querySelector('.admin-dice-weight-total');
  const saveButton=section.querySelector('.admin-dice-weight-save');
  const update=()=>{
   let valid=false;
   try{parseDiceWeightInputs(fields.map(field=>field.value));valid=true;}catch(error){}
   const sum=fields.reduce((a,field)=>a+(Number(field.value)||0),0);
   if(total){
    total.textContent='Total : '+sum+' / 100 %';
    total.dataset.valid=valid?'true':'false';
   }
   if(saveButton)saveButton.disabled=!valid;
  };
  fields.forEach(field=>field.addEventListener('input',update));
  update();
 });
 // The two category values always total 100%; Soirée visuals remain unchanged.
 const categoryFirst=id('admin-category-preferred'),categoryOther=id('admin-category-other');
 if(categoryFirst&&categoryOther){
  const total=id('admin-category-total'),save=root.querySelector('.admin-category-save');
  const sync=(input,sibling)=>{
   const value=input.value.trim();
   if(/^[0-9]+$/.test(value)&&Number(value)<=100)
    sibling.value=String(100-Number(value));
   const good=[categoryFirst.value,categoryOther.value].every(v=>/^[0-9]+$/.test(v)&&Number(v)<=100)
    &&Number(categoryFirst.value)+Number(categoryOther.value)===100;
   if(total){
    total.textContent='Total : '+(Number(categoryFirst.value||0)+Number(categoryOther.value||0))+' / 100 %';
    total.dataset.valid=good?'true':'false';
   }
   if(save)save.disabled=!good;
  };
  categoryFirst.addEventListener('input',()=>sync(categoryFirst,categoryOther));
  categoryOther.addEventListener('input',()=>sync(categoryOther,categoryFirst));
 }
 document.querySelectorAll('[data-action]').forEach(el=>{
  el.addEventListener('click',()=>{
   if(el.disabled||el.dataset.busy==='true')return;
   el.dataset.busy='true';el.setAttribute('aria-busy','true');
   handle(el.dataset.action,el).catch(fail).finally(()=>{delete el.dataset.busy;el.removeAttribute('aria-busy');});
  });
 });
 // Numeric keyboard: convert typed digits into JJ/MM/AAAA without opening a date picker.
 const surpriseDate=id('surprise-event-date')||id('editor-event-date');
 surpriseDate?.addEventListener('input',()=>{
  const raw=surpriseDate.value,at=surpriseDate.selectionStart??raw.length;
  const digitsBefore=raw.slice(0,at).replace(/\D/g,'').length;
  const formatted=formatSurpriseDateInput(raw);
  if(raw===formatted)return;
  surpriseDate.value=formatted;
  let caret=0,count=0;
  while(caret<formatted.length&&count<digitsBefore){
   if(/\d/.test(formatted[caret]))count++;
   caret++;
  }
  surpriseDate.setSelectionRange(caret,caret);
 });
 root.querySelectorAll('[data-editor-select]').forEach(select=>select.addEventListener('change',()=>{
  const value=select.value;select.value=[...select.options].find(o=>o.defaultSelected)?.value||select.options[0].value;
  handle(select.dataset.editorSelect+':'+value).catch(fail);
 }));
 root.querySelectorAll('.editorial-timer input[type=checkbox]').forEach(input=>{
  const sync=()=>{input.closest('.editorial-timer').querySelector('.editorial-timer-duration').hidden=!input.checked;};
  input.addEventListener('change',sync);sync();
 });
 root.querySelectorAll('.json-tools textarea').forEach(input=>input.addEventListener('input',()=>{state.jsonPending=null;root.querySelector('.json-preview')?.remove();const name=id('json-file-name');if(name)name.textContent='';}));
 document.querySelectorAll('input[data-json-file]').forEach(input=>input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;state.jsonPending=null;root.querySelector('.json-preview')?.remove();
  const filename=id('json-file-name');if(filename)filename.textContent='';
  if(file.size>MAX_IMPORT_BYTES){fail(Error('Fichier trop volumineux : 250 Ko maximum.'));return;}
  const output=id(jsonInputId(input.dataset.jsonFile));if(!output)return;
  try{const text=await file.text();if(!output.isConnected)return;output.value=text;state.jsonPending=null;root.querySelector('.json-preview')?.remove();const status=id('json-file-name');if(status)status.textContent=file.name;notify('Fichier chargé. Vérifiez son aperçu.');}catch(e){fail(e);}
 }));
 document.querySelectorAll('[data-push-option]').forEach(input=>input.addEventListener('change',async()=>{
  const type=input.dataset.pushOption,checked=input.checked;
  input.disabled=true;
  try{
   await updatePushPreference(client,state.user.id,state.pushPrefs||{},type,checked);
   state.pushPrefs={...state.pushPrefs,[type]:checked};
   setNotificationFeedback('Préférence enregistrée.');
  }catch(err){input.checked=!checked;fail(err);}finally{input.disabled=false;}
 }));
 const reviewNote=root.querySelector('#lr-review-comment');
 reviewNote?.addEventListener('input',()=>{
  state.reviewDraft={...state.reviewDraft,comment:reviewNote.value.slice(0,500)};
  const counter=root.querySelector('#lr-review-counter');
  if(counter)counter.textContent=String(reviewNote.value.length)+'/500';
 });
 document.querySelector('#invite-auth-form')?.addEventListener('submit',event=>event.preventDefault());
 const passwordField=id('signin-password');
 passwordField?.addEventListener('input',()=>{
  const quality=passwordQuality(passwordField.value),meter=document.querySelector('.entry-password-meter');
  if(!meter)return;
  meter.dataset.level=String(quality.met);
  const hint=id('auth-password-hint');
  if(hint)hint.textContent=quality.valid?'✓ Mot de passe prêt':'Au moins 8 caractères, avec une majuscule, une minuscule et un chiffre.';
 });

}

let inviteAcceptanceBusy=false;
function pendingInviteUrl(recover=false){
 const url=new URL(CONFIG.siteUrl||location.href);
 const pending=pendingInviteReference(sessionStorage);
 if(pending?.kind==='id'){url.searchParams.set('invite_id',pending.value);url.searchParams.set('v',INVITATION_REVISION);}
 if(pending?.kind==='token')url.hash='invite='+pending.value;
 url.searchParams.set('auth',recover?'recover':'account');
 return url.toString();
}
function finishInviteReference(){
 sessionStorage.removeItem('pendingInvite');
 sessionStorage.removeItem('pendingInviteId');
 sessionStorage.removeItem('loverollInviteAccepted');
 // The same public ID may have been kept across a new tab or email redirect.
 for(const key of ['pendingInviteId','loverollInviteUntil','loverollInviteAccepted']){
  try{localStorage.removeItem(key);}catch(error){/* Private storage may be unavailable. */}
 }
 const clean=new URL(location.href);
 for(const key of ['invite_id','v','auth','type','token'])clean.searchParams.delete(key);
 clean.hash='';
 history.replaceState(null,'',clean.pathname+clean.search);
 state.inviteAccepted=false;state.inviteError=null;state.inviteAttemptKey=null;
}
// Resolve the signup route on the server, not from a fragile browser tab.
// This lookup checks the confirmed recipient email and never exposes tokens.
function rememberVerifiedInvitation(invitationId){
 const value=String(invitationId||'');
 if(!parseInvitationFromUrl(new URL('?invite_id='+encodeURIComponent(value),location.href).href).id)
  throw Error('Référence d’invitation invalide.');
 sessionStorage.setItem('pendingInviteId',value);
 sessionStorage.removeItem('pendingInvite');
 sessionStorage.removeItem('loverollInviteAccepted');
 // An invitation discovered by email requires explicit acceptance.
 // Never copy approval from an unrelated cached invitation.
 for(const key of ['pendingInviteId','loverollInviteUntil','loverollInviteAccepted']){
  try{localStorage.removeItem(key);}catch(error){}
 }
 state.inviteAccepted=false;state.showDiscover=false;state.showAuth=false;
 state.inviteError=null;state.inviteAttemptKey=null;
}
async function resolveVerifiedSignup(createOwner=false){
 const result=await rpc('resolve_love_signup',{p_create_owner:!!createOwner});
 if(result?.status==='invitation'){
  if(!result.invitation_id)throw Error('Référence d’invitation manquante.');
  rememberVerifiedInvitation(result.invitation_id);
 }
 return result;
}
async function autoAcceptPendingInvite(){
 const invite=pendingInviteReference(sessionStorage);
 if(!invite||!state.inviteAccepted||!state.user||state.passwordRecovery||
    !state.profile?.birthday_md)return;
 if(!verifiedLoveEmail(state.user)){
  state.inviteError='Confirmez votre adresse courriel pour terminer l’invitation.';return;
 }
 const key=state.user.id+':'+invite.kind+':'+invite.value;
 if(inviteAcceptanceBusy||state.inviteAttemptKey===key)return;
 state.inviteAttemptKey=key;inviteAcceptanceBusy=true;state.inviteError=null;
 try{
  if(invite.kind==='id')await rpc('accept_love_match_by_id',{p_invitation:invite.value});
  else await rpc('accept_love_match',{p_token_hash:await hashToken(invite.value)});
  finishInviteReference();
  state.inviteWelcome=true;state.tab='home';state.showAuth=false;
 }catch(error){state.inviteError=invitationAuthMessage(error);}
 finally{inviteAcceptanceBusy=false;}
}
function verificationPendingHtml(email){
 return emailConfirmationHtml(email,{needsSignIn:!state.user,invitation:!!pendingInviteReference(sessionStorage),google:CONFIG.oauthProviders?.includes('google')===true});
}
async function refreshVerifiedIdentity(){
 if(!state.user)return false;
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user){state.user=null;return false;}
 state.user=data.user;
 return verifiedLoveEmail(data.user);
}
function authMessage(message){
 const feedback=id('auth-form-feedback');
 if(feedback){feedback.textContent=message;feedback.setAttribute('role','alert');}
 else{state.authNotice=message;showInlineError(message);}
}
function render(){
 // Old navigation references now open the current calendar and personal bilans.
 // Existing encrypted records remain intact; the retired journal forms stay closed.
 if(['journal','personal-journal'].includes(state.tab)){
  state.eveningCalendarBack='settings-page:confidentialite';state.tab='evening-calendar';
 }
 if(!state.user||state.passwordRecovery||!verifiedLoveEmail(state.user)||!state.profile?.birthday_md){for(const dispose of diceCleanup)dispose();diceCleanup=[];diceView=null;renderToken++;root.className='';}
 if(!client){frame('<section class="card"><h2>Connexion cloud à configurer</h2>'+
  '<p>Un projet Supabase dédié et son adresse HTTPS sont requis avant d’activer les comptes et le partage.</p></section>');return;}
 const pendingInvite=pendingInviteReference(sessionStorage);
 const invitationNotice=(title,body,attributes='')=>'<div class="auth-editorial auth-notice-editorial">'+
  '<header class="entry-account-hero">'+ritualBrandHtml()+'</header>'+
  '<section class="entry-auth-card invitation-notice-card"'+attributes+'><h1>'+safe(title)+'</h1>'+body+'</section></div>';
 // Discover always shows a visual tour, never a second sign-in page.
 // The approved premium discovery IS the first invitation screen.
 // Consent is mandatory before the connection controls appear.
 if(!state.passwordRecovery&&(state.showDiscover||(pendingInvite&&!state.inviteAccepted))){
  root.innerHTML=discoverHtml(!!pendingInvite,inviteBrowserHelp());bindActions();return;
 }
 if(!state.passwordRecovery&&((state.emailVerificationPending&&!state.user)||
  (state.user&&!verifiedLoveEmail(state.user)))){
  root.innerHTML=verificationPendingHtml(state.authDraftEmail||state.user?.email);
  bindActions();return;
 }
 if(!state.user||state.passwordRecovery){
  if(!state.user&&!state.showAuth){root.innerHTML=discoverHtml(false);bindActions();}
  else{
   root.innerHTML=authHtml(!!pendingInvite,state.passwordRecovery?'recover':state.authMode,
    state.authNotice||'',state.authDraftEmail,state.authNeedsEmailConfirmation,{google:CONFIG.oauthProviders?.includes('google')===true,browserHelp:inviteBrowserHelp()});
   bindActions();
  }
  return;
 }
 if(pendingInvite&&state.user&&state.coupleId){
  const soloOwner=state.members.length===1&&state.members[0]?.user_id===state.user.id&&
   state.couple?.owner_user_id===state.user.id;
  root.className='';
  root.innerHTML=invitationNotice(soloOwner?'Rejoindre le duo':'Un duo est déjà associé',
   '<p class="invitation-notice-account">Compte connecté : <strong>'+safe(state.user.email||'un compte existant')+'</strong>.</p>'+
   '<p>'+(soloOwner?
    'Cet espace ne contient que vous. Si vous êtes bien le destinataire de l’invitation, vous pouvez rejoindre votre partenaire sans créer un nouveau compte.':
    'Ce compte est déjà associé à un autre couple. Un changement automatique risquerait d’affecter votre partenaire actuel.')+'</p>'+
   (soloOwner?
    '<p class="invitation-notice-archive">Vos cartes personnelles et votre historique intime sont archivés avant le changement. Les cartes de l’ancien espace ne sont pas ajoutées au nouveau couple.</p>':'')+
   (state.inviteError?'<p class="entry-auth-feedback" role="alert">'+safe(state.inviteError)+'</p>':'')+
   '<div class="invitation-notice-actions">'+
   (soloOwner?button('join-invite-from-solo','Rejoindre le couple invité','class="entry-auth-submit"'):'')+
   button('switch-account-invite','Utiliser un autre compte','class="entry-auth-resend"')+
   button('invite-return','Revoir l’invitation','class="entry-auth-back"')+'</div>');
  bindActions();return;
 }
 if(!state.profile||!state.profile.birthday_md){
  if(pendingInvite&&state.inviteAccepted){root.innerHTML=inviteProfileHtml(state.user,state.profile);bindActions();}
  else{root.innerHTML=profileHtml(state.user,state.profile);bindActions();}
  return;
 }
 if(state.inviteWelcome){
  root.className='';
  root.innerHTML=invitationNotice('Bienvenue dans LoveRoll','<p>Votre espace à deux est prêt !</p>',' role="status"');
  state.inviteWelcome=false;
  setTimeout(()=>{state.tab='home';render();},1300);return;
 }
 if(pendingInvite&&state.inviteError&&!state.coupleId){
  root.className='';
  root.innerHTML=invitationNotice('Invitation à vérifier',
   '<p class="entry-auth-feedback" role="alert">'+safe(state.inviteError)+'</p>'+
   '<p class="invitation-notice-account">Compte connecté : '+safe(state.user.email||'')+'</p>'+
   '<div class="invitation-notice-actions">'+button('switch-account-invite','Utiliser un autre compte','class="entry-auth-submit"')+
   button('retry-invite','Réessayer','class="entry-auth-resend"')+
   button('invite-return','Revoir l’invitation','class="entry-auth-back"')+'</div>');
  bindActions();return;
 }
 if(state.demoMode){
  for(const dispose of diceCleanup)dispose();diceCleanup=[];
  root.innerHTML=demoCoupleHtml({userName:state.profile.display_name,
   tab:state.demoTab,roll:state.demoRoll,surprise:state.demoSurprise,
   day:state.demoDay,challengeComplete:state.demoChallengeComplete});
  bindActions();return;
 }
 // No demonstration games without two linked accounts. The creator still
 // owns the private card editor and calendar before any invitation.
 if(!isSharedCoupleReady(state.coupleId,state.members)){
  if(!state.coupleId&&pendingInvite){
   root.className='';
   root.innerHTML=invitationNotice('Votre invitation',
    '<p>'+safe(state.inviteError||'Association en attente.')+'</p>'+
    '<div class="invitation-notice-actions">'+button('retry-invite','Réessayer l’association','class="entry-auth-submit"')+
    button('switch-account-invite','Utiliser un autre compte','class="entry-auth-resend"')+'</div>');
   bindActions();return;
  }
  if(state.tab==='invitation'&&state.coupleId)renderPartnerInvitation();
  else if(state.tab==='settings')renderSettings();
  else if(state.tab==='evening-calendar')renderEveningCalendar();
  else if(state.tab==='library'&&isLoveAdmin())renderCardLibrary();
  else if(state.tab==='monthly-library'&&isLoveAdmin())renderMonthlyLibrary();
  else if(state.tab==='advent-editor'&&isLoveAdmin())renderAdventEditor();
  else if(state.tab==='special-editor'&&isLoveAdmin())renderSpecialEventsEditor();
  else if(!state.coupleId){
   state.tab='home';
   frame('<section class="settings-editorial partner-editorial partner-create-page">'+editorialHeader('')+
    '<div class="settings-editorial-content"><div class="editorial-title"><h1>Créer notre duo</h1></div>'+
    '<article class="settings-detail-body partner-owner-scroll">'+matchHtml(state.profile.display_name,false)+'</article></div></section>',
    'Créer notre duo','');
   root.classList.add('loveroll-settings-page');
  }else{
   state.tab='home';renderWaitingPartner();
  }
  return;
 }
 if(state.tab==='home')renderHome();
 else if(state.tab==='ideas')renderIdeas();
 else if(state.tab==='session')renderSession();
 else if(state.tab==='evening-calendar')renderEveningCalendar();
 else if(state.tab==='special')renderSpecial();
 else if(state.tab==='occasions')renderOccasions();
 else if(state.tab==='advent')renderAdvent();
 else if(state.tab==='advent-editor')renderAdventEditor();
 else if(state.tab==='special-editor')renderSpecialEventsEditor();
 else if(state.tab==='settings')renderSettings();
 else if(state.tab==='library')renderCardLibrary();
 else if(state.tab==='monthly-library')renderMonthlyLibrary();
}
async function reload(){
 if(!state.user)return;
 // Only show after 150ms for slow data refreshes. Never interrupt a live
 // dice animation, timer, unsaved form or the initial static boot splash.
 const useLoad=!root.querySelector('[data-lr-boot]')&&!state.diceStatus&&
  !challengeTimer.running&&!hasUnsavedForm()&&!document.hidden;
 const loaderTicket=useLoad?window.LoveRollLoader?.begin(150):null;
 try{
 if(!(await refreshVerifiedIdentity())){
  state.profile=null;state.coupleId=null;state.members=[];state.wellbeing=null;
  state.personalJournal=[];state.pushPrefs=null;
  state.emailVerificationPending=true;state.showAuth=true;
  render();return;
 }
 state.emailVerificationPending=false;
 const [profiles,assessments,personal,pushSettings]=await Promise.all([
  query('couple_profiles',{eq:{id:state.user.id}}),
  query('love_wellbeing',{eq:{user_id:state.user.id}}),
  query('love_personal_intimacy',{eq:{user_id:state.user.id}}),
  query('love_push_preferences',{eq:{user_id:state.user.id}})
 ]);
 state.pushPrefs=pushSettings[0]||{enabled:false,weekly:true,invitation:true,monthly:true,special:true};
 const nativeToken=safeNativePushToken();
 if(state.pushPrefs.enabled&&nativeToken){
  const {error}=await client.rpc('love_claim_native_push_token',{p_token:nativeToken});
  if(error)console.warn('Enregistrement FCM impossible',error.code||'');
 }
 state.pushDevice=await currentPushDevice(client,state.user?.id);

 state.profile=profiles[0]||null;
 state.wellbeing=assessments[0]||null;
 state.personalJournal=personal;
 // Safari can retain an old invitation while this verified account already
 // belongs to a duo. Check real Supabase membership FIRST: never attempt a
 // second acceptance, disconnect a member or hide their existing Home screen.
 const knownMembership=await query('couple_members',{eq:{user_id:state.user.id}});
 if(!knownMembership.length)await autoAcceptPendingInvite();
 const membership=knownMembership.length?knownMembership:
  await query('couple_members',{eq:{user_id:state.user.id}});
 const previousCouple=state.coupleId;
 state.coupleId=membership[0]?.couple_id||null;
 if(!state.coupleId&&!pendingInviteReference(sessionStorage)){
  // A verification email may open in a different browser; find the pending
  // invitation from the authenticated recipient before showing "Créer un duo".
  const resolution=await resolveVerifiedSignup(false);
  if(resolution?.status==='linked'){
   const latest=await query('couple_members',{eq:{user_id:state.user.id}});
   state.coupleId=latest[0]?.couple_id||null;
  }
 }
 if(!state.coupleId){
  if(state.channel){await client.removeChannel(state.channel);state.channel=null;}
  state.couple=null;state.members=[];state.weekly=null;state.monthly={};state.customCards=[];state.monthlyActivities=[];state.rollStatus=null;state.gifts=[];
  state.session=null;state.sessions=[];state.events=[];state.journal=[];state.eveningHistoryStats=[];state.eveningCalendarChallenges=[];state.weeklyRollHistory=[];state.calendarPassQuota=[];state.calendarPassMonth=null;state.cycleStatus=null;state.cycleDeferred=null;state.eveningReviews=[];state.reviewModalSessionId=null;
  state.advent=[];state.adventYear=null;state.adventSelected=null;state.adventServerDate=null;state.advent2026Config=null;state.advent2026Days=[];state.specialEventsConfig=null;state.specialEventKeys=[];state.unlockKey=null;
  state.invitations=[];state.inviteDraft=null;state.challengesHistory=[];state.eveningHistoryStats=[];state.eveningCalendarChallenges=[];state.eveningReviews=[];state.reviewModalSessionId=null;state.reviewDraft={};
  state.tab=['settings','personal-journal'].includes(state.tab)?state.tab:'home';
  state.guidance=state.wellbeing?await rpc('get_love_guidance',{}):'gentle';
  render();return;
 }
 if(previousCouple&&previousCouple!==state.coupleId)state.unlockKey=null;
 const [couple,members,invitations]=await Promise.all([
  query('couples',{eq:{id:state.coupleId}}),
  query('couple_members',{eq:{couple_id:state.coupleId}}),
  query('couple_invitations',{eq:{couple_id:state.coupleId},order:'created_at'})
 ]);
 state.invitations=invitations;
 const completedInvite=pendingInviteReference(sessionStorage);
 // A full duo takes precedence over an old/wrong Messenger invitation on
 // Safari, iPad, Chrome and APK. No extra pairing is possible or needed.
 // Keep pending invitations for a genuine solo account, which may explicitly
 // choose to join the inviting duo through the existing guarded workflow.
 if(completedInvite&&isSharedCoupleReady(state.coupleId,members)&&
    members.some(m=>m.user_id===state.user.id)){
  finishInviteReference();
  state.showAuth=false;state.showDiscover=false;
 }else if(completedInvite?.kind==='id'&&invitations.some(i=>
   i.id===completedInvite.value&&i.couple_id===state.coupleId&&
   i.accepted_at&&!i.cancelled_at)){
  // Old accepted invitation re-opened, but the connected account is already
  // associated to that same couple. Never show a second invitation screen.
  finishInviteReference();
 }
 state.couple=couple[0]||null;
 if(state.couple?.owner_user_id===state.user.id){
  const [cards,personalSexualCards,activities,adventConfig,adventDays,specialSettings]=await Promise.all([
   query('love_custom_challenges',{eq:{couple_id:state.coupleId}}),
   // Only the couple creator can fetch private cards, and only in personal mode.
   state.couple?.sexual_card_mode==='custom'?
    query('love_personal_sexual_cards',{eq:{couple_id:state.coupleId}}):Promise.resolve([]),
   query('love_monthly_activity_overrides',{eq:{couple_id:state.coupleId}}),
   query('love_advent_2026_config',{eq:{couple_id:state.coupleId}}),
   query('love_advent_2026_days',{eq:{couple_id:state.coupleId}}),
   query('love_special_event_catalogue',{eq:{couple_id:state.coupleId}})
  ]);
  // The original saved library is NEVER overwritten by the MEDIUM template.
  // In personal mode, use only this couple's editable 100-card copy.
  // The automatic secret pool is NEVER fetched into browser state.
  state.personalSexualCardsReady=personalSexualCards.length===100;
  state.customCards=state.personalSexualCardsReady?
   [...cards.filter(card=>card.category!=='SEXUEL'),...personalSexualCards]:cards;
  state.monthlyActivities=activities;
  state.advent2026Config=adventConfig[0]||null;state.advent2026Days=adventDays;
  state.specialEventsConfig=specialSettings[0]?.events||null;
 }else{
  state.personalSexualCardsReady=false;
  state.customCards=[];state.monthlyActivities=[];
  state.advent2026Config=null;state.advent2026Days=[];state.specialEventsConfig=null;
 }
 const profilesAll=await query('couple_profiles');
 state.members=members.sort((a,b)=>a.joined_at.localeCompare(b.joined_at)).map(m=>({...m,name:profilesAll.find(p=>p.id===m.user_id)?.display_name||'Profil à compléter',gender:profilesAll.find(p=>p.id===m.user_id)?.gender||null,playStyle:profilesAll.find(p=>p.id===m.user_id)?.play_style||'medium'}));
 state.guidance=state.wellbeing?await rpc('get_love_guidance',{p_couple:state.coupleId}):'gentle';
 if(members.length===2)await refreshShared();
 subscribe();render();
 }finally{if(loaderTicket!=null)window.LoveRollLoader?.end(loaderTicket);}
}
async function refreshShared(){
 const c=state.coupleId;
 const [rolls,sessions,advents,events,diary,occasionSettings,occasionRolls,keys,challengeHistory,gifts,adventServerDate,eveningStats,calendarChallenges,eveningReviews,calendarPasses,cycleInfo]=await Promise.all([
 query('couple_rolls',{eq:{couple_id:c}}),
 query('couple_sessions',{eq:{couple_id:c},order:'started_at'}),
 query('couple_advent',{eq:{couple_id:c}}),
 query('couple_events',{eq:{couple_id:c},order:'happened_at'}),
 query('couple_intimacy',{eq:{couple_id:c}}),
 query('couple_occasion_settings',{eq:{couple_id:c}}),
 query('couple_occasion_rolls',{eq:{couple_id:c}}),
 rpc('my_love_special_event_keys',{p_couple:c}),
 query('couple_challenges',{eq:{couple_id:c}}),
 query('couple_challenge_gifts',{eq:{couple_id:c}}),
 rpc('love_advent_server_date'),
 rpc('love_evening_session_stats',{p_couple:c}),
 rpc('love_evening_calendar_challenges',{p_couple:c}),
 rpc('love_evening_reviews_for_couple',{p_couple:c}),
 rpc('love_calendar_pass_quota',{p_couple:c,p_month:state.eveningCalendarMonth||month()}),
 rpc('love_cycle_status',{p_couple:c})
 ]);
 state.cycleStatus=cycleInfo;
 if(!cycleInfo?.pending)state.cycleDeferred=null;
 state.eveningHistoryStats=Array.isArray(eveningStats)?eveningStats:[];
 state.eveningCalendarChallenges=Array.isArray(calendarChallenges)?calendarChallenges:[];
 state.calendarPassQuota=Array.isArray(calendarPasses)?calendarPasses:[];
 state.calendarPassMonth=state.eveningCalendarMonth||month();
 state.eveningReviews=Array.isArray(eveningReviews)?eveningReviews:[];
 state.gifts=gifts;
 state.challengesHistory=challengeHistory;
 state.occasionSettings=occasionSettings[0]||null;
 state.occasionRolls=occasionRolls;
 state.specialEventKeys=Array.isArray(keys)?keys:[];
 state.weeklyRollHistory=rolls.filter(r=>r.kind==='weekly');
 state.weekly=rolls.find(r=>r.kind==='weekly'&&r.key===week());
 state.monthly={};
 for(const r of rolls.filter(r=>r.key===month()))state.monthly[r.kind]=r;
 state.session=sessions.find(s=>s.finished_at===null)||null;
 state.sessions=sessions;state.events=events;state.journal=diary;state.advent=advents;state.adventServerDate=adventServerDate;
 // After manual/automatic closure, both partners see their own review bubble.
 // A dismissed bubble stays dismissed in this tab; the calendar offers reopening.
 const latestEnded=[...sessions].filter(row=>row.finished_at&&row.counted)
  .sort((a,b)=>Date.parse(b.finished_at)-Date.parse(a.finished_at))[0];
 const existing=latestEnded&&state.eveningReviews.some(r=>
  r.session_id===latestEnded.id&&r.author_id===state.user?.id);
 if(!state.session&&latestEnded&&!existing&&
   state.reviewDismissedSessionId!==latestEnded.id&&!state.reviewModalSessionId){
  state.reviewModalSessionId=latestEnded.id;
  state.reviewDraft={comment:''};
 }
 if(state.reviewModalSessionId&&state.eveningReviews.some(r=>
  r.session_id===state.reviewModalSessionId&&r.author_id===state.user?.id)&&
  !state.reviewDraft?.editing){
  state.reviewModalSessionId=null;
  state.reviewDraft={};
 }
 if(state.session){
  const [personal,challenges,status,board]=await Promise.all([
    query('couple_personal_rolls',{eq:{session_id:state.session.id}}),
    query('couple_challenges',{eq:{session_id:state.session.id},order:'created_at'}),
    rpc('my_love_roll_status',{p_session:state.session.id}),
    rpc('my_love_evening_board',{p_session:state.session.id})
  ]);
  state.personal=personal;
  // The SELECT policy also restricts these rows, so a partner never gets
  // another person's challenge title, description or D100 face.
  state.challenges=ownEveningChallenges(challenges,state.user.id,state.session.id);
  state.rollStatus=status?.[0]||null;
  state.eveningBoard=board||null;
  const ownIds=new Set(state.challenges.map(c=>c.id));
  if(state.eveningQueueSeen?.session===state.session.id){
   const fresh=state.challenges.find(c=>!state.eveningQueueSeen.ids.has(c.id));
   if(fresh&&state.tab==='session'&&!state.diceStatus){
    state.selectedEveningChallengeId=fresh.id;state.showEveningChallenges=true;
   }
  }
  state.eveningQueueSeen={session:state.session.id,ids:ownIds};
 }else{
  state.personal=[];state.challenges=[];state.rollStatus=null;
  state.eveningBoard=null;state.eveningQueueSeen=null;
  state.selectedEveningChallengeId=null;state.showEveningChallenges=false;
 }
 // Only counts are revealed to the invited partner; titles remain owner-private.
 try{
  const totals=await rpc('my_love_evening_card_totals',{p_couple:c});
  state.playableCounts=Array.isArray(totals)?totals[0]||null:null;
 }catch(error){state.playableCounts=null;}
}
const liveSync=createCoupleLiveSync({
 state,query,rpc,refresh:refreshShared,render,ready:isSharedCoupleReady,
 week,month,formDirty:hasUnsavedForm
});
let realtimeReconnectTimer=null;
function subscribe(){
 if(!state.coupleId)return;
 if(state.channel)client.removeChannel(state.channel);
 let channel=client.channel('shared-couple-'+state.coupleId);
 channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'couple_members',
  filter:'couple_id=eq.'+state.coupleId},async()=>{
   try{await reload();if(state.coupleId&&state.members.length===2)notify('♡ Votre partenaire a accepté le match !');}catch(e){fail(e);}
 });
 // Settings only: sync new odds to the other device without changing Soirée
 // visuals or resetting dice. Couples UPDATE is filtered by RLS membership.
 channel=channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'couples',
  filter:'id=eq.'+state.coupleId},payload=>{
  const updated=payload?.new;
  if(!updated||updated.id!==state.coupleId||!state.couple)return;
  state.couple={...state.couple,...updated};
  if(state.tab==='home'||(state.tab==='settings'&&settingsOpenSection==='admin'&&!hasUnsavedForm()))
   render();
 });
 if(state.members.length<2){
  state.channel=channel.subscribe(status=>{if(status==='SUBSCRIBED')liveSync.request(200);});
  return;
 }
 for(const table of ['couple_occasion_rolls','couple_occasion_settings','couple_rolls','couple_sessions','couple_challenges','couple_challenge_gifts',
  'couple_advent','couple_intimacy','couple_events'])
  channel=channel.on('postgres_changes',{event:'*',schema:'public',table,
   filter:'couple_id=eq.'+state.coupleId},async payload=>{
    if(payload.new?.actor_id&&payload.new.actor_id!==state.user.id)
     notify(person(payload.new.actor_id)+' a effectué une action dans votre jeu');
    liveSync.request(200);
   });
 channel=channel.on('postgres_changes',{event:'INSERT',schema:'public',
  table:'couple_personal_rolls'},()=>liveSync.request(120));
 state.channel=channel.subscribe(status=>{
   if(state.channel!==channel)return;
   if(status==='SUBSCRIBED'){
    if(realtimeReconnectTimer){clearTimeout(realtimeReconnectTimer);realtimeReconnectTimer=null;}
    liveSync.request(100);
   }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)&&!realtimeReconnectTimer){
    realtimeReconnectTimer=setTimeout(()=>{
     realtimeReconnectTimer=null;
     if(state.channel===channel&&state.user&&!document.hidden)subscribe();
    },4500);
   }
  });
}
function heroDice(face,sides,label){
 return '<div class="dice-row premium-dice-row"><div class="die premium-die premium-die-'+sides+'"><strong class="dice-fallback">'+'♡'+'</strong><canvas class="dice-canvas" width="190" height="190"'+
  ' data-dice-sides="'+sides+'" data-face="'+(face||1)+'" data-spinning="'+(!!state.diceStatus)+'"'+
  ' aria-label="Dé '+sides+' en 3D. Résultat '+(face||'pas encore tiré')+'"></canvas></div>'+
 '<div class="premium-die-caption"><div class="eyebrow">'+safe(label)+'</div>'+
 '<p>'+(!face?'En attente du tirage officiel.':'Le dé affiche votre résultat officiel')+
 '.</p></div></div>';
}
function statsRow(){return '<div class="stat-grid">'+[
 [state.weekly?.face||'—','Soirées semaine'],
 [state.personal.find(r=>r.user_id===state.user?.id)?.face||'—','Mes défis'],
 [state.personal.find(r=>r.user_id===other()?.user_id)?.face||'—',safe(other()?.name||'Partenaire')]
 ].map(([v,label])=>'<div class="stat"><strong>'+safe(v)+'</strong><small>'+label+'</small></div>').join('')+'</div>';}
function ideaHtml(){
 const content=guidedIdeas(state.guidance);
 return '<section class="card"><div class="eyebrow">Des idées selon vos envies</div><h2>'+safe(content.heading)+'</h2>'+
 '<p>Ces propositions tiennent compte du ressenti du couple sans dévoiler les réponses individuelles. Chacun peut dire non ou proposer autre chose.</p>'+
 content.ideas.map(([title,detail])=>'<div class="muted-line"><strong>'+safe(title)+'</strong><p>'+safe(detail)+'</p></div>').join('')+'</section>';
}
function ideaPreview(){
 const g=guidedIdeas(state.guidance);
 return '<section class="card"><div class="eyebrow">Votre inspiration</div>'+
 '<h3>♡ '+safe(g.heading)+'</h3>'+
 '<p>Des propositions adaptées, sans pression et toujours facultatives.</p>'+
 button('tab:ideas','Découvrir nos idées de soirées')+'</section>';
}
function renderIdeas(){
 frame(ideaHtml()+'<section class="card">'+button('tab:home','← Retour à l’accueil','class="subtle"')+'</section>',
  'NOS IDÉES DE SOIRÉE','Complicité et intimité selon votre rythme');
}
function renderInvitePanel(){
 const latest=state.invitations?.find(x=>!x.cancelled_at&&!x.accepted_at&&new Date(x.expires_at)>new Date())||
  state.invitations?.[0];
 const ready=state.members?.length===2;
 const status=invitationStatus(latest,ready);
 const active=latest&&!ready&&!latest.cancelled_at&&!latest.accepted_at&&
  new Date(latest.expires_at)>new Date();
 const draft=active?{id:latest.id,email:latest.invited_email,
  link:inviteLinkForId(CONFIG.siteUrl,latest.id)}:null;
 let html='<section class="partner-invite-panel" aria-label="Votre invitation">'+
  '<div class="partner-invite-status" role="status"><span>'+editorialIcon(ready?'check':'mail')+'</span>'+
  '<div><strong>'+safe(status.title)+'</strong><p>'+safe(status.hint)+'</p></div></div>';
 if(!ready){
  html+='<div class="partner-invite-fields"><label>Courriel de votre partenaire<input id="invite-email" type="email" autocomplete="email" aria-describedby="invite-email-hint" placeholder="partenaire@exemple.com" value="'+safe(draft?.email||latest?.invited_email||'')+'"></label>'+
   '<p id="invite-email-hint" class="tiny-note">Votre partenaire devra utiliser cette adresse pour accepter.</p>'+
   (!active?button('invite','Créer mon invitation','class="settings-primary"'):'')+'</div>';
  if(active||!latest){
   html+='<div class="partner-invite-share"><h2>Partager le lien</h2><div class="partner-invite-actions">'+
    button('send-messenger','Messenger','class="settings-secondary"')+
    button('send-sms','Texto SMS','class="settings-secondary"')+
    button('send-email','Courriel','class="settings-secondary"')+
    (active?button('copy-invite','Copier le lien','class="settings-secondary"'):'')+'</div>'+
    '<p class="tiny-note">Choisissez le destinataire et confirmez l’envoi dans votre messagerie.</p></div>';
  }
  if(latest&&!active)html+='<p class="tiny-note">Ce lien n’est plus actif. Créez une invitation si votre duo n’est pas encore associé.</p>';
  if(state.inviteCopyFallback&&draft)html+='<label class="invite-copy-manual">Lien à sélectionner et copier<input id="invite-manual-link" readonly aria-label="Lien d’invitation à copier" value="'+safe(draft.link)+'"></label>';
  if(draft)html+=button('confirm-invite-sent','J’ai envoyé l’invitation','class="settings-primary"');
 }
 if(latest)html+='<details class="partner-invite-options"><summary>Détails et options du lien</summary><div class="partner-invite-option-body">'+
  '<p class="tiny-note">Destinataire : '+safe(latest.invited_email)+'<br>Préparée le '+safe(new Date(latest.created_at).toLocaleDateString('fr-CA'))+'</p>'+
  (active?'<p class="tiny-note">Vous pouvez partager le même lien tant qu’il est valide. Le remplacer rend le précédent inutilisable.</p>'+
   button('invite','Remplacer le lien actuel','class="settings-secondary"')+
   button('cancel-invite:'+latest.id,'Annuler cette invitation','class="settings-signout danger-action"'):'')+'</div></details>';
 if(draft)html+='<details class="partner-invite-preview"><summary>Aperçu de votre invitation</summary>'+invitationPreviewMarkup()+'</details>';
 return html+'</section>';
}
function renderPartnerInvitation(){
 if(!state.coupleId){state.tab='settings';renderSettings();return;}
 frame('<section class="settings-editorial partner-editorial partner-invitation-page">'+editorialHeader('tab:settings','Réglages')+
  '<div class="settings-editorial-content"><div class="editorial-title"><h1>Inviter mon partenaire</h1></div>'+
  '<article class="settings-detail-body partner-owner-scroll">'+renderInvitePanel()+'</article></div></section>',
  'Inviter mon partenaire','');
 root.classList.add('loveroll-settings-page');
}
function renderCoupleOverview(){
 const started=state.occasionSettings?.relationship_started_on;
 const cs=coupleStats(state.sessions||[],state.challengesHistory||[]);
 const currentMonth=month();
 const intimate=state.journal.filter(e=>e.happened_on.startsWith(currentMonth)).length;
 return '<section class="card"><div class="eyebrow">♡ VOTRE COUPLE</div>'+
 '<h3>Notre histoire en chiffres</h3>'+
 '<p>En couple depuis le <strong>'+safe(formatCoupleDate(started))+'</strong></p>'+
 
 '<div class="stat-grid"><div class="stat"><strong>'+safe(cs.percentage===null?'—':cs.percentage+' %')+'</strong><small>Soirées terminées</small></div>'+
 '<div class="stat"><strong>'+cs.completed+' / '+cs.opened+'</strong><small>Soirées jouées</small></div>'+
 '<div class="stat"><strong>'+cs.challengesDone+'</strong><small>Défis réalisés</small></div></div>'+
 '<div class="couple-progress"><span style="width:'+safe(cs.percentage||0)+'%"></span></div>'+
 '<p class="tiny-note">Pourcentage = soirées entièrement terminées / soirées commencées.</p>'+
 '<div class="stat-grid"><div class="stat"><strong>'+intimate+'</strong><small>Rapports enregistrés ce mois</small></div>'+
 '<div class="stat"><strong>'+state.journal.length+'</strong><small>Rapports consignés au total</small></div></div>'+
 '<p class="tiny-note">Chiffres issus de votre journal de couple chiffré. Les notes détaillées restent privées.</p>'+
 button('tab:journal','Ouvrir nos statistiques et le calendrier','class="subtle"')+'</section>';
}
function renderWaitingPartner(){
 const name=safe(state.profile.display_name);
 const latest=state.invitations?.find(x=>!x.cancelled_at&&!x.accepted_at&&new Date(x.expires_at)>new Date())||state.invitations?.[0];
 const status=invitationStatus(latest,false);
 frame('<section class="settings-editorial partner-editorial partner-waiting-page">'+editorialHeader('')+
  '<div class="settings-editorial-content"><div class="editorial-title"><h1>Votre espace est prêt</h1></div>'+
  '<article class="settings-detail-body partner-owner-scroll partner-waiting-content">'+
  '<p>'+name+', votre aventure à deux commence ici.</p>'+
  '<div class="partner-invite-status" role="status"><span>'+editorialIcon('heart')+'</span><div><strong>'+safe(status.title)+'</strong><p>'+safe(status.hint)+'</p></div></div>'+
  button('tab:invitation',latest?'Ouvrir mon invitation':'Inviter mon partenaire','class="settings-primary"')+
  '<ol class="partner-waiting-steps" aria-label="Les prochaines étapes"><li><span aria-hidden="true">1</span>Partagez votre lien privé</li><li><span aria-hidden="true">2</span>Votre partenaire accepte</li></ol>'+
  '<p class="tiny-note">Vos dés et vos soirées s’activent dès que votre duo est associé.</p>'+
  '<details class="partner-waiting-prepare"><summary>Préparer nos jeux pendant l’attente</summary><div>'+
  editorialRow('Nos 200 défis','','tab:library','dice')+
  editorialRow('20 activités du mois','','tab:monthly-library','star')+
  editorialRow('Événements spéciaux','','tab:special-editor','heart')+
  editorialRow('Calendrier de l’Avent','','tab:advent-editor','calendar')+
  '</div></details></article></div></section>','Mon espace','');
 root.classList.add('loveroll-settings-page');
}
function renderHome(){
 const members=state.members||[];
 const activeEvening=playableSessionForWeekly(state.session,state.weekly);
 const turn=activeEvening&&activeEvening.self_draws?
  state.eveningBoard||sharedEveningTurns(activeEvening,members,state.personal,state.challenges,state.gifts):null;
 frame(premiumHomeHtml({
  weekly:state.weekly,
  weeklyWeights:state.couple?.weekly_face_weights,
  weeklyWeightsEnabled:state.couple?.weekly_weights_enabled!==false,
  rolling:state.diceStatus==='rolling',
  disabled:!!state.diceStatus,
  members,
  turn,monthly:state.monthly,
  history:state.challengesHistory||[],
  sessions:state.sessions||[],
  rollFace:state.rollAnimationFace||1,
  events:state.events||[]
 }),'LOVEROLL','La complicité se joue à deux');
}

function saveChallengeTimer(){
 if(!challengeTimer.id||!state.user)return;
 try{sessionStorage.setItem('loveroll-challenge-clock:'+state.user.id+':'+challengeTimer.id,
  JSON.stringify({durationMs:challengeTimer.durationMs,remainingMs:clockMs(),
   deadline:challengeTimer.deadline,running:challengeTimer.running,notified:challengeTimer.notified}));
 }catch{}
}
function activeTimer(challenge,minutes){
 const millis=minutes*60000;
 if(challengeTimer.id!==challenge.id){
  saveChallengeTimer();
  let stored=null;
  try{
   stored=JSON.parse(sessionStorage.getItem('loveroll-challenge-clock:'+state.user.id+':'+challenge.id)||'null');
  }catch{}
  challengeTimer.id=challenge.id;
  challengeTimer.durationMs=millis;
  challengeTimer.remainingMs=stored?.durationMs===millis&&Number.isFinite(stored.remainingMs)?
   Math.max(0,Math.min(millis,stored.remainingMs)):millis;
  challengeTimer.deadline=stored?.durationMs===millis&&Number.isFinite(stored.deadline)?
   stored.deadline:0;
  challengeTimer.running=!!(stored?.running&&challengeTimer.deadline>0);
  challengeTimer.notified=!!stored?.notified;
 }
}
function clockMs(){
 return challengeTimer.running?Math.max(0,challengeTimer.deadline-Date.now()):challengeTimer.remainingMs;
}
function endSignal(){
 if(challengeTimer.notified)return;
 challengeTimer.notified=true;
 if(challengeTimer.mode==='vibrate'){
  if(typeof navigator.vibrate==='function')navigator.vibrate([190,90,190,90,360]);
  else notify("Le minuteur est terminé. La vibration n'est pas offerte sur cet iPhone : utilisez Son.");
 }else{
  try{
   const context=timerCtx||new (window.AudioContext||window.webkitAudioContext)();
   timerCtx=context;
   context.resume().catch(()=>{});
   for(const [idx,pitch] of [392,494,587].entries()){
    const osc=context.createOscillator(),gain=context.createGain();
    osc.type='sine';osc.frequency.value=pitch;
    osc.connect(gain);gain.connect(context.destination);
    const when=context.currentTime+idx*.25;
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.exponentialRampToValueAtTime(.13,when+.035);
    gain.gain.exponentialRampToValueAtTime(.0001,when+.6);
    osc.start(when);osc.stop(when+.61);
   }
  }catch(e){console.warn('Son indisponible',e);}
 }
 notify('♡ Minuteur terminé. À vous de décider si le défi continue.');
}
function updateChallengeClock(){
 if(!challengeTimer.id)return;
 if(challengeTimer.running&&Date.now()>=challengeTimer.deadline){
  challengeTimer.running=false;challengeTimer.remainingMs=0;endSignal();saveChallengeTimer();
 }
 const clock=document.getElementById('challenge-timer-clock');
 if(clock)clock.textContent=formatCountdown(clockMs());
 const button=document.getElementById('challenge-timer-toggle');
 if(button)button.textContent=challengeTimer.running?'Ⅱ Pause':'▶ '+(challengeTimer.remainingMs<challengeTimer.durationMs?'Reprendre':'Démarrer');
 const status=document.getElementById('challenge-timer-status');
 if(status)status.textContent=challengeTimer.running?'En cours':challengeTimer.remainingMs===0?'Terminé':'À votre rythme';
}
setInterval(updateChallengeClock,500);
function timerWidget(challenge,minutes){
 if(minutes===null||minutes===undefined||minutes===0)return '<p class="tiny-note">♡ Sans minuteur · l’activité se termine quand vous le souhaitez.</p>';
 activeTimer(challenge,minutes);
 return '<div class="timer-panel"><div class="eyebrow">⏱ Minuteur du défi · '+minutes+' min</div>'+
   '<div id="challenge-timer-clock" class="timer-clock">'+formatCountdown(clockMs())+'</div>'+
   '<p id="challenge-timer-status">'+(challengeTimer.running?'En cours':'À votre rythme')+'</p>'+
   '<div class="actions"><button id="challenge-timer-toggle" data-action="timer-toggle">'+
    (challengeTimer.running?'Ⅱ Pause':'▶ Démarrer')+'</button>'+
   button('timer-reset','↻ Recommencer','class="subtle"')+'</div>'+
   '<div class="chipline" style="margin-top:9px">'+
   '<button class="pill '+(challengeTimer.mode==='sound'?'selected':'')+'" data-action="timer-mode:sound">♫ Son doux</button>'+
   '<button class="pill '+(challengeTimer.mode==='vibrate'?'selected':'')+'" data-action="timer-mode:vibrate">〰 Vibration</button></div>'+
   '<small>Sonnerie discrète en fin de compte à rebours; sur iPhone, la vibration peut être indisponible. Le minuteur n’oblige jamais à poursuivre.</small></div>';
}
function renderLegacySession(){
 let s=state.session; const p=other();
 let body='<section class="legacy-session-intro"><p>200 cartes à personnaliser : 100 Sensuel + 100 Sexuel.</p></section>'+
 '<section class="card hero-game-card"><div class="premium-eyebrow">♡ LE DÉ DES DÉFIS</div>'+
 heroDice(null,100,'Nos 200 défis')+
 '<p class="tiny-note">Pour commencer, chacun lance son dé personnel pour découvrir combien de défis il recevra. Vos résultats sont révélés ensemble.</p>';
 if(!s){
  const latest=latestCountedSession(state.sessions);
  if(latest){
   const total=state.challengesHistory.filter(c=>c.session_id===latest.id);
   const done=total.filter(c=>c.status==='completed').length;
   const responses=(state.eveningReviews||[]).filter(r=>r.session_id===latest.id).length;
   const myReview=(state.eveningReviews||[]).some(r=>r.session_id===latest.id&&r.author_id===state.user.id);
   body+='<div class="aftercare-card"><h2>♥ Soirée terminée</h2>'+
    '<p>Un moment partagé à deux. Prenez le temps de donner votre bilan.</p>'+
    '<div class="stat-grid"><div class="stat"><strong>'+done+'</strong><small>Défis réalisés</small></div>'+
    '<div class="stat"><strong>'+responses+'/2</strong><small>Bilans enregistrés</small></div></div>'+
    button('review-open:'+latest.id,myReview?'♡ Modifier mon bilan':'♡ Donner mon bilan')+
    button('evening-calendar','Consulter notre calendrier','class="subtle"')+'</div>';
  }
  body+=button('new-session','Commencer une nouvelle soirée');
 }
 else{
  const mine=state.personal.find(x=>x.user_id===state.user.id);
  const theirs=state.personal.find(x=>x.user_id===p.user_id);
  body+='<div class="premium-eyebrow">ÉTAPE 1 · COMBIEN DE DÉFIS ?</div>'+heroDice(mine?.face,6,'Mes défis à recevoir')+
  '<div class="two"><div class="stat"><strong>'+safe(mine?.face||'—')+'</strong><small>'+safe(state.profile.display_name)+'</small></div>'+
  '<div class="stat"><strong>'+safe(theirs?.face||'—')+'</strong><small>'+safe(p.name)+'</small></div></div>';
  if(!state.rollStatus?.both_ready){
   body+='<section class="card"><h3>Une révélation à deux</h3>'+
    '<p>Mon lancer : '+(state.rollStatus?.my_rolled?'✓ Lancé · résultat secret':'Pas encore lancé')+'</p>'+
    '<p>Son lancer · '+safe(p.name)+' : '+(state.rollStatus?.partner_rolled?'✓ Lancé · résultat secret':'En attente')+'</p>';
   if(!state.rollStatus?.my_rolled)body+=button('my-d6','🎲 LANCER MON DÉ');
   else body+='<p>Tu as joué. Le compte à rebours ne démarre pas : attends le lancer de '+safe(p.name)+'.</p>';
   body+='</section>';
  }
  else{
   const proposed=state.challenges.filter(x=>x.recipient===state.user.id);
   const active=proposed.filter(x=>['proposed','accepted'].includes(x.status)).at(-1);
   const completed=proposed.filter(x=>x.status==='completed').length;
   body+='<p>Mes défis terminés : '+completed+' / '+mine.face+
    ' · '+safe(p.name)+' donne mes défis.</p>';
   if(active){
    const challenge=resolvedCard(active);
    body+='<div class="card challenge-present"><div class="eyebrow">'+safe(names[active.category])+
     ' · CARTE N° '+safe(active.face)+'</div>'+heroDice(active.face,100,'Notre défi surprise')+
     '<div class="challenge-roles">♡ '+safe(p.name).toUpperCase()+' OFFRE → '+safe(state.profile.display_name).toUpperCase()+' REÇOIT</div>'+
     '<h3>'+safe(challenge.title)+'</h3>'+
     '<p>'+safe(challenge.description)+'</p>' +
     timerWidget(active,challenge.minutes)+
     '<div class="actions">'+
     (active.status==='proposed'?button('answer:'+active.id+':accepted','Accepter'):'')+
     (active.status==='accepted'?button('answer:'+active.id+':completed','Terminé'):'')+
     button('answer:'+active.id+':passed','Passer')+'</div></div>';
   }else if(completed<mine.face)body+='<p>Votre partenaire prépare le prochain défi surprise à vous offrir.</p>';
   const otherActive=state.challenges.filter(x=>x.recipient===p.user_id&&['proposed','accepted'].includes(x.status)).at(-1);
   const otherCompleted=state.challenges.filter(x=>x.recipient===p.user_id&&x.status==='completed').length;
   if(!otherActive&&otherCompleted<theirs.face){
    body+='<div class="card"><h3>Défi '+(otherCompleted+1)+' / '+theirs.face+
     ' à offrir à '+safe(p.name)+'</h3>'+
     '<p>Choisissez votre catégorie. LoveRoll sélectionnera le défi parmi nos 200 emplacements.</p>'+
     '<div class="chipline">'+EVENING_CATEGORIES.map(c=>
     '<button class="pill '+(state.category===c?'selected':'')+'" data-action="category:'+c+'">'+names[c]+'</button>').join('')+'</div>'+
     '<p>'+(state.couple?.category_weights_enabled===false?50:state.couple?.category_preference_percent??88)+
     ' % dans votre catégorie choisie · '+(100-(state.couple?.category_weights_enabled===false?50:
       state.couple?.category_preference_percent??88))+' % dans l’autre. Choisissez à chaque défi.</p>'+
     (EVENING_CATEGORIES.includes(state.category)?
      button('new-challenge','🎲 DÉCOUVRIR UN DÉFI POUR '+safe(p.name)):
      '<p class="tiny-note">Sélectionnez Sensuel ou Sexuel pour activer le tirage.</p>')+'</div>';
   }else if(otherActive){const giving=resolvedCard(otherActive);
    body+='<section class="card"><div class="challenge-roles">♡ '+safe(state.profile.display_name).toUpperCase()+' OFFRE → '+safe(p.name).toUpperCase()+' REÇOIT</div>'+
    '<h3>Mon défi à offrir : '+safe(giving.title)+'</h3><p>'+safe(giving.description)+'</p>'+
    (active?'<p class="tiny-note">Minuteur et contrôle principal accessibles dans le défi reçu.</p>':
     timerWidget(otherActive,giving.minutes))+'</section>';
   }
  }
  const myTarget=mine?.face||0,otherTarget=theirs?.face||0;
  const mineCompleted=state.challenges.filter(x=>x.recipient===state.user.id&&x.status==='completed').length;
  const theirCompleted=state.challenges.filter(x=>x.recipient===p.user_id&&x.status==='completed').length;
  const canFinish=myTarget>0&&otherTarget>0&&mineCompleted>=myTarget&&theirCompleted>=otherTarget;
  if(canFinish)body+=button('finish-session','✓ Terminer et compter la soirée');
  else body+='<p>La soirée sera comptée seulement quand les défis des deux personnes seront terminés.</p>';
  if(state.confirmCancel){
   body+='<div class="card"><h3>Arrêter sans compter ?</h3>'+
    '<p>La soirée sera fermée sans modifier la progression hebdomadaire.</p>'+
    '<div class="actions">'+button('confirm-cancel','Oui, arrêter')+
    button('dismiss-cancel','Continuer','class="subtle"')+'</div></div>';
  }else body+=button('cancel-session','Arrêter sans la compter','class="subtle"');
 }
 body+='</section>';
 body+='<section class="card"><h3>♡ Nos calendriers</h3>'+
  button('tab:journal','Ouvrir notre calendrier partagé','class="subtle"')+
  button('tab:personal-journal','Ouvrir mon calendrier personnel')+'</section>';
 if(!s&&state.sessions?.some(x=>x.finished_at&&x.counted))body+=renderCoupleOverview();
 frame('<section class="settings-editorial legacy-session-editorial">'+editorialHeader('tab:home','Accueil')+
  '<div class="settings-editorial-content"><div class="editorial-title"><h1>Notre soirée</h1></div>'+
  '<article class="legacy-session-scroll" aria-label="Défis et commandes de notre soirée" tabindex="0">'+body+'</article></div></section>',
  'Notre soirée',s?'Vos défis à offrir et à recevoir':'Un nouveau moment à deux');
 root.classList.add('loveroll-settings-page');
}
function renderSession(){
 // Always show the same Soirée page, even when the weekly die is unrolled.
 // In that case the launch control is disabled, not replaced with a separate page.
 const session=playableSessionForWeekly(state.session,state.weekly),partner=other(),uid=state.user.id;
 if(session&&!state.category){
  try{
   const saved=sessionStorage.getItem('loveroll-category-'+session.id);
   if(EVENING_CATEGORIES.includes(saved)||saved==='HASARD')state.category=saved;
  }catch{}
 }
 if((state.category==='SENSUEL'&&state.couple?.show_sensuel_button===false)||
    (state.category==='SEXUEL'&&state.couple?.show_sexuel_button===false))
  state.category=null;
 if(session&&(!session.paired_turns||!session.self_draws))return renderLegacySession();
 const turn=session?(state.eveningBoard||sharedEveningTurns(session,state.members,state.personal,state.challenges,state.gifts)):{};
 const mineCards=session?ownEveningChallenges(state.challenges,uid,session.id):[];
 const daily=eveningDailyAccess({sessions:state.sessions,weekly:state.weekly});
 const last=daily.closedToday;
 const recentReviews=last?(state.eveningReviews||[]).filter(x=>x.session_id===last.id):[];
 const lastEvening=last?{id:last.id,completed:state.eveningCalendarChallenges.filter(
    c=>c.session_id===last.id&&c.status==='completed').length,
   responses:recentReviews.length,
   myResponse:recentReviews.some(f=>f.author_id===uid),
   partnerResponse:recentReviews.some(f=>f.author_id===partner?.user_id)}:null;
 const canStartEvening=daily.canStart;
 const gifts=state.gifts||[];
 const giftCount=gifts.filter(g=>g.donor_user_id===uid&&g.month_key?.slice(0,7)===month()).length;
 let overlay='';
 // Personal queue: each account sees only cards received by THAT user.
 // Draws can all be completed before any challenge is accepted or played.
 const selected=mineCards.find(c=>c.id===state.selectedEveningChallengeId);
 if(session&&state.showEveningChallenges){
  const view=selected;
  const idx=view?queuePosition(mineCards,view.id):-1;
  overlay='<div class="surprise-modal evening-queue-modal'+(view?' is-detail':'')+'" role="dialog" aria-modal="true" aria-label="Mes défis de ce soir">'+
   '<article class="surprise-modal-content evening-queue-content'+(view?' is-detail':'')+'">'+
   '<div class="eyebrow">♡ MES DÉFIS DU SOIR</div>'+
   (view?
    '<div class="evening-queue-nav">'+
     button('evening-list','← Mes défis ('+mineCards.length+')','class="subtle"')+
     button('evening-close','✕ Fermer','class="subtle"')+'</div>':
    '<div class="evening-queue-heading"><h2>Mes '+mineCards.length+' défis</h2>'+
     button('evening-close','✕ Fermer','class="subtle"')+'</div>')+
   (view?
    '<div class="evening-queue-detail">'+
     '<div class="evening-challenge-badge">♥ '+safe(names[view.category]||view.category)+
      ' · Résultat : '+safe(view.face)+' · '+safe(queueLabel(view.status))+'</div>'+
     '<h2>'+safe(resolvedCard(view).title)+'</h2>'+
     '<div class="evening-challenge-scene" aria-hidden="true"></div>'+
     '<p>'+safe(resolvedCard(view).description)+'</p>'+
     timerWidget(view,resolvedCard(view).minutes)+
     (view.status==='proposed'?
       button('evening-start:'+view.id,'▶ Commencer ce défi','class="evening-primary"'):'')+
     (view.status==='accepted'?
       button('answer:'+view.id+':completed','✓ Défi réalisé','class="evening-primary"'):'')+
     (['proposed','accepted'].includes(view.status)?
       button('answer:'+view.id+':passed','Passer ce défi','class="subtle"'):'')+
     '<div class="evening-queue-nav">'+
       (idx>0?button('evening-open:'+mineCards[idx-1].id,'← Précédent','class="subtle"'):'<span></span>')+
       (idx<mineCards.length-1?button('evening-open:'+mineCards[idx+1].id,'Suivant →','class="subtle"'):'<span></span>')+
      '</div></div>':
    '<p class="evening-queue-instructions">Tous tes tirages restent ici. Pige maintenant, puis commence les défis dans l’ordre de ton choix.</p>'+
     '<div class="evening-queue-list">'+(mineCards.length?mineCards.map((card,i)=>
       button('evening-open:'+card.id,
        '<span class="evening-queue-num">'+(i+1)+'</span>'+
        '<span class="evening-queue-entry"><strong>'+safe(resolvedCard(card).title)+'</strong>'+
        '<small>'+safe(names[card.category]||card.category)+' · '+
        (resolvedCard(card).minutes?resolvedCard(card).minutes+' min · ':'')+
        (card.status==='completed'?'✓ ':'')+
        safe(queueLabel(card.status))+'</small></span><span>›</span>',
        'class="evening-queue-item'+(card.status==='completed'?' is-completed':'')+'"')).join(''):
       '<p>Aucun défi pigé pour le moment. Sélectionne Sensuel ou Sexuel, puis lance ton dé.</p>')+
     '</div>')+
   '</article></div>';
 }
 frame(premiumEveningHtml({
   session,members:state.members,me:uid,rolls:state.personal,status:state.rollStatus,
   turn,category:state.category,
   showSensuel:state.couple?.show_sensuel_button!==false,
   showSexuel:state.couple?.show_sexuel_button!==false,
   categoryOdds:state.couple?.category_weights_enabled===false?50:
    state.couple?.category_preference_percent??88,
   giftCount,rolling:state.diceStatus==='rolling'||state.diceStatus==='pending',rollFace:state.rollAnimationFace,
   playable:state.playableCounts||(isLoveAdmin()?playableEveningCount(state.customCards):null),
   rollingKind:state.rollAnimationKind,showMore:state.eveningMore,confirmCancel:state.confirmCancel,
   challengeOverlay:overlay,lastEvening,canStartEvening,
   challengeHistory:[...state.challengesHistory,...state.eveningCalendarChallenges,...state.challenges],
   weeklyReady:!!state.weekly,weeklyCount:daily.counted,weeklyLimit:daily.limit,
   dailyLocked:daily.dailyLocked,ownChallengeCount:mineCards.length,
   lastD35Face:lastOfficialChallengeFace(
    session?state.challenges:state.challengesHistory,session?.id||last?.id||null)
 }), 'NOTRE SOIRÉE','Un jeu synchronisé sur nos deux comptes');
}
function eveningCalendarReturn(){
 return state.eveningCalendarBack||(isSharedCoupleReady(state.coupleId,state.members)?'tab:session':'settings-page:confidentialite');
}
function renderEveningCalendar(){
 const mo=state.eveningCalendarMonth||month();
 const date=state.eveningCalendarDate?.startsWith(mo)?state.eveningCalendarDate:
  ((state.sessions||[]).find(s=>eveningLocalDay(s.started_at)?.startsWith(mo))?
   eveningLocalDay(state.sessions.find(s=>eveningLocalDay(s.started_at)?.startsWith(mo)).started_at):
   (mo===month()?today():mo+'-01'));
 frame(eveningHistoryMarkup({
  sessions:state.sessions||[],members:state.members||[],
  stats:state.eveningHistoryStats||[],historyChallenges:state.eveningCalendarChallenges||[],
  weeklyRolls:state.weeklyRollHistory||[],passQuota:state.calendarPassMonth===mo?state.calendarPassQuota:[],
  reviews:state.eveningReviews||[],
  me:state.user?.id,month:mo,selectedDate:date,
  backAction:eveningCalendarReturn(),backLabel:eveningCalendarReturn().startsWith('settings-page:')?'Retour à la confidentialité':'Retour à Soirée'
 }), 'CALENDRIER DES SOIRÉES', 'Un souvenir de chaque moment à deux');
}
function optionalRolledTimer(roll){
 if(!roll?.timer_minutes)return '';
 const key='special-'+roll.id;
 return state.specialTimerKey===key?timerWidget({id:key},roll.timer_minutes):
  button('special-timer:'+key,editorialIcon('clock')+' Minuteur · '+roll.timer_minutes+' min','class="subtle occasion-timer"');
}
function renderSpecial(){
 const original=state.monthly||{},active=original.monthly_activity;
 const rollingKind=state.diceStatus?state.rollAnimationKind:null;
 const monthly={...original};
 const activity=active?monthlyActivityForRoll(active):null;
 if(rollingKind==='monthly_activity')monthly.monthly_activity=null;
 if(rollingKind==='monthly_host')monthly.monthly_host=null;
 frame(premiumSurpriseHtml({
   monthly,members:state.members,settings:state.occasionSettings||{},
   activity,
   timerHtml:state.showSurpriseActivity&&activity?.timer_minutes?
    timerWidget({id:'monthly-'+month()},activity.timer_minutes):'',
   rolling:!!state.diceStatus,rollingKind,rollFace:state.rollAnimationFace,
   showActivity:state.showSurpriseActivity,season:state.surpriseSeason,editSlot:state.surpriseEditSlot,
   settlingHost:state.diceStatus==='settled'&&state.rollAnimationKind==='monthly_host'
 }), 'RENDEZ-VOUS SURPRISE','Un mois, un tirage, une expérience à deux');
}
function renderOccasions(){
 const current=today(),year=Number(current.slice(0,4)),settings=state.occasionSettings||{};
 const eligible=dueOccasions(current,settings,state.members),all=[];
 for(const occ of OCCASIONS){
  const owners=occ.key==='birthday'?state.members.map(m=>m.user_id):[null];
  for(const owner of owners){
   const upcoming=[year,year+1].map(y=>({year:y,date:occasionDate(occ.key,y,settings,owner)}))
    .filter(x=>x.date);
   const due=eligible.find(e=>e.key===occ.key&&e.actorId===owner);
   const next=upcoming.find(e=>e.date>=current)||upcoming.at(-1);
   all.push({...occ,actorId:owner,date:due?.date||next?.date||null,
    year:due?.year||next?.year||year,daysLeft:due?.daysLeft??null});
  }
 }
 const events=all.filter(e=>!state.specialFocus||(e.key===state.specialFocus.key&&e.actorId===state.specialFocus.owner))
  .sort((a,b)=>(a.daysLeft===null?1:0)-(b.daysLeft===null?1:0));
 const heading=events.length===1?surpriseTitle(settings,events[0].key,events[0].actorId,events[0].title):'Nos événements';
 let body='<section class="settings-editorial occasion-editorial">'+editorialHeader('occasion-back','Surprise')+
  '<div class="settings-editorial-content"><div class="editorial-title"><h1>'+safe(heading)+'</h1></div>'+
  '<div class="occasion-detail-scroll">';
 for(const ev of events){
  const k=ev.key+(ev.actorId?':'+ev.actorId:'');
  const presetKey=privateSpecialKey(ev.key,ev.actorId,state.couple?.owner_user_id);
  const prize=state.occasionRolls.find(r=>r.occasion_key===k&&r.event_year===ev.year&&r.roll_type==='surprise');
  const custom=!!presetKey&&state.specialEventKeys.includes(presetKey)&&!prize;
  const activity=state.occasionRolls.find(r=>r.occasion_key===k&&r.event_year===ev.year&&r.roll_type==='activity');
  const host=state.occasionRolls.find(r=>r.occasion_key===k&&r.event_year===ev.year&&r.roll_type==='host');
  const modifier=state.occasionRolls.find(r=>r.occasion_key===k&&r.event_year===ev.year&&r.roll_type==='modifier');
  const displayName=ev.actorId?person(ev.actorId):'';
  const role=occasionRoles(ev,settings,state.members);
  body+='<section class="occasion-premium-card">'+(events.length>1?'<h2>'+safe(surpriseTitle(settings,ev.key,ev.actorId,ev.title))+'</h2>':'')+
   (displayName?'<div class="occasion-person">'+editorialIcon('heart')+safe(displayName)+'</div>':'');
  const eventDate=ev.date?new Intl.DateTimeFormat('fr-CA',{
   day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
  }).format(new Date(ev.date+'T12:00:00Z')):'Date non définie';
  body+='<p class="occasion-date">'+safe(eventDate)+
   (ev.daysLeft!==null?' · '+(ev.daysLeft<0?(ev.daysLeft<=-7?'Dernier jour de disponibilité':'Disponible encore '+(7+ev.daysLeft)+' jours'):
    ev.daysLeft===0?'Disponible aujourd’hui':'Dans '+ev.daysLeft+' jours'):'')+'</p>';
  if(!role.shared&&!role.receiver){
   body+='<p class="tag">Personne célébrée non renseignée. L’administrateur la désigne dans Réglages.</p>';
  }else if(role.shared){
   body+='<div class="challenge-roles">'+editorialIcon('heart')+' À préparer ensemble</div>';
  }else{
   body+='<div class="challenge-roles">'+editorialIcon('heart')+' '+safe(role.giver.name)+
    ' offre · '+safe(role.receiver.name)+' reçoit</div>';
  }
  if(!ev.date)body+='<p>Ajoutez cette date dans Réglages pour activer le tirage.</p>';
  else if(ev.daysLeft===null)body+='<div class="occasion-availability">'+editorialIcon('calendar')+
   '<div><strong>Votre surprise se prépare</strong><p>Disponible 14 jours avant cette date et jusqu’à 7 jours après.</p></div></div>';
  else if(custom){
   if(!activity){
    if(role.shared||role.receiver)
     body+='<div class="occasion-step-label">ÉTAPE 1 · NOTRE ACTIVITÉ</div>'+
       heroDice(null,6,'Activité surprise')+
       button('occasion-roll:'+ev.key+':'+(ev.actorId||'-')+':activity','Découvrir l’activité','class="settings-primary"');
   }else{
    body+=heroDice(activity.face,6,'Activité surprise')+
      '<div class="card"><div class="eyebrow">ACTIVITÉ · FACE '+activity.face+'</div>'+
      '<p>'+safe(activity.special_description||'')+'</p>'+
      '<p class="tiny-note">Une proposition à accepter, modifier ou passer ensemble.</p>'+optionalRolledTimer(activity)+'</div>';
    if(!modifier){
     body+='<div class="occasion-step-label">ÉTAPE 2 · TOUCHE SURPRISE</div>'+
       heroDice(null,6,'Touche surprise')+
       button('occasion-roll:'+ev.key+':'+(ev.actorId||'-')+':modifier','Révéler la touche surprise','class="settings-primary"');
    }else{
     body+=heroDice(modifier.face,6,'Touche surprise')+
       '<div class="card"><div class="eyebrow">RÈGLE · FACE '+modifier.face+'</div>'+
       '<p>'+safe(modifier.modifier_text||'')+'</p>'+optionalRolledTimer(modifier)+'</div>';
    }
   }
  }
  else if(!prize){if(role.shared||role.receiver)body+='<div class="occasion-step-label">NOTRE SURPRISE</div>'+
    heroDice(null,20,'Dé de fête')+
    button('occasion-roll:'+ev.key+':'+(ev.actorId||'-')+':surprise','Révéler la surprise','class="settings-primary"');}
  else{
   const idea=prize.special_title?
    {title:prize.special_title,detail:prize.special_description,level:'Votre surprise du jour'}:
    specialSurprise(prize.face);
   body+=heroDice(prize.face,20,'Résultat officiel')+
     '<h3>'+safe(idea.title)+'</h3><p>'+safe(idea.detail)+'</p>'+
     '<p class="tag">'+safe(idea.level)+' · Tiré par '+safe(person(prize.actor))+'</p>';
   if(prize.special_title){
    if(!modifier){
     body+='<p>Une deuxième surprise reste à révéler : révélez la touche surprise de ce moment.</p>'+
      button('occasion-roll:'+ev.key+':'+(ev.actorId||'-')+':modifier','Révéler la touche surprise','class="settings-primary"');
    }else{
     body+=heroDice(modifier.face,6,'Règle supplémentaire')+
      '<div class="card"><div class="eyebrow">SURPRISE · FACE '+modifier.face+'</div>'+
      '<h3>'+safe(modifier.modifier_title||'La règle du moment')+'</h3>'+
      '<p>'+safe(modifier.modifier_text||'')+'</p>'+optionalRolledTimer(modifier)+'</div>';
    }
   }
   if(!host&&role.shared)body+='<p class="tag">Surprise commune · vous l’organisez à deux.</p>';
   else if(!host&&role.receiver)body+='<p class="tag">L’offrant prépare la surprise pour la personne célébrée.</p>';
   else if(host){
    const giver=state.members[host.face<=3?0:1];
    body+='<div class="result">♡ '+safe(giver?.name||'Partenaire')+' organise</div>'+
     '<p>Tirage n° '+host.face+' · Ensemble, vous fixez vos limites, le budget et la gardienne.</p>';
   }
  }
  body+='</section>';
 }
 body+='<details class="occasion-help"><summary>Comment se déroule la surprise ?</summary>'+
  '<p>Pour les fêtes classiques, découvrez une surprise parmi 20 idées. Pour vos occasions personnalisées, un lancer choisit l’activité et un second ajoute une touche de surprise.</p>'+
  '<p>Chaque idée est facultative : vous pouvez en discuter, la modifier ou la refuser.</p></details>'+
  editorialRow('Nos dates importantes','Consulter notre anniversaire et les dates du duo','tab:settings','calendar')+
  '</div></div></section>';
 frame(body,heading,'');
}
function portableLibrary(kind){
 if(kind==='evening')return buildEveningLibrary(state.customCategory,state.customCards);
 if(kind==='monthly')return buildMonthlyLibrary(state.monthlyActivities);
 if(kind==='advent')return calendarFromSaved(state.advent2026Config,state.advent2026Days);
 if(kind==='special')return state.specialEventsConfig;
 throw Error('Type de bibliothèque inconnu.');
}
function exportLibraryFile(kind){
 const data=portableLibrary(kind);
 if(!data)throw Error('Aucun contenu enregistré dans cette liste.');
 librarySummary(data,kind);
 const label=kind==='evening'?'soiree-'+state.customCategory.toLowerCase():kind;
 return exportJsonFile('loveroll-'+label+'.json',JSON.stringify(data,null,2));
}
function previewPortableJson(kind){
 state.jsonPending=null;
 const text=id(jsonInputId(kind))?.value||'';
 if(!text.trim())throw Error('Choisissez un fichier JSON ou collez son contenu.');
 if(new Blob([text]).size>MAX_IMPORT_BYTES)throw Error('Le JSON ne doit pas dépasser 250 Ko.');
 let data;
 try{data=JSON.parse(text);}catch{throw Error('Syntaxe JSON invalide (virgules, guillemets, accolades).');}
 data=normalizeLibraryData(data,kind);
 if(kind==='evening'&&data.category!==state.customCategory)
  throw Error('Choisissez la catégorie '+data.category+' avant cet import.');
 state.jsonPending={kind,data,summary:librarySummary(data,kind),fileName:id('json-file-name')?.textContent||''};
}
function renderSpecialEventsEditor(){
 if(!isLoveAdmin()){state.tab='settings';renderSettings();return;}
 frame(state.libraryImportKind?importEditorHtml(state):specialEditorHtml(state,
  sixSpecialEvents(new Date(),state.occasionSettings||{},state.members)),'Événements spéciaux','');
}
function renderAdvent(){
 // The database's Toronto clock determines the UI's active day; only the
 // authenticated RPC can open a case, after checking server time again.
 const serverDate=state.adventServerDate||today();
 const cal=sharedAdventState(state.advent,new Date(serverDate+'T16:00:00Z'),state.adventYear);
 const selected=cal.days.find(d=>d.day===state.adventSelected)?.entry;
 frame(adventPremiumHtml({
  openings:state.advent,members:state.members,
  when:new Date(serverDate+'T16:00:00Z'),year:state.adventYear,
  selectedDay:state.adventSelected,
  openingDay:state.adventOpening,revealing:state.adventRevealing,dateTrusted:!!state.adventServerDate,showHistory:state.adventHistory,
  timerHtml:selected?.advent_timer_minutes?
   timerWidget({id:'advent-'+selected.year+'-'+selected.day},selected.advent_timer_minutes):''
 }), 'CALENDRIER DE L’AVENT','Votre rituel commun en décembre');
}

function renderAdventEditor(){
 if(!isLoveAdmin()){state.tab='settings';renderSettings();return;}
 frame(state.libraryImportKind?importEditorHtml(state):adventEditorHtml(state),'Calendrier de l’Avent','');
}
function isoDate(d){return new Date(d).toISOString().slice(0,10);}
const weekStart=d=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-(x.getUTCDay()+6)%7);return isoDate(x);};
async function createCipherKey(passphrase,salt=state.couple?.journal_salt){
 if(!passphrase||passphrase.trim().length<12)throw Error('Utilisez une phrase secrète de 12 caractères ou plus.');
 const base=await crypto.subtle.importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode(salt),
  iterations:240000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function encode64(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer)));}
function decode64(value){return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}
async function encryptJson(object,key=state.unlockKey){
 if(!key)throw Error('Déverrouillez d’abord votre journal.');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,
  enc.encode(JSON.stringify(object)));
 return JSON.stringify({v:1,iv:encode64(iv),payload:encode64(encrypted)});
}
async function decryptJson(ciphertext,key=state.unlockKey){
 if(!key)throw Error('Journal verrouillé');
 const sealed=JSON.parse(ciphertext);
 const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(sealed.iv)},
  key,decode64(sealed.payload));
 return JSON.parse(dec.decode(clear));
}
function frenchCalendarMonth(yyyyMm){
 const date=new Date(yyyyMm+'-01T12:00:00Z');
 return new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric',timeZone:'UTC'}).format(date);
}
const weekdayHeaders=()=>['lun','mar','mer','jeu','ven','sam','dim']
 .map(x=>'<span class="calendar-weekday">'+x+'</span>').join('');
async function renderPersonalJournal(){
 const items=state.personalJournal||[],mo=state.personalCalendarMonth||month(),day=state.personalSelectedDate||today();
 const [y,m]=mo.split('-').map(Number),length=new Date(y,m,0).getDate();
 const offset=(new Date(y,m-1,1).getDay()+6)%7;
 let calendar='<div class="calendar">'+weekdayHeaders()+
  Array.from({length:offset},()=>'<span></span>').join('');
 for(let n=1;n<=length;n++){
  const d=mo+'-'+String(n).padStart(2,'0'),count=items.filter(x=>x.happened_on===d).length;
  calendar+='<button class="'+(count?'marked ':'')+(d===today()?'today ':'')+
   (d===day?'selected':'')+'" data-action="personal-date:'+d+'">'+
   (count?'♥ ':'')+n+'</button>';
 }
 calendar+='</div>';
 let body='<section class="card"><h2>♥ Mon calendrier privé</h2>'+
 '<p>'+items.length+' moment(s) enregistré(s) dans votre historique personnel. Le changement de partenaire n’efface aucune entrée.</p>'+
 '<div class="actions">'+button('personal-month-prev','←','class="subtle"')+
 '<button class="subtle" disabled>'+safe(frenchCalendarMonth(mo))+'</button>'+
 button('personal-month-next','→','class="subtle"')+'</div>'+calendar+'</section>';
 if(!state.personalPass){
  body+='<section class="card"><h3>🔒 Déverrouiller mes notes</h3>'+
   '<p>Les anciennes notes utilisent leur phrase secrète d’origine, même si vous changez de partenaire. Les dates restent visibles.</p>'+
   '<input id="personal-pass" type="password" minlength="12" autocomplete="off" placeholder="Votre phrase secrète">'+
   button('unlock-personal','Déverrouiller mes notes')+'</section>';
 }else{
  body+='<section class="card"><h3>Mes notes</h3>'+
   button('lock-personal','Verrouiller','class="subtle"');
  for(const item of items.filter(x=>x.happened_on===day)){
   let clear=null;
   try{clear=await decryptJson(item.ciphertext,await createCipherKey(state.personalPass,item.journal_salt));}catch{}
   const editing=clear&&state.personalEditId===item.id;
   const options=(values,current)=>values.map(v=>'<option'+(current===v?' selected':'')+'>'+safe(v)+'</option>').join('');
   body+='<div class="muted-line"><strong>'+safe(item.happened_on)+'</strong>'+
    (clear?'<p>Orgasme : '+safe(clear.orgasm)+' · Point fort : '+safe(clear.good)+
    ' · À améliorer : '+safe(clear.weak)+'</p>'+
    (clear.note?'<p>'+safe(clear.note)+'</p>':''):'<p>Impossible de déchiffrer cette entrée avec cette phrase secrète.</p>')+
    (clear&&!editing?button('personal-edit:'+item.id,'Modifier ma note privée','class="subtle"')+
      button('personal-delete:'+item.id,'Supprimer ma note privée','class="subtle"'):'')+
    (editing?'<div class="personal-note-editor"><h4>Modifier uniquement ma copie personnelle</h4>'+
      '<p>Cette modification ne sera pas transmise à votre partenaire.</p>'+
      '<label>Date<input type="date" id="personal-edit-date" value="'+safe(item.happened_on)+'"></label>'+
      '<label>Orgasme<select id="personal-edit-orgasm">'+options(['Non précisé','Les deux','Moi','Mon partenaire','Aucun'],clear.orgasm)+'</select></label>'+
      '<label>Point fort<select id="personal-edit-good">'+options(['Complicité','Tendresse','Communication','Plaisir','Nouveauté'],clear.good)+'</select></label>'+
      '<label>À améliorer<select id="personal-edit-weak">'+options(['Rien','Plus de temps','Plus de douceur','Plus de communication'],clear.weak)+'</select></label>'+
      '<label>Ma note personnelle<textarea maxlength="1200" id="personal-edit-note">'+safe(clear.note||'')+'</textarea></label>'+
      button('personal-save:'+item.id,'Enregistrer ma note privée')+
      button('personal-cancel-edit','Annuler','class="subtle"')+'</div>':'')+'</div>';
  }
  body+='</section>';
 }
 body+='<section class="card">'+button('tab:settings','← Retour aux réglages','class="subtle"')+'</section>';
 frame(body,'MON CALENDRIER','Personnel et invisible pour un nouveau partenaire');
}
async function renderJournal(){
 const now=today(),yr=now.slice(0,4),currentMo=month(),mo=state.calendarMonth||currentMo,ws=week();
 const dates=state.journal.map(x=>x.happened_on);
 const yearCount=dates.filter(x=>x.startsWith(yr)&&x<=now).length;
 const monthCount=dates.filter(x=>x.startsWith(currentMo)&&x<=now).length;
 const weekCount=dates.filter(x=>x>=ws&&x<=now).length;
 const grades=(state.eveningReviews||[]).map(r=>Number(r.overall))
  .filter(n=>Number.isInteger(n)&&n>=1&&n<=5);
 const average=grades.length?(grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1):'—';
 const [y,m]=mo.split('-').map(Number),length=new Date(y,m,0).getDate();
 const offset=(new Date(y,m-1,1).getDay()+6)%7;
 let cal='<div class="calendar">'+weekdayHeaders()+
  Array.from({length:offset},()=>'<span></span>').join('');
 for(let day=1;day<=length;day++){
  const date=mo+'-'+String(day).padStart(2,'0');
  const count=dates.filter(d=>d===date).length;
  cal+='<button class="'+(count?'marked ':'')+(date===now?'today ':'')+
   (date===(state.selectedDate||now)?'selected':'')+'" data-action="date:'+date+'">'+
   (count?'♥ ':'')+day+'</button>';
 }
 cal+='</div>';
 let body='<section class="card"><div class="eyebrow">Statistiques du couple</div>'+
 '<div class="stat-grid"><div class="stat"><strong>'+yearCount+'</strong><small>Cette année</small></div>'+
 '<div class="stat"><strong>'+monthCount+'</strong><small>Ce mois</small></div>'+
 '<div class="stat"><strong>'+weekCount+'</strong><small>Cette semaine</small></div></div>'+
 '<p class="result">'+average+' / 5 ♥</p><p>Note moyenne des bilans de soirée.</p></section>'+
 '<section class="card"><h2>♡ Calendrier des relations</h2>'+
 '<div class="actions">'+button('month-prev','←', 'class="subtle"')+
 '<button disabled class="subtle">'+safe(frenchCalendarMonth(mo))+'</button>'+
 button('month-next','→','class="subtle"')+'</div>'+cal+'</section>';
 if(!state.unlockKey){
  const exists=!!state.couple?.journal_verifier||state.journal.length>0;
  body+='<section class="card"><h2>🔒 '+(exists?'Déverrouiller notre journal':'Créer la phrase secrète de notre journal')+'</h2>'+
   '<p>'+(exists?'Saisissez votre phrase secrète commune pour accéder aux anciennes données.':
    'Choisissez une phrase secrète de 12 caractères ou plus et partagez-la en personne avec votre partenaire. Ni la phrase ni vos notes en clair ne sont envoyées au serveur.')+'</p>'+
   '<input id="journal-pass" type="password" minlength="12" autocomplete="off" placeholder="Phrase secrète commune">'+
   (exists?'':'<label>Confirmer la phrase secrète<input id="journal-pass-confirm" type="password" minlength="12" autocomplete="off" placeholder="Confirmez la même phrase"></label>')+
   button('unlock',exists?'Déverrouiller':'Créer et ouvrir notre journal')+
   '<p>Conservez cette phrase : une erreur de déchiffrement ne signifie jamais que votre journal est vide.</p></section>';
 }
 else{
  const edited=state.editEventId?state.journal.find(e=>e.id===state.editEventId&&e.author_id===state.user.id):null;
  const initial=edited?await decryptJson(edited.ciphertext):null;
  const selOpt=(choice,field)=>'<option'+(initial?.[field]===choice?' selected':'')+'>'+safe(choice)+'</option>';
  body+='<section class="card"><h3>'+(edited?'✎ Modifier mon entrée partagée':'♥ Enregistrer un moment')+'</h3>'+
   (edited?'<p>Cette correction sera visible de votre partenaire. Votre archive privée est préservée.</p>':'')+
   '<label>Date<input id="event-date" type="date" value="'+safe(edited?.happened_on||state.selectedDate||now)+'"></label>'+
   '<label>Qui a eu un orgasme ?<select id="event-orgasm">'+
   ['Non précisé','Les deux','Moi','Mon partenaire','Aucun'].map(x=>selOpt(x,'orgasm')).join('')+
   '</select></label><label>Point fort<select id="event-good">'+
   ['Complicité','Tendresse','Communication','Plaisir','Nouveauté'].map(x=>selOpt(x,'good')).join('')+
   '</select></label><label>À améliorer<select id="event-weak">'+
   ['Rien','Plus de temps','Plus de douceur','Plus de communication'].map(x=>selOpt(x,'weak')).join('')+
   '</select></label><label>Commentaire partagé avec votre partenaire<textarea id="event-note" maxlength="1200" placeholder="Facultatif">'+safe(initial?.note||'')+'</textarea></label>'+
   button('save-event',edited?'Enregistrer mes modifications':'Enregistrer dans notre calendrier')+
   (edited?button('cancel-edit-event','Annuler','class="subtle"'):'')+'</section>';
  const selected=state.selectedDate||now;
  const matched=state.journal.filter(e=>e.happened_on===selected);
  body+='<section class="card"><h3>'+safe(selected)+' · '+matched.length+' entrée(s)</h3>';
  for(const item of matched){
   let decrypted;
   try{decrypted=await decryptJson(item.ciphertext)}catch{decrypted=null}
   body+='<div class="muted-line"><div class="tag">'+safe(person(item.author_id))+'</div>'+
    (decrypted?'<p>Orgasme : '+safe(decrypted.orgasm)+'<br>Point fort : '+safe(decrypted.good)+
    '<br>À améliorer : '+safe(decrypted.weak)+'</p>'+
    (decrypted.note?'<p>'+safe(decrypted.note)+'</p>':''):'<p>Cette entrée n’a pas pu être déchiffrée.</p>')+
    (item.author_id===state.user.id?button('edit-event:'+item.id,'Modifier','class="subtle"')+
    button('delete-event:'+item.id,'Supprimer du journal partagé','class="subtle"'):'')+'</div>';
  }
  body+='</section>';
 }
 body+='<section class="card"><h3>Nos moments à deux</h3>'+
  button('tab:session','Retour à notre soirée','class="subtle"')+'</section>';
 frame(body,'NOTRE JOURNAL','Un calendrier partagé, du contenu chiffré');
}
function isLoveAdmin(){return !!(state.coupleId&&state.couple?.owner_user_id===state.user?.id);}
function renderCardLibrary(){
 if(!isLoveAdmin()){state.tab='settings';renderSettings();return;}
 if(state.couple?.sexual_card_mode==='automatic'){
  state.libraryImportKind=null;state.tab='settings';settingsOpenSection='admin';renderSettings();return;
 }
 frame(state.libraryImportKind?importEditorHtml(state):cardLibraryHtml(state),'Mes cartes','');
}
function renderMonthlyLibrary(){
 if(!isLoveAdmin()){state.tab='settings';renderSettings();return;}
 frame(state.libraryImportKind?importEditorHtml(state):monthlyEditorHtml(state),'Activités du mois','');
}
function settingsIcon(key){
 if(key==='application')return navIcon('settings');
 const strokes={
  compte:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2c0-4 3-6 7-6s7 2 7 6v2"/>',
  couple:'<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z"/>',
  notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10ZM10 21h4"/>',
  jeu:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r=".8" fill="currentColor"/><circle cx="16" cy="16" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  admin:'<path d="M12 2 20 5v6c0 5-3.3 8.6-8 11-4.7-2.4-8-6-8-11V5Z"/>',
  application:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  confidentialite:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  aide:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.6 2.6 0 1 1 4.5 2c-1.4 1-2 1.6-2 3M12 18h.01"/>'
 };
 return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+strokes[key]+'</svg>';
}
function settingRow(title,detail,action,label='Ouvrir'){
 return '<button type="button" class="settings-link-row" data-action="'+safe(action)+'">'+
  '<span class="settings-link-copy"><strong>'+safe(title)+'</strong><small>'+safe(detail)+'</small></span>'+
  '<span class="settings-link-affordance">'+safe(label)+' <b aria-hidden="true">›</b></span></button>';
}
function frenchMonthDay(md){
 if(!/^\d{2}-\d{2}$/.test(md||''))return 'Non renseigné';
 const date=new Date('2000-'+md+'T12:00:00Z');
 return Number.isNaN(date.valueOf())?'Non renseigné':
  new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'long',timeZone:'UTC'}).format(date);
}
function renderCoupleDateSetting(){
 const started=state.occasionSettings?.relationship_started_on||'';
 return (isLoveAdmin()?
  '<label class="settings-date-field"><span>Date de début</span><input id="couple-started-on" type="date" max="'+safe(today())+
  '" value="'+safe(started)+'"></label>':
  '<div class="settings-date-field"><strong>Date de début</strong><p>'+safe(formatCoupleDate(started))+'</p></div>')+
  '<p class="tiny-note settings-date-hint">Anniversaire : '+safe(frenchMonthDay(state.occasionSettings?.anniversary_md))+'</p>';
}
function adminDiceWeightEditor(kind){
 const config=DICE_WEIGHT_CONFIG[kind];
 if(!config)return '';
 const enabled=state.couple?.[config.enabled]??(kind==='weekly');
 const values=configuredDiceWeights(state.couple?.[config.weights],config.defaults);
 const note=kind==='weekly'?
  'Les chiffres de l’Accueil afficheront exactement ces chances.':
  'Ces chances concernent les D6 personnels (1 à 6 défis), sans affichage dans Soirée.';
 const grid=values.map((value,i)=>
  '<label class="admin-dice-weight-face" for="admin-weight-'+kind+'-'+(i+1)+'">'+
  '<span>Face '+(i+1)+'</span>'+
  '<span class="admin-dice-weight-input"><input type="number" inputmode="numeric" min="0" max="100" step="1" '+
  'id="admin-weight-'+kind+'-'+(i+1)+'" value="'+value+'" aria-label="Chance de la face '+(i+1)+' en pourcentage">'+
  '<span aria-hidden="true">%</span></span></label>').join('');
 return '<details class="settings-help-item admin-dice-weight-section" data-dice-weight="'+kind+'">'+
  '<summary>'+safe(config.label)+'<small>'+(enabled?'Activée':'Désactivée')+'</small></summary>'+
  '<div class="admin-dice-weight-editor">'+
  '<label class="push-option"><span><strong>Activer la pondération</strong>'+
  '<small>Sinon, les six faces ont chacune 1 chance sur 6.</small></span>'+
  '<input type="checkbox" role="switch" id="admin-weight-'+kind+'-enabled"'+(enabled?' checked':'')+'></label>'+
  '<p class="tiny-note">'+note+'</p>'+
  '<div class="admin-dice-weight-grid">'+grid+'</div>'+
  '<p class="admin-dice-weight-total" data-valid="true" role="status" aria-live="polite">Total : 100 / 100 %</p>'+
  '<p class="tiny-note">Répartissez 100 % sur les 6 faces (0 % exclut une face). Les tirages déjà enregistrés ne changent pas.</p>'+
  '<p class="admin-dice-weight-feedback" role="status" aria-live="polite"></p>'+
  button('save-dice-weights:'+kind,'Enregistrer les pondérations','class="settings-primary admin-dice-weight-save"')+
  '</div></details>';
}
function adminCategoryWeightEditor(){
 const enabled=state.couple?.category_weights_enabled!==false;
 const selected=Number.isInteger(state.couple?.category_preference_percent)?
  state.couple.category_preference_percent:88;
 return '<details class="settings-help-item admin-dice-weight-section" data-category-weights="true">'+
  '<summary>Pondération · Style de défi<small>'+(enabled?'Activée':'Désactivée')+'</small></summary>'+
  '<div class="admin-dice-weight-editor">'+
  '<label class="push-option"><span><strong>Activer la pondération</strong>'+
  '<small>Sinon, chaque catégorie a 50 % de chance.</small></span>'+
  '<input type="checkbox" role="switch" id="admin-category-enabled"'+(enabled?' checked':'')+'></label>'+
  '<div class="admin-dice-weight-grid admin-category-weight-grid">'+
  '<label class="admin-dice-weight-face">Catégorie choisie'+
  '<span class="admin-dice-weight-input"><input id="admin-category-preferred" type="number" inputmode="numeric" min="0" max="100" step="1" value="'+selected+'">'+
  '<span aria-hidden="true">%</span></span></label>'+
  '<label class="admin-dice-weight-face">Autre catégorie'+
  '<span class="admin-dice-weight-input"><input id="admin-category-other" type="number" inputmode="numeric" min="0" max="100" step="1" value="'+(100-selected)+'">'+
  '<span aria-hidden="true">%</span></span></label></div>'+
  '<p class="admin-dice-weight-total" id="admin-category-total" data-valid="true" role="status" aria-live="polite">Total : 100 / 100 %</p>'+
  '<p class="tiny-note">Par défaut : 88 % de la catégorie sélectionnée et 12 % de l’autre. Aléatoire reste à 50/50. Aucun changement aux cartes existantes.</p>'+
  button('save-category-weights','Enregistrer la pondération','class="settings-primary admin-dice-weight-save admin-category-save"')+
  '</div></details>';
}
function openSettingsPage(section=''){
 const allowed=['','compte','couple','notifications','jeu','confidentialite','application','aide','aide-connexion','aide-des','aide-sync','admin'];
 if(!allowed.includes(section))return;
 if(section==='admin'&&!isLoveAdmin())throw Error('Options réservées au créateur du couple.');
 if(section!==settingsOpenSection||state.tab!=='settings')notificationFeedback=null;
 settingsOpenSection=section;state.tab='settings';render();
 window.scrollTo({top:0,behavior:'instant'});
 if(section==='notifications')currentPushDevice(client,state.user?.id).then(device=>{state.pushDevice=device;if(state.tab==='settings'&&settingsOpenSection==='notifications')render();}).catch(()=>{});
}
function renderSettings(){
 const linked=!!state.coupleId,hasPartner=linked&&state.members.length===2;
 const futureMix=hasPartner?futureCoupleStyleMix(...state.members.map(m=>m.playStyle)):
  futureCoupleStyleMix(state.profile?.play_style,state.profile?.play_style);
 const futureMixLabel=futureMix.map(entry=>playStyleLabel(entry.style)+' '+entry.weight+' %').join(' · ');
 const account='<div class="settings-account-form">'+
  '<p class="settings-detail-intro">Compte connecté</p>'+
  '<label class="settings-inline-name"><span>Prénom affiché</span>'+
  '<input id="profile-name" type="text" autocomplete="given-name" value="'+safe(state.profile.display_name)+'" maxlength="80" aria-label="Prénom affiché"></label>'+
  profileGenderSelect(state.profile.gender)+profilePlayStyleSelect(state.profile.play_style)+
  '<div class="settings-birthday-edit"><span>Mon anniversaire</span>'+monthDayInputs('settings-birthday',state.profile.birthday_md)+'</div>'+
  '<label>Courriel du compte<input type="email" readonly aria-readonly="true" value="'+safe(state.user.email||'')+'" autocomplete="email"></label>'+
  button('profile','Enregistrer mon profil','class="settings-primary"')+
  '<div class="settings-danger-zone">'+button('signout','Se déconnecter','class="settings-signout"')+'</div></div>';
 let partner='';
 if(hasPartner){
  const initials=[state.profile.display_name,other()?.name||'Partenaire'].map(n=>safe(Array.from(n||'♡')[0]));
  partner='<div class="settings-duo-card"><div class="settings-duo-initials"><span>'+initials[0]+'</span><i>'+editorialIcon('heart')+'</i><span>'+initials[1]+'</span></div>'+
   '<strong>'+safe(state.profile.display_name)+' &amp; '+safe(other()?.name||'Votre partenaire')+'</strong><small>● Connectés · '+(isLoveAdmin()?'Administrateur':'Membre')+'</small></div>'+
   editorialRow('Invitation acceptée','','','check')+
   (state.cycleStatus?.pending?editorialRow('Bilan des 200 défis',
    state.cycleStatus.answered_self?'Réponse enregistrée · en attente du partenaire':'Choisir votre prochaine intensité',
    'cycle-reopen','heart'):'')+
   '<p class="tiny-note">Styles du duo : '+safe(futureMixLabel)+'. '+(state.couple?.sexual_card_mode==='automatic'?'Sélection automatique active pour les prochains défis SEXUEL.':'Mode personnalisé actif pour les prochains défis SEXUEL.')+'</p>'+
   '<div class="settings-date-outer"><h3>Notre anniversaire</h3>'+renderCoupleDateSetting()+'</div>'+
   (isLoveAdmin()?button('save-couple-date','Enregistrer notre date','class="settings-primary"'):'')+
   '<div class="settings-danger-zone">'+button('end-couple',editorialIcon('unlink')+' Dissocier notre duo','class="settings-signout"')+
   '<p class="tiny-note">Chacun deviendra administrateur de son propre espace. Vos comptes et archives sont conservés.</p></div>';
 }else if(linked){
  partner=renderInvitePanel()+
   '<p class="tiny-note">Vous êtes administrateur de cet espace individuel. Vous pouvez préparer vos défis et inviter votre partenaire.</p>';
 }else partner='<div class="settings-couple-invite">'+
  '<p>Votre espace privé est prêt à être créé. Invitez votre partenaire pour commencer à deux.</p>'+
  button('start-couple','♡ Inviter un conjoint ou une conjointe','class="settings-primary settings-couple-cta"')+
  button('prepare-cards','Créer mes défis avant l’invitation','class="subtle settings-secondary settings-couple-prep"')+
  '</div>';
 const celebrants=isLoveAdmin()&&hasPartner?
  '<div class="settings-item"><div><strong>Surprises des fêtes</strong>'+
  '<p>Choisissez le partenaire concerné pour chaque occasion.</p></div></div>'+
  TARGETED_OCCASIONS.map(key=>{
   const entry=OCCASIONS.find(o=>o.key===key),chosen=state.occasionSettings?.celebrants?.[key];
   return '<div class="muted-line"><strong>'+safe(entry.title)+'</strong><div class="chipline">'+
    state.members.map(m=>'<button class="pill '+(chosen===m.user_id?'selected':'')+
      '" data-action="set-celebrant:'+key+':'+m.user_id+'">'+safe(m.name)+'</button>').join('')+
    '</div></div>';
  }).join(''):'';
 const canEdit=isLoveAdmin();
 const eveningButtons='<div class="settings-category-options"><h3>Catégories visibles</h3>'+
  '<label class="push-option"><span>Sensuel</span><input id="show-sensuel-button" type="checkbox" role="switch"'+
   (state.couple?.show_sensuel_button!==false?' checked':'')+(!canEdit?' disabled':'')+'></label>'+
  '<label class="push-option"><span>Sexuel</span><input id="show-sexuel-button" type="checkbox" role="switch"'+
   (state.couple?.show_sexuel_button!==false?' checked':'')+(!canEdit?' disabled':'')+'></label>'+
  '<p class="tiny-note">Aléatoire reste disponible.</p>'+
  (canEdit?button('save-evening-buttons','Enregistrer','class="settings-primary"'):'<p>Seul le créateur peut modifier ces choix.</p>')+'</div>';
 const game=(canEdit?
  (state.couple?.sexual_card_mode==='automatic'?
   '<p class="tiny-note">100 défis SENSUEL communs · 100 défis SEXUEL choisis secrètement selon vos deux styles. Pour changer de mode : Options avancées.</p>':
   settingRow('Mes cartes','100 Sensuel · 100 Sexuel','tab:library',''))+
  settingRow('Activités du mois','20 activités','tab:monthly-library','')+
  settingRow('Calendrier de l’Avent','25 surprises','tab:advent-editor','')+
  settingRow('Événements spéciaux','Événements, activités et variantes','tab:special-editor',''):
  '<p>Les éditeurs sont réservés au créateur du couple.</p>')+eveningButtons+
  (canEdit?'<div class="settings-advanced">'+settingRow('Options avancées','Créateur','settings-page:admin','')+'</div>':'');
 const resetYear=Number(today().slice(0,4));
 const currentOccasionRolls=(state.occasionRolls||[]).filter(r=>Number(r.event_year)>=resetYear&&Number(r.event_year)<=resetYear+1);
 const resettableDice=!!(state.weekly||state.session||Object.keys(state.monthly||{}).length||currentOccasionRolls.length);
 const adminWeekly=isLoveAdmin()&&hasPartner?
  '<h3>Tirages du cycle actuel</h3><div class="editorial-status-list">'+
  editorialRow('Dé hebdomadaire',state.weekly?state.weekly.face+' soirée(s) · déjà brassé':'Non brassé','','dice')+
  editorialRow('Surprise du mois',state.monthly?.monthly_activity?'Activité choisie · '+state.monthly.monthly_activity.face:'Aucun tirage','','star')+
  editorialRow('Événements spéciaux',currentOccasionRolls.length+' tirage(s) · '+resetYear+'–'+(resetYear+1),'','calendar')+
  editorialRow('Soirée en cours',state.session?'Oui':'Non','','moon')+'</div>'+
  button('admin-reset-all-dice',editorialIcon('reset')+' Réinitialiser les dés','class="settings-secondary settings-reset" '+(!resettableDice?'disabled':''))+
  '<p class="tiny-note">Une confirmation sera demandée. La soirée active est clôturée sans être comptée. Cartes, anciennes soirées et historiques restent conservés.</p>':
  '<p>Aucun tirage actif : associez votre partenaire pour jouer à deux.</p>';
 const progress=state.cycleStatus||{completed:0,required:200,cycle:state.couple?.challenge_cycle_number||1};
 const adminChallenges=isLoveAdmin()?
  '<h3>Notre cycle de défis</h3><div class="editorial-status-list">'+
  editorialRow('Progression des défis',progress.completed+' / '+progress.required+' complétés','','dice')+
  editorialRow('Cycle',String(progress.cycle)+(progress.pending?' · Bilan à remplir':''),'','calendar')+'</div>'+
  button('admin-reset-challenges',editorialIcon('reset')+' Recommencer les 200 défis',
   'class="settings-secondary settings-reset" '+(state.session?'disabled':''))+
  '<p class="tiny-note">Nouveau cycle de tirage uniquement : aucune carte, ancien défi réalisé, soirée, passe ou don ne sera effacé. Terminez la soirée avant de recommencer.</p>'+
  (progress.pending?button('cycle-reopen','Répondre au questionnaire','class="settings-primary"'):''):'';
 const sexualMode=state.couple?.sexual_card_mode==='automatic'?'automatic':'custom';
 const adminSexualMode=isLoveAdmin()?
  '<section class="admin-sexual-card-mode" data-sexual-mode-editor="true">'+
  '<h3>Nos 100 défis SEXUEL</h3>'+
  '<p class="tiny-note">Choisissez d’où proviennent les prochains défis sexuels. Changement permis même pendant le cycle : les défis déjà pigés, les résultats et les compteurs sont conservés.</p>'+
  '<label class="settings-inline-name"><span>Mode des cartes</span>'+
  '<select id="admin-sexual-mode" aria-label="Mode des cartes sexuelles">'+
  '<option value="automatic"'+(sexualMode==='automatic'?' selected':'')+'>Algorithme automatique · sélection cachée</option>'+
  '<option value="custom"'+(sexualMode==='custom'?' selected':'')+'>Mes 100 cartes personnalisées</option>'+
  '</select></label>'+
  '<p class="tiny-note">Automatique : mêmes styles = 100 cartes de ce style ; styles différents = 50 cartes prises au hasard dans chaque style. Le lot automatique reste caché.</p>'+
  '<p class="tiny-note">Mes cartes : au premier choix, les 100 SEXUEL MEDIUM sont copiées dans votre bibliothèque privée. Vous pouvez les modifier sans changer les cartes des autres couples. Vos modifications sont conservées si vous changez de mode.</p>'+
  (sexualMode==='custom'?editorialRow('Modifier mes 100 SEXUEL','Copie personnelle préremplie avec MEDIUM','open-personal-sexual-cards','dice'):'')+
  button('save-sexual-mode','Appliquer ce mode','class="settings-primary"')+
  '</section>':'';
 const notifications=notificationSettingsMarkup(state.pushPrefs||{},state.pushDevice);
 const nativeApp=typeof window!=='undefined'&&!!window.LoveRollNativeAuth;
 const nativeVersion=nativeApp&&typeof window.LoveRollNativeAuth.appVersion==='function'?
  window.LoveRollNativeAuth.appVersion():'';
 const homeInstall=editorialRow('Écran d’accueil',nativeApp?'APK installé · retrouver son icône':installStatus()==='installed'?'LoveRoll est installé':'Ajouter ou retrouver l’icône',nativeApp||installStatus()==='installed'?'show-install-guide':'install-home','home');
 const appSettings='<section class="settings-app-group"><h3>Application</h3>'+homeInstall+
  editorialRow('Version Web',WEB_RELEASE,'','globe')+
  editorialRow('Actualiser LoveRoll','Charger la dernière version Web','reload-web','reset')+
  (nativeApp?editorialRow('Mises à jour Android',nativeVersion||'Version non fournie par cet APK','native-update','phone'):'')+
  '</section><section class="settings-app-group"><h3>Aide</h3>'+
  editorialRow('Connexion et invitation','','settings-page:aide-connexion','help')+
  editorialRow('Dés et activités','','settings-page:aide-des','dice')+
  editorialRow('Synchronisation','','settings-page:aide-sync','sync')+'</section>';
 const privacy=editorialRow('Calendrier et bilans','Retrouver les soirées et les bilans de chacun','evening-calendar:settings','calendar')+
  (nativeApp&&typeof window.LoveRollNativeAuth.openLegacyOffline==='function'?editorialRow('Anciennes données hors ligne','Sur cet appareil Android','native-legacy','phone'):'')+
  '<p class="tiny-note editorial-separated">Les bilans restent associés à leur auteur dans le calendrier commun. Votre historique et vos données existantes sont conservés.</p>';
 const helpEntries=[
  ['Association des comptes','Une invitation privée relie deux comptes distincts après acceptation.'],
  ['Dé hebdomadaire','Un seul tirage officiel par couple et par semaine, renouvelé le lundi.'],
  ['Soirée et défis','Chacun joue les défis qui lui sont attribués et peut les refuser.'],
  ['Cadeaux','Vous pouvez offrir un défi non commencé à votre partenaire, jusqu’à trois dons par mois et par personne.'],
  ['Rendez-vous surprise','Les dés vous proposent une activité et déterminent qui invite.'],
  ['Événements spéciaux','Les activités et variantes se gèrent dans Cartes et activités. Appuyez sur une tuile de Surprise pour modifier son nom ou sa date.'],
  ['Calendrier de l’Avent','Chaque lettre se débloque à sa date et reste ouvrable plus tard. Les lettres déjà ouvertes restent consultables.'],
  ['Synchronisation','Les données partagées se mettent à jour entre les comptes connectés.'],
  ['Confidentialité','Les bilans de soirée restent associés à leur auteur dans le calendrier commun.'],
  ['Mises à jour','Vérifiez les versions Android et actualisez le contenu Web dans Application.']
 ];
 const support='<div class="settings-help-list">'+helpEntries.map(([title,answer])=>
  '<details class="settings-help-item"><summary>'+safe(title)+'<span aria-hidden="true">⌄</span></summary>'+
  '<p>'+safe(answer)+'</p></details>').join('')+'</div>';
 const pages={compte:{title:'Mon compte',body:account},couple:{title:'Notre duo',body:partner},
  notifications:{title:'Notifications',body:notifications},jeu:{title:'Cartes et activités',body:game},
  confidentialite:{title:'Journal et confidentialité',body:privacy},
  application:{title:'Application et aide',body:appSettings},
  'aide-connexion':{title:'Connexion et invitation',body:'<p>Chaque personne utilise son propre compte. Confirmez votre courriel avant de rejoindre votre partenaire. L’invitation reste conservée pendant la connexion, Google et la récupération du mot de passe.</p><p>Dans Notre duo, le créateur prépare un lien privé. Le destinataire l’accepte avec le courriel auquel il a été invité.</p>'},
  'aide-des':{title:'Dés et activités',body:'<p>Le dé hebdomadaire est commun : un tirage par couple et par semaine. En Soirée, chacun brasse son D6 personnel ; les deux résultats déverrouillent les défis.</p><p>Sensuel et Sexuel : 88/12 par défaut, modifiable dans Options avancées. Aléatoire reste à 50/50. Un défi passé retourne dans le tirage et son passage reste dans le calendrier.</p><p>La Surprise du mois choisit une activité puis qui invite. L’Avent se débloque par date : une lettre oubliée reste ouvrable plus tard. Vous pouvez donner jusqu’à trois défis par personne et par mois. Les dons et les trois passages gratuits recommencent le 1er du mois, selon l’heure du Québec. Après 200 défis réalisés, les deux personnes choisissent de diminuer, conserver ou augmenter leur intensité pour le prochain cycle.</p>'},
  'aide-sync':{title:'Synchronisation',body:'<p>Les résultats officiels proviennent du serveur et se retrouvent sur les deux comptes associés. Une connexion est nécessaire pour confirmer un lancer ou une ouverture.</p><p>Les listes personnelles de défis restent privées. Les bilans de soirée restent associés à leur auteur dans le calendrier commun.</p>'},
  aide:{title:'Aide',body:support},admin:{title:'Options avancées',body:adminWeekly+adminChallenges+
   adminSexualMode+adminDiceWeightEditor('weekly')+adminDiceWeightEditor('evening')+adminCategoryWeightEditor()+
   (celebrants?'<details class="settings-help-item"><summary>Destinataires des occasions</summary>'+celebrants+'</details>':'')}};
 if(settingsOpenSection==='admin'&&!canEdit)settingsOpenSection='jeu';
 if(!pages[settingsOpenSection])settingsOpenSection='';
 const name=state.profile.display_name||'Mon profil',initial=Array.from(name)[0]||'♡';
 const items=[['couple','Notre duo',hasPartner?state.members.map(m=>m.name).join(' & '):linked?'Invitation en attente':'Inviter mon partenaire'],
  ['notifications','Notifications','Rappels et autorisations'],['jeu','Cartes et activités','Soirée, Surprise et Avent'],
  ['confidentialite','Journal et confidentialité','Calendrier, bilans et données'],['application','Application et aide','Versions et fonctionnement']];
 const menu='<button class="settings-profile-row" data-action="settings-page:compte"><span class="settings-initial" aria-hidden="true">'+safe(initial)+'</span><span><strong>'+safe(name)+'</strong><small>Mon compte</small></span><b aria-hidden="true">›</b></button>'+
  '<nav class="settings-sections" aria-label="Rubriques des réglages">'+items.map(([key,label,detail])=>
   '<button data-action="settings-page:'+key+'" class="settings-section-row"><span class="settings-row-icon">'+settingsIcon(key)+'</span><span><strong>'+label+'</strong><small>'+safe(detail)+'</small></span><b aria-hidden="true">›</b></button>').join('')+'</nav>';
 const page=pages[settingsOpenSection];
 const parent=settingsOpenSection==='admin'?'jeu':settingsOpenSection.startsWith('aide')?'application':'';
 const heading=editorialHeader(page?'settings-page:'+parent:'',parent==='jeu'?'Cartes et activités':parent==='application'?'Application et aide':'Réglages');
 frame('<section class="settings-editorial">'+heading+'<div class="settings-editorial-content">'+
  '<div class="editorial-title"><h1'+(page?'':' class="ritual-page-title"')+'>'+safe(page?.title||'Réglages')+'</h1>'+(settingsOpenSection==='admin'?'<small class="editorial-badge">Créateur</small>':'')+'</div>'+
  (page?'<article class="settings-detail-body" data-settings-page="'+settingsOpenSection+'">'+page.body+'</article>':menu)+
  '</div></section>','Réglages','');
 if(settingsOpenSection==='notifications'&&notificationFeedback)setNotificationFeedback(notificationFeedback.message,notificationFeedback.tone);
}

async function refreshAndShow(){await refreshShared();render();}
async function animateRoll(fn,kind='general'){
 if(state.diceStatus)throw Error('Un dé est déjà en cours de brassage.');
 const activeD100=kind==='new-challenge'&&state.tab==='session'?
  root.querySelector('.evening-step.two .evening-d35-col canvas[data-dice-sides="100"]'):null;
 const activeMonthly=['monthly_activity','monthly_host'].includes(kind)&&state.tab==='special'?
  root.querySelector('.surprise-main-die-scene canvas[data-dice-sides]'):null;
 const liveDie=activeD100||activeMonthly;
 const useLiveD100=!!activeD100?.loveRollDie?.rollTo;
 const useLiveMonthly=!!activeMonthly?.loveRollDie?.rollTo;
 state.rollAnimationKind=kind;state.diceStatus='pending';
 for(const tab of root.querySelectorAll('.nav button'))tab.disabled=true;
 if(useLiveD100){
  // No DOM replacement while the server selects the official face.
  const button=root.querySelector('button[data-action="new-challenge"]');
  if(button){button.disabled=true;button.textContent='Brassage en cours…';}
  for(const option of root.querySelectorAll('.evening-step.two button[data-action^="category:"]'))
   option.disabled=true;
  const number=root.querySelector('.evening-d100-result');
  if(number)number.hidden=true;
 }else if(useLiveMonthly){
  for(const button of root.querySelectorAll('.surprise-month button,.surprise-event-card'))button.disabled=true;
  const button=root.querySelector('.surprise-month>.surprise-primary');
  if(button){button.textContent='Brassage en cours…';button.setAttribute('aria-busy','true');}
 }else render();
 try{
  const result=await fn(); // Supabase determines and persists the actual result
  // Never fabricate a one-pip result if Supabase has not confirmed a face.
  const confirmedFace=Number(result?.face);
  if(!Number.isInteger(confirmedFace)||confirmedFace<1||
     (kind==='my-d6'&&confirmedFace>6)||
     (kind==='new-challenge'&&confirmedFace>100)||
     (kind==='monthly_activity'&&confirmedFace>100)||(kind==='monthly_host'&&confirmedFace>6))
   throw new Error('Le serveur n’a pas confirmé le résultat officiel du dé.');
  state.rollAnimationFace=confirmedFace;
  state.diceStatus='rolling';
  const liveStarted=(useLiveD100||useLiveMonthly)&&liveDie.isConnected&&
   liveDie.loveRollDie?.rollTo(confirmedFace)===true;
  const liveD100Started=useLiveD100&&liveStarted;
  if(!liveStarted)render();
  await new Promise(resolve=>setTimeout(resolve,window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?180:ROLL_TOTAL_MS+140));
  if(liveD100Started&&activeD100.isConnected){
   const number=root.querySelector('.evening-d100-result');
   if(number){number.textContent='Résultat : '+confirmedFace;number.hidden=false;}
  }
  if(kind==='monthly_host'||kind==='monthly_activity'){
   // Show each official monthly face for a full second after it stops, before
   // opening the activity or restoring the D100. Never draw twice.
   state.diceStatus='settled';
   await refreshShared();
   // Keep the existing WebGL canvas mounted: no flash or animation restart.
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(kind==='new-challenge'){
   // Keep official D100 face visible for a full second after the animation.
   // A truthy status temporarily suppresses refreshShared's automatic popup.
   state.diceStatus='settled';
   await refreshShared();
   if(state.tab==='session'&&!liveD100Started)render();
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  state.diceStatus=null;state.rollAnimationFace=null;state.rollAnimationKind=null;
  // Open the confirmed activity before repainting: no intermediate D6 flash.
  await refreshShared();
  if(kind==='monthly_activity')state.showSurpriseActivity=!!state.monthly?.monthly_activity;
  render();return result;
 }catch(e){
  state.diceStatus=null;state.rollAnimationFace=null;state.rollAnimationKind=null;
  try{await refreshShared();}finally{render();}
  throw e;
 }
}
async function hashToken(token){
 const digest=await crypto.subtle.digest('SHA-256',enc.encode(token));
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randomInviteToken(){
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function ensureInviteDraft(forceNew=false){
 if(!state.coupleId||state.members.length===2)throw Error('Le couple est déjà connecté.');
 const email=normalizeInviteEmail(id('invite-email')?.value);
 if(!CONFIG.siteUrl)throw Error('Adresse publique LoveRoll manquante.');
 const existing=state.invitations?.find(x=>!x.cancelled_at&&!x.accepted_at&&
  new Date(x.expires_at)>new Date()&&x.invited_email?.toLowerCase()===email);
 // ID links are recoverable from server-visible invitation metadata; the
 // secret token hash is never exposed. Re-sending does not consume/invalidate it.
 if(!forceNew&&existing){
  state.inviteDraft={id:existing.id,email,link:inviteLinkForId(CONFIG.siteUrl,existing.id)};
  return state.inviteDraft;
 }
 if(!forceNew&&state.inviteDraft&&state.inviteDraft.email===email)return state.inviteDraft;
 if(!forceNew&&state.invitations?.some(x=>!x.cancelled_at&&!x.accepted_at&&
   new Date(x.expires_at)>new Date()))
  throw Error('Une invitation active existe pour un autre courriel. Utilisez « Remplacer le lien actuel ».');
 const token=randomInviteToken(),digest=await hashToken(token);
 const invitationId=await rpc('create_pair_invite',{p_couple:state.coupleId,p_email:email,p_token_hash:digest});
 state.inviteDraft={id:invitationId,email,link:inviteLinkForId(CONFIG.siteUrl,invitationId)};
 state.invitations=await query('couple_invitations',{eq:{couple_id:state.coupleId},order:'created_at'});
 return state.inviteDraft;
}
function keepAuthModeInUrl(mode){
 const url=new URL(location.href);
 if(['signup','signin','request-reset'].includes(mode))url.searchParams.set('auth',mode);
 else url.searchParams.delete('auth');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
async function handle(action,element){
 const [verb,...parts]=action.split(':');
 if(['editor-back','editor-import','editor-import-back','custom-slot','custom-category','monthly-slot','special-editor-event','special-editor-back','special-editor-stage','special-editor-face','set-celebrant'].includes(verb)){
  if(hasUnsavedForm()&&!(await premiumConfirm('Vos modifications non enregistrées seront perdues. Voulez-vous quitter cette page ?', {kind:'library',title:'Quitter sans enregistrer ?',accept:'Quitter',cancel:'Rester'})))return;
  lastFormTab=null;
 }
 if(verb==='editor-back'){state.libraryScreen='list';render();return;}
 if(verb==='editor-import'){
  if(!isLoveAdmin())throw Error('Accès réservé au créateur.');
  if(!['evening','monthly','advent','special'].includes(parts[0]))throw Error('Bibliothèque inconnue.');
  state.libraryImportKind=parts[0];state.jsonPending=null;render();return;
 }
 if(verb==='editor-import-back'){state.libraryImportKind=null;state.jsonPending=null;render();return;}
 if(verb==='special-editor-event'){
  if(!isLoveAdmin()||!SPECIAL_EVENT_KEYS.includes(parts[0]))throw Error('Événement non accessible.');
  state.specialEditorKey=parts[0];state.specialEditorFace=1;state.specialEditorStage='D6_activite';render();return;
 }
 if(verb==='special-editor-back'){state.specialEditorKey=null;render();return;}
 if(verb==='special-editor-stage'){if(!isLoveAdmin()||!['D6_activite','D6_modificateur'].includes(parts[0]))throw Error('Étape invalide.');state.specialEditorStage=parts[0];render();return;}
 if(verb==='special-editor-face'){const face=Number(parts[0]);if(!isLoveAdmin()||!Number.isInteger(face)||face<1||face>6)throw Error('Face invalide.');state.specialEditorFace=face;render();return;}
 if(verb==='save-special-option'){
  if(!isLoveAdmin())throw Error('Accès réservé au créateur.');
  const catalogue=structuredClone(state.specialEventsConfig),entry=catalogue?.evenements_speciaux?.[state.specialEditorKey];
  if(!entry)throw Error('Importez d’abord votre catalogue.');
  const stage=state.specialEditorStage,face=state.specialEditorFace;
  if(!['D6_activite','D6_modificateur'].includes(stage)||!Number.isInteger(face)||face<1||face>6)throw Error('Option invalide.');
  entry.evenement=id('special-option-name').value;entry.date=id('special-option-date').value;
  entry[stage][face-1]={[face]:id('special-option-description').value};
  entry.minuteurs={...entry.minuteurs,[stage]:entry.minuteurs?.[stage]||[null,null,null,null,null,null]};
  entry.minuteurs[stage][face-1]=id('special-option-timer-enabled').checked?Number(id('special-option-minutes').value):null;
  validateSpecialEventsJson(catalogue);
  await rpc('import_love_special_events',{p_couple:state.coupleId,p_events:catalogue});await reload();notify('Option enregistrée. Les surprises déjà révélées restent conservées.');return;
 }
 if(verb==='save-editor-event-date'){
  if(!isLoveAdmin())throw Error('Accès réservé au créateur.');
  const row=sixSpecialEvents(new Date(),state.occasionSettings||{},state.members).find(r=>privateSpecialKey(r.key,r.owner,state.couple?.owner_user_id)===state.specialEditorKey);
  if(!row)throw Error('Événement introuvable.');
  const title=id('editor-event-name').value.trim(),text=id('editor-event-date').value.trim(),date=text?parseSurpriseDateInput(text):'';
  if(title.length<2||title.length>55||text&&!date)throw Error('Nom de 2 à 55 caractères et date valide JJ/MM/AAAA requis.');
  const prior=surpriseCustom(state.occasionSettings,row.key,row.owner).month_day||null;
  await rpc('save_love_surprise_event',{p_couple:state.coupleId,p_slot:row.slot,p_title:title,p_month_day:date&&date!==row.date?date.slice(5):prior});
  await reload();notify('Nom et date enregistrés.');return;
 }
 if(verb==='home-notices'){
  state.homeNotices=!state.homeNotices;render();return;
 }
 if(verb==='review-rate'){
  const key=parts[0],value=Number(parts[1]);
  if(!state.reviewModalSessionId||!['overall','connection','appreciation','again'].includes(key)||
    !Number.isInteger(value)||value<1||value>5)throw Error('Note invalide.');
  state.reviewDraft={...state.reviewDraft,[key]:value};
  const group=root.querySelector('.lr-review-hearts[aria-label*="'+({
   overall:'Rendu global',connection:'Connexion',appreciation:'Appréciation',again:'Envie'
  }[key])+'"]');
  for(const button of group?.querySelectorAll('button[data-action^="review-rate:"]')||[]){
   const level=Number(button.dataset.action.split(':')[2]);
   button.classList.toggle('is-lit',level<=value);
   button.setAttribute('aria-pressed',String(level===value));
   button.querySelector('span').textContent=level<=value?'♥':'♡';
  }
  return;
 }
 if(verb==='review-dismiss'){
  state.reviewDismissedSessionId=state.reviewModalSessionId;
  state.reviewModalSessionId=null;state.reviewDraft={};render();return;
 }
 if(verb==='review-open'){
  const sessionId=parts[0],session=state.sessions?.find(s=>s.id===sessionId&&s.finished_at&&s.counted);
  if(!session||!isSharedCoupleReady(state.coupleId,state.members))
   throw Error('Bilan inaccessible.');
  const previous=state.eveningReviews.find(r=>r.session_id===sessionId&&r.author_id===state.user.id);
  state.reviewModalSessionId=sessionId;state.reviewDismissedSessionId=null;
  state.reviewDraft=previous?{overall:previous.overall,connection:previous.connection,
   appreciation:previous.appreciation,again:previous.again,comment:previous.comment||'',editing:true}:
   {comment:''};
  render();return;
 }
 if(verb==='review-save'){
  if(state.reviewSaving)return;
  const sessionId=state.reviewModalSessionId;
  const session=state.sessions.find(x=>x.id===sessionId&&x.finished_at&&x.counted);
  if(!session)throw Error('Cette soirée n’est pas clôturée.');
  const draft={...state.reviewDraft,comment:root.querySelector('#lr-review-comment')?.value||''};
  const err=root.querySelector('.lr-review-error');
  if(!validEveningReview(draft)){
   if(err){err.hidden=false;err.textContent='Choisis de 1 à 5 cœurs pour chacune des quatre questions.';}
   return;
  }
  const save=root.querySelector('.lr-review-save');
  state.reviewSaving=true;if(save){save.disabled=true;save.textContent='♡ Enregistrement…';}
  try{
   await rpc('save_love_evening_review',{p_session:sessionId,p_overall:draft.overall,
    p_connection:draft.connection,p_appreciation:draft.appreciation,
    p_again:draft.again,p_comment:draft.comment});
   state.reviewModalSessionId=null;state.reviewDraft={};state.reviewDismissedSessionId=sessionId;
   const date=eveningLocalDay(session.started_at);
   state.eveningCalendarMonth=date?.slice(0,7)||month();
   state.eveningCalendarDate=date||today();
   state.eveningCalendarBack='tab:session';
   state.tab='evening-calendar';
   await refreshAndShow();
  }catch(error){
   if(err){err.hidden=false;err.textContent=String(error?.message||'Enregistrement impossible. Réessaie.');}
  }finally{state.reviewSaving=false;if(save?.isConnected){save.disabled=false;save.textContent='♡ Enregistrer notre bilan';}}
  return;
 }
 if(verb==='evening-more'){state.eveningMore=!state.eveningMore;render();return;}
 if(verb==='evening-calendar'){
  state.eveningCalendarBack=parts[0]==='settings'||state.tab==='settings'?'settings-page:confidentialite':'tab:session';
  state.eveningMore=false;state.confirmCancel=false;
  const date=state.session?eveningLocalDay(state.session.started_at):null;
  if(date){state.eveningCalendarDate=date;state.eveningCalendarMonth=date.slice(0,7);}
  state.tab='evening-calendar';render();return;
 }
 if(verb==='evening-month-prev'||verb==='evening-month-next'){
  const d=new Date((state.eveningCalendarMonth||month())+'-15T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth()+(verb==='evening-month-next'?1:-1));
  state.eveningCalendarMonth=d.toISOString().slice(0,7);
  state.eveningCalendarDate=state.eveningCalendarMonth+'-01';
  state.calendarPassQuota=await rpc('love_calendar_pass_quota',{
   p_couple:state.coupleId,p_month:state.eveningCalendarMonth
  });
  state.calendarPassMonth=state.eveningCalendarMonth;
  render();return;
 }
 if(verb==='evening-date'){
  const date=parts[0];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,7)!==(state.eveningCalendarMonth||month()))
   throw Error('Date de calendrier invalide.');
  state.eveningCalendarDate=date;render();return;
 }
 if(verb==='evening-close-request'){
  if(!state.session)throw Error('Aucune soirée à clore.');
  state.eveningMore=false;state.confirmCancel=true;render();return;
 }
 if(verb==='evening-close-confirm'){
  if(!state.session)throw Error('Cette soirée est déjà clôturée.');
  const ended=state.session;
  await rpc('close_love_evening_preserve',{p_session:ended.id});
  const date=eveningLocalDay(ended.started_at);
  state.eveningCalendarMonth=date?.slice(0,7)||month();
  state.eveningCalendarDate=date||today();
  state.confirmCancel=false;state.eveningMore=false;state.showEveningChallenges=false;
  state.tab='evening-calendar';await refreshAndShow();return;
 }
 if(verb==='evening-challenge'||verb==='evening-list'){
  state.showEveningChallenges=true;state.selectedEveningChallengeId=null;render();return;
 }
 if(verb==='evening-close'){
  state.showEveningChallenges=false;state.selectedEveningChallengeId=null;render();return;
 }
 if(verb==='evening-open'){
  if(!ownEveningChallenges(state.challenges,state.user?.id,state.session?.id).some(x=>x.id===parts[0]))
   throw Error('Ce défi ne fait pas partie de ta liste personnelle.');
  state.selectedEveningChallengeId=parts[0];state.showEveningChallenges=true;render();return;
 }
 if(verb==='evening-start'){
  const picked=ownEveningChallenges(state.challenges,state.user?.id,state.session?.id).find(x=>x.id===parts[0]);
  if(!picked||!['proposed','accepted'].includes(picked.status))throw Error('Ce défi ne peut pas être commencé.');
  if(picked.status==='proposed')
   await rpc('answer_challenge',{p_id:picked.id,p_status:'accepted'});
  state.showEveningChallenges=true;state.selectedEveningChallengeId=picked.id;
  await refreshAndShow();
  const active=state.challenges.find(c=>c.id===picked.id);
  const minutes=resolvedCard(active||picked).minutes;
  if(minutes>0){
   activeTimer(active||picked,minutes);
   if(!challengeTimer.running&&challengeTimer.remainingMs>0){
    challengeTimer.deadline=Date.now()+challengeTimer.remainingMs;
    challengeTimer.running=true;challengeTimer.notified=false;
    saveChallengeTimer();
   }
   updateChallengeClock();
  }
  return;
 }
 if(verb==='surprise-activity'){state.showSurpriseActivity=!state.showSurpriseActivity;render();return;}
 if(verb==='surprise-season'){if(!['hiver','ete'].includes(parts[0])||!state.showSurpriseActivity)return;state.surpriseSeason=parts[0];render();return;}
 if(verb==='surprise-how'){
   notify('Chaque événement : un D6 choisit l’activité puis un second D6 choisit sa variante. Les résultats sont synchronisés.');
   return;
 }
 if(verb==='edit-surprise-event'){
   const key=parts[0],owner=parts[1]==='-'?null:parts[1],slot=surpriseSlot(key,owner);
   const row=sixSpecialEvents(new Date(),state.occasionSettings||{},state.members)
    .find(e=>e.slot===slot);
   if(!row)throw Error('Événement inconnu');
   state.showSurpriseActivity=false;state.surpriseEditSlot=slot;render();return;
  }
  if(verb==='close-surprise-event'){state.surpriseEditSlot=null;render();return;}
  if(verb==='save-surprise-event'){
   const row=sixSpecialEvents(new Date(),state.occasionSettings||{},state.members)
    .find(e=>e.slot===state.surpriseEditSlot);
   if(!row)throw Error('Événement introuvable');
   const title=id('surprise-event-name')?.value.trim()||'';
   const typedDate=id('surprise-event-date')?.value.trim()||'';
   const newDate=typedDate?parseSurpriseDateInput(typedDate):'';
   if(title.length<2||title.length>55)throw Error('Nom : entre 2 et 55 caractères.');
   if(typedDate&&!newDate)throw Error('Entre une date valide : JJ/MM/AAAA.');
   const prior=surpriseCustom(state.occasionSettings,row.key,row.owner).month_day||null;
   const md=newDate&&newDate!==row.date?newDate.slice(5):prior;
   await rpc('save_love_surprise_event',{p_couple:state.coupleId,
    p_slot:row.slot,p_title:title,p_month_day:md});
   state.surpriseEditSlot=null;await refreshAndShow();return;
  }
  if(verb==='open-occasion'){
  const key=parts[0],owner=parts[1]==='-'?null:parts[1];
  if(!['anniversary','birthday','valentine','mothers_day','fathers_day'].includes(key))
   throw Error('Événement inconnu');
  if(owner&&!state.members.some(m=>m.user_id===owner))throw Error('Partenaire inconnu');
  state.surpriseEditSlot=null;state.specialFocus={key,owner};state.tab='occasions';render();return;
 }
 if(verb==='occasion-back'){state.specialFocus=null;state.tab='special';render();return;}

 if(verb==='reload-web'){
  await reloadWebAssets(true);return;
 }
 if(verb==='open-personal-sexual-cards'){
  if(!isLoveAdmin()||state.couple?.sexual_card_mode!=='custom')
   throw Error('Cette bibliothèque est réservée au créateur en mode personnalisé.');
  state.customCategory='SEXUEL';state.customSlot=1;
  state.libraryScreen='list';state.libraryImportKind=null;
  state.jsonPending=null;state.tab='library';render();return;
 }
 if(verb==='save-sexual-mode'){
  if(!isLoveAdmin()||!state.coupleId)throw Error('Mode réservé à l’administrateur du couple.');
  const requestedMode=id('admin-sexual-mode')?.value;
  if(!['automatic','custom'].includes(requestedMode))throw Error('Veuillez choisir un mode de cartes.');
  await rpc('set_love_sexual_card_mode',{p_couple:state.coupleId,p_mode:requestedMode});
  state.libraryImportKind=null;state.libraryScreen='list';state.jsonPending=null;
  if(requestedMode==='custom'){
   state.customCategory='SEXUEL';state.customSlot=1;state.tab='library';
  }else{
   state.tab='settings';settingsOpenSection='admin';
  }
  await reload();
  notify(requestedMode==='automatic'?
   'Algorithme activé pour les prochains défis. La sélection reste secrète.':
   'Les 100 cartes MEDIUM sont disponibles dans votre bibliothèque privée, modifiable sans toucher aux autres couples.');
  return;
 }
 if(verb==='save-category-weights'){
  if(!isLoveAdmin())throw Error('Pondération réservée à l’administrateur du duo.');
  const preferredText=id('admin-category-preferred')?.value;
  const otherText=id('admin-category-other')?.value;
  const values=parseDiceWeightInputs([preferredText,otherText,'0','0','0','0']);
  const enabled=id('admin-category-enabled')?.checked;
  if(typeof enabled!=='boolean')throw Error('Interrupteur introuvable.');
  await rpc('save_love_category_weights',{
   p_couple:state.coupleId,p_enabled:enabled,p_preferred:values[0]
  });
  settingsOpenSection='admin';await reload();
  const panel=root.querySelector('[data-category-weights="true"]');
  if(panel)panel.open=true;
  return;
 }
 if(verb==='save-dice-weights'){
  const kind=parts[0],config=DICE_WEIGHT_CONFIG[kind];
  if(!config||!isLoveAdmin())throw Error('Pondérations réservées à l’administrateur du duo.');
  const values=parseDiceWeightInputs(Array.from({length:6},(_,i)=>id('admin-weight-'+kind+'-'+(i+1))?.value));
  const switchInput=id('admin-weight-'+kind+'-enabled');
  if(!switchInput)throw Error('Interrupteur de pondération introuvable.');
  const enabled=switchInput.checked;
  await rpc('save_love_dice_weights',{
   p_couple:state.coupleId,p_kind:kind,p_enabled:enabled,p_weights:values
  });
  settingsOpenSection='admin';
  await reload();
  const panel=root.querySelector('[data-dice-weight="'+kind+'"]');
  if(panel){
   panel.open=true;
   const status=panel.querySelector('.admin-dice-weight-feedback');
   if(status)status.textContent='Pondérations enregistrées pour vos prochains tirages.';
  }
  return;
 }
 if(verb==='admin-reset-challenges'){
  if(!isLoveAdmin()||!state.coupleId)
   throw Error('Cette remise à zéro est réservée à l’administrateur du duo.');
  if(state.session)throw Error('Terminez ou clôturez la soirée avant de recommencer les défis.');
  if(!(await premiumConfirm(
   'Recommencer un nouveau cycle de 200 défis ? Les cartes déjà pigées pourront revenir, mais vos anciens défis complétés, les soirées, les dons et les passes du mois seront conservés. Les dés ne seront pas réinitialisés.',
   {kind:'reset',title:'Recommencer les défis ?',accept:'Oui, nouveau cycle',cancel:'Conserver notre progression'}
  )))return;
  await rpc('reset_love_challenges_admin',{p_couple:state.coupleId});
  state.cycleDeferred=null;
  await reload();
  notify('Un nouveau cycle de 200 défis est prêt. Vos souvenirs sont conservés.');return;
 }
 if(verb==='cycle-answer'){
  if(!state.cycleStatus?.pending||!state.coupleId)
   throw Error('Le questionnaire des 200 défis n’est pas disponible.');
  const choice=parts[0];
  if(!['down','same','up'].includes(choice))throw Error('Choix d’intensité invalide.');
  const result=await rpc('answer_love_cycle_intensity',{p_couple:state.coupleId,p_choice:choice});
  state.cycleDeferred=null;
  await reload();
  if(result?.completed)notify('♡ Votre nouveau cycle de 200 défis commence.');
  return;
 }
 if(verb==='cycle-later'){
  state.cycleDeferred=state.cycleStatus?.cycle||null;render();return;
 }
 if(verb==='cycle-reopen'){
  state.cycleDeferred=null;render();return;
 }
 if(verb==='admin-reset-all-dice'){
  if(!isLoveAdmin()||!isSharedCoupleReady(state.coupleId,state.members))
   throw Error('Réinitialisation réservée à l’administrateur du couple.');
  const message='Réinitialiser TOUS les dés actifs pour les deux partenaires ? '+
   'Le D6 hebdomadaire, les D6 personnels de la soirée, les défis D100 encore actifs, '+
   'les tirages de Surprise du mois et les dés des événements spéciaux seront à refaire. '+
   'Si une soirée est en cours, elle sera clôturée sans être comptée. '+
   'Les défis déjà enregistrés restent dans l’historique, ainsi que les soirées terminées, '+
   'vos cartes, journaux et le calendrier de l’Avent. Cette action ne peut pas être annulée.';
  if(!(await premiumConfirm(message,{
   kind:'reset',title:'Réinitialiser tous les dés ?',accept:'Oui, tout réinitialiser',
   cancel:'Conserver nos tirages'
  })))return;
  const result=await rpc('reset_love_all_dice_admin',{p_couple:state.coupleId});
  state.tab='home';state.specialFocus=null;state.showEveningChallenge=false;
  state.rollAnimationFace=null;state.rollAnimationKind=null;state.diceStatus=null;
  await refreshAndShow();
  notify(result?.changed?'♡ Tous les dés du cycle actuel sont prêts à être rebrassés sur les deux comptes.':
   'Aucun tirage actif à réinitialiser.');
  return;
 }
 // All demo actions are local, never database writes or new memberships.
 if(verb==='demo-enter'){
  if(!state.user||!state.profile?.birthday_md)
   throw Error('Complétez votre compte pour accéder à la démo.');
  state.demoMode=true;state.demoTab='home';render();return;
 }
 if(verb==='demo-exit'){state.demoMode=false;state.demoTab='home';render();return;}
 if(verb==='demo-tab'){
  if(!state.demoMode||!DEMO_TABS.includes(parts[0]))return;
  state.demoTab=parts[0];render();return;
 }
 if(verb==='demo-roll'){
  if(!state.demoMode)return;
  state.demoRoll=Math.floor(Math.random()*6)+1;render();return;
 }
 if(verb==='demo-surprise'){
  if(!state.demoMode)return;
  const ideas=['Souper romantique','Soirée cinéma à deux','Promenade au coucher du soleil',
   'Massage en duo','Petit-déjeuner surprise','Pique-nique improvisé'];
  state.demoSurprise=ideas[Math.floor(Math.random()*ideas.length)];render();return;
 }
 if(verb==='demo-day'){
  if(!state.demoMode)return;
  const day=Number(parts[0]);if(Number.isInteger(day)&&day>=1&&day<=25){state.demoDay=day;render();}
  return;
 }
 if(verb==='demo-complete'){
  if(!state.demoMode)return;
  state.demoChallengeComplete=!state.demoChallengeComplete;render();return;
 }
 if(verb==='push-enable'){
  await enablePush(client,state.user.id);
  state.pushPrefs={...(state.pushPrefs||{}),enabled:true};state.pushDevice=await currentPushDevice(client,state.user?.id);
  render();setNotificationFeedback('Notifications activées sur cet appareil.');return;
 }
 if(verb==='push-disable'){
  await disablePush(client,state.user.id);
  state.pushPrefs={...(state.pushPrefs||{}),enabled:false};state.pushDevice=await currentPushDevice(client,state.user?.id);
  render();setNotificationFeedback('Notifications désactivées sur cet appareil.');return;
 }
 if(verb==='push-test'){
  const result=await sendTestPush(client);
  setNotificationFeedback(result?'Demande de test acceptée. Vérifiez si la notification arrive sur cet appareil.':'Demande de test refusée par le serveur.',result?'status':'error');
  return;
 }
 if(verb==='native-notify-enable'){
  if(!window.LoveRollNativeAuth?.enableWeeklyReminder)
   throw Error('Mettez à jour l’APK pour activer le rappel Android.');
  window.LoveRollNativeAuth.enableWeeklyReminder();
  setNotificationFeedback('Activation demandée. Autorisez les notifications dans la fenêtre Android si nécessaire.');
  setTimeout(refreshNativeNotificationSettings,400);
  return;
 }
 if(verb==='native-notify-disable'){
  if(!window.LoveRollNativeAuth?.disableWeeklyReminder)
   throw Error('Mettez à jour l’APK pour désactiver le rappel Android.');
  window.LoveRollNativeAuth.disableWeeklyReminder();
  setNotificationFeedback('Désactivation du rappel local demandée.');
  setTimeout(refreshNativeNotificationSettings,400);return;
 }
 if(verb==='invite-start'){
  const invite=pendingInviteReference(sessionStorage);
  if(!invite)throw Error('Invitation introuvable.');
  state.inviteAccepted=true;state.showAuth=true;state.showDiscover=false;
  sessionStorage.setItem('loverollInviteAccepted',invite.kind+':'+invite.value);
  if(invite.kind==='id')try{
   // Persist only after the recipient expressly accepts the invitation.
   // Previewing someone else's link must never trap a future login.
   localStorage.setItem('pendingInviteId',invite.value);
   localStorage.setItem('loverollInviteUntil',String(Date.now()+7*24*60*60*1000));
   localStorage.setItem('loverollInviteAccepted','id:'+invite.value);
  }catch(error){/* Private-mode storage is optional. */}
  if(state.user)await reload();else render();
  return;
 }
 if(verb==='discover-loveroll'){state.showDiscover=true;render();return;}
 if(verb==='discover-back'||verb==='invite-return'){
  keepAuthModeInUrl(null);state.showDiscover=false;
  if(pendingInviteReference(sessionStorage)){
   state.inviteAccepted=false;state.showAuth=false;
   sessionStorage.removeItem('loverollInviteAccepted');
   try{localStorage.removeItem('loverollInviteAccepted');}catch(error){}
  }else state.showAuth=verb==='discover-back';
  render();return;
 }
 if(verb==='copy-invite-for-browser'){
  const invite=pendingInviteReference(sessionStorage);
  if(!invite)throw Error('Lien d’invitation introuvable.');
  const url=invite.kind==='id'?inviteLinkForId(CONFIG.siteUrl,invite.value):
   CONFIG.siteUrl+'?v='+INVITATION_REVISION+'#invite='+invite.value;
  try{await navigator.clipboard.writeText(url);}
  catch(error){
   const manuallyCopied=await premiumCopyLink(url);
   if(!manuallyCopied)return;
  }
  notify('Lien personnel prêt. Collez-le dans Chrome ou Safari.');return;
 }
 if(verb==='use-existing-account'){
  // The profile step can also be reached with an old or wrong authenticated
  // account. Never force the user to overwrite that account's personal profile.
  // The pending invitation stays intact across this local sign-out.
  const hadInvite=!!pendingInviteReference(sessionStorage);
  const priorConsent=!!state.inviteAccepted;
  if(state.channel){await client.removeChannel(state.channel);state.channel=null;}
  state.unlockKey=null;state.personalPass=null;state.personalJournal=[];
  // No profile, couple, challenge, invitation or user row is deleted.
  const {error}=await client.auth.signOut({scope:'local'});
  if(error)throw error;
  state.user=null;state.profile=null;state.coupleId=null;state.couple=null;
  state.members=[];state.wellbeing=null;state.emailVerificationPending=false;
  state.passwordRecovery=false;state.showDiscover=false;state.showAuth=true;
  state.authMode='signin';state.authDraftEmail='';state.inviteError=null;
  state.inviteAttemptKey=null;
  state.inviteAccepted=hadInvite&&priorConsent;
  state.authNotice='Connectez-vous à votre compte existant avec votre mot de passe ou « Continuer avec Google ».';
  render();return;
 }
 if(verb==='join-invite-from-solo'){
  const invite=pendingInviteReference(sessionStorage);
  if(!invite||!state.user||!state.coupleId||
     state.members.length!==1||state.members[0]?.user_id!==state.user.id||
     state.couple?.owner_user_id!==state.user.id)
   throw Error('Votre espace personnel doit être le seul membre avant de rejoindre cette invitation.');
  const yes=await premiumConfirm(
   'Votre espace LoveRoll actuel (où vous êtes seul) sera dissocié. Vos cartes personnalisées et votre historique personnel seront sauvegardés dans votre archive. Ils ne seront pas automatiquement mélangés avec les cartes du couple invité. Voulez-vous rejoindre le nouveau couple ?',
   {kind:'couple',title:'Rejoindre votre partenaire ?',accept:'Oui, rejoindre ce couple',cancel:'Conserver mon espace'});
  if(!yes)return;
  try{
   const invitationId=invite.kind==='id'?invite.value:
    await rpc('resolve_love_invite_reference',{p_token_hash:await hashToken(invite.value)});
   if(!invitationId)throw Error('Invitation introuvable ou expirée.');
   // Server verifies recipient email and performs archive + membership move
   // ATOMICALLY; any failure rolls back the prior solo membership.
   await rpc('join_love_invitation_from_solo',{p_invitation:invitationId});
   state.unlockKey=null;state.personalPass=null;state.personalJournal=[];
   state.inviteError=null;
   finishInviteReference();
   state.showAuth=false;state.showDiscover=false;state.inviteWelcome=true;state.tab='home';
   await reload();
  }catch(error){
   state.inviteError=invitationAuthMessage(error);
   render();
  }
  return;
 }
 if(verb==='switch-account-invite'){
  if(state.user&&safeNativePushToken()){
   try{await disablePush(client,state.user.id);}catch(error){console.warn('Déconnexion FCM',error.code||'');}
  }
  if(!pendingInviteReference(sessionStorage))throw Error('Invitation introuvable.');
  state.unlockKey=null;state.personalPass=null;state.personalJournal=[];
  if(state.channel){await client.removeChannel(state.channel);state.channel=null;}
  const {error}=await client.auth.signOut();
  if(error)throw error;
  state.user=null;state.profile=null;state.coupleId=null;state.members=[];
  state.inviteAccepted=true;state.showAuth=true;state.inviteError=null;state.inviteAttemptKey=null;render();return;
 }
 if(verb==='native-update'){
  if(!window.LoveRollNativeAuth?.checkForUpdates)throw Error('Vérification des mises à jour disponible dans l’APK Android.');
  window.LoveRollNativeAuth.checkForUpdates();return;
 }
 if(verb==='native-legacy'){
  if(!window.LoveRollNativeAuth?.openLegacyOffline)throw Error('Anciennes données locales disponibles dans l’APK Android.');
  if(!(await premiumConfirm('Les anciennes données hors ligne ne sont pas synchronisées avec votre couple connecté.',{kind:'legacy'})))return;
  window.LoveRollNativeAuth.openLegacyOffline();return;
 }
 if(verb==='show-install-guide'){
  state.installModalOpen=false;state.showInstallSteps=true;state.forceInstallGuide=true;
  render();return;
 }
 if(verb==='install-home'){
  const result=await requestInstall();
  if(result.prompted){
   dismissInstall(state.user?.id);
   state.installModalOpen=false;state.showInstallSteps=false;state.forceInstallGuide=false;
   if(result.accepted)notify('LoveRoll a été ajouté à votre écran d’accueil ♡');
  }else{
   state.installModalOpen=false;state.showInstallSteps=true;state.forceInstallGuide=true;
  }
  render();return;
 }
 if(verb==='install-copy-url'){
  const link=new URL(CONFIG.siteUrl||location.origin+location.pathname);
  link.search='';link.hash='';
  await navigator.clipboard.writeText(link.toString());
  notify('Adresse LoveRoll copiée. Ouvrez-la dans Safari ou Chrome.');
  return;
 }
 if(verb==='install-later'||verb==='install-understood'){
  dismissInstall(state.user?.id);
  state.installModalOpen=false;state.showInstallSteps=false;state.forceInstallGuide=false;
  render();return;
 }
 if(verb==='set-celebrant'){
  if(!isLoveAdmin())throw Error('Réglage réservé à l’administrateur.');
  if(!TARGETED_OCCASIONS.includes(parts[0])||
    !state.members.some(m=>m.user_id===parts[1]))throw Error('Personne célébrée invalide.');
  await rpc('set_love_celebrant',{p_couple:state.coupleId,p_kind:parts[0],p_user:parts[1]});
  await reload();notify('Personne célébrée enregistrée.');return;
 }
 if(verb==='special-timer'){state.specialTimerKey=parts.join(':');render();return;}
 if(verb==='json-export'){
  if(!isLoveAdmin())throw Error('Export réservé à l’administrateur.');
  await exportLibraryFile(parts[0]);notify('Sauvegarde JSON préparée.');return;
 }
 if(verb==='json-preview'){
  if(!isLoveAdmin())throw Error('Import réservé à l’administrateur.');
  try{previewPortableJson(parts[0]);render();}
  catch(error){state.jsonPending=null;root.querySelector('.json-preview')?.remove();const message=id('json-validation-error');if(message){message.hidden=false;message.textContent=error.message;}else throw error;}return;
 }
 if(verb==='json-cancel'){state.jsonPending=null;render();return;}
 if(verb==='json-apply'){
  if(!isLoveAdmin())throw Error('Import réservé à l’administrateur.');
  const preview=state.jsonPending;
  if(!preview||preview.kind!==parts[0])throw Error('Prévisualisez d’abord votre JSON.');
  normalizeLibraryData(preview.data,preview.kind);
  if(!(await premiumConfirm('Remplacer « '+preview.summary.label+' » avec '+
    preview.summary.count+' éléments et '+preview.summary.timers+
    ' minuteur(s) configuré(s) ? Les anciens tirages restent inchangés.',{kind:'library',title:'Importer la bibliothèque ?'})))return;
  if(preview.kind==='evening'&&preview.data.category==='SEXUEL'&&
     state.couple?.sexual_card_mode==='custom')
   await rpc('import_love_personal_sexual_cards',{
    p_couple:state.coupleId,p_library:preview.data});
  else if(preview.kind==='evening')
   await rpc('import_love_evening_library',{p_couple:state.coupleId,p_library:preview.data});
  else if(preview.kind==='monthly')
   await rpc('import_love_monthly_library',{p_couple:state.coupleId,p_library:preview.data});
  else if(preview.kind==='advent')
   await rpc('import_love_advent_2026',{p_couple:state.coupleId,p_calendar:preview.data});
  else if(preview.kind==='special')
   await rpc('import_love_special_events',{p_couple:state.coupleId,p_events:preview.data});
  state.jsonPending=null;await reload();
  notify('Bibliothèque importée : les minuteries JSON sont activées pour les prochains tirages.');return;
 }
 if(verb==='import-special-events'){
  if(!isLoveAdmin())throw Error('Import réservé à l’administrateur.');
  previewPortableJson('special');render();return;
 }
 if(verb==='import-advent-2026'){
  if(!isLoveAdmin())throw Error('Import réservé à l’administrateur.');
  previewPortableJson('advent');render();return;
 }
 if(verb==='advent-editor-day'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  const day=Number(parts[0]);
  if(!Number.isInteger(day)||day<1||day>25)throw Error('Journée invalide.');
  if(hasUnsavedForm()&&!(await premiumConfirm('Un brouillon non enregistré pourrait être perdu en changeant de journée.',{
    kind:'library',title:'Changer de journée ?',accept:'Continuer',cancel:'Rester'})))return;
  state.adventEditorDay=day;render();
  id('advent-day-title')?.scrollIntoView({behavior:'smooth',block:'center'});
  return;
 }
 if(verb==='close-advent-day'){
  if(hasUnsavedForm()&&!(await premiumConfirm('Fermer sans enregistrer les modifications de cette journée ?',{
    kind:'library',title:'Fermer le brouillon ?',accept:'Fermer',cancel:'Rester'})))return;
  state.adventEditorDay=null;render();return;
 }
 if(verb==='save-advent-day'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  const calendar=calendarFromSaved(state.advent2026Config,state.advent2026Days);
  const day=state.adventEditorDay;
  if(!calendar||!Number.isInteger(day)||day<1||day>25)
   throw Error('Aucune journée du calendrier à modifier.');
  const durationText=id('advent-day-timer-enabled')?.checked?id('advent-day-minutes')?.value.trim()||'':'';
  const minutes=durationText===''?null:Number(durationText);
  const entry=calendar.days.find(x=>x.day===day);
  Object.assign(entry,{type:id('advent-day-type')?.value.trim(),
   title:id('advent-day-title')?.value.trim(),
   description:id('advent-day-description')?.value.trim(),timer_minutes:minutes});
  normalizeLibraryData(calendar,'advent'); // Validate all 25 days before mutation.
  if(!(await premiumConfirm('Enregistrer la modification du '+day+
    ' décembre ? Les autres journées et les résultats déjà ouverts restent identiques.',{
    kind:'library',title:'Enregistrer cette journée ?'})))return;
  await rpc('import_love_advent_2026',{p_couple:state.coupleId,p_calendar:calendar});
  state.jsonPending=null;
  await reload();notify('Journée '+day+' enregistrée. Le calendrier partagé reste intact.');return;
 }
 if(verb==='monthly-slot'){
  if(!isLoveAdmin())throw Error('Modification réservée à l’administrateur.');
  const face=Number(parts[0]);
  if(!Number.isInteger(face)||face<1||face>100)throw Error('Activité invalide.');
  state.monthlySlot=face;render();
  id('monthly-title')?.scrollIntoView({behavior:'smooth',block:'center'});return;
 }
 if(verb==='save-monthly-activity'){
  if(!isLoveAdmin())throw Error('Modification réservée à l’administrateur.');
  const title=id('monthly-title')?.value.trim();
  const description=id('monthly-description')?.value.trim();
  const restaurant=editableMonthlyActivities(state.monthlyActivities).find(x=>x.face===state.monthlySlot)?.is_restaurant===true;
  const duration=id('monthly-timer-enabled')?.checked?Number(id('monthly-minutes')?.value):null;
  if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>60))throw Error('Minuteur de 1 à 60 minutes.');
  if(!title||title.length<3||title.length>120||
    !description||description.length<10||description.length>900)
    throw Error('Titre de 3 à 120 caractères et description de 10 à 900 caractères requis.');
  await rpc('save_love_monthly_activity_with_timer',{
   p_couple:state.coupleId,p_face:state.monthlySlot,p_title:title,
   p_description:description,p_is_restaurant:restaurant,p_timer_minutes:duration});
  await reload();notify('Activité enregistrée pour les prochains tirages.');return;
 }
 if(verb==='reset-monthly-activity'){
  if(!isLoveAdmin())throw Error('Modification réservée à l’administrateur.');
  if(!(await premiumConfirm('Les anciens tirages resteront inchangés.',{kind:'reset',title:'Restaurer cette activité ?'})))return;
  await rpc('reset_love_monthly_activity',{p_couple:state.coupleId,p_face:state.monthlySlot});
  await reload();notify('Activité d’origine restaurée.');return;
 }
 if(verb==='save-evening-buttons'){
  if(!isLoveAdmin())throw Error('Réglage réservé à l’administrateur.');
  const sensuel=!!id('show-sensuel-button')?.checked;
  const sexuel=!!id('show-sexuel-button')?.checked;
  await rpc('save_love_evening_buttons',{
   p_couple:state.coupleId,p_sensuel:sensuel,p_sexuel:sexuel
  });
  if((state.category==='SENSUEL'&&!sensuel)||
     (state.category==='SEXUEL'&&!sexuel))state.category=null;
  await reload();
  notify(!sensuel&&!sexuel?'Seul Aléatoire reste disponible.':'Choix de Soirée enregistrés.');
  return;
 }
 if(verb==='save-draw-rule'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  const enabled=!!id('no-repeat-cards')?.checked;
  await rpc('set_love_draw_rule',{p_couple:state.coupleId,p_no_repeat:enabled});
  await reload();
  notify(enabled?'Chaque carte doit être pigée avant de pouvoir revenir.':'Répétition libre activée.');
  return;
 }
 if(verb==='custom-category'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  if(!EVENING_CATEGORIES.includes(parts[0]))throw Error('Catégorie invalide.');
  state.customCategory=parts[0];state.customSlot=1;state.libraryScreen='list';state.jsonPending=null;render();return;
 }
 if(verb==='custom-slot'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  const slot=Number(parts[0]);if(!Number.isInteger(slot)||slot<1||slot>100)throw Error('Emplacement invalide.');
  state.customSlot=slot;state.libraryScreen='edit';render();
  id('custom-title')?.scrollIntoView({behavior:'smooth',block:'center'});return;
 }
 if(verb==='save-custom-card'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  const title=id('custom-title')?.value.trim(),description=id('custom-description')?.value.trim();
  const timer=id('custom-timer-enabled')?.checked;
  const minutes=timer?Number(id('custom-minutes')?.value):null;
  if(!title||title.length<3||title.length>120||!description||description.length<10||
     description.length>900||(timer&&(!Number.isInteger(minutes)||minutes<1||minutes>60)))
   throw Error('Titre de 3 à 120 caractères, description de 10 à 900 caractères et minuteur facultatif de 1 à 60 minutes.');
  const recipient=document.querySelector('[name="custom-recipient"]:checked')?.value;
  const drawer=document.querySelector('[name="custom-drawer"]:checked')?.value;
  if(!['both','him','her'].includes(drawer)||!['both','him','her'].includes(recipient))
   throw Error('Choisissez qui peut piger et recevoir cette carte.');
  // A SEXUEL personal edit must never modify the common MEDIUM cards, nor
  // the legacy shared custom-card table.
  if(state.customCategory==='SEXUEL'&&state.couple?.sexual_card_mode==='custom'){
   await rpc('save_love_personal_sexual_card',{p_couple:state.coupleId,
    p_card_id:state.customSlot,p_title:title,p_description:description,
    p_timer_minutes:minutes,p_recipient_role:recipient,p_drawer_role:drawer});
  }else{
   await rpc('save_love_card_with_roles',{p_couple:state.coupleId,
    p_category:state.customCategory,p_card_id:state.customSlot,
    p_title:title,p_description:description,p_timer_minutes:minutes,
    p_recipient_role:recipient,p_drawer_role:drawer});
  }
  await reload();notify('Carte enregistrée pour votre duo seulement.');return;
 }
 if(verb==='delete-custom-card'){
  if(!isLoveAdmin())throw Error('Accès réservé à l’administrateur.');
  if(state.customCategory==='SEXUEL'&&state.couple?.sexual_card_mode==='custom'){
   if(!(await premiumConfirm(
    'Restaurer cette carte depuis le modèle MEDIUM ? Vos autres cartes personnelles et les défis déjà pigés ne changeront pas.',
    {kind:'reset',title:'Restaurer cette carte MEDIUM ?'})))return;
   await rpc('restore_love_personal_sexual_card',{
    p_couple:state.coupleId,p_card_id:state.customSlot
   });
   await reload();notify('Carte personnelle restaurée depuis MEDIUM.');return;
  }
  const original=state.customSlot<=25;
  if(!(await premiumConfirm(original?
   'La carte officielle et ses réglages seront restaurés. Les défis déjà tirés restent inchangés.':
   'Cet emplacement sera vidé. Les cartes déjà tirées restent dans l’historique.',
   {kind:original?'reset':'delete',title:original?'Rétablir la carte ?':'Vider cet emplacement ?'})))return;
  await rpc('delete_love_custom_card',{p_couple:state.coupleId,
   p_category:state.customCategory,p_card_id:state.customSlot});
  await reload();notify(original?'Carte officielle rétablie.':'Emplacement vidé, historique conservé.');return;
 }
 if(verb==='start-couple'){
  if(pendingInviteReference(sessionStorage))throw Error('Une invitation est en attente.');
  if(!state.coupleId)await rpc('create_love_match',{p_anniversary_md:null});
  state.tab='invitation';
  await reload();return;
 }
 if(verb==='end-couple'){
  if(!state.coupleId||state.members.length!==2)
   throw Error('La dissociation est réservée à un duo de deux personnes.');
  if(!(await premiumConfirm(
   'Cette action séparera vos deux comptes. Chacun aura automatiquement son propre espace LoveRoll avec le rôle administrateur et pourra inviter une nouvelle personne. Les données communes resteront archivées, sans être mélangées à vos nouveaux espaces. Confirmer la dissociation ?',
   {kind:'couple',title:'Dissocier notre duo ?',accept:'Oui, dissocier notre duo',cancel:'Conserver notre duo'})))return;
  // One authenticated, atomic Supabase transaction for both members.
  // No client-side DELETE and no new signup or account loss.
  await rpc('dissociate_love_to_solo',{p_couple:state.coupleId});
  state.unlockKey=null;state.personalPass=null;state.personalJournal=[];
  state.inviteDraft=null;state.invitations=[];state.inviteAccepted=false;
  await reload();notify('Vous gérez maintenant votre propre espace LoveRoll.');return;
 }
 if(verb==='unlock-personal'){
  const pass=id('personal-pass')?.value||'';
  if(pass.trim().length<12)throw Error('La phrase secrète doit faire au moins 12 caractères.');
  const first=state.personalJournal[0];
  if(first){
   const key=await createCipherKey(pass,first.journal_salt);
   try{await decryptJson(first.ciphertext,key);}catch{throw Error('Phrase secrète incorrecte pour les premières entrées.');}
  }
  state.personalPass=pass;render();return;
 }
 if(verb==='personal-edit'){
  const entry=state.personalJournal?.find(x=>x.id===parts[0]);
  if(!entry||!state.personalPass)throw Error('Vous devez déverrouiller votre note personnelle.');
  const key=await createCipherKey(state.personalPass,entry.journal_salt);
  await decryptJson(entry.ciphertext,key);
  state.personalEditId=entry.id;state.personalSelectedDate=entry.happened_on;render();return;
 }
 if(verb==='personal-cancel-edit'){state.personalEditId=null;render();return;}
 if(verb==='personal-save'){
  const entry=state.personalJournal?.find(x=>x.id===parts[0]&&x.id===state.personalEditId);
  if(!entry||!state.personalPass)throw Error('Modification non autorisée.');
  const date=id('personal-edit-date')?.value||entry.happened_on;
  if(date>today())throw Error('La date ne peut pas être dans le futur.');
  const key=await createCipherKey(state.personalPass,entry.journal_salt);
  const payload=await decryptJson(entry.ciphertext,key);
  Object.assign(payload,{orgasm:id('personal-edit-orgasm')?.value,
   good:id('personal-edit-good')?.value,weak:id('personal-edit-weak')?.value,
   note:(id('personal-edit-note')?.value||'').slice(0,1200)});
  const ciphertext=await encryptJson(payload,key);
  await rpc('update_my_personal_love_event',{p_archive:entry.id,
   p_happened_on:date,p_ciphertext:ciphertext});
  state.personalEditId=null;state.personalSelectedDate=date;
  await reload();notify('Votre note privée a été modifiée sans changer le journal partagé.');return;
 }
 if(verb==='personal-delete'){
  const entry=state.personalJournal?.find(x=>x.id===parts[0]);
  if(!entry||!state.personalPass)throw Error('Accès refusé.');
  if(!(await premiumConfirm('Supprimer seulement votre archive personnelle ? Le journal partagé ne sera pas modifié.',
   {kind:'delete',title:'Supprimer ma note privée ?'})))return;
  await rpc('delete_my_personal_love_event',{p_archive:entry.id});
  state.personalEditId=null;await reload();notify('Note personnelle supprimée.');return;
 }
 if(verb==='lock-personal'){state.personalPass=null;state.personalEditId=null;render();return;}
 if(verb==='personal-date'){state.personalSelectedDate=parts[0];render();return;}
 if(verb==='personal-month-prev'||verb==='personal-month-next'){
  const d=new Date((state.personalCalendarMonth||month())+'-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth()+(verb==='personal-month-next'?1:-1));
  state.personalCalendarMonth=d.toISOString().slice(0,7);render();return;
 }
 if(verb==='show-auth'){
  if(pendingInviteReference(sessionStorage)&&!state.inviteAccepted)
   throw Error('Acceptez d’abord l’invitation.');
  // Both landing buttons must enter their actual requested authentication flow.
  state.authMode=parts[0]==='signin'?'signin':'signup';
  keepAuthModeInUrl(state.authMode);
  state.authNeedsEmailConfirmation=false;
  state.authNotice=null;state.passwordRecovery=false;
  state.showDiscover=false;state.showAuth=true;render();return;
 }
 if(verb==='show-landing'){keepAuthModeInUrl(null);state.showDiscover=false;state.showAuth=false;render();return;}
 if(verb==='google'&&window.LoveRollNativeAuth?.googleSignIn){
  try{
   state.authNotice='Connexion Google en cours… Sélectionnez votre compte dans la fenêtre Android.';
   const message=id('auth-form-feedback');
   if(message)message.textContent=state.authNotice;
   window.LoveRollNativeAuth.googleSignIn();
  }catch(error){
   state.authNotice='Connexion Google Android indisponible. Réessayez, ou utilisez le courriel et le mot de passe de votre compte existant.';
   const message=id('auth-form-feedback');
   if(message)message.textContent=state.authNotice;
  }
  return;
 }
 if(verb==='google'||verb==='apple'){
  sessionStorage.setItem('authStarted','1');
  const redirectUrl=new URL(CONFIG.siteUrl||location.origin+location.pathname);
  const pendingId=sessionStorage.getItem('pendingInviteId');
  if(pendingId){redirectUrl.searchParams.set('invite_id',pendingId);redirectUrl.searchParams.set('v',INVITATION_REVISION);}
  const redirectTo=redirectUrl.toString();
  // Google officially supports prompt=select_account; do not clear global
  // Google cookies or silently reuse a different partner's identity.
  const options=verb==='google'?{redirectTo,queryParams:{prompt:'select_account'}}:{redirectTo};
  const {error}=await client.auth.signInWithOAuth({provider:verb,options});
  if(error)throw error;return;
 }
 if(verb==='auth-mode'){
  state.authDraftEmail=id('signin-email')?.value.trim()||state.authDraftEmail;
  state.authMode=parts[0]==='signin'?'signin':'signup';
  keepAuthModeInUrl(state.authMode);
  state.authNeedsEmailConfirmation=false;
  state.authNotice=null;state.passwordRecovery=false;render();return;
 }
 if(verb==='auth-eye'){
  const field=id('signin-password');if(!field)return;
  field.type=field.type==='password'?'text':'password';
  element?.setAttribute('aria-pressed',String(field.type==='text'));
  element?.setAttribute('aria-label',field.type==='password'?'Afficher le mot de passe':'Masquer le mot de passe');
  return;
 }
 if(verb==='auth-signup-password'||verb==='auth-signin-password'){
  let email,password;
  try{email=loginEmail(id('signin-email')?.value);
    password=id('signin-password')?.value||'';
    if(verb==='auth-signup-password')requireLovePassword(password);
    else if(!password)throw Error('Entrez votre mot de passe.');
  }catch(error){authMessage(error.message);return;}
  const btn=element;if(btn?.disabled)return;if(btn)btn.disabled=true;
  try{
   if(verb==='auth-signup-password'){
    const {data,error}=await client.auth.signUp({email,password,
     options:{emailRedirectTo:pendingInviteUrl()}});
    if(error){authMessage(passwordAuthMessage(error));return;}
    state.authDraftEmail=email;
    if(data?.session?.user&&verifiedLoveEmail(data.session.user)){
     state.user=data.session.user;state.showAuth=false;await reload();return;
    }
    // No session: this may be a new signup awaiting verification OR an
    // existing Google identity. Never claim that a message was delivered.
    state.emailVerificationPending=true;
    state.authNotice=null;render();
   }else{
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){
     state.authDraftEmail=email;
     state.authNeedsEmailConfirmation=error.code==='email_not_confirmed'||
      /email not confirmed|courriel non confirm/i.test(error.message||'');
     if(state.authNeedsEmailConfirmation){
      state.authNotice='Votre adresse courriel doit être confirmée avant de vous connecter. Vous pouvez demander un nouveau courriel ci-dessous.';
      render();
     }else authMessage(passwordAuthMessage(error));
     return;
    }
    if(!data?.user)throw Error('Aucune session ouverte.');
    state.authNeedsEmailConfirmation=false;
    state.user=data.user;state.authNotice=null;state.showAuth=false;
    await reload();
   }
  }catch(error){authMessage(passwordAuthMessage(error));}
  finally{if(btn)btn.disabled=false;}
  return;
 }
 if(verb==='email-confirm-login'){
  if(state.user&&!verifiedLoveEmail(state.user)){
   const {error}=await client.auth.signOut();
   if(error)throw error;
   state.user=null;
  }
  state.emailVerificationPending=false;state.showDiscover=false;state.showAuth=true;
  state.authMode='signin';keepAuthModeInUrl('signin');
  state.authNotice='Si vous avez déjà créé un compte avec Google, utilisez « Continuer avec Google ».';
  render();return;
 }
 if(verb==='email-confirm-recheck'){
  if(!state.user){
   state.emailVerificationPending=false;state.showDiscover=false;state.showAuth=true;
   state.authMode='signin';keepAuthModeInUrl('signin');
   state.authNotice='Connectez-vous pour que LoveRoll vérifie votre compte confirmé auprès de Supabase.';
   render();return;
  }
  if(await refreshVerifiedIdentity()){
   state.emailVerificationPending=false;state.authNotice=null;
   await reload();return;
  }
  const status=id('email-confirm-status');if(status)status.textContent=
   'Votre adresse n’est pas encore confirmée dans Supabase. Ouvrez le lien reçu.';
  return;
 }
 if(verb==='email-confirm-resend'||verb==='auth-resend-confirmation'){
  const btn=element;if(btn?.disabled)return;
  let email;
  try{email=loginEmail(id('signin-email')?.value||state.authDraftEmail||state.user?.email);}
  catch(error){authMessage(error.message);return;}
  const until=Number(sessionStorage.getItem('loverollConfirmResendAfter')||0);
  if(Date.now()<until){authMessage('Veuillez patienter avant de demander un autre courriel.');return;}
  if(btn)btn.disabled=true;
  try{
   const {error}=await client.auth.resend({type:'signup',email,
    options:{emailRedirectTo:pendingInviteUrl()}});
   if(error){authMessage(passwordAuthMessage(error));return;}
   state.authDraftEmail=email;
   sessionStorage.setItem('loverollConfirmResendAfter',String(Date.now()+60000));
   const status=id('auth-resend-status')||id('email-confirm-status');
   const msg='Demande reçue par le serveur. Cela ne garantit pas la réception du courriel. Vérifiez votre boîte et les indésirables. Si ce compte est déjà confirmé avec Google, utilisez « Continuer avec Google ».';
   if(status)status.textContent=msg;else authMessage(msg);
  }catch(error){authMessage(passwordAuthMessage(error));}
  finally{if(btn)btn.disabled=false;}
  return;
 }
 if(verb==='email-confirm-edit'){
  if(state.user)await client.auth.signOut();
  state.user=null;state.emailVerificationPending=false;state.authDraftEmail='';
  state.authMode='signup';state.showAuth=true;render();return;
 }
 if(verb==='auth-reset-request'){
  state.authDraftEmail=id('signin-email')?.value.trim()||state.authDraftEmail;
  state.authMode='request-reset';keepAuthModeInUrl('request-reset');state.authNeedsEmailConfirmation=false;
  state.authNotice=null;state.showAuth=true;render();return;
 }
 if(verb==='auth-send-reset'){
  let email;
  try{email=loginEmail(id('signin-email')?.value);}catch(error){authMessage(error.message);return;}
  const until=Number(sessionStorage.getItem('loverollResetAfter')||0);
  if(Date.now()<until){authMessage('Veuillez patienter avant une nouvelle demande.');return;}
  const btn=element;if(btn?.disabled)return;if(btn)btn.disabled=true;
  try{
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:pendingInviteUrl(true)});
   if(error){authMessage(passwordAuthMessage(error));return;}
   state.authDraftEmail=email;
   sessionStorage.setItem('loverollResetAfter',String(Date.now()+60000));
   authMessage('Demande de récupération acceptée. Si ce compte existe, le fournisseur pourra envoyer un lien. Vérifiez vos courriels; sa réception n’est pas encore confirmée.');
  }catch(error){authMessage(passwordAuthMessage(error));}
  finally{if(btn)btn.disabled=false;}
  return;
 }
 if(verb==='auth-update-password'){
  if(!state.passwordRecovery||!state.user){authMessage('Ouvrez le lien sécurisé reçu par courriel.');return;}
  let password;
  try{password=requireLovePassword(id('signin-password')?.value);}
  catch(error){authMessage(error.message);return;}
  const btn=element;if(btn?.disabled)return;if(btn)btn.disabled=true;
  try{
   const {error}=await client.auth.updateUser({password});
   if(error){authMessage(passwordAuthMessage(error));return;}
   state.passwordRecovery=false;state.authMode='signin';state.authNotice=null;
   const url=new URL(location.href);url.searchParams.delete('auth');url.searchParams.delete('type');
   history.replaceState(null,'',url.pathname+url.search+url.hash);
   await reload();
  }catch(error){authMessage(passwordAuthMessage(error));}
  finally{if(btn)btn.disabled=false;}
  return;
 }
 if(verb==='signout'){
  if(state.user&&safeNativePushToken()){
   try{await disablePush(client,state.user.id);}catch(err){console.warn('Désinscription FCM',err.code||'');}
  }
  state.unlockKey=null;state.personalPass=null;state.personalJournal=[];
  if(state.channel){await client.removeChannel(state.channel);state.channel=null;}
  const {error}=await client.auth.signOut();if(error)throw error;
  state.user=null;state.profile=null;state.coupleId=null;state.showAuth=false;state.passwordRecovery=false;
  keepAuthModeInUrl(null);
  state.installAfterSignup=false;state.installModalOpen=false;state.showInstallSteps=false;state.forceInstallGuide=false;
  render();return;
 }
 if(verb==='complete-registration'){
  const name=id('profile-name')?.value.trim();
  if(!name||name.length>80)throw Error('Choisis ton nom à afficher.');
  const birthday=parseMonthDay('signup-birth');
  const gender=id('profile-gender')?.value;
  const playStyle=id('profile-play-style')?.value||'medium';
  if(!['him','her'].includes(gender))throw Error('Choisissez Homme ou Femme pour votre profil.');
  if(!['soft','medium','intense'].includes(playStyle))throw Error('Choisissez Soft, Medium ou Intense.');
  if(!id('age-confirm')?.checked)throw Error('LoveRoll est réservé aux personnes de 18 ans et plus.');
  await rpc('complete_love_registration',{p_name:name,p_birthday_md:birthday});
  await rpc('save_my_gender',{p_gender:gender});
  await rpc('save_my_play_style',{p_style:playStyle});
  // Invitation => accept existing duo. No invitation => own new admin duo.
  // Both decisions are authenticated and checked in one server transaction.
  // An account already linked to a duo is never duplicated.
  if(!pendingInviteReference(sessionStorage))
   await resolveVerifiedSignup(true);
  state.installAfterSignup=true;
  await reload();return;
 }
 if(verb==='profile'){
  const name=id('profile-name')?.value.trim();
  if(!name||name.length>80)throw Error('Choisis ton nom à afficher.');
  const birthday=parseMonthDay('settings-birthday');
  const gender=id('profile-gender')?.value;
  const playStyle=id('profile-play-style')?.value||'medium';
  if(!['him','her'].includes(gender))throw Error('Choisissez Homme ou Femme pour votre profil.');
  if(!['soft','medium','intense'].includes(playStyle))throw Error('Choisissez Soft, Medium ou Intense.');
  await rpc('complete_love_registration',{p_name:name,p_birthday_md:birthday});
  await rpc('save_my_gender',{p_gender:gender});
  await rpc('save_my_play_style',{p_style:playStyle});
  await reload();notify('Votre profil, votre style et votre date sont enregistrés.');return;
 }
 if(verb==='prepare-cards'){
  if(pendingInviteReference(sessionStorage))throw Error('Une invitation est en attente.');
  if(!state.coupleId){
   const decision=await resolveVerifiedSignup(false);
   if(decision?.status==='invitation'||decision?.status==='linked'){
    await reload();return;
   }
   await rpc('create_love_match',{p_anniversary_md:null});
  }
  state.tab='library';
  await reload();
  notify('Votre bibliothèque privée est prête. Invitez votre conjointe plus tard.');
  return;
 }
 if(verb==='create-couple'){
  if(pendingInviteReference(sessionStorage))throw Error('Une invitation est en attente.');
  const decision=await resolveVerifiedSignup(false);
  if(decision?.status==='invitation'||decision?.status==='linked'){
   await reload();return;
  }
  const date=parseMonthDay('signup-couple',false);
  await rpc('create_love_match',{p_anniversary_md:date});
  await reload();return;
 }
 if(verb==='invite'){
  if(state.invitations?.some(x=>!x.cancelled_at&&!x.accepted_at&&new Date(x.expires_at)>new Date())&&
     !(await premiumConfirm('L’ancien lien d’invitation cessera de fonctionner. Votre partenaire devra utiliser le nouveau lien.',{kind:'library',title:'Remplacer le lien sécurisé ?'})))return;
  await ensureInviteDraft(true);state.inviteCopyFallback=false;render();
  notify('Nouveau lien prêt. L’ancien lien a été remplacé.');return;
 }
 if(verb==='send-sms'||verb==='send-email'||verb==='send-messenger'||verb==='copy-invite'){
  // Reuse the unexpired invitation ID after reload. The server verifies email at acceptance.
  const d=await ensureInviteDraft(false);
  if(verb==='copy-invite'){
   try{
    if(!navigator.clipboard?.writeText)throw Error('Presse-papiers indisponible');
    await navigator.clipboard.writeText(d.link);
    state.inviteCopyFallback=false;notify('Lien copié, sans modifier votre invitation.');
   }catch(error){
    state.inviteCopyFallback=true;render();
    const field=id('invite-manual-link');
    field?.focus();field?.select();
    notify('Copie automatique indisponible : sélectionnez le lien affiché pour le copier.');
   }
   return;
  }
  const text=verb==='send-messenger'?invitationMessengerText(d.link):invitationEmailText(d.link);
  state.lastShareMethod=verb==='send-sms'?'sms':verb==='send-email'?'courriel':'messenger';
  if(verb==='send-messenger'){
   if(window.LoveRollNativeAuth?.openShare)window.LoveRollNativeAuth.openShare(text);
   else if(navigator.share){
    try{await navigator.share({url:d.link});}
    catch(error){if(error.name!=='AbortError')throw error;}
   }else{
    try{await navigator.clipboard.writeText(d.link);
     notify('Lien copié : collez-le dans une conversation Messenger.');}
    catch{state.inviteCopyFallback=true;render();id('invite-manual-link')?.select();
     notify('Sélectionnez le lien affiché pour le partager sur Messenger.');}
    return;
   }
  }else if(verb==='send-sms'){
   if(window.LoveRollNativeAuth?.openSms)window.LoveRollNativeAuth.openSms(text);
   else{
    const isApple=/iPhone|iPad|iPod/i.test(navigator.userAgent);
    window.location.href='sms:'+(isApple?'&':'?')+'body='+encodeURIComponent(text);
   }
  }else{
   const subject='LoveRoll ❤️ Une invitation juste pour nous deux';
   if(window.LoveRollNativeAuth?.openEmail)window.LoveRollNativeAuth.openEmail(d.email,subject,text);
   else window.location.href=composeInviteEmail(d.email,subject,text);
  }
  notify('Choisissez le destinataire et confirmez vous-même le partage.');
  return;
 }
 if(verb==='confirm-invite-sent'){
  const invitation=await ensureInviteDraft(false);
  await rpc('mark_pair_invite_sent',{p_invitation:invitation.id,p_method:state.lastShareMethod||'partage'});
  state.invitations=await query('couple_invitations',{eq:{couple_id:state.coupleId},order:'created_at'});
  render();notify('Envoi confirmé manuellement.');return;
 }
 if(verb==='cancel-invite'){
  await rpc('cancel_pair_invite',{p_invitation:parts[0]});
  state.inviteDraft=null;
  state.invitations=await query('couple_invitations',{eq:{couple_id:state.coupleId},order:'created_at'});
  render();notify('Invitation annulée.');return;
 }
 if(verb==='save-couple-date'){
  const value=id('couple-started-on')?.value||null;
  await rpc('set_love_relationship_date',{p_couple:state.coupleId,p_date:value});
  await refreshShared();render();notify('Date du couple enregistrée.');return;
 }
 if(verb==='accept-invite'||verb==='retry-invite'){
  state.inviteAttemptKey=null;state.inviteError=null;
  await reload();return;
 }
 if(verb==='settings-page'){
  if(hasUnsavedForm()&&!(await premiumConfirm('Vos modifications non enregistrées seront perdues. Voulez-vous quitter cette page ?',{
   kind:'library',title:'Quitter sans enregistrer ?',accept:'Quitter',cancel:'Rester'})))return;
  openSettingsPage(parts[0]||'');return;
 }
 if(verb==='tab'){
  if(state.diceStatus)return;
  const ready=isSharedCoupleReady(state.coupleId,state.members);
  const allowed=ready?
   ['home','session','special','occasions','advent','settings','library',
    'personal-journal','journal','ideas','monthly-library','advent-editor','special-editor']:
   ['home','settings','invitation','library','personal-journal','monthly-library','advent-editor','special-editor'];
  if(!allowed.includes(parts[0]))throw Error('Les jeux exigent deux comptes associés.');
  if(['library','monthly-library','advent-editor','special-editor'].includes(parts[0])&&!isLoveAdmin())
   throw Error('Modification réservée à l’administrateur du couple.');
  if(parts[0]==='library'&&state.couple?.sexual_card_mode==='automatic'){
   state.libraryImportKind=null;state.tab='settings';settingsOpenSection='admin';render();return;
  }
  if(parts[0]!==state.tab&&hasUnsavedForm()&&
    !(await premiumConfirm('Vos modifications non enregistrées seront perdues. Voulez-vous quitter cette page ?',{
      kind:'library',title:'Quitter sans enregistrer ?',accept:'Quitter',cancel:'Rester'
    })))return;
  if(parts[0]==='settings'&&state.tab==='occasions'){
   settingsOpenSection='couple';
   try{sessionStorage.setItem('loveroll-settings-section','couple');}catch{}
  }
  if(parts[0]==='settings'&&state.tab!=='occasions')settingsOpenSection='';
  if(state.tab!==parts[0]){state.libraryImportKind=null;state.libraryScreen='list';state.specialEditorKey=null;state.jsonPending=null;lastFormTab=null;}
  allowBackExit=false;state.tab=parts[0];state.confirmCancel=false;
  if(state.tab!=='occasions')state.specialFocus=null;
  if(state.tab!=='session'){state.showEveningChallenge=false;state.showEveningChallenges=false;state.selectedEveningChallengeId=null;state.eveningMore=false;}
  if(state.tab!=='special'){state.showSurpriseActivity=false;state.surpriseEditSlot=null;}
  if(state.tab!=='advent'){state.adventSelected=null;state.adventHistory=false;}
  render();
  if(isSharedCoupleReady(state.coupleId,state.members))
   liveSync.probe(true).catch(console.warn);
  return;
 }
 if(['review-save','evening-close-confirm','save-occasion-date','occasion-roll','roll','new-session','my-d6',
    'new-challenge','answer','finish-session','cancel-session','confirm-cancel',
    'save-event','delete-event'].includes(verb)&&
    !isSharedCoupleReady(state.coupleId,state.members))
   throw Error('Cette action nécessite deux comptes associés.');
 if(verb==='save-occasion-date'){
  const k=parts[0],d=id(k==='anniversary'?'loveroll-anniversary':'loveroll-birthday')?.value.trim();
  if(d&&!/^\\d{2}-\\d{2}$/.test(d))throw Error('Saisissez MM-JJ, par exemple 02-14.');
  await rpc('set_love_occasion_date',{p_couple:state.coupleId,p_kind:k,p_month_day:d||null});
  await refreshAndShow();notify('Date enregistrée.');return;
 }
 if(verb==='occasion-roll'){
  const [kind,owner,rollType]=parts;
  const x=await animateRoll(()=>rpc('roll_love_occasion_once',{p_couple:state.coupleId,
   p_kind:kind,p_owner:owner==='-'?null:owner,p_roll:rollType}),'occasion');
  notify('♡ Tirage enregistré pour le couple.');return;
 }
 if(verb==='roll'){
  const kind=parts[0];
  if(kind==='weekly'){
   if(!isSharedCoupleReady(state.coupleId,state.members))
    throw Error('Associez deux comptes pour le dé hebdomadaire.');
   if(state.weekly)throw Error('Le dé a déjà été brassé cette semaine.');
   if(state.diceStatus)return;
   state.diceStatus='pending';render();
   try{
    // Supabase selects and persists the one true face under a couple row lock;
    // only after the response do we animate the ACTUAL server result.
    const result=await rpc('roll_couple_once',{p_couple:state.coupleId,p_kind:'weekly'});
    state.rollAnimationFace=result.face;
    state.diceStatus='rolling';render();
    await new Promise(resolve=>setTimeout(resolve,window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?180:ROLL_TOTAL_MS+140));
    state.diceStatus=null;state.rollAnimationFace=null;
    state.weekly=result;
    await refreshAndShow();
    notify('♡ Le dé s’est arrêté sur le résultat officiel.');
    }catch(error){state.diceStatus=null;state.rollAnimationFace=null;await refreshAndShow();throw error;}
   return;
  }
  const result=await animateRoll(()=>rpc('roll_couple_once',{p_couple:state.coupleId,p_kind:kind}),kind);
  if(kind==='monthly_activity'){
   // Only after Supabase confirms the official D100 and its 3D animation ends.
   state.showSurpriseActivity=!!state.monthly?.monthly_activity;
   render();
   return;
  }
  // Host and restaurant result labels already update in place.
  if(kind!=='monthly_host'&&kind!=='monthly_restaurant')
   notify('♡ Tirage enregistré.');
  return;
 }
 if(verb==='new-session'){
  if(!state.weekly)throw Error('Brassez d’abord le dé de la semaine.');
  const daily=eveningDailyAccess({sessions:state.sessions,weekly:state.weekly});
  if(!daily.canStart)throw Error(daily.dailyLocked?
   'Une seule soirée par jour. Revenez demain (heure du Québec).':
   'Le quota hebdomadaire est atteint.');
  await rpc('ensure_couple_session',{p_couple:state.coupleId});
  state.tab='session';await refreshAndShow();return;
 }
 if(verb==='my-d6'){
  if(!state.session)throw Error('Aucune soirée active.');
  await animateRoll(()=>rpc('roll_my_evening_d6',{p_session:state.session.id}),'my-d6');
  // La carte de l'étape 1 affiche l'état du lancer; aucun toast supplémentaire.
  return;
 }
 if(verb==='category'){
  if(!EVENING_CATEGORIES.includes(parts[0])&&parts[0]!=='HASARD')
   throw Error('Catégorie interdite');
  state.category=parts[0];state.randomMode=parts[0]==='HASARD';
  if(state.session)try{sessionStorage.setItem('loveroll-category-'+state.session.id,parts[0]);}catch{}
  // Never tear down all WebGL renderers for a category-only UI change.
  if(!updateEveningCategoryUi(root,parts[0],
   state.couple?.category_weights_enabled===false?50:
   state.couple?.category_preference_percent??88))render();
  return;
 }
  if(verb==='timer-mode'){
   if(parts[0]!=='vibrate'&&parts[0]!=='sound')throw Error('Signal inconnu');
   challengeTimer.mode=parts[0];localStorage.setItem('loveroll-timer-mode',parts[0]);
   if(parts[0]==='vibrate'&&typeof navigator.vibrate!=='function')
     notify('La vibration n’est pas disponible ici. Choisis Son doux pour une alerte audible.');
   render();return;
 }
 if(verb==='timer-reset'){
   challengeTimer.running=false;
   challengeTimer.deadline=0;
   challengeTimer.remainingMs=challengeTimer.durationMs;
   challengeTimer.notified=false;saveChallengeTimer();updateChallengeClock();return;
 }
 if(verb==='timer-toggle'){
   if(!challengeTimer.id)throw Error('Aucun défi avec minuteur');
   if(challengeTimer.running){
    challengeTimer.remainingMs=Math.max(0,challengeTimer.deadline-Date.now());
    challengeTimer.running=false;
   }else if(challengeTimer.remainingMs>0){
    if(challengeTimer.mode==='sound'){
      try{
       timerCtx=timerCtx||new (window.AudioContext||window.webkitAudioContext)();
       await timerCtx.resume();
      }catch(e){notify('Le navigateur ne permet pas encore la sonnerie.');}
    }
    challengeTimer.deadline=Date.now()+challengeTimer.remainingMs;
    challengeTimer.running=true;
    challengeTimer.notified=false;
   }
   saveChallengeTimer();updateChallengeClock();return;
 }
 if(verb==='give-challenge'){
  if(!state.session?.paired_turns||!state.session?.self_draws||!state.rollStatus?.both_ready)
   throw Error('Attendez vos deux tirages personnels pour donner un défi.');
  const me=state.user.id,otherPerson=other();
  const turn=state.eveningBoard||sharedEveningTurns(state.session,state.members,state.personal,state.challenges,state.gifts);
  if(!turn.ready||turn.remaining[me]<=0)
   throw Error('Aucun défi non commencé à donner.');
  const monthCount=state.gifts.filter(g=>g.donor_user_id===me&&g.month_key?.slice(0,7)===month()).length;
  if(monthCount>=3)throw Error('Vos 3 dons du mois sont utilisés.');
  if(!(await premiumConfirm('Offrir un de tes défis restants à '+otherPerson.name+
   ' ? Son nombre de défis à recevoir augmentera de 1 et le tien diminuera de 1.',
   {kind:'gift'})))return;
  await rpc('give_love_challenge',{p_session:state.session.id});
  await refreshAndShow();
  notify('♥ Défi transféré ! '+otherPerson.name+' choisira la catégorie de son prochain défi.');
  return;
 }
 if(verb==='new-challenge'){
  if(!state.session)throw Error('Aucune soirée active.');
  if(!EVENING_CATEGORIES.includes(state.category)&&state.category!=='HASARD')
   throw Error('Choisissez Sensuel, Au hasard ou Sexuel avant chaque nouveau défi.');
  // A 50/50 draw is decided on Supabase before the official D100 result is saved.
  // Never fabricate a provisional category or bypass the existing turn/anti-repeat rules.
  const selectedCategory=state.category;
  const sessionId=state.session.id;
  const drawn=await animateRoll(()=>
   selectedCategory==='HASARD'?
    rpc('draw_for_partner_random',{p_session:sessionId}):
    rpc('draw_for_partner',{p_session:sessionId,
      p_preference:selectedCategory,p_random:false}),
   'new-challenge');
  // The official result is now stored; open only the receiving player's
  // private card, with the saved timer ready to start later.
  if(drawn?.id&&drawn.recipient===state.user.id&&
       state.tab==='session'&&state.session?.id===sessionId){
   state.selectedEveningChallengeId=drawn.id;
   state.showEveningChallenges=true;
  }
  try{sessionStorage.removeItem('loveroll-category-'+state.session.id);}catch{}
  state.category=null; // Choix renouvelé à chaque défi.
  render();
  return;
 }
 if(verb==='answer'){
  const item=ownEveningChallenges(state.challenges,state.user.id,state.session?.id).find(c=>c.id===parts[0]);
  if(!item)throw Error('Ce défi n’est pas dans ta liste personnelle.');
  const eveningId=state.session.id;
  await rpc('answer_challenge',{p_id:parts[0],p_status:parts[1]});
  if(parts[1]==='completed'){
   // Last completed challenge closes the shared night automatically.
   // The official server function checks BOTH adjusted D6 quotas atomically.
   const board=await rpc('my_love_evening_board',{p_session:eveningId});
   if(board?.finished){
    try{await rpc('finish_couple_session',{p_session:eveningId,p_count:true});}
    catch(error){
     // Partner may have closed the same session milliseconds earlier.
     const alreadyClosed=(await query('couple_sessions',{eq:{id:eveningId}}))[0]?.finished_at;
     if(!alreadyClosed)throw error;
    }
    state.showEveningChallenges=false;state.selectedEveningChallengeId=null;
   }else{
    state.showEveningChallenges=true;state.selectedEveningChallengeId=item.id;
   }
  }else{state.showEveningChallenges=true;state.selectedEveningChallengeId=item.id;}
  await refreshAndShow();return;
 }
 if(verb==='finish-session'){
  if(!state.session)return;
  const finishedId=state.session.id;
  await rpc('finish_couple_session',{p_session:finishedId,p_count:true});
  state.chosenSession=finishedId;state.tab='session';await refreshAndShow();return;
 }
 if(verb==='cancel-session'){state.confirmCancel=true;render();return;}
 if(verb==='dismiss-cancel'){state.confirmCancel=false;render();return;}
 if(verb==='confirm-cancel'){
  if(!state.session)return;
  await rpc('finish_couple_session',{p_session:state.session.id,p_count:false});
  state.confirmCancel=false;state.tab='home';await refreshAndShow();return;
 }
 if(verb==='advent-open'){
  if(!isSharedCoupleReady(state.coupleId,state.members))
   throw Error('Le calendrier appartient à votre couple associé.');
  if(state.adventOpening!==null)return;
  if(!state.adventServerDate)throw Error('La date officielle du calendrier est indisponible. Réessayez.');
  const day=Number(parts[0]),date=state.adventServerDate;
  const cal=sharedAdventState(state.advent,new Date(date+'T16:00:00Z'),state.adventYear);
  if(!cal.days[day-1]?.canOpen)throw Error('Cette lettre n’est pas encore disponible.');
  const year=cal.year,couple=state.coupleId;
  state.adventOpening=day;state.adventRevealing=false;render();
  try{
   const opened=await rpc('open_advent_day',{p_couple:couple,p_day:day,p_year:year});
   if(!opened||opened.couple_id!==couple||opened.year!==year||opened.day!==day)
    throw Error('Ouverture non confirmée.');
   if(state.coupleId!==couple)return;
   // Only animate the letter AFTER the server confirms its immutable snapshot.
   state.advent=state.advent.filter(r=>r.year!==year||r.day!==day).concat(opened);
   state.adventRevealing=true;render();
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
   const animation=root.querySelector('.advent-box.opening .advent-letter-paper')?.getAnimations?.()
    .find(a=>a.animationName==='advent-letter-rise');
   if(reduced)await new Promise(resolve=>setTimeout(resolve,100));
   else if(animation)await new Promise(resolve=>{
    const timeout=setTimeout(resolve,2000);
    animation.finished.catch(()=>{}).then(()=>{clearTimeout(timeout);resolve();});
   });
   else await new Promise(resolve=>setTimeout(resolve,1000));
   state.adventRevealing=false;state.adventOpening=null;
   if(state.tab==='advent'){
    state.adventYear=year;state.adventSelected=day;state.adventHistory=false;
   }
   render();liveSync.request(0);
  }catch(error){
   state.adventOpening=null;state.adventRevealing=false;
   await refreshShared();render();throw error;
  }finally{
   state.adventOpening=null;state.adventRevealing=false;
  }
  return;
 }
 if(verb==='advent-view'){
  if(state.adventOpening!==null)return;
  const date=state.adventServerDate||today();
  const year=sharedAdventState(state.advent,new Date(date+'T16:00:00Z'),state.adventYear).year;
  const day=Number(parts[0]);
  if(!state.advent.some(row=>row.year===year&&row.day===day))
   throw Error('Cette surprise n’a pas encore été ouverte.');
  state.adventSelected=day;render();return;
 }
 if(verb==='advent-close'){state.adventSelected=null;render();return;}
 if(verb==='advent-history'){
  if(state.adventOpening!==null)return;
  state.adventHistory=!state.adventHistory;render();return;
 }
 if(verb==='advent-year'){
  if(state.adventOpening!==null)return;
  const year=Number(parts[0]),current=Number((state.adventServerDate||today()).slice(0,4));
  const defaultYear=sharedAdventState(state.advent,new Date((state.adventServerDate||today())+'T16:00:00Z')).year;
  const known=[2026,current,defaultYear,...state.advent.map(row=>row.year)];
  if(!Number.isInteger(year)||!known.includes(year))throw Error('Aucun calendrier enregistré pour cette année.');
  state.adventYear=year;state.adventHistory=false;state.adventSelected=null;render();return;
 }
 if(verb==='unlock'){
  const pass=id('journal-pass')?.value||'';
  const savedProbe=state.couple?.journal_verifier||null;
  const hasLegacy=state.journal.length>0;
  const creating=!savedProbe&&!hasLegacy;
  if(creating&&pass!==id('journal-pass-confirm')?.value)
   throw Error('Les deux phrases secrètes doivent être identiques.');
  const key=await createCipherKey(pass);
  if(creating){
   // Only a ciphertext proving the key can be opened is stored remotely.
   const envelope=await encryptJson({purpose:'loveroll-journal-check',version:1},key);
   await rpc('initialize_love_journal',{p_couple:state.coupleId,p_verifier:envelope});
   state.couple.journal_verifier=envelope;
  }else{
   try{
    const probe=savedProbe||state.journal[0]?.ciphertext;
    if(!probe)throw Error('Aucune preuve de clé disponible.');
    const clear=await decryptJson(probe,key);
    if(savedProbe&&clear?.purpose!=='loveroll-journal-check')
     throw Error('Vérification du journal invalide.');
   }catch{state.unlockKey=null;throw Error('Phrase secrète incorrecte pour les données existantes.');}
  }
  state.unlockKey=key;
  notify(creating?'Phrase secrète du journal créée. Partagez-la en personne avec votre partenaire.':
   'Journal déverrouillé sur cet appareil.');render();return;
 }
 if(verb==='lock'){state.unlockKey=null;render();return;}
 if(verb==='date'){state.selectedDate=parts[0];render();return;}
 if(verb==='month-prev'||verb==='month-next'){
  const offset=verb==='month-next'?1:-1;
  const d=new Date((state.calendarMonth||month())+'-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth()+offset);
  state.calendarMonth=d.toISOString().slice(0,7);render();return;
 }
 if(verb==='edit-event'){
  const entry=state.journal.find(x=>x.id===parts[0]&&x.author_id===state.user.id);
  if(!entry||!state.unlockKey)throw Error('Vous ne pouvez modifier que votre entrée déverrouillée.');
  state.editEventId=entry.id;state.selectedDate=entry.happened_on;render();return;
 }
 if(verb==='cancel-edit-event'){state.editEventId=null;render();return;}
 if(verb==='save-event'){
  if(!state.unlockKey)throw Error('Journal verrouillé');
  const date=id('event-date')?.value||today();
  if(date>today())throw Error('La date ne peut pas être dans le futur.');
  const payload={orgasm:id('event-orgasm').value,good:id('event-good').value,
    weak:id('event-weak').value,note:id('event-note').value.slice(0,1200)};
  const ciphertext=await encryptJson(payload);
  const wasEdit=!!state.editEventId;
  if(wasEdit)await rpc('update_my_love_event',{p_event:state.editEventId,p_happened_on:date,p_ciphertext:ciphertext});
  else await rpc('add_my_love_event',{p_couple:state.coupleId,p_happened_on:date,p_ciphertext:ciphertext});
  state.editEventId=null;state.selectedDate=date;
  await reload();notify(wasEdit?'Entrée partagée modifiée.':'Moment ajouté au calendrier partagé et à votre calendrier privé');return;
 }
 if(verb==='delete-event'){
  if(!(await premiumConfirm('Cette entrée sera supprimée du journal partagé. Une copie personnelle peut demeurer dans votre calendrier privé.',{kind:'delete',title:'Supprimer du journal partagé ?'})))return;
  const {error}=await client.from('couple_intimacy').delete().eq('id',parts[0]).eq('author_id',state.user.id);
  if(error)throw error;await refreshAndShow();return;
 }

}
async function start(){
 const currentUrl=new URL(location.href);
 const frag=new URLSearchParams(currentUrl.hash.replace(/^#/,''));
 const errorCode=currentUrl.searchParams.get('error_code')||frag.get('error_code');
 const authError=currentUrl.searchParams.get('error')||frag.get('error');
 if(errorCode||authError){
  // An expired/used recovery link MUST return to sign-in, not a password form
  // that cannot submit without a valid Supabase recovery session.
  if(state.passwordRecovery){
   state.passwordRecovery=false;state.authMode='signin';
   currentUrl.searchParams.set('auth','signin');
  }
  state.authNotice=/expired|invalid|not_found/i.test(String(errorCode||''))?
   'Le lien est expiré ou a déjà été utilisé. Si ton courriel est confirmé, tu peux te connecter avec Google ou demander un nouveau lien lorsque la limite d’envoi sera levée.':
   'La confirmation n’a pas ouvert de session. Tu peux te connecter avec Google ou utiliser un nouveau lien de connexion plus tard.';
  state.showAuth=true;
  for(const key of ['error','error_code','error_description']){
   currentUrl.searchParams.delete(key);
   frag.delete(key);
  }
  currentUrl.hash=frag.toString();
  history.replaceState(null,'',currentUrl.pathname+currentUrl.search+currentUrl.hash);
 }
 let incoming=parseInvitationFromUrl(currentUrl.toString());
 // Backward compatibility: replace legacy secret fragments with a new URL
 // reference. Chrome can then open the SAME invitation from Messenger.
 if(incoming.token&&client){
  try{
   const {data,error}=await client.rpc('resolve_love_invite_reference',
    {p_token_hash:await hashToken(incoming.token)});
   if(!error&&data){
    const migrated=inviteLinkForId(CONFIG.siteUrl,data);
    const oldRef=pendingInviteReference(sessionStorage);
    const oldKey=oldRef?oldRef.kind+':'+oldRef.value:null;
    if(oldKey==='token:'+incoming.token&&
       sessionStorage.getItem('loverollInviteAccepted')===oldKey)
     sessionStorage.setItem('loverollInviteAccepted','id:'+data);
    const rewritten=new URL(migrated);
    currentUrl.search=rewritten.search;currentUrl.hash='';
    history.replaceState(null,'',currentUrl.pathname+currentUrl.search);
    incoming={id:data,token:null};
   }
  }catch(error){console.warn('Lien ancien conservé',error);}
 }
 if(incoming.id||incoming.token){
  const old=pendingInviteReference(sessionStorage);
  const kind=incoming.id?'id':'token',value=incoming.id||incoming.token;
  const key=kind+':'+value;
  if(!old||old.kind!==kind||old.value!==value)
   sessionStorage.removeItem('loverollInviteAccepted');
  if(kind==='id'){
   sessionStorage.setItem('pendingInviteId',value);
   sessionStorage.removeItem('pendingInvite');
   // Keep the non-secret reference in the URL for Messenger and OAuth handoffs.
  }else{
   sessionStorage.setItem('pendingInvite',value);
   sessionStorage.removeItem('pendingInviteId');
   const frag=new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
   frag.delete('invite');currentUrl.searchParams.delete('invite');
   currentUrl.hash=frag.toString();
   history.replaceState(null,'',currentUrl.pathname+currentUrl.search+currentUrl.hash);
  }
  let rememberedConsent=null;
  try{rememberedConsent=localStorage.getItem('loverollInviteAccepted');}catch(error){}
  state.inviteAccepted=sessionStorage.getItem('loverollInviteAccepted')===key||
   (kind==='id'&&rememberedConsent===key);
  if(state.inviteAccepted)sessionStorage.setItem('loverollInviteAccepted',key);
  state.showAuth=state.inviteAccepted;
 }else{
  const existing=pendingInviteReference(sessionStorage);
  let consent=sessionStorage.getItem('loverollInviteAccepted');
  if(existing?.kind==='id'&&!consent)try{
   consent=localStorage.getItem('loverollInviteAccepted');
  }catch(error){}
  state.inviteAccepted=!!existing&&consent===existing.kind+':'+existing.value;
  if(state.inviteAccepted)state.showAuth=true;
 }
 if(!client){render();return;}
 const {data,error}=await client.auth.getUser();
 if(error)console.warn(error.message);
 state.user=data?.user||null;
 if(state.user)try{await reload();}catch(e){fail(e);render();}
 else render();
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_IN'&&session?.user&&!state.user){
   state.user=session.user;
   setTimeout(()=>reload().catch(fail),0);
  }
  if(event==='PASSWORD_RECOVERY'){
    state.passwordRecovery=true;state.showAuth=true;
    state.user=session?.user||state.user;render();
   }
   if(event==='SIGNED_OUT'){state.user=null;state.profile=null;state.coupleId=null;state.wellbeing=null;state.personalPass=null;state.personalJournal=[];state.emailVerificationPending=false;render();}
 });
}
// Version probe bypasses WebView/Chrome and service worker HTTP cache.
// Keep account/session data intact; update the HTML URL, never storage or Supabase.
let versionProbeRunning=false;
async function reloadWebAssets(force=false){
 if(versionProbeRunning||(!force&&document.hidden))return;
 if(!force&&state.diceStatus)return;
 versionProbeRunning=true;
 try{
  const response=await fetch('./web-version.json?fresh='+Date.now(),{
   cache:'no-store',headers:{'Cache-Control':'no-cache'}
  });
  if(!response.ok){if(force)notify('Impossible de vérifier la version : réessaie avec Internet.');return;}
  const data=await response.json();
  const newest=String(data?.build||'');
  if(!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(newest))return;
  if(!force&&newest===WEB_RELEASE)return;
  if(!force&&sessionStorage.getItem('loveroll-auto-loaded-'+newest))return;
  // An open or orphaned evening is server-stored and is NOT a reason to
  // remain forever on a broken older app version. Only protect an actual
  // spinning die, a running challenge timer and a dirty form/modal.
  if(!force&&(challengeTimer.running||
      hasUnsavedForm()||
      document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))){
   notify('Une mise à jour LoveRoll est disponible dans Réglages → Application.');
   return;
  }
  sessionStorage.setItem('loveroll-auto-loaded-'+newest,'1');
  const latest=new URL(location.href);
  latest.searchParams.set('web_build',newest);
  if(force)latest.searchParams.set('reload',String(Date.now()));
  location.replace(latest.toString());
 }catch(error){
  console.warn('Vérification des mises à jour LoveRoll impossible',error);
  if(force)notify('Vérification impossible. Réessaie lorsque la connexion est disponible.');
 }finally{versionProbeRunning=false;}
}
window.addEventListener('load',()=>{reloadWebAssets().catch(console.warn);});
// Catch a deployment even on a tablet/PC/phone that stays foregrounded;
// every minute, without interrupting throws, timers or form editing.
setInterval(()=>{if(state.user&&!document.hidden)
 reloadWebAssets().catch(console.warn);},60_000);
// Rerender when Québec's calendar day changes with the tab left open.
let eveningLastDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',
 year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
setInterval(()=>{
 if(!state.user||document.hidden||state.tab!=='session')return;
 const current=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(current===eveningLastDay)return;
 eveningLastDay=current;
 refreshShared().then(render).catch(console.warn);
},60_000);
window.addEventListener('appinstalled',()=>{
 dismissInstall(state.user?.id);
 state.installModalOpen=false;state.showInstallSteps=false;state.forceInstallGuide=false;
 if(state.user)render();
});
// When left open across midnight, server time (not phone time) changes the
// current Advent door without requiring a restart or manual refresh.
setInterval(async()=>{
 if(!state.user||state.tab!=='advent'||document.hidden||state.adventOpening!==null)return;
 try{
  const todayOnServer=await rpc('love_advent_server_date');
  if(todayOnServer&&todayOnServer!==state.adventServerDate){
   state.adventServerDate=todayOnServer;
   state.adventYear=null;
   await refreshShared();
   render();
  }
 }catch(error){console.warn('Horloge Avent indisponible',error);}
},60_000);
// Fallback when Realtime WebSocket events are missed in Chrome, Safari,
 // Messenger, iPadOS, or after background suspension. No manual refresh.
setInterval(()=>{liveSync.probe().catch(console.warn);},1500);
window.addEventListener('online',()=>{
 liveSync.probe(true).catch(console.warn);
 liveSync.request(350);
});
window.addEventListener('focus',()=>{
 refreshNativeNotificationSettings();
 if(state.user)liveSync.probe(true).catch(console.warn);
});
window.addEventListener('loveroll-native-notification-state',event=>{
 if(!isNotificationPage())return;
 render();
 setNotificationFeedback(event.detail?.message||(event.detail?.weeklyEnabled?'Rappel hebdomadaire activé.':'Rappel hebdomadaire désactivé.'));
});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&state.user){
  reload().then(()=>liveSync.probe(true)).catch(fail);
  reloadWebAssets().catch(console.warn);
 }
});
// Android native Google chooser passes the selected ID token to Supabase.
window.addEventListener('loveroll-native-google-result',async event=>{
 const {token,nonce,error}=event.detail||{};
 if(error){
  state.authNotice=error;
  authMessage(error);return;
 }
 if(!token){authMessage('Aucun identifiant Google reçu. Réessayez ou connectez-vous avec votre mot de passe.');return;}
 try{
  const result=await client.auth.signInWithIdToken({provider:'google',token,nonce});
  if(result.error)throw result.error;
  if(result.data?.user){
   state.user=result.data.user;state.showAuth=false;
   await reload();
  }
  }catch(err){
  authMessage('Google n’a pas pu ouvrir la session LoveRoll. Vérifiez le compte choisi et réessayez, ou utilisez votre mot de passe.');
  console.warn('Google Supabase auth failed',err?.code||'unknown');
 }
});
start().catch(fail);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./service-worker.js?v=20261018-safari150',
     {scope:'./',updateViaCache:'none'}).then(reg=>reg.update()).catch(console.warn));
}
