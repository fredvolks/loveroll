-- LoveRoll : evening challenges have two selectable categories.
-- Historical COQUIN entries remain readable; new draws never create COQUIN.
-- Existing RPC signature is preserved for previously deployed PWA clients.
create or replace function public.draw_for_partner(p_session uuid,p_preference text,p_random boolean default false)
returns public.couple_challenges language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 candidates text[]:=array[]::text[]; weights int[]:=array[]::int[];
 total integer:=0; ticket integer; i integer; f integer;
 outrow public.couple_challenges%rowtype;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then raise exception 'Soirée inaccessible'; end if;
 if p_preference not in ('SENSUEL','SEXUEL') then raise exception 'Choisissez Sensuel ou Sexuel'; end if;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members where couple_id=s.couple_id and user_id<>auth.uid();
 if target is null then raise exception 'Le partenaire doit accepter le match'; end if;
 if not exists(select 1 from public.couple_personal_rolls
   where session_id=p_session and user_id=auth.uid())
  or not exists(select 1 from public.couple_personal_rolls
   where session_id=p_session and user_id=target) then
  raise exception 'Chaque partenaire doit d’abord brasser son D6';end if;
 if exists(select 1 from public.couple_challenges where session_id=p_session
   and recipient=target and status in ('proposed','accepted')) then
  raise exception 'Le défi précédent attend la réponse du partenaire';end if;
 if (select count(*) from public.couple_challenges where session_id=p_session
   and recipient=target and status='completed') >=
  (select face from public.couple_personal_rolls where session_id=p_session and user_id=target)
 then raise exception 'Tous les défis prévus sont terminés';end if;
 for i in 1..2 loop
  v_cat:=(array['SENSUEL','SEXUEL'])[i];
  if (select count(*) from public.couple_challenges where session_id=p_session
    and recipient=target and category=v_cat)<20 then
   candidates:=array_append(candidates,v_cat);
   weights:=array_append(weights,case when v_cat=p_preference then 80 else 20 end);
   total:=total+weights[array_length(weights,1)];
  end if;
 end loop;
 if total=0 then raise exception 'Plus de cartes inédites ce soir';end if;
 ticket:=floor(random()*total)::int;
 for i in 1..array_length(candidates,1) loop
  if ticket<weights[i] then v_cat:=candidates[i];exit;end if;
  ticket:=ticket-weights[i];
 end loop;
 select face into f from generate_series(1,20) as face
  where not exists(select 1 from public.couple_challenges c where c.session_id=p_session
   and c.recipient=target and c.category=v_cat and c.face=face)
  order by random() limit 1;
 insert into public.couple_challenges(session_id,couple_id,offered_by,recipient,category,face)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,f) returning * into outrow;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi proposé');
 return outrow;
end; $$;
revoke execute on function public.draw_for_partner(uuid,text,boolean) from public,anon;
grant execute on function public.draw_for_partner(uuid,text,boolean) to authenticated;
