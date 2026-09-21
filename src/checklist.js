export const DEFAULT_ITEMS = [
  { id: 'lifejacket', label: 'ライフジャケット' },
  { id: 'ice', label: '氷・クーラーボックス' },
  { id: 'drink', label: '飲み物・食べ物' },
  { id: 'weather', label: '防寒着・雨具・帽子' },
  { id: 'gloves', label: '手袋・タオル' },
  { id: 'tackle', label: '竿・仕掛け・エサ' },
  { id: 'tools', label: 'ハサミ・プライヤー' },
  { id: 'phone', label: '携帯電話(充電)' },
  { id: 'trash', label: 'ゴミ袋' },
];

export function createChecklist(store) {
  const saved = store.load('checklist');
  const checked = saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {};
  const persist = () => store.save('checklist', checked);
  return {
    items: () => DEFAULT_ITEMS.map((i) => ({ ...i, checked: checked[i.id] === true })),
    toggle(id) {
      if (!DEFAULT_ITEMS.some((i) => i.id === id)) return false;
      if (checked[id]) delete checked[id];
      else checked[id] = true;
      persist();
      return true;
    },
    reset() {
      for (const k of Object.keys(checked)) delete checked[k];
      persist();
    },
  };
}
