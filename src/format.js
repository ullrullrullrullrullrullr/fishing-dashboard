const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function weatherText(code) {
  if (typeof code !== 'number' || !Number.isFinite(code)) return '-';
  if (code === 0) return '快晴';
  if (code <= 2) return '晴れ';
  if (code === 3) return 'くもり';
  if (code === 45 || code === 48) return '霧';
  if (code >= 51 && code <= 57) return '霧雨';
  if (code >= 61 && code <= 67) return '雨';
  if (code >= 71 && code <= 77) return '雪';
  if (code >= 80 && code <= 82) return 'にわか雨';
  if (code === 85 || code === 86) return 'にわか雪';
  if (code >= 95 && code <= 99) return '雷雨';
  return 'その他';
}

const DIRS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];

export function windDirText(deg) {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return '-';
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export const fmtNum = (v, digits = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '-';
