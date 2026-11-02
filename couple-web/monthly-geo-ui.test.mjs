import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlyGeoCardHtml,localBookingDateTime,createBookingMutationGate,geoLookupAfterRefresh,trustedBookingVenueLinks} from './monthly-geo-ui.mjs';
import {refreshAfterConfirmedWrite} from './timed-evening-completion.mjs';
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

test('LR-SURPRISE-001 pending or temporary Geoapify failure is polled with a safe cooldown',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('async function resolveMonthlyGeo(){');
 const end=app.indexOf('function renderSpecial(){',start);
 assert.ok(start>=0&&end>start);
 const resolver=app.slice(start,end);
 assert.match(resolver,/geoFetchNextAt\.set\(roll\.id,now\+12000\)/);
 assert.match(resolver,/geoFetchNextAt\.set\(roll\.id,Date\.now\(\)\+30000\)/);
 assert.match(resolver,/geoFetchActive===roll\.id/);
 assert.match(resolver,/state\.geoLookup==='pending'\|\|state\.geoLookup==='error'/);
 assert.match(resolver,/!document\.hidden/);
 assert.match(resolver,/if\(!stillCurrent\(\)\)return/);
 assert.match(resolver,/if\(stillCurrent\(\)&&state\.tab==='special'/);
 assert.match(app,/geoFetchNextAt\.delete\(state\.monthly\.monthly_activity\.id\)/,
  'Manual reopening may request the current official roll again');
 assert.doesNotMatch(app,/geoFetchSeen/,
  'A one-time seen set must not permanently strand pending or failed lookups');
});

test('LR-SURPRISE-001 temporary provider error offers a real retry action without fake results',()=>{
 const pending=monthlyGeoCardHtml({enabled:true,venue:null,lookup:'pending'});
 assert.match(pending,/Recherche d’un vrai lieu à proximité/);
 assert.doesNotMatch(pending,/data-action="geo-retry"/,
  'Pending server claims are polled, not manually multiplied');
 const error=monthlyGeoCardHtml({enabled:true,venue:null,lookup:'error'});
 assert.match(error,/data-action="geo-retry"/);
 assert.match(error,/Réessayer la recherche/);
 assert.doesNotMatch(error,/surprise-geo-venue-info/,
  'An offline search cannot invent a destination');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const action=app.slice(app.indexOf("if(verb==='geo-retry')"),app.indexOf("if(verb==='geo-booking-editor')"));
 assert.match(action,/worldGeoEnabled\(\)/);
 assert.match(action,/geoFetchActive===rollId/);
 assert.match(action,/geoFetchNextAt\.delete\(rollId\)/);
 assert.match(action,/void resolveMonthlyGeo\(\)/);
});

test('LR-SURPRISE-001 confirmed booking writes stay successful if only screen refresh fails',async()=>{
 let attempts=0;
 assert.equal(await refreshAfterConfirmedWrite(async()=>{attempts++;}),true);
 assert.equal(await refreshAfterConfirmedWrite(async()=>{attempts++;throw Error('offline after server save');}),false);
 assert.equal(attempts,2,'No second server write or extra refresh');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const saveStart=app.indexOf("if(verb==='geo-booking-save')");
 const cancelStart=app.indexOf("if(verb==='geo-booking-cancel')",saveStart);
 const end=app.indexOf("if(verb==='surprise-season')",cancelStart);
 const save=app.slice(saveStart,cancelStart),cancel=app.slice(cancelStart,end);
 assert.ok(saveStart>=0&&cancelStart>saveStart&&end>cancelStart);
 for(const block of [save,cancel]){
  assert.match(block,/const ownerId=state\.user\?\.id,rollId=state\.monthly\?\.monthly_activity\?\.id/);
  assert.match(block,/if\(state\.user\?\.id!==ownerId\|\|state\.monthly\?\.monthly_activity\?\.id!==rollId\)return;/);
  assert.match(block,/if\(!await refreshAfterConfirmedWrite\(refreshAndShow\)\)/);
  assert.ok(block.indexOf('await rpc(')<block.indexOf('refreshAfterConfirmedWrite'),
   'Refresh must follow the confirmed server write, not the reverse');
 }
 assert.match(save,/if\(!title\|\|title\.length>140\|\|address\.length>240\)/);
 assert.match(save,/status:confirmed\?'confirmed':'planned'/);
 assert.match(cancel,/state\.geoReservation=null/);
 assert.match(cancel,/currentHost\(\)\?\.user_id!==ownerId/);
});

