// 从 BWIKI 的 Semantic MediaWiki 接口采集 P0 图鉴数据，写入本地静态 JSON。
// 由 npm run collect 触发，也可被定时任务重复执行；失败时保留上一次成功结果。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(projectRoot, 'src/data/generated/catalogs.json');
// P1-0 主包瘦身（2026-11-04）：内置包只带「离线回退子集」——去掉远程 icon URL、
// 精简 SMW 类字段/分节、item 限 400 条；全量数据由 seed:export 经 esbuild 别名
// 取 OUTPUT 生成 bundled.json，云端 getCatalog 按版本下发，客户端联网即恢复全量。
const BUNDLED_OUTPUT = join(projectRoot, 'src/data/generated/catalogs-bundled.json');
const SLIM_ITEM_CAP = 400;
const SLIM_DROP_FIELDS = new Set(['spirit', 'item', 'equipment', 'food', 'building', 'book']);
// R3-3：内置子集保留图标的类型（BWIKI 缩略图热链，紧凑相对路径存储，catalog.js 运行时还原）
const BWIKI_IMG_BASE = 'https://patchwiki.biligame.com/images/ap/';
const SLIM_KEEP_ICON = new Set(['qiboWiki', 'charWiki', 'spirit', 'item', 'material', 'equipment', 'food', 'building', 'fishing']);

function slimBundled(next) {
  const out = { generatedAt: next.generatedAt, source: 'bwiki-bundled-slim', types: {} };
  Object.entries(next.types).forEach(([type, payload]) => {
    let items = payload.items;
    if (type === 'item') items = items.slice(0, SLIM_ITEM_CAP);
    items = items.map((item) => {
      const copy = { ...item };
      // R2/R3：角色/奇波/灵子/物品/材料/装备/美食/建筑/钓鱼 保留 BWIKI 缩略图热链（紧凑路径省 ~65KB）；
      // 成就等仍剥离，由 R3-5 生成管线或云端同步补全。
      if (SLIM_KEEP_ICON.has(type)) {
        if (typeof copy.icon === 'string' && copy.icon.startsWith(BWIKI_IMG_BASE)) {
          copy.icon = copy.icon.slice(BWIKI_IMG_BASE.length);
        }
      } else {
        delete copy.icon;
      }
      if (SLIM_DROP_FIELDS.has(type)) { delete copy.fields; delete copy.sections; }
      return copy;
    });
    out.types[type] = { notice: `${payload.notice}（内置为离线回退子集，联网后由云端同步全量）`, items };
  });
  return out;
}
const LOG_FILE = join(projectRoot, 'src/data/generated/collect-log.jsonl');
const SKILL_CACHE = join(projectRoot, 'src/data/generated/skill-cache.json');
const DESC_CACHE = join(projectRoot, 'src/data/generated/desc-cache.json');
const SECTIONS_CACHE = join(projectRoot, 'src/data/generated/sections-cache.json');
const KIBO_SECTIONS_CACHE = join(projectRoot, 'src/data/generated/kibo-sections-cache.json');
const GUIDE_SECTIONS_CACHE = join(projectRoot, 'src/data/generated/guide-sections-cache.json');
const API = 'https://wiki.biligame.com/ap/api.php';
const UA = 'Mozilla/5.0 (compatible; qbxzs-data/1.0; +local)';
// 与 cloudfunctions/shared/constants.js 的 LIMITS.items 保持一致
const MAX_ITEMS = 500;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slug(type, name) {
  const hash = createHash('sha1').update(`${type}:${name}`).digest('hex').slice(0, 10);
  return `${type}-${hash}`;
}

const values = (raw) => (Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]);

