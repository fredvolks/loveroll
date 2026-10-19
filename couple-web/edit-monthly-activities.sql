-- LoveRoll: edit all 20 monthly D20 outings, privately before/after invitation.
-- Never erase old draws or personal/shared calendars.
create table if not exists public.love_monthly_activity_defaults(
 face integer primary key check(face between 1 and 20),
 title text not null check(length(title) between 3 and 120),
 description text not null check(length(description) between 10 and 900),
 is_restaurant boolean not null
);
alter table public.love_monthly_activity_defaults enable row level security;
revoke all on public.love_monthly_activity_defaults from public,anon,authenticated;
insert into public.love_monthly_activity_defaults(face,title,description,is_restaurant)
values
 (1,'Souper en amoureux','Choisissez un restaurant qui vous plaît à tous les deux. Réservez une table et accordez-vous une soirée sans précipitation.',true),
 (2,'Spa nordique','Planifiez une visite au spa, avec bains et moments de détente. Comparez les horaires et réservez ensemble.',false),
 (3,'Brunch prolongé','Choisissez une belle adresse pour un brunch du week-end et prenez le temps de savourer le repas.',true),
 (4,'Spectacle ou théâtre','Choisissez ensemble une pièce de théâtre ou un spectacle vivant, puis organisez la sortie selon les disponibilités.',false),
 (5,'Soirée humour','Trouvez un spectacle d’humour qui vous tente, réservez deux places et profitez de la soirée à deux.',false),
 (6,'Cinéma et dessert','Choisissez un film au cinéma et prolongez la sortie avec un dessert dans votre adresse préférée.',false),
 (7,'Restaurant dégustation','Découvrez un restaurant offrant un menu dégustation ou plusieurs petits plats à partager.',true),
 (8,'Cours de cuisine','Réservez un atelier de cuisine en duo et préparez ensemble une recette que vous n’avez jamais essayée.',false),
 (9,'Jeu d’évasion en duo','Trouvez une salle d’évasion adaptée à deux personnes et relevez ensemble les énigmes.',false),
 (10,'Musée ou exposition','Visitez une exposition ou un musée puis discutez de vos découvertes autour d’une pause gourmande.',false),
 (11,'Massage en duo','Réservez un massage en duo dans un établissement de votre choix et gardez du temps pour vous détendre.',false),
 (12,'Café chic','Choisissez un café agréable, commandez une gourmandise et prenez le temps de vous retrouver.',false),
 (13,'Balade Vieux-Québec et resto','Organisez une promenade dans le Vieux-Québec et terminez par un souper dans un restaurant choisi ensemble.',true),
 (14,'Bistro et jeu de société','Choisissez un bistro ou un café ludique et lancez-vous un défi amical autour d’un jeu de société.',false),
 (15,'Cocktails ou mocktails','Découvrez un bar à cocktails ou un endroit proposant de bons mocktails et essayez une nouvelle saveur.',false),
 (16,'Quilles ou billard','Réservez une piste de quilles ou une table de billard et transformez la sortie en petit tournoi amical.',false),
 (17,'Traversier Québec–Lévis','Traversez le fleuve ensemble et profitez du panorama, puis explorez le quartier de l’autre rive.',false),
 (18,'Fondue ou tapas','Réservez une table pour partager une fondue ou plusieurs tapas, et choisissez des saveurs inédites.',true),
 (19,'Mini-escapade locale','Planifiez une courte escapade près de chez vous : promenade, visite et arrêt gourmand selon votre budget.',false),
 (20,'Rendez-vous de saison','Choisissez une activité de saison, comme un marché, une terrasse, une balade ou une fête locale.',false)
on conflict(face) do update set title=excluded.title,
 description=excluded.description,is_restaurant=excluded.is_restaurant;

create table if not exists public.love_monthly_activity_overrides(
 couple_id uuid not null references public.couples(id) on delete cascade,
 face integer not null check(face between 1 and 20),
 title text not null check(length(title) between 3 and 120),
 description text not null check(length(description) between 10 and 900),
 is_restaurant boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(couple_id,face)
);
alter table public.love_monthly_activity_overrides enable row level security;
revoke all on public.love_monthly_activity_overrides from public,anon;
grant select on public.love_monthly_activity_overrides to authenticated;
drop policy if exists love_monthly_activity_owner_read
 on public.love_monthly_activity_overrides;
create policy love_monthly_activity_owner_read
 on public.love_monthly_activity_overrides for select to authenticated
 using (exists(select 1 from public.couples c where c.id=couple_id
  and c.owner_user_id=(select auth.uid()))
  and couple_private.is_member(couple_id));

alter table public.couple_rolls add column if not exists activity_title text,
 add column if not exists activity_description text,
 add column if not exists activity_is_restaurant boolean;
-- Any older roll is snapshotted before the first override is recorded.
update public.couple_rolls r set activity_title=d.title,
 activity_description=d.description,activity_is_restaurant=d.is_restaurant
