'use strict';
/* LR-AUDIT-GLOBAL-20261028: visit the REAL LoveRoll router with a
   synthetic couple. This is browser emulation, NOT a live A/B or device test.
   No draw, purchase, private account or production API may be used. */
process.env.LOVEROLL_LOCAL_FILES='1';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');

const layouts=[
 // Short and narrow phones must remain navigable without hiding actions.
 {name:'compact-phone',width:320,height:568},
 {name:'short-phone',width:412,height:650},
 {name:'small-phone',width:360,height:740},
 {name:'s25-viewport',width:412,height:915},
 {name:'ipad-portrait',width:820,height:1180},
 {name:'ipad-landscape',width:1180,height:820},
 {name:'desktop',width:1366,height:768}
];
const destinations=[
 {key:'home',selector:'.home-dashboard'},
 {key:'session',selector:'.evening-premium-view,.evening-locked-view'},
 {key:'special',selector:'.surprise-premium-view,.surprise-ecrin'},
 {key:'advent',selector:'#app.loveroll-advent-page'},
 {key:'settings',selector:'.settings-editorial'}
];
const forbidden=/^(roll_couple_once|roll_my_evening_d6|draw_for_partner|love_respond_and_redraw|complete_timed_evening_challenge|love_eclat_start|save_|reset_|delete_|import_)/;

