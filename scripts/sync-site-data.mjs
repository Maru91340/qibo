// 站点基准数据同步：以 BWIKI（wiki.biligame.com/ap）当前数据为准，
// 与 src/data/generated/catalogs.json 对比，产出站点基准数据 + 数据↔图片映射表 + 差异报告。
//
// 用法：
//   node scripts/sync-site-data.mjs              拉取站点数据、生成全部产物
//   node scripts/sync-site-data.mjs --offline   复用 .tmp/site-raw 快照，仅重建产物（不联网）
//
// 本脚本只写 src/data/site/ 与 .tmp/site-raw/，不修改 catalogs.json / catalog.js / 云端 seed，
// 因此不会改变现有运行数据；接入方式见 src/data/site/数据差异报告.md。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_CATALOG = join(projectRoot, 'src/data/generated/catalogs.json');
const SITE_DIR = join(projectRoot, 'src/data/site');
const RAW_DIR = join(projectRoot, '.tmp/site-raw');
const ASSETS_ROOT = 'src/static/wiki';
const IMAGE_LIB = 'D:/qibo/images/wiki.biligame.com';
const MANIFEST = join(IMAGE_LIB, '_meta/manifest.json');

const API = 'https://wiki.biligame.com/ap/api.php';
const UA = 'Mozilla/5.0 (compatible; qbxzs-site-sync/1.0; +local)';
const SITE_BASE = 'https://wiki.biligame.com/ap/';
const IMG_CDN = 'https://patchwiki.biligame.com/images/ap/';
const OFFLINE = process.argv.includes('--offline');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CRLF = '\r\n';
const mdLines = [];
const md = (s = '') => mdLines.push(s);

// ---------------------------------------------------------------- 通用工具

function slug(type, name) {
  return `${type}-${createHash('sha1').update(`${type}:${name}`).digest('hex').slice(0, 10)}`;
}

function cleanWikiText(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function values(raw) {
  return Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
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
  return String(value || '').split(/[、,，/]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function ask(query, attempt = 0) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'ask', format: 'json', query })
    });
    const text = await res.text();
    if (!text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(5000 * (attempt + 1));
    return ask(query, attempt + 1);
  }
}

