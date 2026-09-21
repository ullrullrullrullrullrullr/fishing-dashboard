// 保存データ(localStorage)の形を確かめる。形が違えば null を返し、呼び出し側は「データなし」として扱う。
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validWeather(w) {
  if (!isObject(w) || !Number.isFinite(w.fetchedAt) || !isObject(w.bySpot)) return null;
  for (const hours of Object.values(w.bySpot)) {
    if (!Array.isArray(hours)) return null;
    if (!hours.every((h) => isObject(h) && typeof h.time === 'string')) return null;
  }
  return w;
}

const validEvents = (list) => Array.isArray(list) && list.every((x) => isObject(x));

export function validTide(t) {
  if (!isObject(t) || !isObject(t.bySpot)) return null;
  for (const days of Object.values(t.bySpot)) {
    if (!isObject(days)) return null;
    for (const day of Object.values(days)) {
      if (!isObject(day) || !validEvents(day.highs) || !validEvents(day.lows)) return null;
    }
  }
  return t;
}
