import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlyGeoCardHtml} from './monthly-geo-ui.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const venue={state:'ready',place_id:'poi-123',name:'Complexe de loisirs',
 driving_meters:17000,latitude:46.8,longitude:-71.2,address:'Québec'};

test('venue discovery is not a promise that the D100 activity is offered',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,editing:true,
  experienceTitle:'Mini-golf'});
 assert.match(html,/Activité tirée : Mini-golf/);
 assert.match(html,/Confirmez auprès du lieu qu’il offre cette activité précise/);
 assert.match(html,/id="geo-booking-activity-ack"/);
 assert.match(html,/Requis pour confirmer une réservation/);
 assert.doesNotMatch(html,/id="geo-booking-activity-ack"[^>]* checked/);
});

test('draft planning stays possible, but confirmed reservation needs the host attestation',()=>{
 const begin=app.indexOf("if(verb==='geo-booking-save')");
 const end=app.indexOf("if(verb==='geo-booking-cancel')",begin);
 assert.ok(begin>0&&end>begin);
 const booking=app.slice(begin,end);
 assert.match(booking,/monthlyActivityForRoll\(state\.monthly\?\.monthly_activity\)\?\.title/);
 assert.match(booking,/id\('geo-booking-activity-ack'\)/);
 assert.match(booking,/if\(confirmed&&officialActivityTitle&&!activityAcknowledged\)/);
 assert.match(booking,/Activité vérifiée auprès du lieu \(déclaration de la personne qui invite\)/);
 assert.match(booking,/!baseWithBudget\.includes\(activityNote\)/);
 assert.match(booking,/p_notes:notes,p_confirmed:confirmed/);
 assert.doesNotMatch(booking,/roll_couple_once|confirmPaymentByProvider/);
});

test('adapting the activity remains possible and labels do not fabricate evidence',()=>{
 const html=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,
  editing:true,adapting:true,experienceTitle:'Mini-golf'});
 assert.match(html,/id="geo-adapt-reason"/);
 assert.match(html,/ou la variante que nous avons choisie/);
 assert.match(html,/Ce lieu est choisi par vous, et non vérifié par Geoapify/);
 const escaped=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,
  experienceTitle:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(escaped,/<img src=x/);
 assert.match(escaped,/&lt;img src=x/);
});
