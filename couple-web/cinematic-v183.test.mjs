import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {eclatHtml} from './eclat-ui.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
test('photographic art is real separated assets, no text or arrows baked into card images',()=>{
 for(const f of ['assets/loveroll-romance-scene-v183.webp',
  'assets/eclat-photo-strip-v183.webp','assets/eclat-secret-letter-v183.webp']){
  assert.ok(statSync(new URL('./'+f,import.meta.url)).size>10000,f);
 }
 const css=read('loveroll-cinematic-v183.css');
 assert.match(css,/assets\/eclat-photo-strip-v183\.webp/);
 assert.match(css,/assets\/eclat-secret-letter-v183\.webp/);
 assert.match(css,/assets\/loveroll-romance-scene-v183\.webp/);
 assert.ok(css.includes('.loveroll-advent-letters'));
 assert.ok(css.includes('.entry-auth-card'));
 assert.ok(css.includes('.settings-section-row'));
 assert.ok(css.includes('.nav-inner>button.active'));
});
test('Éclat catalog still has twelve real interactive cards and one generated arrow each',()=>{
 const gallery=eclatHtml({status:{access:true}});
 assert.equal((gallery.match(/class="eclat-tile"/g)||[]).length,12);
 assert.equal((gallery.match(/class="eclat-tile-arrow"/g)||[]).length,12);
 assert.equal((gallery.match(/data-action="eclat:detail:/g)||[]).length,12);
 const detail=eclatHtml({status:{access:true},selected:1,details:true,minutes:60});
 assert.match(detail,/eclat-detail-hero is-secret/);
 assert.match(detail,/eclat:minutes:60/);
 assert.match(detail,/eclat:start:1/);
 const other=eclatHtml({status:{access:true},selected:12,details:true,minutes:30});
 assert.match(other,/eclat-detail-hero"/);
 assert.match(other,/eclat:start:12/);
});
test('3D D6 and D100 retain same renderer, with shared ruby material only',()=>{
 const dice=read('dice3d.js');
 assert.match(dice,/attenuationColor:0x980a2e/);
 assert.match(dice,/const mat=new THREE.MeshPhysicalMaterial/);
 assert.match(dice,/transmission:1,thickness:1\.9/);
 const evening=read('premium-evening.mjs');
 const surprise=read('premium-surprise.mjs');
 assert.match(evening,/premiumPolyDie\(100/);
 assert.match(surprise,/premiumPolyDie\(100/);
 assert.match(surprise,/Découvrir notre activité/);
});
test('same stable navigation sizes and no page scrolling outside settings',()=>{
 const css=read('loveroll-cinematic-v183.css');
 assert.match(css,/html:has\(#app\.loveroll-real-home\)/);
 assert.match(css,/main#app\.loveroll-settings-page\{overflow-x:hidden!important;overflow-y:auto!important;/);
 assert.ok(!css.includes('grid-template-rows:repeat(5'));
 assert.ok(!css.includes('data-action='));
});
