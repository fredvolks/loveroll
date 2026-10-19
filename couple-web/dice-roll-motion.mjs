// LoveRoll: one continuous forward 3-axis movement, shared by D6/D20/D35.
// Pure motion logic — the official outcome is ALWAYS supplied by Supabase.
// 3 seconds at full tumbling speed, then a smooth natural 1.5-second slowdown.
export const FAST_ROLL_MS=3000;
export const SLOW_ROLL_MS=1500;
export const ROLL_TOTAL_MS=FAST_ROLL_MS+SLOW_ROLL_MS;
const TWO_PI=2*Math.PI;
const FULL_TRAVEL_MS=FAST_ROLL_MS+SLOW_ROLL_MS/2;

// Integral of velocity (1-smoothstep(u)) on [0,1].
// v(0)=1, v(1)=0 and both derivatives are zero. Thus the initial rate,
// slowdown start and final resting point have no abrupt jumps.
export function rollProgress(elapsedMs){
 const elapsed=Math.max(0,Math.min(ROLL_TOTAL_MS,Number(elapsedMs)||0));
 if(elapsed<=FAST_ROLL_MS)return elapsed/FULL_TRAVEL_MS;
 const u=(elapsed-FAST_ROLL_MS)/SLOW_ROLL_MS;
 const slowdownTravel=SLOW_ROLL_MS*(u-u*u*u+0.5*u*u*u*u);
 return Math.min(1,(FAST_ROLL_MS+slowdownTravel)/FULL_TRAVEL_MS);
}
// A fresh cryptographic seed changes turn counts, axis rhythms and phase.
// The server chooses the RESULT; only the motion is random. Every component
// has strictly positive angular velocity until the shared natural slowdown.
export function makeForwardRoll(targetEuler,random=[.2,.4,.6],startEuler=null){
 const end=targetEuler.map(r=>Number(r)||0);
 const r=i=>Math.max(0,Math.min(.999999,Number(random[i]??(
  ((Number(random[i%3])||0)*(.731+i*.413)+i*.193)%1))||0));
 const start=Array.isArray(startEuler)&&startEuler.length===3&&startEuler.every(Number.isFinite)?
 startEuler.slice():[0,1,2].map(i=>r(i)*TWO_PI);
 const turns=[0,1,2].map(i=>(i===2?2:5)+Math.floor(r(i+3)*(i===2?3:4))); // dominant tumble, quieter axial twist
 const finish=end.map((target,i)=>{
  let angle=target+TWO_PI*turns[i];
  while(angle<=start[i])angle+=TWO_PI;
  return angle;
 });
 const axes=[0,1,2].map(i=>({
  wave:2+Math.floor(r(i+6)*4), // distinct 2–5 flutter waves per axis
  phase:r((i+1)%3)*TWO_PI,
  amplitude:.04+.10*r(i+3)
 }));
 return {start,finish,axes,
  // Only subtle, deterministic movement that settles exactly to the origin.
  bouncePhase:r(2)*TWO_PI,slidePhase:r(1)*TWO_PI};
}
export function rollAngles(trajectory,elapsedMs){
 const p=rollProgress(elapsedMs);
 return trajectory.start.map((initial,i)=>{
  const axis=trajectory.axes?.[i]||{wave:3,phase:0,amplitude:0};
  // Integral of angular velocity 1 + a*sin(2pi*n*p+phase), normalized
  // at both endpoints. Since a < 1, NO axis can ever reverse direction.
  const variation=axis.amplitude/(TWO_PI*axis.wave)*
   (Math.cos(axis.phase)-Math.cos(TWO_PI*axis.wave*p+axis.phase));
  return initial+(trajectory.finish[i]-initial)*(p+variation);
 });
}

// A launch, two smaller contacts and a short damped slide; all offsets and
// velocities reach zero at rest. This affects presentation, never the outcome.
export function rollOffset(trajectory,elapsedMs){
 const t=Math.max(0,Math.min(1,(Number(elapsedMs)||0)/ROLL_TOTAL_MS));
 const direction=Math.sin(trajectory.slidePhase)>=0?1:-1;
 const envelope=Math.sin(Math.PI*t)**2*(1-t)**2;
 const x=direction*.72*envelope*Math.sin(Math.PI*t*1.8);
 const hop=(from,to,height)=>{
  if(t<=from||t>=to)return 0;
  return height*Math.sin(Math.PI*(t-from)/(to-from))**2;
 };
 return {x,y:hop(0,.42,.26)+hop(.42,.68,.10)+hop(.68,.84,.035),
  contact:1-Math.min(1,hop(0,.42,1)+hop(.42,.68,.45)+hop(.68,.84,.18))};
}
