const JST_MS = 9 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const parse = (dateStr) => dateStr.split('-').map(Number);

export const todayJst = (now = Date.now()) => new Date(now + JST_MS).toISOString().slice(0, 10);
export const hourJst = (now = Date.now()) => new Date(now + JST_MS).getUTCHours();

export function addDays(dateStr, n) {
  const [y, m, d] = parse(dateStr);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const dayLabel = (offset) => ['今日', '明日', 'あさって'][offset] ?? '';

export function formatMonthDay(dateStr) {
  const [y, m, d] = parse(dateStr);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${wd})`;
}

export function formatClock(ms) {
  const d = new Date(ms + JST_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
