// CBT3 灵子（Soul Essence）数据采集：从 ap-cbt3.csxylic.com 抓取 /soulessence/<id>/ 页面，
// 解析为 src/data/generated/soul-essence.json（B/S 版图标 / 星级 / 职业 / 获取与分解 /
// Lv1-100 四维属性 / Lv1-5 专属技能 / 升级经验表）。
// 授权与限速同 collect-cbt3-pets.mjs（站方 robots 允许通用爬虫、use=reference，项目所有者已授权）。
//
// 用法：
//   node scripts/collect-cbt3-soulessence.mjs              # 全量（有缓存复用）
//   node scripts/collect-cbt3-soulessence.mjs --offline   # 仅用缓存重建
//   node scripts/collect-cbt3-soulessence.mjs --limit 3   # 试跑
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(projectRoot, '.tmp/cbt3-soulessence');
const OUT_PATH = join(projectRoot, 'src/data/generated/soul-essence.json');
const CDN = 'https://ap-cbt3.csxylic.com';
const UA = 'Mozilla/5.0 (compatible; qbxzs-cbt3-sync/1.0; +local reference-use)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OFFLINE = process.argv.includes('--offline');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit'));
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1]) : 0;
const DELAY = Number(process.env.QBXZS_CBT3_DELAY || 1100);

const decodeAmp = (text) => String(text || '')
  .replace(/&#34;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const stripTags = (text) => decodeAmp(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
const cellText = (cell) => stripTags(cell.split('</td>')[0].replace(/^[^>]*>/, ''));

// ---------- 枚举：从列表页卡片拿 75 个 id（离线时从缓存 _index.html） ----------
async function loadIndex() {
  const cache = join(CACHE_DIR, '_index.html');
  if (existsSync(cache) && !process.argv.includes('--refetch-index')) return readFileSync(cache, 'utf8');
  if (OFFLINE) return existsSync(cache) ? readFileSync(cache, 'utf8') : '';
  const response = await fetch(`${CDN}/soulessence/`, { headers: { 'user-agent': UA } });
  if (!response.ok) throw new Error(`列表页 HTTP ${response.status}`);
  const html = await response.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cache, html);
  await sleep(DELAY);
  return html;
}

// ---------- 各板块解析 ----------
function parseHero(html) {
  const name = stripTags(pick(html, /<h1>\s*([\s\S]*?)<span/)) || stripTags(pick(html, /<h1>\s*([\s\S]*?)<\/h1>/));
  const stars = pick(html, /class="capsule cap-(\d)"/) || pick(html, /table-stars cap-(\d)/);
  const profession = stripTags(pick(html, /class="tag tag-icon"[^>]*>\s*<img[^>]*>\s*([\s\S]*?)<\/span>/));
  const profIcon = pick(html, /class="tag tag-icon"[^>]*>\s*<img src="([^"]*)"/).replace(/^\//, '');
  const desc = stripTags(pick(html, /<p class="hero-desc"[^>]*>([\s\S]*?)<\/p>/));
  // B/S 版图标（一般两个；结构：hero-icon-wrap > img + label）
  const variants = [];
  for (const block of html.split('class="hero-icon-wrap"').slice(1)) {
    const icon = pick(block, /<img src="([^"]*)"/).replace(/^\//, '');
    const label = stripTags(pick(block, /<div class="hero-icon-label"[^>]*>([\s\S]*?)<\/div>/));
    if (icon) variants.push({ ic: icon, lb: label });
  }
  return { name, stars: stars ? Number(stars) : undefined, profession, profIcon, desc, variants };
}

