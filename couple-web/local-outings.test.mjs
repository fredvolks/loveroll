import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MONTHLY_ACTIVITIES} from './monthly-activities.mjs';
import {activityCategory,VENUE_CATEGORIES,chooseNearbyVenue,localActivityResult,isRouteWithinRadius} from './local-outings.mjs';
test('All 100 monthly activity themes can map to a supported places category',()=>{
 assert.equal(MONTHLY_ACTIVITIES.length,100);
 for(const activity of MONTHLY_ACTIVITIES){
  assert.ok(VENUE_CATEGORIES[activityCategory(activity)],'Unrecognized card '+activity.id);
 }
 assert.equal(activityCategory({title:'Détente au spa'}),'spa');
 assert.equal(activityCategory({title:'Brunch romantique'}),'restaurant');
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
