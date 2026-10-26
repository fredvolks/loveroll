// LoveRoll challenge *timer* sound. Never notify merely because a partner sends a card.
// iOS Safari requires a user gesture to unlock its audio engine before the countdown ends.
const KEY='loveroll-timer-sound-v229';
let context=null;
let currentUser='anonymous';
const recent=new Set();
export const setLoveRollSoundUser=id=>{currentUser=String(id||'anonymous');};
const key=()=>KEY+':'+currentUser;
export function soundEnabled(store=globalThis.localStorage){
 try{return store?.getItem(key())!=='off';}catch{return true;}
}
export function setSoundEnabled(enabled,store=globalThis.localStorage){
 try{store?.setItem(key(),enabled?'on':'off');}catch{}
 return !!enabled;
}
export async function unlockLoveRollSounds(){
 const target=globalThis.window;
 const Audio=target?.AudioContext||target?.webkitAudioContext;
 if(!Audio)return false;
 try{
  if(!context||context.state==='closed')context=new Audio();
  // resume() is called synchronously, while this is still inside a click/touch.
  // Waiting until the 00:00 callback to construct AudioContext fails on Safari.
  if(context.state!=='running')await context.resume();
  return context.state==='running';
 }catch{return false;}
}
export function armLoveRollSounds(){
 if(typeof document==='undefined')return;
 const unlock=()=>{
  // Safari / installed iOS PWA can suspend an already unlocked context after
  // backgrounding or locking. Keep gesture listeners active: a later user
  // interaction must be able to resume it before the next timer expires.
  // No resume() call is made for an already-running context.
  if(!context||context.state!=='running')void unlockLoveRollSounds();
 };
 document.addEventListener('pointerdown',unlock,true);
 document.addEventListener('touchend',unlock,true);
 document.addEventListener('keydown',unlock,true);
}
export function playLoveRollSound(eventId='timer-preview',{force=false}={}){
 if(!force&&!soundEnabled())return false;
 if(!context||context.state!=='running')return false;
 const id=String(eventId);
 if(!force&&recent.has(id))return false;
 try{
  // Two warm, easily audible melodic phrases, ~1.8 seconds, no external audio files.
  const start=context.currentTime+.015;
  const melody=[659.25,783.99,987.77,783.99,659.25,880];
  for(let index=0;index<melody.length;index++){
   const at=start+index*.255;
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type='sine';
   oscillator.frequency.value=melody[index];
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(.115,at+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.235);
   oscillator.connect(gain);gain.connect(context.destination);
   oscillator.start(at);oscillator.stop(at+.245);
  }
  if(!force){
   recent.add(id);
   if(recent.size>100)recent.delete(recent.values().next().value);
  }
  return true;
 }catch(error){console.warn('Son du minuteur LoveRoll indisponible',error);return false;}
}
export function soundSettingsHtml(){
 return '<section class="lr-sound-settings" aria-label="Sonneries de fin des minuteurs">'+
 '<div class="lr-sound-settings-row"><div><strong>Son à la fin des minuteurs</strong>'+
 '<small>Une mélodie quand le compte à rebours atteint 00:00</small></div>'+
 '<button type="button" role="switch" aria-checked="'+soundEnabled()+
 '" data-action="sound-toggle" class="lr-sound-switch">'+(soundEnabled()?'Activé':'Désactivé')+'</button></div>'+
 '<button type="button" class="settings-primary" data-action="sound-test">♫ Tester la sonnerie du minuteur</button>'+
 '<p class="tiny-note">Sur iPhone Safari, laisse LoveRoll ouvert et audible pendant le minuteur. '+
 'En arrière-plan ou écran verrouillé, iOS ne garantit pas qu’une page Web puisse jouer un son programmé.</p></section>';
}
armLoveRollSounds();
