-- Future-only selector for LoveRoll's three 200-card style collections.
-- Not called by the current live draw_for_partner / existing 88-12 category.
-- To activate only AFTER the three complete card collections are imported.
create or replace function couple_private.pick_future_love_style(p_couple uuid)
returns text language plpgsql volatile security definer set search_path='' as $pick$
declare a text; b text;
begin
 select coalesce(p.play_style,'medium') into a
 from public.couple_members m join public.couple_profiles p on p.id=m.user_id
 where m.couple_id=p_couple order by m.joined_at,m.user_id limit 1;
 select coalesce(p.play_style,'medium') into b
 from public.couple_members m join public.couple_profiles p on p.id=m.user_id
 where m.couple_id=p_couple order by m.joined_at,m.user_id offset 1 limit 1;
 if a is null or b is null then raise exception 'Deux profils de jeu sont requis'; end if;
 if a=b then return a;end if;
 if random()<0.5 then return a;end if;
 return b;
end;$pick$;
revoke all on function couple_private.pick_future_love_style(uuid) from public,anon,authenticated;
