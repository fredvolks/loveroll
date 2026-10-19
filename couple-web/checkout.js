// Checkout preview: only Supabase verifies a code, never trust a browser-calculated discount.
// No card collection or entitlement grants until a signed payment integration exists.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {CONFIG} from './config.js';
const $=id=>document.getElementById(id);
const money=cents=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(cents)/100);
const client=createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{
 auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
let annual=null,verifiedCode=null;
function status(message,error=false){$('checkout-promo-status').textContent=message;$('checkout-promo-status').style.color=error?'#ffc0bd':'#eec4d6';}
function clearDiscount(){
 verifiedCode=null;$('checkout-discount-row').hidden=true;
 if(annual!==null)$('checkout-total').textContent=money(annual);
}
async function request(name,args){
 const {data,error}=await client.rpc(name,args);
 if(error)throw Error(error.message||'Opération indisponible');
 return data;
}
async function boot(){
 try{
  const pricing=await request('love_public_pricing');
  annual=Number(pricing.annual_base_cad_cents);
  $('checkout-base').textContent=money(annual);clearDiscount();
  const {data:{user}}=await client.auth.getUser();
  if(!user)status('Connecte-toi à LoveRoll pour vérifier ton code promotionnel.');
  $('checkout-safety').textContent='La facturation n’est pas encore connectée. Ceci est un aperçu sans prélèvement.';
 }catch(e){status('Le tarif actuel ne peut pas être chargé : '+(e.message||'Erreur'),true);}
}
$('checkout-code').addEventListener('input',()=>{clearDiscount();status('');});
$('checkout-promo-form').addEventListener('submit',async event=>{
 event.preventDefault();const btn=$('checkout-apply');
 const code=$('checkout-code').value.trim().toUpperCase();
 clearDiscount();
 if(!code){status('Entre un code promotionnel.',true);return;}
 btn.disabled=true;status('Vérification du code…');
 try{
  const q=await request('love_promo_quote',{p_code:code,p_audience:'annual_new'});
  if(!q?.valid)throw Error('Code non valide');
  verifiedCode=q.code;annual=Number(q.base_cad_cents);
  $('checkout-base').textContent=money(annual);
  $('checkout-discount-label').textContent='Code '+q.code+' ('+q.percent_off+' %)';
  $('checkout-discount').textContent='−'+money(q.discount_cad_cents);
  $('checkout-discount-row').hidden=false;$('checkout-total').textContent=money(q.total_cad_cents);
  status('✓ Code valide, prix réduit affiché. Aucun paiement effectué.');
 }catch(e){status('Code refusé : '+(e.message||'Erreur'),true);}
 finally{btn.disabled=false;}
});
boot();
