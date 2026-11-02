// An optional, modest moment between monthly Surprise dates.
// Pure editorial idea. No official D100/D6 roll, place, reservation or API call.
const IDEAS=[
 ['Trois petits bonheurs','Racontez chacun trois moments de la semaine qui vous ont fait sourire, sans téléphone.'],
 ['La question du cœur','Choisissez un souvenir commun et racontez ce que vous aviez ressenti ce jour-là.'],
 ['Une chanson, un souvenir','Choisissez chacun une chanson qui vous rappelle un beau moment vécu ensemble et racontez pourquoi.'],
 ['Dix minutes à deux','Réservez dix minutes juste pour vous. Chacun dit une chose qu’il a appréciée chez l’autre.'],
 ['Notre prochaine envie','Partagez une petite activité que vous aimeriez faire ensemble un jour, sans prendre d’engagement.'],
 ['Un mot doux','Écrivez chacun une phrase de gratitude et échangez-la à la fin de votre journée.'],
 ['La photo souvenir','Retrouvez une photo que vous aimez et racontez chacun ce qui vous avait marqué.'],
 ['Notre aventure imaginaire','Imaginez ensemble votre prochaine journée idéale, sans réserver ni dépenser.']
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Toronto's civil Monday determines the same idea for both members.
export function weeklySurpriseIdea(now=new Date()){
 const date=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(date.getTime()))return IDEAS[0];
 const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',
  timeZone:'America/Toronto'}).formatToParts(date);
 const value=name=>Number(parts.find(p=>p.type===name)?.value);
 const monday=new Date(Date.UTC(value('year'),value('month')-1,value('day')));
 monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const index=((Math.floor(monday.getTime()/604800000)%IDEAS.length)+IDEAS.length)%IDEAS.length;
 return IDEAS[index];
}
export function weeklySurpriseIdeaHtml({now=new Date(),revealed=false}={}){
 if(!revealed)return '';
 const [title,description]=weeklySurpriseIdea(now);
 return '<details class="surprise-weekly-idea">'+
  '<summary>♡ Un moment à deux cette semaine</summary>'+
  '<div class="surprise-weekly-idea-content"><strong>'+esc(title)+'</strong>'+
  '<p>'+esc(description)+'</p>'+
  '<small>Une idée facultative, indépendante de votre D100 et sans réservation.</small>'+
  '</div></details>';
}
