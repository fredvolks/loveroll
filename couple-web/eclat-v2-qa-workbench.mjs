// Éclat V2 laboratory: mounts the REAL play controller on two distinct QA JWTs.
// Never registered in public LoveRoll V1. No elevated credentials or synthetic rolls.
import {createEclatV2SessionApi} from './eclat-v2-session.mjs';
import {createEclatV2PlayController} from './eclat-v2-play-controller.mjs';

const QA_HOST=/^[a-z0-9]{20}\.supabase\.co$/;
const PUBLISHABLE=/^sb_publishable_[A-Za-z0-9_-]{15,}$/;
export function validateEclatQaConfig({url,key,productionUrl}){
 if(typeof url!=='string'||typeof key!=='string'||typeof productionUrl!=='string')
  throw new TypeError('Projet QA et clé publique requis');
 let requested,production;
 try{requested=new URL(url.trim());production=new URL(productionUrl);}
 catch{throw new Error('URL Supabase de test invalide');}
 if(requested.protocol!=='https:'||!QA_HOST.test(requested.hostname)||
    requested.username||requested.password||requested.port||
    requested.pathname!=='/'||requested.search||requested.hash)
  throw new Error('Utilisez uniquement l’URL racine d’un projet Supabase de test');
 if(requested.hostname===production.hostname)
  throw new Error('SÉCURITÉ : la base LoveRoll de production est interdite dans cet atelier');
 if(!PUBLISHABLE.test(key.trim()))
  throw new Error('Clé sb_publishable_ du projet QA requise : jamais de clé secrète');
 return Object.freeze({url:requested.origin,key:key.trim()});
}
export function eclatQaAuthOptions(role){
 if(!['A','B'].includes(role))throw new RangeError('Rôle QA invalide');
 return {auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,
  flowType:'pkce',storageKey:'loveroll-eclat-qa-memory-'+role}};
}
export function validateEclatQaPair({userA,userB,statusA,statusB}){
 if(!userA?.id||!userB?.id||userA.id===userB.id)
  throw new Error('Deux comptes QA indépendants sont obligatoires');
 if(!statusA?.access||!statusB?.access||!statusA.session_id||
    statusA.session_id!==statusB.session_id||
    statusA.coffret_id!==statusB.coffret_id||
    statusA.content_version!==2||statusB.content_version!==2||
    statusA.device_mode!=='two'||statusB.device_mode!=='two'||
    statusA.role_a!==userA.id||statusA.role_b!==userB.id||
    statusB.role_a!==userA.id||statusB.role_b!==userB.id)
  throw new Error('Les comptes doivent appartenir au même duo et à la même vraie séance V2');
 return statusA.session_id;
}
export function validateEclatQaReadyToStart(statusA,statusB){
 if(!statusA?.access||!statusB?.access)
  throw new Error('Les deux comptes doivent posséder les droits Éclat sur QA');
 if(statusA.active||statusB.active)
  throw new Error('Une séance est déjà ouverte. Utilisez Reprendre, ou terminez-la d’abord depuis le jeu.');
 return true;
}
export function createEclatV2QaWorkbench({
 root,createClient,productionUrl,createApi=createEclatV2SessionApi,
 createPlayer=createEclatV2PlayController,refreshIntervalMs=6000
}){
 if(!root||typeof root.addEventListener!=='function'||typeof createClient!=='function')
  throw new TypeError('Atelier QA : conteneur et création de clients requis');
 let active=true,configured=false,sessionId=null,ticker=null,busy=false;
 let operatorClient=null,operatorId=null,soireeBench=null,qaHealthOk=false;
 const players={A:{},B:{}};
 const el=id=>root.querySelector('[data-eclat-qa="'+id+'"]');
 const show=(id,value)=>{const target=el(id);if(target)target.hidden=!value;};
 const feedback=(message,isError=false)=>{
  const target=el('feedback');
  if(target){target.textContent=message;target.dataset.error=isError?'true':'false';}
 };
 const progress=(role,value)=>{
  const target=el('account-'+role);if(target)target.textContent=value;
 };
 const dropPrivate=()=>{const target=el('one-time-passwords');
  if(target){target.replaceChildren();target.hidden=true;}};
 function operatorButtons(){
  for(const name of ['qa-health','qa-create','qa-list','qa-expire','qa-operator-logout']){
   const b=root.querySelector('[data-eclat-qa-action="'+name+'"]');
   if(b)b.disabled=!operatorId||busy||name==='qa-create'&&!qaHealthOk;
  }
 }
 async function callOperator(action,extra={}){
  if(!operatorClient||!operatorId)throw new Error('Connectez le compte opérateur QA');
  const {data,error}=await operatorClient.functions.invoke('loveroll-qa-accounts',{
   body:{action,...extra}
  });
  if(error||!data?.ok)throw new Error(data?.error||error?.message||
   'Fonction QA absente ou accès opérateur refusé');
  return data;
 }
 function paintManaged(pairs){
  const rootList=el('pairs');if(!rootList)return;
  rootList.replaceChildren();
  if(!pairs.length){rootList.textContent='Aucune paire QA créée par cet opérateur.';return;}
  for(const row of pairs){
   const line=document.createElement('div');line.className='eclat-qa-managed-row';
   const label=document.createElement('span');
   label.textContent='Paire '+String(row.id).slice(0,8)+
    ' · '+row.state+' · expiration '+new Date(row.expires_at).toLocaleString('fr-CA');
   const button=document.createElement('button');button.type='button';
   button.textContent='Supprimer cette paire QA';button.className='secondary';
   button.dataset.eclatQaAction='qa-delete';
   button.dataset.pairId=row.id;
   line.append(label,button);rootList.append(line);
  }
 }
 async function operatorSignIn(form){
  if(!configured||!operatorClient)throw new Error('Connecter le projet QA d’abord');
  if(operatorId)throw new Error('Opérateur déjà connecté');
  const email=form.querySelector('[name="email"]')?.value?.trim();
  const input=form.querySelector('[name="password"]');
  const password=input?.value;if(input)input.value='';
  if(!email||!password)throw new Error('Compte opérateur QA requis');
  const {data,error}=await operatorClient.auth.signInWithPassword({email,password});
  if(error||!data?.user?.id)throw error||new Error('Connexion opérateur refusée');
  const {data:check,error:authError}=await operatorClient.auth.getUser();
  if(authError||check?.user?.id!==data.user.id){
   // Even the QA operator has no permission to retain an unverified JWT.
   try{await operatorClient.auth.signOut({scope:'local'});}catch{/* best effort */}
   throw new Error('Identité opérateur non vérifiée');
  }
  if(['A','B'].some(role=>players[role].user?.id===data.user.id)){
   await operatorClient.auth.signOut({scope:'local'});
   throw new Error('L’opérateur QA doit être distinct des deux joueurs');
  }
  operatorId=data.user.id;operatorButtons();
  feedback('Identité QA validée. La fonction serveur vérifiera séparément le droit de créer ou de supprimer.');
 }
 async function operatorLogout(){
  operatorId=null;qaHealthOk=false;dropPrivate();el('pairs')?.replaceChildren();
  await operatorClient?.auth?.signOut({scope:'local'}).catch(()=>{});
  operatorButtons();
 }
 const dropPlayers=()=>{
  for(const role of ['A','B']){
   players[role].controller?.destroy();
   players[role].controller=null;
   const stage=el('stage-'+role);
   if(stage)stage.textContent='';
  }
 };
 const stopTicker=()=>{if(ticker!==null){clearInterval(ticker);ticker=null;}};
 const resumeTicker=()=>{
  stopTicker();
  if(!sessionId)return;
  ticker=setInterval(()=>{
   if(!active||busy||!players.A.controller||!players.B.controller)return;
   // Do not erase a live answer, private note, mobile keyboard or IME composition.
   // The next tick refreshes both as soon as the player leaves the field.
   if(root.querySelector('input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'))return;
   Promise.allSettled([players.A.controller.refresh(),players.B.controller.refresh()])
    .then(results=>{
     if(active&&results.every(x=>x.status==='rejected'))
      feedback('Connexion au serveur QA perdue. Cliquez sur Actualiser.',true);
    });
  },refreshIntervalMs);
 };
 async function disconnect(){
  soireeBench?.destroy();soireeBench=null;show('soiree',false);
  stopTicker();dropPlayers();sessionId=null;
  await operatorLogout();operatorClient=null;
  for(const role of ['A','B']){
   const client=players[role].client;players[role]={};
   try{await client?.auth?.signOut?.({scope:'local'});}catch{/* JWT ephemeral */}
   progress(role,'Non connecté');
   el('login-'+role)?.reset();
  }
  configured=false;show('connection',true);show('accounts',false);show('game',false);
  feedback('Déconnecté : aucune session de jeu ni mot de passe conservés dans ce navigateur.');
 }
 async function connect(){
  if(configured)throw new Error('Déconnectez le projet QA avant de changer de base');
  const config=validateEclatQaConfig({
   url:el('url')?.value,key:el('key')?.value,productionUrl
  });
  const created={};
  try{
   operatorClient=createClient(config.url,config.key,{
    auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,
      flowType:'pkce',storageKey:'loveroll-eclat-qa-operator-memory'}
   });
   for(const role of ['A','B']){
    const client=createClient(config.url,config.key,eclatQaAuthOptions(role));
    if(typeof client?.rpc!=='function'||typeof client?.auth?.signInWithPassword!=='function')
     throw new Error('Client Supabase QA invalide');
    created[role]={client,api:createApi(client),user:null,controller:null};
   }
  }catch(e){
   await operatorClient?.auth?.signOut?.({scope:'local'}).catch(()=>{});
   operatorClient=null;
   for(const p of Object.values(created))
    try{await p.client.auth.signOut({scope:'local'});}catch{/* noop */}
   throw e;
  }
  Object.assign(players.A,created.A);Object.assign(players.B,created.B);
  configured=true;el('url').value='';el('key').value='';
  show('connection',false);show('accounts',true);operatorButtons();
  feedback('Base QA distincte connectée. Identifiez maintenant les deux comptes test.');
 }
 async function signIn(role,form){
  if(!configured)throw new Error('Branchez d’abord une base de test');
  if(!operatorId||!qaHealthOk)
   throw new Error('Un opérateur QA autorisé doit vérifier les tables du projet dédié avant de connecter les joueurs');
  if(players[role].user)throw new Error('Compte '+role+' déjà connecté : déconnecter la base QA pour changer de joueur');
  const email=form.querySelector('[name="email"]')?.value?.trim();
  const input=form.querySelector('[name="password"]');
  const password=input?.value;
  if(input)input.value=''; // Never keep a password through a slow/failed request.
  if(!email||!password)throw new Error('Courriel et mot de passe QA requis');
  const client=players[role].client;
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data?.user?.id)throw new Error(error?.message||'Connexion refusée');
  const {data:confirmed,error:authError}=await client.auth.getUser();
  if(authError||confirmed?.user?.id!==data.user.id){
   // A QA player must never retain an unverified JWT on this admin page.
   try{await client.auth.signOut({scope:'local'});}catch{/* best effort */}
   throw new Error('Identité du joueur non vérifiée');
  }
  const other=role==='A'?'B':'A';
  if(players[other].user?.id===data.user.id||operatorId===data.user.id){
   await client.auth.signOut({scope:'local'});
   throw new Error('Les trois identités QA (opérateur, A et B) doivent être distinctes');
  }
  // Base Soirée has its own server rights and must remain testable even
  // when the QA Premium entitlement or V2 migration is not installed yet.
  // Never grant premium status in the browser; only the actual V2 RPC may.
  let premium=false;
  try{premium=(await players[role].api.status())?.access===true;}
  catch{/* V2 may not be installed in the QA schema yet; Soirée can still run */}
  players[role].user=data.user;players[role].eclatAccess=premium;
  progress(role,premium?'Connecté · Éclat autorisé':'Connecté · Éclat non autorisé');
  if(players.A.user&&players.B.user){
   const bothPremium=players.A.eclatAccess&&players.B.eclatAccess;
   show('game',!!bothPremium);
   if(!soireeBench){
    const {mountSoireeQaBench}=await import('./soiree-qa-lab.mjs');
    soireeBench=mountSoireeQaBench({
     root:el('soiree'),clientA:players.A.client,clientB:players.B.client,
     userA:players.A.user,userB:players.B.user,
     onError:e=>feedback('Soirée QA : '+(e?.message||'Refus du serveur'),true)
    });
   }
   show('soiree',true);
   feedback(bothPremium?
    'Deux comptes QA connectés : Éclat V2 et Soirée D6/D100 accessibles selon les règles serveur.':
    'Deux comptes QA connectés : Soirée disponible selon les droits du serveur. Éclat V2 attend une migration et un abonnement QA valides.');
  }
 }
 async function attach(a,b){
  const sid=validateEclatQaPair({
   userA:players.A.user,userB:players.B.user,statusA:a,statusB:b
  });
  dropPlayers();sessionId=sid;
  for(const [role,status] of [['A',a],['B',b]]){
   const p=players[role];
   p.controller=createPlayer({root:el('stage-'+role),api:p.api,
    viewerId:p.user.id,initialStatus:status,
    onError:e=>feedback('Joueur '+role+' : '+(e?.message||'Action refusée'),true)});
  }
  feedback('Vraie séance QA en cours. A et B ont chacun leurs données et leurs actions.');
  resumeTicker();
 }
 async function resume(){
  if(!players.A.user||!players.B.user)throw new Error('Connectez A et B');
  const [a,b]=await Promise.all([players.A.api.status(),players.B.api.status()]);
  if(!a?.active||!b?.active)throw new Error('Aucune séance QA active pour ce duo');
  await attach(a,b);
 }
 async function start(){
  if(!players.A.user||!players.B.user)throw new Error('Connectez A et B');
  const coffretId=Number(el('coffret').value),minutes=Number(el('minutes').value);
  if(!Number.isInteger(coffretId)||coffretId<1||coffretId>12||
     ![30,60,90].includes(minutes))throw new RangeError('Coffret ou durée invalide');
  const prior=await Promise.all([players.A.api.status(),players.B.api.status()]);
  validateEclatQaReadyToStart(prior[0],prior[1]);
  const a=await players.A.api.start({coffretId,minutes,deviceMode:'two'});
  // B uses a separate authenticated Supabase client. Never act as B using A's JWT.
  // A just-created QA session is stopped if this real partner check fails;
  // do not leave an orphan QA game that blocks subsequent tests.
  try{
   const b=await players.B.api.status(a.session_id);
   await attach(a,b);
  }catch(error){
   if(a?.active&&a.chapter_index&&a.session_id){
    try{await players.A.api.act({sessionId:a.session_id,
      expectedStep:a.chapter_index,action:'stop'});}catch{/* report original failure */}
   }
   throw error;
  }
 }
 async function refresh(){
  if(!sessionId)throw new Error('Commencez ou reprenez une séance QA');
  const read=await Promise.all([players.A.controller.refresh(),players.B.controller.refresh()]);
  if(read.some(applied=>applied===false)){
   feedback('Une action est en cours ou une lecture périmée a été ignorée. Réessayez Actualiser une fois les actions terminées.');
   return;
  }
  feedback('Deux écrans resynchronisés depuis les vrais états du serveur QA.');
 }
 async function onClick(event){
  const target=event.target?.closest?.('[data-eclat-qa-action]');
  if(!target||!root.contains(target)||busy||!active)return;
  busy=true;
  try{
   const command=target.getAttribute('data-eclat-qa-action');
   if(command==='connect')await connect();
   if(command==='disconnect')await disconnect();
   if(command==='start')await start();
   if(command==='resume')await resume();
   if(command==='refresh')await refresh();
   if(command==='qa-health'){
    const health=await callOperator('health');
    qaHealthOk=health.ready===true;
    feedback(qaHealthOk?
     'Tables minimales QA présentes. Vérifier ensuite les fonctions et accès Premium des joueurs.':
     'Pré-requis QA incomplets : '+(health.checks||[]).filter(c=>!c.present)
       .map(c=>c.table).join(', '),!qaHealthOk);
   }
   if(command==='qa-create'){
    if(!qaHealthOk)throw new Error('Vérifier les tables QA avant de créer une paire');
    const result=await callOperator('create');
    dropPrivate();
    const area=el('one-time-passwords');area.hidden=false;
    const title=document.createElement('p');
    title.textContent='Mots de passe visibles une seule fois. Copiez-les maintenant; ils disparaissent à la déconnexion.';
    area.append(title);
    for(const account of result.accounts||[]){
     const row=document.createElement('p');
     row.textContent='Compte '+account.role+' · '+account.email+' · '+account.password;
     area.append(row);
    }
    feedback('Paire de test créée uniquement sur QA. Vérifier l’accès Premium QA avant de lancer le jeu.');
    const list=await callOperator('list');paintManaged(list.pairs||[]);
   }
   if(command==='qa-list'){
    dropPrivate();
    const list=await callOperator('list');paintManaged(list.pairs||[]);
    feedback('Inventaire des paires QA appartenant à cet opérateur.');
   }
   if(command==='qa-expire'){
    dropPrivate();
    const result=await callOperator('expire');
    const list=await callOperator('list');paintManaged(list.pairs||[]);
    feedback('Expiration QA demandée : '+(result.results||[]).filter(x=>x.deleted).length+
     ' paires nettoyées; vérifier les échecs éventuels dans le journal serveur.');
   }
   if(command==='qa-operator-logout'){
    await operatorLogout();feedback('Opérateur QA déconnecté et mots de passe effacés.');
   }
   if(command==='qa-delete'){
    if(players.A.user||players.B.user||sessionId)
     throw new Error('Déconnectez les joueurs et arrêtez la séance avant de supprimer leur paire');
    const pairId=target.dataset.pairId;
    if(typeof pairId!=='string'||!/^[-0-9a-f]{36}$/.test(pairId))return;
    if(globalThis.confirm?.('Supprimer définitivement uniquement cette paire QA et ses sessions ?')!==true)return;
    dropPrivate();await callOperator('delete',{pairId});
    const list=await callOperator('list');paintManaged(list.pairs||[]);
    feedback('Paire QA supprimée et comptes Auth révoqués côté serveur.');
   }
  }catch(e){feedback(e?.message||'Opération impossible',true);}
  finally{busy=false;operatorButtons();}
 }
 async function onSubmit(event){
  const form=event.target,role=form?.getAttribute?.('data-eclat-qa-form');
  const operatorForm=form?.hasAttribute?.('data-eclat-qa-operator-form');
  if(!root.contains(form)||!operatorForm&&!['A','B'].includes(role))return;
  event.preventDefault();
  if(busy||!active)return;
  busy=true;
  try{if(operatorForm)await operatorSignIn(form);
   else await signIn(role,form);}
  catch(e){feedback((operatorForm?'Opérateur QA':'Compte '+role)+
   ' : '+(e?.message||'Connexion refusée'),true);}
  finally{busy=false;}
 }
 root.addEventListener('click',onClick);
 root.addEventListener('submit',onSubmit);
 return Object.freeze({disconnect,destroy(){
  active=false;soireeBench?.destroy();soireeBench=null;
  stopTicker();dropPlayers();dropPrivate();
  operatorId=null;operatorClient?.auth?.signOut?.({scope:'local'}).catch(()=>{});
  operatorClient=null;
  root.removeEventListener('click',onClick);root.removeEventListener('submit',onSubmit);
  // Local scoped logout does NOT sign out the production platform administrator.
  for(const role of ['A','B'])
   players[role].client?.auth?.signOut?.({scope:'local'}).catch(()=>{});
  for(const role of ['A','B'])players[role]={};
  configured=false;sessionId=null;
 }});
}
