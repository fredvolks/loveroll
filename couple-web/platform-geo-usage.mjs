// LoveRoll Studio · Geoapify internal credit estimates. No API key leaves the server.
// These counts cover ONLY calls observed by LoveRoll after logging was enabled.
// Geoapify's own portal is authoritative for all keys, apps, errors and billing.
const byId=id=>document.getElementById(id);
const integer=n=>new Intl.NumberFormat('fr-CA').format(Math.max(0,Number(n)||0));
const localDate=iso=>{const d=new Date(iso+'T12:00:00Z');return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-CA',{day:'numeric',month:'short',timeZone:'UTC'}):iso;};
function elem(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
export function createGeoUsageAdmin({rpc}){
 let busy=false;
 const feedback=(message,error=false)=>{const el=byId('geo-usage-feedback');if(el){el.textContent=message;el.style.color=error?'#ffd2c8':'#f9cfde';}};
 function render(info){
  const quota=Math.max(1,Number(info?.quota)||3000);
  const used=Math.max(0,Number(info?.used_today)||0);
  const remaining=Math.max(0,Number(info?.remaining_estimate)||0);
  const percent=Math.min(100,Math.round((used/quota)*100));
  byId('geo-used-today').textContent=integer(used);
  byId('geo-remaining').textContent=integer(remaining);
  byId('geo-quota').textContent=integer(quota);
  byId('geo-calls-today').textContent=integer(info?.calls_today);
  byId('geo-used-30d').textContent=integer(info?.used_30d);
  byId('geo-usage-progress').style.width=percent+'%';
  byId('geo-usage-meter').setAttribute('aria-valuenow',String(Math.min(quota,used)));
  byId('geo-usage-meter').setAttribute('aria-valuemax',String(quota));
  byId('geo-percent').textContent=percent+' % du quota de référence';
  byId('geo-limit').value=String(quota);
  byId('geo-tracking-note').textContent=info?.tracked_since
   ?'Enregistrement commencé le '+new Date(info.tracked_since).toLocaleDateString('fr-CA')+'. Les appels antérieurs ne sont pas inclus.'
   :'Aucun appel Geoapify enregistré depuis la mise en place du suivi.';
  byId('geo-usage-period').textContent='Période du jour : '+String(info?.day_utc||'—')+' (UTC).';
  const apiNames={geocoding:'Recherche de ville',places:'Recherche de lieux',route_matrix:'Distances routières'};
  const rows=Array.isArray(info?.by_api)?info.by_api:[];
  const api=byId('geo-breakdown');api.replaceChildren();
  if(!rows.length)api.append(elem('p','small-note','Aucune requête comptabilisée aujourd’hui.'));
  for(const item of rows){
   const line=elem('div','geo-api-row');
   line.append(elem('span','',apiNames[item.api]||String(item.api||'Autre')),
    elem('strong','',integer(item.credits)+' crédits estimés'),
    elem('small','',integer(item.calls)+' appels'));
   api.append(line);
  }
  const chart=byId('geo-history');chart.replaceChildren();
  const days=Array.isArray(info?.last_7_days)?info.last_7_days:[];
  const max=Math.max(1,...days.map(item=>Number(item.credits)||0));
  for(const item of days){
   const value=Math.max(0,Number(item.credits)||0);
   const bar=elem('div','geo-day');
   const amount=elem('span','geo-day-amount',integer(value));
   const track=elem('div','geo-day-track');
   const fill=elem('div','geo-day-fill');
   fill.style.height=Math.max(value>0?5:0,Math.round(value/max*100))+'%';
   track.append(fill);
   bar.append(amount,track,elem('span','geo-day-date',localDate(String(item.date||''))));
   bar.title=String(item.date||'')+' · '+integer(value)+' crédits estimés';
   chart.append(bar);
  }
  if(!days.length)chart.append(elem('p','small-note','Historique disponible après la première requête.'));
 }
 async function refresh(){
  if(busy)return;
  busy=true;byId('geo-refresh').disabled=true;feedback('Actualisation des estimations…');
  try{
   const info=await rpc('love_admin_geo_usage');
   render(info);
   feedback('Mis à jour à '+new Date().toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'})+'.');
  }catch(e){feedback('Données Geoapify indisponibles : '+(e?.message||'Erreur'),true);}
  finally{busy=false;byId('geo-refresh').disabled=false;}
 }
 byId('geo-refresh').addEventListener('click',refresh);
 byId('geo-save-limit').addEventListener('click',async()=>{
  const button=byId('geo-save-limit');
  const n=Number(byId('geo-limit').value);
  if(!Number.isSafeInteger(n)||n<1||n>100000000){
   feedback('Entre un quota quotidien valide entre 1 et 100 000 000.',true);return;
  }
  button.disabled=true;feedback('Enregistrement du quota de référence…');
  try{
   const info=await rpc('love_admin_geo_budget_update',{p_daily_limit:n});
   render(info);
   feedback('✓ Quota de référence enregistré. Cela ne change pas ton forfait Geoapify.');
  }catch(e){feedback('Enregistrement impossible : '+(e?.message||'Erreur'),true);}
  finally{button.disabled=false;}
 });
 return {refresh};
}
