// Touch and official throw on the production Home, with synthetic accounts only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LOVEROLL_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const originalContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await originalContext(options);
  if(process.env.LOVEROLL_THREE_DIR)await context.route('https://esm.sh/three@0.167.1**',route=>{
   const name=new URL(route.request().url()).pathname.replace('/three@0.167.1','');
   const source=fs.readFileSync(path.join(process.env.LOVEROLL_THREE_DIR,name||'build/three.module.js'),'utf8').replaceAll("from 'three'","from 'https://esm.sh/three@0.167.1'");
   return route.fulfill({contentType:'application/javascript',body:source});
  });
  return context;
 };
 try{
  const world=createWorld();
  const {page,context,errors}=await setupEditorial(browser,world,{width:412,height:824,query:'open=home',motion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.loveRollDie?.readState().optics.loaded);
  const read=()=>page.evaluate(()=>document.querySelector('.home-die-platform canvas').loveRollDie.readState());
  const initial=await read();
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,'ruby-resting.png')});
  await page.evaluate(()=>window.__originalRuby=document.querySelector('.home-die-platform canvas'));
  const touch=await context.newCDPSession(page);
  const drag=async(dx,dy)=>{
   const center=await page.evaluate(()=>{
    const c=document.querySelector('.home-die-platform canvas'),r=c.getBoundingClientRect(),b=c.loveRollDie.projectedBounds();
    return {x:r.left+(b.left+b.right)*r.width/2,y:r.top+(b.top+b.bottom)*r.height/2};
   });
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:1}]});
   for(let step=1;step<=5;step++){
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+dx*step/5,y:center.y+dy*step/5,id:1}]});
    await page.waitForTimeout(25);
   }
   const held=await read();
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(900);
   return {held,released:await read()};
  };
  const changed=(a,b)=>Math.abs(a.quaternion.reduce((sum,v,i)=>sum+v*b.quaternion[i],0))<.995;
  const flat=state=>{
   assert.ok(state.restingUp[1]>.999999,'A face must remain flat on the horizontal support plane');
   assert.ok(Math.abs(state.support.y-initial.support.y)<.1,'Dragging must not lift or lower the die');
  };
  const horizontal=await drag(70,40);
  assert.ok(changed(initial,horizontal.held),'A finger swipe must visibly turn the model');
  for(const state of [horizontal.held,horizontal.released]){flat(state);assert.equal(state.face,initial.face);assert.equal(state.modelId,initial.modelId);}
  const vertical=await drag(0,65);
  assert.ok(!changed(horizontal.released,vertical.held),'A vertical swipe must not tip the die');
  flat(vertical.held);
  assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,0,'Inspection must never draw a result');
  await page.route('**/__editorial-api',async route=>{
   const req=JSON.parse(route.request().postData());
   if(req.name!=='roll_couple_once')return route.fallback();
   world.calls.push(req);
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const monday=new Date(day+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
   const result={id:'ruby-official',couple_id:'c',kind:'weekly',key:monday.toISOString().slice(0,10),face:5,actor:'a',created_at:new Date().toISOString()};
   world.rolls.push(result);
   await page.waitForTimeout(180);
   await route.fulfill({contentType:'application/json',body:JSON.stringify({data:result,error:null})});
  });
  await page.locator('.home-roll-button').click();
  await page.locator('.lr-dialog-accept').click();
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.dataset.spinning==='true');
  const rolling=await read();
  assert.equal(rolling.modelId,initial.modelId,'The throw must animate the inspected model');
  // A single frame at 400ms can coincide with a near-identical quaternion
  // during multiple simultaneous full turns. Check real rendered motion over
  // several samples instead; a genuinely frozen mesh still fails.
  let moved=false,advancedFrames=false;
  for(let sample=0;sample<12;sample++){
   await page.waitForTimeout(130);
   const current=await read();
   assert.equal(current.modelId,initial.modelId,'The animation must retain the same WebGL mesh');
   if(changed(rolling,current))moved=true;
   if(current.renderedFrames>rolling.renderedFrames+1)advancedFrames=true;
  }
  assert.ok(advancedFrames,'The official roll must render new WebGL frames');
  assert.ok(moved,'The same geometry must visibly tumble during the throw');
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,'ruby-throw.png')});
  await page.waitForSelector('.home-roll-button.is-used',{timeout:12000});
  await page.waitForFunction(()=>document.querySelector('.home-die-platform canvas')?.dataset.spinning==='false');
  const final=await read();
  if(process.env.LOVEROLL_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.LOVEROLL_CAPTURE_DIR,'ruby-official-result.png')});
  assert.equal(final.modelId,initial.modelId,'The final refresh must preserve the same model');
  assert.equal(await page.evaluate(()=>window.__originalRuby===document.querySelector('.home-die-platform canvas')),true);
  assert.equal(final.face,5);assert.equal(final.frontFace,5);flat(final);
  const afterRoll=await drag(60,-35);
  assert.ok(changed(final,afterRoll.held),'Finger inspection must still work after the official roll');
  assert.equal(afterRoll.released.face,5);flat(afterRoll.released);
  assert.equal(world.calls.filter(c=>c.name==='roll_couple_once').length,1);
  assert.equal(await page.locator('.home-roll-button').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('HOME_RUBY_TOUCH_OK: flat yaw before/after roll, one model, one official result');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
