// Dedicated Éclat V2 Supabase gateway; deliberately NOT wired to live V1.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sessionId(value){
 if(typeof value!=='string'||!UUID.test(value))throw new TypeError('Séance invalide');
 return value;
}
function step(n){
 if(!Number.isInteger(n)||n<1||n>8)throw new RangeError('Étape invalide');
 return n;
}
function verify(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.access!=='boolean')
  throw new TypeError('Réponse Éclat invalide');
 if(!data.access)return Object.freeze({access:false,active:false});
 if(typeof data.active!=='boolean')throw new TypeError('État incomplet');
 if(data.active&&(data.content_version!==2||!UUID.test(String(data.session_id||''))))
  throw new TypeError('Séance V2 incohérente');
 return Object.freeze({...data});
}
export function createEclatV2SessionApi(client){
 if(!client||typeof client.rpc!=='function')throw new TypeError('Client requis');
 async function rpc(name,args){
  const res=await client.rpc(name,args);
  if(!res||res.error)throw res?.error||new Error('RPC indisponible');
  return verify(res.data);
 }
 return Object.freeze({
  status:(sid=null)=>rpc('love_eclat_v2_status',{p_session:sid===null?null:sessionId(sid)}),
  start:({coffretId,minutes,deviceMode,replayVariant=null})=>{
   if(!Number.isInteger(coffretId)||coffretId<1||coffretId>12||
    ![30,60,90].includes(minutes)||!['one','two'].includes(deviceMode)||
    (replayVariant!==null&&![0,1].includes(replayVariant)))
    throw new RangeError('Paramètres V2 invalides');
   return rpc('love_eclat_v2_start',{p_coffret:coffretId,p_minutes:minutes,p_device_mode:deviceMode,p_replay_variant:replayVariant});
  },
  ready:({sessionId:sid,expectedStep,ready})=>{
   if(typeof ready!=='boolean')throw new TypeError('Confirmation explicite requise');
   return rpc('love_eclat_v2_mark_ready',{p_session:sessionId(sid),p_expected_step:step(expectedStep),p_ready:ready});
  },
  reveal:({sessionId:sid,expectedStep,jointOral=false})=>{
   if(typeof jointOral!=='boolean')throw new TypeError('Accord explicite requis');
   return rpc('love_eclat_v2_reveal',{p_session:sessionId(sid),p_expected_step:step(expectedStep),p_joint_oral:jointOral});
  },
  contact:({sessionId:sid,expectedStep,proposal='mains',answer,jointOral=false})=>{
   if(proposal!=='mains'||!['yes','other','pass'].includes(answer)||typeof jointOral!=='boolean')
    throw new RangeError('Consentement de contact invalide');
   return rpc('love_eclat_v2_contact_answer',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_proposal:proposal,p_answer:answer,p_joint_oral:jointOral});
  },
  door:({sessionId:sid,expectedStep,door,jointOral=false})=>{
   if(!['Tendresse','Jeu','Mystère'].includes(door)||typeof jointOral!=='boolean')
    throw new RangeError('Choix de porte invalide');
   return rpc('love_eclat_v2_choose_door',{p_session:sessionId(sid),p_expected_step:step(expectedStep),
    p_door:door,p_joint_oral:jointOral});
  },
  musicNote:({sessionId:sid,expectedStep,title,artist=''})=>{
   if(typeof title!=='string'||!title.trim()||title.trim().length>120||
      typeof artist!=='string'||artist.length>120)throw new RangeError('Titre ou artiste invalide');
   return rpc('love_eclat_v2_music_note',{p_session:sessionId(sid),
     p_expected_step:step(expectedStep),p_title:title.trim(),p_artist:artist.trim()});
  },
  musicReveal:({sessionId:sid,expectedStep})=>rpc('love_eclat_v2_music_reveal',{
   p_session:sessionId(sid),p_expected_step:step(expectedStep)}),
  attentionPropose:({sessionId:sid,expectedStep,attention,jointOral=false})=>{
   if(![0,1,2].includes(attention)||typeof jointOral!=='boolean')
    throw new RangeError('Attention inconnue');
   return rpc('love_eclat_v2_attention_propose',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_attention:attention,p_joint_oral:jointOral});
  },
  attentionReply:({sessionId:sid,expectedStep,answer,jointOral=false})=>{
   if(!['yes','other','pass'].includes(answer)||typeof jointOral!=='boolean')
    throw new RangeError('Réponse attention inconnue');
   return rpc('love_eclat_v2_attention_reply',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_answer:answer,p_joint_oral:jointOral});
  },
  puzzle:({sessionId:sid,expectedStep,place=null,time=null,code=null})=>{
   if((place===null&&time===null&&typeof code==='string')||
      (typeof place==='string'&&typeof time==='string'&&code===null))
    return rpc('love_eclat_v2_puzzle_try',{p_session:sessionId(sid),
      p_expected_step:step(expectedStep),p_place:place,p_time:time,p_code:code});
   throw new RangeError('Lieu et heure, ou code, requis');
  },
  puzzleHelp:({sessionId:sid,expectedStep})=>rpc('love_eclat_v2_puzzle_help',{
   p_session:sessionId(sid),p_expected_step:step(expectedStep)}),
  predict:({sessionId:sid,expectedStep,answer,prediction})=>{
   if(![0,1,2].includes(answer)||![0,1,2].includes(prediction))
    throw new RangeError('Réponse et prédiction doivent être un des trois choix');
   return rpc('love_eclat_v2_predict',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_answer:answer,p_prediction:prediction});
  },
  act:({sessionId:sid,expectedStep,action})=>{
   if(!['pause','resume','pass','continue','stop'].includes(action))throw new RangeError('Action inconnue');
   return rpc('love_eclat_v2_act',{p_session:sessionId(sid),p_expected_step:step(expectedStep),p_action:action});
  }
 });
}
