// LR-014 — personal, explicit confirmation before the existing OFFICIAL D100 RPC.
// This module never rolls a die, changes a category or writes a shared couple value.
export const EVENING_CONFIRM_PREFERENCE='loveroll-confirm-evening-category-v1';
const allowed=new Set(['SENSUEL','SEXUEL','HASARD']);
const titles={SENSUEL:'Sensuel',SEXUEL:'Sexuel',HASARD:'Au hasard'};
const localKey=userId=>EVENING_CONFIRM_PREFERENCE+':'+String(userId||'');
export function categoryConfirmEnabled(profile,userId,storage){
 if(typeof profile?.confirm_evening_category==='boolean')return profile.confirm_evening_category;
 if(!userId)return true;
 try{return storage?.getItem(localKey(userId))!=='false';}catch{return true;}
}
export function saveCategoryConfirmLocal(userId,enabled,storage){
 if(!userId)return false;
 try{storage?.setItem(localKey(userId),enabled?'true':'false');return true;}catch{return false;}
}
export function categoryConfirmOdds(category,percentage=88){
 if(!allowed.has(category))throw Error('Catégorie invalide');
 const amount=Number(percentage),preferred=Number.isFinite(amount)?Math.min(100,Math.max(0,amount)):88;
 if(category==='HASARD')return {sensuel:50,sexuel:50};
 return category==='SENSUEL'?
  {sensuel:preferred,sexuel:100-preferred}:{sensuel:100-preferred,sexuel:preferred};
}
// A D100 confirmation belongs to the exact Auth generation, member, duo
// and evening that opened it. A delayed dialog result or server receipt
// must not submit a draw or write state for a replacement account.
export function ownsEveningCategoryDraw(state,request,generation){
 return !!(request?.userId&&request?.coupleId&&request?.sessionId&&
  Number.isInteger(request.generation)&&
  state?.user?.id===request.userId&&
  state?.coupleId===request.coupleId&&
  state?.session?.id===request.sessionId&&
  state?.tab==='session'&&request.generation===generation);
}
export function eveningCategoryConfirmMarkup(category,percentage=88){
 if(!allowed.has(category))throw Error('Catégorie invalide');
 const odds=categoryConfirmOdds(category,percentage);
 return '<section class="lr-evening-confirm-card">'+
  '<p class="lr-evening-confirm-eyebrow">♡ NOTRE SOIRÉE</p>'+
  '<h2 id="lr-evening-confirm-title">Confirmer notre choix</h2>'+
  '<p id="lr-evening-confirm-description">Tu veux brasser le dé dans cette catégorie ?</p>'+
  '<div class="lr-evening-confirm-choice">Catégorie : <strong>'+titles[category]+'</strong></div>'+
  '<p class="lr-evening-confirm-odds">Sensuel '+odds.sensuel+' % · Sexuel '+odds.sexuel+' %</p>'+
  '<label class="lr-evening-confirm-optout"><input type="checkbox" data-confirm-optout> Ne plus afficher ce message</label>'+
  '<button type="button" class="lr-evening-confirm-go" data-confirm-action="yes">Confirmer et brasser</button>'+
  '<button type="button" class="lr-evening-confirm-change" data-confirm-action="change">Modifier la catégorie</button>'+
  '<button type="button" class="lr-evening-confirm-close" data-confirm-action="close" aria-label="Fermer la confirmation">✕</button>'+
  '</section>';
}
// A native modal preserves the running WebGL tree. No clone, no remount,
// no server action: caller alone may execute the existing draw after YES.
export function askEveningCategoryConfirmation({category,percentage=88,doc=document}){
 return new Promise((resolve,reject)=>{
  if(!allowed.has(category)){reject(Error('Catégorie invalide'));return;}
  const opener=doc.activeElement;
  const restoreFocus=()=>{
   // A login or navigation may have already removed the old trigger.
   // Never focus a detached control or scroll the game when closing.
   if(!opener?.isConnected||typeof opener.focus!=='function')return;
   try{opener.focus({preventScroll:true});}
   catch{opener.focus();}
  };
  const dialog=doc.createElement('dialog');
  dialog.className='lr-evening-category-dialog';
  dialog.setAttribute('aria-labelledby','lr-evening-confirm-title');
  dialog.setAttribute('aria-describedby','lr-evening-confirm-description');
  dialog.innerHTML=eveningCategoryConfirmMarkup(category,percentage);
  let done=false;
  const finish=(result)=>{
   if(done)return;done=true;
   if(dialog.open)dialog.close();
   dialog.remove();restoreFocus();resolve(result);
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish({confirmed:false,neverShow:false});});
  dialog.addEventListener('close',()=>finish({confirmed:false,neverShow:false}));
  dialog.addEventListener('click',event=>{
   const action=event.target.closest?.('[data-confirm-action]')?.dataset.confirmAction;
   if(action==='yes')finish({confirmed:true,neverShow:!!dialog.querySelector('[data-confirm-optout]')?.checked});
   else if(action==='change'||action==='close'||event.target===dialog)
    finish({confirmed:false,neverShow:false});
  });
  doc.body.append(dialog);
  try{dialog.showModal();dialog.querySelector('[data-confirm-action="yes"]')?.focus();}
  catch(error){dialog.remove();restoreFocus();reject(error);}
 });
}
