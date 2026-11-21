// 公开数据源审计：只读抓取 CBT3 Wiki、BWIKI 与官网，并和项目当前数据生成独立对比报告。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { characters } from '../src/data/character.js';
import { qibos } from '../src/data/qibo.js';
import {
  affixCatalog,
  characterSupplement,
  dungeonCatalog,
  enemyCatalog,
  fishingCatalog,
  qiboSupplement,
  regionCatalog
} from '../src/data/manual-catalogs.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const auditDate = new Date().toISOString().slice(0, 10);
const outputDir = join(projectRoot, 'docs', `数据源审计_${auditDate}`);
const bwikiApi = 'https://wiki.biligame.com/ap/api.php';
const cbt3Base = 'https://ap-cbt3.csxylic.com';
const officialHome = 'https://azurpromilia.manjuu.com/home/';
const userAgent = 'Mozilla/5.0 (compatible; qbxzs-public-data-audit/1.0; +local-readonly)';
const elementById = { 1: '火', 2: '风', 3: '地', 4: '木', 5: '冰', 6: '水', 7: '雷', 8: '光', 9: '暗' };
const generatedTypeMap = { charWiki: 'character', qiboWiki: 'qibo', guideWiki: 'guide' };
const requiredRoles = {
  character: ['icon', 'avatar', 'art', 'circle', 'portraitM'],
  qibo: ['icon', 'card']
};

const cbtPages = [
  ['character', '/hero/'], ['qibo', '/pet/'], ['equipment', '/equipment/'],
  ['spirit', '/soulessence/'], ['enemy', '/enemy/'], ['item', '/items/'],
  ['book', '/reading/'], ['dungeon', '/dungeon/'], ['kiboduel', '/kiboduel/'],
  ['tutorial', '/guide/'], ['task', '/task/'], ['abyss', '/abyss/'],
  ['achievement', '/achievement/1/'], ['achievement', '/achievement/2/'],
  ['achievement', '/achievement/3/'], ['achievement', '/achievement/4/'],
  ['achievement', '/achievement/5/'], ['building', '/home/building/'],
  ['home_level', '/home/level/'], ['home_product', '/home/product/'],
  ['home_tech', '/home/tech/'], ['home_order', '/home/order/'],
  ['home_seed', '/home/seed/'], ['home_shop', '/home/shop/'],
  ['home_collection', '/home/collection/']
];

const bwikiSources = [
  { type: 'spirit', category: '灵子', props: ['名称', '稀有度', '职业', '筛选属性', '图片'], categoryField: '职业' },
  { type: 'item', category: '物品', props: ['名称', '稀有度', '星数', '筛选类型', '类别', '描述', '图片'], categoryField: '筛选类型' },
  { type: 'book', category: '书籍', props: ['名称', '简介', '图片'], fixedCategory: '读物' },
  { type: 'equipment', category: '装备', props: ['名称', '稀有度', '套装id', '类型', '图片'], categoryField: '类型' },
  { type: 'food', category: '料理', props: ['名称', '稀有度', '料理类型', '角色饱腹值', '奇波饱腹值', '图片'], categoryField: '料理类型' },
  { type: 'building', category: '建筑', props: ['名称', '类型', '功能', '描述', '解锁', '建造材料', '图片'], categoryField: '类型' },
  { type: 'achievement', category: '成就', props: ['名称', '大类', '小类', '奖杯等级', '成就点数', '完成条件', '图片'], categoryField: '大类' },
  { type: 'qibo', category: '奇波', props: ['名称', '稀有度', '元素', '简介', '种族', '阶段', '体型', '家园工种', '图片'], categoryField: '种族' },
  { type: 'character', category: '角色', props: ['名称', '稀有度', '元素', '简介', '武器', '阵营', '种族', '战斗定位', '图片'], categoryField: '战斗定位' },
  { type: 'guide', category: '攻略', props: ['名称', '简介', '图片'], fixedCategory: '攻略' }
];

// 带退避地读取公开文本，网络短暂失败时最多重试三次。
async function fetchText(url, options = {}, attempt = 0) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'User-Agent': userAgent, ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 2) throw error;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500 * (attempt + 1)));
    return fetchText(url, options, attempt + 1);
  }
}

// 把有限的 HTML 实体还原为可比较文本。
function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

// 去除标签并压平空白，供名称、摘要和卡片文本比较。
function cleanText(value) {
  return decodeHtml(String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// 解析单个 HTML 起始标签中的属性。
function parseAttributes(value) {
  const attrs = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of String(value || '').matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

// 生成跨来源名称键，忽略空格和全半角括号差异。
function normalizeName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\s·・]/g, '')
    .replace(/[（）()]/g, '')
    .toLowerCase();
}

// 把稀有度统一为“数字星”口径，无法识别时保留原文。
function normalizeRarity(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digit = raw.match(/[1-5]/)?.[0];
  if (digit) return `${digit}星`;
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 };
  const chinese = raw.match(/[一二三四五]/)?.[0];
  return chinese ? `${map[chinese]}星` : raw;
}

// 把中英文元素名称统一为中文并排序去重。
function normalizeElements(value) {
  const map = {
    fire: '火', flame: '火', wind: '风', earth: '地', wood: '木', nature: '木',
    ice: '冰', water: '水', thunder: '雷', lightning: '雷', light: '光', dark: '暗',
    火: '火', 风: '风', 地: '地', 木: '木', 冰: '冰', 水: '水', 雷: '雷', 光: '光', 暗: '暗'
  };
  const tokens = Array.isArray(value) ? value : String(value || '').split(/[、,，/|\s]+/);
  const result = [];
  for (const token of tokens) {
    const key = String(token || '').trim().toLowerCase();
    if (map[key]) result.push(map[key]);
    for (const char of String(token || '')) if (map[char]) result.push(map[char]);
  }
  return [...new Set(result)].sort().join('、');
}

