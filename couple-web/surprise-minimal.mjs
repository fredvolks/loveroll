import {fitSharedStage} from './shared-stage.mjs?v=20261022-home228';
import {goldArrowHtml} from './gold-arrows.mjs?v=20261022-home228';
let observer,eventsOpen=false,infoOpen=false,activeRender=0;
export function fitSurpriseMinimal(root){
 // A previous rendered dialog can dispatch a delayed close event after a
 // realtime replacement. It must never clear the newer dialog's open state.
 const renderId=++activeRender;
 observer?.disconnect();observer=null;
 const view=root.querySelector('.surprise-premium-view');
 const enabled=!!view&&matchMedia('(max-width:767px)').matches;
 root.classList.toggle('has-surprise-minimal',enabled);
 if(!enabled){eventsOpen=infoOpen=false;return;}
 // A transient partial render must not crash the entire app or create
 // a half-mounted dialog. Keep the normal layout as a safe fallback.
 const header=view.querySelector('.surprise-header');
 const title=header?.querySelector('.ritual-page-title');
 const hero=view.querySelector('.surprise-main-die-scene');
 const month=hero?.querySelector('.surprise-month-label');
 const controls=view.querySelector('.surprise-month');
 const special=view.querySelector('.surprise-special');
 const mainButton=controls?.querySelector('.surprise-primary');
 const eventsGrid=special?.querySelector('.surprise-special-grid');
 if(!header||!title||!hero||!month||!controls||!special||!mainButton||!eventsGrid){
  root.classList.remove('has-surprise-minimal');
  eventsOpen=infoOpen=false;
  return;
 }
 view.classList.add('surprise-minimal');
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
 list.append(eventsGrid);
 const eventsButton=document.createElement('button');eventsButton.type='button';eventsButton.className='surprise-events-summary lr-surface';
 eventsButton.setAttribute('aria-haspopup','dialog');eventsButton.setAttribute('aria-controls',list.id);
 eventsButton.innerHTML='<span class="surprise-summary-title">Nos événements</span><span class="surprise-summary-next"><small>Prochain :</small><span></span></span>'+goldArrowHtml();
 const next=list.querySelector('.surprise-event-card');
 const nextName=next?.querySelector('.surprise-event-title')?.textContent||'À personnaliser';
 const nextDays=next?.querySelector('.surprise-event-days')?.textContent||'';
 eventsButton.querySelector('.surprise-summary-next>span').textContent=nextName+(nextDays?' · '+nextDays:'');
 for(const card of list.querySelectorAll('.surprise-event-card')){
  card.classList.add('lr-surface');card.insertAdjacentHTML('beforeend',goldArrowHtml());
  card.addEventListener('click',()=>{
   if(renderId!==activeRender)return;
   eventsOpen=false;
   if(list.open)list.close();
  });
 }
 const info=document.createElement('dialog');info.id='surprise-info-dialog';info.className='surprise-minimal-dialog lr-surface';
 info.setAttribute('aria-labelledby','surprise-info-title');
 info.innerHTML='<button type="button" class="surprise-minimal-close" aria-label="Fermer les informations">×</button><h2 id="surprise-info-title">Notre surprise du mois</h2><p>Le D100 choisit votre activité du mois. Découvrez ensuite sa version de saison.</p><p>Le dé à six faces détermine qui invite : pair pour le premier partenaire, impair pour le second.</p><p>Votre activité et la personne qui invite restent enregistrées pour votre duo.</p>';
 const infoButton=hero.querySelector('.home-odds-info');
 eventsButton.addEventListener('click',()=>{
  if(renderId!==activeRender)return;
  eventsOpen=true;infoOpen=false;
  if(!list.open)list.showModal();
 });
 infoButton.addEventListener('click',()=>{
  if(renderId!==activeRender)return;
  infoOpen=true;eventsOpen=false;
  if(!info.open)info.showModal();
 });
 for(const [dialog,opener,kind] of [[list,eventsButton,'events'],[info,infoButton,'info']]){
  dialog.querySelector('.surprise-minimal-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{
   if(renderId!==activeRender)return; // stale async event from replaced DOM
   if(kind==='events')eventsOpen=false;else infoOpen=false;
   if(opener.isConnected)opener.focus({preventScroll:true});
  });
 }
 // Move the real controls and canvas, preserving all existing action bindings.
 view.replaceChildren(header,title,month,hero,mainButton,status,eventsButton,list,info,...view.querySelectorAll(':scope>.surprise-modal'));
 // Event browsing is independent of whether a monthly D100/D6 roll is busy.
 // Never copy the primary roll's disabled state to the event summary.
 if(eventsOpen&&!view.querySelector('.surprise-modal'))list.showModal();
 else if(infoOpen&&!view.querySelector('.surprise-modal'))info.showModal();
 const fit=()=>{
  if(renderId!==activeRender||!view.isConnected){fitObserver.disconnect();return;}
  fitSharedStage(root);
 };
 const fitObserver=new ResizeObserver(fit);observer=fitObserver;fitObserver.observe(root);fit();
 hero.querySelector('canvas')?.loveRollDie?.refresh?.();document.fonts.ready.then(fit);
}
