// Server-backed player coordinator. Not registered in the V1 app or service worker.
// No response/private text is retained; only an ephemeral shared-phone display flag.
import {renderEclatV2PlayA} from './eclat-v2-play-ui.mjs';
export function createEclatV2PlayController({root,api,viewerId,initialStatus,
 confirmStop=()=>globalThis.confirm?.('Arrêter cette séance sans la marquer terminée ?')===true,
 onError=()=>{}}){
 if(!root||typeof root.addEventListener!=='function'||!api||!viewerId||!initialStatus)
  throw new TypeError('Conteneur, client, compte et séance requis');
 let status=initialStatus,role=null,seen=new Set(),busy=false,disposed=false;
 const paint=()=>{if(!disposed)root.innerHTML=renderEclatV2PlayA({
  status,viewerId,localRole:role,seenRoles:[...seen]});};
 async function refresh(){
  if(disposed)return;
  const updated=await api.status(status.session_id);
  if(updated.session_id!==status.session_id)throw Error('Séance Éclat remplacée');
  const changed=updated.chapter_index!==status.chapter_index||updated.substep_index!==status.substep_index;
  status=updated;
  if(changed){role=null;seen=new Set();}
  paint();
 }
 async function click(event){
  const button=event.target?.closest?.('[data-eclat-v2-action]');
  if(!button||!root.contains(button)||busy||disposed)return;
  const command=button.getAttribute('data-eclat-v2-action');
  if(!command)return;
  if(command==='hide-role'){role=null;paint();return;}
  if(command==='show-role:A'||command==='show-role:B'){
   if(status.device_mode!=='one'||viewerId!==status.role_a)return;
   role=command.endsWith(':A')?'A':'B';seen.add(role);paint();return;
  }
  if(command==='act:stop'&&!(await confirmStop()))return;
  busy=true;
  try{
   const sid=status.session_id,idx=status.chapter_index;
   let next;
   if(command.startsWith('act:'))
    next=await api.act({sessionId:sid,expectedStep:idx,action:command.slice(4)});
   else if(command==='ready:true'||command==='ready:false')
    next=await api.ready({sessionId:sid,expectedStep:idx,ready:command==='ready:true'});
   else if(command==='reveal'||command==='reveal-oral')
    next=await api.reveal({sessionId:sid,expectedStep:idx,jointOral:command==='reveal-oral'});
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
   if(next.chapter_index!==idx||next.substep_index!==status.substep_index){role=null;seen=new Set();}
   if(next.revealed && status.device_mode==='one')role=null;
   status=next;paint();
  }catch(err){onError(err);}finally{busy=false;}
 }
 root.addEventListener('click',click);
 paint();
 return Object.freeze({refresh,destroy(){disposed=true;root.removeEventListener('click',click);},getStatus(){return status;}});
}
