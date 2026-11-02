import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlyGeoCardHtml,trustedBookingVenueLinks} from './monthly-geo-ui.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';

const venue={state:'ready',place_id:'p1',name:'Café proposé',address:'11 rue Québec',
  driving_meters:12000,latitude:46.8,longitude:-71.2,
  booking_url:'https://cafe.example/book',menu_url:'https://cafe.example/menu'};
const booked={status:'confirmed',reserved_for:'2026-12-05T20:00:00Z',
  venue_name:'Café réservé',venue_address:'22 rue du Port',paid_by_host:true,
  notes:'Réservation déclarée confirmée'};

test('only the host sees Adapter la sortie; D100 and source provider suggestion remain untouched',()=>{
 const guest=monthlyGeoCardHtml({enabled:true,venue,canReserve:false,reservation:booked});
 const host=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,reservation:booked});
 assert.doesNotMatch(guest,/data-action="geo-booking-adapt"/);
 assert.match(host,/data-action="geo-booking-adapt"/);
 assert.match(host,/Café proposé/);
 assert.match(host,/Café réservé/);
 const screen=premiumSurpriseHtml({
  monthly:{monthly_activity:{id:'roll1',face:7},monthly_host:{id:'host1',face:2}},
  members:[{user_id:'A',name:'A'},{user_id:'B',name:'B'}],
  activity:{title:'Une idée à deux',description:'Expérience à personnaliser'},
  showActivity:true,geoEnabled:true,geoVenue:venue,reservation:booked,
  canReserve:true,bookingEditor:true,bookingAlternative:true
 });
 assert.match(screen,/data-action="geo-booking-adapt"/);
 assert.match(screen,/D100 · 7/);
});

test('adaptation uses a blank replacement venue, asks a reason and unchecks prior payment',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,
  reservation:booked,editing:true,adapting:true});
 assert.match(html,/id="geo-booking-name" maxlength="140" value=""/);
 assert.match(html,/id="geo-booking-address" maxlength="240" value=""/);
 assert.match(html,/id="geo-adapt-reason"/);
 for(const key of ['visited','closed','far','expensive','other'])
  assert.match(html,new RegExp('value="'+key+'"'));
 assert.match(html,/ne sera pas annulée automatiquement/);
 assert.doesNotMatch(html,/id="geo-booking-confirmed"[^>]*checked/);
 assert.doesNotMatch(html,/id="geo-booking-paid"[^>]*checked/);
});

test('saved adaptation notes are escaped and manual venues never inherit unrelated booking links',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,reservation:{
  ...booked,notes:'<img src=x onerror=alert(1)>'
 }});
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
 const links=trustedBookingVenueLinks(venue,{title:'Autre café',address:'Adresse manuelle'});
 assert.deepEqual(links,{p_booking_url:null,p_menu_url:null,p_photo_url:null});
});

test('existing booking replacement requires explicit confirmation and never redraws D100',()=>{
 const code=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=code.indexOf("if(verb==='geo-booking-adapt')");
 const save=code.indexOf("if(verb==='geo-booking-save')",start);
 const cancel=code.indexOf("if(verb==='geo-booking-cancel')",save);
 assert.ok(start>0&&save>start&&cancel>save);
 const block=code.slice(start,cancel);
 assert.match(block,/currentHost\(\)\?\.user_id!==state\.user\?\.id/);
 assert.match(block,/state\.geoBookingAlternative/);
 assert.match(block,/if\(adapting&&state\.geoReservation/);
 assert.match(block,/premiumConfirm\(/);
 assert.match(block,/ne sera PAS annulée automatiquement/);
 assert.match(block,/p_notes:notes/);
 assert.match(block,/trustedBookingVenueLinks\(state\.geoVenue,\{title,address\}\)/);
 assert.doesNotMatch(block,/roll_couple_once|monthly_activity.*rpc/);
});
