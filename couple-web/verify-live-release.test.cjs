'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {checkReleaseFiles,verifyLiveRelease}=require('./verify-live-release.cjs');
const expected='2026-10-29.258';
const tag='20261029-web258';
const docs={
 'web-version.json':JSON.stringify({build:expected}),
 'index.html':'<script type="module" src="./app.js?v='+tag+'"></script>',
 'app.js':"const WEB_RELEASE='"+expected+"'; navigator.serviceWorker.register('./service-worker.js?v="+tag+"');",
 'service-worker.js':"const CACHE='loveroll-static-v258';"
};
const local=()=>({
 expected,manifest:docs['web-version.json'],html:docs['index.html'],
 app:docs['app.js'],worker:docs['service-worker.js']
});
test('A complete matching public release passes with a known version and cache key',()=>{
 assert.deepEqual(checkReleaseFiles(local()),{
  build:expected,appTag:tag,cache:'loveroll-static-v258'
 });
});
test('An old manifest or one stale entry file prevents a false green deployment',()=>{
 const input=local();
 for(const [field,stale] of [
  ['manifest','{"build":"2026-10-29.257"}'],
  ['html','<script src="app.js?v=20261029-web257"></script>'],
  ['app',"const WEB_RELEASE='2026-10-29.257';"],
  ['worker',"const CACHE='loveroll-static-v257';"]
 ]){
  assert.throws(()=>checkReleaseFiles({...input,[field]:stale}),
   /stale|older|expected release|obsolete/i,field);
 }
 assert.throws(()=>checkReleaseFiles({...input,expected:'not-a-build'}),
  /Invalid local release/);
});
test('The check requests the public assets uncached, not local or another app',async()=>{
 const urls=[];
 const found=await verifyLiveRelease({
  baseUrl:'https://fredvolks.github.io/loveroll/',expected,
  fetcher:async(url,opts)=>{
   urls.push({url,opts});
   const name=new URL(url).pathname.split('/').at(-1);
   return {ok:true,status:200,url,text:async()=>docs[name]};
  }
 });
 assert.equal(found.build,expected);
 assert.equal(urls.length,4);
 assert.deepEqual(urls.map(x=>new URL(x.url).pathname),
  ['/loveroll/web-version.json','/loveroll/index.html',
   '/loveroll/app.js','/loveroll/service-worker.js']);
 assert.ok(urls.every(x=>x.opts.cache==='no-store'));
 assert.ok(urls.every(x=>new URL(x.url).searchParams.get('lr_release_probe')===expected));
});
test('Missing assets and off-origin redirects fail the post-deployment gate',async()=>{
 await assert.rejects(verifyLiveRelease({baseUrl:'https://fredvolks.github.io/loveroll/',
  expected,fetcher:async()=>({ok:false,status:404})}),/HTTP 404/);
 await assert.rejects(verifyLiveRelease({baseUrl:'https://fredvolks.github.io/loveroll/',
  expected,fetcher:async()=>({ok:true,status:200,
   url:'https://other.example.org/login',text:async()=>''})}),/outside the Pages origin/);
});
