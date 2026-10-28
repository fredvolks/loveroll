// Validate the two source-preserved real game RPCs with PostgreSQL's SQL
// parser, even without production-only game tables on this ephemeral runner.
// The MD5 guards are separately tested and remain untouched for deployment.
const {readFileSync}=require('node:fs');
const path=require('node:path');
const migration=readFileSync(path.join(__dirname,'../migrations/20261028_lr026_variety_draws.sql'),'utf8');
const start=migration.indexOf('CREATE OR REPLACE FUNCTION public.draw_for_partner(');
const end=migration.lastIndexOf('\nCOMMIT;');
if(start<0||end<start)throw Error('Missing protected official functions');
const definitions=migration.slice(start,end).trim();
const delims=definitions.match(/\$function\$;/g)||[];
if(delims.length!==2)throw Error('Each PL/pgSQL function must terminate independently (found '+delims.length+')');
process.stdout.write([
 'SET check_function_bodies = off;',
 'SET search_path = public,pg_catalog;',
 'CREATE TABLE IF NOT EXISTS public.couple_challenges (id uuid);',
 definitions,
 "DO $verify$ BEGIN",
 "IF to_regprocedure('public.draw_for_partner(uuid,text,boolean)') IS NULL OR",
 "to_regprocedure('public.love_respond_and_redraw(uuid,text,boolean)') IS NULL THEN",
 "RAISE EXCEPTION 'LR026 generated functions did not parse'; END IF;",
 "END $verify$;",
 ''
].join('\n'));
