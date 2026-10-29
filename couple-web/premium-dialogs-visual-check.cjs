const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const [name,width,height] of [['Compact-320',320,568],['Compact-Android',360,700],['S25-Ultra',412,915],['iPad-Portrait',820,1180],['Desktop',1440,900]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/__premium-dialogs-test.html',{waitUntil:'load'});
  await page.click('#gift');
  const d=page.getByRole('alertdialog');
  await d.waitFor();
  if(!await d.getByText('Offrir 1 défi ?').isVisible())throw Error('Gift dialog missing');
  const dims=await d.evaluate(el=>{
   const r=el.getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  if(dims.left<0||dims.right>width+1||dims.top<0||dims.bottom>height+1)throw Error('Dialog clipped '+name+' '+JSON.stringify(dims));
  // The close affordance is a genuine 44px target on every device, not a
  // tiny icon disguised by large padding or a clipped control.
  const close=d.getByRole('button',{name:'Fermer'});
  const closeBox=await close.boundingBox();
  if(!closeBox||closeBox.width<44||closeBox.height<44||
    closeBox.x<dims.left-1||closeBox.y<dims.top-1||
    closeBox.x+closeBox.width>dims.right+1||closeBox.y+closeBox.height>dims.bottom+1)
   throw Error('Close target is undersized or clipped '+name+' '+JSON.stringify({closeBox,dims}));
  const cancel=d.getByRole('button',{name:'Annuler'});
  if(!await cancel.evaluate(el=>document.activeElement===el))
   throw Error('Safe cancellation must have initial keyboard focus on '+name);
  await page.keyboard.press('Tab');
  if(!await close.evaluate(el=>document.activeElement===el))
   throw Error('Tab must stay inside the modal and wrap to close on '+name);
  await page.keyboard.press('Shift+Tab');
  if(!await cancel.evaluate(el=>document.activeElement===el))
   throw Error('Shift+Tab must remain trapped inside the modal on '+name);
  await page.screenshot({path:'landing-captures/'+name+'-CONFIRMATION-CADEAU-v52.png'});
  await d.getByRole('button',{name:'Annuler'}).click();
  if(await page.locator('#test-result').innerText()!=='cadeau annulé')throw Error('Cancel should not gift');
  if(!await page.locator('#gift').evaluate(el=>document.activeElement===el))
   throw Error('Gift trigger should regain focus after cancel on '+name);
  await page.click('#gift');
  await page.getByRole('alertdialog').getByRole('button',{name:'Fermer'}).click();
  if(await page.locator('#test-result').innerText()!=='cadeau annulé')
   throw Error('Closing gift modal must not confirm a gift on '+name);
  if(!await page.locator('#gift').evaluate(el=>document.activeElement===el))
   throw Error('Close button should restore focus to original trigger on '+name);
  await page.click('#couple');
  await page.getByRole('alertdialog').getByText('Dissocier notre couple ?').waitFor();
  await page.keyboard.press('Escape');
  if(await page.locator('#test-result').innerText()!=='dissociation annulée')throw Error('Escape should cancel unlink');
  if(!await page.locator('#couple').evaluate(el=>document.activeElement===el))
   throw Error('Escape must restore focus without unlinking on '+name);
  await page.click('#result');
  // Notifications flottantes supprimées sur demande : même un ancien
  // conteneur de toast doit rester invisible après une action de jeu.
  const toast=page.locator('#toast');
  if(await toast.count()&&await toast.isVisible())
   throw Error('An obsolete top toast became visible on '+name);
  await page.screenshot({path:'landing-captures/'+name+'-SANS-BANNIERE-v91.png'});
  if(errors.length)throw Error(name+' JS errors '+errors.join(','));
  console.log(name+' confirmation dialogs OK without floating notifications',JSON.stringify({dims}));
  await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
