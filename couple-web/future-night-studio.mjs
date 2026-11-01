
// Local, read-only simulation for the future 300-card catalog.
// This is NOT the live D100, a Supabase session or an assignment to real users.
import {buildFutureNightPlan,FUTURE_NIGHT_LENGTHS} from './future-night-plan.mjs';
import {PLAY_STYLES} from './play-style.mjs';
import {canEditFutureDraft} from './future-card-draft.mjs';

const DEMO_MEMBERS=Object.freeze([
 Object.freeze({user_id:'demo-partner-a',gender:'her'}),
 Object.freeze({user_id:'demo-partner-b',gender:'him'})
]);
const LABELS=Object.freeze({
 soft:'Soft',medium:'Medium',intense:'Intense',
 woman:'Partenaire A',man:'Partenaire B',both:'Les deux'
});
export function previewFutureNight(cards,{
 styleA='medium',styleB='medium',minutes='15'
}={}){
 if(!canEditFutureDraft(cards))
  throw Error('Brouillon invalide pour la prévisualisation.');
 if(!PLAY_STYLES.includes(styleA)||!PLAY_STYLES.includes(styleB))
  throw Error('Intensité non disponible.');
 const duration=minutes==='libre'?'libre':
  typeof minutes==='number'?minutes:typeof minutes==='string'&&
  /^(5|10|15|30)$/u.test(minutes)?Number(minutes):null;
 if(!FUTURE_NIGHT_LENGTHS.includes(duration))
  throw Error('Durée non disponible.');
 const plan=buildFutureNightPlan({
  members:DEMO_MEMBERS,cards,styleA,styleB,minutes:duration,maxCards:20
 });
 const byId=new Map(cards.map(card=>[card.id,card]));
 const items=plan.items.map(item=>{
  const source=byId.get(item.cardId);
  return Object.freeze({
   ...item,title:typeof source?.title==='string'?source.title:item.cardId,
   target:source?.target,
   recipientLabel:LABELS[source?.target]||'Indisponible',
   levelLabel:LABELS[item.level]||item.level
  });
 });
 return Object.freeze({...plan,items:Object.freeze(items),simulated:true});
}
export function initFutureNightPreview(doc=document,getCards=()=>[]){
 const button=doc.getElementById('future-night-preview-run'),
  output=doc.getElementById('future-night-preview-result'),
  styleA=doc.getElementById('future-night-style-a'),
  styleB=doc.getElementById('future-night-style-b'),
  minutes=doc.getElementById('future-night-duration');
 if(!button||!output||!styleA||!styleB||!minutes)return null;
 const clear=()=>output.replaceChildren();
 const paragraph=(parent,content,tag='p')=>{
  const el=doc.createElement(tag);
  el.textContent=content;parent.appendChild(el);return el;
 };
 button.addEventListener('click',()=>{
  clear();
  try{
   const result=previewFutureNight(getCards(),{
    styleA:styleA.value,styleB:styleB.value,minutes:minutes.value
   });
   const total=result.requestedMinutes==='libre'?'Libre':
    result.requestedMinutes+' min';
   paragraph(output,'Simulation · '+result.items.length+' carte(s) · '+
    result.spentMinutes+' min prévues / '+total,'strong');
   if(!result.items.length){
    paragraph(output,'Aucune carte admissible : ajoute des cartes à ce brouillon.');
    return;
   }
   const list=doc.createElement('ol');
   for(const item of result.items){
    const entry=doc.createElement('li');
    const title=doc.createElement('strong');
    title.textContent=item.title;entry.appendChild(title);
    paragraph(entry,item.levelLabel+' · '+item.recipientLabel+' · '+
     item.minutes+' min · '+item.fromMinute+'–'+item.toMinute+' min','small');
    list.appendChild(entry);
   }
   output.appendChild(list);
   if(result.remainingMinutes!==null&&result.remainingMinutes>0)
    paragraph(output,'Il reste '+result.remainingMinutes+
     ' min : aucune carte compatible ne peut compléter cette durée.');
   paragraph(output,'Simulation fictive uniquement. Aucun défi démarré ou sauvegardé.');
  }catch(error){
   paragraph(output,error instanceof Error?error.message:
    'Prévisualisation indisponible.');
  }
 });
 for(const input of [styleA,styleB,minutes])
  input.addEventListener('change',clear);
 return {clear};
}
