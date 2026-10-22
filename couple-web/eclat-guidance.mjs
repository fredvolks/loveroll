// Authored directions for each of the 384 passages. The common story is the
// source of truth; legacy roles, shared by four unrelated variants, are not used.
// g: give clues, d: predict partner, s: exchange, c: create, x: experience,
// p: personal wishes (sharing is always optional).
const plans=[
 'gggg ggcs gggs ssss ggcc sxsS ddgx sccc',
 'gggc gggg ssgc ccsc dgcc xxxc sdss cccc',
 'xxcx sgxx scsc xxxx sscc xxxx scxs cccc',
 'ccgg gccc ssss cccc cccc xgsx sgcc cccc',
 'ssss ssss cccc cscg dsss xscs cccc cccc',
 'ggsg sscc cccg sgcc gggs sscc cccc cccc',
 'dddd dddd sdss ssss ddss sxss ccss sccc',
 'ccsc cccd xxxx ssss ggcc xxCx cccc cccc',
 'pppp pppp pppp pppc xxss pppp pppc psss',
 'scgc ggcc cccg xxxs cccc xsxx cgcc cccc',
 'cccc sxsc sssc gggc cccc xxxs ccss scsc',
 'gggc cccg ssss cccg ccgc xxsc cccc cccc'
].map(row=>row.toLowerCase().split(' '));

const guides={
 g:{label:'Ta réponse secrète',placeholder:'Écris ce que tu veux faire deviner…',steps:[
  'Prépare ta réponse en privé. Écris-la ici si tu le souhaites, puis prépare un indice qui ne la dévoile pas.',
  'La personne qui commence donne son indice à voix haute. L’autre propose une réponse; ajoutez un indice au besoin.',
  'Révèle la réponse à voix haute, puis échangez les rôles. Il n’y a ni points ni mauvaise réponse.'
 ]},
 d:{label:'Ton hypothèse',placeholder:'À ton avis, que répondrait ton partenaire ?',steps:[
  'Prépare ce que tu penses être la réponse de l’autre. Tu peux noter ton hypothèse ici.',
  'La personne qui commence annonce son hypothèse. Son partenaire raconte sa vraie réponse, sans chercher à gagner.',
  'Échangez les rôles pour que chacun découvre le point de vue de l’autre.'
 ]},
 s:{label:'Ta réponse',placeholder:'Un souvenir, une réponse ou quelques mots pour te préparer…',steps:[
  'Prends un instant pour préparer ta réponse à la consigne. Tu peux la noter ici, pour toi seulement.',
  'La personne qui commence partage sa réponse à voix haute; l’autre écoute puis répond à son tour.',
  'Prenez le temps d’en parler. Chacun décide librement de ce qu’il souhaite raconter.'
 ]},
 c:{label:'Ton idée',placeholder:'Note ton idée ou les mots que tu veux proposer…',steps:[
  'Imagine ta contribution à la consigne. Cette note peut t’aider à préparer ton idée.',
  'La personne qui commence propose une première idée. L’autre complète; alternez selon la consigne.',
  'Choisissez ensemble ce que vous retenez. Votre création se fait à voix haute, entre vous.'
 ]},
 x:{label:'Ton aide-mémoire',placeholder:'Facultatif : une préférence, une idée ou un détail à retenir…',steps:[
  'Lisez la consigne et choisissez ensemble comment la vivre. Écrire est facultatif.',
  'Faites le moment proposé à votre rythme. Pour tout contact, demandez et attendez l’accord de l’autre.',
  'Vous pouvez adapter, choisir une version sans contact ou passer. Aucune performance n’est attendue.'
 ]},
 p:{label:'Ton envie privée',placeholder:'Note seulement ce que tu souhaites garder pour toi…',steps:[
  'Choisis ton idée pour toi, sans obligation de l’écrire ni de la justifier.',
  'Propose seulement ce que tu acceptes de raconter à voix haute. Ta note n’est jamais transmise à l’autre.',
  'Ne retenez une proposition commune que si elle vous plaît aux deux. Un refus ou une pause reste possible.'
 ]}
};

export function eclatGuide(stage){
 const kind=plans[stage.coffret.id-1]?.[stage.chapterNumber-1]?.[stage.variantNumber];
 if(!guides[kind])throw Error('Consigne guidée Éclat manquante');
 const guide={...guides[kind],kind,steps:[...guides[kind].steps],clue:kind==='g'};
 if(stage.coffret.id===1&&stage.chapterNumber===1){
  guide.label=stage.variantNumber===3?'Ton lieu secret':'Choisir un souvenir';
  guide.placeholder=stage.variantNumber===3?'Quel endroit aimerais-tu retrouver à deux ?':'Quel moment as-tu choisi ? Quelques détails suffisent…';
 }
 return guide;
}

export function eclatNoteKey(status,userId){
 return status?.active&&status.session_id&&userId?[userId,status.session_id,status.chapter_index].join(':'):null;
}

export async function loadEclatNote(client,status,userId){
 const {data,error}=await client.from('love_eclat_private_notes')
  .select('note,clue,moment_done').eq('user_id',userId)
  .eq('session_id',status.session_id).eq('chapter_index',status.chapter_index);
 if(error)throw error;
 return data?.[0]||{note:'',clue:'',moment_done:false};
}

export async function saveEclatNote(client,status,userId,value){
 if(!eclatNoteKey(status,userId))throw Error('Aucun coffret actif');
 const note=String(value.note||''),clue=String(value.clue||'');
 if([...note].length>2000||[...clue].length>300)throw Error('La note ou l’indice est trop long.');
 const {error}=await client.from('love_eclat_private_notes').upsert({
  session_id:status.session_id,chapter_index:status.chapter_index,user_id:userId,
  note,clue,moment_done:value.moment_done===true
 },{onConflict:'session_id,chapter_index,user_id'});
 if(error)throw error;
}
