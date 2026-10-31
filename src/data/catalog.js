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

export const bundledCatalog = {
  meta: { notice: META_NOTICE, sections, banners },
  element: { notice: ELEMENT_NOTICE, elements, counters },
  qibo: { notice: QIBO_NOTICE, filters: qiboFilters, items: qibos },
  character: { notice: CHARACTER_NOTICE, filters: characterFilters, items: characters },
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
