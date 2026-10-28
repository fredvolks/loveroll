-- Ephemeral PostgreSQL 17 fixture; NEVER production.
CREATE SCHEMA IF NOT EXISTS couple_private;
DO $roles$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $roles$;
