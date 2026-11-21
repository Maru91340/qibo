// 轮次 12（2026-11-17）图片本地化：从 src/data/site/image-map.json（仅构建期读取，不进包）
// 生成精简本地原图索引 src/data/generated/wiki-runtime.json。
// 运行时 site-images.js 把「类型+条目id+用途」解析为 /static/wiki/<分类>/<文件名> 本地候选，
// 作为候选链第一优先；微信端产物不含图库（scripts/prune-package-assets.mjs 剥离 + vite 插件置空索引）。
// 运行数据 image-map.json 由 scripts/sync-site-data.mjs 采集生成，图库由 scripts/build-site-images.mjs 转出 WebP。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_FILE = join(projectRoot, 'src', 'data', 'site', 'image-map.json');
const QIBO_INDEX_FILE = join(projectRoot, 'src', 'data', 'generated', 'qibo-index.js');
const OUT_FILE = join(projectRoot, 'src', 'data', 'generated', 'wiki-runtime.json');
// image-map.json 的 asset 字段前缀，剥掉后即「分类/文件名」相对路径（运行时拼 /static/wiki/）
const ASSET_PREFIX = 'src/assets/wiki/';

const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
// 奇波列表按 CBT3 编号重建条目（id: qibo-<wikiId>），但少数 BWIKI 条目没有 wikiId。
// 从 qibo-index.js 反向补唯一名称的编号别名，避免如「糖啾啾」直接回退 CBT3 外链。
const rawIndexMatch = readFileSync(QIBO_INDEX_FILE, 'utf8').match(/const rawIndex = `([\s\S]*?)`;/);
const qiboIdsByName = new Map();
if (rawIndexMatch) {
  for (const line of rawIndexMatch[1].split('\n')) {
    const [wikiId, , , name] = line.split('|');
    if (!wikiId || !name) continue;
    const list = qiboIdsByName.get(name) || [];
    list.push(wikiId);
    qiboIdsByName.set(name, list);
  }
}
// 轮次 12c：BWIKI 映射中这 11 个条目的 wikiId/头像错误或缺失，不能套用 500001 的图。
// 补图逐张由人工核对后上传至云存储 images/qibo-cbt3/<id>.png；仅覆盖列表 ID 的 icon 槽位。
const QIBO_CBT3_CLOUD_PATCH_IDS = [
  '500002', '500007', '500020', '500021', '500022', '500023',
  '500025', '500026', '500046', '500123', '500297'
];
const QIBO_CBT3_PATCH_PREFIX = 'qibo-cbt3/';
const types = {};
let slots = 0;
let entries = 0;

for (const [type, list] of Object.entries(map.types || {})) {
  if (!Array.isArray(list)) continue;
  const table = {};
  for (const entry of list) {
    const images = entry.images || {};
    const slotsMap = {};
    for (const [role, meta] of Object.entries(images)) {
      const asset = typeof meta === 'object' && meta && meta.asset;
      if (!asset || !asset.startsWith(ASSET_PREFIX)) continue;
      slotsMap[role] = asset.slice(ASSET_PREFIX.length);
      slots += 1;
    }
    if (!Object.keys(slotsMap).length) continue;
    table[entry.id] = slotsMap;
    entries += 1;
    // 奇波列表页（pages/qibo/list.vue）以 CBT3 编号骨架重建条目，id 形态为 `qibo-<wikiId>`；
    // 原生 `qi-xxx` 仅用于详情路由（detailId）。优先用 BWIKI wikiId，缺失时按唯一名称回查 CBT3 索引。
    if (type === 'qiboWiki') {
      const ids = entry.wikiId ? [entry.wikiId] : (qiboIdsByName.get(entry.name) || []);
      for (const wikiId of ids) table[`qibo-${wikiId}`] = slotsMap;
    }
  }
  if (Object.keys(table).length) types[type] = table;
}

// 仅对奇波列表的 CBT3 编号 ID 注入云补图。使用独立前缀让运行时选择
// CLOUD_QIBO_CBT3_BASE，而不是错误地拼入 images/wiki/。
const qiboTable = types.qiboWiki || (types.qiboWiki = {});
for (const petId of QIBO_CBT3_CLOUD_PATCH_IDS) {
  const key = `qibo-${petId}`;
  qiboTable[key] = { ...(qiboTable[key] || {}), icon: `${QIBO_CBT3_PATCH_PREFIX}${petId}.png` };
}

const out = { v: map.generatedAt || '', types };
// 顶层公测主视觉（首页横幅）：同样剥成相对路径，keyVisualSources 本地第一优先
if (map.keyVisual && typeof map.keyVisual.asset === 'string' && map.keyVisual.asset.startsWith(ASSET_PREFIX)) {
  out.keyVisual = map.keyVisual.asset.slice(ASSET_PREFIX.length);
}
writeFileSync(OUT_FILE, JSON.stringify(out), 'utf8');
const bytes = Buffer.byteLength(JSON.stringify(out));
console.log(`✔ wiki-runtime.json：${entries} 条目 / ${slots} 槽位 / ${(bytes / 1024).toFixed(1)} KiB（gzip 内联后更小）`);
