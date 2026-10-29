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
   guidedActions:bounds(root.querySelector('.eclat-guided-actions')),
   duplicatedGuidedTitle:visible(root.querySelector('.eclat-guided-heading strong')),
   guidedTouchTargets:[...root.querySelectorAll('.eclat-guided button,.eclat-guided summary')].filter(visible).map(el=>{const st=getComputedStyle(el),r=bounds(el);return {name:el.dataset.action||el.textContent.trim().slice(0,40),width:r.width,height:r.height,minHeight:st.minHeight,heightCss:st.height,transform:st.transform,visibility:st.visibility};}),
   guidedStylesheets:[...document.styleSheets].map(s=>s.href).filter(h=>h&&/eclat-(guided|night-gallery)\.css/.test(h)),
   guidedProgress:(()=>{const bar=root.querySelector('.eclat-guided [role="progressbar"]');return bar?{label:bar.getAttribute('aria-label'),min:bar.getAttribute('aria-valuemin'),max:bar.getAttribute('aria-valuemax'),now:bar.getAttribute('aria-valuenow'),text:bar.getAttribute('aria-valuetext')}:null;})(),
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
      // Conserver de VRAIS boutons natifs, identifiables par un lecteur d'écran.
      assert.equal(await page.locator('.eclat-photo-grid[role="group"]').count(),1,
       format.name+' gallery needs an accessible group');
      for(let id=1;id<=12;id++){
       const name=new RegExp('^Ouvrir le coffret '+String(id).padStart(2,'0')+' :');
       assert.equal(await page.getByRole('button',{name}).count(),1,
        format.name+' coffret '+id+' is not exposed as a named button');
      }
      let s=await snapshot(page,'gallery',format.name);validate(s);
      assert.equal(s.grid.count,12);
      assert.ok(s.grid.bounds.bottom<=s.nav.top+2,format.name+' gallery overlaps nav');
      report.push(s);
      for(const [intent,count] of [['together',7],['reconnect',3],['closer',3],['all',12]]){
       const filter=page.locator('[data-action="eclat:intent:'+intent+'"]');
       await filter.click();
       await page.waitForFunction(expected=>document.querySelectorAll('.eclat-tile').length===expected,count);
       assert.equal(await filter.getAttribute('aria-pressed'),'true',format.name+' intent '+intent+' is not accessible as selected');
       assert.equal(await page.locator('.eclat-intents [aria-pressed="true"]').count(),1,format.name+' multiple intent selections');
      }
      if(format.width<=600){
       const access=await page.locator('.eclat-intents button').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return {visible:r.left>=p.left-2&&r.right<=p.right+2&&r.top>=p.top-2&&r.bottom<=p.bottom+2,width:r.width,height:r.height};}));
       assert.ok(access.length===4&&access.every(el=>el.visible&&el.width>=44&&el.height>=44),format.name+' requires swiping or has undersized intent controls');
      }
      await page.screenshot({path:path.join(output,'lr-eclat-global-'+format.name+'-gallery.png')});
      for(let id=1;id<=12;id++){
       const card=page.locator('[data-action="eclat:detail:'+id+'"]');
       const cardBox=await card.boundingBox();
       assert.ok(cardBox&&cardBox.width>=44&&cardBox.height>=44,
        format.name+' coffret '+id+' is too small to tap');
       if(id===1){
        // Le premier coffret doit s'ouvrir au clavier comme au toucher.
        await card.focus();
        assert.equal(await card.evaluate(el=>document.activeElement===el),true,
         format.name+' coffret button cannot receive keyboard focus');
        await page.keyboard.press('Enter');
       }else await card.click();
       await page.locator('.eclat-detail[data-coffret-id="'+id+'"]').waitFor({state:'visible',timeout:12000});
       for(const minutes of [30,60,90]){
        await page.locator('[data-action="eclat:minutes:'+minutes+'"]').click();
        s=await snapshot(page,'detail-'+id+'-'+minutes,format.name);
        validate(s);
        assert.deepEqual(s.selected,['eclat:minutes:'+minutes],format.name+' '+id+' duration selection');
        assert.equal(await page.locator('[data-action="eclat:minutes:'+minutes+'"]').getAttribute('aria-pressed'),'true',format.name+' '+id+' '+minutes+' duration not announced');
        assert.equal(await page.locator('.eclat-duration [aria-pressed="true"]').count(),1,format.name+' '+id+' ambiguous duration selection');
        assert.ok(s.cta&&s.cta.width>=44&&s.cta.height>=44,format.name+' '+id+' primary CTA missing');
        assert.ok(s.detail&&Math.abs((s.cta.left+s.cta.right-s.detail.left-s.detail.right)/2)<=3,format.name+' '+id+' main CTA is off center');
        const sizes=await page.locator('.eclat-duration-choice').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return [r.width,r.height];}));
        assert.ok(sizes.length===3&&sizes.every(([w,h])=>w>=44&&h>=44),format.name+' '+id+' duration controls smaller than 44px');
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
      assert.equal(s.duplicatedGuidedTitle,false,format.name+' duplicates the coffret title above its step');
      assert.deepEqual(s.guidedProgress,{label:'Progression du coffret',min:'0',max:'6',now:'1',text:'Étape 1 sur 6'},format.name+' progress inaccessible');
      if(format.name==='android-small'&&s.guidedTouchTargets.some(t=>t.width<44||t.height<44)){
       const cascade=await page.evaluate(()=>{
        const selectors=['.eclat-guided button.eclat-skip','.eclat-guided .eclat-play-footer button.eclat-link','.eclat-guided .eclat-rules summary'];
        const scan=(rules,href,el,result,layer='')=>{for(const rule of rules){if(rule.cssRules){scan(rule.cssRules,href,el,result,layer+' '+(rule.name||rule.conditionText||''));continue;}if(!rule.selectorText||!rule.style)continue;try{if(!el.matches(rule.selectorText))continue;}catch{continue;}
         const props=['min-height','height','max-height','padding','padding-block','padding-block-start','padding-block-end','display'];const active=props.filter(k=>rule.style.getPropertyValue(k));
         if(active.length)result.push({from:href.split('/').pop(),layer,selector:rule.selectorText,style:Object.fromEntries(active.map(k=>[k,rule.style.getPropertyValue(k)+(rule.style.getPropertyPriority(k)?' !important':'')]))});
        }};
        return selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return {selector,missing:true};const cs=getComputedStyle(el),matched=[];for(const sheet of document.styleSheets){try{scan(sheet.cssRules,sheet.href||'inline',el,matched);}catch{}}return {selector,computed:{minHeight:cs.minHeight,height:cs.height,maxHeight:cs.maxHeight,padding:cs.padding,display:cs.display},matched:matched.slice(-55)};});
       });
       console.log('ECLAT_CASCADE_DEBUG',JSON.stringify(cascade));
      }
      assert.ok(s.guidedTouchTargets.length>0&&s.guidedTouchTargets.every(t=>t.width>=44&&t.height>=44),format.name+' undersized guided controls: '+JSON.stringify({targets:s.guidedTouchTargets.filter(t=>t.width<44||t.height<44),stylesheets:s.guidedStylesheets}));
      assert.ok(s.guidedActions&&Math.abs((s.cta.left+s.cta.right-s.guidedActions.left-s.guidedActions.right)/2)<=3,format.name+' guided primary CTA is not horizontally centered');
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
