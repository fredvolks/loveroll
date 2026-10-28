// Guard the real V2 scene editor against unnecessary remounts while
// refusing to reuse it after a session, user, couple, or Premium change.
// Keep this pure so the identity transition is tested without a browser.
export function canReuseEclatV2Editor({
 server,player,userId,ownerId,coupleId,lockedCoupleId,hasMountedHost
}={}){
 return Boolean(
  hasMountedHost===true &&
  typeof userId==='string'&&userId.length>0&&userId===ownerId &&
  typeof coupleId==='string'&&coupleId.length>0&&coupleId===lockedCoupleId &&
  server?.access===true&&server?.active===true&&
  player?.access===true&&player?.active===true&&
  typeof server?.session_id==='string'&&server.session_id.length>0&&
  player.session_id===server.session_id
 );
}
