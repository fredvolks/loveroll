// Conversion of historical activity budget estimates, not live venue pricing.
// Use Frankfurter's actual dated CAD -> currency rate. No guessed FX numbers.
import {currencyOrDefault,money,localeOrDefault} from './world-preferences.mjs';
const memo=new Map();
export async function cadExchangeRate(currency,fetcher=fetch,now=Date.now()){
 const quote=currencyOrDefault(currency);
 if(quote==='CAD')return {rate:1,date:null,base:'CAD',quote:'CAD'};
 const cached=memo.get(quote);
 if(cached&&cached.expires>now)return cached.value;
 const res=await fetcher('https://api.frankfurter.dev/v2/rate/cad/'+quote.toLowerCase(),{headers:{'Accept':'application/json'}});
 if(!res.ok)throw Error('Taux de change non disponible');
 const json=await res.json(),rate=Number(json.rate);
 if(!Number.isFinite(rate)||rate<=0||String(json.base).toUpperCase()!=='CAD'||String(json.quote).toUpperCase()!==quote)
  throw Error('Taux de change invalide');
 const value={rate,date:String(json.date||''),base:'CAD',quote};
 memo.set(quote,{value,expires:now+12*60*60*1000});
 return value;
}
export function displayCadRange(min,max,{currency='CAD',locale='fr-CA',exchange=null}={}){
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min)return null;
 const quote=currencyOrDefault(currency),chosen=exchange?.quote===quote&&Number.isFinite(exchange?.rate)&&exchange.rate>0?exchange:null;
 const shown=quote==='CAD'?'CAD':chosen?quote:'CAD';
 const rate=shown==='CAD'?1:chosen.rate;
 return {
  text:money(min*rate,shown,localeOrDefault(locale))+' – '+money(max*rate,shown,localeOrDefault(locale)),
  currency:shown,converted:shown!=='CAD',exchangeDate:chosen?.date||null,
  note:quote!=='CAD'&&!chosen?'Conversion indisponible : montant original en CAD.':''
 };
}
