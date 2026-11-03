// A single read-only lifecycle for the official Surprise monthly D100.
// Source of truth: persisted rolls, couple date, reservation and completion.
// Never infer that a proposed date is a confirmed outside reservation.
export function monthlySurprisePhase({monthly={},datePlan=null,reservation=null,completion=null}={}){
 const activity=monthly?.monthly_activity;
 if(!activity)return {key:'discover',label:'À découvrir',action:'Brasser notre surprise'};
 if(!monthly?.monthly_host)return {key:'host',label:'Qui invite ?',action:'Découvrir notre activité'};
 if(completion?.roll_id===activity.id)
  return {key:'completed',label:'Réalisé',action:'Revoir notre souvenir'};
 if(reservation?.status==='confirmed')
  return {key:'booked',label:'Réservé à l’extérieur',action:'Voir notre rendez-vous'};
 if(reservation?.status==='planned')
  return {key:'planned',label:'Prévu · à confirmer',action:'Voir notre rendez-vous'};
 if(datePlan?.status==='agreed')
  return {key:'agreed',label:'Date convenue',action:'Voir notre rendez-vous'};
 if(datePlan?.status==='proposed')
  return {key:'proposed',label:'Date à confirmer',action:'Voir notre rendez-vous'};
 return {key:'planning',label:'À planifier',action:'Voir notre rendez-vous'};
}
