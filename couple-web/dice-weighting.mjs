// LoveRoll: single source of truth for admin inputs and Home read-only percentages.
// Randomness happens ONLY in Supabase. This module never draws a face.
export const WEEKLY_DEFAULT_WEIGHTS=Object.freeze([50,25,12,8,4,1]);
export const EVENING_DEFAULT_WEIGHTS=Object.freeze([30,25,20,12,8,5]);
export const DICE_WEIGHT_CONFIG=Object.freeze({
 weekly:Object.freeze({
  label:'Accueil · Dé hebdomadaire',enabled:'weekly_weights_enabled',
  weights:'weekly_face_weights',defaults:WEEKLY_DEFAULT_WEIGHTS
 }),
 evening:Object.freeze({
  label:'Soirée · Nombre de défis',enabled:'evening_weights_enabled',
  weights:'evening_face_weights',defaults:EVENING_DEFAULT_WEIGHTS
 })
});
export function validateDiceWeights(values){
 return Array.isArray(values)&&values.length===6&&
  values.every(value=>Number.isInteger(value)&&value>=0&&value<=100)&&
  values.reduce((total,value)=>total+value,0)===100;
}
export function configuredDiceWeights(values,defaults=WEEKLY_DEFAULT_WEIGHTS){
 return validateDiceWeights(values)?[...values]:[...defaults];
}
export function effectiveDicePercentages(values,enabled=true,defaults=WEEKLY_DEFAULT_WEIGHTS){
 return enabled===false?Array(6).fill(100/6):configuredDiceWeights(values,defaults);
}
export function displayedDicePercent(pct){
 return Number.isInteger(pct)?String(pct):pct.toFixed(1).replace('.',',');
}
export function parseDiceWeightInputs(values){
 if(!Array.isArray(values)||values.length!==6)throw Error('Indiquez les six pourcentages.');
 const parsed=values.map(value=>{
  const raw=String(value??'').trim();
  if(!/^(0|[1-9][0-9]{0,2})$/.test(raw))throw Error('Les pourcentages doivent être des nombres entiers de 0 à 100.');
  return Number(raw);
 });
 if(!validateDiceWeights(parsed))
  throw Error('Les six pourcentages doivent totaliser exactement 100 %. Aucun résultat ne doit être négatif.');
 return parsed;
}
