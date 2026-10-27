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
export function createEclatV2QaWorkbench({
 root,createClient,productionUrl,createApi=createEclatV2SessionApi,
 createPlayer=createEclatV2PlayController,refreshIntervalMs=6000
}){
 if(!root||typeof root.addEventListener!=='function'||typeof createClient!=='function')
  throw new TypeError('Atelier QA : conteneur et création de clients requis');
 let active=true,configured=false,sessionId=null,ticker=null,busy=false;
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
  stopTicker();dropPlayers();sessionId=null;
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
   for(const role of ['A','B']){
    const client=createClient(config.url,config.key,eclatQaAuthOptions(role));
    if(typeof client?.rpc!=='function'||typeof client?.auth?.signInWithPassword!=='function')
     throw new Error('Client Supabase QA invalide');
    created[role]={client,api:createApi(client),user:null,controller:null};
   }
  }catch(e){
   for(const p of Object.values(created))
    try{await p.client.auth.signOut({scope:'local'});}catch{/* noop */}
   throw e;
  }
  Object.assign(players.A,created.A);Object.assign(players.B,created.B);
  configured=true;el('url').value='';el('key').value='';
  show('connection',false);show('accounts',true);
  feedback('Base QA distincte connectée. Identifiez maintenant les deux comptes test.');
 }
 async function signIn(role,form){
  if(!configured)throw new Error('Branchez d’abord une base de test');
  const email=form.querySelector('[name="email"]')?.value?.trim();
  const input=form.querySelector('[name="password"]');
  const password=input?.value;
  if(input)input.value=''; // Never keep a password through a slow/failed request.
  if(!email||!password)throw new Error('Courriel et mot de passe QA requis');
  const client=players[role].client;
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data?.user?.id)throw new Error(error?.message||'Connexion refusée');
  const {data:confirmed,error:authError}=await client.auth.getUser();
  if(authError||confirmed?.user?.id!==data.user.id)
   throw new Error('Identité du joueur non vérifiée');
  const other=role==='A'?'B':'A';
  if(players[other].user?.id===data.user.id){
   await client.auth.signOut({scope:'local'});
   throw new Error('A et B doivent se connecter avec deux comptes différents');
  }
  players[role].user=data.user;progress(role,'Connecté avec le compte QA');
  if(players.A.user&&players.B.user){
   show('game',true);
   feedback('Deux vrais comptes QA connectés. Reprenez une séance ou choisissez un coffret.');
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
  const a=await players.A.api.start({coffretId,minutes,deviceMode:'two'});
  // B uses a separate authenticated Supabase client. Never act as B using A's JWT.
  const b=await players.B.api.status(a.session_id);
  await attach(a,b);
 }
 async function refresh(){
  if(!sessionId)throw new Error('Commencez ou reprenez une séance QA');
  await Promise.all([players.A.controller.refresh(),players.B.controller.refresh()]);
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
  }catch(e){feedback(e?.message||'Opération impossible',true);}
  finally{busy=false;}
 }
 async function onSubmit(event){
  const form=event.target,role=form?.getAttribute?.('data-eclat-qa-form');
  if(!['A','B'].includes(role)||!root.contains(form))return;
  event.preventDefault();
  if(busy||!active)return;
  busy=true;
  try{await signIn(role,form);}
  catch(e){feedback('Compte '+role+' : '+(e?.message||'Connexion refusée'),true);}
  finally{busy=false;}
 }
 root.addEventListener('click',onClick);
 root.addEventListener('submit',onSubmit);
 return Object.freeze({disconnect,destroy(){
  active=false;stopTicker();dropPlayers();
  root.removeEventListener('click',onClick);root.removeEventListener('submit',onSubmit);
  // Local scoped logout does NOT sign out the production platform administrator.
  for(const role of ['A','B'])
   players[role].client?.auth?.signOut?.({scope:'local'}).catch(()=>{});
  for(const role of ['A','B'])players[role]={};
  configured=false;sessionId=null;
 }});
}
