import { META_NOTICE, sections, banners } from './meta.js';
import { ELEMENT_NOTICE, elements, counters } from './element.js';
import { QIBO_NOTICE, qibos, qiboFilters } from './qibo.js';
import { CHARACTER_NOTICE, characters, characterFilters } from './character.js';
import { enemyCatalog, dungeonCatalog, regionCatalog, affixCatalog, fishingCatalog, characterSupplement, qiboSupplement } from './manual-catalogs.js';
// P1-0：源码引用全量图鉴；小程序/H5 构建时由 vite 插件替换为离线回退子集
// （catalogs-bundled.json，见 vite.config.js），云端种子导出走 esbuild 携带全量。
import generated from './generated/catalogs.json';
import station2 from './generated/station2-qibo-character.json';

// 分类逻辑版本：映射表/归一规则变更时递增。客户端 getCatalog 用它判定云缓存新旧——
// 只跟数据文件时间戳走的话，catalog.js 逻辑升级（如 R3-10、分类映射）不会被旧缓存感知。
const CATALOG_LOGIC_VERSION = 'v2-20261120';
export const CATALOG_VERSION = `builtin-${CATALOG_LOGIC_VERSION}-${generated.generatedAt || '1'}`;

// —— P2：物品两级分类（对齐 BWIKI 物品导航与竞品种类筛选）——
// 大组（kind）= BWIKI 四大组；子类（category，归一首段）→ 大组的映射表。
// BWIKI 原始 category 本是多标签语义（「材料、食用作物」），归一后保留 categories 数组供任一命中筛选。
const ITEM_KIND_ORDER = ['探索', '养成', '家园', '其他'];
const ITEM_KIND_COLORS = { 探索: '#2f9bff', 养成: '#ff8a3d', 家园: '#28b37a', 其他: '#8a93a8' };
const ITEM_KIND_MAP = {
  // 探索：工具 / 消耗 / 钓鱼 / 道具 / 货币礼包
  料理: '探索', 药剂: '探索', 体力药水: '探索', 星结卡: '探索', 抽卡券: '探索', 绿票: '探索',
  探索工具: '探索', 建造工具: '探索', 采集工具: '探索', 斧头: '探索',
  鱼竿: '探索', 鱼饵: '探索',
  鞍具: '探索', 贝壳: '探索',
  货币: '探索', 礼包: '探索',
  // 养成：角色 / 奇波 / 灵子 / 装备
  角色经验: '养成', 星赐: '养成', 牵绊礼物: '养成', 心愿家具: '养成', 睡衣: '养成', 纪念品: '养成', 临阶材料: '养成',
  奇波回响: '养成', 奇波成长道具: '养成', 奇波果实: '养成', 奇波源脉果: '养成', 奇波经验书: '养成',
  灵子经验: '养成', 定弦: '养成', 随机灵子道具: '养成',
  装备材料: '养成',
  // 家园：作物 / 材料
  种子: '家园', 家园作物: '家园', 作物: '家园', 料理材料: '家园', 工艺品: '家园',
  // 其他
  任务: '其他', 材料: '其他', 其他: '其他'
};
// 类别 → 大组；未入映射表的新类别自动落「其他」
function itemKindOf(category) {
  return ITEM_KIND_MAP[String(category || '').trim()] || '其他';
}

const EMPTY = { notice: '该图鉴暂无条目，等待采集任务补充。', items: [] };
const BWIKI_IMG_BASE = 'https://patchwiki.biligame.com/images/ap/';

function collected(type) {
  const payload = generated.types && generated.types[type];
  if (!payload || !payload.items || !payload.items.length) return null;
  // R3-3：内置子集的 icon 为紧凑相对路径（slimBundled 剥离域名省包体），此处统一还原为完整热链；
  // 全量/云端数据的 icon 本就是完整 URL，前缀判断保证幂等。
  const items = payload.items.map((item) =>
    typeof item.icon === 'string' && item.icon && !item.icon.startsWith('http')
      ? { ...item, icon: BWIKI_IMG_BASE + item.icon }
      : item
  );
  return { notice: payload.notice, items };
}

