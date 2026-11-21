'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { clientManifest, elementKeySet, makeManifest, makeSnapshot, normalizeContent } = require('../catalog-core');
const { CATALOG_TYPES, LIMITS, MANIFEST_ID } = require('../constants');

const validMeta = {
  notice: '数据以官方公告为准',
  sections: [
    { key: 'qibo', title: '奇波图鉴', desc: '分布与进化', icon: 'smile', path: '/pages/qibo/list', accent: '#2F6BFF' }
  ],
  banners: [{ id: 'release', tag: '版本', title: '公测定档', desc: '先看一步', path: '/pages/qibo/list' }]
};

const validElement = {
  elements: [
    { key: 'flame', name: '焰', label: '烈焰', color: '#ff7a45', tint: '#fff1ea' },
    { key: 'grove', name: '林', label: '苍林', color: '#28b37a', tint: '#e9f8f1' }
  ],
  counters: { flame: ['grove'], grove: [] }
};

const elementKeys = elementKeySet(validElement);

const validQibo = {
  filters: { kinds: ['全部', '收藏型'], usages: ['全部', '探索'], rarities: ['全部', '稀有'] },
  items: [
    {
      id: 'sencai-lingdie',
      name: '森彩灵蝶',
      element: 'grove',
      kind: '收藏型',
      rarity: '稀有',
      habitat: '森系区域',
      desc: '四阶段进化',
      usage: ['探索'],
      stages: ['一阶', '二阶'],
      forms: ['星彩'],
      skills: ['骑乘解谜'],
      verified: true
    }
  ]
};

const validCharacter = {
  filters: { roles: ['全部', '输出'], rarities: ['全部', '五星'] },
  items: [
    {
      id: 'ainisi',
      name: '艾妮丝',
      title: '星原旅人',
      element: 'flame',
      role: '输出',
      rarity: '五星',
      desc: '前瞻演示角色',
      teams: ['星辉速攻'],
      skills: [{ name: '战技', type: '爆发', desc: '突进斩击' }],
      verified: true
    }
  ]
};

// 通用图鉴条目 schema（normalizeEntries）：spirit/item/equipment/material/food/
// fishing/enemy/dungeon/building/achievement/region/affix/guide 共用一套字段。
const validEntries = () => ({
  notice: '通用图鉴示例',
  items: [
    {
      id: 'sample-entry',
      name: '示例条目',
      category: '示例',
      rarity: '普通',
      tags: ['示例'],
      summary: '最小合法条目，用于 17 类扩容后的测试覆盖',
      fields: [{ label: '来源', value: '测试 fixture' }],
      sections: [{ title: '概要', text: '最小合法条目' }],
      verified: false
    }
  ]
});

function codeOf(fn) {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
}

function expectInvalid(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.strictEqual(error.code, 'INVALID_CONTENT');
    assert.match(error.message, pattern);
    return true;
  });
}

test('normalizeContent is deterministic and typed', () => {
  const first = normalizeContent('element', validElement, {});
  const second = normalizeContent('element', JSON.parse(JSON.stringify(validElement)), {});
  assert.strictEqual(first.sha256, second.sha256);
  assert.strictEqual(first.count, 2);
  assert.strictEqual(first.payload.elements[0].color, '#ff7a45');
  assert.strictEqual(normalizeContent('meta', validMeta, {}).count, 1);
  assert.strictEqual(normalizeContent('qibo', validQibo, { elementKeys }).count, 1);
  assert.strictEqual(normalizeContent('character', validCharacter, { elementKeys }).count, 1);
  assert.strictEqual(normalizeContent('spirit', validEntries(), {}).count, 1);
  assert.strictEqual(codeOf(() => normalizeContent('heroes', validMeta, {})), 'INVALID_CONTENT');
});

