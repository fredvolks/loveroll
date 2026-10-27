// Éclat V2 09–12: strict scene presentation derived from the approved manuscript.
// No choices invented here, no generated story, no simulated RNG, no inferred consent.
// Server snapshots remain authoritative; unfinished mechanics stay unmounted.
import {ECLAT_V2_EDITORIAL} from './eclat-v2-editorial.mjs';
function chk(id,v){
 if(!Number.isInteger(id)||id<9||id>12)throw new RangeError('Coffrets 09–12 uniquement');
 if(v!==0&&v!==1)throw new RangeError('Variante V0 ou V1 uniquement');
 return ECLAT_V2_EDITORIAL[id-1];
}
function getRole(s,user,local){
 if(s?.content_version!==2||!['one','two'].includes(s.device_mode))throw new TypeError('Séance V2 requise');
 if(user!==s.role_a&&user!==s.role_b)throw new Error('Accès à ce couple refusé');
 if(s.device_mode==='two'){
  if(local!==null)throw new Error('Rôle non modifiable sur deux téléphones');
  return user===s.role_a?'A':'B';
 }
 if(user!==s.role_a||!['A','B'].includes(local))throw new Error('Passage protégé du téléphone requis');
 return local;
}
function sourceTable(game,heading){
 const table=game.tables.find(t=>t.headers[0]===heading);
 if(!table)throw new Error('Table éditoriale manquante : '+heading);
 return table.rows;
}
function cardSet(game,version,length){
 const rows=sourceTable(game,'Carte');
 if(rows.length!==length)throw Error('Mauvais nombre de cartes officielles');
 return rows.map((r,i)=>{
  if(Number(r[0])!==i+1)throw Error('Numéros de cartes officiels incohérents');
  return Object.freeze({number:i+1,title:r[version+1].trim().replace(/^«\s*|\s*»$/g,'')});
 });
}
function safeList(values,max){
 if(!Array.isArray(values)||values.length>max||values.some(x=>!Number.isInteger(x)||x<1||x>12)||
    new Set(values).size!==values.length)throw new Error('Choix de cartes serveur invalide');
 return values;
}
function safeDice(s){
 const v=s.story_dice;
 if(v===null||v===undefined)return null;
 if(!v||!['decor','roles','constraint'].every(k=>Number.isInteger(v[k])&&v[k]>=1&&v[k]<=6))
  throw new Error('Tirages Éclat serveur invalides');
 return v;
}
const timeSeconds={
 1:[90,90],3:[120,120],4:[90,90],6:[180,120],7:[90,90]
};
export function eclatV2SceneC({session,viewerId,localDisplayRole=null}){
 const id=session?.coffret_id,version=session?.variant;
 const game=chk(id,version),role=getRole(session,viewerId,localDisplayRole);
 const n=session.chapter_number;
 if(!Number.isInteger(n)||n<1||n>8||!game.scenes[n-1])throw RangeError('Scène 09–12 inconnue');
 const source=game.scenes[n-1];
 const out={coffretId:id,title:game.title,sceneNumber:n,variant:version,
  variantName:'V'+version,role,type:source.type,instruction:source.instructions[version],
  number:session.chapter_index,total:session.chapter_total,budgetMinutes:session.budget_minutes};
 if(id===9){
  const cards=cardSet(game,version,12);
  if(n===1){
   out.cards=cards;out.selectionLimit=3;
   out.mySelection=session.device_mode==='two'?safeList(session.my_cards??[],3):[];
   out.myValidated=session.my_cards_ready===true;
   out.privacy='Seules les cartes communes peuvent être révélées après les deux validations.';
  }
  if([3,5,6,8].includes(n)){
   const common=safeList(session.common_cards??[],12).slice().sort((a,b)=>a-b);
   out.commonCards=common.map(i=>cards[i-1]);
   if(n===3)out.emptyOptions=common.length?[]:['Discuter cinq minutes','Continuer sans proposition'];
   const chosen=session.selected_card??null;
   if(chosen!==null&&!common.includes(chosen))throw Error('Carte choisie hors intersection');
   out.selectedCard=chosen===null?null:cards[chosen-1];
   if(n===5&&out.selectedCard)out.choices=['La vivre maintenant','En parler pour une autre fois','Passer'];
   if(n===6){
    out.proposal=out.selectedCard?
     'Vous avez choisi : '+out.selectedCard.title+'. Décidez ensemble de la façon de la vivre. Vous pouvez adapter, préférer une version sans contact ou passer.':
     'Choisissez une conversation calme ou un moment côte à côte sans contact; vous pouvez aussi passer.';
    out.contactAgreementRequired=out.selectedCard&&[7,8].includes(out.selectedCard.number);
    out.approvalRequired=!!out.selectedCard;
   }
   if(n===8)out.finales=['Une envie commune devient une invitation, à votre rythme.',
     'Le coffre peut se refermer sans rien dévoiler ni promettre.'];
  }
 }
 if(id===10){
  if(source.type==='Minuteur'){
   const pair=timeSeconds[n];
   if(!pair)throw Error('Durée de manche non autorisée');
   out.timerSeconds=pair[version];
   out.timerMode=session.timer_mode??null; // Await server-backed With/Without selection.
   out.timerModePending=out.timerMode===null;
   out.expiryText='Le temps indicatif est écoulé';
   out.afterExpiry=['Prolonger 1 minute','Voir la suite'];
   out.neverAutoComplete=true;
   if(n===4&&version===1)out.perPerson=true;
   if(n===6&&version===1)out.oralFinaleUntimed=true;
  }
  if([2,5,7].includes(n)&&Array.isArray(session.skipped_scenes)&&
     session.skipped_scenes.some(x=>x<n&&[1,3,4,6].includes(x)))
   out.fallback='Inventez maintenant une phrase de départ ensemble';
  if(n===8)out.finale=version===0?
   'Le temps a donné l’élan; vos idées peuvent continuer sans chronomètre.':
   'Votre improvisation est terminée. Le reste de la soirée vous appartient.';
 }
 if(id===11){
  out.cards=cardSet(game,version,3);
  if(n===2||n===5){
   out.preparationRole=n===2?'A':'B';
   out.preparationOptional=true;
  }
  if(n===3||n===6){
   out.proposer=n===3?'A':'B';
   out.receiver=n===3?'B':'A';
   out.allowedReplies=['Oui','Une autre proposition','Passer'];
   out.selectedCard=session.attention_card??null;
   if(out.selectedCard!==null&&![1,2,3].includes(out.selectedCard))
    throw Error('Carte attention serveur invalide');
   out.unlimitedAlternatives=true;
   out.contactChoice=version===0&&out.selectedCard===3;
   out.noAutoActivity=true;
  }
  if(n===8)out.finales=[
   'Une attention choisie peut suffire à transformer un moment ordinaire.',
   'Vous pouvez terminer ici et garder ce qui vous a fait du bien.'
  ];
 }
 if(id===12){
  const dice=safeDice(session);
  out.dicePending=dice===null;
  out.objective=version===0?'Retrouver une invitation perdue':'Préparer une surprise à ouvrir demain';
  out.noNewStoryGenerated=true;
  if(dice){
   const faces=sourceTable(game,'Valeur');
   if(faces.length!==6)throw Error('6 faces officielles requises');
   const decor=faces[dice.decor-1][version+1];
   const roles=faces[dice.roles-1][3].split(' / ');
   if(roles.length!==2)throw Error('Deux rôles fictifs requis');
   out.story={decor,roleA:roles[0],roleB:roles[1],
    constraint:faces[dice.constraint-1][4],draws:{...dice}};
   out.roleSwapped=n>=6||(n===5);
   out.shortRouteSwitch=n===6&&
    Array.isArray(session.chapter_plan)&&!session.chapter_plan.includes(5);
   out.reRollCount=session.constraint_rerolls??0;
   if(!Number.isInteger(out.reRollCount)||out.reRollCount<0)
    throw Error('Historique de relances invalide');
  }
  if(n===1||n===6){
   out.rerollConstraintOnly=true;
   out.rerollConsentRequired=true;
   if(n===6)out.choices=['Garder notre contrainte','Tirer une nouvelle contrainte','Jouer sans contrainte'];
  }
  if(n===8)out.finale=version===0?
   'L’invitation a trouvé ses deux personnages. Votre histoire peut se poursuivre hors écran.':
   'Votre surprise existe dans l’histoire que vous avez créée. Rien ne vous oblige à la transformer en promesse réelle.';
 }
 return Object.freeze(out);
}
