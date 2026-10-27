// LoveRoll Studio — private platform configuration. UI never holds secret API keys.
// Admin rights are verified by Supabase security-definer RPC on every write.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {CONFIG} from './config.js';
import {createStudioRealSandbox} from './studio-real-sandbox.mjs?v=20261027-real250';
import {createPromoAdmin} from './platform-promos.mjs?v=20261019-promo161';
import {createGeoUsageAdmin} from './platform-geo-usage.mjs?v=20261019-geo165';
const $=id=>document.getElementById(id);
const client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
const panes=new Set(['realtest','prices','referrals','promos','d100','geo','notifications','audience','catalogue','history']);
const initialPane=new URLSearchParams(location.search).get('panel');
let data=null,referralData=null,activeFace=null,pane=panes.has(initialPane)?initialPane:'realtest';
let geoSummary=null,promoTotal=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>new Intl.NumberFormat('fr-CA').format(n||0);
const studioIconPaths={"users":"<circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M3 19v-2a6 6 0 0 1 12 0v2\"/><circle cx=\"18\" cy=\"9\" r=\"2.5\"/><path d=\"M17 15c2.9 0 4 1.4 4 4v1\"/>","heart":"<path d=\"M20.8 5.6c-2.5-3-6.4-2.5-8.8.1C9.6 3 5.7 2.6 3.2 5.6.3 9.2 4.3 13.5 12 20c7.7-6.5 11.7-10.8 8.8-14.4Z\"/>","dice":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"8\" cy=\"8\" r=\"1\"/><circle cx=\"16\" cy=\"8\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"8\" cy=\"16\" r=\"1\"/><circle cx=\"16\" cy=\"16\" r=\"1\"/>","coins":"<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v5c0 4 16 4 16 0V5M4 10v5c0 4 16 4 16 0v-5M4 15v4c0 4 16 4 16 0v-4\"/>","map-pin":"<path d=\"M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.6\"/>","calendar":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4M17 3v4M3 10h18\"/>","credit-card":"<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20M6 15h5\"/>","ticket":"<path d=\"M3 8a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 1 0-6V4H3v4Z\"/><path d=\"M13 4v3m0 3v4m0 3v1\"/>","tag":"<path d=\"M3 4h9l9 9-8 8L3 11V4Z\"/><circle cx=\"8\" cy=\"8\" r=\"1.5\"/>","star":"<path d=\"m12 2 3.2 6.5 7.2 1-5.2 5 .9 7.3L12 18.3 5.9 21.8l.9-7.3-5.2-5 7.2-1L12 2Z\"/>","bell":"<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4\"/>","shield-check":"<path d=\"M12 2 4 5v6c0 5 4 9 8 11 4-2 8-6 8-11V5l-8-3Z\"/><path d=\"m8 12 3 3 5-5\"/>","book-open":"<path d=\"M12 6c-4-3-8-2-10-1v14c3-2 7-2 10 0 3-2 7-2 10 0V5c-2-1-6-2-10 1Z\"/><path d=\"M12 6v13\"/>","notebook":"<rect x=\"5\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><path d=\"M9 2v20M13 8h5M13 12h5M13 16h4M3 6h4M3 12h4M3 18h4\"/>","crown":"<path d=\"m2 6 5 4 5-6 5 6 5-4-2 13H4L2 6Z\"/><path d=\"M5 22h14\"/>","layers":"<path d=\"m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5\"/>","chart":"<path d=\"M5 22V13M12 22V7M19 22V2\"/>","circle-help":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9 9a3 3 0 0 1 6 0c0 2-3 2.7-3 5\"/><circle cx=\"12\" cy=\"18\" r=\".7\"/>"};
const studioSvg=key=>'<svg class="studio-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+(studioIconPaths[key]||studioIconPaths.tag)+'</svg>';
function decorateStudioIcons(){
 document.querySelectorAll('[data-studio-icon]').forEach(el=>{
  el.innerHTML=studioSvg(el.getAttribute('data-studio-icon'));
 });
}
decorateStudioIcons();

