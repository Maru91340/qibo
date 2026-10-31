export const ELEMENT_NOTICE = '克制关系为社区整理，公测实装数值以官方公告为准。';

export const elements = [
  { key: 'flame', name: '焰', label: '烈焰', color: '#ff7a45', tint: '#fff1ea' },
  { key: 'flow', name: '流', label: '流水', color: '#2f9bff', tint: '#eaf4ff' },
  { key: 'grove', name: '林', label: '苍林', color: '#28b37a', tint: '#e9f8f1' },
  { key: 'bolt', name: '雷', label: '惊雷', color: '#f2b50c', tint: '#fff7e0' },
  { key: 'frost', name: '霜', label: '寒霜', color: '#4fd2e8', tint: '#e8fbff' },
  { key: 'astral', name: '辉', label: '星辉', color: '#8a6cff', tint: '#f0ecff' },
  // BWIKI 后期元素（地/暗/风）暂无克制数据，先归入未知系，公测后补表
  { key: 'unknown', name: '?', label: '未知', color: '#8a93a8', tint: '#f2f4f9' }
];

export const counters = {
  flame: ['grove'],
  grove: ['flow'],
  flow: ['flame'],
  bolt: ['flow'],
  frost: ['bolt'],
  astral: ['frost', 'flame']
};

export const STRONG_RATIO = 1.5;
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