test('LR-SURPRISE-001 booking actions are serialized and unlock after failure',async()=>{
 const gate=createBookingMutationGate(),calls=[];
 let release;
 const first=gate(async()=>{
  calls.push('save-start');
  await new Promise(resolve=>{release=resolve;});
  calls.push('save-done');
 });
 assert.equal(await gate(async()=>{calls.push('duplicate-save');}),false);
 assert.equal(await gate(async()=>{calls.push('cancel-during-save');}),false);
 assert.deepEqual(calls,['save-start']);
 release();
 assert.equal(await first,true);
 assert.equal(await gate(async()=>{calls.push('cancel-after-save');}),true);
 await assert.rejects(gate(async()=>{throw Error('save offline');}),/save offline/);
 assert.equal(await gate(async()=>{calls.push('retry-after-error');}),true);
 assert.deepEqual(calls,['save-start','save-done','cancel-after-save','retry-after-error']);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/const geoBookingMutationGate=createBookingMutationGate\(\)/);
 for(const action of ['geo-booking-save','geo-booking-cancel']){
  const start=app.indexOf("if(verb==='"+action+"')");
  const end=app.indexOf('if(verb===',start+12);
  const handler=app.slice(start,end);
  assert.match(handler,/const executed=await geoBookingMutationGate\(async\(\)=>\{/);
  assert.ok(handler.indexOf('await rpc(')>handler.indexOf('geoBookingMutationGate('));
  assert.match(handler,/if\(!executed\)notify\('Une opération de réservation est déjà en cours\.'\)/);
 }
});

test('LR-SURPRISE-001 refresh retains pending/error Geoapify discovery for same roll only',()=>{
 const lookup=(rollId,previousRollId,previousLookup,venue=null)=>
  geoLookupAfterRefresh({rollId,previousRollId,previousLookup,venue});
 assert.equal(lookup('roll-a','roll-a','pending'),'pending',
  'An empty places query while Edge is pending must not stop polling');
 assert.equal(lookup('roll-a','roll-a','error'),'error',
  'A temporary network outage remains eligible for the manual retry');
 for(const status of ['idle','loading','ready','unavailable']){
  assert.equal(lookup('roll-a','roll-a',status),'idle');
 }
 assert.equal(lookup('roll-b','roll-a','pending'),'idle');
 assert.equal(lookup('roll-b','roll-a','error'),'idle');
 assert.equal(lookup(null,'roll-a','pending'),'idle');
 assert.equal(lookup('roll-b','roll-a','pending',{state:'ready'}),'ready');
 assert.equal(lookup('roll-a','roll-a','pending',{state:'unavailable'}),'unavailable');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/const previousRollId=state\.monthly\?\.monthly_activity\?\.id/);
 assert.match(app,/const previousGeoLookup=state\.geoLookup/);
 assert.match(app,/if\(activeMonthlyRoll\?\.id!==previousRollId\)\{[\s\S]*?state\.geoBookingEdit=false/);
 assert.match(app,/state\.geoLookup=geoLookupAfterRefresh\(\{rollId:activeMonthlyRoll\.id,/);
 assert.match(app,/\(state\.geoLookup==='pending'\|\|state\.geoLookup==='error'\)/);
});

test('LR-SURPRISE-001 manual venue changes never inherit unrelated Geoapify booking links',()=>{
 const place={...venue,booking_url:'https://cafe.test/reserver',
  menu_url:'https://cafe.test/menu',photo_url:'https://cafe.test/photo.png'};
 const links={p_booking_url:'https://cafe.test/reserver',p_menu_url:'https://cafe.test/menu',
  p_photo_url:'https://cafe.test/photo.png'};
 assert.deepEqual(trustedBookingVenueLinks(place,{title:'Café du centre',address:'Rue Exemple'}),links);
 assert.deepEqual(trustedBookingVenueLinks(place,{title:' café DU centre ',address:' Rue   Exemple '}),links);
 for(const proposed of [{title:'Un autre café',address:'Rue Exemple'},
  {title:'Café du centre',address:'Une autre rue'},{title:'',address:'Rue Exemple'}]){
  assert.deepEqual(trustedBookingVenueLinks(place,proposed),
   {p_booking_url:null,p_menu_url:null,p_photo_url:null});
 }
 for(const invalid of [{state:'pending'},{place_id:null},{driving_meters:null},
  {driving_meters:-3}]){
  assert.equal(trustedBookingVenueLinks({...place,...invalid},
   {title:'Café du centre',address:'Rue Exemple'}).p_booking_url,null);
 }
 assert.deepEqual(trustedBookingVenueLinks({...place,booking_url:'javascript:alert(1)',
  menu_url:'https://login:secret@cafe.test/menu',photo_url:'http://cafe.test/photo'},
  {title:'Café du centre',address:'Rue Exemple'}),
  {p_booking_url:null,p_menu_url:null,p_photo_url:null});
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const save=app.slice(app.indexOf("if(verb==='geo-booking-save')"),
  app.indexOf("if(verb==='geo-booking-cancel')"));
 assert.match(save,/\.\.\.trustedBookingVenueLinks\(state\.geoVenue,\{title,address\}\)/);
 assert.doesNotMatch(save,/p_booking_url:state\.geoVenue\?\.booking_url/);
});

test('LR-SURPRISE-001 confirms the actual reserved venue, not just a suggested POI',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,
  reservation:{status:'confirmed',venue_name:'Autre café',
   venue_address:'125 rue du Port',reserved_for:'2026-11-21T19:00:00Z'}});
 assert.match(html,/class="surprise-geo-reserved-place">Autre café<\/span>/);
 assert.match(html,/125 rue du Port/);
 assert.match(html,/Café du centre/);
 const unsafe=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,
  reservation:{status:'confirmed',venue_name:'<img src=x onerror=alert(1)>',
   venue_address:'<script>bad<\/script>',reserved_for:'2026-11-21T19:00:00Z'}});
 assert.doesNotMatch(unsafe,/<script>|<img src=x/);
 assert.match(unsafe,/&lt;img src=x/);
});


