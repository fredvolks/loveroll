// Real Three.js/WebGL faces, no DOM overlay and no simulated numeric result.
// Run with the same local server and Playwright installation as other browser checks.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 fs.mkdirSync('design-captures',{recursive:true});
 try{
  const viewports=[['phone',360,700],['tablet',820,1180],['desktop',1366,768]];
  for(const [name,width,height] of viewports)for(const config of [
   {kind:'D6',page:'evening-idle',sides:'6',faces:[1,2,3,4,5,6],capture:2},
   {kind:'D100',page:'evening',sides:'100',faces:[1,2,9,10,27,47,64,88,99,100],capture:47}
  ]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   try{
    await page.goto('http://127.0.0.1:8765/__premium-couple-pages-test.html?page='+config.page+'&face=47');
    await page.waitForFunction(sides=>[...document.querySelectorAll('canvas[data-dice-sides]')]
     .some(c=>c.dataset.diceSides===sides&&!!c.loveRollDie?.settleTo),config.sides);
    const rows=await page.evaluate(({sides,faces})=>{
     const c=[...document.querySelectorAll('canvas[data-dice-sides]')]
      .find(c=>c.dataset.diceSides===sides);
     return faces.map(n=>{
      const ok=c.loveRollDie.settleTo(n),state=c.loveRollDie.readState();
      return {n,ok,face:state.face,front:state.frontFace,
       facing:state.faceFacing,upright:state.engravingUpright,
       supported:c.getBoundingClientRect().width>0};
     });
    },{sides:config.sides,faces:config.faces});
    for(const row of rows){
     assert.ok(row.ok&&row.supported,name+' '+config.kind+': model hidden or missing '+JSON.stringify(row));
     assert.equal(row.face,row.n);
     assert.equal(row.front,row.n,'Wrong physical face '+JSON.stringify(row));
     assert.ok(row.facing>.93,'Result not facing the camera '+JSON.stringify({name,kind:config.kind,row}));
     assert.ok(row.upright>.93,'Number/engraving not upright '+JSON.stringify({name,kind:config.kind,row}));
    }
    await page.evaluate(({sides,n})=>[...document.querySelectorAll('canvas[data-dice-sides]')]
     .find(c=>c.dataset.diceSides===sides).loveRollDie.settleTo(n),
     {sides:config.sides,n:config.capture});
    await page.waitForTimeout(350);
    const first=await page.evaluate(sides=>[...document.querySelectorAll('canvas[data-dice-sides]')]
      .find(c=>c.dataset.diceSides===sides).loveRollDie.readState(),config.sides);
    await page.evaluate(sides=>[...document.querySelectorAll('canvas[data-dice-sides]')]
      .find(c=>c.dataset.diceSides===sides).loveRollDie.refresh(),config.sides);
    const refreshed=await page.evaluate(sides=>[...document.querySelectorAll('canvas[data-dice-sides]')]
      .find(c=>c.dataset.diceSides===sides).loveRollDie.readState(),config.sides);
    assert.deepEqual(refreshed.quaternion,first.quaternion,
     'Refreshing the view changed the winning face orientation');
    await page.screenshot({path:'design-captures/face-readability-after-'+name+'-'+config.kind+'.png'});
    console.log('FACE_READABILITY_OK',name,config.kind,JSON.stringify(rows));
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
