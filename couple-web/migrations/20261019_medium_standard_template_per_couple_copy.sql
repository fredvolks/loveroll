-- MEDIUM is the initial standard template for every LoveRoll couple's 100 private SEXUEL cards.
-- This baseline is server-only and never includes a couple's personal modifications.
create table if not exists couple_private.love_medium_standard_cards(
 card_id smallint primary key check(card_id between 1 and 100),
 title text not null, description text not null, timer_minutes smallint,
 drawer_role text not null, recipient_role text not null,
 created_at timestamptz not null default now()
);
alter table couple_private.love_medium_standard_cards enable row level security;
revoke all on couple_private.love_medium_standard_cards from public,anon,authenticated;

-- Choose the first complete MEDIUM standard collection, never personalized cards.
with complete as(
 select couple_id from public.love_future_style_cards
 where category='SEXUEL' and style='medium' and card_id between 1 and 100
 group by couple_id having count(distinct card_id)=100
 order by min(created_at),couple_id limit 1
)
insert into couple_private.love_medium_standard_cards(
 card_id,title,description,timer_minutes,drawer_role,recipient_role)
select f.card_id::smallint,f.title,f.description,f.timer_minutes::smallint,
 f.drawer_role,f.recipient_role
from public.love_future_style_cards f join complete c using(couple_id)
where f.style='medium' and f.category='SEXUEL' and f.card_id between 1 and 100
on conflict(card_id) do nothing;

do $validate$
begin
 if (select count(*) from couple_private.love_medium_standard_cards)<>100
 then raise exception 'Modèle MEDIUM commun incomplet : 100 cartes nécessaires';end if;
end;$validate$;

CREATE OR REPLACE FUNCTION couple_private.ensure_love_personal_sexual_cards(p_couple uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_saved integer;
begin
 perform 1 from public.couples where id=p_couple;
 if not found then raise exception 'Duo introuvable';end if;
 insert into public.love_personal_sexual_cards(
  couple_id,category,card_id,title,description,timer_minutes,
  drawer_role,recipient_role,drawer_user_id,recipient_user_id
 )
 select p_couple,'SEXUEL',base.card_id,coalesce(f.title,base.title),
  coalesce(f.description,base.description),
  coalesce(f.timer_minutes,base.timer_minutes),
  coalesce(f.drawer_role,base.drawer_role),
  coalesce(f.recipient_role,base.recipient_role),null,null
 from couple_private.love_medium_standard_cards base
 left join public.love_future_style_cards f
  on f.couple_id=p_couple and f.style='medium' and f.category='SEXUEL'
    and f.card_id=base.card_id
 on conflict(couple_id,card_id) do nothing;
 select count(*) into v_saved from public.love_personal_sexual_cards
 where couple_id=p_couple;
 if v_saved<>100 then raise exception 'La bibliothèque personnelle doit contenir exactement 100 cartes, reçu %',v_saved;end if;
 return v_saved;
end;$function$;

revoke all on function couple_private.ensure_love_personal_sexual_cards(uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.restore_love_personal_sexual_card(p_couple uuid, p_card_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_mode text;
begin
 perform public.love_require_verified_identity();
 select c.sexual_card_mode into v_mode from public.couples c
 where c.id=p_couple and c.owner_user_id=(select auth.uid()) for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Réservé à l’administrateur du duo';end if;
 if v_mode<>'custom' or p_card_id not between 1 and 100
 then raise exception 'Carte personnelle indisponible';end if;
 perform couple_private.ensure_love_personal_sexual_cards(p_couple);
 update public.love_personal_sexual_cards p
 set title=coalesce(f.title,base.title),
     description=coalesce(f.description,base.description),
     timer_minutes=coalesce(f.timer_minutes::smallint,base.timer_minutes),
     drawer_role=coalesce(f.drawer_role,base.drawer_role),
     recipient_role=coalesce(f.recipient_role,base.recipient_role),
     drawer_user_id=null,recipient_user_id=null,updated_at=now()
 from couple_private.love_medium_standard_cards base
 left join public.love_future_style_cards f
   on f.couple_id=p_couple and f.category='SEXUEL'
     and f.style='medium' and f.card_id=base.card_id
 where p.couple_id=p_couple and p.card_id=p_card_id and p.card_id=base.card_id;
 if not found then raise exception 'Carte MEDIUM introuvable';end if;
end;$function$;

revoke all on function public.restore_love_personal_sexual_card(uuid,integer) from public,anon,authenticated;
grant execute on function public.restore_love_personal_sexual_card(uuid,integer) to authenticated;
