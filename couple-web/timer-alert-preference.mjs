// The private timer alert preference is optional. Safari private mode,
// disabled browser storage and full quotas must not interrupt a live countdown.
// No timer deadline, challenge state or private card content is persisted here.
export const TIMER_ALERT_KEY='loveroll-timer-mode';
export function readTimerAlertMode(storage){
 try{
  const store=storage===undefined?globalThis.localStorage:storage;
  return store?.getItem(TIMER_ALERT_KEY)==='vibrate'?'vibrate':'sound';
 }catch{return 'sound';}
}
export function saveTimerAlertMode(mode,storage){
 if(mode!=='sound'&&mode!=='vibrate')return false;
 try{
  const store=storage===undefined?globalThis.localStorage:storage;
  if(typeof store?.setItem!=='function')return false;
  store.setItem(TIMER_ALERT_KEY,mode);
  return true;
 }catch{return false;}
}
