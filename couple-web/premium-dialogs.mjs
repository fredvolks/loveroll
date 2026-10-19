// LoveRoll: accessible branded dialogs. This file has no Supabase dependency.
// The caller decides whether to commit a destructive mutation after confirmation.
import {editorialIcon} from './editorial-ui.mjs';
const KINDS={
 gift:{title:'Offrir 1 défi ?',eyebrow:'UN PETIT CADEAU',icon:'heart',accept:'Offrir',cancel:'Annuler'},
 couple:{title:'Dissocier notre couple ?',eyebrow:'NOTRE ESPACE À DEUX',icon:'heart',accept:'Dissocier',cancel:'Garder notre couple',danger:true},
 reset:{title:'Confirmer la réinitialisation ?',eyebrow:'GESTION DU JEU',icon:'reset',accept:'Réinitialiser',cancel:'Annuler',danger:true},
 library:{title:'Appliquer les modifications ?',eyebrow:'PERSONNALISATION',icon:'edit',accept:'Enregistrer',cancel:'Annuler'},
 delete:{title:'Confirmer cette suppression ?',eyebrow:'MES DONNÉES',icon:'file',accept:'Confirmer',cancel:'Annuler',danger:true},
 legacy:{title:'Ouvrir mes anciennes données ?',eyebrow:'MES SOUVENIRS',icon:'book',accept:'Ouvrir',cancel:'Annuler'}
};
let activeDialog=null;
function visibleDialogTarget(element){
 if(element.disabled||element.closest('[hidden],[inert]')||!element.getClientRects().length||getComputedStyle(element).visibility!=='visible')return false;
 // Browsers may still return rectangles for content inside a closed details.
 for(let details=element.closest('details:not([open])');details;details=details.parentElement?.closest('details:not([open])')){
  if(!details.querySelector(':scope > summary')?.contains(element))return false;
 }
 return true;
}
function dialogControls(overlay){
 return [...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
  .filter(visibleDialogTarget);
}
function isolateDialog(overlay,boundary){
 const previous=[];
 let current=overlay;
 while(current&&current!==boundary){
  const parent=current.parentElement;if(!parent)break;
  for(const sibling of parent.children)if(sibling!==current){previous.push([sibling,sibling.inert]);sibling.inert=true;}
  current=parent;
 }
 return ()=>{for(const [element,inert] of previous)element.inert=inert;};
}
function containDialogTab(event,overlay){
 if(event.key!=='Tab')return;
 const controls=dialogControls(overlay),first=controls[0],last=controls[controls.length-1];
 if(!first){event.preventDefault();overlay.focus({preventScroll:true});return;}
 if(!overlay.contains(document.activeElement)){event.preventDefault();first.focus();}
 else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function createDialog({kind='library',message,title,accept,cancel,copyValue=null}){
 if(activeDialog) return Promise.resolve(false);
 const setting=KINDS[kind]||KINDS.library;
 const overlay=document.createElement('div');
 overlay.id='lr-dialog-overlay';
 overlay.className='lr-dialog-overlay';
 overlay.setAttribute('role','presentation');
 overlay.innerHTML='<section class="lr-dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="lr-dialog-title" aria-describedby="lr-dialog-description">'+
  '<button type="button" class="lr-dialog-close" aria-label="Fermer">×</button>'+
  '<div class="lr-dialog-content"><div class="lr-dialog-icon" aria-hidden="true"></div>'+
  '<div class="lr-dialog-eyebrow"></div>'+
  '<h2 id="lr-dialog-title"></h2>'+
  '<p id="lr-dialog-description"></p>'+
  '<div class="lr-dialog-copy" hidden><textarea readonly aria-label="Lien à copier" rows="3"></textarea>'+
  '<p class="lr-dialog-copy-hint">Sélectionnez et copiez le lien si la copie automatique est bloquée.</p></div></div>'+
  '<div class="lr-dialog-actions"><button class="lr-dialog-accept" type="button"></button>'+
  '<button class="lr-dialog-cancel" type="button"></button></div></section>';
 overlay.querySelector('.lr-dialog-icon').innerHTML=editorialIcon(setting.icon);
 overlay.querySelector('.lr-dialog-eyebrow').textContent=setting.eyebrow;
 overlay.querySelector('h2').textContent=title||setting.title;
 overlay.querySelector('#lr-dialog-description').textContent=message||'';
 overlay.querySelector('.lr-dialog-cancel').textContent=cancel||setting.cancel;
 const acceptButton=overlay.querySelector('.lr-dialog-accept');
 acceptButton.textContent=accept||setting.accept;
 if(setting.danger)acceptButton.classList.add('lr-dialog-danger');
 if(copyValue!==null){
  overlay.querySelector('.lr-dialog-copy').hidden=false;
  overlay.querySelector('textarea').value=copyValue;
 }
 const previous=document.activeElement;
 document.body.appendChild(overlay);
 const restoreBackground=isolateDialog(overlay,document.body);
 const abort=new AbortController();
 return new Promise(resolve=>{
  const close=result=>{
   if(!overlay.isConnected)return;
   abort.abort();overlay.remove();restoreBackground();activeDialog=null;
   if(previous?.isConnected&&typeof previous.focus==='function')previous.focus({preventScroll:true});
   resolve(result);
  };
  activeDialog={close,overlay};
  overlay.querySelector('.lr-dialog-close').addEventListener('click',()=>close(false),{signal:abort.signal});
  overlay.querySelector('.lr-dialog-cancel').addEventListener('click',()=>close(false),{signal:abort.signal});
  acceptButton.addEventListener('click',()=>close(true),{signal:abort.signal});
  overlay.addEventListener('click',event=>{if(event.target===overlay)close(false);},{signal:abort.signal});
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close(false);}
   containDialogTab(event,overlay);
  },{signal:abort.signal});
  overlay.querySelector('.lr-dialog-cancel').focus({preventScroll:true});
 });
}
export function premiumConfirm(message,options={}){
 return createDialog({...options,message});
}
export async function premiumCopyLink(url){
 const confirmed=await createDialog({kind:'library',title:'Votre lien personnel ♡',
  message:'Vous pouvez copier ce lien et l’ouvrir dans Chrome ou Safari. Il contient votre invitation personnelle.',
  accept:'Copier le lien',cancel:'Fermer',copyValue:url});
 if(!confirmed)return false;
 try{await navigator.clipboard.writeText(url);return true;}
 catch{
  // Clipboard can be blocked in Messenger. Leave a selectable URL instead of fake success.
  await createDialog({kind:'library',title:'Copie manuelle',message:'La copie automatique est bloquée. Appuyez longuement sur le lien, puis choisissez Copier.',accept:'Compris',cancel:'Fermer',copyValue:url});
  return false;
 }
}

