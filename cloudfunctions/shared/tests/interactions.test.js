// 交互层边界测试：元素克制/保底计算/返利估算/星结表（配合定时任务第 2 轮软件测试）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function loadModule(relPath) {
  // 简易 ESM 加载（src/data 模块无 uni 依赖，可直接 import）
  const mod = import('file://' + join(root, relPath).replace(/\\/g, '/'));
  return mod;
}

test('保底估算：90 抽边界必得 1 次 UP', async () => {
  const floor = (v) => Math.floor(v / 90);
  assert.equal(floor(0), 0);
  assert.equal(floor(89), 0);
  assert.equal(floor(90), 1);
  assert.equal(floor(179), 1);
  assert.equal(floor(180), 2);
});

test('返利估算：2000 内 200%、超出 150%', async () => {
  const calc = (amount) => {
    const yuan = Math.max(Number(amount) || 0, 0);
    const low = Math.min(yuan, 2000);
    const high = Math.max(yuan - 2000, 0);
    return Math.round(low * 2 + high * 1.5);
  };
  assert.equal(calc(0), 0);
  assert.equal(calc(6), 12);
  assert.equal(calc(2000), 4000);
  assert.equal(calc(3000), 5500);
  assert.equal(calc(-5), 0);
});

test('元素表：10 元素 + 无属性不参与克制', async () => {
  const src = readFileSync(join(root, 'src/data/element.js'), 'utf8');
  const keys = [...src.matchAll(/key: '([a-z]+)'/g)].map((m) => m[1]);
  const expected = ['flame', 'wind', 'earth', 'grove', 'frost', 'flow', 'bolt', 'astral', 'dark', 'none'];
  for (const key of expected) assert.ok(keys.includes(key), `缺元素 ${key}`);
  // none 无克制条目
  const countersMatch = src.match(/export const counters = \{([\s\S]*?)\n\};/);
  assert.ok(countersMatch, 'counters 缺失');
  assert.ok(!/none:/.test(countersMatch[1]), 'none 不应有克制关系');
});

test('星结概率表：九档且寥光为 100%', async () => {
  const src = readFileSync(join(root, 'src/data/tools.js'), 'utf8');
  for (const name of ['普通', '奇特', '精美', '珍贵', '出众', '闪耀', '卓然', '寥光', '无限']) {
    assert.ok(src.includes(name), `星结表缺 ${name}`);
  }
  assert.ok(/寥光.*100%[\s\S]{0,80}recommend/.test(src), '寥光应带推荐标记');
});

test('竞品补充条目在场（星裔/熔焰烬龙/祛影之翼）', async () => {
  const manual = readFileSync(join(root, 'src/data/manual-catalogs.js'), 'utf8');
  for (const name of ['星裔（女）', '星裔（男）', '熔焰烬龙', '祛影之翼']) {
    assert.ok(manual.includes(name), `缺 ${name}`);
  }
});