// 把任意值转为紧凑 JSON，避免 CSV 中丢失来源字段。
function compactJson(value) {
  return JSON.stringify(value ?? {}, null, 0);
}

// 把值转义为标准 CSV 单元格。
function csvCell(value) {
  const text = Array.isArray(value) ? value.join('、') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

// 以 UTF-8 无 BOM 和 CRLF 输出 CSV，便于 Windows Excel 直接打开。
function writeCsv(file, rows, columns) {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','));
  writeFileSync(file, `${lines.join('\r\n')}\r\n`, 'utf8');
}

// 从指定 class 的元素中提取第一段文本。
function textByClass(body, className) {
  const pattern = new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  return cleanText(body.match(pattern)?.[1] || '');
}

// 从卡片 HTML 中选取最可能的主图，排除星级、货币和稀有度背景。
function imageFromCard(body, name) {
  const images = [];
  for (const match of String(body || '').matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = parseAttributes(match[1]);
    if (!attrs.src) continue;
    images.push(attrs);
  }
  const exact = images.find((item) => cleanText(item.alt) === cleanText(name));
  if (exact) return exact.src;
  const useful = images.find((item) => !/rarity|status_star|currency|element|petelem/i.test(`${item.src} ${item.class || ''}`));
  return useful?.src || '';
}

// 从 CBT3 卡片读取元素标签，必要时回退到 data-element 数字映射。
function elementsFromCard(body, attrs) {
  const fromText = [];
  for (const match of String(body || '').matchAll(/(?:主属性|副属性)[:：]\s*([火风地木冰水雷光暗])属性/g)) fromText.push(match[1]);
  if (!fromText.length) {
    const text = cleanText(body);
    for (const match of text.matchAll(/(?:^|\s)([火风地木冰水雷光暗])(?:\s|$)/g)) fromText.push(match[1]);
  }
  if (!fromText.length && attrs['data-element']) {
    for (const id of attrs['data-element'].split(',')) if (elementById[id]) fromText.push(elementById[id]);
  }
  return normalizeElements(fromText);
}

// 从 CBT3 列表页抽取卡片级公开数据，不逐页抓取正文。
function parseCbtCards(html, type, pagePath) {
  const rows = [];
  for (const match of String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = parseAttributes(match[1]);
    const body = match[2];
    const href = attrs.href || '';
    if (!/(^|\s)card(?:\s|$)/.test(attrs.class || '') || !href.startsWith(pagePath)) continue;
    if (href.replace(pagePath, '').split('/').filter(Boolean).length < 1) continue;
    const name = cleanText(attrs['data-name'])
      || textByClass(body, 'card-name')
      || textByClass(body, 'level-name')
      || cleanText(body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || '')
      || cleanText(body.match(/<img\b[^>]*alt="([^"]+)"/i)?.[1] || '');
    if (!name) continue;
    const rawFields = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')));
    const rarity = body.match(/title="([1-5]星)"/i)?.[1]
      || body.match(/\bcap-([1-5])\b/i)?.[1]?.concat('星')
      || '';
    const sourceId = href.split('/').filter(Boolean).pop() || '';
    const cardImage = imageFromCard(body, name);
    rows.push({
      source: 'cbt3', type, name, sourceId, rarity: normalizeRarity(rarity),
      elements: elementsFromCard(body, attrs),
      category: [attrs['data-type'], attrs['data-bag'], attrs['data-slot']].find((value) => value && !/^\d+$/.test(value)) || '',
      role: '', faction: '', imageRef: cardImage ? new URL(cardImage, cbt3Base).href : '', imageRoles: cardImage ? ['icon'] : [],
      url: new URL(href, cbt3Base).href, raw: { attributes: rawFields, cardText: cleanText(body).slice(0, 600) }
    });
  }
  return rows;
}

// 从 CBT3 成就分类页的表格行抽取名称、完成条件和点数。
function parseCbtAchievements(html, pagePath) {
  const rows = [];
  let section = '';
  const tokens = String(html || '').match(/<h2\b[\s\S]*?<\/h2>|<tr\b[\s\S]*?<\/tr>/gi) || [];
  for (const token of tokens) {
    if (/^<h2\b/i.test(token)) {
      section = cleanText(token).replace(/\d+$/, '').trim();
      continue;
    }
    const cells = [...token.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => cleanText(match[1]));
    if (cells.length < 4 || !cells[1] || cells[1] === '名称') continue;
    rows.push({
      source: 'cbt3', type: 'achievement', name: cells[1], sourceId: `${pagePath}:${rows.length + 1}`,
      rarity: '', elements: '', category: section, role: '', faction: '', imageRef: '', imageRoles: [],
      url: new URL(pagePath, cbt3Base).href,
      raw: { tier: cells[0], description: cells[2], points: cells[3], section }
    });
  }
  return rows;
}

// 以有限并发执行网络任务，避免给公开站点造成突发压力。
async function mapLimit(items, limit, worker) {
  const result = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return result;
}

// 拉取 CBT3 各聚合页并形成统一记录，料理从背包 bag=4 派生一份对照视图。
async function fetchCbt3() {
  const parts = await mapLimit(cbtPages, 4, async ([type, pagePath]) => {
    const html = await fetchText(new URL(pagePath, cbt3Base).href);
    return type === 'achievement' ? parseCbtAchievements(html, pagePath) : parseCbtCards(html, type, pagePath);
  });
  const rows = parts.flat();
  const foodRows = rows
    .filter((row) => row.type === 'item' && row.raw.attributes['data-bag'] === '4')
    .map((row) => ({ ...row, type: 'food', raw: { ...row.raw, derivedFrom: 'item:data-bag=4' } }));
  return rows.concat(foodRows);
}

// 把 Semantic MediaWiki 的数组、对象和字符串统一为纯文本。
function smwPlain(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => {
    if (typeof item === 'string') return cleanText(item);
    if (item && typeof item === 'object') return cleanText(item.fulltext || item.title || item['*'] || '');
    return cleanText(item);
  }).filter(Boolean).join('、');
}

