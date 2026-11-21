// 主包瘦身（2026-11-17）：本地图库不入微信包——src/static 下两类图库目录在 uni build
// 产出 dist/build/mp-weixin 后剔除，主包体积检查（check-package-size.mjs）不受影响。
// 1) static/wiki：BWIKI 原图本地副本（1535 张 / 17.6 MiB），H5/dev 全量可用，
//    微信端候选链由 vite 插件置空 wiki-runtime.json 索引后直接走热链；
// 2) static/gen：已弃用的 AI 生成图（源码留档 assets/gen，若目录仍在则防御性剥离）。
// 后续云存储上传管线就绪后，由 fileID 映射替换热链，本脚本可移除。
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist', 'build', 'mp-weixin');
const targets = [join(distRoot, 'static', 'wiki'), join(distRoot, 'static', 'gen')];

if (!existsSync(join(distRoot, 'app.json'))) {
  throw new Error('缺少小程序构建产物（请先执行 uni build -p mp-weixin）');
}

function dirBytes(path) {
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    total += entry.isDirectory() ? dirBytes(child) : statSync(child).size;
  }
  return total;
}

let stripped = 0;
for (const dir of targets) {
  if (!existsSync(dir)) continue;
  const bytes = dirBytes(dir);
  rmSync(dir, { recursive: true, force: true });
  stripped += bytes;
  console.log(`已剥离 ${dir.replace(projectRoot, '')}：${(bytes / 1024).toFixed(1)} KiB`);
}
if (!stripped) console.log('图库目录不在产物中，无需剥离');
