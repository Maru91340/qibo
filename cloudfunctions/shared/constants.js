'use strict';

// Kept in sync with src/config/cloud.js + src/services/content.js by scripts/check.mjs.
const CATALOG_TYPES = Object.freeze([
  'meta', 'element', 'qibo', 'character',
  // P0 图鉴（2026-10-29）：通用条目 schema
  'spirit', 'item', 'equipment', 'material', 'food', 'fishing',
  'enemy', 'dungeon', 'building', 'achievement', 'region',
  // P0 信息查询：战斗词条
  'affix',
  // P1 玩法指南：BWIKI 攻略一图流
  'guide',
  // P1-1 改造：BWIKI 书籍 → 阅读物（2026-11-04）
  'book'
]);
const MANIFEST_ID = 'published';
const SCHEMA_VERSION = 'qbxzs-catalog/v1';
const SNAPSHOT_SCHEMA_VERSION = 'qbxzs-catalog-snapshot/v1';

const COLLECTIONS = Object.freeze({
  manifests: 'catalog_manifests',
  snapshots: 'catalog_snapshots',
  manifestHistory: 'catalog_manifest_history',
  publishAudits: 'catalog_publish_audits'
});

const LIMITS = Object.freeze({
  notice: 200,
  id: 40,
  name: 30,
  text: 120,
  longText: 800,
  fields: 16,
  sections: 6,
  // 2026-11-04：物品扩采到 900（BWIKI 共 1115 条），同步上调单类上限；
  // 900 条 ≈ 500KB，payloadBytes 放宽到 1.5MB（TCB 单文档 16MB，安全）。
  items: 900,
  payloadBytes: 1536 * 1024
});

module.exports = { CATALOG_TYPES, COLLECTIONS, LIMITS, MANIFEST_ID, SCHEMA_VERSION, SNAPSHOT_SCHEMA_VERSION };
