// 阶段 4（4.4 / 4.5 / 4.6）静态核验：只检查源码锚点、数据口径与构建产物。
// 不代表 H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 通过。
// 用法：node scripts/verify-stage4b.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => (existsSync(join(root, rel))
  ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
  : '');

const checks = [];
let failed = 0;
function expect(ok, label, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
  if (!ok) failed += 1;
}
function templateOf(s) {
  const start = s.indexOf('<template>');
  const end = s.lastIndexOf('</template>');
  return start >= 0 && end > start ? s.slice(start, end).replace(/<!--[\s\S]*?-->/g, '') : '';
}

const HOME = 'src/pages/index/index.vue';
const home = read(HOME);
const tpl = templateOf(home);
const style = home.slice(home.lastIndexOf('<style>'));
const theme = read('src/styles/theme.css');
const charList = read('src/pages/character/list.vue');
const qiboList = read('src/pages/qibo/list.vue');
expect(home.length > 0, '首页文件可读');

// ---- 4.4 / H04：删除首屏四格规模统计，真实数量留在列表页 ----
expect(!/class="stat-strip/.test(tpl), '4.4 首页模板已无四格统计容器');
expect(!/stat-strip__/.test(home) && !/const stat = computed/.test(home), '4.4 统计样式与 stat computed 已移除');
// 只检查模板渲染文本与实际绑定；script 注释里对旧口径的说明不算残留
expect(!/官方图/.test(tpl) && !/图鉴条目/.test(tpl) && !/stat\.images/.test(home) && !/stat\.total/.test(home), '4.4 「官方图 / 图鉴条目」误导口径已移除（模板与实际绑定）');
expect(/命中[\s\S]{0,60}共 \{\{ totalCount \}\}/.test(charList), '4.4 角色列表页保留「命中 X / 共 Y」真实数量');
expect(/命中[\s\S]{0,60}共 \{\{ totalCount \}\}/.test(qiboList), '4.4 奇波列表页保留「命中 X / 共 Y」真实数量');
expect(/LIST_SOURCE_NOTE/.test(charList) && /LIST_SOURCE_NOTE/.test(qiboList), '4.4 两页来源说明集中在列表页页脚（3.3 口径）');
expect(/\{\{ sourceNote \}\}/.test(charList) && /\{\{ sourceNote \}\}/.test(qiboList), '4.4 来源说明确实渲染在页脚');

// ---- 4.5 / H05：固定 4×2 八入口 + 全部工具紧凑目录 ----
expect(!/<swiper/.test(tpl) && !/indicator-dots/.test(tpl) && !/indicator-active-color/.test(tpl), '4.5 无分页横滑、无金色分页指示点');
expect(!/quickPages/.test(home) && !/QUICK_GRID_KEYS/.test(home) && !/quick-grid__swiper/.test(home), '4.5 旧两页六格数据/样式已移除');
expect(/class="quick-grid"/.test(tpl) && /v-for="cell in quickCells"/.test(tpl), '4.5 固定八入口由 quickCells 驱动');
expect(/width: 25%/.test(style) && /min-height: 116rpx/.test(style), '4.5 四列布局 + 约 44px 级可触高度');
expect(/class="tools-dir"/.test(tpl) && /v-if="showAllTools"/.test(tpl) && /v-for="item in toolItems"/.test(tpl), '4.5 全部工具紧凑目录默认收起、由 toolItems 驱动');
expect(/function toggleAllTools/.test(home) && /function onQuickTap/.test(home), '4.5 展开/收起与八入口点击函数已声明');
expect(!/section-card/.test(home) && !/grid-2/.test(tpl) && !/row-grid card/.test(tpl), '4.5 首屏不再重复一整套大功能卡 / 嵌套白盒');
expect(/const order = \['catalog', 'query', 'content'\]/.test(home), '4.5 工具组从下方低频目录移出，交给全部工具目录');

// 数据实算：八入口的 7 个真实 key、路径注册、第 8 格与工具组条数（静态，不联网）
let stats = {};
try {
  const tmpDir = mkdtempSync(join(tmpdir(), 'qbxzs-stage4b-'));
  const requireFromRoot = createRequire(join(root, 'noop.cjs'));
  const out = join(tmpDir, 'meta.cjs');
  buildSync({ entryPoints: [join(root, 'src/data/meta.js')], bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'silent' });
  const meta = requireFromRoot(out);
  const sections = meta.sections || [];
  const byKey = Object.fromEntries(sections.map((item) => [item.key, item]));
  const keysMatch = home.match(/const QUICK_KEYS = \[([^\]]*)\]/);
  const quickKeys = keysMatch ? [...keysMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  expect(quickKeys.length === 7, '4.5 固定 7 个真实入口 + 1 个「全部工具」＝ 8 格', JSON.stringify(quickKeys));
  const pagesJson = JSON.parse(read('src/pages.json'));
  const routes = new Set([
    ...(pagesJson.pages || []).map((p) => `/${p.path}`),
    ...(pagesJson.subPackages || []).flatMap((s) => (s.pages || []).map((p) => `/${s.root}/${p.path}`))
  ]);
  for (const key of quickKeys) {
    const item = byKey[key];
    expect(Boolean(item) && routes.has(item.path), `4.5 [${key}] 板块存在且路由已注册`, item ? item.path : '缺失');
  }
  expect(/title: '全部工具'/.test(home) && /action: 'allTools'/.test(home), '4.5 第八格为「全部工具」且走展开动作（不新增路由）');
  const toolItems = sections.filter((item) => (item.group || 'catalog') === 'tool');
  expect(toolItems.length >= 1, '4.5 全部工具目录有可展开条目', `tools=${toolItems.length}`);
  toolItems.forEach((item) => {
    expect(routes.has(item.path), `4.5 工具 [${item.key}] 路由已注册`, item.path);
  });
  stats = { quickKeys, toolCount: toolItems.length, toolKeys: toolItems.map((x) => x.key) };
} catch (error) {
  expect(false, '阶段 4b 数据实算可执行', error.message);
}

// ---- 4.6 / H06：统一 16px 外边距、取消嵌套白盒 ----
expect(/class="page home"/.test(tpl), '4.6 首页根节点带 .home 限定类（不改全局 .page）');
expect(/\.page\.home \{[\s\S]{0,160}padding-left: 32rpx[\s\S]{0,80}padding-right: 32rpx/.test(style), '4.6 首页统一 16px 设计基准外边距（390px 屏约 32rpx）');
expect(/\.home \.section-title,[\s\S]{0,120}margin-left: 0/.test(style) && /\.home \.footnote/.test(style), '4.6 分区标题与页脚左右边距归零，共用对齐线');
expect(!/\.verinfo/.test(style) && /\.starter \{[\s\S]{0,80}margin-top: 24rpx/.test(style) && !/margin: 20rpx 24rpx 0/.test(style), '4.6 / 4.7 旧版本信息区已收敛删除，新手必看不再额外向内缩进');
expect(/\.row-grid \{[\s\S]{0,180}padding: 0/.test(style), '4.6 紧凑目录去掉内嵌白盒内边距');
expect(/\.home \.hero::after \{[\s\S]{0,100}display: none/.test(style), '4.6 theme.css 旧 .hero 圆点装饰不叠加到首页主视觉');
expect(/\.page \{[\s\S]{0,140}padding: 0 24rpx 48rpx/.test(theme), '4.6 theme.css 全局 .page 保持原样（未顺手重排几十个页面）');

// ---- 构建产物锚点（仍属静态检查，不是运行/视觉/交互验证） ----
const DIST = 'dist/build/mp-weixin';
const distWxml = read(`${DIST}/pages/index/index.wxml`);
if (distWxml) {
  expect(!/官方图/.test(distWxml) && !/图鉴条目/.test(distWxml) && !/stat-strip/.test(distWxml), '[产物] 首页 wxml 无四格统计与误导口径');
  expect(!/indicator-dots/.test(distWxml) && !/section-card/.test(distWxml), '[产物] 首页 wxml 无分页指示点与大功能卡');
  expect(/全部工具/.test(distWxml) && /角色速查/.test(distWxml) && /奇波速查/.test(distWxml), '[产物] 八入口 / 全部工具目录 / 两类速查进入 wxml');
  const distWxss = read(`${DIST}/pages/index/index.wxss`);
  expect(/\.page\.home/.test(distWxss) && /tools-dir/.test(distWxss), '[产物] 首页统一边距与工具目录样式进入 wxss');
  expect(!/stat-strip/.test(distWxss) && !/quick-grid__swiper/.test(distWxss), '[产物] 统计条与分页宫格样式不再进入 wxss');
} else {
  console.log('ℹ 未发现 dist/build/mp-weixin 首页产物，跳过构建产物锚点检查');
}

// ---- 输出 ----
for (const check of checks) console.log(`${check.ok ? '✔' : '✖'} ${check.label}${check.detail ? ` · ${check.detail}` : ''}`);
mkdirSync(join(root, '.tmp'), { recursive: true });
const outFile = join(root, '.tmp', 'stage4b-verify.json');
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'static-code-and-data-only',
  passed: checks.length - failed,
  total: checks.length,
  failed,
  stats,
  checks
}, null, 2));
console.log(`\n阶段 4b 静态核验：${checks.length - failed}/${checks.length} 通过；产物 ${outFile.replaceAll('\\', '/')}`);
console.log('注意：以上仅为静态代码检查与数据口径断言；H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 均「未能验证」。');
if (failed) process.exit(1);
