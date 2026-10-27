// Four fully authored Éclat V2 games: the approved manuscript is the ONLY narrative source.
// No randomized scene, scoring, inference of a person's wishes, or local persistence of answers.
// This pure model is presentation only: server is authoritative for current state and entitlements.
import {ECLAT_V2_EDITORIAL} from './eclat-v2-editorial.mjs';

const DOORS=Object.freeze(['Tendresse','Jeu','Mystère']);
const sceneOrder={1:{1:[1],3:[2],6:[3,4],8:[5]}};
const own=(x,n)=>Object.prototype.hasOwnProperty.call(x,n);
const variant=(index)=>{if(index!==0&&index!==1)throw new RangeError('Variante Éclat inconnue');return index;};
const approved=(id)=>{if(!Number.isInteger(id)||id<1||id>4)throw new RangeError('Coffret 01–04 seulement');return ECLAT_V2_EDITORIAL[id-1];};
const table=(c,title)=>{const t=c.tables.find(t=>t.headers[0]===title);if(!t)throw Error('Données éditoriales introuvables : '+title);return t;};
const clean = s=>String(s||'').trim().replace(/^«\s*|\s*»$/g,'').trim();
const alt=(line,v)=>{
 const s=String(line).trim();
 const pattern=/^V0\s*:\s*«([^»]*)»\s*V1\s*:\s*«([^»]*)»$/s;
 const m=pattern.exec(s);return m?m[v+1]:clean(s);
};
const between=(s)=>String(s).split(/\s+\/\s+/).map(x=>clean(x));
const aB=(text)=>{
 const [a,b]=String(text).split(/;\s*B /);
 if(!b)throw Error('Missions A/B incomplètes');
 return {A:a.replace(/^A /,'').trim(),B:'B '+b.trim()};
};
const roleOf=(session,viewerId,localDisplayRole)=>{
 if(!session||session.content_version!==2||!['one','two'].includes(session.device_mode))
  throw new TypeError('Séance Éclat V2 authentifiée requise');
 if(viewerId!==session.role_a&&viewerId!==session.role_b)throw new Error('Accès au couple refusé');
 if(session.device_mode==='two'){
  if(localDisplayRole!==null&&localDisplayRole!==undefined)
   throw new Error('Changement de rôle interdit sur deux téléphones');
  return viewerId===session.role_a?'A':'B';
 }
 // Shared phone: only an authenticated A may intentionally show B's local
 // FICTION mission after a physical handover; no RPC can impersonate B.
 if(viewerId!==session.role_a)throw new Error('Mode téléphone partagé réservé au créateur');
 if(!['A','B'].includes(localDisplayRole))throw new Error('Écran privé masqué tant que le téléphone n’est pas passé');
 return localDisplayRole;
};
export function eclatV2SceneA({session,viewerId,localDisplayRole=null}){
 const coffret=approved(session?.coffret_id);
 const v=variant(session.variant);
 const no=session.chapter_number;
 if(!Number.isInteger(no)||no<1||no>8)throw new RangeError('Scène invalide');
 const role=roleOf(session,viewerId,localDisplayRole);
 const source=coffret.scenes[no-1];
 const out={coffretId:coffret.id,title:coffret.title,sceneNumber:no,variant:v,
  type:source.type,instruction:alt(source.instructions[v],v),
  role,number:session.chapter_index,total:session.chapter_total,
  budgetMinutes:session.budget_minutes,variantName:v===0?'V0':'V1'};
 if(coffret.id===1){
  const numbers=sceneOrder[1][no]||[];
  const rows=table(coffret,'Enveloppe').rows;
  out.envelopes=numbers.map(n=>({number:n,theme:rows[n-1][v+1],
   first:n%2===1?'A':'B',clueLimit:3,guessLimit:2,
   skipped:Array.isArray(session.skipped_scenes)&&session.skipped_scenes.includes(no)}));
  if(no===8)out.finales=[
   'Cinq enveloppes, et un nouveau moment à vous. Votre prochaine invitation reste un choix, jamais une obligation.',
   'Vos secrets ont ouvert la conversation. Vous pouvez refermer le coffret sans rien promettre.'
  ];
 }
 if(coffret.id===2){
  const t=table(coffret,'Donnée').rows;
  const get=label=>{const row=t.find(x=>x[0]===label);if(!row)throw Error('Donnée approuvée manquante '+label);return row[v+1];};
  if(no===1||no===3){
   const first=get('Manche 1').match(/«([^»]+)»/g)?.map(s=>s.slice(1,-1).trim());
   if(!first||first.length!==2)throw Error('Mots des deux missions invalides');
   const target=role==='A'?first[no===3?1:0]:first[no===3?0:1];
   out.privateMission='Faire prononcer « '+target+' » à '+(role==='A'?'B':'A');
   out.constraint=get('Contrainte M1');
   out.scene3SwapsTargets=no===3;
  }
  if(no===6){
   const two=aB(get('Manche 2'));
   out.privateMission=two[role];
   out.constraint=get('Contrainte M2');
   out.fallback='Si les objets manquent, reprenez la mission orale de la scène 3 avec les mêmes cibles.';
  }
  if(no===7)out.bonus=get('Bonus long');
  if(no===8)out.finale='Le double jeu est dévoilé. Ce qui compte reste votre façon de jouer ensemble.';
 }
 if(coffret.id===3){
  if(no===1)out.optionalObjects=v===0?
   ['tissu doux','petit objet lisse','verre ou tasse vide']:
   ['feuille de papier','petit objet familier','coussin'];
  if(no===6)out.choices=[
   {id:'textures',label:'Comparer vos textures',requiresContact:false,
    description:'Chacun présente un objet ou sa description pendant un tour.'},
   {id:'mains',label:'Proposer un massage des mains',requiresContact:true,
    description:'Accord des deux obligatoire. Deux minutes par personne, arrêt immédiat sur demande. Sans contact : décrire la texture.'},
   {id:'silence',label:'Rester côte à côte en silence',requiresContact:false,
    description:'Deux minutes indicatives, sans contact requis.'}
  ];
  if(no===8)out.finale=v===0?
   'Votre refuge a maintenant une lumière, un son et une texture. Il peut vous retrouver quand vous le souhaitez.':
   'Votre escale existe dans vos trois choix. Vous pouvez y revenir sans avoir à partir.';
 }
 if(coffret.id===4){
  out.doors=DOORS;
  const saved=session.branch;
  if(saved!==null&&saved!==undefined&&!DOORS.includes(saved))throw Error('Branche serveur inconnue');
  // The only approved fallback: scene 1 was explicitly passed => Jeu.
  const skipped1=Array.isArray(session.skipped_scenes)&&session.skipped_scenes.includes(1);
  const selected=saved??(skipped1?'Jeu':null);
  out.branch=selected;
  if(no===1)out.choices=DOORS.map(name=>({id:name,label:v===1?'Allée '+name:name}));
  if(no===5)out.choices=selected?[
   {id:selected,label:'Garder notre porte : '+selected},
   ...DOORS.filter(d=>d!==selected).map(name=>({id:name,label:'Explorer '+name}))
  ]:[];
  if([3,6,8].includes(no)){
   if(!selected)out.awaitBranch=true;
   else{
    const row=table(coffret,'Branche').rows.find(x=>x[0]===selected);
    if(!row)throw Error('Activité de la branche manquante');
    const cell=no===3?row[1]:no===6?row[2]:row[3];
    const versions=between(cell);
    if(versions.length!==2)throw Error('Deux activités autorisées requises');
    out.branchActivity=versions[v];
    if(no===8)out.finale=versions[v];
   }
  }
  if(skipped1&&no!==1)out.fallback='La porte initiale a été passée : la branche Jeu est choisie, conformément aux règles.';
 }
 return Object.freeze(out);
}
export function eclatV2SceneNeedsAgreement({coffretId,sceneNumber,choice}){
 approved(coffretId);
 return coffretId===3&&sceneNumber===6&&choice==='mains';
}
