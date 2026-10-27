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
  timerMode:({sessionId:sid,expectedStep,mode,jointOral=false})=>{
   if(!['with','without'].includes(mode)||typeof jointOral!=='boolean')
    throw new RangeError('Mode minuteur invalide');
   return rpc('love_eclat_v2_timer_mode',{p_session:sessionId(sid),
      p_expected_step:step(expectedStep),p_mode:mode,p_joint_oral:jointOral});
  },
  timerAction:({sessionId:sid,expectedStep,action})=>{
   if(!['start','pause','resume','extend'].includes(action))throw new RangeError('Action minuteur inconnue');
   return rpc('love_eclat_v2_timer_action',{p_session:sessionId(sid),
      p_expected_step:step(expectedStep),p_action:action});
  },
  cardsSubmit:({sessionId:sid,expectedStep,cards})=>{
   if(!Array.isArray(cards)||cards.length>3||new Set(cards).size!==cards.length||
       cards.some(n=>!Number.isInteger(n)||n<1||n>12))
    throw new RangeError('Zéro à trois cartes uniques seulement');
   return rpc('love_eclat_v2_cards_submit',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_cards:cards});
  },
  cardsShared:({sessionId:sid,expectedStep,common,jointOral=false})=>{
   if(!Array.isArray(common)||common.length>3||new Set(common).size!==common.length||
       common.some(n=>!Number.isInteger(n)||n<1||n>12)||typeof jointOral!=='boolean')
    throw new RangeError('Intersection privée invalide');
   return rpc('love_eclat_v2_cards_shared',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_common:common,p_joint_oral:jointOral});
  },
  cardVote:({sessionId:sid,expectedStep,card,jointOral=false})=>{
   if(!Number.isInteger(card)||card<1||card>12||typeof jointOral!=='boolean')
    throw new RangeError('Carte commune invalide');
   return rpc('love_eclat_v2_card_vote',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_card:card,p_joint_oral:jointOral});
  },
  storyVote:({sessionId:sid,expectedStep,action,expectedRerolls,jointOral=false})=>{
   if(!['keep','reroll','off'].includes(action)||!Number.isInteger(expectedRerolls)||
      expectedRerolls<0||typeof jointOral!=='boolean')
    throw new RangeError('Action du récit ou compteur invalide');
   return rpc('love_eclat_v2_story_vote',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_action:action,
    p_expected_rerolls:expectedRerolls,p_joint_oral:jointOral});
  },
  wishPhrase:({sessionId:sid,expectedStep,phrase,jointOral=false})=>{
   if(typeof phrase!=='string'||!phrase.trim()||phrase.trim().length>240||
     typeof jointOral!=='boolean')throw new RangeError('Phrase commune invalide');
   return rpc('love_eclat_v2_wish_phrase',{p_session:sessionId(sid),
     p_expected_step:step(expectedStep),p_phrase:phrase.trim(),p_joint_oral:jointOral});
  },
  wishVote:({sessionId:sid,expectedStep,choice,jointOral=false})=>{
   if(!['now','later','pass','participate','without-contact','with-contact','keep','finish'].includes(choice)||
      typeof jointOral!=='boolean')throw new RangeError('Choix du coffre inconnu');
   return rpc('love_eclat_v2_wish_vote',{p_session:sessionId(sid),
     p_expected_step:step(expectedStep),p_choice:choice,p_joint_oral:jointOral});
  },
  wishContact:({sessionId:sid,expectedStep,yes,jointOral=false})=>{
   if(typeof yes!=='boolean'||typeof jointOral!=='boolean')
    throw new RangeError('Consentement de contact invalide');
   return rpc('love_eclat_v2_wish_contact_answer',{p_session:sessionId(sid),
     p_expected_step:step(expectedStep),p_yes:yes,p_joint_oral:jointOral});
  },
  playlistVote:({sessionId:sid,expectedStep,slots})=>{
   if(!Array.isArray(slots)||slots.length<1||slots.length>5||
     new Set(slots).size!==slots.length||
     slots.some(x=>!Number.isInteger(x)||x<1||x>10))
    throw new RangeError('Choisir un à cinq titres révélés distincts');
   return rpc('love_eclat_v2_playlist_vote',{p_session:sessionId(sid),
    p_expected_step:step(expectedStep),p_slots:slots});
  },
  playlistSharedPhone:({sessionId:sid,expectedStep,songs,jointOral=false})=>{
   if(!Array.isArray(songs)||songs.length<1||songs.length>5||jointOral!==true||
    songs.some(x=>!x||typeof x.title!=='string'||!x.title.trim()||x.title.length>120||
       (x.artist!==undefined&&typeof x.artist!=='string')||
       (x.artist||'').length>120||Object.keys(x).some(k=>!['title','artist'].includes(k))))
    throw new RangeError('Playlist consentie invalide');
   return rpc('love_eclat_v2_playlist_shared_phone',{p_session:sessionId(sid),
     p_expected_step:step(expectedStep),p_songs:songs.map(x=>({title:x.title.trim(),
       artist:(x.artist||'').trim()})),p_joint_oral:true});
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
