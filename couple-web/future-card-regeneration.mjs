// Prévisualisation uniquement : jamais de paiement, publication ou modification du D100.
// Un serveur de confiance doit appliquer l'expiration, l'identité, les reçus
// de paiement et l'archivage dans une transaction avant tout renouvellement.
import {FUTURE_LEVELS} from './future-card-catalog.mjs';

export const FUTURE_REGEN_PRICE_CAD_CENTS=400;
export const FUTURE_REGEN_CARDS_PER_LEVEL=100;
export const FUTURE_REGEN_INTERVAL_MONTHS=2;

// Ne jamais laisser Date.parse normaliser le 30 février ou 24:00.
// Calendrier UTC = référence unique, à faire appliquer par le serveur.
const isoDate=value=>{
 if(typeof value!=='string')return null;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(value);
 if(!m)return null;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const hour=Number(m[4]),minute=Number(m[5]),second=Number(m[6]);
 if(year<100||month<1||month>12||day<1||
    day>new Date(Date.UTC(year,month,0)).getUTCDate()||
    hour>23||minute>59||second>59)return null;
 const ms=Date.parse(value);
 return Number.isFinite(ms)?new Date(ms):null;
};

export function futureRegenerationNextAt(previousIso){
 const previous=isoDate(previousIso);
 if(!previous)return null;
 const index=previous.getUTCMonth()+FUTURE_REGEN_INTERVAL_MONTHS;
 const year=previous.getUTCFullYear()+Math.floor(index/12);
 const month=index%12;
 if(year>9999)return null;
 const day=Math.min(previous.getUTCDate(),
  new Date(Date.UTC(year,month+1,0)).getUTCDate());
 return new Date(Date.UTC(year,month,day,previous.getUTCHours(),
  previous.getUTCMinutes(),previous.getUTCSeconds(),
  previous.getUTCMilliseconds())).toISOString();
}

/** Prévisualisation de l'éligibilité, jamais une autorisation de facturer.
 * lastAt=null : un historique serveur a confirmé aucune génération antérieure.
 * lastAt=undefined ou date illisible : historique inconnu, refus prudent.
 */
export function futureRegenerationEligibility({
 userId,coupleId,level,lastAt,now=new Date().toISOString()
}={}){
 const base={level,cardCount:FUTURE_REGEN_CARDS_PER_LEVEL,
  amountCents:FUTURE_REGEN_PRICE_CAD_CENTS,currency:'CAD',
  eligible:false,nextAllowedAt:null,reason:'invalid'};
 if(typeof userId!=='string'||!userId.trim()||
    typeof coupleId!=='string'||!coupleId.trim()||
    !FUTURE_LEVELS.includes(level))return base;
 const current=isoDate(now);
 if(!current)return {...base,reason:'clock'};
 if(lastAt===null)return {...base,eligible:true,reason:'first'};
 const previous=isoDate(lastAt);
 if(!previous||previous.getTime()>current.getTime())
  return {...base,reason:'history'};
 const nextAllowedAt=futureRegenerationNextAt(lastAt);
 if(!nextAllowedAt)return {...base,reason:'history'};
 const eligible=current.getTime()>=Date.parse(nextAllowedAt);
 return {...base,nextAllowedAt,eligible,
  reason:eligible?'eligible':'cooldown'};
}

/** Aperçu indépendant Soft / Medium / Intense.
 * Les trois clés d'historique DOIVENT provenir d'une réponse complète du
 * serveur. Une clé absente n'est jamais interprétée comme premier achat.
 * Les cartes archivées et les reçus restent entièrement côté serveur.
 */
export function futureRegenerationOverview({
 userId,coupleId,historyByLevel,now=new Date().toISOString()
}={}){
 const histories=historyByLevel&&typeof historyByLevel==='object'&&
  !Array.isArray(historyByLevel)?historyByLevel:null;
 const levels=FUTURE_LEVELS.map(level=>Object.freeze(
  futureRegenerationEligibility({userId,coupleId,level,
   lastAt:histories&&Object.hasOwn(histories,level)?
    histories[level]:undefined,now})
 ));
 return Object.freeze({levels:Object.freeze(levels),paymentEnabled:false,
  archivePreserved:true});
}
