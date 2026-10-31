'use strict';

// Kept in sync with src/config/cloud.js + src/services/content.js by scripts/check.mjs.
const CATALOG_TYPES = Object.freeze([
  'meta', 'element', 'qibo', 'character',
  // P0 图鉴（2026-10-29）：通用条目 schema
  'spirit', 'item', 'equipment', 'material', 'food', 'fishing',
  'enemy', 'dungeon', 'building', 'achievement', 'region',
  // P0 信息查询：战斗词条
  'affix'
]);
const MANIFEST_ID = 'published';
const SCHEMA_VERSION = 'qbxzs-catalog/v1';
const SNAPSHOT_SCHEMA_VERSION = 'qbxzs-catalog-snapshot/v1';

const COLLECTIONS = Object.freeze({
  manifests: 'catalog_manifests',
  snapshots: 'catalog_snapshots'
});

const LIMITS = Object.freeze({
  notice: 200,
  id: 40,
  name: 30,
  text: 120,
  longText: 800,
  fields: 16,
  sections: 6,
  items: 300,
  payloadBytes: 512 * 1024
});

module.exports = { CATALOG_TYPES, COLLECTIONS, LIMITS, MANIFEST_ID, SCHEMA_VERSION, SNAPSHOT_SCHEMA_VERSION };
