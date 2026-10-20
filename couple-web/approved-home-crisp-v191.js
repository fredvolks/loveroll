/* LoveRoll 191 — high-density, sharpened, proportion-correct approved Home.
   Visual only. Never changes dice, odds, accounts, Supabase or live data. */
(()=>{
 'use strict';
 const app=document.getElementById('app');
 if(!app)return;
 const img=new Image();
 img.decoding='async';
 img.src=new URL('./assets/home-reference-approved-v190.webp',document.baseURI).href;
 let scheduled=false,last='',running=false;
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 const eligible=()=>app.classList.contains('approved-home-idle');
 function render(){
  if(!eligible()||!img.naturalWidth||running)return;
  const rect=app.getBoundingClientRect();
  const w=Math.round(rect.width*Math.min(2,window.devicePixelRatio||1));
  const h=Math.round(rect.height*Math.min(2,window.devicePixelRatio||1));
  if(w<100||h<200||w*h>4200000)return;
  const key=w+'x'+h;
  if(key===last)return;
  running=true;
  try{
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   if(!ctx)return;
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   const sw=img.naturalWidth,sh=img.naturalHeight;
   // Keep everything above the dashboard unchanged. Move the NAV photo,
   // not just the invisible button hitboxes, down to Soirée's bottom height.
   const strips=[[0,.877,0,.877],[.877,.899,.877,.915],
     [.899,.974,.915,.990],[.974,1,.990,1]];
   for(const [s0,s1,d0,d1] of strips){
    ctx.drawImage(img,0,sh*s0,sw,sh*(s1-s0),
      0,h*d0,w,h*(d1-d0));
   }
   // The master was stretched vertically by narrow Android viewports.
   // Correct only the hero D6 width; ease to 0 at top/bottom so velvet
   // joins without a hard rectangular photo edge or a second die.
   const start=Math.floor(h*.17),end=Math.ceil(h*.39);
   const band=Math.max(3,Math.round(h/320));
   for(let y=start;y<end;y+=band){
    const bottom=Math.min(end,y+band),mid=(y+bottom)/(2*h);
    const amount=smooth(.17,.218,mid)*(1-smooth(.35,.39,mid));
    if(amount<.001)continue;
    const x0=(.345-.016*amount)*w,x1=(.655+.016*amount)*w;
    const sy=(y/h)*sh,srcH=((bottom-y)/h)*sh;
    const cols=[[0,.345*sw,0,x0],[.345*sw,.31*sw,x0,x1-x0],
      [.655*sw,.345*sw,x1,w-x1]];
    for(const [sx,sourceW,dx,destW] of cols)
     ctx.drawImage(img,sx,sy,sourceW,srcH,dx,y,destW,bottom-y);
   }
   // Mild high-frequency sharpening after final DPR-aware resampling:
   // restores edge definition of white captions and beveled ruby edges.
   const pixels=ctx.getImageData(0,0,w,h);
   const d=pixels.data,src=new Uint8ClampedArray(d);
   const stride=w*4;
   for(let y=1;y<h-1;y++){
    const base=y*stride;
    for(let x=1;x<w-1;x++){
     const i=base+x*4;
     const hero=y/h>.17&&y/h<.38;
     const gain=hero?.185:.16;
     for(let c=0;c<3;c++){
      const detail=4*src[i+c]-src[i-4+c]-src[i+4+c]
       -src[i-stride+c]-src[i+stride+c];
      let v=src[i+c];
      if(Math.abs(detail)>11)v+=gain*detail;
      d[i+c]=Math.max(0,Math.min(255,(v-127.5)*1.028+127.5));
     }
    }
   }
   ctx.putImageData(pixels,0,0);
   // PNG preserves crisp text; WebP 0.95 is used to reduce WebView memory.
   let uri=canvas.toDataURL('image/webp',.95);
   if(!uri.startsWith('data:image/'))uri=canvas.toDataURL('image/png');
   app.style.setProperty('--loveroll-home-crisp-image','url("'+uri+'")');
   last=key;
  }catch(error){
   console.warn('LoveRoll sharp Home: approved original kept',error);
  }finally{running=false;}
 }
 const queue=()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;render();});
 };
 img.addEventListener('load',queue);
 img.addEventListener('error',()=>console.warn('LoveRoll: sharp reference unavailable, using approved original'));
 if(img.complete&&img.naturalWidth)queue();
 new MutationObserver(()=>{if(eligible())queue();}).observe(app,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',()=>{last='';queue();},{passive:true});
 window.addEventListener('orientationchange',()=>{last='';queue();},{passive:true});
 queue();
})();
