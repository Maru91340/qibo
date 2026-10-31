'use strict';

const crypto = require('crypto');
const { CATALOG_TYPES, LIMITS, SCHEMA_VERSION, SNAPSHOT_SCHEMA_VERSION } = require('./constants');

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const PATH_PATTERN = /^\/pages\/[^\s]+$/;

function invalid(message, field) {
  const error = new Error(message);
  error.code = 'INVALID_CONTENT';
  error.details = field ? [field] : [];
  throw error;
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value, max, field, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) invalid(`${field} is required`, field);
    return '';
  }
  if (typeof value !== 'string') invalid(`${field} must be a string`, field);
  const trimmed = value.trim();
  if (trimmed.length > max) invalid(`${field} exceeds ${max} characters`, field);
  return trimmed;
}

function color(value, field) {
  const raw = text(value, 9, field);
  if (!COLOR_PATTERN.test(raw)) invalid(`${field} must be a #rrggbb hex color`, field);
  return raw.toLowerCase();
}

function listOf(value, field) {
  if (!Array.isArray(value)) invalid(`${field} must be an array`, field);
  if (value.length > LIMITS.items) invalid(`${field} exceeds ${LIMITS.items} entries`, field);
  return value;
}

function stringList(value, field, { max = 12, itemMax = 20 } = {}) {
  const items = listOf(value, field);
  if (items.length > max) invalid(`${field} exceeds ${max} entries`, field);
  return items.map((item, index) => text(item, itemMax, `${field}[${index}]`));
}

function uniqueIds(items, field, label = 'id') {
  const seen = new Set();
  items.forEach((item) => {
    const value = label === 'id' ? item.id : item[label];
    if (seen.has(value)) invalid(`${field} contains duplicate ${label} "${value}"`, `${field}.${label}`);
    seen.add(value);
  });
  return seen;
}

function checkElementKeys(referenced, elementKeys, field) {
  if (!elementKeys) return;
  referenced.forEach((key) => {
    if (!elementKeys.has(key)) invalid(`${field} references unknown element "${key}"`, `${field}.element`);
  });
}

