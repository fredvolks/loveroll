// LR-026 — deterministic, advisory variety policy.
// IMPORTANT: Call ONLY after the server has resolved the official D100
// category, authorization, exclusions, recipient, quota and eligible pool.
// This module never rolls a die, adds a candidate or adjusts category odds.
// Match couple_private.love_variety_normalize and love_variety_near
// (lr026-server-variety.sql). Never invent extra semantic bans client-side.
// This helper remains ADVISORY: the real D100 eligibility and random draw
// always come from the server.
const SQL_STOPWORDS=new Set([
 'avec','comme','dans','pour','puis','sans','toute','tous','votre',
 'notre','leurs','chez','avant','apres','pendant','entre','faire',
 'faites','invite','invitez','propose','proposez','choisis',
 'choisissez','partenaire','ensemble','quelques','minutes','minute',
 'chaque','autre','vous','nous'
]);
const SQL_DIACRITICS='àáâäãåçèéêëìíîïñòóôöõùúûüýÿ';
const SQL_ASCII='aaaaaaceeeeiiiinooooouuuuyy';
const SQL_TRANSLATE=Object.fromEntries(
 [...SQL_DIACRITICS].map((letter,index)=>[letter,SQL_ASCII[index]])
);
const norm=value=>String(value??'').toLowerCase()
 .replace(/œ/g,'oe').replace(/æ/g,'ae')
 .replace(/[àáâäãåçèéêëìíîïñòóôöõùúûüýÿ]/g,c=>SQL_TRANSLATE[c])
 .replace(/[^a-z0-9]+/g,' ').trim();
const descriptionTokens=value=>new Set(norm(value).split(' ').filter(w=>
 w.length>=4&&!SQL_STOPWORDS.has(w)));
// The die's face is NOT a card identifier: the official draw persists
// face (the dice result) separately from card_id (the selected library card).
// A challenge-row UUID is also kept in a distinct namespace.
const stableId=card=>{
 const category=norm(card?.category||'');
 const id=card?.card_id??card?.cardId??card?.library_card_id;
 if(id!==null&&id!==undefined&&String(id).trim()!=='')
  return 'card|'+category+'|'+String(id).trim();
 const rowId=card?.id;
 if(rowId!==null&&rowId!==undefined&&String(rowId).trim()!=='')
  return 'draw|'+category+'|'+String(rowId).trim();
 return null;
};
const intersection=(a,b)=>[...a].filter(x=>b.has(x)).length;
const cardTitle=card=>card?.title??card?.card_title??'';
const cardDescription=card=>card?.description??card?.card_description??card?.instructions??'';
export function areNearDuplicateEveningCards(first,second){
 if(!first||!second)return false;
 // Server-side LR-026 ranks previously seen cards ONLY inside the selected
 // official D100 category. Identical titles across SENSUEL/SEXUEL must not
 // suppress each other in the advisory client filter.
 const firstCategory=norm(first.category),secondCategory=norm(second.category);
 if(firstCategory&&secondCategory&&firstCategory!==secondCategory)return false;
 const aId=stableId(first),bId=stableId(second);
 if(aId&&bId&&aId===bId)return true;
 const aTitle=norm(cardTitle(first)),bTitle=norm(cardTitle(second));
 if(aTitle&&bTitle&&aTitle===bTitle)return true;
 // SQL compares DISTINCT meaningful description words of >=4 letters,
 // excluding its exact stopword set: >=5 shared and >=68% Jaccard.
 // Short titles that merely share two words do NOT trigger similarity.
 // Client-only theme/activity tags must not shrink server-eligible cards.
 const ad=descriptionTokens(cardDescription(first));
 const bd=descriptionTokens(cardDescription(second));
 if(ad.size<5||bd.size<5)return false;
 const shared=intersection(ad,bd);
 return shared>=5&&shared*100>=68*(ad.size+bd.size-shared);
}

/**
 * Advisory only. eligibleCards MUST already be the authoritative, allowed
 * pool for one official category, including favorite/replay exceptions.
 * Mixed-category pools are rejected to preserve official odds.
 * recentInSession MUST be limited to the same active session on the server.
 *
 * Stable input ordering is preserved. The caller/server must use its own
 * official secure random draw; it must not use array order as a probability.
 * If all eligible cards look similar, return ALL eligible cards unchanged.
 */
export function filterSimilarEveningCandidates({
 eligibleCards=[],recentInSession=[],selectedCategory=null
}={}){
 if(!Array.isArray(eligibleCards)||!Array.isArray(recentInSession))
  throw new TypeError('Expected an eligible pool and current-session history arrays');
 // A broad mixed-category pool could change the official category odds.
 // The server must choose the D100 category BEFORE invoking this helper.
 if(eligibleCards.some(card=>!card||typeof card!=='object'||Array.isArray(card)))
  throw new TypeError('Eligible cards must be valid card objects');
 const poolCategories=new Set(eligibleCards.map(card=>norm(card.category)));
 if(poolCategories.has('')||poolCategories.size>1||
  (selectedCategory!==null&&selectedCategory!==undefined&&
   eligibleCards.length>0&&!poolCategories.has(norm(selectedCategory))))
  throw new RangeError('Variety requires an eligible pool from one official D100 category');
 if(!eligibleCards.length)return {
  candidates:[],suppressedCount:0,fallbackUsed:false,reason:'no-eligible-cards'
 };
 // SQL considers only seen.category = selected D100 category. Legacy,
 // incomplete or cross-category history must NOT suppress an eligible card.
 // In particular, areNearDuplicateEveningCards accepts category-less pairs
 // for direct comparisons; the candidate filter needs the stricter scope.
 const officialCategory=poolCategories.values().next().value;
 const historyInCategory=recentInSession.filter(previous=>
  previous&&typeof previous==='object'&&!Array.isArray(previous)&&
  norm(previous.category)===officialCategory);
 const candidates=eligibleCards.filter(card=>
  !historyInCategory.some(previous=>areNearDuplicateEveningCards(card,previous)));
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
