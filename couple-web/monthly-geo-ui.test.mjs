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
