// LoveRoll Studio REAL dual-account sandbox. Never impersonate customer accounts.
// Service role stays on server. Does not affect other couples or roll engines.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';

const headers={
  'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store',
  'Access-Control-Allow-Origin':'https://fredvolks.github.io',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
};
const response=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers});
function serviceKey(){
 const direct=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(direct)return direct;
 try{const value=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
  return typeof value==='string'?value:''}catch{return ''}
}
type Seat='A'|'B';
type RegistrySeat={seat:Seat,user_id:string|null,synthetic_email:string};
const seatName=(value:unknown):Seat|null=>value==='A'||value==='B'?value:null;
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return response({error:'Méthode refusée'},405);
 const origin=req.headers.get('origin');
 if(origin&&origin!=='https://fredvolks.github.io')
  return response({error:'Origine interdite'},403);
 const supabaseUrl=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();
 if(!supabaseUrl||!key)return response({error:'Configuration serveur indisponible'},503);
 const token=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)return response({error:'Connexion requise'},401);
 const service=createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await service.auth.getUser(token);
 if(identityError||!identity.user?.id)return response({error:'Identité non valide'},401);
 if(!identity.user.email_confirmed_at)return response({error:'Compte non vérifié'},403);
 const adminId=identity.user.id;
 const {data:admin,error:adminError}=await service.from('love_platform_admins')
   .select('user_id').eq('user_id',adminId).maybeSingle();
 if(adminError)return response({error:'Contrôle Super Admin indisponible'},503);
 if(!admin)return response({error:'Réservé au Super Admin LoveRoll'},403);
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return response({error:'JSON invalide'},400)}
 const action=body.action;
 const seat=seatName(body.seat);
 if(!['status','create','seat_login','delete'].includes(String(action)))
  return response({error:'Action interdite'},400);

 // Defense in depth: never fetch another couple's private cards, or issue an
 // Auth token, merely because a stale/corrupted Studio registry says "ready".
 // Cross-check both genuine Auth identities, their private synthetic tags,
 // exact pair membership and the couple's registered owner on every use.
 async function validRegisteredPair(coupleId:string|null,seats:Array<{
  seat:string,user_id:string|null,synthetic_email:string
 }>|null):Promise<boolean>{
  if(!coupleId||seats?.length!==2)return false;
  const a=seats.find(s=>s.seat==='A'),b=seats.find(s=>s.seat==='B');
  if(!a?.user_id||!b?.user_id||a.user_id===b.user_id||
     !a.synthetic_email||!b.synthetic_email)return false;
  try{
   const [couple,members,authA,authB]=await Promise.all([
    service.from('couples').select('owner_user_id').eq('id',coupleId).maybeSingle(),
    service.from('couple_members').select('user_id').eq('couple_id',coupleId).limit(3),
    service.auth.admin.getUserById(a.user_id),
    service.auth.admin.getUserById(b.user_id)
   ]);
   if(couple.error||couple.data?.owner_user_id!==a.user_id||
      members.error||members.data?.length!==2||
      !members.data.some(m=>m.user_id===a.user_id)||
      !members.data.some(m=>m.user_id===b.user_id))return false;
   const validAuth=(record:typeof authA,seat:{user_id:string|null;synthetic_email:string})=>
    !record.error&&record.data?.user?.id===seat.user_id&&
    record.data.user.app_metadata?.love_studio_test===true&&
    record.data.user.app_metadata?.love_studio_admin===adminId&&
    record.data.user.email===seat.synthetic_email;
   return validAuth(authA,a)&&validAuth(authB,b);
  }catch{return false}
 }

 async function auditStudio(event:
  'create_requested'|'create_succeeded'|'create_failed'|
  'login_requested'|'delete_requested'|'delete_completed'|'delete_failed'){
  // No request body, emails, OTP hashes, Auth IDs or card data in this log.
  const {error}=await service.from('love_studio_test_audit').insert({
   admin_id:adminId,action:event
  });
  if(error)throw Error('Journal privé du Studio indisponible');
 }

 async function status(){
  const {data:audit,error:auditError}=await service.from('love_studio_test_audit')
   .select('action,created_at').eq('admin_id',adminId)
   .order('created_at',{ascending:false}).limit(8);
  if(auditError)throw Error('Journal de test indisponible');
  const {data:pool,error:poolError}=await service.from('love_studio_test_pools')
    .select('couple_id,state,created_at').eq('admin_id',adminId).maybeSingle();
  if(poolError)throw Error('État de test indisponible');
  if(!pool)return {ready:false,state:'missing',seats:[],audit:audit||[]};
  const {data:seats,error:seatError}=await service.from('love_studio_test_seats')
    .select('seat,user_id,synthetic_email').eq('admin_id',adminId).order('seat');
  if(seatError)throw Error('Profils de test indisponibles');
  // All QA diagnostics are read-only, scoped to this verified admin's
  // registered technical couple. Never touch customer rolls or create faces.
  const ready=pool.state==='ready'&&
   await validRegisteredPair(pool.couple_id,seats||null);
  let game:null|Record<string,unknown>=null;
  if(ready){
   try{
    const checked=async(promise:PromiseLike<{data:any,error:any}>)=>{
     const {data,error}=await promise;
     if(error)throw Error('Diagnostic du jeu indisponible');
     return data;
    };
    const [weekly,monthly,latest,entitlement]=await Promise.all([
     checked(service.from('couple_rolls').select('face,created_at')
      .eq('couple_id',pool.couple_id).eq('kind','weekly')
      .order('created_at',{ascending:false}).limit(1)),
     checked(service.from('couple_rolls').select('face,created_at')
      .eq('couple_id',pool.couple_id).eq('kind','monthly_activity')
      .order('created_at',{ascending:false}).limit(1)),
     checked(service.from('couple_sessions').select('id,finished_at')
      .eq('couple_id',pool.couple_id).order('started_at',{ascending:false})
      .limit(1).maybeSingle()),
     checked(service.from('love_eclat_entitlements').select('enabled,ends_at')
      .eq('couple_id',pool.couple_id).maybeSingle())
    ]);
    // Count is exact; retrieve only three cards. Never silently truncate
    // challenge totals at Supabase's Data API row limit (often 1,000).
    const [personal,challengeResult]=latest?.id?await Promise.all([
     checked(service.from('couple_personal_rolls').select('user_id,face')
      .eq('session_id',latest.id)),
     service.from('couple_challenges')
      .select('status,recipient,card_title,card_description,category,face,created_at',
       {count:'exact'})
      .eq('couple_id',pool.couple_id).eq('session_id',latest.id)
      .order('created_at',{ascending:false}).limit(3)
    ]):[[],{data:[],count:0,error:null}];
    if(challengeResult.error||typeof challengeResult.count!=='number')
     throw Error('Diagnostic du jeu indisponible');
    const challenges=challengeResult.data||[];
    const seatFace=(s:Seat)=>personal.find((r:{user_id:string})=>
     r.user_id===seats.find(x=>x.seat===s)?.user_id)?.face??null;
    game={
     weekly_face:weekly?.[0]?.face??null,
     monthly_face:monthly?.[0]?.face??null,
     session:latest?(latest.finished_at?'finished':'open'):'not_started',
     personal_faces:{A:seatFace('A'),B:seatFace('B')},
     challenges_total:challengeResult.count,
     // Only actual cards stored by official drawing RPCs, latest first.
     challenge_preview:challenges.map((row:{
      recipient:string|null,card_title:string|null,card_description:string|null,
      category:string|null,face:number|null,status:string|null
     })=>({
      seat:seats.find(x=>x.user_id===row.recipient)?.seat??'?',
      category:row.category??'',face:row.face??null,
      title:row.card_title??'',description:row.card_description??'',
      status:row.status??''
     })),
     eclat_enabled:entitlement?.enabled===true&&
       (!entitlement.ends_at||new Date(entitlement.ends_at).getTime()>Date.now())
    };
   }catch{
    game={error:'Diagnostic temporairement indisponible'};
   }
  }
  return {ready,state:pool.state==='ready'&&!ready?'invalid':pool.state,
    seats:ready?(seats||[]).map(x=>({seat:x.seat,ready:true,user_id:x.user_id})):[],
    created_at:pool.created_at,game,audit:audit||[]};
 }
 if(action==='status'){
  try{return response(await status())}
  catch{return response({error:'État temporairement indisponible'},503)}
 }
 if(action==='seat_login'){
  if(!seat)return response({error:'Joueur de test invalide'},400);
  const {data:pool}=await service.from('love_studio_test_pools')
   .select('state,couple_id').eq('admin_id',adminId).maybeSingle();
  if(pool?.state!=='ready'||!pool.couple_id)return response({error:'Créer le duo test avant de jouer'},409);
  const {data:rows,error:rowsError}=await service.from('love_studio_test_seats')
   .select('seat,user_id,synthetic_email').eq('admin_id',adminId);
  if(rowsError||!await validRegisteredPair(pool.couple_id,rows||null))
   return response({error:'Identités du couple de test non vérifiées'},403);
  const row=rows?.find(r=>r.seat===seat);
  if(!row?.user_id||!row.synthetic_email)return response({error:'Joueur de test absent'},409);
  try{await auditStudio('login_requested')}
  catch{return response({error:'Journal de sécurité indisponible'},503)}
  const {data:link,error:linkError}=await service.auth.admin.generateLink({
    type:'magiclink',email:row.synthetic_email
  });
  if(linkError||!link?.properties?.hashed_token)
    return response({error:'Ouverture de session test indisponible'},503);
  // Supabase generateLink('magiclink') may create a user if the supplied
  // email was deleted concurrently. The returned link MUST refer to the
  // previously registered technical account; never log in a new orphan or
  // silently grant access to an unrelated identity.
  if(link.user?.id!==row.user_id||
     link.user?.email!==row.synthetic_email||
     link.user?.app_metadata?.love_studio_test!==true||
     link.user?.app_metadata?.love_studio_admin!==adminId)
    return response({error:'Lien Auth non conforme au joueur technique enregistré'},409);
  // One-time Auth verification token: returned ONLY to this verified platform admin.
  return response({seat,token_hash:link.properties.hashed_token,user_id:row.user_id});
 }
 if(action==='create'){
  try{await auditStudio('create_requested')}
  catch{return response({error:'Journal de sécurité indisponible'},503)}
  const {error:reservationError}=await service.from('love_studio_test_pools')
   .insert({admin_id:adminId,state:'creating'}).select('admin_id').single();
  if(reservationError)return response({error:reservationError.code==='23505'
    ?'Un banc de test existe déjà pour ce Super Admin':'Réservation impossible'},reservationError.code==='23505'?409:503);
  const ids:string[]=[];let newCouple:string|null=null;
  try{
    const rows:RegistrySeat[]=[];
    for(const s of ['A','B'] as Seat[]){
      const email='loveroll-studio-'+crypto.randomUUID()+'@example.invalid';
      const {data:created,error:authError}=await service.auth.admin.createUser({
        email,email_confirm:true,
        password:crypto.randomUUID()+'!'+crypto.randomUUID(),
        user_metadata:{display_name:s==='A'?'Joueur A (test)':'Joueur B (test)'},
        app_metadata:{love_studio_test:true,love_studio_admin:adminId}
      });
      if(authError||!created.user)throw Error('Création du compte technique indisponible');
      ids.push(created.user.id);
      rows.push({seat:s,user_id:created.user.id,synthetic_email:email});
      const {error:seatError}=await service.from('love_studio_test_seats')
        .insert({admin_id:adminId,...rows.at(-1)});
      if(seatError)throw Error('Inscription du joueur test impossible');
    }
    const {data:couple,error:coupleError}=await service.from('couples')
      .insert({owner_user_id:ids[0]}).select('id').single();
    if(coupleError||!couple?.id)throw Error('Création du couple test impossible');
    newCouple=couple.id;
    // Register the new couple BEFORE writing profiles, entitlements or members.
    // If any later step fails, the privileged purge RPC can now locate and
    // remove the very same synthetic couple, not just its Auth identities.
    const {data:registeredCouple,error:registerError}=await service.from('love_studio_test_pools')
      .update({couple_id:newCouple,updated_at:new Date().toISOString()})
      .eq('admin_id',adminId).eq('state','creating').is('couple_id',null)
      .select('couple_id').single();
    if(registerError||registeredCouple?.couple_id!==newCouple)
      throw Error('Référence du couple de test indisponible; nettoyage requis');
    const {error:profilesError}=await service.from('couple_profiles').insert([
      {id:ids[0],display_name:'Joueur A (test)',gender:'him',play_style:'medium'},
      {id:ids[1],display_name:'Joueur B (test)',gender:'her',play_style:'medium'}
    ]);
    if(profilesError)throw Error('Profils du test indisponibles');
    const {error:membersError}=await service.from('couple_members').insert([
      {couple_id:newCouple,user_id:ids[0]},
      {couple_id:newCouple,user_id:ids[1]}
    ]);
    if(membersError)throw Error('Appariement du duo test impossible');
    // Studio entitlements are genuine server-side exemptions for ONLY these
    // two newly created synthetic Auth users. They are NOT Stripe payments,
    // provider grants, customer revenue, or a browser-side bypass.
    const {error:accessError}=await service.from('love_account_premium_exemptions').insert(
      ids.map(id=>({
        user_id:id,premium_lifetime:true,monthly_d100_limit:12,
        all_features:true,reason:'studio_synthetic_qa_only'
      }))
    );
    if(accessError)throw Error('Accès de test du jeu de base indisponible');
    const {error:eclatError}=await service.from('love_eclat_entitlements').insert({
      couple_id:newCouple,enabled:true,ends_at:null,source:'studio_test_only'
    });
    if(eclatError)throw Error('Accès Éclat de test indisponible');
    const {error:finishError}=await service.from('love_studio_test_pools')
      .update({couple_id:newCouple,state:'ready',updated_at:new Date().toISOString()})
      .eq('admin_id',adminId);
    if(finishError)throw Error('Finalisation du duo test impossible');
    try{await auditStudio('create_succeeded')}catch{/* Requested event retained. */}
    return response({ready:true,state:'ready',seats:[{seat:'A',ready:true},{seat:'B',ready:true}]});
  }catch(err){
    // Recover only IDs produced by this request; a registrable partial failure
    // remains in "creating" so a privileged retry can clean it safely.
    try {
      // A failed database registration is the only case where the fresh
      // couple is still not reachable through the registry. If safe, delete
      // that exact newly inserted ID with its synthetic owner before purge.
      if(newCouple){
        const {data:linked}=await service.from('love_studio_test_pools')
          .select('couple_id').eq('admin_id',adminId).maybeSingle();
        if(!linked?.couple_id){
          const {error:orphanError}=await service.from('couples').delete()
            .eq('id',newCouple).eq('owner_user_id',ids[0]);
          if(orphanError)throw orphanError;
        }
      }
      const purge=await service.rpc('love_studio_purge_test_couple',{p_admin:adminId});
      if(!purge.error){
        // Never erase the registry while a technical Auth identity might
        // still exist. Keeping it allows retry by this exact Super Admin.
        let identitiesClean=true;
        for(const id of ids){
          const result=await service.auth.admin.getUserById(id);
          if(result.error){identitiesClean=false;continue;}
          if(!result.data?.user)continue;
          if(result.data.user.app_metadata?.love_studio_test!==true ||
             result.data.user.app_metadata?.love_studio_admin!==adminId){
            identitiesClean=false;continue;
          }
          const {error:deleteError}=await service.auth.admin.deleteUser(id);
          if(deleteError)identitiesClean=false;
        }
        if(identitiesClean)
          await service.from('love_studio_test_pools').delete().eq('admin_id',adminId);
      }
    }catch{/* Retain private registry if cleanup fails. */}
    try{await auditStudio('create_failed')}catch{/* Requested event retained. */}
    return response({error:err instanceof Error?err.message:'Création incomplète',
      detail:'Si le banc reste réservé, demandez sa suppression sécurisée.'},503);
  }
 }
 // Before touching even one couple row, verify the two registered Auth users
 // really belong to this studio sandbox. A corrupted registry must never
 // initiate any deletion (including a database-level cascade).
 const {data:registered,error:registeredError}=await service.from('love_studio_test_seats')
  .select('seat,user_id').eq('admin_id',adminId);
 if(registeredError)return response({error:'Registre de test indisponible'},503);
 for(const row of registered||[]){
  if(!row.user_id)continue;
  const {data:u,error:lookupError}=await service.auth.admin.getUserById(row.user_id);
  if(lookupError||!u?.user||u.user.app_metadata?.love_studio_test!==true||
     u.user.app_metadata?.love_studio_admin!==adminId)
    return response({error:'Identité non-test détectée : aucune suppression effectuée'},403);
 }
 // DELETE only the registered test couple plus its two technical identities.
 // SQL additionally refuses deletion if any unexpected real member is present.
 try{await auditStudio('delete_requested')}
 catch{return response({error:'Journal de sécurité indisponible'},503)}
 try{
  const {data:seats,error:purgeError}=await service.rpc('love_studio_purge_test_couple',{p_admin:adminId});
  if(purgeError)return response({error:'Purge du banc refusée : '+purgeError.message},409);
  for(const row of Array.isArray(seats)?seats:[]){
    const id=row.user_id;
    if(!id)continue;
    const {data:u,error:lookupError}=await service.auth.admin.getUserById(id);
    // A network/Auth outage is NOT proof that the identity was removed.
    // Retain the private registry for a safe retry in that situation.
    if(lookupError){
      if(lookupError.status===404||lookupError.code==='user_not_found')continue;
      return response({error:'Identité Auth non vérifiable; registre conservé'},503);
    }
    if(!u?.user)return response({error:'Réponse Auth incomplète; registre conservé'},503);
    if(u.user.app_metadata?.love_studio_test!==true||
       u.user.app_metadata?.love_studio_admin!==adminId)
      return response({error:'Protection : suppression identité non-test interdite'},403);
    const {error:delError}=await service.auth.admin.deleteUser(id);
    if(delError)return response({error:'Suppression partielle, relancer la suppression de ce banc'},503);
  }
  const {error:clearError}=await service.from('love_studio_test_pools')
    .delete().eq('admin_id',adminId);
  if(clearError)return response({error:'Nettoyage du registre incomplet'},503);
  try{await auditStudio('delete_completed')}catch{/* Requested event retained. */}
  return response({deleted:true});
 }catch{
  try{await auditStudio('delete_failed')}catch{/* Requested event retained. */}
  return response({error:'Suppression interrompue'},503)
 }
});
