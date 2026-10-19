// LoveRoll Studio — private platform configuration. UI never holds secret API keys.
// Admin rights are verified by Supabase security-definer RPC on every write.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {CONFIG} from './config.js';
const $=id=>document.getElementById(id);
const client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
let data=null,referralData=null,activeFace=null,pane='prices';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>new Intl.NumberFormat('fr-CA').format(n||0);
const money=cents=>(Number(cents)/100).toFixed(2);
const msg=(value,err=false)=>{const el=$('feedback');if(el){el.textContent=value;el.style.color=err?'#ffaaaa':'#f9cfde';}};
async function rpc(name,args={}){
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(error.message||'Erreur Supabase');
 return data;
}
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
 document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==name);
 document.querySelectorAll('button[data-pane]').forEach(el=>{
  el.classList.toggle('active',el.dataset.pane===name);el.setAttribute('aria-current',el.dataset.pane===name?'page':'false');
 });
 $('save-settings').hidden=['catalogue','history','referrals'].includes(name);
}
function renderReferralSettings(){
 const info=referralData;if(!info)return;
 $('ref-enabled').checked=info.enabled===true;
 $('ref-reward').value=(Number(info.reward_cad_cents)/100).toFixed(2);
 $('ref-mode').value=info.reward_mode||'renewal_credit';
 const values=[['links','Liens créés'],['awaiting_payment','En attente du paiement annuel'],
  ['earned_referrals','Parrainages payés'],['pending_application_cad_cents','Crédits à appliquer']];
 $('ref-stats').innerHTML=values.map(([key,label])=>'<div class="stat"><span>'+esc(label)+'</span><strong>'+
  (key==='pending_application_cad_cents'?(Number(info[key]||0)/100).toFixed(2)+' 
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
 const btn=$('save-referral'),label=$('ref-feedback');btn.disabled=true;label.textContent='Enregistrement...';
 try{
  const enabled=$('ref-enabled').checked,amount=Math.round(Number($('ref-reward').value)*100),
   mode=$('ref-mode').value;
  if(!Number.isInteger(amount)||amount<0||amount>10000)throw Error('Choisissez une récompense entre 0 et 100 $ CA.');
  referralData=await rpc('love_admin_referral_save',{
   p_enabled:enabled,p_reward_cad_cents:amount,p_reward_mode:mode
  });
  renderReferralSettings();label.textContent='✓ Programme de référencement enregistré.';
  const refreshed=await rpc('love_platform_admin_read');data=refreshed;render();label.textContent='✓ Réglages enregistrés.';
 }catch(error){label.textContent='Erreur : '+(error.message||'Sauvegarde impossible');}
 finally{btn.disabled=false;}
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
:fmt(info[key]))+'</strong></div>').join('');
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
