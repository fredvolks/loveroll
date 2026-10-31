// An individual, local planning preference for the next LoveRoll evening.
// The real couple/session duration and official challenge completions remain
// governed by server state; this choice does not close or shorten a session.
export const SESSION_LENGTH_OPTIONS=Object.freeze(['5','10','15','30','libre']);
const storageKey=userId=>'loveroll-session-length:'+userId;
export function normalizeSessionLength(value){
 return SESSION_LENGTH_OPTIONS.includes(value)?value:'libre';
}
export function readSessionLength(userId,storage=globalThis.localStorage){
 if(typeof userId!=='string'||!userId)return 'libre';
 try{return normalizeSessionLength(storage?.getItem(storageKey(userId)));}
 catch{return 'libre';}
}
export function saveSessionLength(userId,value,storage=globalThis.localStorage){
 if(typeof userId!=='string'||!userId||!SESSION_LENGTH_OPTIONS.includes(value))return false;
 try{storage?.setItem(storageKey(userId),value);return !!storage;}
 catch{return false;}
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
  '<small>Préférence enregistrée sur cet appareil pour ce compte.</small></div>';
}
