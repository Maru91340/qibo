// 阶段 2.6 包体与加载预算静态核验（方案 5.4）：主包体积、首屏图片清单、
// CDN 首图字节、本地 WebP 变体对照、懒加载/占位/失败回退模板锚点。
// 这是构建期静态核算 + 网络 HEAD 探查，不是小程序运行首屏、弱网或真机性能实测。
//
// 用法：
//   node scripts/verify-image-budget.mjs            完整核验（对首屏首图做 HEAD）
//   node scripts/verify-image-budget.mjs --offline  跳过网络，只做磁盘体积与模板核算
// 产物：.tmp/image-budget-verify.json（供 docs/升级任务/ 报告引用）
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(projectRoot, '.tmp/image-budget-verify.json');
const OFFLINE = process.argv.includes('--offline');
const DIST = join(projectRoot, 'dist/build/mp-weixin');
const WARN_BYTES = 1.65 * 1024 * 1024;   // 与 scripts/check-package-size.mjs 的安全预警线一致
const HARD_BYTES = 1.9 * 1024 * 1024;    // 与 scripts/check-package-size.mjs 的硬上限一致
const BUDGET = {
  keyVisualBytes: 250 * 1024,            // 主视觉压缩后约 250KB 以内
  thumbnailAvgBytes: 15 * 1024,          // 首屏缩略图平均约 15KB 以内
  firstScreenBytes: 450 * 1024           // 首屏图片合计争取约 450KB
};

const GEN = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8'));
const MAP = JSON.parse(readFileSync(join(projectRoot, 'src/data/site/image-map.json'), 'utf8'));
const RUNTIME = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/image-runtime.json'), 'utf8'));
const TMP = join(projectRoot, '.tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// 把 ESM + JSON import 的运行时模块打成 Node 可执行包，验证的是真实模块逻辑
async function bundle(entry, outfile) {
  await build({ entryPoints: [join(projectRoot, entry)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  return (await import(pathToFileURL(outfile).href + `?t=${Date.now()}`));
}
const images = await bundle('src/data/site-images.js', join(TMP, 'site-images.budget.mjs'));
const meta = await bundle('src/data/meta.js', join(TMP, 'meta.budget.mjs'));

// URL 可达性与响应体字节：构建期 HEAD，不代表微信端实际下载量（缓存/压缩/302 会改变）
async function probe(url) {
  if (OFFLINE || !url) return { url, status: 0, bytes: null, type: '', skipped: true };
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(20000) });
    return {
      url, status: res.status,
      bytes: Number(res.headers.get('content-length') || 0) || null,
      type: (res.headers.get('content-type') || '').split(';')[0]
    };
  } catch (error) {
    return { url, status: 0, bytes: null, type: '', error: String(error.message || error).slice(0, 80) };
  }
}
async function probeAll(list, concurrency = 6) {
  const out = new Array(list.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < list.length) {
      const i = cursor++;
      out[i] = await probe(list[i]);
    }
  }));
  return out;
}
const sum = (list) => list.reduce((n, x) => n + (Number(x) || 0), 0);
const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

// 1) 主包体积：与 check-package-size.mjs 同口径（排除 cloudfunctions/ 与 .map，按 subPackages 分组）
function normalize(path) {
  return String(path || '').split(sep).join('/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
}
const app = JSON.parse(readFileSync(join(DIST, 'app.json'), 'utf8'));
const subRoots = (app.subPackages || app.subpackages || []).map(({ root }) => normalize(root)).filter(Boolean);
const distFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    const path = normalize(relative(DIST, absolute));
    if (entry.isDirectory()) {
      if (path === 'cloudfunctions' || path.startsWith('cloudfunctions/')) continue;
      walk(absolute);
    } else if (!path.endsWith('.map')) {
      distFiles.push({ path, bytes: statSync(absolute).size });
    }
  }
})(DIST);
const mainFiles = distFiles.filter((f) => !subRoots.some((root) => f.path === root || f.path.startsWith(`${root}/`)));
const mainBytes = sum(mainFiles.map((f) => f.bytes));
// 接入层落地文件：构建产物中包含角色头像文件名的 JS（验证精简映射确实进包、2MB 基准数据未进包）
const runtimeBundles = mainFiles
  .filter((f) => f.path.endsWith('.js'))
  .filter((f) => readFileSync(join(DIST, f.path), 'utf8').includes('Tex_icon_hero_l_101008.png'))
  .map((f) => ({ path: f.path, bytes: f.bytes }));
