import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedRoadSeconds} from '../supabase/functions/love-geo-surprise/verified-road.mjs';
import {verifiedDriveTimeLabel,monthlyGeoCardHtml} from './monthly-geo-ui.mjs';

const base={enabled:true,venue:{
 state:'ready',place_id:'geo-venue',name:'Café',
 latitude:46.8,longitude:-71.2,driving_meters:16200
}};

test('Geoapify matrix travel times are seconds, not minutes, and are bounded',()=>{
 assert.equal(verifiedRoadSeconds(0),0);
 assert.equal(verifiedRoadSeconds(1320),1320);
 assert.equal(verifiedRoadSeconds('3600'),3600);
 assert.equal(verifiedRoadSeconds(86400),86400);
 for(const value of [null,undefined,'',false,true,NaN,'unknown',-1,86401,Infinity])
  assert.equal(verifiedRoadSeconds(value),null);
});

test('labels preserve 0 and present longer trips honestly, never claiming live traffic',()=>{
 assert.equal(verifiedDriveTimeLabel(0),'moins d’une minute');
 assert.equal(verifiedDriveTimeLabel(1320),'22 min');
 assert.equal(verifiedDriveTimeLabel(3660),'1 h 1 min');
 assert.equal(verifiedDriveTimeLabel(7200),'2 h');
 for(const value of [null,undefined,'',false,-4,'not-available',86401])
  assert.equal(verifiedDriveTimeLabel(value),null);
 const valid=monthlyGeoCardHtml({...base,venue:{...base.venue,driving_seconds:1320}});
 assert.match(valid,/16,2 km par la route/);
 assert.match(valid,/Environ 22 min en voiture/);
 assert.match(valid,/hors trafic en temps réel/);
 const zero=monthlyGeoCardHtml({...base,venue:{...base.venue,driving_seconds:0}});
 assert.match(zero,/moins d’une minute en voiture/);
 const unknown=monthlyGeoCardHtml({...base,venue:{...base.venue,driving_seconds:null}});
 assert.match(unknown,/16,2 km par la route/);
 assert.doesNotMatch(unknown,/Environ .*en voiture/);
});

test('missing road distance prevents displaying even a known duration',()=>{
 const html=monthlyGeoCardHtml({...base,venue:{
  ...base.venue,driving_meters:null,driving_seconds:1200
 }});
 assert.doesNotMatch(html,/surprise-geo-venue-info/);
 assert.doesNotMatch(html,/20 min en voiture/);
});

test('time comes from the same selected Geoapify matrix route and remains nullable',()=>{
 const edge=readFileSync(new URL('../supabase/functions/love-geo-surprise/index.ts',import.meta.url),'utf8');
 const sql=readFileSync(new URL('./migrations/20261102_lr_surprise_geo_retry_budget.sql',import.meta.url),'utf8');
 assert.match(edge,/chosenIndex=candidates\.findIndex\(p=>p\.place_id===selected\.p\.place_id\)/);
 assert.match(edge,/verifiedRoadSeconds\(matrix\[chosenIndex\]\?\.time\)/);
 assert.match(edge,/driving_seconds:selectedDrivingSeconds/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS driving_seconds integer NULL/);
 assert.doesNotMatch(edge,/driving_seconds:\s*0\s*[,}]/);
});