// 通过 BWIKI 的公开 SMW API 读取一个分类及指定字段。
async function fetchSmwCategory(source) {
  const prints = source.props.map((prop) => `|?${prop}`).join('');
  const query = `[[分类:${source.category}]]${prints}|limit=2000|order=asc`;
  const text = await fetchText(bwikiApi, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ action: 'ask', format: 'json', query })
  });
  const json = JSON.parse(text);
  const results = json?.query?.results || {};
  return Object.entries(results).map(([title, entry]) => {
    const row = { title: entry.fulltext || title };
    for (const prop of source.props) row[prop] = smwPlain(entry.printouts?.[prop]);
    return row;
  });
}

// 把 BWIKI 行转换为跨来源可比较记录。
function bwikiRecord(source, row) {
  const name = row.title || row['名称'];
  const element = row['元素'] || '';
  const category = source.fixedCategory || row[source.categoryField] || '';
  return {
    source: 'bwiki', type: source.type, name, sourceId: '', rarity: normalizeRarity(row['稀有度']),
    elements: normalizeElements(element), category, role: row['战斗定位'] || '', faction: row['阵营'] || '',
    imageRef: row['图片'] || '', imageRoles: row['图片'] ? ['icon'] : [],
    url: `https://wiki.biligame.com/ap/${encodeURIComponent(name)}`,
    raw: row
  };
}

// 为角色、奇波和攻略补查 MediaWiki 页面主图，解决 SMW 图片字段为空的问题。
async function resolveBwikiPageImages(rows) {
  const targets = rows.filter((row) => ['character', 'qibo', 'guide'].includes(row.type) && !row.imageRef);
  for (let index = 0; index < targets.length; index += 40) {
    const batch = targets.slice(index, index + 40);
    const body = new URLSearchParams({
      action: 'query', format: 'json', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: '240',
      titles: batch.map((row) => row.name).join('|')
    });
    try {
      const json = JSON.parse(await fetchText(bwikiApi, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
      }));
      const byTitle = new Map(Object.values(json?.query?.pages || {}).map((page) => [normalizeName(page.title), page]));
      for (const row of batch) {
        const page = byTitle.get(normalizeName(row.name));
        const image = page?.thumbnail?.source || page?.pageimage || '';
        if (image) {
          row.imageRef = image;
          row.imageRoles = ['icon'];
        }
      }
    } catch (error) {
      console.warn(`BWIKI 页面图片补查失败：${error.message}`);
    }
  }
}

// 拉取 BWIKI 主分类，并派生材料和钓鱼两个项目现有视图。
async function fetchBwiki() {
  const groups = await mapLimit(bwikiSources, 3, async (source) => {
    const rows = await fetchSmwCategory(source);
    return rows.map((row) => bwikiRecord(source, row));
  });
  const rows = groups.flat();
  const itemRows = rows.filter((row) => row.type === 'item');
  const materialRows = itemRows
    .filter((row) => /材料|素材/.test(row.category))
    .map((row) => ({ ...row, type: 'material', raw: { ...row.raw, derivedFrom: 'item-category' } }));
  const fishingRows = itemRows.filter((row) => {
    const name = row.name || '';
    return /鱼竿/.test(name) || (/鱼$/.test(name) && !/烤鱼$|鱼肉/.test(name)) || /鱼|钓/.test(row.category);
  }).map((row) => ({ ...row, type: 'fishing', raw: { ...row.raw, derivedFrom: 'item-fishing-rule' } }));
  const extraSources = [
    { type: 'fishing', category: '钓点', props: ['名称', '稀有度', '描述', '解锁', '图片'], fixedCategory: '钓点' },
    { type: 'fishing', category: '钓鱼事件', props: ['名称', '稀有度', '描述', '解锁', '图片'], fixedCategory: '钓鱼事件' }
  ];
  const extraGroups = await mapLimit(extraSources, 2, async (source) => {
    const extraRows = await fetchSmwCategory(source);
    return extraRows.map((row) => bwikiRecord(source, row));
  });
  const seenFishing = new Set();
  const mergedFishing = fishingRows.concat(extraGroups.flat()).filter((row) => {
    const key = normalizeName(row.name);
    if (seenFishing.has(key)) return false;
    seenFishing.add(key);
    return true;
  });
  const result = rows.concat(materialRows, mergedFishing);
  await resolveBwikiPageImages(result);
  return result;
}

// 从当前运行时映射中读取条目已接入的图片用途。
function runtimeRoles(runtime, type, id) {
  const codeMap = { i: 'icon', a: 'avatar', r: 'art', m: 'portraitM', o: 'circle', c: 'card', p: 'poster' };
  const entry = runtime?.t?.[type]?.[id] || {};
  return Object.keys(entry).map((key) => codeMap[key] || key);
}

// 从站点图片映射快照补充可用用途，供缺图诊断使用。
function siteMapRoles(siteMap, originalType, id, name) {
  const rows = siteMap?.types?.[originalType] || [];
  const row = rows.find((item) => item.id === id) || rows.find((item) => normalizeName(item.name) === normalizeName(name));
  return row ? Object.keys(row.images || {}) : [];
}

// 把项目当前条目转换为统一记录，并保留数据来源和图片用途。
function currentRecord(type, originalType, item, origin, runtime, siteMap) {
  const directRoles = item.icon ? ['icon'] : [];
  const mappedRoles = runtimeRoles(runtime, originalType, item.id);
  const availableRoles = siteMapRoles(siteMap, originalType, item.id, item.name);
  const imageRoles = [...new Set(directRoles.concat(mappedRoles))];
  return {
    source: 'current', type, name: item.name || '', sourceId: item.id || '', rarity: normalizeRarity(item.rarity),
    elements: normalizeElements(item.elements || item.element || item.tags || []),
    category: /^(BWIKI|BWIKI收录)$/.test(item.category || item.kind || '') ? '' : (item.category || item.kind || ''),
    role: item.role || item['战斗定位'] || '', faction: item.camp || item['阵营'] || '',
    imageRef: item.icon || '', imageRoles, availableRoles, origin, url: '', raw: item
  };
}