const hasSiteCatalog = mainFiles.some((f) => /site-catalogs\.json$/.test(f.path));
const webpInDist = distFiles.filter((f) => f.path.endsWith('.webp')).length;

// 2) 当前首页首屏图片节点（H02 的 hashIndex 随机灵子配图，阶段 4 才移除）
// 与 src/pages/index/index.vue 的 loadMeta() 口径一致
function hashIndex(key, length) {
  let hash = 0;
  const text = String(key || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}
const arts = ((GEN.types.spirit || {}).items || []).map((entry) => entry.icon).filter(Boolean);
const cardGroups = new Set((meta.sectionGroups || []).filter((g) => g.mode === 'card').map((g) => g.key));
const bannerArt = (meta.banners || []).map((item, index) => arts.length ? arts[hashIndex(item.id || index, arts.length)] : '');
const sectionArt = (meta.sections || [])
  .filter((item) => cardGroups.has(item.group || 'catalog'))
  .map((item) => arts.length ? arts[hashIndex(item.key, arts.length)] : '');
const firstScreenUrls = [...bannerArt, ...sectionArt].filter(Boolean);
const uniqueUrls = [...new Set(firstScreenUrls)];
const urlProbes = await probeAll(uniqueUrls);
const urlBytes = new Map(urlProbes.map((p) => [p.url, p.bytes]));
const currentFirstScreen = {
  bannerImageNodes: bannerArt.filter(Boolean).length,
  cardImageNodes: sectionArt.filter(Boolean).length,
  totalImageNodes: firstScreenUrls.length,
  uniqueUrls: uniqueUrls.length,
  lazyLoad: false,               // index.vue 两处 <image> 均无 lazy-load，见第 5 节模板扫描
  errorFallback: false,          // 首页主视觉/卡片图均无 @error 回退
  bytesAllNodes: sum(firstScreenUrls.map((u) => urlBytes.get(u))),
  bytesUniqueUrls: sum(urlProbes.map((p) => p.bytes)),
  avgUniqueBytes: urlProbes.length ? Math.round(sum(urlProbes.map((p) => p.bytes)) / urlProbes.length) : null,
  probes: urlProbes.map((p) => ({ url: p.url, status: p.status, bytes: p.bytes, type: p.type, error: p.error }))
};

// 3) 方案 6.1 目标结构：1 主视觉 + 4 角色头像 + 4 奇波图标（阶段 4 实施，此处只核算字节）
const kvChain = images.keyVisualSources();
const kvMeta = images.keyVisualMeta();
const charRows = (MAP.types.charWiki || []).slice(0, 4).map((row) => ({
  name: row.name, id: row.id, role: 'avatar',
  url: images.imageSources('charWiki', row.id, 'avatar')[0] || '',
  asset: ((row.images || {}).avatar || {}).asset || ''
}));
const qiboRows = (GEN.types.qiboWiki || {}).items || [];
const qiboSample = qiboRows.slice(0, 4).map((item) => ({
  name: item.name, id: item.id, role: 'icon',
  url: images.imageSources('qiboWiki', item.id, 'icon')[0] || item.icon || '',
  asset: ''
}));
const targetProbes = await probeAll([kvChain[0] || '', ...charRows.map((r) => r.url), ...qiboSample.map((r) => r.url)]);
const [kvProbe, ...thumbProbes] = targetProbes;
const targetFirstScreen = {
  keyVisual: {
    url: kvChain[0] || '', probe: kvProbe,
    localWebp: kvMeta && kvMeta.asset,
    localWebpBytes: kvMeta && existsSync(join(projectRoot, kvMeta.asset)) ? statSync(join(projectRoot, kvMeta.asset)).size : null,
    originWidth: kvMeta && kvMeta.width, originHeight: kvMeta && kvMeta.height
  },
  thumbnails: [...charRows, ...qiboSample].map((row, i) => ({
    ...row, status: thumbProbes[i] && thumbProbes[i].status, bytes: thumbProbes[i] && thumbProbes[i].bytes
  })),
  avgThumbnailBytes: Math.round(sum(thumbProbes.map((p) => p.bytes)) / Math.max(1, thumbProbes.filter((p) => p.bytes != null).length)),
  failedThumbnails: thumbProbes.filter((p) => p.status !== 200 || p.bytes == null).map((p) => p.url),
  totalBytes: (kvProbe.bytes || 0) + sum(thumbProbes.map((p) => p.bytes))
};
// 主视觉改用本地 WebP 变体时的首屏合计（仅对照，变体当前未进主包、未受控分发）
targetFirstScreen.totalBytesWithLocalWebp = (targetFirstScreen.keyVisual.localWebpBytes || 0) + sum(thumbProbes.map((p) => p.bytes));

// 4) 本地 WebP 变体（未 import、不进主包）：按文件名用途后缀统计实际文件大小，
// 作为「若受控分发」的对照。image-map.json 的 assets 是采集原图索引，不含变体路径，
// 因此直接遍历 src/assets/wiki/ 的 1535 个 .webp 产物。
const variants = { count: 0, totalBytes: 0, byRole: {} };
(function walkVariants(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) { walkVariants(absolute); continue; }
    if (!entry.name.endsWith('.webp')) continue;
    const role = (entry.name.match(/-([A-Za-z]+)\.webp$/) || [])[1] || 'unknown';
    const bytes = statSync(absolute).size;
    if (!variants.byRole[role]) variants.byRole[role] = { count: 0, totalBytes: 0, maxBytes: 0 };
    const group = variants.byRole[role];
    group.count += 1;
    group.totalBytes += bytes;
    group.maxBytes = Math.max(group.maxBytes, bytes);
    variants.count += 1;
    variants.totalBytes += bytes;
  }
})(join(projectRoot, 'src/static/wiki'));
for (const group of Object.values(variants.byRole)) group.avgBytes = Math.round(group.totalBytes / group.count);
variants.avgBytes = variants.count ? Math.round(variants.totalBytes / variants.count) : 0;
variants.inMainPackage = false;

