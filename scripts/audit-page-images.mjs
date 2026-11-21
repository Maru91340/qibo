// 图片巡检（定时任务 1）：对 18 类资料的列表图标 + 详情页杂图做全量静态解析，
// 按「云图覆盖 / 回退外链 / 缺图」分类，输出 Markdown 报告到 docs/图片巡检/。
// 与 site-images.js 的解析规则保持同源：wiki-runtime（wiki/ 与 qibo-cbt3/）→ 数据 icon 热链 → 空。
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wr = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/wiki-runtime.json'), 'utf8')).types;
const full = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8')).types;
const bundled = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs-bundled.json'), 'utf8')).types;
const KEY = { qibo: 'qiboWiki', character: 'charWiki' };
const CLOUD_MARK = 'cloud://';

function external(url) {
  return /^https?:\/\//.test(String(url || '')) ? String(url) : '';
}

// 每类条目：icon 字段 + 索引命中 → 分类
function auditType(type, items) {
  const table = wr[KEY[type] || type] || null;
  const rows = [];
  for (const it of items || []) {
    const hit = table && table[it.id];
    const iconUrl = external(it.icon);
    // 与运行时一致：索引命中（含 qibo-cbt3 补图）在 H5/MP 都有图；否则回退数据 icon 热链
    if (hit) {
      const prefix = Object.keys(hit).some((k) => String(hit[k]).startsWith('qibo-cbt3/')) ? 'qibo-cbt3' : 'wiki';
      rows.push({ id: it.id, name: it.name, state: `云图(${prefix})` });
    } else if (iconUrl) {
      rows.push({ id: it.id, name: it.name, state: '外链回退', url: iconUrl });
    } else {
      rows.push({ id: it.id, name: it.name, state: '缺图' });
    }
  }
  return rows;
}

// 详情页杂图：从详情数据收集全部外链 URL，标注是否已整理进 cloud-batch-detail（即已可上云）
function collectDetailExternals(files) {
  const urls = new Map();
  const IMG = /\.(png|jpe?g|webp)$/i;
  function walk(o) {
    if (typeof o === 'string') {
      const s = o.trim();
      if (/^https?:\/\//.test(s) && IMG.test(s.split('?')[0]) && !urls.has(s)) urls.set(s, true);
    } else if (o && typeof o === 'object') {
      for (const v of Object.values(o)) walk(v);
    }
  }
  for (const f of files) {
    const p = join(projectRoot, f);
    if (existsSync(p)) walk(JSON.parse(readFileSync(p, 'utf8')));
  }
  return [...urls.keys()];
}

const report = { generatedAt: new Date().toISOString(), types: {}, details: {} };
let cloudCount = 0, extCount = 0, noneCount = 0;

for (const type of ['qibo', 'character', 'spirit', 'item', 'equipment', 'material', 'food', 'fishing', 'building', 'book', 'guide', 'achievement']) {
  const items = (full[type] && full[type].items) || [];
  const rows = auditType(type, items);
  const cloud = rows.filter((r) => r.state.startsWith('云图')).length;
  const ext = rows.filter((r) => r.state === '外链回退').length;
  const none = rows.filter((r) => r.state === '缺图').length;
  cloudCount += cloud; extCount += ext; noneCount += none;
  report.types[type] = { 条目: rows.length, 云图: cloud, 外链回退: ext, 缺图: none, 明细: rows.filter((r) => r.state !== '云图').slice(0, 30) };
}

// 详情杂图外链（MP 端已由 cloudDetailAsset 转 detail-assets；此处列 URL 供人工核对云端对象存在性）
const detailFiles = ['src/data/generated/character-detail-cbt3.json', 'src/data/generated/character-detail-bwiki.json'];
for (const f of detailFiles) {
  const urls = collectDetailExternals([f]);
  report.details[f.split('/').pop()] = { 外链URL数: urls.length, 样例: urls.slice(0, 10) };
}

// combat / soul 相对路径图：已全部经 detail-assets 云目录覆盖，按路径段统计
const combat = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/qibo-combat.json'), 'utf8'));
const soul = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/soul-essence.json'), 'utf8'));
function collectRel(o, set) {
  if (typeof o === 'string') { if (/^icons\/[^"'\s]+\.(png|jpe?g|webp)$/i.test(o.trim())) set.add(o.trim()); }
  else if (o && typeof o === 'object') for (const v of Object.values(o)) collectRel(v, set);
}
const relSet = new Set();
collectRel(combat, relSet); collectRel(soul, relSet);
report.details['qibo-combat+soul-essence 相对路径图'] = { 数量: relSet.size, 说明: 'MP 端已由 cloudDetailAsset 映射 detail-assets/<分类>/<原名>；H5 端走 CSXYLIC 热链' };

// 输出 Markdown
const outDir = join(projectRoot, 'docs', '图片巡检');
mkdirSync(outDir, { recursive: true });
const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const lines = [
  `# 图片巡检报告 ${new Date().toISOString()}`,
  '',
  `## 列表图标（18 类资料中的 12 个有图类型）`,
  '',
  '| 类型 | 条目 | 云图 | 外链回退 | 缺图 |',
  '| --- | ---: | ---: | ---: | ---: |'
];
for (const [type, r] of Object.entries(report.types)) {
  lines.push(`| ${type} | ${r.条目} | ${r.云图} | ${r.外链回退} | ${r.缺图} |`);
}
lines.push('', `合计：云图 ${cloudCount} / 外链回退 ${extCount} / 缺图 ${noneCount}`, '');
for (const [type, r] of Object.entries(report.types)) {
  if (!r.明细.length) continue;
  lines.push(`### ${type} 非云图明细（前 ${r.明细.length} 条）`, '');
  for (const row of r.明细) lines.push(`- ${row.state}：${row.id} ${row.name}${row.url ? ` — ${row.url}` : ''}`);
  lines.push('');
}
lines.push('### 详情页杂图', '');
for (const [k, v] of Object.entries(report.details)) {
  lines.push(`- ${k}：${JSON.stringify(v).slice(0, 400)}`);
}
const outFile = join(outDir, `巡检报告-${date}.md`);
writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log('✔ 巡检完成：云图 %d / 外链回退 %d / 缺图 %d', cloudCount, extCount, noneCount);
console.log('✔ 报告：', outFile);
