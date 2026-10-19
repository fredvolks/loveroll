// Browser regression against discoverHtml(), the REAL public / invitation landing.
// No auth tokens or live user data: this file uses only production components/styles.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const html=`<!doctype html><html lang="fr-CA"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${[...fs.readFileSync(path.join(__dirname,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="(\.\/[^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('')}</head><body><main id="app"></main>
<script type="module">
import {discoverHtml} from './discover.mjs';
document.getElementById('app').innerHTML=discoverHtml(new URLSearchParams(location.search).has('invite'));
</script></body></html>`;
fs.writeFileSync(path.join(__dirname,'__discover-actual-test.html'),html);
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const config of [
  {name:'S25-412x824',width:412,height:824},
  {name:'S25-412x915',width:412,height:915},
  {name:'Android-360x700',width:360,height:700},
  {name:'iPhone-393x852',width:393,height:852},
  {name:'S25-keyboard',width:412,height:550},
  {name:'S25-landscape',width:824,height:412},
  {name:'iPad-portrait',width:820,height:1180},
  {name:'iPad-landscape',width:1180,height:820},
  {name:'Laptop',width:1366,height:768},
  {name:'Desktop',width:1920,height:1080}
 ])for(const invite of [false,true]){
  const page=await browser.newPage({viewport:{width:config.width,height:config.height},
   isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('http://127.0.0.1:8765/__discover-actual-test.html'+(invite?'?invite=1':''),{waitUntil:'load'});
  await page.locator('.love-discover').waitFor();
  await page.locator('.discover-editorial-die>img').evaluate(el=>el.decode().catch(()=>{}));
  const cta=page.locator(invite?'[data-action="invite-start"]':'.discover-accept[data-action="show-auth:signup"]');
  await cta.scrollIntoViewIfNeeded();
  const metrics=await page.evaluate(invite=>{
   const hero=document.querySelector('.discover-editorial-die>img'),cta=document.querySelector('.discover-accept'),
     buttons=[...document.querySelectorAll('[data-action^="show-auth:"],[data-action="invite-start"]')],r=cta.getBoundingClientRect();
   const poster=document.querySelector('.love-discover'),box=poster.getBoundingClientRect();
   const stage=poster.querySelector('.discover-editorial-stage');
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    posterWidth:Math.round(box.width),layoutColumns:getComputedStyle(poster).gridTemplateColumns.split(' ').length,
    stageHeight:Math.round(stage.getBoundingClientRect().height),
    heroLoaded:hero.naturalWidth>100,
    primaryHeight:Math.round(r.height),primaryVisible:r.bottom>0&&r.top<innerHeight,
    actions:buttons.map(el=>el.dataset.action),hasRealDiscover:!!document.querySelector('.love-discover'),
    realRows:document.querySelectorAll('.discover-editorial-item').length,
    allRowsStatic:[...document.querySelectorAll('.discover-editorial-item')].every(x=>!x.hasAttribute('data-action')&&!x.querySelector('button,a')),
    hasTitle:!!document.querySelector('.discover-editorial-title'),
    noFalseAcceptance:invite?!document.body.textContent.includes('Invitation acceptée'):true};
  },invite);
  console.log('Production-discover',config.name,invite?'invitation':'public',JSON.stringify({metrics,errors}));
  if(errors.length||metrics.scrollWidth>metrics.width+2||!metrics.heroLoaded||!metrics.hasRealDiscover||
    !metrics.primaryVisible||metrics.primaryHeight<44||metrics.realRows!==4||!metrics.allRowsStatic||!metrics.hasTitle||
    metrics.actions.length!==(invite?1:2)||!metrics.noFalseAcceptance||
    (metrics.width>=1200&&(metrics.posterWidth<980||metrics.layoutColumns!==2))||
    (metrics.width>=768&&metrics.width<1100&&metrics.posterWidth<720))
   throw Error('Le vrai parcours découverte déborde ou manque une commande: '+config.name+' '+(invite?'invite':'public'));
  await page.screenshot({path:'landing-captures/'+config.name+'-ACTUEL-'+(invite?'INVITATION':'ACCUEIL')+'.png',fullPage:true});
  await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
