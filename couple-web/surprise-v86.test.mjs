import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const app=read('app.js'),index=read('index.html'),css=read('surprise-refined-v104.css');
const state={
 monthly:{monthly_activity:{face:11},monthly_host:{face:2}},
 activity:{title:'Massage surprise',description:'Prenez un moment ensemble.',timer_minutes:10},
 members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Marie'}],
 showActivity:true,timerHtml:'<div class="timer">10:00</div>'
};
test('Confirmed D100 opens the activity modal after the official roll animation',()=>{
 const start=app.indexOf("const result=await animateRoll(()=>rpc('roll_couple_once'");
 const branch=app.slice(start,start+800);
 assert.match(branch,/kind==='monthly_activity'/);
 assert.match(branch,/state\.showSurpriseActivity=!!state\.monthly\?\.monthly_activity/);
 assert.match(branch,/render\(\)/);
 assert.doesNotMatch(branch,/notify\('♡ Le dé s’est arrêté sur le résultat officiel/);
 assert.match(app,/if\(verb==='surprise-activity'\)\{state\.showSurpriseActivity=!state\.showSurpriseActivity/);
});
test('Activity modal shows the server-confirmed title, description and timer and closes',()=>{
 const html=premiumSurpriseHtml(state);
 assert.match(html,/role="dialog" aria-modal="true" aria-label="Notre activité du mois"/);
 assert.match(html,/<h2>Massage surprise<\/h2>/);
 assert.match(html,/Prenez un moment ensemble/);
 assert.match(html,/10:00/);
 assert.match(html,/data-action="surprise-activity"/);
 assert.doesNotMatch(premiumSurpriseHtml({...state,showActivity:false}),/aria-modal="true"/);
});
test('Ecrin has one stylesheet owner with Home tokens, visible overflow and a 3 by 2 grid',()=>{
 const sw=read('service-worker.js'),ver=JSON.parse(read('web-version.json'));
 assert.ok(read('app.js').includes("const WEB_RELEASE='"+ver.build+"'"));assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
 assert.doesNotMatch(index,/href=".\/surprise-responsive-v86|href=".\/surprise-dice-layout-v73/);
 assert.ok(index.lastIndexOf('surprise-refined-v104.css')>index.lastIndexOf('premium-theme.css'));
 assert.match(css,/height:100dvh/);assert.doesNotMatch(css,/overflow:hidden|!important/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/var\(--ritual-button\)/);assert.match(css,/surprise-modal-content/);
});