const money=cents=>(Number(cents)/100).toFixed(2);
const msg=(value,err=false)=>{const el=$('feedback');if(el){el.textContent=value;el.style.color=err?'#ffaaaa':'#f9cfde';}};
async function rpc(name,args={}){
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(error.message||'Erreur Supabase');
 return data;
}
const promoAdmin=createPromoAdmin({rpc});
const geoUsage=createGeoUsageAdmin({rpc});
const realSandbox=createStudioRealSandbox({client});
const gated=()=>{$('gate').hidden=false;$('dashboard').hidden=true;$('signout').hidden=true;};
async function bootstrap(){
 try{
  const {data:auth,error}=await client.auth.getUser();
  if(error||!auth.user){gated();return;}
  const [info,referrals]=await Promise.all([rpc('love_platform_admin_read'),rpc('love_admin_referral_settings')]);
  data=info;referralData=referrals;
  $('gate').hidden=true;$('dashboard').hidden=false;$('signout').hidden=false;
  render();
  realSandbox.init().catch(error=>console.warn('Banc réel indisponible',error));
  loadDashboardMetrics().catch(()=>{});
 }catch(error){
  console.warn('Admin access denied',error?.message||'authentication required');
  gated();$('gate').querySelector('.small-note').textContent='Accès réservé au propriétaire de la plateforme. Contactez l’administrateur pour activer votre compte.';
 }
}
function renderDashboardStats(){
 const stats=data?.stats||{};
 const percentage=geoSummary?Math.min(100,Math.max(0,Math.round(
  100*Number(geoSummary.used_today||0)/Math.max(1,Number(geoSummary.quota)||3000)))):null;
 const rows=[
  {label:'Comptes créés',value:fmt(stats.registered_users),icon:'users'},
  {label:'Couples actifs',value:fmt(stats.couples),icon:'heart'},
  {label:'Tirages D100',value:fmt(stats.monthly_draws),icon:'dice'},
  {label:'Crédits Geoapify',value:percentage===null?'—':percentage+' %',icon:'coins',meter:percentage},
  {label:'Lieux confirmés',value:fmt(stats.geo_ready),icon:'map-pin'},
  {label:'Réservations',value:fmt(stats.bookings),icon:'calendar'},
  {label:'Paiements vérifiés',value:fmt(stats.paid_grants),icon:'credit-card'},
  {label:'Codes promo actifs',value:promoTotal===null?'—':fmt(promoTotal),icon:'ticket'}
 ];
 $('stats').innerHTML=rows.map(row=>{
  const progress=row.meter===undefined?'':(
   '<div class="studio-stat-meter" role="progressbar" aria-label="Pourcentage du quota Geoapify utilisé" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(row.meter===null?0:row.meter)+'">'+
   '<i style="width:'+(row.meter||0)+'%"></i></div><small class="studio-stat-caption">Estimation du jour · quota de référence</small>');
  const spark=row.meter===undefined?'<svg class="studio-stat-spark" viewBox="0 0 100 30" aria-hidden="true"><path d="M2 25C15 25 15 7 28 7s16 19 28 16 17-16 29-9 11 11 13 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>':'';
  return '<div class="stat studio-stat">'+
   '<span class="studio-stat-icon">'+studioSvg(row.icon)+'</span>'+
   '<span class="studio-stat-label">'+esc(row.label)+'</span>'+
   '<strong>'+esc(row.value)+'</strong>'+
   (progress||spark)+'</div>';
 }).join('');
}
async function loadDashboardMetrics(){
 const [geo,promos]=await Promise.allSettled([
  rpc('love_admin_geo_usage'),rpc('love_admin_promo_list')
 ]);
 geoSummary=geo.status==='fulfilled'?geo.value:null;
 promoTotal=promos.status==='fulfilled'&&Array.isArray(promos.value)?
  promos.value.filter(p=>p.active&&Date.parse(p.starts_at)<=Date.now()&&Date.parse(p.expires_at)>Date.now()&&
   (p.max_redemptions===null||p.max_redemptions===undefined||Number(p.redeemed_count)<Number(p.max_redemptions))).length:null;
 if(data&&document.getElementById('dashboard')&&!document.getElementById('dashboard').hidden)renderDashboardStats();
}
function render(){
 if(!data)return;
 renderDashboardStats();
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
 if(!panes.has(name))return;
 pane=name;
 document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
 document.querySelectorAll('button[data-pane]').forEach(el=>{
  el.classList.toggle('active',el.dataset.pane===name);
  el.setAttribute('aria-current',el.dataset.pane===name?'page':'false');
 });
 const mobile=$('studio-pane-select');
 if(mobile)mobile.value=name;
 $('save-settings').hidden=['realtest','catalogue','history','referrals','promos'].includes(name);
 $('settings').hidden=name==='realtest';
 if(name==='promos')promoAdmin.refresh(true);
 if(name==='geo')geoUsage.refresh();
 if(name==='geo')loadDashboardMetrics().catch(()=>{});
 const current=new URL(location.href);
 if(current.searchParams.get('panel')!==name){
  current.searchParams.set('panel',name);
  history.replaceState(null,'',current.pathname+current.search+current.hash);
 }
}
$('studio-pane-select').addEventListener('change',value=>{
 choosePane(value.target.value);
});
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
 if(btn.dataset.pane){
  choosePane(btn.dataset.pane);msg('');
  if(btn.closest('.studio-quick-grid'))document.querySelector('.studio-content')?.scrollIntoView({behavior:'smooth',block:'start'});
  return;
 }
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
   prices:['annual_base_cad_cents','monthly_base_cad_cents','eclat_total_cad_cents','activities_2_cad_cents','activities_3_cad_cents','activities_4_cad_cents','included_monthly_draws','max_monthly_draws'],
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
