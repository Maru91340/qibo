// D2：灵子/物品/装备 desc 补齐——BWIKI 页模板字段提取（描述/技能描述/特殊描述/获取方式）
// 增量模式：desc-cache.json 已有条目跳过；串行 + 567/429 退避；成功响应才写缓存。
// 用法：node scripts/collect-desc.mjs [--limit 30]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const CATALOG = join(projectRoot, 'src/data/generated/catalogs.json');
const DESC_CACHE = join(projectRoot, 'src/data/generated/desc-cache.json');
const API = 'https://wiki.biligame.com/ap/api.php';
const UA = 'qbxzs-collect/1.0 (https://github.com/Maru91340/qibo)';

const TYPES = ['spirit', 'item', 'equipment'];
const PLACEHOLDER = '暂无简介，详见 BWIKI 页面。';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clip = (s, n) => (s || '').trim().slice(0, n);

function stripWiki(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '，')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 模板字段提取：模板字段均单行（|字段=值），取首个图鉴模板的作用域
function templateFields(wikitext) {
  const fields = {};
  const start = wikitext.indexOf('{{');
  if (start !== 0) return fields;
  let depth = 0;
  let line = '';
  const lines = [];
  for (let i = 0; i < wikitext.length; i += 1) {
    const two = wikitext.slice(i, i + 2);
    if (two === '{{') { depth += 1; i += 1; line += two; continue; }
    if (two === '}}') {
      depth -= 1; i += 1; line += two;
      if (depth === 0) { lines.push(line); break; }
      continue;
    }
    if (wikitext[i] === '\n' && depth === 1) { lines.push(line); line = ''; continue; }
    line += wikitext[i];
  }
  for (const l of lines) {
    const m = l.match(/^\|([^=|]+)=(.*)$/);
    if (m) fields[m[1].trim()] = stripWiki(m[2]);
  }
  return fields;
}

function buildDesc(fields, type) {
  const parts = [];
  if (fields['描述']) parts.push(fields['描述']);
  if (type === 'item' && fields['特殊描述'] && fields['特殊描述'] !== fields['描述']) parts.push(fields['特殊描述']);
  if (fields['技能描述']) parts.push(`技能：${fields['技能描述']}`);
  if (fields['获取方式']) parts.push(`获取：${fields['获取方式']}`);
  const desc = clip(parts.join('；').replace(/；+/g, '；'), 260);
  return desc.length >= 8 ? desc : '';
}

async function fetchWikitext(page) {
  const body = new URLSearchParams({ action: 'parse', format: 'json', page, prop: 'wikitext' });
  const res = await fetch(API, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await res.text();
  // 567/429 限流退避
  if (res.status === 567 || res.status === 429 || !text.trim().startsWith('{')) {
    const err = new Error(`HTTP ${res.status}`);
    err.rate = true;
    throw err;
  }
  const json = JSON.parse(text);
  if (json.error) { const err = new Error(`api:${json.error.code}`); err.miss = true; throw err; }
  return json.parse && json.parse.wikitext ? json.parse.wikitext['*'] : '';
}

async function main() {
  const argLimit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 30;
  const cat = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const cache = existsSync(DESC_CACHE) ? JSON.parse(readFileSync(DESC_CACHE, 'utf8')) : {};

  const targets = [];
  for (const t of TYPES) {
    const items = (cat.types[t] && cat.types[t].items) || [];
    items.forEach((item) => {
      if (!item.name) return;
      if (cache[item.name] !== undefined) return; // 增量：缓存继承，防回退
      targets.push({ type: t, name: item.name });
    });
  }
  const totalMissing = targets.length;
  // 跨类型轮询排序，让每轮配额均衡覆盖灵子/物品/装备
  targets.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  const queues = TYPES.map((t) => targets.filter((x) => x.type === t));
  const batch = [];
  while (batch.length < argLimit && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (q.length && batch.length < argLimit) batch.push(q.shift());
    }
  }
  console.log(`desc 缺失 ${totalMissing} 条，本轮抓取 ${batch.length} 条（limit=${argLimit}）`);

  let ok = 0; let empty = 0; let miss = 0;
  for (let i = 0; i < batch.length; i += 1) {
    const { type, name } = batch[i];
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt += 1) {
      try {
        const wt = await fetchWikitext(name);
        if (!wt) { cache[name] = { type, desc: '', at: new Date().toISOString() }; empty += 1; done = true; break; }
        const fields = templateFields(wt);
        const desc = buildDesc(fields, type);
        cache[name] = { type, desc, at: new Date().toISOString() };
        if (desc) ok += 1; else empty += 1;
        done = true;
      } catch (error) {
        if (error.miss) {
          cache[name] = { type, desc: '', at: new Date().toISOString(), miss: true };
          miss += 1; done = true; break;
        }
        if (attempt >= 3) { console.warn(`  ✖ ${name}: ${error.message}`); break; }
        await sleep(6000 * (attempt + 1));
      }
    }
    if (i % 10 === 9) console.log(`  进度 ${i + 1}/${batch.length}（成功 ${ok} 空 ${empty} 缺页 ${miss}）`);
    await sleep(3500); // 串行限速
  }

  writeFileSync(DESC_CACHE, JSON.stringify(cache));
  const withDesc = Object.values(cache).filter((c) => c.desc).length;
  console.log(`✔ desc-cache 共 ${Object.keys(cache).length} 条（有内容 ${withDesc}）；本轮成功 ${ok} / 空字段 ${empty} / 缺页 ${miss}`);
}

main().catch((error) => {
  console.error(`desc 采集失败：${error.message}`);
  process.exitCode = 1;
});
