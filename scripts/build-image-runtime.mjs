// 阶段 2.1：由站点图片映射表生成「精简运行时映射」。
// 输入：src/data/site/image-map.json（仅构建期读取，绝不进入小程序包）
// 输出：src/data/generated/image-runtime.json（紧凑索引，供 src/data/site-images.js 运行时拼热链）
//
// 用法：
//   node scripts/build-image-runtime.mjs                 本阶段白名单（角色/奇波/攻略/主视觉）
//   node scripts/build-image-runtime.mjs --full-icons   追加其余类型的 icon（阶段 2.4 用，包体明显变大）
//
// 设计约束（升级任务_接续记录.md 第 4.6 节）：
//   1. 绝不 import 2.1MB 的 site-catalogs.json，也不引用 src/assets/wiki 下 1535 张 WebP；
//   2. 默认维持 BWIKI 缩略图热链，catalog.js 的 icon 字段原样保留，不改 seed 修订号与缓存版本；
//   3. 产物只存「文件哈希路径 + 原文件名」，宽度在运行时按用途拼装，避免把完整 URL 重复写进主包。
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = join(projectRoot, 'src/data/site');
const MAP_FILE = join(SITE_DIR, 'image-map.json');
const OUT_FILE = join(projectRoot, 'src/data/generated/image-runtime.json');
const FULL_ICONS = process.argv.includes('--full-icons');

// 用途 → 单字符键，尽量压小运行时映射体积
const ROLE_CODE = {
  icon: 'i', avatar: 'a', art: 'r', portraitM: 'm', circle: 'o',
  card: 'c', poster: 'p', keyVisual: 'k'
};
// 本阶段接入范围：只接无法从现有 icon 推导出用途的图片（阶段 2.1–2.3）
const SCOPE = {
  charWiki: ['icon', 'avatar', 'art', 'portraitM', 'circle'],
  qiboWiki: ['icon', 'card'],
  guideWiki: ['poster']
};
// 其余类型沿用原有 icon 热链；--full-icons 时为「站点有图但内置无图」的条目补 icon
const OTHER_TYPES = ['spirit', 'item', 'book', 'equipment', 'food', 'building', 'achievement', 'material', 'fishing'];

function hashPathOf(originUrl) {
  const m = String(originUrl || '').match(/\/images\/ap\/([0-9a-f]\/[0-9a-f]{2}\/[^/?#]+)$/i);
  return m ? m[1] : '';
}
function fileNameOf(entry) {
  return String(entry.sourceFile || '').split('/').pop() || '';
}

function main() {
  if (!existsSync(MAP_FILE)) {
    console.error('✖ 缺少 image-map.json，请先执行 node scripts/sync-site-data.mjs --offline');
    process.exitCode = 1;
    return;
  }
  const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
  const generated = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8'));

  // 文件池：同一原图被多个用途复用时只存一次
  const pool = [];
  const poolIndex = new Map();
  const types = {};
  const degradedArt = [];
  const missingAssets = [];
  let refs = 0;
  let skipped = 0;

  function addFile(entry) {
    const hashPath = hashPathOf(entry.originUrl);
    const fileName = fileNameOf(entry);
    if (!hashPath || !fileName) return -1;
    const variantWidth = Number(entry.variantWidth) || Number(entry.width) || 0;
    if (poolIndex.has(hashPath)) {
      const index = poolIndex.get(hashPath);
      // 同一原图被多个用途复用时取最大变体宽度，避免 narrow 用途把详情大图限死
      pool[index][2] = Math.max(Number(pool[index][2]) || 0, variantWidth);
      return index;
    }
    const index = pool.length;
    // 第三项是该原图可用变体宽度上限：运行时按用途宽度取 min，防止请求超过原图尺寸的缩略图
    pool.push([hashPath, fileName, variantWidth]);
    poolIndex.set(hashPath, index);
    return index;
  }
  function checkAsset(entry, type, id, role) {
    if (entry.asset && !existsSync(join(projectRoot, entry.asset))) missingAssets.push(`${type}/${id}/${role}`);
  }
  function put(type, id, role, entry) {
    const index = addFile(entry);
    if (index < 0) { skipped += 1; return; }
    checkAsset(entry, type, id, role);
    if (!types[type]) types[type] = {};
    if (!types[type][id]) types[type][id] = {};
    types[type][id][ROLE_CODE[role]] = index;
    refs += 1;
  }

  for (const [type, roles] of Object.entries(SCOPE)) {
    for (const row of map.types[type] || []) {
      const images = row.images || {};
      for (const role of roles) {
        if (images[role]) put(type, row.id, role, images[role]);
      }
      // 源千代（104001）站点无 hero_get 获得立绘：详情 art 降级用中号头像，不用错图冒充
      if (type === 'charWiki' && !images.art && images.portraitM) {
        put(type, row.id, 'art', images.portraitM);
        degradedArt.push(`${row.wikiId} ${row.name}`);
      }
    }
  }

  if (FULL_ICONS) {
    for (const type of OTHER_TYPES) {
      const byId = new Map(((generated.types || {})[type] || {}).items.map((item) => [item.id, item]));
      for (const row of map.types[type] || []) {
        const builtin = byId.get(row.id);
        if (builtin && builtin.icon) continue;
        if (row.images && row.images.icon) put(type, row.id, 'icon', row.images.icon);
      }
    }
  }

  let keyVisual = null;
  if (map.keyVisual) {
    const index = addFile(map.keyVisual);
    if (index >= 0) {
      keyVisual = {
        f: index,
        w: Number(map.keyVisual.width) || 0,
        h: Number(map.keyVisual.height) || 0,
        asset: map.keyVisual.asset || '',
        source: map.keyVisual.originUrl || ''
      };
      checkAsset(map.keyVisual, 'keyVisual', 'public-beta', 'keyVisual');
    }
  }

  const payload = {
    v: map.generatedAt || '',
    cdn: 'https://patchwiki.biligame.com/images/ap/',
    // f: [原图哈希路径, 原文件名]；运行时按用途宽度拼 thumb/<hash>/<N>px-<name>
    f: pool,
    k: keyVisual,
    // t: 类型 → 条目 id → 用途键 → f 下标
    t: types
  };
  writeFileSync(OUT_FILE, JSON.stringify(payload));
  const bytes = statSync(OUT_FILE).size;
  console.log(`✔ ${OUT_FILE.replace(projectRoot + '\\', '')}`);
  console.log(`  版本 ${payload.v}｜文件池 ${pool.length}｜引用 ${refs} 条｜跳过无源 ${skipped} 条`);
  for (const [type, rows] of Object.entries(types)) {
    console.log(`  ${type}: ${Object.keys(rows).length} 个条目`);
  }
  console.log(`  映射体积 ${(bytes / 1024).toFixed(1)} KiB（主包硬上限余量以 npm run check:size 为准）`);
  if (degradedArt.length) console.log(`  ⚠ art 降级（站点无 hero_get）：${degradedArt.join('、')}`);
  if (missingAssets.length) console.log(`  ⚠ 本地 WebP 变体缺失 ${missingAssets.length} 处，首 5 个：${missingAssets.slice(0, 5).join(', ')}`);
}

main();
