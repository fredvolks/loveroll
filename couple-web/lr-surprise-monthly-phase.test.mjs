import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlySurprisePhase} from './monthly-surprise-phase.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';

const monthly={monthly_activity:{id:'monthly-1',face:42},monthly_host:{face:2}};
const render=(options={})=>premiumSurpriseHtml({monthly,activity:{title:'Sortie à deux'},...options});

test('monthly official state transitions are honest about outside booking',()=>{
 assert.equal(monthlySurprisePhase().label,'À découvrir');
 assert.equal(monthlySurprisePhase({monthly:{monthly_activity:monthly.monthly_activity}}).key,'host');
 assert.equal(monthlySurprisePhase({monthly}).label,'À planifier');
 assert.equal(monthlySurprisePhase({monthly,datePlan:{status:'proposed'}}).label,'Date à confirmer');
 assert.equal(monthlySurprisePhase({monthly,datePlan:{status:'agreed'}}).label,'Date convenue');
 assert.equal(monthlySurprisePhase({monthly,reservation:{status:'planned'}}).label,'Prévu · à confirmer');
 assert.equal(monthlySurprisePhase({monthly,reservation:{status:'confirmed'}}).label,'Réservé à l’extérieur');
 assert.equal(monthlySurprisePhase({monthly,reservation:{status:'cancelled'}}).label,'À planifier');
 assert.equal(monthlySurprisePhase({monthly,completion:{roll_id:'monthly-1'}}).label,'Réalisé');
 assert.equal(monthlySurprisePhase({monthly,completion:{roll_id:'another-month'}}).label,'À planifier');
});

test('main Surprise action remains a single real D100 or activity-open control',()=>{
 const before=premiumSurpriseHtml({monthly:{}});
 assert.match(before,/data-action="roll:monthly_activity"/);
 assert.match(before,/À découvrir/);
 const current=render({reservation:{status:'planned'}});
 assert.match(current,/data-action="surprise-activity">Voir notre rendez-vous</);
 assert.match(current,/Prévu · à confirmer/);
 assert.doesNotMatch(current,/data-action="roll:monthly_activity"/);
 const completed=render({completion:{roll_id:'monthly-1'}});
 assert.match(completed,/Revoir notre souvenir/);
 assert.match(completed,/Réalisé/);
 assert.doesNotMatch(completed,/data-action="roll:monthly_activity"/);
});

test('a partner proposal cannot masquerade as confirmed reservation in the primary view',()=>{
 const html=render({datePlan:{status:'proposed',proposed_by:'A'}});
 assert.match(html,/Date à confirmer/);
 assert.doesNotMatch(html,/Réservé à l’extérieur/);
 const booked=render({datePlan:{status:'proposed'},reservation:{status:'confirmed'}});
 assert.match(booked,/Réservé à l’extérieur/);
});

test('mobile stage keeps official action, shows status and accessible edit control',()=>{
 const html=render({travelRadiusKm:null,budgetMax:null,travelOriginLabel:'Québec'});
 assert.match(html,/class="surprise-month-phase" role="status"/);
 assert.match(html,/Toutes les distances/);
 assert.match(html,/Tous les budgets/);
 assert.match(html,/data-action="settings-page:monde"/);
 const fit=readFileSync(new URL('./surprise-minimal.mjs',import.meta.url),'utf8');
 assert.match(fit,/for\(const element of \[\.\.\.controls\.children\]\)if\(element!==mainButton\)status\.append\(element\)/);
});
