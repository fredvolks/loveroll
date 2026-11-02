import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boundedSearchRadii} from '../supabase/functions/love-geo-surprise/retry-policy.mjs';
import {parseTravelRadius,normalizeSharedTravel,worldwideSettingsHtml} from './world-preferences.mjs';

test('blank distance stays null from form through normalization',()=>{
 assert.equal(parseTravelRadius(''),null);
 assert.equal(parseTravelRadius(null),null);
 assert.equal(parseTravelRadius(undefined),null);
 assert.equal(normalizeSharedTravel({travel_radius_km:null}).travel_radius_km,null);
 assert.equal(normalizeSharedTravel({travel_radius_km:''}).travel_radius_km,null);
 const html=worldwideSettingsHtml({locale:'fr-CA',couple:{travel_radius_km:null}});
 assert.match(html,/option value="" selected>Toutes les distances<\/option>/);
 assert.match(html,/id="world-radius"/);
 assert.match(worldwideSettingsHtml({locale:'fr-CA',couple:{travel_radius_km:75}}),/value="75" selected>75 km/);
});

test('a user distance is bounded and validated without confusing zero with empty',()=>{
 assert.equal(parseTravelRadius('75'),75);
 assert.equal(parseTravelRadius('500'),500);
 for(const invalid of ['0','1','501','7.5','bad','Infinity'])assert.throws(()=>parseTravelRadius(invalid),/Distance invalide/);
 assert.deepEqual(boundedSearchRadii(75,500),[75]);
 assert.deepEqual(boundedSearchRadii(500,500),[500]);
 assert.deepEqual(boundedSearchRadii(501,500),[]);
 assert.deepEqual(boundedSearchRadii(0,500),[]);
});

test('no chosen distance triggers at most three finite progressive searches',()=>{
 assert.deepEqual(boundedSearchRadii(null,500),[50,150,500]);
 assert.deepEqual(boundedSearchRadii(undefined,200),[50,150,200]);
 assert.deepEqual(boundedSearchRadii(null,20),[20]);
 assert.deepEqual(boundedSearchRadii(null,0),[]);
 assert.deepEqual(boundedSearchRadii(null,999999),[]);
});

test('server consumes bounded radii and verifies driving metres, not straight-line distance',()=>{
 const edge=readFileSync(new URL('../supabase/functions/love-geo-surprise/index.ts',import.meta.url),'utf8');
 assert.match(edge,/boundedSearchRadii\(settings\.travel_radius_km,Number\(policy\.geo_max_radius_km\)\)/);
 assert.match(edge,/for\(const searchRadius of searchRadii\)/);
 assert.match(edge,/filter:'circle:'\+origin\.lon/);
 assert.match(edge,/const roadCapKm=settings\.travel_radius_km===null\?/);
 assert.match(edge,/verifiedMatrixCandidates\(candidates,matrix,roadCapKm\)/);
 assert.match(edge,/searched_radius_km:searchedRadiusKm/);
});

test('SQL maintains the existing RPC signature and couple authorization',()=>{
 const migration=readFileSync(new URL('./migrations/20261102_lr_surprise_optional_radius.sql',import.meta.url),'utf8');
 assert.match(migration,/ALTER COLUMN travel_radius_km DROP NOT NULL/);
 assert.match(migration,/ALTER COLUMN travel_radius_km DROP DEFAULT/);
 assert.match(migration,/CREATE OR REPLACE FUNCTION public\.save_love_travel_preferences/);
 assert.match(migration,/m\.couple_id=p_couple AND m\.user_id=auth\.uid\(\)/);
 assert.match(migration,/p_radius IS NOT NULL/);
});
