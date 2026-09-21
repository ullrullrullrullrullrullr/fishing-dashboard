import { createStore } from './store.js';
import { createSpotList } from './spots.js';
import { createChecklist } from './checklist.js';
import { fetchWeather } from './weather.js';
import { fetchTide, mergeTide } from './tide.js';
import { planRefresh, createRefreshRunner } from './refresh-plan.js';
import { validWeather, validTide } from './validate.js';
import { todayJst } from './dates.js';
import { buildView } from './view-model.js';
import { renderApp } from './ui.js';

const store = createStore();
const spotList = createSpotList(store);
const checklist = createChecklist(store);

const state = {
  tab: 'forecast',
  dateOffset: 0,
  weather: validWeather(store.load('weather')),
  tide: validTide(store.load('tide')),
  loading: false,
  weatherError: null,
  tideError: null,
  spotMessage: null,
  lastAttemptAt: null,
};

const root = document.getElementById('app');

function describeError(err) {
  return err?.name === 'AbortError' ? '通信がタイムアウトしました' : '取得に失敗しました';
}

function draw() {
  const now = Date.now();
  const spot = spotList.selected();
  const view = buildView({
    weather: state.weather, tide: state.tide, spot, dateOffset: state.dateOffset, now, loading: state.loading,
  });
  root.innerHTML = renderApp({
    view, spot, spots: spotList.list(), tab: state.tab, dateOffset: state.dateOffset,
    today: todayJst(now), checklist: checklist.items(),
    status: {
      loading: state.loading, weatherError: state.weatherError,
      tideError: state.tideError, spotMessage: state.spotMessage,
    },
  });
}

// 描画で例外が出たら、保存データの形が壊れているとみなして捨て、取り直せる状態で描き直す。
function render() {
  try {
    draw();
    return;
  } catch {
    state.weather = null;
    state.tide = null;
    store.save('weather', null);
    store.save('tide', null);
  }
  try {
    draw();
  } catch {
    root.textContent = '表示できませんでした。ページを開き直してください。';
  }
}

// 釣り場タブでは名前の入力欄を消さないよう、取得の開始・終了では描き直さない
const renderUnlessTyping = () => { if (state.tab !== 'spots') render(); };

async function refreshOnce({ force = false, auto = false } = {}) {
  const now = Date.now();
  const spots = spotList.list();
  const { needWeather, needTide } = planRefresh(state, spots, now, { force, auto });
  if (!needWeather && !needTide) return;

  state.loading = true;
  state.lastAttemptAt = now;
  renderUnlessTyping();
  try {
    const jobs = [];
    if (needWeather) {
      jobs.push(
        fetchWeather(spots)
          .then((w) => { state.weather = w; state.weatherError = null; store.save('weather', w); })
          .catch((err) => { state.weatherError = describeError(err); }),
      );
    }
    if (needTide) {
      jobs.push(
        fetchTide(spots, todayJst(now))
          .then((t) => {
            state.tide = mergeTide(state.tide, t);
            state.tideError = t.failed.length > 0 ? '一部の港の潮汐を取得できませんでした' : null;
            store.save('tide', state.tide);
          })
          .catch((err) => { state.tideError = describeError(err); }),
      );
    }
    await Promise.all(jobs);
  } finally {
    state.loading = false;
    renderUnlessTyping();
  }
}

// 取得は1つずつ。実行中に「更新」を頼まれたら、終わったあとにもう一度走る
const refresh = createRefreshRunner(refreshOnce);

function addSpotHere() {
  const name = document.getElementById('spot-name')?.value ?? '';
  if (!navigator.geolocation) {
    state.spotMessage = 'この端末では位置情報を使えません';
    return render();
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const r = spotList.add({ name, lat: pos.coords.latitude, lon: pos.coords.longitude });
      state.spotMessage = r.ok ? null : r.error;
      if (r.ok) { spotList.select(r.spot.id); state.tab = 'forecast'; }
      render();
      if (r.ok) refresh({ force: true });
    },
    () => { state.spotMessage = '位置を取得できませんでした。位置情報の許可を確認してください'; render(); },
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

root.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, id, offset, tab } = el.dataset;
  switch (action) {
    case 'select-spot': spotList.select(id); break;
    case 'select-day': state.dateOffset = Number(offset); break;
    case 'tab': state.tab = tab; state.spotMessage = null; break;
    case 'refresh': refresh({ force: true }); return;
    case 'toggle-check': checklist.toggle(id); break;
    case 'reset-checklist': checklist.reset(); break;
    case 'remove-spot': spotList.remove(id); break;
    case 'add-spot-here': addSpotHere(); return;
    default: return;
  }
  render();
});

function onResume() {
  render();
  refresh();
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onResume(); });
window.addEventListener('pageshow', onResume);
setInterval(() => {
  if (state.tab === 'forecast' && !state.loading) render();
  refresh({ auto: true }); // 必要なときだけ取得する(何も要らなければ何もしない)
}, 60 * 1000);

render();
refresh();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
