// Probe deployed bytes, file parity and actual Chromium module startup.
// Run inside CI with playwright installed, no credentials required.
// The report contains no user data.
const {chromium}=require('playwright');
const fs=require('node:fs'), crypto=require('node:crypto'), {execFileSync}=require('node:child_process');
let runningBrowser=null;
(async()=>{
 const url='https://fredvolks.github.io/mon-wallet-android/';
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),25000);
 let remote,status,version;
 try{
  const index=await fetch(url+'?diagnostic='+Date.now(),
   {signal:controller.signal,cache:'no-store'});
  const html=await index.text();
  version=html.match(/app\.js\?v=([^"']+)/)?.[1]||'missing';
  const res=await fetch(url+'app.js?v='+encodeURIComponent(version)+'&diagnostic='+Date.now(),
   {signal:controller.signal,cache:'no-store'});
  status=res.status;remote=await res.text();
 }finally{clearTimeout(timer)}
 fs.writeFileSync('/tmp/loveroll-production-app.js',remote);
 let syntax='ok';
 try{execFileSync('node',['--check','/tmp/loveroll-production-app.js'],{stdio:'pipe'})}
 catch(e){syntax=(e.stderr||'').toString().slice(0,2000)}
 const local=fs.readFileSync('couple-web/app.js');
 const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
 console.log('PRODUCTION_BYTES',JSON.stringify({status,version,bytes:remote.length,remoteSha256:hash(remote),
  localSha256:hash(local),identical:hash(remote)===hash(local),syntax}));
 const browser=await chromium.launch({headless:true,args:['--disable-cache']});
 runningBrowser=browser;
 const page=await browser.newPage({viewport:{width:412,height:824},serviceWorkers:'block'});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Debugger.enable');
 await cdp.send('Runtime.enable');
 const parseFailures=[];
 cdp.on('Debugger.scriptFailedToParse',d=>parseFailures.push({
  url:d.url,lineNumber:d.startLine,column:d.startColumn,
  endLine:d.endLine,endColumn:d.endColumn,errorMessage:d.errorMessage||null}));
 cdp.on('Runtime.exceptionThrown',d=>parseFailures.push({exception:d.exceptionDetails.text,
  url:d.exceptionDetails.url,line:d.exceptionDetails.lineNumber,column:d.exceptionDetails.columnNumber,
  description:d.exceptionDetails.exception?.description?.slice(0,1900)}));
 const logs=[];
 page.on('pageerror',err=>logs.push('PAGE_ERROR '+err.message+' '+err.stack?.slice(0,750)));
 page.on('console',msg=>{if(msg.type()==='error')logs.push('CONSOLE '+msg.text().slice(0,750))});
 page.on('requestfailed',r=>logs.push('REQUEST_FAILED '+r.url().slice(0,200)+' '+r.failure()?.errorText));
 await page.goto(url+'?bootstrap-diagnostic='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
 try{await page.waitForFunction(()=>!document.querySelector('#app > [data-lr-boot]')&&!document.querySelector('.love-boot-error'),
  null,{timeout:15000});}catch(e){logs.push('BOOT_TIMEOUT '+e.message.slice(0,200))}
 const state=await page.evaluate(()=>({ready:!document.querySelector('#app > [data-lr-boot]')&&!document.querySelector('.love-boot-error'),text:document.querySelector('#app')?.textContent?.slice(0,380),
  scripts:[...document.scripts].map(s=>s.src),url:location.href}));
 console.log('PRODUCTION_RENDER',JSON.stringify(state));
 console.log('PRODUCTION_LOGS',JSON.stringify(logs.slice(0,25)));
 console.log('CDP_PARSE',JSON.stringify(parseFailures.slice(0,25)));
 await browser.close(); // Never leave Chromium alive when the strict check fails.
 runningBrowser=null;
 if(process.env.LOVEROLL_REQUIRE_HEALTHY==='1'){
  const expected=JSON.parse(fs.readFileSync('couple-web/web-version.json','utf8')).build;
  const expectedTag=expected==='2026-10-15.57'?'20261015-boot57':null;
  if(!state.ready||logs.some(x=>x.startsWith('PAGE_ERROR'))||
    (expectedTag&&version!==expectedTag)||hash(remote)!==hash(local)||syntax!=='ok')
   throw Error('LIVE_SITE_STARTUP_FAILED: '+JSON.stringify({expected,version,ready:state.ready,logs:logs.slice(0,6)}));
 }

})().catch(async e=>{
 console.error('DIAG_FATAL',e);
 try{await runningBrowser?.close();}catch{}
 process.exitCode=1;
});