test('LR-SURPRISE-001: outages are distinct from a real empty result and offer a manual retry',()=>{
 const exhausted=monthlyGeoCardHtml({enabled:true,lookup:'retry_exhausted'});
 assert.match(exhausted,/plusieurs erreurs/);
 assert.match(exhausted,/après 15 minutes/);
 assert.match(exhausted,/data-action="geo-retry"/);
 assert.doesNotMatch(exhausted,/Aucun établissement avec trajet routier/);
 assert.match(monthlyGeoCardHtml({enabled:true,lookup:'unavailable'}),/Aucun établissement/);
 assert.equal(geoLookupAfterRefresh({rollId:'r1',previousRollId:'r1',previousLookup:'retry_exhausted'}),'retry_exhausted');
 assert.equal(geoLookupAfterRefresh({rollId:'r2',previousRollId:'r1',previousLookup:'retry_exhausted'}),'idle');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const manual=app.slice(app.indexOf("if(verb==='geo-retry')"),app.indexOf("if(verb==='geo-booking-editor')"));
 assert.match(manual,/geoManualRetryRollId=rollId/);
 assert.match(manual,/void resolveMonthlyGeo\(\)/);
 assert.match(app,/retry:manual/);
});

test('Geoapify and OpenStreetMap attribution links are explicit and safe',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue});
 assert.match(html,/href="https:\/\/www\.geoapify\.com\/"/);
 assert.match(html,/href="https:\/\/www\.openstreetmap\.org\/copyright"/);
 assert.match(html,/rel="noopener noreferrer"/);
});


test('booking remains accessible when local Geoapify discovery is disabled',()=>{
 const reservation={status:'confirmed',venue_name:'Choix du couple',
  venue_address:'Adresse conservée',reserved_for:'2026-12-05T19:00:00Z'};
 const hidden=monthlyGeoCardHtml({enabled:false,venue});
 assert.equal(hidden,'','No automatic discovery without opt-in or saved booking');
 const kept=monthlyGeoCardHtml({enabled:false,venue,reservation,canReserve:true,editing:true});
 assert.match(kept,/La recherche locale est désactivée/);
 assert.match(kept,/Choix du couple/);
 assert.match(kept,/Adresse conservée/);
 assert.match(kept,/geo-booking-date/);
 assert.doesNotMatch(kept,/surprise-geo-venue-info/);
 assert.doesNotMatch(kept,/data-action="geo-retry"/);
 const other=monthlyGeoCardHtml({enabled:false,venue,reservation,canReserve:false});
 assert.match(other,/Choix du couple/);
 assert.doesNotMatch(other,/data-action="geo-booking-editor"/);
 assert.equal(monthlyGeoCardHtml({enabled:false,reservation:{status:'cancelled'}}),'');
});
