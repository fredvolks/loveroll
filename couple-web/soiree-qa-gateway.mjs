// Real Soirée server contract shared by both independently signed-in QA players.
// No synthetic die results, no bypass of weekly/daily caps or challenge queues.
// The same RPC names and result columns as the production LoveRoll game.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES=new Set(['SENSUEL','SEXUEL','MIXTE','HASARD']);
function requireUuid(value){
 if(typeof value!=='string'||!UUID.test(value))throw new RangeError('Identifiant de séance invalide');
 return value;
}
export function validateSoireeQaPair(a,b){
 if(!a?.userId||!b?.userId||a.userId===b.userId||
    !a.coupleId||a.coupleId!==b.coupleId)
  throw new Error('Deux vrais joueurs distincts du même duo QA sont obligatoires');
 return Object.freeze({coupleId:a.coupleId,userA:a.userId,userB:b.userId});
}
export function createSoireeQaGateway({client,expectedUserId}){
 if(!client?.auth?.getUser||!client?.rpc||!client?.from||
    !requireUuid(expectedUserId))throw new TypeError('Client joueur QA invalide');
 const rpc=async(name,args)=>{
  const {data,error}=await client.rpc(name,args);
  if(error)throw error;return data;
 };
 const rows=async(table,filters=[],options={})=>{
  let q=client.from(table).select(options.fields||'*');
  for(const [key,value] of filters)q=q.eq(key,value);
  if(options.isNull)q=q.is(options.isNull,null);
  if(options.limit)q=q.limit(options.limit);
  const {data,error}=await q;
  if(error)throw error;return data||[];
 };
 async function identity(){
  const {data,error}=await client.auth.getUser();
  if(error||data?.user?.id!==expectedUserId)
   throw new Error('Le compte QA a changé : reconnectez ce joueur');
  const memberships=await rows('couple_members',[['user_id',expectedUserId]],{fields:'couple_id'});
  if(memberships.length!==1||!requireUuid(memberships[0]?.couple_id))
   throw new Error('Ce compte QA n’appartient pas à un duo unique');
  return {userId:expectedUserId,coupleId:memberships[0].couple_id};
 }
 async function snapshot(){
  const who=await identity();
  const [week,session]=await Promise.all([
   rows('couple_rolls',[['couple_id',who.coupleId],['kind','weekly']],
    {fields:'id,face,kind,key,created_at',limit:20}),
   rows('couple_sessions',[['couple_id',who.coupleId]],
    {fields:'id,started_at,finished_at,counted',isNull:'finished_at',limit:2})
  ]);
  if(session.length>1)throw new Error('Deux soirées actives : état serveur incohérent');
  const active=session[0]||null;
  if(!active)return {...who,weekly:week,session:null,personal:[],mine:[],board:null};
  const [personal,mine,board]=await Promise.all([
   rows('couple_personal_rolls',[['session_id',active.id]],{fields:'user_id,face'}),
   rows('couple_challenges',[['session_id',active.id],['recipient',who.userId]],
    {fields:'id,recipient,offered_by,category,face,card_id,card_title,card_description,card_timer_minutes,status,created_at'}),
   rpc('my_love_evening_board',{p_session:active.id})
  ]);
  return {...who,weekly:week,session:active,personal,
    mine:mine.filter(x=>x.recipient===who.userId),board};
 }
 async function weekly(){
  const {coupleId}=await identity();
  const result=await rpc('roll_couple_once',{p_couple:coupleId,p_kind:'weekly'});
  if(!Number.isInteger(result?.face)||result.face<1||result.face>6)
   throw new Error('D6 hebdomadaire non confirmé par le serveur');
  return result;
 }
 async function start(){
  const {coupleId}=await identity();
  const sessionId=await rpc('ensure_couple_session',{p_couple:coupleId});
  return requireUuid(sessionId);
 }
 async function d6(sessionId){
  await identity();
  const result=await rpc('roll_my_evening_d6',{p_session:requireUuid(sessionId)});
  if(!Number.isInteger(result?.face)||result.face<1||result.face>6)
   throw new Error('D6 personnel non confirmé par le serveur');
  return result;
 }
 async function d100(sessionId,category){
  await identity();
  if(!CATEGORIES.has(category))throw new RangeError('Catégorie D100 invalide');
  const result=category==='HASARD'
   ?await rpc('draw_for_partner_random',{p_session:requireUuid(sessionId)})
   :await rpc('draw_for_partner',{p_session:requireUuid(sessionId),
      p_preference:category,p_random:false});
  if(!Number.isInteger(result?.face)||result.face<1||result.face>100||
     !requireUuid(result?.id))throw new Error('Carte D100 non confirmée par le serveur');
  return result;
 }
 async function answer(challengeId,action){
  await identity();
  if(!['accepted','completed'].includes(action))
   throw new RangeError('Réponse au défi invalide');
  await rpc('answer_challenge',{p_id:requireUuid(challengeId),p_status:action});
  return true;
 }
 async function redraw(challengeId,action,{exclude=false}={}){
  await identity();
  if(!['pass','refuse'].includes(action)||typeof exclude!=='boolean'||
     action==='pass'&&exclude)throw new RangeError('Action de repige invalide');
  // Exactly the LR-015 atomic RPC used by the public app; the server
  // checks monthly pass quota, exclusions and replacement selection.
  return rpc('love_respond_and_redraw',{
    p_challenge:requireUuid(challengeId),p_action:action,p_exclude:exclude
  });
 }
 async function stop(sessionId){
  await identity();
  return rpc('finish_couple_session',{p_session:requireUuid(sessionId),p_count:false});
 }
 return Object.freeze({identity,snapshot,weekly,start,d6,d100,answer,redraw,stop});
}
