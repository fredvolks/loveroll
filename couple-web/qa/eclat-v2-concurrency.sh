#!/usr/bin/env bash
set -euo pipefail
run_start(){
  psql -X -qAt -v ON_ERROR_STOP=1 -c "
    set role authenticated;
    set request.jwt.claim.sub='$1';
    select public.love_eclat_v2_start(4,$2,'two');" > /dev/null
}
run_start '00000000-0000-0000-0000-000000000003' 30 &
one=$!
run_start '00000000-0000-0000-0000-000000000004' 90 &
two=$!
wait "$one"
wait "$two"
psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare n int; s public.love_eclat_v2_sessions%rowtype;
begin
 select count(*) into n from public.love_eclat_v2_sessions
  where couple_id='10000000-0000-0000-0000-000000000002';
 if n<>1 then raise exception 'Two parallel starts created % sessions',n;end if;
 select * into s from public.love_eclat_v2_sessions
  where couple_id='10000000-0000-0000-0000-000000000002';
 if s.ended_at is not null or s.variant<>0 or s.role_a=s.role_b or s.chapter_index<>1
  then raise exception 'Concurrent start contract violated';end if;
end $$;
SQL
