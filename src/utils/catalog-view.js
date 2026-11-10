// 3.3 / L05：视图层「正式列表」口径。
// src/data/catalog.js 及其数据依赖会被 scripts/bundle-catalog.mjs 打包成云端 seed；
// 在数据层剔除示例会改变 seed revision，而 CATALOG_VERSION 仍由 generatedAt 决定不会变，
// 会进一步加剧阶段 1 已查明的「版本键相同、内容不同」问题（待确认 #20）。
// 因此本轮只在视图层统一过滤演示条目与同名重复，不改数据层、不改 seed、不改缓存版本。

// 演示条目 id：与 src/data/qibo.js 的 qibos、src/data/character.js 的 characters 一一对应。
// 这两处 NOTICE 已声明为「示例条目 / 公开前瞻演示」，不属于 BWIKI 正式收录；
// 竞品补充条目（qi-manual-* / char-starborn-*）有实机来源，需保留。
const DEMO_IDS = new Set([
  'sencai-lingdie', 'yanbeishou', 'chaomingyao', 'leiwenyun',
  'shuangtilu', 'fengrongyang', 'huiguangdie',
  'ainisi', 'shiyi-luoluo', 'shiyi-kela', 'shiyi-ming', 'shiyi-xue', 'shiyi-mu'
]);

// 演示条目名称前缀兜底：后续新增的示例条目无需逐个补 id。
const DEMO_NAME_PREFIX = '示例·';

// 列表页统一来源说明：BWIKI 收录只证明来源存在，不等于官方核实；字段缺失在单项标「字段暂缺」。
export const LIST_SOURCE_NOTE = '资料来自 BWIKI 玩家 Wiki 收录 · 收录不等于官方核实 · 公测前字段可能变动，缺项标「字段暂缺」';

export function isDemoEntry(item) {
  if (!item) return false;
  return DEMO_IDS.has(item.id) || String(item.name || '').startsWith(DEMO_NAME_PREFIX);
}

// 正式列表：剔除演示条目，并按名称去重（先出现的 BWIKI 真实条目优先）。
// 同名重复（如手工「艾妮丝」与 BWIKI 收录条目）只保留首次出现的一条。
export function officialItems(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (isDemoEntry(item)) return false;
    const name = String(item.name || '').trim();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

// 3.3 / L05：剔除演示条目后，静态筛选配置里有些取值已无任何条目（如「副C」「收藏型」），
// 另一些真实取值（如 BWIKI 的「五星」）又没写进静态配置。按正式列表实际取值收敛：
// 保留仍命中的配置值，补上数据里真实存在但配置遗漏的值。仅视图层生效，不动 seed。
export function liveFacetOptions(items, field, configured) {
  const values = new Set();
  (items || []).forEach((item) => {
    const raw = item[field];
    (Array.isArray(raw) ? raw : [raw]).forEach((value) => { if (value) values.add(value); });
  });
  const base = (configured || ['全部']).filter((value) => value === '全部' || values.has(value));
  const extra = [...values].filter((value) => base.indexOf(value) < 0 && value !== '全部');
  return base.concat(extra);
}
