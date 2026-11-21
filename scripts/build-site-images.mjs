// 按 src/data/site/_image-jobs.json 生成小程序可用的图片变体。
// 输入：D:/qibo/images/wiki.biligame.com（本地采集原图）
// 输出：src/assets/wiki/<分类>/<原名>-<用途>.webp
//
// 用法：
//   node scripts/build-site-images.mjs                 增量生成（已存在且非空则跳过）
//   node scripts/build-site-images.mjs --force        全部重新生成
//   node scripts/build-site-images.mjs --only=角色     只生成指定分类
//
// 目录 src/assets/wiki 未被任何模块 import，uni-app / Vite 不会把它打进主包；
// 正式使用时按页面需要挑入 src/static/ 或上传 CDN（见数据差异报告第 5 节）。
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = join(projectRoot, 'src/data/site');
const IMAGE_LIB = 'D:/qibo/images/wiki.biligame.com';
const JOBS_FILE = join(SITE_DIR, '_image-jobs.json');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 6;
const CRLF = '\r\n';

function ffmpegArgs(job, src, dest) {
  const width = Math.max(32, Number(job.width) || 200);
  // 攻略长图（约 3840×10340）整图缩小不可读：裁顶部作封面，再按宽度缩放
  const vf = job.role === 'poster'
    ? `crop=iw:1800:0:0,scale=${width}:-2`
    : `scale=${width}:-2`;
  return [
    '-y', '-loglevel', 'error', '-i', src,
    '-vf', vf,
    '-c:v', 'libwebp', '-quality', '82', '-compression_level', '4',
    dest
  ];
}

async function runOne(job) {
  const src = join(IMAGE_LIB, job.sourceFile);
  const dest = join(projectRoot, job.asset);
  if (!existsSync(src)) return { ...job, status: 'missing-source' };
  if (!FORCE && existsSync(dest) && statSync(dest).size > 0) return { ...job, status: 'cached', bytes: statSync(dest).size };
  mkdirSync(dirname(dest), { recursive: true });
  let lastErr = '';
  // 并发转码偶发资源竞争（同一秒多个 ffmpeg 进程），失败自动重试
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await execFileAsync('ffmpeg', ffmpegArgs(job, src, dest), { timeout: 60000, maxBuffer: 1024 * 1024 });
      if (existsSync(dest) && statSync(dest).size > 0) return { ...job, status: 'ok', bytes: statSync(dest).size };
      lastErr = 'empty-output';
    } catch (error) {
      lastErr = (error.stderr || error.message || '').toString().slice(0, 300);
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  return { ...job, status: 'failed', error: lastErr };
}

