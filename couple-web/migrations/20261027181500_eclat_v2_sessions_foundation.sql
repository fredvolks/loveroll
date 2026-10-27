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
 substep_index smallint not null default 1 check (substep_index in (1,2)),
 branch text check (branch in ('Tendresse','Jeu','Mystère')),
 door_confirmed_scene smallint check (door_confirmed_scene in (1,5)),
 shared_contact_approved boolean not null default false,
 last_prediction jsonb,
 puzzle_solved_step smallint,
 puzzle_hint_level smallint not null default 0 check(puzzle_hint_level between 0 and 2),
 puzzle_helped boolean not null default false,
 story_decor smallint check(story_decor between 1 and 6),
 story_roles smallint check(story_roles between 1 and 6),
 story_constraint smallint check(story_constraint between 1 and 6),
 story_constraint_enabled boolean not null default true,
 story_decision_scene smallint check(story_decision_scene in (1,6)),
 story_rerolls integer not null default 0 check(story_rerolls>=0),
 timer_mode text check(timer_mode in ('with','without')),
 timer_remaining integer check(timer_remaining>=0),
 timer_deadline timestamptz,
 timer_extensions integer not null default 0 check(timer_extensions>=0),
 playlist_shared jsonb,
 shared_cards smallint[],
 selected_card smallint check(selected_card between 1 and 12),
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
-- Contact consent is short lived, proposal-specific and author-only.
create table public.love_eclat_v2_contact_choices (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 step_index smallint not null check (step_index between 1 and 8),
 user_id uuid not null references auth.users(id),
 proposal text not null check (proposal='mains'),
 response text not null check (response in ('yes','other','pass')),
 updated_at timestamptz not null default now(),
 primary key(session_id,step_index,user_id)
);
alter table public.love_eclat_v2_contact_choices enable row level security;
revoke all on public.love_eclat_v2_contact_choices from public,anon,authenticated;
alter table public.love_eclat_v2_door_votes enable row level security;
revoke all on public.love_eclat_v2_door_votes from public,anon,authenticated;
-- Private until BOTH members explicitly reveal one question; never direct SELECT.
create table public.love_eclat_v2_predictions (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 step_index smallint not null check(step_index between 1 and 8),
 substep_index smallint not null check(substep_index in (1,2)),
 user_id uuid not null references auth.users(id),
 answer smallint not null check(answer between 0 and 2),
 prediction smallint not null check(prediction between 0 and 2),
 primary key(session_id,step_index,substep_index,user_id)
);
alter table public.love_eclat_v2_predictions enable row level security;
revoke all on public.love_eclat_v2_predictions from public,anon,authenticated;
-- Coffret 05: publicly shared proposal and partner's reply, no private preference.
-- The actor is verified by RPC; shared-phone entries use the creator account,
-- never a forged partner user id.
create table public.love_eclat_v2_attentions (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 step_index smallint not null check(step_index between 1 and 8),
 substep_index smallint not null check(substep_index in (1,2)),
 attention_index smallint not null check(attention_index between 0 and 2),
 response text check(response in ('yes','other','pass')),
 updated_at timestamptz not null default now(),
 primary key(session_id,step_index,substep_index)
);
alter table public.love_eclat_v2_attentions enable row level security;
revoke all on public.love_eclat_v2_attentions from public,anon,authenticated;
-- Coffret 08: notes visible only to their author until voluntary reveal.
-- No audio/media files, lyrics or streaming integrations.
create table public.love_eclat_v2_music_notes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 theme smallint not null check(theme between 1 and 5),
 user_id uuid not null references auth.users(id),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 artist text check(artist is null or char_length(artist)<=120),
 revealed boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(session_id,theme,user_id)
);
-- Pending playlist drafts are author-only. The partner never reads an unapproved order.
create table public.love_eclat_v2_playlist_votes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 slots smallint[] not null check(cardinality(slots) between 1 and 5),
 primary key(session_id,user_id)
);
alter table public.love_eclat_v2_playlist_votes enable row level security;
revoke all on public.love_eclat_v2_playlist_votes from public,anon,authenticated;
alter table public.love_eclat_v2_music_notes enable row level security;
revoke all on public.love_eclat_v2_music_notes from public,anon,authenticated;
-- Story constraint reroll history and independent, one-user-per-vote choices.
create table public.love_eclat_v2_story_votes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 scene_number smallint not null check(scene_number in (1,6)),
 user_id uuid not null references auth.users(id),
 action text not null check(action in ('keep','reroll','off')),
 updated_at timestamptz not null default now(),
 primary key(session_id,scene_number,user_id)
);
create table public.love_eclat_v2_story_history (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 sequence integer not null check(sequence>=1),
 scene_number smallint not null check(scene_number in (1,6)),
 previous_face smallint not null check(previous_face between 1 and 6),
 next_face smallint not null check(next_face between 1 and 6),
 decided_at timestamptz not null default now(),
 primary key(session_id,sequence)
);
alter table public.love_eclat_v2_story_votes enable row level security;
alter table public.love_eclat_v2_story_history enable row level security;
revoke all on public.love_eclat_v2_story_votes from public,anon,authenticated;
revoke all on public.love_eclat_v2_story_history from public,anon,authenticated;
-- Coffret 09: private until two independent validations, then REMOVE raw picks.
create table public.love_eclat_v2_card_choices (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 selected smallint[] not null,
 validated_at timestamptz not null default now(),
 primary key(session_id,user_id),
 constraint eclat_v2_card_choice_max3 check(cardinality(selected)<=3)
);
create table public.love_eclat_v2_card_votes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 step_index smallint not null check(step_index between 1 and 8),
 user_id uuid not null references auth.users(id),
 card smallint not null check(card between 1 and 12),
 updated_at timestamptz not null default now(),
 primary key(session_id,step_index,user_id)
);
alter table public.love_eclat_v2_card_choices enable row level security;
alter table public.love_eclat_v2_card_votes enable row level security;
revoke all on public.love_eclat_v2_card_choices from public,anon,authenticated;
revoke all on public.love_eclat_v2_card_votes from public,anon,authenticated;
create table public.love_eclat_v2_timer_votes (
 session_id uuid not null references public.love_eclat_v2_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 mode text not null check(mode in ('with','without')),
 primary key(session_id,user_id)
);
alter table public.love_eclat_v2_timer_votes enable row level security;
revoke all on public.love_eclat_v2_timer_votes from public,anon,authenticated;
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

-- Native PostgreSQL CSPRNG UUID, rejection sampling 0..251 => unbiased D6.
-- No dependency on LoveRoll's official D6/D100 rolls or their quotas.
create function public.love_eclat_v2_die_d6()
 returns smallint language plpgsql volatile set search_path='' as $$
declare byte_value integer;
begin
 loop
  byte_value:=get_byte(uuid_send(gen_random_uuid()),0);
  if byte_value<252 then return ((byte_value % 6)+1)::smallint;end if;
 end loop;
