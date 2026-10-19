// LoveRoll — private user-authored special occasion JSON.
export const SPECIAL_EVENT_KEYS=[
 'saint_valentin','anniversaire_de_couple','fete_des_meres',
 'fete_des_peres','mon_anniversaire','anniversaire_de_mon_partenaire'
];
export function validateSpecialEventsJson(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  !value.evenements_speciaux||typeof value.evenements_speciaux!=='object'||
  Array.isArray(value.evenements_speciaux))
  throw Error('Le JSON doit contenir « evenements_speciaux ».');
 const events=value.evenements_speciaux;
 if(Object.keys(events).length!==6||SPECIAL_EVENT_KEYS.some(k=>!Object.hasOwn(events,k)))
  throw Error('Le fichier doit contenir exactement les six événements spéciaux.');
 for(const key of SPECIAL_EVENT_KEYS){
  const event=events[key];
  if(!event)throw Error('Événement manquant : '+key);
  for(const [field,min,max] of [['evenement',3,120],['date',4,50]]){
   if(typeof event[field]!=='string'||event[field].trim().length<min||
      event[field].length>max)throw Error('Champ '+field+' invalide : '+key);
  }
  for(const dice of ['D6_activite','D6_modificateur']){
   const rows=event[dice];
   if(!Array.isArray(rows)||rows.length!==6)
    throw Error('Six options '+dice+' requises : '+key);
   for(let face=1;face<=6;face++){
    const option=rows[face-1];
    if(!option||typeof option!=='object'||Array.isArray(option)||
      Object.keys(option).length!==1||!Object.hasOwn(option,String(face))||
      typeof option[face]!=='string'||option[face].trim().length<5||
      option[face].length>1000)
     throw Error('Option '+face+' invalide dans '+dice+' : '+key);
   }
  }
  if(event.minuteurs!==undefined){
   if(!event.minuteurs||typeof event.minuteurs!=='object'||Array.isArray(event.minuteurs))
    throw Error('Champ minuteurs invalide : '+key);
   for(const dice of ['D6_activite','D6_modificateur']){
    const timers=event.minuteurs[dice];
    if(timers===undefined)continue;
    if(!Array.isArray(timers)||timers.length!==6||timers.some(v=>
      v!==null&&(!Number.isInteger(v)||v<1||v>60)))
     throw Error('Minuteurs '+dice+' invalides dans '+key+' : 6 durées de 1 à 60 minutes ou null.');
   }
  }
 }
 return value;
}
export function specialForEvent(settings,roll){
 if(!roll)return null;
 return {
  title:roll.special_title??null,description:roll.special_description??null,
  modifierTitle:roll.modifier_title??null,modifierText:roll.modifier_text??null
 };
}

export function privateSpecialKey(kind,actorId,creatorId){
 if(kind==='valentine')return 'saint_valentin';
 if(kind==='anniversary')return 'anniversaire_de_couple';
 if(kind==='mothers_day')return 'fete_des_meres';
 if(kind==='fathers_day')return 'fete_des_peres';
 if(kind==='birthday')return actorId===creatorId?
  'mon_anniversaire':'anniversaire_de_mon_partenaire';
 return null;
}
