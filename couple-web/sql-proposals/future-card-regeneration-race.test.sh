#!/usr/bin/env bash
# DISPOSABLE PostgreSQL only; no real receipts, payment or Supabase.
set -euo pipefail
if [[ "$PGDATABASE" != "future_card_archive_test" ]]; then
 echo 'Refusing non-test database' >&2; exit 1
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.love_future_card_archive_versions
(couple_id,member_id,level,version_no,cards,source)
VALUES('11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','soft',1,
 public.future_archive_test_cards('soft'),'initial');
INSERT INTO couple_private.love_future_verified_regen_receipts
(id,couple_id,member_id,level,provider_ref,amount_cad_cents,verified_at)
VALUES
 ('dddddddd-0000-0000-0000-000000000006',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  'synthetic-race-a-one',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000007',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  'synthetic-race-a-two',400,transaction_timestamp()),
 ('dddddddd-0000-0000-0000-000000000008',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','soft',
  'synthetic-same-b',400,transaction_timestamp());
SQL
worker() {
 psql -X -At -v ON_ERROR_STOP=1 \
  -c "SELECT couple_private.apply_future_archive_regeneration(
  '$1'::uuid,public.future_archive_test_regen_cards('soft','$2'))" \
  >"$tmp/$3.out" 2>"$tmp/$3.err"
}
race() {
 local a="$1" b="$2" x="$3" y="$4" label="$5"
 worker "$a" "$x" "$label-1" & local p1="$!"
 worker "$b" "$y" "$label-2" & local p2="$!"
 local s1=0 s2=0
 wait "$p1" || s1="$?"
 wait "$p2" || s2="$?"
 if [[ "$s1" -eq "$s2" ]]; then
  echo "$label must succeed exactly once" >&2
  cat "$tmp/$label-"*.err >&2; exit 1
 fi
 local err="$tmp/$label-1.err"
 if [[ "$s1" -eq 0 ]]; then err="$tmp/$label-2.err"; fi
 if [[ "$label" == "two-receipts" ]]; then
  grep -q 'Two-calendar-month cooldown has not expired' "$err" || {
   cat "$err" >&2; exit 1;
  }
 else
  grep -q 'Verified unused receipt required' "$err" || {
   cat "$err" >&2; exit 1;
  }
 fi
}
race 'dddddddd-0000-0000-0000-000000000006' \
 'dddddddd-0000-0000-0000-000000000007' \
 'race-one' 'race-two' 'two-receipts'
race 'dddddddd-0000-0000-0000-000000000008' \
 'dddddddd-0000-0000-0000-000000000008' \
 'double-click' 'double-click' 'same-receipt'
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $verify$
BEGIN
 IF (SELECT COUNT(*) FROM public.love_future_card_archive_versions
  WHERE member_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND level='soft')<>3
 THEN RAISE EXCEPTION 'Two receipts generated duplicate A versions';END IF;
 IF (SELECT COUNT(*) FROM public.love_future_card_archive_versions
  WHERE member_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND level='soft')<>2
 THEN RAISE EXCEPTION 'Double click generated duplicate B versions';END IF;
 IF (SELECT COUNT(*) FROM couple_private.love_future_verified_regen_receipts
  WHERE id IN ('dddddddd-0000-0000-0000-000000000006',
   'dddddddd-0000-0000-0000-000000000007')
  AND consumed_at IS NOT NULL AND archive_id IS NOT NULL)<>1
 THEN RAISE EXCEPTION 'Two-receipt race consumed more than one receipt';END IF;
 IF (SELECT COUNT(*) FROM couple_private.love_future_verified_regen_receipts
  WHERE id='dddddddd-0000-0000-0000-000000000008'
  AND consumed_at IS NOT NULL AND archive_id IS NOT NULL)<>1
 THEN RAISE EXCEPTION 'Same receipt was not consumed exactly once';END IF;
 IF (SELECT COUNT(*) FROM public.love_future_card_archive_versions
  WHERE source='initial')<>4
 THEN RAISE EXCEPTION 'Original archives were altered';END IF;
END;
$verify$;
SQL
echo 'Concurrent receipt and double-click tests passed'
