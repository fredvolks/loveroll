-- LR-019 / LoveRoll: one shared, server-owned list of at most 5 hearts.
-- Install after schema.sql and the 35-card custom challenge migrations.
-- This migration adds management only. Do NOT claim D100 replay support until
-- the authoritative production draw RPC is integrated and verified separately.
create table if not exists public.love_evening_favorites(
 couple_id uuid not null references public.couples(id) on delete cascade,
 category text not null check(category in ('SENSUEL','SEXUEL')),
 card_id smallint not null check(card_id between 1 and 35),
 added_by uuid not null references auth.users(id),
 added_at timestamptz not null default now(),
 primary key(couple_id,category,card_id)
);
create index if not exists love_evening_favorites_by_couple
 on public.love_evening_favorites(couple_id,added_at);
alter table public.love_evening_favorites enable row level security;
drop policy if exists love_evening_favorites_couple_select
 on public.love_evening_favorites;
create policy love_evening_favorites_couple_select
 on public.love_evening_favorites for select to authenticated
 using(couple_private.is_member(couple_id));
revoke all on public.love_evening_favorites from public,anon,authenticated;
grant select on public.love_evening_favorites to authenticated;

-- Lock the couple row before checking quota so two simultaneous devices
-- cannot both add the sixth favorite. REPLACE is a single SQL transaction:
-- a failed insert rolls the removal back. No client-side direct writes.
create or replace function public.save_love_evening_favorite(
 p_couple uuid,
 p_category text,
 p_card_id integer,
 p_action text default 'add',
 p_replace_category text default null,
 p_replace_card_id integer default null
) returns integer
language plpgsql security definer set search_path='' as $$
declare
 v_count integer;
begin
 if auth.uid() is null then
  raise exception 'Connexion requise';
 end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) then
  raise exception 'Couple inaccessible';
 end if;
 if p_action not in ('add','remove','replace') or p_action is null then
  raise exception 'Action de favori invalide';
 end if;
 if p_category not in ('SENSUEL','SEXUEL') or p_category is null
    or p_card_id not between 1 and 35 or p_card_id is null then
  raise exception 'Carte invalide';
 end if;

 if p_action='remove' then
  delete from public.love_evening_favorites
  where couple_id=p_couple and category=p_category and card_id=p_card_id;
 else
  -- Built-in cards 1..25 always exist; 26..35 require the current
  -- couple-owned custom definition. A removed card cannot be favorited.
  if p_card_id>25 and not exists(
   select 1 from public.love_custom_challenges c
   where c.couple_id=p_couple and c.category=p_category and c.card_id=p_card_id
  ) then
   raise exception 'Carte personnalisée indisponible';
  end if;
  if not exists(
   select 1 from public.love_evening_favorites f
   where f.couple_id=p_couple and f.category=p_category and f.card_id=p_card_id
  ) then
   if p_action='replace' then
    if p_replace_category not in ('SENSUEL','SEXUEL')
       or p_replace_category is null or
       p_replace_card_id not between 1 and 35 or p_replace_card_id is null then
     raise exception 'Favori à remplacer invalide';
    end if;
    delete from public.love_evening_favorites
    where couple_id=p_couple and category=p_replace_category
      and card_id=p_replace_card_id;
    if not found then
     raise exception 'Favori à remplacer introuvable';
    end if;
   end if;
   select count(*) into v_count from public.love_evening_favorites
   where couple_id=p_couple;
   if v_count>=5 then
    raise exception 'Vous avez déjà 5 coups de cœur';
   end if;
   insert into public.love_evening_favorites(
    couple_id,category,card_id,added_by
   ) values(p_couple,p_category,p_card_id,auth.uid());
  end if;
 end if;

 select count(*) into v_count from public.love_evening_favorites
 where couple_id=p_couple;
 return v_count;
end;
$$;
revoke all on function public.save_love_evening_favorite(uuid,text,integer,text,text,integer)
 from public,anon;
grant execute on function public.save_love_evening_favorite(uuid,text,integer,text,text,integer)
 to authenticated;
notify pgrst,'reload schema';
