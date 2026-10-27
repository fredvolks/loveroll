// Éclat V2 — scenarios 05–08, derived only from the signed-off 12-coffret manuscript.
// Client content is not a secret store: authored clues are shown per authenticated viewer.
// Player answers and reveal decisions must be persisted by guarded V2 server RPCs.
import {ECLAT_V2_EDITORIAL} from './eclat-v2-editorial.mjs';
const optional=(text)=>String(text||'').trim().replace(/^«\s*|\s*»$/g,'').trim();
const use=(s,regex,name)=>{
 const matches=[...s.matchAll(regex)].map(m=>m.slice(1));
 if(!matches.length)throw Error('Éditorial Éclat manquant : '+name);
 return matches;
};
const assertVariant=(v)=>{if(v!==0&&v!==1)throw new RangeError('Variante 05–08 invalide');return v;};
const row=(game,name,key)=>{const t=game.tables.find(t=>t.headers[0]===name);if(!t)throw Error('Table approuvée manquante');const r=t.rows.find(x=>x[0]===key);if(!r)throw Error('Ligne approuvée manquante : '+key);return r;};
const role=(s,viewer,local)=>{
 if(s?.content_version!==2||!['one','two'].includes(s.device_mode))throw new TypeError('Séance V2 requise');
 if(![s.role_a,s.role_b].includes(viewer))throw new Error('Accès au couple refusé');
 if(s.device_mode==='two'){
  if(local!==null)throw new Error('Rôle local interdit sur deux appareils');
  return viewer===s.role_a?'A':'B';
 }
 if(viewer!==s.role_a||!['A','B'].includes(local))throw new Error('Remise de téléphone nécessaire');
 return local;
};
const sceneNumber=(s)=>{if(!Number.isInteger(s.chapter_number)||s.chapter_number<1||s.chapter_number>8)throw new RangeError('Scène invalide');return s.chapter_number;};
const activeSubstep=(s,total)=>{const n=s.substep_index??1;if(!Number.isInteger(n)||n<1||n>total)throw new RangeError('Sous-étape invalide');return n;};
const sourceVariants=(game,pattern,name)=>{
 const m=use(game.source,pattern,name);
 if(m.length!==2)throw Error('La source doit contenir V0 et V1 : '+name);
 return m;
};
function investigation(game,v){
 const source=game.source;
 const variantBlocks=source.split(/(?:^|\n)V[01] — \*\*/m).slice(1);
 if(variantBlocks.length!==2)throw Error('Deux dossiers approuvés requis');
 const b=variantBlocks[v];
 const first=(p,name)=>use(b,p,name)[0];
 const a=first(/- Indice privé A : «([^»]+)»/g,'Indice A')[0].trim();
 const bSecret=first(/- Indice privé B : «([^»]+)»/g,'Indice B')[0].trim();
 const places=first(/Tableau des lieux V[01] : ([^\n]+)\./g,'Lieux')[0]
  .split('; ').map(item=>({name:item.split(' = ')[0],clues:item.split(' = ')[1]}));
 const codes=first(/Codes proposés : \*\*([0-9 ]+\/[0-9 /]+)\*\*/g,'Codes')[0].split(' / ');
 const [place,time,code]=first(/- Solution : \*\*([^*]+)\*\*/g,'Solution')[0].split(' · ');
 const letter=first(/- Lettre finale : «([^»]+)»/g,'Lettre')[0];
 const opening=first(/Message d’ouverture : «([^»]+)»/g,'Ouverture')[0];
 return {A:a,B:bSecret,places,codes,solution:{place,time,code},letter,opening};
}
const answerRows=(game,v,prefix,indexes)=>{
 const table=game.tables.find(t=>t.headers[0]===prefix);
 if(!table)throw Error('Table de questions manquante');
 return indexes.map(n=>{
  const cells=table.rows.find(x=>x[0]===(prefix==='Question'?'Q'+n:'T'+n));
  if(!cells)throw Error('Question approuvée absente : '+n);
  const text=cells[v+1];
  if(prefix==='Thème')return {number:n,theme:text};
  const m=text.match(/^«([^»]+)»\s*(.+)$/);
  if(!m)throw Error('Question/options approuvés non conformes');
  const options=m[2].split(' / ').map(s=>s.trim());
  if(options.length!==3||options.some(o=>!o))throw Error('Exactement trois réponses approuvées');
  return {number:n,prompt:m[1],options};
 });
};
function variantsInstruction(raw,v){
 const matched=raw.match(/^V0\s*:\s*«([^»]+)»\s*V1\s*:\s*«([^»]+)»/s);
 return matched?matched[v+1]:optional(raw);
}
const pairScenes={7:{1:[1],3:[2,3],6:[4,5]},8:{1:[1],3:[2,3],6:[4,5]}};
export function eclatV2SceneB({session,viewerId,localDisplayRole=null}){
 const id=session?.coffret_id,v=assertVariant(session?.variant);
 if(!Number.isInteger(id)||id<5||id>8)throw new RangeError('Coffret 05–08 requis');
 const game=ECLAT_V2_EDITORIAL[id-1],n=sceneNumber(session),me=role(session,viewerId,localDisplayRole);
 const src=game.scenes[n-1];
 const out={coffretId:id,title:game.title,sceneNumber:n,variant:v,role:me,
  type:src.type,instruction:variantsInstruction(src.instructions[v],v),
  number:session.chapter_index,total:session.chapter_total,
  budgetMinutes:session.budget_minutes,variantName:'V'+v};
 if(id===5){
  if([3,5].includes(n)){
   const questions=n===3?['Question A','Question B']:['Question C'];
   out.questions=questions.map(k=>({name:k,text:optional(row(game,'Donnée',k)[v+1])}));
  }
  if(n===6){
   out.attentions=row(game,'Donnée','Attention proposée A')[v+1].split(' / ');
   if(out.attentions.length!==3)throw Error('Trois attentions officielles requises');
   out.turn=activeSubstep(session,2)===1?'A':'B';
   out.substepIndex=activeSubstep(session,2);out.substepTotal=2;
   out.responseChoices=['Oui','Une autre proposition','Passer'];
   out.noPurchase=true;
  }
  if(n===8){
   out.endingOptions=['Imaginer notre prochain rendez-vous','Garder une phrase de ce soir','Terminer ici'];
   out.finale='Vous vous connaissez déjà, mais il reste des façons de vous retrouver. Ce rendez-vous peut se terminer sans promesse.';
  }
 }
 if(id===6){
  const dossier=investigation(game,v);
  out.privateMission=dossier[me];out.privateLabel='DOSSIER '+me;
  out.allowClueReread=true;
  if(n===1){
   out.opening=dossier.opening;out.places=dossier.places;
  }
  if(n===2)out.bonus=v===0?{cipher:'14-15-21-19',key:'A=1…Z=26',solution:'NOUS'}:
   {cipher:'4-5-21-24',key:'A=1…Z=26',solution:'DEUX'};
  if(n===3){
   out.puzzle={kind:'place-time',places:dossier.places.map(x=>x.name),
    times:v===0?['21 h 10','21 h 20','21 h 30','21 h 40']:
      ['20 h 15','20 h 30','20 h 45','21 h 00'],
    firstHelp:'Cherchez le lieu qui possède les deux éléments de vos dossiers. Additionnez le délai à l’heure du signal.',
    solution:{place:dossier.solution.place,time:dossier.solution.time}};
  }
  if(n===5)out.bonus=v===0?{cipher:'ERTTEL AL ERVUO',solution:'OUVRE LA LETTRE'}:
    {cipher:'NIDRAJ EL SNAD',solution:'DANS LE JARDIN'};
  if(n===6)out.puzzle={kind:'code',codes:dossier.codes,
    firstHelp:'Éliminez les codes qui ne contiennent pas les deux chiffres indiqués.',
    solution:{code:dossier.solution.code}};
  if(n===8){
   out.investigationFinal={...dossier.solution,letter:dossier.letter,
    assistance:session.puzzle_helped===true||(Array.isArray(session.skipped_scenes)&&session.skipped_scenes.some(x=>[2,3,5,6].includes(x)))};
  }
 }
 if(id===7){
  const indexes=pairScenes[7][n];
  if(indexes){
   const sub=activeSubstep(session,indexes.length);
   out.substepIndex=sub;out.substepTotal=indexes.length;
   out.questions=answerRows(game,v,'Question',[indexes[sub-1]]);
   out.secretComparison=true;out.noScores=true;
   // The server MUST not give private answers before both people are ready.
   out.myAnswer=session.my_answer??null;
   out.myPrediction=session.my_prediction??null;
   out.bothReady=session.both_ready===true;
   out.revealed=session.revealed===true;
   // This payload exists only after the guarded RPC has finished the joint reveal.
   // It may describe the previous Q when scene 3/6 advances to substep 2.
   if(session.reveal_answers && typeof session.reveal_answers==='object'){
    out.revealAnswers=session.reveal_answers;
    const revealedId=Number(session.reveal_answers.question);
    if(Number.isInteger(revealedId)&&revealedId>=1&&revealedId<=5)
     out.revealedQuestion=answerRows(game,v,'Question',[revealedId])[0];
   }
  }
  if(n===8)out.finale='Vous n’avez pas besoin de penser pareil pour continuer à vous découvrir.';
 }
 if(id===8){
  const indexes=pairScenes[8][n];
  if(indexes){
   const sub=activeSubstep(session,indexes.length);
   out.substepIndex=sub;out.substepTotal=indexes.length;
   out.themes=answerRows(game,v,'Thème',[indexes[sub-1]]);
   out.maxClues=3;out.maxGuesses=2;
   out.noMusicPlayback=true;
  }
  if(n===5)out.listeningChoices=[
   'Écouter un titre que nous avons choisi (source musicale externe démarrée volontairement)',
   'Raconter la scène en silence musical'
  ];
  if(n===8){
   out.playlistLimit=5;
   out.finale=v===0?'Votre histoire possède maintenant quelques titres à retrouver.':
    'Votre prochaine aventure possède maintenant sa bande originale.';
   out.noMusicPlayback=true;
  }
 }
 return Object.freeze(out);
}
