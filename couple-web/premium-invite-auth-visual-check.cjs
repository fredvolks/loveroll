// Browser visuals & true component transitions for the TWO approved pages.
// A fixture renders production discoverHtml/authHtml, CSS and actual controls.
// Supabase operations are separately mocked in auth-behavior-v58.cjs.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const fixture=path.join(__dirname,'__invite-account-test.html');
 fs.writeFileSync(fixture,`<!doctype html><html lang="fr-CA"><head><meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
 ${[...fs.readFileSync(path.join(__dirname,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="(\.\/[^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('')}</head><body><main id="app"></main><script type="module">
 import {discoverHtml} from './discover.mjs';
 import {authHtml} from './onboarding.mjs';
 let mode='invitation';const root=document.querySelector('#app');
 function draw(){root.innerHTML=mode==='invitation'?discoverHtml(true):authHtml(true,mode)}
 draw();
 document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;e.preventDefault();
  if(action==='invite-start'){mode='signup';draw();}
  if(action==='auth-mode:signin'){mode='signin';draw();}
  if(action==='auth-mode:signup'){mode='signup';draw();}
  if(action==='invite-return'){mode='invitation';draw();}
  if(action==='auth-reset-request'){mode='request-reset';draw();}
  if(action==='auth-eye'){
   const field=document.querySelector('#signin-password');
   field.type=field.type==='password'?'text':'password';
  }
 });
 </script></body></html>`);
 const captures=path.join(__dirname,'..','landing-captures');
 fs.mkdirSync(captures,{recursive:true});
 const browser=await chromium.launch({headless:true});
 for(const v of [
  {name:'S25-Ultra',width:412,height:915},
  {name:'S25-Ultra-short',width:412,height:824},
  {name:'iPhone',width:393,height:852},
  {name:'Android-small',width:360,height:700},
  {name:'keyboard-open',width:412,height:550},
  {name:'iPad-portrait',width:820,height:1180},
  {name:'iPad-portrait-Messenger',width:820,height:900},
  {name:'iPad-landscape',width:1180,height:820},
  {name:'iPad-landscape-Messenger',width:1180,height:700},
  {name:'Windows-PC',width:1440,height:900}
 ]){
  const page=await browser.newPage({viewport:{width:v.width,height:v.height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/__invite-account-test.html',{waitUntil:'load'});
  await page.locator('[data-action="invite-start"]').waitFor();
  const first=await page.evaluate(()=>{
   const img=document.querySelector('.discover-editorial-die>img');
   const rows=[...document.querySelectorAll('.discover-editorial-item')];
   return {screen:innerWidth,scroll:document.documentElement.scrollWidth,
    imageLoaded:img?.complete&&img.naturalWidth>100,rows:rows.length,
    informational:rows.every(x=>!x.querySelector('button,a')&&!x.dataset.action),
    posterWidth:Math.round(document.querySelector('.love-discover').getBoundingClientRect().width),
    editorial:document.querySelector('.discover-editorial-title')?.textContent};
  });
  if(first.scroll>first.screen+2||first.rows!==4||!first.informational||!first.imageLoaded||
     !first.editorial.includes('On se donne')||errors.length||
     (v.width>=1100&&first.posterWidth<980)||(v.width>=768&&v.width<1100&&first.posterWidth<720))
   throw Error('Invitation layout '+v.name+' '+JSON.stringify({first,errors}));
  if(v.name.startsWith('iPad')){
   const fit=await page.evaluate(()=>{
    const bounds=s=>document.querySelector(s)?.getBoundingClientRect();
    const art=bounds('.discover-editorial-die'),panel=bounds('.discover-editorial-list');
    const header=bounds('.discover-header'),stage=bounds('.discover-editorial-stage');
    const footer=bounds('.discover-editorial-bottom');
    const action=bounds('[data-action="invite-start"]');
    const brand=bounds('.discover-brand');
    return {
     viewportHeight:innerHeight,
     documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),
     acceptVisible:action.top>=0&&action.bottom<=innerHeight+2,
     brandVisible:brand.top>=0,
     sectionsSeparated:header.bottom<=panel.top+2&&panel.bottom<=footer.top+2,
     panelVisible:panel.left>=0&&panel.right<=innerWidth+2&&panel.bottom<=innerHeight+2
    };
   });
   if(fit.documentHeight>fit.viewportHeight+2||!fit.acceptVisible||
      !fit.brandVisible||!fit.sectionsSeparated||!fit.panelVisible)
    throw Error('iPad invitation must fit without scrolling or overlap: '+v.name+' '+JSON.stringify(fit));
  }
  await page.locator('[data-action="invite-start"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(captures,v.name+'-PAGE1-INVITATION-v58.png'),fullPage:true});
  await page.locator('[data-action="invite-start"]').click();
  await page.locator('[data-action="auth-signup-password"]').waitFor();
  let signup=await page.evaluate(()=>{
   const button=document.querySelector('[data-action="auth-signup-password"]').getBoundingClientRect();
   return {horizontal:document.documentElement.scrollWidth>innerWidth+2,submitHeight:button.height,
    signup:!!document.querySelector('.entry-auth-segments .is-active[data-action="auth-mode:signup"]'),
    formWidth:Math.round(document.querySelector('.auth-editorial').getBoundingClientRect().width),
    email:document.querySelector('#signin-email')?.type,
    pass:document.querySelector('#signin-password')?.type};
  });
  if(signup.horizontal||signup.submitHeight<44||!signup.signup||signup.email!=='email'||signup.pass!=='password'||errors.length||(v.width>=768&&signup.formWidth<440))
   throw Error('Signup layout '+v.name+JSON.stringify({signup,errors}));
  await page.screenshot({path:path.join(captures,v.name+'-PAGE2-CREER-v58.png'),fullPage:true});
  await page.locator('[data-action="auth-eye"]').click();
  if(await page.locator('#signin-password').getAttribute('type')!=='text')throw Error('Password eye broken');
  await page.locator('[data-action="auth-mode:signin"]').click();
  await page.locator('[data-action="auth-signin-password"]').waitFor();
  if(await page.locator('[data-action="auth-reset-request"]').count()!==1)throw Error('Forgot password missing');
  await page.screenshot({path:path.join(captures,v.name+'-PAGE2-CONNEXION-v58.png'),fullPage:true});
  await page.locator('[data-action="auth-reset-request"]').click();
  await page.locator('[data-action="auth-send-reset"]').waitFor();
  if(await page.locator('#signin-password').count())throw Error('Password request incorrectly asks for password');
  await page.locator('[data-action="auth-mode:signin"]').click();await page.locator('[data-action="invite-return"]').click();
  await page.locator('[data-action="invite-start"]').waitFor();
  console.log('INVITE_AUTH_VISUAL',v.name,JSON.stringify({first,signup,errors}));
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
