// LoveRoll • 20 special-occasion surprises.
// A suggestion is always optional. Boundaries and mutual enthusiasm come first.
import {surpriseCustom} from './surprise-event-config.mjs';
export const SPECIAL_SURPRISES=[
  {
    "title": "La suite secrète",
    "level": "Très osé",
    "detail": "Transformer une pièce en suite d’hôtel privée : éclairage tamisé, parfum, musique et invitation personnelle glissée sous la porte."
  },
  {
    "title": "Danse privée sous les néons",
    "level": "Très osé",
    "detail": "Préparer une danse de séduction dans une lumière rose, avec une tenue choisie librement et une chanson demandée par la personne célébrée."
  },
  {
    "title": "L’hôtel pour une nuit",
    "level": "Osé",
    "detail": "Organiser une escapade avec arrivée surprise, chambre décorée, petit-déjeuner prolongé et liberté de décider de la suite ensemble."
  },
  {
    "title": "La boîte des envies secrètes",
    "level": "Osé",
    "detail": "Présenter cinq cartes de fantasmes à discuter; la personne célébrée peut choisir, modifier ou écarter chaque proposition."
  },
  {
    "title": "Bandeau et cinq sensations",
    "level": "Osé",
    "detail": "Proposer un bandeau facile à enlever et faire découvrir cinq textures, parfums ou douceurs sur les mains, en restant à l’écoute."
  },
  {
    "title": "Une lettre de tentation",
    "level": "Osé",
    "detail": "Écrire une invitation audacieuse et élégante pour un tête-à-tête privé avec une ambiance soigneusement préparée."
  },
  {
    "title": "Le défilé surprise",
    "level": "Très osé",
    "detail": "Préparer un mini-défilé séduisant avec deux tenues au choix, sans obligation de se déshabiller ni de poursuivre."
  },
  {
    "title": "Une soirée Kamasutra",
    "level": "Très osé",
    "detail": "Offrir un livre ou des cartes d’inspiration Kamasutra et choisir ensemble des idées de positions confortables à découvrir ou simplement discuter."
  },
  {
    "title": "La chambre aux roses",
    "level": "Sensuel",
    "detail": "Installer une lumière chaude, une playlist, des pétales décoratifs et une attention personnalisée à l’arrivée de l’autre."
  },
  {
    "title": "Jeu de rôles : inconnu·e",
    "level": "Osé",
    "detail": "Préparer une fausse première rencontre dans un bar ou le salon, avec personnages, invitation et limites convenues d’avance."
  },
  {
    "title": "Les mains liées au ruban",
    "level": "Très osé",
    "detail": "Proposer un jeu symbolique avec un ruban libre sur les mains, immédiatement retirable, puis une expérience de détente ou de complicité."
  },
  {
    "title": "Bain nocturne",
    "level": "Sensuel",
    "detail": "Préparer un bain ou une douche chaude en duo avec serviettes, éclairage doux et boissons, puis laisser le rythme se choisir à deux."
  },
  {
    "title": "Le menu à la carte",
    "level": "Osé",
    "detail": "Présenter à la personne célébrée un menu de cinq attentions romantiques et sensuelles; elle peut sélectionner ce qui lui plaît."
  },
  {
    "title": "Une nuit sans écran",
    "level": "Osé",
    "detail": "Réserver la soirée entière, ranger les appareils et créer une succession de surprises adaptées aux envies partagées."
  },
  {
    "title": "Le rendez-vous minuit",
    "level": "Très osé",
    "detail": "Préparer une invitation à heure fixe avec une tenue, une playlist et un lieu surprise dans la maison ou lors d’une escapade."
  },
  {
    "title": "Massage éclairé aux bougies",
    "level": "Sensuel",
    "detail": "Prévoir un massage à l’huile adaptée, des bougies LED et une pièce confortable; la personne célébrée décide de la pression et de la durée."
  },
  {
    "title": "L’enveloppe rouge",
    "level": "Osé",
    "detail": "Préparer trois enveloppes de rendez-vous : tendre, sensuel et audacieux. La personne célébrée ouvre celle qu’elle souhaite."
  },
  {
    "title": "Le jeu des secrets",
    "level": "Très osé",
    "detail": "Proposer cinq questions complices, dont les envies, les nouveautés et les limites, en offrant toujours la possibilité de passer."
  },
  {
    "title": "La table du désir",
    "level": "Osé",
    "detail": "Mettre une table romantique exceptionnelle à domicile, soigner les détails et garder la fin de la soirée entièrement ouverte."
  },
  {
    "title": "Le grand rendez-vous hors du commun",
    "level": "Très osé",
    "detail": "Organiser une expérience inhabituelle à deux : hôtel thématique, événement élégant ou nuit surprise, avec accord sur le budget et l’ambiance."
  }
];

