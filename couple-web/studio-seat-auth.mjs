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
 let disposed=false,signingIn=false;
 const announce=async()=>{
  if(disposed)return;
  const {data}=await client.auth.getSession();
  selfWindow.parent.postMessage({
   type:'loveroll-studio-seat-ready',seat,
   authenticated:!!data?.session?.user?.id,
   user_id:data?.session?.user?.id||null
  },origin);
 };
 const receive=async event=>{
  if(disposed||signingIn||event.source!==selfWindow.parent||event.origin!==origin)return;
  const message=event.data;
  if(!message||message.seat!==seat)return;
  if(message.type==='loveroll-studio-clear-seat'){
   signingIn=true;await client.auth.signOut({scope:'local'});reload();return;
  }
  if(message.type==='loveroll-studio-navigate'){
   if(!['home','session','special','eclat','advent','settings','journal','personal-journal','occasions'].includes(message.tab))return;
   try{
    const {data}=await client.auth.getSession();
    // Admin shortcuts never turn a normal signed-in user into a Studio seat.
    if(data?.session?.user?.app_metadata?.love_studio_test!==true)return;
    await navigate(message.tab); // The actual production tab handler enforces eligibility.
   }catch{
    selfWindow.parent.postMessage({type:'loveroll-studio-navigate-error',seat},origin);
   }
   return;
  }
  if(message.type!=='loveroll-studio-login'||typeof message.token_hash!=='string'||
     !/^[0-9a-f]{12,256}$/i.test(message.token_hash))return;
  signingIn=true;
  try{
   const {data,error}=await client.auth.verifyOtp({
    token_hash:message.token_hash,type:'magiclink'
   });
   if(error||!data?.session?.user?.id ||
      (message.user_id&&data.session.user.id!==message.user_id))
    throw Error('Connexion du compte de test non validée');
   reload();
  }catch{
   signingIn=false;
   selfWindow.parent.postMessage({type:'loveroll-studio-seat-error',seat},origin);
  }
 };
 selfWindow.addEventListener('message',receive);
 void announce();
 return ()=>{disposed=true;selfWindow.removeEventListener('message',receive)};
}
