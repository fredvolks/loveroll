// Gesture-unlocked local sound for incoming challenges; system push remains OS-controlled.
const KEY='loveroll-challenge-sounds-v229';
let context=null,unlocked=false;
const recent=new Set();
export function soundEnabled(store=globalThis.localStorage){
 try{return store?.getItem(KEY)!=='off';}catch{return true;}
}
export function setSoundEnabled(enabled,store=globalThis.localStorage){
 try{store?.setItem(KEY,enabled?'on':'off');}catch{}
 return !!enabled;
}
export function unlockLoveRollSounds(){
 if(typeof window==='undefined')return false;
 const Ctor=window.AudioContext||window.webkitAudioContext;
 if(!Ctor)return false;
 try{
  context??=new Ctor();
  context.resume?.().then(()=>{unlocked=context.state==='running';}).catch(()=>{});
  unlocked=context.state==='running';
  return unlocked;
 }catch{return false;}
}
export function armLoveRollSounds(){
 if(typeof document==='undefined')return;
 const unlock=()=>{unlockLoveRollSounds();if(unlocked){
  document.removeEventListener('pointerdown',unlock,true);
  document.removeEventListener('keydown',unlock,true);
 }};
 document.addEventListener('pointerdown',unlock,true);
 document.addEventListener('keydown',unlock,true);
}
export function playLoveRollSound(eventId='test',{force=false}={}){
 if(!force&&!soundEnabled())return false;
 if(!context||context.state!=='running')return false;
 const id=String(eventId);
 if(!force&&recent.has(id))return false;
 if(!force){recent.add(id);if(recent.size>80)recent.delete(recent.values().next().value);}
 try{
  const t=context.currentTime+.02;
  [659.25,783.99,987.77].forEach((frequency,index)=>{
   const oscillator=context.createOscillator(),volume=context.createGain();
   oscillator.type='sine';oscillator.frequency.value=frequency;
   const at=t+index*.115;
   volume.gain.setValueAtTime(.0001,at);
   volume.gain.exponentialRampToValueAtTime(.055,at+.025);
   volume.gain.exponentialRampToValueAtTime(.0001,at+.25);
   oscillator.connect(volume);volume.connect(context.destination);
   oscillator.start(at);oscillator.stop(at+.27);
  });
  return true;
 }catch{return false;}
}
export function soundSettingsHtml(){
 return '<section class="lr-sound-settings" aria-label="Sonneries des défis">'+
 '<div class="lr-sound-settings-row"><div><strong>Son des nouveaux défis</strong><small>Une courte mélodie lorsque LoveRoll est ouvert</small></div>'+
 '<button type="button" role="switch" aria-checked="'+soundEnabled()+'" data-action="sound-toggle" class="lr-sound-switch">'+(soundEnabled()?'Activé':'Désactivé')+'</button></div>'+
 '<button type="button" class="settings-primary" data-action="sound-test">♫ Tester la sonnerie</button>'+
 '<p class="tiny-note">Sur iPhone, touche d’abord un bouton pour autoriser le son. Écran verrouillé : iOS contrôle la sonnerie des notifications.</p></section>';
}
armLoveRollSounds();
