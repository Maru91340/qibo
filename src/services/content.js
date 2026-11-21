import { callCloudFunction } from './cloud.js';
import { CATALOG_FUNCTIONS } from '../config/cloud.js';
import { applyStation2Overlay, bundledCatalog, CATALOG_VERSION } from '../data/catalog.js';
import { officialItems } from '../utils/catalog-view.js';

export const CATALOG_TYPES = [
  'meta', 'element', 'qibo', 'character',
  'spirit', 'item', 'equipment', 'material', 'food', 'fishing', 'enemy',
  'dungeon', 'building', 'achievement', 'region', 'affix', 'guide', 'book'
];
const CACHE_KEY = 'qbxzs:catalog-cache';
const UPDATE_EVENT = 'catalog:updated';

function readCache() {
  const cached = uni.getStorageSync(CACHE_KEY);
  if (!cached || typeof cached !== 'object' || !cached.types) return null;
  return cached;
}

function entry(type) {
  const cache = readCache();
  return cache && cache.types[type] ? cache.types[type] : null;
}

export function getCatalog(type) {
  // 内置资料升级后自动丢弃过期云端缓存（否则旧缓存会一直压制新数据）
  if (uni.getStorageSync('qbxzs:cache-bv') !== CATALOG_VERSION) {
    clearCatalogCache();
    uni.setStorageSync('qbxzs:cache-bv', CATALOG_VERSION);
  }
  const stored = entry(type);
  const content = stored ? stored.content : bundledCatalog[type];
  const normalized = type === 'character' && content ? {
    ...content,
    notice: '角色资料以游戏实际内容为准。',
    items: officialItems(content.items).filter((item) => item.id !== 'char-starborn-female' && item.id !== 'char-starborn-male')
  } : content;
  const data = applyStation2Overlay(type, normalized);
  return {
    data,
    source: stored ? 'cloud' : 'bundled',
    revision: stored ? stored.revision : 'builtin'
  };
}

export function catalogNotice() {
  const cache = readCache();
  const synced = cache ? Object.keys(cache.types).length : 0;
  if (!synced) return '当前为内置资料，云端尚未同步';
  return `云端资料已同步 ${synced} 类 · ${new Date(cache.fetchedAt).toLocaleDateString()}`;
}

export async function prefetchCatalog(options = {}) {
  const silent = Boolean(options.silent);
  try {
    const cache = readCache();
    const manifest = await callCloudFunction(CATALOG_FUNCTIONS.read, {
      action: 'manifest',
      revision: cache ? cache.revision : ''
    });
    if (!manifest) return { updated: false, reason: '云端暂无已发布内容' };
    if (manifest.notModified) return { updated: false, revision: manifest.revision };

    const next = { revision: manifest.revision, fetchedAt: Date.now(), types: { ...(cache ? cache.types : {}) } };
    const changed = CATALOG_TYPES.filter((type) => {
      const remote = manifest.types ? manifest.types[type] : null;
      return remote && remote.revision && (!next.types[type] || next.types[type].revision !== remote.revision);
    });
    for (const type of changed) {
      const payload = await callCloudFunction(CATALOG_FUNCTIONS.read, { action: 'content', type });
      if (payload && payload.content) {
        next.types[type] = { revision: manifest.types[type].revision, content: payload.content };
      }
    }
    uni.setStorageSync(CACHE_KEY, next);
    if (changed.length) uni.$emit(UPDATE_EVENT, { types: changed, revision: next.revision });
    return { updated: Boolean(changed.length), types: changed, revision: next.revision };
  } catch (error) {
    if (!silent) console.warn(`[catalog] ${error.message}`);
    return { updated: false, error: error.message };
  }
}

export function clearCatalogCache() {
  uni.removeStorageSync(CACHE_KEY);
}

export function onCatalogUpdate(handler) {
  uni.$on(UPDATE_EVENT, handler);
  return () => uni.$off(UPDATE_EVENT, handler);
}
