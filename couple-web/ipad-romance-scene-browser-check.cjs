// Real WebGL + actual app on tablet. No mock screenshot overlay can pass.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createWorld,setupEditorial}=require('./editorial-fixture.cjs');

(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
  '--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const [width,height] of [[820,1180],[1180,820]]){
   for(const step of ['inactive','waiting','ready']){
    const world=createWorld();world.profiles[0].display_name='Fred';
    world.profiles[1].display_name='Émilie';
    world.enableEveningD6=world.enableEveningDraw=true;
    if(step!=='inactive'){
     const {nextMonday}=await import('./premium-home.mjs');
     const monday=new Date(nextMonday()+'T12:00:00Z');
     monday.setUTCDate(monday.getUTCDate()-7);
     world.rolls=[{id:'weekly',couple_id:'c',kind:'weekly',
      key:monday.toISOString().slice(0,10),face:3,created_at:new Date(Date.now()-120000).toISOString()}];
     world.eveningSessions=[{id:'evening-test',couple_id:'c',
      started_at:new Date(Date.now()-60000).toISOString(),
      finished_at:null,paired_turns:true,self_draws:true,starting_user_id:'a'}];
    }
    if(step==='ready'){
     world.personalRolls=[
      {id:'d6-a',session_id:'evening-test',user_id:'a',face:2},
      {id:'d6-b',session_id:'evening-test',user_id:'b',face:3}
     ];
     world.board={ready:true,next:'a',first:'a',remaining:{a:2,b:3},
      targets:{a:2,b:3},completed:{a:0,b:0},drawn:{a:0,b:0},
      drawsFinished:false,finished:false};
    }
    const {page,context,errors}=await setupEditorial(browser,world,
     {width,height,query:'open=home',motion:'reduce'});
    try{
     await page.locator('.nav [data-action="tab:session"]').click();
     const hero=step==='inactive'?'.evening-finale-hero':
      step==='waiting'?'.evening-d6-theater':'.evening-d100-theater';
     await page.locator(hero+' canvas').waitFor({state:'attached',timeout:16000});
     if(step==='ready'){
      const debug=await page.evaluate(selector=>{
       const all=['#app','.evening-premium-view','.evening-step.two','.evening-choice','.evening-d100-theater','.evening-d35-col','.evening-d35-col>.love3d','.evening-d35-col .love3d-stage','.evening-d100-theater canvas'];
       return all.map(q=>{
        const n=document.querySelector(q),r=n?.getBoundingClientRect(),c=n&&getComputedStyle(n);
        return {selector:q,rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,
         display:c?.display,visibility:c?.visibility,opacity:c?.opacity,
         overflow:c?.overflow,gridRow:c?.gridRow,gridRows:c?.gridTemplateRows,
         gridColumns:c?.gridTemplateColumns,position:c?.position};
       });
      },hero);
      console.log('IPAD_D100_LAYOUT_DEBUG',width,height,JSON.stringify(debug));
     }
     await page.locator(hero+' canvas').waitFor({state:'visible',timeout:12000});
     await page.waitForFunction(selector=>
       !!document.querySelector(selector+' canvas')?.loveRollDie?.projectedBounds,
       hero,{timeout:20000});
     const scene=await page.evaluate(selector=>{
      const root=document.querySelector('#app'),photo=getComputedStyle(root,'::before'),
       after=getComputedStyle(root,'::after'),theater=document.querySelector(selector),
       theaterStyle=getComputedStyle(theater),canvas=theater.querySelector('canvas'),
       bounds=canvas.loveRollDie.projectedBounds(),rect=canvas.getBoundingClientRect(),
       marker=theater.querySelector('.home-pedestal-contact'),
       plinth=theater.querySelector('.home-pedestal,.soiree-pedestal-marker'),
       markerRect=marker?.getBoundingClientRect();
      return {rootClass:root.className,photo:photo.backgroundImage,after:after.display,
       backdrop:theaterStyle.backgroundImage,border:theaterStyle.borderTopWidth,
       frame:theaterStyle.borderTopLeftRadius,
       pedestalMarker:!!marker,pedestalCount:theater.querySelectorAll('.home-pedestal,.soiree-pedestal-marker').length,
       markerWidth:plinth?.getBoundingClientRect().width,markerHeight:plinth?.getBoundingClientRect().height,
       markerVisible:plinth&&getComputedStyle(plinth).display!=='none',
       contact:markerRect?.top,meshTop:rect.top+bounds.top*rect.height,meshBottom:rect.top+bounds.bottom*rect.height,heroTop:theater.getBoundingClientRect().top,
       meshCenter:rect.left+(bounds.left+bounds.right)*rect.width/2,
       appWidth:root.getBoundingClientRect().width,
       scrollX:document.documentElement.scrollWidth-innerWidth,
       scrollY:document.documentElement.scrollHeight-innerHeight,
       result:canvas.dataset.face,webgl:canvas.dataset.webglReady,
       stageWidth:rect.width,stageHeight:rect.height,
       header:document.querySelector('.evening-intro')?.getBoundingClientRect().bottom,
       nav:document.querySelector('.nav')?.getBoundingClientRect().top};
     },hero);
     assert.ok(scene.photo.includes('loveroll-home-portrait-v202.webp'),
      'The iPad MUST use Android\u2019s same approved HD photo: '+JSON.stringify(scene));
     assert.equal(scene.after,'none','Two layered photographs must not be painted');
     assert.equal(scene.backdrop,'none','No frame may carry its own second photo');
     assert.equal(scene.border,'0px','No frame around the WebGL scene');
     assert.equal(scene.pedestalCount,1,'Only ONE pedestal anchor per die');
     assert.equal(scene.markerVisible,true,'Real WebGL must see its marble anchor');
     assert.equal(scene.markerWidth,0,'The marker cannot draw a second podium');
     assert.equal(scene.markerHeight,0,'The marker cannot draw a second podium');
     assert.ok(scene.meshTop>=Math.max(scene.header+4,scene.heroTop+2),
      'The complete real D6/D100 must be visible BELOW the header and inside its hero: '+JSON.stringify(scene));
     assert.ok(scene.meshBottom-scene.meshTop>130,
      'The photographed D6/D100 cannot be shrunk to a tiny tablet icon: '+JSON.stringify(scene));
     assert.ok(Math.abs(scene.meshBottom-scene.contact)<4,
      'Die must meet original photographed marble plane: '+JSON.stringify(scene));
     assert.ok(Math.abs(scene.meshCenter-width/2)<7,
      'Die must sit centered on the single photo marble');
     assert.ok(scene.stageWidth>140&&scene.stageHeight>140,'Real 3D die must remain visible');
     assert.equal(scene.webgl,'true');
     assert.ok(scene.scrollX<=2&&scene.scrollY<=2,'No tablet horizontal/vertical scrolling');
     assert.deepEqual(errors,[]);
     console.log('IPAD_ROMANCE_SCENE_OK',step,width,height,JSON.stringify(scene));
     fs.mkdirSync('design-captures',{recursive:true});
     await page.screenshot({path:path.join('design-captures',
      'ipad-romance-'+step+'-'+width+'x'+height+'.png')});
    }finally{await context.close();}
   }
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
