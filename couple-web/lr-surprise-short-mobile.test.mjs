import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';

const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');

test('compact Surprise only activates on short phones, not tablets or desktop',()=>{
 const css=read('surprise-minimal.css');
 assert.match(css,/@media\s*\(max-width:767px\) and \(max-height:700px\)/);
 assert.match(css,/@media\s*\(max-width:359px\) and \(max-height:600px\)/);
 assert.match(css,/grid-template-rows:48px auto 24px minmax\(105px,1fr\) 48px minmax\(70px,104px\) 62px/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/surprise-minimal-status[\s\S]*?overflow-y:auto!important/);
 assert.match(css,/surprise-main-die-scene \.love3d-stage[\s\S]*?max-height:100%!important/);
 assert.match(css,/surprise-events-summary[\s\S]*?height:62px!important/);
});

test('compact mode keeps real WebGL and photographed pedestal, and all actions reachable',()=>{
 const minimal=read('surprise-minimal.mjs');
 const css=read('surprise-minimal.css');
 assert.match(minimal,/hero\.classList\.add\('home-die-theater'\)/);
 assert.match(minimal,/class="home-pedestal"/);
 assert.match(minimal,/view\.replaceChildren\(header,title,month,hero,mainButton,status,eventsButton/);
 assert.match(minimal,/for\(const element of \[\.\.\.controls\.children\]\)if\(element!==mainButton\)status\.append\(element\)/);
 assert.match(css,/\.surprise-minimal-status \.surprise-preferences-compact>\.surprise-geo-text-button/);
 assert.match(css,/min-height:44px!important/);
 const html=premiumSurpriseHtml({monthly:{},travelRadiusKm:null,budgetMax:null});
 assert.match(html,/data-action="roll:monthly_activity"/);
 assert.match(html,/data-action="settings-page:monde"/);
 assert.match(html,/data-dice-sides="100"/);
});

test('normal mobile keeps its original full-size design outside short breakpoint',()=>{
 const css=read('surprise-minimal.css');
 const short=css.indexOf('LR-SURPRISE-001 / mobile court');
 const old=css.slice(0,short);
 const next=css.slice(short);
 assert.ok(short>0);
 assert.match(old,/height:100dvh!important/);
 assert.match(old,/grid-template-rows:80px auto 28px minmax\(0,1fr\) 55px auto 70px!important/);
 assert.doesNotMatch(next,/url\('\.\/assets|\.dice-canvas\s*\{|\.home-pedestal\s*\{/);
});