// 读取项目现有主数据、手工补充和演示数据，不执行运行时代码合并。
function loadCurrent() {
  const generated = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8'));
  const runtime = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/image-runtime.json'), 'utf8'));
  const siteMap = JSON.parse(readFileSync(join(projectRoot, 'src/data/site/image-map.json'), 'utf8'));
  const rows = [];
  for (const [originalType, payload] of Object.entries(generated.types || {})) {
    const type = generatedTypeMap[originalType] || originalType;
    for (const item of payload.items || []) rows.push(currentRecord(type, originalType, item, 'generated', runtime, siteMap));
  }
  const manualGroups = [
    ['character', 'character', characters, 'example'], ['qibo', 'qibo', qibos, 'example'],
    ['enemy', 'enemy', enemyCatalog.items, 'manual'], ['dungeon', 'dungeon', dungeonCatalog.items, 'manual'],
    ['region', 'region', regionCatalog.items, 'manual'], ['affix', 'affix', affixCatalog.items, 'manual'],
    ['fishing', 'fishing', fishingCatalog.items, 'manual'],
    ['character', 'character', characterSupplement.items, 'supplement'],
    ['qibo', 'qibo', qiboSupplement.items, 'supplement']
  ];
  for (const [type, originalType, items, origin] of manualGroups) {
    for (const item of items || []) rows.push(currentRecord(type, originalType, item, origin, runtime, siteMap));
  }
  return { rows, generatedAt: generated.generatedAt, imageMapAt: siteMap.generatedAt, siteMap };
}

// 用项目最近一次 BWIKI 图片映射补足在线 SMW 不暴露的角色、奇波和攻略图片字段。
function supplementBwikiImagesFromSiteMap(rows, siteMap) {
  const typeMap = { character: 'charWiki', qibo: 'qiboWiki', guide: 'guideWiki' };
  for (const row of rows) {
    const mappedType = typeMap[row.type] || row.type;
    const mapped = (siteMap?.types?.[mappedType] || []).find((item) => normalizeName(item.name) === normalizeName(row.name));
    const roles = Object.keys(mapped?.images || {});
    if (!roles.length) continue;
    const mappedUrl = mapped.images[roles[0]]?.originUrl || mapped.images[roles[0]]?.asset || '';
    if (mappedUrl) row.imageRef = mappedUrl;
    row.imageRoles = roles;
    row.raw.imageEvidence = `项目图片映射快照 ${siteMap.generatedAt}`;
  }
}

// 构造官网主页明确展示的角色和奇波记录；官网没有公开完整数值数据库。
function loadOfficial() {
  const prefix = 'https://plat-cdn.manjuu.com/platform/33c42214-f1f6-42a3-8e3a-ee4045bdfa74/P3OfficialWebsite/prod/_next/static/media/';
  const charactersOfficial = [
    ['艾妮丝', 'Anais', '弗利斯城邦', `${prefix}name_zh.1dd4805b.png`],
    ['姬瑟贝露', 'Cathbelle', '弗利斯城邦', `${prefix}name_zh.2268bb77.png`],
    ['西芙莉雅', 'Symphonia', '洛斯兰瑟', `${prefix}name_zh.f4019cd7.png`],
    ['忒拉拉', 'Terara', '夏露露村', `${prefix}name_zh.e4b9c580.png`]
  ];
  const qiboOfficial = [
    ['星鳐', 'STARAY'], ['绒心布里尼', 'DOWNYBRINNY'], ['菜鸡', 'CABBIRD'],
    ['布鲁达', 'BLUDA'], ['怯影之翼', 'VESPERVAMP']
  ];
  const rows = charactersOfficial.map(([name, english, faction, imageRef]) => ({
    source: 'official', type: 'character', name, sourceId: '', rarity: '', elements: '', category: '', role: '', faction,
    imageRef, imageRoles: ['official-showcase'], url: officialHome, raw: { english, faction, scope: 'homepage-showcase' }
  }));
  rows.push(...qiboOfficial.map(([name, english]) => ({
    source: 'official', type: 'qibo', name, sourceId: '', rarity: '', elements: '', category: '', role: '', faction: '',
    imageRef: officialHome, imageRoles: ['official-showcase'], url: officialHome, raw: { english, scope: 'homepage-showcase' }
  })));
  return rows;
}

