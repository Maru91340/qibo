// 从 BWIKI 的 Semantic MediaWiki 接口采集 P0 图鉴数据，写入本地静态 JSON。
// 由 npm run collect 触发，也可被定时任务重复执行；失败时保留上一次成功结果。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(projectRoot, 'src/data/generated/catalogs.json');
const LOG_FILE = join(projectRoot, 'src/data/generated/collect-log.jsonl');
const API = 'https://wiki.biligame.com/ap/api.php';
const UA = 'Mozilla/5.0 (compatible; qbxzs-data/1.0; +local)';
const MAX_ITEMS = 300;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slug(type, name) {
  const hash = createHash('sha1').update(`${type}:${name}`).digest('hex').slice(0, 10);
  return `${type}-${hash}`;
}

const values = (raw) => (Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]);

function plain(raw) {
  return values(raw)
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.fulltext || item.title || item['*'] || '').trim();
      return String(item || '').trim();
    })
    .filter(Boolean)
    .join('、');
}

function splitTags(value) {
  return String(value || '')
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function ask(query, attempt = 0) {
  const body = new URLSearchParams({ action: 'ask', format: 'json', query });
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const text = await res.text();
    if (!text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(6000 * (attempt + 1));
    return ask(query, attempt + 1);
  }
}

async function queryCategory(category, props) {
  const prints = props.map((prop) => `|?${prop}`).join('');
  const query = `[[分类:${category}]]${prints}|limit=${MAX_ITEMS}|order=asc`;
  const json = await ask(query);
  const results = (json && json.query && json.query.results) || {};
  return Object.keys(results).map((title) => {
    const entry = results[title];
    const printouts = entry.printouts || {};
    const row = { title: entry.fulltext || title };
    props.forEach((prop) => {
      row[prop] = plain(printouts[prop]);
    });
    return row;
  });
}

const SKIP_FIELDS = new Set(['名称', '图片', '图片2', 'title', '稀有度']);

function buildEntry(type, row, config) {
  const name = row['名称'] || row.title;
  const category = row[config.categoryField] || row['类型'] || row['大类'] || '未分类';
  const rarity = row['稀有度'] || row['奖杯等级'] || '';
  const tags = [];
  (config.tagFields || []).forEach((field) => {
    if (row[field]) tags.push(...splitTags(row[field]));
  });
  const cleanTags = tags.filter((tag) => tag && !/^\d+$/.test(tag) && tag !== category && tag !== rarity);
  const extra = row['筛选属性'] || row['星数'] || row['角色饱腹值'] || row['成就点数'] || '';
  const summarySource = row['完成条件'] || row['描述'] || row['效果'] || row['功能'] || '';
  const fallback = [category, rarity, extra].filter(Boolean).join(' · ');
  const summary = clip(summarySource || fallback, 120);
  const desc = clip(row['描述'] || row['完成条件'] || '', 600);
  const fields = [];
  Object.keys(row).forEach((label) => {
    if (SKIP_FIELDS.has(label) || label === config.categoryField || !row[label]) return;
    if (label === '套装id' && row[label] === '0') return;
    fields.push({ label, value: clip(row[label], 120) });
  });
  const sections = [];
  if (row['完成条件'] && row['完成条件'] !== summary) sections.push({ title: '完成条件', text: clip(row['完成条件'], 600) });
  if (row['描述'] && row['描述'] !== summary) sections.push({ title: '图鉴描述', text: clip(row['描述'], 600) });
  if (row['功能']) sections.push({ title: '功能', text: clip(row['功能'], 600) });
  return {
    id: slug(type, name),
    name: clip(name, 30),
    category: clip(category, 20),
    rarity: clip(rarity, 20),
    tags: cleanTags.slice(0, 8),
    summary: summary || `${category} · 待补充`,
    desc,
    fields: fields.slice(0, 16),
    sections: sections.slice(0, 4),
    verified: true
  };
}

const SOURCES = [
  {
    type: 'spirit',
    category: '灵子',
    props: ['名称', '稀有度', '职业', '筛选属性', '图片'],
    categoryField: '职业',
    tagFields: ['筛选属性']
  },
  {
    type: 'item',
    category: '物品',
    props: ['名称', '稀有度', '星数', '筛选类型', '图片'],
    categoryField: '筛选类型',
    tagFields: ['星数']
  },
  {
    type: 'equipment',
    category: '装备',
    props: ['名称', '稀有度', '套装id', '类型', '图片'],
    categoryField: '类型',
    tagFields: ['套装id']
  },
  {
    type: 'food',
    category: '料理',
    props: ['名称', '稀有度', '料理类型', '角色饱腹值', '奇波饱腹值', '图片'],
    categoryField: '料理类型',
    tagFields: ['角色饱腹值']
  },
  {
    type: 'building',
    category: '建筑',
    props: ['名称', '类型', '功能', '描述', '解锁', '建造材料', '图片'],
    categoryField: '类型',
    tagFields: ['功能']
  },
  {
    type: 'achievement',
    category: '成就',
    props: ['名称', '大类', '小类', '奖杯', '奖杯等级', '成就点数', '完成条件', '图片'],
    categoryField: '大类',
    tagFields: ['小类', '奖杯等级']
  }
];

// 批量把 File 标题换成 120px 缩略图直链；失败返回空映射，条目 icon 留空走文字徽章。
async function resolveIcons(rows) {
  const titles = [...new Set(rows.map((row) => row['图片']).filter(Boolean))];
  const map = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const queryTitles = batch.map((title) => (title.includes(':') ? title : `文件:${title}`));
    try {
      const body = new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '120',
        titles: queryTitles.join('|')
      });
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const text = await res.text();
      if (!text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(text);
      // MediaWiki 会把标题规范化（下划线转空格、首字母大写），用 normalized 表把请求名对回规范页名
      const canonicalOf = new Map();
      queryTitles.forEach((title) => canonicalOf.set(title, title));
      ((json.query || {}).normalized || []).forEach((entry) => canonicalOf.set(entry.from, entry.to));
      const urlByCanonical = {};
      Object.values((json.query || {}).pages || {}).forEach((page) => {
        const info = page.imageinfo && page.imageinfo[0];
        if (!info) return;
        const thumb = info.thumburl || info.url;
        if (!thumb) return;
        urlByCanonical[page.title] = thumb.startsWith('//') ? `https:${thumb}` : thumb;
      });
      queryTitles.forEach((requested) => {
        const canonical = canonicalOf.get(requested);
        const url = canonical && urlByCanonical[canonical];
        if (!url) return;
        const bare = requested.replace(/^(文件|File|Image):/, '');
        map[requested] = url;
        map[bare] = url;
      });
    } catch (error) {
      console.warn(`✖ 图片解析（第 ${i / 50 + 1} 批）: ${error.message}`);
    }
    await sleep(2000);
  }
  return map;
}

