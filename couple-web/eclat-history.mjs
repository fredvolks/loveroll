// Only shared session metadata: never load a partner's private choices.
export async function loadEclatHistory(client,coupleId,ownsRequest=()=>true){
 const rows=[];
 for(let offset=0;;offset+=1000){
  // A previous account's multi-page read must never issue the NEXT request
  // with a new Supabase auth token for the former couple.
  if(!ownsRequest())return null;
  const {data,error}=await client.from('love_eclat_sessions')
   .select('id,coffret_id,minutes,chapter_index,started_at,ended_at,cancelled')
   .eq('couple_id',coupleId).order('started_at',{ascending:false}).range(offset,offset+999);
  // Do not expose partially loaded private history after cancellation.
  if(!ownsRequest())return null;
  if(error)throw error;
  rows.push(...(data||[]));
  if(!data||data.length<1000)return rows;
 }
}
export function coffretMemo(history,id,status){
 const rows=(history||[]).filter(s=>Number(s.coffret_id)===Number(id));
 const completed=[30,60,90].filter(n=>rows.some(s=>Number(s.minutes)===n&&s.ended_at&&s.cancelled===false));
 const active=status?.active&&Number(status.coffret_id)===Number(id)?status:rows.find(s=>!s.ended_at);
 return {completed,started:rows.length>0||!!active,active:!!active,
  minutes:Number(active?.minutes)||null,chapter:Number(active?.chapter_index)||null};
}