// 对同一类型与规范化名称进行跨来源归组。
function groupRecords(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.type}|${normalizeName(record.name)}`;
    if (!groups.has(key)) groups.set(key, { type: record.type, key: normalizeName(record.name), records: [] });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}

// 读取某来源在归组内的全部记录。
function recordsOf(group, source) {
  return group.records.filter((record) => record.source === source);
}

// 合并一组记录的字段值并去重。
function joinedValues(records, field) {
  return [...new Set(records.map((record) => String(record[field] || '').trim()).filter(Boolean))].join('｜');
}

// 生成全量条目差异表，每行对应一个类型与规范化名称。
function buildComparison(groups) {
  return groups.map((group) => {
    const current = recordsOf(group, 'current');
    const bwiki = recordsOf(group, 'bwiki');
    const cbt3 = recordsOf(group, 'cbt3');
    const official = recordsOf(group, 'official');
    const preferred = official[0] || bwiki[0] || cbt3[0] || current[0];
    const differences = [];
    if (!current.length) differences.push('项目当前缺少');
    if (current.length && !bwiki.length) differences.push('BWIKI无同名条目');
    if (current.length && !cbt3.length) differences.push('CBT3无同名条目');
    if (bwiki.length && !current.length) differences.push('BWIKI新增候选');
    if (cbt3.length && !current.length) differences.push('CBT3新增候选');
    if (official.length && !current.length) differences.push('官网展示但项目缺少');
    return {
      type: group.type, name: preferred?.name || '',
      current_name: joinedValues(current, 'name'), current_count: current.length,
      current_origin: joinedValues(current, 'origin'), current_rarity: joinedValues(current, 'rarity'),
      current_elements: joinedValues(current, 'elements'), current_category: joinedValues(current, 'category'),
      current_role: joinedValues(current, 'role'), current_faction: joinedValues(current, 'faction'),
      current_image: current.some((record) => record.imageRoles.length) ? '有' : '无',
      bwiki_name: joinedValues(bwiki, 'name'), bwiki_rarity: joinedValues(bwiki, 'rarity'),
      bwiki_elements: joinedValues(bwiki, 'elements'), bwiki_category: joinedValues(bwiki, 'category'),
      bwiki_role: joinedValues(bwiki, 'role'), bwiki_faction: joinedValues(bwiki, 'faction'),
      bwiki_image: bwiki.some((record) => record.imageRef) ? '有' : '无', bwiki_url: joinedValues(bwiki, 'url'),
      cbt3_name: joinedValues(cbt3, 'name'), cbt3_rarity: joinedValues(cbt3, 'rarity'),
      cbt3_elements: joinedValues(cbt3, 'elements'), cbt3_category: joinedValues(cbt3, 'category'),
      cbt3_image: cbt3.some((record) => record.imageRef) ? '有' : '无', cbt3_url: joinedValues(cbt3, 'url'),
      official_name: joinedValues(official, 'name'), official_faction: joinedValues(official, 'faction'),
      official_image: official.some((record) => record.imageRef) ? '有' : '无', official_url: joinedValues(official, 'url'),
      difference: differences.join('；'),
      current_raw: compactJson(current.map((record) => record.raw)),
      bwiki_raw: compactJson(bwiki.map((record) => record.raw)),
      cbt3_raw: compactJson(cbt3.map((record) => record.raw)),
      official_raw: compactJson(official.map((record) => record.raw))
    };
  }).sort((a, b) => a.type.localeCompare(b.type, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
}

// 比较关键字段，仅在至少两个来源给出不同非空值时记录冲突。
function buildConflicts(groups) {
  const fields = ['name', 'rarity', 'elements', 'category', 'role', 'faction'];
  const rows = [];
  for (const group of groups) {
    for (const field of fields) {
      const bySource = {};
      for (const source of ['current', 'bwiki', 'cbt3', 'official']) {
        const values = recordsOf(group, source).map((record) => record[field]).filter(Boolean);
        bySource[source] = [...new Set(values)].join('｜');
      }
      const normalized = [...new Set(Object.values(bySource).filter(Boolean).map((value) => {
        if (field === 'name') return normalizeName(value);
        if (field === 'rarity') return normalizeRarity(value);
        if (field === 'elements') return normalizeElements(value);
        return value.replace(/\s+/g, '').toLowerCase();
      }))];
      if (normalized.length < 2) continue;
      const name = group.records[0]?.name || '';
      rows.push({
        type: group.type, name, field,
        current: bySource.current, bwiki: bySource.bwiki, cbt3: bySource.cbt3, official: bySource.official,
        assessment: field === 'name' ? '先按官网或页面标题校名' : '版本或口径冲突，需人工复核'
      });
    }
  }
  return rows;
}

// 统计项目当前缺少的主图或角色/奇波用途图，并给出可补图来源。
function buildMissing(groups) {
  const rows = [];
  for (const group of groups) {
    const current = recordsOf(group, 'current');
    if (!current.length) continue;
    const bwiki = recordsOf(group, 'bwiki');
    const cbt3 = recordsOf(group, 'cbt3');
    const official = recordsOf(group, 'official');
    const roles = [...new Set(current.flatMap((record) => record.imageRoles))];
    const potentialRoles = [...new Set(current.flatMap((record) => record.availableRoles || []))];
    const expected = requiredRoles[group.type] || ['icon'];
    const missingRoles = expected.filter((role) => !roles.includes(role));
    if (!missingRoles.length) continue;
    const source = official.some((record) => record.imageRef) ? '官网展示素材'
      : bwiki.some((record) => record.imageRef) ? 'BWIKI'
        : cbt3.some((record) => record.imageRef) ? 'CBT3' : '三站均无直接候选';
    rows.push({
      type: group.type, name: current[0].name, current_origin: joinedValues(current, 'origin'),
      current_roles: roles.join('、'), mapped_but_not_runtime: potentialRoles.filter((role) => !roles.includes(role)).join('、'),
      missing_roles: missingRoles.join('、'), bwiki_has_image: bwiki.some((record) => record.imageRef) ? '是' : '否',
      cbt3_has_image: cbt3.some((record) => record.imageRef) ? '是' : '否',
      official_has_image: official.some((record) => record.imageRef) ? '是' : '否', recommended_source: source,
      status: roles.includes('icon') ? '主图已有，详情用途图不完整' : '列表主图缺失'
    });
  }
  return rows.sort((a, b) => a.status.localeCompare(b.status, 'zh-CN') || a.type.localeCompare(b.type, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN'));
}

// 为当前缺图条目列出三站可直接访问的候选图片和对应来源页。
function buildImageCandidates(groups) {
  const rows = [];
  const seen = new Set();
  for (const group of groups) {
    const current = recordsOf(group, 'current');
    if (!current.length) continue;
    const currentRoles = [...new Set(current.flatMap((record) => record.imageRoles))];
    const expected = requiredRoles[group.type] || ['icon'];
    const missingRoles = expected.filter((role) => !currentRoles.includes(role));
    if (!missingRoles.length) continue;
    for (const source of ['official', 'bwiki', 'cbt3']) {
      for (const record of recordsOf(group, source)) {
        if (!record.imageRef) continue;
        const key = `${group.type}|${group.key}|${source}|${record.imageRef}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          type: group.type, name: current[0].name, missing_roles: missingRoles.join('、'), source,
          candidate_roles: record.imageRoles.join('、') || 'icon', candidate_url: record.imageRef,
          source_page: record.url, note: source === 'cbt3' ? 'CBT3 测试服素材，接入前需核对公测版本' : '接入前需确认授权与展示用途'
        });
      }
    }
  }
  return rows;
}

