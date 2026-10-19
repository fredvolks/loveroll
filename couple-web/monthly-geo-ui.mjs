// LoveRoll — Surprise > Voir notre activité. Pure, XSS-safe renderer.
// A venue is shown only when Geoapify supplied an actual named POI and a road route.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const https=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const a=(url,label)=>url?'<a class="surprise-geo-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':'';
const humanDate=(timestamp,locale='fr-CA')=>{
 try{return new Intl.DateTimeFormat(locale,{dateStyle:'full',timeStyle:'short'}).format(new Date(timestamp));}catch{return 'Date à vérifier';}
};
export function geoPhoto(venue){
 const src=https(venue?.photo_url);
 return src?'<img class="surprise-geo-photo" alt="Photo du lieu : '+esc(venue.name)+'" src="'+esc(src)+'" loading="lazy" referrerpolicy="no-referrer">':
 '<div class="surprise-geo-photo-placeholder" aria-label="Photo du lieu non disponible">♡<small>Photo du lieu non disponible</small></div>';
}
export function monthlyGeoCardHtml({
 venue=null,lookup='idle',enabled=false,host=null,canReserve=false,reservation=null,editing=false,
 locale='fr-CA',experienceTitle=''
}={}){
 if(!enabled)return '';
 let body='';
 if(venue?.state==='ready'&&venue?.place_id&&venue?.name){
  const lat=Number(venue.latitude),lon=Number(venue.longitude),
   gps=Number.isFinite(lat)&&Number.isFinite(lon)?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(lat+','+lon):null;
  const site=https(venue.website_url),booking=https(venue.booking_url),menu=https(venue.menu_url);
  const distance=Number.isFinite(Number(venue.driving_meters))?
   Math.round(Number(venue.driving_meters)/100)/10:null;
  body='<div class="surprise-geo-venue">'+geoPhoto(venue)+
    '<div class="surprise-geo-venue-info"><strong>'+esc(venue.name)+'</strong>'+
    (venue.address?'<span>'+esc(venue.address)+'</span>':'')+
    (distance!==null?'<small>'+esc(distance.toLocaleString(locale))+' km par la route</small>':'')+
    '</div><div class="surprise-geo-links">'+a(gps,'⌖ GPS')+
    (canReserve?a(booking||site,'♡ Réserver / site du lieu'):'')+
    (menu?a(menu,'☷ Menu / activités'):a(site,'☷ Site du lieu'))+'</div>'+
    (!canReserve&&host?'<p class="surprise-geo-muted">♡ '+esc(host)+' organise la réservation et le paiement.</p>':'')+
    '</div>';
 }else{
  const message=lookup==='loading'||lookup==='pending'?'Recherche d’un vrai lieu à proximité…':
   lookup==='error'?'Geoapify n’est pas encore disponible. Votre activité D100 reste enregistrée.':
   lookup==='unavailable'?'Aucun établissement avec trajet routier vérifié dans votre rayon. Votre activité D100 est conservée.':
   'Votre activité D100 est enregistrée. La recherche locale se lance automatiquement.';
  body='<div class="surprise-geo-pending" role="status">'+esc(message)+'</div>';
 }
 let bookingHtml='';
 if(reservation&&reservation.status!=='cancelled'){
  bookingHtml='<div class="surprise-geo-booked"><strong>'+
   (reservation.status==='confirmed'?'♡ Réservation déclarée confirmée':'♡ Projet de sortie')+
   '</strong><span>'+esc(humanDate(reservation.reserved_for,locale))+'</span>'+
   '<small>'+(reservation.paid_by_host?'Paiement déclaré effectué par la personne qui invite':'Paiement non confirmé dans LoveRoll')+
   '</small><small>Un rappel est prévu 24 h avant la sortie si vos notifications sont activées.</small></div>';
 }
 if(canReserve){
  bookingHtml+='<div class="surprise-geo-host-tools">'+
   '<button type="button" data-action="geo-booking-editor" class="surprise-primary">'+
   (editing?'Fermer la planification':reservation&&reservation.status!=='cancelled'?'Modifier ma réservation':'Enregistrer ma réservation')+
   '</button>'+
   (reservation&&reservation.status!=='cancelled'?'<button type="button" data-action="geo-booking-cancel" class="surprise-geo-text-button">Annuler la réservation dans LoveRoll</button>':'')+
   (editing?'<div class="surprise-geo-booking-form">'+
   '<label for="geo-booking-date">Date et heure de la sortie</label>'+
   '<input id="geo-booking-date" type="datetime-local" required>'+
   '<label for="geo-booking-name">Nom de l’établissement</label>'+
   '<input id="geo-booking-name" maxlength="140" value="'+esc(reservation?.venue_name||venue?.name||'')+'" required>'+
   '<label for="geo-booking-address">Adresse (facultative)</label>'+
   '<input id="geo-booking-address" maxlength="240" value="'+esc(reservation?.venue_address||venue?.address||'')+'">'+
   '<label class="surprise-geo-check"><input id="geo-booking-confirmed" type="checkbox"'+(reservation?.status==='confirmed'?' checked':'')+'> J’ai effectué la réservation auprès de l’établissement</label>'+
   '<label class="surprise-geo-check"><input id="geo-booking-paid" type="checkbox"'+(reservation?.paid_by_host?' checked':'')+'> J’ai payé la réservation</label>'+
   '<p class="surprise-geo-muted">LoveRoll ne réserve ni ne prélève d’argent : confirmez ici votre réservation externe.</p>'+
   '<button type="button" data-action="geo-booking-save" class="surprise-primary">Enregistrer la date et le rappel</button></div>':'')+
   '</div>';
 }else if(!host){
  bookingHtml+='<p class="surprise-geo-muted">Le D6 choisira qui invite, réserve et paie.</p>';
 }
 return '<section class="surprise-geo-card" aria-label="Lieu réel de notre activité">'+
  '<div class="surprise-geo-eyebrow">♡ NOTRE LIEU DU MOIS</div>'+
  body+bookingHtml+
  '<p class="surprise-geo-credit">Lieux et distances : données Geoapify / OpenStreetMap. Photos, menus, prix et réservations selon les informations disponibles.</p></section>';
}