test('every CATALOG_TYPE accepts a minimal valid payload', () => {
  // 2026-11-01：CATALOG_TYPES 扩到 17 类后，逐类验证 schema 可接受最小合法 payload，
  // 防止再出现「扩类型忘更测试」导致的覆盖空洞。
  CATALOG_TYPES.forEach((type) => {
    const context = { elementKeys: type === 'qibo' || type === 'character' ? elementKeys : null };
    const source = { meta: validMeta, element: validElement, qibo: validQibo, character: validCharacter }[type]
      || validEntries();
    const normalized = normalizeContent(type, source, context);
    assert.strictEqual(normalized.count >= 1, true, `${type} should normalize with count >= 1`);
  });
});

test('normalizeContent rejects unknown catalog type', () => {
  expectInvalid(() => normalizeContent('unknown', {}, {}), /unsupported catalog type/);
});

test('element counters must stay inside the element list', () => {
  const dangling = JSON.parse(JSON.stringify(validElement));
  dangling.counters.flame = ['water'];
  expectInvalid(() => normalizeContent('element', dangling, {}), /targets unknown element/);

  const orphanSource = JSON.parse(JSON.stringify(validElement));
  orphanSource.counters.water = ['flame'];
  expectInvalid(() => normalizeContent('element', orphanSource, {}), /unknown source element/);

  const single = JSON.parse(JSON.stringify(validElement));
  single.elements = [single.elements[0]];
  single.counters = { flame: [] };
  expectInvalid(() => normalizeContent('element', single, {}), /at least two elements/);
});

