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

async function postRetry(params, attempt = 0) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });
    const text = await res.text();
    if (!text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(4000 * (attempt + 1));
    return postRetry(params, attempt + 1);
  }
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
  let category = row[config.categoryField] || row['类型'] || row['大类'] || '';
  // 未分类归并：用首个标签或稀有度兜底，避免 facet 大量「未分类」不可筛
  if (!category || category === '未分类') {
    const firstTag = (row[config.tagFields && config.tagFields[0]] || '').split(/[、,，]/)[0].trim();
    category = firstTag || row['稀有度'] && ('稀有度' + row['稀有度']) || '其他';
  }
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

// BWIKI 真实条目扩展源：奇波/角色（ SMW 字段较少，图片从页面 images 取）/ 攻略一图流
const WIKI_SOURCES = [
  { type: 'qiboWiki', category: '奇波', label: '奇波', props: ['名称', '稀有度', '元素', '简介'], imgPick: /icon pet|pet/i },
  { type: 'charWiki', category: '角色', label: '角色', props: ['名称', '稀有度', '元素', '简介'], imgPick: /icon char|char|icon/i },
  { type: 'guideWiki', category: '攻略', label: '攻略', props: ['名称', '简介'], imgPick: /一图流|图|panel|png/i }
];


// 聚合页图标补充：解析指定 wiki 页面的缩略图与相邻词条名配对（覆盖无内嵌图的词条）
async function aggregateIcons(pageName, attempt = 0) {
  const map = {};
  try {
    const res = await fetch(`https://wiki.biligame.com/ap/${encodeURIComponent(pageName)}`, { headers: { 'User-Agent': UA } });
    if (res.status === 567 || res.status === 429) throw new Error(`HTTP ${res.status} 限流`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const re = /src="(https:\/\/patchwiki[^"]*thumb[^"]+)"[\s\S]{0,600}?<a[^>]*href="\/ap\/([^"]+)"[^>]*>/g;
    for (const m of html.matchAll(re)) {
      const name = decodeURIComponent(m[2]).replace(/_/g, ' ').trim();
      if (name && !map[name]) map[name] = m[1];
    }
  } catch (error) {
    if (attempt < 2) {
      await sleep(8000 * (attempt + 1));
      return aggregateIcons(pageName, attempt + 1);
    }
    console.warn(`✖ 聚合页图标（${pageName}）: ${error.message}`);
  }
  return map;
}

