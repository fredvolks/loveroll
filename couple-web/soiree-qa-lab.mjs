// Independent QA-only Soirée player screens driven by the real V1 backend.
// A/B have separate auth JWTs. All dice faces come exclusively from server RPCs.
import {createSoireeQaGateway,validateSoireeQaPair} from './soiree-qa-gateway.mjs';
import {resolvedCard} from './evening-challenges.mjs';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const die=(side,face,sides,kind,enable3d=true)=>Number.isInteger(face)&&face>=1&&face<=sides
 ?'<div class="soiree-qa-die" aria-label="Résultat officiel '+sides+' faces : '+face+
  '">'+(enable3d?'<canvas data-soiree-qa-die="'+side+':'+kind+'" aria-hidden="true"></canvas>':'')+
  '<strong>Résultat officiel : '+face+'</strong></div>'
 :'<p>Aucun résultat enregistré.</p>';
const btn=(role,action,label,disabled=false)=>'<button type="button" data-soiree-qa-role="'+role+
 '" data-soiree-qa-action="'+action+'"'+(disabled?' disabled':'')+'>'+escapeHtml(label)+'</button>';
export function renderSoireeQaScreen({role,snapshot,partnerId}){
 if(!['A','B'].includes(role)||!snapshot)throw new TypeError('Écran QA invalide');
 const own=snapshot.personal.find(p=>p.user_id===snapshot.userId)?.face??null;
 const theirs=snapshot.personal.find(p=>p.user_id===partnerId)?.face??null;
 const weeks=(snapshot.weekly||[]).filter(w=>Number.isInteger(w.face)&&w.face>=1&&w.face<=6);
 const latest=weeks.sort((a,b)=>String(b.key).localeCompare(String(a.key)))[0]||null;
 let html='<div class="soiree-qa-person"><h4>Joueur '+role+' · serveur officiel</h4>'+
  '<p>Identité QA : '+escapeHtml(snapshot.userId.slice(0,8))+'</p></div>';
 html+='<div class="soiree-qa-round"><h5>D6 de la semaine</h5>'+
  die(role,latest?.face,6,'weekly',own===null)+
  btn(role,'weekly','Brasser le vrai D6 hebdomadaire')+
  '<p class="soiree-qa-caption">Ce lancer respecte la semaine Québec et les quotas déjà enregistrés.</p></div>';
 html+='<div class="soiree-qa-round"><h5>Soirée du duo</h5>';
 if(!snapshot.session){
  html+='<p>Aucune soirée active pour ce duo.</p>'+
   btn(role,'start','Ouvrir la vraie soirée',role!=='A');
 }else{
  html+='<p>Séance : '+escapeHtml(snapshot.session.id.slice(0,8))+'</p>'+
   '<h5>Mon D6 personnel</h5>'+die(role,own,6,'personal')+
   btn(role,'personal-d6',own?'Voir mon résultat sauvegardé':'Brasser mon vrai D6')+
   '<p>D6 de mon partenaire : '+(theirs??'Pas encore lancé')+'</p>';
  const ready=own!==null&&theirs!==null;
  html+='<h5>D100 · défi réel</h5>'+
   '<label>Catégorie<select data-soiree-qa-category="'+role+'">'+
    '<option value="MIXTE">Mixte</option><option value="SENSUEL">Sensuel</option>'+
    '<option value="SEXUEL">Sexuel</option><option value="HASARD">Hasard</option>'+
   '</select></label>'+btn(role,'d100','Tirer un défi officiel D100',!ready)+
   '<p class="soiree-qa-caption">Les deux D6 sont nécessaires. Toute limite ou condition du serveur reste active.</p>';
  const selectedChallenge=[...snapshot.mine].reverse().find(x=>
    x.status==='proposed'||x.status==='accepted')||
    snapshot.mine[snapshot.mine.length-1]||null;
  for(const item of snapshot.mine){
   const c=resolvedCard(item);
   html+='<article class="soiree-qa-challenge" aria-label="Défi privé de '+role+'">'+
    '<h5>'+escapeHtml(c.title)+'</h5>'+
    '<p>'+escapeHtml(c.description)+'</p>'+
    '<p>Carte '+escapeHtml(item.category)+' · D100 officiel '+
     escapeHtml(item.face)+' · '+escapeHtml(item.status)+'</p>'+
    die(role,item.face,100,'challenge-'+item.id,item.id===selectedChallenge?.id)+
    (item.status==='proposed'?btn(role,'answer:'+item.id+':accepted','Accepter')+
      btn(role,'redraw:'+item.id+':pass:no','Passer + repiger (quota serveur)')+
      btn(role,'redraw:'+item.id+':refuse:no','Refuser et repiger')+
      btn(role,'redraw:'+item.id+':refuse:yes','Refuser et exclure du cycle'):'')+
    (item.status==='accepted'?btn(role,'answer:'+item.id+':completed','Terminer')+
      btn(role,'redraw:'+item.id+':pass:no','Passer + repiger (quota serveur)')+
      btn(role,'redraw:'+item.id+':refuse:no','Refuser et repiger')+
      btn(role,'redraw:'+item.id+':refuse:yes','Refuser et exclure du cycle'):'')+
    '</article>';
  }
  html+=btn(role,'stop','Arrêter cette soirée sans la compter',role!=='A');
 }
 html+='</div>';return html;
}

