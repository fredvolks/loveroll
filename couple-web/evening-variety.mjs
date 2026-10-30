// LR-026 — deterministic, advisory variety policy.
// IMPORTANT: Call ONLY after the server has resolved the official D100
// category, authorization, exclusions, recipient, quota and eligible pool.
// This module never rolls a die, adds a candidate or adjusts category odds.
const COMMON=new Set([
 'avec','comme','dans','pour','puis','sans','tout','toute','tous','votre',
 'votre','notre','leurs','chez','avant','apres','pendant','entre','faire',
 'faites','invite','invitez','propose','proposez','choisis','choisissez',
 'partenaire','ensemble','quelques','minutes','minute','chaque','autre',
 'deux','trois','vous','nous','plus','cette','celui','celle','leurs','leur',
 'mais','donc','sous','une','des','les','aux','sur','par','est','son',
 'ses','ton','tes','mes','mon','qui','que','quoi','avec'
]);
const norm=value=>String(value??'').normalize('NFKD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const tokens=value=>new Set(norm(value).split(' ').filter(w=>
 w.length>=3&&!COMMON.has(w)));
const stableId=card=>{
 const id=card?.card_id??card?.cardId??card?.library_card_id??card?.id;
 if(id===null||id===undefined||String(id).trim()==='')return null;
 return norm(card?.category||'')+'|'+String(id);
};
const intersection=(a,b)=>[...a].filter(x=>b.has(x)).length;
const similarity=(a,b)=>{
 const size=a.size+b.size-intersection(a,b);
 return size?intersection(a,b)/size:0;
};
function activity(card){
 const tags=card?.tags&&typeof card.tags==='object'&&!Array.isArray(card.tags)
  ?card.tags:{};
 return norm(card?.activity_tag??card?.activity_type??card?.activityType??
  tags.activity??tags.activity_type??'');
}
function theme(card){
 const tags=card?.tags&&typeof card.tags==='object'&&!Array.isArray(card.tags)
  ?card.tags:{};
 return norm(card?.theme_tag??card?.theme??tags.theme??'');
}
export function areNearDuplicateEveningCards(first,second){
 if(!first||!second)return false;
 const aId=stableId(first),bId=stableId(second);
 if(aId&&bId&&aId===bId)return true;
 const aTitle=norm(first.title),bTitle=norm(second.title);
 if(aTitle&&bTitle&&aTitle===bTitle)return true;
 const at=tokens(first.title),bt=tokens(second.title);
 if(intersection(at,bt)>=2&&similarity(at,bt)>=0.8)return true;
 const ad=tokens(first.description??first.instructions);
 const bd=tokens(second.description??second.instructions);
 const common=intersection(ad,bd);
 if(common>=5&&similarity(ad,bd)>=0.68)return true;
 const actA=activity(first),actB=activity(second);
 const themeA=theme(first),themeB=theme(second);
 if(actA&&actA===actB&&themeA&&themeA===themeB&&
  common>=2&&similarity(ad,bd)>=0.35)return true;
 return false;
}

/**
 * Advisory only. eligibleCards MUST already be the authoritative, allowed
 * pool for one official category, including favorite/replay exceptions.
 * recentInSession MUST be limited to the same active session on the server.
 *
 * Stable input ordering is preserved. The caller/server must use its own
 * official secure random draw; it must not use array order as a probability.
 * If all eligible cards look similar, return ALL eligible cards unchanged.
 */
export function filterSimilarEveningCandidates({
 eligibleCards=[],recentInSession=[]
}={}){
 if(!Array.isArray(eligibleCards)||!Array.isArray(recentInSession))
  throw new TypeError('Expected an eligible pool and current-session history arrays');
 if(!eligibleCards.length)return {
  candidates:[],suppressedCount:0,fallbackUsed:false,reason:'no-eligible-cards'
 };
 const candidates=eligibleCards.filter(card=>
  !recentInSession.some(previous=>areNearDuplicateEveningCards(card,previous)));
 if(!candidates.length)return {
  candidates:eligibleCards.slice(),suppressedCount:0,
  fallbackUsed:true,reason:'limited-variety-pool'
 };
 return {
  candidates,suppressedCount:eligibleCards.length-candidates.length,
  fallbackUsed:false,reason:candidates.length===eligibleCards.length
   ?'all-eligible':'similarity-filtered'
 };
}
