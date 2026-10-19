// Optical regression: a real refraction pass must react to the photographed
// background, while the recessed white marks remain opaque. Canvas alpha alone
// cannot prove this: transmitted pixels already include their sampled backdrop.
const assert=require('node:assert/strict');

function glassState(canvas){
 const state=canvas.loveRollDie.readState(),optics=state.optics;
 if(!optics?.loaded)throw Error('The physical glass has no loaded photographic backdrop');
 canvas.loveRollDie.refresh();
 const gl=canvas.getContext('webgl2');if(!gl)throw Error('Real WebGL2 is required');
 const b=canvas.loveRollDie.projectedBounds(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
 const x=Math.ceil(b.left*w),y=Math.ceil((1-b.bottom)*h),width=Math.floor((b.right-b.left)*w),height=Math.floor((b.bottom-b.top)*h);
 const pixels=new Uint8Array(width*height*4);gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 const corner=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,corner);
 if(gl.getError()!==gl.NO_ERROR)throw Error('Glass readPixels failed');
 let white=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>205&&pixels[i+1]>205&&pixels[i+2]>205&&pixels[i+3]===255)white++;
 return {optics,white,area:width*height,outsideAlpha:corner[3],frontFace:state.frontFace};
}

async function verifyCrystalMaterials(browser){
 const context=await browser.newContext({viewport:{width:720,height:620},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];
 await context.route('http://127.0.0.1:8765/__crystal-test.html*',route=>{
  const url=new URL(route.request().url()),sides=Number(url.searchParams.get('sides')),face=sides===100?100:sides===35?35:sides===20?12:6;
  return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{margin:0;background:#100307}.scene{width:640px;height:480px;background:url('./assets/ritual-satin-v115.webp') center 62%/cover;display:grid;place-items:center}.love3d-stage,canvas{display:block;width:400px;height:400px}</style></head><body><div class="scene"><div class="love3d-stage"><canvas data-dice-sides="${sides}" data-face="${face}" data-dice-markers="pips"></canvas></div></div><script type="module">import {dieOn} from './dice3d.js'; const c=document.querySelector('canvas');window.cleanup=dieOn(c,${sides},${face},false);</script></body></html>`});
 });
 await context.route('http://127.0.0.1:8765/__crystal-background-*.svg',route=>{
  const first=route.request().url().includes('-a.svg'),a=first?'#15efef':'#ef3615',b=first?'#026292':'#841502';
  return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="${a}"/><path d="M0 0H320V240H640V480H320V240H0Z" fill="${b}"/></svg>`});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 try{
  for(const sides of [6,20,35,100]){
   await page.goto('http://127.0.0.1:8765/__crystal-test.html?sides='+sides);
   await page.waitForFunction(()=>document.querySelector('canvas')?.loveRollDie?.readState().optics.loaded);
   const canvas=page.locator('canvas'),initial=await canvas.evaluate(glassState);
   assert.equal(initial.optics.transmission,1);assert.ok(initial.optics.roughness<.05);
   assert.equal(initial.optics.inkOpacity,1);assert.equal(initial.optics.inkTransparent,false);
   assert.equal(initial.optics.engravings.length,sides);
   assert.ok(initial.optics.engravings.every(e=>e.depth>0),'Every mark must sit below its face');
   assert.ok(initial.optics.engravings.every(e=>e.clearance>=.0119),'Engraving must fit inside its own face, including result 100');
   if(sides===6){assert.equal(initial.optics.engravings.reduce((sum,e)=>sum+e.marks,0),21);assert.ok(initial.optics.engravings.every(e=>e.depth>=.04));}
   assert.ok(initial.white>12,'Opaque white inlays must appear in the actual framebuffer');
   assert.equal(initial.outsideAlpha,0,'The refraction backdrop must remain invisible outside the die');
   const q=await canvas.evaluate(c=>c.loveRollDie.readState().quaternion);
   const readPixels=()=>canvas.evaluate(c=>{
    c.loveRollDie.refresh();const gl=c.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,b=c.loveRollDie.projectedBounds();
    const x=Math.ceil((b.left*.8+b.right*.2)*w),y=Math.ceil((1-b.bottom*.8-b.top*.2)*h),width=Math.floor((b.right-b.left)*w*.6),height=Math.floor((b.bottom-b.top)*h*.6);
    const data=new Uint8Array(width*height*4);gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
    if(gl.getError()!==gl.NO_ERROR)throw Error('Optical probe failed');return [...data];
   });
   const snapshots=[];
   for(const variant of ['a','b']){
    await page.locator('.scene').evaluate((el,v)=>{el.style.backgroundImage='url("/__crystal-background-'+v+'.svg")';document.querySelector('canvas').loveRollDie.refresh();},variant);
    await page.waitForFunction(v=>{const optics=document.querySelector('canvas').loveRollDie.readState().optics;return optics.loaded&&optics.source.endsWith('-'+v+'.svg');},variant);
    snapshots.push(await readPixels());
   }
   let responding=0,fixedWhite=0;
   for(let i=0;i<snapshots[0].length;i+=4){
    const a=snapshots[0],b=snapshots[1];
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)responding++;
    if([a[i],a[i+1],a[i+2],b[i],b[i+1],b[i+2]].every(v=>v>205)&&a[i+3]===255&&b[i+3]===255)fixedWhite++;
   }
   assert.ok(responding/(snapshots[0].length/4)>.1,'The actual glass must refract the changed background');
   assert.ok(fixedWhite>4,'White engraving must remain opaque when the background changes');
   assert.deepEqual(await canvas.evaluate(c=>c.loveRollDie.readState().quaternion),q,'Optical refresh must not rotate the official result');
   console.log('CRYSTAL_OPTICS_OK',JSON.stringify({sides,frontFace:initial.frontFace,white:initial.white,responding,fixedWhite}));
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
}

module.exports={glassState,verifyCrystalMaterials};
if(require.main===module){
 const {chromium}=require('playwright');
 (async()=>{const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{await verifyCrystalMaterials(browser);}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
}
