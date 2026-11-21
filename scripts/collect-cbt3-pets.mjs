// CBT3 奇波战斗数据采集：从 ap-cbt3.csxylic.com 抓取 /pet/<wikiId>/ 页面，
// 解析为 src/data/generated/qibo-combat.json（六维资质 / 战斗·对决技能 / 专属特性 / 基因 /
// 基础分类 / 家园 / 家族进化链 / 星临图志 / 升级经验）。
//
// 授权与限速：站方 robots 对通用爬虫 Allow（仅禁 AI 训练爬虫，Content-Signal use=reference），
// 2026-11-13 已获项目所有者授权一次性参考采集；脚本默认 1100ms/页 + 重试退避，不做并发。
// 站内图片以路径后缀入数据，运行时拼接 CDN 前缀热链（与 qibo-index.js 的 icon 同域）。
//
// 用法：
//   node scripts/collect-cbt3-pets.mjs                 # 全量采集（有缓存则复用）
//   node scripts/collect-cbt3-pets.mjs --offline      # 只用 .tmp/cbt3-pets 缓存重建
//   node scripts/collect-cbt3-pets.mjs --limit 5      # 只采前 5 只（试跑）
//   node scripts/collect-cbt3-pets.mjs --refetch 500259,500260
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(projectRoot, '.tmp/cbt3-pets');
const OUT_PATH = join(projectRoot, 'src/data/generated/qibo-combat.json');
const INDEX_PATH = join(projectRoot, 'src/data/generated/qibo-index.js');
const CDN = 'https://ap-cbt3.csxylic.com';
const UA = 'Mozilla/5.0 (compatible; qbxzs-cbt3-sync/1.0; +local reference-use)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OFFLINE = process.argv.includes('--offline');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit'));
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1]) : 0;
const refetchArg = process.argv.find((arg) => arg.startsWith('--refetch'));
const REFETCH = new Set(refetchArg ? String(refetchArg.split('=')[1] || process.argv[process.argv.indexOf(refetchArg) + 1] || '').split(',') : []);
const DELAY = Number(process.env.QBXZS_CBT3_DELAY || 1100);

// ---------- qibo-index 读取（与生成端同一段紧凑格式，避免整包 import） ----------
const rawIndex = readFileSync(INDEX_PATH, 'utf8').match(/const rawIndex = `([\s\S]*?)`/)[1];
const indexEntries = rawIndex
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [wikiId, number, suffix, name] = line.split('|');
    return { wikiId, number, suffix: suffix || '', name };
  });

// ---------- HTML 工具 ----------
const decodeAmp = (text) => text
  .replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&#34;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// 描述里的 <span class="skill-color-tag">木属性伤害</span> 这类富文本在小程序按纯文本渲染
const stripTags = (text) => decodeAmp(String(text || '')).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
// 按 <td 切分后的单元格片段带着属性头（class="mono" data-astro-…>），先剥到首个 > 再取纯文本
const cellText = (cell) => stripTags(cell.split('</td>')[0].replace(/^[^>]*>/, ''));

