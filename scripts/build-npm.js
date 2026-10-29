const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist');
const OUT = path.join(ROOT, 'miniprogram_npm', 'tdesign-miniprogram');
const IGNORED = new Set(['node_modules', 'miniprogram_npm', '.git']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function entryComponents() {
  const names = new Set();
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED.has(entry.name)) stack.push(full);
      } else if (entry.name.endsWith('.json')) {
        const text = fs.readFileSync(full, 'utf8');
        for (const match of text.matchAll(/"tdesign-miniprogram\/([^/"]+)\//g)) names.add(match[1]);
      }
    }
  }
  return [...names];
}

function sourceOf(copiedFile) {
  return path.join(SRC, path.relative(OUT, copiedFile));
}

function dependenciesOf(copiedFile) {
  const text = fs.readFileSync(copiedFile, 'utf8');
  const refs = new Set();
  for (const match of text.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
    const rel = path.relative(SRC, path.resolve(path.dirname(sourceOf(copiedFile)), match[1]));
    if (rel && !rel.startsWith('..')) refs.add(rel.split(path.sep)[0]);
  }
  return [...refs];
}

function copyDir(name) {
  const from = path.join(SRC, name);
  if (!fs.existsSync(from)) throw new Error(`组件目录不存在: ${name}`);
  const copied = [];
  for (const file of walk(from)) {
    if (file.endsWith('.d.ts') || file.endsWith('.map')) continue;
    const dest = path.join(OUT, name, path.relative(from, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    copied.push(dest);
  }
  return copied;
}

function build() {
  if (!fs.existsSync(SRC)) throw new Error(`未找到 ${SRC}，请先执行 npm install`);
  fs.rmSync(OUT, { recursive: true, force: true });
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
  const files = walk(OUT);
  const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  console.log(`入口组件: ${entryComponents().join(', ')}`);
  console.log(`已拷贝 ${seen.size} 个目录 / ${files.length} 个文件 / ${(bytes / 1024).toFixed(0)} KB -> ${path.relative(ROOT, OUT)}`);
}

build();
