// Future-only LoveRoll 100-card regeneration eligibility.
// Payment is NOT collected here and this module never modifies a card deck.
// A trusted server must enforce the window atomically, validate receipts,
// preserve historical cards and only then publish a new collection.
import {FUTURE_LEVELS} from './future-card-catalog.mjs';
export const FUTURE_REGEN_PRICE_CAD_CENTS=400;
export const FUTURE_REGEN_CARDS_PER_LEVEL=100;
export const FUTURE_REGEN_INTERVAL_MONTHS=2;
const isoDate=value=>typeof value==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)&&
 Number.isFinite(Date.parse(value))?new Date(value):null;

export function futureRegenerationNextAt(previousIso){
 const previous=isoDate(previousIso);
 if(!previous)return null;
 const oldMonth=previous.getUTCMonth(),targetIndex=oldMonth+FUTURE_REGEN_INTERVAL_MONTHS;
 const year=previous.getUTCFullYear()+Math.floor(targetIndex/12),month=targetIndex%12;
 const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const day=Math.min(previous.getUTCDate(),lastDay);
 return new Date(Date.UTC(year,month,day,previous.getUTCHours(),
  previous.getUTCMinutes(),previous.getUTCSeconds(),previous.getUTCMilliseconds())).toISOString();
}

/** Eligibility is advisory until enforced by a server transaction.
 * An absent past generation permits a FIRST purchase; a corrupt audit
 * timestamp or bad scope fails closed. This does not prove a payment.
 */
export function futureRegenerationEligibility({userId,coupleId,level,lastAt=null,
 now=new Date().toISOString()}={}){
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
 if(!previous)return {...base,reason:'history'};
 const nextAllowedAt=futureRegenerationNextAt(lastAt);
 const eligible=current.getTime()>=Date.parse(nextAllowedAt);
 return {...base,nextAllowedAt,eligible,
  reason:eligible?'eligible':'cooldown'};
}