function makeNotice(label, date) {
  return `${label}数据采集自 BWIKI（wiki.biligame.com/ap），抓取于 ${date}；公测后以官方版本为准。`;
}

async function main() {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : { types: {} };
  const next = { generatedAt: new Date().toISOString(), source: 'bwiki', types: { ...(previous.types || {}) } };
  const report = { at: next.generatedAt, types: {}, errors: [] };

  for (const source of SOURCES) {
    try {
      const rows = await queryCategory(source.category, source.props);
      const items = rows
        .map((row) => ({ row, item: buildEntry(source.type, row, source) }))
        .filter((entry) => entry.item.name);
      const deduped = [];
      const seen = new Set();
      items.forEach((entry) => {
        if (seen.has(entry.item.id)) return;
        seen.add(entry.item.id);
        deduped.push(entry);
      });
      if (!deduped.length) throw new Error('SMW 返回 0 条');
      const iconMap = await resolveIcons(deduped.map((entry) => entry.row));
      deduped.forEach((entry) => {
        const file = entry.row['图片'];
        entry.item.icon = (file && iconMap[file]) || '';
      });
      const finalItems = deduped.map((entry) => entry.item);
      const payload = { notice: makeNotice(source.category, today()), items: finalItems.slice(0, MAX_ITEMS) };
      const iconCount = payload.items.filter((item) => item.icon).length;
      next.types[source.type] = payload;
      report.types[source.type] = payload.items.length;
      report.types[`${source.type}_icons`] = iconCount;
      console.log(`✔ ${source.type}: ${payload.items.length} 条（图片 ${iconCount}）`);
    } catch (error) {
      report.errors.push({ type: source.type, message: error.message });
      console.warn(`✖ ${source.type}: ${error.message}（保留上一次结果）`);
    }
    await sleep(4500);
  }

  // 材料图鉴由物品数据派生，避免再发一次请求。
  const itemPayload = next.types.item;
  if (itemPayload && Array.isArray(itemPayload.items)) {
    const materials = itemPayload.items.filter((item) => /材料|素材/.test(item.category));
    if (materials.length) {
      next.types.material = {
        notice: makeNotice('材料', today()),
        items: materials.slice(0, MAX_ITEMS)
      };
      report.types.material = materials.length;
    }
    const fishing = itemPayload.items.filter((item) => /鱼|钓/.test(item.category));
    if (fishing.length >= 3) {
      next.types.fishing = {
        notice: makeNotice('钓鱼', today()),
        items: fishing.slice(0, MAX_ITEMS)
      };
      report.types.fishing = fishing.length;
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(next, null, 2));
  const logLine = JSON.stringify({ ...report, cloud: 'skipped: no CLOUD_ENV_ID' });
  mkdirSync(dirname(LOG_FILE), { recursive: true });
  writeFileSync(LOG_FILE, `${logLine}\n`, { flag: 'a' });
  console.log(`\n写入 ${OUTPUT}`);
}

main().catch((error) => {
  console.error(`采集失败：${error.message}`);
  process.exitCode = 1;
});
