// Server-backed player coordinator. Not registered in the V1 app or service worker.
// No response/private text is retained; only an ephemeral shared-phone display flag.
import {renderEclatV2PlayA} from './eclat-v2-play-ui.mjs';
import {eclatV2SceneB} from './eclat-v2-coffrets-b.mjs';
export function createEclatV2PlayController({root,api,viewerId,initialStatus,
 confirmStop=()=>globalThis.confirm?.('Arrêter cette séance sans la marquer terminée ?')===true,
 onError=()=>{}}){
 if(!root||typeof root.addEventListener!=='function'||!api||!viewerId||!initialStatus)
  throw new TypeError('Conteneur, client, compte et séance requis');
 let status=initialStatus,role=null,seen=new Set(),busy=false,disposed=false;
 let predictionDraft={answer:null,prediction:null},puzzleDraft={place:null,time:null,code:null},puzzleAttempt=null;
 const emptyShared=()=>({A:{answer:null,prediction:null},B:{answer:null,prediction:null}});
 let sharedAnswers=emptyShared(),sharedConfirmed=new Set(),sharedReveal=null;
 let musicDraft={title:null,artist:null},sharedMusicNotes={},sharedRevealedMusic=[];
 let cardDraft=initialStatus.my_cards||[];
 let sharedCardDraft={A:[],B:[]},sharedCardConfirmed=new Set();
 let playlistDraft=Array.isArray(initialStatus.my_playlist_slots)?
  [...initialStatus.my_playlist_slots]:[];
 let wishPhraseDraft=null;
 let timerAnchorMs=Date.now();
 // A delayed poll must never overwrite a newer real RPC action or a fresher
 // poll response when both technical seats act at nearly the same time.
 let stateRevision=0,refreshSequence=0;
 // Revoked access, replaced sessions and completed sessions must never
 // retain another player's private, unsubmitted or one-phone draft data.
 function clearPrivateSession(){
  role=null;seen=new Set();
  predictionDraft={answer:null,prediction:null};
  puzzleDraft={place:null,time:null,code:null};puzzleAttempt=null;
  sharedAnswers=emptyShared();sharedConfirmed.clear();sharedReveal=null;
  musicDraft={title:null,artist:null};sharedMusicNotes={};sharedRevealedMusic=[];
  cardDraft=[];sharedCardDraft={A:[],B:[]};sharedCardConfirmed.clear();
  playlistDraft=[];wishPhraseDraft=null;
 }
 const timedStatus=()=>{
  if(status.coffret_id!==10||!status.timer_running||
     !Number.isInteger(status.timer_remaining_seconds))return status;
  const left=Math.max(0,status.timer_remaining_seconds-
     Math.floor((Date.now()-timerAnchorMs)/1000));
  return {...status,timer_remaining_seconds:left,timer_expired:left===0};
 };
 const paint=()=>{if(!disposed)root.innerHTML=renderEclatV2PlayA({
  status:timedStatus(),viewerId,localRole:role,seenRoles:[...seen],predictionDraft,puzzleDraft,puzzleAttempt,
  sharedAnswers,sharedConfirmed:[...sharedConfirmed],sharedReveal,
  musicDraft,sharedMusicNotes,sharedRevealedMusic,
  cardDraft,sharedCardDraft,sharedCardConfirmed:[...sharedCardConfirmed],playlistDraft,wishPhraseDraft});};
 async function refresh(){
  if(disposed||busy)return false;
  const requestedSession=status.session_id;
  const requestedRevision=stateRevision,requestNumber=++refreshSequence;
  let updated;
  try{updated=await api.status(requestedSession);}
  catch(error){
   // Ordinary connectivity failures leave the working draft alone; a
   // revoked authenticated session MUST fail closed and erase local secrets.
   if([401,403].includes(Number(error?.status))||['42501','28000'].includes(error?.code)){
    if(!disposed&&!busy&&requestedRevision===stateRevision&&
       requestNumber===refreshSequence){
     clearPrivateSession();status={access:false,active:false};
     stateRevision++;paint();
    }
   }
   throw error;
  }
  // Never resurrect a deleted player view or apply network data that was
  // fetched before this user's latest server-side choice or chapter action.
  if(disposed||busy||requestedRevision!==stateRevision||
     requestNumber!==refreshSequence)return false;
  if(!updated?.access||updated.active===false){
   clearPrivateSession();status=updated||{access:false,active:false};
   stateRevision++;timerAnchorMs=Date.now();paint();return true;
  }
  if(updated.session_id!==requestedSession){
   clearPrivateSession();status={access:false,active:false};
   stateRevision++;paint();throw Error('Séance Éclat remplacée');
  }
  // The two phones poll frequently, including while users type optional
  // answers or songs. A byte-for-byte identical authoritative snapshot
  // does not justify destroying focused inputs and moving their cursor.
  // Access/session denial and finished states have already been handled
  // above, so this fast path never retains a revoked private screen.
  const identical=JSON.stringify(updated)===JSON.stringify(status);
  const changed=updated.chapter_index!==status.chapter_index||updated.substep_index!==status.substep_index;
  status=updated;timerAnchorMs=Date.now();
  if(identical)return true;
  if(updated.wish_invitation_text)wishPhraseDraft=null;
  if(updated.playlist_shared)playlistDraft=[];
  else if(updated.chapter_number===8&&Array.isArray(updated.my_playlist_slots))
   playlistDraft=[...updated.my_playlist_slots];
  if(changed){
   wishPhraseDraft=null;
   musicDraft={title:null,artist:null};
   role=null;seen=new Set();predictionDraft={answer:null,prediction:null};
   puzzleDraft={place:null,time:null,code:null};puzzleAttempt=null;
   sharedAnswers=emptyShared();sharedConfirmed=new Set();sharedReveal=null;
   cardDraft=updated.my_cards||[];sharedCardDraft={A:[],B:[]};sharedCardConfirmed=new Set();
   playlistDraft=Array.isArray(updated.my_playlist_slots)?[...updated.my_playlist_slots]:[];
  }
  paint();
  return true;
 }
 async function click(event){
  const button=event.target?.closest?.('[data-eclat-v2-action]');
  if(!button||!root.contains(button)||busy||disposed)return;
  const command=button.getAttribute('data-eclat-v2-action');
  if(!command)return;
  if(command==='hide-role'){role=null;musicDraft={title:null,artist:null};paint();return;}
  if(command.startsWith('playlist-toggle:')||
     command.startsWith('playlist-up:')||command.startsWith('playlist-down:')){
   if(status.coffret_id!==8||status.chapter_number!==8||status.state!=='active'||
      status.playlist_shared)return;
   const [action,raw]=command.split(':'),slot=Number(raw);
   if(!Number.isInteger(slot)||slot<1||slot>10)return;
   const entries=status.device_mode==='one'?sharedRevealedMusic:(status.revealed_music||[]);
   const hasSource=entries.some(e=>e.theme===(Math.floor((slot-1)/2)+1)&&
     (e.owner===(slot%2===1?'A':'B')||
       e.owner===(slot%2===1?status.role_a:status.role_b)));
   if(!hasSource)return;
   const index=playlistDraft.indexOf(slot);
   if(action==='playlist-toggle'){
    playlistDraft=index>=0?playlistDraft.filter(x=>x!==slot):
     playlistDraft.length<5?[...playlistDraft,slot]:playlistDraft;
   }else if(index>=0){
    const other=index+(action==='playlist-up'?-1:1);
    if(other>=0&&other<playlistDraft.length){
     playlistDraft=[...playlistDraft];
     [playlistDraft[index],playlistDraft[other]]=[playlistDraft[other],playlistDraft[index]];
    }
   }
   paint();return;
  }
  if(command.startsWith('wish-toggle:')){
   if(status.coffret_id!==9||status.chapter_number!==1||status.shared_cards!==null&&status.shared_cards!==undefined)return;
   const number=Number(command.slice('wish-toggle:'.length));
   if(!Number.isInteger(number)||number<1||number>12)return;
   if(status.device_mode==='one'){
    if(!role||sharedCardConfirmed.has(role))return;
    const current=sharedCardDraft[role]||[];
    sharedCardDraft={...sharedCardDraft,[role]:current.includes(number)?
      current.filter(x=>x!==number):current.length<3?[...current,number]:current};
   }else{
    if(status.my_cards_ready)return;
    cardDraft=cardDraft.includes(number)?cardDraft.filter(x=>x!==number):
      cardDraft.length<3?[...cardDraft,number]:cardDraft;
   }
   paint();return;
  }
  if(command==='wish-confirm-local'){
   if(status.coffret_id!==9||status.device_mode!=='one'||!role||sharedCardConfirmed.has(role))return;
   sharedCardConfirmed.add(role);role=null;paint();return;
  }
  if(command==='music-save'&&status.coffret_id===8&&status.device_mode==='one'){
   if(!role)return;
   const key=role+':'+status.music_theme;
   const existing=sharedMusicNotes[key]||{};
   const title=(musicDraft.title??existing.title??'').trim();
   const artist=(musicDraft.artist??existing.artist??'').trim();
   if(!title||title.length>120||artist.length>120)return;
   sharedMusicNotes={...sharedMusicNotes,[key]:{title,artist}};
   musicDraft={title:null,artist:null};paint();return;
  }
  if(command==='music-reveal'&&status.coffret_id===8&&status.device_mode==='one'){
   if(!role)return;
   const note=sharedMusicNotes[role+':'+status.music_theme];
   if(!note||!note.title)return;
   if(!sharedRevealedMusic.some(x=>x.owner===role&&x.theme===status.music_theme))
    sharedRevealedMusic=[...sharedRevealedMusic,{
     theme:status.music_theme,owner:role,title:note.title,artist:note.artist
    }];
   paint();return;
  }
  if(command.startsWith('puzzle-place:')||command.startsWith('puzzle-time:')||command.startsWith('puzzle-code:')){
   if(status.coffret_id!==6||status.state!=='active'||status.puzzle_solved)return;
   const [kind,...parts]=command.split(':'),value=parts.join(':');
   const key=kind==='puzzle-place'?'place':kind==='puzzle-time'?'time':'code';
   puzzleDraft={...puzzleDraft,[key]:value};puzzleAttempt=null;paint();return;
  }
  if(command.startsWith('answer:')||command.startsWith('prediction:')){
   if(status.coffret_id!==7||status.state!=='active'||status.revealed)return;
   const [key,index]=command.split(':'),value=Number(index);
   if(!['answer','prediction'].includes(key)||![0,1,2].includes(value))return;
   if(status.device_mode==='one'){
    if(!['A','B'].includes(role))return;
    sharedAnswers={...sharedAnswers,[role]:{...sharedAnswers[role],[key]:value}};
    sharedConfirmed.delete(role);
   }else predictionDraft={
    answer:predictionDraft.answer??status.my_answer??null,
    prediction:predictionDraft.prediction??status.my_prediction??null,
    [key]:value
   };
   paint();return;
  }
  if(command==='save-shared-prediction'){
   if(status.device_mode!=='one'||status.coffret_id!==7||!role)return;
   const choice=sharedAnswers[role];
   if(![0,1,2].includes(choice?.answer)||![0,1,2].includes(choice?.prediction))return;
   sharedConfirmed.add(role);role=null;paint();return;
  }
  if(command==='show-role:A'||command==='show-role:B'){
   if(status.device_mode!=='one'||viewerId!==status.role_a)return;
   role=command.endsWith(':A')?'A':'B';seen.add(role);paint();return;
  }
  if(command==='act:stop'&&!(await confirmStop()))return;
  busy=true;stateRevision++;
  try{
   const sid=status.session_id,idx=status.chapter_index;
   let next;
   if(command==='wish-phrase-save'){
    if(status.coffret_id!==9||status.chapter_number!==8||
      !status.wish_invitation_card||status.wish_invitation_text||
      status.device_mode==='one'&&role!=='A')return;
    const phrase=(wishPhraseDraft??status.my_wish_phrase??'').trim();
    if(!phrase||phrase.length>240)return;
    next=await api.wishPhrase({sessionId:sid,expectedStep:idx,phrase,
      jointOral:status.device_mode==='one'});
    wishPhraseDraft=null;
   }else if(command.startsWith('wish-choice:')){
    const choice=command.slice('wish-choice:'.length);
    if(status.coffret_id!==9||
      !['now','later','pass','participate','without-contact','with-contact','keep','finish'].includes(choice))return;
    if(status.device_mode==='one'&&role!=='A')return;
    next=await api.wishVote({sessionId:sid,expectedStep:idx,
      choice,jointOral:status.device_mode==='one'});
   }else if(command.startsWith('wish-contact:')){
    const answer=command.slice('wish-contact:'.length);
    if(status.coffret_id!==9||!['yes','no'].includes(answer))return;
    if(status.device_mode==='one'&&role!=='A')return;
    next=await api.wishContact({sessionId:sid,expectedStep:idx,
      yes:answer==='yes',jointOral:status.device_mode==='one'&&answer==='yes'});
   }else if(command==='playlist-vote'){
    if(status.coffret_id!==8||status.chapter_number!==8||
       status.device_mode!=='two'||playlistDraft.length<1||playlistDraft.length>5)return;
    next=await api.playlistVote({sessionId:sid,expectedStep:idx,slots:playlistDraft});
   }else if(command==='playlist-share-oral'){
    if(status.coffret_id!==8||status.chapter_number!==8||
      status.device_mode!=='one'||role!=='A'||playlistDraft.length<1||playlistDraft.length>5)return;
    const songs=playlistDraft.map(slot=>{
     const n=sharedRevealedMusic.find(e=>e.theme===(Math.floor((slot-1)/2)+1)&&
      e.owner===(slot%2===1?'A':'B'));
     return n?{title:n.title,artist:n.artist||''}:null;
    });
    if(songs.some(s=>!s))return;
    next=await api.playlistSharedPhone({sessionId:sid,expectedStep:idx,songs,jointOral:true});
   }else if(command==='wish-confirm'){
    if(status.coffret_id!==9||status.device_mode!=='two'||status.chapter_number!==1)return;
    next=await api.cardsSubmit({sessionId:sid,expectedStep:idx,cards:cardDraft});
   }else if(command==='wish-reveal-joint'){
    if(status.coffret_id!==9||status.device_mode!=='one'||role!=='A'||
      !sharedCardConfirmed.has('A')||!sharedCardConfirmed.has('B'))return;
    const common=sharedCardDraft.A.filter(n=>sharedCardDraft.B.includes(n)).sort((a,b)=>a-b);
    next=await api.cardsShared({sessionId:sid,expectedStep:idx,common,jointOral:true});
    sharedCardDraft={A:[],B:[]};sharedCardConfirmed.clear();role=null;
   }else if(command.startsWith('wish-vote:')){
    const card=Number(command.slice('wish-vote:'.length));
    if(status.coffret_id!==9||status.chapter_number!==3||
      !Number.isInteger(card)||card<1||card>12)return;
    next=await api.cardVote({sessionId:sid,expectedStep:idx,card,
     jointOral:status.device_mode==='one'});
   }else if(command.startsWith('timer-mode:')){
    const mode=command.slice('timer-mode:'.length);
    if(status.coffret_id!==10||!['with','without'].includes(mode))return;
    next=await api.timerMode({sessionId:sid,expectedStep:idx,mode,
      jointOral:status.device_mode==='one'});
   }else if(command.startsWith('timer-action:')){
    const action=command.slice('timer-action:'.length);
    if(status.coffret_id!==10||!['start','pause','resume','extend','next-turn'].includes(action))return;
    next=await api.timerAction({sessionId:sid,expectedStep:idx,action});
   }else if(command.startsWith('story-vote:')){
    const action=command.slice('story-vote:'.length);
    if(status.coffret_id!==12||!['keep','reroll','off'].includes(action))return;
    next=await api.storyVote({sessionId:sid,expectedStep:idx,
      expectedRerolls:status.constraint_rerolls,action,
      jointOral:status.device_mode==='one'});
   }else if(command==='music-save'){
    if(status.coffret_id!==8||status.device_mode!=='two')return;
    const title=(musicDraft.title??status.my_music_note?.title??'').trim();
    const artist=(musicDraft.artist??status.my_music_note?.artist??'').trim();
    if(!title||title.length>120||artist.length>120)return;
    next=await api.musicNote({sessionId:sid,expectedStep:idx,title,artist});
    musicDraft={title:null,artist:null};
   }else if(command==='music-reveal'){
    if(status.coffret_id!==8||status.device_mode!=='two')return;
    next=await api.musicReveal({sessionId:sid,expectedStep:idx});
    musicDraft={title:null,artist:null};
   }else if(command.startsWith('attention-propose:')){
    const attention=Number(command.slice('attention-propose:'.length));
    if(![5,11].includes(status.coffret_id)||![0,1,2].includes(attention))return;
    next=await api.attentionPropose({sessionId:sid,expectedStep:idx,attention,
       jointOral:status.device_mode==='one'});
   }else if(command.startsWith('attention-reply:')){
    const answer=command.slice('attention-reply:'.length);
    if(![5,11].includes(status.coffret_id)||!['yes','other','pass'].includes(answer))return;
    next=await api.attentionReply({sessionId:sid,expectedStep:idx,answer,
       jointOral:status.device_mode==='one'});
   }else if(command==='puzzle-help'){
    next=await api.puzzleHelp({sessionId:sid,expectedStep:idx});puzzleAttempt=null;
   }else if(command==='puzzle-submit'){
    if(status.coffret_id!==6)return;
    next=await api.puzzle({sessionId:sid,expectedStep:idx,...puzzleDraft});
    puzzleAttempt=next.correct===true;
   }else if(command==='save-prediction'){
    if(![0,1,2].includes(predictionDraft.answer)||![0,1,2].includes(predictionDraft.prediction))return;
    next=await api.predict({sessionId:sid,expectedStep:idx,
      answer:predictionDraft.answer,prediction:predictionDraft.prediction});
   }else if(command.startsWith('act:'))
    next=await api.act({sessionId:sid,expectedStep:idx,action:command.slice(4)});
   else if(command==='ready:true'||command==='ready:false')
    next=await api.ready({sessionId:sid,expectedStep:idx,ready:command==='ready:true'});
   else if(command==='reveal'||command==='reveal-oral'){
    let pendingShared=null;
    if(command==='reveal-oral'&&status.coffret_id===7){
     if(role!=='A'||!sharedConfirmed.has('A')||!sharedConfirmed.has('B'))return;
     const question=eclatV2SceneB({session:status,viewerId,localDisplayRole:'A'}).questions[0];
     pendingShared={question:question.number,options:question.options,
       players:{A:{...sharedAnswers.A},B:{...sharedAnswers.B}}};
    }
    next=await api.reveal({sessionId:sid,expectedStep:idx,jointOral:command==='reveal-oral'});
    if(pendingShared)sharedReveal=pendingShared;
   }
   else if(command.startsWith('contact:')){
    const answer=command.slice(8);
    if(!['yes','other','pass'].includes(answer))return;
    next=await api.contact({sessionId:sid,expectedStep:idx,proposal:'mains',
      answer,jointOral:status.device_mode==='one'&&answer==='yes'});
   }else if(command.startsWith('door:')){
    const door=command.slice(5);
    if(!['Tendresse','Jeu','Mystère'].includes(door))return;
    next=await api.door({sessionId:sid,expectedStep:idx,door,jointOral:status.device_mode==='one'});
   }else return;
   if(next.session_id!==sid)throw Error('Réponse d’une séance différente');
   if(next.chapter_index!==idx||next.substep_index!==status.substep_index){
    role=null;seen=new Set();predictionDraft={answer:null,prediction:null};
    puzzleDraft={place:null,time:null,code:null};puzzleAttempt=null;
    sharedAnswers=emptyShared();sharedConfirmed=new Set();
    musicDraft={title:null,artist:null};
    cardDraft=next.my_cards||[];sharedCardDraft={A:[],B:[]};sharedCardConfirmed.clear();
   }
   if(next.revealed && status.device_mode==='one')role=null;
   status=next;stateRevision++;timerAnchorMs=Date.now();
   if(next.wish_invitation_text)wishPhraseDraft=null;
   if(next.playlist_shared){
    playlistDraft=[];
    if(status.device_mode==='one'){sharedMusicNotes={};sharedRevealedMusic=[];musicDraft={title:null,artist:null};}
   }
   if(!next.active){
    // A complete or stopped session is no longer a private editor. Erase
    // every transient A/B draft, including the currently displayed role.
    clearPrivateSession();
   }
   paint();
  }catch(err){
   // Revocation can arrive first as a rejected gameplay action rather than
   // through the next read-only poll. The old private scene must disappear
   // immediately, while an ordinary offline error preserves unsent drafts.
   if([401,403].includes(Number(err?.status))||['42501','28000'].includes(err?.code)){
    clearPrivateSession();status={access:false,active:false};
    stateRevision++;paint();
   }
   onError(err);
  }finally{busy=false;}
 }
 function input(event){
  const element=event.target;
  if(disposed||status.state!=='active'||!element?.getAttribute)return;
  const k=element.getAttribute('data-eclat-v2-input');
  if(k==='wish-phrase'&&status.coffret_id===9&&status.chapter_number===8){
   if(status.device_mode==='one'&&role!=='A')return;
   wishPhraseDraft=String(element.value).slice(0,240);
   return;
  }
  if(status.coffret_id!==8||k!=='music-title'&&k!=='music-artist')return;
  if(status.device_mode==='one'&&!['A','B'].includes(role))return;
  musicDraft={...musicDraft,[k==='music-title'?'title':'artist']:String(element.value).slice(0,120)};
  // Do not repaint on each keystroke: cursor/IME must remain stable.
 }
 const ticker=status.coffret_id===10?globalThis.setInterval?.(()=>{
  if(!disposed&&status.timer_running&&status.state==='active')paint();
 },1000):null;
 ticker?.unref?.();
 root.addEventListener('input',input);
 root.addEventListener('click',click);
 paint();
 return Object.freeze({refresh,destroy(){
  disposed=true;stateRevision++;refreshSequence++;
  if(ticker!==null&&ticker!==undefined)globalThis.clearInterval?.(ticker);
  root.removeEventListener('click',click);root.removeEventListener('input',input);
  clearPrivateSession();
  root.innerHTML='';
 },getStatus(){return status;}});
}
