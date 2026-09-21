import { escapeHtml as e, weatherText, windDirText, fmtNum } from './format.js';
import { LEVEL_LABEL, hourOf } from './judge.js';
import { dayLabel, formatMonthDay, formatClock, addDays } from './dates.js';
import { JMA_WARNING_URL, SAFETY_NOTES, ATTRIBUTION } from './config.js';
import { gaugeModel, hourStrip } from './gauges.js';
import { FISH_CARDS, REFERENCE_LINKS, imageSearchUrl } from './fish-cards.js';

const TABLE_HOURS = [4, 6, 8, 10, 12, 14, 16, 18];
const levelLabel = (level) => LEVEL_LABEL[level] ?? LEVEL_LABEL.unknown;
const levelClass = (level) => (LEVEL_LABEL[level] ? level : 'unknown');

export function renderHeadline(view) {
  const h = view.headline;
  const when = h.label ? `${dayLabel(view.dateOffset)}の${h.label}` : dayLabel(view.dateOffset);
  return `<section class="headline level-${levelClass(h.level)}" aria-live="polite">
<p class="headline-when">${e(when)}</p>
<p class="headline-label">${e(levelLabel(h.level))}</p>
<ul class="reasons">${h.reasons.map((r) => `<li>${e(r)}</li>`).join('')}</ul>
<p class="safety">${SAFETY_NOTES.map(e).join('<br>')}</p>
</section>`;
}

export function renderStatus(view, status = {}) {
  const parts = [];
  if (view.fetchedAt) {
    // 更新中でも取得時刻と古さの警告は出し続け、「更新中…」は追記する
    let text = `${formatClock(view.fetchedAt)}に取得`;
    if (view.freshness === 'stale') text += '(古いデータです)';
    if (view.freshness === 'expired') text += '(古すぎて判定できません)';
    parts.push(`<span class="${view.freshness === 'fresh' ? '' : 'warn'}">${e(text)}</span>`);
    if (status.loading) parts.push('<span>更新中…</span>');
  } else if (status.loading) parts.push('<span>更新中…</span>');
  else parts.push('<span class="warn">データがありません</span>');
  parts.push('<button type="button" class="small" data-action="refresh">更新</button>');
  const errors = [];
  if (status.weatherError) errors.push(`天気・波: ${status.weatherError}${view.fetchedAt ? '(前回のデータを表示しています)' : ''}`);
  if (status.tideError) errors.push(`潮汐: ${status.tideError}`);
  return `<div class="status">${parts.join('')}</div>${errors.map((m) => `<p class="error">${e(m)}</p>`).join('')}`;
}

export function renderSpotTabs(spots, selectedId) {
  return `<nav class="chips" aria-label="釣り場">${spots
    .map(
      (s) =>
        `<button type="button" class="chip" data-action="select-spot" data-id="${e(s.id)}" aria-pressed="${s.id === selectedId}">${e(s.name)}</button>`,
    )
    .join('')}</nav>`;
}

export function renderDayTabs(today, dateOffset) {
  return `<nav class="chips" aria-label="日付">${[0, 1, 2]
    .map(
      (i) =>
        `<button type="button" class="chip" data-action="select-day" data-offset="${i}" aria-pressed="${i === dateOffset}">${e(dayLabel(i))} ${e(formatMonthDay(addDays(today, i)))}</button>`,
    )
    .join('')}</nav>`;
}

export function renderPeriods(periods) {
  return `<div class="periods">${periods
    .map(
      (p) =>
        `<div class="period level-${levelClass(p.level)}"><h3>${e(p.label)}</h3><p>${e(levelLabel(p.level))}</p></div>`,
    )
    .join('')}</div>`;
}

function renderGauge(m) {
  const segs =
    m.zone === 'unknown'
      ? '<span class="seg seg-unknown" style="width:100%"></span>'
      : `<span class="seg seg-good" style="width:${m.cautionPct}%"></span><span class="seg seg-caution" style="width:${m.stopPct - m.cautionPct}%"></span><span class="seg seg-stop" style="width:${100 - m.stopPct}%"></span>`;
  const marker = m.zone === 'unknown' ? '' : `<span class="marker" style="left:${m.pct}%"></span>`;
  const now = m.zone === 'unknown' ? '' : ` aria-valuenow="${Math.min(Number(m.value), m.max)}"`;
  return `<div class="gauge gauge-zone-${levelClass(m.zone)}" role="meter" aria-label="${e(m.label)}" aria-valuemin="0" aria-valuemax="${m.max}"${now} aria-valuetext="${e(m.text)}">
<p class="gauge-text"><span class="gauge-label">${e(m.label)}</span> <span class="gauge-value">${m.zone === 'unknown' ? '-' : `${e(m.display)}${e(m.unit)} ${e(m.icon)} ${e(m.word)}`}</span></p>
<div class="bar">${segs}${marker}</div>
<div class="ticks"><span class="tick" style="left:${m.cautionPct}%">${Number(m.cautionValue)}</span><span class="tick" style="left:${m.stopPct}%">${Number(m.stopValue)}</span></div>
</div>`;
}

