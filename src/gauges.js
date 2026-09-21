import { THRESHOLDS } from './config.js';
import { judgePeriod, hourOf } from './judge.js';

// バーの全幅にあたる値(表示だけの目盛り。判定の閾値は THRESHOLDS が唯一の元)
const KINDS = {
  wind: { label: '風', unit: 'm/s', max: 12, digits: 1, words: ['穏やか', '強め', 'とても強い'] },
  gust: { label: '突風', unit: 'm/s', max: 20, digits: 1, words: ['穏やか', '強め', 'とても強い'] },
  wave: { label: '波', unit: 'm', max: 3, digits: 2, words: ['穏やか', '高め', 'とても高い'] },
};

const ICON = { good: '✓', caution: '▲', stop: '✕', unknown: '?' };
const isValid = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

const zoneOf = (value, t) => (value >= t.stop ? 'stop' : value >= t.caution ? 'caution' : 'good');

// 表示する数字。丸めた結果が閾値に乗って、実際のゾーンより悪い側に見えるときは、切り捨てて出す
// (例: 波 0.996m を「1.00m」と出して、隣に「穏やか」と書かない)。
function displayNumber(value, digits, t) {
  const rounded = value.toFixed(digits);
  if (zoneOf(Number(rounded), t) === zoneOf(value, t)) return rounded;
  const f = 10 ** digits;
  return (Math.floor(value * f) / f).toFixed(digits);
}

export function gaugeModel(kind, value, thresholds = THRESHOLDS) {
  const k = KINDS[kind];
  const t = thresholds[kind];
  const cautionPct = (t.caution / k.max) * 100;
  const stopPct = (t.stop / k.max) * 100;
  const base = {
    kind, label: k.label, unit: k.unit, max: k.max,
    cautionValue: t.caution, stopValue: t.stop, cautionPct, stopPct,
  };
  if (!isValid(value)) {
    return { ...base, value: null, display: '-', zone: 'unknown', pct: null, word: '-', icon: ICON.unknown, text: '-' };
  }
  // judge.js と同じく「以上」で悪い側
  const zone = zoneOf(value, t);
  const display = displayNumber(value, k.digits, t);
  const word = k.words[zone === 'good' ? 0 : zone === 'caution' ? 1 : 2];
  const icon = ICON[zone];
  return {
    ...base,
    value,
    display,
    zone,
    pct: Math.min(Math.max(value / k.max, 0), 1) * 100,
    word,
    icon,
    text: `${k.label} ${display}${k.unit} ${icon} ${word}`,
  };
}

export const STRIP_FROM = 4;
export const STRIP_TO = 18;

// 4〜18時の1時間ごとの状態。段階は judgePeriod([その1時間]) なので、判定の規則とずれない。
export function hourStrip(dayHours) {
  const all = Array.isArray(dayHours) ? dayHours : [];
  const cells = [];
  for (let hour = STRIP_FROM; hour <= STRIP_TO; hour += 1) {
    const matches = all.filter((h) => h && hourOf(h.time) === hour);
    const h = matches.length === 1 ? matches[0] : null; // 欠けも重複も「不明」
    const level = h ? judgePeriod([h]).level : 'unknown';
    cells.push({
      hour,
      level,
      icon: ICON[level] ?? ICON.unknown,
      dir: h && isFiniteNumber(h.windDir) ? h.windDir : null,
      speed: h && isFiniteNumber(h.windSpeed) ? h.windSpeed : null,
    });
  }
  return cells;
}

// 時間帯の最大値。1時間でも欠けた・壊れた値があれば、その項目は null(判定の「欠けたら不明」と同じ)
export function periodMetrics(hours) {
  const list = Array.isArray(hours) ? hours : [];
  const max = (field) => {
    if (list.length === 0) return null;
    let m = 0;
    for (const h of list) {
      if (!h || !isValid(h[field])) return null;
      m = Math.max(m, h[field]);
    }
    return m;
  };
  return { wind: max('windSpeed'), gust: max('windGust'), wave: max('waveHeight') };
}