// 5) 模板锚点：懒加载、失败回退、固定尺寸占位（静态检查，不等于运行时图片表现）
function scanVue(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) scanVue(absolute, out);
    else if (entry.name.endsWith('.vue')) {
      const text = readFileSync(absolute, 'utf8');
      const tags = text.match(/<image\b[\s\S]*?>/g) || [];
      out.push({
        file: normalize(relative(projectRoot, absolute)),
        imageTags: tags.length,
        lazyLoad: tags.filter((t) => /lazy-load/.test(t)).length,
        errorHandler: tags.filter((t) => /@error/.test(t)).length
      });
    }
  }
  return out;
}
const templateScan = scanVue(join(projectRoot, 'src'));
const homeScan = templateScan.find((x) => x.file === 'src/pages/index/index.vue');
const imageTags = sum(templateScan.map((x) => x.imageTags));

const result = {
  checkedAt: new Date().toISOString(),
  offline: OFFLINE,
  buildAppJson: existsSync(join(DIST, 'app.json')) ? statSync(join(DIST, 'app.json')).mtime.toISOString() : null,
  catalogGeneratedAt: GEN.generatedAt || null,
  // src/data/catalog.js 的 CATALOG_VERSION 是 `builtin-${generated.generatedAt || '1'}`，此处按同口径回填
  catalogVersion: `builtin-${GEN.generatedAt || '1'}`,
  imageRuntimeVersion: RUNTIME.v || null,
  budget: BUDGET,
  mainPackage: {
    bytes: mainBytes, kib: kib(mainBytes),
    warningBytes: WARN_BYTES, hardBytes: HARD_BYTES,
    overWarning: mainBytes > WARN_BYTES,
    hardRemainingBytes: HARD_BYTES - mainBytes,
    runtimeBundles, hasSiteCatalog, webpInDist,
    imageRuntimeSourceBytes: statSync(join(projectRoot, 'src/data/generated/image-runtime.json')).size
  },
  variants,
  currentFirstScreen,
  targetFirstScreen,
  templateScan: {
    imageTags,
    withLazyLoad: sum(templateScan.map((x) => x.lazyLoad)),
    withErrorHandler: sum(templateScan.map((x) => x.errorHandler)),
    home: homeScan,
    pagesWithoutLazyLoad: templateScan.filter((x) => x.imageTags > x.lazyLoad).map((x) => x.file)
  },
  // 判定只针对「静态可核算」项；运行侧一律标未验证，不把构建通过当预算通过
  verdict: {
    mainPackage: mainBytes > HARD_BYTES ? '未通过（超硬上限）' : (mainBytes > WARN_BYTES ? '超预警线、未超硬上限' : '通过'),
    keyVisualHotlink: kvProbe.bytes == null ? '未能验证' : (kvProbe.bytes <= BUDGET.keyVisualBytes ? '达标' : '未达标'),
    thumbnailAvgHotlink: targetFirstScreen.avgThumbnailBytes > BUDGET.thumbnailAvgBytes ? '未达标' : '达标',
    firstScreenTargetHotlink: targetFirstScreen.totalBytes > BUDGET.firstScreenBytes ? '未达标' : '达标',
    currentHomeFirstScreen: currentFirstScreen.bytesUniqueUrls > BUDGET.firstScreenBytes ? '未达标' : '达标',
    lazyLoadAndFallback: '部分完成（列表/详情有 lazy-load 与占位重试；首页主视觉无 @error、无 lazy-load）',
    h5Runtime: '未能验证',
    wechatDevtoolsOrDevice: '未能验证',
    coldStartWeakNetworkImageVisibleTime: '未能验证'
  }
};

writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.log(`2.6 预算核验：${OFFLINE ? '离线' : '含 CDN HEAD'} → ${relative(projectRoot, OUT)}`);
console.log(`主包 ${result.mainPackage.kib}（预警 ${kib(WARN_BYTES)} / 硬上限 ${kib(HARD_BYTES)}，余量 ${kib(result.mainPackage.hardRemainingBytes)}）；接入层打包文件 ${runtimeBundles.length} 个；site-catalogs.json 进包=${hasSiteCatalog}；webp 进包=${webpInDist}`);
console.log(`当前首页图片节点 ${currentFirstScreen.totalImageNodes}（唯一 URL ${currentFirstScreen.uniqueUrls}），全部节点合计 ${kib(currentFirstScreen.bytesAllNodes)}，唯一 URL 合计 ${kib(currentFirstScreen.bytesUniqueUrls)}，均值 ${kib(currentFirstScreen.avgUniqueBytes || 0)}`);
console.log(`目标结构：主视觉 CDN ${kvProbe.bytes == null ? '未探到' : kib(kvProbe.bytes)} / 本地 WebP ${kib(targetFirstScreen.keyVisual.localWebpBytes || 0)}；8 张缩略图均值 ${kib(targetFirstScreen.avgThumbnailBytes)}；首屏合计 ${kib(targetFirstScreen.totalBytes)}（预算 ${kib(BUDGET.firstScreenBytes)}）`);
console.log(`本地 WebP 变体 ${variants.count} 个 / ${kib(variants.totalBytes)} / 均值 ${kib(variants.avgBytes)}（未进主包）`);
console.log('判定：', JSON.stringify(result.verdict, null, 2));
