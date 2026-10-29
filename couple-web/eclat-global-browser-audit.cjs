'use strict';
/* LR-AUDIT-ECLAT: real LoveRoll router + synthetic couple, NEVER production data.
 * Audit 12 real coffrets, durations, unlocked/locked and guided states on five
 * Android/iPad/desktop sizes. Visual proof + interaction inventory every run. */
process.env.LOVEROLL_LOCAL_FILES='1';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const layouts=[
 {name:'android-small',width:360,height:740},
 {name:'android-s25',width:412,height:915},
 {name:'ipad-portrait',width:820,height:1180},
 {name:'ipad-landscape',width:1180,height:820},
 {name:'desktop',width:1366,height:768}
];
const output='design-captures';
async function enter(page){
 await page.locator('.home-dashboard').waitFor({state:'visible',timeout:18000});
 await page.locator('.nav [data-action="tab:session"]').click();
 await page.locator('[data-action="tab:eclat"]').waitFor({state:'visible',timeout:16000});
 await page.locator('[data-action="tab:eclat"]').click();
 await page.locator('#app.loveroll-eclat-page').waitFor({state:'visible',timeout:16000});
 await page.evaluate(()=>document.fonts.ready);
}
async function snapshot(page,stage,format){
 return page.evaluate(({stage,format})=>{
  const root=document.querySelector('main#app');
  const nav=document.querySelector('.nav');
  const visible=e=>{if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;};
  const bounds=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const buttons=[...root.querySelectorAll('button,[role="button"],input,textarea,summary')].filter(visible);
  const unnamed=buttons.filter(e=>!e.disabled&&!(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.labels?.[0]?.textContent)?.trim()).map(e=>e.dataset.action||e.className).slice(0,10);
  const insideScrollArea=e=>{let parent=e.parentElement;while(parent&&parent!==root){const st=getComputedStyle(parent);if(/auto|scroll/.test(st.overflowX)&&parent.scrollWidth>parent.clientWidth+1)return true;parent=parent.parentElement;}return false;};
  const offscreen=buttons.filter(e=>{const r=e.getBoundingClientRect();return (r.left<-2||r.right>innerWidth+2)&&!insideScrollArea(e);}).map(e=>({action:e.dataset.action||'',text:e.textContent.slice(0,35)})).slice(0,8);
  const navRect=bounds(nav),detail=root.querySelector('.eclat-detail'),grid=root.querySelector('.eclat-photo-grid');
  const detailRect=bounds(detail),detailChildren=detail?[...detail.children].filter(visible).map(e=>({cls:e.className,rect:bounds(e)})):[];
  return {format,stage,mainClass:root.className,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
   controls:buttons.length,unnamed,offscreen,nav:navRect,detail:detailRect,detailChildren,
   grid:grid?{count:grid.querySelectorAll('.eclat-tile').length,scrollable:grid.scrollHeight>grid.clientHeight+1,bounds:bounds(grid)}:null,
   cta:bounds(root.querySelector('.eclat-primary')),
   selected:[...root.querySelectorAll('.eclat-duration-choice.is-selected')].map(e=>e.dataset.action),
   bodyText:root.innerText.trim().length};
 },{stage,format});
}
function validate(s){
 assert.ok(s.controls>0,s.format+' '+s.stage+' no visible controls');
 assert.ok(s.bodyText>30,s.format+' '+s.stage+' empty content');
 assert.equal(s.horizontalOverflow,false,s.format+' '+s.stage+' horizontal overflow');
 assert.deepEqual(s.offscreen,[],s.format+' '+s.stage+' offscreen interactive elements');
 assert.deepEqual(s.unnamed,[],s.format+' '+s.stage+' unnamed controls');
 assert.ok(s.nav&&s.nav.width>200,s.format+' '+s.stage+' shared bottom nav missing');
}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report=[];
 try{
  for(const format of layouts){
   for(const mode of ['gallery','locked','guided']){
    const world=createWorld();
    world.eclat=mode==='locked'?{access:false,active:false}:
     mode==='guided'?{access:true,active:true,coffret_id:1,minutes:60,chapter_index:1,chapter_number:1,chapter_total:6,variant_number:0,session_id:'audit-eclat',my_choice:null,both_chosen:false}:
     {access:true,active:false};
    const {page,context,errors}=await setupEditorial(browser,world,{width:format.width,height:format.height,query:'open=home',motion:'reduce'});
    try{
     await enter(page);
     if(mode==='gallery'){
      await page.locator('.eclat-photo-grid').waitFor({state:'visible',timeout:12000});
      const all=page.locator('.eclat-tile');
      assert.equal(await all.count(),12,format.name+' not twelve coffrets');
      let s=await snapshot(page,'gallery',format.name);validate(s);
      assert.equal(s.grid.count,12);
      assert.ok(s.grid.bounds.bottom<=s.nav.top+2,format.name+' gallery overlaps nav');
      report.push(s);
      const lastFilter=page.locator('[data-action="eclat:intent:all"]');
      await lastFilter.click();
      assert.equal(await page.locator('.eclat-tile').count(),12,format.name+' All coffrets chip could not restore all 12');
      const access=await lastFilter.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.eclat-intents')?.getBoundingClientRect();return {visible:!!p&&r.left>=p.left-2&&r.right<=p.right+2,width:r.width,height:r.height};});
      assert.ok(access.visible,format.name+' horizontally scrolled chip cannot be reached by user');
      assert.ok(access.height>=40,format.name+' filter chip too small for touch');
      await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-gallery.png')});
      for(let id=1;id<=12;id++){
       const card=page.locator('[data-action="eclat:detail:'+id+'"]');
       await card.click();
       await page.locator('.eclat-detail[data-coffret-id="'+id+'"]').waitFor({state:'visible',timeout:12000});
       for(const minutes of [30,60,90]){
        await page.locator('[data-action="eclat:minutes:'+minutes+'"]').click();
        s=await snapshot(page,'detail-'+id+'-'+minutes,format.name);
        validate(s);
        assert.deepEqual(s.selected,['eclat:minutes:'+minutes],format.name+' '+id+' duration selection');
        assert.ok(s.cta&&s.cta.width>=44&&s.cta.height>=44,format.name+' '+id+' primary CTA missing');
        assert.ok(s.cta.bottom<=s.nav.top+2,format.name+' '+id+' CTA obscured by navigation');
        report.push({...s,detailChildren:undefined});
       }
       if([1,6,12].includes(id))await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-coffret-'+id+'.png')});
       await page.locator('.eclat-return').click();
       await page.locator('.eclat-photo-grid').waitFor({state:'visible'});
      }
     }else if(mode==='locked'){
      await page.locator('.eclat-offer').waitFor({state:'visible',timeout:12000});
      const s=await snapshot(page,'locked',format.name);validate(s);
      assert.equal(await page.locator('[data-action^="eclat:start:"]').count(),0,'Locked state exposed start');
      report.push(s);
      await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-locked.png')});
     }else{
      await page.locator('.eclat-guided[data-eclat-phase="prepare"]').waitFor({state:'visible',timeout:12000});
      const s=await snapshot(page,'guided-prepare',format.name);validate(s);
      assert.ok(s.cta&&s.cta.bottom<=s.nav.top+2,format.name+' guided CTA overlaps navigation');
      report.push(s);
      await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-guided.png')});
     }
     assert.deepEqual(errors,[],format.name+' '+mode+' browser exceptions');
     console.log('LR_ECLAT_GLOBAL_OK',format.name,mode);
    }catch(e){
     await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-'+mode+'-failure.png')}).catch(()=>{});
     throw e;
    }finally{await context.close();}
   }
  }
 }finally{
  fs.writeFileSync(path.join(output,'lr-eclat-global-inventory.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