// BWIKI 战斗定位 → 现有筛选词
function mapRole(raw) {
  const r = String(raw || '');
  if (!r || r === '待核实') return '待核实';
  if (/输出/.test(r)) return '输出';
  if (/减益|增益|辅助|治疗|护盾/.test(r)) return '辅助';
  if (/控制/.test(r)) return '控制';
  if (/坦克|防御|生存/.test(r)) return '坦克';
  if (/调谐/.test(r)) return '辅助';
  return '待核实';
}

// 从 BWIKI 描述尾段「获取：xxx,yyy」解析获取途径（竞品材料详情有对应区块）
function parseObtain(desc) {
  const text = String(desc || '');
  const parts = text.split('；');
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i].trim();
    if (/^获取[:：]/.test(seg)) {
      return seg.replace(/^获取[:：]/, '').split(/[，,]/).map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

function withLinks(payload) {
  if (!payload || !payload.items) return payload;
  return {
    notice: payload.notice,
    items: payload.items.map((item) => {
      const obtainedFrom = parseObtain(item.desc);
      // 用途角标（对齐竞品：养成=养成类材料；可刷=获取途径含可重复场景）
      const usage = [];
      if (/星赐|材料|定弦|突破/.test(item.category || '') || /星赐|突破|印突/.test(item.desc || '')) usage.push('养成');
      if (obtainedFrom.some((way) => /副本|委托|家园|商店|采集|劳务|合成/.test(way))) usage.push('可刷');
      return { ...item, obtainedFrom, usage };
    })
  };
}

// BWIKI 真实条目（中文元素名 → 元素 key）
const ELE_KEY = { 火: 'flame', 焰: 'flame', 水: 'flow', 流: 'flow', 冰: 'frost', 霜: 'frost', 雷: 'bolt', 电: 'bolt', 木: 'grove', 草: 'grove', 地: 'earth', 林: 'grove', 光: 'astral', 星: 'astral', 辉: 'astral', 风: 'wind', 暗: 'dark' };
function wikiEle(tags) {
  for (const tag of tags || []) {
    if (ELE_KEY[tag]) return ELE_KEY[tag];
    for (const ch of tag) if (ELE_KEY[ch]) return ELE_KEY[ch];
  }
  return 'unknown';
}

// 真实奇波追加到示例数据后：206+ 条 BWIKI 收录
// R2-6 分级描述解压：{tpl:'…{}…', nums:[[级1数字…],…]} → levels:[{lv,desc}]
function decompressSkillLevels(skill) {
  if (!skill || !skill.lvls || !Array.isArray(skill.lvls.nums)) return skill;
  const { tpl, nums } = skill.lvls;
  const levels = nums.map((list, idx) => {
    let i = 0;
    const text = tpl.replace(/\{\}/g, () => (list && list[i] != null ? String(list[i++]) : ''));
    return { lv: idx + 1, desc: text };
  });
  const out = { name: skill.name, type: skill.type, desc: skill.desc };
  if (levels.length > 1) out.levels = levels;
  return out;
}

const station2Qibo = new Map((station2.qibo || []).map((item) => [item.name, item.fields || {}]));
const station2Character = new Map((station2.character || []).map((item) => [item.name.replace(/\s/g, ''), item.fields || {}]));
const STATION2_SOURCE = station2.source || 'BWIKI 站点2，采集 2026-11-17';
function fieldRows(fields, skip = []) {
  const omitted = new Set(skip);
  return Object.entries(fields || {}).filter(([label, value]) => !omitted.has(label) && value !== '' && value != null && !Array.isArray(value)).map(([label, value]) => ({ label, value }));
}
export function applyStation2Overlay(type, payload) {
  if (!payload || !Array.isArray(payload.items) || (type !== 'qibo' && type !== 'character')) return payload;
  if (type === 'qibo') {
    return { ...payload, notice: `${payload.notice || ''} · 字段补齐自 ${STATION2_SOURCE}`, items: payload.items.map((item) => {
      const raw = station2Qibo.get(item.name) || {};
      const hasRaw = Object.keys(raw).length > 0;
      const rawSkills = Array.isArray(raw['技能']) ? raw['技能'] : [];
      const tags = String(raw['元素'] || '').split(/[、,，]/).filter(Boolean);
      return { ...item,
        desc: raw['描述'] || item.desc,
        element: tags.length ? wikiEle(tags) : item.element,
        elements: tags.length ? [...new Set(tags.map((tag) => wikiEle([tag])).filter((key) => key !== 'unknown'))] : item.elements,
        fields: fieldRows(raw, ['元素', '描述', '技能', '特性']).length ? fieldRows(raw, ['元素', '描述', '技能', '特性']) : item.fields,
        skills: rawSkills.length ? rawSkills : item.skills,
        sections: raw['特性'] ? [{ title: '特性', text: raw['特性'] }] : item.sections,
        ...(hasRaw ? { dataSource: STATION2_SOURCE } : {}) };
    }) };
  }
  return { ...payload, notice: `${payload.notice || ''} · 字段补齐自 ${STATION2_SOURCE}`, items: payload.items.map((item) => {
    const raw = station2Character.get(item.name.replace(/\s/g, '')) || {};
    const hasRaw = Object.keys(raw).length > 0;
    const tags = String(raw['元素'] || '').split(/[、,，]/).filter(Boolean);
    return { ...item,
      rarity: (raw['稀有度'] || item.rarity || '').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星'),
      desc: raw['描述'] || raw['简介'] || item.desc,
      role: mapRole(raw['战斗定位'] || item.role),
      element: tags.length ? wikiEle(tags) : item.element,
      elements: tags.length ? [...new Set(tags.map((tag) => wikiEle([tag])).filter((key) => key !== 'unknown'))] : item.elements,
      weapon: raw['武器'] || item.weapon || '', camp: raw['阵营'] || item.camp || '', race: raw['种族'] || item.race || '',
      ...(hasRaw ? { station2Fields: raw, dataSource: STATION2_SOURCE } : {}) };
  }) };
}

function mapWikiQibo(payload) {
  if (!payload) return [];
  return payload.items.map((item) => ({
    id: item.id,
    name: item.name,
    element: wikiEle(item.tags),
    elements: [...new Set((item.tags || []).map((tag) => wikiEle([tag])).filter((key) => key !== 'unknown'))],
    kind: 'BWIKI收录',
    usage: ['战斗'],
    rarity: (item.rarity || '未知').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星') || '未知',
    habitat: '详见 BWIKI',
    stages: ['一阶', '二阶', '三阶'],
    forms: [],
    verified: true,
    desc: item.desc || item.summary || '',
    skills: (item.skills || []).map(decompressSkillLevels),
    icon: item.icon || '',
    fields: item.fields || [],
    sections: item.sections || []
  }));
}

function mapWikiChar(payload) {
  if (!payload) return [];
  return payload.items.map((item) => ({
    id: item.id,
    name: item.name,
    title: 'BWIKI收录',
    element: wikiEle(item.tags),
    elements: [...new Set((item.tags || []).map((tag) => wikiEle([tag])).filter((key) => key !== 'unknown'))],
    role: mapRole(item.role),
    rarity: (item.rarity || '未知').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星') || '未知',
    desc: item.desc || item.summary || '',
    skills: item.skills || [],
    teams: [],
    verified: true,
    icon: item.icon || '',
    weapon: item['武器'] || '',
    camp: item['阵营'] || '',
    race: item['种族'] || ''
  }));
}

function mergeByName(primary, secondary) {
  const seen = new Set(primary.items.map((item) => item.name));
  const extra = secondary.items.filter((item) => !seen.has(item.name));
  return { notice: primary.notice, items: primary.items.concat(extra) };
}

// R3-10：物品「种类」主类别归一（对齐竞品种类筛选）：BWIKI 类别为「A、B」组合值导致 facet 碎片化，
// 取首段为主类别；原始组合信息保留在 fields/desc。运行时派生，不改 generated 原始数据。
// P2 升级：组合值拆进 categories 数组（筛选任一命中），并派生大组 kind（探索/养成/家园/其他）。
function normalizeItemKind(payload) {
  if (!payload || !payload.items) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => {
      const category = String(item.category || '').split('、')[0] || item.category;
      const categories = String(item.category || '').split('、').map((part) => part.trim()).filter(Boolean);
      return {
        ...item,
        category,
        categories: categories.length ? categories : [category],
        kind: itemKindOf(category)
      };
    })
  };
}

