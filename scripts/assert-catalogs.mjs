// 数据完整性断言：数量目标 + 必需字段 + 图片 URL 抽查
// 用法：node scripts/assert-catalogs.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/generated/catalogs.json'), 'utf8'));
const types = data.types || {};

const TARGETS = {
  charWiki: 24, qiboWiki: 205, fishing: 53, achievement: 144,
  food: 249, equipment: 143, building: 34, spirit: 75,
  item: 900, book: 50
};
const REQUIRED = ['id', 'name', 'category'];

const problems = [];
const report = [];
// P1-0：内置回退子集守门断言（云端全量与内置子集分离）
// R3-3：spirit/item/material/equipment/food/building/fishing 保留紧凑 icon 相对路径（catalog.js 运行时还原）
const SLIM_COMPACT_ICON = ['spirit', 'item', 'material', 'equipment', 'food', 'building', 'fishing'];
{
  const slim = JSON.parse(readFileSync(join(root, 'src/data/generated/catalogs-bundled.json'), 'utf8'));
  const slimTypes = slim.types || {};
  const slimItem = (slimTypes.item || {}).items || [];
  if (slimItem.length > 400) problems.push('内置子集 item 超 400 条');
  if (slimItem.length < 300) problems.push('内置子集 item 过少');
  if (slimItem.some((i) => i.icon && i.icon.startsWith('http'))) problems.push('内置子集 item icon 未紧凑化（含完整 URL）');
  if (slimItem.filter((i) => i.icon).length < 300) problems.push('内置子集 item icon 覆盖不足 300');
  for (const type of SLIM_COMPACT_ICON) {
    const items = (slimTypes[type] || {}).items || [];
    const withIcon = items.filter((i) => i.icon).length;
    if (withIcon < items.length * 0.5) problems.push(`内置子集 ${type} icon 覆盖率 <50%（${withIcon}/${items.length}）`);
    if (items.some((i) => i.icon && i.icon.startsWith('http'))) problems.push(`内置子集 ${type} icon 未紧凑化`);
  }
  if (((slimTypes.guideWiki || {}).items || []).length < 20) problems.push('内置子集 guideWiki 缺失');
  if (((slimTypes.book || {}).items || []).length < 50) problems.push('内置子集 book 缺失');
  const iconStat = SLIM_COMPACT_ICON.map((type) => {
    const items = (slimTypes[type] || {}).items || [];
    return `${type} ${items.filter((i) => i.icon).length}/${items.length}`;
  }).join(' · ');
  report.push(`✔ 内置子集: item ${slimItem.length} / guideWiki ${((slimTypes.guideWiki || {}).items || []).length} / book ${((slimTypes.book || {}).items || []).length}`);
  report.push(`✔ 内置子集紧凑 icon: ${iconStat}（catalog.js 运行时还原热链）`);
}

for (const [type, min] of Object.entries(TARGETS)) {
  const items = (types[type] || {}).items || [];
  const ok = items.length >= min;
  report.push(`${ok ? '✔' : '✖'} ${type}: ${items.length} 条（目标 ≥${min}）`);
  if (!ok) problems.push(`${type} 数量 ${items.length} < ${min}`);
  items.forEach((item, idx) => {
    for (const field of REQUIRED) {
      if (!item[field]) problems.push(`${type}[${idx}] 缺 ${field}`);
    }
  });
}

// P3-3：地图点位数据守门断言（BWIKI Data:Map 采集，与竞品 6139 同源）
{
  const mapData = JSON.parse(readFileSync(join(root, 'src/data/generated/map-points.json'), 'utf8'));
  if ((mapData.total || 0) < 11000) problems.push(`地图点位过少：${mapData.total}`);
  if ((mapData.regions || []).length < 2) problems.push('地图点位区域缺失');
  const xysg = (mapData.regions || []).find((r) => r.code === 'xysg');
  const xysgCount = xysg ? xysg.types.reduce((sum, t) => sum + t.points.length, 0) : 0;
  if (xysgCount !== 6139) problems.push(`新芽山谷点位异常：${xysgCount}（应 6139）`);
  report.push(`✔ 地图点位: ${mapData.total}（新芽山谷 ${xysgCount} / 共 ${(mapData.regions || []).length} 区域）`);
}

// 星裔/熔焰烬龙/祛影之翼 竞品补充在 manual-catalogs.js（运行时与 generated 合并）
const manualSrc = readFileSync(join(root, 'src/data/manual-catalogs.js'), 'utf8');
const catalogSrc = readFileSync(join(root, 'src/data/catalog.js'), 'utf8');
for (const name of ['星裔（女）', '星裔（男）', '熔焰烬龙', '祛影之翼']) {
  if (!manualSrc.includes(name)) problems.push(`manual-catalogs 缺竞品补充 ${name}`);
}
if (!catalogSrc.includes('characterSupplement.items')) problems.push('catalog.js 未合并 characterSupplement');
if (!catalogSrc.includes('qiboSupplement.items')) problems.push('catalog.js 未合并 qiboSupplement');

// 元素表：10 元素 + 无
const elementSrc = readFileSync(join(root, 'src/data/element.js'), 'utf8');
const elementKeys = [...elementSrc.matchAll(/key: '([a-z]+)'/g)].map((m) => m[1]);
for (const key of ['flame','wind','earth','grove','frost','flow','bolt','astral','dark','none']) {
  if (!elementKeys.includes(key)) problems.push(`元素表缺 ${key}`);
}

// 壁纸数据
const wpPath = join(root, 'src/data/generated/wallpapers.json');
if (!existsSync(wpPath)) {
  problems.push('缺 wallpapers.json');
} else {
  const wp = JSON.parse(readFileSync(wpPath, 'utf8'));
  report.push(`${wp.total >= 59 ? '✔' : '✖'} wallpaper: ${wp.total} 张（目标 ≥59）`);
  if (wp.total < 59) problems.push(`壁纸 ${wp.total} < 59`);
  const noUrl = wp.groups.flatMap((g) => g.items).filter((i) => !i.url).length;
  if (noUrl) problems.push(`壁纸 ${noUrl} 张缺 URL`);
}

console.log(report.join('\n'));
if (problems.length) {
  console.error(`\n✖ 数据断言失败 ${problems.length} 项：\n` + problems.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('\n✔ 数据完整性断言全部通过');