export function renderGauges(view) {
  const h = view.headline;
  const when = h.label ? `${dayLabel(view.dateOffset)}の${h.label}` : dayLabel(view.dateOffset);
  const metrics = view.metrics ?? {};
  return `<section class="card gauges" aria-label="風・突風・波">
<p class="muted gauges-caption">${e(when)}の最大値(波は沖の予報値)</p>
${['wind', 'gust', 'wave'].map((k) => renderGauge(gaugeModel(k, metrics[k]))).join('\n')}
</section>`;
}

export function renderHourStrip(dayHours) {
  const cells = hourStrip(dayHours)
    .map((c) => {
      const lvl = levelClass(c.level);
      const wind = c.dir === null ? '' : `${windDirText(c.dir)}の風`;
      const arrow =
        c.dir === null
          ? '<span class="arrow"></span>'
          : `<span class="arrow" aria-hidden="true" title="${e(wind)}" style="transform:rotate(${Math.round(c.dir + 180)}deg)">↑</span>`;
      const label = `${c.hour}時 ${levelLabel(lvl)}${wind ? ` ${wind}` : ''}`;
      return `<div class="cell level-${lvl}" role="img" aria-label="${e(label)}"><span class="icon">${e(c.icon)}</span><span class="hour">${c.hour}</span>${arrow}</div>`;
    })
    .join('');
  return `<section class="card"><h2>時間ごとの状態</h2>
<div class="strip" role="group" aria-label="時間ごとの状態">${cells}</div>
<p class="legend muted"><span>✓ 穏やか</span><span>▲ 注意</span><span>✕ やめた方がいい</span><span>? 不明</span><span>矢印は風の吹く向き</span></p></section>`;
}

export function renderHourly(dayHours) {
  const rows = dayHours.filter((h) => TABLE_HOURS.includes(hourOf(h.time)));
  if (rows.length === 0) return '<p class="muted">この日の時間別データはありません。</p>';
  return `<table class="hourly"><tr><th>時</th><th>天気</th><th>風(突風)</th><th>波</th></tr>${rows
    .map(
      (h) =>
        `<tr><th>${hourOf(h.time)}</th><td>${e(weatherText(h.weatherCode))} ${e(fmtNum(h.temp, 0))}℃</td><td>${e(windDirText(h.windDir))} ${e(fmtNum(h.windSpeed))}<small>(${e(fmtNum(h.windGust, 0))})</small>m/s</td><td>${e(fmtNum(h.waveHeight))}m<small>${e(fmtNum(h.wavePeriod, 0))}秒</small></td></tr>`,
    )
    .join('')}</table>`;
}

export function renderTide(view, spot) {
  const t = view.tideDay;
  const lines = [];
  if (!t && spot && spot.tide === null) lines.push('<p class="muted">近くに港がないため潮汐は表示しません。</p>');
  else if (!t) lines.push('<p class="muted">潮汐データを取得できませんでした。</p>');
  else {
    const list = (xs) => (xs.length ? xs.map((x) => `${x.time}(${x.cm}cm)`).join(' / ') : '-');
    lines.push(`<p>満潮 ${e(list(t.highs))}</p><p>干潮 ${e(list(t.lows))}</p>`);
    lines.push(`<p>潮名 ${e(t.tideName ?? '-')} / 月齢 ${e(fmtNum(t.moonAge))}</p>`);
  }
  if (view.sun) lines.push(`<p>日の出 ${e(view.sun.sunrise)} / 日の入り ${e(view.sun.sunset)}</p>`);
  const sea = view.dayHours.find((h) => hourOf(h.time) === 12 && Number.isFinite(h.seaTemp));
  if (sea) lines.push(`<p>水温 ${e(fmtNum(sea.seaTemp))}℃(沖の予報値)</p>`);
  lines.push('<p class="muted">日本海側は潮の差が小さいので、判定には使っていません。</p>');
  return `<section class="card"><h2>潮・日の出</h2>${lines.join('')}</section>`;
}

