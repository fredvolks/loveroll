// Read-only Supabase STAGING readiness. Never create Auth users, never
// call gameplay RPCs, and never send client secrets to external hosts.
// This is a prereq probe, not the genuine A/B acceptance test.
const PROD='ejsrqfpkgwraorrznjpm';
const requiredTables=[
 'couples','couple_members','couple_profiles','love_platform_admins',
 'love_studio_test_pools','love_studio_test_seats','love_studio_test_audit',
 'love_studio_venice_daily_quota'
];
export function validateStaging(ref,url,key){
 if(!/^[a-z0-9]{20}$/.test(ref||'')||ref===PROD||
    url!==`https://${ref}.supabase.co`||
    !key||typeof key!=='string'){
  throw Error('STAGING REFUSED: distinct valid Supabase project and publishable key required');
 }
 return url;
}
async function probe(fetcher,url,headers,path,method='GET'){
 const response=await fetcher(url+path,{
  method,headers,signal:AbortSignal.timeout(10000),
  ...(method==='POST'?{body:JSON.stringify({action:'status'})}:{})
 });
 const result=await response.text();
 let code='';
 try{code=JSON.parse(result)?.code||''}catch{}
 return {status:response.status,code};
}
export async function checkStagingReadiness({ref,url,key,fetcher=fetch}){
 validateStaging(ref,url,key);
 const headers={apikey:key,'Content-Type':'application/json'};
 const details=[];
 for(const table of requiredTables){
  const r=await probe(fetcher,url,headers,
   '/rest/v1/'+table+'?select=*&limit=0','GET');
  const exists=r.status===200||(
   [401,403].includes(r.status)&&r.code==='42501');
  details.push({component:'table '+table,ready:exists,status:r.status,code:r.code});
 }
 for(const fn of ['love-studio-sandbox','love-venice-bridge']){
  const r=await probe(fetcher,url,headers,'/functions/v1/'+fn,'POST');
  // Real protected functions reject unsigned staging callers with 401/403.
  // A missing endpoint or an open 200 is not considered a readiness success.
  details.push({component:'edge '+fn,
   ready:[401,403].includes(r.status),status:r.status,code:r.code});
 }
 return {ready:details.every(x=>x.ready),details};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const params={
  ref:process.env.LOVEROLL_STUDIO_E2E_REF,
  url:process.env.LOVEROLL_STUDIO_E2E_URL,
  key:process.env.LOVEROLL_STUDIO_E2E_PUBLISHABLE_KEY
 };
 const outcome=await checkStagingReadiness(params);
 for(const item of outcome.details){
  process.stdout.write((item.ready?'READY ':'MISSING ')+
   item.component+' (HTTP '+item.status+(item.code?' '+item.code:'')+')\n');
 }
 if(!outcome.ready)throw Error('STAGING NOT READY: do not create Auth A/B until full isolated schema and functions exist');
}