export const OCCASIONS=[
 {key:"valentine",title:"Saint-Valentin",emoji:"💘",description:"Une fête des amoureux qui peut se préparer à l'avance."},
 {key:"anniversary",title:"Notre anniversaire de couple",emoji:"🥂",description:"Une expérience hors du commun à préparer et découvrir ensemble, sans désigner un organisateur au hasard."},
 {key:"mothers_day",title:"Fête des Mères",emoji:"🌷",description:"Le partenaire offre à la mère célébrée une surprise spécialement préparée."},
 {key:"womens_day",title:"Journée internationale des droits des femmes",emoji:"🌹",description:"Le partenaire célèbre sa conjointe avec une attention séduisante ou romantique."},
 {key:"fathers_day",title:"Fête des Pères",emoji:"🎩",description:"Le partenaire offre au père célébré une surprise spécialement préparée."},
 {key:"mens_day",title:"Journée internationale des hommes",emoji:"🖤",description:"Le partenaire célèbre son conjoint avec une attention préparée pour lui."},
 {key:"birthday",title:"Mon anniversaire",emoji:"🎂",description:"Une surprise centrée sur la personne qui fête son anniversaire."}
];
export function nthSunday(year,month,n){
 const first=new Date(Date.UTC(year,month-1,1)).getUTCDay();
 return 1+(7-first)%7+7*(n-1);
}
export function occasionDate(kind,year,settings,userId){
 const override=surpriseCustom(settings,kind,userId).month_day;
 const full=(m,d)=>String(year).padStart(4,"0")+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
 if(typeof override==='string'&&/^\d{2}-\d{2}$/.test(override)){
  const [m,n]=override.split('-').map(Number);
  const day=(m===2&&n===29&&!((year%4===0&&year%100!==0)||year%400===0))?28:n;
  const iso=full(m,day),parsed=new Date(iso+'T12:00:00Z');
  if(!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso)return iso;
 }
 if(kind==="valentine")return full(2,14);
 if(kind==="mothers_day")return full(5,nthSunday(year,5,2));
 if(kind==="womens_day")return full(3,8);
 if(kind==="mens_day")return full(11,19);
 if(kind==="fathers_day")return full(6,nthSunday(year,6,3));
 const md=kind==="anniversary"?settings?.anniversary_md:
    kind==="birthday"?settings?.birthday_by_user?.[userId]:null;
 if(!/^\d{2}-\d{2}$/.test(md||""))return null;
 const candidate=year+"-"+md;
 const parsed=new Date(candidate+"T12:00:00Z");
 if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==candidate) {
  // A Feb 29 birthday can be celebrated on Feb 28 in other years.
  return md==="02-29"?full(2,28):null;
 }
 return candidate;
}
export function dueOccasions(now,settings,members){
 const current=new Date(now+"T12:00:00Z");
 const rows=[];
 for(const occasion of OCCASIONS){
  const owners=occasion.key==="birthday"?members.map(m=>m.user_id):[null];
  for(const owner of owners)for(const year of [current.getUTCFullYear()-1,current.getUTCFullYear(),current.getUTCFullYear()+1]){
   const date=occasionDate(occasion.key,year,settings,owner);
   if(!date)continue;
   const diff=Math.round((new Date(date+"T12:00:00Z")-current)/86400000);
   // Time to arrange a babysitter; booking remains possible for a week afterward.
   if(diff>14||diff< -7)continue;
   rows.push({...occasion,actorId:owner,year,date,daysLeft:diff,
    rollKey:occasion.key+(owner?":"+owner:"")+":"+year});
  }
 }
 return rows.sort((a,b)=>Math.abs(a.daysLeft)-Math.abs(b.daysLeft));
}
export function specialSurprise(face){
 if(!Number.isInteger(face)||face<1||face>20)throw Error("Dé spécial invalide");
 return SPECIAL_SURPRISES[face-1];
}

export const TARGETED_OCCASIONS=['mothers_day','fathers_day','womens_day','mens_day'];
export function occasionRoles(event,settings,members){
 if(!Array.isArray(members)||members.length!==2)return {giver:null,receiver:null,shared:true};
 if(event.key==='anniversary'||event.key==='valentine')
  return {giver:null,receiver:null,shared:true};
 let celebrated=event.key==='birthday'?event.actorId:settings?.celebrants?.[event.key];
 if(!celebrated||!members.some(m=>m.user_id===celebrated))
  return {giver:null,receiver:null,shared:false};
 return {giver:members.find(m=>m.user_id!==celebrated),
  receiver:members.find(m=>m.user_id===celebrated),shared:false};
}