export function renderLinks(spot) {
  const maps = `https://maps.apple.com/?ll=${encodeURIComponent(`${spot.lat},${spot.lon}`)}&q=${encodeURIComponent(spot.name)}`;
  return `<section class="card links"><a class="button" href="${e(maps)}" target="_blank" rel="noopener">地図で開く(${e(spot.name)})</a>
<a class="button" href="${e(JMA_WARNING_URL)}" target="_blank" rel="noopener">気象庁の警報・注意報(鶴岡市)</a></section>`;
}

export function renderSpotsTab(spots, message) {
  return `<section class="card"><h2>釣り場</h2><ul class="list">${spots
    .map(
      (s) =>
        `<li><span>${e(s.name)}</span><button type="button" class="small danger" data-action="remove-spot" data-id="${e(s.id)}">削除</button></li>`,
    )
    .join('')}</ul></section>
<section class="card"><h2>釣り場を追加</h2>
<label for="spot-name">名前</label><input id="spot-name" type="text" maxlength="20" placeholder="例: ○○堤防" autocomplete="off">
<button type="button" class="button" data-action="add-spot-here">いまいる場所で追加</button>
<p class="muted">釣り場に着いてから押すと、いまの位置が登録されます。潮は近くの港(60km以内)のものを使います。</p>
${message ? `<p class="error">${e(message)}</p>` : ''}</section>`;
}

export function renderChecklistTab(items) {
  return `<section class="card"><h2>持ち物チェック</h2><ul class="list">${items
    .map(
      (i) =>
        `<li><button type="button" class="check" data-action="toggle-check" data-id="${e(i.id)}" aria-pressed="${i.checked}">${i.checked ? '✓' : '○'} ${e(i.label)}</button></li>`,
    )
    .join('')}</ul><button type="button" class="small" data-action="reset-checklist">すべて外す</button></section>`;
}

export function renderFishTab() {
  return `<section class="card"><h2>危険な魚・食べるときの注意</h2>
<p class="muted">一般的な情報です。必ず公的資料で確認してください(要確認)。</p>
${FISH_CARDS.map(
    (c) => `<details class="fish"><summary>${e(c.name)} <small>${e(c.kind)}</small></summary>
<p><strong>危険:</strong> ${e(c.danger)}</p><p><strong>気をつけること:</strong> ${e(c.avoid)}</p><p><strong>そうなったら:</strong> ${e(c.ifHurt)}</p>
<p><a href="${e(imageSearchUrl(c.name))}" target="_blank" rel="noopener">写真を探す</a></p></details>`,
  ).join('')}
<p>${REFERENCE_LINKS.map((l) => `<a href="${e(l.url)}" target="_blank" rel="noopener">${e(l.label)}</a>`).join('<br>')}</p></section>`;
}

const TABS = [
  ['forecast', '予報'],
  ['spots', '釣り場'],
  ['checklist', '持ち物'],
  ['fish', '魚'],
];

export function renderNav(tab) {
  return `<nav class="tabbar" aria-label="メニュー">${TABS.map(
    ([key, label]) =>
      `<button type="button" data-action="tab" data-tab="${key}"${key === tab ? ' aria-current="page"' : ''}>${e(label)}</button>`,
  ).join('')}</nav>`;
}

export function renderFooter() {
  return `<footer class="footer"><p>${e(ATTRIBUTION.weather)}</p><p>${e(ATTRIBUTION.tide)}</p><p>${e(ATTRIBUTION.waveNote)}</p></footer>`;
}

export function renderApp(model) {
  const { view, spot, spots, tab, dateOffset, today, checklist, status } = model;
  let body;
  if (tab === 'spots') body = renderSpotsTab(spots, status.spotMessage);
  else if (tab === 'checklist') body = renderChecklistTab(checklist);
  else if (tab === 'fish') body = renderFishTab();
  else {
    body = [
      renderStatus(view, status),
      renderSpotTabs(spots, spot.id),
      renderDayTabs(today, dateOffset),
      renderHeadline(view),
      renderPeriods(view.periods),
      renderGauges(view),
      renderHourStrip(view.stripHours ?? []),
      `<section class="card"><h2>時間ごと</h2>${renderHourly(view.dayHours)}</section>`,
      renderTide(view, spot),
      renderLinks(spot),
    ].join('\n');
  }
  return `<main>${body}${renderFooter()}</main>${renderNav(tab)}`;
}
