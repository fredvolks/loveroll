// Apply the selected Home-based Soirée presentation without changing actions,
// account state, official dice values, weekly access or aftercare information.
let observer;
export function fitSoireeHomeTemplate(root){
 observer?.disconnect();observer=null;
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
  root.style.setProperty('--home-scene-contact',split*.342/.438+'px');
 };
 observer=new ResizeObserver(fit);observer.observe(root);fit();document.fonts.ready.then(fit);
}
