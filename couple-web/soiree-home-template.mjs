import {fitEveningD6} from './evening-d6-template.mjs?v=20261022-home223';
// Apply the selected Home-based Soirée presentation without changing actions,
// account state, official dice values, weekly access or aftercare information.
let observer;
export function fitSoireeHomeTemplate(root){
 observer?.disconnect();observer=null;
 if(fitEveningD6(root))return;
 const view=root.querySelector('.evening-premium-view.is-inactive');
 if(!view||!matchMedia('(max-width:767px)').matches)return;
 view.classList.add('has-home-soiree-template');
 const care=view.querySelector('.evening-aftercare'),actions=care.querySelector('.evening-finale-actions');
 if(!care.querySelector('.evening-summary-shell')){
  const card=document.createElement('div');card.className='evening-summary-shell lr-surface';
  if(care.querySelector('.evening-finale-status'))card.classList.add('is-aftercare');
  for(const child of [...care.children])if(child!==actions)card.append(child);
  card.append(actions.querySelector('.evening-finale-calendar'));
  actions.append(card);
  const start=actions.querySelector('.evening-finale-start');
  start.classList.add('lr-surface','lr-ruby-control','lr-ruby-action');
  start.textContent='♡ Commencer notre soirée';
  if(start.disabled&&card.querySelector('.evening-finale-description')?.textContent.includes('Brassez d’abord')){
   const trigger=document.createElement('div');trigger.className='evening-start-reminder';
   trigger.tabIndex=0;trigger.setAttribute('role','button');trigger.setAttribute('aria-label','Pourquoi commencer notre soirée est indisponible');
   start.replaceWith(trigger);trigger.append(start);
   const dialog=document.createElement('dialog');dialog.className='evening-weekly-reminder lr-surface';
   dialog.innerHTML='<h2>Brassez le dé de la semaine</h2><p>Allez à l’accueil et brassez le dé hebdomadaire pour découvrir votre nombre de soirées.</p><button type="button" class="lr-ruby-control lr-ruby-action lr-surface" data-action="tab:home">Aller à l’accueil</button><button type="button" class="reminder-close">Fermer</button>';
   view.append(dialog);dialog.querySelector('.reminder-close').addEventListener('click',()=>dialog.close());
   trigger.addEventListener('click',()=>dialog.showModal());
   trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();dialog.showModal();}});
  }
  view.querySelector('.ritual-mode-switcher').classList.add('lr-surface');
  const hero=view.querySelector('.evening-finale-hero');
  hero.insertAdjacentHTML('beforeend','<div class="soiree-pedestal-marker" aria-hidden="true"><span class="home-pedestal-contact"></span></div>');
 }
 const fit=()=>{
  if(!view.isConnected){observer?.disconnect();return;}
  const split=actions.querySelector('.evening-finale-start').getBoundingClientRect().top;
  root.style.setProperty('--home-scene-split',split+'px');
  root.style.setProperty('--home-scene-top-image-height',split/.438+'px');
  root.style.setProperty('--home-scene-bottom-image-height',(innerHeight-split)/.562+'px');
  root.style.setProperty('--home-scene-contact',split*.323/.438+'px');
 };
 observer=new ResizeObserver(fit);observer.observe(root);fit();document.fonts.ready.then(fit);
}

export function fitRubyCalendar(root){
 const shell=root.querySelector('.evening-calendar-shell');
 if(!shell||!matchMedia('(max-width:767px)').matches)return;
 root.classList.add('has-ruby-calendar');
 shell.querySelector('.evening-cal-head h2')?.classList.add('ritual-page-title');
 const groups=[...shell.querySelectorAll(':scope>.evening-cal-stats')];
 if(groups.length){
  const summary=document.createElement('div');summary.className='calendar-summary lr-surface';
  groups[0].before(summary);for(const group of groups)summary.append(group);
 }
 for(const selector of ['.evening-cal-month','.evening-cal-history','.evening-cal-return'])shell.querySelector(selector)?.classList.add('lr-surface');
 const back=shell.querySelector('.evening-cal-return');
 if(back){back.className='calendar-back-arrow';back.textContent='‹';back.setAttribute('aria-label','Retour à Soirée');shell.querySelector('.evening-cal-head').prepend(back);}
}
