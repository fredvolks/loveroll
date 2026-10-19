-- Additive LoveRoll worldwide D100. Existing official rolls remain untouched.
create table if not exists public.love_world_experiences (
 face integer primary key check(face between 1 and 100),
 theme text not null,
 geo_categories text not null,
 title text not null,
 description text not null
);
insert into public.love_world_experiences(face,theme,geo_categories,title,description) values
(1,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Soirée grand écran en amoureux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(2,'massage','service.beauty.massage','Massage et détente en duo','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(3,'views','tourism.attraction,natural.mountain.peak','Escapade vers un point de vue','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(4,'restaurant','catering.restaurant','Une table locale et authentique','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(5,'stay','accommodation.hotel,accommodation.guest_house','Une nuit de déconnexion','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(6,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Mini-golf et fous rires','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(7,'cafe','catering.cafe','Découverte d’un café indépendant','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(8,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Un spectacle à choisir ensemble','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(9,'market','commercial.marketplace','Dégustations au marché','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(10,'spa','leisure.spa,service.beauty.spa','Après-midi douceur et détente','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(11,'nature','leisure.park,leisure.park.nature_reserve,national_park','Promenade au vert','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(12,'restaurant','catering.restaurant','Découverte culinaire du mois','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(13,'stay','accommodation.hotel,accommodation.guest_house','Une chambre pour changer de décor','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(14,'wine','production.winery,production.brewery,production.distillery','Escapade chez un producteur local','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(15,'brunch','catering.cafe,catering.restaurant','Pause gourmande matinale','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(16,'museum','entertainment.museum,entertainment.culture.gallery','Après-midi de curiosité','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(17,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Sortie sensations et complicité','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(18,'spa','leisure.spa,service.beauty.spa','Détente thermale en amoureux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(19,'nature','leisure.park,leisure.park.nature_reserve,national_park','Un après-midi dehors sans téléphone','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(20,'restaurant','catering.restaurant','Souper gastronomique en duo','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(21,'massage','service.beauty.massage','S’offrir un soin bien-être','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(22,'views','tourism.attraction,natural.mountain.peak','Découverte touristique surprise','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(23,'brunch','catering.cafe,catering.restaurant','Déjeuner dans un nouveau café','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(24,'museum','entertainment.museum,entertainment.culture.gallery','Une exposition à explorer','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(25,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Une compétition amicale à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(26,'bar','catering.bar,catering.pub','Découvrir un bar d’ambiance','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(27,'nature','leisure.park,leisure.park.nature_reserve,national_park','Balade main dans la main','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(28,'market','commercial.marketplace','Découvrir les spécialités de la région','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(29,'spa','leisure.spa,service.beauty.spa','Moment de calme dans un lieu de détente','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(30,'views','tourism.attraction,natural.mountain.peak','Coucher de soleil à contempler','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(31,'restaurant','catering.restaurant','Un dîner qui sort de l’ordinaire','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(32,'stay','accommodation.hotel,accommodation.guest_house','Un hébergement inédit pour le couple','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(33,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Défi bowling à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(34,'cafe','catering.cafe','Dessert à partager','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(35,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Sortie culturelle du soir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(36,'market','commercial.marketplace','Marché local à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(37,'spa','leisure.spa,service.beauty.spa','Relaxation loin de la routine','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(38,'nature','leisure.park,leisure.park.nature_reserve,national_park','Un jardin pour se retrouver','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(39,'restaurant','catering.restaurant','Restaurant intimiste à essayer','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(40,'stay','accommodation.hotel,accommodation.guest_house','Escapade romantique d’une nuit','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(41,'wine','production.winery,production.brewery,production.distillery','Une dégustation à planifier','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(42,'brunch','catering.cafe,catering.restaurant','Brunch suivi d’une promenade','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(43,'museum','entertainment.museum,entertainment.culture.gallery','Une découverte artistique inattendue','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(44,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Une activité insolite à vivre','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(45,'bar','catering.bar,catering.pub','Cocktail ou mocktail en duo','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(46,'nature','leisure.park,leisure.park.nature_reserve,national_park','Une randonnée facile à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(47,'restaurant','catering.restaurant','Une adresse gourmande surprenante','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(48,'massage','service.beauty.massage','Une pause relaxation à réserver','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(49,'views','tourism.attraction,natural.mountain.peak','Photographier un paysage ensemble','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(50,'brunch','catering.cafe,catering.restaurant','Brunch du dimanche à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(51,'museum','entertainment.museum,entertainment.culture.gallery','Découvrir un musée ensemble','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(52,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Essayer une nouvelle activité physique','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(53,'bar','catering.bar,catering.pub','Sortie pour un verre en amoureux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(54,'restaurant','catering.restaurant','Une table romantique à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(55,'market','commercial.marketplace','Préparer un repas avec des produits locaux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(56,'spa','leisure.spa,service.beauty.spa','Bains et sérénité à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(57,'views','tourism.attraction,natural.mountain.peak','Une vue à couper le souffle','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(58,'restaurant','catering.restaurant','Un tête-à-tête autour d’un bon repas','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(59,'stay','accommodation.hotel,accommodation.guest_house','Nuitée surprise dans la région','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(60,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Une activité sportive amusante','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(61,'cafe','catering.cafe','Salon de thé et confidences','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(62,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Une pièce de théâtre à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(63,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Une activité que nous n’avons jamais faite','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(64,'spa','leisure.spa,service.beauty.spa','Un spa à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(65,'nature','leisure.park,leisure.park.nature_reserve,national_park','Pause nature loin du quotidien','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(66,'restaurant','catering.restaurant','Repas convivial en amoureux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(67,'stay','accommodation.hotel,accommodation.guest_house','Hôtel à découvrir à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(68,'wine','production.winery,production.brewery,production.distillery','Découvrir le savoir-faire d’une brasserie','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(69,'brunch','catering.cafe,catering.restaurant','Découverte d’une bonne adresse déjeuner','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(70,'museum','entertainment.museum,entertainment.culture.gallery','Voyage à travers l’histoire locale','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(71,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Défi d’évasion en équipe','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(72,'bar','catering.bar,catering.pub','Un pub local à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(73,'nature','leisure.park,leisure.park.nature_reserve,national_park','Pique-nique dans un nouvel endroit','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(74,'restaurant','catering.restaurant','Souper dans un restaurant jamais essayé','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(75,'massage','service.beauty.massage','Découvrir un centre de massage','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(76,'views','tourism.attraction,natural.mountain.peak','Un lieu emblématique du coin','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(77,'restaurant','catering.restaurant','Sortie au restaurant mystère','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(78,'museum','entertainment.museum,entertainment.culture.gallery','Visite culturelle en amoureux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(79,'sport','sport.sports_centre,entertainment.bowling_alley,entertainment.miniature_golf','Une sortie active surprise','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(80,'cafe','catering.cafe','Pause douceur hors de la maison','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(81,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Découvrir une scène locale','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(82,'market','commercial.marketplace','Balade parmi les commerçants','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(83,'spa','leisure.spa,service.beauty.spa','Parenthèse pour prendre soin de nous','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(84,'views','tourism.attraction,natural.mountain.peak','Découvrir un panorama','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(85,'restaurant','catering.restaurant','Un restaurant recommandé dans la région','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(86,'stay','accommodation.hotel,accommodation.guest_house','Mini séjour sans obligations','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(87,'wine','production.winery,production.brewery,production.distillery','Découvrir les artisans d’une boisson locale','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(88,'cafe','catering.cafe','Café gourmand en tête-à-tête','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(89,'show','entertainment.cinema,entertainment.culture.theatre,entertainment.culture.arts_centre','Une soirée cinéma à deux','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(90,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Découverte d’un lieu de divertissement','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(91,'spa','leisure.spa,service.beauty.spa','Une pause bien-être','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(92,'nature','leisure.park,leisure.park.nature_reserve,national_park','Un sentier à explorer','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(93,'restaurant','catering.restaurant','Table inspirée d’une cuisine du monde','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(94,'stay','accommodation.hotel,accommodation.guest_house','Une nuit ailleurs juste pour nous','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(95,'wine','production.winery,production.brewery,production.distillery','Visiter un vignoble local','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(96,'brunch','catering.cafe,catering.restaurant','Un brunch pour prendre notre temps','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(97,'museum','entertainment.museum,entertainment.culture.gallery','Une galerie d’art à découvrir','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(98,'adventure','entertainment.escape_game,entertainment.activity_park,entertainment.theme_park','Une aventure ludique','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(99,'bar','catering.bar,catering.pub','Apéro et conversation sans écran','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.'),
(100,'nature','leisure.park,leisure.park.nature_reserve,national_park','Découverte d’un parc naturel','Découvrez à deux un endroit réel pour vivre cette expérience près de chez vous. Vérifiez les services et disponibilités auprès de l''établissement avant de partir.')
on conflict(face) do update set
theme=excluded.theme,geo_categories=excluded.geo_categories,title=excluded.title,description=excluded.description;
revoke all on public.love_world_experiences from anon;
grant select on public.love_world_experiences to authenticated;
alter table public.love_world_experiences enable row level security;
drop policy if exists love_world_experience_read on public.love_world_experiences;
create policy love_world_experience_read on public.love_world_experiences
for select to authenticated using (true);

create table if not exists public.love_monthly_face_years (
 couple_id uuid not null references public.couples(id) on delete cascade,
 year integer not null check(year between 2020 and 2100),
 face integer not null check(face between 1 and 100),
 roll_id uuid,
 primary key(couple_id,year,face)
);
-- Existing monthly faces are already used in their original year, even if edited later.
insert into public.love_monthly_face_years(couple_id,year,face,roll_id)
select r.couple_id,substring(r.key from 1 for 4)::int,r.face,min(r.id::text)::uuid
from public.couple_rolls r
where r.kind='monthly_activity' and r.key ~ '^20[0-9]{2}-[0-9]{2}$'
group by r.couple_id,substring(r.key from 1 for 4)::int,r.face
on conflict do nothing;
revoke all on public.love_monthly_face_years from anon,authenticated;
-- No browser permission to override yearly exclusions.
alter table public.love_monthly_face_years enable row level security;
drop policy if exists love_monthly_years_read on public.love_monthly_face_years;
create policy love_monthly_years_read on public.love_monthly_face_years
for select to authenticated using(couple_private.is_member(couple_id));
grant select on public.love_monthly_face_years to authenticated;

create table if not exists public.love_monthly_places (
 roll_id uuid primary key references public.couple_rolls(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 roll_key text not null,
 state text not null check(state in ('pending','ready','unavailable')),
 claimed_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 place_id text,
 name text,
 address text,
 latitude numeric(9,6),
 longitude numeric(9,6),
 driving_meters integer,
 website_url text,
 menu_url text,
 booking_url text,
 photo_url text,
 check (driving_meters is null or driving_meters>=0),
 check (length(coalesce(name,''))<=200 and length(coalesce(address,''))<=300),
 check (length(coalesce(place_id,''))<=220),
 check (state<>'ready' or (place_id is not null and name is not null and driving_meters is not null))
);
create index if not exists love_monthly_places_couple_history on public.love_monthly_places(couple_id,roll_key,state);
alter table public.love_monthly_places enable row level security;
drop policy if exists love_monthly_places_read on public.love_monthly_places;
create policy love_monthly_places_read on public.love_monthly_places
for select to authenticated using(public.love_verified_identity() and couple_private.is_member(couple_id));
revoke all on public.love_monthly_places from anon,authenticated;
grant select on public.love_monthly_places to authenticated;
-- All writes are backend-only, never browser controlled.


create or replace function public.roll_couple_once(p_couple uuid, p_kind text)
 returns public.couple_rolls
 language plpgsql security definer set search_path = ''
as $$
declare
 v_key text; n integer; old public.couple_rolls%rowtype;
 local_now timestamp; d date; a integer; is_restaurant boolean;
 v_weekly_weights integer[]; v_weekly_enabled boolean;
 selected public.love_monthly_activity_defaults%rowtype;
 edited public.love_monthly_activity_overrides%rowtype;
 world_entry public.love_world_experiences%rowtype;
 world_on boolean := false;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 if p_kind not in ('weekly','monthly_activity','monthly_host','monthly_restaurant') then
  raise exception 'Type de dé interdit';end if;
 perform 1 from public.couples where id=p_couple for update;
 local_now:=now() at time zone 'America/Toronto';
 d:=local_now::date;
 if p_kind='weekly' then
  v_key:=to_char((d-extract(isodow from d)::int+1)::date,'YYYY-MM-DD');
 else v_key:=to_char(d,'YYYY-MM');
 end if;
 select * into old from public.couple_rolls where couple_id=p_couple and kind=p_kind and key=v_key;
 if found then return old;end if;
 if p_kind='monthly_host' or p_kind='monthly_restaurant' then
  select face,coalesce(activity_is_restaurant,face in (1,3,7,13,18))
  into a,is_restaurant from public.couple_rolls where couple_id=p_couple and kind='monthly_activity' and key=v_key;
  if a is null then raise exception 'Brassez d’abord le D100 du mois';end if;
  if p_kind='monthly_restaurant' and not coalesce(is_restaurant,false) then
   raise exception 'Ce défi spécial ne concerne pas un restaurant';end if;
  if p_kind='monthly_restaurant' and not exists(
   select 1 from public.couple_rolls where couple_id=p_couple and kind='monthly_host' and key=v_key
  ) then raise exception 'Brassez d’abord pour déterminer qui invite';end if;
 end if;
 if p_kind='weekly' then
  select weekly_face_weights,weekly_weights_enabled
  into v_weekly_weights,v_weekly_enabled from public.couples where id=p_couple;
  n:=couple_private.roll_love_weighted_d6(v_weekly_weights,v_weekly_enabled);
 elsif p_kind='monthly_activity' then
  select face into n from public.love_world_experiences e
  where not exists(select 1 from public.love_monthly_face_years y
    where y.couple_id=p_couple and y.year=extract(year from d)::int and y.face=e.face)
  order by random() limit 1;
  if n is null then raise exception 'Les 100 expériences de cette année ont été utilisées';end if;
 else n:=floor(random()*6)::int+1;end if;
 if p_kind='monthly_activity' then
  select * into selected from public.love_monthly_activity_defaults where face=n;
  if selected.face is null then raise exception 'Activité du mois manquante';end if;
  select * into edited from public.love_monthly_activity_overrides
  where couple_id=p_couple and face=n and catalogue_version=2;
  select coalesce(activity_localization_enabled,false) into world_on
  from public.couples where id=p_couple;
  if world_on then select * into world_entry from public.love_world_experiences where face=n;end if;
  insert into public.couple_rolls(
   couple_id,kind,key,actor,face,activity_title,activity_description,activity_is_restaurant,activity_timer_minutes,
   activity_region,activity_location,activity_budget,activity_hiver,activity_ete,
   activity_distance_km_est,activity_prix_hiver_min,activity_prix_hiver_max,
   activity_prix_ete_min,activity_prix_ete_max,activity_hotel_inclus,activity_budget_note)
  values(p_couple,p_kind,v_key,auth.uid(),n,
   coalesce(edited.title,world_entry.title,selected.title),
   coalesce(edited.description,world_entry.description,selected.description),
   case when world_on then world_entry.theme='restaurant' else coalesce(edited.is_restaurant,selected.is_restaurant) end,
   edited.timer_minutes,
   case when world_on then null else selected.region end,
   case when world_on then null else selected.location end,
   case when world_on then null else selected.budget end,
   case when world_on then null else selected.hiver end,
   case when world_on then null else selected.ete end,
   case when world_on then null else selected.distance_km_est end,
   case when world_on then null else selected.prix_hiver_min end,
   case when world_on then null else selected.prix_hiver_max end,
   case when world_on then null else selected.prix_ete_min end,
   case when world_on then null else selected.prix_ete_max end,
   case when world_on then false else selected.hotel_inclus end,
   case when world_on then null else selected.budget_note end)
   returning * into old;
  insert into public.love_monthly_face_years(couple_id,year,face,roll_id)
   values(p_couple,extract(year from d)::int,n,old.id)
   on conflict(couple_id,year,face) do nothing;
 else
  insert into public.couple_rolls(couple_id,kind,key,actor,face)
   values(p_couple,p_kind,v_key,auth.uid(),n) returning * into old;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'roll',auth.uid(),p_kind);
 return old;
end;
$$;
