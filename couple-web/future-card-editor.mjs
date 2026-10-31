// Local future LoveRoll deck editor. The live D100 and remote data are untouched.
import {FUTURE_LEVELS} from './future-card-catalog.mjs';
import {canEditFutureDraft,upsertFutureDraftCard,removeFutureDraftCard}
 from './future-card-draft.mjs';
const IDS=['select','new','id','minutes','target','soft','medium','intense',
 'title','description','save','remove','export','feedback'];
const copy=cards=>cards.map(card=>({...card,
 levels:Array.isArray(card.levels)?[...card.levels]:card.levels}));

export function initFutureCardEditor(doc=document,{onDraftChange=()=>{}}={}){
 const el=Object.fromEntries(IDS.map(id=>[id,doc.getElementById('future-card-'+id)]));
 if(IDS.some(id=>!el[id]))return null;
 let cards=[],selected=null,dirty=false,unexported=false;
 const say=value=>{el.feedback.textContent=value;};
 const confirmWithUser=message=>doc.defaultView?.confirm?.(message)===true;
 const mayDiscard=()=>!dirty||confirmWithUser(
  'Des modifications de la carte ne sont pas enregistrées. Les abandonner ?');
 const clear=()=>{
  selected=null;dirty=false;el.select.value='';
  el.id.value='';el.title.value='';el.description.value='';
  el.minutes.value='3';el.target.value='both';
  for(const level of FUTURE_LEVELS)el[level].checked=false;
  el.remove.disabled=true;
 };
 const selectCard=id=>{
  const card=cards.find(card=>card.id===id);
  if(!card){clear();return;}
  selected=card.id;dirty=false;el.select.value=card.id;
  el.id.value=card.id;el.title.value=card.title||'';
  el.description.value=card.description||'';
  el.minutes.value=String(card.minutes||3);el.target.value=card.target||'both';
  for(const level of FUTURE_LEVELS)
   el[level].checked=Array.isArray(card.levels)&&card.levels.includes(level);
  el.remove.disabled=false;
 };
 const refresh=choice=>{
  el.select.replaceChildren();
  const blank=doc.createElement('option');
  blank.value='';blank.textContent='Nouvelle carte';el.select.appendChild(blank);
  for(const card of cards){
   const opt=doc.createElement('option');opt.value=card.id;
   opt.textContent=card.id+' · '+(card.title||'Sans titre');
   el.select.appendChild(opt);
  }
  el.export.disabled=cards.length===0;
  selectCard(choice||'');
 };
 const broadcast=()=>{
  onDraftChange(copy(cards));
 };
 const load=source=>{
  if(!canEditFutureDraft(source)){
   say('Import incompatible avec cet éditeur : les cartes courantes sont conservées.');
   return false;
  }
  if((dirty||unexported)&&!confirmWithUser(
   'Remplacer le brouillon local ? Exporte-le avant de le remplacer.'))return false;
  cards=copy(source);unexported=cards.length>0;refresh();
  say('Brouillon importé localement : '+cards.length+
   ' cartes. Aucune publication automatique.');
  return true;
 };
 refresh();
 el.select.addEventListener('change',()=>{
  const id=el.select.value;
  if(!mayDiscard()){el.select.value=selected||'';return;}
  selectCard(id);say(id?'Carte chargée pour modification.':'Nouvelle carte.');
 });
 el.new.addEventListener('click',()=>{
  if(!mayDiscard())return;
  clear();say('Nouvelle carte : remplir les champs puis enregistrer.');
 });
 for(const field of ['id','minutes','target','soft','medium','intense','title','description']){
  for(const event of ['input','change'])
   el[field].addEventListener(event,()=>{
    dirty=true;say('Modifications non enregistrées dans le brouillon.');
   });
 }
 el.save.addEventListener('click',()=>{
  try{
   const next=upsertFutureDraftCard(cards,{
    id:el.id.value,title:el.title.value,description:el.description.value,
    minutes:el.minutes.value,target:el.target.value,
    levels:FUTURE_LEVELS.filter(level=>el[level].checked)
   },selected);
   cards=next;unexported=true;refresh(el.id.value.trim());
   broadcast();
   say('Carte enregistrée localement. '+cards.length+
    ' cartes uniques. Exporte le JSON pour conserver ton travail.');
  }catch(error){say(error.message);}
 });
 el.remove.addEventListener('click',()=>{
  if(!selected||!confirmWithUser('Supprimer cette carte du brouillon local ?'))return;
  try{
   cards=removeFutureDraftCard(cards,selected);unexported=true;
   refresh();broadcast();
   say('Carte supprimée du brouillon local, sans modifier les tirages.');
  }catch(error){say(error.message);}
 });
 el.export.addEventListener('click',()=>{
  if(!canEditFutureDraft(cards)||!cards.length){
   say('Brouillon absent ou non exportable.');return;
  }
  const blob=new Blob([JSON.stringify(cards,null,2)],{
   type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
   const a=doc.createElement('a');a.href=url;
   a.download='loveroll-cartes-brouillon-'+
    new Date().toISOString().slice(0,10)+'.json';
   doc.body.appendChild(a);a.click();a.remove();unexported=false;
   say('Fichier JSON exporté. Aucune carte envoyée à Supabase.');
  }catch{
   say('Exportation impossible sur cet appareil. Le brouillon est conservé.');
  }finally{
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
 });
 doc.defaultView?.addEventListener?.('beforeunload',event=>{
  if(!dirty&&!unexported)return;
  event.preventDefault();event.returnValue='';
 });
 return {load,getCards:()=>copy(cards),hasUnsavedForm:()=>dirty};
}