function stripHtml(value) {
  return String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function wikiEntry(type, row, imgUrl, skills) {
  const name = row['名称'] || row.title;
  const ele = String(row['元素'] || '');
  const entry = {
    id: `${type.slice(0, 2)}-${slug(type, name).split('-')[1]}`,
    name: clip(name, 30),
    category: 'BWIKI',
    rarity: clip(row['稀有度'] || '', 20),
    tags: ele.split(/[、,，]/).map((t) => t.trim()).filter(Boolean).slice(0, 4),
    summary: clip(stripHtml(row['简介'] || row['描述'] || ''), 100) || '暂无简介，详见 BWIKI 页面。',
    desc: clip(stripHtml(row['简介'] || row['描述'] || ''), 118) || '暂无简介，详见 BWIKI 页面。',
    fields: [],
    sections: [],
    icon: imgUrl || '',
    verified: true
  };
  if (type === 'charWiki') {
    entry.role = '待核实';
    if (skills && skills.length) entry.skills = skills;
  }
  return entry;
}

// 页面内嵌图片：prop=images 取候选文件名，再走 imageinfo 换 240px 缩略图
async function resolvePageImages(titles, pickRe) {
  const map = {};
  if (!titles.length) return map;
  const cands = {};
  try {
    // 页面 images 查询也分批，避免 207 个标题一次请求被截断
    for (let b = 0; b < titles.length; b += 20) {
      const json = await postRetry({ action: 'query', format: 'json', prop: 'images', imlimit: '30', titles: titles.slice(b, b + 20).join('|') });
      Object.values((json.query || {}).pages || {}).forEach((page) => {
        const files = (page.images || []).map((i) => i.title);
        const hit = files.find((f) => pickRe.test(f) && !/bg|logo|tag|product|skill/i.test(f)) || files.find((f) => /png|jpg/i.test(f));
        if (hit) cands[page.title] = hit;
      });
      await sleep(1200);
    }
    const names = [...new Set(Object.values(cands))];
    for (let i = 0; i < names.length; i += 50) {
      const j2 = await postRetry({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '240', titles: names.slice(i, i + 50).join('|') });
      const norm = new Map(((j2.query || {}).normalized || []).map((n) => [n.from, n.to]));
      const urlByCanon = {};
      Object.values((j2.query || {}).pages || {}).forEach((page) => {
        const info = page.imageinfo && page.imageinfo[0];
        if (info) urlByCanon[page.title] = info.thumburl || info.url || '';
      });
      Object.entries(cands).forEach(([title, file]) => {
        const canon = norm.get(file) || file;
        if (urlByCanon[canon]) map[title] = urlByCanon[canon];
      });
    }
  } catch (error) {
    console.warn(`✖ 页面图片解析: ${error.message}`);
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

  // BWIKI 真实条目扩展源
  for (const source of WIKI_SOURCES) {
    try {
      const rows = await queryCategory(source.category, source.props);
      const imgMap = await resolvePageImages(rows.map((r) => r.title), source.imgPick);
      // 聚合页补充：词条自身无图时，用聚合页表格里的缩略图兜底
      // 角色技能组：从角色页 HTML 的 hero-skill 结构提取（名称+类型+描述）
      let skillMap = {};
      let roleMap = {};
      if (source.type === 'charWiki') {
        try {
          const pageTitles = rows.map((r) => r.title);
          for (let pi = 0; pi < pageTitles.length; pi += 1) {
            const t = pageTitles[pi];
            // serial + backoff on 567/429
            let html = '';
            for (let attempt = 0; attempt < 2; attempt += 1) {
              try {
                const r = await fetch(`https://wiki.biligame.com/ap/${encodeURIComponent(t)}`, { headers: { 'User-Agent': UA } });
                if (r.status === 567 || r.status === 429) throw new Error('HTTP ' + r.status + ' limit');
                html = r.ok ? await r.text() : '';
                break;
              } catch (err) {
                if (attempt === 0) await sleep(9000);
              }
            }
            if (!html) { console.warn('skip char page: ' + t); continue; }
            const sIdx = html.indexOf('id="技能"');
            if (sIdx < 0) continue;
            const seg = html.slice(sIdx, sIdx + 20000);
            const skills = [];
            const re = /hero-skill-name">([^<]{2,20})<\/span>[\s\S]{0,2000}?hero-skill-desc[a-z-]*"[^>]*>([\s\S]{10,300}?)<\/(?:div|span|p)>/g;
            for (const m of seg.matchAll(re)) {
              let desc = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
              // 类型从描述前缀【普攻】等提取
              let stype = '';
              const tm = desc.match(/^【([^】]{1,6})】/);
              if (tm) { stype = tm[1]; desc = desc.replace(/^【[^】]{1,6}】/, '').trim(); }
              if (desc) skills.push({ name: m[1], type: stype || '技能', desc: desc.slice(0, 118) });
            }
            if (skills.length) skillMap[t] = skills.slice(0, 6);
            // 战斗定位：hero-battle-tag-name 第一个标签
            const tm2 = html.match(/hero-battle-tag-name"[^>]*>[\s\S]{0,80}?<span[^>]*>([^<]{2,10})<\/span>/);
            if (tm2) roleMap[t] = tm2[1];
            await sleep(2200);
          }
        } catch (error) {
          console.warn(`✖ 角色技能解析: ${error.message}`);
        }
      }
      const aggPage = source.type === 'qiboWiki' ? '奇波' : source.type === 'charWiki' ? '角色图鉴' : '';
      const aggMap = aggPage ? await aggregateIcons(aggPage) : {};
      // 上一轮同名词目的图标继承：聚合页限流时图标覆盖不回退
      const previousIcons = {};
      ((previous.types && previous.types[source.type] && previous.types[source.type].items) || []).forEach((prev) => {
        if (prev.icon) previousIcons[prev.name] = prev.icon;
      });
      const seenWiki = new Set();
      const items = rows
        .map((row) => {
          const entry = wikiEntry(source.type, row, imgMap[row.title], skillMap && skillMap[row.title]);
          if (source.type === 'charWiki' && roleMap[row.title]) entry.role = roleMap[row.title];
          if (!entry.icon && aggMap[row.title]) entry.icon = aggMap[row.title];
          if (!entry.icon && previousIcons[entry.name]) entry.icon = previousIcons[entry.name];
          return entry;
        })
        .filter((item) => item.name && !seenWiki.has(item.id) && seenWiki.add(item.id));
      const withIcon = items.filter((item) => item.icon).length;
      const withSkills = items.filter((item) => item.skills && item.skills.length).length;
      if (withSkills) report.types[`${source.type}_skills`] = withSkills;
      if (!items.length) throw new Error('SMW 返回 0 条');
      next.types[source.type] = { notice: makeNotice(source.label, today()), items };
      report.types[source.type] = items.length;
      report.types[`${source.type}_icons`] = withIcon;
      console.log(`✔ ${source.type}: ${items.length} 条（图片 ${withIcon}）`);
    } catch (error) {
      report.errors.push({ type: source.type, message: error.message });
      console.warn(`✖ ${source.type}: ${error.message}（保留上一次结果）`);
    }
    await sleep(4500);
  }

  // 角色图标兜底：官方一图流图片按名称前缀映射到对应角色（佩佩一图流 → 佩佩）
  if (next.types.charWiki && next.types.guideWiki) {
    const guideIcon = {};
    next.types.guideWiki.items.forEach((g) => {
      if (g.icon) guideIcon[g.name.replace(/一图流$/, '')] = g.icon;
    });
    let patched = 0;
    next.types.charWiki.items.forEach((c) => {
      if (!c.icon && guideIcon[c.name]) { c.icon = guideIcon[c.name]; patched += 1; }
    });
    if (patched) {
      report.types.charWiki_icons = next.types.charWiki.items.filter((i) => i.icon).length;
      console.log(`✔ charWiki 图标补充: +${patched}（一图流映射）`);
    }
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

  writeFileSync(OUTPUT, JSON.stringify(next));
  const logLine = JSON.stringify({ ...report, cloud: 'skipped: no CLOUD_ENV_ID' });
  mkdirSync(dirname(LOG_FILE), { recursive: true });
  writeFileSync(LOG_FILE, `${logLine}\n`, { flag: 'a' });
  console.log(`\n写入 ${OUTPUT}`);
}

main().catch((error) => {
  console.error(`采集失败：${error.message}`);
  process.exitCode = 1;
});
