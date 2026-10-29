import {fitSharedStage,fitTabletRomanceStage} from './shared-stage.mjs?v=20261027-web237';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Use the same portrait-tablet D100 envelope as Surprise while respecting
// the real Soirée theater height. Phone sizing is deliberately unchanged.
export function calculateEveningD100StageSize({viewportWidth,viewportHeight,heroWidth,heroHeight}){
 const tablet=viewportWidth>=768;
 const reference=tablet
  ?Math.min(heroWidth*.82,viewportHeight*.43,440)
  :Math.min(viewportWidth*.82,viewportHeight*.41,390);
 return Math.floor(Math.max(1,Math.min(
  reference,heroWidth*.96,
  // Do not use heroHeight alone: it can shrink with its own canvas.
  Math.max(heroHeight*.94,viewportHeight*.24)
 )));
}
export function eveningPlayInfoHtml(percent=88){
 const preferred=Math.min(100,Math.max(0,Number(percent)||0));
 return '<dialog id="evening-play-info" class="evening-play-dialog lr-surface" aria-labelledby="evening-play-info-title"><button type="button" class="evening-play-close" aria-label="Fermer les informations">×</button>'+
  '<h2 id="evening-play-info-title">Votre défi du soir</h2>'+
  '<p>Vos deux D6 déterminent le nombre de défis de chacun. Vous pigez à tour de rôle, selon le joueur indiqué à l’écran.</p>'+
  '<p>Choisissez une catégorie avant chaque lancer. Sensuel ou Sexuel : '+esc(preferred)+' % pour la catégorie choisie et '+esc(100-preferred)+' % pour l’autre. Au hasard choisit entre les deux catégories à parts égales.</p>'+
  '<p>Le D100 choisit un défi de la catégorie tirée. Le résultat officiel reste affiché et vos cartes se retrouvent dans « Voir mes défis ».</p>'+
  '<p>Vous pouvez transférer un défi non commencé à votre partenaire, jusqu’à 3 dons par personne et par mois. Le bouton reste indisponible si aucun défi ne peut être donné.</p>'+
  '<nav class="evening-play-menu" aria-label="Options de la soirée"><button type="button" class="lr-surface" data-action="evening-calendar">Calendrier</button><button type="button" class="lr-surface" data-action="evening-close-request">Clore la soirée</button></nav></dialog>';
}
export function showEveningCategoryReminder(root){
 if(!root?.querySelector('.evening-step.two'))return false;
 let dialog=root.querySelector('.evening-category-reminder');
 if(!dialog){
  dialog=root.ownerDocument.createElement('dialog');dialog.className='evening-category-reminder lr-surface';
  dialog.setAttribute('aria-labelledby','evening-category-reminder-title');
  dialog.innerHTML='<h2 id="evening-category-reminder-title">Choisis une catégorie</h2><p role="alert">Choisis une catégorie avant de brasser le dé.</p><button type="button" class="lr-surface lr-ruby-control">Choisir ma catégorie</button>';
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>root.querySelector('.evening-choice button:not(:disabled)')?.focus({preventScroll:true}));root.append(dialog);
 }
 if(!dialog.open)dialog.showModal();return true;
}
function installDesktopEveningInfo(view){
 // Desktop uses the exact same information modal and official category odds
 // as the approved mobile/iPad D100. This does not touch WebGL or dice RPCs.
 const hero=view.querySelector('.evening-step.two .evening-die-row');
 if(!hero||hero.querySelector('.home-odds-info'))return;
 const info=view.ownerDocument.createElement('button');
 info.type='button';info.className='home-odds-info';
 info.setAttribute('aria-label','Informations et options de la soirée');
 info.setAttribute('aria-haspopup','dialog');
 info.setAttribute('aria-controls','evening-play-info');
 info.innerHTML='<span aria-hidden="true">i</span>';
 hero.append(info);
 const percent=Number(view.dataset.categoryPercent??88);
 if(!view.querySelector('#evening-play-info'))view.insertAdjacentHTML('beforeend',eveningPlayInfoHtml(percent));
 const dialog=view.querySelector('#evening-play-info');
 info.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
 dialog.querySelector('.evening-play-close').addEventListener('click',()=>dialog.close());
 dialog.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{if(info.isConnected)info.focus({preventScroll:true});});
}
let observer;
export function fitEveningD100(root){
 observer?.disconnect();observer=null;
 const view=root.querySelector('.evening-premium-view.is-ready');
 const enabled=!!view&&matchMedia('(max-width:1199px), (pointer:coarse) and (min-width:768px)').matches;
 root.classList.toggle('has-evening-d100-template',enabled);
 const desktop=!enabled&&!!view&&matchMedia('(min-width:1200px)').matches;
 root.classList.toggle('has-evening-d100-desktop-info',desktop);
 if(!enabled){if(desktop)installDesktopEveningInfo(view);return false;}
 view.classList.add('has-home-soiree-template','has-evening-d100-template');
 view.querySelector('.ritual-kicker').textContent='NOTRE RITUEL DE LA SOIRÉE';
 view.querySelector('.ritual-mode-switcher').classList.add('lr-surface');
 view.querySelector('.evening-manage')?.remove();view.querySelector('.evening-more-menu')?.remove();
 const step=view.querySelector('.evening-step.two'),choice=step.querySelector('.evening-choice');
 for(const button of choice.querySelectorAll('button')){
  button.classList.add('lr-surface');button.textContent=button.textContent.replace(/^[✓♡🎲\s]+/u,'');
 }
 const hero=step.querySelector('.evening-die-row');hero.classList.add('home-die-theater','evening-d100-theater');
 const state=hero.querySelector('.evening-play-state');state.classList.add('lr-surface');
 hero.insertAdjacentHTML('beforeend','<div class="home-pedestal" aria-hidden="true"><span class="home-pedestal-contact"></span></div><button type="button" class="home-odds-info" aria-label="Informations et options de la soirée" aria-haspopup="dialog" aria-controls="evening-play-info"><span aria-hidden="true">i</span></button>');
 const progress=step.querySelector('.evening-progress');
 for(const item of progress.children)item.classList.add('lr-surface');
 const roll=step.querySelector('.evening-roll-actions>:first-child');
 // A waiting status is not a button. Do not make it look interactive.
 roll.classList.add('evening-d100-roll','lr-surface');
 if(roll.matches('button'))roll.classList.add('lr-ruby-control','lr-ruby-action');
 if(roll.dataset.action==='new-challenge')roll.textContent='Brasser le D100';
 const utilities=document.createElement('div');utilities.className='evening-d100-utilities';
 const queue=step.querySelector('[data-action="evening-list"]'),gift=view.querySelector('[data-action="give-challenge"]');
 const quota=document.createElement('small');quota.className='evening-d100-quota';
 quota.textContent=view.querySelector('.evening-gift p').textContent.split(' · ').at(-1);
 for(const button of [queue,gift]){
  // If "Voir mes défis" is primary, keep it primary instead of moving it.
  if(!button||button===roll)continue;
  button.classList.add('lr-surface');
  button.textContent=button.textContent.replace(/^[♡\s]+/u,'');
  utilities.append(button);
 }
 step.replaceChildren(choice,hero,state,progress,roll,utilities,quota);
 view.querySelector('.evening-step.one')?.remove();view.querySelector('.evening-gift')?.remove();
 const percent=Number(view.dataset.categoryPercent??88);
 view.insertAdjacentHTML('beforeend',eveningPlayInfoHtml(percent));
 const dialog=view.querySelector('#evening-play-info'),info=hero.querySelector('.home-odds-info');
 info.addEventListener('click',()=>dialog.showModal());
 dialog.querySelector('.evening-play-close').addEventListener('click',()=>dialog.close());
 dialog.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>info.focus({preventScroll:true}));
 const fit=()=>{
  if(!view.isConnected){fitObserver.disconnect();return;}
  if(matchMedia('(min-width:768px)').matches)fitTabletRomanceStage(root);
  else fitSharedStage(root);
  // LR-001: use the same D100 size reference as Surprise but respect the
  // actual, height-constrained Soirée theater (including safe-area/nav).
  const bounds=hero.getBoundingClientRect();
  if(bounds.width>0&&bounds.height>0){
   const size=calculateEveningD100StageSize({
    viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,
    heroWidth:bounds.width,heroHeight:bounds.height
   });
   const previous=hero.style.getPropertyValue('--evening-d100-stage-size');
   const next=size+'px';
   if(previous!==next){
    hero.style.setProperty('--evening-d100-stage-size',next);
    hero.querySelector('canvas')?.loveRollDie?.refresh?.();
   }
  }
 };
 const fitObserver=new ResizeObserver(fit);observer=fitObserver;fitObserver.observe(root);fit();
 hero.querySelector('canvas')?.loveRollDie?.refresh?.();document.fonts.ready.then(fit);
 return true;
}
