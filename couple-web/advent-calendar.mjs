// LoveRoll: validate user-authored Advent JSON, preserving all submitted text exactly.
export const ADVENT_YEAR=2026;
export function validateAdventJson(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Le calendrier doit être un objet JSON.');
 if(payload.year!==ADVENT_YEAR)throw Error('Ce calendrier doit être pour 2026.');
 if(typeof payload.calendar_title!=='string'||payload.calendar_title.trim().length<3||payload.calendar_title.length>160)
  throw Error('Titre du calendrier invalide.');
 if(payload.target_audience!=='18+')throw Error('Le calendrier est réservé aux personnes majeures (18+).');
 if(typeof payload.note!=='string'||payload.note.length>1200)throw Error('Note du calendrier invalide.');
 if(!Array.isArray(payload.days)||payload.days.length!==25)
  throw Error('Le JSON doit contenir exactement les 25 journées.');
 const seen=new Set();
 for(const item of payload.days){
  if(!item||typeof item!=='object'||Array.isArray(item)||!Number.isInteger(item.day)||
   item.day<1||item.day>25||seen.has(item.day))
    throw Error('Les jours doivent être uniques, numérotés de 1 à 25.');
  seen.add(item.day);
  for(const [field,min,max] of [['type',2,90],['title',3,200],['description',10,1500]]){
   if(typeof item[field]!=='string'||item[field].trim().length<min||
    item[field].length>max)
    throw Error('Champ invalide au jour '+item.day+' : '+field);
  }
  if(item.timer_minutes!==undefined&&item.timer_minutes!==null&&
    (!Number.isInteger(item.timer_minutes)||item.timer_minutes<1||item.timer_minutes>60))
    throw Error('Minuteur du jour '+item.day+' : 1 à 60 minutes ou null.');
 }
 return payload;
}
export function calendarFromSaved(settings,days){
 if(!settings||!Array.isArray(days)||days.length!==25)return null;
 return validateAdventJson({
  calendar_title:settings.calendar_title,year:2026,
  target_audience:settings.target_audience,note:settings.note,
  days:days.map(day=>({day:day.day,type:day.type,title:day.title,description:day.description,timer_minutes:day.timer_minutes??null}))
   .sort((a,b)=>a.day-b.day)
 });
}