const itemPayload = normalizeItemKind(collected('item'));
const materialPayload = collected('material') ||
  (itemPayload
    ? { notice: itemPayload.notice, items: itemPayload.items.filter((item) => /材料|素材/.test(item.category)) }
    : EMPTY);

// R3-9：钓鱼类别归并对齐竞品口径（鱼类 30 / 鱼竿 11 / 其他 20=钓点+事件+鱼饵）
// BWIKI 原始类别混杂（材料、鱼类/鱼类/鱼竿/鱼饵/钓点/钓鱼事件），归并后 facet 与图示分布一致
function normalizeFishing(payload) {
  if (!payload || !payload.items) return payload;
  const mapCategory = (raw) => {
    const cat = String(raw || '');
    if (cat === '鱼竿') return '鱼竿';
    if (cat === '鱼类' || cat === '材料、鱼类') return '鱼类';
    return '其他';
  };
  return {
    ...payload,
    items: payload.items.map((item) => ({ ...item, category: mapCategory(item.category) }))
  };
}

const fishingPayload = normalizeFishing(
  collected('fishing') ? mergeByName(collected('fishing'), fishingCatalog) : fishingCatalog
);
const wikiQiboItems = mapWikiQibo(collected('qiboWiki'));
const wikiCharItems = mapWikiChar(collected('charWiki'));

