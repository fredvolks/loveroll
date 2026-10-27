-- LoveRoll Éclat V2 foundation. STAGED ONLY: deliberately not connected to the V1 UI.
-- Creates independent versioned sessions; no rewrite/delete of historical Éclat sessions.
-- Apply only after isolated PostgreSQL tests, security review and coordinated release.
begin;
create table public.love_eclat_v2_sessions (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 coffret_id smallint not null check (coffret_id between 1 and 12),
 content_version smallint not null default 2 check (content_version=2),
 minutes smallint not null check (minutes in (30,60,90)),
 variant smallint not null check (variant in (0,1)),
 device_mode text not null check (device_mode in ('one','two')),
 role_a uuid not null references auth.users(id),
 role_b uuid not null references auth.users(id),
 chapter_plan smallint[] not null,
 budget_plan smallint[] not null,
 chapter_index smallint not null default 1 check (chapter_index between 1 and 8),
 state text not null default 'active' check (state in ('active','paused','finished','interrupted')),
 skipped_scenes smallint[] not null default '{}'::smallint[],
 branch text check (branch in ('Tendresse','Jeu','Mystère')),
 door_confirmed_scene smallint check (door_confirmed_scene in (1,5)),
 revealed_step smallint check (revealed_step between 1 and 8),
 started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 ended_at timestamptz,
 constraint eclat_v2_distinct_roles check (role_a<>role_b),
 constraint eclat_v2_state_end check ((state in ('active','paused') and ended_at is null) or (state in ('finished','interrupted') and ended_at is not null)),
 constraint eclat_v2_canonical_plan check (
  (minutes=30 and chapter_plan=array[1,3,6,8]::smallint[] and budget_plan=array[5,8,12,5]::smallint[]) or
  (minutes=60 and chapter_plan=array[1,2,3,5,6,8]::smallint[] and budget_plan=array[5,8,12,12,15,8]::smallint[]) or
  (minutes=90 and chapter_plan=array[1,2,3,4,5,6,7,8]::smallint[] and budget_plan=array[5,10,15,10,15,15,10,10]::smallint[])
 ),
 constraint eclat_v2_valid_index check (chapter_index<=cardinality(chapter_plan))
);
create unique index love_eclat_v2_one_active on public.love_eclat_v2_sessions(couple_id)
 where ended_at is null;
create index love_eclat_v2_history on public.love_eclat_v2_sessions(couple_id,coffret_id,started_at desc);
-- A ready marker is NOT a private note, choice or consent for contact.
create table public.love_eclat_v2_readiness (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 step_index smallint not null check (step_index between 1 and 8),
 user_id uuid not null references auth.users(id),
 ready_at timestamptz not null default now(),
 primary key(session_id,step_index,user_id)
);
-- Both public door votes must match before a branch is accepted. No secret
-- answers are stored here, and an unresolved vote is visible only to its author.
create table public.love_eclat_v2_door_votes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 scene_number smallint not null check (scene_number in (1,5)),
 user_id uuid not null references auth.users(id),
 door text not null check (door in ('Tendresse','Jeu','Mystère')),
 updated_at timestamptz not null default now(),
 primary key(session_id,scene_number,user_id)
);
alter table public.love_eclat_v2_door_votes enable row level security;
revoke all on public.love_eclat_v2_door_votes from public,anon,authenticated;
alter table public.love_eclat_v2_sessions enable row level security;
alter table public.love_eclat_v2_readiness enable row level security;
-- Fail closed: only authenticated, guarded RPCs can access these tables.
revoke all on public.love_eclat_v2_sessions from public,anon,authenticated;
revoke all on public.love_eclat_v2_readiness from public,anon,authenticated;

-- Editorial scene types are frozen by the approved manuscript, not inferred
-- from old 4-variant V1 assets. Pure helper, no personally identifying data.
create function public.love_eclat_v2_scene_type(p_coffret integer,p_scene integer)
 returns text language plpgsql immutable set search_path='' as $$
