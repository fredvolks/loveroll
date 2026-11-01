import {test} from 'node:test';
import assert from 'node:assert/strict';
// Run the Surprise venue/UI regressions in the existing required CI suite.
import './monthly-geo-ui.test.mjs';
import {MONTHLY_ACTIVITIES} from './monthly-activities.mjs';
import {activityCategory,VENUE_CATEGORIES,chooseNearbyVenue,localActivityResult,isRouteWithinRadius,verifiedRoadMetres,drivingKilometres} from './local-outings.mjs';
import {verifiedRoadMetres as verifiedEdgeRoadMetres,verifiedMatrixCandidates} from '../supabase/functions/love-geo-surprise/verified-road.mjs';
test('All 100 monthly activity themes can map to a supported places category',()=>{
 assert.equal(MONTHLY_ACTIVITIES.length,100);
 for(const activity of MONTHLY_ACTIVITIES){
  assert.ok(VENUE_CATEGORIES[activityCategory(activity)],'Unrecognized card '+activity.id);
 }
 assert.equal(activityCategory({title:'Détente au spa'}),'spa');
 assert.equal(activityCategory({title:'Détente thermale panoramique'}),'spa',
  'Monthly thermal activities must discover spas, not generic tourist attractions');
 assert.equal(activityCategory({title:'Bains thermaux'}),'spa');
 assert.equal(activityCategory({title:'Découvrir les thermes'}),'spa');
 assert.equal(activityCategory({title:'Brunch romantique'}),'restaurant');
 assert.equal(activityCategory({title:'Restaurant panoramique'}),'restaurant');
 assert.equal(activityCategory({title:'Expérience gastronomique'}),'restaurant');
});
test('Surprise prioritizes the activity title over incidental places mentioned in the description',()=>{
 assert.equal(activityCategory({
  title:'Randonnée au parc',
  description:'Après la marche, un massage au spa puis un brunch au restaurant.'
 }),'nature');
 assert.equal(activityCategory({
  title:'Brunch romantique',
  description:'Une petite balade dans la forêt après le repas.'
 }),'restaurant');
 assert.equal(activityCategory({
  title:'Soirée surprise',
  description:'Visiter un musée puis choisir une exposition.'
 }),'culture','A title without a clear venue still falls back to its description');
 assert.equal(activityCategory({title:'Détente thermale panoramique',description:'Repas après le bain'}),'spa');
});
test('Never use straight-line distance or fabricated names; road radius is strict',()=>{
 const places=[
  {place_id:'one',name:'Spa vérifié',address:'Rue A'},
  {place_id:'two',name:'Spa lointain',address:'Rue B'},
  {place_id:'no-name',name:'',address:'Rue C'}
 ];
 const routes={one:{distance_meters:124900},two:{distance_meters:125900},'no-name':{distance_meters:2000}};
 const p=chooseNearbyVenue(places,routes,125);
 assert.equal(p.name,'Spa vérifié');
 assert.equal(p.distance_km,124.9);
 assert.equal(chooseNearbyVenue(places,{},125),null);
 assert.equal(chooseNearbyVenue(places,routes,50),null);
 assert.equal(isRouteWithinRadius({distance_meters:125900},125),false);
 assert.equal(isRouteWithinRadius({distance_meters:125040},125),false);
 assert.equal(chooseNearbyVenue([{place_id:'boundary',name:'Hors limite'}],{boundary:{distance_meters:125040}},125),null);
 const res=localActivityResult({face:37,title:'Détente'},p,{travel_radius_km:125});
 assert.equal(res.face,37);assert.equal(res.found,true);
 assert.throws(()=>localActivityResult({face:37},p,{travel_radius_km:100}),/radius/);
});