// 解析战斗机制解析表：攻击段落（cell-dmg 带 data-ast-rates 逐级数值）与属性变动（data-ast-values）
function parseAstTables(blockHtml) {
  const segments = [];
  const buffs = [];
  const bodyMatch = blockHtml.match(/<div class="ast-body"[^>]*>([\s\S]*?)<\/details>/);
  const body = bodyMatch ? bodyMatch[1] : blockHtml;
  const sections = body.split('ast-section-header');
  for (const section of sections.slice(1)) {
    const title = stripTags(pick(section, /<span class="section-title-text"[^>]*>([\s\S]*?)<\/span>/));
    const rows = section.split('<tr').slice(1);
    for (const row of rows) {
      const name = stripTags(pick(row, /<td class="cell-name"[^>]*>([\s\S]*?)<\/td>/));
      if (!name) continue;
      const isSegment = /伤害倍率/.test(title);
      if (isSegment) {
        const ratesJson = decodeAmp(pick(row, /data-ast-rates="([^"]*)"/));
        segments.push({
          n: name,
          lv: ratesJson ? JSON.parse(ratesJson) : undefined,
          v: stripTags(pick(row, /<td class="cell-dmg[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          brk: stripTags(pick(row, /<td class="cell-break[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          it: stripTags(pick(row, /<td class="cell-interrupt[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          sp: stripTags(pick(row, /<td class="cell-sp[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          psp: stripTags(pick(row, /<td class="cell-pet-sp[^"]*"[^>]*>([\s\S]*?)<\/td>/))
        });
      } else {
        const valuesJson = decodeAmp(pick(row, /data-ast-values="([^"]*)"/));
        buffs.push({
          n: name,
          attr: stripTags(pick(row, /<td class="cell-attr[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          lv: valuesJson ? JSON.parse(valuesJson) : undefined,
          v: stripTags(pick(row, /<td class="cell-val[^"]*"[^>]*>([\s\S]*?)<\/td>/)),
          calc: stripTags(pick(row, /<td class="cell-calc[^"]*"[^>]*>([\s\S]*?)<\/td>/))
        });
      }
    }
  }
  const out = {};
  if (segments.length) out.segs = segments;
  if (buffs.length) out.bufs = buffs;
  return out;
}

// R2-6 同款分级压缩：各级文本共享模板仅数字不同 → {tpl, nums}
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

function parseSkillCard(cardHtml) {
  const levelsJson = decodeAmp(pick(cardHtml, /data-levels="(\[[\s\S]*?\])" data-default-lv/));
  let levels = [];
  try { levels = levelsJson ? JSON.parse(levelsJson) : []; } catch { levels = []; }
  const details = levels.map((entry) => stripTags(entry.detail || entry.describe || ''));
  const skill = {
    n: stripTags(pick(cardHtml, /<h3 class="skill-name"[^>]*>([\s\S]*?)<\/h3>/)),
    ic: pick(cardHtml, /<img src="([^"]*tex_icon_[^"]*\.png)"[^>]*class="avatar-img"/).replace(/^\//, ''),
    el: stripTags(pick(cardHtml, /<span class="ele-tag"[^>]*>([\s\S]*?)<\/span>/)),
    cd: stripTags(pick(cardHtml, /<div class="meta-pill pill-cd"[^>]*>[\s\S]*?<span class="mono"[^>]*>([\s\S]*?)<\/span>/)),
    tp: stripTags(pick(cardHtml, /<div class="meta-pill pill-type-[^"]*"[^>]*>([\s\S]*?)<\/div>/)),
    pw: stripTags(pick(cardHtml, /<span class="mono power-num"[^>]*>([\s\S]*?)<\/span>/))
  };
  if (!skill.n) return null;
  const packed = compressLevels(details);
  if (packed) skill.lvls = packed;
  else if (details.length) skill.d = details[0];
  Object.assign(skill, parseAstTables(cardHtml));
  return skill;
}

function parseSkills(pageHtml, panelId) {
  // 面板容器是 <div class="skills-panel ..." id="panel-battle-skills" ...>：class 在前 id 在后，
  // 边界取下一个面板的 id 标记或专属特性网格
  const idMarker = `id="${panelId}"`;
  const start = pageHtml.indexOf(idMarker);
  if (start < 0) return [];
  const rest = pageHtml.slice(start + idMarker.length);
  const boundaries = [rest.indexOf('id="panel-'), rest.indexOf('trait-cards-grid')].filter((i) => i > 0);
  const boundary = boundaries.length ? Math.min(...boundaries) : rest.length;
  return rest
    .slice(0, boundary)
    .split('<div class="game-skill-card"')
    .slice(1)
    .map((cardHtml) => parseSkillCard(cardHtml))
    .filter(Boolean);
}

// ---------- 各板块解析 ----------
function parseRating(pageHtml) {
  const badge = pageHtml.match(/<div class="grade-badge-wrap" title="[^"]*评分:\s*(\d+)[^"]*"/);
  const gradeImg = pick(pageHtml, /<img class="grade-badge-img"[^>]*src="[^"]*tex_pet_icon_([a-z]+)\.png"/);
  const six = [];
  const badgeBlocks = pageHtml.split('class="radar-vertex-badge').slice(1);
  for (const block of badgeBlocks) {
    const iconKey = pick(block, /tex_petupgrade_icon_([a-z]+)\.png/);
    if (!iconKey) continue;
    const sixEntry = {
      k: iconKey,
      g: pick(block, /<span class="talent-rank-tag rank-[a-z]+"[^>]*>\s*([FEDCBASS]+)\s*<\/span>/),
      v: stripTags(pick(block, /<div class="vertex-val-row[^"]*"[^>]*>([\s\S]*?)<\/div>/)),
      rec: /is-recommend/.test(block) ? 1 : undefined
    };
    if (sixEntry.g) six.push(sixEntry);
  }
  // 排序固定为 攻击/生命/防御/暴击率/破韧值/超限强度（与站点顶点序一致）
  const order = ['atk', 'hp', 'def', 'bjl', 'brk', 'jstk'];
  six.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  if (!badge && !six.length) return null;
  return {
    s: badge ? Number(badge[1]) : undefined,
    g: gradeImg ? gradeImg.toUpperCase() : undefined,
    six
  };
}

function parseTrait(pageHtml) {
  const start = pageHtml.indexOf('trait-cards-grid');
  if (start < 0) return null;
  const block = pageHtml.slice(start, start + 20000).split('</details>')[0] + '</details>';
  const name = stripTags(pick(block, /<span class="trait-name"[^>]*>([\s\S]*?)<\/span>/));
  if (!name) return null;
  return {
    n: name,
    b: stripTags(pick(block, /<span class="trait-badge"[^>]*>([\s\S]*?)<\/span>/)),
    d: stripTags(pick(block, /<p class="trait-desc"[^>]*>([\s\S]*?)<\/p>/)),
    ...parseAstTables(block)
  };
}

// 基因槽位：不同页同一基因的 tiers 数量可能不同（站点数据噪声），档位下标语义不稳定，
// 因此采集时就地解析出「档位名/评分/描述」，槽位不依赖全局字典的下标。
function parseGenes(pageHtml) {
  const slotsMatch = pageHtml.match(/<script type="application\/json" id="gene-default-slots">([\s\S]*?)<\/script>/);
  if (!slotsMatch) return null;
  const dictMatch = pageHtml.match(/<script type="application\/json" id="gene-chains-data">([\s\S]*?)<\/script>/);
  let rawDict = {};
  if (dictMatch) {
    try { rawDict = JSON.parse(decodeAmp(dictMatch[1])); } catch { rawDict = {}; }
  }
  try {
    const slots = JSON.parse(slotsMatch[1]);
    return {
      slots: slots.map((slot) => {
        if (!slot) return null;
        const gene = rawDict[slot.baseName] || {};
        const tier = (gene.tiers || [])[slot.activeTierIdx] || {};
        return {
          b: slot.baseName,
          tn: tier.tierName || '',
          s: tier.gradeScore || 0,
          d: stripTags(tier.desc) || ''
        };
      })
    };
  } catch { return null; }
}

function parseClassify(pageHtml) {
  const start = pageHtml.indexOf('基础分类与特征');
  if (start < 0) return null;
  const block = pageHtml.slice(start, pageHtml.indexOf('</section>', start));
  const rows = block.split('<tr').slice(1);
  const kv = {};
  for (const row of rows) {
    const key = stripTags(pick(row, /<th[^>]*>([\s\S]*?)<\/th>/));
    const value = stripTags(pick(row, /<td[^>]*>([\s\S]*?)<\/td>/));
    if (key && value) kv[key] = value;
  }
  const echo = {
    prob: stripTags(pick(block, /<span class="echo-prob-tag"[^>]*>([\s\S]*?)<\/span>/)),
    item: stripTags(pick(block, /<a class="echo-mini-link"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/))
  };
  return {
    stage: kv['进化阶段'] || '',
    size: kv['体型'] || '',
    catch: kv['可捕捉'] || '',
    race: kv['种族与族系'] || '',
    echo
  };
}

function parseHome(pageHtml) {
  const start = pageHtml.indexOf('class="section-body home-panel"');
  if (start < 0) return null;
  const block = pageHtml.slice(start, pageHtml.indexOf('</section>', start));
  const jobs = [];
  for (const item of block.split('<div class="labor-item"').slice(1)) {
    jobs.push({
      ic: pick(item, /<img src="([^"]*)"/).replace(/^\//, ''),
      n: stripTags(pick(item, /<div class="labor-name"[^>]*>([\s\S]*?)<\/div>/)),
      score: stripTags(pick(item, /<span class="labor-score-label[^"]*"[^>]*>[^<]*<\/span>\s*([^<]*?)\s*<\/span>/)).trim()
    });
  }
  const cycle = stripTags(pick(block, /<span class="farm-cycle-badge[^"]*"[^>]*>([\s\S]*?)<\/span>/));
  const drops = [];
  for (const item of block.split('<div class="farm-item"').slice(1)) {
    drops.push({
      ic: pick(item, /<img src="([^"]*)"/).replace(/^\//, ''),
      n: stripTags(pick(item, /<div class="farm-name"[^>]*>([\s\S]*?)<\/div>/)),
      cat: stripTags(pick(item, /<span class="farm-cat-tag[^"]*"[^>]*>([\s\S]*?)<\/span>/)),
      rate: stripTags(pick(item, /<span class="farm-rate-pill[^"]*"[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/)),
      qty: stripTags(pick(item, /<span class="farm-qty[^"]*"[^>]*>([\s\S]*?)<\/span>/)).replace('数量:', '').trim()
    });
  }
  const tip = stripTags(pick(block, /<span class="farm-tip-text"[^>]*>([\s\S]*?)<\/span>/));
  const home = {};
  if (jobs.length) home.jobs = jobs;
  if (cycle) home.cycle = cycle;
  if (drops.length) home.drops = drops;
  return Object.keys(home).length || tip ? { ...home, tip } : null;
}

function parseFamily(pageHtml, selfWikiId) {
  const start = pageHtml.indexOf('evo-panel"');
  if (start < 0) return null;
  const end = pageHtml.indexOf('</section>', start);
  const block = pageHtml.slice(start, end > 0 ? end : start + 12000);
  const family = stripTags(pick(block, /<span class="evo-family-name"[^>]*>([\s\S]*?)<\/span>/));
  const chain = [];
  const parts = block.split(/(<a class="evo-link"[\s\S]*?<\/a>|<div class="evo-arrow">[\s\S]*?<\/div>)/).filter((part) => part && /^<(a|div)/.test(part));
  for (const part of parts) {
    if (part.startsWith('<a')) {
      chain.push({
        id: pick(part, /href="\/pet\/(\d+)\/"/),
        n: stripTags(pick(part, /<div class="evo-name"[^>]*>([\s\S]*?)<\/div>/)),
        st: stripTags(pick(part, /<div class="evo-stage"[^>]*>([\s\S]*?)<\/div>/)),
        cur: /evo-node-current/.test(part) || pick(part, /href="\/pet\/(\d+)\/"/) === selfWikiId ? 1 : undefined
      });
    } else {
      chain.push({ lv: stripTags(part).replace('进化等级', '').replace('↓', '').trim() });
    }
  }
  return family || chain.length ? { name: family, chain } : null;
}

function parseAtlas(pageHtml, petName) {
  const start = pageHtml.indexOf('星临图志');
  if (start < 0) return null;
  const end = pageHtml.indexOf('奇波升级经验', start);
  const block = pageHtml.slice(start, end > 0 ? end : start + 30000);
  const groups = [];
  for (const chain of block.split('<div class="manual-chain"').slice(1)) {
    const type = stripTags(pick(chain, /<div class="manual-chain-type"[^>]*>([\s\S]*?)<\/div>/));
    const steps = chain
      .split('<div class="manual-step"').slice(1)
      .map((step) => ({
        n: stripTags(pick(step, /<span class="manual-step-name"[^>]*>([\s\S]*?)<\/span>/)).split(petName).join('本奇波'),
        v: stripTags(pick(step, /<span class="tag mono"[^>]*>([\s\S]*?)<\/span>/))
      }))
      .filter((step) => step.n);
    if (type && steps.length) groups.push({ t: type, steps });
  }
  return groups.length ? { groups } : null;
}

function parseExpTable(pageHtml) {
  const start = pageHtml.indexOf('奇波升级经验');
  if (start < 0) return null;
  const block = pageHtml.slice(start, start + 40000);
  const rows = [];
  for (const row of block.split('<tr').slice(1)) {
    const cells = row.split('<td').slice(1).map(cellText);
    if (cells.length >= 3) rows.push([cells[0], cells[1], cells[2]]);
  }
  return rows.length ? rows : null;
}

// 图志等级表（10 级）的「解锁加成」列是每只奇波专属（如 生命+120 / 物理防御+6），逐只存储
function parseAtlasLevels(pageHtml) {
  const i = pageHtml.indexOf('图志等级');
  if (i < 0) return null;
  const j = pageHtml.indexOf('图志加成', i);
  const block = pageHtml.slice(i, j > 0 ? j : i + 20000);
  const rows = [];
  for (const row of block.split('<tr').slice(1)) {
    const cells = row.split('<td').slice(1).map(cellText);
    if (cells.length) rows.push(cells);
  }
  return rows.length ? rows : null;
}

// ---------- 抓取 ----------
const cachePath = (wikiId) => join(CACHE_DIR, `${wikiId}.html`);
async function loadPage(wikiId) {
  const cached = existsSync(cachePath(wikiId));
  if (cached && !REFETCH.has(wikiId)) return readFileSync(cachePath(wikiId), 'utf8');
  if (OFFLINE) return '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${CDN}/pet/${wikiId}/`, { headers: { 'user-agent': UA } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cachePath(wikiId), html);
      await sleep(DELAY);
      return html;
    } catch (error) {
      console.warn(`  [${wikiId}] 第 ${attempt} 次抓取失败：${error.message}`);
      if (attempt === 3) return '';
      await sleep(DELAY * attempt * 2);
    }
  }
  return '';
}

// ---------- 主流程 ----------
const seen = new Set();
const targets = [];
for (const entry of indexEntries) {
  if (seen.has(entry.wikiId)) continue;
  seen.add(entry.wikiId);
  targets.push(entry);
}
const limited = LIMIT ? targets.slice(0, LIMIT) : targets;
console.log(`目标 ${limited.length}/${targets.length} 只奇波（缓存 ${existsSync(CACHE_DIR) ? '已有' : '无'}，延迟 ${DELAY}ms）`);

const pets = {};
let staticRef = null;
const staticHashes = { exp: new Set(), tip: new Set() };
const geneDictAccum = new Map(); // baseName -> 裁剪条目（tiers 取各页中最长版本）
let ok = 0;
let empty = 0;

for (const entry of limited) {
  const html = await loadPage(entry.wikiId);
  if (!html) { empty += 1; console.warn(`  [${entry.wikiId} ${entry.name}] 无内容，跳过`); continue; }

  const name = stripTags(pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/)) || entry.name;
  const rating = parseRating(html);
  const battle = parseSkills(html, 'panel-battle-skills');
  const duel = parseSkills(html, 'panel-duel-skills');
  const trait = parseTrait(html);
  const genes = parseGenes(html);
  const classify = parseClassify(html);
  const home = parseHome(html);
  const family = parseFamily(html, entry.wikiId);
  const atlas = parseAtlas(html, entry.name);
  const exp = parseExpTable(html);
  const atlasLevels = parseAtlasLevels(html);
  const geneJson = pick(html, /<script type="application\/json" id="gene-chains-data">([\s\S]*?)<\/script>/);

  // 全局件哈希：经验表 / 牧场机制说明，全站应一致
  if (exp) staticHashes.exp.add(createHash('md5').update(JSON.stringify(exp)).digest('hex').slice(0, 8));
  if (home && home.tip) staticHashes.tip.add(createHash('md5').update(home.tip).digest('hex').slice(0, 8));

  // 基因字典逐页合并：tiers 取最长版本（个别页被站点裁剪成单档），同长度以先见为准
  if (geneJson) {
    try {
      const raw = JSON.parse(decodeAmp(geneJson));
      for (const [baseName, gene] of Object.entries(raw)) {
        const trimmed = {
          t: gene.typeName || '',
          ti: String(gene.typeIcon || '').replace(/^\//, ''),
          grp: gene.group || '',
          tiers: (gene.tiers || []).map((tier) => ({ n: tier.tierName, s: tier.gradeScore, d: stripTags(tier.desc) }))
        };
        const existing = geneDictAccum.get(baseName);
        if (!existing || trimmed.tiers.length > existing.tiers.length) geneDictAccum.set(baseName, trimmed);
      }
    } catch { /* 单页字典解析失败不阻断整体 */ }
  }

  const pet = {};
  if (rating) pet.r = rating;
  if (battle.length) pet.b = battle;
  if (duel.length) pet.d = duel;
  if (trait) pet.tr = trait;
  if (genes) pet.g = genes;
  if (classify) pet.c = classify;
  if (home) pet.h = home;
  if (family) pet.f = family;
  if (atlas) pet.a = atlas;
  if (atlasLevels) pet.al = atlasLevels;

  if (Object.keys(pet).length) { pets[entry.wikiId] = pet; ok += 1; } else empty += 1;

  // 首个成功页提取全局件（经验表 + 牧场机制说明）；基因字典走逐页合并
  if (!staticRef && (exp || geneJson)) {
    staticRef = {
      expRaw: exp,
      tipRaw: home && home.tip
    };
  }
  const flags = [rating && '六维', battle.length && `战${battle.length}`, duel.length && `决${duel.length}`, trait && '特性', genes && '基因', family && '家族'].filter(Boolean).join(' ');
  console.log(`  [${entry.wikiId} ${name}] ${flags || '⚠ 无战斗数据'}`);
}

// ---------- 组装输出 ----------
const output = { generatedAt: new Date().toISOString().slice(0, 10), source: CDN, pets };

if (staticRef) {
  const staticData = {};
  if (staticRef.expRaw) staticData.exp = staticRef.expRaw;
  if (staticRef.tipRaw) staticData.homeTip = staticRef.tipRaw;
  // 基因字典：逐页合并后的全局共享件（typeName/typeIcon/group/tiers）；
  // 槽位的档位明细已就地解析进各奇波数据，字典只承担类型查询
  if (geneDictAccum.size) staticData.genes = Object.fromEntries(geneDictAccum);
  output.static = staticData;
}

const inconsistencies = Object.entries(staticHashes)
  .filter(([, set]) => set.size > 1)
  .map(([key, set]) => `${key}(${[...set].slice(0, 4).join(',')}${set.size > 4 ? '…' : ''})`);
if (inconsistencies.length) console.warn(`⚠ 全局件全站不一致，需人工核对：${inconsistencies.join(' ')}`);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output));
const sizeKb = Math.round(JSON.stringify(output).length / 1024);
console.log(`\n完成：${ok} 只有数据 / ${empty} 只空缺 → ${OUT_PATH}（${sizeKb} KB）`);
if (output.static) console.log(`全局件：经验 ${output.static.exp?.length || 0} 行 · 基因字典 ${Object.keys(output.static.genes || {}).length} 个；图志等级表已逐只存储`);
