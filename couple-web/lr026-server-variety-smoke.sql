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
