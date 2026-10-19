import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MONTHLY_ACTIVITIES,editableMonthlyActivities,monthlyActivityForRoll} from './monthly-activities.mjs';
import {buildMonthlyLibrary,validateMonthlyLibrary} from './json-libraries.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const members=[{user_id:'a',name:'Camille'},{user_id:'b',name:'Alex'}];
const makeRoll=card=>({
 id:'official',face:card.face,activity_title:card.title,
 activity_description:card.description,activity_is_restaurant:card.is_restaurant,
 activity_region:card.region,activity_location:card.location,activity_budget:card.budget,
 activity_hiver:card.hiver,activity_ete:card.ete,
 activity_distance_km_est:card.distance_km_est,
 activity_prix_hiver_min:card.prix_hiver_min,activity_prix_hiver_max:card.prix_hiver_max,
 activity_prix_ete_min:card.prix_ete_min,activity_prix_ete_max:card.prix_ete_max,
 activity_hotel_inclus:card.hotel_inclus,activity_budget_note:card.budget_note
});
test('100 unique complete seasonal outing cards, with plausible CAD couple estimates',()=>{
 assert.equal(MONTHLY_ACTIVITIES.length,100);
 assert.deepEqual(MONTHLY_ACTIVITIES.map(c=>c.face),Array.from({length:100},(_,i)=>i+1));
 for(const c of MONTHLY_ACTIVITIES){
  for(const field of ['title','region','location','hiver','ete','budget_note'])
   assert.ok(typeof c[field]==='string'&&c[field].trim(),c.face+' '+field);
  for(const season of ['hiver','ete']){
   const low=c['prix_'+season+'_min'],high=c['prix_'+season+'_max'];
   assert.ok(Number.isInteger(low)&&Number.isInteger(high)&&low>=0&&high>=low,c.face+' '+season);
  }
  assert.ok(Number.isInteger(c.distance_km_est)&&c.distance_km_est>=0);
  if(c.distance_km_est>=200)assert.equal(c.hotel_inclus,true,'Nuitée requise >200 km : '+c.face);
 }
 assert.equal(MONTHLY_ACTIVITIES[45].title,"Tournée vinicole et cidre d'ici");
 assert.equal(MONTHLY_ACTIVITIES[65].face,66);
 assert.equal(editableMonthlyActivities([]).length,100);
 assert.equal(validateMonthlyLibrary(buildMonthlyLibrary()).activities.length,100);
});
test('D100 is shown on Surprise; duo price and hotel are seasonal',()=>{
 const c=MONTHLY_ACTIVITIES[40],roll=makeRoll(c);
 const activity=monthlyActivityForRoll(roll);
 const initial=premiumSurpriseHtml({members,monthly:{},now:new Date('2026-10-18T12:00:00-04:00')});
 assert.match(initial,/data-dice-sides="100"/);
 assert.doesNotMatch(initial,/data-dice-sides="20"/);
 const summer=premiumSurpriseHtml({members,monthly:{monthly_activity:roll},activity,season:'ete',showActivity:true});
 assert.match(summer,/data-action="surprise-season:ete"/);
 assert.match(summer,/550 à 980 \$ CA/);
 assert.match(summer,/une nuit d(?:&#39;|.)hôtel inclus/i);
 assert.match(summer,/Baie-Sainte-Catherine/);
 const winter=premiumSurpriseHtml({members,monthly:{monthly_activity:roll},activity,season:'hiver',showActivity:true});
 assert.match(winter,/280 à 540 \$ CA/);
 assert.match(winter,/data-action="surprise-season:hiver"/);
 assert.equal((winter.match(/data-dice-sides="100"/g)||[]).length,1);
});
test('Historical monthly results retain their previous text, without new place or budget',()=>{
 const old=monthlyActivityForRoll({face:11,activity_title:'Notre ancienne sortie',activity_description:'Souvenir conservé du tirage original'});
 assert.equal(old.title,'Notre ancienne sortie');
 assert.equal(old.description,'Souvenir conservé du tirage original');
 assert.equal(old.region,undefined);
 assert.equal(old.prix_hiver_min,undefined);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/monthly_activity'&&confirmedFace>100/);
 assert.match(app,/surprise-season/);
});
