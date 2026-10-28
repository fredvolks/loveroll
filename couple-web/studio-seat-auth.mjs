// Studio uses the ENTIRE shipped LoveRoll app in two authenticated iframe seats.
// Separate Supabase auth storages guarantee that A/B and the Super Admin cannot collide.
export function studioSeat(search,embedded){
 if(!embedded)return null;
 const value=new URLSearchParams(search).get('studio_seat');
 return value==='A'||value==='B'?value:null;
}
export function studioAuthOptions(base,seat,storage){
 if(!seat)return base;
 return {...base,auth:{...base.auth,
  storageKey:'loveroll-studio-auth-v1-'+seat,
  storage,
  flowType:'implicit',
  detectSessionInUrl:false,
  persistSession:true
 }};
}
export function startStudioSeatLogin(client,seat,{selfWindow,origin,reload=()=>selfWindow.location.reload(),navigate=()=>{}}={}){
 if(!seat||!selfWindow||selfWindow.parent===selfWindow)return ()=>{};
 let disposed=false,signingIn=false,veniceRunning=false;
 const postSeatState=session=>{
  if(disposed)return;
  const user=session?.user;
  const verified=!!user?.id&&user.app_metadata?.love_studio_test===true;
  selfWindow.parent.postMessage({
   type:'loveroll-studio-seat-ready',seat,
   authenticated:verified,
   user_id:verified?user.id:null
  },origin);
 };
 const announce=async()=>{
  if(disposed)return;
  try{
   const {data}=await client.auth.getSession();
   postSeatState(data?.session);
  }catch{postSeatState(null)}
 };
 const receive=async event=>{
  if(disposed||signingIn||event.source!==selfWindow.parent||event.origin!==origin)return;
  const message=event.data;
  if(!message||message.seat!==seat)return;
  if(message.type==='loveroll-studio-clear-seat'){
   signingIn=true;
   try{await client.auth.signOut({scope:'local'})}
   catch{
    // A failed local sign-out must never reload an old technical session.
    signingIn=false;
    if(!disposed)selfWindow.parent.postMessage({type:'loveroll-studio-seat-error',seat},origin);
    return;
   }
   if(!disposed)reload();
   return;
  }
  if(message.type==='loveroll-studio-navigate'){
   if(!['home','session','special','eclat','advent','settings','journal','personal-journal','occasions'].includes(message.tab))return;
   // An optional coffret shortcut opens the REAL Éclat details through the
   // shipped action handler. It must never write a session or override access.
   const coffretId=message.coffret_id;
   if(coffretId!==undefined&&
      (message.tab!=='eclat'||!Number.isInteger(coffretId)||
       coffretId<1||coffretId>12))return;
   try{
    const {data}=await client.auth.getSession();
    // Admin shortcuts never turn a normal signed-in user into a Studio seat.
    if(data?.session?.user?.app_metadata?.love_studio_test!==true)return;
    await navigate(message.tab,coffretId); // Production handler checks eligibility.
   }catch{
    selfWindow.parent.postMessage({type:'loveroll-studio-navigate-error',seat},origin);
   }
   return;
  }
  if(message.type==='loveroll-studio-venice'&&seat==='A'&&!veniceRunning){
   const action=message.action;
   if(!['status','get_latest_preview','preview_three'].includes(action)||
      typeof message.request_id!=='string'||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(message.request_id))return;
   veniceRunning=true;
   const send=(data)=>selfWindow.parent.postMessage({
    type:'loveroll-studio-venice-result',seat:'A',action,
    request_id:message.request_id,data
   },origin);
   try{
    const {data:auth,error:authError}=await client.auth.getUser();
    const user=auth?.user;
    // Only the exact original technical owner seat may call the deployed
    // couple-owned Venice bridge. No service role or JWT leaves the iframe.
    if(authError||!user?.id||
       user.app_metadata?.love_studio_test!==true||
       !user.app_metadata?.love_studio_admin)
      throw Error('Compte technique Venice non vérifié');
    const {data:membership,error:membershipError}=await client
      .from('couple_members').select('couple_id')
      .eq('user_id',user.id).maybeSingle();
    if(membershipError||!membership?.couple_id)
      throw Error('Couple Venice technique introuvable');
    const {data,error}=await client.functions.invoke('love-venice-bridge',{
     body:{action,couple_id:membership.couple_id}
    });
    if(error||data?.error)throw Error(typeof data?.error==='string'
     ?data.error:'Atelier Venice temporairement indisponible');
    send({ok:true,result:data});
   }catch(err){
    send({ok:false,error:err instanceof Error?err.message:'Échec Venice'});
   }finally{veniceRunning=false}
   return;
  }
  if(message.type!=='loveroll-studio-login'||typeof message.token_hash!=='string'||
     !/^[0-9a-f]{12,256}$/i.test(message.token_hash))return;
  signingIn=true;
  try{
   const {data,error}=await client.auth.verifyOtp({
    token_hash:message.token_hash,type:'magiclink'
   });
   // The backend can finish verifying a one-time token after the operator
   // has closed this seat, deleted the technical duo or signed out.
   // Revoke its newly installed Auth session rather than resurrect the game.
   if(disposed){
    try{await client.auth.signOut({scope:'local'})}catch{}
    return;
   }
   // A valid OTP alone is not enough: never retain a regular customer's
   // Auth session in an administrator-controlled technical game iframe.
   if(error||!data?.session?.user?.id||
      data.session.user.id!==message.user_id||
      data.session.user.app_metadata?.love_studio_test!==true)
    throw Error('Connexion du compte de test non validée');
   reload();
  }catch{
   // verifyOtp can already have installed an unexpected valid session.
   // Always clear it locally before reporting an authentication failure.
   try{await client.auth.signOut({scope:'local'})}catch{}
   signingIn=false;
   if(!disposed)selfWindow.parent.postMessage({type:'loveroll-studio-seat-error',seat},origin);
  }
 };
 selfWindow.addEventListener('message',receive);
 // Read the session from the Auth event itself. Do not call getSession()
 // inside onAuthStateChange: it risks re-entering the Auth lock.
 const subscription=client.auth.onAuthStateChange?.((_event,session)=>{
  postSeatState(session);
 })?.data?.subscription;
 void announce();
 return ()=>{
  disposed=true;
  selfWindow.removeEventListener('message',receive);
  subscription?.unsubscribe();
 };
}
