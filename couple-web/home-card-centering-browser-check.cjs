// Approved Home no. 9: aligned rows in two columns, real values, large die,
// complete names and controls visible without scrolling.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
const sizes=[['small',360,640],['Android-app',360,704],['Android',360,740],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['PC',1366,768]];
function homeWorld(kind){
 const longNames=kind.startsWith('long-'),unrolled=kind.endsWith('unrolled');
 const world=createWorld(),now=new Date(),date=now.toISOString();
 const toronto=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const monday=new Date(toronto+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 world.profiles[0].display_name=longNames?'Jean-Christophe Martin':'Fred';
 world.profiles[1].display_name=longNames?'Jean-Christophe Tremblay':'Fred Messely';
 world.rolls=[{id:'week',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:2,created_at:date},
  {id:'month',couple_id:'c',kind:'monthly_activity',key:toronto.slice(0,7),face:19,activity_title:'Activité officielle de test',activity_description:'Description conservée.'}];
 if(unrolled)world.rolls=world.rolls.filter(r=>r.kind!=='weekly'&&(!longNames||r.kind!=='monthly_activity'));
 if(kind!=='empty'&&!unrolled){
  world.eveningSessions=[{id:'finished',couple_id:'c',started_at:date,finished_at:date,counted:true}];
  world.challenges=[{id:'done',couple_id:'c',session_id:'finished',recipient:'a',category:'SEXUEL',status:'completed',created_at:date}];
  world.reviews=['a','b'].map(author_id=>({session_id:'finished',author_id}));
 }
 if(kind==='assigned'||kind==='long-names'){
  world.eveningSessions.push({id:'active',couple_id:'c',week_key:monday.toISOString().slice(0,10),started_at:date,finished_at:null,paired_turns:true,self_draws:true,opened_by:'a'});
  world.personalRolls=[{session_id:'active',user_id:'a',face:4},{session_id:'active',user_id:'b',face:6}];
  world.board={ready:true,targets:{a:4,b:6},remaining:{a:3,b:6},completed:{a:1,b:0}};
 }
 return world;
}
async function measure(page){
 return page.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const cards=[...document.querySelectorAll('.home-challenge-stats>div,.home-stat-card')].map((card,index)=>{
   const box=rect(card),icon=card.querySelector(index<3?'.home-summary-value>span':'i');
   const label=card.querySelector(index<3?'small':'span'),value=card.querySelector('strong');
   const texts=[...card.querySelectorAll('strong,small,span')].filter(el=>el!==icon);
   const lines=texts.flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);const target=rect(el);return [...range.getClientRects()].filter(r=>r.width>1).map(r=>({text:el.textContent,centerError:Math.abs((r.left+r.right-target.left-target.right)/2),inside:r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1}));});
   const i=rect(icon),v=rect(value),l=rect(label),content=rect(card.querySelector(index<3?'.home-summary-content':'.home-stat-content'));
   return {index,box,iconX:(i.left+i.right)/2,labelLeft:l.left,valueLeft:v.left,valueRight:v.right,contentTop:content.top,contentBottom:content.bottom,lines};
  });
  const nav=rect(document.querySelector('.nav')),dashboard=rect(document.querySelector('.home-dashboard')),monthly=rect(document.querySelector('.home-next-month'));
  const panels=[...document.querySelectorAll('.home-panel')].map(rect),canvas=document.querySelector('.home-die-platform canvas'),b=canvas.loveRollDie.projectedBounds(),c=rect(canvas);
  return {cards,panels,navTop:nav.top,lastBottom:dashboard.bottom,surpriseButtonHeight:monthly.height,height:innerHeight,scroll:document.documentElement.scrollHeight-innerHeight,horizontal:document.documentElement.scrollWidth-innerWidth,
   gap:dashboard.top-monthly.bottom,values:[...document.querySelectorAll('.home-stat-card strong')].map(n=>n.textContent),meshWidth:(b.right-b.left)*c.width,meshHeight:(b.bottom-b.top)*c.height,zoom:getComputedStyle(document.querySelector('.home-bottom-stack')).zoom};
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const failures=[],measurements=[];fs.mkdirSync('design-captures',{recursive:true});
 try{
  for(const [name,width,height] of sizes)for(const kind of ['mixed','empty','unrolled','assigned','long-names','long-unrolled']){
   const {page,context,errors}=await setupEditorial(browser,homeWorld(kind),{width,height,query:'open=home'});
   try{
    await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.projectedBounds);
    await page.evaluate(()=>document.fonts.ready);const result=await measure(page);measurements.push({name,kind,...result});
    // Keep captures even when a measurement fails, for a visual comparison.
    await page.screenshot({path:'design-captures/home124-centering-'+name+'-'+kind+'.png'});
    assert.equal(result.cards.length,7);
    assert.deepEqual(result.values,kind==='empty'||kind.endsWith('unrolled')?['0','0 / 0','—','0']:['1','1 / 0','0 / 100 %','1']);
    if(kind==='assigned'||kind==='long-names')assert.deepEqual(await page.locator('.home-challenge-stats strong').allTextContents(),['10','4','6']);
    assert.equal(result.panels.length,2);
    assert.ok(Math.abs(result.panels[0].top-result.panels[1].top)<=1&&Math.abs(result.panels[0].bottom-result.panels[1].bottom)<=1,'Two panels must align');
    assert.ok(result.panels[0].right+5<=result.panels[1].left,'Home panels must stay in separate columns');
    for(const card of result.cards){
     const panel=result.panels[card.index<3?0:1];
     assert.ok(card.box.left>=panel.left&&card.box.right<=panel.right&&card.box.top>=panel.top&&card.box.bottom<=panel.bottom+1,'Row escapes its panel');
     assert.ok(card.contentTop>=card.box.top+1&&card.contentBottom<=card.box.bottom-1,'Row lacks vertical margins');
     for(const line of card.lines){
      assert.ok(line.inside,'Text does not fit: '+JSON.stringify(line));
      if(card.index>=3)assert.ok(line.centerError<=1,'Statistics text is not centered: '+JSON.stringify(line));
     }
    }
    for(const group of [result.cards.slice(0,3),result.cards.slice(3)]){
     assert.ok(Math.max(...group.map(c=>c.iconX))-Math.min(...group.map(c=>c.iconX))<=1,'Icons drift between rows');
     if(group[0].index===0){
      assert.ok(Math.max(...group.map(c=>c.labelLeft))-Math.min(...group.map(c=>c.labelLeft))<=1,'Tonight text is not aligned');
      assert.ok(Math.max(...group.map(c=>c.valueRight))-Math.min(...group.map(c=>c.valueRight))<=1,'Tonight values are not right aligned');
     }else assert.ok(Math.max(...group.map(c=>c.valueLeft))-Math.min(...group.map(c=>c.valueLeft))<=1,'Statistic values are not aligned');
    }
    assert.ok(result.lastBottom<=result.navTop-3,'Cards overlap the navigation');
    assert.ok(result.surpriseButtonHeight>=44,'Surprise touch target is too short');
    assert.ok(result.scroll<=2&&result.horizontal<=1,'Home does not fit: '+JSON.stringify(result));
    assert.ok(result.gap>=5.9,'Surprise and dashboard need a clear gap');
    if(name==='S25'&&kind==='unrolled')assert.ok(result.meshHeight>=145,'The approved Home requires a larger real die');
    if(name==='S25-tall'&&kind==='unrolled')assert.ok(result.meshHeight>measurements.find(m=>m.name==='S25'&&m.kind==='unrolled').meshHeight+2,'The taller stage must retain a larger die while preserving its breathing room');
    if(name==='small'&&kind==='long-unrolled'){
     await page.evaluate(()=>{window.__homeBeforeResize=document.querySelector('.home-die-platform canvas');});
     await page.setViewportSize({width:412,height:915});
     await page.waitForFunction(()=>getComputedStyle(document.querySelector('.home-bottom-stack')).zoom==='1');
     const larger=await measure(page);assert.ok(larger.lastBottom<=larger.navTop-3&&larger.scroll<=2);
     assert.ok(await page.evaluate(()=>window.__homeBeforeResize===document.querySelector('.home-die-platform canvas')),'Fitting replaced the real die');
     await page.setViewportSize({width,height});
     await page.waitForFunction(()=>document.querySelector('.home-stats-grid').getBoundingClientRect().bottom<=document.querySelector('.nav').getBoundingClientRect().top-3);
    }
    assert.deepEqual(errors,[]);console.log('HOME_TWO_COLUMNS_OK',name,kind,JSON.stringify({values:result.values,scroll:result.scroll,navigationGap:result.navTop-result.lastBottom,meshHeight:result.meshHeight,zoom:result.zoom}));
   }catch(error){failures.push({name,kind,error:error.message});}
   finally{await context.close();}
  }
 }finally{await browser.close();fs.writeFileSync('design-captures/home124-centering-measurements.json',JSON.stringify(measurements,null,2));}
 assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);process.exit(1)});
