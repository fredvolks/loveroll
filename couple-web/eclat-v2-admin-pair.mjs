// Éclat V2 private test pair: real independent identities, never privileged impersonation.
// Test accounts are provided by the owner and remain subject to the normal V2 RPC guards.
export function createEclatV2AdminPair({clientFactory,gatewayFactory,adminUserId}){
 if(typeof clientFactory!=='function'||typeof gatewayFactory!=='function'||!adminUserId)
  throw new TypeError('Client test isolé, API officielle et propriétaire requis');
 const slots={A:null,B:null};
 const assertRole=role=>{if(!['A','B'].includes(role))throw new RangeError('Rôle inconnu');};
 function summary(role){
  assertRole(role);
  const slot=slots[role];
  return slot?Object.freeze({connected:true,userId:slot.userId,api:slot.api}):
   Object.freeze({connected:false,userId:null,api:null});
 }
 async function connect(role,email,password){
  assertRole(role);
  if(slots[role])throw new Error('Déconnectez ce joueur avant un autre essai');
  if(typeof email!=='string'||!email.trim()||typeof password!=='string'||!password)
   throw new Error('Courriel et mot de passe de test requis');
  const client=clientFactory(role);
  if(!client?.auth?.signInWithPassword||!client.auth.getUser||!client.auth.signOut)
   throw new TypeError('Authentification séparée indisponible');
  try{
   const result=await client.auth.signInWithPassword({email:email.trim(),password});
   if(result.error)throw result.error;
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user?.id)throw error||new Error('Compte de test non reconnu');
   const userId=data.user.id,other=slots[role==='A'?'B':'A'];
   if(userId===adminUserId)throw new Error('Ne pas utiliser le compte Super Admin pour jouer');
   if(other?.userId===userId)throw new Error('Deux comptes réellement distincts sont requis');
   const api=gatewayFactory(client);
   const state=await api.status();
   if(!state.access)throw new Error('Accès Éclat refusé au compte de test');
   slots[role]={client,api,userId};
   return summary(role);
  }catch(error){
   await client.auth.signOut().catch(()=>{});
   throw error;
  }
 }
 async function disconnect(role){
  assertRole(role);
  const slot=slots[role];slots[role]=null;
  if(slot)await slot.client.auth.signOut().catch(()=>{});
 }
 async function read(role,sessionId=null){
  assertRole(role);
  if(!slots[role])throw new Error('Connecter le compte '+role);
  return slots[role].api.status(sessionId);
 }
 function assertSameActive(a,b){
  if(!a?.active||!b?.active||a.session_id!==b.session_id||
     a.content_version!==2||b.content_version!==2||
     a.device_mode!=='two'||b.device_mode!=='two'||
     a.role_a!==slots.A.userId||a.role_b!==slots.B.userId||
     b.role_a!==a.role_a||b.role_b!==a.role_b)
   throw new Error('Les deux comptes doivent jouer la même séance réelle, avec A et B distincts');
  return Object.freeze({sessionId:a.session_id,coffretId:a.coffret_id});
 }
 async function attach(){
  if(!slots.A||!slots.B)throw new Error('Connecter les deux vrais comptes tests');
  const a=await read('A'),b=await read('B');
  return assertSameActive(a,b);
 }
 async function start({coffretId,minutes}){
  if(!slots.A||!slots.B)throw new Error('Connecter les comptes A et B');
  if(!Number.isInteger(coffretId)||coffretId<1||coffretId>12||
     ![30,60,90].includes(minutes))throw new RangeError('Coffret ou durée inconnu');
  const prior=await Promise.all([read('A'),read('B')]);
  if(prior.some(x=>x.active))
   throw new Error('Une séance existe déjà. Reprenez-la ou terminez-la avant un nouvel essai.');
  const a=await slots.A.api.start({coffretId,minutes,deviceMode:'two'});
  const b=await slots.B.api.status(a.session_id);
  return assertSameActive(a,b);
 }
 async function destroy(){
  await Promise.allSettled(['A','B'].map(disconnect));
 }
 return Object.freeze({connect,disconnect,read,start,attach,summary,destroy});
}
