// Safari iPhone: optional, accessible instructions; no Apple Developer account needed.
export const IOS_TOUR_KEY='loveroll-ios-safari-guide-v229';
export function isIosSafari(nav=globalThis.navigator,win=globalThis.window){
 if(!nav||!win||win.LoveRollNativeAuth)return false;
 const ua=String(nav.userAgent||'');
 const ios=/iPhone|iPad|iPod/i.test(ua)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
 const other=/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|FBAN|FBAV|Messenger|Instagram/i.test(ua);
 return ios&&!other&&!win.matchMedia?.('(display-mode: standalone)')?.matches&&!nav.standalone;
}
export function shouldShowIosTour(store=globalThis.localStorage,now=Date.now()){
 try{
  const saved=JSON.parse(store?.getItem(IOS_TOUR_KEY)||'null');
  return !saved||saved.choice==='later'&&now-saved.at>7*86400000;
 }catch{return true;}
}
const steps=[
 {title:'LoveRoll sur ton iPhone',subtitle:'Retrouve vos défis depuis ton écran d’accueil, sans App Store ni compte Apple.',symbol:'♡',action:'Me montrer comment'},
 {title:'Ouvre le menu Partager',subtitle:'Dans Safari, touche le carré avec une flèche vers le haut. Selon ta version, commence par le menu de la page puis Partager.',symbol:'↥',action:'Suivant'},
 {title:'Sur l’écran d’accueil',subtitle:'Dans la feuille de partage, choisis « Sur l’écran d’accueil ». Si nécessaire, fais défiler les actions du menu Safari.',symbol:'▣',action:'Suivant'},
 {title:'Confirme l’ajout',subtitle:'Si Safari propose « Ouvrir comme app web », active cette option. Puis touche « Ajouter ».',symbol:'＋',action:'Suivant'},
 {title:'Ouvre LoveRoll ♡',subtitle:'Touche l’icône LoveRoll sur ton écran d’accueil. Tu pourras ensuite autoriser les notifications compatibles.',symbol:'♥',action:'J’ai compris ❤️'}
];
let overlay=null,step=0,previousFocus=null;
function remember(choice){
 try{globalThis.localStorage?.setItem(IOS_TOUR_KEY,JSON.stringify({choice,at:Date.now()}));}catch{}
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function render(){
 if(!overlay)return;
 const info=steps[step];
 overlay.innerHTML='<section class="lr-ios-tour-card" role="dialog" aria-modal="true" aria-labelledby="lr-ios-tour-title" aria-describedby="lr-ios-tour-desc">'+
 '<button type="button" data-ios-tour="close" class="lr-ios-tour-close" aria-label="Fermer le tutoriel">×</button>'+
 '<p class="lr-ios-tour-kicker">LOVEROLL · '+(step?'ÉTAPE '+step+'/4':'BIENVENUE')+'</p>'+
 '<div class="lr-ios-tour-illustration" aria-hidden="true"><span class="lr-ios-tour-phone"><span class="lr-ios-tour-phone-top"></span><span class="lr-ios-tour-symbol">'+escapeHtml(info.symbol)+'</span><span class="lr-ios-tour-phone-bottom"></span></span></div>'+
 '<h2 id="lr-ios-tour-title">'+escapeHtml(info.title)+'</h2>'+
 '<p id="lr-ios-tour-desc">'+escapeHtml(info.subtitle)+'</p>'+
 '<div class="lr-ios-tour-dots" aria-label="Progression du tutoriel">'+steps.slice(1).map((_,i)=>'<span class="'+(i+1===step?'active':'')+'"></span>').join('')+'</div>'+
 '<div class="lr-ios-tour-actions">'+(step>0?'<button type="button" data-ios-tour="prev" class="lr-ios-tour-secondary">Précédent</button>':'<button type="button" data-ios-tour="later" class="lr-ios-tour-secondary">Plus tard</button>')+
 '<button type="button" data-ios-tour="'+(step===4?'done':'next')+'" class="lr-ios-tour-primary">'+escapeHtml(info.action)+'</button></div></section>';
 overlay.querySelector('[data-ios-tour="'+(step===4?'done':'next')+'"]')?.focus({preventScroll:true});
}
function close(choice){
 if(!overlay)return;
 remember(choice);overlay.remove();overlay=null;document.removeEventListener('keydown',keyHandler);
 previousFocus?.isConnected&&previousFocus.focus?.({preventScroll:true});previousFocus=null;
}
function keyHandler(event){
 if(!overlay)return;
 if(event.key==='Escape'){event.preventDefault();close('later');return;}
 if(event.key!=='Tab')return;
 const focus=[...overlay.querySelectorAll('button:not([disabled])')];
 const current=focus.indexOf(document.activeElement);
 if(event.shiftKey&&current===0){event.preventDefault();focus.at(-1)?.focus();}
 if(!event.shiftKey&&current===focus.length-1){event.preventDefault();focus[0]?.focus();}
}
export function openIosInstallTour(){
 if(!globalThis.document||overlay||!isIosSafari())return false;
 previousFocus=document.activeElement;
 overlay=document.createElement('div');overlay.className='lr-ios-tour';overlay.dataset.iosTourOverlay='';
 overlay.addEventListener('click',event=>{
  const action=event.target.closest('[data-ios-tour]')?.dataset.iosTour;
  if(!action)return;
  if(action==='close'||action==='later'||action==='done'){close(action==='done'?'done':'later');return;}
  if(action==='prev')step=Math.max(0,step-1);
  if(action==='next')step=Math.min(4,step+1);
  render();
 });
 step=0;document.body.append(overlay);document.addEventListener('keydown',keyHandler);
 render();return true;
}
export function initIosInstallTour(){
 if(typeof document==='undefined')return;
 window.addEventListener('loveroll:ios-install-guide',openIosInstallTour);
 const offer=()=>{
  if(!isIosSafari()||!shouldShowIosTour())return;
  // Let LoveRoll finish painting its initial splash before offering instructions.
  let attempts=0;
  const check=()=>{
   if(!isIosSafari()||!shouldShowIosTour()||overlay)return;
   const boot=document.querySelector('#app [data-lr-boot]');
   if(boot&&attempts++<14){setTimeout(check,500);return;}
   openIosInstallTour();
  };
  setTimeout(check,700);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',offer,{once:true});
 else offer();
}
initIosInstallTour();