// 精简单条来源记录，作为在线快照和待接入数据包的稳定结构。
function exportRecord(record) {
  return {
    source: record.source, type: record.type, name: record.name, sourceId: record.sourceId || '',
    rarity: record.rarity || '', elements: record.elements || '', category: record.category || '',
    role: record.role || '', faction: record.faction || '', imageRef: record.imageRef || '',
    imageRoles: record.imageRoles || [], origin: record.origin || '', url: record.url || '', raw: record.raw || {}
  };
}

// 生成只供审核的待接入候选包，不修改项目正式 catalogs 数据。
function buildStagingPackage({ currentMeta, bwiki, cbt3, official, conflicts, imageCandidates, collectedAt }) {
  const mainRows = currentMeta.rows.filter((record) => record.origin === 'generated');
  const mainByKey = new Map(mainRows.map((record) => [`${record.type}|${normalizeName(record.name)}`, record]));
  const isMissingFromMain = (record) => !mainByKey.has(`${record.type}|${normalizeName(record.name)}`);
  const bwikiAdditions = bwiki.filter(isMissingFromMain);
  const cbt3Only = cbt3.filter(isMissingFromMain);
  const bwikiUpdates = bwiki.filter((record) => {
    const current = mainByKey.get(`${record.type}|${normalizeName(record.name)}`);
    if (!current) return false;
    return ['rarity', 'elements', 'category', 'role', 'faction'].some((field) => {
      const left = String(current[field] || '').replace(/\s+/g, '');
      const right = String(record[field] || '').replace(/\s+/g, '');
      return left && right && left !== right;
    });
  });
  return {
    meta: {
      collectedAt, projectGeneratedAt: currentMeta.generatedAt, projectImageMapAt: currentMeta.imageMapAt,
      importStatus: 'staging-only', doNotAutoImport: true,
      note: '官网字段优先；BWIKI 可作中文基线；CBT3 数据必须标记测试服并人工核对。'
    },
    counts: {
      officialConfirmed: official.length, bwikiAdditions: bwikiAdditions.length,
      bwikiFieldUpdates: bwikiUpdates.length, cbt3Only: cbt3Only.length,
      fieldConflicts: conflicts.length, imageCandidates: imageCandidates.length
    },
    officialConfirmed: official.map(exportRecord),
    bwikiAdditions: bwikiAdditions.map(exportRecord),
    bwikiFieldUpdates: bwikiUpdates.map(exportRecord),
    cbt3Only: cbt3Only.map(exportRecord),
    fieldConflicts: conflicts,
    imageCandidates
  };
}

// 按来源和类型汇总唯一条目数、图片数和重复名称数。
function buildSummary(records) {
  const buckets = new Map();
  for (const record of records) {
    const key = `${record.source}|${record.type}`;
    if (!buckets.has(key)) buckets.set(key, { source: record.source, type: record.type, rows: [] });
    buckets.get(key).rows.push(record);
  }
  return [...buckets.values()].map((bucket) => {
    const unique = new Set(bucket.rows.map((row) => normalizeName(row.name)));
    const images = new Set(bucket.rows.filter((row) => row.imageRef || row.imageRoles.length).map((row) => normalizeName(row.name)));
    return {
      source: bucket.source, type: bucket.type, records: bucket.rows.length, unique_names: unique.size,
      with_image: images.size, missing_image: unique.size - images.size, duplicate_rows: bucket.rows.length - unique.size
    };
  }).sort((a, b) => a.type.localeCompare(b.type, 'zh-CN') || a.source.localeCompare(b.source));
}

