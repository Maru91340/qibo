// 阶段 2.1–2.3 图片接入层静态核验：加载真实模块 → 逐项核对用途文件名 → 探查 CDN 直链可达性。
// 这是「静态代码 / 数据 / URL 可达性检查」，不是小程序运行界面、视觉或交互验证。
//
// 用法：
//   node scripts/verify-image-runtime.mjs           只探查（HEAD，不产生站点缩略图）
//   node scripts/verify-image-runtime.mjs --warm    对未缓存的首图走一次站点按需生成，再复探直链
// 产物：.tmp/image-runtime-verify.json（供 docs/升级任务/ 报告引用）
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unlinkSync } from 'node:fs';
import { build } from 'esbuild';

const execFileAsync = promisify(execFile);
// 站点对 Node fetch 的 TLS 指纹返回 567（WAF），curl 可正常按需生成缩略图；仅构建期使用
async function curlWarm(url, tempFile) {
  try {
    const { stdout } = await execFileAsync('curl', [
      '-s', '-L', '--max-time', '30', '-o', tempFile, '-w', '%{http_code}', url
    ], { timeout: 40000 });
    return Number(String(stdout).trim()) || 0;
  } finally {
    try { unlinkSync(tempFile); } catch (_) { /* 临时文件可能未生成 */ }
  }
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(projectRoot, '.tmp');
const BUNDLE = join(TMP, 'site-images.bundle.mjs');
const OUT = join(TMP, 'image-runtime-verify.json');
const WARM = process.argv.includes('--warm');
const MAP = JSON.parse(readFileSync(join(projectRoot, 'src/data/site/image-map.json'), 'utf8'));
const GEN = JSON.parse(readFileSync(join(projectRoot, 'src/data/generated/catalogs.json'), 'utf8'));
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// 把 src/data/site-images.js 打成 Node 可执行的 ESM（JSON 由 esbuild 内联），验证的是真实模块逻辑
await build({
  entryPoints: [join(projectRoot, 'src/data/site-images.js')],
  bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, logLevel: 'silent'
});
const mod = await import(pathToFileURL(BUNDLE).href + `?t=${Date.now()}`);

async function probe(url, method = 'HEAD') {
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    return { status: res.status, type: (res.headers.get('content-type') || '').split(';')[0], bytes: Number(res.headers.get('content-length') || 0) };
  } catch (error) {
    return { status: 0, type: '', bytes: 0, error: String(error.message || error).slice(0, 80) };
  }
}
async function probeAll(list, concurrency = 6) {
  const out = new Array(list.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < list.length) {
      const i = cursor++;
      out[i] = await probe(list[i]);
    }
  }));
  return out;
}

const result = {
  checkedAt: new Date().toISOString(),
  warmMode: WARM,
  runtimeVersion: mod.IMAGE_RUNTIME_VERSION,
  characters: [],
  qibo: { total: 0, mapped: 0, petIcon: 0, siteSpecific: 0, missing: [], samples: [] },
  guide: { total: 0, mapped: 0, samples: [] },
  keyVisual: { meta: mod.keyVisualMeta(), candidates: [] },
  localVariants: { referenced: 0, present: 0, missing: [] },
  warm: { attempted: 0, recovered: 0, stillFailed: [] }
};

