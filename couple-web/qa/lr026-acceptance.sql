-- Real PostgreSQL assertions: the scorer is explainable, safe and never blocks an eligible card.
DO $test$
DECLARE score integer; fallback integer;
BEGIN
 SELECT couple_private.love_variety_penalty(
  'Écoute mon cœur','Quelque chose de doux','Ecoute mon coeur','Autre consigne') INTO score;
 IF score<>100 THEN RAISE EXCEPTION 'Same accent-insensitive title must score 100, got %',score; END IF;
 SELECT couple_private.love_variety_penalty(
  'Moment de détente','Propose un massage agréable',
  'Pause relaxante','Un massage des épaules') INTO score;
 IF score<>50 THEN RAISE EXCEPTION 'Same massage theme must score 50, got %',score; END IF;
 SELECT couple_private.love_variety_penalty(
  'Notre danse','Un pas de danse ensemble',
  'Question du jour','Raconte un souvenir heureux') INTO score;
 IF score<>0 THEN RAISE EXCEPTION 'Unrelated themes must score zero, got %',score; END IF;
 SELECT couple_private.love_variety_penalty(
  'Inventer les étoiles bleues','Activité originale',
  'Observer les étoiles bleues','Autre thème') INTO score;
 IF score<>30 THEN RAISE EXCEPTION 'Two distinctive overlapping title words must score 30, got %',score; END IF;
 SELECT couple_private.love_variety_penalty(
  'Un bisou','Embrasser doucement',NULL,NULL) INTO score;
 IF score<>0 THEN RAISE EXCEPTION 'No previous card must not affect random selection'; END IF;
 SELECT chosen.card INTO fallback FROM (
  SELECT card, couple_private.love_variety_penalty(
   'Massage '||card,'Masser le dos','Massage initial','Masser les mains') AS penalty
  FROM generate_series(1,3) card
 ) chosen ORDER BY chosen.penalty,random() LIMIT 1;
 IF fallback NOT BETWEEN 1 AND 3 THEN
  RAISE EXCEPTION 'Similar-only eligible bag must keep a fallback';
 END IF;
 IF has_function_privilege('anon','couple_private.love_variety_penalty(text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','couple_private.love_variety_penalty(text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Scoring helper must not be callable by API roles'; END IF;
 RAISE NOTICE 'LR026 scoring in real PostgreSQL 17: PASS';
END $test$;
