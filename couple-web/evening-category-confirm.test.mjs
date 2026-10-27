import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {categoryConfirmOdds,categoryConfirmEnabled,saveCategoryConfirmLocal,eveningCategoryConfirmMarkup} from './evening-category-confirm.mjs';

const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const migration=readFileSync(new URL('./migrations/20261026_evening_category_confirmation.sql',import.meta.url),'utf8');

test('LR-014: probabilities reflect chosen category and active setting',()=>{
 assert.deepEqual(categoryConfirmOdds('SENSUEL',88),{sensuel:88,sexuel:12});
 assert.deepEqual(categoryConfirmOdds('SEXUEL',88),{sensuel:12,sexuel:88});
 assert.deepEqual(categoryConfirmOdds('HASARD',88),{sensuel:50,sexuel:50});
 assert.deepEqual(categoryConfirmOdds('SEXUEL',50),{sensuel:50,sexuel:50});
 assert.throws(()=>categoryConfirmOdds('INVALID'),/Catégorie invalide/);
 assert.match(eveningCategoryConfirmMarkup('HASARD',88),/Catégorie : <strong>Au hasard<\/strong>/);
 assert.match(eveningCategoryConfirmMarkup('SEXUEL',88),/Sensuel 12 % · Sexuel 88 %/);
});
test('LR-014: default on, per-user persistence and server preference precedence',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(categoryConfirmEnabled({},'user-a',storage),true);
 assert.equal(saveCategoryConfirmLocal('user-a',false,storage),true);
 assert.equal(categoryConfirmEnabled({},'user-a',storage),false);
 assert.equal(categoryConfirmEnabled({},'user-b',storage),true);
 assert.equal(categoryConfirmEnabled({confirm_evening_category:true},'user-a',storage),true);
 assert.equal(categoryConfirmEnabled({confirm_evening_category:false},'user-b',storage),false);
});
test('LR-014: the existing server draw is only reached after confirmation',()=>{
 const trigger=source.slice(source.indexOf("if(verb==='new-challenge'){"),source.indexOf("if(verb==='answer'){"));
 assert.ok(trigger.indexOf("askEveningCategoryConfirmation(")>0);
 assert.ok(trigger.indexOf("if(!answer.confirmed)return;")<trigger.indexOf("animateRoll("));
 assert.ok(trigger.indexOf("state.category!==selectedCategory")<trigger.indexOf("animateRoll("));
 assert.match(trigger,/rpc\('draw_for_partner_random'/);
 assert.match(trigger,/rpc\('draw_for_partner'/);
 assert.match(trigger,/if\(disableReminder\)/);
 assert.match(source,/if\(verb==='evening-confirm-pref-toggle'\)/);
 assert.match(trigger,/eveningCategoryConfirmInFlight=true/);
 assert.match(trigger,/finally\{eveningCategoryConfirmInFlight=false;\}/);
 assert.match(source,/id\('evening-category-confirm-pref'\)\?\.checked/);
 assert.match(source,/function backFromLoveRoll\(\)\{[\s\S]{0,170}lr-evening-category-dialog/);
 assert.match(html,/evening-category-confirm\.css/);
 assert.match(migration,/ADD COLUMN IF NOT EXISTS confirm_evening_category boolean NOT NULL DEFAULT true/);
});
