CREATE OR REPLACE FUNCTION public.import_love_evening_library(p_couple uuid, p_library jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_category text; card jsonb; n int; dur int; roles text[]; seen int[];
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 perform 1 from public.couples where id=p_couple and owner_user_id=auth.uid() for update;
 if not found then raise exception 'Administrateur uniquement';end if;
 v_category:=p_library->>'category';
 if p_library->>'format'<>'loveroll-evening' or p_library->>'version'<>'1'
 or v_category not in ('SENSUEL','SEXUEL')
 or jsonb_typeof(p_library->'cards')<>'array' or jsonb_array_length(p_library->'cards')<>35
 then raise exception 'Liste invalide : 35 cartes Sensuel ou Sexuel requises';end if;
 seen:=array[]::int[];
 for card in select value from jsonb_array_elements(p_library->'cards') loop
  if jsonb_typeof(card)<>'object' or coalesce(card->>'card_id','') !~ '^[0-9]{1,2}$'
  then raise exception 'Numéro de carte invalide';end if;
  n:=(card->>'card_id')::int;
  if n not between 1 and 35 or n=any(seen) then raise exception 'Carte répétée ou hors plage : %',n;end if;
  seen:=array_append(seen,n);
  if n<=25 or coalesce(card->>'title','')<>'' or coalesce(card->>'description','')<>'' then
   if length(btrim(coalesce(card->>'title',''))) not between 3 and 120
     or length(btrim(coalesce(card->>'description',''))) not between 10 and 900
   then raise exception 'Titre ou consigne invalide carte %',n;end if;
  else
   if (card->>'timer_minutes') is not null or card->>'drawer_role'<>'both'
    or card->>'recipient_role'<>'both'
   then raise exception 'Un emplacement vide doit être sans minuteur et avec droits neutres';end if;
  end if;
  roles:=array[card->>'drawer_role',card->>'recipient_role'];
  if roles[1] not in ('both','owner','partner') or roles[2] not in ('both','owner','partner')
   or (roles[1]=roles[2] and roles[1]<>'both')
   then raise exception 'Restrictions invalides carte %',n;end if;
  if (card->>'timer_minutes') is not null then
   if (card->>'timer_minutes') !~ '^[0-9]{1,2}$' then raise exception 'Minuteur invalide carte %',n;end if;
   dur:=(card->>'timer_minutes')::int;
   if dur not between 1 and 60 then raise exception 'Durée invalide carte %',n;end if;
  end if;
 end loop;
 delete from public.love_custom_challenges where couple_id=p_couple and category=v_category;
 insert into public.love_custom_challenges(couple_id,category,card_id,title,description,
  timer_minutes,drawer_role,recipient_role,drawer_user_id,recipient_user_id)
 select p_couple,v_category,(x.value->>'card_id')::int,x.value->>'title',x.value->>'description',
  nullif(x.value->>'timer_minutes','')::int,x.value->>'drawer_role',x.value->>'recipient_role',null,null
 from jsonb_array_elements(p_library->'cards') as x(value)
 where coalesce(x.value->>'title','')<>'' and coalesce(x.value->>'description','')<>'';
end;$function$
