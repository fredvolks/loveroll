-- LoveRoll default cards V2. Complete 25 Sensuel + 25 Sexuel ready-to-play challenges.
-- Never change user custom card overrides, old draw history or private calendar.
-- Always snapshot chosen card content into couple_challenges for an immutable history.
-- Historical default cards that did not have a snapshot are captured BEFORE changing defaults.

update public.couple_challenges ch
set card_title=historical.title,
    card_description=historical.description,
    card_timer_minutes=historical.minutes
from (values
 ('SENSUEL', 1, 'La minute des regards', 'Offre à la personne qui reçoit une minute de regards complices, assis face à face.', 1),
 ('SENSUEL', 2, 'Un baiser sur mesure', 'Propose un baiser lent; attends sa réponse et respecte son rythme.', 2),
 ('SENSUEL', 3, 'Le massage des épaules', 'Offre un massage des épaules en laissant l’autre choisir la pression.', 8),
 ('SENSUEL', 4, 'La danse du salon', 'Invite l’autre à danser sur une chanson, tout près si cette proximité lui plaît.', 4),
 ('SENSUEL', 5, 'Trois mots irrésistibles', 'Dis trois compliments précis que tu n’as pas encore formulés ce soir.', 2),
 ('SENSUEL', 6, 'Le câlin sans attente', 'Propose un câlin tranquille et reste présent sans chercher une suite.', 5),
 ('SENSUEL', 7, 'La nuque apaisée', 'Propose une attention douce à la nuque, selon les préférences de l’autre.', 5),
 ('SENSUEL', 8, 'Une chanson rien qu’à toi', 'Choisis une chanson qui lui ressemble et explique pourquoi tu l’as choisie.', 0),
 ('SENSUEL', 9, 'Le chemin de baisers', 'Propose quelques baisers sur la main, la joue ou l’épaule, selon son choix.', 3),
 ('SENSUEL', 10, 'Le massage du dos', 'Prépare une couverture et offre un massage du dos, à son rythme.', 12),
 ('SENSUEL', 11, 'Notre premier rendez-vous', 'Raconte-lui un souvenir marquant de votre premier rendez-vous.', 0),
 ('SENSUEL', 12, 'Le murmure', 'Chuchote à son oreille une attention ou une invitation tendre.', 2),
 ('SENSUEL', 13, 'La danse les yeux fermés', 'Invite à danser les yeux fermés, uniquement si l’autre se sent à l’aise.', 4),
 ('SENSUEL', 14, 'Le soin des cheveux', 'Propose de caresser doucement les cheveux de l’autre, avec son accord.', 3),
 ('SENSUEL', 15, 'Le moment sans écran', 'Éloigne les écrans et offre dix minutes d’écoute attentive.', 10),
 ('SENSUEL', 16, 'La boisson réconfort', 'Prépare la boisson préférée de l’autre et sers-la comme un rendez-vous.', 0),
 ('SENSUEL', 17, 'Une gratitude rare', 'Dis à l’autre ce qu’il ou elle a fait récemment et qui t’a touché.', 3),
 ('SENSUEL', 18, 'Le canapé secret', 'Aménage un coin confortable et invite l’autre à s’y blottir.', 6),
 ('SENSUEL', 19, 'Le billet doux', 'Écris une courte note sincère à cacher pour qu’elle soit découverte plus tard.', 0),
 ('SENSUEL', 20, 'Un rendez-vous imaginé', 'Propose une véritable sortie surprise réalisable cette semaine.', 0),
 ('SENSUEL', 21, 'Les yeux bandés, douceur', 'Propose un bandeau facultatif puis fais deviner un objet doux au toucher. Retire-le dès qu’on te le demande.', 3),
 ('SENSUEL', 22, 'Les mains dans les mains', 'Prends les mains de l’autre et décris un souvenir qui te fait sourire.', 2),
 ('SENSUEL', 23, 'Le parfum du souvenir', 'Fais sentir un parfum familier et raconte le souvenir qu’il évoque.', 0),
 ('SENSUEL', 24, 'Le chemin de compliments', 'Offre un compliment différent à chaque étape d’une courte promenade dans la maison.', 4),
 ('SENSUEL', 25, 'Le massage des mains', 'Offre une attention aux mains, avec une crème adaptée si souhaitée.', 7),
 ('SEXUEL', 1, 'Le rendez-vous mystérieux', 'Offre une invitation secrète indiquant une heure, une ambiance et une tenue facultative.', 0),
 ('SEXUEL', 2, 'La danse de séduction', 'Présente une danse privée ludique; l’autre peut choisir la musique et interrompre le jeu.', 4),
 ('SEXUEL', 3, 'La minute de suspense', 'Maintiens un regard de séduction et approche-toi seulement si l’autre t’y invite.', 1),
 ('SEXUEL', 4, 'La tenue surprise', 'Propose une tenue séduisante de ton choix, sans obligation de la porter.', 0),
 ('SEXUEL', 5, 'Le massage à l’huile', 'Prépare un massage sensoriel avec un produit adapté et demande quelles zones non intimes sont confortables.', 12),
 ('SEXUEL', 6, 'Les yeux bandés', 'Propose un bandeau facile à retirer et fais deviner de petites sensations sur les mains ou les bras.', 5),
 ('SEXUEL', 7, 'Les mains attachées, version douce', 'Propose de poser les mains sur un foulard lâche, libérable immédiatement; convenez d’un signal d’arrêt.', 4),
 ('SEXUEL', 8, 'Le jeu des rôles', 'Invente une rencontre fictive dans un bar ou un hôtel; propose le scénario à l’autre avant de commencer.', 0),
 ('SEXUEL', 9, 'Un message de tentation', 'Écris un court message de séduction et laisse l’autre choisir d’y répondre ou non.', 0),
 ('SEXUEL', 10, 'Le mot interdit', 'Propose un jeu où l’on se séduit sans prononcer le mot choisi ensemble.', 3),
 ('SEXUEL', 11, 'Le rendez-vous sous les draps', 'Transforme votre chambre en lieu de rendez-vous avec lumière, musique et accueil soigné.', 0),
 ('SEXUEL', 12, 'La boîte à fantasmes', 'Invite l’autre à partager une curiosité intime; aucune réalisation n’est attendue.', 0),
 ('SEXUEL', 13, 'La surprise sensorielle', 'Propose une exploration d’odeurs, de musique et de textures, les yeux ouverts ou bandés.', 6),
 ('SEXUEL', 14, 'La confidence audacieuse', 'Raconte une envie que tu n’as pas encore osé proposer, puis écoute sa réaction sans insister.', 0),
 ('SEXUEL', 15, 'Le duel des regards', 'Joue à séduire l’autre uniquement par le regard et le sourire pendant une chanson.', 3),
 ('SEXUEL', 16, 'Le Kamasutra à découvrir', 'Propose de parcourir ensemble un ouvrage de Kamasutra et de choisir une idée de position confortable à discuter.', 0),
 ('SEXUEL', 17, 'La pause de suspense', 'Crée une ambiance de rendez-vous privé puis fais une pause volontaire pour échanger vos envies.', 2),
 ('SEXUEL', 18, 'La carte de limites', 'Offre trois idées d’ambiance sensuelle; l’autre peut répondre oui, peut-être ou non à chacune.', 0),
 ('SEXUEL', 19, 'Le défi du bandeau', 'Laisse l’autre décider de porter ou non un bandeau, puis offre un court massage des mains.', 4),
 ('SEXUEL', 20, 'La promesse de minuit', 'Glisse une invitation à un rendez-vous ultérieur et laisse l’autre proposer une heure.', 0),
 ('SEXUEL', 21, 'Une chorégraphie rien que pour toi', 'Prépare une danse de séduction sur deux chansons choisies par la personne qui reçoit.', 6),
 ('SEXUEL', 22, 'Le jeu des cartes secrètes', 'Écris deux surprises séduisantes et laisse l’autre tirer ou refuser la proposition.', 0),
 ('SEXUEL', 23, 'La chambre métamorphosée', 'Prépare un éclairage différent et une playlist pour renouveler l’ambiance de votre rendez-vous.', 0),
 ('SEXUEL', 24, 'Le ruban de confiance', 'Propose une activité avec un ruban posé librement sur les poignets; aucune immobilisation réelle et arrêt immédiat sur demande.', 5),
 ('SEXUEL', 25, 'La question audacieuse', 'Demande à l’autre quelle nouveauté intime l’intrigue et ce qu’il ou elle préfère éviter.', 0)
) as historical(category,card_id,title,description,minutes)
where ch.category=historical.category
  and ch.card_id=historical.card_id
  and ch.card_id between 1 and 25
  and ch.card_title is null;