export const bundledCatalog = {
  meta: { notice: META_NOTICE, sections, banners },
  element: { notice: ELEMENT_NOTICE, elements, counters },
  qibo: {
    notice: `示例条目 7 只 + BWIKI 真实收录 ${wikiQiboItems.length} 只 + 补充 ${qiboSupplement.items.length} 只；公测后以官方图鉴替换。`,
    filters: qiboFilters,
    // R2-5：按名称去重（wiki 优先，supplement 为 BWIKI 索引未收录的特殊个体等手工条目兜底）
    items: (() => {
      const seen = new Set();
      return wikiQiboItems
        .concat(qibos, qiboSupplement.items)
        .filter((item) => {
          const name = item.name || '';
          if (!name || seen.has(name)) return false;
          seen.add(name);
          return true;
        });
    })()
  },
  character: {
    notice: `示例条目 + BWIKI 真实收录 ${wikiCharItems.length} 名 + 竞品补充 ${characterSupplement.items.length} 名；公测后以官方图鉴替换。`,
    filters: characterFilters,
    items: wikiCharItems.concat(characters, characterSupplement.items)
  },
  guide: collected('guideWiki') || { notice: '攻略一图流待采集。', items: [] },
  spirit: collected('spirit') || EMPTY,
  item: itemPayload ? withLinks(itemPayload) : EMPTY,
  equipment: collected('equipment') || EMPTY,
  material: materialPayload ? withLinks(materialPayload) : EMPTY,
  food: collected('food') || EMPTY,
  fishing: fishingPayload,
  enemy: enemyCatalog,
  dungeon: dungeonCatalog,
  building: collected('building') || EMPTY,
  achievement: collected('achievement') || EMPTY,
  book: collected('book') || EMPTY,
  region: regionCatalog,
  affix: affixCatalog
};

// P2：供 catalog-list 两级类别弹层使用（大组顺序/配色 + 子类→大组判定）
export const ITEM_KIND_META = { order: ITEM_KIND_ORDER, colors: ITEM_KIND_COLORS };
export { itemKindOf };
