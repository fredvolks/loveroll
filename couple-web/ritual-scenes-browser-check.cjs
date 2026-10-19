// Compare the real app's CSS geometry; the separate podium check exercises WebGL.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const create=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await create(options);
  await context.route('**/dice3d.js*',route=>route.fulfill({contentType:'application/javascript',body:'export function dieOn(){return ()=>{}}'}));
  return context;
 };
 const rect=async(page,selector)=>page.locator(selector).evaluate(e=>{
  const r=e.getBoundingClientRect(),s=getComputedStyle(e),scale=Math.max(r.width/1536,r.height/1024),percent=parseFloat(s.backgroundPositionY)/100;
  return {x:r.x,y:r.y,width:r.width,height:r.height,border:s.borderTop,color:s.borderTopColor,radius:s.borderTopLeftRadius,
   image:s.backgroundImage,size:s.backgroundSize,position:s.backgroundPosition,
   photoLeft:r.x+(r.width-1536*scale)/2,photoTop:r.y+(r.height-1024*scale)*percent,
   photoScale:scale,podiumY:r.y+(r.height-1024*scale)*percent+678*scale};
 });
 const close=(a,b,name)=>assert.ok(Math.abs(a-b)<.05,name+': '+a+' ≠ '+b);
 try{
  for(const [name,width,height] of [['small',360,640],['Android',360,704],['S25',412,824],['S25-tall',412,915],['iPhone',393,852],['iPad',820,1180],['tablet-wide',1024,1366],['PC',1366,768],['landscape',844,390],['landscape-small',740,360]]){
   const world=createWorld(),{page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=session'});
   try{
    await page.locator('.evening-finale-hero').waitFor();
    const reference=await rect(page,'.evening-finale-hero');
    await page.locator('.nav [data-action="tab:home"]').click();await page.locator('.home-die-theater').waitFor();
    const home=await rect(page,'.home-die-theater');
    for(const key of ['x','y','width'])close(home[key],reference[key],name+' Home '+key);
    for(const key of ['border','color','radius'])assert.equal(home[key],reference[key],name+' Home '+key);
    for(const phase of ['before','host','done']){
     const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
     world.rolls=phase==='before'?[]:[{id:'activity',couple_id:'c',kind:'monthly_activity',key:month,face:19,activity_title:'Activité officielle',activity_description:'Texte officiel.'},...(phase==='done'?[{id:'host',couple_id:'c',kind:'monthly_host',key:month,face:4}]:[])];
     if(phase==='before')await page.locator('.nav [data-action="tab:special"]').click();
     else await page.goto('http://127.0.0.1:8765/?actor=a&open=special');
     await page.locator('.surprise-main-die-scene').waitFor();
     const actual=await rect(page,'.surprise-main-die-scene');
     for(const key of ['x','y','width','height','photoLeft','photoTop','photoScale','podiumY'])close(actual[key],reference[key],name+' '+phase+' '+key);
     for(const key of ['border','color','radius','image','size','position'])assert.equal(actual[key],reference[key],name+' '+phase+' '+key);
     assert.equal(await page.locator('.surprise-main-die-scene .surprise-month-label').count(),1);
     assert.equal(await page.locator('.surprise-event-card').count(),6);
     assert.equal(await page.locator('.surprise-main-die-scene canvas').getAttribute('data-dice-sides'),phase==='host'?'6':'20');
     assert.deepEqual(errors,[]);
     console.log('RITUAL_SCENE_MATCH',name,phase,JSON.stringify({x:actual.x,y:actual.y,width:actual.width,height:actual.height,podiumY:actual.podiumY}));
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