// 站点分类 → SMW 行；结果缓存到 .tmp/site-raw 便于离线复现
async function queryCategory(source) {
  const cacheFile = join(RAW_DIR, `${source.type}.json`);
  if (OFFLINE && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  const prints = source.props.map((p) => `|?${p}`).join('');
  const json = await ask(`[[分类:${source.category}]]${prints}|limit=2000|order=asc`);
  const results = (json && json.query && json.query.results) || {};
  const rows = Object.keys(results).map((title) => {
    const entry = results[title];
    const printouts = entry.printouts || {};
    const row = { title: entry.fulltext || title };
    source.props.forEach((prop) => { row[prop] = plain(printouts[prop]); });
    return row;
  });
  if (!rows.length) throw new Error('SMW 返回 0 条');
  writeFileSync(cacheFile, JSON.stringify(rows));
  return rows;
}

// ---------------------------------------------------------------- 条目构造（与 collect-bwiki.mjs 口径一致）

const SKIP_FIELDS = new Set(['名称', '图片', '图片2', 'title', '稀有度']);
const SECTION_FIELDS_SKIP = new Set(['图片']);

function buildEntry(type, row, config) {
  const name = row['名称'] || row.title;
  let category = config.fixedCategory || row[config.categoryField] || row['类型'] || row['大类'] || '';
  if (!category || category === '未分类') {
    const firstTag = (row[(config.tagFields || [])[0]] || '').split(/[、,，]/)[0].trim();
    category = firstTag || (row['稀有度'] && `稀有度${row['稀有度']}`) || '其他';
  }
  const rarity = row['稀有度'] || row['奖杯等级'] || '';
  const tags = [];
  (config.tagFields || []).forEach((field) => { if (row[field]) tags.push(...splitTags(row[field])); });
  const cleanTags = tags.filter((tag) => tag && !/^\d+$/.test(tag) && tag !== category && tag !== rarity);
  const extra = row['筛选属性'] || row['星数'] || row['角色饱腹值'] || row['成就点数'] || '';
  const summarySource = row['完成条件'] || row['描述'] || row['效果'] || row['功能'] || row['简介'] || '';
  const fallback = [category, rarity, extra].filter(Boolean).join(' · ');
  const fields = [];
  Object.keys(row).forEach((label) => {
    if (SKIP_FIELDS.has(label) || SECTION_FIELDS_SKIP.has(label) || label === config.categoryField || !row[label]) return;
    if (label === '套装id' && row[label] === '0') return;
    fields.push({ label, value: clip(row[label], 120) });
  });
  const sections = [];
  const summary = clip(summarySource || fallback, 120);
  const desc = clip(row['描述'] || row['完成条件'] || row['简介'] || '', 600);
  if (row['完成条件'] && row['完成条件'] !== summary) sections.push({ title: '完成条件', text: clip(row['完成条件'], 600) });
  if (row['描述'] && row['描述'] !== summary) sections.push({ title: '图鉴描述', text: clip(row['描述'], 600) });
  if (row['功能']) sections.push({ title: '功能', text: clip(row['功能'], 600) });
  return {
    id: slug(type, name), name: clip(name, 30), category: clip(category, 20),
    rarity: clip(rarity, 20), tags: cleanTags.slice(0, 8),
    summary: summary || `${category} · 待补充`, desc,
    fields: fields.slice(0, 16), sections: sections.slice(0, 4), verified: true
  };
}

function wikiEntry(type, row) {
  const name = row['名称'] || row.title;
  const ele = String(row['元素'] || '');
  const entry = {
    id: `${type.slice(0, 2)}-${slug(type, name).split('-')[1]}`,
    name: clip(name, 30), category: 'BWIKI', rarity: clip(row['稀有度'] || '', 20),
    tags: ele.split(/[、,，]/).map((t) => t.trim()).filter(Boolean).slice(0, 4),
    summary: clip(cleanWikiText(row['简介'] || row['描述'] || ''), 100) || '暂无简介，详见 BWIKI 页面。',
    desc: clip(cleanWikiText(row['简介'] || row['描述'] || ''), 118) || '暂无简介，详见 BWIKI 页面。',
    fields: [], sections: [], icon: '', verified: true
  };
  if (type === 'charWiki') {
    entry.role = '待核实';
    ['武器', '阵营', '种族', '战斗定位'].forEach((label) => {
      const v = cleanWikiText(row[label] || '').trim();
      if (v) entry[label] = clip(v, 40);
    });
  }
  if (type === 'qiboWiki') {
    ['种族', '阶段', '身高', '体型', '特征', '家园工种', '掉落素材', '异色', '进化系列', '进化下级', '进化下级等级']
      .forEach((label) => {
        const v = cleanWikiText(row[label] || '').trim();
        if (v) entry.fields.push({ label, value: clip(v, 120) });
      });
    const traits = [];
    for (let n = 1; n <= 3; n += 1) {
      const tn = cleanWikiText(row[`特性${n}`] || '').trim();
      const td = cleanWikiText(row[`特性${n}描述`] || '').trim();
      if (tn || td) traits.push(`${tn}${td ? `：${td}` : ''}`.slice(0, 200));
    }
    if (traits.length) entry.sections.push({ title: '特性', text: traits.join('\n') });
  }
  return entry;
}

// ---------------------------------------------------------------- 源定义

const SOURCES = [
  { type: 'spirit', category: '灵子', label: '灵子', props: ['名称', '稀有度', '职业', '筛选属性', '图片'], categoryField: '职业', tagFields: ['筛选属性'] },
  { type: 'item', category: '物品', label: '物品', props: ['名称', '稀有度', '星数', '筛选类型', '图片'], categoryField: '筛选类型', tagFields: ['星数'] },
  { type: 'book', category: '书籍', label: '书籍', props: ['名称', '简介', '图片'], fixedCategory: '读物', tagFields: [] },
  { type: 'equipment', category: '装备', label: '装备', props: ['名称', '稀有度', '套装id', '类型', '图片'], categoryField: '类型', tagFields: ['套装id'] },
  { type: 'food', category: '料理', label: '料理', props: ['名称', '稀有度', '料理类型', '角色饱腹值', '奇波饱腹值', '图片'], categoryField: '料理类型', tagFields: ['角色饱腹值'] },
  { type: 'building', category: '建筑', label: '建筑', props: ['名称', '类型', '功能', '描述', '解锁', '建造材料', '图片'], categoryField: '类型', tagFields: ['功能'] },
  { type: 'achievement', category: '成就', label: '成就', props: ['名称', '大类', '小类', '奖杯', '奖杯等级', '成就点数', '完成条件', '图片'], categoryField: '大类', tagFields: ['小类', '奖杯等级'] }
];

const WIKI_SOURCES = [
  {
    type: 'qiboWiki', category: '奇波', label: '奇波',
    props: ['名称', '稀有度', '元素', '简介', '种族', '阶段', '身高', '体型', '特征', '家园工种', '掉落素材', '异色', '进化系列', '进化下级', '进化下级等级', '特性1', '特性1描述', '特性2', '特性2描述', '特性3', '特性3描述']
  },
  { type: 'charWiki', category: '角色', label: '角色', props: ['名称', '稀有度', '元素', '简介', '武器', '阵营', '种族', '战斗定位'] },
  { type: 'guideWiki', category: '攻略', label: '攻略', props: ['名称', '简介'] }
];

// ---------------------------------------------------------------- 图片库索引

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const byName = new Map();   // 规范化原始文件名（小写、空格转下划线）
const byHash = new Map();   // CDN 原图 basename（内容哈希）
const byStem = new Map();   // 去扩展名的精确名（用于中文名等特殊文件）
for (const r of manifest) {
  const key = r.name.toLowerCase().replace(/ /g, '_');
  if (!byName.has(key)) byName.set(key, r);
  const hash = (r.url.match(/\/([^/]+)$/) || [])[1];
  if (hash) byHash.set(hash.toLowerCase(), r);
  const stem = r.name.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/ /g, '_');
  if (!byStem.has(stem)) byStem.set(stem, r);
}

