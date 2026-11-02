import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weeklySurpriseIdea,weeklySurpriseIdeaHtml} from './weekly-surprise-idea.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';

const source=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');

test('same idea is stable for both partners throughout a Toronto calendar week',()=>{
 const monday=new Date('2026-11-02T14:00:00Z');
 const saturday=new Date('2026-11-07T15:00:00Z');
 assert.deepEqual(weeklySurpriseIdea(monday),weeklySurpriseIdea(saturday));
 assert.deepEqual(weeklySurpriseIdea(monday),weeklySurpriseIdea(monday));
 assert.equal(weeklySurpriseIdea(monday).length,2);
});

test('idea is optional and does not appear before the D100 and D6 are drawn',()=>{
 const now=new Date('2026-11-02T16:00:00Z');
 assert.equal(weeklySurpriseIdeaHtml({revealed:false,now}),'');
 const waiting=premiumSurpriseHtml({monthly:{},showActivity:true,now});
 assert.doesNotMatch(waiting,/Un moment à deux cette semaine/);
 const noHost=premiumSurpriseHtml({monthly:{monthly_activity:{face:42}},showActivity:true,
  activity:{title:'Une sortie'},now});
 assert.doesNotMatch(noHost,/Un moment à deux cette semaine/);
 const both=premiumSurpriseHtml({monthly:{monthly_activity:{face:42},monthly_host:{face:2}},
  showActivity:true,activity:{title:'Une sortie'},now,budgetMax:0});
 assert.match(both,/Un moment à deux cette semaine/);
 assert.match(both,/<details class="surprise-weekly-idea">/);
 assert.doesNotMatch(both,/<details class="surprise-weekly-idea" open/);
});

test('weekly editorial idea does not roll, book, bill or invoke Geoapify',()=>{
 const html=weeklySurpriseIdeaHtml({revealed:true,now:new Date('2026-11-02T16:00:00Z')});
 assert.match(html,/sans réservation/);
 assert.doesNotMatch(html,/data-action="roll:|data-action="geo-|paid_by_host/);
 const module=source('weekly-surprise-idea.mjs');
 assert.doesNotMatch(module,/client\.rpc|client\.functions|fetch\(|localStorage|sessionStorage/);
 assert.match(module,/timeZone:'America\/Toronto'/);
});

test('idea uses a compact accessible affordance aligned with LoveRoll design',()=>{
 const css=source('monthly-geo-ui.css');
 assert.match(css,/\.surprise-weekly-idea>summary/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/var\(--ritual-card\)/);
 assert.match(css,/var\(--ritual-text\)/);
 assert.match(css,/focus-visible/);
});
