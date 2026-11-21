import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, process.argv[2] || 'dist/build/mp-weixin');
const warningLimit = Number(process.env.QBXZS_MAIN_PACKAGE_WARN_BYTES || 1.65 * 1024 * 1024); // R2-6 起上调：奇波技能分级数据（模板压缩后）使主包基线上移，硬上限 1.9MB 不变
const hardLimit = Number(process.env.QBXZS_MAIN_PACKAGE_MAX_BYTES || 1.9 * 1024 * 1024);
const largestCount = Number(process.env.QBXZS_PACKAGE_LARGEST_COUNT || 15);

if (!existsSync(join(outputRoot, 'app.json'))) {
  throw new Error(`缺少小程序构建产物：${relative(projectRoot, outputRoot)}（请先执行 npm run build:mp-weixin）`);
}
if (!Number.isFinite(warningLimit) || !Number.isFinite(hardLimit) || warningLimit <= 0 || hardLimit <= warningLimit) {
  throw new Error('包体阈值无效：QBXZS_MAIN_PACKAGE_MAX_BYTES 必须大于 QBXZS_MAIN_PACKAGE_WARN_BYTES');
}

const app = JSON.parse(readFileSync(join(outputRoot, 'app.json'), 'utf8'));
const subPackages = app.subPackages || app.subpackages || [];
const subRoots = subPackages.map(({ root }) => normalize(root)).filter(Boolean);
const files = [];

walk(outputRoot);

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const path = normalize(relative(outputRoot, absolute));
    if (entry.isDirectory()) {
      if (path === 'cloudfunctions' || path.startsWith('cloudfunctions/')) continue;
      walk(absolute);
    } else if (!path.endsWith('.map')) {
      files.push({ path, bytes: statSync(absolute).size });
    }
  }
}

function normalize(path) {
  return String(path || '').split(sep).join('/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
}

function belongsTo(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const groups = new Map(subRoots.map((root) => [root, []]));
const mainFiles = [];
for (const file of files) {
  const root = subRoots.find((candidate) => belongsTo(file.path, candidate));
  if (root) groups.get(root).push(file);
  else mainFiles.push(file);
}

const total = (list) => list.reduce((sum, file) => sum + file.bytes, 0);
const mainBytes = total(mainFiles);
console.log(`主包：${formatBytes(mainBytes)} / warning ${formatBytes(warningLimit)} / hard ${formatBytes(hardLimit)}`);
for (const [root, group] of groups) console.log(`分包 ${root}：${formatBytes(total(group))}`);
console.log(`全部可上传代码（排除 cloudfunctions/ 与 .map）：${formatBytes(total(files))}`);
console.log(`最大 ${Math.min(largestCount, files.length)} 个文件：`);
for (const file of [...files].sort((a, b) => b.bytes - a.bytes).slice(0, largestCount)) {
  const group = subRoots.find((root) => belongsTo(file.path, root));
  console.log(`- ${formatBytes(file.bytes).padStart(11)}  [${group ? `分包:${group}` : '主包'}] ${file.path}`);
}

if (mainBytes > hardLimit) {
  throw new Error(`主包 ${formatBytes(mainBytes)} 超过硬上限 ${formatBytes(hardLimit)}`);
}
if (mainBytes > warningLimit) {
  console.warn(`警告：主包 ${formatBytes(mainBytes)} 已超过安全预警线 ${formatBytes(warningLimit)}`);
} else {
  console.log('包体检查通过');
}
