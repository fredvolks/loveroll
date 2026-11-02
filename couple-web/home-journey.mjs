// LR-ACCUEIL-001: view-only projections from the existing official game data.
// Navigation never rolls a die or consumes a weekly Soirée quota.
import {eveningDailyAccess} from './evening-daily-policy.mjs';

export function homeEveningStep({weekly=null,sessions=[],activeEvening=false,now=new Date()}={}){
 if(!weekly||!Number.isInteger(weekly.face))
  return {key:'draw',action:'roll:weekly',label:'Brasser notre dé',available:null};
 const access=eveningDailyAccess({weekly,sessions,now});
 const available=Math.max(0,access.limit-access.counted);
 if(activeEvening)
  return {key:'resume',action:'resume-evening',label:'♡ Reprendre notre soirée',available};
 if(available===0)
  return {key:'history',action:'tab:journal',label:'Voir nos soirées',available:0};
 return {key:'evening',action:'tab:session',label:'Aller à notre soirée',available};
}

export function homeSurpriseStep({monthly={},completed=false,reservation=null}={}){
 const roll=monthly?.monthly_activity,host=monthly?.monthly_host;
 if(!roll)return {key:'discover',eyebrow:'Surprise · À découvrir',description:'Notre rendez-vous du mois'};
 if(!host)return {key:'host',eyebrow:'Surprise · Qui invite ?',description:'Découvrir qui organise'};
 if(completed)return {key:'completed',eyebrow:'Surprise · Réalisé ♥',description:'Revoir notre souvenir'};
 if(reservation?.status==='confirmed')return {key:'booked',eyebrow:'Surprise · Réservé à l’extérieur',description:'Consulter notre rendez-vous'};
 if(reservation?.status==='planned')return {key:'planned',eyebrow:'Surprise · Prévu',description:'Consulter notre rendez-vous'};
 return {key:'planning',eyebrow:'Surprise · À planifier',description:'Choisir notre date'};
}