create table if not exists public.love_base_challenges(
 category text not null check(category in ('SENSUEL','SEXUEL')),
 card_id smallint not null check(card_id between 1 and 25),
 title text not null check(length(title) between 3 and 120),
 description text not null check(length(description) between 10 and 900),
 timer_minutes smallint not null check(timer_minutes between 0 and 15),
 primary key(category,card_id)
);
alter table public.love_base_challenges enable row level security;
revoke all on public.love_base_challenges from public,anon,authenticated;

insert into public.love_base_challenges(category,card_id,title,description,timer_minutes)
values
 ('SENSUEL', 1, 'Baisers dans le cou', 'Propose à ton partenaire trois minutes de baisers délicats dans le cou et sur les épaules. Laisse-lui choisir le rythme et les endroits qui lui plaisent.', 3),
 ('SENSUEL', 2, 'Le spa aux chandelles', 'Installe une serviette et une lumière tamisée, puis offre un vrai massage du dos et des épaules. Demande la pression souhaitée avant de commencer.', 12),
 ('SENSUEL', 3, 'Le slow collé-serré', 'Choisis une chanson lente et invite ton partenaire à danser très près de toi. Échangez les rôles pour guider la danse au milieu du morceau.', 4),
 ('SENSUEL', 4, 'Douche à deux', 'Prépare une douche chaude, une musique douce et une serviette moelleuse. Invite ton partenaire à partager ce moment et propose de lui laver le dos.', 0),
 ('SENSUEL', 5, 'Le menu des baisers', 'Présente trois choix de baisers : tendre, passionné ou surprise. Ton partenaire choisit l''ordre et peut inventer une quatrième option.', 5),
 ('SENSUEL', 6, 'Chocolat et frissons', 'Prépare deux bouchées de chocolat ou un dessert favori. Faites une dégustation à tour de rôle, avec un compliment entre chaque bouchée.', 5),
 ('SENSUEL', 7, 'Le fauteuil VIP', 'Installe ton partenaire confortablement et prends en charge huit minutes de petites attentions : épaules, mains, cheveux ou pieds, selon ses préférences.', 8),
 ('SENSUEL', 8, 'La chasse au rendez-vous', 'Cache trois indices dans la maison menant à une surprise romantique simple : une chanson, une boisson ou un endroit préparé pour vous deux.', 0),
 ('SENSUEL', 9, 'Le secret à l''oreille', 'Glisse à l''oreille de ton partenaire une invitation séduisante pour ce soir. Laisse-le répondre par une proposition de son choix.', 2),
 ('SENSUEL', 10, 'Le baiser de cinéma', 'Rejoue une scène de retrouvailles comme dans un film romantique : approche, une phrase mémorable et un baiser seulement si l''autre en a envie.', 0),
 ('SENSUEL', 11, 'Le parfum irrésistible', 'Choisis ton parfum ou une odeur que ton partenaire aime. Fais-lui découvrir ton choix et raconte un souvenir qui lui donne une signification spéciale.', 0),
 ('SENSUEL', 12, 'La chaleur des mains', 'Réchauffe tes mains, puis propose un massage lent des avant-bras et des mains. Demande à ton partenaire de te guider sur la pression.', 4),
 ('SENSUEL', 13, 'Un compliment audacieux', 'Trouve trois détails chez ton partenaire qui te font craquer aujourd''hui. Dis-les avec précision et laisse-le choisir lequel lui plaît le plus.', 0),
 ('SENSUEL', 14, 'Rendez-vous sans téléphone', 'Range les téléphones, allume une petite lumière et offre dix minutes de conversation rien qu''à deux, sans interruption ni sujet pratique.', 10),
 ('SENSUEL', 15, 'La tenue qui fait sourire', 'Choisis une tenue que ton partenaire aime te voir porter et organise une petite entrée surprise, comme pour un vrai premier rendez-vous.', 0),
 ('SENSUEL', 16, 'Le mot sous l''oreiller', 'Écris une invitation romantique sur un billet et glisse-la sous l''oreiller. Ton partenaire décide quand et comment y répondre.', 0),
 ('SENSUEL', 17, 'Massage des pieds de luxe', 'Prépare une serviette chaude et une crème adaptée, puis offre un massage des pieds. L''autre choisit la durée réelle et peut demander d''arrêter.', 10),
 ('SENSUEL', 18, 'Le dessert à partager', 'Prépare un dessert dans une seule assiette et propose de le déguster ensemble dans un coin chaleureux, comme un rendez-vous improvisé.', 0),
 ('SENSUEL', 19, 'La pièce métamorphosée', 'Transforme une pièce avec une lumière douce, deux coussins et une chanson. Invite ton partenaire à découvrir votre nouvel endroit secret.', 0),
 ('SENSUEL', 20, 'Le refuge sous la couverture', 'Prépare une couverture et invite ton partenaire à se blottir contre toi pendant sept minutes. Profitez de cette proximité sans objectif à atteindre.', 7),
 ('SENSUEL', 21, 'Notre photo complice', 'Propose une photo de couple originale, drôle ou séduisante, que vous garderez seulement si les deux personnes sont à l''aise avec le résultat.', 0),
 ('SENSUEL', 22, 'La bande-son du désir', 'Choisis trois chansons qui racontent votre histoire, de la plus tendre à la plus sensuelle. Présente-les comme une mini-playlist privée.', 0),
 ('SENSUEL', 23, 'L''aveu du soir', 'Raconte un moment récent où ton partenaire t''a particulièrement attiré. Invite-le à partager un souvenir du même genre s''il le souhaite.', 0),
 ('SENSUEL', 24, 'Le choix des envies', 'Propose trois façons de vous rapprocher : massage, câlin ou danse. Ton partenaire choisit l''une d''elles ou invente votre quatrième idée.', 0),
 ('SENSUEL', 25, 'Séduction sans paroles', 'Pendant une chanson, fais comprendre à ton partenaire qu''il te plaît sans parler : gestes, proximité et sourire. Les deux peuvent arrêter le jeu.', 3),
 ('SEXUEL', 1, 'Strip-tease privé', 'Choisis deux chansons et offre un strip-tease à ton partenaire, à ton rythme et dans la tenue qui te plaît. Il peut choisir la musique ou simplement profiter du spectacle.', 6),
 ('SEXUEL', 2, 'La rencontre au bar', 'Imagine que vous êtes deux inconnus qui se croisent pour la première fois. Lance une réplique de drague audacieuse et laissez le scénario évoluer ensemble.', 0),
 ('SEXUEL', 3, 'L''hôtel à la maison', 'Transforme la chambre en suite d''hôtel : éclairage, musique et accueil soigné. Invite ton partenaire à un rendez-vous où vous laissez les corvées à la porte.', 0),
 ('SEXUEL', 4, 'Cinq surprises les yeux bandés', 'Propose un bandeau facile à enlever et prépare cinq sensations inoffensives : plume, tissu doux, parfum, baiser sur la main ou murmure. Ton partenaire choisit.', 5),
 ('SEXUEL', 5, 'Massage à l''huile', 'Prépare une huile adaptée à la peau et offre un massage enveloppant du dos, des épaules et des jambes. Laisse ton partenaire préciser les zones confortables.', 12),
 ('SEXUEL', 6, 'La tenue qui fait craquer', 'Présente deux tenues séduisantes et laisse ton partenaire choisir celle que tu as envie de porter ce soir. Termine par une entrée théâtrale.', 0),
 ('SEXUEL', 7, 'Le baiser à la demande', 'Propose un jeu où ton partenaire choisit les baisers qu''il aime recevoir : lents, appuyés ou volés. Fais durer le suspense sans dépasser ses limites.', 5),
 ('SEXUEL', 8, 'Le Kamasutra à deux', 'Présente trois positions inspirées du Kamasutra et demande laquelle vous intrigue tous les deux. Choisissez seulement une option confortable et désirée.', 0),
 ('SEXUEL', 9, 'Le scénario secret', 'Écris le début d''un scénario de séduction en trois phrases. Laisse ton partenaire choisir la suite, les personnages et ce que vous voulez réellement jouer.', 0),
 ('SEXUEL', 10, 'Duel de séduction', 'Chacun dispose de deux minutes pour séduire l''autre avec des compliments, une danse ou des baisers. Choisissez ensuite le moment que vous avez préféré.', 4),
 ('SEXUEL', 11, 'Le joker audacieux', 'Prépare trois propositions osées mais réalisables ce soir. Ton partenaire en choisit une, peut en modifier les règles ou décider de passer.', 0),
 ('SEXUEL', 12, 'Défense de toucher', 'Propose trois minutes où vous vous séduisez uniquement par la voix, les mouvements et la proximité, sans contact. Le premier qui veut arrêter gagne aussi.', 3),
 ('SEXUEL', 13, 'Le rendez-vous en lumière rouge', 'Change l''éclairage de votre chambre, choisis une playlist plus intense et invite ton partenaire à un rendez-vous de séduction hors de vos habitudes.', 0),
 ('SEXUEL', 14, 'Le choix du rythme', 'Propose une série de baisers et de pauses de séduction. Ton partenaire annonce quand ralentir, quand se rapprocher ou quand arrêter le jeu.', 5),
 ('SEXUEL', 15, 'Le texto qui fait rougir', 'Envoie depuis la pièce d''à côté une invitation très suggestive pour ce soir. Laisse ton partenaire répondre par un oui, une autre idée ou un refus.', 0),
 ('SEXUEL', 16, 'Le miroir complice', 'Invite ton partenaire à choisir une tenue séduisante devant un miroir. Faites un mini-défilé privé et échangez ce qui vous plaît dans ce look.', 0),
 ('SEXUEL', 17, 'Le tiroir des accessoires', 'Présente trois accessoires doux et non contraignants : foulard, plume ou huile de massage. Ton partenaire choisit celui qui entrera dans le jeu.', 0),
 ('SEXUEL', 18, 'Trois enveloppes osées', 'Écris trois idées de rendez-vous intimes dans trois enveloppes : tendre, audacieuse et surprise. Ton partenaire ouvre celle qui lui fait envie.', 0),
 ('SEXUEL', 19, 'Le baiser au ralenti', 'Lance une chanson sensuelle et propose un jeu de baisers très lents, entrecoupés de petites pauses pour faire durer la tension.', 4),
 ('SEXUEL', 20, 'La télécommande du désir', 'Ton partenaire choisit la musique et contrôle les pauses de ta danse de séduction. À chaque pause, il peut demander une nouvelle ambiance.', 6),
 ('SEXUEL', 21, 'Le bain confidentiel', 'Prépare un bain ou un moment de détente à deux avec serviettes et éclairage doux. Propose un rendez-vous intime, sans obligation de poursuivre.', 0),
 ('SEXUEL', 22, 'Le rendez-vous après minuit', 'Prépare un carton d''invitation pour un rendez-vous privé plus tard cette semaine, avec lieu, tenue suggérée et ambiance. Ton partenaire confirme ou change tout.', 0),
 ('SEXUEL', 23, 'Éteins les lumières', 'Propose de découvrir un rendez-vous dans la pénombre, avec musique et conversations intimes. Chacun choisit son niveau de confort et peut rallumer.', 0),
 ('SEXUEL', 24, 'L''inversion des rôles', 'Laisse ton partenaire diriger l''organisation de votre soirée de séduction pendant que tu suis ses choix d''ambiance, de musique et de rythme.', 0),
 ('SEXUEL', 25, 'Carte blanche à deux', 'Offre à ton partenaire deux scénarios de séduction totalement différents. Il choisit celui qu''il préfère et vous en fixez les règles avant de commencer.', 0)