// 生成便于阅读的 Markdown 总报告，完整明细保留在 CSV。
function buildReport({ currentMeta, summary, comparison, conflicts, missing, collectedAt }) {
  const mainTypes = ['character', 'qibo', 'spirit', 'equipment', 'item', 'food', 'building', 'achievement', 'book', 'material', 'fishing', 'enemy', 'dungeon', 'tutorial', 'task', 'abyss'];
  const countOf = (source, type, field = 'records') => summary.find((row) => row.source === source && row.type === type)?.[field] ?? '';
  const generatedCountOf = (type) => currentMeta.rows.filter((row) => row.type === type && row.origin === 'generated').length;
  const lines = [];
  lines.push('# 《蓝色星原：旅谣》公开数据源审计');
  lines.push('');
  lines.push(`- 在线核对时间：${collectedAt}`);
  lines.push(`- 项目主数据时间：${currentMeta.generatedAt}`);
  lines.push(`- 项目图片映射时间：${currentMeta.imageMapAt}`);
  lines.push('- 本次只生成独立审计文件，没有覆盖项目正式数据。');
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push('1. 官网可信度最高，但当前只公开展示 4 名角色与 5 只奇波，未提供可下载的完整图鉴或战斗数值 API。');
  lines.push('2. BWIKI 是当前最适合做中文名称、图片和常用字段基线的社区源；它结构化程度高，但仍是玩家维护，不能视为官方数值。');
  lines.push('3. CBT3 Wiki 覆盖面最广，公开站点地图有 4,594 个页面；其数值和分类明确标注为 CBT3 版本，适合补缺，不宜直接覆盖公测数据。');
  lines.push('4. 项目现有数据混有 BWIKI 抓取、手工补充和演示条目。`条目差异.csv` 已把这三类来源拆开，避免把演示内容误判为官方数据。');
  lines.push('');
  lines.push('## 可信度排序');
  lines.push('');
  lines.push('| 来源 | 可信度 | 适合使用 | 主要限制 |');
  lines.push('|---|---|---|---|');
  lines.push('| 游戏官网 | A | 官方名称、公开角色/奇波、官方宣传图 | 不是完整数据库，无完整数值接口 |');
  lines.push('| BWIKI | B | 中文名称、图片、基础分类、社区校对 | 玩家维护，更新与模板字段可能滞后 |');
  lines.push('| CBT3 Wiki | B- | 测试服全量条目、数值、任务/敌人/副本 | CBT3 版本，可能与公测改动较大 |');
  lines.push('| 英文社区站 | C | 英文名与公开状态的交叉核对 | 多数转引 BWIKI，非独立来源 |');
  lines.push('| 项目手工/演示数据 | D | UI 占位与交互测试 | 不应作为事实数据发布 |');
  lines.push('');
  lines.push('## 核心数量对比');
  lines.push('');
  lines.push('| 类型 | 项目主数据 | 项目含手工/演示 | BWIKI 在线 | CBT3 在线 | 官网展示 |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const type of mainTypes) {
    lines.push(`| ${type} | ${generatedCountOf(type)} | ${countOf('current', type)} | ${countOf('bwiki', type)} | ${countOf('cbt3', type)} | ${countOf('official', type)} |`);
  }
  lines.push('');
  lines.push('说明：表内为原始记录数；同名角色形态、任务阶段和副本层级不会被压成一条。唯一名称数另见 `分类汇总.csv`。CBT3 的 `item` 为背包总表，`food` 是从 `data-bag=4` 派生的料理子集；BWIKI 的材料和钓鱼同样按项目现有规则从物品及专门分类派生。');
  lines.push('');
  lines.push('## 重要差异');
  lines.push('');
  lines.push('- CBT3 共抽取 4,621 条主记录；另生成 239 条料理派生视图用于和项目 `food` 对比。其站点地图仍保留 267 个 `/food/` URL，而当前背包页只标出 239 个料理，说明有 28 个旧版/重复页面未进入当前合并列表。');
  lines.push('- 项目主数据相对在线 BWIKI：物品少 215 条、材料少 72 条、钓鱼少 4 条、奇波少 2 条；角色、灵子、装备、料理、建筑、成就、书籍数量一致。');
  lines.push('- BWIKI 新增奇波是「菜鸡（特殊）」「苗鸡（特殊）」；新增钓鱼条目是「银星鲈」「蜡封的神秘盒子」「面包蟹」「虎纹虾」。');
  const additions = comparison.filter((row) => /新增候选|官网展示但项目缺少/.test(row.difference));
  const currentOnly = comparison.filter((row) => row.current_name && !row.bwiki_name && !row.cbt3_name && !row.official_name);
  lines.push(`- 三站存在、项目当前缺少的候选条目：${additions.length} 条。`);
  lines.push(`- 仅项目当前存在、三站均无同名记录的条目：${currentOnly.length} 条，其中包含手工和演示数据。`);
  lines.push(`- 关键字段冲突：${conflicts.length} 处；完整值见 \`字段冲突.csv\`。`);
  const sampleConflicts = conflicts.filter((row) => ['character', 'qibo'].includes(row.type)).slice(0, 12);
  for (const row of sampleConflicts) {
    lines.push(`- ${row.type}/${row.name} · ${row.field}：项目「${row.current || '-'}」｜BWIKI「${row.bwiki || '-'}」｜CBT3「${row.cbt3 || '-'}」｜官网「${row.official || '-'}」`);
  }
  lines.push('');
  lines.push('## 缺图');
  lines.push('');
  const primaryMissing = missing.filter((row) => row.status === '列表主图缺失');
  const roleMissing = missing.filter((row) => row.status !== '列表主图缺失');
  const generatedPrimaryMissing = primaryMissing.filter((row) => row.current_origin.split('｜').includes('generated'));
  lines.push(`- 列表主图完全缺失：${primaryMissing.length} 条。`);
  lines.push(`- 其中项目主数据缺失：${generatedPrimaryMissing.length} 条；其余来自手工、补充或演示数据。`);
  lines.push('- 项目主数据主图缺失重点：成就 144 条、钓鱼 29 条、奇波 3 条（伊欧利安、托纳缇欧、赛可洛）、角色 1 条（源 千代）。');
  lines.push(`- 角色/奇波主图已有但详情用途图不完整：${roleMissing.length} 条。`);
  const byType = new Map();
  for (const row of primaryMissing) byType.set(row.type, (byType.get(row.type) || 0) + 1);
  lines.push(`- 主图缺失分布：${[...byType.entries()].map(([type, count]) => `${type} ${count}`).join('、') || '无'}。`);
  const hasCandidate = primaryMissing.filter((row) => row.recommended_source !== '三站均无直接候选');
  lines.push(`- 其中 ${hasCandidate.length} 条可从官网/BWIKI/CBT3 找到候选图，仍需确认授权和版本后再接入。`);
  lines.push('');
  lines.push('## 新发现的辅助来源');
  lines.push('');
  lines.push('| 站点 | 当前公开范围 | 判断 |');
  lines.push('|---|---|---|');
  lines.push('| azurpromilia.wiki.gg | 搜索索引显示 21 名已知角色 | 社区 Wiki，可交叉核名；接口对本次请求返回 403 |');
  lines.push('| azurpromilia.org | 24 个角色档案 | 页面明确写明来源为 Biligame Wiki，不是独立证据 |');
  lines.push('| azurpromiliaguide.com | 19 个角色、5 个官方奇波记录 | 有来源标签，适合核公开状态，不适合替代中文主库 |');
  lines.push('| kibopedia.com | CBT 角色与元素列表 | 社区整理，仅作英文名/元素交叉检查 |');
  lines.push('');
  lines.push('## 文件说明');
  lines.push('');
  lines.push('- `分类汇总.csv`：按来源和类型统计数量、图片覆盖和重复。');
  lines.push('- `来源原始条目.csv`：每个来源每条记录单独一行，不折叠同名形态或阶段。');
  lines.push('- `在线数据快照.json`：三站在线数据与项目当前数据的完整结构化快照。');
  lines.push('- `待接入候选.json`：按官网确认、BWIKI 新增、BWIKI 更新、CBT3 独有分组的审核包。');
  lines.push('- `条目差异.csv`：全部条目逐行对比，保留三站和项目原始字段 JSON。');
  lines.push('- `字段冲突.csv`：名称、稀有度、元素、分类、定位、阵营冲突。');
  lines.push('- `缺图清单.csv`：当前项目缺少的图片用途及可补来源。');
  lines.push('- `图片候选.csv`：缺图条目的可访问图片 URL、来源页和版本提示。');
  lines.push('');
  lines.push('## 使用建议');
  lines.push('');
  lines.push('1. 官网名称和公开状态可直接作为最高优先级确认，但官网未给出的数值不要反向推断。');
  lines.push('2. BWIKI 用作项目日常基线；入库前保留来源页、抓取时间和字段级校验。');
  lines.push('3. CBT3 新增条目先标记为“CBT3 待公测核实”，不要覆盖 BWIKI/官网已确认字段。');
  lines.push('4. 手工和演示数据应继续保留 `verified: false`，正式列表默认隐藏。');
  return `${lines.join('\r\n')}\r\n`;
}