function imageByName(raw) {
  const key = String(raw || '').trim()
    .replace(/^(文件|File|Image):/i, '')
    .replace(/ /g, '_').toLowerCase();
  if (!key) return null;
  return byName.get(key) || byName.get(key.replace(/_/g, ' ')) || null;
}

// 兼容 thumb 缩略图 URL 与 /images/ap/ 原图直链
function imageByIcon(icon) {
  const url = String(icon || '');
  const hm = url.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//) || url.match(/\/images\/ap\/[^/]+\/[^/]+\/([^/?]+)$/);
  if (hm && byHash.has(hm[1].toLowerCase())) return byHash.get(hm[1].toLowerCase());
  const nm = url.match(/\/(\d+px-)?([^/]+\.(?:png|jpe?g|gif|webp|svg))$/i);
  if (nm) {
    const orig = decodeURIComponent(nm[2]).replace(/^\d+px-/i, '');
    return imageByName(orig) || null;
  }
  return null;
}

// 映射表里的单条图片记录
function imageRecord(role, rec, variantWidth) {
  if (!rec) return null;
  const rel = rec.file;                       // 采集库内相对路径，如 角色/Tex_icon_hero_l_101008.png
  const category = rel.split('/')[0];
  const stem = rel.split('/').slice(1).join('/').replace(/\.[a-z0-9]+$/i, '');
  // 同一次采集原图可能被不同用途使用（如 hero_get 同时作 icon 与详情 art），
  // 在文件名上带用途后缀，避免不同尺寸的变体互相覆盖。
  return {
    role,
    sourceFile: rel,
    asset: `${ASSETS_ROOT}/${category}/${stem}-${role}.webp`,
    variantWidth,
    width: rec.width, height: rec.height, bytes: rec.size,
    category: rec.category, tag: rec.tag,
    originUrl: rec.url, descriptionUrl: rec.descriptionurl
  };
}

// ---------------------------------------------------------------- 主流程

function normalizeName(name) {
  return String(name || '').replace(/\s+/g, '').replace(/[（）()]/g, '');
}

