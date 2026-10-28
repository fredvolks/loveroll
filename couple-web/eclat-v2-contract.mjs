// Éclat V2: pure, no-network contract for the APPROVED 12-coffret game.
// The existing v1 game and all historic sessions remain unchanged.
// A server transaction must assign the variant and persist the session atomically;
// this module is not an authorization boundary or a substitute for RLS.
import { ECLAT_V2_EDITORIAL } from './eclat-v2-editorial.mjs';

const routes = {
  30: [[1,5],[3,8],[6,12],[8,5]],
  60: [[1,5],[2,8],[3,12],[5,12],[6,15],[8,8]],
  90: [[1,5],[2,10],[3,15],[4,10],[5,15],[6,15],[7,10],[8,10]]
};
export const ECLAT_V2_DURATIONS = Object.freeze([30,60,90]);
export const ECLAT_V2_ROUTES = Object.freeze(Object.fromEntries(
  Object.entries(routes).map(([minutes,steps])=>[
    minutes,Object.freeze(steps.map(([number,budgetMinutes])=>Object.freeze({number,budgetMinutes})))
  ])
));
const validNumber = n => Number.isInteger(n);
const assertCoffret = id => {
  if(!validNumber(id)||id<1||id>12)throw new RangeError('Coffret Éclat inconnu');
  return ECLAT_V2_EDITORIAL[id-1];
};
const assertVersion = v => {
  if(v!==0&&v!==1)throw new RangeError('Variante Éclat V2 invalide');
  return v;
};
export function eclatV2Coffret(id){ return assertCoffret(id); }
export function eclatV2Route(minutes){
  if(!ECLAT_V2_DURATIONS.includes(minutes))throw new RangeError('Durée Éclat invalide');
  return ECLAT_V2_ROUTES[minutes];
}
export function eclatV2VariantForSessionNumber(startedSessions){
  if(!validNumber(startedSessions)||startedSessions<0)throw new RangeError('Compteur de séances invalide');
  // Count every new-version start, even when interrupted. Legacy v1 starts do not count.
  return startedSessions%2; // 0,1,0,1... server must lock/serialize this count.
}
export function eclatV2VersionFromHistory(coffretId,history,replayVariant=null){
  assertCoffret(coffretId);
  if(replayVariant!==null)return assertVersion(replayVariant); // only after explicit Replay choice
  if(!Array.isArray(history))throw new TypeError('Historique nécessaire');
  const count=history.filter(s=>Number(s.coffret_id)===coffretId
    && Number(s.content_version)===2 && !!s.started_at).length;
  return eclatV2VariantForSessionNumber(count);
}
export function eclatV2Plan(coffretId,minutes,variant){
  const coffret=assertCoffret(coffretId);
  assertVersion(variant);
  return Object.freeze(eclatV2Route(minutes).map((step,index)=>{
    const original=coffret.scenes[step.number-1];
    return Object.freeze({
      ordinal:index+1,
      total:eclatV2Route(minutes).length,
      sceneNumber:step.number,
      budgetMinutes:step.budgetMinutes,
      type:original.type,
      instruction:original.instructions[variant],
      variant
    });
  }));
}
const safeId = id=> typeof id==='string'&&id.trim()&&id.length<=128;
export function eclatV2CreateDraft({coffretId,minutes,variant,creatorUserId,partnerUserId,deviceMode}){
  const plan=eclatV2Plan(coffretId,minutes,variant);
  if(!safeId(creatorUserId)||!safeId(partnerUserId)||creatorUserId===partnerUserId)
    throw new TypeError('Deux membres distincts sont nécessaires');
  if(deviceMode!=='one'&&deviceMode!=='two')throw new RangeError('Mode appareil invalide');
  // A is ALWAYS the authenticated creator, B is ALWAYS their partner.
  // Do not infer roles from names, sex, sorted IDs or reconnect order.
  // No secret, answer, note or private vote is stored in a shared draft.
  return Object.freeze({
    contentVersion:2,coffretId,minutes,variant,
    roleA:creatorUserId,roleB:partnerUserId,deviceMode,
    ordinal:1,state:'active',skipped:Object.freeze([]),plan
  });
}
export function eclatV2CurrentScene(session){
  if(!session||!Array.isArray(session.plan))throw new TypeError('Séance Éclat V2 requise');
  if(session.state==='finished'||session.state==='interrupted')return null;
  return session.plan[session.ordinal-1]||null;
}
export function eclatV2Transition(session,action){
  if(!session||session.contentVersion!==2||!Array.isArray(session.plan))
    throw new TypeError('État de séance Éclat V2 invalide');
  if(!['pause','resume','pass','continue','stop'].includes(action))throw new RangeError('Action inconnue');
  if(['finished','interrupted'].includes(session.state))throw new Error('Cette séance est déjà terminée');
  if(action==='pause'){
    if(session.state!=='active')throw new Error('La séance est déjà en pause');
    return Object.freeze({...session,state:'paused'});
  }
  if(action==='resume'){
    if(session.state!=='paused')throw new Error('La séance n’est pas en pause');
    return Object.freeze({...session,state:'active'});
  }
  if(action==='stop')return Object.freeze({...session,state:'interrupted'});
  if(session.state!=='active')throw new Error('Reprendre avant de continuer');
  if(!validNumber(session.ordinal)||session.ordinal<1||session.ordinal>session.plan.length)
    throw new RangeError('Étape courante invalide');
  const skipped=action==='pass'
    ?Object.freeze([...session.skipped,session.plan[session.ordinal-1].sceneNumber])
    :session.skipped;
  const complete=session.ordinal===session.plan.length;
  return Object.freeze({...session,skipped,ordinal:complete?session.ordinal:session.ordinal+1,
    state:complete?'finished':'active'});
}
export function eclatV2MayReveal({deviceMode,readyA=false,readyB=false,sharedOralAgreement=false}){
  if(deviceMode==='two')return readyA===true&&readyB===true;
  if(deviceMode==='one')return sharedOralAgreement===true;
  throw new RangeError('Mode appareil invalide');
}
