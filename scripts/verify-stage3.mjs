// 阶段 3（3.2 / 3.3 / 3.4）静态核验：只检查源码锚点与数据口径，不代表运行/视觉/交互通过。
// 用法：node scripts/verify-stage3.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';

import { buildSeedBundle, SEED_FILE } from './bundle-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const src = (rel) => (existsSync(join(root, rel)) ? read(rel) : '');

const PAGES = {
  character: 'src/pages/character/list.vue',
  qibo: 'src/pages/qibo/list.vue',
  catalogList: 'src/components/catalog-list/catalog-list.vue'
};
const checks = [];
let failed = 0;
// src 是 ESM 而脚本按 ESM 运行；统一用 esbuild 打成 CJS 再 require，避免 Node 模块类型推断警告
const tmpDir = mkdtempSync(join(tmpdir(), 'qbxzs-stage3-'));
const requireFromRoot = createRequire(join(root, 'noop.cjs'));
function expect(ok, label, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
  if (!ok) failed += 1;
}
// 只检查模板里真正会渲染的文案，排除开发注释中的说明文字
function visibleTemplate(s) {
  const start = s.indexOf('<template>');
  const end = s.lastIndexOf('</template>');
  const template = start >= 0 && end > start ? s.slice(start, end) : '';
  return template.replace(/<!--[\s\S]*?-->/g, '');
}

