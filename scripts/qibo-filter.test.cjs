const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const vm = require('node:vm');

const result = buildSync({ entryPoints: ['src/utils/query.js'], bundle: true, platform: 'node', format: 'cjs', write: false });
const context = { module: { exports: {} }, exports: {} };
vm.runInNewContext(result.outputFiles[0].text, context);
const { filterQibos } = context.module.exports;
const indexResult = buildSync({ entryPoints: ['src/data/generated/qibo-index.js'], bundle: true, platform: 'node', format: 'cjs', write: false });
const indexContext = { module: { exports: {} }, exports: {} };
vm.runInNewContext(indexResult.outputFiles[0].text, indexContext);
const { qiboIndex } = indexContext.module.exports;
const items = [
  { name: '火狐', element: 'flame', elements: ['flame'], fields: [{ label: '阶段', value: '成熟期' }, { label: '家园工种', value: '伐木、采矿' }] },
  { name: '风狐', element: 'wind', elements: ['wind'], fields: [{ label: '阶段', value: '成熟期' }, { label: '家园工种', value: '采矿' }] },
  { name: '双元素', element: 'astral', elements: ['astral', 'flame'], fields: [{ label: '阶段', value: '幼年期' }, { label: '家园工种', value: '采矿' }] },
  { name: '水狐', element: 'flow', fields: [{ label: '阶段', value: '成熟期' }, { label: '家园工种', value: '采矿' }] },
  { name: '缺字段', element: 'flame' }
];

test('同组任一匹配，不同组同时匹配，并组合搜索', () => {
  const found = filterQibos(items, { keyword: '狐', element: ['flame', 'wind'], stage: ['成熟期'], job: ['采矿'] });
  assert.deepEqual(Array.from(found, (item) => item.name), ['火狐', '风狐']);
});

test('双元素、多个工种、旧单选参数和缺失字段', () => {
  assert.equal(filterQibos(items, { keyword: '双元素', element: ['flame'] }).length, 1);
  assert.equal(filterQibos(items, { keyword: '火狐', job: ['采矿', '照料'] }).length, 1);
  assert.equal(filterQibos(items, { keyword: '火狐', element: 'flame', stage: '成熟期' }).length, 1);
  assert.equal(filterQibos(items, { keyword: '缺字段', stage: ['成熟期'] }).length, 0);
  assert.equal(filterQibos(items, { element: [], stage: [], job: [] }).length, items.length);
});

// 验证编号搜索不会把 1 扩大为 10/100，并保留同编号的字母形态。
test('编号搜索按数字组和完整字母后缀精确匹配', () => {
  const indexed = qiboIndex.map((item) => ({ ...item, fields: [] }));
  assert.deepEqual(Array.from(filterQibos(indexed, { keyword: '1' }), (item) => item.name), ['小芽狐']);
  assert.deepEqual(Array.from(filterQibos(indexed, { keyword: '12' }), (item) => item.code), ['12', '12A']);
  assert.deepEqual(Array.from(filterQibos(indexed, { keyword: '12A' }), (item) => item.code), ['12A']);
  assert.deepEqual(Array.from(filterQibos(indexed, { keyword: '13' }), (item) => item.code), ['13', '13A']);
  assert.deepEqual(Array.from(filterQibos(indexed, { keyword: '13A' }), (item) => item.code), ['13A']);
});

// 验证 CBT3 图鉴记录口径和每条编号、头像字段完整。
test('编号索引包含 204 条完整记录', () => {
  assert.equal(qiboIndex.length, 204);
  assert.equal(qiboIndex.every((item) => item.number && item.displayNumber && item.icon), true);
});
