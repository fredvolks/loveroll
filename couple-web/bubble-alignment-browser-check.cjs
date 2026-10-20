/* Visual regression: real bubbles, precise x/y geometric alignment.
 * This test never calls Supabase or modifies game state.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const sizes=[{width:360,height:700},{width:393,height:780},{width:820,height:1180},{width:1180,height:820}];
 try{
  for(const viewport of sizes)for(const mode of ['home','advent','evening']){
   const page=await browser.newPage({viewport});
   try{
    const response=await page.goto('http://127.0.0.1:8765/__bubble-alignment-test.html?mode='+mode,{waitUntil:'load'});
    assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.__fixtureReady===true,{timeout:15000});
    const m=await page.evaluate(mode=>{
     const box=x=>x.getBoundingClientRect();
     const center=x=>{const b=box(x);return {x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,rect:b};};
     const mids=[];
     const lines=el=>{
      const range=document.createRange();range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r=>r.width>0.5&&r.height>0.5).map(r=>({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,width:r.width}));
     };
     const testCopy=(parent,els,type)=>{
      const ref=center(parent);
      for(const el of els)for(const line of lines(el))mids.push({type,errorX:Math.abs(line.x-ref.x),text:el.textContent.slice(0,70),lineWidth:line.width,containerWidth:ref.rect.width});
     };
     const ret={mode,mids,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,errors:[]};
     if(mode==='home'){
      const gift=document.querySelector('.home-next-month'),text=gift?.querySelector('span:nth-child(2)');
      ret.present=!!gift&&!!text;
      if(!ret.present)return ret;
      testCopy(gift,[...text.querySelectorAll('small,strong,em')],'surprise-center');
      for(const el of gift.querySelectorAll('.home-calendar-icon,.home-gift-icon')){
       ret.errors.push({type:'gift-icon-height',diff:Math.abs(center(el).y-center(gift).y)});
      }
      const dash=document.querySelector('.home-dashboard');
      ret.navGap=box(document.querySelector('.nav')).top-box(dash).bottom;
      ret.panels=[...document.querySelectorAll('.home-panel')].map(el=>({top:box(el).top,bottom:box(el).bottom}));
      for(const card of document.querySelectorAll('.home-stat-card,.home-challenge-stats>div'))
       testCopy(card,[...card.querySelectorAll('strong,small')],'stat-or-summary');
      ret.rows=document.querySelectorAll('.home-stat-card').length;
     }else if(mode==='advent'){
      const envelope=[...document.querySelectorAll('.advent-envelope')];
      ret.envelopes=envelope.length;
      ret.locks=envelope.map((env,i)=>{
       const seal=env.querySelector('.advent-seal'),num=env.querySelector('.advent-box-number');
       const a=center(env),b=center(seal),n=box(num),k=box(seal);
       const overlapX=Math.max(0,Math.min(n.right,k.right)-Math.max(n.left,k.left));
       const overlapY=Math.max(0,Math.min(n.bottom,k.bottom)-Math.max(n.top,k.top));
       return {day:i+1,offsetX:Math.abs(a.x-b.x),offsetY:Math.abs(a.y-b.y),overlap:overlapX*overlapY};
      });
      const labels=[...document.querySelectorAll('.advent-state-label')];
      for(const label of labels)testCopy(label,[label],'advent-state');
     }else if(mode==='evening'){
      const segment=document.querySelector('.evening-intro .ritual-mode-switcher');
      const hero=document.querySelector('.evening-finale-hero');
      const buttons=segment?.querySelectorAll('button')||[];
      ret.eclat=!!segment&&buttons.length===2&&buttons[1].dataset.action==='tab:eclat';
      ret.duplicateHeader=!!document.querySelector('.evening-finale-hero button.eclat-evening-entry');
      if(segment&&hero){
       const rect=box(segment),title=box(document.querySelector('.evening-intro .ritual-page-title')),photo=box(hero);
       ret.eclatBounds={width:rect.width,height:rect.height,left:rect.left,right:rect.right};
       ret.eclatInside=rect.width>=175&&rect.height>=35&&rect.left>=photo.left-1&&
        rect.right<=photo.right+1&&rect.top>=title.bottom-1&&rect.bottom<=photo.top+2;
      }
     }
     return ret;
    },mode);
    assert.ok(m.horizontalOverflow<=2,'Horizontal overflow: '+JSON.stringify({viewport,mode,m}));
    if(mode==='home'){
      assert.equal(m.present,true);
      assert.equal(m.rows,4);
      // Navigation-space is validated in the full authenticated-app tests, not this minimal fixture.
      assert.ok(Math.abs(m.panels[0].top-m.panels[1].top)<2,'Home panel tops differ');
      assert.ok(Math.abs(m.panels[0].bottom-m.panels[1].bottom)<2,'Home panel bottoms differ');
      for(const x of m.mids)assert.ok(x.errorX<=2.2,'Home text off bubble center: '+JSON.stringify({viewport,x}));
      for(const x of m.errors)assert.ok(x.diff<=2,'Home icon off bubble center: '+JSON.stringify({viewport,x}));
    }
    if(mode==='advent'){
      assert.equal(m.envelopes,25);
      for(const x of m.locks)assert.ok(x.offsetX<=1.1&&x.offsetY<=1.1&&x.overlap<=1,'Lock/date misaligned: '+JSON.stringify({viewport,x}));
      for(const x of m.mids)assert.ok(x.errorX<=2,'Advent state misaligned: '+JSON.stringify({viewport,x}));
    }
    if(mode==='evening'){
      assert.equal(m.eclat,true,'Soirée has no visible Éclat invitation in its hero');
      assert.equal(m.duplicateHeader,false,'Duplicate Éclat shortcut in the header');
      assert.equal(m.eclatInside,true,'Éclat selector must stay between fixed title and photograph: '+JSON.stringify({viewport,m}));
    }
    console.log('BUBBLE_PREMIUM_CENTER_OK',viewport.width+'x'+viewport.height,mode);
   }finally{await page.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('BUBBLE_PREMIUM_CENTER_FAILED',e);process.exitCode=1;});
