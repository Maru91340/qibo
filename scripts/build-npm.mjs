import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(projectRoot, process.argv[2] || 'dist/build/mp-weixin');
const source = join(projectRoot, 'node_modules/tdesign-miniprogram/miniprogram_dist');
const output = join(target, 'miniprogram_npm/tdesign-miniprogram');
const PACKAGE_PREFIX = 'tdesign-miniprogram/';

if (!existsSync(join(target, 'app.json'))) throw new Error(`构建产物不存在：${target}，请先执行 uni build/dev`);
if (!existsSync(source)) throw new Error(`未找到 ${source}，请先执行 npm install`);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function entryComponents() {
  const names = new Set();
  for (const file of walk(target).filter((f) => f.endsWith('.json'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/tdesign-miniprogram\/([^/"]+)\//g)) names.add(match[1]);
  }
  return [...names];
}

function dependenciesOf(copiedFile) {
  const text = readFileSync(copiedFile, 'utf8');
  const refs = new Set();
  for (const match of text.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
    const rel = relative(source, resolve(dirname(sourceOf(copiedFile)), match[1]));
    if (rel && !rel.startsWith('..')) refs.add(rel.split('\\')[0].split('/')[0]);
  }
  return [...refs];
}

function sourceOf(copiedFile) {
  return join(source, relative(output, copiedFile));
}

function copyDir(name) {
  const from = join(source, name);
  if (!existsSync(from)) throw new Error(`组件目录不存在：${name}`);
  const copied = [];
  for (const file of walk(from)) {
    if (file.endsWith('.d.ts') || file.endsWith('.map')) continue;
    const dest = join(output, name, relative(from, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    copied.push(dest);
  }
  return copied;
}

rmSync(output, { recursive: true, force: true });
const seen = new Set();
const pending = ['common', 'mixins', ...entryComponents()];
while (pending.length) {
  const name = pending.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  for (const file of copyDir(name)) {
    if (!file.endsWith('.js') && !file.endsWith('.json')) continue;
    for (const dep of dependenciesOf(file)) if (!seen.has(dep)) pending.push(dep);
  }
}

const files = walk(output);
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`TDesign 组件：${[...seen].sort().join(', ')}`);
console.log(`已拷贝 ${files.length} 个文件 / ${(bytes / 1024).toFixed(0)} KB -> ${relative(projectRoot, output)}`);
