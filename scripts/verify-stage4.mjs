// 阶段 4（4.1 / 4.2 / 4.3）静态核验：只检查源码锚点、图片清单与数据口径。
// 不代表 H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 通过。
// 用法：node scripts/verify-stage4.mjs
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
expect(home.length > 0, '首页文件可读');

// ---- 4.1 / H01：首屏顺序、单主视觉、速查各 4 ----
const at = (text) => tpl.indexOf(text);
expect(at('class="searchbar"') >= 0 && at('class="searchbar"') < at('class="hero"'), '4.1 搜索框置于主视觉之前');
expect(at('class="hero"') >= 0 && at('class="hero"') < at('class="quick-grid'), '4.1 主视觉在快捷入口之前');
expect(at('角色速查') > at('class="quick-grid') && at('奇波速查') > at('角色速查'), '4.1 快捷入口之后依次展示角色/奇波速查');
// 4.4 起首屏四格统计已删除，原「后移」断言改为「已移除」回归；4.7 起长版本信息块整体删除，改由新手必看后移承接
expect(!/class="stat-strip/.test(tpl) && !/stat\.qibo/.test(tpl), '4.4 首屏四格规模统计已删除（回归）');
expect(at('class="verinfo') === -1 && at('class="starter') > at('奇波速查'), '4.1 / 4.7 长版本信息块已删除，新手必看后移到两类速查之后');
expect((tpl.match(/class="hero__media"/g) || []).length === 1 && (tpl.match(/class="hero__bar"/g) || []).length === 1, '4.1 只有一个静态主视觉');
expect(/featuredCharacters/.test(tpl) && /featuredQibo/.test(tpl), '4.1 两类速查由数据驱动（不写死卡片）');
expect(/go\('\/pages\/character\/list'\)/.test(tpl) && /go\('\/pages\/qibo\/list'\)/.test(tpl), '4.1 「查看全部」分别进角色/奇波分类');
expect(/function goCharacterDetail\(id\)/.test(home) && /function goQiboDetail\(id\)/.test(home), '4.1 速查整卡进对应详情');
const pagesJson = JSON.parse(read('src/pages.json'));
const routes = new Set([
  ...(pagesJson.pages || []).map((p) => `/${p.path}`),
  ...(pagesJson.subPackages || []).flatMap((s) => (s.pages || []).map((p) => `/${s.root}/${p.path}`))
]);
expect(routes.has('/pages/character/detail') && routes.has('/pages/qibo/detail'), '4.1 速查详情路由已注册');
expect(/feature__name/.test(tpl) && /<text class="feature__name">\{\{ item\.name \}\}/.test(tpl), '4.1 名称在独立文字区固定可见');

// ---- 4.2 / H02：移除哈希配图，改为明确图片清单 ----
expect(!/hashIndex/.test(home), '4.2 hashIndex 随机配图已移除');
expect(!/BANNER_THEMES/.test(home) && !/const arts\b/.test(home), '4.2 轮播主题/灵子图池已移除');
expect(!/section-card__art/.test(home) && !/banner__art/.test(home), '4.2 功能卡与轮播不再放随机装饰图');
expect(!/banner-wrap/.test(tpl) && !/banner__dots/.test(tpl), '4.2 旧轮播容器与指示点已移除');
expect(/FEATURED_IDS/.test(home) && /keyVisualSources\(\)/.test(home), '4.2 首页图片清单落在 FEATURED_IDS 与 keyVisualSources');
expect(/keyVisual 横图/.test(home) && /Tex_icon_hero_l/.test(home) && /Tex_icon_pet/.test(home) && /统一 emoji/.test(home), '4.2 清单逐项写明用途与来源');
expect(/srcOf\(item, 'charWiki', 'avatar'\)/.test(tpl), '4.2 角色速查用 avatar 专用头像');
expect(/srcOf\(item, 'qiboWiki', 'icon'/.test(tpl), '4.2 奇波速查用 icon 专用图标');
expect((tpl.match(/mode="aspectFit"/g) || []).length >= 2, '4.2 速查图片完整展示主体（aspectFit）');
expect((tpl.match(/lazy-load/g) || []).length >= 2, '4.2 速查图片启用懒加载');
expect(/@error="onVisualError"/.test(tpl) && /retryVisual/.test(tpl), '4.2 主视觉失败回退为同尺寸文字卡并可重试');
expect(/@error="onError\(item, 'avatar'\)"/.test(tpl) && /@error="onError\(item, 'icon'\)"/.test(tpl), '4.2 速查图片失败走候选链下一档');
expect(/feature__badge/.test(tpl) && /retry\(item, 'avatar'\)/.test(tpl) && /retry\(item, 'icon'\)/.test(tpl), '4.2 速查缺图占位与重试');
expect(/hero__frame|feature__frame/.test(tpl) && /\.feature__frame \{[\s\S]*?height: 156rpx/.test(home), '4.2 图片位固定尺寸，失败不改布局');

// ---- 4.3 / H03：去自动轮播、按钮与落地一致 ----
expect(!/autoplay/.test(tpl) && !/onBannerChange/.test(home), '4.3 首页主视觉不再自动轮播');
expect(!/立即查看/.test(tpl), '4.3 不再使用泛化「立即查看」按钮');
expect(/查看公测信息/.test(tpl) && /go\('\/pages\/about\/about'\)/.test(tpl), '4.3 主视觉按钮文案与落地路径配对');
// 4.8 起标题 / 日期 / 范围 / 出处由 utils/release-event.js 的内容配置驱动，模板只做绑定
const releaseEvent = read('src/utils/release-event.js');
expect(/公测信息/.test(tpl) && /\{\{ releaseState\.title \}\}/.test(tpl) && /\{\{ releaseState\.tag \}\}/.test(tpl), '4.3 / 4.8 主视觉标题、范围与按钮指向同一公测事件');
expect(/title: '11 月 26 日正式公测'/.test(releaseEvent) && /day: '2026-11-26'/.test(releaseEvent), '4.8 事件日期与标题由单一内容配置提供');
const about = read('src/pages/about/about.vue');
expect(/公测 11 月 26 日/.test(about), '4.3 落地页含公测日期标签（静态证据，不等于完整专题承接）');
expect(!/class="countdown/.test(tpl) && !/订阅提醒/.test(tpl), '4.3 首页倒计时条并入主视觉，未实现的订阅承诺不再出现在首页（#18 默认）');

// 4.2：新首页图片节点静态扫描。
// 注意：2.6 的 verify-image-budget.mjs 仍按「轮播 + 功能卡 hashIndex 随机配图」的旧模型统计首屏，
// 其「当前首页 23 个图片节点 / 首页主视觉无 @error」结论自 4.2 起已过时，本脚本给出新首页口径。
const imageNodes = [...tpl.matchAll(/<image\b[\s\S]*?\/>/g)].map((m) => m[0]);
const homeImageStats = {
  // 模板里两类速查各用 v-for，静态只有 3 个 <image> 节点；运行时按各 4 个对象展开为 9 个图片位
  templateNodes: imageNodes.length,
  runtimeNodes: 1 + 4 + 4,
  lazyLoadTemplates: imageNodes.filter((s) => /lazy-load/.test(s)).length,
  withErrorTemplates: imageNodes.filter((s) => /@error=/.test(s)).length,
  placeholderTemplates: (tpl.match(/feature__badge/g) || []).length,
  visualFallback: /hero__fallback/.test(tpl)
};
expect(homeImageStats.templateNodes === 3 && homeImageStats.runtimeNodes === 9, '4.2 首页模板 3 个 image 节点，v-for 展开后 9 个图片位', JSON.stringify(homeImageStats));
expect(homeImageStats.lazyLoadTemplates === 2 && homeImageStats.withErrorTemplates === 3, '4.2 速查模板懒加载、全部图片模板有失败回退', JSON.stringify(homeImageStats));
expect(homeImageStats.placeholderTemplates === 2 && homeImageStats.visualFallback, '4.2 缺图占位与主视觉文字卡回退覆盖全部图片位');

// ---- 数据实算：速查对象、映射与 URL 候选链（静态，不联网） ----
const tmpDir = mkdtempSync(join(tmpdir(), 'qbxzs-stage4-'));
const requireFromRoot = createRequire(join(root, 'noop.cjs'));
function bundle(entry, name) {
  const out = join(tmpDir, `${name}.cjs`);
  buildSync({ entryPoints: [join(root, entry)], bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'silent' });
  return requireFromRoot(out);
}
let stats = {};
try {
  const catalog = bundle('src/data/catalog.js', 'catalog').bundledCatalog;
  const view = bundle('src/utils/catalog-view.js', 'catalog-view');
  const site = bundle('src/data/site-images.js', 'site-images');
  const idsOf = (key) => {
    const match = home.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
    return match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  };
  const featured = { character: idsOf('character'), qibo: idsOf('qibo') };
  expect(featured.character.length === 4 && featured.qibo.length === 4, '4.1 角色/奇波速查清单各 4 个', `character=${featured.character.length} qibo=${featured.qibo.length}`);
  const plan = [
    { key: 'character', table: 'charWiki', role: 'avatar' },
    { key: 'qibo', table: 'qiboWiki', role: 'icon' }
  ];
  const detail = [];
  for (const { key, table, role } of plan) {
    const official = view.officialItems(catalog[key].items || []);
    for (const id of featured[key]) {
      const item = official.find((entry) => entry.id === id);
      const index = site.imageFileIndex(table, id, role);
      const sources = item ? site.imageSources(table, id, role, item.icon || '', {}) : [];
      const ok = Boolean(item) && index >= 0 && sources.length > 0;
      detail.push({ key, id, name: item ? item.name : '', mapped: index >= 0, sources: sources.length, official: Boolean(item) });
      expect(ok, `4.2 [${key}] ${id} 正式条目 + ${role} 用途映射 + 候选链齐备`, item ? `${item.name} / fileIndex=${index} / sources=${sources.length}` : '未找到正式条目');
    }
  }
  const kv = site.keyVisualSources();
  expect(kv.length >= 1 && /480px-/.test(kv[0]), '4.2 主视觉候选链首个地址为 480px 变体直链', kv[0] || '');
  expect(kv.length >= 2 && /Special:Redirect\/file/.test(kv[1] || ''), '4.2 主视觉候选链含站点按需生成回退');
  stats = { featured, detail, keyVisual: kv, homeImageStats, catalogCounts: { character: catalog.character.items.length, qibo: catalog.qibo.items.length } };
} catch (error) {
  expect(false, '阶段 4 数据实算可执行', error.message);
}

// ---- 构建产物锚点（仍属静态检查，不是运行/视觉/交互验证） ----
const DIST = 'dist/build/mp-weixin';
const distWxml = read(`${DIST}/pages/index/index.wxml`);
if (distWxml) {
  expect(/角色速查/.test(distWxml) && /奇波速查/.test(distWxml), '[产物] 两类速查进入首页 wxml');
  expect(/查看公测信息/.test(distWxml), '[产物] 主视觉按钮文案进入 wxml');
  expect(!/立即查看/.test(distWxml), '[产物] 首页 wxml 无「立即查看」');
  expect(/bindclear=/.test(distWxml), '[产物] 首页 clear 事件绑定仍在（3.4 回归）');
  const distWxss = read(`${DIST}/pages/index/index.wxss`);
  expect(/hero__media/.test(distWxss) && /feature__frame/.test(distWxss), '[产物] 主视觉与速查样式进入 wxss');
} else {
  console.log('ℹ 未发现 dist/build/mp-weixin 首页产物，跳过构建产物锚点检查');
}

// ---- 输出 ----
for (const check of checks) console.log(`${check.ok ? '✔' : '✖'} ${check.label}${check.detail ? ` · ${check.detail}` : ''}`);
mkdirSync(join(root, '.tmp'), { recursive: true });
const outFile = join(root, '.tmp', 'stage4-verify.json');
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'static-code-and-data-only',
  passed: checks.length - failed,
  total: checks.length,
  failed,
  stats,
  checks
}, null, 2));
console.log(`\n阶段 4 静态核验：${checks.length - failed}/${checks.length} 通过；产物 ${outFile.replaceAll('\\', '/')}`);
console.log('注意：以上仅为静态代码检查与数据口径断言；H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 均「未能验证」。');
console.log('注意：2.6 的 verify-image-budget.mjs 首屏统计仍按旧 hashIndex 模型，其「当前首页」结论自 4.2 起已过时，需后续轮次修订后再作预算依据。');
if (failed) process.exit(1);
