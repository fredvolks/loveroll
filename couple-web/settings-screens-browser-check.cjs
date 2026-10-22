const {chromium}=require('playwright'),{createWorld,setupEditorial}=require('./editorial-fixture.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [width,height] of [[360,640],[412,824],[393,852],[820,1180],[1366,768]]){
 const world=createWorld();const {page,context,errors}=await setupEditorial(browser,world,{width,height});
 for(const section of ['compte','couple','notifications','jeu','confidentialite','monde','application','aide-connexion','aide-des','aide-sync','admin']){
 if(section==='admin'||section.startsWith('aide-')){await page.locator('[data-action="settings-page:'+(section==='admin'?'jeu':'application')+'"]').click();await require('./settings-test-navigation.cjs').revealSetting(page,'[data-action="settings-page:'+section+'"]');}
 await page.locator('[data-action="settings-page:'+section+'"]').click();
 await page.waitForTimeout(100);let visited=0;
 do{
 const g=await page.locator('.settings-detail-body').evaluate(el=>({overflow:el.scrollHeight-el.clientHeight,height:el.clientHeight,text:el.innerText.slice(0,70),page:document.querySelector('.settings-screen-pager').innerText}));
 console.log(width,section,g);if(g.overflow>2)throw Error('Clipped content '+JSON.stringify(g));

 const next=page.getByRole('button',{name:'Suivant ▶',exact:true});
 if(!await next.isVisible()||!await next.isEnabled())break;
 await next.click();if(++visited>30)throw Error('Paging loop');
 }while(true);
 await page.locator('.nav [data-action="tab:settings"]').click();
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('SETTINGS_SCREENS_OK',width,height);await context.close();
 }}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
