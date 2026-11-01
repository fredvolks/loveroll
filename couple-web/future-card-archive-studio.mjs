// Local, explicit future-card version history for LoveRoll Studio.
// No persistence, Supabase, payment, live D100 write, or implicit publication.
import {
 blankFutureArchive,inspectFutureArchive,addFutureArchiveRevision,
 recoverFutureArchiveRevision,FUTURE_ARCHIVE_LIMIT,FUTURE_ARCHIVE_MAX_BYTES
} from './future-card-revisions.mjs';
import {compareFutureCardDrafts} from './future-card-compare.mjs';

const INPUT_NAMES=['label','save','select','restore','export','file','import','feedback','count','compare','diff'];
const clone=value=>JSON.parse(JSON.stringify(value));

export function initFutureCardArchiveStudio(doc=document,{
 getCards=()=>[],restoreCards=()=>false,hasUnsavedForm=()=>false,
 clock=()=>new Date().toISOString()
}={}){
 const controls=Object.fromEntries(INPUT_NAMES.map(name=>[
  name,doc.getElementById('future-archive-'+name)]));
 if(INPUT_NAMES.some(name=>!controls[name]))return null;
 const {label,save,select,restore,export:exportBtn,file,import:importBtn,
  feedback,count,compare,diff}=controls;
 let archive=blankFutureArchive(),unexported=false,request=0;
 const say=message=>{feedback.textContent=message;};
 const confirm=message=>doc.defaultView?.confirm?.(message)===true;
 const clearComparison=()=>diff.replaceChildren();
 const showComparison=summary=>{
  clearComparison();
  const heading=doc.createElement('strong');
  heading.textContent=summary.totalChanges+' changement(s) · '+
   summary.added+' ajoutée(s) · '+summary.removed+' retirée(s) · '+
   summary.modified+' modifiée(s) · '+summary.unchanged+' inchangée(s)';
  diff.appendChild(heading);
  if(!summary.totalChanges)return;
  const list=doc.createElement('ul');
  const titles={added:'Ajoutée',removed:'Retirée',modified:'Modifiée'};
  const names={title:'titre',description:'consigne',levels:'niveaux',
   target:'destinataire',minutes:'durée'};
  for(const change of summary.details){
   const li=doc.createElement('li');
   li.textContent=titles[change.type]+' · '+change.id+
    (change.fields.length?' ('+change.fields.map(f=>names[f]).join(', ')+')':'');
   list.appendChild(li);
  }
  diff.appendChild(list);
  if(summary.totalChanges>summary.details.length){
   const more=doc.createElement('small');
   more.textContent=(summary.totalChanges-summary.details.length)+
    ' autre(s) changement(s) non détaillé(s).';
   diff.appendChild(more);
  }
 };
 const refresh=()=>{
  select.replaceChildren();
  const blank=doc.createElement('option');
  blank.value='';blank.textContent='Choisir une version';
  select.appendChild(blank);
  for(const item of [...archive.revisions].reverse()){
   const opt=doc.createElement('option');opt.value=item.id;
   opt.textContent=item.label+' · '+item.createdAt.slice(0,10)+
    ' · '+item.cards.length+' carte(s)';
   select.appendChild(opt);
  }
  const hasHistory=archive.revisions.length>0;
  count.textContent=archive.revisions.length+' / '+FUTURE_ARCHIVE_LIMIT+
   ' versions locales';
  restore.disabled=!hasHistory;
  exportBtn.disabled=!hasHistory;
  compare.disabled=!hasHistory;
  save.disabled=archive.revisions.length>=FUTURE_ARCHIVE_LIMIT;
 };
 refresh();
 select.addEventListener('change',clearComparison);
 compare.addEventListener('click',()=>{
  const id=select.value;
  if(!id){say('Choisir une version à comparer au brouillon.');return;}
  if(hasUnsavedForm()){
   say('Enregistre la carte en cours pour comparer le bon brouillon.');
   return;
  }
  try{
   const saved=recoverFutureArchiveRevision(archive,id);
   showComparison(compareFutureCardDrafts(saved,getCards()));
   say('Comparaison locale terminée. Aucune carte modifiée.');
  }catch(error){clearComparison();say(error.message);}
 });
  save.addEventListener('click',()=>{
  if(hasUnsavedForm()){
   say('Enregistre d’abord la carte en cours avant d’archiver le brouillon.');
   return;
  }
  try{
   const next=addFutureArchiveRevision(archive,getCards(),{
    createdAt:clock(),label:label.value
   });
   archive=next;unexported=true;refresh();clearComparison();
   say('Version sauvegardée en mémoire. Exporte l’historique JSON pour la conserver.');
  }catch(error){say(error.message);}
 });
 restore.addEventListener('click',()=>{
  const id=select.value;
  if(!id){say('Choisir une version à restaurer.');return;}
  try{
   const snapshot=recoverFutureArchiveRevision(archive,id);
   // The main editor owns the confirmation about overwriting its live draft.
   if(restoreCards(snapshot)!==true){
    say('Restauration annulée. Le brouillon et les versions sont conservés.');
    return;
   }
   clearComparison();
   say('Ancienne version restaurée dans le brouillon local. Les archives restent intactes.');
  }catch(error){say(error.message);}
 });
 exportBtn.addEventListener('click',()=>{
  if(!inspectFutureArchive(archive).valid||!archive.revisions.length){
   say('Aucun historique valide à exporter.');return;
  }
  const blob=new Blob([JSON.stringify(archive,null,2)],{
   type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
   const a=doc.createElement('a');a.href=url;
   a.download='loveroll-historique-cartes-'+clock().slice(0,10)+'.json';
   doc.body.appendChild(a);a.click();a.remove();
   unexported=false;
   say('Historique exporté en JSON. Aucune donnée envoyée au serveur.');
  }catch{say('Impossible de télécharger le fichier; les archives sont conservées.');}
  finally{setTimeout(()=>URL.revokeObjectURL(url),1500);}
 });
 file.addEventListener('change',()=>{
  request++;importBtn.disabled=false;
  say('Historique sélectionné. Appuyer sur Importer.');
 });
 importBtn.addEventListener('click',async()=>{
  const id=++request,upload=file.files?.[0];
  if(!upload){say('Sélectionner un fichier d’historique JSON.');return;}
  if(!/\.json$/iu.test(upload.name)||upload.size<=0||
     upload.size>FUTURE_ARCHIVE_MAX_BYTES){
   say('Fichier JSON invalide ou supérieur à 8 Mo.');return;
  }
  importBtn.disabled=true;
  say('Lecture locale de l’historique…');
  try{
   const json=await upload.text();
   if(id!==request)return;
   if(new TextEncoder().encode(json).length>FUTURE_ARCHIVE_MAX_BYTES){
    say('Fichier trop volumineux.');return;
   }
   const candidate=JSON.parse(json.replace(/^\uFEFF/u,''));
   if(!inspectFutureArchive(candidate).valid){
    say('Historique incompatible ou endommagé. Les anciennes versions restent intactes.');
    return;
   }
   if(archive.revisions.length&&!confirm(
    'Remplacer la liste actuelle de versions locales ? Exporte-la d’abord.')){
    say('Import annulé. L’historique précédent est conservé.');return;
   }
   archive=clone(candidate);unexported=false;refresh();clearComparison();
   say('Historique importé : '+archive.revisions.length+
    ' version(s). Le brouillon actuel n’a pas changé.');
  }catch{
   if(id===request)say('Fichier d’historique illisible. Aucune version remplacée.');
  }finally{if(id===request)importBtn.disabled=false;}
 });
 doc.defaultView?.addEventListener?.('beforeunload',event=>{
  if(!unexported)return;
  event.preventDefault();event.returnValue='';
 });
 return {getArchive:()=>clone(archive),hasUnexported:()=>unexported,
  clearComparison};
}