// 执行在线审计并写出报告与明细。
async function main() {
  mkdirSync(outputDir, { recursive: true });
  const currentMeta = loadCurrent();
  console.log(`项目当前记录：${currentMeta.rows.length}`);
  const [bwiki, cbt3] = await Promise.all([fetchBwiki(), fetchCbt3()]);
  supplementBwikiImagesFromSiteMap(bwiki, currentMeta.siteMap);
  const official = loadOfficial();
  const allRecords = currentMeta.rows.concat(bwiki, cbt3, official);
  const groups = groupRecords(allRecords);
  const comparison = buildComparison(groups);
  const conflicts = buildConflicts(groups);
  const missing = buildMissing(groups);
  const imageCandidates = buildImageCandidates(groups);
  const summary = buildSummary(allRecords);
  const collectedAt = new Date().toISOString();
  const snapshot = {
    meta: {
      collectedAt, projectGeneratedAt: currentMeta.generatedAt, projectImageMapAt: currentMeta.imageMapAt,
      sources: { official: officialHome, bwiki: 'https://wiki.biligame.com/ap/', cbt3: cbt3Base },
      note: 'food/material/fishing 中包含为对齐项目分类而生成的派生视图。'
    },
    records: allRecords.map(exportRecord)
  };
  const staging = buildStagingPackage({ currentMeta, bwiki, cbt3, official, conflicts, imageCandidates, collectedAt });

  writeCsv(join(outputDir, '分类汇总.csv'), summary,
    ['source', 'type', 'records', 'unique_names', 'with_image', 'missing_image', 'duplicate_rows']);
  writeCsv(join(outputDir, '来源原始条目.csv'), allRecords.map((record) => ({
    source: record.source, type: record.type, name: record.name, source_id: record.sourceId,
    rarity: record.rarity, elements: record.elements, category: record.category, role: record.role,
    faction: record.faction, image_ref: record.imageRef, image_roles: record.imageRoles.join('、'),
    origin: record.origin || '', url: record.url, raw: compactJson(record.raw)
  })), [
    'source', 'type', 'name', 'source_id', 'rarity', 'elements', 'category', 'role', 'faction',
    'image_ref', 'image_roles', 'origin', 'url', 'raw'
  ]);
  writeCsv(join(outputDir, '条目差异.csv'), comparison, [
    'type', 'name', 'current_name', 'current_count', 'current_origin', 'current_rarity', 'current_elements',
    'current_category', 'current_role', 'current_faction', 'current_image',
    'bwiki_name', 'bwiki_rarity', 'bwiki_elements', 'bwiki_category', 'bwiki_role', 'bwiki_faction', 'bwiki_image', 'bwiki_url',
    'cbt3_name', 'cbt3_rarity', 'cbt3_elements', 'cbt3_category', 'cbt3_image', 'cbt3_url',
    'official_name', 'official_faction', 'official_image', 'official_url', 'difference',
    'current_raw', 'bwiki_raw', 'cbt3_raw', 'official_raw'
  ]);
  writeCsv(join(outputDir, '字段冲突.csv'), conflicts,
    ['type', 'name', 'field', 'current', 'bwiki', 'cbt3', 'official', 'assessment']);
  writeCsv(join(outputDir, '缺图清单.csv'), missing, [
    'type', 'name', 'current_origin', 'current_roles', 'mapped_but_not_runtime', 'missing_roles',
    'bwiki_has_image', 'cbt3_has_image', 'official_has_image', 'recommended_source', 'status'
  ]);
  writeCsv(join(outputDir, '图片候选.csv'), imageCandidates, [
    'type', 'name', 'missing_roles', 'source', 'candidate_roles', 'candidate_url', 'source_page', 'note'
  ]);
  writeFileSync(join(outputDir, '在线数据快照.json'), `${JSON.stringify(snapshot, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
  writeFileSync(join(outputDir, '待接入候选.json'), `${JSON.stringify(staging, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
  writeFileSync(join(outputDir, '数据源对比报告.md'), buildReport({
    currentMeta, summary, comparison, conflicts, missing, collectedAt
  }), 'utf8');
  console.log(`BWIKI ${bwiki.length} 条｜CBT3 ${cbt3.length} 条｜官网 ${official.length} 条`);
  console.log(`对比 ${comparison.length} 行｜冲突 ${conflicts.length} 行｜缺图 ${missing.length} 行｜图片候选 ${imageCandidates.length} 行`);
  console.log(`输出：${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
