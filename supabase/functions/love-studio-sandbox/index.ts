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

 async function status(){
  const {data:pool,error:poolError}=await service.from('love_studio_test_pools')
    .select('couple_id,state,created_at').eq('admin_id',adminId).maybeSingle();
  if(poolError)throw Error('État de test indisponible');
  if(!pool)return {ready:false,state:'missing',seats:[]};
  const {data:seats,error:seatError}=await service.from('love_studio_test_seats')
    .select('seat,user_id').eq('admin_id',adminId).order('seat');
  if(seatError)throw Error('Profils de test indisponibles');
  // All QA diagnostics are read-only, scoped to this verified admin's
  // registered technical couple. Never touch customer rolls or create faces.
  const ready=pool.state==='ready'&&!!pool.couple_id&&seats?.length===2&&
   seats.every(x=>x.user_id&&seatName(x.seat));
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
    const [personal,challenges]=latest?.id?await Promise.all([
     checked(service.from('couple_personal_rolls').select('user_id,face')
      .eq('session_id',latest.id)),
     checked(service.from('couple_challenges').select('status,recipient')
      .eq('couple_id',pool.couple_id).eq('session_id',latest.id))
    ]):[[],[]];
    const seatFace=(s:Seat)=>personal.find((r:{user_id:string})=>
     r.user_id===seats.find(x=>x.seat===s)?.user_id)?.face??null;
    game={
     weekly_face:weekly?.[0]?.face??null,
     monthly_face:monthly?.[0]?.face??null,
     session:latest?(latest.finished_at?'finished':'open'):'not_started',
     personal_faces:{A:seatFace('A'),B:seatFace('B')},
     challenges_total:challenges.length,
     eclat_enabled:entitlement?.enabled===true&&
       (!entitlement.ends_at||new Date(entitlement.ends_at).getTime()>Date.now())
    };
   }catch{
    game={error:'Diagnostic temporairement indisponible'};
   }
  }
  return {ready,state:pool.state,
    seats:(seats||[]).map(x=>({seat:x.seat,ready:Boolean(x.user_id),user_id:x.user_id})),
    created_at:pool.created_at,game};
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
  const {data:row}=await service.from('love_studio_test_seats')
   .select('seat,user_id,synthetic_email').eq('admin_id',adminId).eq('seat',seat).maybeSingle();
  if(!row?.user_id||!row.synthetic_email)return response({error:'Joueur de test absent'},409);
  const {data:user,error:userError}=await service.auth.admin.getUserById(row.user_id);
  if(userError||!user?.user||user.user.app_metadata?.love_studio_test!==true||
      user.user.app_metadata?.love_studio_admin!==adminId)
    return response({error:'Identité de test incohérente'},403);
  const {data:link,error:linkError}=await service.auth.admin.generateLink({
    type:'magiclink',email:row.synthetic_email
  });
  if(linkError||!link?.properties?.hashed_token)
    return response({error:'Ouverture de session test indisponible'},503);
  // One-time Auth verification token: returned ONLY to this verified platform admin.
  return response({seat,token_hash:link.properties.hashed_token,user_id:row.user_id});
 }
 if(action==='create'){
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
        for(const id of ids){
          const result=await service.auth.admin.getUserById(id);
          if(result.data?.user?.app_metadata?.love_studio_test===true &&
              result.data.user.app_metadata?.love_studio_admin===adminId)
            await service.auth.admin.deleteUser(id);
        }
        await service.from('love_studio_test_pools').delete().eq('admin_id',adminId);
      }
    }catch{/* Retain private registry if cleanup fails. */}
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
 try{
  const {data:seats,error:purgeError}=await service.rpc('love_studio_purge_test_couple',{p_admin:adminId});
  if(purgeError)return response({error:'Purge du banc refusée : '+purgeError.message},409);
  for(const row of Array.isArray(seats)?seats:[]){
    const id=row.user_id;
    if(!id)continue;
    const {data:u}=await service.auth.admin.getUserById(id);
    if(!u?.user)continue; // Already deleted.
    if(u.user.app_metadata?.love_studio_test!==true||
       u.user.app_metadata?.love_studio_admin!==adminId)
      return response({error:'Protection : suppression identité non-test interdite'},403);
    const {error:delError}=await service.auth.admin.deleteUser(id);
    if(delError)return response({error:'Suppression partielle, relancer la suppression de ce banc'},503);
  }
  const {error:clearError}=await service.from('love_studio_test_pools')
    .delete().eq('admin_id',adminId);
  if(clearError)return response({error:'Nettoyage du registre incomplet'},503);
  return response({deleted:true});
 }catch{return response({error:'Suppression interrompue'},503)}
});