export function mountSoireeQaBench({
 root,clientA,clientB,userA,userB,
 gatewayFactory=createSoireeQaGateway,
 loadDice=()=>import('./dice3d.js'),
 refreshMs=7000,onError=()=>{}
}){
 if(!root||!clientA||!clientB||!userA?.id||!userB?.id||
    userA.id===userB.id)throw new Error('Deux comptes QA indépendants requis');
 let dead=false,busy=false,loading=false,context=null,timer=null,lastPaintKey=null;
 const clients={A:clientA,B:clientB},identities={A:userA.id,B:userB.id};
 const api={A:gatewayFactory({client:clientA,expectedUserId:userA.id}),
  B:gatewayFactory({client:clientB,expectedUserId:userB.id})};
 const disposeDice=[];
 const show=message=>{const node=root.querySelector('[data-soiree-qa-message]');
  if(node)node.textContent=message;};
 const clearDice=()=>{while(disposeDice.length)try{disposeDice.pop()?.();}catch{}};
 const buttons=()=>{
  root.querySelectorAll('[data-soiree-qa-action]').forEach(button=>{
   if(button.dataset.qaBaseDisabled===undefined)
    button.dataset.qaBaseDisabled=button.disabled?'true':'false';
   button.disabled=busy||button.dataset.qaBaseDisabled==='true';
  });
 };
 async function drawOfficialDice(){
  if(dead)return;
  let draw;
  try{({dieOn:draw}=await loadDice());}
  catch{show('Rendu WebGL indisponible : les résultats officiels restent lisibles en texte.');return;}
  if(dead)return;
  clearDice();
  for(const canvas of root.querySelectorAll('canvas[data-soiree-qa-die]')){
   const [role,kind]=canvas.dataset.soireeQaDie.split(':');
   const ctx=context?.[role];let face=null,sides=6;
   if(kind==='weekly')face=(ctx.weekly||[]).filter(x=>x.face>=1&&x.face<=6)
    .sort((a,b)=>String(b.key).localeCompare(String(a.key)))[0]?.face??null;
   else if(kind==='personal')face=ctx.personal.find(x=>x.user_id===identities[role])?.face??null;
   else if(kind.startsWith('challenge-')){
    const item=ctx.mine.find(x=>x.id===kind.slice(10));
    face=item?.face??null;sides=100;
   }
   if(Number.isInteger(face)&&face>=1&&face<=sides)
    disposeDice.push(draw(canvas,sides,face,false));
  }
 }
 async function refresh(){
  if(dead||busy||loading)return;
  loading=true;
  try{
   const [a,b]=await Promise.all([api.A.snapshot(),api.B.snapshot()]);
   const pair=validateSoireeQaPair(a,b);
   if(pair.userA!==userA.id||pair.userB!==userB.id)
    throw new Error('Identités QA des joueurs incohérentes');
   // Do not fake a shared session: require both views to show the same
   // active session before rendering either player's roll.
   if((a.session?.id||null)!==(b.session?.id||null))
    throw new Error('Soirée A/B désynchronisée : corriger côté serveur');
   context={A:a,B:b};
   // Network polling never recreates WebGL or discards an unchanged selection.
   const key=JSON.stringify([a,b]);
   if(key===lastPaintKey)return;
   const previous={};
   for(const role of ['A','B'])previous[role]=
    root.querySelector('[data-soiree-qa-category="'+role+'"]')?.value||'MIXTE';
   clearDice();
   for(const role of ['A','B']){
    const node=root.querySelector('[data-soiree-qa-screen="'+role+'"]');
    if(node)node.innerHTML=renderSoireeQaScreen({role,snapshot:context[role],
      partnerId:identities[role==='A'?'B':'A']});
   }
   for(const role of ['A','B']){
    const picker=root.querySelector('[data-soiree-qa-category="'+role+'"]');
    if(picker&&['MIXTE','SENSUEL','SEXUEL','HASARD'].includes(previous[role]))
     picker.value=previous[role];
   }
   lastPaintKey=key;
   buttons();
   void drawOfficialDice();
  }catch(error){onError(error);show(error?.message||'Rafraîchissement QA refusé');}
  finally{loading=false;}
 }
 async function handle(event){
  const node=event.target?.closest?.('[data-soiree-qa-action]');
  if(!node||!root.contains(node)||dead||busy||loading||node.disabled)return;
  const action=node.dataset.soireeQaAction,role=node.dataset.soireeQaRole;
  if(!['A','B'].includes(role))return;
  busy=true;buttons();
  try{
   const status=context?.[role];
   if(!status)throw new Error('Rafraîchir les identités QA avant de jouer');
   const session=status.session?.id;
   if(action==='weekly')await api[role].weekly();
   else if(action==='start'){
    if(role!=='A')throw new Error('Seul A ouvre la séance dans cet atelier');
    await api.A.start();
   }else if(action==='personal-d6'){
    if(!session)throw new Error('Aucune séance QA active');
    await api[role].d6(session);
   }else if(action==='d100'){
    if(!session)throw new Error('Aucune séance QA active');
    const category=root.querySelector('[data-soiree-qa-category="'+role+'"]')?.value;
    if(!['MIXTE','SENSUEL','SEXUEL','HASARD'].includes(category))
     throw new Error('Catégorie de défi inconnue');
    await api[role].d100(session,category);
   }else if(action.startsWith('answer:')){
    const [,id,answer]=action.split(':');
    if(!status.mine.some(c=>c.id===id))throw new Error('Défi non destiné à ce compte QA');
    await api[role].answer(id,answer);
   }else if(action.startsWith('redraw:')){
    const [,id,choice,exclude]=action.split(':');
    if(!status.mine.some(c=>c.id===id&&['proposed','accepted'].includes(c.status)))
     throw new Error('Défi non admissible à la repige');
    if(!['pass','refuse'].includes(choice)||!['yes','no'].includes(exclude))
     throw new Error('Repige invalide');
    await api[role].redraw(id,choice,{exclude:exclude==='yes'});
   }else if(action==='stop'){
    if(role!=='A'||!session)throw new Error('Aucune soirée à arrêter');
    if(globalThis.confirm?.('Arrêter cette soirée QA sans la compter ?')!==true)return;
    await api.A.stop(session);
   }else return;
   show('Résultat enregistré par le véritable serveur du joueur '+role+'.');
  }catch(error){onError(error);show('Refus serveur '+role+' : '+(error?.message||'Action impossible'));}
  finally{busy=false;await refresh();}
 }
 root.addEventListener('click',handle);
 timer=globalThis.setInterval?.(()=>{
  if(dead||busy||loading||
    root.querySelector('input:focus,select:focus,textarea:focus'))return;
  void refresh();
 },refreshMs);
 timer?.unref?.();
 void refresh();
 return Object.freeze({refresh,destroy(){
  dead=true;if(timer!==null&&timer!==undefined)globalThis.clearInterval?.(timer);
  root.removeEventListener('click',handle);
  clearDice();
  root.querySelectorAll('[data-soiree-qa-screen]').forEach(node=>node.replaceChildren());
 }});
}
