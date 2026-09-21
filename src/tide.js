import { getJson } from './http.js';
import { addDays } from './dates.js';
import { FETCH_TIMEOUT_MS } from './config.js';

const CLOCK = /^\d{1,2}:\d{2}$/;

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const events = (list) =>
  Array.isArray(list)
    ? list
        .filter((e) => e && CLOCK.test(e.time) && Number.isFinite(e.cm))
        .map((e) => ({ time: e.time, cm: Math.round(e.cm) }))
    : [];

export function buildTideUrl(spot, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `https://tide736.net/api/get_tide.php?pc=${spot.tide.pc}&hc=${spot.tide.hc}&yr=${y}&mn=${m}&dy=${d}&rg=week`;
}

export function normalizeTide(json) {
  const chart = json?.status === 1 ? json?.tide?.chart : null;
  if (!chart || typeof chart !== 'object' || Object.keys(chart).length === 0) {
    throw new Error('潮汐データの形式が正しくありません');
  }
  const days = {};
  for (const [date, d] of Object.entries(chart)) {
    days[date] = {
      sunrise: CLOCK.test(d?.sun?.rise ?? '') ? d.sun.rise : null,
      sunset: CLOCK.test(d?.sun?.set ?? '') ? d.sun.set : null,
      moonAge: toNumber(d?.moon?.age),
      tideName: typeof d?.moon?.title === 'string' ? d.moon.title : null,
      highs: events(d?.flood),
      lows: events(d?.edd),
    };
  }
  return days;
}

export async function fetchTide(
  spots,
  dateStr,
  { fetchImpl = globalThis.fetch, now = () => Date.now(), timeoutMs = FETCH_TIMEOUT_MS } = {},
) {
  const targets = spots.filter((s) => s.tide);
  const results = await Promise.allSettled(
    targets.map(async (s) => normalizeTide(await getJson(buildTideUrl(s, dateStr), fetchImpl, timeoutMs))),
  );
  const bySpot = {};
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') bySpot[targets[i].id] = r.value;
    else failed.push(targets[i].id);
  });
  if (Object.keys(bySpot).length === 0) throw new Error('潮汐データを取得できません');
  return { fetchedAt: now(), bySpot, failed };
}

// 新しく取れた分を、保存済みの分に重ねる(失敗した釣り場の古いデータは残す)。保存する形なので failed は含めない。
export function mergeTide(oldTide, freshTide) {
  return {
    fetchedAt: freshTide.fetchedAt,
    bySpot: { ...(oldTide?.bySpot ?? {}), ...freshTide.bySpot },
  };
}

export function tideNeedsFetch(tide, spots, todayStr) {
  const targets = spots.filter((s) => s.tide);
  if (targets.length === 0) return false;
  if (!tide?.bySpot) return true;
  const need = [todayStr, addDays(todayStr, 1), addDays(todayStr, 2)];
  return targets.some((s) => need.some((d) => !tide.bySpot[s.id]?.[d]));
}
