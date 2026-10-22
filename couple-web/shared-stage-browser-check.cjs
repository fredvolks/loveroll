const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const [width,height] of [[360,640],[412,824],[393,852]]){
  const world=createWorld();world.enableEveningD6=true;world.personalRolls=[];
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const monday=new Date(today+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:6}];
  world.eveningSessions=[{id:'evening-test',couple_id:'c',started_at:new Date(Date.now()-60000).toISOString(),finished_at:null,paired_turns:true,self_draws:true}];
  const {page,context,errors}=await setupEditorial(browser,world,{width,height,query:'open=session'});
  await page.locator('.evening-d6-theater').waitFor();
  const stage=()=>page.locator('#app').evaluate(root=>{
   const before=getComputedStyle(root,'::before'),after=getComputedStyle(root,'::after');
   return {top:[before.top,before.height,before.backgroundImage,before.backgroundSize,before.backgroundPosition],bottom:[after.top,after.bottom,after.backgroundImage,after.backgroundSize,after.backgroundPosition],contact:root.querySelector('.home-pedestal-contact')?.getBoundingClientRect().top};
  });
  const evening=await stage();await page.locator('.nav [data-action="tab:special"]').click();await page.locator('.surprise-minimal').waitFor();
  const surprise=await stage();assert.deepEqual(surprise,evening,'Photograph and pedestal must occupy identical viewport coordinates');assert.deepEqual(errors,[]);
  console.log('SHARED_STAGE_OK',width,height);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
