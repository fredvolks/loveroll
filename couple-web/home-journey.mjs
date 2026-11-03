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

export function homeTonightSummary({weekly=null,sessions=[],activeEvening=false,now=new Date()}={}){
 const step=homeEveningStep({weekly,sessions,activeEvening,now});
 if(step.key==='draw')return {
  title:'Aucune soirée commencée',
  detail:'Le D6 hebdomadaire déterminera le nombre de soirées à partager.'
 };
 if(step.key==='resume')return {
  title:'Soirée en cours',
  detail:'Votre session enregistrée vous attend dans Soirée.'
 };
 if(step.key==='history')return {
  title:'Nos soirées de la semaine sont terminées ♥',
  detail:'Retrouvez votre historique dans le calendrier.'
 };
 const access=eveningDailyAccess({weekly,sessions,now});
 return access.dailyLocked?{
  title:'Une soirée a déjà eu lieu aujourd’hui',
  detail:step.available+' autre'+(step.available===1?' soirée disponible':'s soirées disponibles')+
   ' cette semaine, mais pas de nouvelle soirée aujourd’hui.'
 }:{
  title:'Notre prochaine soirée',
  detail:step.available+' soirée'+(step.available===1?'':'s')+
   ' encore disponible'+(step.available===1?'':'s')+' cette semaine.'
 };
}
