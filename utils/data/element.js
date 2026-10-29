const ELEMENTS = [
  { key: 'flame', name: '焰', label: '烈焰', color: '#ff7a45', tint: '#fff1ea' },
  { key: 'flow', name: '流', label: '流水', color: '#2f9bff', tint: '#eaf4ff' },
  { key: 'grove', name: '林', label: '苍林', color: '#28b37a', tint: '#e9f8f1' },
  { key: 'bolt', name: '雷', label: '惊雷', color: '#f2b50c', tint: '#fff7e0' },
  { key: 'frost', name: '霜', label: '寒霜', color: '#4fd2e8', tint: '#e8fbff' },
  { key: 'astral', name: '辉', label: '星辉', color: '#8a6cff', tint: '#f0ecff' }
];

const COUNTERS = {
  flame: ['grove'],
  grove: ['flow'],
  flow: ['flame'],
  bolt: ['flow'],
  frost: ['bolt'],
  astral: ['frost', 'flame']
};

const elementMap = ELEMENTS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const counteredBy = ELEMENTS.reduce((acc, attacker) => {
  ELEMENTS.forEach((defender) => {
    if ((COUNTERS[attacker.key] || []).indexOf(defender.key) >= 0) {
      acc[defender.key] = acc[defender.key] || [];
      acc[defender.key].push(attacker.key);
    }
  });
  return acc;
}, {});

function relation(attacker, defender) {
  if (!attacker || !defender) return { key: 'neutral', label: '中立', ratio: 1 };
  if (attacker === defender) return { key: 'self', label: '自身', ratio: 1 };
  if ((COUNTERS[attacker] || []).indexOf(defender) >= 0) return { key: 'strong', label: '克制', ratio: 1.5 };
  if ((COUNTERS[defender] || []).indexOf(attacker) >= 0) return { key: 'weak', label: '被克', ratio: 0.75 };
  return { key: 'neutral', label: '中立', ratio: 1 };
}

function matrix() {
  return ELEMENTS.map((row) => ({
    key: row.key,
    name: row.name,
    label: row.label,
    color: row.color,
    cells: ELEMENTS.map((col) =>
      Object.assign({}, relation(row.key, col.key), { id: `${row.key}-${col.key}` })
    )
  }));
}

module.exports = {
  notice: '克制关系为社区整理，公测实装数值以官方公告为准。',
  elements: ELEMENTS,
  elementMap,
  counters: COUNTERS,
  counteredBy,
  relation,
  matrix
};
