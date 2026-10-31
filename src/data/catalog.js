import { META_NOTICE, sections, banners } from './meta.js';
import { ELEMENT_NOTICE, elements, counters } from './element.js';
import { QIBO_NOTICE, qibos, qiboFilters } from './qibo.js';
import { CHARACTER_NOTICE, characters, characterFilters } from './character.js';
import { enemyCatalog, dungeonCatalog, regionCatalog, affixCatalog, fishingCatalog } from './manual-catalogs.js';
import generated from './generated/catalogs.json';

export const CATALOG_VERSION = `builtin-${generated.generatedAt || '1'}`;

const EMPTY = { notice: '该图鉴暂无条目，等待采集任务补充。', items: [] };

function collected(type) {
  const payload = generated.types && generated.types[type];
  return payload && payload.items && payload.items.length ? payload : null;
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
function mapWikiQibo(payload) {
  if (!payload) return [];
  return payload.items.map((item) => ({
    id: item.id,
    name: item.name,
    element: wikiEle(item.tags),
    kind: 'BWIKI收录',
    usage: ['战斗'],
    rarity: (item.rarity || '未知').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星') || '未知',
    habitat: '详见 BWIKI',
    stages: ['一阶', '二阶', '三阶'],
    forms: [],
    verified: true,
    desc: item.desc || item.summary || '',
    skills: item.skills || [],
    icon: item.icon || ''
  }));
}

function mapWikiChar(payload) {
  if (!payload) return [];
  return payload.items.map((item) => ({
    id: item.id,
    name: item.name,
    title: 'BWIKI收录',
    element: wikiEle(item.tags),
    role: mapRole(item.role),
    rarity: (item.rarity || '未知').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星') || '未知',
    desc: item.desc || item.summary || '',
    skills: item.skills || [],
    teams: [],
    verified: true,
    icon: item.icon || ''
  }));
}

function mergeByName(primary, secondary) {
  const seen = new Set(primary.items.map((item) => item.name));
  const extra = secondary.items.filter((item) => !seen.has(item.name));
  return { notice: primary.notice, items: primary.items.concat(extra) };
}

const itemPayload = collected('item');
const materialPayload = collected('material') ||
  (itemPayload
    ? { notice: itemPayload.notice, items: itemPayload.items.filter((item) => /材料|素材/.test(item.category)) }
    : EMPTY);

const fishingPayload = collected('fishing') ? mergeByName(collected('fishing'), fishingCatalog) : fishingCatalog;
const wikiQiboItems = mapWikiQibo(collected('qiboWiki'));
const wikiCharItems = mapWikiChar(collected('charWiki'));

export const bundledCatalog = {
  meta: { notice: META_NOTICE, sections, banners },
  element: { notice: ELEMENT_NOTICE, elements, counters },
  qibo: {
    notice: `示例条目 7 只 + BWIKI 真实收录 ${wikiQiboItems.length} 只；公测后以官方图鉴替换。`,
    filters: qiboFilters,
    items: wikiQiboItems.concat(qibos)
  },
  character: {
    notice: `示例条目 + BWIKI 真实收录 ${wikiCharItems.length} 名；公测后以官方图鉴替换。`,
    filters: characterFilters,
    items: wikiCharItems.concat(characters)
  },
  guide: collected('guideWiki') || { notice: '攻略一图流待采集。', items: [] },
  spirit: collected('spirit') || EMPTY,
  item: itemPayload || EMPTY,
  equipment: collected('equipment') || EMPTY,
  material: materialPayload,
  food: collected('food') || EMPTY,
  fishing: fishingPayload,
  enemy: enemyCatalog,
  dungeon: dungeonCatalog,
  building: collected('building') || EMPTY,
  achievement: collected('achievement') || EMPTY,
  region: regionCatalog,
  affix: affixCatalog
};
