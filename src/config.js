export const THRESHOLDS = {
  wind: { caution: 5, stop: 8 },
  gust: { caution: 10, stop: 15 },
  wave: { caution: 1, stop: 2 },
  swell: { minPeriod: 8, minWave: 0.8 },
  thunder: { from: 95, to: 99 },
};

export const PERIODS = [
  { key: 'morning', label: '朝', from: 4, to: 9 },
  { key: 'day', label: '日中', from: 9, to: 15 },
  { key: 'evening', label: '夕方', from: 15, to: 19 },
];

export const FRESHNESS = {
  refreshMs: 30 * 60 * 1000,
  staleMs: 3 * 60 * 60 * 1000,
  expiredMs: 12 * 60 * 60 * 1000,
};

export const FETCH_TIMEOUT_MS = 10000;

export const JMA_WARNING_URL =
  'https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=0620300&lang=ja';

export const SAFETY_NOTES = [
  '現地で波と風を見て判断してください。',
  'ライフジャケットを着用してください。',
];

export const ATTRIBUTION = {
  weather: '天気・波: Open-Meteo.com(CC BY 4.0)',
  tide: '潮汐・月齢: tide736.net',
  waveNote: '波は沖の予報値で、堤防際の波ではありません。',
  live: '実況: 気象庁アメダス / 国土交通省港湾局 NOWPHAS',
};