function parseKv(html) {
  const start = html.indexOf('<h2>基础属性</h2>');
  if (start < 0) return null;
  const block = html.slice(start, html.indexOf('<h2>灵子技能</h2>') > 0 ? html.indexOf('<h2>灵子技能</h2>') : start + 30000);
  const rows = block.split('<tr').slice(1);
  const kv = {};
  for (const row of rows) {
    const key = stripTags(pick(row, /<th[^>]*>([\s\S]*?)<\/th>/));
    if (!key) continue;
    const value = stripTags(pick(row, /<td[^>]*>([\s\S]*?)<\/td>/));
    if (value) kv[key] = value;
  }
  // 分解产出（图标 + 名称 + 数量）
  const matIcon = pick(block, /class="rank-mat"[^>]*>[\s\S]*?<img src="([^"]*)"/).replace(/^\//, '');
  const matName = stripTags(pick(block, /<span class="rank-mat-name"[^>]*>([\s\S]*?)<\/span>/));
  const matCount = stripTags(pick(block, /<span class="rank-mat-count[^"]*"[^>]*>([\s\S]*?)<\/span>/));
  const obtain = kv['获取途径'] || '';
  const decompose = matName ? { ic: matIcon, n: matName, ct: matCount } : null;
  return { obtain, decompose, template: kv['属性模板'] || '' };
}

const STAT_KEYS = { tex_icon_status_hp: 'hp', tex_icon_status_atk: 'atk', tex_icon_status_def: 'def', tex_petupgrade_icon_brk: 'brk' };

// 四维属性：每行 data-values 是 Lv1-100 的完整数组
function parseStats(html) {
  const stats = {};
  for (const row of html.split('<tr').slice(1)) {
    if (!/data-values=/.test(row)) continue;
    const iconKey = Object.keys(STAT_KEYS).find((key) => row.includes(`${key}.png`));
    if (!iconKey) continue;
    const valuesJson = decodeAmp(pick(row, /data-values="\[([\s\S]*?)\]"/));
    if (!valuesJson) continue;
    const values = valuesJson.split(',').map((v) => Number(v)).filter((v) => Number.isFinite(v));
    if (values.length) stats[STAT_KEYS[iconKey]] = values;
  }
  return Object.keys(stats).length ? stats : null;
}

// 专属技能：data-levels JSON（5 级 describe/detail）+ 图标 + [职业] 专属技能
function parseSkill(html) {
  const cardStart = html.indexOf('class="skill-card"');
  if (cardStart < 0) return null;
  const block = html.slice(cardStart, html.indexOf('</section>', cardStart) > 0 ? html.indexOf('</section>', cardStart) : cardStart + 20000);
  const levelsJson = decodeAmp(pick(block, /data-levels="(\[[\s\S]*?\])" data-astro/));
  let levels = [];
  try { levels = levelsJson ? JSON.parse(levelsJson) : []; } catch { levels = []; }
  const details = levels.map((entry) => stripTags(entry.detail || entry.describe || ''));
  const skill = {
    n: stripTags(pick(block, /<div class="skill-name"[^>]*>([\s\S]*?)<\/div>/)),
    ic: pick(block, /<div class="skill-head"[^>]*>\s*<img src="([^"]*)"/).replace(/^\//, ''),
    ele: stripTags(pick(block, /<div class="skill-ele"[^>]*>([\s\S]*?)<\/div>/))
  };
  if (!skill.n) return null;
  const packed = compressLevels(details);
  if (packed) skill.lvls = packed;
  else if (details.length) skill.d = details[0];
  return skill;
}

// R2-6 同款分级压缩（与 collect-cbt3-pets.mjs 一致）
function compressLevels(details) {
  if (!Array.isArray(details) || details.length < 2) return null;
  const tpl = String(details[0]).replace(/\d+(?:\.\d+)?/g, '{}');
  const nums = details.map((text) => {
    const wild = String(text).replace(/\d+(?:\.\d+)?/g, '{}');
    if (wild !== tpl) return null;
    return (String(text).match(/\d+(?:\.\d+)?/g) || []);
  });
  if (nums.some((list) => !list)) return null;
  return { tpl, nums };
}

function parseExpTable(html) {
  const start = html.indexOf('<h2>升级经验</h2>');
  if (start < 0) return null;
  const block = html.slice(start, start + 40000);
  const rows = [];
  for (const row of block.split('<tr').slice(1)) {
    const cells = row.split('<td').slice(1).map(cellText);
    if (cells.length >= 3) rows.push([cells[0], cells[1], cells[2]]);
  }
  return rows.length ? rows : null;
}

