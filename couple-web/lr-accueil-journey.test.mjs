import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeEveningStep,homeSurpriseStep} from './home-journey.mjs';
import {premiumHomeHtml} from './premium-home.mjs';

const weekly={face:2,key:'2026-11-02',created_at:'2026-11-02T10:00:00Z'};
const now=new Date('2026-11-04T12:00:00Z');
const session=(id,started_at,finished_at=null,counted=true)=>({
 id,started_at,finished_at,counted
});

test('the official weekly roll is never replayed by Home-to-Soirée navigation',()=>{
 const waiting=homeEveningStep({weekly:null,now});
 assert.equal(waiting.action,'roll:weekly');
 const drawn=homeEveningStep({weekly,now,sessions:[]});
 assert.deepEqual(drawn,{key:'evening',action:'tab:session',label:'Aller à notre soirée',available:2});
 const home=premiumHomeHtml({weekly,now});
 assert.match(home,/data-action="tab:session"/);
 assert.doesNotMatch(home,/data-action="roll:weekly"/);
 assert.doesNotMatch(home,/Déjà brassé cette semaine, revenez la semaine prochaine/);
 assert.match(home,/data-dice-sides="6"/);
});

test('an active Soirée keeps its resume action and does not open a second one',()=>{
 const sessions=[session('ongoing','2026-11-03T18:00:00Z')];
 const active=homeEveningStep({weekly,sessions,activeEvening:true,now});
 assert.equal(active.key,'resume');
 assert.equal(active.action,'resume-evening');
 assert.equal(active.available,1);
 const html=premiumHomeHtml({weekly,sessions,activeEvening:true,now});
 assert.match(html,/data-action="resume-evening"/);
 assert.doesNotMatch(html,/data-action="roll:weekly"/);
});

test('weekly quota spent opens the calendar; uncounted records do not consume quota',()=>{
 const sessions=[
  session('s1','2026-11-02T18:00:00Z','2026-11-02T20:00:00Z'),
  session('s2','2026-11-03T18:00:00Z','2026-11-03T20:00:00Z')
 ];
 const used=homeEveningStep({weekly,sessions,now});
 assert.deepEqual(used,{key:'history',action:'tab:journal',label:'Voir nos soirées',available:0});
 const html=premiumHomeHtml({weekly,sessions,now});
 assert.match(html,/data-action="tab:journal"/);
 assert.match(html,/Voir nos soirées/);
 const partial=homeEveningStep({weekly,sessions:[sessions[0],session(
  'untracked','2026-11-03T10:00:00Z','2026-11-03T11:00:00Z',false
 )],now});
 assert.equal(partial.available,1);
 assert.equal(partial.action,'tab:session');
});

test('daily lock changes availability to start now, not the weekly remaining quota',()=>{
 const sessions=[session('closed-today','2026-11-04T10:00:00Z','2026-11-04T11:00:00Z')];
 const state=homeEveningStep({weekly,sessions,now});
 assert.equal(state.available,1);
 assert.equal(state.key,'evening');
 assert.equal(state.action,'tab:session');
});

test('Surprise month labels follow the official recorded state, never the POI name',()=>{
 const activity={id:'r1',face:23,activity_title:'Mini-golf'};
 assert.equal(homeSurpriseStep({monthly:{}}).key,'discover');
 assert.equal(homeSurpriseStep({monthly:{monthly_activity:activity}}).key,'host');
 const monthly={monthly_activity:activity,monthly_host:{face:2}};
 assert.equal(homeSurpriseStep({monthly}).key,'planning');
 assert.equal(homeSurpriseStep({monthly,reservation:{status:'planned'}}).key,'planned');
 assert.equal(homeSurpriseStep({monthly,reservation:{status:'confirmed'}}).key,'booked');
 assert.equal(homeSurpriseStep({monthly,completed:true}).key,'completed');
 assert.equal(homeSurpriseStep({monthly,reservation:{status:'cancelled'}}).key,'planning');
 const html=premiumHomeHtml({monthly,monthlyActivity:{title:'Mini-golf'},
  monthlyReservation:{status:'confirmed'},now});
 assert.match(html,/Surprise · Réservé à l’extérieur/);
 assert.match(html,/Mini-golf/);
 assert.match(html,/data-action="tab:special"/);
 assert.doesNotMatch(html,/Surprise du mois disponible/);
});

test('Home view keeps headings and statistics grounded in existing data',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/monthlyCompleted:state\.geoCompletion\?\.roll_id===state\.monthly\?\.monthly_activity\?\.id/);
 assert.match(app,/monthlyReservation:state\.geoReservation\|\|null/);
 assert.doesNotMatch(app,/monthlyActivity\.title=state\.geoVenue\.name/);
 const empty=premiumHomeHtml({now});
 assert.match(empty,/Cette semaine, on joue \?/);
 assert.match(empty,/Semaines consécutives/);
 assert.doesNotMatch(empty,/data-action="tab:session"[^>]*disabled/);
});
