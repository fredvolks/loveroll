
/* Original procedurally composed ambient soundtrack: no third-party audio assets or copyright claims. */
const NOTES={
 romantique:[196,246.94,293.66,392],
 sensuel:[164.81,196,246.94,329.63],
 mystere:[146.83,174.61,220,293.66],
 ludique:[220,277.18,329.63,440],
 sensoriel:[174.61,220,261.63,349.23],
 detente:[130.81,164.81,196,261.63],
 musicale:[196,261.63,329.63,392],
 musique:[196,261.63,329.63,392],
 finale:[220,293.66,369.99,440]
};
export function createEclatAudio(win=window){
 let ctx=null,master=null,tick=null,playing=false,mood='romantique',beat=0,generation=0;
 const AC=win.AudioContext||win.webkitAudioContext;
 function tone(freq,delay=0,duration=4.8,volume=.18){
  if(!ctx||!master)return;
  const now=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
  osc.type='sine';osc.frequency.setValueAtTime(freq,now);
  filter.type='lowpass';filter.frequency.value=850;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(volume,now+.6);
  gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  osc.connect(filter);filter.connect(gain);gain.connect(master);
  osc.start(now);osc.stop(now+duration+.05);
  osc.onended=()=>{try{osc.disconnect();gain.disconnect();filter.disconnect();}catch{}};
 }
 function loop(){
  if(!playing||!ctx)return;
  const notes=NOTES[mood]||NOTES.romantique;
  tone(notes[beat%4]/2,0,6,.2);
  tone(notes[(beat+1)%4],.4,4,.07);
  if(beat%2===0)tone(notes[(beat+2)%4]*2,1.6,3,.035);
  beat++;
 }
 return {
  isPlaying:()=>playing,
  async start(nextMood='romantique'){
   if(!AC||win.document?.documentElement?.classList?.contains('lr-privacy-active'))return false;
   const request=++generation;
   mood=nextMood;
   try{
    ctx=ctx||new AC();master=master||ctx.createGain();
    if(!master.numberOfOutputs){} // Keep platform WebAudio initialization straightforward.
    if(!master.__connected){master.connect(ctx.destination);master.__connected=true;}
    master.gain.value=.12;
    await ctx.resume();
    // A privacy mask/stop may occur while resume() waits on browser permission.
    // Never restart a stopped or masked soundtrack after that asynchronous gap.
    if(request!==generation||!ctx||win.document?.documentElement?.classList?.contains('lr-privacy-active'))return false;
    if(!playing){playing=true;beat=0;loop();tick=win.setInterval(loop,4200);}
    return true;
   }catch{if(request===generation)this.stop();return false;}
  },
  setMood(next){if(NOTES[next])mood=next;},
  stop(){
   generation++;
   playing=false;if(tick!==null){win.clearInterval(tick);tick=null;}
   try{if(master&&ctx){master.gain.setTargetAtTime(0,ctx.currentTime,.15);}}catch{}
   try{ctx?.close();}catch{}
   master=null;ctx=null;
  }
 };
}