begin
 if p_coffret not between 1 and 12 or p_scene not between 1 and 8 or p_coffret is null or p_scene is null
 then raise exception 'Scène Éclat inconnue'; end if;
 return case p_coffret
    when 1 then (array['Secret','Commun','Secret','Commun','Commun','Secret','Commun','Finale' ]::text[])[p_scene]
    when 2 then (array['Secret','Commun','Secret','Commun','Commun','Secret','Commun','Finale' ]::text[])[p_scene]
    when 3 then (array['Commun','Commun','Commun','Commun','Commun','Choix','Commun','Finale' ]::text[])[p_scene]
    when 4 then (array['Choix','Commun','Commun','Commun','Choix','Commun','Commun','Finale' ]::text[])[p_scene]
    when 5 then (array['Commun','Commun','Commun','Commun','Commun','Choix','Commun','Finale' ]::text[])[p_scene]
    when 6 then (array['Secret','Énigme','Énigme','Commun','Énigme','Énigme','Commun','Finale' ]::text[])[p_scene]
    when 7 then (array['Secret','Commun','Secret','Commun','Commun','Secret','Commun','Finale' ]::text[])[p_scene]
    when 8 then (array['Secret','Commun','Secret','Commun','Choix','Secret','Commun','Finale' ]::text[])[p_scene]
    when 9 then (array['Secret','Commun','Choix','Commun','Choix','Choix','Commun','Finale' ]::text[])[p_scene]
    when 10 then (array['Minuteur','Commun','Minuteur','Minuteur','Commun','Minuteur','Minuteur','Finale' ]::text[])[p_scene]
    when 11 then (array['Commun','Secret','Choix','Commun','Secret','Choix','Commun','Finale' ]::text[])[p_scene]
    when 12 then (array['Choix','Commun','Commun','Commun','Commun','Choix','Commun','Finale' ]::text[])[p_scene]
 end;
end;
$$;
revoke all on function public.love_eclat_v2_scene_type(integer,integer) from public,anon;
grant execute on function public.love_eclat_v2_scene_type(integer,integer) to authenticated;

-- Returns only metadata and the caller's own readiness, never another's private answers.
create function public.love_eclat_v2_status(p_session uuid default null)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype;
 v_ready integer; v_mine boolean; v_type text; v_door_vote text;
begin
 perform public.love_require_verified_identity();
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is null then raise exception 'Duo requis' using errcode='42501'; end if;
 if not public.love_eclat_has_access(v_couple) then
  return jsonb_build_object('access',false,'active',false);
 end if;
 if p_session is null then
  select * into v_s from public.love_eclat_v2_sessions
   where couple_id=v_couple and ended_at is null order by started_at desc limit 1;
 else
  select * into v_s from public.love_eclat_v2_sessions where id=p_session;
  if found and (v_s.couple_id<>v_couple or v_actor not in (v_s.role_a,v_s.role_b)) then
   raise exception 'Séance non autorisée' using errcode='42501';
  end if;
 end if;
 if not found then return jsonb_build_object('access',true,'active',false); end if;
 v_type:=public.love_eclat_v2_scene_type(v_s.coffret_id,v_s.chapter_plan[v_s.chapter_index]);
 select door into v_door_vote from public.love_eclat_v2_door_votes
  where session_id=v_s.id and scene_number=v_s.chapter_plan[v_s.chapter_index] and user_id=v_actor;
 select count(*),coalesce(bool_or(user_id=v_actor),false) into v_ready,v_mine
 from public.love_eclat_v2_readiness where session_id=v_s.id and step_index=v_s.chapter_index;
 return jsonb_build_object(
  'access',true,'active',v_s.ended_at is null,'session_id',v_s.id,
  'content_version',2,'coffret_id',v_s.coffret_id,'minutes',v_s.minutes,
  'variant',v_s.variant,'device_mode',v_s.device_mode,'role_a',v_s.role_a,'role_b',v_s.role_b,
  'chapter_index',v_s.chapter_index,'chapter_total',cardinality(v_s.chapter_plan),
  'chapter_number',v_s.chapter_plan[v_s.chapter_index],
  'budget_minutes',v_s.budget_plan[v_s.chapter_index],
  'scene_type',v_type,'state',v_s.state,'skipped_scenes',v_s.skipped_scenes,
  'branch',v_s.branch,'door_confirmed',v_s.door_confirmed_scene=v_s.chapter_plan[v_s.chapter_index],
  'my_door_vote',v_door_vote,
  'revealed',v_s.revealed_step=v_s.chapter_index,
  'ready_count',v_ready,'my_ready',v_mine,
  'can_reveal',case when v_type<>'Secret' then false
   when v_s.device_mode='two' then v_ready=2 else false end,
  'started_at',v_s.started_at,'updated_at',v_s.updated_at,'ended_at',v_s.ended_at);