// ---- 3.2 / L04：收藏语义 ----
for (const [key, file] of Object.entries(PAGES)) {
  const s = src(file);
  expect(s.length > 0, `[${key}] 文件可读`);
  expect(!/已收集|已获得/.test(visibleTemplate(s)), `[${key}] 界面不再出现「已收集 / 已获得」`);
  expect(!/collect-strip|favPercent/.test(s), `[${key}] 大块收集进度条与百分比已删除`);
  expect(/只看收藏/.test(s) && /已收藏 \{\{ favCount/.test(s), `[${key}] 首部提供「只看收藏」筛选与全局收藏数`);
  expect(/onlyFav\.value/.test(s), `[${key}] 收藏筛选落在 list 逻辑`);
  expect(/onlyFav\.value = false/.test(s), `[${key}] 重置筛选会清掉收藏筛选`);
  expect(/favCount = computed\(\(\) => (?:\(catalog\.value\.items \|\| \[\]\)|items\.value)\.filter/.test(s), `[${key}] favCount 按全量条目统计`);
  expect(!/list\.value\.filter\(\(item\) => favSet/.test(s), `[${key}] favCount 不再依赖筛选后的 list`);
  expect(/:aria-label="favSet\[item\.id\] \? '取消收藏' : '收藏'"/.test(s), `[${key}] 星标有明确名称`);
  expect(/@tap\.stop=/.test(s), `[${key}] 星标点击不进入详情`);
  expect(/\.fav-star \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/.test(s), `[${key}] 星标 44px 可触面积`);
}
const fav = src('src/utils/favorites.js');
expect(/const MAX = 1000;/.test(fav), 'favorites.js 收藏容量由 200 上调至 1000');
expect(/收藏已达上限/.test(fav) && /uni\.showToast/.test(fav), 'favorites.js 溢出不再静默丢弃旧记录');

// ---- 3.3 / L05：示例、重复、来源与「待核实」 ----
const viewPath = 'src/utils/catalog-view.js';
expect(existsSync(join(root, viewPath)), 'catalog-view.js 视图层正式列表口径存在');
const viewBundle = join(tmpDir, 'catalog-view.cjs');
buildSync({
  entryPoints: [join(root, viewPath)],
  bundle: true, format: 'cjs', platform: 'node', outfile: viewBundle, logLevel: 'silent'
});
const view = requireFromRoot(viewBundle);
expect(typeof view.officialItems === 'function' && typeof view.isDemoEntry === 'function' && typeof view.liveFacetOptions === 'function', '导出 officialItems / isDemoEntry / liveFacetOptions');
expect(String(view.LIST_SOURCE_NOTE || '').includes('收录不等于官方核实'), '来源说明区分「收录」与「官方核实」');

for (const key of ['character', 'qibo']) {
  const s = src(PAGES[key]);
  expect(/officialItems\(data\.items\)/.test(s), `[${key}] 默认列表走 officialItems`);
  expect(/liveFacetOptions\(catalog\.value\.items/.test(s), `[${key}] 筛选选项按正式列表收敛`);
  expect(/sourceNote/.test(s) && /\{\{ sourceNote \}\}/.test(s), `[${key}] 来源说明集中在页面底部`);
  expect(!/<text class="mini-tag mini-tag--warn">待核实<\/text>/.test(s), `[${key}] 不再无条件贴「待核实」`);
  expect(/item\.verified === false/.test(s) && /字段暂缺/.test(s), `[${key}] 仅在字段缺失时提示「字段暂缺」`);
  expect(/mini-tag--muted/.test(s), `[${key}] 字段提示视觉降级`);
}
const search = src('src/pages/search/search.vue');
expect(/officialItems\(\(data\.character/.test(search) && /officialItems\(\(data\.qibo/.test(search), '全局搜索与列表同口径');

// 数据层零改动证据：seed 修订号与当前 src/data 输出仍一致（check.mjs 同款校验）
let seedParity = false;
let seedVersion = '';
try {
  const { manifest } = buildSeedBundle();
  const committed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  seedVersion = manifest.version;
  seedParity = committed.version === manifest.version;
} catch (error) {
  seedVersion = `error: ${error.message}`;
}
expect(seedParity, '数据层/seed 修订号未变（视图层过滤未牵动云端快照）', seedVersion);

// 数据口径实算：打包 catalog.js 拿真实 bundledCatalog，再套 officialItems
const bundlePath = join(tmpDir, 'catalog.cjs');
buildSync({
  entryPoints: [join(root, 'src/data/catalog.js')],
  bundle: true, format: 'cjs', platform: 'node', outfile: bundlePath, logLevel: 'silent'
});
const bundled = requireFromRoot(bundlePath).bundledCatalog;
const stats = {};
for (const type of ['character', 'qibo']) {
  const raw = bundled[type].items || [];
  const official = view.officialItems(raw);
  const demo = raw.filter((item) => view.isDemoEntry(item)).length;
  const names = new Set(official.map((item) => item.name));
  stats[type] = {
    raw: raw.length,
    demo,
    duplicateRemoved: raw.length - demo - official.length,
    official: official.length,
    uniqueNames: names.size
  };
  expect(demo > 0 && official.length < raw.length, `[${type}] 演示条目已从默认列表剔除`, `raw=${raw.length} demo=${demo} official=${official.length}`);
  expect(official.every((item) => !view.isDemoEntry(item)), `[${type}] 正式列表不含演示条目`);
  expect(names.size === official.length, `[${type}] 正式列表无同名重复`, `unique=${names.size}/${official.length}`);
}
expect(stats.character.raw - stats.character.demo - stats.character.duplicateRemoved === stats.character.official, '角色剔除/去重账目闭合');
expect(stats.qibo.raw - stats.qibo.demo - stats.qibo.duplicateRemoved === stats.qibo.official, '奇波剔除/去重账目闭合');
expect(view.officialItems(bundled.character.items).some((i) => i.name === '艾妮丝'), '正式角色列表仍含 BWIKI 收录的艾妮丝（只剔除手工重复项）');
expect(view.officialItems(bundled.character.items).some((i) => i.name === '星裔（女）'), '竞品补充角色仍保留');
expect(view.officialItems(bundled.qibo.items).some((i) => i.name === '熔焰烬龙'), '竞品补充奇波仍保留');
expect(view.officialItems(bundled.qibo.items).some((i) => i.name === '菜鸡（特殊）'), '特殊个体奇波仍保留');

// 剔除演示条目会让静态 facet 里部分选项变成零命中；筛选数组本身来自 src/data 数据层，
// 改它会牵动 seed revision（本轮按 #23 跳过），故在视图层按正式列表实际取值收敛并核验。
const charOfficial = view.officialItems(bundled.character.items);
const qiboOfficial = view.officialItems(bundled.qibo.items);
const zeroHit = (items, field, options) => options.filter((option) =>
  option !== '全部' && option !== 'all' &&
  !items.some((item) => (Array.isArray(item[field]) ? item[field].includes(option) : item[field] === option))
);
const before = {
  character: {
    roles: zeroHit(charOfficial, 'role', bundled.character.filters?.roles || []),
    rarities: zeroHit(charOfficial, 'rarity', bundled.character.filters?.rarities || [])
  },
  qibo: {
    kinds: zeroHit(qiboOfficial, 'kind', bundled.qibo.filters?.kinds || []),
    usages: zeroHit(qiboOfficial, 'usage', bundled.qibo.filters?.usages || []),
    rarities: zeroHit(qiboOfficial, 'rarity', bundled.qibo.filters?.rarities || [])
  }
};
const after = {
  character: {
    roles: view.liveFacetOptions(charOfficial, 'role', bundled.character.filters?.roles || []),
    rarities: view.liveFacetOptions(charOfficial, 'rarity', bundled.character.filters?.rarities || [])
  },
  qibo: {
    kinds: view.liveFacetOptions(qiboOfficial, 'kind', bundled.qibo.filters?.kinds || []),
    usages: view.liveFacetOptions(qiboOfficial, 'usage', bundled.qibo.filters?.usages || []),
    rarities: view.liveFacetOptions(qiboOfficial, 'rarity', bundled.qibo.filters?.rarities || [])
  }
};
const facetGaps = { before, after };
console.log(`ℹ 筛选选项收敛：零命中项 ${JSON.stringify(before)} → 收敛后 ${JSON.stringify(after)}`);
for (const [type, groups] of Object.entries(before)) {
  for (const [field, dead] of Object.entries(groups)) {
    expect(dead.every((option) => after[type][field].indexOf(option) < 0), `[${type}.${field}] 零命中选项已从面板移除`, dead.join('/') || '无');
  }
}
// 分组名是复数（roles/kinds…），条目字段名是单数（role/kind…）
const FIELD_KEY = { roles: 'role', rarities: 'rarity', kinds: 'kind', usages: 'usage' };
for (const [type, groups] of Object.entries(after)) {
  const pool = type === 'character' ? charOfficial : qiboOfficial;
  for (const [field, options] of Object.entries(groups)) {
    const key = FIELD_KEY[field] || field;
    const dead = options.filter((option) => option !== '全部' && !pool.some((item) =>
      Array.isArray(item[key]) ? item[key].includes(option) : item[key] === option
    ));
    expect(dead.length === 0, `[${type}.${field}] 收敛后每个选项都有命中条目`, dead.length ? `dead=${dead.join('/')}` : options.join('/'));
  }
}

// ---- 3.4 / L06：空态、输入清除、返回状态 ----
for (const key of ['character', 'qibo']) {
  const s = src(PAGES[key]);
  expect(/v-if="!list\.length"/.test(s), `[${key}] 空态只在零结果出现`);
  expect(/重置筛选/.test(s) && /@tap="resetAllFilters"/.test(s), `[${key}] 空态提供重置筛选`);
  expect(/onShow\([\s\S]*?refreshFavs\(\)/.test(s), `[${key}] 返回页面时同步收藏状态`);
}
expect(/v-if="!list\.length"/.test(src(PAGES.catalogList)) && /清空筛选/.test(src(PAGES.catalogList)), '通用图鉴空态已有 v-if 与清空入口（本轮未改）');
const index = src('src/pages/index/index.vue');
expect(/@clear="onKeywordClear"/.test(index), '首页监听输入组件的 clear 事件');
expect(/function onKeywordClear\(\) \{\s*keyword\.value = '';/.test(index), '首页 clear 处理确实清空 keyword');
const cxInput = src('src/components/cx-input/cx-input.vue');
expect(/cx-input__clear-hit/.test(cxInput) && /\$emit\('clear'\)/.test(cxInput), '输入清除按钮仍发出 clear 事件');
expect(/\.cx-input__clear-hit \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/.test(cxInput), '输入清除热区 44×44px');
expect(/\.cx-input__clear \{[\s\S]*?width: 42rpx;[\s\S]*?height: 42rpx;/.test(cxInput), '输入清除视觉尺寸保持不变');

// ---- 构建产物 wxml/js 锚点（仍属静态检查，不是运行/视觉/交互验证） ----
const DIST = 'dist/build/mp-weixin';
if (existsSync(join(root, DIST, 'pages/character/list.wxml'))) {
  const distFiles = {
    character: src(`${DIST}/pages/character/list.wxml`),
    qibo: src(`${DIST}/pages/qibo/list.wxml`),
    catalogList: src(`${DIST}/components/catalog-list/catalog-list.wxml`)
  };
  for (const [key, s] of Object.entries(distFiles)) {
    expect(/只看收藏/.test(s) && /已收藏/.test(s), `[产物 ${key}] 收藏筛选进入 wxml`);
    expect(!/已收集|已获得/.test(s), `[产物 ${key}] wxml 无「已收集 / 已获得」`);
  }
  for (const key of ['character', 'qibo']) {
    const s = distFiles[key];
    expect(/字段暂缺/.test(s) && /重置筛选/.test(s), `[产物 ${key}] 字段提示与重置筛选进入 wxml`);
    expect(!/待核实/.test(s), `[产物 ${key}] wxml 无「待核实」`);
  }
  expect(/clear-hit/.test(src(`${DIST}/components/cx-input/cx-input.wxml`)), '[产物] 输入清除热区进入 wxml');
  // uni-app 会把 setup 事件名压缩成 wxml 的 bindclear="{{...}}"，函数名不保留在产物 js 中
  expect(/bindclear=/.test(src(`${DIST}/pages/index/index.wxml`)), '[产物] 首页 clear 事件绑定进入 wxml');
} else {
  console.log('ℹ 未发现 dist/build/mp-weixin 产物，跳过构建产物锚点检查');
}

// ---- 输出 ----
for (const check of checks) console.log(`${check.ok ? '✔' : '✖'} ${check.label}${check.detail ? ` · ${check.detail}` : ''}`);
const tmpOut = join(root, '.tmp');
mkdirSync(tmpOut, { recursive: true });
const outFile = join(tmpOut, 'stage3-verify.json');
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'static-code-and-data-only',
  passed: checks.length - failed,
  total: checks.length,
  failed,
  stats,
  seedVersion,
  facetGaps,
  checks
}, null, 2));
console.log(`\n阶段 3 静态核验：${checks.length - failed}/${checks.length} 通过；产物 ${outFile.replaceAll('\\', '/')}`);
console.log('注意：以上仅为静态代码检查与数据口径断言；H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 均「未能验证」。');
if (failed) process.exit(1);
