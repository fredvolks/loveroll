// Real dual-account sandbox inside Super Admin. No local card/dice fabrication.
export function createStudioRealSandbox({client}){
 const $=id=>document.getElementById(id);
 const uri='love-studio-sandbox';
 const validSeats=['A','B'];
 const validRoutes=['home','session','special','eclat','advent','settings'];
 const frames={A:null,B:null};
 let status=null,tab='A',busy=false,initialized=false,loginInFlight=new Set(),expandedSeat=null;
 const authenticatedSeats=new Set();
 const label=s=>s==='A'?'Joueur A':'Joueur B';
 const say=(message)=>{const node=$('studio-real-status');if(node)node.textContent=message;};
 function showSeatConnection(seat,state){
  const node=$('studio-real-seat-state-'+seat);
  if(!node)return;
  node.dataset.state=state;
  node.textContent=state==='connected'?'Connecté':state==='error'?'Connexion à vérifier':'À connecter';
 }
 async function request(action,seat){
  const {data,error}=await client.functions.invoke(uri,{body:{action,...(seat?{seat}:{})}});
  if(error)throw Error(data?.error||error?.message||'Service test indisponible');
  if(data?.error)throw Error(data.error);
  return data;
 }
 function showSeat(seat){
  tab=seat;
  for(const s of validSeats){
   const active=s===seat;
   const b=$('studio-show-seat-'+s);if(b)b.setAttribute('aria-pressed',String(active));
   const host=$('studio-real-frame-'+s);
   if(host)host.classList.toggle('studio-real-active',active);
  }
 }
 // Enlarge the SAME mounted iframe; never destroy or spoof the real game.
 // CSS fills the available viewport when the Fullscreen API is unavailable
 // (including some iPad Safari versions).
 function collapseSeat(){
  if(!expandedSeat)return;
  expandedSeat=null;
  document.documentElement.classList.remove('studio-real-fullscreen');
  for(const s of validSeats){
   $('studio-real-frame-'+s)?.classList.remove('studio-real-maximized');
   const button=$('studio-real-expand-'+s);
   if(button){button.textContent='Agrandir';button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label','Agrandir le vrai jeu du joueur '+s);}
  }
 }
 function toggleExpandedSeat(seat){
  if(!validSeats.includes(seat)||!frames[seat])return;
  if(expandedSeat===seat){collapseSeat();return;}
  collapseSeat();
  expandedSeat=seat;
  showSeat(seat);
  document.documentElement.classList.add('studio-real-fullscreen');
  $('studio-real-frame-'+seat)?.classList.add('studio-real-maximized');
  const button=$('studio-real-expand-'+seat);
  if(button){button.textContent='Réduire';button.setAttribute('aria-pressed','true');
   button.setAttribute('aria-label','Quitter le plein écran du joueur '+seat);
   button.focus({preventScroll:true});}
 }
 function closeFrames(){
  collapseSeat();
  for(const seat of validSeats){
   // Keep the permanent heading and 'Agrandir' control, remove ONLY the
   // authenticated iframe so Refresh and New Trial remain usable.
   $('studio-real-frame-'+seat)?.querySelector('iframe')?.remove();
   frames[seat]=null;
   loginInFlight.delete(seat);
   authenticatedSeats.delete(seat);
   showSeatConnection(seat,'pending');
   try{sessionStorage.removeItem('loveroll-studio-auth-v1-'+seat)}catch{}
  }
 }
 function display(){
  const isReady=status?.ready===true,section=$('studio-real-views');
  section.hidden=!isReady;
  $('studio-real-create').hidden=isReady||status?.state==='creating'||status?.state==='deleting';
  $('studio-real-delete').hidden=status?.state==='missing'||!status;
  $('studio-real-refresh').hidden=!status||status?.state==='missing';
  $('studio-real-reset').hidden=!isReady;
  $('studio-real-check').hidden=!isReady;
  const diagnostics=$('studio-real-diagnostics');
  if(diagnostics){
   diagnostics.hidden=!isReady;
   if(isReady){
    const g=status?.game;
    const face=n=>Number.isInteger(n)?String(n):'—';
    diagnostics.textContent=!g||g.error
     ?'Diagnostics officiels momentanément indisponibles — les deux jeux restent accessibles.'
     :'D6 hebdomadaire : '+face(g.weekly_face)+
      ' · D100 Surprise : '+face(g.monthly_face)+
      ' · D6 Soirée A : '+face(g.personal_faces?.A)+
      ' · D6 Soirée B : '+face(g.personal_faces?.B)+
      ' · Soirée : '+(g.session==='open'?'en cours':g.session==='finished'?'terminée':'non commencée')+
      ' · Défis : '+Number(g.challenges_total||0)+
      ' · Éclat : '+(g.eclat_enabled?'test autorisé':'non actif')+
       (Array.isArray(g.challenge_preview)&&g.challenge_preview.length
        ?'\nTrois derniers défis réels :\n'+g.challenge_preview.map(card=>
          'Joueur '+(card.seat==='A'||card.seat==='B'?card.seat:'?')+
          ' · '+String(card.category||'Sans catégorie')+
          ' · D100 '+face(card.face)+
          ' · '+String(card.status||'')+
          '\n'+String(card.title||'Défi')+
          '\n'+String(card.description||'')
         ).join('\n\n')
        :'\nAucun défi tiré dans la dernière soirée.');
   }
  }
  if(!isReady){closeFrames();return;}
  for(const seat of validSeats){
   const container=$('studio-real-frame-'+seat);
   if(frames[seat])continue;
   const frame=document.createElement('iframe');
   frame.title=label(seat)+' · LoveRoll réel';
   frame.setAttribute('allow','clipboard-write');
   frame.setAttribute('loading','eager');
   frame.referrerPolicy='same-origin';
   frame.src=new URL('./?studio_seat='+seat+'&studio_test=1',location.href).href;
   container.append(frame);
   frames[seat]=frame;
  }
  showSeat(tab);
 }
 async function refresh(){
  status=await request('status');
  say(status.ready?(authenticatedSeats.size===2?'Joueurs A et B connectés au vrai LoveRoll.':'Couple de test prêt. Connexion des joueurs A et B en cours…'):
    status.state==='missing'?'Aucun couple de test. Crée un duo pour jouer.':
    status.state==='creating'?'Création du duo en cours ou incomplète.':
    'Suppression de banc de test à terminer.');
  display();
 }
 async function onChildMessage(event){
  if(event.origin!==location.origin||!status?.ready)return;
  const seat=validSeats.find(s=>frames[s]?.contentWindow===event.source);
  if(!seat||event.data?.seat!==seat)return;
  const msg=event.data;
  if(msg.type==='loveroll-studio-navigate-error'){
   say(label(seat)+' : ouverture refusée par le vrai jeu. Vérifie ses conditions d’accès.');
   return;
  }
  if(msg.type==='loveroll-studio-seat-error'){
   authenticatedSeats.delete(seat);showSeatConnection(seat,'error');
   loginInFlight.delete(seat);say(label(seat)+' : authentification non aboutie, recharge la paire.');
   return;
  }
  if(msg.type!=='loveroll-studio-seat-ready')return;
  const expected=status.seats?.find(s=>s.seat===seat)?.user_id;
  if(!expected)return;
  if(msg.authenticated&&msg.user_id===expected){
   loginInFlight.delete(seat);
   authenticatedSeats.add(seat);
   showSeatConnection(seat,'connected');
   say(authenticatedSeats.size===2
    ?'Les deux vrais joueurs A et B sont connectés. Les dés officiels sont prêts à être testés.'
    :label(seat)+' connecté au vrai LoveRoll. Connexion de l’autre joueur en cours…');
   return;
  }
  if(msg.authenticated&&msg.user_id!==expected){
   authenticatedSeats.delete(seat);showSeatConnection(seat,'error');
   frames[seat].contentWindow.postMessage({type:'loveroll-studio-clear-seat',seat},location.origin);
   return;
  }
  authenticatedSeats.delete(seat);
  showSeatConnection(seat,'pending');
  if(loginInFlight.has(seat))return;
  loginInFlight.add(seat);
  try{
   const result=await request('seat_login',seat);
   if(frames[seat]?.contentWindow===event.source)
    frames[seat].contentWindow.postMessage({
     type:'loveroll-studio-login',seat,token_hash:result.token_hash,user_id:result.user_id
    },location.origin);
   else loginInFlight.delete(seat);
  }catch(err){loginInFlight.delete(seat);say('Impossible de connecter '+label(seat)+' : '+err.message);}
 }
 async function init(){
  if(initialized)return;initialized=true;
  window.addEventListener('message',onChildMessage);
  for(const seat of validSeats)$('studio-show-seat-'+seat).addEventListener('click',()=>showSeat(seat));
  for(const seat of validSeats)$('studio-real-expand-'+seat).addEventListener('click',()=>toggleExpandedSeat(seat));
  for(const seat of validSeats)$('studio-real-jump-'+seat).addEventListener('change',()=>{
   const selector=$('studio-real-jump-'+seat),tab=selector.value;
   selector.value='';
   if(!status?.ready||!validRoutes.includes(tab))return;
   frames[seat]?.contentWindow?.postMessage({type:'loveroll-studio-navigate',seat,tab},location.origin);
  });
  window.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&expandedSeat){event.preventDefault();collapseSeat();}
  });
  $('studio-real-create').addEventListener('click',async()=>{
   if(busy)return;
   if(!confirm('Créer deux VRAIS comptes Supabase techniques, réservés au banc de test ?'))return;
   busy=true;say('Création sécurisée du duo…');
   try{await request('create');await refresh()}
   catch(err){say(err.message);try{await refresh()}catch{}}
   finally{busy=false}
  });
  // Delete ONLY the registered test pair, then provision an entirely
  // new genuine Auth pair. Do not bypass weekly quotas or fake any roll.
  $('studio-real-reset').addEventListener('click',async()=>{
   if(busy||!status?.ready)return;
   if(!confirm('Nouvel essai : supprimer le duo A+B de test et ses parties, puis créer deux NOUVEAUX comptes techniques ?'))return;
   if(!confirm('Confirmer le remplacement du banc de test seulement ? Aucun compte client réel ne sera utilisé.'))return;
   busy=true;say('Réinitialisation du vrai banc A+B…');closeFrames();
   try{
    await request('delete');
    status={state:'missing',ready:false};
    display();
    await request('create');
    await refresh();
    say('Nouveau couple de test A+B prêt. Les vrais dés et les quotas officiels repartent sur une nouvelle paire.');
   }catch(err){
    say('Nouvel essai interrompu : '+err.message+' — vérifier le banc avant de recommencer.');
    try{await refresh()}catch{/* Preserve the error above. */}
   }finally{busy=false}
  });
  $('studio-real-delete').addEventListener('click',async()=>{
   if(busy)return;
   if(!confirm('Supprimer les deux comptes techniques et toutes leurs données de test ? AUCUN compte réel ne sera touché.'))return;
   if(!confirm('Confirmer la suppression DÉFINITIVE du banc de test uniquement ?'))return;
   busy=true;say('Suppression sécurisée en cours…');closeFrames();
   try{await request('delete');status={state:'missing',ready:false};display();say('Banc de test supprimé.')}
   catch(err){say(err.message);}
   finally{busy=false}
  });
  $('studio-real-check').addEventListener('click',()=>refresh().catch(e=>say(e.message)));
  $('studio-real-refresh').addEventListener('click',()=>{closeFrames();refresh().catch(e=>say(e.message))});
  try{await refresh()}catch(err){say(err.message)}
 }
 return {init,refresh};
}
