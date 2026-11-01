// Only shared session metadata: never load a partner's private choices.
export async function loadEclatHistory(client,coupleId){
 const rows=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await client.from('love_eclat_sessions')
   .select('id,coffret_id,minutes,chapter_index,started_at,ended_at,cancelled')
   .eq('couple_id',coupleId)
   // Several starts can share the same timestamp. Sorting by a unique ID
   // keeps pagination deterministic across boundaries of 1000 sessions.
   .order('started_at',{ascending:false}).order('id',{ascending:false})
   .range(offset,offset+999);
  if(error)throw error;
  rows.push(...(data||[]));
  if(!data||data.length<1000)return rows;
 }
}
export function coffretMemo(history,id,status){
 const rows=(history||[]).filter(s=>Number(s.coffret_id)===Number(id));
 const completed=[30,60,90].filter(n=>rows.some(s=>Number(s.minutes)===n&&s.ended_at&&s.cancelled===false));
 // A cancelled session can have no ended_at: it is history, never a
 // resumable coffret. Prefer the live authoritative status when available.
 // The authenticated live status is authoritative, including active=false.
 // A stale history row must not resurrect a coffret another device ended.
 // Fall back to history only if no live status was supplied at all.
 const active=status&&typeof status.active==='boolean'?
  (status.active&&Number(status.coffret_id)===Number(id)?status:null):
  rows.find(s=>!s.ended_at&&s.cancelled!==true);
 return {completed,started:rows.length>0||!!active,active:!!active,
  minutes:Number(active?.minutes)||null,
  // The live RPC calls this chapter_number; stored history uses chapter_index.
  // Prefer the server's live stage when available (including stage 1).
  chapter:Number(active?.chapter_number??active?.chapter_index)||null};
}
