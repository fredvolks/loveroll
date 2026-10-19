// Real weekly die and production Home, with synthetic distinct partner names only.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const {glassState}=require('./crystal-glass-browser-check.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const failures=[];fs.mkdirSync('design-captures',{recursive:true});
 try{
  for(const [name,width,height] of [['small',360,640],['Android-app',360,704],['Android',360,740],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['PC',1366,768]]){
   if(process.env.LOVE_PAD_ONLY==='1'&&!name.startsWith('iPad'))continue;
   for(const face of [null,2,6]){
    const world=createWorld();world.profiles[0].display_name='Fred';world.profiles[1].display_name='Fred Messely';
    const now=new Date(),toronto=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const monday=new Date(toronto+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
    world.rolls=[{id:'month',couple_id:'c',kind:'monthly_activity',key:toronto.slice(0,7),face:19,activity_title:'Activité officielle de test',activity_description:'Texte officiel conservé.'}];
    if(face)world.rolls.push({id:'week',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face,created_at:now.toISOString()});
    const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=home',motion:'no-preference'});
    try{
     await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.projectedBounds);
     const inspect=()=>page.evaluate(()=>{
      const c=document.querySelector('.home-die-platform canvas'),b=c.loveRollDie.projectedBounds(),r=c.getBoundingClientRect(),scene=c.closest('.home-die-theater').getBoundingClientRect();
      const nav=document.querySelector('.nav').getBoundingClientRect(),stats=document.querySelector('.home-stats-grid').getBoundingClientRect();
      const title=document.querySelector('.home-title h2'),titleBox=title.getBoundingClientRect();
      return {face:c.dataset.face,markers:c.dataset.diceMarkers,preview:c.dataset.dicePreview==='true',q:c.loveRollDie.readState().quaternion,webgl:c.dataset.webglReady,contact:Number(c.dataset.podiumContact),meshBottom:r.top+b.bottom*r.height-scene.top,meshTop:r.top+b.top*r.height-scene.top,headroom:parseFloat(getComputedStyle(c.closest('.home-die-theater')).getPropertyValue('--dice-headroom')),titleLines:titleBox.height/parseFloat(getComputedStyle(title).lineHeight),titleGap:r.top+b.top*r.height-titleBox.bottom,sceneHeight:scene.height,sceneWidth:scene.width,sceneBackgroundY:getComputedStyle(c.closest('.home-die-theater')).backgroundPositionY,platformHeight:c.parentElement.getBoundingClientRect().height,navTop:nav.top,statsBottom:stats.bottom,bodyHeight:document.documentElement.scrollHeight,horizontal:document.documentElement.scrollWidth-innerWidth,textFits:[...document.querySelectorAll('.home-stat-card')].every(card=>[...card.querySelectorAll('strong,span,small')].every(t=>t.getBoundingClientRect().bottom<=Math.min(card.getBoundingClientRect().bottom,nav.top)+1))};
     });
     const initial=await inspect();await page.waitForTimeout(500);const result=await inspect();
     const frame=await page.locator('.home-die-theater').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {border:parseFloat(s.borderTopWidth),radius:parseFloat(s.borderTopLeftRadius),mask:s.maskImage,left:r.left,right:r.right,width:innerWidth};});
     assert.equal(frame.border,1);assert.equal(frame.radius,20);assert.equal(frame.mask,'none');assert.ok(frame.left>=12&&frame.right<=frame.width-12,'Photo frame must be inset from the screen');
     assert.deepEqual(result.q,initial.q,'Idle weekly die moved');assert.equal(result.webgl,'true');
     assert.equal(result.markers,'pips','Home D6 must use classic points');
     if(name.startsWith('iPad')){
      assert.equal(result.sceneBackgroundY,'62%','iPad photographed marble plinth is positioned below the die');
      assert.ok(result.platformHeight<=result.sceneHeight+2,'iPad 3D platform extends below the photo frame: '+JSON.stringify(result));
      assert.ok(result.sceneHeight-result.contact>=28,'iPad marble base is outside the photo frame: '+JSON.stringify(result));
     }
     assert.equal(result.preview,face===null,'Only an unrolled Home D6 is a preview');
     assert.ok(Math.abs(result.meshBottom-result.contact)<=2,JSON.stringify(result));assert.ok(result.meshTop>=-2&&result.meshBottom<=result.sceneHeight+2,JSON.stringify(result));
     assert.ok(result.meshTop>=result.headroom-1,'Die lost its breathing room: '+JSON.stringify(result));
     assert.ok(result.titleGap>=result.headroom,'Die overlaps the header: '+JSON.stringify(result));
     assert.ok(Math.abs(result.titleLines-1)<.05,'The primary title must stay on one line: '+JSON.stringify(result));
     assert.ok(result.statsBottom<=result.navTop-3&&result.textFits,JSON.stringify(result));assert.ok(result.bodyHeight<=height+2&&result.horizontal<=1,JSON.stringify(result));
     if(face)assert.equal(result.face,String(face));assert.deepEqual(errors,[]);
     if(name==='S25'){
      await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
      result.translucency=await page.locator('.home-die-platform canvas').evaluate(glassState);
      assert.equal(result.translucency.optics.transmission,1);
      assert.ok(result.translucency.white>0,'Home white inlays are missing');
     }
     const summary=await page.evaluate(()=>[...document.querySelectorAll('.home-challenge-stats>div')].map(row=>{
      const label=row.querySelector('small').getBoundingClientRect(),value=row.querySelector('strong').getBoundingClientRect(),box=row.getBoundingClientRect();
      return {labelLeft:label.left,valueRight:value.right,inside:label.bottom<=box.bottom+1&&value.bottom<=box.bottom+1};
     }));
     assert.equal(summary.length,3);
     assert.ok(summary.every(x=>x.inside),'Tonight row is clipped');
     assert.ok(Math.max(...summary.map(x=>x.labelLeft))-Math.min(...summary.map(x=>x.labelLeft))<=1,'Tonight labels are not aligned');
     assert.ok(Math.max(...summary.map(x=>x.valueRight))-Math.min(...summary.map(x=>x.valueRight))<=1,'Tonight values are not aligned');
     // Regression: a live text refresh used to retain WebGL but drop the stage
     // transform. A size-only check misses this because the canvas is unchanged.
     await page.evaluate(()=>{window.__beforeRefresh=document.querySelector('.home-die-platform canvas');});
     for(let refresh=0;refresh<3;refresh++){
      await page.locator('.nav [data-action="tab:home"]').click();await page.waitForTimeout(50);
      const after=await inspect();
      assert.ok(await page.evaluate(()=>window.__beforeRefresh===document.querySelector('.home-die-platform canvas')),'Refresh remounted weekly WebGL');
      assert.deepEqual(after.q,result.q);assert.ok(Math.abs(after.meshBottom-after.contact)<=2,'Refresh lost podium contact '+JSON.stringify(after));
     }
     if(name==='S25'&&face===2){
      await page.evaluate(()=>{window.__homeDie=document.querySelector('.home-die-platform canvas');});
      await page.setViewportSize({width,height:915});await page.waitForTimeout(100);const resized=await inspect();
      assert.deepEqual(resized.q,initial.q);assert.ok(Math.abs(resized.meshBottom-resized.contact)<=2);
      assert.ok(await page.evaluate(()=>window.__homeDie===document.querySelector('.home-die-platform canvas')),'Resize replaced WebGL');
      await page.setViewportSize({width,height});
     }
     await page.screenshot({path:'design-captures/home124-'+name+'-'+(face||'unrolled')+'.png'});console.log('HOME_PODIUM_OK',name,face,JSON.stringify(result));
    }catch(error){failures.push({name,face,error:error.message});await page.screenshot({path:'design-captures/home124-'+name+'-'+(face||'unrolled')+'-FAIL.png'}).catch(()=>{});}
    finally{await context.close();}
   }
  }
 }finally{await browser.close();}
 assert.deepEqual(failures,[]);
})().catch(e=>{console.error(e);process.exit(1)});
