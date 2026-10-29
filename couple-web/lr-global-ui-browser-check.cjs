'use strict';
// Synthetic, privacy-safe visual fixture using the production CSS bundle.
// This is NOT a real partner A/B journey or an Android/iPad hardware test.
const assert=require('node:assert/strict');
const {readFileSync,mkdirSync}=require('node:fs');
const {chromium}=require('playwright');

const homepage=readFileSync(new URL('./index.html','file://'+__dirname+'/'),'utf8');
const sheets=[...homepage.matchAll(/<link\s+[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0]);
assert.ok(sheets.length>=45,'The real LoveRoll CSS bundle must be used');
assert.ok(sheets.some(x=>x.includes('ruby-controls.css')));
assert.ok(sheets.some(x=>x.includes('ruby-surfaces.css')));
const fixture='<!DOCTYPE html><html lang="fr-CA"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+sheets.join('')+
 '<style>body{margin:0}#app{padding:24px;min-height:100dvh;max-width:850px;margin:auto;box-sizing:border-box;display:grid;align-content:start;gap:18px}.lr-ui-fixture-title{font:20px Georgia;color:#fff}.lr-ui-fixture-area{display:grid;gap:14px}#feature{width:100%}</style>'+
 '</head><body><main id="app" class="loveroll-home-page">'+
 '<h1 class="lr-ui-fixture-title">LoveRoll — contrôles partagés</h1>'+
 '<section class="lr-ui-fixture-area">'+
 '<button type="button" id="action" class="home-roll-button lr-ruby-control lr-ruby-action lr-surface">Brasser le dé</button>'+
 '<button type="button" id="disabled" disabled class="home-roll-button lr-ruby-control lr-ruby-action lr-surface">Déjà brassé cette semaine</button>'+
 '<button type="button" id="feature" class="home-next-month lr-ruby-control lr-ruby-feature lr-surface">'+
 '<span class="lr-ruby-icon">♡</span><span class="lr-ruby-copy"><span class="lr-ruby-title">Notre surprise</span>'+
 '<span class="lr-ruby-caption">Découvrir notre activité</span></span><span class="lr-ruby-icon">›</span></button>'+
 '<div id="surface" class="home-dashboard home-duo-dashboard lr-surface">Panneau commun du couple</div>'+
 '</section></main></body></html>';

async function main(){
 mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const d of [
   {name:'phone-360',width:360,height:780},
   {name:'phone-s25',width:412,height:915},
   {name:'ipad-portrait',width:820,height:1180},
   {name:'ipad-landscape',width:1180,height:820},
   {name:'desktop',width:1366,height:768}
  ]){
   const page=await browser.newPage({viewport:{width:d.width,height:d.height},deviceScaleFactor:1});
   const badSheets=[];
   page.on('response',r=>{if((r.url().includes('ruby-controls.css')||r.url().includes('ruby-surfaces.css'))&&r.status()!==200)badSheets.push(r.url()+': '+r.status());});
   await page.goto('http://127.0.0.1:8765/web-version.json');
   await page.setContent(fixture,{waitUntil:'networkidle'});
   assert.deepEqual(badSheets,[],'Common CSS load failed');
   await page.evaluate(()=>{window.uiFixtureClicks=0;document.getElementById('action').addEventListener('click',()=>window.uiFixtureClicks++);});
   const styles=await page.evaluate(()=>{
    const get=id=>{const el=document.getElementById(id),s=getComputedStyle(el);return {
     bg:s.backgroundImage,border:s.borderRadius,font:s.fontFamily,
     opacity:Number(s.opacity),cursor:s.cursor,
     width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height
    }};
    return {action:get('action'),disabled:get('disabled'),feature:get('feature'),surface:get('surface'),
     overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
   });
   for(const key of ['action','feature','surface'])
    assert.notEqual(styles[key].bg,'none',d.name+' '+key+' lost its shared glass material');
   assert.ok(styles.action.height>=44,d.name+' action below accessible touch target');
   assert.ok(styles.feature.height>=44,d.name+' feature below accessible touch target');
   assert.ok(!styles.overflow,d.name+' horizontal scroll');
   assert.ok(styles.disabled.opacity<1,d.name+' no disabled appearance');
   assert.match(styles.action.font,/LoveRoll Cormorant|Cormorant/i,d.name+' missing common font');
   await page.locator('#action').click();
   assert.equal(await page.evaluate(()=>window.uiFixtureClicks),1,d.name+' click lost');
   await page.locator('#action').focus();
   const focus=await page.locator('#action').evaluate(el=>{const s=getComputedStyle(el);return {width:parseFloat(s.outlineWidth),style:s.outlineStyle}});
   assert.ok(focus.width>=2&&focus.style!=='none',d.name+' keyboard focus invisible');
   await page.screenshot({path:'design-captures/lr-global-ruby-'+d.name+'.png',fullPage:true});
   console.log(d.name+': button/material/focus/target/overflow/click OK');
   await page.close();
  }
 }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
