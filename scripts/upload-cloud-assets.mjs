#!/usr/bin/env node
// 云开发存储安全上传器（AGENTS.md「上传安全规则」的唯一上传通道）。
// 设计：白名单本地目录 → 固定云目录映射；默认 dry-run 只列清单，--yes 才真正上传；
// 凭证只从机器级环境变量 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 读取，
// 仓库、参数、日志中永不出现密钥（任何 AI 会话同样遵守，见 AGENTS.md）。
//
// 用法：
//   node scripts/upload-cloud-assets.mjs                  # dry-run：列出待传清单
//   node scripts/upload-cloud-assets.mjs --yes            # 实际上传
//   node scripts/upload-cloud-assets.mjs --only 灵子      # 只处理指定云目录分类
// 依赖：@cloudbase/manager-node（devDependencies，缺依赖时按提示安装）
//
// 云目录口径（与 src/data/site-images.js 的 cloudDetailAsset / WIKI_PREFIX 保持一致）：
//   assets/cloud-batch-detail/<分类>/x.png        → images/detail-assets/<分类>/x.png
//   assets/cloud-missing/<批次>/<分类>/x.png      → images/detail-assets/<分类>/x.png
//   assets/qibo-cbt3-patches/x.png                → images/qibo-cbt3/x.png
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 云环境信息以 src/config/cloud.js 为唯一事实源（本脚本与 AGENTS.md 都不抄写桶名/环境 ID 之外的信息）
const cloudConfig = readFileSync(join(projectRoot, 'src', 'config', 'cloud.js'), 'utf8');
function pick(name) {
  const hit = cloudConfig.match(new RegExp("export const " + name + " = '([^']+)'"));
  return hit ? hit[1] : '';
}
const ENV_ID = pick('CLOUD_ENV_ID');
// 从各 export 常量的取值里解析桶段（跳过注释里的 cloud://<envId>.<bucket>/ 占位示例）
const BUCKET = (cloudConfig.match(/=\s*'cloud:\/\/[^'.]+\.([^'/]+)\//) || [])[1] || '';

// detail-assets 合法分类目录（与 site-images.js DETAIL_CATEGORY_RULES 同源）：
// 首段必须是分类目录才允许映射，防止历史批次（如 cloud-missing/<时间戳>/<域名>/ 结构）误传错目录。
const CATEGORY_DIRS = new Set(['资质图标', '技能图标', '灵子', '奇波图标', '物品', '敌人', '装备', '美食', 'BWIKI采集图', '其他图标']);
// 白名单映射：本地目录（含子目录按原相对路径）→ 云目录前缀。扩充必须同步 AGENTS.md 并经用户确认。
const WHITELIST = [
  { local: 'assets/cloud-batch-detail', cloud: 'images/detail-assets/', requireCategory: true },
  { local: 'assets/cloud-missing', cloud: 'images/detail-assets/', requireCategory: true },
  { local: 'assets/qibo-cbt3-patches', cloud: 'images/qibo-cbt3/' },
  // wiki 原图补传（images/wiki/ 下的分类子目录整体缺失场景，2026-11-20 探测装备/物品/角色 245 个）
  { local: 'assets/wiki-missing', cloud: 'images/wiki/' },
];
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;
const argv = process.argv.slice(2);
const CONFIRM = argv.includes('--yes');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : '';

// 收集白名单目录下全部待传文件：云路径 = 前缀 + 分类目录 + 文件名（manifest/log 等非图片跳过）
function collect() {
  const list = [];
  for (const rule of WHITELIST) {
    const root = join(projectRoot, rule.local);
    if (!statSync(root, { throwIfNoEntry: false })) continue;
    (function walk(dir) {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!IMG_RE.test(name) || /\.manifest\.|manifest\.json$|\.log$/i.test(name)) continue;
        const rel = full.slice(root.length + 1).split(sep).join('/');
        // requireCategory：倒数第二段为分类（兼容 <分类>/x.png 与 <批次>/<分类>/x.png 两种结构，
        // 云路径统一为 <前缀><分类>/<文件名>；历史 netloc 批次与根目录散文件对不上分类被排除）
        let cloudPath = rule.cloud + rel;
        if (rule.requireCategory) {
          const segs = rel.split('/');
          if (segs.length < 2 || !CATEGORY_DIRS.has(segs[segs.length - 2])) continue;
          cloudPath = rule.cloud + segs[segs.length - 2] + '/' + segs[segs.length - 1];
        }
        list.push({ local: full, cloudPath });
      }
    })(root);
  }
  return list;
}

function fail(message) {
  console.error('✘ ' + message);
  process.exit(1);
}

async function main() {
  if (!ENV_ID || !BUCKET) fail('无法从 src/config/cloud.js 解析环境 ID / 桶名，请检查配置。');
  const secretId = process.env.TENCENT_SECRET_ID || '';
  const secretKey = process.env.TENCENT_SECRET_KEY || '';
  if (CONFIRM && (!secretId || !secretKey)) {
    fail('缺少机器级环境变量 TENCENT_SECRET_ID / TENCENT_SECRET_KEY（用户级 setx 配置，见 AGENTS.md）；拒绝读取仓库内任何凭据文件。');
  }

  const all = collect();
  const files = ONLY ? all.filter((f) => f.cloudPath.includes(ONLY)) : all;
  if (!files.length) {
    console.log('✔ 白名单目录内没有待传图片，云端已齐。');
    return;
  }
  const sizeOf = (f) => { try { return statSync(f.local).size; } catch { return 0; } };
  console.log('环境 %s（桶 %s…）；待传 %d 张：%s', ENV_ID, BUCKET.slice(0, 12), files.length, CONFIRM ? '即将实际上传' : 'dry-run 预览（加 --yes 才上传）');
  for (const f of files) console.log('  %s → %s（%d KB）', f.local.slice(projectRoot.length + 1), f.cloudPath, Math.round(sizeOf(f) / 1024));

  if (!CONFIRM) {
    console.log('共 %d 张、%d KB。确认无误后执行：node scripts/upload-cloud-assets.mjs --yes', files.length, Math.round(files.reduce((n, f) => n + sizeOf(f), 0) / 1024));
    return;
  }

  // 动态加载 SDK，缺依赖时给出一次性安装提示
  let CloudBase;
  try {
    CloudBase = (await import('@cloudbase/manager-node')).default;
  } catch {
    fail('缺少依赖：npm i -D @cloudbase/manager-node');
  }
  const app = new CloudBase({ secretId, secretKey, envId: ENV_ID });
  const ok = [];
  for (const f of files) {
    try {
      await app.storage.uploadFile({ localPath: f.local, cloudPath: f.cloudPath });
      ok.push(f);
      console.log('  ✔ %s', f.cloudPath);
    } catch (error) {
      console.error('  ✘ %s：%s', f.cloudPath, String(error && error.message || error).slice(0, 160));
    }
  }
  console.log('✔ 上传完成：成功 %d / 失败 %d。fileID 前缀：cloud://%s.%s/', ok.length, files.length - ok.length, ENV_ID, BUCKET);
  if (files.length - ok.length) process.exitCode = 1;
}

main();
