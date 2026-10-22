import {fitSharedStage} from './shared-stage.mjs?v=20261022-home226';
import {pipFace} from './premium-home.mjs?v=20261022-home226';
import {EVENING_DEFAULT_WEIGHTS,effectiveDicePercentages,displayedDicePercent} from './dice-weighting.mjs';

export function eveningOddsHtml(weights,enabled=true){
 const odds=effectiveDicePercentages(weights,enabled,EVENING_DEFAULT_WEIGHTS);
 return '<dialog id="evening-odds-dialog" class="home-odds-dialog" aria-labelledby="evening-odds-title"><section>'+
  '<button type="button" class="home-odds-close" data-home-odds-close aria-label="Fermer les probabilités">×</button>'+
  '<h2 id="evening-odds-title">Les probabilités du dé</h2><p>Le résultat de ton dé indique ton nombre de défis pour cette soirée.</p>'+
  '<div class="home-odds-grid">'+odds.map((pct,i)=>'<span class="home-odds-entry">'+pipFace(i+1)+'<span>'+displayedDicePercent(pct)+' %</span></span>').join('')+
  '</div><p>Chaque partenaire brasse son propre dé une seule fois.</p>'+
  '<nav class="evening-d6-tools" aria-label="Options de la soirée"><button type="button" data-action="evening-calendar">Calendrier</button><button type="button" data-action="evening-close-request">Clore la soirée</button></nav></section></dialog>';
}

let observer;
export function fitEveningD6(root){
 observer?.disconnect();observer=null;
 const view=root.querySelector('.evening-premium-view.is-waiting');
 root.classList.toggle('has-evening-d6-template',!!view&&matchMedia('(max-width:767px)').matches);
 if(!root.classList.contains('has-evening-d6-template'))return false;
 view.classList.add('has-home-soiree-template','has-evening-d6-template');
 const own=view.querySelector('.evening-my-die'),canvas=own.querySelector('canvas');
 const hero=document.createElement('div');hero.className='home-die-theater evening-d6-theater';
 hero.innerHTML='<div class="home-pedestal" aria-hidden="true"><span class="home-pedestal-contact"></span></div><div class="home-die-platform"></div><button type="button" class="home-odds-info" data-home-odds-open aria-label="Informations et options de la soirée" aria-haspopup="dialog" aria-controls="evening-odds-dialog"><span aria-hidden="true">i</span></button>';
 const stage=canvas.closest('.home-die-platform');
 hero.querySelector('.home-die-platform').replaceWith(stage);stage.classList.remove('love3d-stage');
 own.querySelector('.love3d').replaceWith(hero);
 const pills=document.createElement('div');pills.className='evening-duo-capsules';
 const me=document.createElement('div');me.className='evening-own-capsule lr-surface';
 const partner=view.querySelector('.evening-partner-card');
 const myName=own.dataset.playerName||'Moi',theirName=partner.dataset.playerName||'Partenaire';
 const short=n=>n.trim().split(/\s+/)[0];
 const duplicate=short(myName)===short(theirName);
 const label=document.createElement('span');label.className='evening-capsule-name';label.textContent=(duplicate?myName:short(myName))+' · ';
 me.append(label,own.querySelector('.evening-face-result'));
 const partnerLabel=partner.querySelector('.evening-partner-mobile-status');
 const result=partner.querySelector('.evening-partner-result strong')?.textContent;
 const fullStatus=partnerLabel.textContent;
 partnerLabel.textContent=(duplicate?theirName:short(theirName))+' · '+(result||'En attente');
 partner.replaceChildren(partnerLabel);partner.setAttribute('aria-label',fullStatus);partner.classList.add('lr-surface');
 pills.append(me,partner);
 const roll=own.querySelector('.evening-small-roll');
 roll.classList.add('home-roll-button','lr-ruby-control','lr-ruby-action','lr-surface');
 if(!roll.disabled)roll.textContent='Brasser mon dé';
 const footer=document.createElement('div');footer.className='evening-d6-next lr-surface';
 footer.innerHTML='<strong>Étape 1 / 2</strong><span>Deux lancers pour continuer</span>';
 const content=view.querySelector('.evening-step.one');
 content.replaceChildren(hero);
 view.querySelector('.evening-toolbar .ritual-kicker').textContent='NOTRE RITUEL DE LA SOIRÉE';
 view.querySelector('.evening-manage')?.remove();
 view.querySelector('.evening-intro .ritual-mode-switcher').classList.add('lr-surface');
 view.append(pills,roll,footer);
 const info=hero.querySelector('[data-home-odds-open]'),dialog=view.querySelector('.home-odds-dialog');
 info.addEventListener('click',()=>dialog.showModal());
 dialog.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
 dialog.querySelector('[data-home-odds-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>info.focus({preventScroll:true}));
 const fit=()=>{
  if(!view.isConnected){fitObserver.disconnect();return;}
  fitSharedStage(root);
 };
 const fitObserver=new ResizeObserver(fit);observer=fitObserver;fitObserver.observe(root);fit();canvas.loveRollDie?.refresh?.();document.fonts.ready.then(fit);
 return true;
}