test('LR-SURPRISE-001: null/unreachable Geoapify road distances never count as 0 km',()=>{
 for(const value of [null,undefined,'','  ',false,true,'unknown','Infinity',-4,{},[]]){
  assert.equal(verifiedRoadMetres(value),null);
  assert.equal(drivingKilometres({distance_meters:value}),null);
  assert.equal(isRouteWithinRadius({distance_meters:value},null),false);
  assert.equal(isRouteWithinRadius({distance_meters:value},125),false);
 }
 assert.equal(drivingKilometres(null),null);
 assert.equal(verifiedRoadMetres(0),0);
 assert.equal(verifiedRoadMetres('12345'),12345);
 assert.equal(isRouteWithinRadius({distance_meters:12345},null),true);
 assert.equal(isRouteWithinRadius({distance_meters:12345},undefined),true);
 assert.equal(isRouteWithinRadius({distance_meters:12345},''),false);
 assert.equal(isRouteWithinRadius({distance_meters:12345},0),false);
 const place={place_id:'a',name:'Lieu vérifié'};
 assert.equal(chooseNearbyVenue([place],{a:{distance_meters:null}},null),null);
 const valid=chooseNearbyVenue([place],{a:{distance_meters:225000}},null);
 assert.equal(valid.distance_km,225);
 assert.equal(localActivityResult({face:18},valid,{travel_radius_km:null}).found,true);
 assert.throws(()=>localActivityResult({face:18},{...valid,distance_meters:null},{travel_radius_km:null}),/radius/);
});

test('LR-SURPRISE-001: Edge function rejects null and absent Geoapify road matrix entries',()=>{
 const candidates=[{place_id:'missing'},{place_id:'valid'},{place_id:'blank'},{place_id:'far'}];
 const matrix=[{distance:null},{distance:19500},{distance:''},{distance:60000}];
 assert.equal(verifiedEdgeRoadMetres(null),null);
 assert.equal(verifiedEdgeRoadMetres(''),null);
 assert.equal(verifiedEdgeRoadMetres(0),0);
 assert.deepEqual(verifiedMatrixCandidates(candidates,matrix,50).map(x=>x.p.place_id),['valid']);
 assert.deepEqual(verifiedMatrixCandidates(candidates,matrix,null).map(x=>x.p.place_id),['valid','far']);
 assert.deepEqual(verifiedMatrixCandidates(candidates,undefined,null),[]);
 assert.deepEqual(verifiedMatrixCandidates(candidates,matrix,-5),[]);
});

test('Surprise venue provider accepts real category arrays and trimmed category strings',()=>{
 const places=[
  {place_id:'a',name:'Restaurant A',categories:['tourism','catering.restaurant.french']},
  {place_id:'b',name:'Restaurant B',categories:'tourism, catering.restaurant'},
  {place_id:'c',name:'Autre commerce',categories:'catering.restaurantfake'},
  {place_id:'d',name:'Pas de catégorie',categories:null}
 ];
 const roads={a:{distance_meters:3000},b:{distance_meters:2000},
  c:{distance_meters:1000},d:{distance_meters:500}};
 const category=VENUE_CATEGORIES.restaurant;
 assert.equal(chooseNearbyVenue(places,roads,10,{category}).place_id,'b',
  'A valid category string with whitespace should be eligible and nearest');
 assert.equal(chooseNearbyVenue([places[0]],roads,10,{category}).place_id,'a',
  'Geoapify categories arrays must be accepted');
 assert.equal(chooseNearbyVenue([places[2],places[3]],roads,10,{category}),null,
  'A matching prefix without a category separator is not a valid restaurant');
});
test('Nearby Surprise places are ranked by real metres, not rounded display kilometres',()=>{
 // Both routes round to 12.0 km. The nearer route (12,010m) must win
 // even when the farther place id would sort first alphabetically.
 const places=[{place_id:'a-farther',name:'Vignoble plus loin'},
  {place_id:'z-nearer',name:'Vignoble le plus proche'}];
 const routes={'a-farther':{distance_meters:12045},'z-nearer':{distance_meters:12010}};
 const selected=chooseNearbyVenue(places,routes,15);
 assert.equal(selected.place_id,'z-nearer');
 assert.equal(selected.distance_meters,12010);
 assert.equal(selected.distance_km,12,'Rounded kilometres are presentation only');
 assert.equal(chooseNearbyVenue(places,routes,12),null,
  '12.0 km displayed must never bypass a strict 12,000m couple limit');
});
