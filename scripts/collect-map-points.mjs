// P3-3 地图点位采集：从 BWIKI「分类:地图点位数据」（Data:Map/{region}/type/N/json）抓取
// 带游戏坐标的点位数据，聚合为 src/data/generated/map-points.json。
// 数据页为 JSON 子页（父页仅 {{PointGrid}} 模板调用）。类型语义官方未公开，统一标注待核实。
// 用法：node scripts/collect-map-points.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(projectRoot, 'src/data/generated/map-points.json');
const API = 'https://wiki.biligame.com/ap/api.php';
const RAW_BASE = 'https://wiki.biligame.com/ap/index.php';
const UA = 'Mozilla/5.0 (compatible; qbxzs-data/1.0; +local)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// BWIKI Data:Map 区域代码 → 展示名（xllc 语义未核实，保留代码并标注）
const REGION_LABELS = { xysg: '新芽山谷', fls: '弗利斯', xllc: 'xllc·待核实' };

async function fetchText(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 567 || res.status === 429) throw new Error(`HTTP ${res.status} 限流`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      if (attempt >= 2) throw error;
      await sleep(4000 * (attempt + 1));
    }
  }
  return '';
}

async function listMembers() {
  const members = [];
  let cont = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body = new URLSearchParams({ action: 'query', format: 'json', list: 'categorymembers', cmtitle: '分类:地图点位数据', cmlimit: '500' });
    if (cont) body.set('cmcontinue', cont);
    const res = await fetch(API, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const json = JSON.parse(await res.text());
    const batch = ((json.query || {}).categorymembers || []).map((m) => m.title);
    members.push(...batch);
    cont = (json.continue || {}).cmcontinue || '';
    if (!cont || !batch.length) break;
    await sleep(800);
  }
  return members;
}

function parsePointRows(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return [];
  }
  if (!Array.isArray(json)) return [];
  return json
    .filter((row) => row && typeof row.title === 'string' && row.point && Number.isFinite(row.point.x) && Number.isFinite(row.point.y))
    .map((row) => ({
      name: String(row.title).slice(0, 40),
      type: Number(row.markType) || 0,
      x: Math.round(Number(row.point.x) * 10) / 10,
      y: Math.round(Number(row.point.y) * 10) / 10,
      layer: String(row.layer || '')
    }));
}

async function main() {
  console.log('拉取分类成员…');
  const members = (await listMembers()).filter((title) => /^Data:Map\/[^/]+\/type\/\d+$/.test(title));
  console.log(`待抓取数据页：${members.length}`);

  const regions = {};
  let pages = 0;
  let points = 0;
  for (let i = 0; i < members.length; i += 1) {
    const title = members[i];
    const match = title.match(/^Data:Map\/([^/]+)\/type\/(\d+)$/);
    const region = match[1];
    const typeNo = match[2];
    const raw = await fetchText(`${RAW_BASE}?title=${encodeURIComponent(`${title}/json`)}&action=raw`);
    const rows = parsePointRows(raw);
    if (rows.length) {
      const slot = (regions[region] = regions[region] || {});
      slot[typeNo] = (slot[typeNo] || []).concat(rows);
      pages += 1;
      points += rows.length;
    }
    if ((i + 1) % 40 === 0) console.log(`进度 ${i + 1}/${members.length}（页 ${pages}，点 ${points}）`);
    await sleep(450);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'BWIKI 分类:地图点位数据（Data:Map 数据页，2026-11-04 采集）',
    notice: '点位类型语义官方未公开，编号待公测核实；坐标系为游戏内地图坐标，本页以清单形式展示（不含地图底图，官方素材版权原因）。',
    verified: false,
    total: points,
    regions: Object.keys(regions)
      .sort()
      .map((code) => ({
        code,
        label: REGION_LABELS[code] || `${code}·待核实`,
        types: Object.keys(regions[code])
          .sort((a, b) => Number(a) - Number(b))
          .map((typeNo) => ({
            type: Number(typeNo),
            label: `类型${typeNo}`,
            points: regions[code][typeNo]
          }))
      }))
  };

  writeFileSync(OUTPUT, JSON.stringify(payload));
  const sizeKB = Math.round(readFileSync(OUTPUT).length / 1024);
  console.log(`\n写入 ${OUTPUT}（${sizeKB} KB）`);
  console.log(`区域 ${Object.keys(regions).length} · 类型页 ${pages} · 点位 ${points}`);
  Object.keys(regions).forEach((code) => {
    const count = Object.values(regions[code]).reduce((sum, list) => sum + list.length, 0);
    console.log(`  ${REGION_LABELS[code] || code}: ${count} 点`);
  });
}

main().catch((error) => {
  console.error('采集失败：', error.message, '（保留上一次成功结果）');
  process.exitCode = 1;
});
