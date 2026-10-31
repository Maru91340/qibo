import { callCloudFunction } from './cloud.js';
import { CATALOG_FUNCTIONS } from '../config/cloud.js';
import { bundledCatalog } from '../data/catalog.js';

export const CATALOG_TYPES = [
  'meta', 'element', 'qibo', 'character',
  'spirit', 'item', 'equipment', 'material', 'food', 'fishing', 'enemy',
  'dungeon', 'building', 'achievement', 'region', 'affix', 'guide'
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
  const stored = entry(type);
  return {
    data: stored ? stored.content : bundledCatalog[type],
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