async function main() {
  if (!existsSync(JOBS_FILE)) {
    console.error('✖ 缺少 _image-jobs.json，请先执行 node scripts/sync-site-data.mjs');
    process.exitCode = 1; return;
  }
  let jobs = JSON.parse(readFileSync(JOBS_FILE, 'utf8'));
  if (ONLY) jobs = jobs.filter((j) => j.category === ONLY || j.asset.includes(`/${ONLY}/`));
  console.log(`任务 ${jobs.length} 张（并发 ${CONCURRENCY}，${FORCE ? '强制重建' : '增量'}）`);

  const results = [];
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < jobs.length) {
      const index = cursor++;
      const r = await runOne(jobs[index]);
      results.push(r);
      done += 1;
      if (done % 200 === 0 || done === jobs.length) console.log(`  进度 ${done}/${jobs.length}`);
    }
  });
  await Promise.all(workers);

  const ok = results.filter((r) => r.status === 'ok');
  const cached = results.filter((r) => r.status === 'cached');
  const failed = results.filter((r) => !['ok', 'cached'].includes(r.status));
  writeFileSync(join(SITE_DIR, '_image-failures.json'), JSON.stringify(failed, null, 2));

  // 汇总实际磁盘占用
  const assetsRoot = join(projectRoot, 'src/static/wiki');
  const byDir = {};
  let totalBytes = 0;
  if (existsSync(assetsRoot)) {
    for (const entry of readdirSync(assetsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(assetsRoot, entry.name);
      let count = 0; let bytes = 0;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.webp')) continue;
        count += 1; bytes += statSync(join(dir, f)).size;
      }
      byDir[entry.name] = { count, bytes };
      totalBytes += bytes;
    }
  }

  // 映射闭环校验：site-catalogs.json 中每个 images.<用途> 路径是否真的落盘
  const catalogFile = join(SITE_DIR, 'site-catalogs.json');
  const closure = { total: 0, present: 0, byType: {}, missing: [] };
  if (existsSync(catalogFile)) {
    const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
    for (const [type, payload] of Object.entries(catalog.types || {})) {
      const stat = { total: 0, present: 0, missing: 0 };
      for (const item of payload.items || []) {
        for (const [role, asset] of Object.entries(item.images || {})) {
          stat.total += 1; closure.total += 1;
          const full = join(projectRoot, asset);
          if (existsSync(full) && statSync(full).size > 0) { stat.present += 1; closure.present += 1; }
          else {
            stat.missing += 1;
            if (closure.missing.length < 20) closure.missing.push(`${type}/${item.name}/${role} -> ${asset}`);
          }
        }
      }
      closure.byType[type] = stat;
    }
  }

  const lines = [];
  const md = (s = '') => lines.push(s);
  md('# 图片变体生成报告');
  md();
  md(`生成时间：${new Date().toISOString()}　｜　源：本地采集库 \`${IMAGE_LIB}\``);
  md();
  md('## 1. 结果');
  md();
  md(`- 任务 ${jobs.length} 张：新生成 ${ok.length} / 已存在 ${cached.length} / 失败 ${failed.length}。`);
  md(`- 目录 \`src/assets/wiki\` 合计 ${Object.values(byDir).reduce((s, d) => s + d.count, 0)} 张 / ${(totalBytes / 1048576).toFixed(2)} MB。`);
  md('- 格式统一为 WebP（保留透明通道）；按用途设定变体宽度，见 `数据差异报告.md` 第 3.2 节。');
  md();
  md('| 分类目录 | 张数 | 体积 |');
  md('| --- | ---: | ---: |');
  for (const [dir, stat] of Object.entries(byDir).sort((a, b) => b[1].bytes - a[1].bytes)) {
    md(`| ${dir} | ${stat.count} | ${(stat.bytes / 1048576).toFixed(2)} MB |`);
  }
  md();
  md('## 2. 数据与图片对应关系闭环校验');
  md();
  md(`遍历 \`site-catalogs.json\` 全部条目的 \`images.<用途>\` 引用，逐个检查磁盘文件：共 ${closure.total} 处引用，命中 ${closure.present} 处（${closure.total ? (closure.present / closure.total * 100).toFixed(1) : '0'}%），缺失 ${closure.total - closure.present} 处。`);
  md();
  md('| 类型 | 图片引用 | 命中 | 缺失 |');
  md('| --- | ---: | ---: | ---: |');
  for (const [type, stat] of Object.entries(closure.byType)) {
    if (!stat.total) continue;
    md(`| ${type} | ${stat.total} | ${stat.present} | ${stat.missing} |`);
  }
  md();
  if (closure.missing.length) {
    md('缺失样本（前 20 条）：');
    md();
    closure.missing.forEach((m) => md(`- \`${m}\``));
    md();
  }
  if (failed.length) {
    md('## 3. 失败明细');
    md();
    md('| 输出路径 | 源图 | 原因 |');
    md('| --- | --- | --- |');
    failed.slice(0, 40).forEach((r) => md(`| ${r.asset} | ${r.sourceFile} | ${r.status}${r.error ? ` ${r.error.replace(/\|/g, '/').slice(0, 120)}` : ''} |`));
    md();
  }
  md(failed.length ? '## 4. 使用提醒' : '## 3. 使用提醒');
  md();
  md('- 该目录未被业务代码 import，不会进入小程序主包；接入时按页面需要挑入 `src/static/` 或上传 CDN。');
  md('- 采集库里 16 张「扩展名与真实格式不符」的源文件（如 .png 实为 JPEG）由 ffmpeg 按内容识别，已正常转码。');
  md('- 攻略长图原图约 3840×10340、单张 6MB 以上，这里只裁顶部 1800px 生成封面缩略；整图仍保留在采集库，不作头像/封面全图缩放。');
  md('- 素材来自第三方玩家 Wiki，公开可访问不等于可用于产品，上线前需确认使用条件。');
  md();
  writeFileSync(join(SITE_DIR, '图片变体报告.md'), lines.join(CRLF) + CRLF);

  console.log(`\n完成：新生成 ${ok.length} / 已存在 ${cached.length} / 失败 ${failed.length}`);
  console.log(`磁盘合计 ${Object.values(byDir).reduce((s, d) => s + d.count, 0)} 张 / ${(totalBytes / 1048576).toFixed(2)} MB`);
  if (failed.length) {
    console.log('失败样本：');
    failed.slice(0, 10).forEach((r) => console.log(`  ${r.asset} <- ${r.sourceFile} : ${r.status} ${r.error || ''}`));
  }
}

main().catch((error) => { console.error(`生成失败：${error.stack || error.message}`); process.exitCode = 1; });
