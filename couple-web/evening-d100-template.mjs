import {fitSharedStage,fitTabletRomanceStage} from './shared-stage.mjs?v=20261026-web236';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
let observer;
export function fitEveningD100(root){
 observer?.disconnect();observer=null;
 const view=root.querySelector('.evening-premium-view.is-ready');
 const enabled=!!view&&matchMedia('(max-width:767px)').matches;
 root.classList.toggle('has-evening-d100-template',enabled);
 if(view&&matchMedia('(min-width:768px)').matches){
  const hero=view.querySelector('.evening-die-row');
  if(hero&&!hero.querySelector('.home-pedestal')){
   hero.classList.add('home-die-theater');
   hero.insertAdjacentHTML('beforeend','<div class="home-pedestal" aria-hidden="true"><span class="home-pedestal-contact"></span></div>');
  }
  const fit=()=>{if(view.isConnected)fitTabletRomanceStage(root);};
  observer=new ResizeObserver(fit);observer.observe(root);fit();
  return false;
 }
 if(!enabled)return false;
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
 roll.classList.add('evening-d100-roll','lr-surface','lr-ruby-control','lr-ruby-action');
 if(roll.dataset.action==='new-challenge')roll.textContent=roll.disabled?'En attente de ton tour':'Brasser le dé';
 const utilities=document.createElement('div');utilities.className='evening-d100-utilities';
 const queue=step.querySelector('[data-action="evening-list"]'),gift=view.querySelector('[data-action="give-challenge"]');
 const quota=document.createElement('small');quota.className='evening-d100-quota';
 quota.textContent=view.querySelector('.evening-gift p').textContent.split(' · ').at(-1);
 for(const button of [queue,gift]){button.classList.add('lr-surface');button.textContent=button.textContent.replace(/^[♡\s]+/u,'');utilities.append(button);}
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
  fitSharedStage(root);
  // LR-001: use the same D100 size reference as Surprise but respect the
  // actual, height-constrained Soirée theater (including safe-area/nav).
  const bounds=hero.getBoundingClientRect();
  if(bounds.width>0&&bounds.height>0){
   const size=Math.floor(Math.max(1,Math.min(
    window.innerWidth*.82,window.innerHeight*.41,390,
    bounds.width*.96,
    // Never clamp to the stage's OWN computed height: the grid stage
    // follows the canvas and the feedback loop shrank a small phone to 53px.
    Math.max(bounds.height*.94,window.innerHeight*.24)
   )));
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
