import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlyDatePlanHtml} from './monthly-date-plan.mjs';
import {monthlyGeoCardHtml} from './monthly-geo-ui.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const date='2026-12-12T20:00:00Z';

test('D6 host proposes first, partner waits, no external booking or spending',()=>{
 const host=monthlyDatePlanHtml({hostId:'A',me:'A'});
 const guest=monthlyDatePlanHtml({hostId:'A',me:'B'});
 assert.match(host,/data-action="geo-date-propose"/);
 assert.match(host,/id="geo-date-proposal"/);
 assert.doesNotMatch(guest,/data-action="geo-date-propose"/);
 assert.match(guest,/personne désignée par le D6/);
 for(const value of [host,guest])assert.doesNotMatch(value,/Réservation déclarée confirmée/);
});

test('a pending proposal can only be answered by other partner',()=>{
 const plan={status:'proposed',proposed_for:date,proposed_by:'A',version:3};
 const author=monthlyDatePlanHtml({hostId:'A',me:'A',plan});
 const responder=monthlyDatePlanHtml({hostId:'A',me:'B',plan});
 assert.match(author,/En attente de la réponse/);
 assert.doesNotMatch(author,/geo-date-accept|geo-date-counter/);
 assert.match(responder,/data-action="geo-date-accept"/);
 assert.match(responder,/data-action="geo-date-counter"/);
 assert.match(responder,/datetime-local/);
});

test('agreed date explicitly is NOT a confirmed venue booking',()=>{
 const plan={status:'agreed',proposed_for:date,proposed_by:'A',agreed_by:'B',version:4};
 const html=monthlyDatePlanHtml({hostId:'A',me:'B',plan});
 assert.match(html,/Notre date est choisie/);
 assert.match(html,/Cela ne confirme aucune réservation/);
 assert.doesNotMatch(html,/geo-date-accept|geo-date-counter/);
 const screen=premiumSurpriseHtml({
  monthly:{monthly_activity:{face:31},monthly_host:{face:2}},
  members:[{user_id:'A',name:'Alice'},{user_id:'B',name:'Bob'}],
  showActivity:true,geoEnabled:false,activity:{title:'Sortie D100'},
  datePlan:plan,datePlanAvailable:true,viewerId:'B'
 });
 assert.match(screen,/Notre date est choisie/);
 assert.match(screen,/D100 · 31/);
});

test('reservation uses the agreed clock time unless prior reservation overrides it',()=>{
 const venue={state:'ready',place_id:'place1',name:'Café',latitude:46,longitude:-71,driving_meters:1100};
 const fresh=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,editing:true,agreedDate:date});
 assert.match(fresh,/id="geo-booking-date" type="datetime-local" value="[^"]+"/);
 const withBooking=monthlyGeoCardHtml({enabled:true,venue,canReserve:true,editing:true,agreedDate:date,
  reservation:{status:'planned',reserved_for:'2026-12-16T19:00:00Z'}});
 assert.notEqual(fresh,withBooking);
});

test('RPC enforces verified identity, D6 first-host and two-member counter/accept',()=>{
 const sql=read('migrations/20261102_lr_surprise_shared_date_agreement.sql');
 assert.match(sql,/love_require_verified_identity\(\)/);
 assert.match(sql,/couple_private\.is_member\(v_roll\.couple_id\)/);
 assert.match(sql,/SELECT COUNT\(\*\).*?v_count/s);
 assert.match(sql,/v_actor IS DISTINCT FROM v_host/);
 assert.match(sql,/v_actor IS NOT DISTINCT FROM v_plan\.proposed_by/);
 assert.match(sql,/p_expected_version<>v_plan\.version/);
 assert.match(sql,/status='agreed'/);
 assert.match(sql,/status='confirmed'/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.manage_love_monthly_date/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_rolls|INSERT INTO public\.couple_rolls/);
 assert.doesNotMatch(sql,/INSERT INTO public\.love_monthly_reservations/);
});

test('client uses existing RPC and one-at-a-time gate, polling only visible couple screen',()=>{
 const app=read('app.js');
 assert.match(app,/const geoDateMutationGate=createBookingMutationGate\(\)/);
 assert.match(app,/if\(\['geo-date-propose','geo-date-counter','geo-date-accept'\]/);
 assert.match(app,/geoDateMutationGate\(async\(\)=>/);
 assert.match(app,/manage_love_monthly_date/);
 assert.match(app,/p_expected_version:plan\?\.version\?\?null/);
 assert.match(app,/new Date\(state\.geoDatePlan\.proposed_for\)\.getTime\(\)!==date\.getTime\(\)/);
 assert.match(app,/state\.geoDatePlanAvailable/);
 assert.match(app,/!state\.showSurpriseActivity\|\|document\.hidden/);
});


test('new date controls are hidden before the SQL migration is deployed',()=>{
 const base={
  monthly:{monthly_activity:{face:31},monthly_host:{face:2}},
  members:[{user_id:'A',name:'Alice'},{user_id:'B',name:'Bob'}],
  showActivity:true,activity:{title:'Sortie'},
  viewerId:'A'
 };
 const absent=premiumSurpriseHtml({...base,datePlanAvailable:false});
 assert.doesNotMatch(absent,/data-action="geo-date-propose"/);
 const ready=premiumSurpriseHtml({...base,datePlanAvailable:true});
 assert.match(ready,/data-action="geo-date-propose"/);
});
