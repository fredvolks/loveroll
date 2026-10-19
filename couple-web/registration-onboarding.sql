-- LoveRoll identity onboarding — no prefilled partner names and no birthdays in Settings.
-- Reuses existing RLS-protected public.couple_profiles (only the user and their matched partner can see it).
alter table public.couple_profiles
 add column if not exists birthday_md text;
alter table public.couple_profiles
 drop constraint if exists couple_profiles_birthday_valid;
alter table public.couple_profiles
 add constraint couple_profiles_birthday_valid check (
  birthday_md is null or birthday_md ~ '^[0-9]{2}-[0-9]{2}$'
 );

create or replace function couple_private.validate_month_day(p_md text)
returns void language plpgsql immutable set search_path='' as $$
declare m integer; d integer; tested date;
begin
 if p_md is null or p_md !~ '^[0-9]{2}-[0-9]{2}$' then
  raise exception 'Date d’anniversaire requise (MM-JJ)';
 end if;
 m:=split_part(p_md,'-',1)::integer;
 d:=split_part(p_md,'-',2)::integer;
 tested:=make_date(2000,m,d);
end; $$;
revoke all on function couple_private.validate_month_day(text) from public, anon, authenticated;

-- The authenticated identity owns the profile, always.
create or replace function public.complete_love_registration(p_name text,p_birthday_md text)
returns void language plpgsql security definer set search_path='' as $$
declare c uuid; current jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Connexion requise';end if;
 if trim(coalesce(p_name,''))='' or char_length(trim(p_name))>80 then
  raise exception 'Un nom de 1 à 80 caractères est requis';end if;
 perform couple_private.validate_month_day(p_birthday_md);
 insert into public.couple_profiles(id,display_name,birthday_md)
 values(auth.uid(),trim(p_name),p_birthday_md)
 on conflict(id) do update
 set display_name=excluded.display_name,birthday_md=excluded.birthday_md;
 -- Existing matched profile updates only their own birthday in the shared calendar.
 select couple_id into c from public.couple_members where user_id=auth.uid();
 if c is not null then
  perform 1 from public.couples where id=c for update;
  insert into public.couple_occasion_settings(couple_id)values(c)
   on conflict(couple_id)do nothing;
  select birthday_by_user into current from public.couple_occasion_settings
   where couple_id=c for update;
  current:=jsonb_set(coalesce(current,'{}'::jsonb),
   array[auth.uid()::text],to_jsonb(p_birthday_md),true);
  update public.couple_occasion_settings
   set birthday_by_user=current,updated_at=now() where couple_id=c;
 end if;
end; $$;
revoke execute on function public.complete_love_registration(text,text) from public,anon;
grant execute on function public.complete_love_registration(text,text) to authenticated;

-- When the first person creates the match, save its anniversary at the same time.
create or replace function public.create_love_match(p_anniversary_md text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; birthday text;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select birthday_md into birthday from public.couple_profiles where id=auth.uid();
 if birthday is null then raise exception 'Complétez d’abord votre inscription';end if;
 if p_anniversary_md is not null then perform couple_private.validate_month_day(p_anniversary_md);end if;
 c:=public.create_my_couple(); -- Membership and uniqueness are enforced by the existing RPC.
 insert into public.couple_occasion_settings(couple_id,anniversary_md,birthday_by_user)
 values(c,p_anniversary_md,jsonb_build_object(auth.uid()::text,birthday));
 return c;
end; $$;
revoke execute on function public.create_love_match(text) from public,anon;
grant execute on function public.create_love_match(text) to authenticated;

-- The invited partner's verified identity is authenticated in the original RPC.
create or replace function public.accept_love_match(p_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; birthday text; current jsonb;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 select birthday_md into birthday from public.couple_profiles where id=auth.uid();
 if birthday is null then raise exception 'Complétez d’abord votre inscription';end if;
 c:=public.accept_pair_invite(p_token_hash);
 perform 1 from public.couples where id=c for update;
 insert into public.couple_occasion_settings(couple_id)values(c)
  on conflict(couple_id)do nothing;
 select birthday_by_user into current from public.couple_occasion_settings
  where couple_id=c for update;
 current:=jsonb_set(coalesce(current,'{}'::jsonb),
  array[auth.uid()::text],to_jsonb(birthday),true);
 update public.couple_occasion_settings
  set birthday_by_user=current,updated_at=now() where couple_id=c;
 return c;
end; $$;
revoke execute on function public.accept_love_match(text) from public,anon;
grant execute on function public.accept_love_match(text) to authenticated;

-- Prevent less secure legacy entry points bypassing the new date requirement.
-- Match RPCs are now routed exclusively through the profile-registration wrappers.
revoke execute on function public.save_my_profile(text),
 public.create_my_couple(),public.accept_pair_invite(text) from authenticated;

-- Existing date-update RPC is now restricted to shared anniversary only.
-- Personal birthdays must be saved via complete_love_registration, tied to auth.uid().
create or replace function public.set_love_occasion_date(p_couple uuid,p_kind text,p_month_day text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_kind<>'anniversary' then raise exception 'Anniversaire personnel géré dans le profil';end if;
 if p_month_day is not null then perform couple_private.validate_month_day(p_month_day);end if;
 perform 1 from public.couples where id=p_couple for update;
 insert into public.couple_occasion_settings(couple_id)values(p_couple)
  on conflict(couple_id)do nothing;
 update public.couple_occasion_settings
  set anniversary_md=p_month_day,updated_at=now() where couple_id=p_couple;
end; $$;
