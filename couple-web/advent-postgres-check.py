"""Real PostgreSQL transactions in an isolated CI database. Never runs on production."""
import concurrent.futures, json, os, pathlib, subprocess, threading
ROOT=pathlib.Path(__file__).resolve().parent
if os.environ.get('PGDATABASE')!='loveroll_advent_test':
    raise SystemExit('This verification requires the isolated loveroll_advent_test database.')
A='11111111-1111-4111-8111-111111111111'
B='22222222-2222-4222-8222-222222222222'
C='33333333-3333-4333-8333-333333333333'
D='44444444-4444-4444-8444-444444444444'
COUPLE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
def sql(query,fail=None):
    r=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if fail:
        assert r.returncode and fail in r.stderr,(fail,r.stderr)
        return None
    assert not r.returncode,r.stderr
    return r.stdout.strip().splitlines()
def actor(uid,date,query,fail=None,role='authenticated'):
    return sql("begin;set local role "+role+";select set_config('request.jwt.claim.sub','"+uid+"',true);select set_config('loveroll.test_date','"+date+"',true);"+query+";commit;",fail)
def open_day(uid,day,date='2026-12-10',year=2026,fail=None):
    out=actor(uid,date,"select row_to_json(r) from public.open_advent_day('"+COUPLE+"',"+str(day)+","+str(year)+") r",fail)
    return None if fail else json.loads(out[-1])
fixture=r'''
create schema auth;create schema couple_private;
create role anon;create role authenticated;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create table public.couples(id uuid primary key);
create table public.couple_members(couple_id uuid references public.couples(id),user_id uuid references auth.users(id));
create table public.couple_advent(couple_id uuid references public.couples(id),year smallint,day smallint check(day between 1 and 25),opened_by uuid references auth.users(id),performed_by uuid references auth.users(id),completed boolean not null default false,opened_at timestamptz not null default now(),advent_type text,advent_title text,advent_description text,advent_timer_minutes smallint check(advent_timer_minutes between 1 and 60),primary key(couple_id,year,day));
create table public.couple_events(id bigint generated always as identity,couple_id uuid,event_type text,actor_id uuid,title text);
create table public.love_advent_2026_days(couple_id uuid,day smallint,type text,title text,description text,timer_minutes smallint,primary key(couple_id,day));
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function couple_private.is_member(p_couple uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.couple_members m where m.couple_id=p_couple and m.user_id=(select auth.uid()))$$;
create function public.love_require_verified_identity() returns void language plpgsql stable security definer set search_path='' as $$begin if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirmez votre adresse courriel' using errcode='28000';end if;end$$;
-- The TEST database alone controls this clock. Production keeps the real Toronto clock.
create function public.love_advent_server_date() returns date language sql stable security definer set search_path='' as $$select current_setting('loveroll.test_date')::date$$;
alter table public.couple_advent enable row level security;
create policy advent_read on public.couple_advent for select to authenticated using(couple_private.is_member(couple_id));
grant usage on schema public,auth,couple_private to authenticated;
grant execute on function auth.uid(),couple_private.is_member(uuid) to authenticated;
grant select on public.couple_advent to authenticated;
'''
sql(fixture)
sql("insert into auth.users values ('"+A+"',now()),('"+B+"',now()),('"+C+"',now()),('"+D+"',null);insert into public.couples values('"+COUPLE+"');insert into public.couple_members values('"+COUPLE+"','"+A+"'),('"+COUPLE+"','"+B+"');insert into public.love_advent_2026_days select '"+COUPLE+"',n,'Romantique','Titre officiel '||n,'Texte exact '||n||E'\\n  Ligne inchangée. ',case when n%2=1 then 7 else null end from generate_series(1,25) n;")
sql((ROOT/'migrations/20261017045614_loveroll_advent_catchup.sql').read_text())
open_day(A,1,'2026-11-30',fail='Cette lettre sera disponible')
first=open_day(A,1,'2026-12-01');assert first['advent_title']=='Titre officiel 1' and first['opened_by']==A
for n in [2,9,10]:
    r=open_day(A,n);assert r['day']==n and r['year']==2026 and r['advent_title']=='Titre officiel '+str(n)
assert open_day(B,2)['advent_timer_minutes'] is None
open_day(A,11,fail='Cette lettre sera disponible')
open_day(C,3,fail='Accès refusé')
open_day(D,3,fail='Confirmez votre adresse courriel')
actor('', '2026-12-10',"select public.open_advent_day('"+COUPLE+"',3,2026)",fail='permission denied',role='anon')
actor(A,'2026-12-10',"insert into public.couple_advent(couple_id,year,day,opened_by) values('"+COUPLE+"',2026,3,'"+A+"')",fail='permission denied')
assert actor(C,'2026-12-10','select count(*) from public.couple_advent')[-1]=='0'
for day,year in [(0,2026),(26,2026),('null',2026),(3,2025),(3,'null')]:open_day(A,day,year=year,fail='Date de calendrier invalide')
barrier=threading.Barrier(2)
def concurrent_open(uid):
    barrier.wait();return open_day(uid,7)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(concurrent_open,[A,B]))
assert results[0]==results[1],results
assert sql("select count(*) from public.couple_advent where year=2026 and day=7")[-1]=='1'
assert sql("select count(*) from public.couple_events where title='Surprise du 7 décembre 2026 ouverte'")[-1]=='1'
saved=results[0]
sql("update public.love_advent_2026_days set title='Nouveau titre personnalisé',description='Texte modifié',timer_minutes=15 where day=7")
assert open_day(B,7)==saved,'An import/edit changed an official opened snapshot'
assert open_day(B,25,'2026-12-26')['day']==25
assert open_day(A,24,'2027-01-10',2026)['day']==24
open_day(A,1,'2027-01-10',2027,fail='Cette lettre sera disponible')
legacy=actor(B,'2026-12-10',"select row_to_json(r) from public.open_advent_day('"+COUPLE+"',8) r")
assert json.loads(legacy[-1])['day']==8
assert sql("select has_function_privilege('anon','public.open_advent_day(uuid,integer,integer)','EXECUTE')")[-1]=='f'
assert sql("select has_function_privilege('authenticated','public.open_advent_day(uuid,integer,integer)','EXECUTE')")[-1]=='t'
print('ADVENT_POSTGRES_OK current/catch-up/multiple/future/after25/nextyear/concurrent/idempotent/snapshot/RLS/verified/legacy')
