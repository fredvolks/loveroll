// LoveRoll checkout preview. Supabase is the source of truth for ALL annual discounts.
// Referral credits and promo codes are mutually exclusive: always keep the bigger one.
// This page never charges money or grants access. The future provider webhook must
// reconcile its actual annual invoice using the same server discount policy.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {CONFIG} from './config.js';
const $=id=>document.getElementById(id);
const money=cents=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(cents)/100);
const client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
let annual=null,revision=0;
function status(message,error=false){
 $('checkout-promo-status').textContent=message;
 $('checkout-promo-status').style.color=error?'#ffc0bd':'#eec4d6';
}
async function request(name,args){
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(error.message||'Opération indisponible');
 return data;
}
function reset(){
 revision++;
 $('checkout-discount-row').hidden=true;
 $('checkout-referral-balance').hidden=true;
 if(annual!==null)$('checkout-total').textContent=money(annual);
}
function renderQuote(q){
 annual=Number(q.base_cad_cents);
 $('checkout-base').textContent=money(annual);
 $('checkout-total').textContent=money(q.total_cad_cents);
 const kind=q.selected_discount_kind;
 const referral=Number(q.referral_available_cad_cents||0);
 const promo=Number(q.promo_discount_cad_cents||0);
 $('checkout-referral-balance').hidden=q.audience!=='annual_renewal';
 $('checkout-referral-balance').textContent='Crédits de parrainage disponibles : '+money(referral)+
  (q.promo_valid?' · Réduction du code : '+money(promo):'');
 $('checkout-discount-row').hidden=kind==='none';
 if(kind==='promo'){
  $('checkout-discount-label').textContent='Code '+q.code+' ('+q.percent_off+' %) · rabais retenu';
  $('checkout-discount').textContent='−'+money(q.discount_cad_cents);
  status('✓ Code promo plus avantageux : '+money(q.discount_cad_cents)+
   ' de rabais. Les crédits de parrainage ne sont pas utilisés.');
 }else if(kind==='referral'){
  $('checkout-discount-label').textContent='Crédits de parrainage · rabais retenu';
  $('checkout-discount').textContent='−'+money(q.discount_cad_cents);
  status(q.promo_valid?'✓ Les crédits de parrainage sont plus avantageux (ou égaux). Le code '+
   q.code+' n’est pas utilisé.':'✓ Crédits de parrainage retenus pour ce renouvellement.');
 }else{
  status(q.promo_valid?'Code vérifié : aucun rabais applicable pour ce tarif.':
   'Un code promotionnel peut être ajouté avant de confirmer la facture.');
 }
}
async function quote(){
 const current=++revision;
 const btn=$('checkout-apply');
 btn.disabled=true;
 status('Vérification sécurisée des rabais…');
 try{
  const q=await request('love_checkout_quote',{
   p_code:$('checkout-code').value.trim().toUpperCase()||null,
   p_audience:$('checkout-audience').value
  });
  if(current!==revision)return;
  if(!q?.valid)throw Error('Offre indisponible');
  renderQuote(q);
 }catch(error){
  if(current!==revision)return;
  reset();
  status('Vérification impossible : '+(error.message||'Erreur'),true);
 }finally{if(current===revision)btn.disabled=false;}
}
$('checkout-code').addEventListener('input',()=>{
 reset();$('checkout-apply').disabled=false;
 status('Appuie sur « Appliquer » pour recalculer le meilleur rabais.');
});
$('checkout-audience').addEventListener('change',()=>{reset();quote();});
$('checkout-promo-form').addEventListener('submit',event=>{event.preventDefault();quote();});
async function boot(){
 try{
  const pricing=await request('love_public_pricing');
  annual=Number(pricing.annual_base_cad_cents);
  $('checkout-base').textContent=money(annual);
  reset();
  const {data:{user}}=await client.auth.getUser();
  if(user)await quote();
  else status('Connecte-toi à LoveRoll pour connaître tes rabais.');
  $('checkout-safety').textContent='La facturation n’est pas encore connectée. Aucun prélèvement n’est possible.';
 }catch(error){status('Tarif indisponible : '+(error.message||'Erreur'),true);}
}
boot();