async function select(page,key){
 const button=page.locator('.nav [data-action="tab:'+key+'"]');
 await button.waitFor({state:'visible',timeout:15000});
 for(let retry=0;retry<2;retry++){
  await button.click();
  try {
   await page.locator('.nav [data-action="tab:'+key+'"].active').waitFor({timeout:2500});
   return;
  }catch(error){
   if(retry===1||await button.isDisabled()||await page.locator('dialog[open],[role="alertdialog"]:visible').count())throw error;
  }
 }
}
async function snapshot(page,layout,key){
 return page.evaluate(({width,height,key})=>{
  const visible=e=>{
   if(!e)return false;
   // A closed disclosure hides every control except its direct summary.
   // A nonzero bounding rect alone does not make its descendants usable.
   for(let p=e;p;p=p.parentElement){
    if(p.hidden||p.inert)return false;
    const s=getComputedStyle(p);
    if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return false;
    if(p.matches('details:not([open])')){
     const summary=p.querySelector(':scope > summary');
     if(e!==summary&&!summary?.contains(e))return false;
    }
   }
   const r=e.getBoundingClientRect();
   return r.width>0&&r.height>0;
  };
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const nav=document.querySelector('nav.lr-ruby-nav');
  if(!nav)throw Error('Missing shared bottom navigation on '+key);
  const main=document.querySelector('#app');
  const tabs=[...nav.querySelectorAll('[data-action^="tab:"]')].filter(visible);
  const inputs=[...main.querySelectorAll('button,[role="button"],input,select,textarea,summary')].filter(visible);
  const unnamed=inputs.filter(e=>!e.disabled&&!e.matches('input[type="hidden"]')&&
   !(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.labels?.[0]?.textContent||e.getAttribute('aria-labelledby'))?.trim())
   .slice(0,12).map(e=>({tag:e.tagName,action:e.dataset.action||'',className:typeof e.className==='string'?e.className:''}));
  const overflow=inputs.filter(e=>{const r=rect(e);return r.left<-1||r.right>innerWidth+1;})
   .slice(0,10).map(e=>({action:e.dataset.action||'',text:e.textContent.slice(0,40)}));
  // Durable LR-AUDIT-GLOBAL control inventory for EVERY real routed page.
  // Capture metadata only, never input values or private account data; the
  // screenshot/JSON can be reviewed by UX, visual, responsive and client QA.
  const controlInventory=inputs.map((e,index)=>{
   const bounds=rect(e);
   const name=(e.getAttribute('aria-label')||e.getAttribute('title')||
    e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?.textContent||
    e.labels?.[0]?.textContent||e.innerText||e.getAttribute('placeholder')||'').trim().slice(0,120);
   const inViewport=bounds.top>=0&&bounds.bottom<=innerHeight&&bounds.left>=0&&bounds.right<=innerWidth;
   const point=inViewport?document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2):null;
   return {index,tag:e.tagName.toLowerCase(),action:e.dataset.action||null,
    name,role:e.getAttribute('role')||null,disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',
    expanded:e.getAttribute('aria-expanded'),pressed:e.getAttribute('aria-pressed'),
    minTouch44:bounds.width>=44&&bounds.height>=44,
    inViewport,hitAtCenter:!inViewport?null:point===e||e.contains(point),
    bounds};
  });
  return {
   viewport:{width,height},page:key,mainClass:main.className,
   tabs:tabs.map(e=>({action:e.dataset.action,label:(e.getAttribute('aria-label')||e.innerText||'').trim(),active:e.classList.contains('active'),current:e.getAttribute('aria-current'),iconHidden:e.querySelector(':scope > span')?.getAttribute('aria-hidden'),disabled:e.disabled,rect:rect(e)})),
   nav:rect(nav),navLabel:nav.getAttribute('aria-label'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
   visibleControls:inputs.length,controlInventory,unnamed,offscreenControls:overflow,
   closedDisclosureControls:[...main.querySelectorAll('details:not([open]) button,details:not([open]) input,details:not([open]) textarea')].filter(visible).length,
   meaningfulContent:(main.innerText||'').trim().length,
   renderedError:[...document.querySelectorAll('.toast.visible,[role="alert"]')].map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,5)
  };
 },{width:layout.width,height:layout.height,key});
}
async function main(){
 fs.mkdirSync('design-captures',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report=[];
 try{
  for(const layout of layouts){
   const world=createWorld();
   const {page,context,errors}=await setupEditorial(browser,world,{
    width:layout.width,height:layout.height,query:'open=home',motion:'reduce'});
   try{
    for(const destination of destinations){
     await select(page,destination.key);
     await page.locator(destination.selector).first().waitFor({state:'visible',timeout:12000});
     await page.evaluate(()=>document.fonts.ready);
     const data=await snapshot(page,layout,destination.key);
     report.push(data);
     assert.equal(data.controlInventory.length,data.visibleControls,
      layout.name+' '+destination.key+' incomplete button/field inventory');
     assert.ok(data.controlInventory.every(c=>c.bounds.width>0&&c.bounds.height>0),
      layout.name+' '+destination.key+' visible interactive element has no hit box');
     assert.equal(data.tabs.length,5,layout.name+' '+destination.key+' missing one of the 5 destinations');
     assert.equal(data.tabs.filter(t=>t.active).length,1,layout.name+' '+destination.key+' has an ambiguous active tab');
     assert.equal(data.tabs.find(t=>t.active).action,'tab:'+destination.key,layout.name+' wrong destination selected');
     assert.equal(data.navLabel,'Navigation principale',layout.name+' '+destination.key+' main navigation lacks a landmark name');
     assert.equal(data.tabs.filter(t=>t.current==='page').length,1,layout.name+' '+destination.key+' ambiguous or missing aria-current');
     assert.equal(data.tabs.find(t=>t.current==='page').action,'tab:'+destination.key,layout.name+' '+destination.key+' active page not announced to screen readers');
     for(const tab of data.tabs){
      assert.equal(tab.iconHidden,'true',layout.name+' '+destination.key+' decorative icon is spoken by assistive technology');
      assert.equal(tab.current,tab.active?'page':null,layout.name+' '+destination.key+' aria-current disagrees with visual active tab '+tab.action);
      assert.ok(tab.label.length>=2,layout.name+' '+destination.key+' has an unnamed navigation tab');
      assert.ok(tab.rect.width>=44&&tab.rect.height>=44,layout.name+' '+destination.key+' has undersized navigation target '+tab.action);
      assert.ok(tab.rect.left>=-1&&tab.rect.right<=layout.width+1,layout.name+' '+destination.key+' tab outside viewport '+tab.action);
     }
     assert.equal(data.horizontalOverflow,false,layout.name+' '+destination.key+' horizontal overflow');
     assert.ok(data.nav.bottom>=layout.height-2&&data.nav.bottom<=layout.height+2,layout.name+' '+destination.key+' navigation not anchored to bottom');
     assert.ok(data.meaningfulContent>20,layout.name+' '+destination.key+' content unexpectedly empty');
     assert.equal(data.closedDisclosureControls,0,
      layout.name+' '+destination.key+' incorrectly counts inaccessible controls inside closed disclosures');
     assert.equal(data.offscreenControls.length,0,layout.name+' '+destination.key+' controls clipped horizontally: '+JSON.stringify(data.offscreenControls));
     assert.equal(data.unnamed.length,0,layout.name+' '+destination.key+' visible controls lacking accessible names: '+JSON.stringify(data.unnamed));
     assert.equal(data.renderedError.length,0,layout.name+' '+destination.key+' unexpected visible errors: '+JSON.stringify(data.renderedError));
     await page.screenshot({path:path.join('design-captures','lr-global-nav-'+layout.name+'-'+destination.key+'.png')});
     console.log('LR_NAV_OK',layout.name,destination.key,'visible controls',data.visibleControls,'undersized',data.controlInventory.filter(c=>!c.minTouch44).length,'center-hit-blocked',data.controlInventory.filter(c=>c.hitAtCenter===false).length,'unnamed',data.unnamed.length);
    }
    const unsafe=world.calls.filter(c=>c.name&&forbidden.test(c.name));
    assert.deepEqual(unsafe,[],layout.name+' navigation triggered a mutating RPC');
    assert.deepEqual(errors,[],layout.name+' browser JavaScript errors');
   }catch(error){
    await page.screenshot({path:path.join('design-captures','lr-global-nav-'+layout.name+'-failure.png')}).catch(()=>{});
    throw error;
   }finally{await context.close();}
  }
 }finally{
  fs.writeFileSync('design-captures/lr-global-navigation-inventory.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
