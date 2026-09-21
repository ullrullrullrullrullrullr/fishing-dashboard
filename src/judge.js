import { THRESHOLDS, PERIODS } from './config.js';

export const LEVEL = Object.freeze({ GOOD: 'good', CAUTION: 'caution', STOP: 'stop', UNKNOWN: 'unknown' });
export const LEVEL_LABEL = Object.freeze({
  good: '条件は良さそう',
  caution: '注意',
  stop: 'やめた方がいい',
  unknown: '不明',
});

const isNonNegative = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isWeatherCode = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
const round1 = (v) => Math.round(v * 10) / 10;
const unknown = (reason) => ({ level: LEVEL.UNKNOWN, reasons: [reason] });

export const hourOf = (time) => Number(String(time).slice(11, 13));
export const dateOf = (time) => String(time).slice(0, 10);

export function judgePeriod(hours, t = THRESHOLDS) {
  try {
    if (!Array.isArray(hours) || hours.length === 0) return unknown('この時間帯のデータがありません');
    let maxWind = 0;
    let maxGust = 0;
    let maxWave = 0;
    let thunder = false;
    let swellRisk = null;
    let swellSeen = false;
    for (const h of hours) {
      if (
        !h ||
        !isNonNegative(h.windSpeed) ||
        !isNonNegative(h.windGust) ||
        !isNonNegative(h.waveHeight) ||
        !isWeatherCode(h.weatherCode)
      ) {
        return unknown('風・波・天気のデータが欠けています');
      }
      maxWind = Math.max(maxWind, h.windSpeed);
      maxGust = Math.max(maxGust, h.windGust);
      maxWave = Math.max(maxWave, h.waveHeight);
      if (h.weatherCode >= t.thunder.from && h.weatherCode <= t.thunder.to) thunder = true;
      // うねりは「1時間ごと」に判定する(周期が長い時間と波が高い時間が別々なら注意にしない)。
      // 時間帯の最大値どうしを組み合わせると、実際には同時に起きていない条件で注意を出すことになるため。
      if (isNonNegative(h.swellPeriod)) {
        swellSeen = true;
        if (h.swellPeriod >= t.swell.minPeriod && h.waveHeight >= t.swell.minWave) {
          swellRisk = Math.max(swellRisk ?? 0, h.swellPeriod);
        }
      }
    }
    const stop = [];
    const caution = [];
    if (maxWind >= t.wind.stop) stop.push(`風がとても強い ${round1(maxWind)}m/s`);
    else if (maxWind >= t.wind.caution) caution.push(`風が強め ${round1(maxWind)}m/s`);
    if (maxGust >= t.gust.stop) stop.push(`突風がとても強い ${round1(maxGust)}m/s`);
    else if (maxGust >= t.gust.caution) caution.push(`突風が強め ${round1(maxGust)}m/s`);
    if (maxWave >= t.wave.stop) stop.push(`波がとても高い ${round1(maxWave)}m`);
    else if (maxWave >= t.wave.caution) caution.push(`波が高め ${round1(maxWave)}m`);
    if (thunder) stop.push('雷の可能性');
    if (swellRisk !== null) caution.push(`うねりが長い(周期${round1(swellRisk)}秒)`);

    const level = stop.length ? LEVEL.STOP : caution.length ? LEVEL.CAUTION : LEVEL.GOOD;
    const reasons = [...stop, ...caution];
    if (level === LEVEL.GOOD) reasons.push('風・波とも穏やか');
    if (!swellSeen) reasons.push('うねり情報なし');
    return { level, reasons };
  } catch {
    return unknown('判定できませんでした');
  }
}

export function judgeDay(dayHours, t = THRESHOLDS, periods = PERIODS) {
  const all = Array.isArray(dayHours) ? dayHours : [];
  return periods.map((p) => {
    const hours = all.filter((h) => {
      const hr = hourOf(h?.time);
      return hr >= p.from && hr < p.to;
    });
    // 時刻の重複で行数だけ合っている場合も不明にする(from..to-1 の各時がちょうど1回ずつ必要)
    const distinct = new Set(hours.map((h) => hourOf(h.time)));
    const complete = hours.length === p.to - p.from && distinct.size === p.to - p.from;
    const result = complete ? judgePeriod(hours, t) : unknown('この時間帯のデータが足りません');
    return { key: p.key, label: p.label, ...result };
  });
}

export function pickHeadline(results, isToday, hour) {
  const key = isToday && hour >= 15 ? 'evening' : 'day';
  return (
    (Array.isArray(results) ? results : []).find((r) => r.key === key) ?? {
      key: 'none',
      label: '',
      level: LEVEL.UNKNOWN,
      reasons: ['判定できませんでした'],
    }
  );
}