test('colors and paths are validated', () => {
  const badColor = JSON.parse(JSON.stringify(validElement));
  badColor.elements[0].color = 'red';
  expectInvalid(() => normalizeContent('element', badColor, {}), /hex color/);

  const badPath = JSON.parse(JSON.stringify(validMeta));
  badPath.sections[0].path = 'pages/qibo/list';
  expectInvalid(() => normalizeContent('meta', badPath, {}), /must start with \/pages\//);

  const emptySections = JSON.parse(JSON.stringify(validMeta));
  emptySections.sections = [];
  expectInvalid(() => normalizeContent('meta', emptySections, {}), /at least one section/);
});

test('item types reject unknown elements and duplicate ids', () => {
  const badElement = JSON.parse(JSON.stringify(validQibo));
  badElement.items[0].element = 'water';
  expectInvalid(() => normalizeContent('qibo', badElement, { elementKeys }), /unknown element/);

  const duplicated = JSON.parse(JSON.stringify(validCharacter));
  duplicated.items.push(Object.assign({}, duplicated.items[0], { name: '重名' }));
  expectInvalid(() => normalizeContent('character', duplicated, { elementKeys }), /duplicate id/);

  const tooLong = JSON.parse(JSON.stringify(validQibo));
  tooLong.items[0].desc = '字'.repeat(121);
  expectInvalid(() => normalizeContent('qibo', tooLong, { elementKeys }), /exceeds 120 characters/);
});

test('filters and items must describe the same option space', () => {
  const unusedOption = JSON.parse(JSON.stringify(validQibo));
  unusedOption.filters.kinds = ['全部', '收藏型', '实用派'];
  expectInvalid(() => normalizeContent('qibo', unusedOption, { elementKeys }), /offers unused option/);

  const missingOption = JSON.parse(JSON.stringify(validCharacter));
  missingOption.filters.roles = ['全部'];
  expectInvalid(() => normalizeContent('character', missingOption, { elementKeys }), /does not offer it/);

  const unsorted = JSON.parse(JSON.stringify(validQibo));
  unsorted.filters.kinds = ['收藏型', '全部'];
  expectInvalid(() => normalizeContent('qibo', unsorted, { elementKeys }), /must start with 全部/);
});

test('makeManifest refuses an incomplete catalog and merges partial updates', () => {
  const sourceOf = (type) => (
    { meta: validMeta, element: validElement, qibo: validQibo, character: validCharacter }[type] || validEntries()
  );
  const built = (types, existing) => {
    const snapshots = {};
    types.forEach((type) => {
      const context = { elementKeys: type === 'qibo' || type === 'character' ? elementKeys : null };
      snapshots[type] = makeSnapshot(type, normalizeContent(type, sourceOf(type), context), { runId: 'test', updatedAt: '2026-10-29T00:00:00.000Z' });
    });
    return makeManifest(existing, snapshots, { manifestId: MANIFEST_ID, runId: 'test', publishedAt: '2026-10-29T00:00:00.000Z' });
  };

  assert.throws(() => built(['meta', 'element']), (error) => {
    assert.strictEqual(error.code, 'INVALID_CONTENT');
    const missing = CATALOG_TYPES.filter((type) => type !== 'meta' && type !== 'element');
    assert.strictEqual(error.message, `catalog is incomplete, missing ${missing.join(', ')}`);
    return true;
  });

  const first = built(CATALOG_TYPES);
  assert.strictEqual(Object.keys(first.content).length, CATALOG_TYPES.length);
  const client = clientManifest(first);
  assert.strictEqual(client.revision, first.version);
  assert.deepStrictEqual(Object.keys(client.types).sort(), [...CATALOG_TYPES].sort());
  assert.strictEqual(client.types.qibo.revision, first.content.qibo.sha256);

  const again = built(CATALOG_TYPES, first);
  assert.strictEqual(again.version, first.version, 'republishing identical content keeps the revision stable');

  const edited = JSON.parse(JSON.stringify(validQibo));
  edited.items[0].desc = '更新了描述';
  const snapshots = { qibo: makeSnapshot('qibo', normalizeContent('qibo', edited, { elementKeys }), { runId: 'test' }) };
  const merged = makeManifest(first, snapshots, { manifestId: MANIFEST_ID });
  assert.notStrictEqual(merged.version, first.version);
  assert.strictEqual(merged.content.element.sha256, first.content.element.sha256, 'untouched types keep their snapshot pointer');
  assert.strictEqual(merged.content.qibo.snapshotId, snapshots.qibo._id);
});

test('items limit is enforced at exactly LIMITS.items entries', () => {
  // 2026-11-01：物品图鉴在 BWIKI 全量下已到 300 条并触发过上限，LIMITS.items 提到 500。
  // 边界回归：恰好 500 条可发布，501 条拒绝。
  const buildEntries = (count) => ({
    notice: '边界用例',
    items: Array.from({ length: count }, (_, index) => ({
      id: `boundary-${String(index).padStart(4, '0')}`,
      name: `条目${index}`,
      category: '示例',
      summary: `第 ${index} 条边界条目`
    }))
  });
  const atLimit = normalizeContent('item', buildEntries(LIMITS.items), {});
  assert.strictEqual(atLimit.count, LIMITS.items);
  expectInvalid(() => normalizeContent('item', buildEntries(LIMITS.items + 1), {}), new RegExp(`exceeds ${LIMITS.items} entries`));
});

test('seedCatalog fails closed and does not allow an openid bypass', () => {
  const seed = require('../../seedCatalog/index.js');
  assert.strictEqual(seed._test.authorize({ token: 'x' }).ok, false);
  assert.strictEqual(seed._test.authorize({ token: 'x' }).code, 'SEED_NOT_CONFIGURED');

  process.env.QBXZS_SEED_TOKEN = 'secret-token';
  try {
    assert.strictEqual(seed._test.authorize({ token: 'secret-token' }).ok, true);
    assert.strictEqual(seed._test.authorize({ token: 'wrong' }).ok, false);
    assert.strictEqual(seed._test.authorize({ token: 'wrong' }).code, 'UNAUTHORIZED');
    assert.strictEqual(seed._test.authorize({ openid: 'o-anyone' }).ok, false);
    assert.strictEqual(seed._test.safeTokenEqual('a', 'aa'), false);
  } finally {
    delete process.env.QBXZS_SEED_TOKEN;
  }
});
