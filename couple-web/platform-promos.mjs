// LoveRoll Studio promotional code management. All privileged changes use owner-only RPCs.
const $=id=>document.getElementById(id);
const dateInput=(value)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const iso=value=>{const t=new Date(value);if(!Number.isFinite(t.getTime()))throw Error('Date invalide');return t.toISOString();};
const fmtDate=value=>new Date(value).toLocaleString('fr-CA',{dateStyle:'medium',timeStyle:'short'});
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const labels={annual_new:'1re année',annual_renewal:'Renouvellements',both:'Tous les abonnements annuels'};
export function createPromoAdmin({rpc}){
 let codes=[],editing=null,loaded=false,loading=false;
 const status=(v,error=false)=>{const el=$('promo-feedback');el.textContent=v;el.style.color=error?'#ffbaba':'#f8cfe0';};
 const setDefaults=()=>{
  editing=null;$('promo-editor-title').textContent='Créer un code promotionnel';
  $('promo-code').value='';$('promo-code').disabled=false;$('promo-percent').value='20';
  $('promo-start').value=dateInput(new Date());
  $('promo-end').value=dateInput(new Date(Date.now()+30*86400000));
  $('promo-limit').value='';$('promo-audience').value='annual_new';$('promo-active').checked=true;
  $('promo-generate-note').hidden=false;$('promo-save').textContent='Créer le code';
 };
 const list=()=>{
  $('promo-count').textContent=codes.length+' code'+(codes.length>1?'s':'')+' créé'+(codes.length>1?'s':'');
  $('promo-list').innerHTML=codes.length?codes.map(c=>{
   const expired=new Date(c.expires_at).getTime()<=Date.now();
   const exhausted=c.max_redemptions!=null&&c.redeemed_count>=c.max_redemptions;
   const state=!c.active?'Désactivé':expired?'Expiré':exhausted?'Épuisé':'Actif';
   return '<article class="promo-item"><div><strong>'+esc(c.code)+'</strong>'+
     '<small>'+esc(c.percent_off)+' % · '+esc(labels[c.audience]||c.audience)+' · '+esc(state)+'</small>'+
     '<small>Jusqu’au '+esc(fmtDate(c.expires_at))+
     ' · Utilisations : '+esc(c.redeemed_count)+' / '+esc(c.max_redemptions??'∞')+'</small></div>'+
     '<div class="promo-item-actions"><button type="button" class="secondary" data-promo-copy="'+esc(c.code)+'">Copier</button>'+
     '<button type="button" class="secondary" data-promo-edit="'+esc(c.id)+'">Modifier</button></div></article>';
  }).join(''):'<p class="small-note">Aucun code créé. Crée ton premier code ci-dessus.</p>';
 };
 const refresh=async(force=false)=>{
  if(loading||(loaded&&!force))return;
  loading=true;
  try{const result=await rpc('love_admin_promo_list');codes=Array.isArray(result)?result:[];loaded=true;list();}
  catch(e){status('Impossible de charger les codes : '+(e.message||'Erreur'),true);}
  finally{loading=false;}
 };
 $('promo-new').addEventListener('click',()=>{setDefaults();status('Nouveau code : laisse le champ vide pour générer un code aléatoire.');});
 $('promo-duration').addEventListener('change',()=>{
  const days=Number($('promo-duration').value);
  if(!days)return;
  const start=new Date($('promo-start').value||Date.now());
  $('promo-end').value=dateInput(new Date(start.getTime()+days*86400000));
 });
 $('promo-list').addEventListener('click',async e=>{
  const edit=e.target.closest('[data-promo-edit]');
  const copy=e.target.closest('[data-promo-copy]');
  if(copy){try{await navigator.clipboard.writeText(copy.dataset.promoCopy);status('Code copié : '+copy.dataset.promoCopy);}
  catch{status('Copie impossible : '+copy.dataset.promoCopy,true);}return;}
  if(!edit)return;
  const c=codes.find(row=>row.id===edit.dataset.promoEdit);if(!c)return;
  editing=c.id;$('promo-editor-title').textContent='Modifier '+c.code;
  $('promo-code').value=c.code;$('promo-code').disabled=c.redeemed_count>0;
  $('promo-percent').value=c.percent_off;$('promo-start').value=dateInput(c.starts_at);
  $('promo-end').value=dateInput(c.expires_at);$('promo-limit').value=c.max_redemptions??'';
  $('promo-audience').value=c.audience;$('promo-active').checked=c.active;
  $('promo-duration').value='';$('promo-generate-note').hidden=true;
  $('promo-save').textContent='Enregistrer les modifications';
  status('Modification du code '+c.code+'. Les utilisations passées sont conservées.');
  $('promo-editor-title').scrollIntoView({behavior:'smooth',block:'start'});
 });
 $('promo-save').addEventListener('click',async()=>{
  const btn=$('promo-save');btn.disabled=true;status('Enregistrement...');
  try{
   const raw=$('promo-code').value.trim().toUpperCase();
   if(raw&&!/^[A-Z0-9][A-Z0-9_-]{3,31}$/.test(raw))throw Error('Code invalide : 4–32 lettres, chiffres, _ ou -');
   const percent=Number($('promo-percent').value);
   if(!Number.isInteger(percent)||percent<1||percent>100)throw Error('Pourcentage de 1 à 100 %');
   const limitText=$('promo-limit').value.trim();
   const limit=limitText===''?null:Number(limitText);
   if(limit!==null&&(!Number.isInteger(limit)||limit<1))throw Error('Limite d’utilisations invalide');
   const start=iso($('promo-start').value),end=iso($('promo-end').value);
   if(new Date(end)<=new Date(start))throw Error('La fin doit être après le début');
   const saved=await rpc('love_admin_promo_save',{
    p_id:editing,p_code:raw,p_percent_off:percent,p_starts_at:start,
    p_expires_at:end,p_max_redemptions:limit,p_audience:$('promo-audience').value,
    p_active:$('promo-active').checked
   });
   await refresh(true);setDefaults();status('✓ Code '+saved.code+' enregistré.');
  }catch(e){status('Impossible d’enregistrer : '+(e.message||'Erreur'),true);}
  finally{btn.disabled=false;}
 });
 setDefaults();
 return {refresh};
}
