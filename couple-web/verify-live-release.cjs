// Release gate: a successful GitHub Pages upload is not enough.
// Confirm that the PUBLIC Pages origin serves the exact PWA release committed
// to main. Node's fetch bypasses the browser's service worker/cache.
'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');

function checkReleaseFiles({expected,manifest,html,app,worker}){
 assert.match(expected,/^\d{4}-\d{2}-\d{2}\.\d+$/,'Invalid local release');
 const actual=JSON.parse(manifest)?.build;
 assert.equal(actual,expected,'Public web-version.json is stale');
 const [date,sequence]=expected.split('.');
 const tag=date.replaceAll('-','')+'-web'+sequence;
 assert.ok(html.includes('app.js?v='+tag),'Public HTML still loads an older app.js');
 assert.ok(app.includes("const WEB_RELEASE='"+expected+"'"),
  'Public app.js does not report the expected release');
 assert.ok(app.includes('service-worker.js?v='+tag),
  'Public app.js still registers an older service worker');
 assert.ok(worker.includes("const CACHE='loveroll-static-v"+sequence+"'"),
  'Public service worker uses an obsolete offline cache');
 return {build:expected,appTag:tag,cache:'loveroll-static-v'+sequence};
}

async function verifyLiveRelease({baseUrl,expected,fetcher=fetch}){
 const base=new URL(baseUrl);
 if(!/^https?:$/.test(base.protocol))throw Error('Only HTTP(S) origins are supported');
 const names=['web-version.json','index.html','app.js','service-worker.js'];
 const request=async name=>{
  const url=new URL(name,base);
  url.searchParams.set('lr_release_probe',expected);
  const response=await fetcher(url.toString(),{
   cache:'no-store',redirect:'follow',headers:{'Cache-Control':'no-cache'},
   signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw Error(name+' returned HTTP '+response.status);
  const finalUrl=response.url;
  if(finalUrl&&new URL(finalUrl).origin!==base.origin)
   throw Error(name+' redirected outside the Pages origin');
  return response.text();
 };
 const [manifest,html,app,worker]=await Promise.all(names.map(request));
 return checkReleaseFiles({expected,manifest,html,app,worker});
}

if(require.main===module){
 const expected=JSON.parse(readFileSync(path.join(__dirname,'web-version.json'),'utf8')).build;
 const baseUrl=process.env.LOVEROLL_DIAGNOSTIC_URL||'https://fredvolks.github.io/loveroll/';
 verifyLiveRelease({baseUrl,expected}).then(found=>{
  console.log('LOVEROLL_PUBLIC_RELEASE_VERIFIED',JSON.stringify(found));
 }).catch(error=>{
  console.error('LOVEROLL_PUBLIC_RELEASE_MISMATCH',error.message);
  process.exitCode=1;
 });
}
module.exports={checkReleaseFiles,verifyLiveRelease};
