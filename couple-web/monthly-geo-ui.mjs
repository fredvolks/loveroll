// LoveRoll — Surprise > Voir notre activité. Pure, XSS-safe renderer.
// A venue is shown only when Geoapify supplied an actual named POI and a road route.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const https=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const a=(url,label)=>url?'<a class="surprise-geo-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':'';
const humanDate=(timestamp,locale='fr-CA')=>{
 if(timestamp===null||timestamp===undefined||timestamp==='')return 'Date à vérifier';
 try{return new Intl.DateTimeFormat(locale,{dateStyle:'full',timeStyle:'short'}).format(new Date(timestamp));}catch{return 'Date à vérifier';}
};
// datetime-local takes local clock time, not a UTC ISO timestamp.
export function localBookingDateTime(timestamp){
 if(timestamp===null||timestamp===undefined||timestamp==='')return '';
 const d=new Date(timestamp);
 if(!Number.isFinite(d.getTime()))return '';
 const pad=n=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+
  'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
const finiteProviderNumber=value=>{
 if(value===null||value===undefined||typeof value==='boolean')return null;
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(typeof value==='string'&&!value.trim())return null;
 const number=Number(value);
 return Number.isFinite(number)?number:null;
};
export function geoPhoto(venue){
 const src=https(venue?.photo_url);
 return src?'<img class="surprise-geo-photo" alt="Photo du lieu : '+esc(venue.name)+'" src="'+esc(src)+'" loading="lazy" referrerpolicy="no-referrer">':
 '<div class="surprise-geo-photo-placeholder" aria-label="Photo du lieu non disponible">♡<small>Photo du lieu non disponible</small></div>';
}
export function monthlyGeoCardHtml({
 venue=null,lookup='idle',enabled=false,host=null,canReserve=false,reservation=null,editing=false,adapting=false,budgetLimited=false,
 locale='fr-CA',experienceTitle=''
}={}){
 if(!enabled&&(!reservation||reservation.status==='cancelled'))return '';
 let body='';
 // A named POI is not a verified driving destination until its road route
 // is confirmed. Do not offer GPS/site booking as a resolved Surprise venue
 // when the provider's matrix was empty, unreachable or invalid.
 const roadMetres=finiteProviderNumber(venue?.driving_meters);
 const roadVerified=roadMetres!==null&&roadMetres>=0;
 if(enabled&&venue?.state==='ready'&&venue?.place_id&&venue?.name&&roadVerified){
  const lat=finiteProviderNumber(venue.latitude),lon=finiteProviderNumber(venue.longitude),
   gps=lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180?
    'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(lat+','+lon):null;
  const site=https(venue.website_url),booking=https(venue.booking_url),menu=https(venue.menu_url);
  const distance=Math.round(roadMetres/100)/10;
  body='<div class="surprise-geo-venue">'+geoPhoto(venue)+
    '<div class="surprise-geo-venue-info"><strong>'+esc(venue.name)+'</strong>'+
    (venue.address?'<span>'+esc(venue.address)+'</span>':'')+
    (distance!==null?'<small>'+esc(distance.toLocaleString(locale))+' km par la route</small>':'')+
    '</div><div class="surprise-geo-links">'+a(gps,'⌖ GPS')+
    (canReserve?a(booking,'♡ Réserver auprès du lieu'):'')+
    a(menu,'☷ Menu / activités')+
    (site===booking&&canReserve?'':a(site,'☷ Site officiel'))+'</div>'+
    (!canReserve&&host?'<p class="surprise-geo-muted">♡ '+esc(host)+' organise la réservation et le paiement.</p>':'')+
    '</div>';
 }else{
  const message=!enabled?'La recherche locale est désactivée. Votre sortie enregistrée reste disponible.':
   lookup==='loading'||lookup==='pending'?'Recherche d’un vrai lieu à proximité…':
   lookup==='error'?'Geoapify n’est pas encore disponible. Votre activité D100 reste enregistrée.':
   lookup==='retry_exhausted'?'La recherche a rencontré plusieurs erreurs. Réessayez manuellement après 15 minutes; votre D100 reste enregistré.':
   lookup==='unavailable'?'Aucun établissement avec trajet routier vérifié dans votre rayon. Votre activité D100 est conservée.':
   venue?.state==='ready'&&!roadVerified?'Le trajet routier vers ce lieu n’est pas vérifié. Votre activité D100 est conservée.':
   'Votre activité D100 est enregistrée. La recherche locale se lance automatiquement.';
  body='<div class="surprise-geo-pending" role="status">'+esc(message)+'</div>'+
   (enabled&&['error','retry_exhausted'].includes(lookup)?'<button type="button" class="surprise-geo-text-button" data-action="geo-retry">Réessayer la recherche</button>':'');
 }
 let bookingHtml='';
 if(reservation&&reservation.status!=='cancelled'){
  bookingHtml='<div class="surprise-geo-booked"><strong>'+
   (reservation.status==='confirmed'?'♡ Réservation déclarée confirmée':'♡ Projet de sortie')+
   '</strong>'+
   (reservation.venue_name?'<span class="surprise-geo-reserved-place">'+esc(reservation.venue_name)+'</span>':'')+
   (reservation.venue_address?'<small>'+esc(reservation.venue_address)+'</small>':'')+
   (reservation.notes?'<small class="surprise-geo-reserved-note">'+esc(reservation.notes)+'</small>':'')+
   '<span>'+esc(humanDate(reservation.reserved_for,locale))+'</span>'+ 
   '<small>'+(reservation.paid_by_host?'Paiement déclaré effectué par la personne qui invite':'Paiement non confirmé dans LoveRoll')+
   '</small><small>'+(reservation.status==='confirmed'?
    'Les rappels dépendent de leur programmation et de vos notifications.':
    'Aucun rappel confirmé pour cette sortie en préparation.')+'</small></div>';
 }
 if(canReserve){
  bookingHtml+='<div class="surprise-geo-host-tools">'+
   '<button type="button" data-action="geo-booking-editor" class="surprise-primary">'+
   (editing?'Fermer la planification':reservation&&reservation.status!=='cancelled'?'Modifier ma réservation':'Enregistrer ma réservation')+
   '</button>'+
   '<button type="button" data-action="geo-booking-adapt" class="surprise-geo-text-button">'+
   (editing&&adapting?'Fermer l’adaptation':'Adapter la sortie')+'</button>'+ 
   (reservation&&reservation.status!=='cancelled'?'<button type="button" data-action="geo-booking-cancel" class="surprise-geo-text-button">Annuler la réservation dans LoveRoll</button>':'')+
   (editing?'<div class="surprise-geo-booking-form">'+
   '<label for="geo-booking-date">Date et heure de la sortie</label>'+
   '<input id="geo-booking-date" type="datetime-local" value="'+esc(localBookingDateTime(reservation?.reserved_for))+'" required>'+
   '<label for="geo-booking-name">Nom de l’établissement</label>'+
   '<input id="geo-booking-name" maxlength="140" value="'+esc(adapting?'':reservation?.venue_name||venue?.name||'')+'" required>'+ 
   '<label for="geo-booking-address">Adresse (facultative)</label>'+
   '<input id="geo-booking-address" maxlength="240" value="'+esc(adapting?'':reservation?.venue_address||venue?.address||'')+'">'+
   (adapting?'<label for="geo-adapt-reason">Pourquoi adapter ?</label>'+
    '<select id="geo-adapt-reason" required><option value="">Choisir une raison</option>'+
    '<option value="visited">Déjà visité</option><option value="closed">Lieu fermé</option>'+
    '<option value="far">Trop loin</option><option value="expensive">Trop cher</option>'+
    '<option value="other">Autre idée à deux</option></select>'+
    '<p class="surprise-geo-muted">Ce lieu est choisi par vous, et non vérifié par Geoapify. Vérifiez son adresse, le trajet, les prix et les disponibilités.</p>'+
    (reservation&&reservation.status!=='cancelled'?'<p class="surprise-geo-muted">La réservation extérieure précédente ne sera pas annulée automatiquement.</p>':''):'')+
   '<label class="surprise-geo-check"><input id="geo-booking-confirmed" type="checkbox"'+(reservation?.status==='confirmed'&&!adapting?' checked':'')+'> J’ai effectué la réservation auprès de l’établissement</label>'+
   '<label class="surprise-geo-check"><input id="geo-booking-paid" type="checkbox"'+(reservation?.paid_by_host&&!adapting?' checked':'')+'> J’ai payé la réservation</label>'+
   (budgetLimited?'<label class="surprise-geo-check"><input id="geo-booking-budget-ack" type="checkbox"> J’accepte de préparer cette sortie même si son prix réel n’est pas confirmé par Geoapify et pourrait dépasser notre budget.</label>':'')+
   '<p class="surprise-geo-muted">LoveRoll ne réserve ni ne prélève d’argent : confirmez ici votre réservation externe.</p>'+
   '<button type="button" data-action="geo-booking-save" class="surprise-primary">Enregistrer la date</button></div>':'')+
   '</div>';
 }else if(!host){
  bookingHtml+='<p class="surprise-geo-muted">Le D6 choisira qui invite, réserve et paie.</p>';
 }
 return '<section class="surprise-geo-card" aria-label="Lieu réel de notre activité">'+
  '<div class="surprise-geo-eyebrow">♡ NOTRE LIEU DU MOIS</div>'+
  body+bookingHtml+
  '<p class="surprise-geo-credit">Lieux et distances : données <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> et <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>. Photos, menus, prix et réservations selon les informations disponibles.</p></section>';
}

/**
 * One mutable Surprise booking operation at a time (save, edit or cancel).
 * A rapid second tap must never reorder two official reservation RPCs.
 * Failed writes release the gate so the player can retry immediately.
 */
export function createBookingMutationGate(){
 let active=false;
 return async operation=>{
  if(active)return false;
  active=true;
  try{await operation();return true;}
  finally{active=false;}
 };
}

/**
 * Server refresh can return before the Geoapify Edge claim finishes.
 * Preserve pending/error only for the SAME official monthly D100 roll:
 * a new roll must never inherit the old pending search or booking editor.
 */
export function geoLookupAfterRefresh({rollId,previousRollId,venue,previousLookup}={}){
 if(!rollId)return 'idle';
 if(venue?.state)return venue.state;
 return rollId===previousRollId&&['pending','error','retry_exhausted'].includes(previousLookup)?
  previousLookup:'idle';
}

/**
 * A manual venue change must not silently keep another business's official
 * booking/menu/photo URLs. These links belong exclusively to the verified
 * Geoapify suggestion, never to a user-entered replacement establishment.
 */
export function trustedBookingVenueLinks(venue,{title='',address=''}={}){
 const sameText=(a,b)=>String(a??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-CA')===
  String(b??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-CA');
 const roadMetres=finiteProviderNumber(venue?.driving_meters);
 const sameVerifiedVenue=venue?.state==='ready'&&!!venue.place_id&&
  roadMetres!==null&&roadMetres>=0&&!!String(title).trim()&&
  sameText(venue.name,title)&&sameText(venue.address,address);
 return {
  p_booking_url:sameVerifiedVenue?https(venue.booking_url):null,
  p_menu_url:sameVerifiedVenue?https(venue.menu_url):null,
  p_photo_url:sameVerifiedVenue?https(venue.photo_url):null
 };
}
