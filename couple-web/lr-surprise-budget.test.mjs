import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSurpriseBudget,formatSharedBudget,worldwideSettingsHtml} from './world-preferences.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');

test('budget empty is null, zero is a genuine free-activity cap',()=>{
 assert.equal(parseSurpriseBudget(''),null);
 assert.equal(parseSurpriseBudget('  '),null);
 assert.equal(parseSurpriseBudget(undefined),null);
 assert.equal(parseSurpriseBudget('0'),0);
 assert.equal(parseSurpriseBudget('0,00'),0);
 assert.equal(parseSurpriseBudget('300,50'),300.5);
 assert.equal(parseSurpriseBudget('300.50'),300.5);
 assert.equal(formatSharedBudget(null,'CAD'),'');
});

test('invalid budgets are not converted silently into zero or infinity',()=>{
 for(const input of ['-1','-0.01','Infinity','NaN','abc','3,456','1e5','0.001','99999999999','1.2.3'])
  assert.throws(()=>parseSurpriseBudget(input),/Budget invalide/);
 assert.equal(formatSharedBudget(300,'CAD','fr-CA')?.includes('300'),true);
});

test('shared budget setting is accessible and keeps the original currency',()=>{
 const empty=worldwideSettingsHtml({locale:'fr-CA',currency:'CAD',couple:{surprise_budget_max:null}});
 assert.match(empty,/Tous les budgets/);
 assert.match(empty,/id="world-budget"/);
 assert.match(empty,/data-action="save-world-budget"/);
 const filled=worldwideSettingsHtml({locale:'fr-CA',currency:'EUR',
  couple:{surprise_budget_max:300.5,surprise_budget_currency:'CAD'}});
 assert.match(filled,/value="300.5"/);
 assert.match(filled,/id="world-budget-currency"/);
 assert.match(filled,/option value="CAD" selected/);
 assert.doesNotMatch(filled,/value="300.5"[^>]+onerror=/);
 const escaped=worldwideSettingsHtml({couple:{surprise_budget_max:'<img onerror=alert(1)>'}});
 assert.doesNotMatch(escaped,/<img onerror/);
});

test('Surprise does not claim a provider venue is within a capped budget',()=>{
 const base={monthly:{monthly_activity:{face:7}},showActivity:true,
  activity:{title:'Sortie thermale',prix_hiver_min:200,prix_hiver_max:400,
   description:'Une expérience à deux.'},budgetCurrency:'CAD',now:new Date('2026-11-02T12:00:00Z')};
 const over=premiumSurpriseHtml({...base,budgetMax:0,geoEnabled:true,
  geoVenue:{state:'ready',place_id:'fake',name:'Spa',driving_meters:5000,latitude:45,longitude:-73}});
 assert.match(over,/Budget du duo/);
 assert.match(over,/dépasse votre plafond/);
 assert.match(over,/tarif confirmé/); // Never confuse catalogue estimate with provider pricing.
 const capped=premiumSurpriseHtml({...base,budgetMax:300});
 assert.match(capped,/Vérifiez le prix avant de réserver/);
 const open=premiumSurpriseHtml({...base,budgetMax:null});
 assert.match(open,/Tous les budgets/);
 assert.match(open,/Aucun plafond de dépenses choisi/);
});

test('budget RPC and schema guard duo membership and do not change dice rolls',()=>{
 const sql=read('migrations/20261102_lr_surprise_optional_budget.sql');
 const app=read('app.js');
 assert.match(sql,/surprise_budget_max numeric\(12,2\) NULL/);
 assert.match(sql,/save_love_surprise_budget/);
 assert.match(sql,/m\.couple_id=p_couple AND m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.save_love_surprise_budget/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.save_love_surprise_budget/);
 assert.match(app,/if\(verb==='save-world-budget'\)/);
 assert.match(app,/p_budget:amount,p_currency:currency/);
 assert.match(app,/budgetMax:state\.couple\?\.surprise_budget_max\?\?null/);
});
