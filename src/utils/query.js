const includesKeyword = (item, fields, kw) =>
  fields
    .map((field) => {
      const value = item[field];
      return Array.isArray(value) ? value.join(' ') : value;
    })
    .join(' ')
    .toLowerCase()
    .indexOf(kw) >= 0;

export function decorateWithElement(item, elementMap) {
  const element = elementMap[item.element] || {};
  return Object.assign({}, item, {
    elementName: element.name || '—',
    elementColor: element.color || '#5a6480',
    elementTint: element.tint || '#f2f4f9',
    elementLabel: element.label || '未知'
  });
}

export function filterQibos(items, options = {}) {
  const kw = String(options.keyword || '').trim().toLowerCase();
  return (items || []).filter((item) => {
    if (options.kind && options.kind !== '全部' && item.kind !== options.kind) return false;
    if (options.element && options.element !== 'all' && item.element !== options.element) return false;
    if (options.rarity && options.rarity !== '全部' && item.rarity !== options.rarity) return false;
    if (options.usage && options.usage !== '全部' && (item.usage || []).indexOf(options.usage) < 0) return false;
    if (kw && !includesKeyword(item, ['name', 'desc', 'habitat', 'kind', 'rarity', 'usage', 'skills'], kw)) return false;
    return true;
  });
}

export function filterCharacters(items, options = {}) {
  const kw = String(options.keyword || '').trim().toLowerCase();
  return (items || []).filter((item) => {
    if (options.role && options.role !== '全部' && item.role !== options.role) return false;
    if (options.element && options.element !== 'all' && item.element !== options.element) return false;
    if (options.rarity && options.rarity !== '全部' && item.rarity !== options.rarity) return false;
    if (kw && !includesKeyword(item, ['name', 'title', 'desc', 'role', 'rarity', 'teams'], kw)) return false;
    return true;
  });
}

export function findById(items, id) {
  return (items || []).filter((item) => item.id === id)[0] || null;
}

// 通用图鉴在全局搜索中的注册表：label 用于结果分组，detailPath 为详情路由。
export const SEARCHABLE_CATALOGS = [
  { type: 'spirit', label: '灵子', detailPath: '/pages/spirit/detail' },
  { type: 'item', label: '物品', detailPath: '/pages/item/detail' },
  { type: 'equipment', label: '装备', detailPath: '/pages/equipment/detail' },
  { type: 'material', label: '材料', detailPath: '/pages/material/detail' },
  { type: 'food', label: '美食', detailPath: '/pages/food/detail' },
  { type: 'fishing', label: '钓鱼', detailPath: '/pages/fishing/detail' },
  { type: 'enemy', label: '敌人', detailPath: '/pages/enemy/detail' },
  { type: 'dungeon', label: '副本', detailPath: '/pages/dungeon/detail' },
  { type: 'building', label: '建筑', detailPath: '/pages/building/detail' },
  { type: 'achievement', label: '成就', detailPath: '' },
  { type: 'region', label: '地区', detailPath: '/pages/region/detail' },
  { type: 'affix', label: '战斗词条', detailPath: '' }
];

function searchGeneric(items, kw) {
  return (items || []).filter((item) => includesKeyword(item, ['name', 'summary', 'desc', 'category', 'rarity'], kw)
    || (item.tags || []).join(' ').toLowerCase().indexOf(kw) >= 0);
}

export function searchAll(source, keyword) {
  const kw = String(keyword || '').trim().toLowerCase();
  if (!kw) return { groups: [], total: 0 };
  const characters = filterCharacters(source.characters, { keyword: kw });
  const qibos = filterQibos(source.qibos, { keyword: kw });
  const sections = (source.sections || []).filter((item) => includesKeyword(item, ['title', 'desc'], kw));
  const groups = [];
  if (characters.length) {
    groups.push({
      title: '角色',
      items: characters.map((item) => ({
        id: item.id,
        name: item.name,
        desc: `${item.title} · ${item.role}`,
        icon: 'usergroup',
        path: `/pages/character/detail?id=${item.id}`
      }))
    });
  }
  if (qibos.length) {
    groups.push({
      title: '奇波',
      items: qibos.map((item) => ({
        id: item.id,
        name: item.name,
        desc: `${item.kind} · ${item.habitat}`,
        icon: 'smile',
        path: `/pages/qibo/detail?id=${item.id}`
      }))
    });
  }
  // 跨图鉴去重：材料/钓鱼等派生类型与物品原始条目同 id，只保留首次出现的分组
  const seenIds = new Set();
  (source.catalogs || []).forEach((catalog) => {
    const hits = searchGeneric(catalog.items, kw)
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .slice(0, 20);
    if (!hits.length) return;
    groups.push({
      title: catalog.label,
      items: hits.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.summary || item.category || '图鉴条目',
        icon: 'bookmark',
        path: catalog.detailPath ? `${catalog.detailPath}?id=${item.id}` : ''
      })).filter((entry) => entry.path)
    });
  });
  if (sections.length) {
    groups.push({
      title: '板块',
      items: sections.map((item) => ({ id: item.key, name: item.title, desc: item.desc, icon: item.icon, path: item.path }))
    });
  }
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return { groups, total };
}
