import { judgeDay, pickHeadline, LEVEL, dateOf, hourOf } from './judge.js';
import { freshness } from './freshness.js';
import { todayJst, hourJst, addDays, formatClock } from './dates.js';
import { sunTimes } from './sun.js';
import { periodMetrics } from './gauges.js';
import { PERIODS } from './config.js';

export function buildView({ weather, tide, spot, dateOffset, now, loading = false }) {
  const date = addDays(todayJst(now), dateOffset);
  const fresh = weather ? freshness(weather.fetchedAt, now) : 'none';
  const dayHours = (weather?.bySpot?.[spot.id] ?? []).filter((h) => dateOf(h.time) === date);

  let periods = judgeDay(dayHours);
  if (fresh === 'expired' || fresh === 'none') {
    const reason =
      fresh === 'none'
        ? loading ? 'データを取得中です' : 'まだデータを取得できていません'
        : '取得から12時間以上たったデータのため判定できません';
    periods = periods.map((p) => ({ key: p.key, label: p.label, level: LEVEL.UNKNOWN, reasons: [reason] }));
  }
  if (fresh === 'stale') {
    // 3〜12時間前のデータ: 判定の段階は変えず、色のついたカードの中に古さを書く
    const warning = `${formatClock(weather.fetchedAt)} の古いデータです。更新してください`;
    periods = periods.map((p) => ({ ...p, reasons: [warning, ...p.reasons] }));
  }
  const headline = pickHeadline(periods, dateOffset === 0, hourJst(now));

  // ゲージの数値は、大判定と同じ時間帯の最大値。判定が不明(欠損・期限切れ・データなし)なら数値は出さない
  const headlineWindow = PERIODS.find((p) => p.key === headline.key);
  const metrics =
    headlineWindow && headline.level !== LEVEL.UNKNOWN
      ? periodMetrics(dayHours.filter((h) => hourOf(h.time) >= headlineWindow.from && hourOf(h.time) < headlineWindow.to))
      : { wind: null, gust: null, wave: null };
  // 色帯に使う時間。期限切れ・データなしのデータからは色を出さない
  const stripHours = fresh === 'expired' || fresh === 'none' ? [] : dayHours;

  const tideDay = tide?.bySpot?.[spot.id]?.[date] ?? null;
  let sun = null;
  if (tideDay?.sunrise && tideDay?.sunset) {
    sun = { sunrise: tideDay.sunrise, sunset: tideDay.sunset, source: 'tide' };
  } else {
    const calc = sunTimes(date, spot.lat, spot.lon);
    if (calc) sun = { ...calc, source: 'calc' };
  }

  return {
    date, dateOffset, freshness: fresh, fetchedAt: weather?.fetchedAt ?? null,
    periods, headline, dayHours, stripHours, metrics, tideDay, sun,
  };
}
