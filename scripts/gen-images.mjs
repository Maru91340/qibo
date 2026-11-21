// R3-5 生成相似图管线（风格重绘，规避版权；禁止复制官方/竞品原图）
// 用法：
//   node scripts/gen-images.mjs                # 默认 --dry-run：只生成清单与提示词（docs/生成素材清单-R3.md 数据源）
//   node scripts/gen-images.mjs --apply        # 调用生图 API 实际出图（需环境变量，见下方 GEN_IMAGE_*）
//   node scripts/gen-images.mjs --apply --only=spirit
// 环境变量（无则 --apply 报错退出，不猜测接入点）：
//   GEN_IMAGE_API_URL   生图 API 端点（POST {prompt,size} → {url|b64}）
//   GEN_IMAGE_API_KEY   鉴权 Bearer Token
//   GEN_IMAGE_MODEL     模型名（可选）
// 产物：gen-images/<type>/<id>.png + gen-images/manifest.json（含 icon 映射，供云存储上传/数据回写）
// 存储约定：产物默认上传微信云存储走 CDN URL 回写数据（主包 static 余量 <100KiB 不可行，见 docs/生成素材清单-R3.md）
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(projectRoot, 'gen-images');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const onlyArg = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

// 风格基线：参照竞品原图的「结构」（构图/元素/信息层级），但画风重绘为自有无版权风格——
// 统一为「扁平卡通风、粗描边、柔和渐变底」，与官方写实渲染明确区分（版权安全 + 视觉可辨识）
const STYLE_BASE = '扁平卡通风格重绘，粗描边，柔和渐变纯色背景，居中构图，游戏图鉴图标，无文字无水印，非官方画风';

const TYPE_SPEC = {
  enemy: {
    label: '敌人',
    size: '512x512',
    promptOf: (it) => `小型魔物图鉴卡：${it.name}（元素：${(it.tags || []).join('/') || '无'}），兽形剪影清晰可辨，${STYLE_BASE}`,
  },
  dungeon: {
    label: '副本',
    size: '512x512',
    promptOf: (it) => `副本关卡徽章：${it.name}，场景要素图标化（山脉/营地/遗迹任选贴合），${STYLE_BASE}`,
  },
  region: {
    label: '地区阵营',
    size: '768x512',
    promptOf: (it) => `地区风景插画：${it.name}（${it.desc || ''}），横幅构图含地标剪影，${STYLE_BASE}`,
  },
  spirit: {
    label: '灵子',
    size: '512x512',
    promptOf: (it) => `灵子卡牌插画：${it.name}（${it.rarity || ''}），星轨/光斑装饰边框，${STYLE_BASE}`,
  },
  building: {
    label: '家园建筑',
    size: '512x512',
    promptOf: (it) => `田园风建筑图标：${it.name}，等距视角，木质结构特征，${STYLE_BASE}`,
  },
  achievement: {
    label: '成就',
    size: '256x256',
    promptOf: (it) => `成就徽章图标：${it.name}，圆形徽章底，${STYLE_BASE}`,
  },
};

// 数据装载：优先 BWIKI 生成数据（spirit/building 已有热链则跳过），手工目录从源码解析
async function loadEntries() {
  const entries = [];
  const generatedPath = join(projectRoot, 'src/data/generated/catalogs.json');
  if (existsSync(generatedPath)) {
    const data = JSON.parse((await import('node:fs')).readFileSync(generatedPath, 'utf8'));
    for (const type of ['spirit', 'building']) {
      for (const it of (data.types[type] || {}).items || []) {
        if (it.icon) continue; // 已有 BWIKI 热链，无需生成（R3-3 已覆盖）
        entries.push({ type, id: it.id, name: it.name, rarity: it.rarity, tags: it.tags });
      }
    }
    for (const it of (data.types.achievement || {}).items || []) {
      entries.push({ type: 'achievement', id: it.id, name: it.name, rarity: it.rarity });
    }
  }
  // 手工目录（enemy/dungeon/region）：正则提取 id/name/tags/desc
  const manual = (await import('node:fs')).readFileSync(join(projectRoot, 'src/data/manual-catalogs.js'), 'utf8');
  for (const catName of ['enemyCatalog', 'dungeonCatalog', 'regionCatalog']) {
    const re = new RegExp(`export const ${catName}[\\s\\S]*?items:\\s*\\[`);
    const m = manual.match(re);
    if (!m) continue;
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (depth > 0 && i < manual.length) { if (manual[i] === '[') depth++; if (manual[i] === ']') depth--; i++; }
    const type = catName.replace('Catalog', '').replace('enemy', 'enemy').replace('dungeon', 'dungeon').replace('region', 'region');
    for (const hit of manual.slice(start, i - 1).matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'([\s\S]*?)(?=\id:|$)/g)) {
      const seg = hit[3].slice(0, 300);
      const tags = [...seg.matchAll(/'([^']*)'/g)].map((x) => x[1]).filter((s) => s.length <= 4).slice(0, 3);
      entries.push({ type, id: hit[1], name: hit[2], tags, desc: seg.match(/desc:\s*'([^']+)'/)?.[1] || '' });
    }
  }
  return entries.filter((e) => TYPE_SPEC[e.type]);
}

async function main() {
  const all = await loadEntries();
  const list = onlyArg ? all.filter((e) => e.type === onlyArg) : all;
  const manifest = { generatedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', items: [] };
  const byType = {};
  for (const e of list) {
    const spec = TYPE_SPEC[e.type];
    const prompt = spec.promptOf(e);
    const outPath = join(OUT_DIR, e.type, `${e.id}.png`);
    byType[e.type] = (byType[e.type] || 0) + 1;
    manifest.items.push({ ...e, prompt, outPath, size: spec.size });
    if (!APPLY) continue;
    const apiUrl = process.env.GEN_IMAGE_API_URL;
    const apiKey = process.env.GEN_IMAGE_API_KEY;
    if (!apiUrl || !apiKey) {
      console.error('✖ 缺少 GEN_IMAGE_API_URL / GEN_IMAGE_API_KEY（生图接入点待用户提供，见 docs/待审批事项.md）');
      process.exit(1);
    }
    mkdirSync(dirname(outPath), { recursive: true });
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt, size: spec.size, model: process.env.GEN_IMAGE_MODEL || '' }),
      });
      const json = await resp.json();
      const b64 = json.b64 || json.data?.[0]?.b64_json;
      if (b64) {
        writeFileSync(outPath, Buffer.from(b64, 'base64'));
      } else if (json.url || json.data?.[0]?.url) {
        const img = await fetch(json.url || json.data[0].url);
        writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
      } else {
        throw new Error('响应无 url/b64');
      }
      console.log(`✔ ${e.type}/${e.id}.png`);
    } catch (error) {
      console.error(`✖ ${e.type}/${e.id}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`清单: ${list.length} 张（${JSON.stringify(byType)}）→ gen-images/manifest.json`);
  if (!APPLY) console.log('dry-run 完成；出图请配 GEN_IMAGE_API_URL/KEY 后加 --apply（接入点待审批）');
}

main();
