import { FRESHNESS } from './config.js';

export function freshness(fetchedAt, now = Date.now(), f = FRESHNESS) {
  if (!Number.isFinite(fetchedAt) || !Number.isFinite(now)) return 'expired';
  const age = now - fetchedAt;
  if (age < 0 || age > f.expiredMs) return 'expired';
  if (age > f.staleMs) return 'stale';
  return 'fresh';
}

export function needsRefresh(fetchedAt, now = Date.now(), f = FRESHNESS) {
  if (!Number.isFinite(fetchedAt) || !Number.isFinite(now)) return true;
  const age = now - fetchedAt;
  return age < 0 || age > f.refreshMs;
}
