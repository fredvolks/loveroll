// LoveRoll Studio — private platform configuration. UI never holds secret API keys.
// Admin rights are verified by Supabase security-definer RPC on every write.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {CONFIG} from './config.js';
import {createPromoAdmin} from './platform-promos.mjs?v=20261019-promo161';
const $=id=>document.getElementById(id);
const client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
let data=null,referralData=null,activeFace=null,pane='prices',geoRefreshing=false;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>new Intl.NumberFormat('fr-CA').format(n||0);
const money=cents=>(Number(cents)/100).toFixed(2);
const msg=(value,err=false)=>{const el=$('feedback');if(el){el.textContent=value;el.style.color=err?'#ffaaaa':'#f9cfde';}};
async function rpc(name,args={}){
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(error.message||'Erreur Supabase');
 return data;
}
const promoAdmin=createPromoAdmin({rpc});
const gated=()=>{$('gate').hidden=false;$('dashboard').hidden=true;$('signout').hidden=true;};
async function bootstrap(){
 try{
  const {data:auth,error}=await client.auth.getUser();
  if(error||!auth.user){gated();return;}
  const [info,referrals]=await Promise.all([rpc('love_platform_admin_read'),rpc('love_admin_referral_settings')]);
  data=info;referralData=referrals;
  $('gate').hidden=true;$('dashboard').hidden=false;$('signout').hidden=false;
  render();
 }catch(error){
  console.warn('Admin access denied',error?.message||'authentication required');
  gated();$('gate').querySelector('.small-note').textContent='Accès réservé au propriétaire de la plateforme. Contactez l’administrateur pour activer votre compte.';
 }
}
function render(){
 if(!data)return;
 const stats=data.stats||{},labels=[
  ['registered_users','Comptes créés'],['couples','Duos'],['monthly_draws','Tirages D100'],['geo_ready','Lieux confirmés'],
  ['geo_pending','Recherches en attente'],['geo_unavailable','Lieux indisponibles'],['bookings','Réservations déclarées'],['paid_grants','Paiements vérifiés']
 ];
 $('stats').innerHTML=labels.map(([key,label])=>'<div class="stat"><span>'+esc(label)+'</span><strong>'+fmt(stats[key])+'</strong></div>').join('');
 const c=data.config||{};
 for(const el of $('settings').querySelectorAll('[name]')){
  if(!(el.name in c))continue;
  if(el.type==='checkbox')el.checked=!!c[el.name];
  else if(el.hasAttribute('data-cents'))el.value=c[el.name]===null?'':money(c[el.name]);
  else el.value=c[el.name]??'';
 }
 const audits=data.audit||[];
 $('audit').innerHTML=audits.length?audits.map(a=>'<article><time>'+esc(new Date(a.changed_at).toLocaleString('fr-CA'))+'</time><pre>'+esc(JSON.stringify(a.patch,null,2))+'</pre></article>').join(''):'<p class="small-note">Aucune modification pour le moment.</p>';
 renderFaces();
 renderReferralSettings();
 $('safety-status').textContent='Paiements non connectés · accès payant verrouillé';
 choosePane(pane);
}
function choosePane(name){
 pane=name;
 if(name==='promos')promoAdmin.refresh(true);
 if(name==='geo')refreshGeoUsage();
 document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
 document.querySelectorAll('button[data-pane]').forEach(el=>{
  el.classList.toggle('active',el.dataset.pane===name);el.setAttribute('aria-current',el.dataset.pane===name?'page':'false');
 });
 $('save-settings').hidden=['catalogue','history','referrals','promos'].includes(name);
}
// Only administrator RPCs can read or change Geoapify usage counters.
const integer=value=>Math.max(0,Math.floor(Number(value)||0));
async function refreshGeoUsage(){
 if(geoRefreshing||!data)return;
 geoRefreshing=true;
 const refresh=$('geo-refresh');
 refresh.disabled=true;
 $('geo-feedback').textContent='Actualisation des estimations…';
 try{
  const report=await rpc('love_admin_geo_usage');
  const quota=Math.max(1,integer(report.quota));
  const today=integer(report.used_today);
  const remaining=Math.max(0,integer(report.remaining_estimate));
  const date=String(report.day_utc||'');
  const cells=[
   ['Crédits estimés utilisés aujourd’hui',today],
   ['Solde théorique aujourd’hui',remaining],
   ['Quota de référence par jour',quota],
   ['Crédits estimés sur 30 jours',integer(report.used_30d)],
   ['Appels suivis aujourd’hui',integer(report.calls_today)]
  ];
  $('geo-usage-stats').innerHTML=cells.map(([label,value])=>'<div class="stat"><span>'+esc(label)+'</span><strong>'+fmt(value)+'</strong></div>').join('');
  const meter=$('geo-meter');
  meter.setAttribute('aria-valuemax',String(quota));
  meter.setAttribute('aria-valuenow',String(Math.min(quota,today)));
  $('geo-meter-fill').style.width=(Math.min(100,(today/quota)*100))+'%';
  $('geo-usage-period').textContent='Aujourd’hui : '+date+' (UTC) · Historique suivi '+
   (report.tracked_since?'depuis le '+new Date(report.tracked_since).toLocaleDateString('fr-CA'):'à partir du prochain appel Geoapify')+'.';
  const names={geocoding:'Géocodage',places:'Recherche de lieux',route_matrix:'Trajets routiers'};
  const calls=Array.isArray(report.by_api)?report.by_api:[];
  $('geo-by-api').innerHTML=calls.length?calls.map(row=>
   '<div><span>'+esc(names[row.api]||row.api)+'</span><strong>'+fmt(row.credits)+' crédits</strong><small>'+fmt(row.calls)+' appels</small></div>').join(''):
   '<p class="small-note">Aucun appel Geoapify enregistré aujourd’hui.</p>';
  const days=Array.isArray(report.last_7_days)?report.last_7_days:[];
  const scale=Math.max(1,...days.map(row=>integer(row.credits)));
  $('geo-seven-days').innerHTML=days.map(row=>{
   const count=integer(row.credits),size=Math.max(0,(count/scale)*100);
   return '<div class="geo-day"><time>'+esc(row.date)+'</time><div class="geo-day-track"><i style="width:'+size+'%"></i></div><strong>'+fmt(count)+'</strong></div>';
  }).join('');
  $('geo-daily-limit').value=quota;
  $('geo-feedback').textContent='Mis à jour. Estimation interne — consultez Geoapify pour la facturation officielle.';
 }catch(error){
  $('geo-feedback').textContent='Suivi indisponible : '+String(error?.message||'erreur de chargement');
  $('geo-usage-stats').textContent='Impossible de charger les estimations.';
 }finally{refresh.disabled=false;geoRefreshing=false;}
}
$('geo-refresh').addEventListener('click',refreshGeoUsage);
$('geo-limit-save').addEventListener('click',async()=>{
 const input=$('geo-daily-limit'),button=$('geo-limit-save');
 const n=Number(input.value);
 if(!Number.isSafeInteger(n)||n<1||n>100000000){
  $('geo-feedback').textContent='Entrez un nombre entier entre 1 et 100 000 000.';return;
 }
 button.disabled=true;
 try{
  await rpc('love_admin_geo_budget_update',{p_daily_limit:n});
  $('geo-feedback').textContent='Quota de référence enregistré.';
  await refreshGeoUsage();
 }catch(error){$('geo-feedback').textContent='Erreur de sauvegarde : '+String(error?.message||'réessayez');}
 finally{button.disabled=false;}
});
// Refresh only while the owner is viewing the Geoapify dashboard.
setInterval(()=>{if(pane==='geo'&&!document.hidden)refreshGeoUsage();},60000);
function renderReferralSettings(){
 const info=referralData;
 if(!info)return;
 $('ref-enabled').checked=info.enabled===true;
 $('ref-reward').value=(Number(info.reward_cad_cents)/100).toFixed(2);
 $('ref-mode').value=info.reward_mode||'renewal_credit';
 $('ref-cap-note').textContent='Plafond automatique : '+money(data?.config?.annual_base_cad_cents??4999)+' $ CA de rabais par duo pour son prochain renouvellement annuel.';
 const entries=[['links','Liens créés'],['awaiting_payment','En attente de paiement'],
  ['earned_referrals','Parrainages payés'],['pending_application_cad_cents','Crédits à appliquer']];
 $('ref-stats').innerHTML=entries.map(([key,label])=>{
  const value=key==='pending_application_cad_cents'
   ?(Number(info[key]||0)/100).toFixed(2)+' $'
   :fmt(info[key]);
  return '<div class="stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
 }).join('');
}
function renderFaces(){
 const keyword=String($('face-search').value||'').toLocaleLowerCase('fr-CA');
 const shown=(data.experiences||[]).filter(x=>String(x.face).includes(keyword)||
  String(x.title).toLocaleLowerCase('fr-CA').includes(keyword)||
  String(x.theme).toLocaleLowerCase('fr-CA').includes(keyword));
 $('face-list').innerHTML=shown.map(x=>'<button type="button" data-face="'+esc(x.face)+'"><strong>D100 · '+esc(x.face)+'</strong> — '+esc(x.title)+'</button>').join('');
}
document.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-pane],button[data-face]');
 if(!btn)return;
 if(btn.dataset.pane){choosePane(btn.dataset.pane);msg('');return;}
 if(btn.dataset.face){
  const row=(data?.experiences||[]).find(x=>String(x.face)===btn.dataset.face);
  if(!row)return;
  activeFace=row.face;
  $('face-number').value=row.face;$('face-title').value=row.title;
  $('face-description').value=row.description;$('face-theme').value=row.theme;
  $('face-categories').value=row.geo_categories;$('face-editor').hidden=false;
 }
});
$('face-search').addEventListener('input',renderFaces);
$('login').addEventListener('submit',async event=>{
 event.preventDefault();
 const b=$('login').querySelector('[type=submit]');b.disabled=true;
 try{
  const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error)throw error;
  await bootstrap();
 }catch(error){alert('Connexion refusée : '+(error.message||'réessayez'));}
 finally{b.disabled=false;}
});
$('google').addEventListener('click',async()=>{
 const {error}=await client.auth.signInWithOAuth({
  provider:'google',options:{redirectTo:new URL('./admin.html',location.href).href}
 });
 if(error)alert('Google : '+error.message);
});
$('signout').addEventListener('click',async()=>{await client.auth.signOut();data=null;gated();});
$('settings').addEventListener('submit',async event=>{
 event.preventDefault();const btn=$('save-settings');btn.disabled=true;msg('Enregistrement...');
 try{
  const patch={};
  const sectionNames={
   prices:['annual_base_cad_cents','monthly_base_cad_cents','activities_2_cad_cents','activities_3_cad_cents','activities_4_cad_cents','included_monthly_draws','max_monthly_draws'],
   d100:['annual_no_repeat'],geo:['geo_enabled','geo_max_candidates','geo_max_radius_km'],
   notifications:['reminder_hours'],audience:['maintenance_message']
  };
  for(const key of sectionNames[pane]||[]){
   const el=$('settings').elements.namedItem(key);
   if(!el)continue;
   patch[key]=el.type==='checkbox'?el.checked:el.hasAttribute('data-cents')?
    el.value.trim()===''?null:Math.round(Number(el.value)*100):
    el.type==='number'?Number(el.value):el.value;
  }
  await rpc('love_platform_admin_save',{p_patch:patch});
  const info=await rpc('love_platform_admin_read');
  data=info;render();msg('✓ Réglages enregistrés.');
 }catch(error){msg('Enregistrement refusé : '+(error.message||'Erreur'),true);}
 finally{btn.disabled=false;}
});
$('save-referral').addEventListener('click',async()=>{
 const btn=$('save-referral'),label=$('ref-feedback');
 btn.disabled=true;label.textContent='Enregistrement...';
 try{
  const enabled=$('ref-enabled').checked;
  const amount=Math.round(Number($('ref-reward').value)*100);
  const mode=$('ref-mode').value;
  if(!Number.isInteger(amount)||amount<0||amount>10000)
   throw Error('Choisissez une récompense entre 0 et 100 $ CA.');
  referralData=await rpc('love_admin_referral_save',{
   p_enabled:enabled,p_reward_cad_cents:amount,p_reward_mode:mode
  });
  renderReferralSettings();
  label.textContent='✓ Programme de référencement enregistré.';
  data=await rpc('love_platform_admin_read');
  render();
 }catch(error){
  label.textContent='Erreur : '+(error.message||'Sauvegarde impossible');
 }finally{btn.disabled=false;}
});
$('face-save').addEventListener('click',async()=>{
 const btn=$('face-save');btn.disabled=true;msg('Enregistrement de la face '+activeFace+'...');
 try{
  await rpc('love_platform_admin_edit_experience',{
   p_face:activeFace,p_title:$('face-title').value,p_description:$('face-description').value,
   p_theme:$('face-theme').value,p_geo_categories:$('face-categories').value
  });
  data=await rpc('love_platform_admin_read');render();
  msg('✓ Activité D100 '+activeFace+' enregistrée.');
 }catch(error){msg('Impossible de sauvegarder : '+(error.message||'Erreur'),true);}
 finally{btn.disabled=false;}
});
client.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_OUT'){data=null;gated();}
});
bootstrap();
