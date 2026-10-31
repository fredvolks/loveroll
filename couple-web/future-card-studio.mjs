// Studio admin: validate a local JSON preview of the future 300-card deck.
// Does not contact Supabase, upload files, persist content or modify the live D100.
import {auditFuturePlayableCatalog,FUTURE_LEVELS} from './future-card-catalog.mjs';
const MAX_BYTES=1024*1024, MAX_ITEMS=1000, MAX_ERRORS=12;
const LEVEL_LABELS=Object.freeze({soft:'Soft',medium:'Medium',intense:'Intense'});

export function inspectFutureCardFile(cards){
 const counts=Object.fromEntries(FUTURE_LEVELS.map(level=>[level,
  {total:0,woman:0,man:0,both:0}]));
 if(!Array.isArray(cards))return {valid:false,total:0,counts,
  errors:['Le fichier doit contenir un tableau JSON de cartes.']};
 if(cards.length>MAX_ITEMS)return {valid:false,total:cards.length,counts,
  errors:['Trop de cartes. Un fichier de 1000 entrées maximum est autorisé.']};
 const audit=auditFuturePlayableCatalog(cards);
 return {valid:audit.valid,total:cards.length,counts:audit.counts,
  errors:audit.errors};
}

export function initFutureCardStudio(doc=document){
 const input=doc.getElementById('future-catalog-file');
 const button=doc.getElementById('future-catalog-check');
 const feedback=doc.getElementById('future-catalog-feedback');
 const output=doc.getElementById('future-catalog-result');
 if(!input||!button||!feedback||!output)return false;
 let request=0;
 const say=(message)=>{feedback.textContent=message;};
 const render=report=>{
  output.replaceChildren();
  const summary=doc.createElement('p');
  summary.className='future-catalog-summary';
  summary.textContent=report.valid?
   'Catalogue conforme sur le contenu. Publication non disponible.' :
   'Catalogue incomplet ou invalide : aucune publication possible.';
  output.appendChild(summary);
  const tiles=doc.createElement('div');
  tiles.className='future-catalog-levels';
  for(const level of FUTURE_LEVELS){
   const count=report.counts[level];
   const tile=doc.createElement('div');
   tile.className='future-catalog-level';
   const title=doc.createElement('strong');
   title.textContent=LEVEL_LABELS[level]+' : '+count.total+'/100';
   const audience=doc.createElement('small');
   audience.textContent='Femme '+count.woman+' · Homme '+count.man+
    ' · Les deux '+count.both;
   tile.appendChild(title);tile.appendChild(audience);tiles.appendChild(tile);
  }
  output.appendChild(tiles);
  if(report.errors.length){
   const heading=doc.createElement('p');
   heading.textContent=report.errors.length+' anomalie(s) détectée(s) :';
   output.appendChild(heading);
   const list=doc.createElement('ul');
   for(const error of report.errors.slice(0,MAX_ERRORS)){
    const item=doc.createElement('li');
    item.textContent=error; // Never interpret titles/IDs/JSON as HTML.
    list.appendChild(item);
   }
   output.appendChild(list);
   if(report.errors.length>MAX_ERRORS){
    const more=doc.createElement('p');
    more.textContent=(report.errors.length-MAX_ERRORS)+
     ' autre(s) anomalie(s). Corriger puis réimporter.';
    output.appendChild(more);
   }
  }
 };
 input.addEventListener('change',()=>{
  request++;output.replaceChildren();button.disabled=false;
  say('Fichier changé : appuyer sur « Analyser les cartes ».');
 });
 button.addEventListener('click',async()=>{
  const id=++request, file=input.files?.[0];
  output.replaceChildren();
  if(!file){say('Choisir un fichier JSON avant de lancer l’analyse.');return;}
  if(!/\.json$/iu.test(file.name)||file.size===0||file.size>MAX_BYTES){
   say('Le fichier doit être un JSON non vide de 1 Mo maximum.');return;
  }
  button.disabled=true;say('Analyse locale en cours…');
  try{
   const raw=await file.text();
   if(id!==request)return;
   if(raw.length>MAX_BYTES){say('Fichier trop volumineux.');return;}
   const parsed=JSON.parse(raw.replace(/^\uFEFF/u,''));
   const report=inspectFutureCardFile(parsed);
   if(id!==request)return;
   render(report);
   say(report.valid?'Catalogue vérifié localement. Aucun envoi au serveur.' :
    'Corriger le fichier puis relancer une validation.');
  }catch{
   if(id===request)say('JSON illisible ou endommagé. Vérifier le format.');
  }finally{
   if(id===request)button.disabled=false;
  }
 });
 return true;
}
if(typeof document!=='undefined')initFutureCardStudio(document);
