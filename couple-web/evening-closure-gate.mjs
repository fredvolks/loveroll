// One terminal action per Auth generation/member/couple/evening at a time.
// A replacement login can still proceed while the old network call completes.
export function createEveningClosureGate(){
 let active=null;
 const sameOwner=(left,right)=>left.userId===right.userId&&
  left.coupleId===right.coupleId&&left.sessionId===right.sessionId&&
  left.generation===right.generation;
 return {
  begin(owner){
   if(!owner?.userId||!owner?.coupleId||!owner?.sessionId||
      !Number.isInteger(owner.generation))return null;
   if(active&&sameOwner(active,owner))return null;
   active={userId:owner.userId,coupleId:owner.coupleId,
    sessionId:owner.sessionId,generation:owner.generation};
   return active;
  },
  release(ticket){
   if(active===ticket)active=null;
  }
 };
}