function normalizeMeta(payload) {
  const sections = listOf(payload.sections, 'sections').map((item, index) => {
    const field = `sections[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    return {
      key: text(item.key, LIMITS.id, `${field}.key`).toLowerCase(),
      title: text(item.title, 20, `${field}.title`),
      desc: text(item.desc, LIMITS.text, `${field}.desc`),
      icon: text(item.icon, 40, `${field}.icon`),
      path: text(item.path, 120, `${field}.path`),
      accent: color(item.accent, `${field}.accent`)
    };
  });
  if (!sections.length) invalid('meta needs at least one section', 'sections');
  sections.forEach((section) => {
    if (!PATH_PATTERN.test(section.path)) invalid(`sections path "${section.path}" must start with /pages/`, 'sections.path');
  });
  const banners = listOf(payload.banners || [], 'banners').map((item, index) => {
    const field = `banners[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    return {
      id: text(item.id, LIMITS.id, `${field}.id`).toLowerCase(),
      tag: text(item.tag, 12, `${field}.tag`),
      title: text(item.title, 30, `${field}.title`),
      desc: text(item.desc, LIMITS.text, `${field}.desc`),
      path: text(item.path, 120, `${field}.path`)
    };
  });
  banners.forEach((banner) => {
    if (!PATH_PATTERN.test(banner.path)) invalid(`banners path "${banner.path}" must start with /pages/`, 'banners.path');
  });
  return { notice: text(payload.notice, LIMITS.notice, 'notice', { required: false }), sections, banners };
}

function normalizeElement(payload) {
  const elements = listOf(payload.elements, 'elements').map((item, index) => {
    const field = `elements[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    return {
      key: text(item.key, LIMITS.id, `${field}.key`).toLowerCase(),
      name: text(item.name, 4, `${field}.name`),
      label: text(item.label, 12, `${field}.label`),
      color: color(item.color, `${field}.color`),
      tint: color(item.tint, `${field}.tint`)
    };
  });
  if (elements.length < 2) invalid('element needs at least two elements', 'elements');
  const keys = uniqueIds(elements, 'elements', 'key');
  const table = isObject(payload.counters) ? payload.counters : invalid('counters must be an object', 'counters');
  const counters = {};
  keys.forEach((key) => {
    counters[key] = stringList(table[key] || [], `counters.${key}`, { max: keys.size, itemMax: LIMITS.id }).map((item) => {
      if (!keys.has(item)) invalid(`counters.${key} targets unknown element "${item}"`, `counters.${key}`);
      return item;
    });
  });
  Object.keys(table).forEach((key) => {
    if (!keys.has(key)) invalid(`counters has unknown source element "${key}"`, `counters.${key}`);
  });
  return { notice: text(payload.notice, LIMITS.notice, 'notice', { required: false }), elements, counters };
}

function normalizeFilters(filters, shape, items) {
  const result = {};
  shape.forEach((entry) => {
    const values = stringList(filters[entry.key], `filters.${entry.key}`, { max: 24, itemMax: 20 });
    if (values[0] !== '全部') invalid(`filters.${entry.key} must start with 全部`, `filters.${entry.key}`);
    if (new Set(values).size !== values.length) invalid(`filters.${entry.key} has duplicate options`, `filters.${entry.key}`);
    const used = new Set();
    items.forEach((item) => {
      const raw = item[entry.field];
      (Array.isArray(raw) ? raw : [raw]).forEach((value) => used.add(value));
    });
    values.slice(1).forEach((value) => {
      if (!used.has(value)) invalid(`filters.${entry.key} offers unused option "${value}"`, `filters.${entry.key}`);
    });
    used.forEach((value) => {
      if (values.indexOf(value) < 0) invalid(`items use "${value}" but filters.${entry.key} does not offer it`, `filters.${entry.key}`);
    });
    result[entry.key] = values;
  });
  return result;
}

function normalizeQibo(payload, context) {
  const items = listOf(payload.items, 'items').map((item, index) => {
    const field = `items[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    return {
      id: text(item.id, LIMITS.id, `${field}.id`).toLowerCase(),
      name: text(item.name, LIMITS.name, `${field}.name`),
      element: text(item.element, LIMITS.id, `${field}.element`).toLowerCase(),
      kind: text(item.kind, 20, `${field}.kind`),
      rarity: text(item.rarity, 20, `${field}.rarity`),
      habitat: text(item.habitat, 30, `${field}.habitat`),
      desc: text(item.desc, LIMITS.text, `${field}.desc`),
      icon: text(item.icon || '', 200, `${field}.icon`, { required: false }),
      usage: stringList(item.usage, `${field}.usage`, { max: 8, itemMax: 20 }),
      stages: stringList(item.stages, `${field}.stages`, { max: 8, itemMax: 20 }),
      forms: stringList(item.forms || [], `${field}.forms`, { max: 8, itemMax: 20 }),
      skills: stringList(item.skills, `${field}.skills`, { max: 12, itemMax: 40 }),
      verified: item.verified === true
    };
  });
  if (!items.length) invalid('qibo needs at least one item', 'items');
  uniqueIds(items, 'items');
  checkElementKeys(items.map((item) => item.element), context.elementKeys, 'items');
  items.forEach((item) => {
    if (!item.stages.length) invalid(`items[${item.id}].stages must not be empty`, 'items.stages');
  });
  return {
    notice: text(payload.notice, LIMITS.notice, 'notice', { required: false }),
    filters: normalizeFilters(isObject(payload.filters) ? payload.filters : {}, [
      { key: 'kinds', field: 'kind' },
      { key: 'usages', field: 'usage' },
      { key: 'rarities', field: 'rarity' }
    ], items),
    items
  };
}

function normalizeCharacter(payload, context) {
  const items = listOf(payload.items, 'items').map((item, index) => {
    const field = `items[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    return {
      id: text(item.id, LIMITS.id, `${field}.id`).toLowerCase(),
      name: text(item.name, LIMITS.name, `${field}.name`),
      title: text(item.title, 20, `${field}.title`),
      element: text(item.element, LIMITS.id, `${field}.element`).toLowerCase(),
      role: text(item.role, 20, `${field}.role`),
      rarity: text(item.rarity, 20, `${field}.rarity`),
      desc: text(item.desc, LIMITS.text, `${field}.desc`),
      icon: text(item.icon || '', 200, `${field}.icon`, { required: false }),
      teams: stringList(item.teams || [], `${field}.teams`, { max: 8, itemMax: 20 }),
      skills: listOf(item.skills, `${field}.skills`).map((skill, skillIndex) => {
        const skillField = `${field}.skills[${skillIndex}]`;
        if (!isObject(skill)) invalid(`${skillField} must be an object`, skillField);
        return {
          name: text(skill.name, 20, `${skillField}.name`),
          type: text(skill.type, 20, `${skillField}.type`),
          desc: text(skill.desc, LIMITS.text, `${skillField}.desc`)
        };
      }),
      verified: item.verified === true
    };
  });
  if (!items.length) invalid('character needs at least one item', 'items');
  uniqueIds(items, 'items');
  checkElementKeys(items.map((item) => item.element), context.elementKeys, 'items');
  return {
    notice: text(payload.notice, LIMITS.notice, 'notice', { required: false }),
    filters: normalizeFilters(isObject(payload.filters) ? payload.filters : {}, [
      { key: 'roles', field: 'role' },
      { key: 'rarities', field: 'rarity' }
    ], items),
    items
  };
}

// 通用图鉴条目：P0 的 11 类图鉴 + 战斗词条共用一套字段，
// 让采集、校验、列表/详情组件只需维护一份结构。
function normalizeEntries(payload) {
  const items = listOf(payload.items, 'items').map((item, index) => {
    const field = `items[${index}]`;
    if (!isObject(item)) invalid(`${field} must be an object`, field);
    const fields = listOf(item.fields || [], `${field}.fields`).map((row, rowIndex) => {
      const rowField = `${field}.fields[${rowIndex}]`;
      if (!isObject(row)) invalid(`${rowField} must be an object`, rowField);
      return {
        label: text(row.label, 12, `${rowField}.label`),
        value: text(row.value, 120, `${rowField}.value`)
      };
    });
    if (fields.length > LIMITS.fields) invalid(`${field}.fields exceeds ${LIMITS.fields} entries`, `${field}.fields`);
    const sections = listOf(item.sections || [], `${field}.sections`).map((row, rowIndex) => {
      const rowField = `${field}.sections[${rowIndex}]`;
      if (!isObject(row)) invalid(`${rowField} must be an object`, rowField);
      return {
        title: text(row.title, 16, `${rowField}.title`),
        text: text(row.text, LIMITS.longText, `${rowField}.text`)
      };
    });
    if (sections.length > LIMITS.sections) invalid(`${field}.sections exceeds ${LIMITS.sections} entries`, `${field}.sections`);
    return {
      id: text(item.id, LIMITS.id, `${field}.id`).toLowerCase(),
      name: text(item.name, LIMITS.name, `${field}.name`),
      category: text(item.category, 20, `${field}.category`),
      rarity: text(item.rarity, 20, `${field}.rarity`, { required: false }),
      tags: stringList(item.tags || [], `${field}.tags`, { max: 10, itemMax: 20 }),
      summary: text(item.summary, LIMITS.text, `${field}.summary`),
      desc: text(item.desc, LIMITS.longText, `${field}.desc`, { required: false }),
      fields,
      sections,
      verified: item.verified === true
    };
  });
  if (!items.length) invalid('catalog needs at least one item', 'items');
  uniqueIds(items, 'items');
  return {
    notice: text(payload.notice, LIMITS.notice, 'notice', { required: false }),
    items
  };
}

const ENTRY_TYPES = ['spirit', 'item', 'equipment', 'material', 'food', 'fishing', 'enemy', 'dungeon', 'building', 'achievement', 'region', 'affix', 'guide'];

const NORMALIZERS = {
  meta: (payload) => normalizeMeta(payload),
  element: (payload) => normalizeElement(payload),
  qibo: (payload, context) => normalizeQibo(payload, context),
  character: (payload, context) => normalizeCharacter(payload, context),
  ...Object.fromEntries(ENTRY_TYPES.map((type) => [type, (payload) => normalizeEntries(payload)]))
};

function countOf(type, payload) {
  if (type === 'meta') return payload.sections.length;
  if (type === 'element') return payload.elements.length;
  return payload.items.length;
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function normalizeContent(type, raw, context = {}) {
  if (!CATALOG_TYPES.includes(type)) invalid(`unsupported catalog type "${type}"`, 'type');
  if (!isObject(raw)) invalid(`${type} payload must be an object`, type);
  if (Buffer.byteLength(JSON.stringify(raw)) > LIMITS.payloadBytes) invalid(`${type} payload exceeds ${LIMITS.payloadBytes} bytes`, type);
  const payload = NORMALIZERS[type](raw, { elementKeys: context.elementKeys || null });
  return { type, payload, count: countOf(type, payload), sha256: hashPayload(payload) };
}

function elementKeySet(elementPayload) {
  if (!elementPayload || !Array.isArray(elementPayload.elements)) return null;
  return new Set(elementPayload.elements.map((item) => item.key));
}

function snapshotId(type, sha256) {
  return `${type}-${sha256.slice(0, 16)}`;
}

function makeSnapshot(type, normalized, meta = {}) {
  return {
    _id: snapshotId(type, normalized.sha256),
    schema: SNAPSHOT_SCHEMA_VERSION,
    type,
    status: 'published',
    sha256: normalized.sha256,
    count: normalized.count,
    payload: normalized.payload,
    source: text(meta.source, 120, 'source', { required: false }) || 'manual',
    runId: text(meta.runId, 60, 'runId', { required: false }),
    updatedAt: meta.updatedAt || new Date().toISOString()
  };
}

function versionOf(content) {
  const joined = CATALOG_TYPES.map((type) => `${type}:${content[type].sha256}`).join('|');
  return hashPayload({ joined }).slice(0, 16);
}

function makeManifest(existing, snapshots, meta = {}) {
  const content = {};
  const base = existing && existing.content ? existing.content : {};
  CATALOG_TYPES.forEach((type) => {
    if (snapshots[type]) {
      content[type] = { sha256: snapshots[type].sha256, count: snapshots[type].count, snapshotId: snapshots[type]._id };
    } else if (base[type]) {
      content[type] = base[type];
    }
  });
  const missing = CATALOG_TYPES.filter((type) => !content[type]);
  if (missing.length) invalid(`catalog is incomplete, missing ${missing.join(', ')}`, 'content');
  const publishedAt = meta.publishedAt || new Date().toISOString();
  return {
    _id: meta.manifestId,
    schema: SCHEMA_VERSION,
    version: versionOf(content),
    publishedAt,
    runId: text(meta.runId, 60, 'runId', { required: false }),
    content
  };
}

function clientManifest(manifest) {
  const types = {};
  CATALOG_TYPES.forEach((type) => {
    const pointer = manifest.content[type];
    if (pointer) types[type] = { revision: pointer.sha256, count: pointer.count };
  });
  return { revision: manifest.version, publishedAt: manifest.publishedAt, types };
}

module.exports = {
  clientManifest,
  elementKeySet,
  hashPayload,
  invalid,
  makeManifest,
  makeSnapshot,
  normalizeContent,
  snapshotId,
  versionOf
};
