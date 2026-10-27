import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
const owner=readFileSync(new URL('./platform-admin.js',import.meta.url),'utf8');
const qa=readFileSync(new URL('./eclat-v2-qa-workbench.mjs',import.meta.url),'utf8');
const publicApp=readFileSync(new URL('./app.js',import.meta.url),'utf8');
test('QA lab is inside owner Studio, not nested in the configuration form',()=>{
 const panel=page.indexOf('<section data-panel="eclat-qa"');
 assert.ok(panel>=0);
 assert.ok(panel<page.indexOf('<form id="settings"'));
 assert.match(page,/data-eclat-qa-form="A"/);
 assert.match(page,/data-eclat-qa-form="B"/);
 assert.match(page,/data-eclat-qa="stage-A"/);
 assert.match(page,/data-eclat-qa="stage-B"/);
 for(const cmd of ['connect','disconnect','start','resume','refresh'])
  assert.ok(page.includes('data-eclat-qa-action="'+cmd+'"'));
});
test('only verified platform owner enters QA and logout destroys the lab',()=>{
 const read=owner.indexOf("rpc('love_platform_admin_read')");
 const dashboard=owner.indexOf("$('dashboard').hidden=false");
 assert.ok(read>0&&dashboard>read);
 assert.match(owner,/if\(name==='eclat-qa'&&data&&!qaWorkbench\)/);
 assert.match(owner,/qaWorkbench\?\.destroy\(\)/);
 assert.match(owner,/productionUrl:CONFIG\.supabaseUrl/);
});
test('V1 never mounts QA modules or its private player test screen',()=>{
 assert.doesNotMatch(publicApp,/eclat-v2-qa-workbench|eclat-v2-admin-pair/);
 assert.doesNotMatch(publicApp,/eclat-v2-play-controller/);
 assert.match(qa,/validateEclatQaConfig/);
 assert.match(qa,/createEclatV2PlayController/);
});
test('QA cannot use production URL or secret/admin keys',()=>{
 assert.match(qa,/requested\.hostname===production\.hostname/);
 assert.match(qa,/PUBLISHABLE\.test/);
 assert.match(qa,/persistSession:false/);
 assert.match(qa,/detectSessionInUrl:false/);
 assert.match(qa,/validateEclatQaPair/);
});