end;
$$;
revoke all on function public.love_eclat_v2_die_d6() from public,anon,authenticated;

-- Returns only metadata and the caller's own readiness, never another's private answers.
create function public.love_eclat_v2_status(p_session uuid default null)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype;
 v_ready integer; v_mine boolean; v_type text; v_door_vote text;
 v_contact_yes integer; v_my_contact text; v_my_answer integer;v_my_guess integer;
 v_attention_index integer;v_attention_response text;
 v_music_note jsonb;v_revealed_music jsonb;v_theme integer;
 v_my_playlist smallint[];
 v_story_vote text;v_story_history jsonb;v_my_cards smallint[];v_my_card_ready boolean;
 v_timer_vote text;v_timer_remaining integer;
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
 select count(*) filter(where response='yes'), max(response) filter(where user_id=v_actor)
  into v_contact_yes,v_my_contact from public.love_eclat_v2_contact_choices
  where session_id=v_s.id and step_index=v_s.chapter_index and proposal='mains';
 select answer,prediction into v_my_answer,v_my_guess
 from public.love_eclat_v2_predictions
 where session_id=v_s.id and step_index=v_s.chapter_index
   and substep_index=v_s.substep_index and user_id=v_actor;
 select attention_index,response into v_attention_index,v_attention_response
 from public.love_eclat_v2_attentions
 where session_id=v_s.id and step_index=v_s.chapter_index and substep_index=v_s.substep_index;
 v_theme:=case
   when v_s.coffret_id<>8 then null
   when v_s.chapter_plan[v_s.chapter_index]=1 then 1
   when v_s.chapter_plan[v_s.chapter_index]=3 then v_s.substep_index+1
   when v_s.chapter_plan[v_s.chapter_index]=6 then v_s.substep_index+3
   else null end;
 if v_theme is not null then
  select jsonb_build_object('title',title,'artist',artist,'revealed',revealed)
   into v_music_note from public.love_eclat_v2_music_notes
   where session_id=v_s.id and theme=v_theme and user_id=v_actor;
 end if;
 if v_s.coffret_id=8 then
  select coalesce(jsonb_agg(jsonb_build_object(
    'theme',theme,'owner',user_id,'title',title,'artist',artist)
    order by theme,user_id),'[]'::jsonb) into v_revealed_music
   from public.love_eclat_v2_music_notes where session_id=v_s.id and revealed=true;
 end if;
 select slots into v_my_playlist from public.love_eclat_v2_playlist_votes
  where session_id=v_s.id and user_id=v_actor;
 select action into v_story_vote from public.love_eclat_v2_story_votes
 where session_id=v_s.id and scene_number=v_s.chapter_plan[v_s.chapter_index] and user_id=v_actor;
 if v_s.coffret_id=12 then
  select coalesce(jsonb_agg(jsonb_build_object('sequence',sequence,
   'scene',scene_number,'previous',previous_face,'next',next_face) order by sequence),'[]'::jsonb)
  into v_story_history from public.love_eclat_v2_story_history where session_id=v_s.id;
 end if;
 select selected into v_my_cards from public.love_eclat_v2_card_choices
 where session_id=v_s.id and user_id=v_actor;
 v_my_card_ready=v_my_cards is not null or v_s.shared_cards is not null;
 select mode into v_timer_vote from public.love_eclat_v2_timer_votes
  where session_id=v_s.id and user_id=v_actor;
 v_timer_remaining:=case when v_s.timer_deadline is null then v_s.timer_remaining
  else greatest(0,ceil(extract(epoch from (v_s.timer_deadline-clock_timestamp())))::integer) end;
 select count(*),coalesce(bool_or(user_id=v_actor),false) into v_ready,v_mine
 from public.love_eclat_v2_readiness where session_id=v_s.id and step_index=v_s.chapter_index;
 return jsonb_build_object(
  'access',true,'active',v_s.ended_at is null,'session_id',v_s.id,
  'content_version',2,'coffret_id',v_s.coffret_id,'minutes',v_s.minutes,
  'variant',v_s.variant,'device_mode',v_s.device_mode,'role_a',v_s.role_a,'role_b',v_s.role_b,
  'chapter_index',v_s.chapter_index,'chapter_total',cardinality(v_s.chapter_plan),
  'substep_index',v_s.substep_index,
  'my_answer',v_my_answer,'my_prediction',v_my_guess,
  'attention_index',v_attention_index,'attention_response',v_attention_response,
  'my_cards',coalesce(v_my_cards,'{}'::smallint[]),
  'my_cards_ready',v_my_card_ready,
  'common_cards',v_s.shared_cards,'selected_card',v_s.selected_card,
  'story_dice',case when v_s.coffret_id=12 then jsonb_build_object(
    'decor',v_s.story_decor,'roles',v_s.story_roles,'constraint',v_s.story_constraint) else null end,
  'constraint_rerolls',v_s.story_rerolls,
  'constraint_enabled',v_s.story_constraint_enabled,
  'story_decision_confirmed',coalesce(v_s.story_decision_scene=v_s.chapter_plan[v_s.chapter_index],false),
  'my_story_vote',v_story_vote,'story_reroll_history',v_story_history,
  'music_theme',v_theme,'my_music_note',v_music_note
 ) || jsonb_build_object(
  'revealed_music',v_revealed_music,
  'my_playlist_slots',v_my_playlist,'playlist_shared',v_s.playlist_shared,
  'timer_mode',v_s.timer_mode,'my_timer_vote',v_timer_vote,
  'timer_running',v_s.timer_deadline is not null,
  'timer_remaining_seconds',v_timer_remaining,
  'timer_expired',coalesce(v_timer_remaining=0,false),
  'timer_extensions',v_s.timer_extensions,
  'puzzle_solved',coalesce(v_s.puzzle_solved_step=v_s.chapter_index,false),
  'puzzle_hint_level',v_s.puzzle_hint_level,'puzzle_helped',v_s.puzzle_helped,
  'reveal_answers',v_s.last_prediction,
  'chapter_number',v_s.chapter_plan[v_s.chapter_index],
  'budget_minutes',v_s.budget_plan[v_s.chapter_index],
  'scene_type',v_type,'state',v_s.state,'skipped_scenes',v_s.skipped_scenes,
  'branch',v_s.branch,'door_confirmed',v_s.door_confirmed_scene=v_s.chapter_plan[v_s.chapter_index],
  'my_door_vote',v_door_vote,
  'contact_approved',case when v_s.coffret_id=3 and v_s.chapter_plan[v_s.chapter_index]=6
    then case when v_s.device_mode='one' then v_s.shared_contact_approved
              else v_contact_yes=2 end
    else false end,
  'my_contact_response',v_my_contact,
  'revealed',coalesce(v_s.revealed_step=v_s.chapter_index,false),
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
  (couple_id,coffret_id,minutes,variant,device_mode,role_a,role_b,chapter_plan,budget_plan,
   story_decor,story_roles,story_constraint)
 values(v_couple,p_coffret,p_minutes,v_variant,p_device_mode,v_actor,v_partner,v_plan,v_budget,
  case when p_coffret=12 then public.love_eclat_v2_die_d6() else null end,
  case when p_coffret=12 then public.love_eclat_v2_die_d6() else null end,
  case when p_coffret=12 then public.love_eclat_v2_die_d6() else null end)
 returning id into v_new;
 return public.love_eclat_v2_status(v_new);
end;
$$;

-- Private author-only answer+prediction. A different user cannot write for B.
-- Editing one answer automatically removes ONLY the author's readiness.
create function public.love_eclat_v2_predict(
 p_session uuid,p_expected_step integer,p_answer integer,p_prediction integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
begin
 perform public.love_require_verified_identity();
 if p_answer is null or p_answer not between 0 and 2 or
    p_prediction is null or p_prediction not between 0 and 2 then
  raise exception 'Trois réponses seulement';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in (v_s.role_a,v_s.role_b)
    or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>7 or v_s.device_mode<>'two' or v_s.state<>'active'
    or v_s.chapter_plan[v_s.chapter_index] not in (1,3,6)
    or v_s.revealed_step=v_s.chapter_index then
  raise exception 'Cette question privée n’est pas active';end if;
 insert into public.love_eclat_v2_predictions
  (session_id,step_index,substep_index,user_id,answer,prediction)
 values(p_session,v_s.chapter_index,v_s.substep_index,v_actor,p_answer,p_prediction)
 on conflict(session_id,step_index,substep_index,user_id)
 do update set answer=excluded.answer,prediction=excluded.prediction;
 delete from public.love_eclat_v2_readiness
  where session_id=p_session and step_index=v_s.chapter_index and user_id=v_actor;
 return public.love_eclat_v2_status(p_session);
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
 if v_s.coffret_id=9 then
  raise exception 'Validez les cartes avec le bouton privé dédié';end if;
 if p_ready is null then raise exception 'Confirmation explicite requise'; end if;
 if p_ready and v_s.coffret_id=7 and
  not exists(select 1 from public.love_eclat_v2_predictions
   where session_id=p_session and step_index=v_s.chapter_index
    and substep_index=v_s.substep_index and user_id=v_actor) then
  raise exception 'Réponse et prédiction requises avant de confirmer';end if;
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
declare v_actor uuid:=auth.uid(); v_couple uuid; v_s public.love_eclat_v2_sessions%rowtype; v_ready int;v_revealed jsonb;
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
 if v_s.coffret_id=9 then
  raise exception 'La comparaison des cartes passe par les deux sélections privées';end if;
 if v_s.revealed_step=v_s.chapter_index then return public.love_eclat_v2_status(p_session); end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord oral commun explicite requis'; end if;
 else
  select count(*) into v_ready from public.love_eclat_v2_readiness
   where session_id=p_session and step_index=v_s.chapter_index and user_id in (v_s.role_a,v_s.role_b);
  if v_ready<>2 then raise exception 'Attendre les deux confirmations distinctes'; end if;
 end if;
 if v_s.coffret_id=7 and v_s.device_mode='two' then
  select jsonb_object_agg(case when p.user_id=v_s.role_a then 'A' else 'B' end,
     jsonb_build_object('answer',p.answer,'prediction',p.prediction))
   into v_revealed from public.love_eclat_v2_predictions p
   where p.session_id=p_session and p.step_index=v_s.chapter_index
     and p.substep_index=v_s.substep_index
     and p.user_id in (v_s.role_a,v_s.role_b);
  if coalesce((select count(*) from jsonb_object_keys(coalesce(v_revealed,'{}'::jsonb))),0)<>2 then
   raise exception 'Deux réponses distinctes requises';end if;
  v_revealed=jsonb_build_object('question',case v_s.chapter_plan[v_s.chapter_index]
   when 1 then 1 when 3 then v_s.substep_index+1
   when 6 then v_s.substep_index+3 end,'players',v_revealed);
  delete from public.love_eclat_v2_predictions
   where session_id=p_session and step_index=v_s.chapter_index
     and substep_index=v_s.substep_index;
 end if;
 if ((v_s.coffret_id=1 and v_s.chapter_plan[v_s.chapter_index]=6)
     or (v_s.coffret_id in (7,8) and v_s.chapter_plan[v_s.chapter_index] in (3,6)))
    and v_s.substep_index=1 then
  -- Revoke both readiness markers before exposing a *new* private question.
  delete from public.love_eclat_v2_readiness
   where session_id=p_session and step_index=v_s.chapter_index;
  update public.love_eclat_v2_sessions
   set substep_index=2,last_prediction=v_revealed,updated_at=now() where id=p_session;
 else
  update public.love_eclat_v2_sessions
   set revealed_step=chapter_index,last_prediction=v_revealed,updated_at=now() where id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Coffret 04 only: mutual agreement, no votes on behalf of the other person.
create function public.love_eclat_v2_choose_door(
 p_session uuid,p_expected_step integer,p_door text,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
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
$$;

-- Coffret 03 / scene 6: consent is specifically for the proposed massage.
-- "other" and "pass" are complete alternatives; neither is an approval.
create function public.love_eclat_v2_contact_answer(
 p_session uuid,p_expected_step integer,p_proposal text,p_answer text,
 p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
begin
 perform public.love_require_verified_identity();
 if p_proposal is distinct from 'mains'
  or p_answer is null or p_answer not in ('yes','other','pass') then
  raise exception 'Réponse de contact non approuvée';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>3 or v_s.chapter_plan[v_s.chapter_index]<>6 or v_s.state<>'active' then
  raise exception 'Contact non prévu dans cette scène';end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or (p_answer='yes' and p_joint_oral is distinct from true) then
   raise exception 'Accord oral des deux requis pour le contact';end if;
  update public.love_eclat_v2_sessions
   set shared_contact_approved=(p_answer='yes'),updated_at=now() where id=p_session;
 else
  insert into public.love_eclat_v2_contact_choices
   (session_id,step_index,user_id,proposal,response)
   values(p_session,v_s.chapter_index,v_actor,p_proposal,p_answer)
  on conflict(session_id,step_index,user_id)
  do update set response=excluded.response,updated_at=now();
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Coffret 06: fixed solutions, optional help and unlimited retries.
create function public.love_eclat_v2_puzzle_try(
 p_session uuid,p_expected_step integer,p_place text default null,
 p_time text default null,p_code text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_scene integer;v_correct boolean:=false;v_allowed boolean:=false;
begin
 perform public.love_require_verified_identity();
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session) || jsonb_build_object('correct',false);end if;
 v_scene:=v_s.chapter_plan[v_s.chapter_index];
 if v_s.coffret_id<>6 or v_scene not in (3,6) or v_s.state<>'active' then
  raise exception 'Enquête non active à cette scène';end if;
 if v_scene=3 then
  if p_code is not null or p_place is null or p_time is null then
   raise exception 'Lieu et heure requis';end if;
  if v_s.variant=0 then
   v_allowed:=p_place=any(array['Jardin','Salon','Verrière','Bibliothèque'])
    and p_time=any(array['21 h 10','21 h 20','21 h 30','21 h 40']);
   v_correct:=p_place='Verrière' and p_time='21 h 30';
  else
   v_allowed:=p_place=any(array['Kiosque','Roseraie','Pavillon','Fontaine'])
    and p_time=any(array['20 h 15','20 h 30','20 h 45','21 h 00']);
   v_correct:=p_place='Pavillon' and p_time='20 h 45';
  end if;
 else
  if p_place is not null or p_time is not null or p_code is null then
   raise exception 'Un code proposé est requis';end if;
  if v_s.variant=0 then
   v_allowed:=p_code=any(array['247','481','629']);v_correct:=p_code='247';
  else
   v_allowed:=p_code=any(array['315','562','627']);v_correct:=p_code='562';
  end if;
 end if;
 if not v_allowed then raise exception 'Option d’enquête inconnue';end if;
 if v_correct then update public.love_eclat_v2_sessions
  set puzzle_solved_step=chapter_index,updated_at=now() where id=p_session;end if;
 return public.love_eclat_v2_status(p_session)||jsonb_build_object('correct',v_correct);
end;
$$;
create function public.love_eclat_v2_puzzle_help(
 p_session uuid,p_expected_step integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
begin
 perform public.love_require_verified_identity();
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>6 or v_s.chapter_plan[v_s.chapter_index] not in (3,6)
  or v_s.state<>'active' then raise exception 'Aide indisponible';end if;
 update public.love_eclat_v2_sessions
  set puzzle_hint_level=least(2,puzzle_hint_level+1),
      puzzle_helped=case when puzzle_hint_level>=1 then true else puzzle_helped end,
      updated_at=now() where id=p_session;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Coffret 05: proposing and replying are separate, authenticated actions.
create function public.love_eclat_v2_attention_propose(
 p_session uuid,p_expected_step integer,p_attention integer,
 p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_author uuid;v_response text;
begin
 perform public.love_require_verified_identity();
 if p_attention is null or p_attention not between 0 and 2 then
  raise exception 'Attention non prévue';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in (v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if not ((v_s.coffret_id=5 and v_s.chapter_plan[v_s.chapter_index]=6) or
    (v_s.coffret_id=11 and v_s.chapter_plan[v_s.chapter_index] in (3,6))) or v_s.state<>'active' then
  raise exception 'Attention non active';end if;
 v_author:=case when (v_s.coffret_id=5 and v_s.substep_index=1)
  or (v_s.coffret_id=11 and v_s.chapter_plan[v_s.chapter_index]=3)
  then v_s.role_a else v_s.role_b end;
 if v_s.device_mode='two' and v_actor<>v_author then
  raise exception 'Seul le partenaire qui propose peut choisir';
 elsif v_s.device_mode='one' and (v_actor<>v_s.role_a or p_joint_oral is distinct from true) then
  raise exception 'Proposition orale du couple requise';end if;
 select response into v_response from public.love_eclat_v2_attentions
  where session_id=p_session and step_index=v_s.chapter_index and substep_index=v_s.substep_index;
 if v_response in ('yes','pass') then
  raise exception 'Tour déjà décidé';end if;
 insert into public.love_eclat_v2_attentions
 (session_id,step_index,substep_index,attention_index,response)
 values(p_session,v_s.chapter_index,v_s.substep_index,p_attention,null)
 on conflict(session_id,step_index,substep_index)
 do update set attention_index=excluded.attention_index,response=null,updated_at=now();
 return public.love_eclat_v2_status(p_session);
end;
$$;
create function public.love_eclat_v2_attention_reply(
 p_session uuid,p_expected_step integer,p_answer text,
 p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_receiver uuid;v_count int;v_existing text;
begin
 perform public.love_require_verified_identity();
 if p_answer is null or p_answer not in ('yes','other','pass') then
  raise exception 'Réponse attention non prévue';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if not ((v_s.coffret_id=5 and v_s.chapter_plan[v_s.chapter_index]=6) or
    (v_s.coffret_id=11 and v_s.chapter_plan[v_s.chapter_index] in (3,6))) or v_s.state<>'active' then
  raise exception 'Réponse attention non active';end if;
 v_receiver:=case when (v_s.coffret_id=5 and v_s.substep_index=1)
  or (v_s.coffret_id=11 and v_s.chapter_plan[v_s.chapter_index]=3)
  then v_s.role_b else v_s.role_a end;
 if v_s.device_mode='two' and v_actor<>v_receiver then
  raise exception 'Seul le destinataire peut répondre';
 elsif v_s.device_mode='one' and (v_actor<>v_s.role_a or p_joint_oral is distinct from true) then
  raise exception 'Réponse orale commune requise';end if;
 select count(*),max(response) into v_count,v_existing
  from public.love_eclat_v2_attentions
  where session_id=p_session and step_index=v_s.chapter_index and substep_index=v_s.substep_index;
 if v_count<>1 then raise exception 'Choisir une attention avant de répondre';end if;
 if v_existing in ('yes','pass') then
  raise exception 'Tour déjà décidé';end if;
 update public.love_eclat_v2_attentions set response=p_answer,updated_at=now()
 where session_id=p_session and step_index=v_s.chapter_index and substep_index=v_s.substep_index;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Music note: own account only; a shared phone never impersonates B.
create function public.love_eclat_v2_music_note(
 p_session uuid,p_expected_step integer,p_title text,p_artist text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_theme integer;v_was_revealed boolean;
begin
 perform public.love_require_verified_identity();
 if p_title is null or char_length(btrim(p_title)) not between 1 and 120
  or (p_artist is not null and char_length(p_artist)>120) then
  raise exception 'Titre ou artiste invalide';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>8 or v_s.device_mode<>'two' or v_s.state<>'active'
  or v_s.chapter_plan[v_s.chapter_index] not in (1,3,6) then
  raise exception 'Note de musique privée indisponible';end if;
 v_theme:=case v_s.chapter_plan[v_s.chapter_index]
  when 1 then 1 when 3 then v_s.substep_index+1
  when 6 then v_s.substep_index+3 end;
 select revealed into v_was_revealed from public.love_eclat_v2_music_notes
 where session_id=p_session and theme=v_theme and user_id=v_actor;
 if v_was_revealed=true then raise exception 'Titre déjà révélé : note non modifiable';end if;
 insert into public.love_eclat_v2_music_notes
 (session_id,theme,user_id,title,artist)
 values(p_session,v_theme,v_actor,btrim(p_title),nullif(btrim(coalesce(p_artist,'')),''))
 on conflict(session_id,theme,user_id)
 do update set title=excluded.title,artist=excluded.artist,updated_at=now();
 return public.love_eclat_v2_status(p_session);
end;
$$;
create function public.love_eclat_v2_music_reveal(
 p_session uuid,p_expected_step integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;v_theme integer;
begin
 perform public.love_require_verified_identity();
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>8 or v_s.device_mode<>'two' or v_s.state<>'active'
  or v_s.chapter_plan[v_s.chapter_index] not in (1,3,6) then
  raise exception 'Révélation de musique indisponible';end if;
 v_theme:=case v_s.chapter_plan[v_s.chapter_index]
  when 1 then 1 when 3 then v_s.substep_index+1
  when 6 then v_s.substep_index+3 end;
 update public.love_eclat_v2_music_notes
  set revealed=true,updated_at=now()
  where session_id=p_session and theme=v_theme and user_id=v_actor;
 if not found then raise exception 'Écrire son titre avant de le révéler';end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- One shared phone: authenticated creator records a joint oral agreement.
-- Two devices: two independent authenticated votes must match. No impersonation.
create function public.love_eclat_v2_story_vote(
 p_session uuid,p_expected_step integer,p_action text,
 p_expected_rerolls integer,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_scene int;v_count int;v_distinct int;v_new smallint;v_execute boolean:=false;
begin
 perform public.love_require_verified_identity();
 if p_action is null or p_action not in ('keep','reroll','off') or
   p_expected_rerolls is null or p_expected_rerolls<0 then
  raise exception 'Choix du récit inconnu';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
    or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index or
   p_expected_rerolls is distinct from v_s.story_rerolls then
  return public.love_eclat_v2_status(p_session);end if;
 v_scene:=v_s.chapter_plan[v_s.chapter_index];
 if v_s.coffret_id<>12 or v_scene not in (1,6) or v_s.state<>'active' then
  raise exception 'Relance hors de la scène autorisée';end if;
 if v_scene=1 and p_action='off' then
  raise exception 'Sans contrainte uniquement à la scène 6';end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord oral des deux requis';end if;
  v_execute:=true;
 else
  insert into public.love_eclat_v2_story_votes(session_id,scene_number,user_id,action)
  values(p_session,v_scene,v_actor,p_action)
  on conflict(session_id,scene_number,user_id)
   do update set action=excluded.action,updated_at=now();
  select count(*),count(distinct action) into v_count,v_distinct
    from public.love_eclat_v2_story_votes
    where session_id=p_session and scene_number=v_scene and user_id in (v_s.role_a,v_s.role_b);
  v_execute:=(v_count=2 and v_distinct=1);
 end if;
 if v_execute then
  if p_action='reroll' then
   v_new:=public.love_eclat_v2_die_d6();
   update public.love_eclat_v2_sessions
    set story_constraint=v_new,story_rerolls=story_rerolls+1,
       story_constraint_enabled=true,story_decision_scene=v_scene,updated_at=now() where id=p_session;
   insert into public.love_eclat_v2_story_history
    (session_id,sequence,scene_number,previous_face,next_face)
   values(p_session,v_s.story_rerolls+1,v_scene,v_s.story_constraint,v_new);
  else
   update public.love_eclat_v2_sessions
    set story_constraint_enabled=p_action='keep',story_decision_scene=v_scene,updated_at=now() where id=p_session;
  end if;
  delete from public.love_eclat_v2_story_votes
    where session_id=p_session and scene_number=v_scene;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Validates 0–3 numbered choices without receiving the other partner's picks.
create function public.love_eclat_v2_cards_submit(
 p_session uuid,p_expected_step integer,p_cards smallint[]
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_count int;v_common smallint[];
begin
 perform public.love_require_verified_identity();
 if p_cards is null or cardinality(p_cards)>3 or
   exists(select 1 from unnest(p_cards) x where x is null or x not between 1 and 12) or
   (select count(distinct x) from unnest(p_cards) x)<>cardinality(p_cards) then
  raise exception 'Choisissez de zéro à trois cartes distinctes';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in (v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>9 or v_s.device_mode<>'two' or v_s.chapter_plan[v_s.chapter_index]<>1
  or v_s.state<>'active' or v_s.shared_cards is not null then
  raise exception 'Sélections privées déjà terminées ou non autorisées';end if;
 insert into public.love_eclat_v2_card_choices(session_id,user_id,selected)
 values(p_session,v_actor,p_cards)
 on conflict(session_id,user_id)
 do update set selected=excluded.selected,validated_at=now();
 select count(*) into v_count from public.love_eclat_v2_card_choices where session_id=p_session
  and user_id in (v_s.role_a,v_s.role_b);
 if v_count=2 then
  select coalesce(array_agg(x order by x),'{}'::smallint[]) into v_common from (
   select unnest(selected) as x from public.love_eclat_v2_card_choices
    where session_id=p_session and user_id=v_s.role_a
   intersect
   select unnest(selected) as x from public.love_eclat_v2_card_choices
    where session_id=p_session and user_id=v_s.role_b
  ) q;
  update public.love_eclat_v2_sessions set shared_cards=v_common,
    revealed_step=chapter_index,updated_at=now() where id=p_session;
  -- Stronger than retention policy: delete raw selections immediately.
  delete from public.love_eclat_v2_card_choices where session_id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;
-- One phone: two personal selections stay local; only a jointly agreed
-- intersection can ever be saved. No B private answer written using A's identity.
create function public.love_eclat_v2_cards_shared(
 p_session uuid,p_expected_step integer,p_common smallint[],
 p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
begin
 perform public.love_require_verified_identity();
 if p_common is null or cardinality(p_common)>3 or
   exists(select 1 from unnest(p_common) x where x is null or x not between 1 and 12) or
   (select count(distinct x) from unnest(p_common) x)<>cardinality(p_common) then
  raise exception 'Intersection de cartes invalide';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>9 or v_s.device_mode<>'one' or v_s.chapter_plan[v_s.chapter_index]<>1
   or v_s.state<>'active' or v_s.shared_cards is not null or
   v_actor<>v_s.role_a or p_joint_oral is distinct from true then
  raise exception 'Accord oral commun explicite requis';end if;
 update public.love_eclat_v2_sessions set shared_cards=p_common,
  revealed_step=chapter_index,updated_at=now() where id=p_session;
 return public.love_eclat_v2_status(p_session);
end;
$$;
-- Scene 3: select only a mutually visible card; never pick a rejected idea.
create function public.love_eclat_v2_card_vote(
 p_session uuid,p_expected_step integer,p_card integer,
 p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_count int;v_distinct int;
begin
 perform public.love_require_verified_identity();
 if p_card is null or p_card not between 1 and 12 then
  raise exception 'Carte inconnue';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
   or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>9 or v_s.chapter_plan[v_s.chapter_index]<>3 or v_s.state<>'active'
  or v_s.shared_cards is null or not p_card=any(v_s.shared_cards) then
  raise exception 'Carte non commune ou étape indisponible';end if;
 if v_s.selected_card is not null then return public.love_eclat_v2_status(p_session);end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord oral commun explicite requis';end if;
  update public.love_eclat_v2_sessions set selected_card=p_card,updated_at=now() where id=p_session;
 else
  insert into public.love_eclat_v2_card_votes(session_id,step_index,user_id,card)
   values(p_session,v_s.chapter_index,v_actor,p_card)
   on conflict(session_id,step_index,user_id)
    do update set card=excluded.card,updated_at=now();
  select count(*),count(distinct card) into v_count,v_distinct
   from public.love_eclat_v2_card_votes
   where session_id=p_session and step_index=v_s.chapter_index
    and user_id in (v_s.role_a,v_s.role_b);
  if v_count=2 and v_distinct=1 then
   update public.love_eclat_v2_sessions set selected_card=p_card,updated_at=now()
    where id=p_session;
  end if;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Fixed durations for individual rounds, not the overall evening.
create function public.love_eclat_v2_round_seconds(p_scene integer,p_variant integer)
 returns integer language sql immutable set search_path='' as $$
 select case p_scene when 1 then 90 when 3 then 120
  when 4 then case when p_variant=1 then 180 else 90 end
  when 6 then case when p_variant=1 then 120 else 180 end
  when 7 then 90 else null end
$$;
revoke all on function public.love_eclat_v2_round_seconds(integer,integer) from public,anon,authenticated;

create function public.love_eclat_v2_timer_mode(
 p_session uuid,p_expected_step integer,p_mode text,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_count integer;v_different integer;
begin
 perform public.love_require_verified_identity();
 if p_mode is null or p_mode not in ('with','without') then raise exception 'Mode minuteur invalide';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
   raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>10 or v_s.state<>'active' or v_s.chapter_plan[v_s.chapter_index]<>1 then
  raise exception 'Choix de minuteur non disponible';end if;
 if v_s.timer_mode is not null then return public.love_eclat_v2_status(p_session);end if;
 if v_s.device_mode='one' then
  if v_actor<>v_s.role_a or p_joint_oral is distinct from true then
   raise exception 'Accord oral des deux requis';end if;
  update public.love_eclat_v2_sessions set timer_mode=p_mode,updated_at=now() where id=p_session;
 else
  insert into public.love_eclat_v2_timer_votes(session_id,user_id,mode)
   values(p_session,v_actor,p_mode) on conflict(session_id,user_id)
   do update set mode=excluded.mode;
  select count(*),count(distinct mode) into v_count,v_different
   from public.love_eclat_v2_timer_votes
   where session_id=p_session and user_id in(v_s.role_a,v_s.role_b);
  if v_count=2 and v_different=1 then
   update public.love_eclat_v2_sessions set timer_mode=p_mode,updated_at=now() where id=p_session;
   delete from public.love_eclat_v2_timer_votes where session_id=p_session;
  end if;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;
create function public.love_eclat_v2_timer_action(
 p_session uuid,p_expected_step integer,p_action text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_duration integer;v_rem integer;
begin
 perform public.love_require_verified_identity();
 if p_action is null or p_action not in ('start','pause','resume','extend')
 then raise exception 'Action minuteur invalide';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
   raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then return public.love_eclat_v2_status(p_session);end if;
 v_duration:=public.love_eclat_v2_round_seconds(v_s.chapter_plan[v_s.chapter_index],v_s.variant);
 if v_s.coffret_id<>10 or v_s.timer_mode<>'with' or v_duration is null or v_s.state<>'active' then
  raise exception 'Manche minutée non disponible';end if;
 v_rem:=case when v_s.timer_deadline is null then v_s.timer_remaining
  else greatest(0,ceil(extract(epoch from (v_s.timer_deadline-clock_timestamp())))::integer) end;
 if p_action in ('start','resume') and v_s.timer_deadline is null then
  if v_rem=0 then raise exception 'À zéro : prolonger ou voir la suite';end if;
  v_rem:=coalesce(v_rem,v_duration);
  update public.love_eclat_v2_sessions set timer_remaining=v_rem,
   timer_deadline=clock_timestamp()+make_interval(secs=>v_rem),updated_at=now() where id=p_session;
 elsif p_action='pause' and v_s.timer_deadline is not null then
  update public.love_eclat_v2_sessions set timer_remaining=v_rem,
   timer_deadline=null,updated_at=now() where id=p_session;
 elsif p_action='extend' then
  if v_rem is distinct from 0 then raise exception 'Prolonger seulement à zéro';end if;
  update public.love_eclat_v2_sessions set timer_remaining=60,
   timer_deadline=clock_timestamp()+interval '60 seconds',
   timer_extensions=timer_extensions+1,updated_at=now() where id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

-- Slot 1..10 maps to [T1 A,T1 B,...,T5 A,T5 B]; no title
-- may be voted unless its author has previously revealed it.
create function public.love_eclat_v2_playlist_vote(
 p_session uuid,p_expected_step integer,p_slots smallint[]
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_allowed integer;v_votes integer;v_distinct integer;v_playlist jsonb;
begin
 perform public.love_require_verified_identity();
 if p_slots is null or cardinality(p_slots) not between 1 and 5 or
    exists(select 1 from unnest(p_slots) as slot where slot is null or slot not between 1 and 10) or
    (select count(distinct slot) from unnest(p_slots) as slot)<>cardinality(p_slots) then
  raise exception 'Choisissez un à cinq titres distincts';end if;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>8 or v_s.device_mode<>'two' or v_s.state<>'active'
  or v_s.chapter_plan[v_s.chapter_index]<>8 then
  raise exception 'Playlist non disponible sur cette scène';end if;
 if v_s.playlist_shared is not null then return public.love_eclat_v2_status(p_session);end if;
 select count(*) into v_allowed from unnest(p_slots) slot
  join public.love_eclat_v2_music_notes n
   on n.session_id=p_session and n.revealed=true
   and n.theme=((slot.slot::integer+1)/2)
   and n.user_id=case when slot.slot%2=1 then v_s.role_a else v_s.role_b end;
 if v_allowed<>cardinality(p_slots) then
  raise exception 'La playlist ne contient que des titres révélés';end if;
 insert into public.love_eclat_v2_playlist_votes(session_id,user_id,slots)
  values(p_session,v_actor,p_slots)
  on conflict(session_id,user_id) do update set slots=excluded.slots;
 select count(*),count(distinct slots) into v_votes,v_distinct
  from public.love_eclat_v2_playlist_votes
   where session_id=p_session and user_id in(v_s.role_a,v_s.role_b);
 if v_votes=2 and v_distinct=1 then
  select jsonb_agg(jsonb_build_object('title',n.title,'artist',n.artist)
      order by slot.ord) into v_playlist
   from unnest(p_slots) with ordinality slot(num,ord)
   join public.love_eclat_v2_music_notes n on n.session_id=p_session and n.revealed=true
    and n.theme=((slot.num::integer+1)/2)
    and n.user_id=case when slot.num%2=1 then v_s.role_a else v_s.role_b end;
  update public.love_eclat_v2_sessions
   set playlist_shared=v_playlist,updated_at=now() where id=p_session;
  delete from public.love_eclat_v2_playlist_votes where session_id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;
-- A single-device pair can only commit the titles they have jointly revealed
-- and approved out loud; it never fabricates B's authenticated RPC submission.
create function public.love_eclat_v2_playlist_shared_phone(
 p_session uuid,p_expected_step integer,p_songs jsonb,p_joint_oral boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_couple uuid;v_s public.love_eclat_v2_sessions%rowtype;
 v_song jsonb;v_sanitized jsonb:='[]'::jsonb;v_title text;v_artist text;
begin
 perform public.love_require_verified_identity();
 if p_songs is null or jsonb_typeof(p_songs)<>'array' or
   jsonb_array_length(p_songs) not between 1 and 5 then
  raise exception 'Un à cinq titres sont requis';end if;
 for v_song in select value from jsonb_array_elements(p_songs) loop
  if jsonb_typeof(v_song)<>'object' or
    jsonb_typeof(v_song->'title') is distinct from 'string' or
    (v_song ? 'artist' and jsonb_typeof(v_song->'artist') not in ('string','null')) or
    exists(select 1 from jsonb_object_keys(v_song) as key where key not in ('title','artist')) then
   raise exception 'Titre ou artiste non autorisé';end if;
  v_title:=btrim(v_song->>'title');v_artist:=nullif(btrim(coalesce(v_song->>'artist','')),'');
  if char_length(v_title) not between 1 and 120 or
     (v_artist is not null and char_length(v_artist)>120) then
   raise exception 'Taille de chanson non autorisée';end if;
  v_sanitized:=v_sanitized||jsonb_build_array(jsonb_build_object('title',v_title,'artist',v_artist));
 end loop;
 select * into v_s from public.love_eclat_v2_sessions where id=p_session for update;
 if not found then raise exception 'Séance inconnue';end if;
 select couple_id into v_couple from public.couple_members where user_id=v_actor;
 if v_couple is distinct from v_s.couple_id or v_actor not in(v_s.role_a,v_s.role_b)
  or not public.love_eclat_has_access(v_s.couple_id) then
  raise exception 'Accès interdit' using errcode='42501';end if;
 if p_expected_step is distinct from v_s.chapter_index then
  return public.love_eclat_v2_status(p_session);end if;
 if v_s.coffret_id<>8 or v_s.device_mode<>'one' or v_s.state<>'active'
  or v_s.chapter_plan[v_s.chapter_index]<>8 or v_actor<>v_s.role_a or
   p_joint_oral is distinct from true then
  raise exception 'Accord oral des deux requis sur téléphone partagé';end if;
 if v_s.playlist_shared is null then
  update public.love_eclat_v2_sessions
   set playlist_shared=v_sanitized,updated_at=now() where id=p_session;
 end if;
 return public.love_eclat_v2_status(p_session);
end;
$$;

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
  update public.love_eclat_v2_sessions set state='paused',
    timer_remaining=case when timer_deadline is not null
      then greatest(0,ceil(extract(epoch from (timer_deadline-clock_timestamp())))::integer)
      else timer_remaining end,
    timer_deadline=null,updated_at=now() where id=p_session;
 elsif p_action='resume' then
  if v_s.state<>'paused' then return public.love_eclat_v2_status(p_session); end if;
  update public.love_eclat_v2_sessions set state='active',updated_at=now() where id=p_session;
 elsif p_action='stop' then
  delete from public.love_eclat_v2_card_choices where session_id=p_session;
  delete from public.love_eclat_v2_card_votes where session_id=p_session;
  delete from public.love_eclat_v2_playlist_votes where session_id=p_session;
  delete from public.love_eclat_v2_music_notes where session_id=p_session;
  update public.love_eclat_v2_sessions set state='interrupted',ended_at=now(),updated_at=now()
   where id=p_session;
 else
  if v_s.state<>'active' then raise exception 'Reprendre la séance avant de continuer'; end if;
  -- The creator is the common-scene controller; the other user may still pause,
  -- pass or stop, but cannot advance both people without the controller's act.
  if p_action='continue' and v_actor<>v_s.role_a then
   raise exception 'Seul le contrôleur de séance peut avancer';end if;
  v_type:=public.love_eclat_v2_scene_type(v_s.coffret_id,v_s.chapter_plan[v_s.chapter_index]);
  if p_action in ('continue','pass') and v_s.coffret_id=10 and
    v_s.chapter_plan[v_s.chapter_index]=1 and v_s.timer_mode is null then
   raise exception 'Choisir avec ou sans minuteur ensemble';end if;
  if p_action='continue' and v_s.coffret_id=9 and
    v_s.chapter_plan[v_s.chapter_index]=1 and v_s.shared_cards is null then
   raise exception 'Attendre les deux validations privées';end if;
  if p_action='continue' and v_s.coffret_id=9 and
    v_s.chapter_plan[v_s.chapter_index]=3 and
    cardinality(coalesce(v_s.shared_cards,'{}'::smallint[]))>0 and
    v_s.selected_card is null then
   raise exception 'Choisir ensemble une carte commune';end if;
  if p_action='continue' and v_s.coffret_id=12 and
    v_s.chapter_plan[v_s.chapter_index] in (1,6) and
    v_s.story_decision_scene is distinct from v_s.chapter_plan[v_s.chapter_index] then
   raise exception 'Attendre un choix commun de la contrainte';end if;
  if p_action='continue' and v_s.coffret_id=11 and
    v_s.chapter_plan[v_s.chapter_index] in (3,6) and
    not exists(select 1 from public.love_eclat_v2_attentions where session_id=p_session
     and step_index=v_s.chapter_index and substep_index=v_s.substep_index
     and response in ('yes','pass')) then
   raise exception 'Attendre la réponse volontaire au jeu de séduction';end if;
  if p_action='continue' and v_s.coffret_id=5 and v_s.chapter_plan[v_s.chapter_index]=6
   and not exists(select 1 from public.love_eclat_v2_attentions
    where session_id=p_session and step_index=v_s.chapter_index
      and substep_index=v_s.substep_index and response in ('yes','pass')) then
   raise exception 'Attendre Oui ou Passer pour cette attention';end if;
  if p_action='continue' and v_s.coffret_id=4 and
     v_s.chapter_plan[v_s.chapter_index] in (1,5) and
     v_s.door_confirmed_scene is distinct from v_s.chapter_plan[v_s.chapter_index] then
   raise exception 'Attendre le choix commun de la porte'; end if;
  if p_action='continue' and v_s.coffret_id=6 and
    v_s.chapter_plan[v_s.chapter_index] in (3,6) and
    v_s.puzzle_solved_step is distinct from v_s.chapter_index and v_s.puzzle_hint_level<2 then
   raise exception 'Résolvez l’enquête ou révélez la solution avec l’aide';end if;
  if p_action='continue' and v_type='Secret' and v_s.revealed_step is distinct from v_s.chapter_index then
   raise exception 'Révélation convenue requise avant de continuer'; end if;
  delete from public.love_eclat_v2_readiness where session_id=p_session and step_index=v_s.chapter_index;
  delete from public.love_eclat_v2_contact_choices
   where session_id=p_session and step_index=v_s.chapter_index;
  delete from public.love_eclat_v2_predictions
   where session_id=p_session and step_index=v_s.chapter_index;
  if v_s.coffret_id=9 and (v_s.chapter_plan[v_s.chapter_index]=1 or
     v_s.chapter_index=cardinality(v_s.chapter_plan)) then
   delete from public.love_eclat_v2_card_choices where session_id=p_session;
  end if;
  -- Do not delete current attention before checking its response.

  -- Short routes still include each question/theme: passing the first
  -- private subquestion moves to the second without revealing any answer.
  if p_action='pass' and v_s.coffret_id in (7,8) and
     v_s.chapter_plan[v_s.chapter_index] in (3,6) and v_s.substep_index=1 then
   update public.love_eclat_v2_sessions
    set substep_index=2,revealed_step=null,last_prediction=null,updated_at=now()
    where id=p_session;
   return public.love_eclat_v2_status(p_session);
  end if;
  if v_s.coffret_id=5 and v_s.chapter_plan[v_s.chapter_index]=6 and v_s.substep_index=1 then
   update public.love_eclat_v2_sessions
    set substep_index=2,updated_at=now() where id=p_session;
   return public.love_eclat_v2_status(p_session);
  end if;
  if p_action='pass' and v_s.coffret_id=6 and v_s.chapter_plan[v_s.chapter_index] in (2,3,5,6) then
   update public.love_eclat_v2_sessions set puzzle_helped=true where id=p_session;
  end if;
  v_finished:=v_s.chapter_index=cardinality(v_s.chapter_plan);
  if v_finished and v_s.coffret_id=8 then
   -- Only the consensually saved list remains; never retain unrevealed notes.
   delete from public.love_eclat_v2_playlist_votes where session_id=p_session;
   delete from public.love_eclat_v2_music_notes where session_id=p_session;
  end if;
  update public.love_eclat_v2_sessions
   set chapter_index=case when v_finished then chapter_index else chapter_index+1 end,
       skipped_scenes=case when p_action='pass'
          then array_append(skipped_scenes,chapter_plan[chapter_index])
          else skipped_scenes end,
       revealed_step=null,
       substep_index=1,
       last_prediction=null,
       puzzle_solved_step=null,puzzle_hint_level=0,
       timer_remaining=null,timer_deadline=null,timer_extensions=0,
       shared_contact_approved=false,
       branch=case when p_action='pass' and coffret_id=4 and chapter_plan[chapter_index]=1 and branch is null
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
revoke all on function public.love_eclat_v2_contact_answer(uuid,integer,text,text,boolean) from public,anon;
grant execute on function public.love_eclat_v2_contact_answer(uuid,integer,text,text,boolean) to authenticated;
revoke all on function public.love_eclat_v2_choose_door(uuid,integer,text,boolean) from public,anon;
grant execute on function public.love_eclat_v2_choose_door(uuid,integer,text,boolean) to authenticated;
revoke all on function public.love_eclat_v2_timer_mode(uuid,integer,text,boolean) from public,anon;
grant execute on function public.love_eclat_v2_timer_mode(uuid,integer,text,boolean) to authenticated;
revoke all on function public.love_eclat_v2_timer_action(uuid,integer,text) from public,anon;
grant execute on function public.love_eclat_v2_timer_action(uuid,integer,text) to authenticated;
revoke all on function public.love_eclat_v2_cards_submit(uuid,integer,smallint[]) from public,anon;
grant execute on function public.love_eclat_v2_cards_submit(uuid,integer,smallint[]) to authenticated;
revoke all on function public.love_eclat_v2_cards_shared(uuid,integer,smallint[],boolean) from public,anon;
grant execute on function public.love_eclat_v2_cards_shared(uuid,integer,smallint[],boolean) to authenticated;
revoke all on function public.love_eclat_v2_card_vote(uuid,integer,integer,boolean) from public,anon;
grant execute on function public.love_eclat_v2_card_vote(uuid,integer,integer,boolean) to authenticated;
revoke all on function public.love_eclat_v2_story_vote(uuid,integer,text,integer,boolean) from public,anon;
grant execute on function public.love_eclat_v2_story_vote(uuid,integer,text,integer,boolean) to authenticated;
revoke all on function public.love_eclat_v2_playlist_vote(uuid,integer,smallint[]) from public,anon;
grant execute on function public.love_eclat_v2_playlist_vote(uuid,integer,smallint[]) to authenticated;
revoke all on function public.love_eclat_v2_playlist_shared_phone(uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.love_eclat_v2_playlist_shared_phone(uuid,integer,jsonb,boolean) to authenticated;
revoke all on function public.love_eclat_v2_music_note(uuid,integer,text,text) from public,anon;
grant execute on function public.love_eclat_v2_music_note(uuid,integer,text,text) to authenticated;
revoke all on function public.love_eclat_v2_music_reveal(uuid,integer) from public,anon;
grant execute on function public.love_eclat_v2_music_reveal(uuid,integer) to authenticated;
revoke all on function public.love_eclat_v2_attention_propose(uuid,integer,integer,boolean) from public,anon;
grant execute on function public.love_eclat_v2_attention_propose(uuid,integer,integer,boolean) to authenticated;
revoke all on function public.love_eclat_v2_attention_reply(uuid,integer,text,boolean) from public,anon;
grant execute on function public.love_eclat_v2_attention_reply(uuid,integer,text,boolean) to authenticated;
revoke all on function public.love_eclat_v2_puzzle_try(uuid,integer,text,text,text) from public,anon;
grant execute on function public.love_eclat_v2_puzzle_try(uuid,integer,text,text,text) to authenticated;
revoke all on function public.love_eclat_v2_puzzle_help(uuid,integer) from public,anon;
grant execute on function public.love_eclat_v2_puzzle_help(uuid,integer) to authenticated;
revoke all on function public.love_eclat_v2_predict(uuid,integer,integer,integer) from public,anon;
grant execute on function public.love_eclat_v2_predict(uuid,integer,integer,integer) to authenticated;
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
