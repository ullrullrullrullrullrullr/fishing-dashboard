export const HARBORS = [
  { hc: 1, name: '鼠ヶ関', lat: 38.5667, lon: 139.55 },
  { hc: 2, name: '由良', lat: 38.7167, lon: 139.6833 },
  { hc: 3, name: '加茂', lat: 38.7667, lon: 139.7333 },
  { hc: 4, name: '酒田', lat: 38.9167, lon: 139.8333 },
];

export const DEFAULT_SPOTS = [
  { id: 'yura', name: '由良', lat: 38.7167, lon: 139.6833, tide: { pc: 6, hc: 2 } },
  { id: 'kamo', name: '加茂', lat: 38.7667, lon: 139.7333, tide: { pc: 6, hc: 3 } },
  { id: 'nezugaseki', name: '鼠ヶ関', lat: 38.5667, lon: 139.55, tide: { pc: 6, hc: 1 } },
];

const clone = (s) => ({ ...s, tide: s.tide ? { ...s.tide } : null });

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestHarbor(lat, lon, maxKm = 60) {
  let best = null;
  let bestKm = Infinity;
  for (const h of HARBORS) {
    const km = distanceKm(lat, lon, h.lat, h.lon);
    if (km < bestKm) {
      best = h;
      bestKm = km;
    }
  }
  return bestKm <= maxKm ? best : null;
}

export function validateSpotInput(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) return { ok: false, error: '釣り場の名前を入力してください' };
  if (name.length > 20) return { ok: false, error: '名前は20文字までです' };
  const { lat, lon } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 20 || lat > 46 || lon < 122 || lon > 154) {
    return { ok: false, error: '位置が日本の範囲にありません' };
  }
  return { ok: true, value: { name, lat, lon } };
}

const isValidSpot = (s) =>
  s &&
  typeof s.id === 'string' &&
  typeof s.name === 'string' &&
  Number.isFinite(s.lat) &&
  Number.isFinite(s.lon) &&
  (s.tide === null || (s.tide && Number.isFinite(s.tide.pc) && Number.isFinite(s.tide.hc)));

function normalize(saved) {
  const list = Array.isArray(saved?.list) ? saved.list.filter(isValidSpot).map(clone) : [];
  if (list.length === 0) return { list: DEFAULT_SPOTS.map(clone), selectedId: DEFAULT_SPOTS[0].id };
  const selectedId = list.some((s) => s.id === saved.selectedId) ? saved.selectedId : list[0].id;
  return { list, selectedId };
}

export function createSpotList(store) {
  const state = normalize(store.load('spots'));
  const persist = () => store.save('spots', state);
  return {
    list: () => state.list.map(clone),
    selected: () => clone(state.list.find((s) => s.id === state.selectedId)),
    select(id) {
      if (!state.list.some((s) => s.id === id)) return false;
      state.selectedId = id;
      persist();
      return true;
    },
    add(input, id = `custom-${Date.now()}`) {
      const v = validateSpotInput(input);
      if (!v.ok) return v;
      const harbor = nearestHarbor(v.value.lat, v.value.lon);
      const spot = { id, ...v.value, tide: harbor ? { pc: 6, hc: harbor.hc } : null, custom: true };
      state.list.push(spot);
      persist();
      return { ok: true, spot: clone(spot) };
    },
    remove(id) {
      if (state.list.length <= 1 || !state.list.some((s) => s.id === id)) return false;
      state.list = state.list.filter((s) => s.id !== id);
      if (state.selectedId === id) state.selectedId = state.list[0].id;
      persist();
      return true;
    },
  };
}
