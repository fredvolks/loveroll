// LoveRoll — one Geoapify search per official monthly D100.
// Authenticated Supabase Edge Function, service key and Geoapify key server-side only.
// Never creates imaginary places, booking links, photos or road distances.
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {verifiedRoadMetres,verifiedMatrixCandidates} from './verified-road.mjs';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}
});
type Place={place_id:string;name:string;address:string;lat:number;lon:number;website_url:string|null;menu_url:string|null;booking_url:string|null;photo_url:string|null};
const validHttps=(value:unknown):string|null=>{
 if(typeof value!=='string'||value.length>500)return null;
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname&&(!u.username&&!u.password)?u.href:null;}catch{return null;}
};
const asText=(value:unknown,max:number):string=>typeof value==='string'?value.trim().slice(0,max):'';
const serviceKey=()=>{
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(key)return key;
 try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}
};
const apiFetch=async(url:string,init?:RequestInit)=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const result=await fetch(url,{...init,signal:controller.signal});
  if(!result.ok)throw Error('Geoapify HTTP '+result.status);
  return await result.json();
 }finally{clearTimeout(timer);}
};
const apiKey=Deno.env.get('GEOAPIFY_API_KEY')||'';
// Charges shown in LoveRoll Studio are ESTIMATES for server-observed calls, not Geoapify account billing.
// A failed request may still be counted by Geoapify. Logging never contains coordinates, keys or couple IDs.
const observedGeoFetch=async(admin:any,api:'geocoding'|'places'|'route_matrix',url:string,
 credits:number|((result:any)=>number),init?:RequestInit)=>{
 let body:any=null,outcome:'ok'|'error'='error';
 try{body=await apiFetch(url,init);outcome='ok';return body;}
 finally{
  try{
   const value=typeof credits==='function'&&body?credits(body):typeof credits==='number'?credits:0;
   const estimated=Math.min(10000,Math.max(0,Math.ceil(Number(value)||0)));
   const {error}=await admin.from('love_geo_api_usage').insert({
    api_name:api,estimated_credits:estimated,outcome
   });
   if(error)console.warn('LoveRoll Geoapify usage logging unavailable');
  }catch{console.warn('LoveRoll Geoapify usage logging unavailable');}
 }
};
const coordinates=(row:any):{lon:number,lat:number}|null=>{
 const lat=Number(row?.travel_origin_lat),lon=Number(row?.travel_origin_lon);
 if(row?.travel_origin_lat===null||row?.travel_origin_lon===null||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 return {lat,lon};
};
const geocode=async(label:string,admin:any)=>{
 const url='https://api.geoapify.com/v1/geocode/search?'+new URLSearchParams({text:label,format:'json',limit:'1',apiKey});
 const payload=await observedGeoFetch(admin,'geocoding',url,1);
 const p=payload?.results?.[0];
 return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))?
  {lat:Math.round(Number(p.lat)*100)/100,lon:Math.round(Number(p.lon)*100)/100}:null;
};
const parsedPlace=(feature:any):Place|null=>{
 const p=feature?.properties||{};
 const name=asText(p.name,200),id=asText(p.place_id,220);
 const lat=Number(p.lat??feature?.geometry?.coordinates?.[1]);
 const lon=Number(p.lon??feature?.geometry?.coordinates?.[0]);
 if(!name||!id||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const raw=p.datasource?.raw||{},website=validHttps(p.website)||validHttps(p.contact?.website)||validHttps(raw.website);
 return {place_id:id,name,address:asText(p.formatted||p.address_line2,300),
  lat,lon,website_url:website,
  menu_url:validHttps(raw['website:menu'])||validHttps(raw.menu),
  booking_url:validHttps(raw['contact:reservation'])||validHttps(raw['website:booking']),
  photo_url:validHttps(raw.image)||validHttps(p.image)};
};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});
 if(req.method!=='POST')return json({error:'Méthode non autorisée'},405);
 const url=Deno.env.get('SUPABASE_URL')||'',svc=serviceKey();
 if(!url||!svc)return json({error:'Service LoveRoll non configuré'},503);
 const token=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]||'';
 if(!token)return json({error:'Connexion requise'},401);
 const admin=createClient(url,svc,{auth:{persistSession:false}});
 const auth=await admin.auth.getUser(token);
 const userId=auth.data?.user?.id;
 if(!userId||auth.error||!auth.data.user?.email_confirmed_at)return json({error:'Compte vérifié requis'},401);
 let payload:any={};
 try{payload=await req.json();}catch{return json({error:'Paramètres invalides'},400);}
 const rollId=typeof payload?.roll_id==='string'&&/^[0-9a-f-]{36}$/i.test(payload.roll_id)?payload.roll_id:'';
 if(!rollId)return json({error:'Tirage officiel requis'},400);
 const {data:roll,error:rollError}=await admin.from('couple_rolls')
  .select('id,couple_id,kind,key,face,activity_title').eq('id',rollId).maybeSingle();
 if(rollError||!roll||roll.kind!=='monthly_activity'||!/^\d{4}-\d{2}$/.test(roll.key))
  return json({error:'Tirage mensuel non trouvé'},404);
 const {data:members,error:memberError}=await admin.from('couple_members')
  .select('user_id').eq('couple_id',roll.couple_id);
 if(memberError||members?.length!==2||!members.some((m:any)=>m.user_id===userId))
  return json({error:'Accès au duo refusé'},403);
 const {data:policy,error:policyErr}=await admin.from('love_platform_settings').select('geo_enabled,geo_max_candidates,geo_max_radius_km').eq('id',1).maybeSingle();
 if(policyErr||!policy)return json({error:'Configuration Geoapify indisponible'},503);
 if(!policy.geo_enabled)return json({status:'disabled'});
 const {data:settings}=await admin.from('couples')
  .select('activity_localization_enabled,travel_origin_label,travel_origin_lat,travel_origin_lon,travel_radius_km')
  .eq('id',roll.couple_id).maybeSingle();
 if(!settings?.activity_localization_enabled)return json({status:'disabled'});
 const {data:existing,error:existingErr}=await admin.from('love_monthly_places')
  .select('*').eq('roll_id',roll.id).maybeSingle();
 if(existingErr)return json({error:'Chargement temporairement indisponible'},503);
 if(existing&&existing.state!=='pending')return json({status:existing.state,venue:existing.state==='ready'?existing:null});
 if(existing&&Date.now()-Date.parse(existing.claimed_at)<120000)return json({status:'pending'});
 // Never consume Geoapify credits without a configured server-side secret.
 if(apiKey.length<10)return json({error:'Clé Geoapify manquante dans les secrets Supabase'},503);
 const radius=Number(settings.travel_radius_km);
 if(!Number.isInteger(radius)||radius<10||radius>Number(policy.geo_max_radius_km))return json({error:'Rayon supérieur au maximum autorisé'},400);
 // One winner claim per roll. In-progress duplicates are cheap and return pending.
 if(!existing){
  const inserted=await admin.from('love_monthly_places').insert({
   roll_id:roll.id,couple_id:roll.couple_id,roll_key:roll.key,state:'pending'
  }).select('roll_id').maybeSingle();
  if(inserted.error)return json({status:'pending'});
 }else{
  const retry=await admin.from('love_monthly_places').update({
   claimed_at:new Date().toISOString()
  }).eq('roll_id',roll.id).eq('state','pending')
   .lt('claimed_at',new Date(Date.now()-120000).toISOString()).select('roll_id');
  if(retry.error||retry.data?.length!==1)return json({status:'pending'});
 }
 const finalize=async(body:any)=>{
  const {error}=await admin.from('love_monthly_places').update({
   ...body,updated_at:new Date().toISOString()
  }).eq('roll_id',roll.id);
  if(error)throw error;
 };
 try{
  const {data:experience,error:xpError}=await admin.from('love_world_experiences')
   .select('face,theme,geo_categories,title,description').eq('face',roll.face).maybeSingle();
  if(xpError||!experience)throw Error('Expérience introuvable');
  let origin=coordinates(settings);
  if(!origin){
   const place=asText(settings.travel_origin_label,120);
   if(place.length<2)throw Error('Définissez une ville ou activez le GPS dans Réglages');
   origin=await geocode(place,admin);
   if(!origin)throw Error('Ville impossible à localiser');
   // Approximate geocoding coordinates only, not precise GPS.
   await admin.from('couples').update({travel_origin_lat:origin.lat,travel_origin_lon:origin.lon})
     .eq('id',roll.couple_id).is('travel_origin_lat',null);
  }
  const placesUrl='https://api.geoapify.com/v2/places?'+new URLSearchParams({
   categories:experience.geo_categories,
   filter:'circle:'+origin.lon+','+origin.lat+','+(radius*1000),
   bias:'proximity:'+origin.lon+','+origin.lat,limit:'20',apiKey
  });
  const placesResp=await observedGeoFetch(admin,'places',placesUrl,1);
  const locations=(Array.isArray(placesResp?.features)?placesResp.features:[])
   .map(parsedPlace).filter((x:Place|null):x is Place=>!!x);
  const seen=new Set();
  const {data:history}=await admin.from('love_monthly_places').select('place_id,roll_key')
   .eq('couple_id',roll.couple_id).eq('state','ready').gte('roll_key',roll.key.slice(0,4)+'-01')
   .lte('roll_key',roll.key.slice(0,4)+'-12');
  for(const p of history||[])if(p.place_id)seen.add(p.place_id);
  const candidates=locations.filter(p=>!seen.has(p.place_id)).filter((p,i,a)=>a.findIndex(v=>v.place_id===p.place_id)===i).slice(0,Math.min(20,Math.max(1,Number(policy.geo_max_candidates)||10)));
  if(!candidates.length){await finalize({state:'unavailable'});return json({status:'unavailable'});}
  const routeBody={mode:'drive',sources:[{location:[origin.lon,origin.lat]}],
   targets:candidates.map(p=>({location:[p.lon,p.lat]}))};
  const routes=await observedGeoFetch(admin,'route_matrix',
   'https://api.geoapify.com/v1/routematrix?'+new URLSearchParams({apiKey}),
   (response:any)=>candidates.length+(
    Array.isArray(response?.sources_to_targets?.[0])?
    response.sources_to_targets[0].reduce((sum:number,route:any)=>{
      const verified=verifiedRoadMetres(route?.distance);
      return sum+(verified===null?0:Math.floor(verified/500000));
    },0):0
   ),{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(routeBody)
  });
  const matrix=routes?.sources_to_targets?.[0];
  const viable=verifiedMatrixCandidates(candidates,matrix,radius);
  // Deterministic selection among nearby valid venues; do not always use the nearest.
  viable.sort((a,b)=>a.meters-b.meters||a.p.place_id.localeCompare(b.p.place_id));
  if(!viable.length){await finalize({state:'unavailable'});return json({status:'unavailable'});}
  const selected=viable[(roll.face+Number(roll.key.slice(-2)))%Math.min(viable.length,5)];
  const v=selected.p;
  const snapshot={state:'ready',place_id:v.place_id,name:v.name,address:v.address,
   latitude:v.lat,longitude:v.lon,driving_meters:Math.round(selected.meters),
   website_url:v.website_url,menu_url:v.menu_url,booking_url:v.booking_url,photo_url:v.photo_url};
  await finalize(snapshot);
  return json({status:'ready',venue:{...snapshot,roll_id:roll.id,roll_key:roll.key}});
 }catch(error){
  // Unavailable is terminal for this roll; never spin repeated paid requests.
  console.warn('LoveRoll Geoapify lookup unavailable',error instanceof Error?error.message:'unknown');
  try{await finalize({state:'unavailable'});}catch{}
  return json({status:'unavailable'});
 }
});
