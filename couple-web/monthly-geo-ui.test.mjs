import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyGeoCardHtml,localBookingDateTime} from './monthly-geo-ui.mjs';
const venue={state:'ready',place_id:'geo-1',name:'Café du centre',driving_meters:16200,
 latitude:45.6,longitude:-73.7,address:'Rue Exemple'};
test('LR-SURPRISE-001: known road route and GPS are displayed, missing values never become zero',()=>{
 const make=v=>monthlyGeoCardHtml({enabled:true,venue:{...venue,...v}});
 assert.match(make({}),/16,2 km par la route/);
 for(const value of [null,undefined,'',false,'absent',-1]){
  assert.doesNotMatch(make({driving_meters:value}),/km par la route/);
 }
 assert.doesNotMatch(make({latitude:null,longitude:null}),/destination=/);
 assert.doesNotMatch(make({latitude:95,longitude:-73.7}),/destination=/);
 assert.match(make({driving_meters:0}),/0 km par la route/);
});
test('LR-SURPRISE-001: editing pre-fills the existing instant in the local date picker',()=>{
 const original='2026-11-10T23:45:00Z';
 const clock=localBookingDateTime(original);
 assert.match(clock,/^2026-11-1[01]T\d\d:45$/);
 assert.equal(new Date(clock).getTime(),new Date(original).getTime());
 const html=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,editing:true,
  reservation:{status:'confirmed',reserved_for:original,venue_name:'Café du centre'}});
 assert.ok(html.includes('id="geo-booking-date" type="datetime-local" value="'+clock+'"'));
 assert.match(html,/Enregistrer la date</);
 assert.doesNotMatch(html,/Un rappel est prévu 24 h/);
 assert.match(html,/rappels dépendent de leur programmation/);
 assert.equal(localBookingDateTime(null),'');
 assert.equal(localBookingDateTime('not-a-date'),'');
});
test('LR-SURPRISE-001: an unconfirmed plan does not promise a notification',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,reservation:{status:'planned',
  reserved_for:'2026-11-10T23:45:00Z'}});
 assert.match(html,/Aucun rappel confirmé/);
 assert.doesNotMatch(html,/Un rappel est prévu/);
});

test('LR-SURPRISE-001: a ready POI without verified driving route is not presented as bookable',()=>{
 for(const invalid of [null,undefined,'',false,NaN,-1,'unknown']){
  const rendered=monthlyGeoCardHtml({enabled:true,venue:{...venue,driving_meters:invalid,
   website_url:'https://example.com',booking_url:'https://example.com/book'},canReserve:false});
  assert.match(rendered,/trajet routier vers ce lieu n’est pas vérifié/);
  assert.doesNotMatch(rendered,/surprise-geo-venue-info/);
  assert.doesNotMatch(rendered,/destination=/);
  assert.doesNotMatch(rendered,/https:\/\/example\.com\/book/);
 }
 const saved=monthlyGeoCardHtml({enabled:true,venue:{...venue,driving_meters:null},
  reservation:{status:'confirmed',reserved_for:'2026-11-10T23:45:00Z'},canReserve:false});
 assert.match(saved,/Réservation déclarée confirmée/,'An existing saved reservation remains visible');
 assert.match(monthlyGeoCardHtml({enabled:true,venue:{...venue,driving_meters:0}}),/0 km par la route/);
 assert.match(monthlyGeoCardHtml({enabled:true,venue:{...venue,driving_meters:16200}}),/16,2 km par la route/);
});


test('LR-SURPRISE-001: website is never passed off as a reservation URL',()=>{
 const simple=monthlyGeoCardHtml({enabled:true,venue:{...venue,
  website_url:'https://example.com/official',booking_url:null},canReserve:true});
 assert.match(simple,/Site officiel/);
 assert.doesNotMatch(simple,/Réserver auprès du lieu/);
 assert.equal((simple.match(/href="https:\/\/example\.com\/official"/g)||[]).length,1);
 const real=monthlyGeoCardHtml({enabled:true,venue:{...venue,
  website_url:'https://example.com/official',booking_url:'https://example.com/book'},canReserve:true});
 assert.match(real,/Réserver auprès du lieu/);
 assert.match(real,/Site officiel/);
 assert.match(real,/https:\/\/example\.com\/book/);
 assert.match(real,/https:\/\/example\.com\/official/);
 const guest=monthlyGeoCardHtml({enabled:true,venue:{...venue,
  website_url:'https://example.com/official',booking_url:'https://example.com/book'},canReserve:false});
 assert.doesNotMatch(guest,/Réserver auprès du lieu/);
 assert.match(guest,/Site officiel/);
});
