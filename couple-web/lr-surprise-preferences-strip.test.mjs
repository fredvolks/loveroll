import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');

test('before D100, the duo can see both genuinely optional limits and edit them',()=>{
 const html=premiumSurpriseHtml({monthly:{},travelRadiusKm:null,budgetMax:null,
  travelOriginLabel:'',currency:'CAD'});
 assert.match(html,/Nos limites de sortie/);
 assert.match(html,/Départ à définir/);
 assert.match(html,/Toutes les distances/);
 assert.match(html,/Tous les budgets/);
 assert.match(html,/data-action="settings-page:monde"/);
 assert.match(html,/data-action="roll:monthly_activity"/);
});

test('the compact summary uses the saved couple limits without defaulting to luxury',()=>{
 const html=premiumSurpriseHtml({
  monthly:{monthly_activity:{face:4},monthly_host:{face:2}},
  travelOriginLabel:'Québec',travelRadiusKm:75,
  budgetMax:0,budgetCurrency:'CAD',showActivity:false
 });
 assert.match(html,/Départ : Québec/);
 assert.match(html,/75 km aller/);
 assert.match(html,/0[^<]{0,30}\$/);
 assert.match(html,/data-action="surprise-activity"/);
 assert.doesNotMatch(html,/All in|Sans limite de dépenses/);
});

test('starting area comes only from stored data, is HTML-escaped and is not a geolocation request',()=>{
 const html=premiumSurpriseHtml({travelOriginLabel:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
 assert.doesNotMatch(html,/navigator\.geolocation/);
 const app=read('app.js');
 assert.match(app,/travelRadiusKm:state\.couple\?\.travel_radius_km\?\?null/);
 assert.match(app,/travelOriginLabel:state\.couple\?\.travel_origin_label\|\|''/);
});

test('the approved D100/D6 surfaces remain the only official draws',()=>{
 const html=premiumSurpriseHtml({monthly:{monthly_activity:{face:3}}});
 assert.match(html,/data-dice-sides="6"/);
 assert.doesNotMatch(html,/data-action="roll:monthly_activity"/);
 const sheet=read('monthly-geo-ui.css');
 assert.match(sheet,/surprise-preferences-compact/);
 assert.match(sheet,/var\(--ritual-muted\)/);
 assert.match(sheet,/min-height:44px/);
});
