// Prevent overlapping status reads from restoring an old session or an
// entitlement that was already replaced/revoked by a newer real RPC.
// No network access, cached content or synthetic game state.
export function createEclatV2LatestRead(){
 let epoch=0;
 return Object.freeze({
  begin(){return ++epoch;},
  invalidate(){epoch++;},
  isCurrent(ticket){return Number.isSafeInteger(ticket)&&ticket>0&&ticket===epoch;}
 });
}
