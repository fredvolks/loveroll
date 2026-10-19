// Shared turn rotation is deterministic and server-enforced for every couple.
// One completed challenge advances a giver's turn; a passed challenge may be retried.
// The server chooses the opening player uniformly once (50/50).\n// For new self_draws sessions, turns belong to the person who receives/plays their own challenge.
export function sharedEveningTurns(session,members,rolls,challenges,gifts=[]){
 if(!session||!Array.isArray(members)||members.length!==2)return {ready:false,reason:'missing-partner'};
 const starterId=session.starting_user_id||session.opened_by;
 const first=members.find(m=>m.user_id===starterId)||members[0];
 const second=members.find(m=>m.user_id!==first.user_id);
 const targets={};
 const completed={},drawn={};
 const pending=challenges.find(c=>c.status==='proposed'||c.status==='accepted')||null;
 for(const m of members){
  const roll=rolls.find(r=>r.user_id===m.user_id);
  if(!Number.isInteger(roll?.face)||roll.face<1||roll.face>6)
   return {ready:false,reason:'personal-rolls',first:first.user_id,pending};
  targets[m.user_id]=roll.face+
   gifts.filter(g=>g.session_id===session.id&&g.receiver_user_id===m.user_id).length-
   gifts.filter(g=>g.session_id===session.id&&g.donor_user_id===m.user_id).length;
  completed[m.user_id]=challenges.filter(c=>(session.self_draws?c.recipient:c.offered_by)===m.user_id&&c.status==='completed').length;
  drawn[m.user_id]=challenges.filter(c=>(session.self_draws?c.recipient:c.offered_by)===m.user_id&&c.status!=='passed').length;
 }
 const a=first.user_id,b=second.user_id;
 let next=null;
 if(drawn[a]>=targets[a]&&drawn[b]>=targets[b])next=null;
 else if(drawn[a]>=targets[a])next=b;
 else if(drawn[b]>=targets[b])next=a;
 else next=drawn[a]<=drawn[b]?a:b;
 const remaining=Object.fromEntries(members.map(m=>
  [m.user_id,Math.max(0,targets[m.user_id]-drawn[m.user_id])]));
 return {ready:true,first:a,next,pending,targets,completed,drawn,remaining,
  drawsFinished:drawn[a]>=targets[a]&&drawn[b]>=targets[b],
  finished:completed[a]>=targets[a]&&completed[b]>=targets[b]};
}
export const evenLabels=Object.freeze({
 weekly:'Notre rituel de la semaine',
 count:'Combien de défis chacun ?',
 library:'Nos 70 défis',
 challenge:'Notre défi surprise',
 monthly:'Notre rendez-vous surprise'
});

// Stable official D100 result (1–100): first query may be newest-first, a reloaded
// history may be unordered. Never reverse the official series or use preview faces.
export function lastOfficialChallengeFace(challenges=[],sessionId=null){
 const valid=(challenges||[]).filter(c=>
  (sessionId===null||c.session_id===sessionId)&&
  c.face!=null&&Number.isInteger(Number(c.face))&&
  Number(c.face)>=1&&Number(c.face)<=100);
 valid.sort((a,b)=>{
  const da=Date.parse(a.created_at||''),db=Date.parse(b.created_at||'');
  return Number.isFinite(da)&&Number.isFinite(db)?db-da:0;
 });
 return valid.length?Number(valid[0].face):null;
}

// The query is ordered ascending by started_at. Aftercare must use the latest
// *finished* counted session, not the first item returned by the database.
export function latestCountedSession(sessions=[]){
 return [...(sessions||[])].filter(x=>x.finished_at&&x.counted).sort(
  (a,b)=>Date.parse(b.finished_at)-Date.parse(a.finished_at))[0]||null;
}
