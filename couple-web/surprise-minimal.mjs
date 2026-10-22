import {goldArrowHtml} from './gold-arrows.mjs?v=20261022-home225';
let observer,eventsOpen=false,infoOpen=false;
export function fitSurpriseMinimal(root){
 observer?.disconnect();observer=null;
 const view=root.querySelector('.surprise-premium-view');
 const enabled=!!view&&matchMedia('(max-width:767px)').matches;
 root.classList.toggle('has-surprise-minimal',enabled);
 if(!enabled){eventsOpen=infoOpen=false;return;}
 view.classList.add('surprise-minimal');
 const header=view.querySelector('.surprise-header'),title=header.querySelector('.ritual-page-title');
 const hero=view.querySelector('.surprise-main-die-scene'),month=hero.querySelector('.surprise-month-label');
 const controls=view.querySelector('.surprise-month'),special=view.querySelector('.surprise-special');
 const mainButton=controls.querySelector('.surprise-primary');
 mainButton.classList.add('lr-surface','lr-ruby-control','lr-ruby-action');
 if(mainButton.dataset.action==='roll:monthly_activity')mainButton.textContent='Brasser notre surprise';
 const status=document.createElement('div');status.className='surprise-minimal-status';
 for(const element of [...controls.children])if(element!==mainButton)status.append(element);
 hero.classList.add('home-die-theater');
 hero.insertAdjacentHTML('beforeend','<div class="home-pedestal" aria-hidden="true"><span class="home-pedestal-contact"></span></div><button type="button" class="home-odds-info" aria-label="Informations sur la surprise" aria-haspopup="dialog" aria-controls="surprise-info-dialog"><span aria-hidden="true">i</span></button>');
 // The inviter D6 shares Home's flat rotation; D100 shares Soirée's optics.
 hero.querySelector('.love3d-6 .love3d-stage')?.classList.add('home-die-platform');
 const list=document.createElement('dialog');list.id='surprise-events-dialog';list.className='surprise-minimal-dialog lr-surface';
 list.setAttribute('aria-labelledby','surprise-events-title');
 list.innerHTML='<button type="button" class="surprise-minimal-close" aria-label="Fermer les événements">×</button><h2 id="surprise-events-title">Nos événements</h2><p>Du plus proche au plus éloigné</p>';
 list.append(special.querySelector('.surprise-special-grid'));
 const eventsButton=document.createElement('button');eventsButton.type='button';eventsButton.className='surprise-events-summary lr-surface';
 eventsButton.setAttribute('aria-haspopup','dialog');eventsButton.setAttribute('aria-controls',list.id);
 eventsButton.innerHTML='<span class="surprise-summary-title">Nos événements</span><span class="surprise-summary-next"><small>Prochain :</small><span></span></span>'+goldArrowHtml();
 const next=list.querySelector('.surprise-event-card');
 const nextName=next?.querySelector('.surprise-event-title')?.textContent||'À personnaliser';
 const nextDays=next?.querySelector('.surprise-event-days')?.textContent||'';
 eventsButton.querySelector('.surprise-summary-next>span').textContent=nextName+(nextDays?' · '+nextDays:'');
 for(const card of list.querySelectorAll('.surprise-event-card')){
  card.classList.add('lr-surface');card.insertAdjacentHTML('beforeend',goldArrowHtml());
  card.addEventListener('click',()=>{eventsOpen=false;list.close();});
 }
 const info=document.createElement('dialog');info.id='surprise-info-dialog';info.className='surprise-minimal-dialog lr-surface';
 info.setAttribute('aria-labelledby','surprise-info-title');
 info.innerHTML='<button type="button" class="surprise-minimal-close" aria-label="Fermer les informations">×</button><h2 id="surprise-info-title">Notre surprise du mois</h2><p>Le D100 choisit votre activité du mois. Découvrez ensuite sa version de saison.</p><p>Le dé à six faces détermine qui invite : pair pour le premier partenaire, impair pour le second.</p><p>Votre activité et la personne qui invite restent enregistrées pour votre duo.</p>';
 const infoButton=hero.querySelector('.home-odds-info');
 eventsButton.addEventListener('click',()=>{eventsOpen=true;list.showModal();});
 infoButton.addEventListener('click',()=>{infoOpen=true;info.showModal();});
 for(const [dialog,opener,kind] of [[list,eventsButton,'events'],[info,infoButton,'info']]){
  dialog.querySelector('.surprise-minimal-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{if(kind==='events')eventsOpen=false;else infoOpen=false;opener.focus({preventScroll:true});});
 }
 // Move the real controls and canvas, preserving all existing action bindings.
 view.replaceChildren(header,title,month,hero,mainButton,status,eventsButton,list,info,...view.querySelectorAll(':scope>.surprise-modal'));
 eventsButton.disabled=mainButton.disabled;
 if(eventsOpen&&!view.querySelector('.surprise-modal'))list.showModal();
 if(infoOpen&&!view.querySelector('.surprise-modal'))info.showModal();
 const fit=()=>{
  if(!view.isConnected){fitObserver.disconnect();return;}
  const split=mainButton.getBoundingClientRect().top;
  root.style.setProperty('--home-scene-split',split+'px');
  root.style.setProperty('--home-scene-top-image-height',split/.438+'px');
  root.style.setProperty('--home-scene-bottom-image-height',(innerHeight-split)/.562+'px');
  root.style.setProperty('--home-scene-contact',split*.323/.438+'px');
 };
 const fitObserver=new ResizeObserver(fit);observer=fitObserver;fitObserver.observe(root);fit();
 hero.querySelector('canvas')?.loveRollDie?.refresh?.();document.fonts.ready.then(fit);
}
