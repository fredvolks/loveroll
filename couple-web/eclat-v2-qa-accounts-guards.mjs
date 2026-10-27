// Pure fail-closed guards shared by the QA Edge Function and Node regression tests.
export const LOVEROLL_PRODUCTION_REF='ejsrqfpkgwraorrznjpm';
const REF=/^[a-z0-9]{20}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function verifyQaOperator({runtimeUrl,allowedQaRef,operatorId,actorId,productionRef=LOVEROLL_PRODUCTION_REF}){
 if(!REF.test(allowedQaRef||'')||!REF.test(productionRef||'')||
    !UUID.test(operatorId||'')||!UUID.test(actorId||'')||operatorId!==actorId)
  throw new Error('Opérateur QA non autorisé ou environnement non configuré');
 let parsed;
 try{parsed=new URL(runtimeUrl);}catch{throw new Error('URL de projet QA invalide');}
 if(parsed.protocol!=='https:'||parsed.hostname!==allowedQaRef+'.supabase.co'||
    allowedQaRef===productionRef||allowedQaRef===LOVEROLL_PRODUCTION_REF||
    parsed.port||parsed.username||parsed.password)
  throw new Error('Écriture refusée hors du projet LoveRoll QA autorisé');
 return true;
}
export function checkQaManagedUser(user,batch,role){
 if(!UUID.test(batch||'')||!['A','B'].includes(role)||
    !user||user.app_metadata?.loveroll_qa_managed!==true||
    user.app_metadata?.loveroll_qa_batch!==batch||
    user.app_metadata?.loveroll_qa_role!==role)
  throw new Error('Compte non géré par cette paire QA : suppression interdite');
 return true;
}
export function validatePairLedger(row,operatorId){
 if(!row||!UUID.test(row.id||'')||!UUID.test(row.couple_id||'')||
  !UUID.test(row.user_a||'')||!UUID.test(row.user_b||'')||
  row.user_a===row.user_b||row.operator_id!==operatorId||
  !['active','deleting','failed'].includes(row.state))
  throw new Error('Enregistrement QA non autorisé ou incohérent');
 return row;
}
