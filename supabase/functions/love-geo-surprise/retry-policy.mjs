// One billable Geoapify lookup at a time for an official D100 roll.
// The policy is pure, deterministic and shared with the Node regression suite.
export const MAX_GEO_ATTEMPTS = 3;
// Lifetime cap per official monthly D100; manual restarts never bypass it.
export const MAX_TOTAL_GEO_ATTEMPTS = 6;
export const GEO_CLAIM_WAIT_MS = 120_000;
export const GEO_MANUAL_RETRY_WAIT_MS = 15 * 60_000;

export function geoRetryDecision(existing, {now = Date.now(), manual = false} = {}) {
  if (!existing) return {status: 'claim', attempt: 1};
  if (existing.state !== 'pending') return {status: 'stored'};
  const n = Number(existing.geo_attempts);
  const attempts = Number.isInteger(n) && n >= 0 ? n : 0;
  const claimed = Date.parse(existing.claimed_at);
  // Invalid/incomplete claim data must never create an immediate billable retry.
  if (!Number.isFinite(claimed) || !Number.isFinite(now)) return {status: 'pending'};
  const age = Math.max(0, now - claimed);
  if (age < GEO_CLAIM_WAIT_MS) return {status: 'pending'};
  const rawTotal = Number(existing.geo_total_attempts);
  const total = Number.isInteger(rawTotal) && rawTotal > 0 ?
    Math.max(rawTotal, attempts) : attempts;
  if (total >= MAX_TOTAL_GEO_ATTEMPTS) return {status:'retry_limit_reached'};
  if (attempts >= MAX_GEO_ATTEMPTS) {
    return manual && age >= GEO_MANUAL_RETRY_WAIT_MS ?
      {status: 'claim', attempt: 1} :
      {status: 'retry_exhausted'};
  }
  return {status: 'claim', attempt: attempts + 1};
}

/** A blank user limit is different from the service's finite search coverage.
 * Three progressively broader searches maximum; no world-wide crawl.
 */
export function boundedSearchRadii(radiusKm,technicalMaxKm){
 const cap=Number(technicalMaxKm);
 if(!Number.isInteger(cap)||cap<10||cap>500)return [];
 if(radiusKm===null||radiusKm===undefined){
  return [...new Set([Math.min(50,cap),Math.min(150,cap),cap])];
 }
 const radius=Number(radiusKm);
 return Number.isInteger(radius)&&radius>=10&&radius<=cap?[radius]:[];
}
