// Future-only mixing rule: persist per-user preferences now, with no coupling
// to the current Sensuel/Sexuel cards or any active Supabase draw procedure.
export const PLAY_STYLES=Object.freeze(['soft','medium','intense']);
export function normalizePlayStyle(value){
 return PLAY_STYLES.includes(value)?value:'medium';
}
export function futureCoupleStyleMix(styleA,styleB){
 const a=normalizePlayStyle(styleA),b=normalizePlayStyle(styleB);
 return a===b?[{style:a,weight:100}]:[{style:a,weight:50},{style:b,weight:50}];
}
export const playStyleLabel=value=>({soft:'Soft',medium:'Medium',intense:'Intense'})[normalizePlayStyle(value)];

/* Future deck routing only. No current D100 or challenge is affected.
   The first bucket receives exactly half the ticket range when styles differ. */
export function chooseFutureStyle(styleA,styleB,ticket){
 if(!Number.isFinite(ticket)||ticket<0||ticket>=1)
  throw Error('Le tirage de style doit être compris entre 0 et 1.');
 const mixed=futureCoupleStyleMix(styleA,styleB);
 return mixed.length===1||ticket<mixed[0].weight/100?mixed[0].style:mixed[1].style;
}
