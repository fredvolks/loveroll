// Real dual-account sandbox inside Super Admin. No local card/dice fabrication.
import {createStudioStatusSync} from './studio-status-sync.mjs';
import {studioTestProgress,studioEclatOverview} from './studio-test-progress.mjs?v=20261028-real288';
import {ECLAT_COFFRETS} from './eclat-catalog.mjs';

export function createStudioRealSandbox({client}){
 const $=id=>document.getElementById(id);
 const uri='love-studio-sandbox';
 const validSeats=['A','B'];
 const validRoutes=['home','session','special','eclat','advent','settings','journal','personal-journal','occasions'];
 const frames={A:null,B:null};
 let status=null,tab='A',busy=false,tearingDown=false,initialized=false,active=false,loginInFlight=new Set(),expandedSeat=null;
 let veniceBusy=false,veniceData=null,veniceMessage='Connecte le joueur A pour accéder aux brouillons.';
 let veniceWatch=null,veniceActiveRequest=null;
 let historyOpen=false,historyPage=0,historyTotal=0,historyCards=null;
 let historyBusy=false,historyError='',historyGeneration=0,historySeat='all';
 const authenticatedSeats=new Set();
 const label=s=>s==='A'?'Joueur A':'Joueur B';
 const say=(message)=>{const node=$('studio-real-status');if(node)node.textContent=message;};
 function showSeatConnection(seat,state){
  const node=$('studio-real-seat-state-'+seat);
  if(!node)return;
  node.dataset.state=state;
  node.textContent=state==='connected'?'Connecté':state==='error'?'Connexion à vérifier':'À connecter';
  renderProgress();
  renderVenice();
 }
 async function request(action,seat,parameters=null){
  const {data,error}=await client.functions.invoke(uri,{
   body:{action,...(seat?{seat}:{}),...(parameters||{})}
  });
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
 function resetHistory(){
  historyGeneration++;
  historyOpen=false;historyPage=0;historyTotal=0;historyCards=null;
  historyBusy=false;historyError='';historySeat='all';
  const selector=$('studio-real-history-seat');
  if(selector)selector.value='all';
 }
 function closeFrames(){
  resetHistory();
  if(veniceWatch!==null)clearTimeout(veniceWatch);
  veniceWatch=null;veniceActiveRequest=null;
  veniceBusy=false;veniceData=null;
  veniceMessage='Le joueur A doit être reconnecté pour accéder à Venice.';
  renderVenice();
  // Late status responses must never remount an already-deleted test pair.
  statusSync.invalidate();
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
 function renderProgress(){
  const list=$('studio-real-progress-list'),counter=$('studio-real-progress-count');
  if(!list||!counter)return;
  const progress=studioTestProgress(status,authenticatedSeats);
  list.replaceChildren();
  counter.textContent=progress.completed+'/'+progress.total;
  for(const step of progress.steps){
   const item=document.createElement('li');
   item.dataset.state=step.done?'verified':'pending';
   item.textContent=(step.done?'✓ ':'○ ')+step.title;
   list.append(item);
  }
 }
 function renderEclatProgress(){
  const grid=$('studio-real-eclat-grid'),counter=$('studio-real-eclat-count');
  if(!grid||!counter)return;
  const progress=studioEclatOverview(status,ECLAT_COFFRETS);
  grid.replaceChildren();
  counter.textContent=progress.verified+'/12 terminés'+
   (progress.activeId?' · 1 en cours':'');
  for(const coffret of progress.rows){
   const item=document.createElement('div');
   item.classList.add('studio-real-eclat-coffret');
   item.dataset.state=coffret.state;
   const running=coffret.state==='active';
   const phase=running?' · en cours'+
    (coffret.chapter!==null&&coffret.chapterTotal!==null
     ?' · étape '+coffret.chapter+'/'+coffret.chapterTotal:'')+
    (coffret.minutes!==null?' · '+coffret.minutes+' min':''):'';
   item.textContent=(running?'◉ ':coffret.state==='verified'?'✓ ':'○ ')+
    'Coffret '+coffret.id+' · '+coffret.title+phase;
   grid.append(item);
  }
 }
 function renderVenice(){
  const region=$('studio-venice-cards'),note=$('studio-venice-status');
  if(!region||!note)return;
  const ready=status?.ready===true&&authenticatedSeats.has('A')&&!tearingDown;
  for(const id of ['studio-venice-status-button','studio-venice-latest',
   'studio-venice-generate']){
   const button=$(id);
   if(button)button.disabled=!ready||veniceBusy;
  }
  note.textContent=veniceBusy?'Requête Venice en cours — ne recharge pas cette fenêtre.'
   :veniceMessage;
  region.replaceChildren();
  const payload=veniceData;
  if(!payload)return;
  const cards=Array.isArray(payload.cards)?payload.cards:
   Array.isArray(payload.preview?.cards)?payload.preview.cards:[];
  if(!cards.length){
   const empty=document.createElement('p');
   empty.textContent='Aucun brouillon Venice enregistré pour ce banc.';
   region.append(empty);return;
  }
  for(const card of cards.slice(0,3)){
   const article=document.createElement('article');
   article.classList.add('studio-venice-card');
   const title=document.createElement('h3');
   title.textContent=String(card.title||'Brouillon en erreur').slice(0,130);
   const meta=document.createElement('small');
   const minutes=Number.isInteger(card.timer_minutes)?card.timer_minutes:'—';
   meta.textContent='Style : '+String(card.style||'—').slice(0,24)+
    ' · Durée : '+minutes+' min · Non publié';
   const summary=document.createElement('p');
   summary.textContent=String(card.text_short||card.error||'').slice(0,650);
   const detailed=document.createElement('p');
   detailed.textContent=String(card.text_detailed||'').slice(0,1000);
   article.append(title,meta,summary,detailed);
   region.append(article);
  }
 }
 function renderAudit(){
  const section=$('studio-real-audit'),list=$('studio-real-audit-list');
  if(!section||!list)return;
  const rows=Array.isArray(status?.audit)?status.audit.slice(0,8):[];
  list.replaceChildren();
  section.hidden=rows.length===0;
  const titles={
   create_requested:'Création du duo demandée',
   create_succeeded:'Duo de test créé',
   create_failed:'Création incomplète',
   login_requested:'Connexion technique demandée',
   delete_requested:'Suppression sécurisée demandée',
   delete_completed:'Suppression du duo terminée',
   delete_failed:'Suppression interrompue'
  };
  for(const event of rows){
   const item=document.createElement('li');
   const title=document.createElement('strong');
   title.textContent=titles[event.action]||'Opération technique';
   const time=document.createElement('time');
   const date=new Date(event.created_at);
   time.textContent=Number.isFinite(date.getTime())
    ?new Intl.DateTimeFormat('fr-CA',{
      timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'
     }).format(date):'Date non disponible';
   item.append(title,time);
   list.append(item);
  }
 }
 function renderChallengeCards(){
  const section=$('studio-real-challenge-cards'),list=$('studio-real-challenge-list');
  if(!section||!list)return;
  const game=status?.game;
  // Historical retrieval remains usable when an unrelated dice/Éclat
  // snapshot is temporarily unavailable. Its own privileged endpoint
  // independently verifies the registered A/B pair.
  const available=status?.ready===true;
  section.hidden=!available;
  const openButton=$('studio-real-history-open'),nav=$('studio-real-history-nav');
  if(openButton){openButton.hidden=!available||historyOpen;openButton.disabled=historyBusy;}
  if(nav)nav.hidden=!available||!historyOpen;
  const filter=$('studio-real-history-seat');
  if(filter)filter.disabled=historyBusy||!available;
  const count=$('studio-real-history-count');
  if(count){
   const first=historyTotal?historyPage*10+1:0;
   const last=Math.min((historyPage+1)*10,historyTotal);
   count.textContent=historyBusy?'Lecture des défis officiels…':
    historyError?'Lecture impossible : '+historyError:
    first+'–'+last+' sur '+historyTotal+' défis';
  }
  const previous=$('studio-real-history-prev'),next=$('studio-real-history-next');
  if(previous)previous.disabled=historyBusy||historyPage===0;
  if(next)next.disabled=historyBusy||(historyPage+1)*10>=historyTotal||historyPage>=999;
  list.replaceChildren();
  if(!available)return;
  const cards=historyOpen?historyCards:
   (Array.isArray(game?.challenge_preview)?game.challenge_preview.slice(0,3):[]);
  if(!cards?.length){
   const empty=document.createElement('p');
   empty.classList.add('studio-real-card-empty');
   empty.textContent=historyBusy?'Lecture de l’historique réel…':
    historyError?'Historique indisponible. Réessaie.':
    historyOpen?'Aucun défi dans cette page.':game?.error?
    'Résumé des défis indisponible : ouvre l’historique officiel ci-dessus.':
    'Aucun défi tiré dans la dernière soirée.';
   list.append(empty);return;
  }
  for(const card of cards){
   const article=document.createElement('article');
   article.classList.add('studio-real-challenge-card');
   const meta=document.createElement('span');
   meta.classList.add('studio-real-card-meta');
   const face=Number.isInteger(card.face)?String(card.face):'—';
   const seat=validSeats.includes(card.seat)?card.seat:'?';
   const date=typeof card.created_at==='string'?new Date(card.created_at):null;
   const at=historyOpen&&date&&Number.isFinite(date.getTime())
    ?' · '+new Intl.DateTimeFormat('fr-CA',{
      timeZone:'America/Toronto',dateStyle:'short',timeStyle:'short'
     }).format(date):'';
   meta.textContent='Joueur '+seat+' · '+String(card.category||'Sans catégorie')+
    ' · D100 '+face+' · '+String(card.status||'État inconnu')+at;
   const title=document.createElement('h4');
   title.textContent=String(card.title||'Défi');
   const description=document.createElement('p');
   description.textContent=String(card.description||'Aucune consigne enregistrée');
   article.append(meta,title,description);
   list.append(article);
  }
 }
 async function loadChallengeHistory(page){
  if(!active||tearingDown||!status?.ready||historyBusy||
   !Number.isInteger(page)||page<0||page>999)return;
  const requestGeneration=historyGeneration;
  historyOpen=true;historyBusy=true;historyError='';historyCards=null;
  renderChallengeCards();
  try{
   const result=await request('challenge_history',historySeat==='all'?null:historySeat,{page});
   if(requestGeneration!==historyGeneration||!active||tearingDown)return;
   if(result?.page!==page||result?.limit!==10||result?.filter!==historySeat||
      !Number.isSafeInteger(result?.total)||result.total<0||
      !Array.isArray(result?.cards)||result.cards.length>10)
    throw Error('Réponse du serveur non conforme');
   historyCards=result.cards;historyTotal=result.total;historyPage=page;
  }catch(error){
   if(requestGeneration!==historyGeneration)return;
   historyError=error instanceof Error?error.message:'Erreur de lecture';
  }finally{
   if(requestGeneration===historyGeneration){historyBusy=false;renderChallengeCards();}
  }
 }
 function display(){
  const isReady=status?.ready===true,section=$('studio-real-views');
  section.hidden=!isReady;
  $('studio-real-create').hidden=isReady||['creating','deleting','invalid'].includes(status?.state);
  $('studio-real-delete').hidden=status?.state==='missing'||!status;
  $('studio-real-refresh').hidden=!status||status?.state==='missing';
  $('studio-real-reconnect').hidden=!isReady;
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
      ' · Éclat : '+(g.eclat_enabled?'test autorisé':'non actif');
   }
  }
  renderChallengeCards();
  renderProgress();
  renderEclatProgress();
  renderVenice();
  renderAudit();
  if(!isReady){closeFrames();return;}
  for(const seat of validSeats){
   const container=$('studio-real-frame-'+seat);
   if(frames[seat])continue;
   // Initialize each seat's connection indicator from the actual iframe lifecycle.
   showSeatConnection(seat,'pending');
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
 const statusSync=createStudioStatusSync(
  ()=>request('status'),
  value=>{
   // A pre-delete diagnostic must never resurrect an old pair while the
   // authorized SQL/Auth cleanup or replacement is still in flight.
   if(tearingDown||!active)return;
   // A second admin tab can replace the same technical pair. An old
   // authenticated A/B iframe must NEVER be re-labelled as the new pair,
   // nor retain challenge history from the previous technical identities.
   const pairSignature=entry=>Array.isArray(entry?.seats)&&entry.seats.length===2
    ?entry.seats.map(row=>row.seat+':'+row.user_id).sort().join('|'):null;
   if(status?.ready&&value?.ready&&pairSignature(status)!==pairSignature(value))
    closeFrames();
   status=value;
   say(status.ready?(authenticatedSeats.size===2?'Joueurs A et B connectés au vrai LoveRoll.':'Couple de test prêt. Connexion des joueurs A et B en cours…'):
    status.state==='missing'?'Aucun couple de test. Crée un duo pour jouer.':
    status.state==='creating'?'Création du duo en cours ou incomplète.':
    status.state==='invalid'?'Sécurité : les comptes de test ne correspondent plus au duo enregistré. Connexion et lecture des cartes bloquées; supprimer ce banc avec précaution.':
    'Suppression de banc de test à terminer.');
   display();
   // When a real game RPC writes a new challenge, keep an already-open
   // history synchronized with the fresh server snapshot.
   if(historyOpen&&!historyBusy)loadChallengeHistory(historyPage);
  }
 );
 const refresh=()=>statusSync.refresh();
 async function onChildMessage(event){
  if(!active||tearingDown||event.origin!==location.origin||!status?.ready)return;
  const seat=validSeats.find(s=>frames[s]?.contentWindow===event.source);
  if(!seat||event.data?.seat!==seat)return;
  const msg=event.data;
  if(msg.type==='loveroll-studio-venice-result'&&seat==='A'&&veniceBusy){
   // Ignore a delayed response from an old paid preview or a new frame.
   if(!veniceActiveRequest||msg.request_id!==veniceActiveRequest.id||
      msg.action!==veniceActiveRequest.action)return;
   if(veniceWatch!==null)clearTimeout(veniceWatch);
   veniceWatch=null;veniceActiveRequest=null;veniceBusy=false;
   if(msg.data?.ok===true){
    veniceData=msg.data.result||null;
    veniceMessage=msg.action==='status'
     ?(veniceData?.message||'État de la connexion Venice reçu.')
     :msg.action==='preview_three'
      ?'Brouillons Venice sauvegardés. Aucune carte officielle modifiée.'
      :'Derniers brouillons lus. Aucune carte officielle modifiée.';
   }else{
    veniceMessage=String(msg.data?.error||'Réponse Venice indisponible').slice(0,240);
   }
   renderVenice();return;
  }
  if(msg.type==='loveroll-studio-game-updated'){
   // The official child has completed a real server RPC. Re-read its cards
   // through the authorized backend; never accept content or dice from frames.
   if(authenticatedSeats.has(seat)){
    try{await refresh()}catch(err){say('État du jeu à actualiser : '+err.message)}
   }
   return;
  }
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
  active=true;
  if(initialized){await refresh();return;}
  initialized=true;
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
   busy=true;tearingDown=true;say('Réinitialisation du vrai banc A+B…');closeFrames();
   try{
    await request('delete');
    status={state:'missing',ready:false};
    display();
    await request('create');
    statusSync.invalidate();
    tearingDown=false;
    await refresh();
    say('Nouveau couple de test A+B prêt. Les vrais dés et les quotas officiels repartent sur une nouvelle paire.');
   }catch(err){
    statusSync.invalidate();
    tearingDown=false;
    say('Nouvel essai interrompu : '+err.message+' — vérifier le banc avant de recommencer.');
    try{await refresh()}catch{/* Preserve the error above. */}
   }finally{tearingDown=false;busy=false}
  });
  $('studio-real-delete').addEventListener('click',async()=>{
   if(busy)return;
   if(!confirm('Supprimer les deux comptes techniques et toutes leurs données de test ? AUCUN compte réel ne sera touché.'))return;
   if(!confirm('Confirmer la suppression DÉFINITIVE du banc de test uniquement ?'))return;
   busy=true;tearingDown=true;say('Suppression sécurisée en cours…');closeFrames();
   try{
    await request('delete');
    statusSync.invalidate();
    tearingDown=false;
    await refresh();
    say('Banc de test supprimé. Journal de sécurité à jour.');
   }catch(err){
    statusSync.invalidate();
    tearingDown=false;
    say(err.message);
    try{await refresh()}catch{/* Keep original deletion error. */}
   }finally{tearingDown=false;busy=false}
  });
  async function veniceAction(action){
   if(veniceBusy||tearingDown||!status?.ready||
      !authenticatedSeats.has('A')||!frames.A?.contentWindow)return;
   if(action==='preview_three'){
    if(!confirm('Venice utilisera de vrais crédits d’IA pour générer 3 brouillons. Continuer ?'))return;
    if(!confirm('Confirmer : une seule génération par jour UTC et par Super Admin, même après réinitialisation A+B. Cette action pourrait être facturée par Venice.'))return;
   }
   veniceBusy=true;
   veniceActiveRequest={id:crypto.randomUUID(),action};
   veniceMessage='Préparation de l’atelier Venice…';
   renderVenice();
   try{
    if(action==='preview_three')await request('venice_preview_authorize');
    if(!frames.A?.contentWindow||tearingDown)throw Error('Joueur A indisponible');
    frames.A.contentWindow.postMessage({
     type:'loveroll-studio-venice',seat:'A',action,
     request_id:veniceActiveRequest.id
    },location.origin);
    veniceMessage='En attente du service officiel Venice via le joueur A…';
    veniceWatch=setTimeout(()=>{
     veniceWatch=null;veniceBusy=false;veniceActiveRequest=null;
     veniceMessage='Réponse Venice non reçue. Vérifie les derniers brouillons avant de recommencer; la génération peut déjà avoir consommé le quota.';
     renderVenice();
    },60000);
    veniceWatch?.unref?.();
    renderVenice();
   }catch(err){
    if(veniceWatch!==null)clearTimeout(veniceWatch);
    veniceWatch=null;veniceBusy=false;veniceActiveRequest=null;
    veniceMessage=err instanceof Error?err.message:'Erreur Venice';
    renderVenice();
   }
  }
  for(const [id,action] of [
   ['studio-venice-status-button','status'],
   ['studio-venice-latest','get_latest_preview'],
   ['studio-venice-generate','preview_three']
  ])$(id)?.addEventListener('click',()=>veniceAction(action));

  $('studio-real-history-open')?.addEventListener('click',()=>loadChallengeHistory(0));
  $('studio-real-history-seat')?.addEventListener('change',event=>{
   if(historyBusy||!historyOpen)return;
   const seat=event.target.value;
   if(!['all','A','B'].includes(seat))return;
   historySeat=seat;
   loadChallengeHistory(0);
  });
  $('studio-real-history-prev')?.addEventListener('click',()=>loadChallengeHistory(historyPage-1));
  $('studio-real-history-next')?.addEventListener('click',()=>loadChallengeHistory(historyPage+1));
  $('studio-real-history-close')?.addEventListener('click',()=>{
   resetHistory();renderChallengeCards();
  });
  $('studio-real-check').addEventListener('click',()=>refresh().catch(e=>say(e.message)));
  $('studio-real-refresh').addEventListener('click',()=>{
   // Resume the SAME game; preserving iframe/OTP session is essential for
   // official WebGL animation, timer and in-progress challenge continuity.
   refresh().catch(e=>say(e.message));
  });
  $('studio-real-reconnect').addEventListener('click',()=>{
   if(busy||tearingDown||!status?.ready)return;
   if(!confirm('Recharger les deux fenêtres A/B pour rétablir une connexion ? Les tirages et cartes restent enregistrés, mais un minuteur local en cours pourrait être interrompu.'))return;
   closeFrames();
   say('Réouverture des deux vrais comptes A/B…');
   refresh().catch(e=>say(e.message));
  });
  try{await refresh()}catch(err){say(err.message)}
 }
 function deactivate(){
  // Hiding admin UI isn't enough: technical Auth seats and their timers must
  // be destroyed on owner logout or loss of privileged session. The actual
  // test accounts and server records remain untouched for later login.
  active=false;
  status=null;
  closeFrames();
  say('Connexion propriétaire requise pour utiliser le banc A/B.');
 }
 return {init,refresh,deactivate};
}
