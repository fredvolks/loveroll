// Personal timer-alert preference, scoped to the authenticated player.
// No countdown, card text or session details are stored in this key.
// Safari may deny access to localStorage entirely; the active countdown
// must still function with its in-memory sound/vibration mode.
export const TIMER_ALERT_KEY='loveroll-timer-mode';
const keyFor=userId=>typeof userId==='string'&&userId.trim()?
 TIMER_ALERT_KEY+':'+userId:null;
export function readTimerAlertMode(userId,storage){
 const key=keyFor(userId);
 if(!key)return 'sound';
 try{
  const store=storage===undefined?globalThis.localStorage:storage;
  return store?.getItem(key)==='vibrate'?'vibrate':'sound';
 }catch{return 'sound';}
}
export function saveTimerAlertMode(userId,mode,storage){
 const key=keyFor(userId);
 if(!key||(mode!=='sound'&&mode!=='vibrate'))return false;
 try{
  const store=storage===undefined?globalThis.localStorage:storage;
  if(typeof store?.setItem!=='function')return false;
  store.setItem(key,mode);
  return true;
 }catch{return false;}
}
