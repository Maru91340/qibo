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

// BWIKI 真实条目（中文元素名 → 元素 key）
const ELE_KEY = { 火: 'flame', 焰: 'flame', 水: 'flow', 流: 'flow', 冰: 'frost', 霜: 'frost', 雷: 'bolt', 电: 'bolt', 木: 'grove', 草: 'grove', 地: 'grove', 林: 'grove', 光: 'astral', 星: 'astral', 辉: 'astral', 风: 'bolt' };
function wikiEle(tags) {
  for (const tag of tags || []) {
    if (ELE_KEY[tag]) return ELE_KEY[tag];
    for (const ch of tag) if (ELE_KEY[ch]) return ELE_KEY[ch];
  }
  return 'astral';
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
    skills: [],
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
    role: '待核实',
    rarity: (item.rarity || '未知').replace('5星', '五星').replace('4星', '四星').replace('3星', '三星') || '未知',
    desc: item.desc || item.summary || '',
    skills: [],
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