end;
$$;

-- Serialize starts by locking the *couple*, so V0/V1 alternation cannot race.
-- A = authenticated session creator, B = current other verified member.
create function public.love_eclat_v2_start(
 p_coffret integer,p_minutes integer,p_device_mode text,p_replay_variant integer default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid(); v_couple uuid; v_partner uuid; v_members integer;
 v_existing uuid; v_variant integer; v_plan smallint[]; v_budget smallint[];
 v_new uuid;
begin
 perform public.love_require_verified_identity();
 if p_coffret is null or p_coffret not between 1 and 12 or p_minutes not in (30,60,90)
  or p_device_mode not in ('one','two') or p_device_mode is null
  or (p_replay_variant is not null and p_replay_variant not in (0,1))
 then raise exception 'Paramètres Éclat V2 invalides'; end if;
 select c.id into v_couple from public.couples c
  join public.couple_members m on m.couple_id=c.id
  where m.user_id=v_actor for update of c;
 if v_couple is null then raise exception 'Duo requis' using errcode='42501'; end if;
 select count(*) into v_members from public.couple_members where couple_id=v_couple;
 select user_id into v_partner from public.couple_members
  where couple_id=v_couple and user_id<>v_actor;
 if v_members<>2 or v_partner is null then raise exception 'Deux partenaires requis'; end if;
 if not public.love_eclat_has_access(v_couple) then
  raise exception 'Éclat Premium requis' using errcode='42501';
 end if;
 select id into v_existing from public.love_eclat_v2_sessions
  where couple_id=v_couple and ended_at is null;
 if found then return public.love_eclat_v2_status(v_existing); end if;
 -- No simultaneous incompatible V1/V2 sessions, no rewrite of V1 records.
 if exists(select 1 from public.love_eclat_sessions where couple_id=v_couple and ended_at is null) then
  raise exception 'Terminez la séance Éclat actuelle avant de commencer V2';
 end if;
 -- Replay is allowed ONLY for a previously started version of this coffret,
 -- never a way to skip the approved first-session V0 or choose arbitrary content.
 if p_replay_variant is not null and not exists(
  select 1 from public.love_eclat_v2_sessions
  where couple_id=v_couple and coffret_id=p_coffret and variant=p_replay_variant
 ) then raise exception 'Version à rejouer introuvable dans cet historique'; end if;
 select count(*)::integer % 2 into v_variant
  from public.love_eclat_v2_sessions where couple_id=v_couple and coffret_id=p_coffret;
 if p_replay_variant is not null then v_variant:=p_replay_variant; end if;
 v_plan:=case p_minutes when 30 then array[1,3,6,8]::smallint[]
  when 60 then array[1,2,3,5,6,8]::smallint[]
  else array[1,2,3,4,5,6,7,8]::smallint[] end;
 v_budget:=case p_minutes when 30 then array[5,8,12,5]::smallint[]
  when 60 then array[5,8,12,12,15,8]::smallint[]
  else array[5,10,15,10,15,15,10,10]::smallint[] end;
 insert into public.love_eclat_v2_sessions
  (couple_id,coffret_id,minutes,variant,device_mode,role_a,role_b,chapter_plan,budget_plan)
 values(v_couple,p_coffret,p_minutes,v_variant,p_device_mode,v_actor,v_partner,v_plan,v_budget)
 returning id into v_new;
 return public.love_eclat_v2_status(v_new);
end;
$$;

-- Two phones: each participant submits ONLY their OWN readiness.
-- These acknowledgements never impersonate the other account.
create function public.love_eclat_v2_mark_ready(
 p_session uuid,p_expected_step integer,p_ready boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype;
begin
 perform public.love_require_verified_identity();
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue'; end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501'; end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);
 end if;
 if v_s.state<>'active' or v_s.device_mode<>'two'
  or public.love_eclat_v2_scene_type(v_s.coffret_id,v_s.chapter_plan[v_s.chapter_index])<>'Secret'
  or v_s.revealed_step=v_s.chapter_index then
  raise exception 'Confirmation privée non autorisée à cette étape'; end if;
 if p_ready is null then raise exception 'Confirmation explicite requise'; end if;
 if p_ready then
  insert into public.love_eclat_v2_readiness(session_id,step_index,user_id)
  values(p_session,v_s.chapter_index,v_actor) on conflict do nothing;
 else
  delete from public.love_eclat_v2_readiness
   where session_id=p_session and step_index=v_s.chapter_index and user_id=v_actor;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Reveal is a deliberate separate action: two independent users OR one shared
-- phone with an explicit oral agreement. Never manufacture B's account choice.
create function public.love_eclat_v2_reveal(
 p_session uuid,p_expected_step integer,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype; v_ready int;
begin
 perform public.love_require_verified_identity();
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue'; end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501'; end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session); end if;
 if v_s.state<>'active' or
   public.love_eclat_v2_scene_type(v_s.coffret_id,v_s.chapter_plan[v_s.chapter_index])<>'Secret'
 then raise exception 'Aucune révélation à cette étape'; end if;
 if v_s.revealed_step=v_s.chapter_index then return public.love_eclat_v2_status(p_session); end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord oral commun explicite requis'; end if;
 else
  select count(*) into v_ready from public.love_eclat_v2_readiness
   where session_id=p_session and step_index=v_s.chapter_index and user_id in (v_s.role_a,v_s.role_b);
  if v_ready<>2 then raise exception 'Attendre les deux confirmations distinctes'; end if;
 end if;
 update public.love_eclat_v2_sessions
  set revealed_step=chapter_index,updated_at=now() where id=p_session;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Coffret 04 only: mutual agreement, no votes on behalf of the other person.
create function public.love_eclat_v2_choose_door(
 p_session uuid,p_expected_step integer,p_door text,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $
declare
 v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype;
 v_scene integer; v_count integer; v_distinct integer;
begin
 perform public.love_require_verified_identity();
 if p_door is null or p_door not in ('Tendresse','Jeu','Mystère') then
  raise exception 'Porte non approuvée'; end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 v_scene:=v_s.chapter_plan[v_s.chapter_index];
 if v_s.coffret_id<>4 or v_scene not in (1,5) or v_s.state<>'active' then
  raise exception 'Choix de porte non permis à cette étape';end if;
 if v_s.door_confirmed_scene=v_scene then return public.love_eclat_v2_status(p_session);end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord commun explicite requis';end if;
  update public.love_eclat_v2_sessions
    set branch=p_door,door_confirmed_scene=v_scene,updated_at=now() where id=v_s.id;
 else
  insert into public.love_eclat_v2_door_votes(session_id,scene_number,user_id,door)
    values(v_s.id,v_scene,v_actor,p_door)
    on conflict(session_id,scene_number,user_id)
    do update set door=excluded.door,updated_at=now();
  select count(*),count(distinct door) into v_count,v_distinct
    from public.love_eclat_v2_door_votes
    where session_id=v_s.id and scene_number=v_scene
      and user_id in (v_s.role_a,v_s.role_b);
  if v_count=2 and v_distinct=1 then
   update public.love_eclat_v2_sessions
    set branch=p_door,door_confirmed_scene=v_scene,updated_at=now() where id=v_s.id;
  end if;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$;

-- All state transitions are serializable per session lock and guarded by an
-- expected step token. Retrying a stale next/pass NEVER advances the next scene.
create function public.love_eclat_v2_act(
 p_session uuid,p_expected_step integer,p_action text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype;
 v_type text; v_finished boolean;
begin
 perform public.love_require_verified_identity();
 if p_action is null or p_action not in ('pause','resume','pass','continue','stop') then
  raise exception 'Action Éclat V2 inconnue'; end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue'; end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501'; end if;
 if v_s.ended_at is not null or p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session); end if;
 if p_action='pause' then
  if v_s.state<>'active' then return public.love_eclat_v2_status(p_session); end if;
  update public.love_eclat_v2_sessions set state='paused',updated_at=now() where id=p_session;
 elsif p_action='resume' then
  if v_s.state<>'paused' then return public.love_eclat_v2_status(p_session); end if;
  update public.love_eclat_v2_sessions set state='active',updated_at=now() where id=p_session;
 elsif p_action='stop' then
  update public.love_eclat_v2_sessions set state='interrupted',ended_at=now(),updated_at=now()
   where id=p_session;
 else
  if v_s.state<>'active' then raise exception 'Reprendre la séance avant de continuer'; end if;
  v_type:=public.love_eclat_v2_scene_type(v_s.coffret_id,v_s.chapter_plan[v_s.chapter_index]);
  if p_action='continue' and v_s.coffret_id=4 and
     v_s.chapter_plan[v_s.chapter_index] in (1,5) and
     v_s.door_confirmed_scene is distinct from v_s.chapter_plan[v_s.chapter_index] then
   raise exception 'Attendre le choix commun de la porte'; end if;
  if p_action='continue' and v_type='Secret' and v_s.revealed_step is distinct from v_s.chapter_index then
   raise exception 'Révélation convenue requise avant de continuer'; end if;
  delete from public.love_eclat_v2_readiness where session_id=p_session and step_index=v_s.chapter_index;
  v_finished:=v_s.chapter_index=cardinality(v_s.chapter_plan);
  update public.love_eclat_v2_sessions
   set chapter_index=case when v_finished then chapter_index else chapter_index+1 end,
       skipped_scenes=case when p_action='pass'
          then array_append(skipped_scenes,chapter_plan[chapter_index])
          else skipped_scenes end,
       revealed_step=null,
       branch=case when p_action='pass' and coffret_id=4 and chapter_plan[chapter_index]=1
          then 'Jeu' else branch end,
       door_confirmed_scene=case when p_action='pass' and coffret_id=4 and chapter_plan[chapter_index] in (1,5)
          then chapter_plan[chapter_index] else door_confirmed_scene end,
       state=case when v_finished then 'finished' else state end,
       ended_at=case when v_finished then now() else ended_at end,
       updated_at=now()
   where id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;
revoke all on function public.love_eclat_v2_choose_door(uuid,integer,text,boolean) from public,anon;
grant execute on function public.love_eclat_v2_choose_door(uuid,integer,text,boolean) to authenticated;
revoke all on function public.love_eclat_v2_status(uuid) from public,anon;
revoke all on function public.love_eclat_v2_start(integer,integer,text,integer) from public,anon;
revoke all on function public.love_eclat_v2_mark_ready(uuid,integer,boolean) from public,anon;
revoke all on function public.love_eclat_v2_reveal(uuid,integer,boolean) from public,anon;
revoke all on function public.love_eclat_v2_act(uuid,integer,text) from public,anon;
grant execute on function public.love_eclat_v2_status(uuid) to authenticated;
grant execute on function public.love_eclat_v2_start(integer,integer,text,integer) to authenticated;
grant execute on function public.love_eclat_v2_mark_ready(uuid,integer,boolean) to authenticated;
grant execute on function public.love_eclat_v2_reveal(uuid,integer,boolean) to authenticated;
grant execute on function public.love_eclat_v2_act(uuid,integer,text) to authenticated;
commit;
