-- LoveRoll: configure challenge cards privately BEFORE inviting a partner.
-- Roles are stable identifiers relative to the original couple administrator;
-- they do not require a second member UUID yet.
alter table public.love_custom_challenges
 add column if not exists drawer_role text not null default 'both';
alter table public.love_custom_challenges
 add column if not exists recipient_role text not null default 'both';
alter table public.love_custom_challenges
 drop constraint if exists love_custom_drawer_role_check;
alter table public.love_custom_challenges
 add constraint love_custom_drawer_role_check
 check(drawer_role in ('both','owner','partner'));
alter table public.love_custom_challenges
 drop constraint if exists love_custom_recipient_role_check;
alter table public.love_custom_challenges
 add constraint love_custom_recipient_role_check
 check(recipient_role in ('both','owner','partner'));

-- Migrate older UUID-targeted cards to role-based permissions. The legacy
-- UUID fields remain for backwards compatibility and historical editing.
update public.love_custom_challenges cc
set drawer_role=case when cc.drawer_user_id is null then 'both'
 when cc.drawer_user_id=c.owner_user_id then 'owner' else 'partner' end,
 recipient_role=case when cc.recipient_user_id is null then 'both'
 when cc.recipient_user_id=c.owner_user_id then 'owner' else 'partner' end
from public.couples c where c.id=cc.couple_id
 and (cc.drawer_user_id is not null or cc.recipient_user_id is not null);

create or replace function public.save_love_card_with_roles(
 p_couple uuid,p_category text,p_card_id integer,p_title text,
 p_description text,p_timer_minutes integer,p_drawer_role text,
 p_recipient_role text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples c where c.id=p_couple
    and c.owner_user_id=auth.uid())
 then raise exception 'Seul l’administrateur peut modifier les cartes';end if;
 if p_category not in ('SENSUEL','SEXUEL') or
   p_card_id not between 1 and 35 then raise exception 'Carte invalide';end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 120 or
  length(trim(coalesce(p_description,''))) not between 10 and 900 or
  (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Contenu ou minuteur invalide';end if;
 if p_drawer_role is null or p_recipient_role is null or
    p_drawer_role not in ('both','owner','partner') or
    p_recipient_role not in ('both','owner','partner')
 then raise exception 'Droits de pige ou de réception invalides';end if;
 if p_drawer_role=p_recipient_role and p_drawer_role<>'both'
 then raise exception 'On ne peut pas piger un défi pour soi-même';end if;
 insert into public.love_custom_challenges(
  couple_id,category,card_id,title,description,timer_minutes,
  drawer_role,recipient_role,drawer_user_id,recipient_user_id)
 values(p_couple,p_category,p_card_id,trim(p_title),trim(p_description),
  p_timer_minutes,p_drawer_role,p_recipient_role,null,null)
 on conflict(couple_id,category,card_id) do update set
  title=excluded.title,description=excluded.description,
  timer_minutes=excluded.timer_minutes,
  drawer_role=excluded.drawer_role,
  recipient_role=excluded.recipient_role,
  drawer_user_id=null,recipient_user_id=null,updated_at=now();
end;$$;
revoke all on function public.save_love_card_with_roles(uuid,text,integer,text,text,integer,text,text) from public,anon;
grant execute on function public.save_love_card_with_roles(uuid,text,integer,text,text,integer,text,text) to authenticated;
notify pgrst, 'reload schema';