on conflict(category,card_id) do update set
 title=excluded.title,description=excluded.description,
 timer_minutes=excluded.timer_minutes;

create or replace function public.draw_for_partner(
 p_session uuid,p_preference text,p_random boolean default false)
returns public.couple_challenges language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 cats text[]:=array[]::text[]; weights integer[]:=array[]::integer[];
 total integer:=0; ticket integer; i integer; cid integer; d35 integer;
 chosen public.love_custom_challenges%rowtype;
 original public.love_base_challenges%rowtype;
 rowout public.couple_challenges%rowtype; capacity integer; v_no_repeat boolean; owner_id uuid;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then
  raise exception 'Soirée inaccessible';end if;
 if p_preference not in ('SENSUEL','SEXUEL') then
  raise exception 'Catégorie inconnue';end if;
 -- Lock the couple to serialize admin edits, draw-rule changes and both partners' picks.
 select coalesce(no_repeat_challenges,true),owner_user_id into v_no_repeat,owner_id
 from public.couples where id=s.couple_id for update;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members
  where couple_id=s.couple_id and user_id<>auth.uid();
 if target is null then raise exception 'Partenaire absent';end if;
 if (select count(*) from public.couple_personal_rolls
     where session_id=p_session and user_id in (auth.uid(),target))<>2 then
  raise exception 'Attendre les deux D6 personnels';end if;
 if exists(select 1 from public.couple_challenges
 where session_id=p_session and recipient=target and status in ('proposed','accepted')) then
  raise exception 'Attendre la réponse au défi précédent';end if;
 if (select count(*) from public.couple_challenges
 where session_id=p_session and recipient=target and status='completed') >=
    (select face from public.couple_personal_rolls where session_id=p_session and user_id=target)
 then raise exception 'Défis terminés';end if;
 -- A persistent shuffle bag, per couple + recipient, spanning evenings.
 -- Reset ONLY when every currently eligible card across BOTH categories has been drawn.
 if v_no_repeat and not exists(
  select 1 from (values ('SENSUEL'::text),('SEXUEL'::text)) cats(category)
  cross join generate_series(1,35) candidate(card)
  where (candidate.card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card))
   and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=cats.category and cc.card_id=candidate.card
      and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
   and not exists(
    select 1 from public.love_card_draw_history history
    where history.couple_id=s.couple_id and history.recipient_user_id=target
      and history.category=cats.category and history.card_id=candidate.card)
 ) then
  delete from public.love_card_draw_history
  where couple_id=s.couple_id and recipient_user_id=target;
 end if;
 for i in 1..2 loop
  v_cat:=(array['SENSUEL','SEXUEL'])[i];
  select count(*) into capacity from generate_series(1,35) card
   where (card<=25 or exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
   and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
      and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
   and (not v_no_repeat or not exists(
    select 1 from public.love_card_draw_history history
    where history.couple_id=s.couple_id and history.recipient_user_id=target
     and history.category=v_cat and history.card_id=card))
   and not exists(select 1 from public.couple_challenges used
    where used.session_id=p_session and used.recipient=target
     and used.category=v_cat and used.card_id=card);
  if capacity>0 then
   cats:=array_append(cats,v_cat);
   weights:=array_append(weights,case when v_cat=p_preference then 80 else 20 end);
   total:=total+weights[array_length(weights,1)];
  end if;
 end loop;
 if total=0 then raise exception 'Toutes les cartes ont déjà été proposées';end if;
 ticket:=floor(random()*total)::integer;
 for i in 1..array_length(cats,1) loop
  if ticket<weights[i] then v_cat:=cats[i];exit;end if;
  ticket:=ticket-weights[i];
 end loop;
 select card into cid from generate_series(1,35) card
 where (card<=25 or exists(
  select 1 from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card))
 and not exists(
    select 1 from public.love_custom_challenges cc
    where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=card
     and ((cc.recipient_role='owner' and target<>owner_id)
        or (cc.recipient_role='partner' and target=owner_id)
        or (cc.drawer_role='owner' and auth.uid()<>owner_id)
        or (cc.drawer_role='partner' and auth.uid()=owner_id)
        or (cc.recipient_user_id is not null and cc.recipient_user_id<>target)
        or (cc.drawer_user_id is not null and cc.drawer_user_id<>auth.uid())))
 and (not v_no_repeat or not exists(
   select 1 from public.love_card_draw_history history
   where history.couple_id=s.couple_id and history.recipient_user_id=target
    and history.category=v_cat and history.card_id=card))
 and not exists(select 1 from public.couple_challenges used
   where used.session_id=p_session and used.recipient=target
    and used.category=v_cat and used.card_id=card)
 order by random() limit 1;
 if cid is null then raise exception 'Aucune carte disponible';end if;
 d35:=floor(random()*35)::integer+1;
 select * into chosen from public.love_custom_challenges cc
  where cc.couple_id=s.couple_id and cc.category=v_cat and cc.card_id=cid;
 if chosen.card_id is null and cid<=25 then
  select * into original from public.love_base_challenges bc
  where bc.category=v_cat and bc.card_id=cid;
  if original.card_id is null then raise exception 'Carte officielle manquante';end if;
 end if;
 insert into public.couple_challenges(
  session_id,couple_id,offered_by,recipient,category,face,card_id,
  card_title,card_description,card_timer_minutes)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,d35,cid,
  coalesce(chosen.title,original.title),
  coalesce(chosen.description,original.description),
  case when chosen.card_id is not null then chosen.timer_minutes
   else original.timer_minutes end)
 returning * into rowout;
 if v_no_repeat then
  insert into public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
  values(s.couple_id,target,v_cat,cid)
  on conflict(couple_id,recipient_user_id,category,card_id) do nothing;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi offert');
 return rowout;
end;$$;



revoke all on function public.draw_for_partner(uuid,text,boolean) from public,anon;
grant execute on function public.draw_for_partner(uuid,text,boolean) to authenticated;
notify pgrst, 'reload schema';
