export function extraEveningEligibility(used, limit, enabled) {
  if (!Number.isInteger(used) || !Number.isInteger(limit) || used < 0 || limit < 0) return false;
  return Boolean(enabled) && used >= limit;
}
