// Local outing resolver (provider-agnostic). NEVER accepts haversine distance
// as a substitute for the couple's chosen maximum DRIVING distance.
// This module is a safe algorithmic core, not a live Places API connection.
export const VENUE_CATEGORIES=Object.freeze({
 spa:'leisure.spa',restaurant:'catering.restaurant',
 culture:'entertainment.museum',nature:'leisure.park',
 hotel:'accommodation',winery:'catering',water:'tourism',
 adventure:'entertainment',general:'tourism.attraction'
});
const norms=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function activityCategory(activity={}){
 const source=norms([activity.title,activity.description].filter(Boolean).join(' '));
 if(/\b(spa|therm|sauna|massage|bain nordique|hammam)\b/.test(source))return 'spa';
 if(/\b(vignoble|vinicole|degustation de vin|oenolog)/.test(source))return 'winery';
 if(/\b(hotel|chalet|cabane|heberg|nuit insolite|dome|gite)\b/.test(source))return 'hotel';
 if(/\b(restaur|brunch|gastronom|repas|souper|table d.hote|bistro|brasserie)\b/.test(source))return 'restaurant';
 if(/\b(musee|theatre|galerie d.art|concert|spectacle|exposition)\b/.test(source))return 'culture';
 if(/\b(bateau|croisiere|kayak|canot|voilier|phare|observation des baleines)\b/.test(source))return 'water';
 if(/\b(randonnee|foret|sentier|parc|pique.nique|jardin)\b/.test(source))return 'nature';
 if(/\b(aventure|escalade|tyrolienne|motoneige|kart|velo|ski)\b/.test(source))return 'adventure';
 return 'general';
}
export function drivingKilometres(route){
 const metres=Number(route?.distance_meters);
 return Number.isFinite(metres)&&metres>=0?Math.round(metres/100)/10:null;
}
export function isRouteWithinRadius(route,maxKm){
 const km=drivingKilometres(route);
 return km!==null&&Number.isFinite(Number(maxKm))&&Number(route.distance_meters)<=Number(maxKm)*1000;
}
export function chooseNearbyVenue(places,roadRoutes,maxKm,{category=null}={}){
 const allowed=Object.values(VENUE_CATEGORIES);
 if(category!==null&&!allowed.includes(category))throw Error('Unknown category');
 const candidate=(Array.isArray(places)?places:[]).map(place=>{
  const id=String(place?.place_id||'').trim(),name=String(place?.name||'').trim();
  const route=id&&roadRoutes?.[id],km=drivingKilometres(route);
  if(!id||!name||!isRouteWithinRadius(route,maxKm))return null;
  if(category&&!String(place?.categories||'').split(',').some(x=>x===category||x.startsWith(category+'.')))return null;
  return {place_id:id,name,address:String(place.address||'').trim(),distance_km:km,distance_meters:Number(route.distance_meters),source:'Geoapify'};
 }).filter(Boolean).sort((a,b)=>a.distance_km-b.distance_km||a.place_id.localeCompare(b.place_id));
 return candidate[0]||null;
}
export function localActivityResult(roll,venue,shared){
 // Does not alter the original monthly face/title/description.
 if(!Number.isInteger(roll?.face)||roll.face<1||roll.face>100)throw Error('Invalid official monthly face');
 if(!venue)return {face:roll.face,venue:null,found:false};
 if(!isRouteWithinRadius({distance_meters:venue.distance_meters},shared?.travel_radius_km))
  throw Error('Venue outside requested driving radius');
 return {face:roll.face,venue,found:true,source:'verified-route'};
}
