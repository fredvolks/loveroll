-- LR-026 : exécuter UNIQUEMENT après installation sur une base de test isolée.
-- Ce contrôle n'écrit aucune donnée utilisateur.
BEGIN READ ONLY;
DO $lr026_test$
BEGIN
 IF NOT couple_private.love_variety_near(
    'Baisers dans le cou','Une douce invitation.',
    'Baisers dans le cou !','Autres instructions.') THEN
   RAISE EXCEPTION 'LR-026 : titres identiques non reconnus';
 END IF;
 IF NOT couple_private.love_variety_near(
    'Massage relaxant','Masser lentement les mains, épaules, dos, jambes et pieds.',
    'Pause détente','Masser lentement les mains, épaules, dos, jambes et pieds.') THEN
   RAISE EXCEPTION 'LR-026 : quasi-doublon non reconnu';
 END IF;
 IF couple_private.love_variety_near(
    'Une danse au salon','Choisissez une chanson pour danser ensemble.',
    'Pause chocolat','Partagez un dessert après un récit joyeux.') THEN
   RAISE EXCEPTION 'LR-026 : activités différentes confondues';
 END IF;
 IF couple_private.love_variety_normalize('Épaules à deux') <>
      'epaules a deux' THEN
   RAISE EXCEPTION 'LR-026 : accents non normalisés';
 END IF;
 IF couple_private.love_variety_normalize('Cœur et âme, sœur & æther') <>
      'coeur et ame soeur aether' THEN
   RAISE EXCEPTION 'LR-026 : ligatures françaises non normalisées';
 END IF;
 IF NOT couple_private.love_variety_near(
    'Un cœur léger','Quelques secondes de complicité.',
    'Un coeur léger','Autre consigne.') THEN
   RAISE EXCEPTION 'LR-026 : cœur et coeur reconnus à tort comme différents';
 END IF;
 -- Generic instructions alone must NOT create a false similarity.
 IF couple_private.love_variety_near(
    'Soirée parfum',
    'Invitez votre partenaire pendant quelques minutes.',
    'Boisson tranquille',
    'Proposez avec votre partenaire pendant quelques minutes.') THEN
   RAISE EXCEPTION 'LR-026 : faux doublon avec des consignes génériques';
 END IF;
 IF couple_private.love_variety_near(
    'Sans information',null,
    'Autre activité',null) THEN
   RAISE EXCEPTION 'LR-026 : données vides traitées comme un doublon';
 END IF;
 -- Neither browser role may call the private helpers directly.
 IF pg_catalog.has_function_privilege('anon',
   'couple_private.love_variety_rank(uuid,uuid,text,integer)','EXECUTE')
  OR pg_catalog.has_function_privilege('authenticated',
   'couple_private.love_variety_rank(uuid,uuid,text,integer)','EXECUTE') THEN
   RAISE EXCEPTION 'LR-026 : exécution du rang privé exposée au navigateur';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='couple_private'
    AND p.proname='love_variety_rank'
 ) THEN
   RAISE EXCEPTION 'LR-026 : fonction de classement manquante';
 END IF;
END; $lr026_test$;
ROLLBACK;