from public.love_monthly_activity_defaults d
where r.kind='monthly_activity' and r.face=d.face and r.activity_title is null;

create or replace function public.save_love_monthly_activity(
 p_couple uuid,p_face integer,p_title text,p_description text,p_is_restaurant boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple)
  or not exists(select 1 from public.couples c where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Seul le créateur du couple peut modifier les activités';end if;
 if p_face not between 1 and 20 or
  length(trim(coalesce(p_title,''))) not between 3 and 120 or
  length(trim(coalesce(p_description,''))) not between 10 and 900 or
  p_is_restaurant is null
 then raise exception 'Activité invalide : titre, description ou type manquant';end if;
 insert into public.love_monthly_activity_overrides(
  couple_id,face,title,description,is_restaurant)
 values(p_couple,p_face,trim(p_title),trim(p_description),p_is_restaurant)
 on conflict(couple_id,face) do update set
  title=excluded.title,description=excluded.description,
  is_restaurant=excluded.is_restaurant,updated_at=now();
end;$$;
revoke all on function public.save_love_monthly_activity(uuid,integer,text,text,boolean)
 from public,anon;
grant execute on function public.save_love_monthly_activity(uuid,integer,text,text,boolean)
 to authenticated;

create or replace function public.reset_love_monthly_activity(p_couple uuid,p_face integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple)
  or not exists(select 1 from public.couples c where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Seul le créateur du couple peut rétablir les activités';end if;
 if p_face not between 1 and 20 then raise exception 'Numéro d’activité invalide';end if;
 delete from public.love_monthly_activity_overrides where couple_id=p_couple and face=p_face;
end;$$;
revoke all on function public.reset_love_monthly_activity(uuid,integer) from public,anon;
grant execute on function public.reset_love_monthly_activity(uuid,integer) to authenticated;

create or replace function public.roll_couple_once(p_couple uuid,p_kind text)
returns public.couple_rolls language plpgsql security definer set search_path='' as $$
declare v_key text; n integer; old public.couple_rolls%rowtype;
        local_now timestamp; d date; a integer; is_restaurant boolean;
 selected public.love_monthly_activity_defaults%rowtype;
 edited public.love_monthly_activity_overrides%rowtype;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 if p_kind not in ('weekly','monthly_activity','monthly_host','monthly_restaurant') then
  raise exception 'Type de dé interdit'; end if;
 perform 1 from public.couples where id=p_couple for update;
 local_now := now() at time zone 'America/Toronto';
 d:=local_now::date;
 if p_kind='weekly' then
  v_key:=to_char((d-extract(isodow from d)::int+1)::date,'YYYY-MM-DD');
 else
  v_key:=to_char(d,'YYYY-MM');
 end if;
 select * into old from public.couple_rolls where couple_id=p_couple
  and kind=p_kind and key=v_key;
 if found then return old; end if;
 if p_kind='monthly_host' or p_kind='monthly_restaurant' then
  select face,coalesce(activity_is_restaurant,face in (1,3,7,13,18))
  into a,is_restaurant from public.couple_rolls where couple_id=p_couple
    and kind='monthly_activity' and key=v_key;
  if a is null then raise exception 'Brassez d’abord le D20 du mois'; end if;
  if p_kind='monthly_restaurant' and not coalesce(is_restaurant,false) then
   raise exception 'Ce défi spécial ne concerne pas un restaurant'; end if;
  if p_kind='monthly_restaurant' and not exists(
    select 1 from public.couple_rolls where couple_id=p_couple and kind='monthly_host' and key=v_key)
  then raise exception 'Brassez d’abord pour déterminer qui invite'; end if;
 end if;
 if p_kind='weekly' then
  a:=floor(random()*100)::int;
  n:=case when a<50 then 1 when a<75 then 2 when a<87 then 3
   when a<95 then 4 when a<99 then 5 else 6 end;
 elsif p_kind='monthly_activity' then n:=floor(random()*20)::int+1;
 else n:=floor(random()*6)::int+1; end if;
 if p_kind='monthly_activity' then
  select * into edited from public.love_monthly_activity_overrides
   where couple_id=p_couple and face=n;
  if edited.face is null then
   select * into selected from public.love_monthly_activity_defaults where face=n;
   if selected.face is null then raise exception 'Activité du mois manquante';end if;
  end if;
  insert into public.couple_rolls(
   couple_id,kind,key,actor,face,activity_title,activity_description,activity_is_restaurant)
  values(p_couple,p_kind,v_key,auth.uid(),n,
   coalesce(edited.title,selected.title),
   coalesce(edited.description,selected.description),
   coalesce(edited.is_restaurant,selected.is_restaurant)) returning * into old;
 else
  insert into public.couple_rolls(couple_id,kind,key,actor,face)
  values(p_couple,p_kind,v_key,auth.uid(),n) returning * into old;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),p_kind);
 return old;
end; $$;


notify pgrst, 'reload schema';