/* Use for existing activity, challenge and Advent overlays as well as premium confirms.
   Only the overlay may receive focus/clicks while it is visible. */
let previousInlineTrigger=null,inlineWasOpen=false,releaseInlineDialog=null;
export function focusInlineLoveDialog(root,openingAction=null){
 releaseInlineDialog?.();releaseInlineDialog=null;
 const overlay=root?.querySelector('.lr-review-backdrop')||root?.querySelector('.install-overlay')||
  root?.querySelector('.surprise-modal,.advent-dialog-shade,.evening-confirm');
 if(!overlay){
  if(inlineWasOpen&&root){
   const actionToRestore=previousInlineTrigger;
   // A few routes apply their final page class after frame(). Restore focus
   // once that synchronous work has finished, so a hidden legacy title is skipped.
   queueMicrotask(()=>{
    if(!root.isConnected||root.querySelector('.surprise-modal,.advent-dialog-shade,.evening-confirm,.install-overlay,.lr-review-backdrop')||document.querySelector('.lr-dialog-overlay'))return;
    const trigger=actionToRestore?[...root.querySelectorAll('[data-action]')].find(
     element=>element.dataset.action===actionToRestore&&visibleDialogTarget(element)):null;
    const heading=[...root.querySelectorAll('h1,h2')].find(visibleDialogTarget);
    const destination=trigger||heading||root;
    if(!trigger&&!destination.hasAttribute('tabindex'))destination.tabIndex=-1;
    destination.focus?.({preventScroll:true});
   });
  }
  previousInlineTrigger=null;inlineWasOpen=false;return false;
 }
 const wasOpen=inlineWasOpen;
 if(openingAction&&!wasOpen)previousInlineTrigger=openingAction;
 inlineWasOpen=true;
 const dialog=overlay.matches('[role="dialog"],[role="alertdialog"]')?overlay:
  overlay.querySelector('[role="dialog"],[role="alertdialog"]')||overlay;
 if(!dialog.matches('[role="alertdialog"]'))dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 const restoreBackground=isolateDialog(overlay,root),abort=new AbortController();
 releaseInlineDialog=()=>{abort.abort();restoreBackground();};
 const focusable=dialogControls(overlay);
 const continuingControl=wasOpen&&openingAction?focusable.find(element=>element.dataset.action===openingAction):null;
 const cancel=focusable.find(el=>/fermer|annuler|retour|continuer/i.test(el.textContent||''));
 const installDismiss=overlay.matches('.install-overlay')?overlay.querySelector('[data-action="install-later"]'):null;
 (continuingControl||installDismiss||cancel||focusable[0]||dialog).focus({preventScroll:true});
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&installDismiss){event.preventDefault();event.stopPropagation();installDismiss.click();return;}
  containDialogTab(event,overlay);
 },{signal:abort.signal});
 return true;
}
