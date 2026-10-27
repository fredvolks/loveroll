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
 const paint=()=>{if(!disposed)root.innerHTML=renderEclatV2PlayA({
  status,viewerId,localRole:role,seenRoles:[...seen],predictionDraft,puzzleDraft,puzzleAttempt,
  sharedAnswers,sharedConfirmed:[...sharedConfirmed],sharedReveal});};
 async function refresh(){
  if(disposed)return;
  const updated=await api.status(status.session_id);
  if(updated.session_id!==status.session_id)throw Error('Séance Éclat remplacée');
  const changed=updated.chapter_index!==status.chapter_index||updated.substep_index!==status.substep_index;
  status=updated;
  if(changed){
   role=null;seen=new Set();predictionDraft={answer:null,prediction:null};
   puzzleDraft={place:null,time:null,code:null};puzzleAttempt=null;
   sharedAnswers=emptyShared();sharedConfirmed=new Set();sharedReveal=null;
  }
  paint();
 }
 async function click(event){
  const button=event.target?.closest?.('[data-eclat-v2-action]');
  if(!button||!root.contains(button)||busy||disposed)return;
  const command=button.getAttribute('data-eclat-v2-action');
  if(!command)return;
  if(command==='hide-role'){role=null;paint();return;}
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
  busy=true;
  try{
   const sid=status.session_id,idx=status.chapter_index;
   let next;
   if(command.startsWith('attention-propose:')){
    const attention=Number(command.slice('attention-propose:'.length));
    if(status.coffret_id!==5||![0,1,2].includes(attention))return;
    next=await api.attentionPropose({sessionId:sid,expectedStep:idx,attention,
       jointOral:status.device_mode==='one'});
   }else if(command.startsWith('attention-reply:')){
    const answer=command.slice('attention-reply:'.length);
    if(status.coffret_id!==5||!['yes','other','pass'].includes(answer))return;
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
   }
   if(next.revealed && status.device_mode==='one')role=null;
   status=next;paint();
  }catch(err){onError(err);}finally{busy=false;}
 }
 root.addEventListener('click',click);
 paint();
 return Object.freeze({refresh,destroy(){disposed=true;root.removeEventListener('click',click);},getStatus(){return status;}});
}
