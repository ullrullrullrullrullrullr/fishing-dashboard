const PREFIX = 'fishing-dashboard:';
const SCHEMA = 1;

export function createStore(getStorage = () => globalThis.localStorage) {
  const storage = () => {
    try {
      return getStorage() ?? null;
    } catch {
      return null;
    }
  };
  return {
    load(key) {
      try {
        const s = storage();
        if (!s) return null;
        const raw = s.getItem(PREFIX + key);
        if (raw == null) return null;
        const obj = JSON.parse(raw);
        if (!obj || obj.v !== SCHEMA || !('data' in obj)) return null;
        return obj.data;
      } catch {
        return null;
      }
    },
    save(key, data) {
      try {
        const s = storage();
        if (!s) return false;
        s.setItem(PREFIX + key, JSON.stringify({ v: SCHEMA, data }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
