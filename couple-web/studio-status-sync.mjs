// Serialize official Studio status reads without replacing or faking game data.
// Several real RPCs can finish together; one extra read includes their final state.
// Invalidate previous requests whenever A/B iframes are reset or destroyed.
export function createStudioStatusSync(fetchLatest,applyLatest){
 let active=null,pending=false,generation=0;
 async function refresh(){
  if(active){pending=true;return active;}
  const run=async()=>{
   do{
    pending=false;
    const startedAt=generation;
    const next=await fetchLatest();
    if(startedAt===generation)applyLatest(next);
   }while(pending);
  };
  const task=run();
  active=task;
  try{return await task}
  finally{if(active===task)active=null}
 }
 function invalidate(){generation++}
 return {refresh,invalidate};
}
