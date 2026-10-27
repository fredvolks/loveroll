// QA-ONLY server endpoint. Never deploy to the production LoveRoll Supabase project.
// User JWT is verified by Supabase; only an explicit operator UUID in this QA
// project is allowed. Admin secret stays within the Edge runtime.
import {withSupabase} from 'npm:@supabase/server@1';
import {verifyQaOperator,checkQaManagedUser,validatePairLedger}
 from '../_shared/loveroll-qa-guards.mjs';

type Admin = {
 auth: {admin:{
  createUser:(args:Record<string,unknown>)=>Promise<{data:{user?:{id:string}|null},error:any}>,
  getUserById:(id:string)=>Promise<{data:{user?:any}|null,error:any}>,
  deleteUser:(id:string)=>Promise<{error:any}>
 }},
 from:(table:string)=>any
};
function getString(key:string){return Deno.env.get(key)?.trim()||'';}
function errorResponse(message:string,status=400){
 return Response.json({ok:false,error:message},{status,headers:{'Cache-Control':'no-store'}});
}
function uuid(){return crypto.randomUUID();}
function password(){
 const raw=crypto.getRandomValues(new Uint8Array(32));
 let value='';
 for(const byte of raw)value+=String.fromCharCode(byte);
 return btoa(value).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function assertResult<T>(query:PromiseLike<{data:T,error:any}>):Promise<T>{
 const {data,error}=await query;if(error)throw error;return data;
}
const notFound=(error:any)=>error?.status===404||error?.code==='user_not_found';
async function deleteManagedPair(admin:Admin,pair:any,operatorId:string){
 validatePairLedger(pair,operatorId);
 // Validate metadata of BOTH authors BEFORE deleting a single object.
 const users=[] as {id:string,role:'A'|'B',exists:boolean}[];
 for(const [id,role] of [[pair.user_a,'A'],[pair.user_b,'B']] as const){
  const {data,error}=await admin.auth.admin.getUserById(id);
  if(error&&!notFound(error))throw error;
  if(data?.user)checkQaManagedUser(data.user,pair.id,role);
  users.push({id,role,exists:!!data?.user});
 }
 await assertResult(admin.from('loveroll_qa_managed_pairs')
  .update({state:'deleting'}).eq('id',pair.id).eq('operator_id',operatorId).select('id').single());
 // Verify the couple has not acquired any unrelated member since provision.
 // Otherwise a stale ledger could delete a real person's couple. Retrying a
 // partially deleted pair (zero or one remaining member) stays possible.
 const {data:members,error:membersError}=await admin.from('couple_members')
  .select('user_id').eq('couple_id',pair.couple_id);
 if(membersError)throw membersError;
 const allowed=new Set([pair.user_a,pair.user_b]);
 if((members||[]).some((member:any)=>!allowed.has(member.user_id)))
  throw new Error('Suppression bloquée : ce couple QA contient un autre membre');
 // Cascades to the couple's V1/V2 sessions and private game data, but not any
 // unrelated couple. A missing couple is valid when retrying partial cleanup.
 const {error:coupleError}=await admin.from('couples').delete().eq('id',pair.couple_id);
 if(coupleError)throw coupleError;
 for(const u of users){
  if(u.exists){
   const {error}=await admin.auth.admin.deleteUser(u.id);
   if(error&&!notFound(error))throw error;
  }
 }
 await assertResult(admin.from('loveroll_qa_managed_pairs')
  .delete().eq('id',pair.id).eq('operator_id',operatorId));
}
async function findPair(admin:Admin,id:string,operatorId:string){
 const {data,error}=await admin.from('loveroll_qa_managed_pairs')
  .select('id,operator_id,couple_id,user_a,user_b,state,created_at,expires_at')
  .eq('id',id).eq('operator_id',operatorId).maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('Paire QA inconnue ou non autorisée');
 return validatePairLedger(data,operatorId);
}
async function createPair(admin:Admin,operatorId:string){
 const existing=await assertResult<any[]>(admin.from('loveroll_qa_managed_pairs')
  .select('id').eq('operator_id',operatorId).limit(12));
 if(existing.length>=12)throw new Error('Maximum de 12 paires QA : nettoyer les anciennes avant');
 const batch=uuid(),couple=uuid();
 const expiresAt=new Date(Date.now()+48*3600*1000).toISOString();
 const creds=[] as {role:'A'|'B',email:string,password:string,id:string}[];
 let ledger=false;
 try{
  for(const role of ['A','B'] as const){
   const email='loveroll-qa-'+batch.replaceAll('-','')+'-'+role.toLowerCase()+'@example.com';
   const secret=password();
   const {data,error}=await admin.auth.admin.createUser({
    email,password:secret,email_confirm:true,
    app_metadata:{loveroll_qa_managed:true,loveroll_qa_batch:batch,loveroll_qa_role:role}
   });
   if(error||!data?.user?.id)throw error||new Error('Création Auth QA échouée');
   creds.push({role,email,password:secret,id:data.user.id});
  }
  await assertResult(admin.from('loveroll_qa_managed_pairs').insert({
   id:batch,operator_id:operatorId,couple_id:couple,
   user_a:creds[0].id,user_b:creds[1].id,
   state:'deleting',expires_at:expiresAt
  }).select('id').single());
  ledger=true;
  await assertResult(admin.from('couples').insert({id:couple}).select('id').single());
  // The actual LoveRoll onboarding and account UI expect a profile row for
  // each player. Upsert is safe if QA schema has an Auth trigger generating it.
  await assertResult(admin.from('couple_profiles').upsert([
   {id:creds[0].id,display_name:'Test A'},
   {id:creds[1].id,display_name:'Test B'}
  ],{onConflict:'id'}).select('id'));
  await assertResult(admin.from('couple_members').insert([
   {couple_id:couple,user_id:creds[0].id},
   {couple_id:couple,user_id:creds[1].id}
  ]));
  await assertResult(admin.from('loveroll_qa_managed_pairs').update({state:'active'})
   .eq('id',batch).eq('operator_id',operatorId).select('id').single());
  return {ok:true,pairId:batch,coupleId:couple,expiresAt,
   accounts:creds.map(({role,email,password})=>({role,email,password})),
   note:'Mots de passe montrés une seule fois; supprimer cette paire après les tests. Accès premium QA à vérifier.'};
 }catch(error){
  // Never mark a partially created duo as healthy. The ledger remains to allow
  // safe targeted retries if removal is blocked by a restrictive foreign key.
  if(ledger){
   try{await deleteManagedPair(admin,await findPair(admin,batch,operatorId),operatorId);}
   catch{
    await admin.from('loveroll_qa_managed_pairs').update({state:'failed'}).eq('id',batch);
   }
  }else{
   for(const u of creds){
    try{await admin.auth.admin.deleteUser(u.id);}catch{/* report failure below */}
   }
  }
  throw new Error('Provisionnement incomplet; vérifier le journal QA et la liste des paires, sans réutiliser ces identifiants');
 }
}
export default {
 fetch:withSupabase({auth:'user'},async(req,ctx)=>{
  // Explicit project and operator are provided by QA-only Edge Function env.
  try{
   verifyQaOperator({
    runtimeUrl:getString('SUPABASE_URL'),
    allowedQaRef:getString('LOVEROLL_QA_APPROVED_PROJECT_REF'),
    operatorId:getString('LOVEROLL_QA_OPERATOR_USER_ID'),
    actorId:ctx.userClaims?.id
   });
  }catch{return errorResponse('Fonction réservée au projet et à l’opérateur LoveRoll QA',403);}
  const allowedOrigin=getString('LOVEROLL_QA_STUDIO_ORIGIN');
  if(!allowedOrigin||allowedOrigin!=='https://fredvolks.github.io'||
     (req.headers.has('origin')&&req.headers.get('origin')!==allowedOrigin))
   return errorResponse('Origine de la console QA refusée',403);
  if(req.method!=='POST')return errorResponse('Méthode interdite',405);
  const admin=ctx.supabaseAdmin as unknown as Admin;
  if(!admin)return errorResponse('Administration QA indisponible',503);
  try{
   const body=await req.json();
   if(!body||typeof body!=='object'||Array.isArray(body))return errorResponse('Commande invalide');
   const operator=ctx.userClaims!.id;
   if(body.action==='health'){
    // Read-only schema prerequisite check. It does NOT claim real Premium
    // rights, Stripe readiness, Edge deployment or real player testing.
    const required=[
     ['loveroll_qa_managed_pairs','id'],
     ['couples','id'],['couple_profiles','id'],['couple_members','couple_id'],
     ['love_eclat_v2_sessions','id'],
     ['couple_sessions','id'],['couple_rolls','id']
    ] as const;
    const checks=[] as {table:string,present:boolean}[];
    for(const [table,column] of required){
     const {error}=await admin.from(table).select(column,{head:true,count:'exact'}).limit(0);
     checks.push({table,present:!error});
    }
    return Response.json({ok:true,ready:checks.every(x=>x.present),checks,
      warning:'Vérifie seulement les tables; le Premium QA et les RPC restent à tester.'},
      {headers:{'Cache-Control':'no-store'}});
   }
   if(body.action==='create'){
    const result=await createPair(admin,operator);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
   }
   if(body.action==='list'){
    const entries=await assertResult<any[]>(admin.from('loveroll_qa_managed_pairs')
     .select('id,couple_id,user_a,user_b,state,created_at,expires_at')
     .eq('operator_id',operator).order('created_at',{ascending:false}).limit(12));
    return Response.json({ok:true,pairs:entries},{headers:{'Cache-Control':'no-store'}});
   }
   if(body.action==='delete'){
    if(typeof body.pairId!=='string')return errorResponse('Identifiant de paire requis');
    const pair=await findPair(admin,body.pairId,operator);
    try{await deleteManagedPair(admin,pair,operator);}
    catch(error){
     await admin.from('loveroll_qa_managed_pairs').update({state:'failed'}).eq('id',pair.id);
     throw error;
    }
    return Response.json({ok:true,deleted:true},{headers:{'Cache-Control':'no-store'}});
   }
   if(body.action==='expire'){
    const now=new Date().toISOString();
    const old=await assertResult<any[]>(admin.from('loveroll_qa_managed_pairs')
     .select('id').eq('operator_id',operator).lt('expires_at',now).limit(12));
    const results=[];
    for(const candidate of old){
     try{await deleteManagedPair(admin,await findPair(admin,candidate.id,operator),operator);
      results.push({pairId:candidate.id,deleted:true});
     }catch{results.push({pairId:candidate.id,deleted:false});}
    }
    return Response.json({ok:true,results},{headers:{'Cache-Control':'no-store'}});
   }
   return errorResponse('Opération QA inconnue');
  }catch(error){
   // No secret, credential, internal SQL, email or service key in error bodies.
   console.warn('LoveRoll QA operator action refused or incomplete',String(error).slice(0,200));
   return errorResponse('Opération QA non terminée : consulter le journal serveur et réessayer sans toucher à la production',409);
  }
 })
};
