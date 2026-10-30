-- Disposable PostgreSQL 17 CI fixture; never run against LoveRoll production.
-- Only the schema needed for LR-026's private helper functions.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA couple_private;

CREATE TABLE public.love_base_challenges (
  category text NOT NULL,
  card_id integer NOT NULL,
  title text,
  description text,
  PRIMARY KEY (category, card_id)
);

CREATE TABLE couple_private.love_active_challenges (
  couple_id uuid NOT NULL,
  category text NOT NULL,
  card_id integer NOT NULL,
  title text,
  description text,
  PRIMARY KEY (couple_id, category, card_id)
);

CREATE TABLE public.couple_challenges (
  couple_id uuid NOT NULL,
  session_id uuid NOT NULL,
  category text NOT NULL,
  card_id integer,
  card_title text,
  card_description text
);

-- The account and session identifiers below are fixed synthetic test values.
INSERT INTO public.love_base_challenges(category,card_id,title,description)
VALUES
 ('SENSUEL',1,'Baisers dans le cou','Propose des baisers doux à ton partenaire'),
 ('SENSUEL',2,'Une danse au salon','Choisissez une chanson et dansez ensemble'),
 ('SEXUEL',1,'Une invitation différente','Parlez de vos envies et limites'),
 ('SEXUEL',4,'Baisers dans le cou','Propose des baisers doux à ton partenaire');

INSERT INTO couple_private.love_active_challenges(
 couple_id,category,card_id,title,description)
VALUES (
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SENSUEL',3,
 'Baisers dans le cou','Une autre carte qui ressemble à la première');

INSERT INTO public.couple_challenges(
 couple_id,session_id,category,card_id,card_title,card_description)
VALUES (
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'SENSUEL',1,'Baisers dans le cou','Propose des baisers doux à ton partenaire');
