export const ELEMENT_NOTICE = '克制关系与倍率来自 BWIKI 官方数据页（克制 +25% / 被克 -25%，光暗互克）；公测实装以官方公告为准。';

// BWIKI 九系元素（火 风 地 木 冰 水 雷 光 暗）；unknown 兜底
export const elements = [
  { key: 'flame', name: '火', label: '烈焰', color: '#ff7a45', tint: '#fff1ea' },
  { key: 'wind', name: '风', label: '疾风', color: '#52c7b8', tint: '#e8faf7' },
  { key: 'earth', name: '地', label: '厚土', color: '#a0714f', tint: '#f6efe7' },
  { key: 'grove', name: '木', label: '苍林', color: '#28b37a', tint: '#e9f8f1' },
  { key: 'frost', name: '冰', label: '寒霜', color: '#4fd2e8', tint: '#e8fbff' },
  { key: 'flow', name: '水', label: '流水', color: '#2f9bff', tint: '#eaf4ff' },
  { key: 'bolt', name: '雷', label: '惊雷', color: '#f2b50c', tint: '#fff7e0' },
  { key: 'astral', name: '光', label: '光', color: '#8a6cff', tint: '#f0ecff' },
  { key: 'dark', name: '暗', label: '暗', color: '#6c5ce7', tint: '#eeebfb' },
  { key: 'unknown', name: '?', label: '未知', color: '#8a93a8', tint: '#f2f4f9' }
];

// BWIKI 官方克制矩阵（攻击→受击，1.25 克制 / 0.75 被克）
export const counters = {
  flame: ['earth', 'flow'],
  wind: ['earth', 'bolt'],
  earth: ['wind', 'flow'],
  grove: ['flame', 'flow'],
  frost: ['flame', 'wind'],
  flow: ['grove', 'frost'],
  bolt: ['wind', 'earth'],
  astral: ['dark'],
  dark: ['astral']
};

export const STRONG_RATIO = 1.25;
export const WEAK_RATIO = 0.75;

export function createElementToolkit(source) {
  const list = (source && source.elements) || elements;
  const table = (source && source.counters) || counters;
  const map = list.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});
  const counteredBy = list.reduce((acc, defender) => {
    acc[defender.key] = list
      .filter((attacker) => (table[attacker.key] || []).indexOf(defender.key) >= 0)
      .map((attacker) => attacker.key);
    return acc;
  }, {});

  function relation(attacker, defender) {
    if (!attacker || !defender) return { key: 'neutral', label: '中立', ratio: 1 };
    if (attacker === defender) return { key: 'self', label: '自身', ratio: 1 };
    if ((table[attacker] || []).indexOf(defender) >= 0) return { key: 'strong', label: '克制', ratio: STRONG_RATIO };
    if ((table[defender] || []).indexOf(attacker) >= 0) return { key: 'weak', label: '被克', ratio: WEAK_RATIO };
    return { key: 'neutral', label: '中立', ratio: 1 };
  }

  function matrix() {
    return list.map((row) => ({
      key: row.key,
      name: row.name,
      label: row.label,
      color: row.color,
      cells: list.map((col) => Object.assign({}, relation(row.key, col.key), { id: `${row.key}-${col.key}` }))
    }));
  }

  return {
    elements: list,
    elementMap: map,
    counters: table,
    counteredBy,
    relation,
    matrix,
    notice: (source && source.notice) || ELEMENT_NOTICE
  };
}

// BWIKI 官方双属性克制表（攻击双元素 → 受击九系倍率；key 为两攻击系 key 排序拼接）
export const dualCounters = {
  'flame+wind': [1, 1, 1, 1, 0.5, 1.25, 1.25, 1, 1],
  'flame+earth': [0.75, 1.25, 1.25, 0.75, 0.75, 1.5, 0.75, 1, 1],
  'flame+grove': [1.25, 0.75, 1.25, 0.75, 1, 1, 1, 1, 1],
  'flame+frost': [1.25, 1.25, 1.25, 0.5, 0.75, 1.25, 0.75, 1, 1],
  'flame+flow': [0.75, 1, 1, 1, 0.75, 1.25, 1.25, 1, 1],
  'flame+bolt': [1, 0.75, 1.5, 0.75, 1, 1, 1, 1, 1],
  'flame+astral': [1, 1, 1.25, 0.75, 0.75, 1.25, 1, 1, 1.25],
  'flame+dark': [1, 1, 1.25, 0.75, 0.75, 1.25, 1, 1.25, 1],
  'wind+earth': [0.75, 1.25, 0.75, 1.25, 0.75, 1.25, 1, 1, 1],
  'wind+grove': [1.25, 0.75, 0.75, 1.25, 1, 0.75, 1.25, 1, 1],
  'wind+frost': [1.25, 1.25, 0.75, 1, 0.75, 1, 1, 1, 1],
  'wind+flow': [0.75, 1, 0.5, 1.5, 0.75, 1, 1.5, 1, 1],
  'wind+bolt': [1, 0.75, 1, 1.25, 1, 0.75, 1.25, 1, 1],
  'wind+astral': [1, 1, 0.75, 1.25, 0.75, 1, 1.25, 1, 1.25],
  'wind+dark': [1, 1, 0.75, 1.25, 0.75, 1, 1.25, 1.25, 1],
  'earth+grove': [1, 1, 1, 1, 1.25, 1, 0.75, 1, 1],
  'earth+frost': [1, 1.5, 1, 0.75, 1, 1.25, 0.5, 1, 1],
  'earth+flow': [0.5, 1.25, 0.75, 1.25, 1, 1.25, 1, 1, 1],
  'earth+bolt': [0.75, 1, 1.25, 1, 1.25, 1, 0.75, 1, 1],
  'earth+astral': [0.75, 1.25, 1, 1, 1, 1.25, 0.75, 1, 1.25],
  'earth+dark': [0.75, 1.25, 1, 1, 1, 1.25, 0.75, 1.25, 1],
  'grove+frost': [1.5, 1, 1, 0.75, 1.25, 0.75, 0.75, 1, 1],
  'grove+flow': [1, 0.75, 0.75, 1.25, 1.25, 0.75, 1.25, 1, 1],
  'grove+bolt': [1.25, 0.5, 1.25, 1, 1.5, 0.5, 1, 1, 1],
  'grove+astral': [1.25, 0.75, 1, 1, 1.25, 0.75, 1, 1, 1.25],
  'grove+dark': [1.25, 0.75, 1, 1, 1.25, 0.75, 1, 1.25, 1],
  'frost+flow': [1, 1.25, 0.75, 1, 1, 1, 1, 1, 1],
  'frost+bolt': [1.25, 1, 1.25, 0.75, 1.25, 0.75, 0.75, 1, 1],
  'frost+astral': [1.25, 1.25, 1, 0.75, 1, 1, 0.75, 1, 1.25],
  'frost+dark': [1.25, 1.25, 1, 0.75, 1, 1, 0.75, 1.25, 1],
  'flow+bolt': [0.75, 0.75, 1, 1.25, 1.25, 0.75, 1.25, 1, 1],
  'flow+astral': [0.75, 1, 0.75, 1.25, 1, 1, 1.25, 1, 1.25],
  'flow+dark': [0.75, 1, 0.75, 1.25, 1, 1, 1.25, 1.25, 1],
  'bolt+astral': [1, 0.75, 1.25, 1, 1.25, 0.75, 1, 1, 1.25],
  'bolt+dark': [1, 0.75, 1.25, 1, 1.25, 0.75, 1, 1.25, 1],
  'astral+dark': [1, 1, 1, 1, 1, 1, 1, 1.25, 1.25]
};