// R3-T1 F2：SMW 文本统一清洗 <br>/HTML 标签（此前仅部分路径清洗，建筑等描述泄漏 <br> 到 UI）
function cleanWikiText(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(raw) {
  return values(raw)
    .map((item) => {
      if (typeof item === 'string') return cleanWikiText(item);
      if (item && typeof item === 'object') return cleanWikiText(String(item.fulltext || item.title || item['*'] || ''));
      return cleanWikiText(String(item || ''));
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

async function queryCategory(category, props, limit) {
  const prints = props.map((prop) => `|?${prop}`).join('');
  const query = `[[分类:${category}]]${prints}|limit=${limit || MAX_ITEMS}|order=asc`;
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

const SECTION_FIELDS_SKIP = new Set(['图片']);

// 角色页 wikitext → 星赐/牵绊信件/牵绊故事 sections（定弦/语音/面板值 BWIKI 未收录，公测后补）
function parseCharSections(wikitext) {
  const fields = {};
  String(wikitext || '').split('\n').forEach((line) => {
    const m = line.match(/^\|([^=|]+)=(.*)$/);
    if (m) fields[m[1].trim()] = m[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  });
  const out = [];
  for (let n = 1; n <= 12; n += 1) {
    const mat = fields[`星赐${n}名`];
    const up = fields[`星赐${n}升阶`];
    if (!mat && !up) continue;
    out.push({ title: `星赐·第${n}阶`, text: [mat ? `材料：${mat}` : '', up ? `升阶：${up}` : ''].filter(Boolean).join('\n') });
  }
  for (let n = 1; n <= 5; n += 1) {
    const title = fields[`信件牵绊${n}标题`];
    if (!title) continue;
    const body = [fields[`信件牵绊${n}收件人`], fields[`信件牵绊${n}文本`], fields[`信件牵绊${n}签名`]].filter(Boolean).join('\n');
    out.push({ title: `牵绊信件·${title}`, text: body.slice(0, 600) });
  }
  for (let n = 1; n <= 5; n += 1) {
    const st = fields[`故事${n}标题`];
    if (!st) continue;
    out.push({ title: `牵绊故事·${st}`, text: (fields[`故事${n}文本`] || '').slice(0, 600) });
  }
  return out;
}

// 奇波页 wikitext → 特性 sections（特性1-3 为模板参数，SMW 无该属性，需按页抓取）
function parseKiboTraits(wikitext) {
  const fields = {};
  String(wikitext || '').split('\n').forEach((line) => {
    const m = line.match(/^\|([^=|]+)=(.*)$/);
    if (m) fields[m[1].trim()] = m[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  });
  const traits = [];
  for (let n = 1; n <= 3; n += 1) {
    const tn = fields[`特性${n}`];
    const td = fields[`特性${n}描述`];
    if (!tn && !td) continue;
    traits.push(`${tn || '特性' + n}${td ? '：' + td : ''}`);
  }
  if (!traits.length) return [];
    return [{ title: '特性', text: traits.join('\n') }];
}

// R2-6 奇波技能分级解析：模板 技能N/固定技能/合击技能 的 描述1~5 → levels（Lv.1~Lv.5 档位）
function parseKiboSkills(wikitext) {
  const fields = {};
  String(wikitext || '').split('\n').forEach((line) => {
    const m = line.match(/^\|([^=|]+)=(.*)$/);
    if (m) fields[m[1].trim()] = m[2].replace(/<br\s*\/?>/gi, ' ').replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/<[^>]+>/g, '').trim();
  });
  const out = [];
  const groups = ['固定技能', '合击技能', '技能1', '技能2', '技能3', '技能4'];
  groups.forEach((base) => {
    const name = fields[base];
    const levels = [];
    for (let lv = 1; lv <= 5; lv += 1) {
      const d = fields[`${base}描述${lv}`];
      if (d) levels.push({ lv, desc: d.slice(0, 220) });
    }
    if (!name && !levels.length) return;
    out.push({
      name: name || base,
      type: base === '固定技能' ? '固定技能' : base === '合击技能' ? '合击技能' : (fields[`${base}元素`] ? `技能·${fields[`${base}元素`]}` : '技能'),
      element: fields[`${base}元素`] || '',
      levels,
      desc: (levels.length ? levels[levels.length - 1].desc : (fields[`${base}描述`] || '')).slice(0, 220)
    });
  });
  return out;
}

// R2-6 分级描述无损压缩：各级文本共享模板仅数字不同 → {tpl:'…{}…', nums:[[级1数字…],…]}
// 未通过一致性校验的技能保留完整 levels 数组；解压在 src/data/catalog.js 完成。
function compressLevels(levels) {
  if (!levels || levels.length < 2) return null;
  const tpl = String(levels[0].desc).replace(/\d+(?:\.\d+)?/g, '{}');
  const nums = [];
  for (const lvEntry of levels) {
    const wild = String(lvEntry.desc).replace(/\d+(?:\.\d+)?/g, '{}');
    if (wild !== tpl) return null;
    nums.push((lvEntry.desc.match(/\d+(?:\.\d+)?/g) || []));
  }
  if (!nums.some((list) => list.length)) return null;
  return { tpl, nums };
}

const SKIP_FIELDS = new Set(['名称', '图片', '图片2', 'title', '稀有度']);

// R2-4 攻略正文解析：文章戳元信息 + == 章节 == 正文（剥离 File:/#seo/注释/模板/花括号残渣）
function parseGuideDetail(wikitext) {
  const src = String(wikitext || '');
  const clean = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{#seo:[\s\S]*?\}\}/gi, (m) => {
      const dm = m.match(/\|\s*description=([^\n|]+)/);
      return dm ? `\n${dm[1].trim()}\n` : '';
    })
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .split('\n').map((l) => l.trim())
    .filter((l) => l && !/^[{}|]+$/.test(l))
    .join('\n');
  const meta = {};
  const stamp = src.match(/\{\{文章戳([\s\S]*?)\}\}/);
  if (stamp) {
    stamp[1].split('\n').forEach((line) => {
      const m = line.match(/^\|([^=|]+)=(.*)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
    });
  }
  const sections = [];
  const headerRe = /^==+\s*([^=]+?)\s*==+\s*$/gm;
  let match;
  const marks = [];
  while ((match = headerRe.exec(clean)) !== null) marks.push({ title: match[1].trim(), start: match.index + match[0].length });
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? clean.lastIndexOf('\n', marks[i + 1].start) : clean.length;
    const body = clean.slice(mark.start, end > mark.start ? end : clean.length)
      .split('\n').map((l) => l.trim()).filter((l) => l && !/^\{\{/.test(l) && !/^\|/.test(l) && !/^\}\}/.test(l) && !/^[{}|]+$/.test(l))
      .join('\n').trim();
    if (body) sections.push({ title: mark.title, text: body.slice(0, 900) });
  });
  const summaryMatch = clean.match(/(蓝色星原[^。\n]{4,80}攻略[^。\n]*)/);
  let summary = summaryMatch ? summaryMatch[1].trim() : '';
  if (!summary) {
    summary = clean.split('\n').map((l) => l.trim())
      .filter((l) => l && !l.startsWith('=') && !l.startsWith('{{') && !l.startsWith('}}') && !l.startsWith('|') && !l.startsWith('[') && !/^[{}|]+$/.test(l))
      .find(() => true) || '';
  }
  return { summary: summary.slice(0, 200), sections: sections.slice(0, 8), meta };
}

function buildEntry(type, row, config) {
  const name = row['名称'] || row.title;
  let category = config.fixedCategory || row[config.categoryField] || row['类型'] || row['大类'] || '';
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
  const summarySource = row['完成条件'] || row['描述'] || row['效果'] || row['功能'] || row['简介'] || '';
  const fallback = [category, rarity, extra].filter(Boolean).join(' · ');
  const summary = clip(summarySource || fallback, 120);
  const desc = clip(row['描述'] || row['完成条件'] || row['简介'] || '', 600);
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
    tagFields: ['星数'],
    // P1-5 扩采：BWIKI 物品 1115 条，本轮 500→900（主包体积分阶段验证）
    limit: 900
  },
  {
    // P1-1 改造：BWIKI 无「敌人」分类（原计划阻塞），改采「书籍」57 条作为阅读物数据源
    type: 'book',
    category: '书籍',
    props: ['名称', '简介', '图片'],
    fixedCategory: '读物',
    tagFields: []
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
  { type: 'qiboWiki', category: '奇波', label: '奇波', props: ['名称', '稀有度', '元素', '简介', '种族', '阶段', '身高', '体型', '特征', '家园工种', '掉落素材', '异色', '进化系列', '进化下级', '进化下级等级', '特性1', '特性1描述', '特性2', '特性2描述', '特性3', '特性3描述'], imgPick: /icon pet|pet/i },
  { type: 'charWiki', category: '角色', label: '角色', props: ['名称', '稀有度', '元素', '简介', '武器', '阵营', '种族', '战斗定位'], imgPick: /icon char|char|icon/i },
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
    ['武器', '阵营', '种族', '战斗定位'].forEach((label) => {
      const v = stripHtml(row[label] || '').trim();
      if (v) entry[label] = clip(v, 40);
    });
    if (skills && skills.length) entry.skills = skills;
  }
  if (type === 'qiboWiki' && skills && skills.length) entry.skills = skills;
  // 奇波/角色扩展字段：种族/阶段/身高/体型/特征/家园工种/掉落素材/异色/进化链 → fields
  const extraLabels = ['种族', '阶段', '身高', '体型', '特征', '家园工种', '掉落素材', '异色', '进化系列', '进化下级', '进化下级等级'];
  if (type === 'qiboWiki') {
    extraLabels.forEach((label) => {
      const v = stripHtml(row[label] || '').trim();
      if (v) entry.fields.push({ label, value: clip(v, 120) });
    });
    const traits = [];
    for (let n = 1; n <= 3; n += 1) {
      const tn = stripHtml(row[`特性${n}`] || '').trim();
      const td = stripHtml(row[`特性${n}描述`] || '').trim();
      if (tn || td) traits.push(`${tn}${td ? '：' + td : ''}`.slice(0, 200));
    }
    if (traits.length) entry.sections.push({ title: '特性', text: traits.join('\n') });
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
        // R3-T1 F1：一图流海报是攻略图不是条目图，两处挑选均排除（角色/奇波页首图常为一图流）
        const hit = files.find((f) => pickRe.test(f) && !/bg|logo|tag|product|skill|一图流/i.test(f)) || files.find((f) => /png|jpg/i.test(f) && !/一图流/i.test(f));
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
  // R3-3：--bundled-only 只按既有全量数据重写内置子集（slimBundled 规则变更时免全量联网）
  if (process.argv.includes('--bundled-only')) {
    if (!previous.types || !Object.keys(previous.types).length) {
      console.error('✖ 无既有全量数据，请先跑完整采集'); process.exitCode = 1; return;
    }
    writeFileSync(BUNDLED_OUTPUT, JSON.stringify(slimBundled(previous)));
    console.log(`✔ bundled-only: 已重写 ${BUNDLED_OUTPUT}（${Object.keys(previous.types).length} 类）`);
    return;
  }
  const next = { generatedAt: new Date().toISOString(), source: 'bwiki', types: { ...(previous.types || {}) } };
  const report = { at: next.generatedAt, types: {}, errors: [] };

  for (const source of SOURCES) {
    try {
      const rows = await queryCategory(source.category, source.props, source.limit);
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
      // desc-cache 继承：collect-desc.mjs 抓取的描述/获取方式，仅对 SMW 无描述的条目回填
      const prevDesc = existsSync(DESC_CACHE) ? JSON.parse(readFileSync(DESC_CACHE, 'utf8')) : {};
      finalItems.forEach((item) => {
        const cachedDesc = prevDesc[item.name] && prevDesc[item.name].desc;
        if (cachedDesc && (!item.desc || item.desc === '暂无简介，详见 BWIKI 页面。')) item.desc = cachedDesc;
      });
      const payload = { notice: makeNotice(source.category, today()), items: finalItems.slice(0, source.limit || MAX_ITEMS) };
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
      // 上轮缓存继承：skillMap/roleMap 先全量填入，仅对需重抓的条目覆盖
      const prevSkills = existsSync(SKILL_CACHE) ? JSON.parse(readFileSync(SKILL_CACHE, 'utf8')) : {};
      const skillMap = {};
      const roleMap = {};
      const prevSections = existsSync(SECTIONS_CACHE) ? JSON.parse(readFileSync(SECTIONS_CACHE, 'utf8')) : {};
      const sectionsMap = {};
      Object.entries(prevSections).forEach(([name, secs]) => {
        if (secs && secs.length) sectionsMap[name] = secs;
      });
      Object.entries(prevSkills).forEach(([name, cached]) => {
        if (cached.skills && cached.skills.length) skillMap[name] = cached.skills;
        if (cached.role) roleMap[name] = cached.role;
      });
      if (source.type === 'charWiki' || source.type === 'qiboWiki') {
        try {
          const pageTitles = rows.map((r) => r.title);
          // 缓存命中即跳过：技能已满额的条目不再重抓页面（省时限流）
          const needTitles = pageTitles.filter((t) => !(prevSkills[t] && (prevSkills[t].skills || []).length >= 3) || (source.type === 'charWiki' && !(prevSections[t] && prevSections[t].length)));
          console.log(`skill pages: ${pageTitles.length} total, ${pageTitles.length - needTitles.length} cached, ${needTitles.length} to fetch`);
          for (let pi = 0; pi < needTitles.length; pi += 1) {
            const t = needTitles[pi];
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
            if (!html) continue;
            const sIdx = html.indexOf('id="技能"');
            if (sIdx < 0) continue;
            const seg = html.slice(sIdx, sIdx + 20000);
            const skills = [];
            const re = source.type === 'charWiki'
              ? /hero-skill-name">([^<]{2,20})<\/span>[\s\S]{0,2000}?hero-skill-desc[a-z-]*"[^>]*>([\s\S]{10,300}?)<\/(?:div|span|p)>/g
              : /skill-name">([^<]{2,20})<\/span>[\s\S]{0,1500}?skill-desc[a-z-]*"[^>]*>([\s\S]{10,300}?)<\/(?:div|span|p)>/g;
            for (const m of seg.matchAll(re)) {
              let desc = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
              // 类型从描述前缀【普攻】等提取
              let stype = '';
              const tm = desc.match(/^【([^】]{1,6})】/);
              if (tm) { stype = tm[1]; desc = desc.replace(/^【[^】]{1,6}】/, '').trim(); }
              if (desc) skills.push({ name: m[1], type: stype || '技能', desc: desc.slice(0, 118) });
            }
            if (skills.length) {
              skillMap[t] = skills.slice(0, 6);
              prevSkills[t] = { skills: skills.slice(0, 6), role: roleMap[t] || '' };
            }
            if (source.type === 'charWiki') {
              // 战斗定位：hero-battle-tag-name 第一个标签
              const tm2 = html.match(/hero-battle-tag-name"[^>]*>[\s\S]{0,80}?<span[^>]*>([^<]{2,10})<\/span>/);
              if (tm2) roleMap[t] = tm2[1];
              // 星赐/信件/故事 sections（缓存命中跳过）
              if (!prevSections[t] || !(prevSections[t] || []).length) {
                try {
                  const jr = await fetch(API, {
                    method: 'POST',
                    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'parse', page: t, prop: 'wikitext', format: 'json' })
                  });
                  const jj = JSON.parse(await jr.text());
                  const wtxt = jj && jj.parse && jj.parse.wikitext && jj.parse.wikitext['*'];
                  if (wtxt) {
                    const secs = parseCharSections(wtxt);
                    if (secs.length) {
                      prevSections[t] = secs;
                      sectionsMap[t] = secs;
                      writeFileSync(SECTIONS_CACHE, JSON.stringify(prevSections));
                    }
                  }
                } catch (e2) {
                  console.warn(`✖ 角色sections: ${e2.message}`);
                }
              }
            }
            await sleep(3500);
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
      // desc-cache 继承：collect-desc.mjs 抓取的描述/获取方式，仅对模板字段为空的条目回填
      const prevDesc = existsSync(DESC_CACHE) ? JSON.parse(readFileSync(DESC_CACHE, 'utf8')) : {};
      const seenWiki = new Set();
      const items = rows
        .map((row) => {
          const entry = wikiEntry(source.type, row, imgMap[row.title], skillMap && skillMap[row.title]);
          if (source.type === 'charWiki' && roleMap[row.title]) entry.role = roleMap[row.title];
          if (source.type === 'charWiki' && sectionsMap[row.title]) entry.sections = sectionsMap[row.title];
          if (!entry.icon && aggMap[row.title]) entry.icon = aggMap[row.title];
          if (!entry.icon && previousIcons[entry.name]) entry.icon = previousIcons[entry.name];
          const cachedDesc = prevDesc[entry.name] && prevDesc[entry.name].desc;
          if (cachedDesc && (!entry.desc || entry.desc === '暂无简介，详见 BWIKI 页面。')) entry.desc = cachedDesc;
          return entry;
        })
        .filter((item) => item.name && !seenWiki.has(item.id) && seenWiki.add(item.id));
      const withIcon = items.filter((item) => item.icon).length;
      const withSkills = items.filter((item) => item.skills && item.skills.length).length;
      if (withSkills) report.types[`${source.type}_skills`] = withSkills;
      // 持久化技能缓存（供下轮限流兜底）
      try { writeFileSync(SKILL_CACHE, JSON.stringify(prevSkills)); } catch (e) { /* ignore */ }
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
    // 一图流海报不再写入 icon（海报裁剪当头像观感错乱）；详情页经 guidePoster 按名匹配独立展示
    console.log(`✔ charWiki 一图流海报 ${Object.keys(guideIcon).length} 张保留于 guide 目录（详情页展示）`);
  }

  // 奇波特性按页抓取（wikitext），缓存增量，限速 3s
  if (next.types.qiboWiki && Array.isArray(next.types.qiboWiki.items)) {
    const prevKiboSecs = existsSync(KIBO_SECTIONS_CACHE) ? JSON.parse(readFileSync(KIBO_SECTIONS_CACHE, 'utf8')) : {};
    let kiboFetched = 0;
    for (const it of next.types.qiboWiki.items) {
      if (it.sections && it.sections.length) continue;
      const cached = prevKiboSecs[it.name];
      if (cached && cached.length) { it.sections = cached; continue; }
      if (kiboFetched >= 60) continue; // 单轮上限，分批完成
      try {
        const jr = await fetch(API, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'parse', page: it.name, prop: 'wikitext', format: 'json' })
        });
        const jj = JSON.parse(await jr.text());
        const wtxt = jj && jj.parse && jj.parse.wikitext && jj.parse.wikitext['*'];
        if (wtxt) {
          const secs = parseKiboTraits(wtxt);
          prevKiboSecs[it.name] = secs;
          if (secs.length) it.sections = secs;
        } else {
          prevKiboSecs[it.name] = [];
        }
        kiboFetched += 1;
        await sleep(3000);
      } catch (e3) {
        console.warn(`✖ 奇波特性 ${it.name}: ${e3.message}`);
        await sleep(6000);
      }
    }
    try { writeFileSync(KIBO_SECTIONS_CACHE, JSON.stringify(prevKiboSecs)); } catch (e4) { /* ignore */ }
    console.log(`✔ 奇波特性抓取 ${kiboFetched} 页（本轮上限 60）`);

    // R2-6 奇波技能分级（wikitext 模板 描述1~5），独立缓存增量，限速 3s，单轮上限 40
    const KIBO_SKILL_CACHE = join(projectRoot, 'src/data/generated/kibo-skills-cache.json');
    const prevKiboSkills = existsSync(KIBO_SKILL_CACHE) ? JSON.parse(readFileSync(KIBO_SKILL_CACHE, 'utf8')) : {};
    let skillFetched = 0;
    for (const it of next.types.qiboWiki.items) {
      const cachedSkills = prevKiboSkills[it.name];
      if (cachedSkills && cachedSkills.length) {
        // 缓存命中：合并分级（压缩模板优先），desc 保留最高档
        const attach = (skill, tplSkill) => {
          const packed = compressLevels(tplSkill.levels);
          if (packed) skill.lvls = packed;
          else if (tplSkill.levels && tplSkill.levels.length > 1) skill.levels = tplSkill.levels;
        };
        (it.skills || []).forEach((s) => {
          const hit = cachedSkills.find((c) => c.name === s.name);
          if (hit) attach(s, hit);
        });
        // 条目无 skills 或缺级档时用模板技能补充
        if (!it.skills || !it.skills.length) {
          it.skills = cachedSkills.map((c) => {
            const out = { name: c.name, type: c.type, desc: c.desc };
            attach(out, c);
            return out;
          });
        } else {
          cachedSkills.forEach((c) => {
            if (!(it.skills || []).some((s) => s.name === c.name) && (c.levels || []).length) {
              const out = { name: c.name, type: c.type, desc: c.desc };
              attach(out, c);
              it.skills.push(out);
            }
          });
        }
        continue;
      }
      if (skillFetched >= 40) continue; // 单轮上限，分批完成
      try {
        const jr = await fetch(API, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'parse', page: it.name, prop: 'wikitext', format: 'json' })
        });
        const jj = JSON.parse(await jr.text());
        const wtxt = jj && jj.parse && jj.parse.wikitext && jj.parse.wikitext['*'];
        if (wtxt) {
          const tplSkills = parseKiboSkills(wtxt);
          prevKiboSkills[it.name] = tplSkills;
          if (tplSkills.length) {
            (it.skills || []).forEach((s) => {
              const hit = tplSkills.find((c) => c.name === s.name);
              if (hit && hit.levels && hit.levels.length > 1) {
                const packed = compressLevels(hit.levels);
                if (packed) s.lvls = packed;
                else s.levels = hit.levels;
              }
            });
            if (!it.skills || !it.skills.length) {
              it.skills = tplSkills.map((c) => {
                const packed = compressLevels(c.levels);
                return { name: c.name, type: c.type, desc: c.desc, ...(packed ? { lvls: packed } : { levels: c.levels }) };
              });
            } else {
              tplSkills.forEach((c) => {
                if (!(it.skills || []).some((s) => s.name === c.name) && (c.levels || []).length) {
                  const packed = compressLevels(c.levels);
                  it.skills.push({ name: c.name, type: c.type, desc: c.desc, ...(packed ? { lvls: packed } : { levels: c.levels }) });
                }
              });
            }
          }
        } else {
          prevKiboSkills[it.name] = [];
        }
        skillFetched += 1;
        await sleep(3000);
      } catch (e7) {
        console.warn(`✖ 奇波技能 ${it.name}: ${e7.message}`);
        await sleep(6000);
      }
    }
    try { writeFileSync(KIBO_SKILL_CACHE, JSON.stringify(prevKiboSkills)); } catch (e8) { /* ignore */ }
    const withLevels = next.types.qiboWiki.items.filter((it) => (it.skills || []).some((s) => (s.levels && s.levels.length > 1) || s.lvls)).length;
    console.log(`✔ 奇波技能分级抓取 ${skillFetched} 页（本轮上限 40），已带分档条目 ${withLevels}/${next.types.qiboWiki.items.length}`);
  }

  // R2-4 攻略正文增强：抓取攻略页文章戳元信息 + 章节正文，填充 summary/desc/sections/fields（缓存增量，限速 3s）
  if (next.types.guideWiki && Array.isArray(next.types.guideWiki.items)) {
    const prevGuide = existsSync(GUIDE_SECTIONS_CACHE) ? JSON.parse(readFileSync(GUIDE_SECTIONS_CACHE, 'utf8')) : {};
    let guideFetched = 0;
    for (const it of next.types.guideWiki.items) {
      const needBody = !it.sections || !it.sections.length;
      const needSummary = !it.summary || it.summary === '暂无简介，详见 BWIKI 页面。';
      if (!needBody && !needSummary) continue;
      const cached = prevGuide[it.name];
      if (cached) {
        if (cached.summary && needSummary) { it.summary = cached.summary; it.desc = cached.summary; }
        if (cached.sections && cached.sections.length && needBody) it.sections = cached.sections;
        if (cached.meta) {
          const rows = [];
          if (cached.meta['作者']) rows.push({ label: '作者', value: cached.meta['作者'] });
          if (cached.meta['时间']) rows.push({ label: '发布时间', value: cached.meta['时间'] });
          if (cached.meta['是否原创']) rows.push({ label: '类型', value: cached.meta['是否原创'] === '是' ? '原创攻略' : '转载攻略' });
          if (rows.length) it.fields = rows;
        }
        continue;
      }
      if (guideFetched >= 30) continue; // 单轮上限，分批完成
      try {
        const jr = await fetch(API, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'parse', page: it.name, prop: 'wikitext', format: 'json' })
        });
        const jj = JSON.parse(await jr.text());
        const wtxt = jj && jj.parse && jj.parse.wikitext && jj.parse.wikitext['*'];
        if (wtxt) {
          const detail = parseGuideDetail(wtxt);
          prevGuide[it.name] = { summary: detail.summary, sections: detail.sections, meta: detail.meta };
          if (detail.summary && needSummary) { it.summary = detail.summary; it.desc = detail.summary; }
          if (detail.sections.length && needBody) it.sections = detail.sections;
          if (detail.meta) {
            const rows = [];
            if (detail.meta['作者']) rows.push({ label: '作者', value: detail.meta['作者'] });
            if (detail.meta['时间']) rows.push({ label: '发布时间', value: detail.meta['时间'] });
            if (detail.meta['是否原创']) rows.push({ label: '类型', value: detail.meta['是否原创'] === '是' ? '原创攻略' : '转载攻略' });
            if (rows.length) it.fields = rows;
          }
        } else {
          prevGuide[it.name] = { summary: '', sections: [], meta: {} };
        }
        guideFetched += 1;
        await sleep(3000);
      } catch (e5) {
        console.warn(`✖ 攻略正文 ${it.name}: ${e5.message}`);
        await sleep(6000);
      }
    }
    try { writeFileSync(GUIDE_SECTIONS_CACHE, JSON.stringify(prevGuide)); } catch (e6) { /* ignore */ }
    console.log(`✔ 攻略正文抓取 ${guideFetched} 页（本轮上限 30）`);
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
    // 钓鱼图鉴扩展：鱼类（名以"鱼"结尾，排除料理）+ 鱼竿 + 原类目匹配 + 钓点/钓鱼事件分类页
    const isFishName = (name) => /鱼$/.test(name) && !/烤鱼$/.test(name) && !/鱼肉/.test(name);
    const fishingByName = itemPayload.items.filter((item) => {
      const name = item.name || '';
      return /鱼竿/.test(name) || isFishName(name) || /鱼|钓/.test(item.category || '');
    });
    const seen = new Set();
    const fishing = fishingByName.filter((item) => (seen.has(item.name) ? false : (seen.add(item.name), true)));
    const fishingExtras = [];
    try {
      const spotProps = ['名称', '稀有度', '描述', '解锁', '图片'];
      const spotRows = await queryCategory('钓点', spotProps);
      spotRows.forEach((row) => fishingExtras.push(buildEntry('fishing', { ...row, '类型': '钓点' }, { categoryField: '类型', tagFields: [] })));
      const eventRows = await queryCategory('钓鱼事件', spotProps);
      eventRows.forEach((row) => fishingExtras.push(buildEntry('fishing', { ...row, '类型': '钓鱼事件' }, { categoryField: '类型', tagFields: [] })));
      // 鱼类/鱼竿名称直查（物品总表 500 条截断会漏，单独按名称模糊查）
      const toRows = (json) => {
        const results = (json && json.query && json.query.results) || {};
        return Object.keys(results).map((title) => {
          const entry = results[title];
          const printouts = entry.printouts || {};
          const row = { title: entry.fulltext || title };
          ['名称', '稀有度', '类别', '描述', '图片'].forEach((prop) => {
            row[prop] = plain(printouts[prop]);
          });
          return row;
        });
      };
      const fishJson = await ask('[[分类:物品]][[名称::~*鱼*]]|?名称|?稀有度|?类别|?描述|?图片|limit=100');
      toRows(fishJson).forEach((row) => {
        const name = row['名称'] || row.title;
        if (!/鱼竿/.test(name) && !isFishName(name)) return;
        fishingExtras.push(buildEntry('fishing', { ...row, '类型': /鱼竿/.test(name) ? '鱼竿' : '鱼类' }, { categoryField: '类型', tagFields: [] }));
      });
    } catch (error) {
      console.warn(`✖ 钓点/钓鱼事件采集: ${error.message}`);
    }
    const mergedFishing = fishing.concat(fishingExtras.filter((extra) => {
      if (seen.has(extra.name)) return false;
      seen.add(extra.name);
      return true;
    }));
    if (mergedFishing.length >= 3) {
      next.types.fishing = {
        notice: makeNotice('钓鱼', today()),
        items: mergedFishing.slice(0, MAX_ITEMS)
      };
      report.types.fishing = mergedFishing.length;
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(next));
  writeFileSync(BUNDLED_OUTPUT, JSON.stringify(slimBundled(next)));
  const logLine = JSON.stringify({ ...report, cloud: 'skipped: no CLOUD_ENV_ID' });
  mkdirSync(dirname(LOG_FILE), { recursive: true });
  writeFileSync(LOG_FILE, `${logLine}\n`, { flag: 'a' });
  console.log(`\n写入 ${OUTPUT}`);
  console.log(`写入 ${BUNDLED_OUTPUT}（内置回退子集）`);
}

main().catch((error) => {
  console.error(`采集失败：${error.message}`);
  process.exitCode = 1;
});
