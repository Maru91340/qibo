// 阶段 2.4 / 2.5 静态核验：用途与宽度候选链、6 类图标覆盖、缺图回退锚点、CDN 抽样可达性。
// 这是「静态代码 / 数据 / URL 可达性检查」，不是小程序运行界面、视觉或交互验证。
// 用法：node scripts/verify-image-fallback.mjs   → 产物 .tmp/image-fallback-verify.json
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(projectRoot, '.tmp');
const BUNDLE = join(TMP, 'site-images-round3.bundle.mjs');
const OUT = join(TMP, 'image-fallback-verify.json');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const GEN = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8'));
const MAP = JSON.parse(readFileSync(join(projectRoot, 'src/data/site/image-map.json'), 'utf8'));
const RUNTIME = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/image-runtime.json'), 'utf8'));

// 加载真实运行时模块（JSON 由 esbuild 内联），验证的是页面实际会调用的逻辑
await build({
  entryPoints: [join(projectRoot, 'src/data/site-images.js')],
  bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, logLevel: 'silent'
});
const mod = await import(pathToFileURL(BUNDLE).href + `?t=${Date.now()}`);

const CATALOG_TYPES = ['item', 'spirit', 'equipment', 'food', 'book'];
const result = {
  checkedAt: new Date().toISOString(),
  runtimeVersion: mod.IMAGE_RUNTIME_VERSION,
  runtimeMapBytes: RUNTIME.f.length,
  coverage: [],
  widthChains: [],
  posterChains: [],
  missing: {},
  templateAnchors: [],
  urlProbes: []
};

// 1) 6 类用途覆盖：内置运行数据 icon 与站点 images.icon / images.poster
for (const type of [...CATALOG_TYPES, 'guideWiki']) {
  const items = ((GEN.types || {})[type] || {}).items || [];
  const siteRows = (MAP.types || {})[type] || [];
  const withIcon = items.filter((x) => x.icon).length;
  const siteIcon = siteRows.filter((x) => x.images && x.images.icon).length;
  const sitePoster = siteRows.filter((x) => x.images && x.images.poster).length;
  result.coverage.push({ type, builtin: items.length, withIcon, missingIcon: items.length - withIcon, siteRows: siteRows.length, siteIcon, sitePoster });
}
// 站点与内置均无图的类型，单独记录（2.5 统一首字占位的对象）
for (const type of ['achievement', 'fishing']) {
  const items = ((GEN.types || {})[type] || {}).items || [];
  const siteRows = (MAP.types || {})[type] || [];
  result.missing[type] = {
    builtin: items.length,
    builtinNoIcon: items.filter((x) => !x.icon).length,
    siteRows: siteRows.length,
    siteWithImage: siteRows.filter((x) => Object.keys(x.images || {}).length).length
  };
}

// 2) 用途/宽度候选链：图鉴详情 240px → 站点按需生成 → 原 icon；列表沿用原宽度。
// 攻略长图不进入通用图鉴详情，其 poster 用途在第 3 部分单独核验。
for (const type of CATALOG_TYPES) {
  const sample = (((GEN.types || {})[type] || {}).items || []).find((x) => x.icon);
  if (!sample) continue;
  const detail = mod.imageSources(type, sample.id, 'icon', sample.icon, { widths: [240, 120], legacyWidths: [240] });
  const list = mod.imageSources(type, sample.id, 'icon', sample.icon, { widths: [120], preferMapped: false });
  result.widthChains.push({
    type, id: sample.id,
    detail,
    detailOk: detail[0].includes('/240px-') && detail[detail.length - 1] === sample.icon,
    list,
    listOk: list.length === 1 && list[0] === sample.icon
  });
}
// 3) 攻略长图只作 poster：22 条逐一核对首图是否为 480px poster 缩略图
for (const row of MAP.types.guideWiki || []) {
  const builtin = (((GEN.types || {}).guideWiki || {}).items || []).find((x) => x.id === row.id);
  const chain = mod.imageSources('guideWiki', row.id, 'poster', builtin ? builtin.icon : '', { widths: [480, 240] });
  result.posterChains.push({
    id: row.id, name: row.name,
    posterFile: (row.images.poster || {}).sourceFile || '',
    first: chain[0] || '',
    ok: /\/480px-/.test(chain[0] || '')
  });
}

// 4) 缺图回退与重试：模板/脚本锚点静态检查（不代替点击测试）
const ANCHORS = {
  'src/components/catalog-list/catalog-list.vue': ['imageSrc(item)', 'onImageError(item)', 'onImageRetry(item)', 'entry-card__badge--fallback', 'mode="aspectFit"'],
  'src/components/catalog-detail/catalog-detail.vue': ['detailSrc', 'onDetailRetry', 'onRelatedRetry', 'head__dot--fallback', 'legacyWidths: [240]'],
  'src/components/content-list/content-list.vue': ['isPoster(item)', 'onCoverError(item)', 'onCoverRetry(item)', 'content-card__glyph--fallback'],
  'src/components/content-detail/content-detail.vue': ['section-image--fallback', 'onImageRetry', 'imageNonce'],
  'src/pages/character/detail.vue': ['guide-poster--fallback', 'onPosterRetry', 'previewPoster']
};
for (const [file, needles] of Object.entries(ANCHORS)) {
  const source = readFileSync(join(projectRoot, file), 'utf8');
  const absent = needles.filter((needle) => !source.includes(needle));
  result.templateAnchors.push({ file, checked: needles.length, absent });
}

// 5) CDN 抽样：详情 240px 直链与原 120px 直链的 HTTP 状态/字节（仅构建期探查）
async function probe(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(12000) });
    return { status: res.status, bytes: Number(res.headers.get('content-length') || 0) };
  } catch (error) {
    return { status: 0, bytes: 0, error: String(error.message || error).slice(0, 60) };
  }
}
const probes = result.widthChains.slice(0, 5).flatMap((entry) => [
  { label: `${entry.type}/240px`, url: entry.detail[0] },
  { label: `${entry.type}/legacy`, url: entry.list[0] }
]);
await Promise.all(probes.map(async (item) => {
  result.urlProbes.push({ label: item.label, url: item.url, ...(await probe(item.url)) });
}));

writeFileSync(OUT, JSON.stringify(result, null, 2));
const coverageOk = result.coverage.every((x) => x.withIcon === x.builtin);
const chainOk = result.widthChains.every((x) => x.detailOk && x.listOk);
const posterOk = result.posterChains.filter((x) => x.ok).length;
const anchorsOk = result.templateAnchors.every((x) => !x.absent.length);
console.log(`映射版本 ${result.runtimeVersion}｜文件池 ${result.runtimeMapBytes}（本轮未扩展）`);
console.log(`6 类内置 icon 全覆盖：${coverageOk}；宽度候选链：${chainOk}（${result.widthChains.length} 类抽验）`);
console.log(`攻略 poster 480px 首图：${posterOk}/${result.posterChains.length}`);
console.log(`缺图回退/重试锚点齐全：${anchorsOk}`);
console.log(`无图占位对象：achievement ${result.missing.achievement.builtinNoIcon} 条 / fishing ${result.missing.fishing.builtinNoIcon} 条`);
for (const p of result.urlProbes) console.log(`  ${p.label.padEnd(18)} HTTP ${p.status}  ${p.bytes} B`);
console.log(`✔ ${OUT.replace(projectRoot + '\\', '')}`);
if (!coverageOk || !chainOk || posterOk !== result.posterChains.length || !anchorsOk) process.exitCode = 1;
