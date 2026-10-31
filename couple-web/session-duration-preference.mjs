// An individual, local planning preference for the next LoveRoll evening.
// The real couple/session duration and official challenge completions remain
// governed by server state; this choice does not close or shorten a session.
export const SESSION_LENGTH_OPTIONS=Object.freeze(['5','10','15','30','libre']);
const storageKey=userId=>'loveroll-session-length:'+userId;
// Session-only fallback when Safari/Android WebView forbids local storage.
// Only the chosen duration is cached; never card text or server state.
const temporaryLengths=new Map();
const validUserId=id=>typeof id==='string'&&!!id.trim();
export function normalizeSessionLength(value){
 return SESSION_LENGTH_OPTIONS.includes(value)?value:'libre';
}
export function readSessionLength(userId,storage){
 if(!validUserId(userId))return 'libre';
 if(temporaryLengths.has(userId))return temporaryLengths.get(userId);
 // Reading globalThis.localStorage can itself throw (Safari privacy policy,
 // opaque origins). Resolve it INSIDE the guarded block, not in defaults.
 try{
  const available=storage===undefined?globalThis.localStorage:storage;
  return normalizeSessionLength(available?.getItem(storageKey(userId)));
 }catch{return 'libre';}
}
export function saveSessionLength(userId,value,storage){
 if(!validUserId(userId)||!SESSION_LENGTH_OPTIONS.includes(value))return false;
 try{
  const available=storage===undefined?globalThis.localStorage:storage;
  if(typeof available?.setItem!=='function')throw Error('Storage unavailable');
  available.setItem(storageKey(userId),value);
  temporaryLengths.delete(userId); // Real persistent storage is authoritative.
  return true;
 }catch{
  temporaryLengths.set(userId,value); // Until this page is closed/refreshed.
  return true;
 }
}
export function sessionLengthSettingsHtml(value='libre'){
 const selected=normalizeSessionLength(value);
 const choices=SESSION_LENGTH_OPTIONS.map(duration=>{
  const label=duration==='libre'?'Libre':duration+' min';
  const active=duration===selected;
  return '<button type="button" class="account-test-option'+
   (active?' selected':'')+'" data-action="session-length:'+duration+'"'+
   ' aria-pressed="'+active+'">'+label+'</button>';
 }).join('');
 return '<div class="account-test-modes lr-session-length-settings" role="group" aria-label="Durée souhaitée des soirées">'+
  '<h3>Durée souhaitée de ma soirée</h3>'+
  '<p>Un repère personnel pour préparer votre prochain moment à deux. '+
  'Il ne termine pas automatiquement la soirée ni les défis.</p>'+
  '<div class="account-test-options">'+choices+'</div>'+
  '<small>Enregistrée sur cet appareil si autorisé, sinon pour cette visite seulement.</small></div>';
}

// Compact pre-session choice. This changes only the local preference; the
// official D6/D100 and evening close conditions are never derived from it.
// Compact pre-session native selector: keep the two approved Soirée buttons
// and D100 artwork on a single mobile screen. This is only a local hint.
export function sessionLengthChooserHtml(value='libre'){
 const selected=normalizeSessionLength(value);
 const options=SESSION_LENGTH_OPTIONS.map(duration=>{
  const label=duration==='libre'?'Libre':duration+' min';
  return '<option value="'+duration+'"'+(duration===selected?' selected':'')+'>'+label+'</option>';
 }).join('');
 return '<label class="evening-length-compact">'+
  '<span>Durée souhaitée</span>'+
  '<select data-session-length-select="true" aria-label="Durée souhaitée de ma soirée">'+
   options+'</select></label>';
}
