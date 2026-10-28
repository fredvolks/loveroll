-- LR-026: non-destructive local similarity scoring for eligible card titles.
-- This helper alone does NOT change game selection, odds or production data.
BEGIN;
CREATE OR REPLACE FUNCTION couple_private.love_variety_penalty(
 p_title text,p_description text,p_previous_title text,p_previous_description text
) RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $variety$
DECLARE
 a_title text; b_title text; a_text text; b_text text;
 a_theme text:='other'; b_theme text:='other'; common_words integer:=0;
BEGIN
 IF nullif(btrim(coalesce(p_previous_title,'')),'') IS NULL THEN RETURN 0; END IF;
 a_title:=regexp_replace(lower(translate(coalesce(p_title,''),
  'éèêëàâäîïôöùûüç','eeeeaaaiioouuuc')),'[^a-z0-9]+',' ','g');
 b_title:=regexp_replace(lower(translate(coalesce(p_previous_title,''),
  'éèêëàâäîïôöùûüç','eeeeaaaiioouuuc')),'[^a-z0-9]+',' ','g');
 IF nullif(btrim(a_title),'') IS NOT NULL AND btrim(a_title)=btrim(b_title) THEN RETURN 100; END IF;
 a_text:=a_title||' '||regexp_replace(lower(translate(coalesce(p_description,''),
  'éèêëàâäîïôöùûüç','eeeeaaaiioouuuc')),'[^a-z0-9]+',' ','g');
 b_text:=b_title||' '||regexp_replace(lower(translate(coalesce(p_previous_description,''),
  'éèêëàâäîïôöùûüç','eeeeaaaiioouuuc')),'[^a-z0-9]+',' ','g');
 a_theme:=CASE
  WHEN a_text ~ '\m(massage|masser|masses)\M' THEN 'massage'
  WHEN a_text ~ '\m(baiser|bisou|bisous|embrasser)\M' THEN 'baiser'
  WHEN a_text ~ '\m(regard|regarder|yeux)\M' THEN 'regard'
  WHEN a_text ~ '\m(danse|danser|dansez)\M' THEN 'danse'
  WHEN a_text ~ '\m(caresse|caresser|toucher|effleurer)\M' THEN 'caresse'
  WHEN a_text ~ '\m(question|questions|raconter|souvenir|souvenirs)\M' THEN 'discussion'
  WHEN a_text ~ '\m(musique|chanter|chanson|ecouter)\M' THEN 'musique'
  ELSE 'other' END;
 b_theme:=CASE
  WHEN b_text ~ '\m(massage|masser|masses)\M' THEN 'massage'
  WHEN b_text ~ '\m(baiser|bisou|bisous|embrasser)\M' THEN 'baiser'
  WHEN b_text ~ '\m(regard|regarder|yeux)\M' THEN 'regard'
  WHEN b_text ~ '\m(danse|danser|dansez)\M' THEN 'danse'
  WHEN b_text ~ '\m(caresse|caresser|toucher|effleurer)\M' THEN 'caresse'
  WHEN b_text ~ '\m(question|questions|raconter|souvenir|souvenirs)\M' THEN 'discussion'
  WHEN b_text ~ '\m(musique|chanter|chanson|ecouter)\M' THEN 'musique'
  ELSE 'other' END;
 IF a_theme<>'other' AND a_theme=b_theme THEN RETURN 50; END IF;
 SELECT count(*) INTO common_words FROM (
  SELECT DISTINCT w FROM regexp_split_to_table(a_title,' +') w
  WHERE length(w)>=5 AND w NOT IN ('partenaire','ensemble','moment','faire','defis','soiree','temps')
  INTERSECT
  SELECT DISTINCT w FROM regexp_split_to_table(b_title,' +') w
  WHERE length(w)>=5 AND w NOT IN ('partenaire','ensemble','moment','faire','defis','soiree','temps')
 ) common;
 RETURN CASE WHEN common_words>=2 THEN 30 ELSE 0 END;
END;
$variety$;
REVOKE ALL ON FUNCTION couple_private.love_variety_penalty(text,text,text,text)
 FROM PUBLIC,anon,authenticated;
COMMIT;