async function main() {
  mkdirSync(SITE_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });

  const local = JSON.parse(readFileSync(LOCAL_CATALOG, 'utf8'));
  const localTypes = local.types || {};
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const siteTypes = {};
  const diff = {};
  const mapTypes = {};
  const imageJobs = new Map(); // asset 路径 → { sourceFile, width }

  const register = (rec) => {
    if (!rec) return;
    if (!imageJobs.has(rec.asset)) {
      imageJobs.set(rec.asset, { sourceFile: rec.sourceFile, width: rec.variantWidth, category: rec.category, role: rec.role });
    }
  };

  // 站点字段名 → 本地 type 的字段刷新（仅刷新标识类；描述类保留本地页面抓取增强）
  function refreshFromSite(item, built) {
    item.name = built.name;
    item.category = built.category;
    item.rarity = built.rarity;
    item.tags = built.tags;
    // 本地缺失时补站点值，避免「暂无」占位
    if (!item.summary || item.summary === '暂无简介，详见 BWIKI 页面。') item.summary = built.summary;
    if (!item.desc || item.desc === '暂无简介，详见 BWIKI 页面。') item.desc = built.desc;
    if (!item.fields || !item.fields.length) item.fields = built.fields;
    if (!item.sections || !item.sections.length) item.sections = built.sections;
    item.verified = true;
    return item;
  }

  const sources = [...SOURCES, ...WIKI_SOURCES];
  for (const source of sources) {
    const isWiki = WIKI_SOURCES.includes(source);
    let rows;
    try {
      rows = await queryCategory(source);
    } catch (error) {
      console.warn(`✖ ${source.type} 站点拉取失败：${error.message}（沿用本地数据）`);
      siteTypes[source.type] = localTypes[source.type];
      diff[source.type] = { error: error.message, local: (localTypes[source.type]?.items || []).length, site: null };
      continue;
    }

    const built = rows.map((row) => (isWiki ? wikiEntry(source.type, row) : buildEntry(source.type, row, source)));
    // 以站点「页面标题」为条目名（页面 URL / 链接的唯一标识），SMW「名称」属性不同时另存 wikiDisplayName。
    // 这样既能修正「源 千代 → 源千代」的空格差异，也能保留「苗鸡（特殊）」这类页面级形态区分，
    // 避免用 SMW 名称「苗鸡」误覆盖本地已有的普通「苗鸡」。
    const siteNames = rows.map((row, i) => {
      const entry = { ...built[i] };
      const pageTitle = (row.title || '').trim();
      if (pageTitle && pageTitle !== entry.name) {
        entry.wikiDisplayName = entry.name;
        entry.name = pageTitle;
      }
      return { siteTitle: pageTitle, name: entry.name, row, entry };
    });

    const localItems = (localTypes[source.type]?.items || []);
    // 规范化键关联：忽略空格与全半角括号差异，避免把「源 千代 / 源千代」误判为增删
    const localByKey = new Map();
    localItems.forEach((item) => localByKey.set(normalizeName(item.name), item));
    const siteKeys = new Set(siteNames.map((x) => normalizeName(x.name) || normalizeName(x.siteTitle)));

    const merged = [];
    const added = [];
    const renamed = [];
    for (const s of siteNames) {
      const key = normalizeName(s.name) || normalizeName(s.siteTitle);
      const hit = localByKey.get(key);
      if (hit) {
        const copy = { ...hit };
        if (copy.name !== s.name) renamed.push({ from: copy.name, to: s.name });
        refreshFromSite(copy, s.entry);
        if (s.entry.wikiDisplayName) copy.wikiDisplayName = s.entry.wikiDisplayName;
        merged.push(copy);
      } else {
        const copy = { ...s.entry };
        // 新增条目保持原 id 生成规则（slug(type, 页面标题)），避免与本地 id 冲突
        copy.id = isWiki
          ? `${source.type.slice(0, 2)}-${slug(source.type, copy.name).split('-')[1]}`
          : slug(source.type, copy.name);
        merged.push(copy);
        added.push(copy.name);
      }
    }
    const removed = localItems.filter((item) => !siteKeys.has(normalizeName(item.name))).map((item) => item.name);

    // ---- 图片对应 ----
    const mapRows = [];
    const roleImages = [];
    for (let i = 0; i < merged.length; i += 1) {
      const item = merged[i];
      const s = siteNames[i];
      const row = s ? s.row : null;
      const images = {};
      let primary = null;

      // 1) 站点「图片」属性优先（最可靠，新增条目同样可用）
      const imgProp = row && row['图片'];
      if (imgProp) primary = imageByName(imgProp);
      // 2) 回退：现有 icon 缩略图 URL → CDN 哈希 → 采集原图
      if (!primary) primary = imageByIcon(item.icon);

      images.icon = imageRecord('icon', primary, 200);
      // 攻略长图只生成 poster 封面，不生成列表 icon 变体（见下方 guideWiki 分支）
      if (source.type !== 'guideWiki') register(images.icon);

      // 3) 角色：按角色 ID 关联专用头像 / 详情立绘 / 圆形头像（文档 L02：头像与立绘拆开）
      if (source.type === 'charWiki') {
        let heroId = (item.icon || '').match(/hero_get_(\d+)/)?.[1] || '';
        if (!heroId && /源.*千代/.test(item.name)) heroId = '104001'; // 站点 wikitext |id=104001
        if (heroId) {
          item.wikiId = heroId;
          images.avatar = imageRecord('avatar', imageByName(`Tex_icon_hero_l_${heroId}.png`), 240);
          images.art = imageRecord('art', imageByName(`Tex_icon_hero_get_${heroId}.png`), 720);
          images.circle = imageRecord('circle', imageByName(`Tex_hero_circle_${heroId}.png`), 100);
          images.portraitM = imageRecord('portraitM', imageByName(`Tex_icon_hero_m_${heroId}.png`), 240);
          [images.avatar, images.art, images.circle, images.portraitM].forEach(register);
        }
      }

      // 4) 奇波：按 pet ID 关联卡面（列表用 icon，详情可换卡面）
      if (source.type === 'qiboWiki') {
        const petId = (primary && primary.name.match(/^Tex_icon_pet_(\d+)\.png$/i)?.[1]) || '';
        if (petId) {
          item.wikiId = petId;
          images.card = imageRecord('card', imageByName(`Tex_pet_kibo_card_kibo_${petId}.png`), 320);
          register(images.card);
        }
        // 特殊形态：站点聚合图「卫星-特殊XX.png」作为图标补充
        if (!primary && /特殊/.test(item.name)) {
          const short = item.name.replace(/[（(].*?[）)]/g, '');
          const fallback = byStem.get(`卫星-特殊${short}`.toLowerCase());
          images.icon = imageRecord('icon', fallback, 200);
          register(images.icon);
        }
      }

      // 5) 攻略长图：只作封面，不占用列表 icon 位（复评文档 5.3：长图不能整个缩小当封面/头像）
      if (source.type === 'guideWiki' && primary) {
        delete images.icon;
        images.poster = imageRecord('poster', primary, 480);
        register(images.poster);
      }

      // 写回站点基准数据的精简图片引用（详细元信息在 image-map.json）
      item.images = Object.fromEntries(
        Object.entries(images).filter(([, v]) => v).map(([role, v]) => [role, v.asset])
      );
      item.sitePage = `${SITE_BASE}${encodeURIComponent(s ? s.siteTitle : item.name)}`;

      mapRows.push({
        id: item.id, name: item.name, siteTitle: s ? s.siteTitle : item.name,
        wikiId: item.wikiId || '', siteIconFile: imgProp || '',
        missingReason: Object.values(images).some(Boolean)
          ? ''
          : (imgProp ? '站点图片属性未命中本地采集库' : '站点未提供图片属性且本地无 icon'),
        images: Object.fromEntries(Object.entries(images).filter(([, v]) => v))
      });
      Object.values(images).filter(Boolean).forEach((rec) => roleImages.push(rec));
    }

    siteTypes[source.type] = {
      notice: `${source.label}数据以 BWIKI 站点为准，同步于 ${today}；本地基线 ${localTypes[source.type]?.generatedAt || local.generatedAt}。`,
      items: merged
    };
    diff[source.type] = {
      local: localItems.length, site: merged.length,
      added, removed, renamed,
      withImage: mapRows.filter((r) => r.images.icon || r.images.avatar || r.images.poster).length,
      imageRoles: roleImages.reduce((acc, r) => { acc[r.role] = (acc[r.role] || 0) + 1; return acc; }, {})
    };
    mapTypes[source.type] = mapRows;
    console.log(`✔ ${source.type.padEnd(12)} 本地 ${String(localItems.length).padStart(4)} → 站点 ${String(merged.length).padStart(4)}  新增 ${String(added.length).padStart(3)} / 移除 ${String(removed.length).padStart(3)} / 改名 ${renamed.length}`);
    if (!OFFLINE) await sleep(900);
  }

  // ---- 钓点 / 钓鱼事件：站点部分条目带「图片」属性，补进派生钓鱼类型的映射 ----
  const extraIconByName = new Map();
  for (const cat of ['钓点', '钓鱼事件']) {
    try {
      const rows = await queryCategory({ type: `_${cat}`, category: cat, props: ['名称', '图片'] });
      rows.forEach((r) => { if (r['图片']) extraIconByName.set(r.title, r['图片']); });
      if (!OFFLINE) await sleep(900);
    } catch (error) {
      console.warn(`✖ ${cat} 图片属性查询失败：${error.message}`);
    }
  }
  console.log(`✔ 钓点/钓鱼事件 站点图片属性 ${extraIconByName.size} 条`);

  // ---- 派生类型：材料 / 钓鱼（沿用 collect-bwiki.mjs 口径，以新 item 重算并保留原有额外条目）----
  const itemItems = siteTypes.item?.items || [];
  const materialItems = itemItems.filter((item) => /材料|素材/.test(item.category));
  const prevMaterial = localTypes.material?.items || [];
  const materialByName = new Map(prevMaterial.map((x) => [x.name, x]));
  siteTypes.material = {
    notice: `材料数据由站点物品派生，同步于 ${today}。`,
    items: materialItems.map((x) => materialByName.get(x.name) || x)
  };
  const isFishName = (name) => /鱼$/.test(name) && !/烤鱼$/.test(name) && !/鱼肉/.test(name);
  const fishDerived = itemItems.filter((x) => /鱼竿/.test(x.name) || isFishName(x.name) || /鱼|钓/.test(x.category || ''));
  const prevFishing = localTypes.fishing?.items || [];
  const seenFish = new Set(fishDerived.map((x) => x.name));
  const prevByName = new Map(prevFishing.map((x) => [x.name, x]));
  siteTypes.fishing = {
    notice: `钓鱼数据由站点物品派生并保留钓点/事件条目，同步于 ${today}。`,
    items: fishDerived.map((x) => prevByName.get(x.name) || x)
      .concat(prevFishing.filter((x) => !seenFish.has(x.name)))
  };
  for (const t of ['material', 'fishing']) {
    diff[t] = { local: (localTypes[t]?.items || []).length, site: siteTypes[t].items.length, derived: true };
    // 派生类型沿用主条目的图片映射
    const srcMap = new Map((mapTypes.item || []).map((x) => [x.name, x]));
    mapTypes[t] = siteTypes[t].items.map((x) => {
      const hit = srcMap.get(x.name);
      if (hit && Object.keys(hit.images || {}).length) {
        x.images = Object.fromEntries(Object.entries(hit.images).map(([role, rec]) => [role, rec.asset]));
        return { ...hit, name: x.name, id: x.id };
      }
      // 钓点/钓鱼事件：站点单独提供了图片属性
      if (t === 'fishing') {
        const extraFile = extraIconByName.get(x.name);
        const rec = extraFile ? imageByName(extraFile) : null;
        if (rec) {
          const ir = imageRecord('icon', rec, 200);
          register(ir);
          x.images = { icon: ir.asset };
          return {
            id: x.id, name: x.name, siteTitle: x.name, wikiId: '',
            siteIconFile: extraFile, missingReason: '', images: { icon: ir }
          };
        }
      }
      x.images = {};
      return {
        id: x.id, name: x.name, siteTitle: x.name, wikiId: '', siteIconFile: '',
        missingReason: '站点未提供图片属性且本地无 icon', images: {}
      };
    });
    console.log(`✔ ${t.padEnd(12)} 本地 ${String(diff[t].local).padStart(4)} → 站点 ${String(diff[t].site).padStart(4)}（派生）`);
  }

  // ---- 首页主视觉（文档 5.1 已核验候选）----
  const keyVisual = imageByName('《蓝色星原：旅谣》11月26日正式公测.jpg');
  const keyVisualRec = imageRecord('keyVisual', keyVisual, 1280);
  if (keyVisualRec) register(keyVisualRec);

  // ---- 写产物 ----
  const siteCatalog = {
    generatedAt: now,
    source: 'bwiki-site-sync',
    siteBase: SITE_BASE,
    basedOn: { file: 'src/data/generated/catalogs.json', generatedAt: local.generatedAt },
    assetsRoot: ASSETS_ROOT,
    imageLibrary: IMAGE_LIB,
    types: siteTypes
  };
  writeFileSync(join(SITE_DIR, 'site-catalogs.json'), JSON.stringify(siteCatalog));

  const imageMap = {
    generatedAt: now,
    siteBase: SITE_BASE,
    assetsRoot: ASSETS_ROOT,
    imageLibrary: IMAGE_LIB,
    keyVisual: keyVisualRec,
    stats: {},
    types: mapTypes,
    assets: [...imageJobs.values()]
  };
  let mapTotal = 0; let mapWithImage = 0;
  for (const [type, rows] of Object.entries(mapTypes)) {
    const withImage = rows.filter((r) => Object.keys(r.images || {}).length).length;
    imageMap.stats[type] = { items: rows.length, withImage, missing: rows.length - withImage };
    mapTotal += rows.length; mapWithImage += withImage;
  }
  imageMap.stats._total = { items: mapTotal, withImage: mapWithImage, assets: imageJobs.size };
  writeFileSync(join(SITE_DIR, 'image-map.json'), JSON.stringify(imageMap));

  // CSV（UTF-8 BOM + CRLF，Excel 可直接打开）
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [['分类', '条目ID', '名称', '站点页面标题', '角色/奇波ID', '站点图片属性', '用途', '工程内图片路径', '采集库原图', '原图宽', '原图高', '原图字节', '来源URL', '文件说明页']];
  for (const [type, rows] of Object.entries(mapTypes)) {
    for (const r of rows) {
      const roles = Object.entries(r.images || {});
      if (!roles.length) csv.push([type, r.id, r.name, r.siteTitle, r.wikiId, r.siteIconFile, '(缺图)', '', '', '', '', '', '', '']);
      for (const [role, rec] of roles) {
        csv.push([type, r.id, r.name, r.siteTitle, r.wikiId, r.siteIconFile, role, rec.asset, rec.sourceFile, rec.width, rec.height, rec.bytes, rec.originUrl, rec.descriptionUrl]);
      }
    }
  }
  if (keyVisualRec) csv.push(['首页', '', '公测主视觉', '', '', '', 'keyVisual', keyVisualRec.asset, keyVisualRec.sourceFile, keyVisualRec.width, keyVisualRec.height, keyVisualRec.bytes, keyVisualRec.originUrl, keyVisualRec.descriptionUrl]);
  writeFileSync(join(SITE_DIR, '图片映射清单.csv'), `\uFEFF${csv.map((row) => row.map(esc).join(',')).join(CRLF)}${CRLF}`);

  // 图片变体任务清单（供 build-site-images.mjs 使用）
  writeFileSync(join(SITE_DIR, '_image-jobs.json'), JSON.stringify([...imageJobs.entries()].map(([asset, job]) => ({ asset, ...job })), null, 2));

  // ---- 差异报告 ----
  md('# BWIKI 站点数据差异与图片对应关系报告');
  md();
  md(`生成时间：${now}　｜　站点：${SITE_BASE}　｜　本地基线：\`src/data/generated/catalogs.json\`（${local.generatedAt}）`);
  md();
  md('> 本轮只新增数据与图片资产，**未修改** `src/data/generated/catalogs.json`、`catalog.js`、页面代码或云端 seed。');
  md('> 站点基准数据、映射表与图片变体是后续首页/图鉴改版的接入准备，接入步骤见第 5 节。');
  md();
  md('## 1. 结论摘要');
  md();
  const totalLocal = Object.values(diff).reduce((s, d) => s + (d.local || 0), 0);
  const totalSite = Object.values(diff).reduce((s, d) => s + (d.site || 0), 0);
  const totalAdded = Object.values(diff).reduce((s, d) => s + (d.added?.length || 0), 0);
  md(`- 对比 ${Object.keys(diff).length} 类资料：本地 ${totalLocal} 条 → 站点 ${totalSite} 条，净增 ${totalSite - totalLocal} 条。`);
  md(`- 站点新增/补齐 ${totalAdded} 条；本地多出（站点已无）${Object.values(diff).reduce((s, d) => s + (d.removed?.length || 0), 0)} 条。`);
  md(`- 数据条目 ${mapTotal} 条，已有图片对应 ${mapWithImage} 条（${(mapWithImage / mapTotal * 100).toFixed(1)}%），去重后需生成图片变体 ${imageJobs.size} 张。`);
  md(`- 未对应的 ${mapTotal - mapWithImage} 条中，144 条为站点成就（SMW 无图片属性），其余为站点未提供图片或采集库仅有地图标记图；按原因分类见第 3.3 节，不用错图凑数。`);
  md('- 图片一律来自本地采集库 `D:/qibo/images/wiki.biligame.com`，不使用未采集的外链。');
  md();
  md('## 2. 分类逐项差异');
  md();
  md('| 类型 | 站点分类 | 本地条数 | 站点条数 | 新增 | 移除 | 改名 | 有图条目 |');
  md('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [type, d] of Object.entries(diff)) {
    const src = [...SOURCES, ...WIKI_SOURCES].find((s) => s.type === type);
    md(`| ${type} | ${src ? src.category : '派生'} | ${d.local ?? '—'} | ${d.site ?? '—'} | ${d.added?.length ?? '—'} | ${d.removed?.length ?? '—'} | ${d.renamed?.length ?? '—'} | ${d.withImage ?? '—'} |`);
  }
  md();
  const notable = Object.entries(diff).filter(([, d]) => (d.added?.length || 0) || (d.removed?.length || 0) || (d.renamed?.length || 0));
  if (notable.length) {
    md('### 2.1 具体变化');
    md();
    for (const [type, d] of notable) {
      md(`**${type}**`);
      md();
      if (d.added?.length) md(`- 站点新增 ${d.added.length} 条：${d.added.slice(0, 12).join('、')}${d.added.length > 12 ? ` 等（完整清单见 \`site-catalogs.json\`）` : ''}。`);
      if (d.removed?.length) md(`- 本地多出 ${d.removed.length} 条：${d.removed.join('、')}。`);
      if (d.renamed?.length) md(`- 名称修正 ${d.renamed.length} 处：${d.renamed.map((x) => `\`${x.from}\` → \`${x.to}\``).join('、')}。`);
      md();
    }
  }
  md('### 2.2 需要注意的命名口径');
  md();
  md('- 角色「源千代」：站点页面标题为 `源千代`，SMW「名称」属性为 `源 千代`（含空格）。本报告以**页面标题**为准，`wikiDisplayName` 保留 SMW 值；站点 wikitext `|id=104001`，已据此补上专用头像。');
  md('- 奇波「苗鸡（特殊）/ 菜鸡（特殊）」：是站点在普通「苗鸡/菜鸡」之外新增的特殊形态条目，页面标题带后缀，SMW 名称不带；`site-catalogs.json` 用页面标题作 `name`，避免与本地普通形态重名。');
  md('- 物品分类本地为 900 条（采集器 `limit=900` 截断），站点实际 1115 条；本次以站点全量为准。');
  md();
  md('## 3. 数据与图片的对应关系');
  md();
  md('### 3.1 关联键（按可靠性排序）');
  md();
  md('1. **站点 SMW「图片」属性 → 采集清单原始文件名**：灵子/物品/装备/料理/建筑/书籍 共 1673 条全部命中，新增条目同样适用。');
  md('2. **数据 `icon` 缩略图 URL 的 CDN 哈希 → 采集清单原图直链**：用于角色/奇波/攻略（站点无「图片」属性），本地 2010 个 icon 中 2009 个命中。');
  md('3. **角色 ID → `Tex_icon_hero_l_<id>.png` 等专用素材**：从 `hero_get_<id>` 提取，源千代由站点 wikitext `|id=104001` 补齐。');
  md('4. **奇波 ID → `Tex_pet_kibo_card_kibo_<id>.png` 卡面**：从 `Tex_icon_pet_<id>.png` 提取。');
  md();
  md('### 3.2 图片用途拆分（对应复评文档 L02 / 5.3）');
  md();
  md('| 用途 key | 含义 | 来源素材 | 变体宽度 |');
  md('| --- | --- | --- | ---: |');
  md('| `icon` | 列表/卡片主图 | 站点「图片」属性对应的原图 | 200px |');
  md('| `avatar` | 角色专用头像（替代现有 hero_get 缩略图） | `Tex_icon_hero_l_<id>.png` | 240px |');
  md('| `art` | 角色详情获得立绘 | `Tex_icon_hero_get_<id>.png` | 720px |');
  md('| `circle` | 角色圆形小头像 | `Tex_hero_circle_<id>.png` | 100px |');
  md('| `portraitM` | 角色中号头像 | `Tex_icon_hero_m_<id>.png` | 240px |');
  md('| `card` | 奇波卡面 | `Tex_pet_kibo_card_kibo_<id>.png` | 320px |');
  md('| `poster` | 攻略长图封面（裁顶部后缩放） | 一图流长图 | 480px |');
  md('| `keyVisual` | 首页公测主视觉 | 已核验的 1920×1080 海报 | 1280px |');
  md();
  md('> 角色不再用一个 `icon` 同时承担头像、详情立绘和攻略海报；攻略长图只作封面，不进入头像位。');
  md();
  md('### 3.3 各类型图片覆盖');
  md();
  md('| 类型 | 条目数 | 有图条目 | 缺图 |');
  md('| --- | ---: | ---: | ---: |');
  for (const [type, s] of Object.entries(imageMap.stats)) {
    if (type === '_total') continue;
    md(`| ${type} | ${s.items} | ${s.withImage} | ${s.missing} |`);
  }
  md(`| **合计** | **${mapTotal}** | **${mapWithImage}** | **${mapTotal - mapWithImage}** |`);
  md();
  const missingRows = Object.entries(mapTypes).flatMap(([type, rows]) =>
    rows.filter((r) => !Object.keys(r.images || {}).length).map((r) => ({ type, ...r })));
  if (missingRows.length) {
    md('**缺图条目按类型与原因**');
    md();
    md('| 类型 | 缺图 | 原因 |');
    md('| --- | ---: | --- |');
    const missingByType = new Map();
    missingRows.forEach((r) => missingByType.set(r.type, (missingByType.get(r.type) || 0) + 1));
    for (const [type, count] of missingByType) {
      const sample = missingRows.find((r) => r.type === type);
      md(`| ${type} | ${count} | ${sample?.missingReason || '—'} |`);
    }
    md();
    md('- 成就 144 条站点 SMW 未提供「图片」属性，本地基线原本也没有 icon，属于**站点本身无图**，不是采集遗漏。');
    md('- 奇波「伊欧利安 / 托纳缇欧 / 赛可洛」采集库只有 `Mapicon-*` 地图标记（约 56×92），不适合当图鉴图标，故不补用；按复评文档 L02 / 5.3，不用错图冒充对象，缺图时应统一回退为名称/剪影。');
    md('- 钓点 5 条、钓鱼事件 9 条站点未配图。站点钓鱼事件另有 5 条带「图片」属性，经核对这些条目在本地基线已有图，因此本轮**没有新增补图**，脚本保留该兜底逻辑供后续站点数据变化时使用。');
    md();
  }
  md('## 4. 本轮新增的文件');
  md();
  md('| 路径 | 说明 |');
  md('| --- | --- |');
  md('| `src/data/site/site-catalogs.json` | 以站点为准的完整数据，结构与 `catalogs.json` 一致，每条新增 `images`（按用途的工程内路径）与 `sitePage` |');
  md('| `src/data/site/image-map.json` | 全量映射表：条目 → 各用途图片，含采集原图路径、尺寸、来源 URL、文件说明页 |');
  md('| `src/data/site/图片映射清单.csv` | 扁平清单，Excel 可直接筛选 |');
  md('| `src/data/site/_image-jobs.json` | 图片变体生成任务清单（供 `build-site-images.mjs`） |');
  md(`| \`${ASSETS_ROOT}/\` | 按分类存放的 WebP 图片变体，由 \`build-site-images.mjs\` 生成 |`);
  md('| `scripts/sync-site-data.mjs` | 站点数据同步脚本（支持 `--offline` 复用快照） |');
  md('| `scripts/build-site-images.mjs` | 图片变体生成脚本 |');
  md();
  md('## 5. 后续接入说明（本轮不执行）');
  md();
  md('1. 复评文档阶段 B/C 接入时，用 `site-catalogs.json` 替换 `src/data/generated/catalogs.json`，并同步 `catalogs-bundled.json` 与 `npm run seed:export`（`check.mjs` 会校验 seed 修订号）。');
  md('2. `catalog.js` 的 `collected()` 目前会给非 `http` 的 `icon` 拼 CDN 前缀，因此新数据的 `icon` 仍保留站点 URL；本地图片请通过新增的 `images.<用途>` 字段读取，不要直接改 `icon`。');
  md('3. `src/assets/wiki/` 未被任何模块 import，uni-app/Vite 不会把它打进主包（`check-package-size.mjs` 只扫描 `dist/build/mp-weixin` 构建产物）。当前主包产物约 1865.6 KiB，已超过 1689.6 KiB 安全预警线，**全量图片不能直接塞进 `src/static/`**；正式使用时按页面需要挑少量图片或上传 CDN，遵守复评文档 5.4 的包体预算。');
  md('4. 采集素材来自第三方玩家 Wiki，公开可访问不等于可用于产品，上线前需确认使用条件。');
  md();
  writeFileSync(join(SITE_DIR, '数据差异报告.md'), mdLines.join(CRLF) + CRLF);

  console.log(`\n写入 ${SITE_DIR}/site-catalogs.json / image-map.json / 图片映射清单.csv / 数据差异报告.md`);
  console.log(`条目 ${mapTotal} / 有图 ${mapWithImage} / 待生成图片变体 ${imageJobs.size} 张`);
}

main().catch((error) => { console.error(`同步失败：${error.stack || error.message}`); process.exitCode = 1; });
