import { needsRefresh } from './freshness.js';
import { tideNeedsFetch } from './tide.js';
import { todayJst } from './dates.js';

// タイマーによる自動の再取得は、直前の試行からこれだけあける(失敗続きで通信を連打しない)
export const AUTO_RETRY_MS = 5 * 60 * 1000;

// 何を取得し直す必要があるか。state = { weather, tide, lastAttemptAt? }
export function planRefresh(state, spots, now, { force = false, auto = false } = {}) {
  if (force) return { needWeather: true, needTide: true };
  if (auto && Number.isFinite(state.lastAttemptAt) && now - state.lastAttemptAt < AUTO_RETRY_MS) {
    return { needWeather: false, needTide: false };
  }
  const needWeather =
    !state.weather ||
    needsRefresh(state.weather.fetchedAt, now) ||
    spots.some((s) => !state.weather.bySpot[s.id]);
  const needTide = tideNeedsFetch(state.tide, spots, todayJst(now));
  return { needWeather, needTide };
}

// 取得の実行を1つずつにする。実行中に「強制更新」を頼まれたら、終わったあとにもう一度走る。
export function createRefreshRunner(task) {
  let running = false;
  let pendingForce = false;
  async function run(opts = {}) {
    if (running) {
      if (opts.force) pendingForce = true;
      return;
    }
    running = true;
    try {
      await task(opts);
    } finally {
      running = false;
    }
    if (pendingForce) {
      pendingForce = false;
      await run({ force: true });
    }
  }
  return run;
}