// 1) 24 个角色逐一核对：avatar=Tex_icon_hero_l_<id>、art=hero_get_<id>（源千代降级 portraitM）
const charRows = MAP.types.charWiki || [];
const charDirect = [];
for (const row of charRows) {
  const avatar = mod.imageSources('charWiki', row.id, 'avatar');
  const art = mod.imageSources('charWiki', row.id, 'art');
  const expectedAvatar = `Tex_icon_hero_l_${row.wikiId}.png`;
  const expectedArt = row.images.art
    ? `Tex_icon_hero_get_${row.wikiId}.png`
    : `Tex_icon_hero_m_${row.wikiId}.png`;
  const entry = {
    wikiId: row.wikiId, name: row.name, id: row.id,
    avatarFile: decodeURIComponent(avatar[0].split('/').pop() || '').replace(/^\d+px-/, ''),
    artFile: decodeURIComponent(art[0].split('/').pop() || '').replace(/^\d+px-/, ''),
    avatarOk: avatar[0].includes(expectedAvatar),
    artOk: art[0].includes(expectedArt),
    artDegraded: !row.images.art,
    legacyIcon: ((GEN.types.charWiki || {}).items || []).find((x) => x.id === row.id)?.icon || '',
    avatarChain: avatar, artChain: art
  };
  result.characters.push(entry);
  charDirect.push(avatar[0], art[0]);
}
let charProbeResults = await probeAll(charDirect);
result.characters.forEach((entry, i) => {
  entry.avatarProbe = charProbeResults[i * 2] || null;
  entry.artProbe = charProbeResults[i * 2 + 1] || null;
});

// 2) 奇波：205 条内置条目逐条核对映射用途；抽检首个候选与按需生成地址
const qiboRows = ((GEN.types.qiboWiki || {}).items || []);
const mapById = new Map((MAP.types.qiboWiki || []).map((x) => [x.id, x]));
result.qibo.total = qiboRows.length;
for (const item of qiboRows) {
  const mapped = mod.imageSources('qiboWiki', item.id, 'icon')[0] || '';
  if (!mapped) { result.qibo.missing.push(`${item.id} ${item.name}`); continue; }
  result.qibo.mapped += 1;
  const file = decodeURIComponent(mapped.split('/').pop() || '').replace(/^\d+px-/, '');
  if (/^Tex_icon_pet_/.test(file)) result.qibo.petIcon += 1;
  else result.qibo.siteSpecific += 1;
}
const sampleRows = [
  qiboRows[0], qiboRows[1], qiboRows[20], qiboRows[60], qiboRows[120], qiboRows[180],
  qiboRows.find((x) => /卫星/.test(decodeURIComponent(String(x.icon || '')))) || qiboRows[2]
].filter(Boolean);
const qiboSampleUrls = [...new Set(sampleRows.map((x) => mod.imageSources('qiboWiki', x.id, 'icon')[0]).filter(Boolean))];
result.qibo.samples = (await probeAll(qiboSampleUrls)).map((p, i) => ({ url: qiboSampleUrls[i], ...p }));

// 3) 攻略长图只作 poster
const guideRows = (MAP.types.guideWiki || []);
result.guide.total = guideRows.length;
const guideUrls = guideRows.map((x) => mod.imageSources('guideWiki', x.id, 'poster')[0]).filter(Boolean);
result.guide.mapped = guideUrls.length;
const guideProbes = await probeAll(guideUrls);
result.guide.samples = guideProbes.map((p, i) => ({ url: guideUrls[i], ...p }));

// 4) 主视觉候选链
const kv = mod.keyVisualSources();
result.keyVisual.candidates = (await probeAll(kv)).map((p, i) => ({ url: kv[i], ...p }));

