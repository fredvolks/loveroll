const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:360,height:700},{width:393,height:780},{width:412,height:824},{width:820,height:1180}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   await page.goto('http://127.0.0.1:8765/__settings-picker-test.html',{waitUntil:'load'});
   await page.waitForFunction(()=>window.__fixtureReady===true);
   for(const [which,label,options] of [['gender','Mon genre',['Homme','Femme']],['style','Mon style de jeu',['Soft','Medium','Intense']]]){
    await page.locator('#test-'+which).locator('xpath=..').locator('.lr-premium-picker-trigger').click();
    const layout=await page.evaluate(()=>{
     const dialog=document.querySelector('dialog.lr-premium-picker-dialog[open]');
     const card=dialog?.querySelector('.lr-premium-picker-card'),h=dialog?.querySelector('h2');
     const bounds=card?.getBoundingClientRect(),t=h?.getBoundingClientRect();
     return {title:h?.textContent,optionNames:[...dialog?.querySelectorAll('.lr-picker-choice')||[]].map(z=>z.textContent),
      centerError:bounds?Math.abs((bounds.top+bounds.bottom)/2-innerHeight/2):999,
      fits:!!bounds&&bounds.width>250&&bounds.left>=-1&&bounds.right<=innerWidth+1&&
        bounds.top>=-1&&bounds.bottom<=innerHeight+1,
      titleFits:!!t&&t.right<=bounds.right-32,
      scrollWidth:document.documentElement.scrollWidth,screen:innerWidth};
    });
    if(layout.title!==label||JSON.stringify(layout.optionNames)!==JSON.stringify(options)||
       !layout.fits||!layout.titleFits||layout.centerError>3||layout.scrollWidth>layout.screen+2)
     throw Error(JSON.stringify({viewport,which,layout}));
    await page.getByRole('button',{name:options.at(-1),exact:true}).click();
    const result=await page.locator('#test-'+which).inputValue();
    if(result!==(which==='gender'?'her':'intense')||await page.locator('dialog.lr-premium-picker-dialog[open]').count())
     throw Error('Picker did not update native select '+which);
   }
   console.log('LOVEROLL_PICKER_CENTER_OK',viewport.width+'x'+viewport.height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error('LOVEROLL_PICKER_FAILED',err);process.exit(1);});