async function loadPage(pageId) {
  const cache = join(CACHE_DIR, `${pageId}.html`);
  if (existsSync(cache)) return readFileSync(cache, 'utf8');
  if (OFFLINE) return '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${CDN}/soulessence/${pageId}/`, { headers: { 'user-agent': UA } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cache, html);
      await sleep(DELAY);
      return html;
    } catch (error) {
      console.warn(`  [${pageId}] 第 ${attempt} 次抓取失败：${error.message}`);
      if (attempt === 3) return '';
      await sleep(DELAY * attempt * 2);
    }
  }
  return '';
}

// ---------- 主流程 ----------
const indexHtml = await loadIndex();
const ids = [...new Set([...indexHtml.matchAll(/href="\/soulessence\/(\d+)\/"/g)].map((m) => m[1]))];
if (!ids.length) { console.error('列表页未解析到任何灵子 id'); process.exit(1); }
const targets = LIMIT ? ids.slice(0, LIMIT) : ids;
console.log(`目标 ${targets.length}/${ids.length} 个灵子（延迟 ${DELAY}ms）`);

const items = {};
// 经验表按星级分档（同星级全站一致，不同星级升下级消耗不同）
const expByStars = new Map();
const expHashByStars = new Map();
let ok = 0;
let empty = 0;

for (const pageId of targets) {
  const html = await loadPage(pageId);
  if (!html) { empty += 1; console.warn(`  [${pageId}] 无内容，跳过`); continue; }
  const hero = parseHero(html);
  const kv = parseKv(html) || {};
  const stats = parseStats(html);
  const skill = parseSkill(html);
  const exp = parseExpTable(html);
  if (exp && hero.stars) {
    const hash = createHash('md5').update(JSON.stringify(exp)).digest('hex').slice(0, 8);
    const known = expHashByStars.get(hero.stars);
    if (!known) { expHashByStars.set(hero.stars, hash); expByStars.set(hero.stars, exp); }
    else if (known !== hash) console.warn(`  [${pageId}] ${hero.stars}星经验表与同星级其它页不一致，需核对`);
  }
  const entry = {};
  if (hero.name) entry.n = hero.name;
  if (hero.stars) entry.stars = hero.stars;
  if (hero.profession) entry.prof = hero.profession;
  if (hero.profIcon) entry.profIc = hero.profIcon;
  if (hero.desc) entry.desc = hero.desc;
  if (hero.variants.length) entry.vars = hero.variants;
  if (kv.obtain) entry.obtain = kv.obtain;
  if (kv.decompose) entry.decomp = kv.decompose;
  if (kv.template) entry.tpl = kv.template;
  if (stats) entry.stats = stats;
  if (skill) entry.skill = skill;
  const cardIcon = pick(indexHtml, new RegExp(`href="/soulessence/${pageId}/">[\\s\\S]*?<img src="([^"]*)"`, 'm'));
  if (cardIcon) entry.icon = cardIcon.replace(/^\//, '');
  if (Object.keys(entry).length) { items[pageId] = entry; ok += 1; } else empty += 1;
  const flags = [stats && '四维', skill && '技能', hero.variants.length && `${hero.variants.length}图`].filter(Boolean).join(' ');
  console.log(`  [${pageId} ${hero.name}] ${flags || '⚠ 无数据'}`);
}

const output = { generatedAt: new Date().toISOString().slice(0, 10), source: CDN, items };
if (expByStars.size) output.static = { exp: Object.fromEntries(expByStars) };

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output));
console.log(`\n完成：${ok} 个有数据 / ${empty} 个空缺 → ${OUT_PATH}（${Math.round(JSON.stringify(output).length / 1024)} KB）`);
if (output.static) console.log(`静态件：升级经验按星级分档 ${Object.keys(output.static.exp).join("/")} 星，各行数 ${Object.values(output.static.exp).map((r) => r.length).join("/")}`);
