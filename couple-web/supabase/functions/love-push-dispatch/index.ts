// LoveRoll Web Push dispatch: cron only; request authenticated with Vault-held token.
// Deliberately generic notifications: never include private challenge or journal data.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import webpush from 'npm:web-push@3.6.7';
import {JWT} from 'npm:google-auth-library@9.15.1';

const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const response=(message,status=200)=>new Response(JSON.stringify(message),{status,headers});
const base64Url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const url=Deno.env.get('SUPABASE_URL');
const secretKeys=Deno.env.get('SUPABASE_SECRET_KEYS');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||
  (secretKeys?JSON.parse(secretKeys).default:null);

Deno.serve(async req=>{
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 if(!url||!serviceKey)return response({error:'Server not configured'},503);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
 const token=req.headers.get('x-loveroll-dispatch')||'';
 if(!/^[0-9a-f]{64}$/.test(token))return response({error:'Unauthorized'},401);
 const {data:valid,error:verifyError}=await admin.rpc('love_push_verify_dispatch',{p_token:token});
 if(verifyError||valid!==true)return response({error:'Unauthorized'},401);
 try{
  let {data:keys,error:keyError}=await admin.rpc('love_push_server_keys');
  if(keyError)throw keyError;
  if(!keys?.public||!keys?.private){
   const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
   const raw=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
   const privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
   const publicVapid=base64Url(raw);
   const {error:bootstrapError}=await admin.rpc('love_push_bootstrap_keys',
     {p_public:publicVapid,p_private:privateJwk.d});
   if(bootstrapError)throw bootstrapError;
   ({data:keys,error:keyError}=await admin.rpc('love_push_server_keys'));
   if(keyError)throw keyError;
  }
  webpush.setVapidDetails('https://fredvolks.github.io/mon-wallet-android/',keys.public,keys.private);
  const {error:weeklyError}=await admin.rpc('love_push_enqueue_weekly');
  if(weeklyError)throw weeklyError;
  const {error:calendarError}=await admin.rpc('love_push_enqueue_calendar');
  if(calendarError)throw calendarError;
  const {data:queued,error:queueError}=await admin.from('love_push_outbox')
   .select('id,user_id,kind,title,body,attempts')
   .is('sent_at',null).lte('due_at',new Date().toISOString())
   .lt('attempts',3).order('due_at',{ascending:true}).limit(30);
  if(queueError)throw queueError;
  // Optional Android FCM HTTP v1. Service-account secret exists ONLY in Supabase Edge env.
  // Without it, Android deliveries are explicitly reported unavailable; Web Push remains functional.
  let firebase=null,googleAccessToken=null;
  try{
   const raw=Deno.env.get('LOVEROLL_FIREBASE_SERVICE_ACCOUNT_JSON');
   if(raw){
    const identity=JSON.parse(raw);
    if(identity.client_email&&identity.private_key&&identity.project_id){
     const auth=new JWT({email:identity.client_email,key:identity.private_key,
      scopes:['https://www.googleapis.com/auth/firebase.messaging']});
     const access=await auth.getAccessToken();
     if(access.token){firebase=identity;googleAccessToken=access.token;}
    }
   }
  }catch(error){console.warn('FCM backend unavailable:',error?.name||'invalid configuration');}
  let sent=0,failed=0;
  for(const alert of queued||[]){
   const {data:pref}=await admin.from('love_push_preferences')
    .select('enabled,weekly,invitation,monthly,special').eq('user_id',alert.user_id).maybeSingle();
   if(!pref?.enabled||pref[alert.kind]!==true){
    await admin.from('love_push_outbox').update({sent_at:new Date().toISOString()}).eq('id',alert.id);
    continue;
   }
   const {data:devices,error:devicesError}=await admin.from('love_push_subscriptions')
     .select('id,endpoint,p256dh,auth_key').eq('user_id',alert.user_id);
   if(devicesError){failed++;continue;}
   const {data:nativeDevices,error:nativeError}=await admin.from('love_push_native_devices')
    .select('id,device_token').eq('user_id',alert.user_id);
   if(nativeError){failed++;continue;}
   let delivered=false;
   for(const device of nativeDevices||[]){
    if(!firebase||!googleAccessToken)continue;
    try{
     const send=await fetch('https://fcm.googleapis.com/v1/projects/'+
       encodeURIComponent(firebase.project_id)+'/messages:send',{
      method:'POST',
      headers:{Authorization:'Bearer '+googleAccessToken,'Content-Type':'application/json'},
      body:JSON.stringify({message:{token:device.device_token,data:{kind:alert.kind},
       android:{priority:'NORMAL'}}})
     });
     if(send.ok){delivered=true;}
     else{
      const responseBody=await send.text();
      if(send.status===404||send.status===410||responseBody.includes('UNREGISTERED'))
       await admin.from('love_push_native_devices').delete().eq('id',device.id);
      else console.warn('FCM dispatch failed',send.status);
     }
    }catch(error){console.warn('FCM network error',error?.name||'unknown');}
   }
   for(const d of devices||[]){
    try{
     await webpush.sendNotification({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth_key}},
      JSON.stringify({title:alert.title,body:alert.body,
       url:'https://fredvolks.github.io/mon-wallet-android/',tag:alert.kind}),
      {TTL:86400,urgency:'normal'});
     delivered=true;
    }catch(error){
     if(error?.statusCode===404||error?.statusCode===410)
      await admin.from('love_push_subscriptions').delete().eq('id',d.id);
     else console.error('Push delivery error',alert.kind,error?.statusCode||'unknown');
    }
   }
   const update={attempts:alert.attempts+1};
   if(delivered||((devices||[]).length===0&&(nativeDevices||[]).length===0)){update.sent_at=new Date().toISOString();sent++;}
   else failed++;
   await admin.from('love_push_outbox').update(update).eq('id',alert.id);
  }
  return response({ok:true,processed:(queued||[]).length,sent,failed,fcmConfigured:!!firebase});
 }catch(error){
  console.error('LoveRoll push dispatch failed',error?.message||'internal');
  return response({error:'Dispatch failed'},500);
 }
});