// 5) --warm：只对首图直链不可达的用途走一次站点按需生成，再复探直链
if (WARM) {
  const warmTargets = [];
  const pushWarm = (direct, redirect, label) => {
    if (!direct) return;
    warmTargets.push({ direct, redirect, label });
  };
  for (const entry of result.characters) {
    if (entry.avatarProbe.status !== 200) pushWarm(entry.avatarChain[0], entry.avatarChain[1], `${entry.name}/avatar`);
    if (entry.artProbe.status !== 200) pushWarm(entry.artChain[0], entry.artChain[1], `${entry.name}/art`);
  }
  for (const sample of result.guide.samples) {
    if (sample.status !== 200) {
      const row = guideRows.find((x) => mod.imageSources('guideWiki', x.id, 'poster')[0] === sample.url);
      const chain = row ? mod.imageSources('guideWiki', row.id, 'poster') : [];
      if (chain[1]) pushWarm(chain[0], chain[1], `${row ? row.name : 'guide'}/poster`);
    }
  }
  if (result.keyVisual.candidates[0] && result.keyVisual.candidates[0].status !== 200) {
    pushWarm(kv[0], kv[1], 'keyVisual');
  }
  result.warm.attempted = warmTargets.length;
  let cursor = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (cursor < warmTargets.length) {
      const i = cursor++;
      const target = warmTargets[i];
      const tempFile = join(TMP, `warm-${i}.bin`);
      let generatedStatus = 0;
      try { generatedStatus = await curlWarm(target.redirect, tempFile); } catch (error) {
        generatedStatus = 0;
      }
      const generated = { status: generatedStatus };
      const again = await probe(target.direct);
      if (again.status === 200) result.warm.recovered += 1;
      else result.warm.stillFailed.push({ label: target.label, redirectStatus: generated.status, directStatus: again.status });
    }
  }));
  // 复探全部首图直链，写回最终状态（预热可能被 CDN 淘汰，候选链仍保留按需生成兜底）
  const finalChar = await probeAll(result.characters.flatMap((x) => [x.avatarChain[0], x.artChain[0]]));
  result.characters.forEach((entry, i) => {
    entry.avatarFinal = finalChar[i * 2];
    entry.artFinal = finalChar[i * 2 + 1];
  });
  const finalGuide = await probeAll(guideUrls);
  result.guide.final = finalGuide.map((p, i) => ({ url: guideUrls[i], ...p }));
  const finalKv = await probeAll(kv);
  result.keyVisual.final = finalKv.map((p, i) => ({ url: kv[i], ...p }));
  const finalQibo = await probeAll(qiboSampleUrls);
  result.qibo.finalSamples = finalQibo.map((p, i) => ({ url: qiboSampleUrls[i], ...p }));
}

// 6) 本地 WebP 变体存在性（不进主包，仅核对闭环）
const assets = [];
for (const rows of Object.values(MAP.types)) {
  for (const row of rows) {
    for (const entry of Object.values(row.images || {})) if (entry.asset) assets.push(entry.asset);
  }
}
if (MAP.keyVisual && MAP.keyVisual.asset) assets.push(MAP.keyVisual.asset);
result.localVariants.referenced = assets.length;
for (const asset of assets) {
  if (existsSync(join(projectRoot, asset))) result.localVariants.present += 1;
  else result.localVariants.missing.push(asset);
}

writeFileSync(OUT, JSON.stringify(result, null, 2));
const okChar = result.characters.filter((x) => x.avatarOk && x.artOk).length;
const probeField = WARM ? 'avatarFinal' : 'avatarProbe';
const artField = WARM ? 'artFinal' : 'artProbe';
const okAvatarHttp = result.characters.filter((x) => x[probeField] && x[probeField].status === 200).length;
const okArtHttp = result.characters.filter((x) => x[artField] && x[artField].status === 200).length;
console.log(`映射版本 ${result.runtimeVersion}｜warm=${WARM}`);
console.log(`角色 ${result.characters.length}：用途文件名正确 ${okChar}；avatar HTTP200 ${okAvatarHttp}；art HTTP200 ${okArtHttp}`);
console.log(`奇波 ${result.qibo.total}：映射 ${result.qibo.mapped}（Tex_icon_pet_* ${result.qibo.petIcon} / 站点专用 ${result.qibo.siteSpecific}）；无图 ${result.qibo.missing.length}`);
const guideFinal = WARM ? result.guide.final : result.guide.samples;
console.log(`攻略 poster ${result.guide.mapped}/${result.guide.total}，首图 HTTP200 ${guideFinal.filter((x) => x.status === 200).length}`);
console.log(`主视觉候选：${(WARM ? result.keyVisual.final : result.keyVisual.candidates).map((x) => x.status).join(',')}`);
console.log(`本地 WebP ${result.localVariants.present}/${result.localVariants.referenced}`);
if (WARM) console.log(`预热：尝试 ${result.warm.attempted}，恢复 ${result.warm.recovered}，仍失败 ${result.warm.stillFailed.length}`);
console.log(`✔ ${OUT.replace(projectRoot + '\\', '')}`);
